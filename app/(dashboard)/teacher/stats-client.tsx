'use client';

import { useMemo } from 'react';

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

  const sourceDonut = useMemo(() => buildDonut(sources), [sources]);
  const notesBars = useMemo(() => buildBars(notes), [notes]);

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
          {sourceDonut ? <DonutChart {...sourceDonut} /> : <Empty>Keine Daten</Empty>}
        </Card>
        <Card title="Erfahrungen (note)" className="lg:col-span-2">
          {notesBars ? <BarChart {...notesBars} /> : <Empty>Keine Daten</Empty>}
        </Card>
      </div>

      <Card title="Top Interessen" className="">
        {interestTags.length ? (
          <div className="flex flex-wrap gap-2">
            {interestTags.map((i, idx) => (
              <span
                key={i.label}
                className="px-3 py-1 rounded-full border border-white/20 bg-white/10 text-white text-sm backdrop-blur"
                style={{ borderColor: palette[idx % palette.length] + '33', color: '#fff' }}
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

// Donut
const palette = ['#22d3ee', '#a855f7', '#f97316', '#f43f5e', '#10b981', '#64748b', '#c084fc'];

type DonutData = { total: number; segments: { color: string; from: number; to: number; label: string; value: number }[] };

function buildDonut(data: { label: string; value: number }[]): DonutData | null {
  if (!data || !data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const segments = data.map((d, i) => {
    const from = acc;
    acc += d.value;
    return {
      color: palette[i % palette.length],
      from: (from / total) * 360,
      to: (acc / total) * 360,
      label: d.label,
      value: d.value,
    };
  });
  return { total, segments };
}

function DonutChart({ total, segments }: DonutData) {
  const gradient = segments
    .map((s) => `${s.color} ${s.from.toFixed(2)}deg ${s.to.toFixed(2)}deg`)
    .join(', ');
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />
        <div className="absolute inset-6 rounded-full bg-slate-900/70 backdrop-blur flex items-center justify-center text-white text-lg font-semibold">
          100%
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-white/80">
        {segments.map((s, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label} {(s.value / total * 100).toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// Bars

type BarData = { bars: { label: string; value: number; color: string }[] };

function buildBars(data: { label: string; value: number }[]): BarData | null {
  if (!data || !data.length) return null;
  return {
    bars: data.map((d, i) => ({ label: d.label, value: d.value, color: palette[i % palette.length] })),
  };
}

function BarChart({ bars }: BarData) {
  return (
    <div className="space-y-3">
      {bars.map((b, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>{b.label}</span>
            <span>{b.value.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, b.value)}%`, background: b.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
