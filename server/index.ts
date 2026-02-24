import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
dotenv.config({ path: path.resolve(__dirname2, '../.env') });

// Bootstrap global-agent to route ALL HTTP requests (including axios/CLOB client) through proxy
if (process.env.GLOBAL_AGENT_HTTP_PROXY) {
    try {
        const _require = createRequire(import.meta.url);
        _require('global-agent/bootstrap');
        console.log(`[Proxy] ✅ global-agent bootstrapped → ${process.env.GLOBAL_AGENT_HTTP_PROXY}`);
    } catch (e: any) {
        console.warn(`[Proxy] ⚠️ global-agent bootstrap failed: ${e.message}`);
    }
}

process.on('unhandledRejection', (reason: any) => {
    console.error('[CRASH GUARD] Unhandled Promise Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err: Error) => {
    console.error('[CRASH GUARD] Uncaught Exception:', err.message);
    console.error(err.stack);
});

import express from 'express';
import cors from 'cors';

import { initializeAgents, syncClobBalances, getAllTrades, getAllAgentStats, getRecentEquity, clearAllData, recordEquitySnapshot } from './models/db.js';
import { addSSEClient, pushStatsUpdate } from './sse.js';
import { startCopyTraderSocket, setBalanceSyncFn, reloadDonors } from './services/copyTrader.js';
import { initRealTrader, getAllClobBalances } from './services/realTrader.js';
import { startOnChainListener } from './services/onChainListener.js';
import { MODELS, AGENT_DONORS } from '../src/data/constants.js';

const app = express();

// Path to persisted donor config — survives restarts, not committed to git
const DONORS_FILE = path.resolve(__dirname2, '../data/donors.json');

function readDonorsFile() {
    if (existsSync(DONORS_FILE)) {
        try { return JSON.parse(readFileSync(DONORS_FILE, 'utf8')); } catch { }
    }
    return null;
}

function writeDonorsFile(donors: any[]) {
    const dir = path.dirname(DONORS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(DONORS_FILE, JSON.stringify(donors, null, 2), 'utf8');
}
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

// ----- Initialize DB -----
const AGENT_IDS = MODELS.map(m => m.id);


initializeAgents(AGENT_IDS);

// ----- REST API endpoints -----

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/trades', (_req, res) => {
    try {
        const trades = getAllTrades();
        res.json(trades);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

app.get('/api/stats', (_req, res) => {
    try {
        const stats = getAllAgentStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/balances', (_req, res) => {
    try {
        const equity = getRecentEquity();
        res.json(equity);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch balances' });
    }
});

// Prices endpoint — real data from Binance
app.get('/api/prices', async (_req, res) => {
    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`;
        const resp = await fetch(url);
        const data = await resp.json();

        const formatted = data.map((item: any) => {
            const symbol = item.symbol.replace('USDT', '');
            return {
                symbol,
                price: parseFloat(item.lastPrice),
                change: parseFloat(item.priceChangePercent),
                name: symbol === 'BTC' ? 'Bitcoin' : symbol === 'ETH' ? 'Ethereum' : symbol === 'SOL' ? 'Solana' : 'XRP',
                logo: ''
            };
        });
        res.json(formatted);
    } catch (e) {
        // Fallback to static if API fails
        res.json([
            { symbol: 'BTC', price: 95000, change: 0, name: 'Bitcoin', logo: '' },
            { symbol: 'ETH', price: 2700, change: 0, name: 'Ethereum', logo: '' },
            { symbol: 'SOL', price: 140, change: 0, name: 'Solana', logo: '' },
            { symbol: 'XRP', price: 2.2, change: 0, name: 'XRP', logo: '' },
        ]);
    }
});

// Manual balance refresh endpoint
app.post('/api/balances/sync', async (_req, res) => {
    try {
        const clob = await getAllClobBalances();
        syncClobBalances(clob);
        recordEquitySnapshot();
        pushStatsUpdate();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Clear all trade history (admin — requires ADMIN_PASSWORD)
app.delete('/api/admin/clear-data', (req, res) => {
    const pw = (req.headers['x-admin-password'] as string) ?? (req.body?.password as string) ?? '';
    const expected = process.env.ADMIN_PASSWORD ?? '';
    if (expected && pw !== expected) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        clearAllData();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Clear failed' });
    }
});

// Get current donor config
app.get('/api/admin/donors', (req, res) => {
    const pw = (req.headers['x-admin-password'] as string) ?? '';
    const expected = process.env.ADMIN_PASSWORD ?? '';
    if (expected && pw !== expected) { res.status(401).json({ error: 'Unauthorized' }); return; }
    res.json(readDonorsFile() ?? AGENT_DONORS);
});

// Update donor wallets live — no server restart needed
app.post('/api/admin/donors', (req, res) => {
    const pw = (req.headers['x-admin-password'] as string) ?? (req.body?.password as string) ?? '';
    const expected = process.env.ADMIN_PASSWORD ?? '';
    if (expected && pw !== expected) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const donors: any[] = req.body?.donors;
    if (!Array.isArray(donors)) { res.status(400).json({ error: 'body.donors must be an array' }); return; }
    for (const d of donors) {
        if (!d.agentId || typeof d.proxyWallet !== 'string') {
            res.status(400).json({ error: 'Each entry needs agentId (string) and proxyWallet (string)' }); return;
        }
    }
    try {
        writeDonorsFile(donors);
        reloadDonors(donors);
        res.json({ ok: true, active: donors.filter((d: any) => /^0x[0-9a-fA-F]{40}$/.test(d.proxyWallet)).length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// SSE — push trade events to frontend instantly
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('retry: 3000\n\n');
    const cleanup = addSSEClient(res);
    const heartbeat = setInterval(() => {
        try { res.write(':heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 25_000);
    req.on('close', () => { clearInterval(heartbeat); cleanup(); });
});

// ----- Serve static frontend in production -----

const distPath = path.resolve(__dirname2, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// ----- Start everything -----

const startServer = async () => {
    try {
        const server = app.listen(PORT, async () => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`  POLYFIVE COPYTRADER  http://localhost:${PORT}`);
            console.log(`${'='.repeat(60)}\n`);

            await initRealTrader();
            // Sync CLOB collateral balances (fast parallel, never zeros on failure)
            const clobBal = await getAllClobBalances();
            syncClobBalances(clobBal);
            recordEquitySnapshot();
            pushStatsUpdate();
            // After each trade — re-sync balance and push to frontend
            setBalanceSyncFn(async () => {
                const clob = await getAllClobBalances();
                syncClobBalances(clob);
                recordEquitySnapshot();
                pushStatsUpdate();
            });
            // Periodic background sync every 20 seconds (speeding up UI feedback)
            setInterval(async () => {
                const clob = await getAllClobBalances();
                syncClobBalances(clob);
                recordEquitySnapshot();
                pushStatsUpdate();
            }, 20 * 1000);
            startOnChainListener();
            // Start the copy-trading listener (initializes with AGENT_DONORS defaults)
            startCopyTraderSocket();
            // Override with persisted donors.json if available (hot-reload config)
            const savedDonors = readDonorsFile();
            if (savedDonors) {
                reloadDonors(savedDonors);
                console.log(`[Donors] Loaded from donors.json (${savedDonors.length} entries)`);
            }

            process.on('SIGINT', () => {
                console.log('\n[SERVER] Graceful shutdown...');
                server.close(() => process.exit(0));
            });
        });

        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
                console.error(`👉 Run this to fix: npx kill-port ${PORT}\n`);
                process.exit(1);
            }
        });
    } catch (e: any) {
        console.error('[SERVER] Failed to start:', e.message);
    }
};

startServer();
