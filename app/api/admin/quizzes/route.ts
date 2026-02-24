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

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supa = service();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const course_id = searchParams.get('course_id');

  if (id) {
  const { data: quiz, error: qErr } = await supa
    .from('quizzes')
    .select('id,title,description,cover_url,course_id,module_id,is_published,level_count,time_per_question,created_at')
    .eq('id', id)
    .maybeSingle();
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
    if (!quiz) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const { data: questions, error: qsErr } = await supa
      .from('quiz_questions')
      .select('id,quiz_id,module_id,module_number,difficulty,qtype,prompt,media_url,explanation,order_index,quiz_answer_options(id,label,is_correct,order_index)')
      .eq('quiz_id', id)
      .order('order_index', { ascending: true });
    if (qsErr) return NextResponse.json({ error: qsErr.message }, { status: 400 });

    return NextResponse.json({
      quiz,
      questions: (questions || []).map((q: any) => ({
        ...q,
        module_number: q.module_number ?? null,
        options: (q.quiz_answer_options || []).sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      })),
    });
  }

  const query = supa
    .from('quizzes')
    .select('id,title,description,cover_url,course_id,module_id,is_published,level_count,time_per_question,created_at')
    .order('created_at', { ascending: false });

  if (course_id) query.eq('course_id', course_id);

  const { data, error } = await query;
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
        cover_url: quiz.cover_url ?? null,
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
    const inputQs = (questions || []).map((q: any, i: number) => ({
      ...q,
      order_index: q.order_index ?? i,
      prompt: (q.prompt || '').trim(),
      id: q.id && typeof q.id === 'string' && q.id.trim().length ? q.id : undefined,
    }));

    const toInsert = inputQs.filter((q) => !q.id).map((q) => ({
      quiz_id: quizRow.id,
      module_id: null,
      module_number: q.module_number ?? null,
      difficulty: q.difficulty ?? 'medium',
      qtype: q.qtype ?? 'single',
      prompt: q.prompt,
      media_url: q.media_url ?? null,
      explanation: q.explanation ?? null,
      order_index: q.order_index,
    }));

    const toUpdate = inputQs.filter((q) => q.id).map((q) => ({
      id: q.id,
      quiz_id: quizRow.id,
      module_id: null,
      module_number: q.module_number ?? null,
      difficulty: q.difficulty ?? 'medium',
      qtype: q.qtype ?? 'single',
      prompt: q.prompt,
      media_url: q.media_url ?? null,
      explanation: q.explanation ?? null,
      order_index: q.order_index,
    }));

    let inserted: any[] = [];
    if (toInsert.length) {
      const { data: ins, error: insErr } = await supa.from('quiz_questions').insert(toInsert).select();
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
      inserted = ins || [];
    }

    let updated: any[] = [];
    if (toUpdate.length) {
      const { data: upd, error: updErr } = await supa.from('quiz_questions').upsert(toUpdate, { onConflict: 'id' }).select();
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
      updated = upd || [];
    }

    // IDs in Original-Reihenfolge abbilden
    const idForPosition: string[] = [];
    let insIdx = 0;
    let updIdx = 0;
    inputQs.forEach((q) => {
      if (q.id) {
        idForPosition.push(updated[updIdx++]?.id || q.id!);
      } else {
        idForPosition.push(inserted[insIdx++]?.id || null);
      }
    });

    // Optionen neu aufbauen: nur für die zugeordneten Fragen
    const validTargetIds = idForPosition.filter(Boolean) as string[];
    if (validTargetIds.length) {
      await supa.from('quiz_answer_options').delete().in('question_id', validTargetIds);
    }

    const optPayload: any[] = [];
    inputQs.forEach((q: any, i: number) => {
      const targetId = idForPosition[i];
      if (!targetId) return;
      const opts = q.options || [];
      opts.forEach((o: any, j: number) => {
        optPayload.push({
          question_id: targetId,
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

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supa = service();
  const { error } = await supa.from('quizzes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
