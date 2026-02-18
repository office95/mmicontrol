'use client';

import { useEffect, useMemo, useState } from 'react';

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  birthdate: string | null;
  status: string | null;
  type: 'lead' | 'student' | null;
  lead_quality?: string | null;
  lead_status?: string | null;
  source?: string | null;
  interest_courses?: string[] | null;
  note?: string | null;
  created_at?: string | null;
  converted_at?: string | null;
};

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export default function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'lead' | 'student'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [converting, setConverting] = useState(false);
  const [detailTab, setDetailTab] = useState<'profil' | 'lead' | 'note'>('profil');

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/students?type=${typeFilter}`);
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Fehler beim Laden');
    else {
      setRows(data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  useEffect(() => {
    setDetailTab('profil');
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      !q || (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const convertToStudent = async (id: string) => {
    setConverting(true);
    const res = await fetch('/api/admin/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Konvertierung fehlgeschlagen');
    else {
      await load();
      setSelected(data);
    }
    setConverting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Kundenstamm</h1>
          <p className="text-sm text-white/80">Alle Leads und Kursteilnehmer an einem Ort – Leads können konvertiert werden.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input w-full md:w-64"
            placeholder="Suche Name / E-Mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input md:w-48"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">Alle</option>
            <option value="lead">Leads</option>
            <option value="student">Kursteilnehmer</option>
          </select>
          <button
            className="rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 text-sm font-semibold shadow hover:opacity-90"
            onClick={() => setSelected({
              id: crypto.randomUUID(),
              name: '',
              email: '',
              phone: '',
              country: '',
              state: '',
              city: '',
              birthdate: null,
              status: null,
              type: 'lead',
              lead_quality: null,
              lead_status: null,
              source: null,
              interest_courses: [],
              note: '',
              created_at: new Date().toISOString(),
              converted_at: null,
            } as any)}
          >
            Neuer Eintrag
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-white/70">Lade...</p>}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-4 shadow-lg hover:-translate-y-[1px] transition cursor-pointer"
            onClick={() => setSelected(r)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{r.name || 'Ohne Name'}</p>
                <p className="text-xs text-white/70">{r.email || '—'}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[11px] uppercase tracking-[0.16em] ${r.type === 'lead' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {r.type === 'lead' ? 'Lead' : 'Kursteilnehmer'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-white/70 mt-2">
              {r.lead_quality && <span className="px-2 py-1 rounded-full bg-white/10 border border-white/15">Qualität: {r.lead_quality}</span>}
              {r.lead_status && <span className="px-2 py-1 rounded-full bg-white/10 border border-white/15">Status: {r.lead_status}</span>}
              {r.source && <span className="px-2 py-1 rounded-full bg-white/10 border border-white/15">Quelle: {r.source}</span>}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <p className="text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">Keine Einträge gefunden.</p>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-ink"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{selected.type === 'lead' ? 'Lead' : 'Kursteilnehmer'}</p>
                <h3 className="text-2xl font-semibold text-ink">{selected.name || 'Ohne Name'}</h3>
                <p className="text-sm text-slate-600">{selected.email || '—'}</p>
              </div>
              {selected.type === 'lead' && (
                <button
                  className="rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 text-sm shadow hover:opacity-90"
                  onClick={() => convertToStudent(selected.id)}
                  disabled={converting}
                >
                  {converting ? 'Konvertiere…' : 'Zu Kursteilnehmer machen'}
                </button>
              )}
            </div>

            <div className="flex gap-3 mb-4 text-sm font-semibold">
              {['profil','lead','note'].map((t) => (
                <button
                  key={t}
                  className={`px-3 py-2 rounded-lg border ${detailTab === t ? 'border-pink-300 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 bg-slate-50'}`}
                  onClick={() => setDetailTab(t as any)}
                >
                  {t === 'profil' ? 'Profil' : t === 'lead' ? 'Lead-Daten' : 'Notiz'}
                </button>
              ))}
            </div>

            {detailTab === 'profil' && (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {[['Telefon', selected.phone], ['Geburtstag', formatDate(selected.birthdate)], ['Land', selected.country], ['Bundesland', selected.state], ['Ort', selected.city]].map(([label, val]) => (
                  <div key={label as string} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</p>
                    <p className="text-[15px] text-slate-800">{val || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'lead' && (
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-h-[140px]">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Lead-Daten</p>
                  <p className="text-[15px] text-slate-800">Qualität: {selected.lead_quality || '—'}</p>
                  <p className="text-[15px] text-slate-800">Status: {selected.lead_status || '—'}</p>
                  <p className="text-[15px] text-slate-800">Quelle: {selected.source || '—'}</p>
                  <p className="text-[15px] text-slate-800">Interessen: {(selected.interest_courses || []).join(', ') || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-h-[140px]">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Historie</p>
                  <p className="text-[15px] text-slate-800">Erstellt: {formatDate(selected.created_at)}</p>
                  {selected.converted_at && <p className="text-[15px] text-slate-800">Konvertiert: {formatDate(selected.converted_at)}</p>}
                  <p className="text-[13px] text-slate-500 mt-2">(Timeline später erweiterbar)</p>
                </div>
              </div>
            )}

            {detailTab === 'note' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-h-[140px] text-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">Notiz</p>
                <p className="text-[15px] text-slate-800 whitespace-pre-wrap">{selected.note || '—'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
