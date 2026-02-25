import { insertTrade, updateTradeOnClose, hasSeenTrade, getAgentBalance, updateAgentStatsAndBalance, deductVirtualBalance, recordEquitySnapshot, updateTradeWithRealExecution, getOpenTradesByMarket, getAllOpenTrades } from '../models/db.js';
import { TradeEntry } from '../../shared/types.js';
import { AGENT_DONORS, MODELS } from '../../src/data/constants.js';
import { executeCopyTrade, executeCloseTrade } from './realTrader.js';
import { RealTimeDataClient } from '@polymarket/real-time-data-client';
import { executedOnChain } from './onChainListener.js';
import { pushTradeEvent, pushStatsUpdate } from '../sse.js';

const DATA_API = 'https://data-api.polymarket.com';

// Balance refresh callback — set from server/index.ts after CLOB clients are ready
let _balanceSyncFn: (() => Promise<void>) | null = null;
export function setBalanceSyncFn(fn: () => Promise<void>): void { _balanceSyncFn = fn; }

// Debounced balance refresh — syncs at 4s (fast UI feedback) + 15s (CLOB propagation)
let _balanceSyncTimer: ReturnType<typeof setTimeout> | null = null;
let _balanceSyncTimer2: ReturnType<typeof setTimeout> | null = null;
function scheduleBalanceSync(): void {
    if (!_balanceSyncFn) return;
    if (_balanceSyncTimer) clearTimeout(_balanceSyncTimer);
    if (_balanceSyncTimer2) clearTimeout(_balanceSyncTimer2);
    _balanceSyncTimer = setTimeout(() => {
        _balanceSyncFn!().catch(() => { });
        _balanceSyncTimer = null;
    }, 4_000);
    _balanceSyncTimer2 = setTimeout(() => {
        _balanceSyncFn!().catch(() => { });
        _balanceSyncTimer2 = null;
    }, 15_000);
}

// Look back 30s on first poll per wallet — catches trades missed before WS connected
const INITIAL_LOOKBACK_S = 30;

// Track last-processed timestamp (seconds) per wallet
const lastSeenTs = new Map<string, number>();

// Emergency lock to prevent race conditions during parallel event processing
const processingEntryKeys = new Set<string>();

// Donor wallet set (lowercase) for O(1) lookup in WS handler
const donorWalletSet = new Set<string>();

// Maps lowercase wallet address → agentId[] (donor → the agents that copy from this donor)
const donorToAgent = new Map<string, string[]>();

// Live list of proxy wallets used by REST polling — updated by reloadDonors()
let liveDonorWallets: string[] = [];

// Own proxy wallets (BOT_X_FUNDER from MODELS) — detected and shown per-agent, no copy execution
const ownWalletSet = new Set<string>();
const ownWalletToAgent = new Map<string, string>();
let ownProxyWalletsList: string[] = [];

function initOwnWallets(): void {
    ownWalletSet.clear();
    ownWalletToAgent.clear();
    ownProxyWalletsList = [];
    for (const model of MODELS) {
        if (/^0x[0-9a-fA-F]{40}$/.test(model.wallet)) {
            const w = model.wallet.toLowerCase();
            ownWalletSet.add(w);
            ownWalletToAgent.set(w, model.id);
            ownProxyWalletsList.push(model.wallet);
        }
    }
    console.log(`[CopyTrader] Self-trade monitoring: ${ownWalletSet.size} own proxy wallet(s)`);
}

// Rebuild donor maps in-memory without restarting the server.
// Called on startup and by POST /api/admin/donors.
export function reloadDonors(donors: { agentId: string; proxyWallet: string; onchainWallet: string }[]): void {
    donorWalletSet.clear();
    donorToAgent.clear();
    liveDonorWallets = [];
    for (const d of donors) {
        if (/^0x[0-9a-fA-F]{40}$/.test(d.proxyWallet)) {
            const w = d.proxyWallet.toLowerCase();
            donorWalletSet.add(w);
            if (!liveDonorWallets.includes(d.proxyWallet)) liveDonorWallets.push(d.proxyWallet);
            if (!donorToAgent.has(w)) donorToAgent.set(w, []);
            donorToAgent.get(w)!.push(d.agentId);
        }
        if (/^0x[0-9a-fA-F]{40}$/.test(d.onchainWallet)) {
            const w = d.onchainWallet.toLowerCase();
            donorWalletSet.add(w);
            if (!donorToAgent.has(w)) donorToAgent.set(w, []);
            donorToAgent.get(w)!.push(d.agentId);
        }
    }
    const total = new Set(Array.from(donorToAgent.values()).flat()).size;
    console.log(`[CopyTrader] Donors reloaded: ${donorWalletSet.size} wallet(s) → ${total} agent(s)`);
}

