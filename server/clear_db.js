import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'data/polyfive_copycat.db'); // DB is in server/data/

try {
    const db = new Database(dbPath);
    db.exec('DELETE FROM trades');
    db.exec('DELETE FROM balances');
    db.exec('UPDATE agent_stats SET balance = 1000, startingBalance = 1000, totalPnl = 0, totalRoi = 0, winrate = 0, totalTrades = 0, wins = 0, losses = 0');
    console.log('Successfully cleared trades and balances from the database.');
    db.close();
} catch (e) {
    console.error('Failed to clear db: ', e.message);
}
