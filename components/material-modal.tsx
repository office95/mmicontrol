'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';

type CourseRef = { id: string; title: string };
type MaterialRow = {
  id: string;
  title: string;
  module: string;
  visibility: 'both' | 'students' | 'teachers';
  file: File | null;
  cover: File | null;
};

type MaterialInitial = {
  id: string;
  title: string;
  module_number?: number | null;
  module_id?: string | null;
  visibility: 'both' | 'students' | 'teachers';
  course_id?: string | null;
  storage_path: string;
  cover_path?: string | null;
  type?: string | null;
};

export default function MaterialModal({
  onClose,
  presetCourse,
  initialMaterial,
}: {
  onClose: () => void;
  presetCourse?: CourseRef;
  initialMaterial?: MaterialInitial;
}) {
  const { supabase } = useSupabase();
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [courseId, setCourseId] = useState<string>(
    presetCourse?.id || initialMaterial?.course_id || ''
  );
  const [items, setItems] = useState<MaterialRow[]>([
    {
      id: 'row-1',
      title: initialMaterial?.title ?? '',
      module: initialMaterial?.module_number?.toString() ?? '',
      visibility: initialMaterial?.visibility ?? 'both',
      file: null,
      cover: null,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(initialMaterial?.storage_path || null);
  const [removeCover, setRemoveCover] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isImagePath = (p?: string | null) =>
    !!p && /\.(png|jpe?g|webp|gif)$/i.test(p);
  const isImageFile = (f?: File | null) =>
    !!f && f.type.startsWith('image/');
  const isPdfFile = (f?: File | null) =>
    !!f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  // Kurse mit Service-API holen (um RLS-Probleme zu vermeiden)
  useEffect(() => {
    fetch('/api/admin/courses')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const slim = data.map((c: any) => ({ id: c.id, title: c.title })) as CourseRef[];
          setCourses(slim);
          if (!courseId && slim.length) setCourseId(slim[0].id);
        } else {
          setCourses([]);
        }
      })
      .catch(() => setCourses([]));
  }, []);

  // Signierte URLs für bestehende Datei/Cover laden
  useEffect(() => {
    async function loadAssets() {
      if (initialMaterial?.cover_path) {
        const { data, error } = await supabase.storage
          .from('materials')
          .createSignedUrl(initialMaterial.cover_path, 3600);
        if (!error && data?.signedUrl) setCoverPreview(data.signedUrl);
      }
      if (initialMaterial?.storage_path) {
        setCurrentFile(initialMaterial.storage_path);
        const { data, error } = await supabase.storage
          .from('materials')
          .createSignedUrl(initialMaterial.storage_path, 3600);
        if (!error && data?.signedUrl) setFileUrl(data.signedUrl);
      }
    }
    loadAssets();
  }, [initialMaterial, supabase]);

  const courseTitle = useMemo(
    () => courses.find((c) => c.id === courseId)?.title || '—',
    [courses, courseId]
  );

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      { id: `row-${Date.now()}`, title: '', module: '', visibility: 'both', file: null, cover: null },
    ]);

  const updateRow = (id: string, patch: Partial<MaterialRow>) =>
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!courseId) {
      setError('Bitte Kurs auswählen');
      return;
    }
    const isEdit = Boolean(initialMaterial);
    if (!isEdit && items.some((r) => !r.title || !r.file)) {
      setError('Titel und Datei sind pro Zeile erforderlich');
      return;
    }
    // Beim Bearbeiten darf removeFile auch ohne neue Datei (löschen) sein, aber beim Anlegen nicht
    if (!isEdit && removeFile && items.some((r) => !r.file)) {
      setError('Bitte eine neue Datei hochladen, wenn die alte entfernt werden soll.');
      return;
    }
    if (items.some((r) => r.file && !isPdfFile(r.file))) {
      setError('Bitte nur PDF-Dateien hochladen.');
      return;
    }
    if (items.some((r) => r.cover && !isImageFile(r.cover))) {
      setError('Titelbild muss ein Bild (png/jpg/webp/gif) sein.');
      return;
    }
    setLoading(true);
    try {
      for (const row of items) {
        let storagePath = initialMaterial?.storage_path || '';
        let fileType = initialMaterial?.type || null;
        if (row.file) {
          storagePath = `course/${courseId}${row.module ? `/module/${row.module}` : ''}/${Date.now()}-${row.file.name}`;
          const { error: upErr } = await supabase.storage.from('materials').upload(storagePath, row.file, { upsert: false });
          if (upErr) throw upErr;
          fileType = row.file.type;
        } else if (!isEdit) {
          setError('Datei fehlt');
          throw new Error('missing file');
        }

        let coverPath: string | null = initialMaterial?.cover_path ?? null;
        if (row.cover) {
          const cpath = `covers/${Date.now()}-${row.cover.name}`;
          const { error: covErr } = await supabase.storage.from('materials').upload(cpath, row.cover, { upsert: false });
          if (covErr) throw covErr;
          coverPath = cpath;
        }
        if (removeCover) {
          coverPath = null;
          if (initialMaterial?.cover_path) {
            await supabase.storage.from('materials').remove([initialMaterial.cover_path]);
          }
        }

        if (isEdit) {
          const { error: updErr } = await supabase
            .from('materials')
            .update({
              course_id: courseId,
              module_id: null,
              module_number: row.module ? Number(row.module) : null,
              title: row.title,
              type: fileType,
              storage_path: storagePath,
              visibility: row.visibility,
              cover_path: coverPath,
            })
            .eq('id', initialMaterial!.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('materials').insert({
            course_id: courseId,
            module_id: null,
            module_number: row.module ? Number(row.module) : null,
            title: row.title,
            type: fileType,
            storage_path: storagePath,
            visibility: row.visibility,
            cover_path: coverPath,
          });
          if (insErr) throw insErr;
        }
      }
      setMessage('Materialien gespeichert');
      setItems([
        {
          id: 'row-1',
          title: initialMaterial?.title ?? '',
          module: initialMaterial?.module_number?.toString() ?? '',
          visibility: initialMaterial?.visibility ?? 'both',
          file: null,
          cover: null,
        },
      ]);
      // falls Datei ersetzt oder entfernt werden soll: alte löschen
      if (initialMaterial && (items.some((r) => r.file) || removeFile) && initialMaterial.storage_path) {
        await supabase.storage.from('materials').remove([initialMaterial.storage_path]);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Upload');
    } finally {
      setLoading(false);
    }
  }

  const deleteMaterial = async () => {
    if (!initialMaterial?.id) return;
    setDeleting(true);
    setError(null);
    try {
      const paths: string[] = [];
      if (initialMaterial.storage_path) paths.push(initialMaterial.storage_path);
      if (initialMaterial.cover_path) paths.push(initialMaterial.cover_path);
      if (paths.length) {
        await supabase.storage.from('materials').remove(paths);
      }
      const { error: delErr } = await supabase.from('materials').delete().eq('id', initialMaterial.id);
      if (delErr) throw delErr;
      setMessage('Material gelöscht');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Löschen fehlgeschlagen');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative max-h-[90vh] overflow-y-auto text-slate-900">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-700">
          ✕
        </button>
        <h2 className="text-2xl font-semibold text-ink mb-4">
          {initialMaterial ? 'Kursmaterial bearbeiten' : 'Kursmaterial anlegen'}
        </h2>

        {initialMaterial && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-ink">Aktuelles Material</p>
                {currentFile && (
                  <p className="flex items-center gap-2">
                    Datei:
                    <span className="text-xs text-slate-600">{currentFile.split('/').pop()}</span>
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-pink-600 underline"
                      >
                        ansehen
                      </a>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md border border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
                    onClick={() => setRemoveFile((v) => !v)}
                  >
                    {removeFile ? 'Datei-Ersetzung abbrechen' : 'Datei ersetzen (PDF)'}
                  </button>
                  {removeFile && (
                    <span className="text-[11px] text-red-600">Neue PDF erforderlich</span>
                  )}
                </div>
              </div>
              {(coverPreview || (isImagePath(initialMaterial?.storage_path) && fileUrl)) && (
                <div className="text-right space-y-1">
                  <p className="text-xs text-slate-500 mb-1">Titelbild</p>
                  <img
                    src={coverPreview || fileUrl || ''}
                    alt="Titelbild"
                    className="h-16 w-16 rounded-lg object-cover border border-slate-200 ml-auto"
                  />
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md border border-slate-300 text-[11px] text-slate-700 hover:bg-slate-100"
                    onClick={() => setRemoveCover((v) => !v)}
                  >
                    {removeCover ? 'Cover behalten' : 'Cover entfernen'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-slate-700">Kurs</label>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            <option value="">Kurs wählen</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">Aktueller Kurs: {courseTitle}</p>
        </div>

        <form className="space-y-4" onSubmit={handleUpload}>
          {items.map((row, idx) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Material {idx + 1}</p>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => removeRow(row.id)}
                  disabled={items.length === 1}
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Titel</label>
                  <input
                    className="input"
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modul (optional)</label>
                  <select
                    className="input"
                    value={row.module}
                    onChange={(e) => updateRow(row.id, { module: e.target.value })}
                  >
                    <option value="">Kein Modul</option>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <option key={i + 1} value={(i + 1).toString()}>
                        Modul {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sichtbarkeit</label>
                  <select
                    className="input"
                    value={row.visibility}
                    onChange={(e) => updateRow(row.id, { visibility: e.target.value as any })}
                  >
                    <option value="both">Teilnehmer & Dozenten</option>
                    <option value="students">Nur Teilnehmer</option>
                    <option value="teachers">Nur Dozenten</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Datei</label>
                  <input
                    type="file"
                    className="input"
                    onChange={(e) => updateRow(row.id, { file: e.target.files?.[0] || null })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Titelbild (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={(e) => updateRow(row.id, { cover: e.target.files?.[0] || null })}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <button type="button" className="text-sm text-pink-600" onClick={addRow}>
              + weiteres Material
            </button>
            <div className="flex gap-2">
              {initialMaterial && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm"
                  onClick={deleteMaterial}
                  disabled={deleting || loading}
                >
                  {deleting ? 'Lösche...' : 'Material löschen'}
                </button>
              )}
              <button className="button-primary" type="submit" disabled={loading}>
                {loading ? 'Upload...' : 'Speichern'}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
        </form>
      </div>
    </div>
  );
}
