import { useState, useEffect } from 'react';
import PerformanceChart from '@/components/PerformanceChart';
import ModelStats from '@/components/ModelStats';
import ActivePositions from '@/components/ActivePositions';
import TradeHistory from '@/components/TradeHistory';
import DecisionFeed from '@/components/DecisionFeed';
import Leaderboard from '@/components/Leaderboard';
import { MODEL_LOGOS, CRYPTO_LOGOS } from '@/assets/logos';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast, Toaster } from 'sonner';
import { MODELS } from '@/data/constants';

// Determine server URL based on environment
function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

const Index = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState('OPEN');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // REST API Data States
  const [connected, setConnected] = useState(false);
  const [prices, setPrices] = useState<any[]>([]);
  const [equityData, setEquityData] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  // Initialize empty stats if none provided by backend yet
  const [modelStats, setModelStats] = useState<any[]>(
    MODELS.map(m => ({
      ...m,
      equity: 0, pnl: 0, pnlPercent: 0, wins: 0, losses: 0, totalTrades: 0,
    }))
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // REST polling + SSE in one effect so fetchData is shared
  useEffect(() => {
    const url = getServerUrl();

    const fetchData = async () => {
      try {
        const [tradesRes, statsRes, balRes, pricesRes] = await Promise.all([
          fetch(`${url}/api/trades`).then(res => res.json()),
          fetch(`${url}/api/stats`).then(res => res.json()),
          fetch(`${url}/api/balances`).then(res => res.json()),
          fetch(`${url}/api/prices`).then(res => res.json())
        ]);

        if (Array.isArray(tradesRes)) setTrades(tradesRes);
        if (Array.isArray(statsRes) && statsRes.length > 0) {
          const mergedStats = MODELS.map(model => {
            const dbStat = statsRes.find((s: any) => s.agentId === model.id) || {};
            return { ...model, ...dbStat, agentId: model.id };
          });
          setModelStats(mergedStats);
        }
        if (Array.isArray(balRes)) setEquityData(balRes);
        if (Array.isArray(pricesRes)) setPrices(pricesRes);

        setConnected(true);
      } catch {
        setConnected(false);
      }
    };

    // Fetch immediately, then every 15s as backup (SSE handles real-time)
    fetchData();
    const timer = setInterval(fetchData, 15_000);

    // SSE — instant push when trade opens/closes or balances update
    const es = new EventSource(`${url}/api/events`);
    es.onopen = () => { fetchData(); };
    es.onmessage = (e: MessageEvent) => {
      try {
        const { type, ...tradeData } = JSON.parse(e.data);
        if (type === 'trade:open') {
          setTrades(prev => [tradeData, ...prev.filter((t: any) => t.id !== tradeData.id)]);
          const model = MODELS.find(m => m.id === tradeData.agentId);
          const name = model?.shortName || tradeData.agentId;
          toast.success(`${name} opened ${tradeData.side} ${tradeData.asset} @ ${Math.round((tradeData.entryPrice || 0) * 100)}¢`);
        } else if (type === 'trade:close') {
          setTrades(prev => prev.map((t: any) => t.id === tradeData.id ? { ...t, ...tradeData } : t));
          const model = MODELS.find(m => m.id === tradeData.agentId);
          const name = model?.shortName || tradeData.agentId;
          const pnl = tradeData.pnl || 0;
          toast(`${name} closed ${tradeData.side} ${tradeData.asset} — ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, {
            style: { borderLeft: `3px solid ${pnl >= 0 ? '#22c55e' : '#ef4444'}` },
          });
        } else if (type === 'stats:update') {
          fetchData();
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => { /* EventSource auto-reconnects */ };

    return () => {
      clearInterval(timer);
      es.close();
    };
  }, []);

  const best = modelStats.length > 0
    ? modelStats.reduce((a, b) => ((a.balance || a.equity || 0) > (b.balance || b.equity || 0) ? a : b))
    : { id: '', shortName: '-', balance: 0, equity: 0, pnl: 0, pnlPercent: 0, totalRoi: 0 };
  const worst = modelStats.length > 0
    ? modelStats.reduce((a, b) => ((a.balance || a.equity || 0) < (b.balance || b.equity || 0) ? a : b))
    : { id: '', shortName: '-', balance: 0, equity: 0, pnl: 0, pnlPercent: 0, totalRoi: 0 };


  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Toaster position="bottom-right" richColors />
      {showLeaderboard && (
        <Leaderboard
          stats={modelStats}
          trades={trades}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
      {/* NAV — full width, single row */}
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight uppercase">Polyfive</h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">by polymarket</span>
        </div>
        <div className="flex items-center gap-0">
          <nav className="hidden md:flex items-center gap-0 text-xs uppercase tracking-wider">
            <span className="font-bold px-4 py-1.5 cursor-pointer">Live</span>
            <span className="text-muted-foreground px-1">|</span>
            <span className="text-muted-foreground px-4 py-1.5 hover:text-foreground cursor-pointer transition-colors" onClick={() => setShowLeaderboard(true)}>Leaderboard</span>
            <span className="text-muted-foreground px-1">|</span>
            <span className="text-muted-foreground px-4 py-1.5 hover:text-foreground cursor-pointer transition-colors">$FIVE</span>
          </nav>

          {/* Connection status indicator */}
          <div className="flex items-center gap-1.5 ml-4 mr-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-accent transition-colors ml-2">
            <svg width="18" height="18" viewBox="0 0 400 400" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
              <polygon points="213.3,26.7 213.3,0 186.7,0 186.7,26.7 186.7,53.3 213.3,53.3" />
              <rect height="26.7" width="26.7" x="53.3" y="53.3" /><rect height="26.7" width="26.7" x="320" y="53.3" />
              <rect height="26.7" width="26.7" x="80" y="80" />
              <polygon points="213.3,106.7 240,106.7 240,80 213.3,80 186.7,80 160,80 160,106.7 186.7,106.7" />
              <rect height="26.7" width="26.7" x="293.3" y="80" />
              <rect height="26.7" width="26.7" x="133.3" y="106.7" /><rect height="26.7" width="26.7" x="240" y="106.7" />
              <rect height="26.7" width="26.7" x="106.7" y="133.3" /><rect height="26.7" width="26.7" x="266.7" y="133.3" />
              <polygon points="53.3,186.7 26.7,186.7 0,186.7 0,213.3 26.7,213.3 53.3,213.3" />
              <polygon points="106.7,186.7 106.7,160 80,160 80,186.7 80,213.3 80,240 106.7,240 106.7,213.3" />
              <polygon points="293.3,213.3 293.3,240 320,240 320,213.3 320,186.7 320,160 293.3,160 293.3,186.7" />
              <polygon points="373.3,186.7 346.7,186.7 346.7,213.3 373.3,213.3 400,213.3 400,186.7" />
              <rect height="26.7" width="26.7" x="106.7" y="240" /><rect height="26.7" width="26.7" x="266.7" y="240" />
              <rect height="26.7" width="26.7" x="133.3" y="266.7" /><rect height="26.7" width="26.7" x="240" y="266.7" />
              <rect height="26.7" width="26.7" x="80" y="293.3" />
              <polygon points="186.7,293.3 160,293.3 160,320 186.7,320 213.3,320 240,320 240,293.3 213.3,293.3" />
              <rect height="26.7" width="26.7" x="293.3" y="293.3" />
              <rect height="26.7" width="26.7" x="53.3" y="320" /><rect height="26.7" width="26.7" x="320" y="320" />
              <polygon points="186.7,373.3 186.7,400 213.3,400 213.3,373.3 213.3,346.7 186.7,346.7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Top ticker bar */}
      <div className="border-t border-b border-border flex items-center">
        <div className="flex-1 flex items-center px-5 py-2 border-r border-border">
          {prices.map((c) => (
            <div key={c.symbol} className="flex items-center gap-2 pr-6">
              <img src={CRYPTO_LOGOS[c.symbol]} alt={c.symbol} className="w-4 h-4 object-contain" />
              <span className="text-[11px] font-bold tracking-wide">{c.symbol}</span>
              <span className="text-[11px] font-bold font-mono-data">
                ${(c.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] font-bold ${(c.change || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                {(c.change || 0) >= 0 ? '+' : ''}{(c.change || 0).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 shrink-0">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest shrink-0">Best:</span>
          <img src={MODEL_LOGOS[best.id]} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
          <span className="text-[10px] font-bold uppercase shrink-0">{best.shortName}</span>
          <span className="text-[11px] font-bold font-mono-data shrink-0">${(best.balance || best.equity || 0).toFixed(2)}</span>
          <span className="text-[10px] font-bold text-profit shrink-0">+{(best.totalRoi || best.pnlPercent || 0).toFixed(1)}%</span>
          <span className="text-muted-foreground mx-0.5 shrink-0">|</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest shrink-0">Worst:</span>
          <img src={MODEL_LOGOS[worst.id]} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
          <span className="text-[10px] font-bold uppercase shrink-0">{worst.shortName}</span>
          <span className="text-[11px] font-bold font-mono-data shrink-0">${(worst.balance || worst.equity || 0).toFixed(2)}</span>
          <span className={`text-[10px] font-bold shrink-0 ${(worst.totalPnl || worst.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
            {(worst.totalRoi || worst.pnlPercent || 0) >= 0 ? '+' : ''}{(worst.totalRoi || worst.pnlPercent || 0).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main content — resizable left/right */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Chart + Models + Trade History */}
          <ResizablePanel defaultSize={72} minSize={40}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={65} minSize={25}>
                <div className="flex flex-col h-full">
                  <div className="flex-1 min-h-0">
                    <PerformanceChart equityData={equityData} modelStats={modelStats} />
                  </div>
                  <div className="px-2 py-1">
                    <ModelStats
                      selectedModel={selectedModel}
                      onSelectModel={setSelectedModel}
                      stats={modelStats}
                    />
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle className="h-px bg-border hover:bg-muted-foreground transition-colors data-[resize-handle-active]:bg-muted-foreground" />
              <ResizablePanel defaultSize={35} minSize={20}>
                <TradeHistory selectedModel={selectedModel} trades={trades} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border hover:bg-muted-foreground transition-colors data-[resize-handle-active]:bg-muted-foreground" />

          {/* Right: Active Positions & Decision Feed */}
          <ResizablePanel defaultSize={28} minSize={20}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={60} minSize={30}>
                <ActivePositions activeTab={rightTab} onTabChange={setRightTab} trades={trades} modelStats={modelStats} prices={prices} />
              </ResizablePanel>
              <ResizableHandle className="h-px bg-border hover:bg-muted-foreground transition-colors" />
              <ResizablePanel defaultSize={40} minSize={20}>
                {/* DecisionFeed is basically old news now, but we'll leave it in so we don't break the layout. We just pass trades. */}
                <DecisionFeed trades={trades} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Index;
