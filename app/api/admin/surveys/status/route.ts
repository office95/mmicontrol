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
      courses(id, title),
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

    // Versuche zuerst einen Survey zu finden, der eine Response für diese Booking/Student hat
    let chosenSurvey: any = null;
    let response: any = null;
    for (const s of courseSurveyList) {
      const candidates = responsesBySurvey.get(s.id) || [];
      response =
        candidates.find((r) => r.booking_id === b.id) ||
        candidates.find((r) => r.student_id && b.student_id && r.student_id === b.student_id) ||
        null;
      if (response) {
        chosenSurvey = s;
        break;
      }
    }
    // Fallback: nimm erste Survey, auch wenn keine Response
    if (!chosenSurvey) {
      chosenSurvey = courseSurveyList[0] || null;
    }

    const status = response
      ? response.archived_at
        ? 'archiviert'
        : 'eingereicht'
      : 'offen';

    const courseTitle =
      b.course_title ||
      (Array.isArray(b.courses) ? (b.courses[0] as any)?.title : (b.courses as any)?.title) ||
      'Kurs';

    const startDate = Array.isArray(b.course_dates)
      ? (b.course_dates[0] as any)?.start_date
      : (b.course_dates as any)?.start_date;

    const partnerName = Array.isArray(b.partners)
      ? (b.partners[0] as any)?.name
      : (b.partners as any)?.name;

    const studentName = Array.isArray(b.students)
      ? (b.students[0] as any)?.name
      : (b.students as any)?.name;
    const studentEmail = Array.isArray(b.students)
      ? (b.students[0] as any)?.email
      : (b.students as any)?.email;

    return {
      booking_id: b.id,
      course_id: b.course_id,
      course_title: courseTitle,
      start_date: startDate || null,
      partner_name: partnerName || null,
      survey_id: chosenSurvey?.id || null,
      response_id: response?.id || null,
      submitted_at: response?.submitted_at || null,
      archived_at: response?.archived_at || null,
      student_name: studentName || null,
      student_email: studentEmail || b.student_email || null,
      student_id: b.student_id || null,
      status,
    };
  });

  return NextResponse.json(rows);
}
