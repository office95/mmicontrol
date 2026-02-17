'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import Link from 'next/link';
import MaterialModal from '@/components/material-modal';

interface Course { id: string; title: string; }
interface MaterialRow {
  id: string;
  title: string;
  type?: string | null;
  storage_path: string;
  cover_path?: string | null;
  cover_url?: string | null;
  thumb_url?: string | null;
  file_url?: string | null;
  visibility: string;
  course_id?: string | null;
  module_id?: string | null;
  module_number?: number | null;
  created_at: string;
}

const visibilityValues = ['students', 'both', 'teachers'] as const;
type Visibility = (typeof visibilityValues)[number];

function normalizeVisibility(v: unknown): Visibility {
  return typeof v === 'string' && (visibilityValues as readonly string[]).includes(v)
    ? (v as Visibility)
    : 'students';
}

function toInitialMaterial(m: MaterialRow) {
  return { ...m, visibility: normalizeVisibility(m.visibility) };
}

export default function AdminMaterialsPage() {
  const { supabase } = useSupabase();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialRow | null>(null);
  const [presetCourse, setPresetCourse] = useState<Course | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const courseTitle = (id: string | null | undefined) =>
    courses.find((c) => c.id === id)?.title || 'Unbekannter Kurs';

  useEffect(() => {
    supabase.from('courses').select('id,title').then(({ data }) => setCourses(data ?? []));
  }, [supabase]);

  const load = () => {
    setLoading(true);
    supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        const list = data ?? [];
        const withUrls = await Promise.all(
          list.map(async (m) => {
            let cover_url: string | null = null;
            let thumb_url: string | null = null;
            let file_url: string | null = null;
            if (m.cover_path) {
              const { data: urlData, error: urlErr } = await supabase.storage
                .from('materials')
                .createSignedUrl(m.cover_path, 3600);
              if (!urlErr && urlData?.signedUrl) cover_url = urlData.signedUrl;
            }
            const { data: fileData, error: fileErr } = await supabase.storage
              .from('materials')
              .createSignedUrl(m.storage_path, 3600);
            if (!fileErr && fileData?.signedUrl) file_url = fileData.signedUrl;

            const isImage = (m.storage_path || '').match(/\.(png|jpe?g|webp|gif)$/i);
            if (!cover_url && isImage && file_url) {
              thumb_url = file_url;
            }
            return { ...m, cover_url, thumb_url, file_url };
          })
        );
        setMaterials(withUrls);
        setError(null);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const filtered = materials.filter((m) => {
    if (!showArchived && m.visibility === 'archived') return false;
    if (filterCourse && m.course_id !== filterCourse) return false;
    return true;
  });

  const byCourse = useMemo(() => {
    const map: Record<string, MaterialRow[]> = {};
    filtered.forEach((m) => {
      const key = m.course_id || 'none';
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [filtered]);

  const toggleCourse = (cid: string) =>
    setExpanded((prev) => ({ ...prev, [cid]: !(prev[cid] ?? false) }));

  async function setVisibility(id: string, visibility: string) {
    const { error } = await supabase.from('materials').update({ visibility }).eq('id', id);
    if (!error) {
      setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, visibility } : m)));
    }
  }

  async function deleteMaterial(id: string) {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (!error) setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Kursmaterial</h1>
          <p className="text-sm text-slate-200">Übersicht, bearbeiten, archivieren.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25"
            onClick={() => { setEditMaterial(null); setPresetCourse(null); setOpenModal(true); }}
          >
            Neues Kursmaterial
          </button>
          <Link href="/admin" className="text-sm text-pink-200 hover:text-white">Zurück</Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select className="input max-w-xs" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="">Alle Kurse</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button
          className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? 'Archiv ausblenden' : 'Archiv einblenden'}
        </button>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-sm text-slate-500">Lade Materialien...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-slate-500">Keine Materialien.</p>}

        {Object.entries(byCourse).map(([cid, list]) => (
          <div key={cid} className="card p-5 shadow-xl text-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-ink">{courseTitle(cid === 'none' ? null : cid)}</p>
                <p className="text-xs text-slate-500">{list.length} Unterlage(n)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setPresetCourse(cid === 'none' ? null : courses.find((c) => c.id === cid) || null);
                    setEditMaterial(null);
                    setOpenModal(true);
                  }}
                >
                  + Unterlage hinzufügen
                </button>
                <button
                  className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => toggleCourse(cid)}
                >
                  {(expanded[cid] ?? false) ? 'Unterlagen ausblenden' : 'Unterlagen anzeigen'}
                </button>
              </div>
            </div>

            {(expanded[cid] ?? false) && (
              <div className="divide-y divide-slate-200">
              {list.map((m) => (
                <div key={m.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1 flex items-start gap-3">
                    {(m.cover_url || m.thumb_url) ? (
                      <img
                        src={m.cover_url || m.thumb_url || ''}
                        alt="Titelbild"
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      m.file_url && (
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-16 w-16 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600"
                        >
                          PDF
                        </a>
                      )
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink">{m.title}</p>
                      <p className="text-xs text-slate-500">
                        Modul: {m.module_number ?? m.module_id ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">Sichtbar für: {m.visibility}</p>
                      <p className="text-[11px] text-slate-500">Letzte Änderung: {new Date(m.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setEditMaterial(m);
                        setPresetCourse(courses.find((c) => c.id === m.course_id) || null);
                        setOpenModal(true);
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={() => setVisibility(m.id, m.visibility === 'archived' ? 'both' : 'archived')}
                    >
                      {m.visibility === 'archived' ? 'Reaktivieren' : 'Archivieren'}
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => deleteMaterial(m.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {openModal && (
        <MaterialModal
          onClose={() => { setOpenModal(false); setEditMaterial(null); setPresetCourse(null); load(); }}
          presetCourse={presetCourse || (editMaterial ? { id: editMaterial.course_id ?? '', title: courseTitle(editMaterial.course_id) } : undefined)}
          initialMaterial={editMaterial ? toInitialMaterial(editMaterial) : undefined}
        />
      )}
    </div>
  );
}
