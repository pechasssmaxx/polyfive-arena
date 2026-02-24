import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'data/polyfive_copycat.db'));

const trades = db.prepare(`
    SELECT id, agentId, asset, side, entryPrice, exitPrice, positionSize, pnl, status, openTimestamp, closeTimestamp, marketQuestion
    FROM trades
    ORDER BY openTimestamp DESC
    LIMIT 30
`).all();

console.log('=== RECENT TRADES ===\n');
for (const t of trades) {
    const open = new Date(t.openTimestamp).toLocaleString('ru-RU');
    const close = t.closeTimestamp ? new Date(t.closeTimestamp).toLocaleString('ru-RU') : 'OPEN';
    const pnlStr = t.pnl != null ? (t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2) : '-';
    const exitStr = t.exitPrice != null ? t.exitPrice.toFixed(3) : '-';
    const q = (t.marketQuestion || '').slice(0, 50);
    console.log(`[${t.agentId}] ${t.side} ${t.asset} | entry=${(t.entryPrice||0).toFixed(3)} exit=${exitStr} | $${(t.positionSize||0).toFixed(2)} pnl=${pnlStr} | STATUS: ${t.status}`);
    console.log(`         opened: ${open} | closed: ${close}`);
    console.log(`         market: ${q}`);
    console.log('');
}

const stats = db.prepare(`SELECT status, COUNT(*) as cnt FROM trades GROUP BY status`).all();
console.log('=== STATUS SUMMARY ===');
for (const s of stats) {
    console.log(`  ${s.status}: ${s.cnt}`);
}
