---
name: polymarket-agent
description: "Autonomous Polymarket trading agent patterns. Covers CLOB API authentication, order placement, position management, market discovery via Gamma API, and WebSocket-based real-time price feeds."
---

# Polymarket Agent Skill

Comprehensive guide for building autonomous Polymarket trading agents.

## Architecture

### Core Components
1. **Gamma API** — Market discovery, metadata, resolution data
2. **CLOB API** — Order placement, position management, order book
3. **WebSocket** — Real-time price feeds and trade notifications
4. **Polygon Blockchain** — On-chain settlement, USDC transfers

### Authentication Flow
```
Private Key → ethers.Wallet → ClobClient.deriveApiKey() → {apiKey, secret, passphrase}
```

**Critical:** Use `ethers@v5` — the `@polymarket/clob-client` library expects v5's `_signTypedData()` method. v6's `signTypedData()` produces incompatible signatures (400 Bad Request).

## Gamma API (Market Discovery)

### Endpoints
```
Base URL: https://gamma-api.polymarket.com
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/markets` | GET | List/search markets |
| `/markets/{id}` | GET | Single market details |
| `/events` | GET | Grouped events |

### Useful Filters
```bash
# Active markets sorted by volume
GET /markets?active=true&closed=false&order=volume24hr&ascending=false&limit=20

# Search by keyword
GET /markets?tag=crypto&active=true

# 5-minute markets (for crypto predictions)
GET /markets?active=true&closed=false&tag=crypto
```

### Response Fields
- `question` — Market question text
- `outcomePrices` — JSON array `[yesPrice, noPrice]`
- `clobTokenIds` — JSON array `[yesTokenId, noTokenId]`
- `volume24hr` — 24h trading volume
- `endDateIso` — Market resolution time

## CLOB API (Trading)

### Authentication
```typescript
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const wallet = new ethers.Wallet(privateKey, provider);
const clob = new ClobClient('https://clob.polymarket.com', 137, wallet);

// Derive API credentials (one-time)
const creds = await clob.deriveApiKey();
// Returns: { apiKey, secret, passphrase }
```

### Placing Orders
```typescript
// GTC Limit Order — Buy YES tokens
const order = await clob.createAndPostOrder({
    tokenID: yesTokenId,
    side: 'BUY',
    price: 0.55,          // Price per share ($0.55)
    size: 10,             // Number of shares
    feeRateBps: 0,        // Fee rate
    nonce: 0,
    expiration: 0,        // 0 = no expiration
});
```

### Order Types
- **GTC (Good Til Cancelled)** — Stays on book until filled or cancelled
- **FOK (Fill or Kill)** — Must fill entirely or cancelled immediately
- **GTD (Good Til Date)** — Expires at specified timestamp

### Position Query
```typescript
const positions = await clob.getPositions();
// Returns array of { asset, size, avgPrice, side }
```

## Risk Management Rules

### Price Corridor
Only trade when token prices are between 40%–60% (probability $0.40–$0.60). This avoids:
- **Low probability tokens** ($0.01–$0.39): Near-certain losers
- **High probability tokens** ($0.61–$0.99): Near-certain winners with no upside

### Minimum Trade Size
Polymarket requires minimum 5 shares per order. Calculate:
```
minCostUsd = 5 * tokenPrice
// At $0.50: min cost = $2.50
// At $0.40: min cost = $2.00
```

### PnL Calculation
```
Cost = shares × entryPrice
Payout = shares × $1.00 (if correct prediction)
PnL = Payout - Cost (if won)
PnL = -Cost (if lost)
```

## WebSocket (Real-Time Data)

### Binance Price Stream
```typescript
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
ws.onmessage = (event) => {
    const { s: symbol, c: price, P: change24h } = JSON.parse(event.data);
};
```

### Polymarket WebSocket
```typescript
// @polymarket/real-time-data-client
import { RealTimeDataClient } from '@polymarket/real-time-data-client';
const rtClient = new RealTimeDataClient();
rtClient.on('trade', (trade) => { /* handle trade */ });
```

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| 400 Bad Request on `deriveApiKey()` | ethers v6 incompatibility | Use ethers v5.7.2 |
| Checksum Error on USDC approve | Wrong address casing | Use `ethers.utils.getAddress()` |
| "L2 header not found" | RPC node lag | Retry or switch RPC |
| Order rejected | Price outside spread | Use midpoint pricing |

## Best Practices
1. Always sync on-chain balance before trading
2. Use WAL mode for SQLite to prevent DB locks
3. Implement proxy rotation for Cloudflare bypass
4. Cache API credentials (valid for ~24h)
5. Log AI reasoning for each trade decision
