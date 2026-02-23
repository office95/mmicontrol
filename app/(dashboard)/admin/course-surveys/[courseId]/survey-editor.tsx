'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPES = [
  { value: 'text', label: 'Kurztext' },
  { value: 'textarea', label: 'Langtext' },
  { value: 'select', label: 'Auswahl (Dropdown)' },
  { value: 'scale', label: 'Skala 1–5' },
];

type Question = {
  id?: string;
  qtype: string;
  prompt: string;
  options?: any;
  required?: boolean;
  position?: number;
};

type Survey = {
  id?: string;
  title: string;
  instructions?: string | null;
  open_days_before_start?: number | null;
};

export default function SurveyEditor({ courseId, initialSurvey, initialQuestions }: { courseId: string; initialSurvey: Survey | null; initialQuestions: Question[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [survey, setSurvey] = useState<Survey>(initialSurvey || { title: 'Kursfragebogen', instructions: '', open_days_before_start: 7 });
  const [questions, setQuestions] = useState<Question[]>(
    (initialQuestions || []).map((q, idx) => ({ ...q, position: q.position ?? idx + 1 }))
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { qtype: 'text', prompt: 'Neue Frage', required: true, options: null, position: qs.length + 1 },
    ]);
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i + 1 })));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/course-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, survey, questions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Konnte Fragebogen nicht speichern');
      setSuccess('Gespeichert.');
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm text-white/80">Titel</label>
          <input
            className="input"
            value={survey.title}
            onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/80">Öffnen ab (Tage vor Kursstart)</label>
          <input
            type="number"
            className="input"
            value={survey.open_days_before_start ?? 7}
            onChange={(e) => setSurvey({ ...survey, open_days_before_start: Number(e.target.value) })}
          />
        </div>
        <div className="md:col-span-3 space-y-2">
          <label className="text-sm text-white/80">Hinweis / Anweisung</label>
          <textarea
            className="input"
            rows={3}
            value={survey.instructions ?? ''}
            onChange={(e) => setSurvey({ ...survey, instructions: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Fragen</h3>
        <button onClick={addQuestion} className="px-3 py-2 rounded-lg bg-pink-600 text-white text-sm hover:bg-pink-500">Frage hinzufügen</button>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">#{idx + 1}</span>
                <select
                  className="input text-sm"
                  value={q.qtype}
                  onChange={(e) => updateQuestion(idx, { qtype: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={q.required ?? true}
                    onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                  />
                  Pflicht
                </label>
              </div>
              <button
                className="text-xs text-rose-300 hover:text-rose-200"
                onClick={() => removeQuestion(idx)}
              >
                Entfernen
              </button>
            </div>
            <input
              className="input"
              value={q.prompt}
              onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
            />
            {q.qtype === 'select' && (
              <div className="space-y-1">
                <label className="text-xs text-white/70">Optionen (Kommagetrennt)</label>
                <input
                  className="input"
                  value={(q.options?.choices || []).join(', ')}
                  onChange={(e) => updateQuestion(idx, { options: { choices: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
                />
              </div>
            )}
            {q.qtype === 'scale' && (
              <p className="text-xs text-white/60">Skala 1 (niedrig) bis 5 (hoch)</p>
            )}
          </div>
        ))}
        {!questions.length && <p className="text-sm text-white/70">Noch keine Fragen angelegt.</p>}
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {success && <p className="text-sm text-emerald-300">{success}</p>}

      <div className="flex gap-3">
        <button
          className="px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-500 disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10"
          onClick={() => router.back()}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
