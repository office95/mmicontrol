'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Question = {
  id: string;
  qtype: string;
  prompt: string;
  options?: any;
  required?: boolean;
  extra_text_label?: string | null;
  extra_text_required?: boolean | null;
};

type Survey = {
  id: string;
  title: string;
  course_id: string;
};

export default function SurveyForm({ survey, questions, bookingId, preview = false }: { survey: Survey; questions: Question[]; bookingId: string; preview?: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const [values, setValues] = useState<Record<string, string>>({});
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setVal = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));
  const setExtra = (id: string, v: string) => setExtraValues((prev) => ({ ...prev, [id]: v }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const answers = questions.map((q) => ({
        question_id: q.id,
        value: values[q.id] ?? '',
        extra_text: q.extra_text_label ? (extraValues[q.id] ?? '') : null,
      }));
      const res = await fetch(`/api/student/surveys/${survey.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden');
      setDone(true);
      setTimeout(() => router.push('/student'), 1200);
    } catch (e: any) {
      setError(e.message || 'Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return <div className="rounded-xl border border-emerald-300 bg-emerald-900/40 p-4 text-emerald-100">Danke, Fragebogen wurde übermittelt.</div>;

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-white font-medium">{q.prompt}</p>
            {q.required && <span className="text-[11px] text-white/60">Pflicht</span>}
          </div>
          {q.qtype === 'text' && (
            <input
              className="input"
              value={values[q.id] ?? ''}
              onChange={(e) => setVal(q.id, e.target.value)}
              required={q.required}
            />
          )}
          {q.qtype === 'textarea' && (
            <textarea
              className="input"
              rows={4}
              value={values[q.id] ?? ''}
              onChange={(e) => setVal(q.id, e.target.value)}
              required={q.required}
            />
          )}
          {q.qtype === 'select' && (
            <select
              className="input"
              value={values[q.id] ?? ''}
              onChange={(e) => setVal(q.id, e.target.value)}
              required={q.required}
            >
              <option value="">Bitte wählen</option>
              {(q.options?.choices || []).map((c: string, idx: number) => (
                <option key={idx} value={c}>{c}</option>
              ))}
            </select>
          )}
          {q.qtype === 'multiselect' && (
            <div className="flex flex-wrap gap-2">
              {(q.options?.choices || []).map((c: string, idx: number) => {
                const selected = (values[q.id] || '').split(',').map((s) => s.trim()).filter(Boolean);
                const toggled = selected.includes(c)
                  ? selected.filter((s) => s !== c)
                  : [...selected, c];
                return (
                  <button
                    type="button"
                    key={idx}
                    className={`px-3 py-2 rounded-lg border text-sm ${selected.includes(c) ? 'border-pink-400 bg-pink-500/20 text-white' : 'border-white/20 text-white/80'}`}
                    onClick={() => setVal(q.id, toggled.join(', '))}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          {q.qtype === 'scale' && (
            <div className="flex gap-2">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`px-3 py-2 rounded-lg border ${values[q.id]==String(n)?'border-pink-400 bg-pink-500/20 text-white':'border-white/20 text-white/80'}`}
                  onClick={() => setVal(q.id, String(n))}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {q.extra_text_label && (
            <div className="space-y-1">
              <label className="text-xs text-white/70">{q.extra_text_label}</label>
              <textarea
                className="input"
                rows={3}
                value={extraValues[q.id] ?? ''}
                onChange={(e) => setExtra(q.id, e.target.value)}
                required={q.extra_text_required ?? false}
              />
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <button
        className="px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-500 disabled:opacity-60"
        onClick={submit}
        disabled={
          preview
          || submitting
          || questions.some((q) => q.required && !(values[q.id] ?? '').trim())
          || questions.some((q) => q.extra_text_label && q.extra_text_required && !(extraValues[q.id] ?? '').trim())
        }
      >
        {preview ? 'Vorschau' : submitting ? 'Sendet…' : 'Absenden'}
      </button>
      {preview && <p className="text-xs text-white/60">Dies ist eine Vorschau – Eingaben werden nicht gespeichert.</p>}
    </div>
  );
}
