import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  Customized,
} from 'recharts';
import { MODELS } from '@/data/constants';
import { MODEL_LOGOS } from '@/assets/logos';

interface PerformanceChartProps {
  equityData?: any[];
  modelStats?: any[];
}

const MODEL_COLORS: Record<string, string> = {};
MODELS.forEach(m => { MODEL_COLORS[m.id] = m.color; });

const EndLabels = (props: any) => {
  const { yAxisMap, xAxisMap, offset, data: processedData, hiddenModels, viewMode } = props;
  if (!processedData || processedData.length === 0) return null;

  const yAxis = yAxisMap?.[Object.keys(yAxisMap)[0]];
  const xAxis = xAxisMap?.[Object.keys(xAxisMap)[0]];
  if (!yAxis?.scale || !xAxis?.scale) return null;

  const ot = offset?.top ?? 20;
  const chartH = offset?.height ?? 200;

  // Build label data for every visible model mapping to their independent final 'x' points
  const labels = MODELS
    .filter(m => !hiddenModels?.has(m.id))
    .map(m => {
      const lastIdx = processedData.findLastIndex(d => d[m.id] != null);
      if (lastIdx === -1) return null;

      const lastPoint = processedData[lastIdx];
      const chartVal = lastPoint[m.id];
      if (chartVal == null || isNaN(chartVal)) return null;

      const targetY = ot + (yAxis.scale(chartVal) ?? 0);

      // Calculate X based on index within the visible data set
      const totalPoints = processedData.length;
      const chartW = offset?.width ?? 500;
      const leftGap = offset?.left ?? 0;

      const targetX = leftGap + (lastIdx / Math.max(1, totalPoints - 1)) * chartW;

      return { ...m, displayVal: chartVal, targetY, targetX, hasChartLine: true };
    })
    .filter(Boolean) as Array<{ id: string; color: string; displayVal: number; targetY: number; targetX: number; hasChartLine: boolean }>;

  if (labels.length === 0) return null;

  labels.sort((a, b) => a.targetY - b.targetY);

  const GAP = 26;
  const spread = labels.map(l => l.targetY);
  for (let pass = 0; pass < 80; pass++) {
    for (let i = 1; i < spread.length; i++) {
      if (spread[i] - spread[i - 1] < GAP) {
        const mid = (spread[i] + spread[i - 1]) / 2;
        spread[i - 1] = mid - GAP / 2;
        spread[i] = mid + GAP / 2;
      }
    }
    for (let i = spread.length - 2; i >= 0; i--) {
      if (spread[i + 1] - spread[i] < GAP) {
        const mid = (spread[i + 1] + spread[i]) / 2;
        spread[i] = mid - GAP / 2;
        spread[i + 1] = mid + GAP / 2;
      }
    }
  }

  for (let i = 0; i < spread.length; i++) {
    spread[i] = Math.max(ot + 20, Math.min(ot + chartH - 20, spread[i]));
  }

  return (
    <g>
      {labels.map((label, idx) => {
        const yActual = label.targetY;
        const yLabel = spread[idx];
        const logo = MODEL_LOGOS[label.id];

        const displayStr = viewMode === '$'
          ? `$${label.displayVal.toFixed(2)}`
          : `${label.displayVal.toFixed(2)}%`;

        const headX = label.targetX;
        const iconCx = headX + 18;

        return (
          <g key={label.id}>
            {label.hasChartLine && (
              <circle cx={headX} cy={yActual} r={3} fill={label.color} opacity={0.9} />
            )}

            {label.hasChartLine && (
              <path
                d={`M ${headX} ${yActual} L ${headX + 6} ${yActual} L ${headX + 6} ${yLabel} L ${iconCx - 14} ${yLabel}`}
                fill="none"
                stroke={label.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.55}
              />
            )}

            <circle cx={iconCx} cy={yLabel} r={14} fill={label.color} />
            {logo && (
              <image
                href={logo}
                x={iconCx - 8} y={yLabel - 8}
                width={16} height={16}
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            )}

            <rect x={iconCx + 16} y={yLabel - 10} width={68} height={20} rx={4} fill={label.color} />
            <text
              x={iconCx + 20} y={yLabel + 4}
              fontSize={11} fontWeight="bold"
              fontFamily="Minecraftia, monospace"
              fill="#fff"
            >
              {displayStr}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const PerformanceChart = ({ equityData = [], modelStats = [] }: PerformanceChartProps) => {
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'$' | '%'>('$');
  const [hiddenModels] = useState<Set<string>>(new Set());

  const TIME_RANGES = [
    { key: 'ALL', label: 'ALL', slice: 0 },
    { key: '1W', label: '1W', slice: -14 },
    { key: '1D', label: '1D', slice: -2 },
    { key: '1H', label: '1H', slice: -1 },
  ];

  const range = TIME_RANGES.find(r => r.key === timeRange) || TIME_RANGES[0];
  const rawData = range.slice === 0 ? equityData : equityData.slice(range.slice);

  const data = useMemo(() => {
    if (rawData.length > 0) return rawData;
    const now = Date.now();
    const base: Record<string, any> = { timestamp: now };
    modelStats.forEach(s => { base[s.agentId ?? s.id] = s.balance ?? 1000; });
    return [base];
  }, [rawData, modelStats]);

  const chartData = viewMode === '%'
    ? data.map(d => ({
      ...d,
      claude: d.claude != null ? ((d.claude - 1000) / 1000) * 100 : null,
      chatgpt: d.chatgpt != null ? ((d.chatgpt - 1000) / 1000) * 100 : null,
      gemini: d.gemini != null ? ((d.gemini - 1000) / 1000) * 100 : null,
      grok: d.grok != null ? ((d.grok - 1000) / 1000) * 100 : null,
      deepseek: d.deepseek != null ? ((d.deepseek - 1000) / 1000) * 100 : null,
    }))
    : data;

  // Process data to truncate trailing flat segments per bot
  const processedData = useMemo(() => {
    const dataCopy = chartData.map(d => ({ ...d }));
    for (let m of MODELS) {
      const id = m.id;
      if (dataCopy.length === 0) continue;

      let finalVal = dataCopy[dataCopy.length - 1][id];
      let lastActivityIdx = -1;
      // Search backwards to see when this value was first adopted
      for (let i = dataCopy.length - 1; i >= 0; i--) {
        if (dataCopy[i][id] !== finalVal) {
          lastActivityIdx = i;
          break;
        }
      }
      const trueLastIdx = lastActivityIdx + 1;
      // Nullify out the idle time!
      for (let i = trueLastIdx + 1; i < dataCopy.length; i++) {
        dataCopy[i][id] = null;
      }
    }
    return dataCopy;
  }, [chartData]);

  // xDomain is no longer needed for category-like indexing, 
  // but we can keep it as a placeholder if requested.
  const xDomain = undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-0">
          {(['$', '%'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`text-xs px-4 py-1.5 border border-border transition-all ${viewMode === m ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {m}
            </button>
          ))}
        </div>
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-center flex-1">
          Total Account Value
        </h2>
        <div className="flex items-center gap-0">
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`text-xs px-4 py-1.5 border border-border transition-all ${timeRange === r.key ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3" style={{ overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
          <LineChart data={processedData} margin={{ top: 20, right: 110, left: 10, bottom: 5 }} style={{ overflow: 'visible' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              hide={true}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: 'Minecraftia, monospace', fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={v => viewMode === '$' ? `$${v.toLocaleString()}` : `${v.toFixed(1)}%`}
              domain={viewMode === '%' ? [-0.5, 'auto'] : ['auto', 'auto']}
            />
            <ReferenceLine
              y={viewMode === '$' ? 1000 : 0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              opacity={0.6}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0px',
                fontSize: '11px',
                fontFamily: 'Minecraftia, monospace',
              }}
              labelFormatter={(label) => new Date(label).toLocaleTimeString()}
              formatter={(value: number) =>
                viewMode === '$' ? `$${(value ?? 0).toFixed(2)}` : `${(value ?? 0).toFixed(2)}%`
              }
            />

            {MODELS.map(m => (
              !hiddenModels.has(m.id) && (
                <Line
                  key={m.id}
                  type="linear"
                  dataKey={m.id}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: m.color }}
                  isAnimationActive={false}
                />
              )
            ))}

            <Customized
              component={(p: any) => (
                <EndLabels
                  {...p}
                  hiddenModels={hiddenModels}
                  viewMode={viewMode}
                />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;
