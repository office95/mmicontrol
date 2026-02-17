'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import Spinner from './spinner';

interface Course {
  id: string;
  title: string;
}
interface Module {
  id: string;
  title: string;
  course_id: string;
}

type Visibility = 'students' | 'teachers' | 'both';

export default function MaterialUpload() {
  const { supabase } = useSupabase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('both');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('courses')
      .select('id, title')
      .eq('status', 'active')
      .then(({ data }) => setCourses(data ?? []));
  }, [supabase]);

  useEffect(() => {
    if (!courseId) {
      setModules([]);
      setModuleId('');
      return;
    }
    supabase
      .from('modules')
      .select('id, title, course_id')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
      .then(({ data }) => setModules(data ?? []));
  }, [supabase, courseId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!file || !courseId || !title) {
      setError('Titel, Kurs und Datei sind erforderlich');
      return;
    }
    setLoading(true);
    const path = `course/${courseId}${moduleId ? `/module/${moduleId}` : ''}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('materials').insert({
      course_id: courseId,
      module_id: moduleId || null,
      title,
      type: file.type,
      storage_path: path,
      visibility,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage('Upload erfolgreich gespeichert');
      setTitle('');
      setModuleId('');
      setFile(null);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Material hochladen</p>
          <h3 className="text-lg font-semibold text-ink">Datei dem Kurs zuordnen</h3>
        </div>
      </div>
      <form className="space-y-4" onSubmit={handleUpload}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Kurs</label>
            <select
              className="input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              <option value="">Kurs wählen</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Modul (optional)</label>
            <select
              className="input"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              disabled={!modules.length}
            >
              <option value="">Kein Modul</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Titel</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Sichtbarkeit</label>
            <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="both">Teilnehmer & Dozenten</option>
              <option value="students">Nur Teilnehmer</option>
              <option value="teachers">Nur Dozenten</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Datei</label>
          <input type="file" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2"><Spinner /> Upload läuft...</span>
          ) : (
            'Upload speichern'
          )}
        </button>
      </form>
    </div>
  );
}
