'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type KPIs = {
  monthBookings: number;
  monthBookingsPrev: number;
  yearBookings: number;
  yearBookingsPrev: number;
};

export default function TeacherStatsClient({ kpis, interests, sources, notes }: {
  kpis: KPIs;
  interests: { label: string; count: number }[];
  sources: { label: string; value: number }[];
  notes: { label: string; value: number }[];
}) {
  const interestTags = interests.slice(0, 8);

  const sourceChart = useMemo(() => ({
    series: sources.map((s) => Number(s.value.toFixed(2))),
    options: {
      chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
      labels: sources.map((s) => s.label),
      legend: { position: 'bottom', labels: { colors: '#e2e8f0' } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
      stroke: { width: 0 },
      colors: ['#22d3ee', '#a855f7', '#f97316', '#f43f5e', '#10b981', '#64748b'],
    },
  }), [sources]);

  const notesChart = useMemo(() => ({
    series: [{ data: notes.map((n) => Number(n.value.toFixed(2))) }],
    options: {
      chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
      xaxis: {
        categories: notes.map((n) => n.label),
        labels: { style: { colors: '#e2e8f0', fontSize: '12px' } },
      },
      yaxis: { labels: { style: { colors: '#e2e8f0' } } },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
      colors: ['#f472b6'],
      grid: { borderColor: 'rgba(255,255,255,0.08)' },
      dataLabels: { enabled: false },
    },
  }), [notes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Buchungen Monat" value={kpis.monthBookings} compare={kpis.monthBookingsPrev} />
        <Kpi title="Buchungen Jahr" value={kpis.yearBookings} compare={kpis.yearBookingsPrev} />
        <Kpi title="Top Interesse" value={interestTags[0]?.label ?? '—'} compareLabel={`${interestTags[0]?.count ?? 0}x`} />
        <Kpi title="Quellen" value={`${sources.length}`} compareLabel="Leads-Quellen" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Leads-Quellen" className="lg:col-span-1">
          {sources.length ? (
            <Chart options={sourceChart.options as any} series={sourceChart.series} type="donut" height={260} />
          ) : (
            <Empty>Keine Daten</Empty>
          )}
        </Card>
        <Card title="Erfahrungen (note)" className="lg:col-span-2">
          {notes.length ? (
            <Chart options={notesChart.options as any} series={notesChart.series} type="bar" height={260} />
          ) : (
            <Empty>Keine Daten</Empty>
          )}
        </Card>
      </div>

      <Card title="Top Interessen" className="">
        {interestTags.length ? (
          <div className="flex flex-wrap gap-2">
            {interestTags.map((i) => (
              <span
                key={i.label}
                className="px-3 py-1 rounded-full border border-white/20 bg-white/10 text-white text-sm backdrop-blur"
              >
                {i.label} · {i.count}x
              </span>
            ))}
          </div>
        ) : (
          <Empty>Keine Daten</Empty>
        )}
      </Card>
    </div>
  );
}

function Kpi({ title, value, compare, compareLabel }: { title: string; value: number | string; compare?: number; compareLabel?: string }) {
  const diff = compare !== undefined ? Number(value) - Number(compare) : null;
  const sign = diff === null ? '' : diff > 0 ? '▲' : diff < 0 ? '▼' : '▬';
  const color = diff === null ? 'text-white/70' : diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-amber-300' : 'text-slate-300';
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl p-4 text-white shadow-lg">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-2">{title}</p>
      <p className="text-3xl font-semibold drop-shadow-sm">{value}</p>
      <p className={`text-sm ${color} mt-1`}>{compareLabel ?? (diff !== null ? `${sign} vs. VJ: ${compare}` : '—')}</p>
    </div>
  );
}

function Card({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-white/12 bg-white/6 backdrop-blur-xl p-4 text-white shadow-lg ${className || ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/70">{children}</p>;
}
