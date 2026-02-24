import { useState } from 'react';
import { MODELS } from '@/data/constants';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { TradeEntry } from '../../shared/types';

const formatDateTime = (ts: number | undefined) => ts ? new Date(ts).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '';

interface DecisionFeedProps {
    trades: TradeEntry[];
}

export default function DecisionFeed({ trades = [] }: DecisionFeedProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const decisions = trades.slice(0, 15).map(t => ({
        id: t.id,
        agentId: t.agentId,
        side: t.side,
        asset: t.asset,
        entryPrice: t.entryPrice,
        question: t.marketQuestion || 'Detected market signal',
        timestamp: formatDateTime(t.openTimestamp),
        status: t.status,
    }));

    if (decisions.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] uppercase tracking-widest px-4 text-center">
                Waiting for trades...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-accent/5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold">Activity</span>
                <span className="text-[10px] text-muted-foreground">Recent Trades</span>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar">
                {decisions.map((decision) => {
                    const model = MODELS.find(m => m.id === decision.agentId) || { shortName: decision.agentId, color: '#888' };
                    const isExpanded = expandedId === decision.id;

                    return (
                        <div
                            key={decision.id}
                            className={`border-b border-border/30 px-4 py-2.5 transition-colors cursor-pointer hover:bg-accent/5 ${isExpanded ? 'bg-accent/10' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: model.color }} />
                                    <span className="text-[11px] font-bold uppercase">{model.shortName}</span>
                                    <span className={`text-[9px] font-bold ${decision.side === 'YES' ? 'text-profit' : 'text-loss'}`}>
                                        {decision.side}
                                    </span>
                                    <span className="text-[9px] font-mono-data text-muted-foreground">
                                        {Math.round((decision.entryPrice || 0) * 100)}¢
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                    <Clock size={8} />
                                    <span>{decision.timestamp}</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-1">
                                {isExpanded ? <ChevronDown size={10} className="mt-0.5 shrink-0" /> : <ChevronRight size={10} className="mt-0.5 shrink-0" />}
                                <p className={`text-[11px] leading-snug ${isExpanded ? 'text-foreground' : 'text-muted-foreground line-clamp-1'}`}>
                                    {decision.question}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
