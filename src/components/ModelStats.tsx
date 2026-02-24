import { MODEL_LOGOS } from '@/assets/logos';
import { ExternalLink } from 'lucide-react';

interface ModelStatsProps {
  selectedModel: string | null;
  onSelectModel: (id: string | null) => void;
  stats?: any[];
}

const ModelStats = ({ selectedModel, onSelectModel, stats = [] }: ModelStatsProps) => {
  return (
    <div className="flex items-stretch gap-0 overflow-x-auto">
      {stats.map((m) => {
        const isProfit = (m.totalPnl ?? 0) >= 0;
        const isSelected = selectedModel === m.id;

        return (
          <button
            key={m.id}
            onClick={() => onSelectModel(isSelected ? null : m.id)}
            className={`flex-1 min-w-[140px] flex items-center justify-between gap-2 py-1.5 px-2.5 transition-all duration-200 cursor-pointer
              ${isSelected ? 'bg-accent' : 'hover:bg-accent/40'}
            `}
          >
            <div className="flex items-center gap-2">
              <img src={MODEL_LOGOS[m.id]} alt={m.shortName} className="w-4 h-4 rounded-full object-cover shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-[10px] font-bold uppercase block">{m.shortName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold font-mono-data">${(m.balance ?? 0).toFixed(2)}</span>
                  <span className={`text-[10px] font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                    {isProfit ? '+' : ''}{(m.totalRoi ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={m.polymarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] font-mono-data text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                title="View on Polymarket"
              >
                <ExternalLink size={8} />
                {(m.wallet || '').length > 15 ? `${m.wallet.slice(0, 6)}...${m.wallet.slice(-4)}` : (m.wallet || '')}
              </a>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ModelStats;
