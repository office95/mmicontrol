import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // 1) Buchungen mit Kurs, Partner, Startdatum, Student
  const { data: bookings, error: bErr } = await service
    .from('bookings')
    .select(`
      id,
      course_id,
      course_date_id,
      booking_date,
      created_at,
      partner_id,
      student_id,
      student_email,
      course_title,
      course_dates(start_date),
      courses(id, title, partner_id),
      partners:partner_id(name),
      students(name, email)
    `)
    .order('created_at', { ascending: false });

  if (bErr) {
    console.error('survey status bookings error', bErr);
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  const courseIds = Array.from(new Set((bookings || []).map((b) => b.course_id).filter(Boolean)));

  // 2) Surveys je Kurs
  const { data: surveys, error: sErr } = courseIds.length
    ? await service
        .from('course_surveys')
        .select('id, course_id, created_at')
        .in('course_id', courseIds)
    : { data: [], error: null };
  if (sErr) {
    console.error('survey status surveys error', sErr);
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  const surveyIds = (surveys || []).map((s) => s.id);

  // 3) Responses zu diesen Surveys
  const { data: responses, error: rErr } = surveyIds.length
    ? await service
        .from('course_survey_responses')
        .select('id, survey_id, student_id, booking_id, submitted_at, archived_at')
        .in('survey_id', surveyIds)
    : { data: [], error: null };
  if (rErr) {
    console.error('survey status responses error', rErr);
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  const surveyByCourse = new Map<string, any[]>();
  (surveys || []).forEach((s) => {
    const list = surveyByCourse.get(s.course_id) || [];
    list.push(s);
    surveyByCourse.set(s.course_id, list);
  });

  const responsesBySurvey = new Map<string, any[]>();
  (responses || []).forEach((r) => {
    const list = responsesBySurvey.get(r.survey_id) || [];
    list.push(r);
    responsesBySurvey.set(r.survey_id, list);
  });

  const rows = (bookings || []).map((b) => {
    const courseSurveyList = surveyByCourse.get(b.course_id) || [];
    const chosenSurvey = courseSurveyList[0]; // älteste/erste
    let response = null;
    if (chosenSurvey) {
      const candidates = responsesBySurvey.get(chosenSurvey.id) || [];
      response =
        candidates.find((r) => r.booking_id === b.id) ||
        candidates.find((r) => r.student_id && b.student_id && r.student_id === b.student_id) ||
        null;
    }
    const status = response
      ? response.archived_at
        ? 'archiviert'
        : 'eingereicht'
      : 'offen';

    return {
      booking_id: b.id,
      course_id: b.course_id,
      course_title: b.course_title || b.courses?.title || 'Kurs',
      start_date: b.course_dates?.start_date || null,
      partner_name: b.partners?.name || null,
      survey_id: chosenSurvey?.id || null,
      response_id: response?.id || null,
      submitted_at: response?.submitted_at || null,
      archived_at: response?.archived_at || null,
      student_name: b.students?.name || null,
      student_email: b.students?.email || b.student_email || null,
      status,
    };
  });

  return NextResponse.json(rows);
}
