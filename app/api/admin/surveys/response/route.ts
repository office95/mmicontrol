import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get('response_id');
  const surveyId = searchParams.get('survey_id');
  const bookingId = searchParams.get('booking_id');
  const studentId = searchParams.get('student_id');
  const studentEmail = searchParams.get('student_email');

  let resp: any = null;
  let error: any = null;

  if (responseId) {
    const res = await service
      .from('course_survey_responses')
      .select('id, survey_id, student_id, booking_id, submitted_at, archived_at')
      .eq('id', responseId)
      .maybeSingle();
    resp = res.data;
    error = res.error;
  } else if (surveyId && (bookingId || studentId || studentEmail)) {
    let query = service
      .from('course_survey_responses')
      .select('id, survey_id, student_id, booking_id, submitted_at, archived_at')
      .eq('survey_id', surveyId);
    if (bookingId) query = query.eq('booking_id', bookingId);
    if (studentId) query = query.eq('student_id', studentId);
    const res = await query.maybeSingle();
    resp = res.data;
    error = res.error;
    // Wenn kein Treffer und studentEmail vorhanden: versuche Match via booking email
    if (!resp && studentEmail) {
      const res2 = await service
        .from('course_survey_responses')
        .select('id, survey_id, student_id, booking_id, submitted_at, archived_at, bookings!inner(student_email)')
        .eq('survey_id', surveyId)
        .eq('bookings.student_email', studentEmail)
        .maybeSingle();
      resp = res2.data;
      error = res2.error;
    }
  }

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
    .eq('response_id', resp.id);

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
    student_email: student?.email || studentEmail || null,
    answers: (answers || []).map((a) => ({
      prompt: qMap.get(a.question_id)?.prompt || 'Frage',
      value: a.value,
      extra_text_label: qMap.get(a.question_id)?.extra_text_label,
      extra_text: a.extra_text,
    })),
  });
}