export async function startMarketAnalyzerSocket() {
    console.log('[CopyTrader] Initializing Gamma API Copy Module...');

    // Init own proxy wallet monitoring (always active, regardless of donor config)
    initOwnWallets();
    // Build donor → agent mapping from AGENT_DONORS config (may be overridden by donors.json after this)
    reloadDonors(AGENT_DONORS);

    if (donorWalletSet.size > 0) {
        const totalAgentsMapped = new Set(Array.from(donorToAgent.values()).flat()).size;
        console.log(`[CopyTrader] Tracking ${donorWalletSet.size} donor wallet(s) → ${totalAgentsMapped} agent entries — WebSocket PRIMARY + 3s polling backup`);
    } else {
        console.log('[CopyTrader] No donor wallets configured — self-trade monitoring only');
    }
    startMetricsAggregator();

    // Check if any already-open trades have resolved markets (e.g. after restart)
    await checkMarketResolutions();
    // Poll for resolution every 15 seconds (5m markets resolve fast)
    setInterval(checkMarketResolutions, 15_000);

    // --- COPYTRADING DISABLED PER USER REQUEST ---
    // startDonorWebSocket();

    // Start polling ONLY for our own proxy wallets (to detect manual trades)
    await pollOwnWallets();
    setInterval(pollOwnWallets, 3_000);
}

// ─── WebSocket real-time stream (PRIMARY) ─────────────────────────────────────

function startDonorWebSocket() {
    let wsClient: RealTimeDataClient;
    let reconnectAttempts = 0;

    function connectWithBackoff() {
        wsClient = new RealTimeDataClient({
            autoReconnect: false, // We handle it manually to prevent 429s
            onConnect: (client) => {
                reconnectAttempts = 0;
                console.log('[WS] ✅ Connected to Polymarket real-time stream');
                client.subscribe({
                    subscriptions: [
                        { topic: 'activity', type: 'trades' },
                        { topic: 'activity', type: 'orders_matched' },
                    ],
                });
            },
            onMessage: (_client, msg: any) => {
                if (msg.topic !== 'activity') return;

                const trade = msg.payload as any;
                const rawWallet: string = trade.proxyWallet ?? '';
                if (!rawWallet) return;

                const walletLower = rawWallet.toLowerCase();
                if (!donorWalletSet.has(walletLower) && !ownWalletSet.has(walletLower)) return;

                console.log(`[WS] ⚡ LIVE event from donor ${walletLower.slice(0, 10)}...`);

                if (trade.timestamp) {
                    const current = lastSeenTs.get(walletLower) ?? 0;
                    if (trade.timestamp > current) {
                        lastSeenTs.set(walletLower, trade.timestamp);
                    }
                }

                handleActivityEvent(walletLower, trade);
            },
            onStatusChange: (status: any) => {
                console.log(`[WS] Status: ${status}`);
                if (status === 'DISCONNECTED') {
                    // Exponential backoff logic
                    reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
                    console.warn(`[WS] ⚠️ Disconnected. Reconnecting in ${delay / 1000}s...`);
                    setTimeout(() => {
                        console.log(`[WS] 🔄 Attempting to reconnect... (Attempt ${reconnectAttempts})`);
                        connectWithBackoff();
                    }, delay);
                }
            },
        });

        wsClient.connect();
    }

    connectWithBackoff();
    // Return a dummy object or the current client if needed, though usually not strictly required here
    return { connect: () => { } };
}

// ─── Real Gamma API polling ───────────────────────────────────────────────────

