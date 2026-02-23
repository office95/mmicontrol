import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function isAdmin() {
  const supa = createSupabaseRouteClient();
  const { data } = await supa.auth.getUser();
  if (!data.user) return false;
  const svc = service();
  const { data: profile } = await svc.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin';
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supa = service();
  const { data, error } = await supa
    .from('quizzes')
    .select('id,title,description,course_id,module_id,is_published,level_count,time_per_question,created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { quiz, questions } = body || {};
  if (!quiz?.title || !quiz?.course_id) {
    return NextResponse.json({ error: 'title & course_id required' }, { status: 400 });
  }
  const supa = service();
  const { data: quizRow, error: qErr } = await supa
    .from('quizzes')
    .upsert(
      {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description ?? null,
        course_id: quiz.course_id,
        module_id: quiz.module_id ?? null,
        level_count: quiz.level_count ?? 5,
        time_per_question: quiz.time_per_question ?? 30,
        allow_mixed_modules: quiz.allow_mixed_modules ?? true,
        is_published: quiz.is_published ?? false,
        created_by: quiz.created_by ?? null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

  if (Array.isArray(questions) && questions.length) {
    // delete existing questions for quiz to keep it simple
    await supa.from('quiz_questions').delete().eq('quiz_id', quizRow.id);
    const qPayload = questions.map((q: any, idx: number) => ({
      id: q.id,
      quiz_id: quizRow.id,
      module_id: q.module_id ?? quizRow.module_id,
      difficulty: q.difficulty ?? 'medium',
      qtype: q.qtype ?? 'single',
      prompt: q.prompt,
      media_url: q.media_url ?? null,
      explanation: q.explanation ?? null,
      order_index: q.order_index ?? idx,
    }));
    const { data: insertedQs, error: insQErr } = await supa.from('quiz_questions').insert(qPayload).select();
    if (insQErr) return NextResponse.json({ error: insQErr.message }, { status: 400 });

    const optPayload: any[] = [];
    insertedQs.forEach((row, i) => {
      const opts = questions[i]?.options || [];
      opts.forEach((o: any, j: number) => {
        optPayload.push({
          question_id: row.id,
          label: o.label,
          is_correct: !!o.is_correct,
          order_index: o.order_index ?? j,
        });
      });
    });
    if (optPayload.length) {
      const { error: optErr } = await supa.from('quiz_answer_options').insert(optPayload);
      if (optErr) return NextResponse.json({ error: optErr.message }, { status: 400 });
    }
  }

  return NextResponse.json(quizRow);
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { id, is_published } = body || {};
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supa = service();
  const { data, error } = await supa
    .from('quizzes')
    .update({ is_published })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
