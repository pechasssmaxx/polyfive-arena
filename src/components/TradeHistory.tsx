import { useState, useEffect } from 'react';
import { MODELS } from '@/data/constants';
import { TradeEntry } from '../../shared/types';
import { MODEL_LOGOS, CRYPTO_LOGOS } from '@/assets/logos';
import { TrendingUp, TrendingDown, Clock, X } from 'lucide-react';

interface TradeHistoryProps {
  selectedModel: string | null;
  trades?: TradeEntry[];
}

const formatDateTime = (ts: number) => {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};


const useLivePnl = (basePnl: number) => {
  const [pnl, setPnl] = useState(basePnl);
  useEffect(() => {
    setPnl(basePnl);
  }, [basePnl]);
  return pnl;
};

const TradeDetail = ({ trade, onClose }: { trade: any; onClose: () => void }) => {
  const model = MODELS.find(m => m.id === trade.agentId);
  const modelName = model?.shortName || trade.agentId;
  const modelLogo = MODEL_LOGOS[trade.agentId];
  const isProfit = trade.pnl >= 0;
  const pnlColor = isProfit ? 'text-profit' : 'text-loss';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border w-full max-w-md mx-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {modelLogo && <img src={modelLogo} alt="" className="w-5 h-5 rounded-full object-cover" />}
            <span className="text-[11px] font-bold uppercase">{modelName}</span>
            <span className={`flex items-center gap-0.5 text-[9px] font-bold uppercase ${trade.direction === 'UP' ? 'text-profit' : 'text-loss'
              }`}>
              {trade.direction === 'UP' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {trade.direction}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Asset + P&L */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={CRYPTO_LOGOS[trade.asset]} alt="" className="w-5 h-5 object-contain" />
            <span className="text-sm font-bold">{trade.asset}</span>
          </div>
          <div className="text-right">
            <span className={`text-sm font-bold font-mono-data ${pnlColor}`}>
              {isProfit ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono-data ${pnlColor} block`}>
              {isProfit ? '+' : ''}{(trade.pnlPercent || 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-0 border-t border-border">
          {[
            { label: 'Entry Price', value: `${Math.round((trade.entryPrice || 0) * 100)}¢` },
            { label: 'Exit Price', value: trade.exitPrice !== null ? `${Math.round((trade.exitPrice || 0) * 100)}¢` : 'OPEN' },
            { label: 'Position Size', value: `$${(trade.positionSize || 0).toFixed(2)}` },
            { label: 'Opened', value: formatDateTime(trade.openTimestamp) },
            { label: 'Status', value: (trade.status || 'unknown').toUpperCase() },
            { label: 'Market', value: (trade.asset || '') + ' ' + (trade.side || '') },
          ].map((item, i) => (
            <div key={i} className="px-4 py-2 border-b border-border/30">
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest block">{item.label}</span>
              <span className="text-[11px] font-mono-data font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TradeCard = ({ trade, index, onClick }: { trade: any; index: number; onClick: () => void }) => {
  const model = MODELS.find(m => m.id === trade.agentId);
  const modelName = model?.shortName || trade.agentId;
  const livePnl = useLivePnl(trade.pnl || 0);
  const isProfit = livePnl >= 0;
  const pnlColor = isProfit ? 'text-profit' : 'text-loss';

  return (
    <div
      onClick={onClick}
      className="group hover:bg-accent/10 transition-all duration-300 animate-fade-in flex flex-col border-b border-r border-border/10 px-3 py-2.5 cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {MODEL_LOGOS[trade.agentId] && (
            <img src={MODEL_LOGOS[trade.agentId]} alt="" className="w-4 h-4 rounded-full object-cover" />
          )}
          <span className="text-[10px] font-bold uppercase">{modelName}</span>
          <span className={`flex items-center gap-0.5 text-[9px] font-bold uppercase ${trade.direction === 'UP' ? 'text-profit' : 'text-loss'
            }`}>
            {trade.direction === 'UP' ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
            {trade.direction}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Clock size={8} />
          {formatDateTime(trade.openTimestamp)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img src={CRYPTO_LOGOS[trade.asset]} alt="" className="w-3.5 h-3.5 object-contain" />
          <span className="text-[11px] font-bold">{trade.asset}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono-data">
          <span className="text-muted-foreground">{Math.round((trade.entryPrice || 0) * 100)}¢</span>
          <span className="text-muted-foreground">→</span>
          <span>{trade.exitPrice !== null ? `${Math.round((trade.exitPrice || 0) * 100)}¢` : 'OPEN'}</span>
          <span className={`font-bold ${pnlColor}`}>
            {isProfit ? '+' : ''}${(livePnl || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ASSETS = ['BTC', 'ETH', 'XRP', 'SOL'];

const TradeHistory = ({ selectedModel, trades: allTrades = [] }: TradeHistoryProps) => {
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<TradeEntry | null>(null);

  const effectiveModel = selectedModel || (modelFilter !== 'all' ? modelFilter : null);

  const trades = allTrades.filter(t => {
    if (effectiveModel && t.agentId !== effectiveModel) return false;
    if (assetFilter !== 'all' && t.asset !== assetFilter) return false;
    // Only show closed trades in history for visual clarity, unless we want all
    return true;
  });

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 gap-2">
        <span className="text-[10px] uppercase tracking-widest font-bold shrink-0">Trade History</span>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel || modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            disabled={!!selectedModel}
            className="bg-transparent text-[10px] uppercase tracking-wider font-bold outline-none cursor-pointer text-muted-foreground"
          >
            <option value="all">All Models</option>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.shortName}</option>)}
          </select>
          <select
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
            className="bg-transparent text-[10px] uppercase tracking-wider font-bold outline-none cursor-pointer text-muted-foreground"
          >
            <option value="all">All Assets</option>
            {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-[10px] text-muted-foreground shrink-0">{trades.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs mt-10">
            Waiting for signals...
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-0 p-0">
            {trades.slice(0, 18).map((trade, i) => (
              <TradeCard key={trade.id} trade={trade} index={i} onClick={() => setSelectedTrade(trade)} />
            ))}
          </div>
        )}
      </div>

      {selectedTrade && (
        <TradeDetail trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
      )}
    </div>
  );
};

export default TradeHistory;