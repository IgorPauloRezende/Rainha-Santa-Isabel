import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ClippedAreaChart,
  type MonthlyStatPoint,
  type StatMetricKey,
} from '@/components/ui/advanced-stats-utils/charts';
import type { ChurchDatabase } from '@/src/types/church';

interface AdvancedStatsProps {
  db: ChurchDatabase;
}

type PeriodMonths = 3 | 6 | 12;

const MONTH_NAMES_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const FULL_MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const PERIOD_OPTIONS: Array<{ value: PeriodMonths; label: string }> = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
];

const METRIC_OPTIONS: Array<{ value: StatMetricKey; label: string }> = [
  { value: 'participacoes', label: 'Interações' },
  { value: 'cadastros', label: 'Cadastros' },
  { value: 'rsvps', label: 'Presenças' },
];

function getMonthKey(dateInput?: string): string | null {
  if (!dateInput) return null;
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdvancedStats({ db }: AdvancedStatsProps) {
  const [periodMonths, setPeriodMonths] = useState<PeriodMonths>(6);
  const [selectedMetric, setSelectedMetric] = useState<StatMetricKey>('participacoes');

  const analytics = useMemo(() => {
    const now = new Date();
    const buckets: MonthlyStatPoint[] = [];

    for (let offset = periodMonths - 1; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key,
        month: MONTH_NAMES_PT[d.getMonth()],
        fullMonth: `${FULL_MONTH_NAMES_PT[d.getMonth()]} ${d.getFullYear()}`,
        participacoes: 0,
        cadastros: 0,
        rsvps: 0,
        oracoes: 0,
        avisos: 0,
      });
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    db.members.forEach((m) => {
      const k = getMonthKey(m.joinedAt);
      const b = k ? bucketMap.get(k) : undefined;
      if (b) {
        b.cadastros += 1;
        b.participacoes += 1;
      }
    });

    db.subscribers.forEach((s) => {
      const k = getMonthKey(s.createdAt);
      const b = k ? bucketMap.get(k) : undefined;
      if (b) {
        b.cadastros += 1;
        b.participacoes += 1;
      }
    });

    db.events.forEach((evt) => {
      evt.rsvps.forEach((r) => {
        const k = getMonthKey(r.createdAt);
        const b = k ? bucketMap.get(k) : undefined;
        if (b) {
          b.rsvps += r.guests;
          b.participacoes += r.guests;
        }
      });
    });

    db.prayerRequests.forEach((req) => {
      const k = getMonthKey(req.createdAt);
      const b = k ? bucketMap.get(k) : undefined;
      if (b) {
        b.oracoes += 1;
        b.participacoes += 1;
      }
    });

    db.notifications.forEach((n) => {
      const k = getMonthKey(n.createdAt);
      const b = k ? bucketMap.get(k) : undefined;
      if (b) {
        b.avisos += 1;
        b.participacoes += 1;
      }
    });

    const totalMembers = db.members.length;
    const activeAndLeaders = db.members.filter(
      (m) => m.status === 'Ativo' || m.status === 'Coordenador'
    ).length;
    const coordinatorsCount = db.members.filter((m) => m.status === 'Coordenador').length;
    const activeRatio = totalMembers > 0 ? Math.round((activeAndLeaders / totalMembers) * 100) : 0;

    const totalRsvps = db.events.reduce(
      (acc, e) => acc + e.rsvps.reduce((sum, r) => sum + r.guests, 0),
      0
    );
    const totalCapacity = db.events.reduce((acc, e) => acc + (e.capacity || 0), 0);
    const occupancyPct =
      totalCapacity > 0 ? Math.min(100, Math.round((totalRsvps / totalCapacity) * 100)) : 0;
    const publishedEvents = db.events.filter((e) => e.published).length;
    const publishedSermons = db.sermons.filter((s) => s.published).length;

    const pushSubscribers = db.subscribers.filter((s) => s.pushEnabled).length;
    const topicSubscribers = db.subscribers.filter((s) => s.topics.length > 0).length;
    const pendingPrayers = db.prayerRequests.filter((p) => p.status === 'Pendente').length;
    const inPrayerCount = db.prayerRequests.filter((p) => p.status === 'Em Oração').length;
    const answeredPrayers = db.prayerRequests.filter((p) => p.status === 'Atendido').length;

    const ministryMap = new Map<string, { name: string; total: number; leaders: number }>();
    db.members.forEach((member) => {
      const key = member.ministry || 'Comunidade';
      const entry = ministryMap.get(key) ?? { name: key, total: 0, leaders: 0 };
      entry.total += 1;
      if (member.status === 'Coordenador') {
        entry.leaders += 1;
      }
      ministryMap.set(key, entry);
    });

    const ministryBreakdown = Array.from(ministryMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const periodTotals = buckets.reduce(
      (acc, row) => {
        acc.cadastros += row.cadastros;
        acc.rsvps += row.rsvps;
        acc.oracoes += row.oracoes;
        acc.avisos += row.avisos;
        acc.participacoes += row.participacoes;
        return acc;
      },
      { cadastros: 0, rsvps: 0, oracoes: 0, avisos: 0, participacoes: 0 }
    );

    const totalNotificationsReached = db.notifications.reduce(
      (acc, item) => acc + (item.recipientCount || 0),
      0
    );

    const foldersCount = db.folders?.length ?? 0;
    const filesCount = db.files?.length ?? 0;
    const parishionersCount = db.parishioners?.length ?? 0;

    return {
      monthlySeries: buckets,
      periodTotals,
      totalMembers,
      activeAndLeaders,
      coordinatorsCount,
      activeRatio,
      totalRsvps,
      totalCapacity,
      occupancyPct,
      publishedEvents,
      publishedSermons,
      pushSubscribers,
      topicSubscribers,
      pendingPrayers,
      inPrayerCount,
      answeredPrayers,
      ministryBreakdown,
      totalNotificationsReached,
      foldersCount,
      filesCount,
      parishionersCount,
    };
  }, [db, periodMonths]);

  const handleExportCsv = () => {
    const header = [
      'Mês',
      'Cadastros',
      'Presenças (RSVPs)',
      'Orações e Visitas',
      'Avisos',
      'Total de Interações',
    ];
    const rows = analytics.monthlySeries.map((row) => [
      row.fullMonth,
      String(row.cadastros),
      String(row.rsvps),
      String(row.oracoes),
      String(row.avisos),
      String(row.participacoes),
    ]);
    rows.push([
      `Total (${periodMonths} meses)`,
      String(analytics.periodTotals.cadastros),
      String(analytics.periodTotals.rsvps),
      String(analytics.periodTotals.oracoes),
      String(analytics.periodTotals.avisos),
      String(analytics.periodTotals.participacoes),
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estatisticas-paroquia-${periodMonths}m.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const kpis = [
    {
      label: 'Paroquianos ativos',
      value: analytics.activeAndLeaders,
      meta:
        analytics.totalMembers > 0
          ? `${analytics.activeRatio}% de ${analytics.totalMembers} · ${analytics.coordinatorsCount} coord.`
          : 'Nenhum membro cadastrado',
      tone: analytics.activeAndLeaders > 0 ? ('positive' as const) : ('neutral' as const),
    },
    {
      label: 'Inscritos em avisos',
      value: db.subscribers.length,
      meta: `${analytics.pushSubscribers} com push · ${analytics.topicSubscribers} com temas`,
      tone: db.subscribers.length > 0 ? ('positive' as const) : ('neutral' as const),
    },
    {
      label: 'Presenças confirmadas',
      value: analytics.totalRsvps,
      meta:
        db.events.length > 0
          ? `${analytics.occupancyPct}% das ${analytics.totalCapacity} vagas · ${analytics.publishedEvents} eventos`
          : 'Nenhum evento publicado',
      tone: analytics.totalRsvps > 0 ? ('positive' as const) : ('neutral' as const),
    },
    {
      label: 'Pedidos de oração',
      value: analytics.pendingPrayers,
      meta: `${analytics.inPrayerCount} em oração · ${analytics.answeredPrayers} atendidos`,
      tone: analytics.pendingPrayers > 0 ? ('attention' as const) : ('neutral' as const),
    },
  ];

  const operationalRows = [
    {
      label: 'Eventos publicados',
      value: `${analytics.publishedEvents} / ${db.events.length}`,
    },
    {
      label: 'Homilias e formações',
      value: `${analytics.publishedSermons} / ${db.sermons.length}`,
    },
    {
      label: 'Avisos disparados',
      value: `${db.notifications.length} (${analytics.totalNotificationsReached.toLocaleString('pt-BR')} alcances)`,
    },
    {
      label: 'Pastas e arquivos salvos',
      value: `${analytics.foldersCount} pastas · ${analytics.filesCount} arquivos`,
    },
    {
      label: 'Contas do portal de paroquianos',
      value: String(analytics.parishionersCount),
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      {/* Header & Interactive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
            Estatísticas paroquiais
          </h1>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            Dados consolidados de cadastros, presenças em eventos, pedidos de oração e acervo da
            paróquia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric selector */}
          <div
            role="group"
            aria-label="Métrica do gráfico"
            className="inline-flex items-center rounded-xl bg-[#EBEBF0] p-1"
          >
            {METRIC_OPTIONS.map((option) => {
              const active = selectedMetric === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedMetric(option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-white text-[#1D1D1F] shadow-2xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Period selector */}
          <div
            role="group"
            aria-label="Período de análise"
            className="inline-flex items-center rounded-xl bg-[#EBEBF0] p-1"
          >
            {PERIOD_OPTIONS.map((option) => {
              const active = periodMonths === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriodMonths(option.value)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[12px] font-medium tabular-nums transition-colors cursor-pointer',
                    active
                      ? 'bg-white text-[#1D1D1F] shadow-2xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-black/[0.08] hover:border-black/20 px-3.5 py-2 text-[12px] font-medium text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6E6E73]" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Unified KPI Strip */}
      <div className="rounded-2xl bg-white border border-black/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06]">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="p-5 sm:p-6">
            <p className="text-[13px] font-medium text-[#6E6E73]">{kpi.label}</p>
            <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums leading-none">
              {kpi.value.toLocaleString('pt-BR')}
            </p>
            <p
              className={cn(
                'mt-2.5 text-[12px] tabular-nums',
                kpi.tone === 'positive'
                  ? 'text-[#218838] font-medium'
                  : kpi.tone === 'attention'
                    ? 'text-[#B45309] font-medium'
                    : 'text-[#6E6E73]'
              )}
            >
              {kpi.meta}
            </p>
          </div>
        ))}
      </div>

      {/* Main Chart + Pastoral Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-black/[0.08] flex flex-col justify-between">
          <ClippedAreaChart
            data={analytics.monthlySeries}
            metric={selectedMetric}
            periodMonths={periodMonths}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Ministry Participation */}
          <div className="p-6 rounded-2xl bg-white border border-black/[0.08] flex-1">
            <div className="flex items-baseline justify-between gap-2 mb-4">
              <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                Participação por pastoral
              </h2>
              <span className="text-[12px] text-[#6E6E73] tabular-nums">
                {analytics.totalMembers} membros
              </span>
            </div>

            {analytics.ministryBreakdown.length === 0 ? (
              <p className="text-[13px] text-[#6E6E73] py-6">
                Nenhum paroquiano cadastrado até o momento.
              </p>
            ) : (
              <div className="space-y-3.5">
                {analytics.ministryBreakdown.map((item) => {
                  const pct =
                    analytics.totalMembers > 0
                      ? Math.round((item.total / analytics.totalMembers) * 100)
                      : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-medium text-[#1D1D1F] truncate">
                          {item.name}
                        </span>
                        <span className="text-[#6E6E73] tabular-nums shrink-0 text-[12px]">
                          {item.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#F0F0F3] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#218838]"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compact Operational Summary */}
          <div className="p-6 rounded-2xl bg-white border border-black/[0.08]">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
              Resumo operacional e acervo
            </h2>
            <div className="divide-y divide-black/[0.06]">
              {operationalRows.map((row) => (
                <div
                  key={row.label}
                  className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="text-[#6E6E73]">{row.label}</span>
                  <span className="font-medium text-[#1D1D1F] tabular-nums text-right">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* High-Density Monthly Data Table */}
      <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
            Detalhamento mensal
          </h2>
          <p className="text-[12px] text-[#6E6E73] tabular-nums">
            Últimos {periodMonths} meses · {analytics.periodTotals.participacoes.toLocaleString('pt-BR')}{' '}
            interações no período
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAFAFB] text-[12px] font-medium text-[#6E6E73]">
                <th className="py-2.5 px-6">Mês</th>
                <th className="py-2.5 px-4 text-right">Cadastros</th>
                <th className="py-2.5 px-4 text-right">Presenças (RSVPs)</th>
                <th className="py-2.5 px-4 text-right">Orações e visitas</th>
                <th className="py-2.5 px-4 text-right">Avisos</th>
                <th className="py-2.5 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] text-[13px]">
              {analytics.monthlySeries.map((row) => (
                <tr
                  key={row.key}
                  className="hover:bg-[#F5F5F7]/70 transition-colors"
                >
                  <td className="py-2.5 px-6 font-medium text-[#1D1D1F]">
                    {row.fullMonth}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#1D1D1F] tabular-nums">
                    {row.cadastros.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#1D1D1F] tabular-nums">
                    {row.rsvps.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#1D1D1F] tabular-nums">
                    {row.oracoes.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#1D1D1F] tabular-nums">
                    {row.avisos.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-6 text-right font-semibold text-[#1D1D1F] tabular-nums">
                    {row.participacoes.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/[0.08] bg-[#FAFAFB] text-[13px] font-semibold text-[#1D1D1F]">
                <td className="py-3 px-6">Total ({periodMonths} meses)</td>
                <td className="py-3 px-4 text-right tabular-nums">
                  {analytics.periodTotals.cadastros.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-right tabular-nums">
                  {analytics.periodTotals.rsvps.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-right tabular-nums">
                  {analytics.periodTotals.oracoes.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-right tabular-nums">
                  {analytics.periodTotals.avisos.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-6 text-right text-[#218838] tabular-nums">
                  {analytics.periodTotals.participacoes.toLocaleString('pt-BR')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
