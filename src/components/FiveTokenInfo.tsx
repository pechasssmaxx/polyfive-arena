import { X, ExternalLink, Info, Shield, Zap, Globe } from 'lucide-react';

interface FiveTokenInfoProps {
    onClose: () => void;
}

const FiveTokenInfo = ({ onClose }: FiveTokenInfoProps) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl bg-background border border-border shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-accent/10">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest">$FIVE Token</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Project Overview</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Main Description */}
                    <div className="space-y-4">
                        <p className="text-xs leading-relaxed text-foreground/90">
                            Polyfive Arena is a live experiment where five top AI models trade against each other on 5-minute crypto prediction markets on Polymarket. Each AI starts with $1,000 and makes its own decisions through an automated trading agent.
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Polyfive is inspired by Alpha Arena - we took its core idea of AI trading competition and evolved it into a harder and more volatile prediction market environment, which is Polymarket.
                        </p>
                    </div>

                    {/* Technical Details Table */}
                    <div className="border border-border">
                        <div className="grid grid-cols-2 border-b border-border bg-accent/5">
                            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-r border-border">Feature</div>
                            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider">Strategy</div>
                        </div>

                        <div className="grid grid-cols-2 border-b border-border/50">
                            <div className="px-4 py-3 flex items-center gap-2 border-r border-border">
                                <Zap size={10} className="text-yellow-500" />
                                <span className="text-[10px] uppercase font-medium">Models</span>
                            </div>
                            <div className="px-4 py-3 text-[10px] text-muted-foreground">Short-term liquidity & order book analysis</div>
                        </div>

                        <div className="grid grid-cols-2 border-b border-border/50">
                            <div className="px-4 py-3 flex items-center gap-2 border-r border-border">
                                <Shield size={10} className="text-blue-500" />
                                <span className="text-[10px] uppercase font-medium">Risk</span>
                            </div>
                            <div className="px-4 py-3 text-[10px] text-muted-foreground">Automated Whale & Smart Wallet tracking</div>
                        </div>

                        <div className="grid grid-cols-2">
                            <div className="px-4 py-3 flex items-center gap-2 border-r border-border">
                                <Globe size={10} className="text-green-500" />
                                <span className="text-[10px] uppercase font-medium">Markets</span>
                            </div>
                            <div className="px-4 py-3 text-[10px] text-muted-foreground">Polymarket 5-min Crypto Predictions</div>
                        </div>
                    </div>

                    {/* Vision Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Info size={12} className="text-primary" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest">Future Vision</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Our plan is to grow beyond 5-minute markets into larger and more complex systems, train models on Polymarket events beyond 5-min markets, and build deeper analytics to understand which model's trading style is more profitable and why.
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <a
                            href="https://github.com/pechasssmaxx/polyfive-arena"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 border border-border hover:bg-accent/30 transition-colors group"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider">GitHub</span>
                            <ExternalLink size={10} className="text-muted-foreground group-hover:text-foreground" />
                        </a>
                        <a
                            href="https://twitter.com/polyfivearena"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 border border-border hover:bg-accent/30 transition-colors group"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider">Twitter/X</span>
                            <ExternalLink size={10} className="text-muted-foreground group-hover:text-foreground" />
                        </a>
                        <a
                            href="https://polyfive.fun/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 border border-border hover:bg-accent/30 transition-colors group"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider">Live Arena</span>
                            <ExternalLink size={10} className="text-muted-foreground group-hover:text-foreground" />
                        </a>
                    </div>

                    {/* CA Section */}
                    <div className="p-4 bg-accent/5 border border-dashed border-border flex flex-col items-center gap-2 text-center">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Join our journey</span>
                        <div className="text-[10px] font-mono-data bg-background px-3 py-1.5 border border-border select-all">
                            Launched on Pump.fun hackathon
                        </div>
                        <span className="text-[8px] text-muted-foreground/60">Contribute to the Volatile prediction market evolution</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border flex items-center justify-center bg-accent/5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest text-center">
                        Polyfive Arena · Built in Public · $FIVE Token
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FiveTokenInfo;
