import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');
  const surveyIdParam = searchParams.get('survey_id');
  const responseIdParam = searchParams.get('response_id');
  if (!courseId && !surveyIdParam) return NextResponse.json({ error: 'course_id or survey_id required' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Lehrer-Berechtigung prüfen
  const { data: membership } = await service
    .from('course_members')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('role', 'teacher')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: profile } = await service
    .from('profiles')
    .select('role, partner_id')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = (profile as any)?.role === 'admin' || (user.user_metadata as any)?.role === 'admin';

  // Partner-Match als zweite Berechtigungsebene
  let isPartnerTeacher = false;
  if (!isAdmin && !membership) {
    const { data: courseRow } = await service
      .from('courses')
      .select('partner_id')
      .eq('id', courseId)
      .maybeSingle();
    const teacherPartner = (profile as any)?.partner_id ?? null;
    if (teacherPartner && courseRow?.partner_id && courseRow.partner_id === teacherPartner) {
      isPartnerTeacher = true;
    }
  }

  if (!isAdmin && !membership && !isPartnerTeacher) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Kurs-Surveys holen
  const { data: surveysBase } = await service
    .from('course_surveys')
    .select('id, title, created_at, course_id')
    .match(
      surveyIdParam
        ? { id: surveyIdParam }
        : { course_id: courseId }
    )
    .order('created_at', { ascending: false });

  // Buchungen des Kurses holen, um Responses über booking_id abzufangen
  const { data: bookings } = courseId
    ? await service
        .from('bookings')
        .select('id')
        .eq('course_id', courseId)
    : { data: [] };
  const bookingIds = (bookings || []).map((b) => b.id);

  const surveyIdsBase = surveysBase?.map((s) => s.id) || [];

  // Responses holen: entweder zu bekannten Survey-IDs oder zu Booking-IDs dieses Kurses
  let responses: any[] = [];
  const { data: responsesData } = await service
    .from('course_survey_responses')
    .select('id, survey_id, booking_id, student_id, submitted_at, course_survey_answers(question_id, value, extra_text)')
    .in('survey_id', surveyIdsBase.length ? surveyIdsBase : surveyIds)
    .order('submitted_at', { ascending: false });
  responses = responsesData || [];

  // Falls explizites response_id noch nicht enthalten, nachladen
  if (responseIdParam && !responses.some((r) => r.id === responseIdParam)) {
    const { data: respSingle } = await service
      .from('course_survey_responses')
      .select('id, survey_id, booking_id, student_id, submitted_at, course_survey_answers(question_id, value, extra_text)')
      .eq('id', responseIdParam)
      .maybeSingle();
    if (respSingle) responses = [respSingle, ...(responses || [])];
  }

  // Survey-IDs um die aus Responses erweitern (falls Responses existieren, aber Survey nicht über course_id geholt wurde)
  const surveyIds = Array.from(new Set([
    ...surveyIdsBase,
    ...((responses || []).map((r) => r.survey_id).filter(Boolean) as string[]),
  ]));

  if (!surveyIds.length) return NextResponse.json({ surveys: [], responses: [] });

  // Surveys nachladen für alle IDs (falls durch Responses ergänzt)
  const { data: surveys } = await service
    .from('course_surveys')
    .select('id, title, created_at, course_id')
    .in('id', surveyIds)
    .order('created_at', { ascending: false });

  // Alle Fragen aller Surveys laden
  const { data: questionsAll } = await service
    .from('course_survey_questions')
    .select('id, survey_id, prompt, qtype, options, required, position, extra_text_label')
    .in('survey_id', surveyIds)
    .order('position', { ascending: true });

  // Teilnehmerdaten anreichern
  const studentIds = Array.from(new Set((responses || []).map((r) => r.student_id).filter(Boolean))) as string[];
  const studentMap = new Map<string, any>();
  if (studentIds.length) {
    const { data: studs } = await service.from('students').select('id, name, email').in('id', studentIds);
    studs?.forEach((s) => studentMap.set(s.id, s));
  }

  const qMap = new Map<string, any>();
  (questionsAll || []).forEach((q) => qMap.set(q.id, q));

  const enriched = (responses || []).map((r) => {
    return {
      ...r,
      student_name: studentMap.get(r.student_id || '')?.name || studentMap.get(r.student_id || '')?.email || '—',
      student_email: studentMap.get(r.student_id || '')?.email || '—',
      answers: (r as any).course_survey_answers?.map((a: any) => {
        const q = qMap.get(a.question_id);
        return {
          prompt: q?.prompt || 'Frage',
          qtype: q?.qtype,
          value: a.value,
          extra_text_label: q?.extra_text_label,
          extra_text: a.extra_text,
        };
      }) || [],
    };
  });

  return NextResponse.json({ surveys, responses: enriched });
}
