'use client';

import { useMemo, useState } from 'react';

type Course = { id: string; title: string };
type Material = {
  id: string;
  title: string;
  course_id: string;
  course_title: string | null;
  module_id: string | null;
  module_number: number | null;
  type: string | null;
  storage_path: string | null;
  cover_path: string | null;
  created_at: string | null;
  visibility: string | null;
};

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export default function TeacherMaterialsClient({ courses, materials }: { courses: Course[]; materials: Material[] }) {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      const matchesCourse = courseFilter ? m.course_id === courseFilter : true;
      const matchesText = q
        ? (m.title || '').toLowerCase().includes(q) || (m.course_title || '').toLowerCase().includes(q)
        : true;
      return matchesCourse && matchesText;
    });
  }, [materials, search, courseFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-pink-200">Dozent</p>
          <h1 className="text-3xl font-semibold text-white">Kursunterlagen</h1>
          <p className="text-sm text-white/80">Alle Materialien, die dir für deine Kurse freigeschaltet sind.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Suchen nach Titel/Kurs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full md:w-64"
          />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="input md:w-56"
          >
            <option value="">Alle Kurse</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur shadow-xl p-4 relative overflow-hidden">
            <div className="absolute -right-6 -top-8 h-16 w-16 rounded-full bg-pink-500/30 blur-2xl" />
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-pink-100">
                {m.course_title || 'Kurs'}
              </p>
              <h3 className="text-lg font-semibold text-white drop-shadow-sm">{m.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20">Typ: {m.type || 'Datei'}</span>
                {m.module_number && (
                  <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20">Modul {m.module_number}</span>
                )}
                <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20">Hochgeladen: {formatDate(m.created_at)}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {m.storage_path && (
                  <a
                    href={`https://$${'{process.env.NEXT_PUBLIC_SUPABASE_URL}'.replace('https://', '').replace(/\/$/, '')}/storage/v1/object/public/${m.storage_path}`}
                    className="rounded-lg bg-white text-ink px-3 py-2 text-sm font-semibold shadow hover:-translate-y-[1px] transition"
                    target="_blank"
                  >
                    Öffnen
                  </a>
                )}
                {m.cover_path && (
                  <a
                    href={`https://$${'{process.env.NEXT_PUBLIC_SUPABASE_URL}'.replace('https://', '').replace(/\/$/, '')}/storage/v1/object/public/${m.cover_path}`}
                    className="rounded-lg border border-white/40 px-3 py-2 text-sm text-white hover:bg-white/10 transition"
                    target="_blank"
                  >
                    Cover
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">Keine Materialien gefunden.</p>
      )}
    </div>
  );
}