async function pollOwnWallets() {
    // Poll ONLY own proxy wallets to detect manual trades by the user
    for (const wallet of ownProxyWalletsList) {
        if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) continue;
        try {
            await pollWallet(wallet);
        } catch (e: any) {
            console.error(`[CopyTrader] Poll error ${wallet.slice(0, 8)}...: ${e.message}`);
        }
    }
}

async function pollWallet(wallet: string) {
    // Timestamps from the API are in SECONDS
    const nowS = Math.floor(Date.now() / 1000);
    const since = lastSeenTs.get(wallet) ?? (nowS - INITIAL_LOOKBACK_S);

    const url = `${DATA_API}/activity?user=${wallet}&limit=100`;
    const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
    } as RequestInit);

    if (!resp.ok) {
        console.warn(`[CopyTrader] API ${resp.status} for ${wallet.slice(0, 8)}`);
        return;
    }

    const data: any[] = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return;

    // Filter to only new events and sort oldest-first
    const newEvents = data
        .filter(a => (a.timestamp ?? 0) > since)
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    if (newEvents.length === 0) return;

    console.log(`[CopyTrader] 📡 ${newEvents.length} new event(s) from ${wallet.slice(0, 8)}...`);

    for (const event of newEvents) {
        handleActivityEvent(wallet, event);
    }

    // Advance cursor to the newest event timestamp
    const maxTs = Math.max(...newEvents.map(a => a.timestamp ?? 0));
    lastSeenTs.set(wallet, maxTs);
}

// ─── Event handling ───────────────────────────────────────────────────────────

function extractAsset(event: any): string {
    // Try icon URL first: ".../BTC+fullsize.png"
    const icon: string = event.icon ?? event.image ?? '';
    const iconMatch = icon.match(/\/([A-Z]{2,5})[+ ]/);
    if (iconMatch) return iconMatch[1];

    // Try eventSlug: "btc-updown-5m-..." or "eth-usd-..."
    const slug: string = event.eventSlug ?? event.slug ?? '';
    if (/\bbtc\b/i.test(slug)) return 'BTC';
    if (/\beth\b/i.test(slug)) return 'ETH';
    if (/\bsol\b/i.test(slug)) return 'SOL';
    if (/\bxrp\b/i.test(slug)) return 'XRP';

    // Try title
    const title: string = event.title ?? event.market ?? '';
    if (/bitcoin|btc/i.test(title)) return 'BTC';
    if (/ethereum|eth/i.test(title)) return 'ETH';
    if (/solana|sol/i.test(title)) return 'SOL';
    if (/xrp|ripple/i.test(title)) return 'XRP';

    // Use first word of title (max 4 chars)
    const first = title.trim().split(/\s+/)[0] ?? 'POLY';
    return first.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4) || 'POLY';
}

function extractSide(event: any): 'YES' | 'NO' {
    const outcome: string = (event.outcome ?? '').toLowerCase();
    if (outcome === 'yes' || outcome === 'up' || outcome === 'higher' || outcome === 'above') return 'YES';
    if (outcome === 'no' || outcome === 'down' || outcome === 'lower' || outcome === 'below') return 'NO';
    // Fallback: outcomeIndex 0 is typically YES/Up
    return (event.outcomeIndex ?? 0) === 0 ? 'YES' : 'NO';
}

// ─── Self-trade handler (own proxy wallet, no executeCopyTrade) ───────────────

