import { useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export type StatMetricKey = 'participacoes' | 'cadastros' | 'rsvps';

export interface MonthlyStatPoint {
  key: string;
  month: string;
  fullMonth: string;
  participacoes: number;
  cadastros: number;
  rsvps: number;
  oracoes: number;
  avisos: number;
}

interface ClippedAreaChartProps {
  data: MonthlyStatPoint[];
  metric: StatMetricKey;
  periodMonths: 3 | 6 | 12;
}

const METRIC_META: Record<
  StatMetricKey,
  {
    label: string;
    title: string;
    unitSingular: string;
    unitPlural: string;
    color: string;
    comparisonKey: StatMetricKey;
    comparisonLabel: string;
  }
> = {
  participacoes: {
    label: 'Interações totais',
    title: 'Interações da comunidade',
    unitSingular: 'interação',
    unitPlural: 'interações',
    color: '#218838',
    comparisonKey: 'cadastros',
    comparisonLabel: 'Cadastros',
  },
  cadastros: {
    label: 'Novos cadastros',
    title: 'Membros e inscritos em avisos',
    unitSingular: 'cadastro',
    unitPlural: 'cadastros',
    color: '#0066CC',
    comparisonKey: 'rsvps',
    comparisonLabel: 'Presenças (RSVPs)',
  },
  rsvps: {
    label: 'Presenças confirmadas',
    title: 'Confirmações em eventos (RSVPs)',
    unitSingular: 'presença',
    unitPlural: 'presenças',
    color: '#218838',
    comparisonKey: 'cadastros',
    comparisonLabel: 'Cadastros',
  },
};

const chartConfig = {
  participacoes: {
    label: 'Interações',
    color: '#218838',
  },
  cadastros: {
    label: 'Cadastros',
    color: '#0066CC',
  },
  rsvps: {
    label: 'Presenças (RSVPs)',
    color: '#218838',
  },
} satisfies ChartConfig;

export function ClippedAreaChart({
  data,
  metric,
  periodMonths,
}: ClippedAreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [axis, setAxis] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const meta = METRIC_META[metric];

  const totalValue = useMemo(
    () => data.reduce((acc, item) => acc + item[metric], 0),
    [data, metric]
  );

  const peakPoint = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((best, cur) => (cur[metric] > best[metric] ? cur : best), data[0]);
  }, [data, metric]);

  const activePoint =
    hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;

  const displayedNumber = activePoint ? activePoint[metric] : totalValue;

  const previousMonthValue =
    data.length >= 2 ? data[data.length - 2][metric] : 0;
  const latestMonthValue =
    data.length >= 1 ? data[data.length - 1][metric] : 0;

  const deltaInfo = useMemo(() => {
    if (activePoint) {
      const val = activePoint[metric];
      const unit = val === 1 ? meta.unitSingular : meta.unitPlural;
      return {
        text: `${activePoint.fullMonth}: ${val.toLocaleString('pt-BR')} ${unit}`,
        tone: 'neutral' as const,
      };
    }
    if (totalValue === 0) {
      return {
        text: `Sem registros nos últimos ${periodMonths} meses`,
        tone: 'neutral' as const,
      };
    }
    if (previousMonthValue === 0 && latestMonthValue > 0) {
      return {
        text: `+${latestMonthValue.toLocaleString('pt-BR')} no mês atual`,
        tone: 'positive' as const,
      };
    }
    if (previousMonthValue === 0) {
      return {
        text: 'Estável vs. mês anterior',
        tone: 'neutral' as const,
      };
    }
    const pct = Math.round(((latestMonthValue - previousMonthValue) / previousMonthValue) * 100);
    return {
      text: `${pct >= 0 ? '+' : ''}${pct}% vs. mês anterior`,
      tone: pct > 0 ? ('positive' as const) : pct < 0 ? ('negative' as const) : ('neutral' as const),
    };
  }, [
    activePoint,
    latestMonthValue,
    meta.unitPlural,
    meta.unitSingular,
    metric,
    periodMonths,
    previousMonthValue,
    totalValue,
  ]);

  const gradientId = `stats-area-gradient-${metric}`;
  const clipId = `stats-area-clip-${metric}`;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#6E6E73]">
            {meta.title} · últimos {periodMonths} meses
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[32px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums leading-none">
              {displayedNumber.toLocaleString('pt-BR')}
            </span>
            <span
              className={
                deltaInfo.tone === 'positive'
                  ? 'text-[13px] font-medium text-[#218838] tabular-nums'
                  : deltaInfo.tone === 'negative'
                    ? 'text-[13px] font-medium text-[#B91C1C] tabular-nums'
                    : 'text-[13px] font-medium text-[#6E6E73] tabular-nums'
              }
            >
              {deltaInfo.text}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-[#6E6E73] tabular-nums">
            {peakPoint && peakPoint[metric] > 0
              ? `Pico do período em ${peakPoint.fullMonth} (${peakPoint[metric].toLocaleString('pt-BR')}) · passe o cursor para detalhar`
              : 'Passe o cursor sobre a linha do tempo para inspecionar cada mês'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#6E6E73] shrink-0 pt-0.5">
          <span className="inline-flex items-center gap-2 font-medium text-[#1D1D1F]">
            <span
              className="w-3.5 h-[2px] inline-block"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 border-t border-dashed border-[#86868B] inline-block" />
            {meta.comparisonLabel}
          </span>
        </div>
      </div>

      <div
        ref={chartRef}
        className="w-full"
        onMouseLeave={() => {
          setHoveredIndex(null);
          setAxis(chartRef.current?.getBoundingClientRect().width || 0);
        }}
      >
        <ChartContainer
          config={chartConfig}
          className="h-[240px] sm:h-[270px] w-full aspect-auto"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 10, top: 12, bottom: 4 }}
            onMouseMove={(state) => {
              const x = state?.activeCoordinate?.x;
              if (typeof x === 'number') {
                setAxis(x);
              }
              const idx =
                typeof state?.activeTooltipIndex === 'number'
                  ? state.activeTooltipIndex
                  : null;
              if (idx !== null) {
                setHoveredIndex(idx);
              }
            }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.07)"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
              stroke="#6E6E73"
            />
            <YAxis
              width={32}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="#86868B"
            />
            <ChartTooltip
              cursor={{ stroke: 'rgba(0,0,0,0.16)', strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  className="bg-white border border-black/[0.1] shadow-sm text-[#1D1D1F]"
                />
              }
            />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={meta.color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={meta.color} stopOpacity={0.01} />
              </linearGradient>
              <clipPath id={clipId}>
                <rect
                  x={0}
                  y={0}
                  width={axis > 0 && hoveredIndex !== null ? axis : '100%'}
                  height="100%"
                />
              </clipPath>
            </defs>

            {/* Secondary comparison trace */}
            <Area
              key={`comparison-${meta.comparisonKey}`}
              dataKey={meta.comparisonKey}
              type="monotone"
              fill="none"
              stroke="#86868B"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              isAnimationActive={false}
            />

            {/* Unclipped guide line for full-period continuity when scrubbing */}
            <Area
              key={`guide-${metric}`}
              dataKey={metric}
              type="monotone"
              fill="none"
              stroke="rgba(0, 0, 0, 0.14)"
              strokeWidth={1.75}
              tooltipType="none"
              isAnimationActive={false}
            />

            {/* Clipped active primary series */}
            <Area
              key={`primary-${metric}`}
              dataKey={metric}
              type="monotone"
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              stroke={meta.color}
              strokeWidth={2.25}
              clipPath={`url(#${clipId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
