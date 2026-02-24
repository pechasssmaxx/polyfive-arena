import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'data/polyfive_copycat.db'));

const tradeCount = db.prepare('SELECT COUNT(*) as n FROM trades').get().n;
const balCount   = db.prepare('SELECT COUNT(*) as n FROM balances').get().n;

db.exec('DELETE FROM trades');
db.exec('DELETE FROM balances');
db.exec('UPDATE agent_stats SET totalPnl = 0, totalRoi = 0, winrate = 0, totalTrades = 0, wins = 0, losses = 0');

console.log(`✅ Deleted ${tradeCount} trades`);
console.log(`✅ Deleted ${balCount} equity snapshots`);
console.log('✅ Reset agent stats (real wallet balances kept)');
console.log('Done! Restart the server.');
db.close();
