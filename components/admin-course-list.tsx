'use client';
import { useEffect, useState } from 'react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  duration_hours?: number | null;
  price_gross?: number | null;
  vat_rate?: number | null;
  price_net?: number | null;
  deposit?: number | null;
  saldo?: number | null;
  category?: string | null;
  vat_amount?: number | null;
}

export default function AdminCourseList({
  onEdit,
  refresh = 0,
}: {
  onEdit: (course: Course) => void;
  refresh?: number;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch('/api/admin/courses')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ignore) return;
        if (!ok) {
          setError(data.error || 'Fehler beim Laden');
        } else {
          setCourses(data);
          setError(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey, refresh]);

  const reload = () => setRefreshKey((k) => k + 1);

  if (loading) return <p className="text-sm text-slate-500">Lade Kurse...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!courses.length) return <p className="text-sm text-slate-500">Keine Kurse vorhanden.</p>;

  const categories = Array.from(new Set(courses.map((c) => c.category).filter(Boolean))) as string[];

  const filtered = courses
    .filter((c) => (showArchived ? true : c.status !== 'inactive'))
    .filter((c) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        (c.title || '').toLowerCase().includes(term) ||
        (c.category || '').toLowerCase().includes(term)
      );
    })
    .filter((c) => {
      if (!filterCategory) return true;
      return (c.category || '') === filterCategory;
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={reload} className="text-xs text-brand-600 underline">Aktualisieren</button>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          {showArchived ? 'Archivierte ausblenden' : 'Archivierte einblenden'}
        </button>
        <input
          className="input h-9 text-sm min-w-[200px]"
          placeholder="Suche Titel oder Kategorie"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="input h-9 text-sm min-w-[180px]"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Alle Kategorien</option>
          {categories.map((cat) => (
            <option key={cat} value={cat || ''}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="divide-y divide-slate-100">
        {filtered.map((c) => (
          <div key={c.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="font-semibold text-ink">{c.title}</p>
              <p className="text-sm text-slate-600">{c.description}</p>
              <p className="text-xs text-slate-400">Status: {c.status} · {new Date(c.created_at).toLocaleDateString()}</p>
              <p className="text-xs text-slate-500">
                Dauer: {c.duration_hours ?? '-'} Std · Brutto: {c.price_gross ?? '-'} · Netto: {c.price_net ?? '-'} · USt: {((c.vat_rate ?? 0) * 100).toFixed(0)}% ({c.vat_amount ?? '-'})
              </p>
              <p className="text-xs text-slate-500">Anzahlung: {c.deposit ?? '-'} · Saldo: {c.saldo ?? '-'}</p>
              <p className="text-xs text-slate-500">Kategorie: {c.category ?? '-'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => onEdit(c)}
              >
                Bearbeiten
              </button>
              <button
                className={`text-xs px-3 py-1 rounded-lg border ${
                  c.status === 'inactive'
                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    : 'border-red-300 text-red-700 hover:bg-red-50'
                }`}
                onClick={async () => {
                  const res = await fetch('/api/admin/courses', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: c.id, status: c.status === 'inactive' ? 'active' : 'inactive' }),
                  });
                  if (res.ok) reload();
                }}
              >
                {c.status === 'inactive' ? 'Reaktivieren' : 'Archivieren'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
