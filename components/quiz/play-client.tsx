'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export type QuizMeta = {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  module_id?: string | null;
  module_number?: number | null;
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
  completed_at?: string | null;
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
const ALIAS_KEY = 'quiz_alias_name';
const praisePool = ['Nice Groove!', 'On fire!', 'Sauber!', 'Starker Move!', 'Weiter so!', 'Mega!'];
const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};
type PowerUp =
  | { id: 'time'; seconds: number; label: string; desc: string; color: string; icon: string }
  | { id: 'multiplier'; factor: number; questions: number; label: string; desc: string; color: string; icon: string }
  | { id: 'bonus'; points: number; label: string; desc: string; color: string; icon: string }
  | { id: 'shield'; charges: number; label: string; desc: string; color: string; icon: string };

export default function QuizPlayClient({ quizzes, initialQuizId, initialAlias }: { quizzes: QuizMeta[]; initialQuizId?: string | null; initialAlias?: string }) {
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
  const [alias, setAlias] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(ALIAS_KEY);
      if (stored && stored.trim().length > 0) return stored.trim();
    }
    if (initialAlias && initialAlias.trim().length > 0) return initialAlias.trim();
    return '';
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ correctIds: string[]; isCorrect: boolean } | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [score, setScore] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [delta, setDelta] = useState<{ val: number; positive: boolean; key: number } | null>(null);
  const [praise, setPraise] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [goalProgress, setGoalProgress] = useState(0);
  const goalTarget = 3;
  const goalReward = 50;
  const [multiplierRemaining, setMultiplierRemaining] = useState(0);
  const [multiplierFactor, setMultiplierFactor] = useState(1.1);
  const [extraTimeNext, setExtraTimeNext] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [totalTimeSec, setTotalTimeSec] = useState(0);
  const questionStartRef = useRef<number | null>(null);
  const [shieldCharges, setShieldCharges] = useState(0);
  const [powerChoices, setPowerChoices] = useState<PowerUp[]>([]);
  const [overlayTheme, setOverlayTheme] = useState<string>('from-pink-500/25 via-indigo-500/25 to-amber-400/25');
  const [bonusFeed, setBonusFeed] = useState<{ msg: string; key: number }[]>([]);
  const pushBonusFeed = useMemo(() => pushBonusFeedFactory(setBonusFeed), []);
  const [aliasSaving, setAliasSaving] = useState(false);
  const [fxBurst, setFxBurst] = useState<number | null>(null);
  const [aliasLocked, setAliasLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      const locked = window.localStorage.getItem(`${ALIAS_KEY}_locked`);
      if (locked === '1') return true;
      const stored = window.localStorage.getItem(ALIAS_KEY);
      if (stored && stored.trim().length > 0) return false;
    }
    if (initialAlias && initialAlias.trim().length > 0) return false;
    return false;
  });
  const [aliasSaves, setAliasSaves] = useState(() => {
    if (typeof window !== 'undefined') {
      const saves = window.localStorage.getItem(`${ALIAS_KEY}_saves`);
      if (saves) return Number(saves) || 0;
    }
    return initialAlias && initialAlias.trim().length > 0 ? 1 : 0;
  });

  const current = questions[idx];

  // Alias aus localStorage speichern
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (aliasLocked && alias && alias.trim().length > 0) {
      window.localStorage.setItem(ALIAS_KEY, alias.trim());
    }
  }, [alias, aliasLocked]);

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
        const res = await fetch(`/api/quizzes/${selected.id}/leaderboard?period=${period}&limit=15`);
        const data = await res.json();
        if (res.ok) setLeaderboard(data);
      } catch (e) {
        setLeaderboard([]);
      }
    };
    loadLb();
  }, [selected, period]);

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
    setScore(0);
    setBonusScore(0);
    setDelta(null);
    setPraise(null);
    setStreak(0);
    setBestStreak(0);
    setGoalProgress(0);
    setMultiplierRemaining(0);
    setMultiplierFactor(1.1);
    setExtraTimeNext(0);
    setShowMilestone(false);
    setTotalTimeSec(0);
    questionStartRef.current = Date.now();
    setShieldCharges(0);
    setPowerChoices([]);
    setBonusFeed([]);
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
    let points = isCorrect ? base + timeBonus : 0;
    if (multiplierRemaining > 0) {
      points = Math.round(points * multiplierFactor);
    }
    const speedBonus = isCorrect && timeLeft >= (selected?.time_per_question || 30) * 0.6 ? 20 : 0;
    const surpriseBonus = isCorrect && ((idx + 1) % 7 === 0) ? 50 : 0;
    const deltaVal = isCorrect ? points + speedBonus + surpriseBonus : 0;
    setScore((prev) => prev + deltaVal);
    setBonusScore((b) => b + speedBonus + surpriseBonus);
    setDelta({ val: deltaVal, positive: isCorrect, key: Date.now() });
    if (isCorrect) setFxBurst(Date.now());
    if (speedBonus) pushBonusFeed(`Speed Bonus +${speedBonus}`);
    if (surpriseBonus) pushBonusFeed(`Surprise Loot +${surpriseBonus}`);
    setPraise(isCorrect ? praisePool[Math.floor(Math.random() * praisePool.length)] : null);
    setStreak((prev) => {
      if (isCorrect) return prev + 1;
      if (shieldCharges > 0) {
        setShieldCharges((c) => Math.max(0, c - 1));
        return prev; // Shield hält Streak
      }
      return 0;
    });
    setBestStreak((prev) => (isCorrect ? Math.max(prev, streak + 1) : prev));

    // Mini-Ziel: 3 richtige in Folge
    setGoalProgress((prev) => {
      const next = isCorrect ? prev + 1 : 0;
      if (next >= goalTarget) {
        setScore((s) => s + goalReward);
        setBonusScore((b) => b + goalReward);
        setDelta({ val: goalReward, positive: true, key: Date.now() + 1 });
        return 0; // Reset nach Belohnung
      }
      return next;
    });

    // Milestone nach jeder 10. beantworteten Frage (1-based Index)
    if ((idx + 1) % 10 === 0) {
      const picked = pickPowerUps();
      setPowerChoices(picked);
      setOverlayTheme(randomTheme());
      setShowMilestone(true);
    }

    // Zeit sammeln
    if (questionStartRef.current) {
      const spent = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000));
      setTotalTimeSec((t) => t + spent);
      questionStartRef.current = null;
    }

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
    setTimeLeft((selected?.time_per_question || 30) + extraTimeNext);
    setExtraTimeNext(0);
    setMultiplierRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    if (multiplierRemaining > 0 && multiplierRemaining - 1 <= 0) {
      setMultiplierFactor(1.1);
    }
    if (extraTimeNext > 0) {
      // Verbrauchter Time-Bonus wird entfernt (Badge verschwindet durch state reset oben)
    }
    questionStartRef.current = Date.now();
  };

  const handlePowerUp = (p: PowerUp) => {
    switch (p.id) {
      case 'time':
        setExtraTimeNext(p.seconds);
        break;
      case 'multiplier':
        setMultiplierFactor(p.factor);
        setMultiplierRemaining(p.questions);
        break;
      case 'bonus':
        setScore((s) => s + p.points);
        setBonusScore((b) => b + p.points);
        setDelta({ val: p.points, positive: true, key: Date.now() });
        break;
      case 'shield':
        setShieldCharges((c) => c + p.charges);
        break;
    }
  };

  const saveAttempt = async (all: AnswerDraft[]) => {
    if (!selected) return;
    setSaving(true);
    try {
      const baseScore = all.reduce((s, a) => s + (a.points || 0), 0);
      const scoreWithBonus = score; // Quelle der Wahrheit: angezeigter Score inkl. aller Boni
      const max_score = Math.max(scoreWithBonus, baseScore + bonusScore, all.length * 200 + bonusScore);
      const res = await fetch(`/api/quizzes/${selected.id}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: scoreWithBonus,
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
        const lb = await fetch(`/api/quizzes/${selected.id}/leaderboard?period=${period}&limit=15`).then((r) => r.json().catch(() => []));
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
    <>
      <div className="space-y-5 relative">
        <div className="pointer-events-none absolute -z-10 inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.07),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.06),transparent_35%)]" />
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-900/70 to-slate-900 p-6 shadow-[0_15px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between backdrop-blur">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-pink-500/30 blur-3xl" />
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-amber-400/25 blur-3xl" />
            <div className="absolute left-1/3 bottom-0 h-24 w-24 rounded-full bg-cyan-400/25 blur-3xl" />
          </div>
          <div className="relative space-y-1">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-pink-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              Arcade Mode
            </p>
            <h1 className="text-3xl font-black text-white drop-shadow-sm">Teste dein Wissen</h1>
            <p className="text-sm text-slate-200">Speed, Streaks, Power-Ups & Leaderboard.</p>
            <div className="flex items-center gap-2 text-xs text-amber-100" />
          </div>
          <div className="relative flex flex-col sm:flex-row flex-wrap gap-2 text-xs text-slate-200 items-start sm:items-center">
            <input
              className="rounded-full border border-pink-300/40 bg-black/70 px-3 py-2 text-sm text-white shadow-[0_0_18px_rgba(236,72,153,0.25)] focus:border-pink-200 focus:outline-none transition"
              value={alias}
              onChange={(e) => {
                if (aliasLocked) return;
                setAlias(e.target.value);
              }}
              maxLength={40}
              placeholder="Alias für das Spiel (bleibt fix, nicht Klarnamen)"
              disabled={aliasLocked}
            />
            {!aliasLocked && (
              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:translate-y-[-1px] transition"
                disabled={!alias.trim() || aliasSaving}
                onClick={async () => {
                  const val = alias.trim();
                  if (!val || aliasLocked) return;
                  const remaining = aliasSaves === 0 ? 'Du kannst den Alias noch einmal ändern.' : 'Dies ist die letzte Änderung – danach fix.';
                  if (!window.confirm(`${remaining} Jetzt speichern?`)) return;
                  setAliasSaving(true);
                  try {
                    const res = await fetch('/api/profile/alias', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ alias: val }),
                    });
                    if (!res.ok) throw new Error('Alias speichern fehlgeschlagen');
                    window.localStorage.setItem(ALIAS_KEY, val);
                    const newSaves = aliasSaves + 1;
                    setAliasSaves(newSaves);
                    window.localStorage.setItem(`${ALIAS_KEY}_saves`, String(newSaves));
                    const shouldLock = newSaves >= 2;
                    if (shouldLock) {
                      setAliasLocked(true);
                      window.localStorage.setItem(`${ALIAS_KEY}_locked`, '1');
                    }
                  } catch (e) {
                    // optional: Fehlermeldung anzeigen
                  } finally {
                    setAliasSaving(false);
                  }
                }}
              >
                {aliasSaving ? 'Speichere…' : aliasSaves === 0 ? 'Alias speichern' : 'Letzte Änderung speichern'}
              </button>
            )}
            {aliasLocked ? (
              <span className="text-[11px] text-emerald-200">Alias fixiert – bleibt dauerhaft</span>
            ) : (
              <span className="text-[11px] text-slate-200">
                {aliasSaves === 0 ? 'Du darfst den Alias einmal ändern.' : 'Letzte Chance, dann dauerhaft fix.'}
              </span>
            )}
          </div>
        </div>

      {status === 'intro' && (
        <div className="rounded-2xl border border-white/8 bg-white/6 p-3 shadow-2xl backdrop-blur animate-[pop_250ms_ease-out]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/70 mb-2">
            <span>Modul wählen</span>
            <span className="text-white/50">{quizzes.length} verfügbar</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelected(q)}
                className={`min-w-[180px] rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition shadow-sm ${
                  selected?.id === q.id
                    ? 'border-pink-400 bg-gradient-to-br from-pink-500/20 to-orange-400/15 text-white shadow-pink-500/30'
                    : 'border-white/12 bg-white/5 text-slate-100 hover:border-pink-300/60'
                }`}
                aria-pressed={selected?.id === q.id}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="rounded-full bg-pink-500/25 px-2 py-0.5 text-[10px] font-bold text-pink-50">
                    {q.module_number != null ? `Modul ${q.module_number}` : `Level ${q.level_count}`}
                  </span>
                  <span className="text-[10px] text-slate-300">{q.time_per_question}s</span>
                </div>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{q.title}</p>
                {q.description && <p className="text-[11px] text-slate-300 line-clamp-2 mt-1">{q.description}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-950/95 text-white shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-300 hover:text-white"
              onClick={() => setShowPoints(false)}
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-2">Punktesystem</h3>
            <p className="text-sm text-slate-200 mb-3">
              So werden Punkte und Ranglisten berechnet.
            </p>
            <ul className="space-y-2 text-sm text-slate-100 list-disc list-inside">
              <li>Basis pro Frage: Easy 100 · Medium 140 · Hard 180 Punkte.</li>
              <li>Zeitbonus: +5 Punkte pro verbleibender Sekunde.</li>
              <li>Nur korrekte Antworten zählen; falsche bringen 0 Punkte.</li>
              <li>Tie-Break: schnellere Gesamtzeit rankt vor langsameren bei gleichem Score.</li>
              <li>Leaderboard filterbar nach Monat, Quartal oder Jahr.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/80 p-5 shadow-2xl min-h-[260px] relative overflow-hidden">
            {loading && <p className="text-sm text-slate-300">Lade Fragen...</p>}
            {error && <p className="text-sm text-red-300">{error}</p>}
            {fxBurst && (
              <div key={fxBurst} className="pointer-events-none absolute inset-0 overflow-hidden">
                {[...Array(10)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute h-3 w-3 rounded-full bg-gradient-to-br from-pink-400 via-amber-300 to-cyan-300 animate-[burst_700ms_ease-out_forwards]"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) rotate(${(360 / 10) * i}deg) translateX(40px)`,
                      animationDelay: `${i * 15}ms`,
                    }}
                  />
                ))}
              </div>
            )}

            {!loading && !error && selected && status === 'intro' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
                <p className="text-sm text-slate-200">{selected.description || 'Bereit?'}</p>
                <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                  <span className="rounded-full border border-white/15 px-3 py-1">{questions.length} Fragen</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Level: {selected.level_count}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Zeit/Frage: {selected.time_per_question}s</span>
                </div>
                <p className="text-xs text-slate-400">+5 Punkte pro verbleibender Sekunde. Schnell sein lohnt sich.</p>
                <button
                  onClick={start}
                  className="mt-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-lg"
                >
                  Starten
                </button>
              </div>
            )}

            {!loading && !error && selected && (status === 'playing' || status === 'feedback') && current && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-white">
                  <div className="rounded-2xl border border-white/12 bg-white/8 backdrop-blur p-3 shadow-lg flex items-center gap-3 animate-[shine_2.6s_ease-in-out_infinite]">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(236,72,153,0.35)]">
                      ★
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Score</p>
                      <p className="text-2xl font-black leading-tight drop-shadow">{score}</p>
                      {delta && (
                        <span
                          key={delta.key}
                          className={`mt-1 inline-flex items-center px-2 py-1 rounded-full text-[11px] ${delta.val > 0 ? 'bg-emerald-400/25 text-emerald-50' : 'bg-rose-500/25 text-rose-50'}`}
                          style={{ animation: 'pop 0.3s ease-out' }}
                        >
                          {delta.val > 0 ? `+${delta.val}` : `${delta.val}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-white/6 backdrop-blur p-3 shadow-lg flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold ${timeLeft < 6 ? 'bg-amber-400/30 text-amber-50' : 'bg-lime-400/25 text-lime-50'}`}>
                      ⏱
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Zeit</p>
                      <p className="text-xl font-semibold">{status === 'feedback' ? '—' : `${timeLeft}s`}</p>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-amber-400" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-white/6 backdrop-blur p-3 shadow-lg flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-400/25 text-cyan-50 flex items-center justify-center text-lg font-bold">⚡</div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Buffs</p>
                      <div className="flex gap-2 flex-wrap text-[11px]">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 border border-white/15">Streak {streak} / Best {bestStreak}</span>
                        <span className="rounded-full bg-pink-500/15 px-2 py-0.5 border border-pink-200/40">Ziel {goalProgress}/{goalTarget}</span>
                        {multiplierRemaining > 0 && (
                          <span className="rounded-full bg-orange-400/25 px-2 py-0.5 border border-orange-200/40">x{multiplierFactor.toFixed(2)} · {multiplierRemaining}</span>
                        )}
                        {extraTimeNext > 0 && (
                          <span className="rounded-full bg-cyan-400/25 px-2 py-0.5 border border-cyan-200/40">+{extraTimeNext}s next</span>
                        )}
                        {shieldCharges > 0 && (
                          <span className="rounded-full bg-purple-500/25 px-2 py-0.5 border border-purple-200/40">🛡 {shieldCharges}</span>
                        )}
                        {bonusFeed.slice(-3).map((b) => (
                          <span key={b.key} className="rounded-full bg-white/10 px-2 py-0.5 border border-white/15" style={{ animation: 'pop 0.3s ease-out' }}>
                            {b.msg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {current.media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.media_url} alt="Frage Media" className="max-h-48 w-full object-contain rounded-xl border border-white/10" />
                )}

                <p className="text-lg font-semibold text-white leading-relaxed">{current.prompt}</p>

                <div className="space-y-2">
                  {current.options.map((o) => {
                    const active = picked.includes(o.id);
                    const showFeedback = status === 'feedback';
                    const isCorrect = o.is_correct;
                    const showCorrect = showFeedback && isCorrect;
                    const showWrong = showFeedback && active && !isCorrect;
                    const icon = showCorrect ? '✔' : showWrong ? '✖' : active ? '●' : '○';
                    return (
                      <button
                        key={o.id}
                        onClick={() => handleToggle(o.id)}
                        disabled={showFeedback}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition flex items-center gap-3 ${
                          showCorrect
                            ? 'border-emerald-400 bg-emerald-500/15 text-white'
                            : showWrong
                              ? 'border-rose-400 bg-rose-500/15 text-white'
                              : active
                                ? 'border-pink-400 bg-pink-500/12 text-white shadow-[0_0_0_1px] shadow-pink-400/30'
                                : 'border-white/10 bg-white/5 text-slate-100 hover:border-pink-300/40'
                        } ${showFeedback ? 'cursor-default' : ''}`}
                      >
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                            showCorrect
                              ? 'bg-emerald-500 text-slate-950'
                              : showWrong
                                ? 'bg-rose-400 text-slate-950'
                                : active
                                  ? 'bg-pink-400 text-slate-950'
                                  : 'bg-white/10 text-white'
                          }`}
                        >
                          {icon}
                        </span>
                        <span className="leading-snug">{o.label}</span>
                      </button>
                    );
                  })}
                </div>

                {status === 'feedback' && feedback && (
                  <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
                    feedback.isCorrect
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-50'
                      : 'border-rose-400 bg-rose-500/10 text-rose-50'
                  }`}>
                    <span>{feedback.isCorrect ? '✅ Richtig!' : '❌ Falsch.'}</span>
                    {!feedback.isCorrect && (
                      <span className="text-slate-100">
                        Richtige Antwort: <span className="font-semibold">{current.options.filter((o) => o.is_correct).map((o) => o.label).join(', ')}</span>
                      </span>
                    )}
                    {feedback.isCorrect && praise && (
                      <span className="inline-flex items-center gap-2 text-xs text-emerald-50 bg-emerald-500/20 border border-emerald-300/60 rounded-full px-3 py-1" style={{ animation: 'pop 0.3s ease-out' }}>
                        🎉 {praise}
                      </span>
                    )}
                  </div>
                )}

                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-amber-400" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex justify-end gap-2">
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
                      {idx >= questions.length - 1 ? 'Ergebnis speichern' : 'Weiter'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!loading && !error && status === 'done' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-lg font-bold text-white">
                    🏁
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Geschafft!</h2>
                    <p className="text-sm text-slate-200">Score: {score} Punkte</p>
                    <p className="text-xs text-slate-300">Zeit: {formatTime(totalTimeSec)} · Bester Streak: {bestStreak}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-pink-600/40 via-indigo-700/25 to-amber-500/35 p-6 text-white shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">Highscore</p>
                      <p className="text-4xl font-black drop-shadow-sm">{score}</p>
                      <p className="text-xs text-white/70">Gesamtpunkte</p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const me = leaderboard.find((r) => r.alias === alias);
                        const rankLabel = me ? `#${me.rank}` : 'Noch kein Ranking';
                        return (
                          <>
                            <p className="text-3xl font-extrabold text-amber-100 drop-shadow">{rankLabel}</p>
                            <p className="text-xs text-white/70">Dein Platz</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-3 shadow-inner">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Zeit</p>
                      <p className="text-lg font-semibold">{formatTime(totalTimeSec)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-3 shadow-inner">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Bester Streak</p>
                      <p className="text-lg font-semibold">{bestStreak}x</p>
                    </div>
                  </div>
                </div>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Punktesystem</h3>
              <button
                onClick={() => setShowPoints(true)}
                className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
              >
                Anzeigen
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-200">Wie die Punkte berechnet werden.</p>
          </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
              </div>
              <div className="flex items-center gap-2">
                {(['month', 'quarter', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                      period === p
                        ? 'bg-pink-500 text-white border-pink-300 shadow'
                        : 'border-white/20 text-slate-200 hover:border-pink-300'
                    }`}
                  >
                    {p === 'month' ? 'Monat' : p === 'quarter' ? 'Quartal' : 'Jahr'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {leaderboard.length === 0 && <p className="text-slate-400">Noch keine Einträge.</p>}
              {leaderboard.map((row) => (
                <div key={row.rank + row.alias} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-pink-200">#{row.rank}</span>
                    <span className="font-semibold text-white">{row.alias}</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-200">
                    <div className="font-semibold text-white">{row.score} P</div>
                    <div className="text-slate-400">Level {row.level_reached}</div>
                    <div className="text-slate-500">{formatDateTime(row.completed_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        {showMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className={`w-full max-w-md rounded-3xl border border-white/15 bg-gradient-to-br ${overlayTheme} backdrop-blur text-white shadow-2xl p-6 space-y-4 animate-[glow_2.4s_ease-in-out_infinite]`}>
            <h3 className="text-xl font-semibold">Next Level erreicht!</h3>
            <p className="text-sm text-slate-200">Wähle ein Power-Up für die nächsten Fragen.</p>
            <div className="grid gap-3">
                {powerChoices.map((p) => (
                  <button
                    key={p.label + p.desc}
                    className={`rounded-2xl border px-4 py-3 text-left shadow-lg hover:translate-y-[-2px] transition ${p.color}`}
                    onClick={() => {
                      handlePowerUp(p);
                      setShowMilestone(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-white/70">Power-Up</span>
                    </div>
                    <p className="mt-1 text-base font-semibold text-white">{p.label}</p>
                    <p className="text-sm text-white/80">{p.desc}</p>
                  </button>
                ))}
              </div>
              <button
                className="w-full rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
                onClick={() => setShowMilestone(false)}
              >
                Weiter ohne Power-Up
              </button>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
      @keyframes pop {
        0% { transform: scale(0.9); opacity: 0; }
        60% { transform: scale(1.06); opacity: 1; }
        100% { transform: scale(1); opacity: 0.9; }
      }
      @keyframes glow {
        0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); }
        50% { box-shadow: 0 0 25px 6px rgba(255,255,255,0.25); }
        100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.15); }
      }
      @keyframes shine {
        0% { filter: drop-shadow(0 0 0 rgba(255,255,255,0.25)); }
        50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.45)); }
        100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0.25)); }
      }
      @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-1px); }
        50% { transform: translateX(1px); }
        75% { transform: translateX(-1px); }
        100% { transform: translateX(0); }
      }
      @keyframes burst {
        0% { opacity: 0.9; transform: scale(0.6); }
        70% { opacity: 0.7; transform: scale(1.05); }
        100% { opacity: 0; transform: scale(1.2); }
      }
    `}</style>
  </>
  );
}

function pickPowerUps(): PowerUp[] {
  const pool: PowerUp[] = [
    { id: 'time', seconds: 8, label: 'Time Warp', desc: '+8 Sekunden nächste Frage', color: 'border-cyan-200/70 bg-cyan-500/20', icon: '⏱' },
    { id: 'time', seconds: 5, label: 'Quick Boost', desc: '+5 Sekunden nächste Frage', color: 'border-sky-200/70 bg-sky-500/20', icon: '⚡️' },
    { id: 'multiplier', factor: 1.2, questions: 3, label: 'Combo x1.2', desc: '3 Fragen lang 20% mehr Punkte', color: 'border-amber-200/70 bg-amber-500/20', icon: '✨' },
    { id: 'multiplier', factor: 1.15, questions: 4, label: 'Chain Bonus', desc: '4 Fragen lang 15% mehr Punkte', color: 'border-orange-200/70 bg-orange-500/20', icon: '🔥' },
    { id: 'bonus', points: 80, label: 'Instant Loot', desc: '+80 Punkte sofort', color: 'border-lime-200/70 bg-lime-500/20', icon: '💎' },
    { id: 'bonus', points: 120, label: 'Mega Loot', desc: '+120 Punkte sofort', color: 'border-emerald-200/70 bg-emerald-500/20', icon: '💰' },
    { id: 'shield', charges: 1, label: 'Safe Card', desc: '1 Fehlversuch schützt den Streak', color: 'border-purple-200/70 bg-purple-500/20', icon: '🛡' },
  ];
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

function randomTheme() {
  const themes = [
    'from-pink-500/25 via-indigo-500/25 to-amber-400/25',
    'from-emerald-500/20 via-cyan-500/25 to-blue-500/20',
    'from-amber-500/25 via-rose-500/25 to-purple-500/25',
  ];
  return themes[Math.floor(Math.random() * themes.length)];
}

// simple bonus ticker
function pushBonusFeedFactory(setter: Dispatch<SetStateAction<{ msg: string; key: number }[]>>) {
  return (msg: string) =>
    setter((prev) => [...prev.slice(-4), { msg, key: Date.now() + Math.random() }]);
}
