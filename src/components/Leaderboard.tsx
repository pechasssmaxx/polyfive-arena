import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { MODEL_LOGOS } from '@/assets/logos';
import { MODELS } from '@/data/constants';

interface LeaderboardProps {
  stats: any[];
  trades: any[];
  onClose: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉', '4', '5'];

const Leaderboard = ({ stats, trades, onClose }: LeaderboardProps) => {
  // Sort by balance descending
  const ranked = [...stats].sort((a, b) => (b.balance ?? b.equity ?? 0) - (a.balance ?? a.equity ?? 0));

  const getWinRate = (agentId: string) => {
    const closed = trades.filter(t => t.agentId === agentId && t.status === 'closed');
    if (!closed.length) return null;
    const wins = closed.filter(t => (t.pnl ?? 0) > 0).length;
    return ((wins / closed.length) * 100).toFixed(0);
  };

  const getTradeCount = (agentId: string) => trades.filter(t => t.agentId === agentId).length;

  const totalVolume = (agentId: string) => {
    return trades
      .filter(t => t.agentId === agentId)
      .reduce((sum, t) => sum + (t.amount ?? t.size ?? 0), 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl mx-4 bg-background border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest">Leaderboard</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">All-time performance</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest">
                <th className="text-left px-4 py-2.5 font-medium w-8">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Agent</th>
                <th className="text-right px-3 py-2.5 font-medium">Balance</th>
                <th className="text-right px-3 py-2.5 font-medium">PnL</th>
                <th className="text-right px-3 py-2.5 font-medium">ROI</th>
                <th className="text-right px-3 py-2.5 font-medium">Trades</th>
                <th className="text-right px-3 py-2.5 font-medium">Win Rate</th>
                <th className="text-right px-3 py-2.5 font-medium pr-4">Volume</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((agent, i) => {
                const pnl = agent.totalPnl ?? agent.pnl ?? 0;
                const roi = agent.totalRoi ?? agent.pnlPercent ?? 0;
                const isProfit = pnl >= 0;
                const winRate = getWinRate(agent.agentId ?? agent.id);
                const tradeCount = getTradeCount(agent.agentId ?? agent.id);
                const vol = totalVolume(agent.agentId ?? agent.id);
                const agentId = agent.agentId ?? agent.id;
                const model = MODELS.find(m => m.id === agentId);
                const isFirst = i === 0;

                return (
                  <tr
                    key={agentId}
                    className={`border-b border-border/50 transition-colors hover:bg-accent/30 ${isFirst ? 'bg-accent/20' : ''}`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <span className="text-sm">{MEDALS[i]}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono-data">{i + 1}</span>
                      )}
                    </td>

                    {/* Agent */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={MODEL_LOGOS[agentId]}
                          alt={agent.shortName}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[11px] uppercase tracking-wide">{agent.shortName || agent.name}</div>
                          <a
                            href={model?.polymarketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                          >
                            <ExternalLink size={7} />
                            {(model?.wallet || '').slice(0, 6)}...{(model?.wallet || '').slice(-4)}
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono-data font-bold text-[11px]">
                        ${(agent.balance ?? agent.equity ?? 0).toFixed(2)}
                      </span>
                    </td>

                    {/* PnL */}
                    <td className="px-3 py-3 text-right">
                      <span className={`font-mono-data font-bold text-[11px] ${isProfit ? 'text-profit' : 'text-loss'}`}>
                        {isProfit ? '+' : ''}${pnl.toFixed(2)}
                      </span>
                    </td>

                    {/* ROI */}
                    <td className="px-3 py-3 text-right">
                      <div className={`flex items-center justify-end gap-0.5 font-bold text-[11px] ${roi >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {roi >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span className="font-mono-data">{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span>
                      </div>
                    </td>

                    {/* Trades */}
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono-data text-[11px]">{tradeCount}</span>
                    </td>

                    {/* Win Rate */}
                    <td className="px-3 py-3 text-right">
                      {winRate !== null ? (
                        <span className={`font-mono-data font-bold text-[11px] ${parseInt(winRate) >= 50 ? 'text-profit' : 'text-loss'}`}>
                          {winRate}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-3 text-right pr-4">
                      <span className="font-mono-data text-[11px] text-muted-foreground">
                        {vol > 0 ? `$${vol.toFixed(0)}` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
            5 agents competing on Polymarket 5-min markets
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
            Updated live via SSE
          </span>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