function handleSelfTrade(wallet: string, event: any) {
    const side: string = (event.side ?? '').toUpperCase();
    if (!side) return;

    const agentId = ownWalletToAgent.get(wallet.toLowerCase());
    if (!agentId) return;

    const conditionId: string = event.conditionId ?? '';
    const outcomeIdx: number = event.outcomeIndex ?? 0;
    const txHash: string = event.transactionHash ?? `${conditionId}_${event.timestamp}`;
    const asset = extractAsset(event);
    const tradeSide = extractSide(event);
    const price: number = typeof event.price === 'number' ? event.price : 0.5;
    const tsMs: number = (event.timestamp ?? Math.floor(Date.now() / 1000)) * 1000;
    const title: string = event.title ?? event.market ?? 'Polymarket Trade';
    const eventSlug: string = event.eventSlug ?? event.slug ?? '';
    const marketUrl = eventSlug ? `https://polymarket.com/event/${eventSlug}` : 'https://polymarket.com';
    const endTs = estimateMarketEnd(eventSlug, tsMs);
    const positionKey = `${conditionId}_${outcomeIdx}`;

    if (side === 'BUY') {
        const tradeId = `${conditionId}_${outcomeIdx}_${txHash}_${agentId}`;
        if (hasSeenTrade(tradeId)) return;

        const positionKeyForAgent = `${positionKey}_${agentId}`;
        if (processingEntryKeys.has(positionKeyForAgent)) return;

        const existingTrades = getOpenTradesByMarket(conditionId, outcomeIdx);
        if (existingTrades.some(t => t.agentId === agentId)) return;

        processingEntryKeys.add(positionKeyForAgent);

        const balance = getAgentBalance(agentId);
        if (balance < 1) {
            processingEntryKeys.delete(positionKeyForAgent);
            return;
        }

        const positionSize = parseFloat((1.1 + Math.random() * 0.2).toFixed(2));

        const trade: TradeEntry & { conditionId: string; outcomeIndex: number } = {
            id: tradeId, agentId, donorWallet: wallet, asset,
            assetLogo: event.icon ?? '',
            direction: tradeSide === 'YES' ? 'UP' : 'DOWN',
            entryPrice: price, exitPrice: 0, positionSize,
            pnl: 0, pnlPercent: 0, status: 'open',
            marketQuestion: title, marketEndTimestamp: endTs,
            openTimestamp: tsMs, closeTimestamp: 0,
            side: tradeSide, marketUrl, conditionId, outcomeIndex: outcomeIdx,
        };

        insertTrade(trade);
        deductVirtualBalance(agentId, positionSize);
        recordEquitySnapshot();
        pushTradeEvent('trade:open', trade);
        pushStatsUpdate();
        console.log(`[SelfTrade] [${agentId}] BUY ${asset} ${tradeSide} @ ${(price * 100).toFixed(0)}¢  $${positionSize.toFixed(2)}`);
        setTimeout(() => processingEntryKeys.delete(positionKeyForAgent), 5000);

    } else if (side === 'SELL') {
        const openTrades = getOpenTradesByMarket(conditionId, outcomeIdx).filter(t => t.agentId === agentId);
        if (openTrades.length === 0) return;

        for (const openTrade of openTrades) {
            const sellKey = `${positionKey}_${agentId}_sell`;
            if (processingEntryKeys.has(sellKey)) continue;
            processingEntryKeys.add(sellKey);

            const shares = openTrade.positionSize / openTrade.entryPrice;
            const pnlUsd = parseFloat((shares * (price - openTrade.entryPrice)).toFixed(2));
            const pnlPercent = parseFloat(((price - openTrade.entryPrice) / openTrade.entryPrice * 100).toFixed(2));
            const isWin = pnlUsd > 0;

            updateTradeOnClose(openTrade.id, price, pnlUsd, pnlPercent, tsMs, 'closed');
            updateAgentStatsAndBalance(agentId, pnlUsd, openTrade.positionSize, isWin);
            pushTradeEvent('trade:close', { ...openTrade, exitPrice: price, pnl: pnlUsd, pnlPercent, closeTimestamp: tsMs, status: 'closed' });
            pushStatsUpdate();
            console.log(`[SelfTrade] [${agentId}] SELL @ ${(price * 100).toFixed(0)}¢ → ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)}`);
            setTimeout(() => processingEntryKeys.delete(sellKey), 5000);
        }
    }
}

// ─── Copy-trade event handler ─────────────────────────────────────────────────

