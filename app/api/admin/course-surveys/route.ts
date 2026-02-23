import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { course_id, survey, questions } = await req.json();
  if (!course_id) return NextResponse.json({ error: 'course_id fehlt' }, { status: 400 });

  // Nur Admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Upsert survey
  const { data: upserted, error: upErr } = await supabase
    .from('course_surveys')
    .upsert({
      id: survey?.id,
      course_id,
      title: survey?.title || 'Kursfragebogen',
      instructions: survey?.instructions || '',
      open_days_before_start: survey?.open_days_before_start ?? 7,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const surveyId = upserted.id;

  // Überschreiben: alte Fragen löschen, dann neu einfügen
  await supabase.from('course_survey_questions').delete().eq('survey_id', surveyId);

  const payload = (questions || []).map((q: any, idx: number) => ({
    survey_id: surveyId,
    qtype: q.qtype || 'text',
    prompt: q.prompt || 'Frage',
    options: q.options || null,
    required: q.required ?? true,
    position: q.position ?? idx + 1,
    extra_text_label: q.extra_text_label || null,
    extra_text_required: q.extra_text_required ?? false,
  }));

  if (payload.length) {
    const { error: qErr } = await supabase.from('course_survey_questions').insert(payload);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, survey_id: surveyId });
}
