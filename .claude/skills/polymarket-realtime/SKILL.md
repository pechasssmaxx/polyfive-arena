---
name: polymarket-realtime
description: Connect to Polymarket's official real-time WebSocket data stream using @polymarket/real-time-data-client. Use when implementing live market data feeds, trade monitoring, price updates (crypto & equity), activity streams, RFQ, CLOB order book, or any real-time Polymarket integration.
---

# Polymarket Real-Time Data Client

Official library: `@polymarket/real-time-data-client`
WebSocket endpoint: `wss://ws-live-data.polymarket.com`
Source: https://github.com/Polymarket/real-time-data-client

## Installation

```bash
yarn add @polymarket/real-time-data-client
# or
npm install @polymarket/real-time-data-client
```

## Core Classes & Types

### RealTimeDataClient

```typescript
import { RealTimeDataClient } from "@polymarket/real-time-data-client";

export interface RealTimeDataClientArgs {
    onConnect?: (client: RealTimeDataClient) => void;
    onMessage?: (client: RealTimeDataClient, message: Message) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
    host?: string;           // default: wss://ws-live-data.polymarket.com
    pingInterval?: number;   // default: 5000ms
    autoReconnect?: boolean; // default: true
}
```

**Methods:**
- `connect()` — establish WebSocket connection
- `disconnect()` — close connection (disables autoReconnect)
- `subscribe(msg: SubscriptionMessage)` — subscribe to topics
- `unsubscribe(msg: SubscriptionMessage)` — unsubscribe from topics

### Message

```typescript
interface Message {
    topic: string;       // e.g. "activity", "crypto_prices"
    type: string;        // e.g. "trades", "update"
    timestamp: number;
    payload: object;     // cast to specific type based on topic+type
    connection_id: string;
}
```

### SubscriptionMessage

```typescript
interface SubscriptionMessage {
    subscriptions: {
        topic: string;
        type: string;        // "*" = all types for this topic
        filters?: string;    // JSON string, empty = no filter
        clob_auth?: ClobApiKeyCreds;
        gamma_auth?: GammaAuth;
    }[];
}
```

### ConnectionStatus

```typescript
enum ConnectionStatus {
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
}
```

## Quick Start

```typescript
import { RealTimeDataClient } from "@polymarket/real-time-data-client";

const onMessage = (_: RealTimeDataClient, message: Message): void => {
    console.log(message.topic, message.type, message.payload);
};

const onConnect = (client: RealTimeDataClient): void => {
    client.subscribe({
        subscriptions: [{ topic: "activity", type: "trades" }],
    });
};

new RealTimeDataClient({ onConnect, onMessage }).connect();
```

## All Topics & Types

| Topic | Type | Auth | Filters | Payload Type |
|---|---|---|---|---|
| `activity` | `trades` | — | `{"event_slug":"..."}` OR `{"market_slug":"..."}` | `Trade` |
| `activity` | `orders_matched` | — | same as above | `Trade` |
| `comments` | `comment_created` | — | `{"parentEntityID":N,"parentEntityType":"Event"}` | `Comment` |
| `comments` | `comment_removed` | — | same | `Comment` |
| `comments` | `reaction_created` | — | same | `Reaction` |
| `comments` | `reaction_removed` | — | same | `Reaction` |
| `rfq` | `request_created` | — | — | `Request` |
| `rfq` | `request_edited` | — | — | `Request` |
| `rfq` | `request_canceled` | — | — | `Request` |
| `rfq` | `request_expired` | — | — | `Request` |
| `rfq` | `quote_created` | — | — | `Quote` |
| `rfq` | `quote_edited` | — | — | `Quote` |
| `rfq` | `quote_canceled` | — | — | `Quote` |
| `rfq` | `quote_expired` | — | — | `Quote` |
| `crypto_prices` | `update` | — | `{"symbol":"BTCUSDT"}` | `CryptoPrice` |
| `crypto_prices_chainlink` | `update` | — | `{"symbol":"eth/usd"}` | `CryptoPrice` |
| `equity_prices` | `update` | — | `{"symbol":"AAPL"}` | `EquityPrice` |
| `clob_market` | `*` | — | `["tokenId"]` | CLOB order book |
| `clob_user` | `*` | `clob_auth` required | — | User orders |

