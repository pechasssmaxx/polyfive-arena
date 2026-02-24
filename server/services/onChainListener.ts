/**
 * onChainListener.ts
 * Subscribes directly to Polygon blockchain events from Polymarket CTF Exchange contracts.
 * Fires BEFORE Polymarket API indexes the trade (~500-1000ms earlier than WebSocket).
 *
 * Flow:
 *   Block included → ethers fires event → we execute claude's real order immediately
 *   ~500ms later → Polymarket WS fires → copyTrader.ts updates DB for all 5 agents
 *                                        (skips real execution because txHash already in executedOnChain)
 */

import { ethers } from 'ethers';
import { executeCopyTrade, executeCloseTrade } from './realTrader.js';
import { DONOR_ONCHAIN_WALLETS } from '../../src/data/constants.js';

// Polymarket exchange contracts on Polygon (Mainnet)
const CTF_EXCHANGE     = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const NEGRISK_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';

const ORDER_FILLED_ABI = [
    'event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled, uint256 fee)'
];

// txHash → already executed on-chain.
// copyTrader.ts WebSocket handler checks this to skip real execution (avoid double fill).
export const executedOnChain = new Set<string>();

// tokenId → { conditionId, outcomeIndex }, TTL 1 hour
const tokenMarketCache = new Map<string, { conditionId: string; outcomeIndex: number; exp: number }>();

async function lookupTokenId(tokenId: string): Promise<{ conditionId: string; outcomeIndex: number } | null> {
    const cached = tokenMarketCache.get(tokenId);
    if (cached && Date.now() < cached.exp) {
        return { conditionId: cached.conditionId, outcomeIndex: cached.outcomeIndex };
    }

    try {
        // Gamma API: reverse lookup tokenId → market
        const resp = await fetch(
            `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}`,
            { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6_000) } as RequestInit
        );
        if (!resp.ok) return null;

        const markets: any[] = await resp.json();
        if (!markets?.length) return null;

        const market = markets[0];
        const conditionId: string = market.conditionId ?? market.condition_id ?? '';
        if (!conditionId) return null;

        // Determine outcomeIndex: find which token slot our tokenId is in
        const tokenIds: string[] = market.clobTokenIds
            ?? (Array.isArray(market.tokens) ? market.tokens.map((t: any) =>
                typeof t === 'string' ? t : (t.token_id ?? t.tokenId ?? ''))
            : []);
        const outcomeIndex = tokenIds.indexOf(tokenId);

        const result = { conditionId, outcomeIndex: outcomeIndex === -1 ? 0 : outcomeIndex };
        tokenMarketCache.set(tokenId, { ...result, exp: Date.now() + 60 * 60 * 1000 });
        return result;
    } catch {
        return null;
    }
}

async function processOrderFilled(
    txHash: string,
    maker: string,
    taker: string,
    makerAssetId: bigint,
    takerAssetId: bigint,
    makerAmountFilled: bigint,
    takerAmountFilled: bigint,
    donorSet: Set<string>
): Promise<void> {
    const makerL = maker.toLowerCase();
    const takerL = taker.toLowerCase();

    const isDonorMaker = donorSet.has(makerL);
    const isDonorTaker = donorSet.has(takerL);
    if (!isDonorMaker && !isDonorTaker) return;

    // Skip if already handled (shouldn't happen, but just in case)
    if (executedOnChain.has(txHash)) return;

    // Mark immediately — WS may fire while we're doing the async lookup below
    executedOnChain.add(txHash);
    // Auto-expire after 60s to prevent unbounded growth
    setTimeout(() => executedOnChain.delete(txHash), 60_000);

    // ── Determine side and tokenId ───────────────────────────────────────────
    // makerAssetId/takerAssetId: 0 = USDC, non-zero = CTF conditional token
    const makerIsUsdc = makerAssetId === 0n;

    // USDC amount (1e6 units) / CTF amount (1e6 units) = price per share
    const usdcAmount = makerIsUsdc ? makerAmountFilled : takerAmountFilled;
    const ctfAmount  = makerIsUsdc ? takerAmountFilled : makerAmountFilled;
    const tokenId    = (makerIsUsdc ? takerAssetId : makerAssetId).toString();

    if (ctfAmount === 0n) return;
    const price = Number(usdcAmount) / Number(ctfAmount);
    if (price <= 0 || price >= 1) return; // sanity check

    // Side from DONOR's perspective
    let side: 'BUY' | 'SELL';
    if (isDonorMaker) {
        side = makerIsUsdc ? 'BUY' : 'SELL';
    } else {
        // donor is taker: they give takerAssetId
        const takerIsUsdc = takerAssetId === 0n;
        side = takerIsUsdc ? 'BUY' : 'SELL';
    }

    console.log(`[OnChain] ⚡ ${side} | price=${price.toFixed(3)} | tx=${txHash.slice(0, 12)}...`);

    // ── Look up market info ──────────────────────────────────────────────────
    const marketInfo = await lookupTokenId(tokenId);
    if (!marketInfo) {
        console.warn(`[OnChain] ⚠️  Could not resolve tokenId ${tokenId.slice(0, 12)} → skipping`);
        return;
    }

    const { conditionId, outcomeIndex } = marketInfo;
    const COPY_SIZE_USDC = 1.15;

    // ── Execute real order for claude IMMEDIATELY ────────────────────────────
    try {
        if (side === 'BUY') {
            console.log(`[OnChain] 🚀 Pre-executing BUY ${conditionId.slice(0, 10)}... outcome=${outcomeIndex}`);
            await executeCopyTrade('claude', conditionId, outcomeIndex, price, COPY_SIZE_USDC, tokenId);
        } else {
            console.log(`[OnChain] 🚀 Pre-executing SELL ${conditionId.slice(0, 10)}... outcome=${outcomeIndex}`);
            await executeCloseTrade('claude', conditionId, outcomeIndex, price, tokenId);
        }
    } catch (e: any) {
        console.error(`[OnChain] ❌ Execution failed: ${e.message}`);
    }
}

