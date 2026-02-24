export interface ModelInfo {
    id: string;
    name: string;
    shortName: string;
    color: string;
    logo: string;
    wallet: string;
    polymarketUrl?: string; // Optional now
}

export interface CryptoPrice {
    symbol: string;
    name: string;
    price: number;
    change: number;
    logo: string;
}

export interface EquityPoint {
    date: string;
    timestamp: number;
    claude: number;
    chatgpt: number;
    gemini: number;
    grok: number;
    deepseek: number;
}

export interface TradeEntry {
    id: string; // original_tx_hash + _ + agentId
    agentId: string;
    donorWallet: string;
    asset: string;
    assetLogo: string;
    direction: 'UP' | 'DOWN';
    entryPrice: number;
    exitPrice: number | null;
    positionSize: number;
    pnl: number;
    pnlPercent: number;
    status: 'open' | 'closed' | 'won' | 'lost';
    marketQuestion: string;
    marketEndTimestamp: number;
    openTimestamp: number;
    closeTimestamp: number | null;
    side: 'YES' | 'NO';
    marketUrl: string;
}

export interface ModelStat {
    agentId: string;
    name: string;
    shortName: string;
    color: string;
    logo: string;
    wallet: string;
    balance: number;
    totalPnl: number;
    totalRoi: number;
    winrate: number;
    wins: number;
    losses: number;
    totalTrades: number;
}

export interface FullState {
    prices: CryptoPrice[];
    equity: EquityPoint[];
    trades: TradeEntry[];
    stats: ModelStat[];
}
