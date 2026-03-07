import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get('response_id');
  if (!responseId) return NextResponse.json({ error: 'response_id required' }, { status: 400 });

  const { data: resp, error } = await service
    .from('course_survey_responses')
    .select('id, survey_id, student_id, booking_id, submitted_at, archived_at')
    .eq('id', responseId)
    .maybeSingle();
  if (error || !resp) return NextResponse.json({ error: error?.message || 'not found' }, { status: 404 });

  const { data: survey } = await service
    .from('course_surveys')
    .select('id, title, course_id')
    .eq('id', resp.survey_id)
    .maybeSingle();

  const { data: student } = resp.student_id
    ? await service.from('students').select('id, name, email').eq('id', resp.student_id).maybeSingle()
    : { data: null };

  const { data: answers } = await service
    .from('course_survey_answers')
    .select('question_id, value, extra_text')
    .eq('response_id', responseId);

  const qIds = Array.from(new Set((answers || []).map((a) => a.question_id).filter(Boolean) as string[]));
  const { data: questions } = qIds.length
    ? await service.from('course_survey_questions').select('id, prompt, extra_text_label').in('id', qIds)
    : { data: [] };
  const qMap = new Map<string, any>();
  (questions || []).forEach((q) => qMap.set(q.id, q));

  return NextResponse.json({
    response_id: resp.id,
    survey_id: resp.survey_id,
    survey_title: survey?.title || 'Fragebogen',
    submitted_at: resp.submitted_at,
    archived_at: resp.archived_at,
    student_name: student?.name || null,
    student_email: student?.email || null,
    answers: (answers || []).map((a) => ({
      prompt: qMap.get(a.question_id)?.prompt || 'Frage',
      value: a.value,
      extra_text_label: qMap.get(a.question_id)?.extra_text_label,
      extra_text: a.extra_text,
    })),
  });
}
