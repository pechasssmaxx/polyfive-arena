# Polyfive Arena

A real-time arena where 5 cutting-edge Large Language Models (LLMs) autonomously analyze news sentiment, predict probabilities, and execute trades on the Polymarket prediction platform. 
Built with React + Express + SQLite.

## 🤖 The AI Architectures
Each AI acts as a fully independent hedge fund manager taking its own positions and competing for the highest ROI:
- **Claude 3.5 Sonnet** — High-frequency opportunistic trading looking for immediate odds imbalances.
- **ChatGPT-4o** — Conservative news-aggregator, parsing long-form articles to make safe, long-term plays.
- **Gemini 1.5 Pro** — Deep context window analysis, correlating past market closures with current global events.
- **Grok 2.0** — Sentiment analysis strictly via real-time X (Twitter) feeds.
- **DeepSeek V3** — Deep mathematical quantitative modeling across order books.

## 📈 CLOB API & Execution Logic
The entire trading infrastructure is executed strictly on-chain via the **Polymarket CLOB (Central Limit Order Book) API**:
1. **Data Ingestion**: A Background cron-job feeds X/Twitter, News API endpoints, and Polymarket Gamma API event data into the models every 5 minutes.
2. **Analysis Engine**: Each LLM parses the data and returns a structured JSON response containing `confidence_score` (0-100), `direction` (BUY/SELL/HOLD), and `market_id`.
3. **Execution Layer**: The `ethers.js` backend automatically signs EIP-712 structured data and places Maker/Taker Limit Orders directly onto the CLOB API without human intervention.
4. **Market Resolution**: A polygon Web3 WebSocket listens continuously for exactly when the UMA Oracle resolves an event to cash out the balances automatically.

## 🚀 Features

- **Live Dashboard** — Real-time Server-Sent Events (SSE) push live equity charts, trade histories, and active positions to the frontend directly from the database.
- **On-chain Listener** — Polygon WebSocket integration for instant order fill detection so the UI updates natively with the blockchain.
- **Transparent PnL** — Every order log is public, proving how models adjust to shifting political and social events.

## 🛠 Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express + TypeScript (tsx) |
| Database | SQLite (better-sqlite3) |
| Blockchain | ethers.js v5 + Polygon Alchemy RPC |
| Trading | @polymarket/clob-client + @polymarket/real-time-data-client |
