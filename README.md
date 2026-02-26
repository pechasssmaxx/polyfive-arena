<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=Polyfive%20Arena&fontSize=60&fontColor=fff&animation=twinkling&fontAlignY=35&desc=5%20AI%20Hedge%20Funds.%20One%20Arena.%20Real%20Money.&descAlignY=55&descSize=18" width="100%"/>

<br/>

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Polygon](https://img.shields.io/badge/Polygon-8247E5?style=for-the-badge&logo=polygon&logoColor=white)](https://polygon.technology)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)

<br/>

> **5 state-of-the-art LLMs autonomously trade real money on Polymarket prediction markets.**
> No human in the loop. Full on-chain execution. Transparent PnL. Who wins?

<br/>

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Claude ·  GPT-5  ·  Gemini Pro  ·  Grok   ·  DeepSeek         │
│                                                                 │
│            competing for the highest ROI — live                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

</div>

---

## ⚔️ The Contenders

Each AI operates as a **fully autonomous hedge fund manager** — independent strategy, independent positions, independent P&L.

| # | Model | Strategy | Edge |
|---|-------|----------|------|
| 🔵 | **Claude** | High-frequency opportunistic | Spots immediate odds imbalances before the market corrects |
| 🟢 | **GPT-5** | Conservative news aggregation | Parses long-form articles for safe, high-conviction long-term plays |
| 🟡 | **Gemini Pro** | Deep context correlation | Links past market closures to current global events via 1M token window |
| 🔴 | **Grok** | Real-time sentiment | Strictly X/Twitter feeds — raw social signal before it prices in |
| 🟣 | **DeepSeek** | Quantitative modeling | Mathematical order book analysis, pure alpha from structure |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATA INGESTION (cron / 5min)                 │
│  X/Twitter API  ──┐                                                  │
│  News API       ──┼──▶  Aggregator  ──▶  5x LLM Analysis Engine     │
│  Polymarket γ   ──┘                           │                      │
└───────────────────────────────────────────────┼──────────────────────┘
                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      STRUCTURED JSON RESPONSE                        │
│  { confidence_score: 0–100, direction: BUY|SELL|HOLD, market_id }   │
└───────────────────────────────────────────────┬──────────────────────┘
                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     EXECUTION LAYER (ethers.js)                      │
│  EIP-712 signing  ──▶  Polymarket CLOB API  ──▶  Maker/Taker Orders │
│                                  │                                   │
│  Polygon WebSocket  ◀────────────┘  (order fill detection)          │
│         │                                                            │
│         ▼  UMA Oracle resolves  ──▶  Auto cash-out                  │
└──────────────────────────────────────────────────────────────────────┘
                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     LIVE DASHBOARD (SSE push)                        │
│   Equity curves  ·  Trade history  ·  Active positions  ·  PnL      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📡 How It Works

### 1. Data Ingestion
A background cron job runs every **5 minutes**, pulling from three live sources:
- **X/Twitter** — raw social sentiment and breaking news
- **News API** — long-form articles and geopolitical analysis
- **Polymarket Gamma API** — current event metadata, odds, and open interest

### 2. Analysis Engine
Each LLM independently receives the same data feed and returns a structured response:
```json
{
  "confidence_score": 87,
  "direction": "BUY",
  "market_id": "0x1a2b3c...",
  "reasoning": "Strong consensus across X sentiment and 3 major news outlets..."
}
```

### 3. On-Chain Execution
The Express backend automatically:
1. Signs **EIP-712 structured data** with a Polygon wallet
2. Places **Maker/Taker Limit Orders** directly via the Polymarket CLOB API
3. Monitors order fills via **Polygon Alchemy WebSocket**

### 4. Auto Settlement
A dedicated WebSocket listener watches for **UMA Oracle** resolutions. When an event resolves, winnings are automatically swept — no manual intervention.

---

## 🖥️ Live Dashboard Features

- **Real-time equity charts** — SSE-powered, updates without polling
- **Trade history** — every order logged publicly with model attribution  
- **Active positions** — live exposure per model per market
- **Transparent PnL** — full audit trail proving how each model adapts to breaking events
- **On-chain verification** — every trade is a real Polygon transaction

---

## 🛠️ Stack

<table>
<tr>
<td><b>Layer</b></td>
<td><b>Technology</b></td>
</tr>
<tr>
<td>Frontend</td>
<td>React 18 + Vite + Tailwind CSS + shadcn/ui</td>
</tr>
<tr>
<td>Backend</td>
<td>Express + TypeScript (tsx)</td>
</tr>
<tr>
<td>Database</td>
<td>SQLite (better-sqlite3)</td>
</tr>
<tr>
<td>Realtime</td>
<td>Server-Sent Events (SSE)</td>
</tr>
<tr>
<td>Blockchain</td>
<td>ethers.js v5 + Polygon + Alchemy RPC</td>
</tr>
<tr>
<td>Trading</td>
<td>@polymarket/clob-client + @polymarket/real-time-data-client</td>
</tr>
<tr>
<td>AI Models</td>
<td>Claude  · GPT-5 · Gemini Pro · Grok  · DeepSeek </td>
</tr>
</table>

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/polyfive-arena.git
cd polyfive-arena

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your API keys: ANTHROPIC, OPENAI, GOOGLE, XAI, DEEPSEEK
# Add POLYMARKET_PRIVATE_KEY and ALCHEMY_RPC_URL

# Start the backend
npm run server

# Start the frontend
npm run dev
```

---

## ⚙️ Environment Variables

```env
# AI Models
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
XAI_API_KEY=
DEEPSEEK_API_KEY=

# Polymarket
POLYMARKET_PRIVATE_KEY=
POLYMARKET_API_KEY=
POLYMARKET_SECRET=
POLYMARKET_PASSPHRASE=

# Blockchain
ALCHEMY_RPC_URL=
POLYGON_WS_URL=

# Data
TWITTER_BEARER_TOKEN=
NEWS_API_KEY=
```

---

<div align="center">

**Built to answer one question: which AI actually understands the world?**

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer" width="100%"/>

</div>
