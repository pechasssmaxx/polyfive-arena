/**
 * realTrader.ts
 * Executes real Polymarket CLOB orders for multiple agents.
 * OPTIMIZED: Token ID cache eliminates redundant getMarket() calls.
 */

import { ClobClient, Side, OrderType, ApiKeyCreds } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const CLOB_HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

const SIMULATION = process.env.SIMULATION_MODE === 'true';

// Map of agentId -> ClobClient
const clients = new Map<string, ClobClient>();

// ─── Token ID cache ───────────────────────────────────────────────────────────
const tokenCache = new Map<string, { tokenId: string; exp: number }>();
const TOKEN_CACHE_TTL = 60 * 60 * 1000;

function getCachedTokenId(conditionId: string, outcomeIndex: number): string | null {
    const key = `${conditionId}_${outcomeIndex}`;
    const entry = tokenCache.get(key);
    if (!entry || Date.now() > entry.exp) {
        tokenCache.delete(key);
        return null;
    }
    return entry.tokenId;
}

function cacheTokenId(conditionId: string, outcomeIndex: number, tokenId: string): void {
    tokenCache.set(`${conditionId}_${outcomeIndex}`, {
        tokenId,
        exp: Date.now() + TOKEN_CACHE_TTL,
    });
}

export async function initRealTrader(): Promise<void> {
    if (SIMULATION) return;

    // Initialize all 5 possible bots from .env
    for (let i = 1; i <= 5; i++) {
        const pkey = process.env[`BOT_${i}_PKEY`];
        const funder = process.env[`BOT_${i}_FUNDER`];

        // Use per-bot CLOB credentials, fall back to global BOT_1 key
        const apiKey     = process.env[`BOT_${i}_CLOB_API_KEY`]    || process.env.CLOB_API_KEY;
        const secret     = process.env[`BOT_${i}_CLOB_SECRET`]     || process.env.CLOB_SECRET;
        const passphrase = process.env[`BOT_${i}_CLOB_PASSPHRASE`] || process.env.CLOB_PASSPHRASE;

        if (!pkey || !apiKey || !secret || !passphrase) continue;

        try {
            const signer = new ethers.Wallet(pkey);
            const creds: ApiKeyCreds = { key: apiKey, secret, passphrase };
            const signatureType = funder && funder.length === 42 ? 2 : 0;

            const client = new ClobClient(CLOB_HOST, CHAIN_ID, signer as any, creds, signatureType, funder);

            // Map index to internal ID (1->claude, 2->chatgpt, etc)
            const agentIds = ['claude', 'chatgpt', 'gemini', 'grok', 'deepseek'];
            const agentId = agentIds[i - 1];

            clients.set(agentId, client);
            console.log(`[RealTrader] ✅ ${agentId.toUpperCase()} ready — ${signer.address.slice(0, 10)}...`);
        } catch (e: any) {
            console.error(`[RealTrader] ${i} Init failed:`, e.message);
        }
    }
}

// ─── Order precision helpers ──────────────────────────────────────────────────
function gcd(a: number, b: number): number {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b > 0) { [a, b] = [b, a % b]; }
    return a;
}

function computeBuyShares(targetUsdc: number, price: number): number {
    const priceInt = Math.round(price * 100);
    const g = gcd(priceInt, 10000);
    const stepN = Math.round(10000 / g);
    const minCost = Math.max(targetUsdc, 1.01);
    const minN = Math.ceil((minCost / price) * 10000 / stepN);
    return (minN * stepN) / 10000;
}

function computeSellShares(balance: number, price: number): number {
    const priceInt = Math.round(price * 100);
    const g = gcd(priceInt, 10000);
    const stepN = Math.round(10000 / g);
    const maxN = Math.floor((balance * 10000) / stepN);
    if (maxN <= 0) return Math.round(balance * 10000) / 10000;
    const shares = (maxN * stepN) / 10000;
    if (shares * price < 1.00) {
        const minN = Math.ceil((1.01 / price) * 10000 / stepN);
        const minShares = (minN * stepN) / 10000;
        return minShares <= balance ? minShares : Math.round(balance * 10000) / 10000;
    }
    return shares;
}

async function resolveTokenId(agentId: string, conditionId: string, outcomeIndex: number, directTokenId?: string): Promise<string | null> {
    // Fast path: caller already has tokenId from event.asset — skip getMarket() entirely
    if (directTokenId) {
        cacheTokenId(conditionId, outcomeIndex, directTokenId);
        return directTokenId;
    }

    const cached = getCachedTokenId(conditionId, outcomeIndex);
    if (cached) return cached;

    const client = clients.get(agentId);
    if (!client) return null;

    const market: any = await client.getMarket(conditionId);
    if (!market?.tokens?.[outcomeIndex]) return null;

    const tokenId: string = market.tokens[outcomeIndex].token_id;
    cacheTokenId(conditionId, outcomeIndex, tokenId);
    return tokenId;
}