function handleActivityEvent(wallet: string, event: any) {
    // Route own proxy wallet events to direct handler (no copy execution)
    if (ownWalletSet.has(wallet.toLowerCase())) {
        handleSelfTrade(wallet, event);
        return;
    }

    // API returns type="TRADE", side="BUY" or "SELL"
    const side: string = (event.side ?? '').toUpperCase();   // "BUY" | "SELL"
    if (!side) return;

    const conditionId: string = event.conditionId ?? '';
    const outcomeIdx: number = event.outcomeIndex ?? 0;
    const tokenId: string = event.asset ?? '';  // ERC1155 token ID — skip getMarket() CLOB call
    const txHash: string = event.transactionHash ?? `${conditionId}_${event.timestamp}`;
    const asset = extractAsset(event);
    const tradeSide = extractSide(event);
    const price: number = typeof event.price === 'number' ? event.price : 0.5;
    const tsMs: number = (event.timestamp ?? Math.floor(Date.now() / 1000)) * 1000; // sec → ms
    const title: string = event.title ?? event.market ?? 'Polymarket Trade';
    const eventSlug: string = event.eventSlug ?? event.slug ?? '';
    const marketUrl = eventSlug
        ? `https://polymarket.com/event/${eventSlug}`
        : 'https://polymarket.com';
    // Market end: rough heuristic — if slug contains timeframe ("5m", "1h"), set accordingly
    const endTs = estimateMarketEnd(eventSlug, tsMs);

    // Use conditionId + outcomeIndex as position key (per agent)
    const positionKey = `${conditionId}_${outcomeIdx}`;

    if (side === 'BUY') {
        const targetAgents = donorToAgent.get(wallet.toLowerCase()) ?? [];
        if (targetAgents.length === 0) return;

        for (const agent of targetAgents) {
            console.log(`[CopyTrader] ⚡ BUY  ${asset} ${tradeSide} @ ${(price * 100).toFixed(0)}¢ | Agent: ${agent} | "${title.slice(0, 40)}"`);

            const balance = getAgentBalance(agent);
            if (balance < 1) {
                console.log(`   [${agent}] ⚠️  Balance $${balance.toFixed(2)} < $1 — skipping`);
                continue;
            }

            const tradeId = `${conditionId}_${outcomeIdx}_${txHash}_${agent}`;
            if (hasSeenTrade(tradeId)) continue;

            const positionKeyForAgent = `${positionKey}_${agent}`;
            if (processingEntryKeys.has(positionKeyForAgent)) continue;

            const existingTrades = getOpenTradesByMarket(conditionId, outcomeIdx);
            if (existingTrades.some(t => t.agentId === agent)) continue;

            processingEntryKeys.add(positionKeyForAgent);

            const positionSize = parseFloat((1.1 + Math.random() * 0.2).toFixed(2));

            const trade: TradeEntry & { conditionId: string; outcomeIndex: number } = {
                id: tradeId,
                agentId: agent,
                donorWallet: wallet,
                asset,
                assetLogo: event.icon ?? '',
                direction: tradeSide === 'YES' ? 'UP' : 'DOWN',
                entryPrice: price,
                exitPrice: 0,
                positionSize,
                pnl: 0,
                pnlPercent: 0,
                status: 'open',
                marketQuestion: title,
                marketEndTimestamp: endTs,
                openTimestamp: tsMs,
                closeTimestamp: 0,
                side: tradeSide,
                marketUrl,
                conditionId,
                outcomeIndex: outcomeIdx
            };

            insertTrade(trade);
            deductVirtualBalance(agent, positionSize);
            recordEquitySnapshot();
            pushTradeEvent('trade:open', trade);
            console.log(`   [${agent}] Copied @ ${(price * 100).toFixed(0)}¢  $${positionSize.toFixed(2)}`);

            if (conditionId) {
                if (executedOnChain.has(txHash)) {
                    console.log(`   [${agent}] ⏭️  On-chain pre-executed, skipping redundant fill`);
                    setTimeout(() => processingEntryKeys.delete(positionKeyForAgent), 5000);
                } else {
                    executeCopyTrade(agent, conditionId, outcomeIdx, price, positionSize, tokenId)
                        .then((realData) => {
                            if (realData) {
                                updateTradeWithRealExecution(tradeId, realData.realPrice, realData.realSize);
                            }
                            scheduleBalanceSync();
                        })
                        .catch((e: any) => console.error(`[RealTrader] ${agent} BUY error:`, e.message))
                        .finally(() => {
                            setTimeout(() => processingEntryKeys.delete(positionKeyForAgent), 5000);
                        });
                }
            } else {
                setTimeout(() => processingEntryKeys.delete(positionKeyForAgent), 2000);
            }
        }
    } else if (side === 'SELL') {
        const targetAgents = donorToAgent.get(wallet.toLowerCase()) ?? [];
        if (targetAgents.length === 0) return;

        for (const agent of targetAgents) {
            console.log(`[CopyTrader] 🔒 SELL ${asset} @ ${(price * 100).toFixed(0)}¢ | Agent: ${agent} | "${title.slice(0, 40)}"`);

            const openTrades = getOpenTradesByMarket(conditionId, outcomeIdx).filter((t: TradeEntry) => t.agentId === agent);

            if (openTrades.length === 0) {
                console.log(`   [${agent}] No open trades found in DB for ${asset} (market=${conditionId.slice(0, 10)})`);
                continue;
            }

            for (const openTrade of openTrades) {
                // Dedup: prevent concurrent WS + poll SELL from double-executing
                const sellKey = `${positionKey}_${agent}_sell`;
                if (processingEntryKeys.has(sellKey)) {
                    console.log(`   [${agent}] ⏭️  SELL already in-flight, skipping duplicate`);
                    continue;
                }
                processingEntryKeys.add(sellKey);

                const entryPrice = openTrade.entryPrice;
                const positionSize = openTrade.positionSize;
                const shares = positionSize / entryPrice;
                const pnlUsd = parseFloat((shares * (price - entryPrice)).toFixed(2));
                const pnlPercent = parseFloat(((price - entryPrice) / entryPrice * 100).toFixed(2));
                const isWin = pnlUsd > 0;

                if (conditionId) {
                    if (executedOnChain.has(txHash)) {
                        console.log(`   [${agent}] ⏭️  On-chain pre-executed SELL, updating DB only`);
                        updateTradeOnClose(openTrade.id, price, pnlUsd, pnlPercent, tsMs, 'closed');
                        updateAgentStatsAndBalance(agent, pnlUsd, openTrade.positionSize, isWin);
                        pushTradeEvent('trade:close', { ...openTrade, exitPrice: price, pnl: pnlUsd, pnlPercent, closeTimestamp: tsMs, status: 'closed' });
                        setTimeout(() => processingEntryKeys.delete(sellKey), 5000);
                    } else {
                        console.log(`   [${agent}] Triggering real SELL for market ${conditionId.slice(0, 10)}...`);
                        const sharesToSell = openTrade.positionSize / openTrade.entryPrice;
                        executeCloseTrade(agent, conditionId, outcomeIdx, price, tokenId, sharesToSell)
                            .catch((e: any) => console.error(`[RealTrader] ${agent} SELL error:`, e.message))
                            .finally(() => {
                                updateTradeOnClose(openTrade.id, price, pnlUsd, pnlPercent, tsMs, 'closed');
                                updateAgentStatsAndBalance(agent, pnlUsd, openTrade.positionSize, isWin);
                                pushTradeEvent('trade:close', { ...openTrade, exitPrice: price, pnl: pnlUsd, pnlPercent, closeTimestamp: tsMs, status: 'closed' });
                                console.log(`   [${agent}] ✅ DB updated: Closed ${openTrade.id.slice(-8)}`);
                                scheduleBalanceSync();
                                setTimeout(() => processingEntryKeys.delete(sellKey), 5000);
                            });
                    }
                } else {
                    updateTradeOnClose(openTrade.id, price, pnlUsd, pnlPercent, tsMs, 'closed');
                    updateAgentStatsAndBalance(agent, pnlUsd, openTrade.positionSize, isWin);
                    pushTradeEvent('trade:close', { ...openTrade, exitPrice: price, pnl: pnlUsd, pnlPercent, closeTimestamp: tsMs, status: 'closed' });
                    console.log(`   [${agent}] Closed trade ${openTrade.id.slice(-8)} @ ${(price * 100).toFixed(0)}¢ → ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)}`);
                    setTimeout(() => processingEntryKeys.delete(sellKey), 5000);
                }
            }
        }
    }
}

