import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const adjectives = ['Bold', 'Groove', 'Silent', 'Sonic', 'Velvet', 'Bright', 'Wild', 'Neon', 'Amber', 'Indigo'];
const nouns = ['Rhythm', 'Chord', 'Pulse', 'Beat', 'Riff', 'Hook', 'Melody', 'Harmony', 'Bass', 'Tempo'];
const randomAlias = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Math.floor(Math.random() * 900 + 100)}`;

async function currentUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function hasAccess(userId: string, quizId: string, supa: ReturnType<typeof service>) {
  const { data: profile } = await supa.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile?.role === 'admin') return true;
  const { data: quiz } = await supa.from('quizzes').select('course_id').eq('id', quizId).maybeSingle();
  if (!quiz) return false;
  const { count } = await supa
    .from('course_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', quiz.course_id);
  return (count ?? 0) > 0;
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }

  const quizId = ctx.params.id;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supa = service();
  const allowed = await hasAccess(user.id, quizId, supa);
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { alias, answers = [], score: clientScore, max_score: clientMaxScore } = body || {};

  // Bundesland als Alias, falls vorhanden
  const { data: student } = await supa
    .from('students')
    .select('state')
    .eq('email', (user.email || '').toLowerCase())
    .maybeSingle();

  const stateAlias = student?.state ? String(student.state).trim().slice(0, 40) : null;
  const safeAlias = stateAlias || (alias as string | undefined)?.trim().slice(0, 40) || randomAlias();

  // Lade Fragen + richtige Antworten für Scoring
  const { data: quiz } = await supa
    .from('quizzes')
    .select('id,time_per_question')
    .eq('id', quizId)
    .maybeSingle();

  const { data: qrows } = await supa
    .from('quiz_questions')
    .select('id,difficulty,quiz_answer_options(id,is_correct)')
    .eq('quiz_id', quizId);

  const timePerQuestion = quiz?.time_per_question || 30;
  const difficultyFactor: Record<string, number> = { easy: 100, medium: 140, hard: 180 } as const;

  const questionMap = new Map(
    (qrows || []).map((q: any) => [
      q.id,
      {
        difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') ?? 'medium',
        correct: (q.quiz_answer_options || []).filter((o: any) => o.is_correct).map((o: any) => o.id),
      },
    ])
  );

  let computedScore = 0;
  const details = (Array.isArray(answers) ? answers : []).map((a: any, idx: number) => {
    const meta = questionMap.get(a.question_id) || { difficulty: 'medium', correct: [] };
    const picked = (a.option_ids ?? a.selected_option_ids ?? []) as string[];
    const correct = meta.correct;
    const isCorrect = picked.length === correct.length && picked.every((p) => correct.includes(p));
    const spentMs = a.time_ms ?? 0;
    const timeBonus = Math.max(timePerQuestion * 1000 - spentMs, 0) / 1000 * 5; // 5 Punkte pro Sekunde Rest
    const base = difficultyFactor[meta.difficulty] || 120;
    const points = isCorrect ? Math.round(base + timeBonus) : 0;
    computedScore += points;
    return {
      attempt_id: null as any, // wird nach Insert gesetzt
      question_id: a.question_id,
      selected_option_ids: picked,
      is_correct: isCorrect,
      time_ms: spentMs,
      level: a.level ?? idx + 1,
      points,
    };
  });

  const computedMaxScore = (qrows || []).reduce((s: number, q: any) => s + (difficultyFactor[q.difficulty] || 120) + timePerQuestion * 5, 0);
  const duration_sec = (Array.isArray(answers) ? answers : []).reduce((s: number, a: any) => s + Math.round((a.time_ms ?? 0) / 1000), 0);
  const level_reached = details.length;
  const finalScore = typeof clientScore === 'number' ? clientScore : computedScore;
  const finalMax = typeof clientMaxScore === 'number' ? clientMaxScore : computedMaxScore;

  const { data: attempt, error: insErr } = await supa
    .from('quiz_attempts')
    .insert({ quiz_id: quizId, user_id: user.id, score: finalScore, max_score: finalMax, level_reached, duration_sec, alias: safeAlias, completed_at: new Date().toISOString() })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  if (details.length) {
    await supa.from('quiz_attempt_answers').insert(details.map((d) => ({ ...d, attempt_id: attempt.id })));
  }

  return NextResponse.json({ id: attempt.id, alias: safeAlias, score: finalScore, max_score: finalMax, level_reached });
}