export async function executeCopyTrade(
    agentId: string,
    conditionId: string,
    outcomeIndex: number,
    donorPrice: number,
    usdcAmount: number,
    directTokenId?: string
): Promise<{ realPrice: number, realSize: number } | null> {
    const client = clients.get(agentId);
    if (!client) return null;

    try {
        const tokenId = await resolveTokenId(agentId, conditionId, outcomeIndex, directTokenId);
        if (!tokenId) return null;

        const orderPrice = Math.min(0.99, parseFloat((donorPrice + 0.03).toFixed(2)));
        const shares = computeBuyShares(usdcAmount, orderPrice);
        if (shares <= 0) return null;

        console.log(`[RealTrader] ⚡ [${agentId}] BUY ${shares.toFixed(4)} @ ${orderPrice.toFixed(2)}¢ ($${(shares * orderPrice).toFixed(2)})`);

        const order = await client.createOrder({
            tokenID: tokenId,
            price: orderPrice,
            size: shares,
            side: Side.BUY,
            feeRateBps: 1000,
        });

        const result: any = await client.postOrder(order, OrderType.FAK);
        if (result?.error || result?.status === 'error' || result?.status === 'rejected') {
            console.error(`[RealTrader] ❌ [${agentId}] BUY Error:`, JSON.stringify(result));
            return null;
        }

        console.log(`[RealTrader] ✅ [${agentId}] BUY Filled: ${result?.orderID || 'Success'}`);
        return { realPrice: orderPrice, realSize: (shares * orderPrice) };
    } catch (e: any) {
        console.error(`[RealTrader] ❌ [${agentId}] BUY Catch:`, e.message);
        return null;
    }
}

export async function getAllClobBalances(): Promise<Record<string, number>> {
    const entries = await Promise.all(
        Array.from(clients.entries()).map(async ([agentId, client]) => {
            try {
                const balanceResp: any = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' as any });
                const raw = parseFloat(balanceResp?.balance ?? '0');
                const bal = raw / 1_000_000;
                console.log(`[RealTrader] 💰 ${agentId} CLOB balance: $${bal.toFixed(2)}`);
                return [agentId, bal] as [string, number];
            } catch {
                return [agentId, 0] as [string, number];
            }
        })
    );
    return Object.fromEntries(entries);
}

export async function executeCloseTrade(
    agentId: string,
    conditionId: string,
    outcomeIndex: number,
    donorSellPrice?: number,
    directTokenId?: string,
    sharesToSell?: number
): Promise<void> {
    const client = clients.get(agentId);
    if (!client) return;

    try {
        const tokenId = await resolveTokenId(agentId, conditionId, outcomeIndex, directTokenId);
        if (!tokenId) return;

        let balance: number;
        if (sharesToSell && sharesToSell > 0.01) {
            // Use known shares from DB trade record — avoids stale CLOB balance right after BUY
            balance = sharesToSell;
            console.log(`[RealTrader] 🔍 [${agentId}] Using known shares: ${balance.toFixed(4)} (skip CLOB balance query)`);
        } else {
            console.log(`[RealTrader] 🔍 [${agentId}] Checking balance for ${tokenId.slice(0, 10)}...`);
            const balanceResp: any = await client.getBalanceAllowance({
                asset_type: 'CONDITIONAL' as any,
                token_id: tokenId
            });
            const rawBalance = parseFloat(balanceResp?.balance ?? "0");
            balance = rawBalance / 1_000_000;
            if (balance <= 0.0001) {
                console.log(`[RealTrader] ℹ️ [${agentId}] Zero/Dust balance.`);
                return;
            }
        }

        let orderPrice = 0.01;
        if (donorSellPrice && donorSellPrice > 0.03) {
            orderPrice = Math.max(0.01, parseFloat((donorSellPrice - 0.02).toFixed(2)));
        } else {
            try {
                const priceResp: any = await client.getPrice(tokenId, Side.BUY);
                const parsed = parseFloat(priceResp?.price ?? priceResp);
                if (!isNaN(parsed) && parsed > 0.01) orderPrice = Math.max(0.01, parseFloat((parsed - 0.05).toFixed(2)));
            } catch { }
        }

        const shares = computeSellShares(balance, orderPrice);
        if (shares <= 0) return;

        console.log(`[RealTrader] 🔒 [${agentId}] SELL ${shares.toFixed(4)} @ ${orderPrice.toFixed(2)}¢`);

        const order = await client.createOrder({
            tokenID: tokenId,
            price: orderPrice,
            size: shares,
            side: Side.SELL,
            feeRateBps: 1000,
        });

        const result: any = await client.postOrder(order, OrderType.FAK);
        if (result?.error || result?.status === 'error' || result?.status === 'rejected') {
            throw new Error(`Sell rejected: ${JSON.stringify(result)}`);
        }
        console.log(`[RealTrader] ✅ [${agentId}] SELL Filled: ${result?.orderID || 'Success'}`);
    } catch (e: any) {
        console.error(`[RealTrader] ❌ [${agentId}] SELL Catch:`, e.message);
        throw e;
    }
}
