import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { TradeEntry, EquityPoint } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'polyfive_copycat.db'); // New DB name to avoid conflicts with old AI schema
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Migrations — add new columns to existing DB if not present
try { db.exec(`ALTER TABLE trades ADD COLUMN conditionId TEXT`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE trades ADD COLUMN outcomeIndex INTEGER`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE agent_stats ADD COLUMN startingBalance REAL DEFAULT 0`); } catch { /* already exists */ }

// Backfill conditionId + outcomeIndex from trade IDs for existing rows
// Trade ID format: {conditionId}_{outcomeIndex}_{txHash}_{agentId}
// conditionId is a 0x hex string (no underscores), outcomeIndex is 0 or 1
try {
    const nullRows = db.prepare(`SELECT id FROM trades WHERE conditionId IS NULL OR outcomeIndex IS NULL`).all() as { id: string }[];
    const backfill = db.prepare(`UPDATE trades SET conditionId = ?, outcomeIndex = ? WHERE id = ?`);
    for (const { id } of nullRows) {
        const underscoreIdx = id.indexOf('_', id.indexOf('_') + 1); // second underscore
        if (underscoreIdx === -1) continue;
        const firstUnderscore = id.indexOf('_');
        const cid = id.slice(0, firstUnderscore);
        const oidxStr = id.slice(firstUnderscore + 1, underscoreIdx);
        const oidx = parseInt(oidxStr, 10);
        if (cid.startsWith('0x') && !isNaN(oidx)) {
            backfill.run(cid, oidx, id);
        }
    }
    if (nullRows.length > 0) console.log(`[DB] Backfilled conditionId/outcomeIndex for ${nullRows.length} existing trade(s).`);
} catch { /* skip if fails */ }

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        agentId TEXT,
        donorWallet TEXT,
        asset TEXT,
        assetLogo TEXT,
        direction TEXT,
        entryPrice REAL,
        exitPrice REAL,
        positionSize REAL,
        pnl REAL,
        pnlPercent REAL,
        status TEXT,
        marketQuestion TEXT,
        marketEndTimestamp INTEGER,
        openTimestamp INTEGER,
        closeTimestamp INTEGER,
        side TEXT,
        marketUrl TEXT,
        conditionId TEXT,
        outcomeIndex INTEGER
    );

    CREATE TABLE IF NOT EXISTS balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER,
        claude REAL,
        chatgpt REAL,
        gemini REAL,
        grok REAL,
        deepseek REAL
    );

    CREATE TABLE IF NOT EXISTS agent_stats (
        agentId TEXT PRIMARY KEY,
        balance REAL,
        startingBalance REAL DEFAULT 0,
        totalPnl REAL,
        totalRoi REAL,
        winrate REAL,
        totalTrades INTEGER,
        wins INTEGER,
        losses INTEGER
    );
`);

// --- Initialize / Seed Agents ---
export function initializeAgents(agentIds: string[]) {
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO agent_stats
        (agentId, balance, startingBalance, totalPnl, totalRoi, winrate, totalTrades, wins, losses)
        VALUES (?, 1000, 1000, 0, 0, 0, 0, 0, 0)
    `);
    for (const id of agentIds) {
        stmt.run(id);
    }
}

// --- Real Polymarket Portfolio Balance ----------------------------------------

/**
 * Sync CLOB collateral balances to DB.
 * Only updates agents where CLOB returned > 0 — never zeros out on API failure.
 */
export function syncClobBalances(_clobBal: Record<string, number>): void {
    // Virtual balance mode: balances are tracked by copy-trade open/close logic.
    // CLOB real balances are intentionally not used for display.
}

// --- Trades API ---

export function insertTrade(trade: TradeEntry & { conditionId?: string; outcomeIndex?: number }) {
    const stmt = db.prepare(`
        INSERT INTO trades (
            id, agentId, donorWallet, asset, assetLogo, direction, entryPrice, exitPrice,
            positionSize, pnl, pnlPercent, status, marketQuestion, marketEndTimestamp,
            openTimestamp, closeTimestamp, side, marketUrl, conditionId, outcomeIndex
        ) VALUES (
            @id, @agentId, @donorWallet, @asset, @assetLogo, @direction, @entryPrice, @exitPrice,
            @positionSize, @pnl, @pnlPercent, @status, @marketQuestion, @marketEndTimestamp,
            @openTimestamp, @closeTimestamp, @side, @marketUrl, @conditionId, @outcomeIndex
        )
    `);

    const safelyMapped = Object.fromEntries(
        Object.entries(trade).map(([k, v]) => [k, v === undefined ? null : v])
    );

    stmt.run(safelyMapped);
}

export function updateTradeOnClose(id: string, exitPrice: number, pnl: number, pnlPercent: number, closeTimestamp: number, status: string) {
    const stmt = db.prepare(`
        UPDATE trades 
        SET exitPrice = ?, pnl = ?, pnlPercent = ?, closeTimestamp = ?, status = ?
        WHERE id = ?
    `);
    stmt.run(exitPrice, pnl, pnlPercent, closeTimestamp, status, id);
}

