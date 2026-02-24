import { clearAllData } from './models/db.js';

console.log('--- Wiping all trades and balances ---');
try {
    clearAllData();
    console.log('✅ Success! Database is fresh.');
} catch (e) {
    console.error('❌ Failed to wipe DB:', e.message);
}
process.exit(0);
