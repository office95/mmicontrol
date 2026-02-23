import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }

  const quizId = ctx.params.id;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supa = service();
  const allowed = await hasAccess(user.id, quizId, supa);
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: quiz, error: qErr } = await supa
    .from('quizzes')
    .select('id,title,description,course_id,module_id,level_count,time_per_question,allow_mixed_modules,is_published')
    .eq('id', quizId)
    .maybeSingle();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  if (!quiz) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: questions, error: qsErr } = await supa
    .from('quiz_questions')
    .select('id,quiz_id,module_id,difficulty,qtype,prompt,media_url,explanation,order_index,quiz_answer_options(id,label,order_index)')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (qsErr) return NextResponse.json({ error: qsErr.message }, { status: 400 });

  return NextResponse.json({
    quiz,
    questions: (questions || []).map((q: any) => ({
      id: q.id,
      module_id: q.module_id,
      difficulty: q.difficulty,
      type: q.qtype,
      prompt: q.prompt,
      media_url: q.media_url,
      explanation: q.explanation,
      order_index: q.order_index,
      options: (q.quiz_answer_options || [])
        .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((o: any) => ({ id: o.id, label: o.label })),
    })),
  });
}
