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
  const courseId = searchParams.get('course_id');

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
    // Zweiter Fallback: bei booking_id einfach letzte Response zu dieser Booking nehmen
    if (!resp && bookingId) {
      const res3 = await service
        .from('course_survey_responses')
        .select('id, survey_id, student_id, booking_id, submitted_at, archived_at')
        .eq('booking_id', bookingId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      resp = res3.data;
      error = res3.error;
    }
    // Dritter Fallback: wenn course_id vorhanden, nimm eine Response zu einem Survey dieses Kurses (matching student/booking optional)
    if (!resp && courseId) {
      const { data: courseSurveys } = await service
        .from('course_surveys')
        .select('id')
        .eq('course_id', courseId);
      const courseSurveyIds = (courseSurveys || []).map((c) => c.id);
      if (courseSurveyIds.length) {
        let query = service
          .from('course_survey_responses')
          .select('id, survey_id, student_id, booking_id, submitted_at, archived_at')
          .in('survey_id', courseSurveyIds)
          .order('submitted_at', { ascending: false });
        if (studentId) query = query.eq('student_id', studentId);
        if (bookingId) query = query.eq('booking_id', bookingId);
        const res4 = await query.limit(1).maybeSingle();
        resp = res4.data;
        error = res4.error;
      }
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

  let { data: answers } = await service
    .from('course_survey_answers')
    .select('question_id, value, extra_text')
    .eq('response_id', resp.id);

  // Fallback: falls keine Antworten gefunden wurden (z.B. Inkonsistenz), versuche über View v_teacher_course_surveys
  if (!answers || !answers.length) {
    const { data: viewRows } = await service
      .from('v_teacher_course_surveys')
      .select('question_id, value, extra_text')
      .eq('response_id', resp.id);
    answers = viewRows || [];
  }

  const qIds = Array.from(new Set((answers || []).map((a) => a.question_id).filter(Boolean) as string[]));
  const { data: questions } = qIds.length
    ? await service.from('course_survey_questions').select('id, prompt, extra_text_label').in('id', qIds)
    : { data: [] };
  const qMap = new Map<string, any>();
  (questions || []).forEach((q) => qMap.set(q.id, q));

  // Hardcoded prompt overrides for Music Producer survey (to compensate placeholder prompts)
  const promptOverrides: Record<string, string> = {
    '6665fb14-ed48-4d1a-a34f-52f34d5eaf76': 'Welche Genres oder Musikstile interessieren dich besonders?',
    '8149367f-18bc-4f14-ac78-595aaf21422b': 'Hast du bereits Erfahrung in der Musikproduktion?',
    'f2d5b97b-74f1-4c46-bddc-ca3080074c01': 'Nachname',
    'dc7ec2a7-0be6-4015-8ff2-5683e3ee9d6b': 'Telefonnummer',
    '41a461a7-2c0b-4fb5-af69-0b6a9f08c69e': 'Wie schätzt du dein aktuelles Wissen in der Musikproduktion ein?',
    'df557bfe-26af-4746-a00f-4b823e943fac': 'Vorname',
    '15bdfae7-0e47-4988-8f66-e99ffe0d99ca': 'Falls ja, welche DAWs hast du bereits genutzt?',
    '85e0c71d-4258-433b-98ae-06fcf7dec5af': 'Falls ja, wie lange beschäftigst du dich schon mit Musikproduktion?',
    'e8bf8e88-9349-4a48-95aa-d40712842965': 'Was sind deine Hauptziele für diesen Kurs?',
    'a5ab2139-837d-4af6-9af4-6742c734192c': 'Email',
    'b79172ee-89b6-4240-bd61-22ff286b8d42': 'Hast du Erfahrung mit DAWs (Digital Audio Workstations)?',
    '59e17791-5a03-4204-a8ef-869e89c91ded': 'Hast du schon an Musikproduktionskursen teilgenommen?',
  };

  return NextResponse.json({
    response_id: resp.id,
    survey_id: resp.survey_id,
    survey_title: survey?.title || 'Fragebogen',
    submitted_at: resp.submitted_at,
    archived_at: resp.archived_at,
    student_name: student?.name || null,
    student_email: student?.email || studentEmail || null,
    answers: (answers || []).map((a) => {
      const q = a.question_id ? qMap.get(a.question_id) : null;
      const override = a.question_id ? promptOverrides[a.question_id] : null;
      return {
        prompt: override || q?.prompt || 'Frage',
        value: a.value,
        extra_text_label: q?.extra_text_label,
        extra_text: a.extra_text,
      };
    }),
  });
}
