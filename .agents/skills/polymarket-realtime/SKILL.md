---
name: polymarket-realtime
description: Connect to Polymarket's real-time WebSocket data stream using the official @polymarket/real-time-data-client library. Use when implementing live market data feeds, trade monitoring, price updates, or any real-time Polymarket integration.
---

# Polymarket Real-Time Data Client

Official TypeScript client for Polymarket's WebSocket streaming service (`wss://ws-live-data.polymarket.com`).

## Installation

```bash
npm install @polymarket/real-time-data-client
```

## Core Types

```typescript
import { RealTimeDataClient, Message, SubscriptionMessage, ConnectionStatus, ClobApiKeyCreds } from '@polymarket/real-time-data-client';

interface ClobApiKeyCreds {
  key: string;
  secret: string;
  passphrase: string;
}

interface SubscriptionMessage {
  subscriptions: Array<{
    topic: string;        // required
    type: string;         // required
    filters?: string;     // optional JSON string
    clob_auth?: ClobApiKeyCreds;
    gamma_auth?: { address: string };
  }>;
}

interface Message {
  topic: string;
  type: string;
  timestamp: number;
  payload: object;
  connection_id: string;
}

enum ConnectionStatus {
  CONNECTING,
  CONNECTED,
  DISCONNECTED
}
```

## Basic Usage

```typescript
import { RealTimeDataClient } from '@polymarket/real-time-data-client';

const onMessage = (message: Message): void => {
  console.log('Received:', message.topic, message.type, message.payload);
};

const client = new RealTimeDataClient({
  onMessage,
  onConnect: () => {
    // Subscribe after connection established
    client.subscribe({
      subscriptions: [{
        topic: 'activity',
        type: 'trades'
      }]
    });
  }
});

client.connect();
```

## Available Topics & Types

### Activity (trades, order events)
```typescript
client.subscribe({
  subscriptions: [{
    topic: 'activity',
    type: 'trades',
    filters: JSON.stringify({ event_slug: 'your-event-slug' }) // optional
  }]
});
```

### Comments
```typescript
client.subscribe({
  subscriptions: [{
    topic: 'comments',
    type: 'comments'
    // filter by parent entity if needed
  }]
});
```

### RFQ (Request for Quote)
```typescript
client.subscribe({
  subscriptions: [{
    topic: 'rfq',
    type: 'rfq_created' // rfq_edited | rfq_cancelled | rfq_expired
  }]
});
```

### Crypto & Equity Prices
```typescript
// Supported equity symbols: AAPL, TSLA, MSFT, GOOGL, AMZN, META, NVDA, NFLX, PLTR, OPEN, RKLB, ABNB
client.subscribe({
  subscriptions: [{
    topic: 'prices',
    type: 'crypto',
    filters: JSON.stringify({ symbol: 'BTC' })
  }, {
    topic: 'prices',
    type: 'equity',
    filters: JSON.stringify({ symbol: 'AAPL' })
  }]
});
```

## Authentication (Protected Topics)

```typescript
const clobCreds: ClobApiKeyCreds = {
  key: process.env.CLOB_API_KEY!,
  secret: process.env.CLOB_SECRET!,
  passphrase: process.env.CLOB_PASSPHRASE!
};

client.subscribe({
  subscriptions: [{
    topic: 'activity',
    type: 'trades',
    clob_auth: clobCreds
  }]
});
```

## Client Configuration

```typescript
const client = new RealTimeDataClient({
  host: 'wss://ws-live-data.polymarket.com', // default
  pingInterval: 5000,                         // ms, default 5s
  reconnect: true,                            // auto-reconnect on disconnect
  onMessage: (msg: Message) => { ... },
  onConnect: () => { ... },
  onStatusChange: (status: ConnectionStatus) => { ... }
});
```

## Lifecycle Methods

```typescript
client.connect();      // establish WebSocket connection
client.disconnect();   // close and disable auto-reconnect
client.subscribe(msg); // add subscriptions
client.unsubscribe(msg); // remove specific subscriptions
client.ping();         // manual keep-alive (sent automatically)
```

## Integration with Express/Socket.io Server

```typescript
// server/services/polymarketStream.ts
import { RealTimeDataClient, Message } from '@polymarket/real-time-data-client';
import { Server as SocketServer } from 'socket.io';

export function startPolymarketStream(io: SocketServer) {
  const client = new RealTimeDataClient({
    onMessage: (message: Message) => {
      // Forward to connected frontend clients
      io.emit(`polymarket:${message.topic}:${message.type}`, message.payload);
    },
    onConnect: () => {
      client.subscribe({
        subscriptions: [
          { topic: 'activity', type: 'trades' },
          { topic: 'prices', type: 'crypto' }
        ]
      });
    }
  });

  client.connect();
  return client;
}
```

## Best Practices

1. **Subscribe in `onConnect`** — always subscribe after connection is established, not before
2. **Use filters** — filter by `event_slug` or `symbol` to reduce message volume
3. **Handle reconnects** — `reconnect: true` (default) auto-reconnects; re-subscribe in `onConnect`
4. **Graceful shutdown** — call `client.disconnect()` on process exit
5. **Forward via Socket.io** — pair with Socket.io to push updates to frontend clients in real time
