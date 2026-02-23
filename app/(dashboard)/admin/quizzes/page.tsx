'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ButtonLink from '@/components/button-link';

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/quizzes');
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Fehler beim Laden');
    else setQuizzes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (id: string, next: boolean) => {
    const res = await fetch('/api/admin/quizzes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_published: next }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Konnte Status nicht ändern');
    }
    load();
  };

  const seed = async () => {
    setSeedMessage(null);
    const res = await fetch('/api/admin/quizzes/seed', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSeedMessage(data.error || 'Seed fehlgeschlagen');
    } else {
      setSeedMessage(`Beispiel angelegt (${data.course})`);
      load();
    }
  };

  const createQuick = async () => {
    setCreating(true);
    const title = prompt('Quiz-Titel?');
    if (!title) {
      setCreating(false);
      return;
    }
    const course_id = prompt('course_id? (für Schnelltest vorhandene ID einfügen)');
    if (!course_id) {
      setCreating(false);
      return;
    }
    const body = {
      quiz: { title, course_id, is_published: false },
      questions: [
        {
          prompt: 'Demo-Frage: Was ist die Paralleltonart von C-Dur?',
          difficulty: 'easy',
          qtype: 'single',
          options: [
            { label: 'a-Moll', is_correct: true },
            { label: 'g-Moll' },
            { label: 'e-Moll' },
          ],
        },
      ],
    };
    const res = await fetch('/api/admin/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Anlegen fehlgeschlagen');
    }
    setCreating(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Quiz-Verwaltung</h1>
          <p className="text-sm text-slate-200">Quizze anlegen, veröffentlichen, Beispiel laden.</p>
        </div>
        <ButtonLink href="/admin">Zurück</ButtonLink>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <button
          onClick={seed}
          className="rounded-full bg-pink-500 px-4 py-2 font-semibold text-white shadow hover:bg-pink-400"
        >
          Beispiel-Quiz anlegen
        </button>
        <button
          onClick={createQuick}
          disabled={creating}
          className="rounded-full border border-white/30 px-4 py-2 font-semibold text-white hover:bg-white/10 disabled:opacity-60"
        >
          Schnelles Demo-Quiz
        </button>
        {seedMessage && <span className="text-pink-200">{seedMessage}</span>}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading && <p className="text-sm text-slate-200">Lade...</p>}

      <div className="grid gap-3">
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-pink-200">{q.course_id}</p>
              <h3 className="text-lg font-semibold text-white">{q.title}</h3>
              <p className="text-sm text-slate-300 line-clamp-2">{q.description}</p>
              <p className="text-xs text-slate-400">Zeit/Frage: {q.time_per_question}s · Level: {q.level_count}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full border ${q.is_published ? 'border-lime-400 text-lime-200' : 'border-white/20 text-slate-200'}`}>
                {q.is_published ? 'Live' : 'Entwurf'}
              </span>
              <button
                onClick={() => togglePublish(q.id, !q.is_published)}
                className="rounded-full border border-white/30 px-3 py-1 text-white hover:bg-white/10"
              >
                {q.is_published ? 'Verstecken' : 'Veröffentlichen'}
              </button>
              <button
                onClick={() => router.push('/quizzes')}
                className="rounded-full bg-pink-500 px-3 py-1 text-white hover:bg-pink-400"
              >
                Als Teilnehmer ansehen
              </button>
            </div>
          </div>
        ))}
        {!loading && quizzes.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-200">
            Keine Quizze vorhanden. Lege eins an oder nutze "Beispiel-Quiz anlegen".
          </div>
        )}
      </div>
    </div>
  );
}
