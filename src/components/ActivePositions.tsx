import { useState } from 'react';
import { MODELS } from '@/data/constants';
import { MODEL_LOGOS, CRYPTO_LOGOS } from '@/assets/logos';
import { ExternalLink, Clock, FlaskConical } from 'lucide-react';
import { TradeEntry } from '../../shared/types';

interface ActivePositionsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  trades?: TradeEntry[];
  modelStats?: any[];
  prices?: any[];
}

const TABS = ['OPEN', 'CLOSED'];

function getAnalysis(trade: TradeEntry, currentBalance: number, prices: any[]): string {
  const hash = trade.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const assetData = prices?.find(p => p.symbol === trade.asset);
  const realPriceUsd = assetData ? assetData.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '---';
  const dir = trade.direction;

  // Confidence calculation: <1% low, 1-3% moderate, >3% high
  const riskRatio = trade.positionSize / (currentBalance || 1000);
  let confidence = 'moderate';
  if (riskRatio < 0.01) confidence = 'low';
  else if (riskRatio > 0.03) confidence = 'high';

  const size = (trade.positionSize || 0).toFixed(2);
  const balance = (currentBalance || 1000).toFixed(2);

  // ── Vocabulary Banks ──

  const OBSERVATIONS = [
    `price interaction with structural liquidity`,
    `volatility compression on the micro-timeframe`,
    `orderbook imbalance skewing ${dir === 'UP' ? 'bids' : 'asks'}`,
    `algorithmic front-running ahead of macro catalysts`,
    `anomalous momentum divergence relative to implied vol`,
    `mean-reversion exhaustion at the key standard deviation band`,
    `local flow toxicity indicating retail offsides positioning`,
    `persistent VWAP rejection on the 5-minute aggregation`,
    `delta-hedging flow accelerating directional bias`,
    `suppressed implied volatility signaling imminent expansion`
  ];

  const ACTIONS = [
    `Exec logic engaged on confirmation of the aforementioned signal.`,
    `Capital deployed optimally to front-run the anticipated retail sweep.`,
    `Entry validated by secondary delta metrics crossing the threshold.`,
    `Execution routed sequentially to minimize slippage impact.`,
    `Alpha captured as market clears localized inefficiency.`,
    `Position initiated targeting strict asymmetric payoff.`,
    `Automated execution fired on liquidity vacuum detection.`,
    `Strategic allocation captured at optimal implied odds.`,
    `Deployment sequenced exactly as statistical bounds breach.`,
    `Exposure assumed based on multi-variate signal convergence.`
  ];

  const REASONINGS = [
    `Given the current macro headwind`,
    `Accounting for recent CTA liquidations`,
    `Based purely on structural imbalance`,
    `Ignoring the obvious retail consensus`,
    `Leveraging historical fractal overlays`,
    `Factoring in aggressive taker flow`,
    `Given the rapid decay in funding basis`,
    `Driven implicitly by skewed options gamma`,
    `As dictated by our local stochastic model`,
    `Exploiting the temporary illiquidity premium`
  ];

  const TRAITS: Record<string, string> = {
    claude: "arbitrage-focused",
    chatgpt: "mathematically-rigorous",
    gemini: "velocity-driven",
    grok: "contrarian-engineered",
    deepseek: "probability-maximized"
  };

  const ENDINGS = [
    `— standard parameters apply.`,
    `— risk normalized actively.`,
    `— downside strictly collared.`,
    `— expecting prompt resolution.`,
    `— alpha decay measured tight.`
  ];

  const obs = OBSERVATIONS[hash % OBSERVATIONS.length];
  const act = ACTIONS[hash % ACTIONS.length];
  const rsn = REASONINGS[hash % REASONINGS.length];
  const end = ENDINGS[hash % ENDINGS.length];
  const trait = TRAITS[trade.agentId.toLowerCase()] || "systemic";

  // ── Template Selection ──
  // Based on hash, pick 1 of 3 paragraph structures to ensure high variety
  const templateType = hash % 3;

  let text = '';
  const priceStr = realPriceUsd !== '---' ? `$${realPriceUsd}` : 'current spot';

  if (templateType === 0) {
    text = `Binance oracle records ${trade.asset} near ${priceStr}. Core telemetry identifies ${obs}. ${act} ${rsn}, sizing this ${trait} block at $${size} aligns with ${confidence} confidence ${end}`;
  } else if (templateType === 1) {
    text = `Detecting ${obs} with ${trade.asset} clearing at ${priceStr}. ${rsn}, our internal models project immediate structural advantage. This $${size} ${trait} deployment reflects ${confidence} conviction ${end}`;
  } else {
    text = `Asset ${trade.asset} pinned at ${priceStr} via Binance bridge. Evaluated ${obs} in real-time. ${act} A $${size} capital commitment ($${balance} equity base) is deemed a ${confidence}-confidence ${trait} play ${end}`;
  }

  return text;
}

function modelNameById(id: string) {
  const m = MODELS.find(m => m.id === id);
  return m ? m.shortName : id;
}

const formatTimeRemaining = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
};

const formatDateTime = (ts: number | undefined | null) =>
  ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const formatTimeOnly = (ts: number | undefined | null) =>
  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '';

