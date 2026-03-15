'use client';

import { useMemo } from 'react';

type KPIs = {
  monthBookings: number;
  monthBookingsPrev: number;
  yearBookings: number;
  yearBookingsPrev: number;
  yearParticipants: number;
  yearParticipantsPrev: number;
};

export default function TeacherStatsClient({
  kpis,
  interests,
  sources,
  notes,
  feedbackOverallAvg,
}: {
  kpis: KPIs;
  interests: { place: number; labels: string[] }[];
  sources: { label: string; value: number }[];
  notes: { label: string; value: number }[];
  feedbackOverallAvg?: number | null;
}) {
  const sourceDonut = useMemo(() => buildDonut(sources), [sources]);
  const notesBars = useMemo(() => buildBars(notes), [notes]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Buchungen Monat" value={kpis.monthBookings} compare={kpis.monthBookingsPrev} />
        <Kpi title="Buchungen Jahr" value={kpis.yearBookings} compare={kpis.yearBookingsPrev} />
        <Kpi
          title="Teilnehmer (Jahr)"
          value={kpis.yearParticipants}
          compare={kpis.yearParticipantsPrev}
          showPercent
        />
        <Kpi
          title="Ø Kursbewertung"
          value={typeof feedbackOverallAvg === 'number' ? `${feedbackOverallAvg.toFixed(1)} / 5` : '—'}
          compare={undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Conversion-Quelle">
          {sourceDonut ? <DonutChart {...sourceDonut} hideTotal /> : <Empty>Keine Daten</Empty>}
        </Card>
        <Card title="Erfahrungslevel der Teilnehmer (in %)">
          {notesBars ? <BarChart {...notesBars} /> : <Empty>Keine Daten</Empty>}
        </Card>
      </div>

      <Card title="Top Kursanfragen Music Mission gesamt" className="">
        {interests.slice(0, 3).length ? (
          <div className="grid sm:grid-cols-3 gap-3">
            {interests.slice(0, 3).map((i, idx) => (
              <div
                key={i.place}
                className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/12 via-white/6 to-transparent backdrop-blur p-4 shadow-lg"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-3xl opacity-40"
                  style={{ background: palette[idx % palette.length] }} />
                <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-1">
                  {i.place}. Platz
                </p>
                <p className="text-lg font-semibold text-white drop-shadow-sm">{i.labels.join(', ')}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Keine Daten</Empty>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  title,
  value,
  compare,
  compareLabel,
  showPercent = false,
}: {
  title: string;
  value: number | string;
  compare?: number;
  compareLabel?: string;
  showPercent?: boolean;
}) {
  const diff = compare !== undefined ? Number(value) - Number(compare) : null;
  const sign = diff === null ? '' : diff > 0 ? '▲' : diff < 0 ? '▼' : '▬';
  const color = diff === null ? 'text-white/70' : diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-amber-300' : 'text-slate-300';
  const pct = diff !== null && compare && compare !== 0 ? (diff / compare) * 100 : diff !== null && compare === 0 ? 100 : null;
  const label =
    compareLabel ??
    (diff !== null
      ? showPercent
        ? `${sign} Δ ${Math.abs(diff)} (${pct !== null ? `${pct.toFixed(1)}%` : 'n/a'}) vs. VJ`
        : `${sign} Δ ${Math.abs(diff)} (${pct !== null ? `${pct.toFixed(1)}%` : 'n/a'}) vs. VJ`
      : '—');
  const baseCard = 'relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-[#3c4358]/85 via-[#2f3546]/80 to-[#111a2e]/90 backdrop-blur-2xl p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.38)] hover:-translate-y-1 transition-transform';
  const diffPill =
    diff === null
      ? 'border-white/20 text-white/70'
      : diff > 0
        ? 'border-emerald-200/70 bg-emerald-100/15 text-emerald-50'
        : diff < 0
          ? 'border-amber-200/70 bg-amber-100/15 text-amber-50'
          : 'border-white/25 bg-white/10 text-white/80';
  const icon = pickIcon(title);
  return (
    <div className={baseCard}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-pink-500/15 blur-3xl" />
        <div className="absolute -left-14 bottom-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-1">{title}</p>
          <p className="text-3xl font-semibold drop-shadow-sm text-white leading-tight">{value}</p>
        </div>
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-pink-500/70 via-purple-500/65 to-amber-400/70 border border-white/20 grid place-items-center text-lg shadow-inner">
          <span className="drop-shadow-sm">{icon}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border ${diffPill}`}>
          {sign || '·'} {diff !== null ? Math.abs(diff) : '—'}
        </span>
        <span className={`text-[11px] ${color}`}>{label}</span>
      </div>
    </div>
  );
}

function pickIcon(title: string) {
  const key = title.toLowerCase();
  if (key.includes('buchung')) return '🧾';
  if (key.includes('teilnehmer')) return '👥';
  if (key.includes('bewertung')) return '⭐';
  if (key.includes('jahr')) return '📆';
  return '📊';
}

function Card({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`group relative rounded-2xl border border-white/12 bg-gradient-to-br from-[#3c4358]/90 via-[#2f3546]/85 to-[#111a2e]/92 backdrop-blur-2xl p-5 text-white shadow-[0_20px_55px_rgba(0,0,0,0.34)] transition transform hover:-translate-y-[2px] hover:shadow-[0_24px_60px_rgba(0,0,0,0.38)] ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/68">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/70">{children}</p>;
}

// Donut
const palette = ['#6db6d6', '#b8a7f5', '#f4b799', '#f3a1c8', '#9debd1', '#c8d3e5', '#e2c8ff'];

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

function DonutChart({ total, segments, hideTotal }: DonutData & { hideTotal?: boolean }) {
  const gradient = segments
    .map((s) => `${s.color} ${s.from.toFixed(2)}deg ${s.to.toFixed(2)}deg`)
    .join(', ');
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="relative h-48 w-48 sm:h-52 sm:w-52 mx-auto sm:mx-0">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />
        {!hideTotal && (
          <div className="absolute inset-6 rounded-full bg-slate-900/70 backdrop-blur flex items-center justify-center text-white text-lg font-semibold">
            100%
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-sm text-white/80 font-semibold">Verteilung (100%)</div>
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 text-xs text-white/85">
          {segments.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="font-semibold">{s.label}</span>
              </div>
              <span className="text-white/80">{((s.value / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
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
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(100, b.value)}%`, background: b.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
