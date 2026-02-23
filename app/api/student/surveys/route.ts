import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const email = (user.email || '').toLowerCase();

  // Buchungen des Nutzers (über student_id oder student_email)
  const orParts = [
    `student_email.eq.${email}`,
    `student_id.eq.${user.id}`,
  ];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, course_id, course_date_id, student_id, course_title, booking_date, course_dates(start_date)')
    .or(orParts.join(','));

  if (!bookings?.length) return NextResponse.json([]);

  // Surveys je Kurs holen
  const courseIds = Array.from(new Set(bookings.map((b) => b.course_id).filter(Boolean))) as string[];
  if (!courseIds.length) return NextResponse.json([]);

  const { data: surveys } = await supabase
    .from('course_surveys')
    .select('id, course_id, title, instructions, open_days_before_start')
    .in('course_id', courseIds);

  if (!surveys?.length) return NextResponse.json([]);

  // Responses des Nutzers holen
  const surveyIds = surveys.map((s) => s.id);
  const { data: responses } = await supabase
    .from('course_survey_responses')
    .select('survey_id, booking_id')
    .eq('student_id', user.id)
    .in('survey_id', surveyIds);
  const responded = new Set((responses || []).map((r) => `${r.survey_id}_${r.booking_id}`));

  const today = new Date();
  const open = bookings.flatMap((b) => {
    if (!b.course_id) return [] as any[];
    const survey = surveys.find((s) => s.course_id === b.course_id);
    if (!survey) return [];
    const startDateVal = Array.isArray(b.course_dates) ? b.course_dates[0]?.start_date : (b as any).course_dates?.start_date;
    const start = startDateVal ? new Date(startDateVal) : null;
    if (!start) return [];
    const openDays = survey.open_days_before_start ?? 7;
    const openDate = new Date(start);
    openDate.setDate(openDate.getDate() - openDays);
    if (today < openDate) return [];
    if (responded.has(`${survey.id}_${b.id}`)) return [];
    const startDateVal2 = Array.isArray(b.course_dates) ? b.course_dates[0]?.start_date : (b as any).course_dates?.start_date;
    return [{
      survey_id: survey.id,
      course_id: b.course_id,
      course_title: b.course_title,
      booking_id: b.id,
      title: survey.title,
      instructions: survey.instructions,
      start_date: startDateVal2,
      open_days_before_start: survey.open_days_before_start,
    }];
  });

  return NextResponse.json(open);
}
