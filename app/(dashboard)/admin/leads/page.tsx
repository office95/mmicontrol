'use client';

import { useEffect, useMemo, useState } from 'react';
import ButtonLink from '@/components/button-link';
import LeadModal, { LeadRow } from '@/components/lead-modal';

type Lead = LeadRow & {
  id: string;
  lead_code?: string;
  partner?: { id: string; name: string | null };
  requested_at?: string;
  interest_titles?: string[];
  notes?: { created_at: string; text: string; todo?: string }[];
};

const PIE_COLORS = ['#ec4899', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6'];

const qualityLabel: Record<string, string> = {
  A: 'A · sehr wahrscheinlich',
  B: 'B · wahrscheinlich',
  C: 'C · möglich',
  D: 'D · unwahrscheinlich',
  E: 'E · Flop',
};
const statusLabel: Record<string, string> = {
  offen: 'offen',
  'nicht erreicht': 'nicht erreicht',
  erledigt: 'erledigt',
  löschen: 'löschen',
  Watchlist: 'Watchlist',
  'Email senden': 'Email senden',
};

const norm = (v?: string | null) => (v || '').trim().toLowerCase();

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState<'list' | 'kanban' | 'analysis'>('list');
  const [analysisCountry, setAnalysisCountry] = useState<'Österreich' | 'Deutschland'>('Österreich');
  const currentYear = new Date().getFullYear();
  const [analysisYear, setAnalysisYear] = useState<number | null>(currentYear);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/leads');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setLeads([]);
    } else {
      setError(null);
      setLeads(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      const qOk = qualityFilter === 'all' ? true : l.lead_quality === qualityFilter;
      const stOk = statusFilter === 'all' ? true : l.status === statusFilter;
      const text = `${l.name ?? ''} ${l.email ?? ''} ${l.country ?? ''} ${l.state ?? ''} ${l.partner?.name ?? ''}`.toLowerCase();
      const sOk = term === '' ? true : text.includes(term);
      return qOk && stOk && sOk;
    });
  }, [leads, search, qualityFilter, statusFilter]);

  // Analyse-Daten
  const availableYears = useMemo(() => {
    const selected = norm(analysisCountry);
    const years = Array.from(
      new Set(
        leads
          .filter((l) => norm(l.country) === selected && l.requested_at)
          .map((l) => new Date(l.requested_at as string).getFullYear())
      )
    ).filter((y) => y >= currentYear - 10);
    years.sort((a, b) => b - a);
    return years;
  }, [leads, analysisCountry, currentYear]);

  useEffect(() => {
    if (availableYears.length === 0) {
      setAnalysisYear(null);
    } else if (analysisYear === null || !availableYears.includes(analysisYear)) {
      setAnalysisYear(availableYears[0]);
    }
  }, [analysisCountry, availableYears, analysisYear]);

  const analysis = useMemo(() => {
    if (!analysisYear) {
      return {
        sourceCounts: {},
        totalSources: 0,
        interestCounts: {},
        totalInterests: 0,
        federalCounts: {},
        avgDays: 0,
      };
    }

    const selected = norm(analysisCountry);
    const yearLeads = leads.filter(
      (l) =>
        l.requested_at &&
        new Date(l.requested_at).getFullYear() === analysisYear &&
        norm(l.country) === selected
    );

    const sourceCounts: Record<string, number> = {};
    yearLeads.forEach((l) => (l.source || []).forEach((s: string) => (sourceCounts[s] = (sourceCounts[s] || 0) + 1)));
    const totalSources = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

    const interestCounts: Record<string, number> = {};
    yearLeads.forEach((l) => (l.interest_titles || []).forEach((t) => (interestCounts[t] = (interestCounts[t] || 0) + 1)));
    const totalInterests = Object.values(interestCounts).reduce((a, b) => a + b, 0);

    const federalCounts: Record<string, number> = {};
    yearLeads.forEach((l) => {
      const key = l.state || 'Unbekannt';
      federalCounts[key] = (federalCounts[key] || 0) + 1;
    });

    const handled = yearLeads.filter((l) => (l.status || 'offen') !== 'offen' && l.requested_at);
    const avgDays =
      handled.length === 0
        ? 0
        : Math.round(
            handled.reduce((sum, l) => {
              const start = new Date(l.requested_at!).getTime();
              const end = Date.now();
              return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
            }, 0) / handled.length
          );

    return {
      sourceCounts,
      totalSources,
      interestCounts,
      totalInterests,
      federalCounts,
      avgDays,
    };
  }, [leads, analysisCountry]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Leads</h1>
          <p className="text-sm text-slate-200">Interessenten verwalten und qualifizieren.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25"
            onClick={() => {
              setEditLead(null);
              setOpenModal(true);
            }}
          >
            Neuer Lead
          </button>
          <ButtonLink href="/admin">Zurück</ButtonLink>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-sm h-9 py-1 text-sm"
          placeholder="Suche nach Name, Email, Ort"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-xs h-9 py-1 text-sm"
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value)}
        >
          <option value="all">Alle Qualitäten</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
          <option value="E">E</option>
        </select>
        <select
          className="input max-w-xs h-9 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Alle</option>
          {Object.keys(statusLabel)
            .sort((a, b) => (statusLabel[a] ?? a).localeCompare(statusLabel[b] ?? b, 'de'))
            .map((s) => (
              <option key={s} value={s}>
                {statusLabel[s] ?? s}
              </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 text-sm font-semibold text-slate-200 border-b border-white/10">
        <button
          className={`pb-2 ${tab === 'list' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setTab('list')}
        >
          Liste
        </button>
        <button
          className={`pb-2 ${tab === 'kanban' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setTab('kanban')}
        >
          Kanban
        </button>
        <button
          className={`pb-2 ${tab === 'analysis' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setTab('analysis')}
        >
          Analyse
        </button>
      </div>

      {tab === 'list' && (
        <div className="card p-6 shadow-xl text-slate-900">
          {loading && <p className="text-sm text-slate-500">Lade Leads...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !filtered.length && <p className="text-sm text-slate-500">Keine Leads vorhanden.</p>}

          <div className="divide-y divide-slate-200">
            {filtered.map((l) => (
              <div key={l.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setEditLead(l);
                      setOpenModal(true);
                    }}
                    className="text-left text-lg font-extrabold text-ink hover:underline"
                  >
                    {l.name} <span className="text-xs text-slate-500 ml-1">{l.lead_code ?? ''}</span>
                  </button>
                  <p className="text-sm text-slate-500">
                    Anfragedatum: {l.requested_at ? new Date(l.requested_at).toLocaleDateString() : '—'}
                  </p>
                  {l.interest_titles?.length ? (
                    <p className="text-sm text-slate-500 truncate">Interesse: {l.interest_titles.join(', ')}</p>
                  ) : (
                    <p className="text-sm text-slate-500">Interesse: —</p>
                  )}
                  <div className="text-[12px] text-slate-500 flex flex-wrap gap-3 items-center">
                    <span>Bundesland: {l.state || '—'}</span>
                    <span>Land: {l.country || '—'}</span>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      <span className="text-base font-extrabold mr-1">
                        {(l.lead_quality || 'C').slice(0, 1)}
                      </span>
                      <span className="text-[12px] font-semibold">
                        {qualityLabel[l.lead_quality || 'C']?.slice(2) ?? qualityLabel[l.lead_quality || 'C'] ?? l.lead_quality ?? 'C'}
                      </span>
                    </span>
                    <span className="px-3 py-1 rounded-full bg-pink-50 text-pink-700">
                      Status: {statusLabel[l.status || 'offen'] ?? l.status ?? 'offen'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setEditLead(l);
                      setOpenModal(true);
                    }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm('Diesen Lead löschen?')) return;
                      const res = await fetch(`/api/admin/leads?id=${l.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        load();
                      } else {
                        const d = await res.json().catch(() => ({}));
                        alert(d.error || 'Löschen fehlgeschlagen');
                      }
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'kanban' && (
        <div className="card p-4 shadow-2xl text-slate-900 bg-white/50 backdrop-blur-xl border border-white/30">
          <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-3">
            {Object.keys(statusLabel).map((s) => {
              const colLeads = filtered.filter((l) => (l.status || 'offen') === s);
              return (
                <div
                  key={s}
                  className="bg-white/60 border border-white/50 rounded-2xl p-3 flex flex-col min-h-[300px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-md"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData('lead-id');
                    if (!id) return;
                    fetch('/api/admin/leads', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id, status: s }),
                    }).then(load);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800">{statusLabel[s] ?? s}</p>
                    <span className="text-xs text-slate-600 bg-white/60 px-2 py-1 rounded-full border border-slate-200">
                      {colLeads.length}
                    </span>
                  </div>
                  <div className="space-y-3 flex-1">
                    {colLeads.map((l) => (
                      <div
                        key={l.id}
                        draggable
                    onDragStart={(e) => e.dataTransfer.setData('lead-id', l.id)}
                    className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-[0_8px_22px_rgba(15,23,42,0.12)] cursor-move transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                  >
                    <p className="text-sm font-bold text-ink truncate">{l.name}</p>
                    {l.interest_titles?.length ? (
                      <p className="text-[12px] font-semibold text-slate-700 truncate">
                        Kurs: {l.interest_titles.join(', ')}
                      </p>
                    ) : (
                      <p className="text-[12px] text-slate-500 truncate">Kurs: —</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 items-center">
                      <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-semibold shadow-sm">
                        Qualität {(l.lead_quality || 'C').slice(0, 1)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{l.country || '—'}</span>
                      {l.state && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{l.state}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'analysis' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input h-10 w-48"
              value={analysisCountry}
              onChange={(e) => {
                const next = e.target.value as 'Österreich' | 'Deutschland';
                setAnalysisCountry(next);
                const years = Array.from(
                  new Set(
                    leads
                      .filter((l) => norm(l.country) === norm(next) && l.requested_at)
                      .map((l) => new Date(l.requested_at as string).getFullYear())
                  )
                ).sort((a, b) => b - a);
                setAnalysisYear(years[0] ?? null);
              }}
            >
              <option value="Österreich">Österreich</option>
              <option value="Deutschland">Deutschland</option>
            </select>
            <select
              className="input h-10 w-48"
              value={(analysisYear ?? availableYears[0] ?? '').toString()}
              onChange={(e) => setAnalysisYear(e.target.value ? Number(e.target.value) : null)}
              disabled={availableYears.length === 0}
            >
              {availableYears.map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>
            {availableYears.length === 0 && (
              <p className="text-sm text-slate-500">Keine Daten für die gewählte Kombination.</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <PieCard
              title="Quellen"
              data={analysis.sourceCounts}
              total={analysis.totalSources}
            />
            <PieCard
              title="Interessen"
              data={analysis.interestCounts}
              total={analysis.totalInterests}
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-ink">Ø Bearbeitungsdauer</p>
              <p className="text-3xl font-bold text-pink-600">{analysis.avgDays} Tage</p>
              <p className="text-xs text-slate-500">Von „offen“ bis jetzt (bei Leads mit Status ≠ offen)</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-ink">Leads pro Bundesland</p>
            <div className="space-y-2">
              {Object.entries(analysis.federalCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([state, count]) => {
                  const max = Math.max(...Object.values(analysis.federalCounts));
                  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
                  return (
                    <div key={state} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>{state}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(analysis.federalCounts).length === 0 && (
                <p className="text-sm text-slate-500">Keine Daten für dieses Land.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {openModal && (
        <LeadModal
          initial={editLead ?? undefined}
          onSaved={load}
          onClose={() => {
            setOpenModal(false);
            setEditLead(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PieCard({ title, data, total }: { title: string; data: Record<string, number>; total: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {total === 0 ? (
        <p className="text-sm text-slate-500">Keine Daten im aktuellen Jahr.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            {entries.map(([label, count], idx) => {
              const prev = entries.slice(0, idx).reduce((s, [, c]) => s + c, 0);
              const start = (prev / total) * 360;
              const deg = (count / total) * 360;
              const color = PIE_COLORS[idx % PIE_COLORS.length];
              return (
                <div
                  key={label}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${color} ${deg}deg, transparent 0deg)`,
                    transform: `rotate(${start}deg)`,
                  }}
                />
              );
            })}
            <div className="absolute inset-3 rounded-full bg-white" />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">
              {total}
            </div>
          </div>
          <div className="space-y-1 text-xs text-slate-700">
            {entries.map(([label, count], idx) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="font-semibold">{label}</span>
                <span className="text-slate-500">{Math.round((count / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