export function startOnChainListener(): void {
    const donorSet = new Set(
        DONOR_ONCHAIN_WALLETS.filter(w => /^0x[0-9a-fA-F]{40}$/.test(w)).map(w => w.toLowerCase())
    );

    if (donorSet.size === 0) {
        console.log('[OnChain] No valid on-chain donor wallets — skipping on-chain listener');
        return;
    }

    // Use Alchemy WSS if provided, else fall back to public endpoint (fine for 1-2 days)
    const WSS_URL = process.env.POLYGON_WSS_URL || 'wss://polygon-bor-rpc.publicnode.com';
    console.log(`[OnChain] Connecting → ${WSS_URL.split('/')[2]}...`);

    let reconnectDelay = 3_000;

    const connect = () => {
        let provider: ethers.providers.WebSocketProvider;

        try {
            provider = new ethers.providers.WebSocketProvider(WSS_URL);
        } catch (e: any) {
            console.error('[OnChain] Provider init failed:', e.message, `— retry in ${reconnectDelay / 1000}s`);
            setTimeout(connect, reconnectDelay);
            return;
        }

        const makeListener = (
            _orderHash: string, maker: string, taker: string,
            makerAssetId: ethers.BigNumber, takerAssetId: ethers.BigNumber,
            makerAmountFilled: ethers.BigNumber, takerAmountFilled: ethers.BigNumber,
            _fee: ethers.BigNumber,
            event: ethers.Event
        ) => {
            processOrderFilled(
                event.transactionHash,
                maker, taker,
                makerAssetId.toBigInt(), takerAssetId.toBigInt(),
                makerAmountFilled.toBigInt(), takerAmountFilled.toBigInt(),
                donorSet
            ).catch((e: any) => console.error('[OnChain] processOrderFilled error:', e.message));
        };

        const ctfContract     = new ethers.Contract(CTF_EXCHANGE,     ORDER_FILLED_ABI, provider);
        const negRiskContract  = new ethers.Contract(NEGRISK_EXCHANGE, ORDER_FILLED_ABI, provider);

        ctfContract.on('OrderFilled', makeListener);
        negRiskContract.on('OrderFilled', makeListener);

        const ws = (provider as any)._websocket;

        ws.on('open', () => {
            reconnectDelay = 3_000; // reset backoff on successful connect
            console.log('[OnChain] ✅ Connected — watching CTF Exchange + NegRisk Exchange');
        });

        ws.on('close', () => {
            console.warn(`[OnChain] ⚠️  WSS closed — reconnecting in ${reconnectDelay / 1000}s`);
            ctfContract.removeAllListeners();
            negRiskContract.removeAllListeners();
            provider.removeAllListeners();
            setTimeout(connect, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30_000); // exponential backoff up to 30s
        });

        ws.on('error', (e: any) => {
            console.error('[OnChain] WSS error:', e?.message ?? e);
        });
    };

    connect();
}
