'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ButtonLink from '@/components/button-link';

type Course = { id: string; title: string };
type QuizDetail = any;

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [titleInput, setTitleInput] = useState('Neues Quiz');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [modules, setModules] = useState<{ id: string; title: string | null; course_id: string | null; cover_url: string | null; module_number: number | null }[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editQuiz, setEditQuiz] = useState<QuizDetail | null>(null);
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const [quizRes, courseRes, modRes] = await Promise.all([
      fetch('/api/admin/quizzes'),
      fetch('/api/admin/courses?minimal=1'),
      fetch('/api/admin/modules'),
    ]);
    const data = await quizRes.json();
    if (!quizRes.ok) setError(data.error || 'Fehler beim Laden');
    else setQuizzes(data);
    if (courseRes.ok) {
      const c = await courseRes.json();
      setCourses(c);
      if (c.length && !courseId) setCourseId(c[0].id);
    }
    if (modRes.ok) setModules(await modRes.json());
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
    if (!courseId) {
      setError('Kein Kurs ausgewählt');
      setCreating(false);
      return;
    }
    const body = {
      quiz: { title: titleInput || 'Neues Quiz', course_id: courseId, is_published: false },
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

  const openEditor = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/quizzes?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Konnte Quiz nicht laden');
      setEditQuiz(data.quiz);
      setEditQuestions(
        (data.questions || []).map((q: any) => ({
          ...q,
          options: q.options || [],
        }))
      );
      setEditOpen(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addQuestion = () => {
    setEditQuestions((prev) => [
      ...prev,
      {
        prompt: 'Neue Frage',
        difficulty: 'medium',
        qtype: 'single',
        options: [
          { label: 'Antwort 1', is_correct: true },
          { label: 'Antwort 2', is_correct: false },
        ],
      },
    ]);
  };

  const updateQuestion = (idx: number, changes: any) => {
    setEditQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...changes } : q)));
  };

  const removeQuestion = (idx: number) => {
    setEditQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const addOption = (qIdx: number) => {
    setEditQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...(q.options || []), { label: 'Neue Option', is_correct: false }] } : q
      )
    );
  };

  const updateOption = (qIdx: number, oIdx: number, changes: any) => {
    setEditQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o: any, j: number) => (j === oIdx ? { ...o, ...changes } : o)) }
          : q
      )
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setEditQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: q.options.filter((_: any, j: number) => j !== oIdx) } : q))
    );
  };

  const saveQuiz = async () => {
    if (!editQuiz) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        quiz: editQuiz,
        questions: editQuestions.map((q, idx) => ({
          id: q.id,
          prompt: q.prompt,
          difficulty: q.difficulty,
          qtype: q.qtype,
          media_url: q.media_url,
          explanation: q.explanation,
          module_id: q.module_id || editQuiz.module_id || null,
          order_index: idx,
          options: (q.options || []).map((o: any, j: number) => ({
            id: o.id,
            label: o.label,
            is_correct: !!o.is_correct,
            order_index: j,
          })),
        })),
      };
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
      setEditOpen(false);
      setEditQuiz(null);
      setEditQuestions([]);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
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

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3 text-sm text-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-[0.2em] text-pink-200">Titel</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Quiz-Titel"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-[0.2em] text-pink-200">Kurs</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
              value={courseId ?? ''}
              onChange={(e) => setCourseId(e.target.value || null)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title || c.id}</option>
              ))}
            </select>
          </div>
          <button
            onClick={createQuick}
            disabled={creating || !courseId}
            className="rounded-lg bg-pink-600 px-4 py-2 font-semibold text-white shadow hover:bg-pink-500 disabled:opacity-50"
          >
            Anlegen
          </button>
        </div>
        <p className="text-xs text-slate-400">Wähle Kurs und Titel, um schnell ein Demo-Quiz mit einer Frage anzulegen (Entwurf). Später Fragen/Antworten ergänzen.</p>
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
              {q.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={q.cover_url}
                  alt="Quiz Cover"
                  className="mt-2 h-24 w-40 object-cover rounded-lg border border-white/10"
                />
              )}
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
                onClick={() => openEditor(q.id)}
                className="rounded-full border border-white/30 px-3 py-1 text-white hover:bg-white/10"
              >
                Bearbeiten
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Quiz wirklich löschen?')) return;
                  await fetch(`/api/admin/quizzes?id=${q.id}`, { method: 'DELETE' });
                  load();
                }}
                className="rounded-full border border-rose-400 px-3 py-1 text-rose-200 hover:bg-rose-500/10"
              >
                Löschen
              </button>
              <button
                onClick={() => openEditor(q.id)}
                className="rounded-full border border-white/30 px-3 py-1 text-white hover:bg-white/10"
              >
                Bearbeiten
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

      {editOpen && editQuiz && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-auto">
          <div className="relative mt-10 w-full max-w-4xl rounded-2xl border border-white/15 bg-slate-950/90 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Quiz bearbeiten</p>
                <input
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-white text-lg font-semibold"
                  value={editQuiz.title || ''}
                  onChange={(e) => setEditQuiz({ ...editQuiz, title: e.target.value })}
                />
                <textarea
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder="Beschreibung"
                  value={editQuiz.description || ''}
                  onChange={(e) => setEditQuiz({ ...editQuiz, description: e.target.value })}
                />
                <input
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder="Cover URL (optional)"
                  value={editQuiz.cover_url || ''}
                  onChange={(e) => setEditQuiz({ ...editQuiz, cover_url: e.target.value })}
                />
                <div className="flex flex-wrap gap-3 text-sm">
                  <div>
                    <label className="text-xs text-slate-300">Zeit/Frage (s)</label>
                    <input
                      type="number"
                      className="w-24 rounded border border-white/20 bg-black/30 px-2 py-1 text-white"
                      value={editQuiz.time_per_question || 30}
                      onChange={(e) => setEditQuiz({ ...editQuiz, time_per_question: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Level</label>
                    <input
                      type="number"
                      className="w-20 rounded border border-white/20 bg-black/30 px-2 py-1 text-white"
                      value={editQuiz.level_count || 5}
                      onChange={(e) => setEditQuiz({ ...editQuiz, level_count: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Kurs</label>
                    <select
                      className="min-w-[180px] rounded border border-white/20 bg-black/30 px-2 py-2 text-white"
                      value={editQuiz.course_id || ''}
                      onChange={(e) => setEditQuiz({ ...editQuiz, course_id: e.target.value })}
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title || c.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Modul</label>
                    <select
                      className="min-w-[180px] rounded border border-white/20 bg-black/30 px-2 py-2 text-white"
                      value={editQuiz.module_id || ''}
                      onChange={(e) => setEditQuiz({ ...editQuiz, module_id: e.target.value || null })}
                    >
                      <option value="">(kein Modul)</option>
                      {modules
                        .filter((m) => !editQuiz.course_id || m.course_id === editQuiz.course_id)
                        .sort((a, b) => (a.module_number || 0) - (b.module_number || 0))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.module_number ? `Modul ${m.module_number}` : 'Modul'} — {m.title || m.id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={!!editQuiz.is_published}
                      onChange={(e) => setEditQuiz({ ...editQuiz, is_published: e.target.checked })}
                    />
                    Veröffentlicht
                  </label>
                </div>
              </div>
              <button
                className="text-sm text-slate-200 hover:text-white"
                onClick={() => { setEditOpen(false); setEditQuiz(null); setEditQuestions([]); }}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {editQuestions.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      className="flex-1 rounded border border-white/20 bg-black/30 px-3 py-2 text-white font-semibold"
                      value={q.prompt}
                      onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                    />
                    <button
                      className="text-xs text-rose-300 hover:text-rose-200"
                      onClick={() => removeQuestion(idx)}
                    >
                      Löschen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-200">
                    <select
                      className="rounded border border-white/20 bg-black/30 px-2 py-1"
                      value={q.difficulty}
                      onChange={(e) => updateQuestion(idx, { difficulty: e.target.value })}
                    >
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                    <select
                      className="rounded border border-white/20 bg-black/30 px-2 py-1"
                      value={q.qtype}
                      onChange={(e) => updateQuestion(idx, { qtype: e.target.value })}
                    >
                      <option value="single">single</option>
                      <option value="multiple">multiple</option>
                      <option value="boolean">boolean</option>
                      <option value="order">order</option>
                      <option value="match">match</option>
                      <option value="text">text</option>
                      <option value="media">media</option>
                    </select>
                    <input
                      className="flex-1 min-w-[200px] rounded border border-white/20 bg-black/20 px-2 py-1 text-white"
                      placeholder="Media URL (optional)"
                      value={q.media_url || ''}
                      onChange={(e) => updateQuestion(idx, { media_url: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="w-full rounded border border-white/20 bg-black/20 px-2 py-2 text-sm text-white"
                    placeholder="Erklärung (optional)"
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                  />
                  <div className="space-y-2">
                    {(q.options || []).map((o: any, oIdx: number) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded border border-white/20 bg-black/20 px-2 py-1 text-white"
                          value={o.label}
                          onChange={(e) => updateOption(idx, oIdx, { label: e.target.value })}
                        />
                        <label className="flex items-center gap-1 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={!!o.is_correct}
                            onChange={(e) => updateOption(idx, oIdx, { is_correct: e.target.checked })}
                          />
                          korrekt
                        </label>
                        <button
                          className="text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => removeOption(idx, oIdx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-xs text-pink-200 hover:text-pink-100"
                      onClick={() => addOption(idx)}
                    >
                      + Option
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="rounded border border-dashed border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
                onClick={addQuestion}
              >
                + Frage hinzufügen
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 text-sm">
              {saving && <span className="text-slate-300">Speichere...</span>}
              <button
                className="rounded-full border border-white/30 px-4 py-2 text-white hover:bg-white/10"
                onClick={() => { setEditOpen(false); setEditQuiz(null); setEditQuestions([]); }}
              >
                Abbrechen
              </button>
              <button
                className="rounded-full bg-pink-600 px-4 py-2 font-semibold text-white hover:bg-pink-500"
                onClick={saveQuiz}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