export function updateTradeWithRealExecution(id: string, realPrice: number, realSizeUsd: number) {
    // Get existing trade to find the agentId and the estimated size we already deducted
    const trade = db.prepare('SELECT agentId, positionSize FROM trades WHERE id = ?').get(id) as { agentId: string; positionSize: number } | undefined;
    if (!trade) return;

    const stmt = db.prepare(`
        UPDATE trades
        SET entryPrice = ?, positionSize = ?
        WHERE id = ?
    `);
    stmt.run(realPrice, realSizeUsd, id);

    // Adjust balance by the difference (real - estimated)
    const diff = realSizeUsd - trade.positionSize;
    if (Math.abs(diff) > 0.001) {
        db.prepare(`UPDATE agent_stats SET balance = balance - ? WHERE agentId = ?`).run(diff, trade.agentId);
        console.log(`[DB] Adjusted ${trade.agentId} balance by ${diff > 0 ? '-' : '+'}$${Math.abs(diff).toFixed(2)} due to real execution slippage/rounding.`);
    }

    console.log(`[DB] Updated trade ${id} with real execution data: @ ${(realPrice * 100).toFixed(0)}¢ ($${realSizeUsd.toFixed(2)})`);
}

export function getAllTrades(): TradeEntry[] {
    const stmt = db.prepare('SELECT * FROM trades ORDER BY openTimestamp DESC LIMIT 500');
    return stmt.all() as TradeEntry[];
}

export function getAllOpenTrades(): (TradeEntry & { conditionId: string; outcomeIndex: number })[] {
    const stmt = db.prepare(`SELECT * FROM trades WHERE status = 'open' ORDER BY openTimestamp ASC`);
    return stmt.all() as (TradeEntry & { conditionId: string; outcomeIndex: number })[];
}

export function getOpenTradesByMarket(conditionId: string, outcomeIndex: number): TradeEntry[] {
    const stmt = db.prepare(`
        SELECT * FROM trades
        WHERE status = 'open'
        AND conditionId = ?
        AND outcomeIndex = ?
    `);
    return stmt.all(conditionId, outcomeIndex) as TradeEntry[];
}

export function hasSeenTrade(tradeId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM trades WHERE id = ?');
    const result = stmt.get(tradeId);
    return !!result;
}

export function getTradeById(tradeId: string): TradeEntry | null {
    const stmt = db.prepare('SELECT * FROM trades WHERE id = ?');
    return (stmt.get(tradeId) as TradeEntry) ?? null;
}

// --- Stats & Balance API ---

// Deduct virtual balance when a trade opens (money leaves the account)
export function deductVirtualBalance(agentId: string, amount: number): void {
    db.prepare(`UPDATE agent_stats SET balance = balance - ? WHERE agentId = ?`).run(amount, agentId);
}

export function updateAgentStatsAndBalance(agentId: string, pnlDelta: number, positionSize: number, isWin: boolean | null) {
    const winIncr = isWin === true ? 1 : 0;
    const lossIncr = isWin === false ? 1 : 0;
    const tradeIncr = isWin !== null ? 1 : 0;

    // On close: return the original bet (positionSize) + profit/loss (pnlDelta)
    const stmt = db.prepare(`
        UPDATE agent_stats
        SET balance = balance + ?,
            totalPnl = totalPnl + ?,
            wins = wins + ?,
            losses = losses + ?,
            totalTrades = totalTrades + ?
        WHERE agentId = ?
    `);

    stmt.run(positionSize + pnlDelta, pnlDelta, winIncr, lossIncr, tradeIncr, agentId);

    // Re-calc Winrate and ROI: use startingBalance as denominator (fixed at first sync)
    db.prepare(`
        UPDATE agent_stats
        SET winrate = CASE WHEN totalTrades > 0 THEN (wins * 100.0) / totalTrades ELSE 0 END,
            totalRoi = CASE
                WHEN startingBalance > 0 THEN (totalPnl / startingBalance) * 100.0
                ELSE 0
            END
        WHERE agentId = ?
    `).run(agentId);
}

export function getAgentBalance(agentId: string): number {
    const stmt = db.prepare('SELECT balance FROM agent_stats WHERE agentId = ?');
    const row = stmt.get(agentId) as { balance: number } | undefined;
    return row ? row.balance : 0;
}

export function getAllAgentStats(): any[] {
    const stmt = db.prepare('SELECT * FROM agent_stats ORDER BY balance DESC');
    return stmt.all();
}

// --- Equity Chart API ---

export function insertEquityPoint(point: Omit<EquityPoint, 'date'>) {
    const stmt = db.prepare(`
        INSERT INTO balances (timestamp, claude, chatgpt, gemini, grok, deepseek)
        VALUES (@timestamp, @claude, @chatgpt, @gemini, @grok, @deepseek)
    `);
    try {
        stmt.run(point);
    } catch (e: any) {
        console.error('[DB] Failed to save equity log:', e.message || e);
    }
}

export function recordEquitySnapshot(): void {
    insertEquityPoint({
        timestamp: Date.now(),
        claude: getAgentBalance('claude'),
        chatgpt: getAgentBalance('chatgpt'),
        gemini: getAgentBalance('gemini'),
        grok: getAgentBalance('grok'),
        deepseek: getAgentBalance('deepseek'),
    });
}

export function clearAllData(): void {
    db.exec(`DELETE FROM trades`);
    db.exec(`DELETE FROM balances`);
    db.exec(`UPDATE agent_stats SET balance = 1000, startingBalance = 1000, totalPnl = 0, totalRoi = 0, winrate = 0, totalTrades = 0, wins = 0, losses = 0`);
    console.log('[DB] All trade data cleared.');
}

export function getRecentEquity(): EquityPoint[] {
    const stmt = db.prepare('SELECT * FROM balances ORDER BY timestamp DESC LIMIT 1500');
    const rows = stmt.all() as any[];
    return rows.reverse().map(r => ({
        ...r,
        date: new Date(r.timestamp).toLocaleTimeString()
    }));
}