function estimateMarketEnd(slug: string, openTs: number): number {
    // Parse timeframe from slug: "btc-updown-5m-...", "btc-1h-...", "eth-daily-..."
    const m = slug.match(/[_-](\d+)(m|h|d)[_-]/i);
    if (m) {
        const n = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        const ms = unit === 'm' ? n * 60_000 : unit === 'h' ? n * 3_600_000 : n * 86_400_000;
        return openTs + ms;
    }
    // Default: 24 hours
    return openTs + 86_400_000;
}

// ─── Market resolution checker ────────────────────────────────────────────────
// For short-term markets (5m, 15m), donors don't manually SELL — the market
// auto-resolves. We poll CLOB API to detect resolved markets and close open trades.

const GAMMA_API = 'https://gamma-api.polymarket.com';

async function checkMarketResolutions() {
    const openTrades = getAllOpenTrades();
    if (openTrades.length === 0) return;

    // Group open trades by conditionId
    const byMarket = new Map<string, typeof openTrades>();
    for (const trade of openTrades) {
        if (!trade.conditionId) continue;
        if (!byMarket.has(trade.conditionId)) byMarket.set(trade.conditionId, []);
        byMarket.get(trade.conditionId)!.push(trade);
    }
    if (byMarket.size === 0) return;

    for (const [conditionId, trades] of byMarket) {
        try {
            // Use Gamma API — CLOB /markets/{id} returns 400 for short-term markets
            const resp = await fetch(`${GAMMA_API}/markets?conditionId=${conditionId}&limit=1`, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(8_000),
            } as RequestInit);
            if (!resp.ok) continue;

            const data: any = await resp.json();
            const market: any = Array.isArray(data) ? data[0] : data;
            if (!market) continue;

            // Resolved when closed=true and outcomePrices shows a definitive winner
            if (!market.closed) continue;

            const rawPrices = market.outcomePrices ?? '[]';
            const outcomePrices: string[] = typeof rawPrices === 'string' ? JSON.parse(rawPrices) : rawPrices;
            const winnerIndex = outcomePrices.findIndex((p: string) => parseFloat(p) >= 0.99);
            if (winnerIndex === -1) continue; // not yet settled

            const winnerOutcome = (market.outcomes ?? [])[winnerIndex] ?? `Outcome ${winnerIndex}`;
            console.log(`[Resolver] ✅ Market resolved: ${conditionId.slice(0, 12)}... → Winner: ${winnerOutcome} (index ${winnerIndex})`);

            for (const trade of trades) {
                const isWin = trade.outcomeIndex === winnerIndex;
                const exitPrice = isWin ? 1.0 : 0.0;
                const entryPrice = trade.entryPrice;
                const shares = trade.positionSize / entryPrice;
                const pnlUsd = parseFloat((shares * (exitPrice - entryPrice)).toFixed(2));
                const pnlPercent = parseFloat(((exitPrice - entryPrice) / entryPrice * 100).toFixed(2));
                const closeTs = Date.now();

                // Attempt to sell winning tokens on CLOB (auto-redeems on-chain if not filled)
                if (isWin && conditionId) {
                    const sharesToSell = trade.positionSize / trade.entryPrice;
                    executeCloseTrade(trade.agentId, conditionId, trade.outcomeIndex, undefined, undefined, sharesToSell)
                        .catch((e: any) => console.error(`[Resolver] Real close failed for ${trade.agentId}: ${e.message}`));
                }

                updateTradeOnClose(trade.id, exitPrice, pnlUsd, pnlPercent, closeTs, 'closed');
                updateAgentStatsAndBalance(trade.agentId, pnlUsd, trade.positionSize, isWin);
                pushTradeEvent('trade:close', { ...trade, exitPrice, pnl: pnlUsd, pnlPercent, closeTimestamp: closeTs, status: 'closed' });
                scheduleBalanceSync();
                console.log(`   [${trade.agentId}] ${isWin ? '🏆 WIN' : '💀 LOSS'} resolved @ ${exitPrice} → ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)}`);
            }
        } catch (e: any) {
            console.error(`[Resolver] Error checking ${conditionId.slice(0, 12)}: ${e.message}`);
        }
    }
}

// ─── Equity snapshots ─────────────────────────────────────────────────────────

function startMetricsAggregator() {
    console.log('[Metrics] Started 1-minute equity snapshots.');
    recordEquitySnapshot();
    setInterval(recordEquitySnapshot, 60_000);
}