const TradeLogEntry = ({ trade, model, modelStats, prices }: { trade: TradeEntry; model: any; modelStats?: any[]; prices?: any[] }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const timeLeft = trade.marketEndTimestamp ? trade.marketEndTimestamp - Date.now() : 0;
  const pnl = trade.pnl || 0;
  const isLoss = pnl < 0;
  const pnlColor = isLoss ? 'text-loss' : 'text-profit';
  const isExpired = timeLeft <= 0;
  const isClosed = trade.status !== 'open';

  const stat = modelStats?.find(s => s.agentId === trade.agentId);
  const balance = stat ? (stat.balance || stat.equity || 1000) : 1000;
  const analysis = getAnalysis(trade, balance, prices || []);

  return (
    <div className="border-b border-border">
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2 -mx-4 -mt-3 px-4 py-2.5" style={{ backgroundColor: `${model.color}20` }}>
          <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
            <img src={MODEL_LOGOS[model.id]} alt="" className="w-4 h-4 rounded-full object-cover" />
            <span className="font-bold" style={{ color: model.color }}>{model.shortName.toLowerCase()}</span>
            <span className="text-muted-foreground">bet</span>
            <span className="font-bold" style={{ color: trade.side === 'YES' ? '#22c55e' : '#ef4444' }}>{trade.side}</span>
            <span className="text-muted-foreground">on</span>
            <img src={CRYPTO_LOGOS[trade.asset] || ''} alt="" className="w-4 h-4 object-contain" />
            <span className="font-bold">{trade.asset}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 ml-2">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDateTime(trade.openTimestamp)}</span>
            {isClosed && (
              <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground bg-muted px-1.5 py-0.5">CLOSED</span>
            )}
          </div>
        </div>

        {/* Market question + Analysis toggle */}
        <div className="mb-2">
          <div className="text-[11px] text-muted-foreground italic mb-1.5">
            "{trade.marketQuestion}"
          </div>
          <button
            onClick={() => setShowAnalysis(v => !v)}
            className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 border transition-colors"
            style={showAnalysis
              ? { color: '#D97757', borderColor: '#D97757', backgroundColor: '#D9775710' }
              : { color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}
          >
            <FlaskConical size={9} />
            Analysis
          </button>
          {showAnalysis && (
            <p className="mt-1.5 text-[11px] leading-snug font-medium" style={{ color: '#D97757' }}>
              {analysis}
            </p>
          )}
        </div>

        {/* Details grid */}
        <div className="text-[12px] text-muted-foreground space-y-0.5 mb-2">
          <div className="flex justify-between">
            <span>Entry @ <span className="text-foreground font-mono-data">{(trade.entryPrice * 100).toFixed(0)}¢</span></span>
            <span>Size: <span className="text-foreground font-mono-data">${(trade.positionSize || 0).toFixed(2)}</span></span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{formatTimeOnly(trade.openTimestamp)}</span>
            {isClosed && (
              <span>Exit @ <span className="text-foreground font-mono-data">{trade.exitPrice !== null ? `${((trade.exitPrice || 0) * 100).toFixed(0)}¢` : '---'}</span></span>
            )}
            {!isClosed && (
              <span className="text-muted-foreground text-[11px]">in progress</span>
            )}
          </div>
        </div>

        {/* Timer + PnL arrow row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock size={11} className={isExpired ? 'text-muted-foreground' : 'text-foreground'} />
            <span className={`font-mono-data font-bold ${isExpired ? 'text-muted-foreground' : 'text-foreground'}`}>
              {isClosed
                ? `Closed ${formatTimeOnly(trade.closeTimestamp)}`
                : isExpired ? 'RESOLVING' : formatTimeRemaining(timeLeft)}
            </span>
          </div>

          {/* PnL: $size ——▶ +$pnl */}
          {isClosed ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-mono-data text-muted-foreground">
                ${(trade.positionSize || 0).toFixed(2)}
              </span>
              <span className={`text-[14px] font-bold ${pnlColor}`}>
                {isLoss ? '↘' : '↗'}
              </span>
              <span className={`text-[18px] font-mono-data font-black drop-shadow-sm ${pnlColor}`}>
                {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-[18px] font-mono-data font-black text-muted-foreground">—</span>
          )}
        </div>

        {/* Market link */}
        <a
          href={trade.marketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
        >
          View on Polymarket <ExternalLink size={9} />
        </a>
      </div>
    </div>
  );
};

const ActivePositions = ({ activeTab, onTabChange, trades: allTrades = [], modelStats = [], prices = [] }: ActivePositionsProps) => {
  const [filter, setFilter] = useState<string>('all');

  const openTrades = allTrades.filter(t => t.status === 'open');
  const closedTrades = allTrades.filter(t => t.status !== 'open');

  const displayTrades = (activeTab === 'OPEN' ? openTrades : closedTrades).filter(
    t => filter === 'all' || t.agentId === filter
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-stretch overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`text-[11px] uppercase tracking-wider px-4 py-2.5 whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab}
            {tab === 'OPEN' && openTrades.length > 0 && (
              <span className="ml-1.5 text-[9px] bg-green-500 text-white rounded-sm px-1 py-0.5">
                {openTrades.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider">Filter:</span>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-card text-[11px] uppercase tracking-wider font-bold outline-none cursor-pointer border border-border px-2 py-1"
          >
            <option value="all">ALL MODELS</option>
            {MODELS.map(m => (<option key={m.id} value={m.id}>{m.shortName}</option>))}
          </select>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {displayTrades.length} {activeTab === 'OPEN' ? 'open' : 'closed'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {displayTrades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            {activeTab === 'OPEN' ? 'No open positions yet...' : 'No closed trades yet...'}
          </div>
        ) : (
          displayTrades.slice(0, 30).map((trade) => {
            const model = MODELS.find(m => m.id === trade.agentId) || {
              id: trade.agentId,
              shortName: trade.agentId,
              color: '#888',
            };
            return <TradeLogEntry key={trade.id} trade={trade} model={model} modelStats={modelStats} prices={prices} />;
          })
        )}
      </div>
    </div>
  );
};

export default ActivePositions;
