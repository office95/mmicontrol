'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type QuizMeta = {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  module_id?: string | null;
  level_count: number;
  time_per_question: number;
};

export type QuizQuestion = {
  id: string;
  module_id?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'single' | 'multiple' | 'boolean' | 'order' | 'match' | 'text' | 'media';
  prompt: string;
  media_url?: string | null;
  explanation?: string | null;
  options: { id: string; label: string; is_correct?: boolean }[];
};

export type LeaderboardRow = {
  rank: number;
  alias: string;
  score: number;
  max_score: number;
  level_reached: number;
  duration_sec: number;
};

type AnswerDraft = {
  question_id: string;
  option_ids: string[];
  is_correct: boolean;
  time_ms: number;
  level: number;
  points: number;
};

const difficultyFactor: Record<QuizQuestion['difficulty'], number> = {
  easy: 100,
  medium: 140,
  hard: 180,
};

const adjectives = ['Bold', 'Groove', 'Silent', 'Sonic', 'Velvet', 'Bright', 'Wild', 'Neon', 'Amber', 'Indigo'];
const nouns = ['Rhythm', 'Chord', 'Pulse', 'Beat', 'Riff', 'Hook', 'Melody', 'Harmony', 'Bass', 'Tempo'];
const randomAlias = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Math.floor(Math.random() * 900 + 100)}`;

export default function QuizPlayClient({ quizzes, initialQuizId }: { quizzes: QuizMeta[]; initialQuizId?: string | null }) {
  const [selected, setSelected] = useState<QuizMeta | null>(() => {
    if (!quizzes.length) return null;
    if (initialQuizId) return quizzes.find((q) => q.id === initialQuizId) || quizzes[0];
    return quizzes[0];
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'intro' | 'playing' | 'feedback' | 'done'>('intro');
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(selected?.time_per_question || 30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [answers, setAnswers] = useState<AnswerDraft[]>([]);
  const answersRef = useRef<AnswerDraft[]>([]);
  const [alias, setAlias] = useState(randomAlias());
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ correctIds: string[]; isCorrect: boolean } | null>(null);

  const current = questions[idx];

  // load quiz detail when selected changes
  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/quizzes/${selected.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Quiz konnte nicht geladen werden');
        setQuestions(data.questions || []);
        setStatus('intro');
        setIdx(0);
        setPicked([]);
        setTimeLeft(data.quiz?.time_per_question || 30);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selected]);

  // load leaderboard for selected
  useEffect(() => {
    if (!selected) return;
    const loadLb = async () => {
      try {
        const res = await fetch(`/api/quizzes/${selected.id}/leaderboard?period=year&limit=15`);
        const data = await res.json();
        if (res.ok) setLeaderboard(data);
      } catch (e) {
        setLeaderboard([]);
      }
    };
    loadLb();
  }, [selected]);

  // timer handling
  useEffect(() => {
    if (status !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return selected?.time_per_question || 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, idx, selected?.time_per_question]);

  const start = () => {
    if (!questions.length) {
      setError('Keine Fragen hinterlegt.');
      return;
    }
    setAnswers([]);
    answersRef.current = [];
    setIdx(0);
    setPicked([]);
    setFeedback(null);
    setStatus('playing');
    setTimeLeft(selected?.time_per_question || 30);
  };

  const handleToggle = (id: string) => {
    if (!current) return;
    if (current.type === 'single' || current.type === 'boolean') {
      setPicked([id]);
    } else {
      setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    }
  };

  const handleSubmit = () => {
    if (!current || status !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correctIds = (current.options || []).filter((o) => o.is_correct).map((o) => o.id);
    const isSingle = current.type === 'single' || current.type === 'boolean';
    const isCorrect = isSingle
      ? picked.length === 1 && correctIds.length === 1 && picked[0] === correctIds[0]
      : correctIds.length > 0 &&
        picked.length === correctIds.length &&
        picked.every((id) => correctIds.includes(id));

    const base = difficultyFactor[current.difficulty] || 100;
    const timeBonus = Math.max(timeLeft - 1, 0) * 5;
    const points = isCorrect ? base + timeBonus : 0;

    const draft: AnswerDraft = {
      question_id: current.id,
      option_ids: picked,
      is_correct: isCorrect,
      time_ms: (selected?.time_per_question || 30 - timeLeft) * 1000,
      level: idx + 1,
      points,
    };

    setAnswers((prev) => {
      const next = [...prev, draft];
      answersRef.current = next;
      return next;
    });
    setFeedback({ correctIds, isCorrect });
    setStatus('feedback');
  };

  const goNext = async () => {
    if (!current) return;
    const lastIndex = idx >= questions.length - 1;
    if (lastIndex) {
      setStatus('done');
      setFeedback(null);
      if (timerRef.current) clearInterval(timerRef.current);
      await saveAttempt(answersRef.current);
      return;
    }
    setIdx((prev) => prev + 1);
    setPicked([]);
    setFeedback(null);
    setStatus('playing');
    setTimeLeft(selected?.time_per_question || 30);
  };

  const saveAttempt = async (all: AnswerDraft[]) => {
    if (!selected) return;
    setSaving(true);
    try {
      const score = all.reduce((s, a) => s + (a.points || 0), 0);
      const max_score = all.length * 200;
      const res = await fetch(`/api/quizzes/${selected.id}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          max_score,
          level_reached: all.length,
          duration_sec: all.reduce((s, a) => s + Math.round((a.time_ms || 0) / 1000), 0),
          alias,
          answers: all,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Speichern fehlgeschlagen');
      } else {
        const lb = await fetch(`/api/quizzes/${selected.id}/leaderboard?period=year&limit=15`).then((r) => r.json().catch(() => []));
        setLeaderboard(lb || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const progress = useMemo(() => ((idx + (status === 'feedback' || status === 'done' ? 1 : 0)) / Math.max(questions.length, 1)) * 100, [idx, questions.length, status]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-pink-200">Lern-Quiz</p>
            <h1 className="text-2xl font-semibold text-white">Teste dein Wissen</h1>
            <p className="text-sm text-slate-200">Level, Zeitdruck, anonyme Bestenliste.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-200">
            <input
              className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={40}
              placeholder="Alias für Ranking"
            />
            <button
              className="rounded-full border border-pink-400 bg-pink-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30"
              onClick={() => setAlias(randomAlias())}
              type="button"
            >
              Alias neu
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[2fr,1fr] gap-5">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelected(q)}
                className={`rounded-xl border ${selected?.id === q.id ? 'border-pink-400 bg-pink-500/10' : 'border-white/10 bg-white/5'} p-4 text-left shadow hover:border-pink-300/60 transition`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Level {q.level_count}</p>
                <h3 className="text-lg font-semibold text-white">{q.title}</h3>
                <p className="text-sm text-slate-200 line-clamp-2">{q.description || 'Kein Beschreibungstext'}</p>
                <p className="mt-2 text-xs text-slate-400">Zeit/Frage: {q.time_per_question}s</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl min-h-[240px]">
            {loading && <p className="text-sm text-slate-300">Lade Fragen...</p>}
            {error && <p className="text-sm text-red-300">{error}</p>}

            {!loading && !error && selected && status === 'intro' && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
                <p className="text-sm text-slate-200">{selected.description || 'Bereit?'}</p>
                <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                  <span className="rounded-full border border-white/15 px-3 py-1">{questions.length} Fragen</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Level: {selected.level_count}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Zeit/Frage: {selected.time_per_question}s</span>
                </div>
                <button
                  onClick={start}
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-lg"
                >
                  Starten
                </button>
              </div>
            )}

            {!loading && !error && selected && (status === 'playing' || status === 'feedback') && current && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span>Frage {idx + 1} / {questions.length}</span>
                  <span className={`font-semibold ${timeLeft < 6 ? 'text-amber-300' : 'text-lime-200'}`}>
                    {status === 'feedback' ? '—' : `${timeLeft}s`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-amber-400" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-lg font-semibold text-white leading-relaxed">{current.prompt}</p>
                {current.media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.media_url} alt="Frage Media" className="max-h-48 w-full object-contain rounded-xl border border-white/10" />
                )}
                <div className="space-y-2">
                  {current.options.map((o) => {
                    const active = picked.includes(o.id);
                    const showFeedback = status === 'feedback';
                    const isCorrect = o.is_correct;
                    const showCorrect = showFeedback && isCorrect;
                    const showWrong = showFeedback && active && !isCorrect;
                    return (
                      <button
                        key={o.id}
                        onClick={() => handleToggle(o.id)}
                        disabled={showFeedback}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          showCorrect
                            ? 'border-emerald-400 bg-emerald-500/15 text-white'
                            : showWrong
                              ? 'border-rose-400 bg-rose-500/15 text-white'
                              : active
                                ? 'border-pink-400 bg-pink-500/15 text-white'
                                : 'border-white/10 bg-white/5 text-slate-100 hover:border-pink-300/40'
                        } ${showFeedback ? 'cursor-default' : ''}`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                {status === 'feedback' && feedback && (
                  <div className={`rounded-xl border px-4 py-3 text-sm ${
                    feedback.isCorrect
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-50'
                      : 'border-rose-400 bg-rose-500/10 text-rose-50'
                  }`}>
                    {feedback.isCorrect ? 'Richtig! Gut gemacht.' : 'Falsch. Richtige Antwort:'}{' '}
                    {!feedback.isCorrect && (
                      <span className="font-semibold">
                        {current.options.filter((o) => o.is_correct).map((o) => o.label).join(', ')}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  {status === 'playing' && (
                    <button
                      onClick={handleSubmit}
                      className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-pink-400"
                    >
                      Antwort prüfen
                    </button>
                  )}
                  {status === 'feedback' && (
                    <button
                      onClick={goNext}
                      className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-pink-400"
                    >
                      {idx >= questions.length - 1 ? 'Ergebnis speichern' : 'Nächste Frage'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!loading && !error && status === 'done' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Geschafft!</h2>
                <p className="text-sm text-slate-200">Score: {answers.reduce((s, a) => s + (a.points || 0), 0)} Punkte</p>
                <div className="flex gap-3">
                  <button
                    className="rounded-full border border-white/20 px-4 py-2 text-sm text-white"
                    onClick={() => setStatus('intro')}
                  >
                    Nochmal
                  </button>
                  <button
                    className="rounded-full bg-pink-500 px-4 py-2 text-sm text-white"
                    onClick={() => {
                      setStatus('intro');
                      setIdx(0);
                      setAnswers([]);
                    }}
                  >
                    Anderes Quiz
                  </button>
                </div>
                {saving && <p className="text-xs text-slate-400">Speichere Versuch...</p>}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Leaderboard (Jahr)</h3>
              <span className="text-xs text-slate-300">Anonym</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {leaderboard.length === 0 && <p className="text-slate-400">Noch keine Einträge.</p>}
              {leaderboard.map((row) => (
                <div key={row.rank + row.alias} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-pink-200">#{row.rank}</span>
                    <span className="font-semibold text-white">{row.alias}</span>
                  </div>
                  <div className="text-right text-xs text-slate-200">
                    <div className="font-semibold text-white">{row.score} P</div>
                    <div className="text-slate-400">Level {row.level_reached}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