## Payload Types

### Trade (activity topic)
```typescript
interface Trade {
    asset: string;         // ERC1155 token ID
    conditionId: string;   // CTF condition ID
    eventSlug: string;
    outcome: string;       // human readable outcome
    outcomeIndex: number;
    price: number;
    side: "BUY" | "SELL";
    size: number;
    slug: string;          // market slug
    timestamp: number;
    title: string;         // event title
    transactionHash: string;
    proxyWallet: string;
    name: string;
    pseudonym: string;
    icon: string;
    profileImage: string;
    bio: string;
}
```

### CryptoPrice / EquityPrice
```typescript
interface CryptoPrice {
    symbol: string;
    timestamp: number;  // milliseconds
    value: number;
}
// On connect with filter, server immediately sends historical snapshot:
// { symbol: string, data: Array<{ timestamp: number, value: number }> }
```

### Available Crypto Symbols
`BTCUSDT`, `ETHUSDT`, `XRPUSDT`, `SOLUSDT`, `DOGEUSDT`

Chainlink variants: `btCUSDt`, `eth/usd` (case-insensitive)

### Available Equity Symbols
`AAPL`, `TSLA`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `NFLX`, `PLTR`, `OPEN`, `RKLB`, `ABNB`

## CLOB Authentication (for clob_user topic)

```typescript
interface ClobApiKeyCreds {
    key: string;
    secret: string;
    passphrase: string;
}

client.subscribe({
    subscriptions: [{
        topic: "clob_user",
        type: "*",
        clob_auth: {
            key: "your-api-key",
            secret: "your-secret",
            passphrase: "your-passphrase",
        },
    }],
});
```

## Full Multi-Topic Example (from official repo)

```typescript
const onConnect = (client: RealTimeDataClient): void => {
    client.subscribe({
        subscriptions: [
            // All comments
            { topic: "comments", type: "*" },
            // All activity (trades + orders_matched)
            { topic: "activity", type: "*" },
            // All RFQ events
            { topic: "rfq", type: "*" },
            // Crypto price stream (initial snapshot on connect)
            { topic: "crypto_prices", type: "*", filters: "" },
            // Chainlink crypto prices
            { topic: "crypto_prices_chainlink", type: "*", filters: "" },
            // Equity prices
            { topic: "equity_prices", type: "*", filters: "" },
            // CLOB order book for specific market token
            { topic: "clob_market", type: "*",
              filters: `["71321045679252212594626385532706912750332728571942532289631379312455583992563"]` },
            // Auth'd user order stream
            { topic: "clob_user", type: "*",
              clob_auth: { key: "...", secret: "...", passphrase: "..." } },
        ],
    });
};
```

## Integration Pattern: Bridge to Socket.IO

```typescript
// Bridge Polymarket WebSocket → Socket.IO frontend clients
import { RealTimeDataClient } from "@polymarket/real-time-data-client";
import { Server as SocketServer } from "socket.io";

export function startPolymarketStream(io: SocketServer) {
    const client = new RealTimeDataClient({
        autoReconnect: true,
        onConnect: (c) => {
            c.subscribe({ subscriptions: [
                { topic: "crypto_prices", type: "update", filters: `{"symbol":"BTCUSDT"}` },
                { topic: "activity", type: "trades" },
            ]});
        },
        onMessage: (_, msg) => {
            io.emit(`pm:${msg.topic}`, msg.payload);
        },
        onStatusChange: (status) => {
            io.emit("pm:status", status);
        },
    });
    client.connect();
    return client;
}
```

## Key Behaviors

- **Auto-reconnect**: enabled by default — client reconnects automatically on disconnect or error
- **Ping/Pong**: client sends `"ping"` every 5s to keep connection alive; server responds with pong
- **Initial snapshot**: when subscribing to `crypto_prices` or `equity_prices` with a symbol filter, server immediately sends a historical data dump
- **`type: "*"`**: subscribes to ALL message types for a topic in a single call
- **Multiple subscribe calls**: call `subscribe()` multiple times on same connection to add more topics
- **Message routing**: check `message.topic` + `message.type` to dispatch to correct handler
- **onMessage signature**: receives `(client: RealTimeDataClient, message: Message)` — first arg is the client instance
