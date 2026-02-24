import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let courseId = searchParams.get('course_id');
  const surveyIdParam = searchParams.get('survey_id');
  const responseIdParam = searchParams.get('response_id');
  if (!courseId && !surveyIdParam) return NextResponse.json({ error: 'course_id or survey_id required' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Falls nur survey_id gegeben, Kurs dazu laden
  if (!courseId && surveyIdParam) {
    const { data: surveyCourse } = await service
      .from('course_surveys')
      .select('course_id')
      .eq('id', surveyIdParam)
      .maybeSingle();
    courseId = surveyCourse?.course_id ?? null;
  }

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

  // Neue, robuste Variante: alles aus View v_teacher_course_surveys holen
  const filters: any = {};
  if (courseId) filters.course_id = courseId;
  if (surveyIdParam) filters.survey_id = surveyIdParam;

  const { data: viewRows } = await service
    .from('v_teacher_course_surveys')
    .select('survey_id, course_id, survey_title, survey_created_at, response_id, booking_id, student_id, submitted_at, question_id, value, extra_text')
    .match(filters)
    .order('submitted_at', { ascending: false });

  const surveysMap = new Map<string, { id: string; course_id: string; title: string; created_at: string | null }>();
  const responsesMap = new Map<string, { id: string; survey_id: string; booking_id: string | null; student_id: string | null; submitted_at: string | null; answers: any[] }>();

  (viewRows || []).forEach((r) => {
    if (!surveysMap.has(r.survey_id)) {
      surveysMap.set(r.survey_id, {
        id: r.survey_id,
        course_id: r.course_id,
        title: r.survey_title,
        created_at: r.survey_created_at,
      });
    }
    if (r.response_id) {
      const resp = responsesMap.get(r.response_id) || {
        id: r.response_id,
        survey_id: r.survey_id,
        booking_id: r.booking_id,
        student_id: r.student_id,
        submitted_at: r.submitted_at,
        answers: [],
      };
      if (r.question_id) {
        resp.answers.push({
          question_id: r.question_id,
          value: r.value,
          extra_text: r.extra_text,
        });
      }
      responsesMap.set(r.response_id, resp);
    }
  });

  const surveys = Array.from(surveysMap.values());
  const responses = Array.from(responsesMap.values());

  // Fragen für die Surveys laden, um Prompts zu ergänzen
  const questionIds = Array.from(new Set((viewRows || []).map((r) => r.question_id).filter(Boolean) as string[]));
  const { data: questionsAll } = questionIds.length
    ? await service
        .from('course_survey_questions')
        .select('id, survey_id, prompt, qtype, options, required, position, extra_text_label')
        .in('id', questionIds)
    : { data: [] };
  const qMap = new Map<string, any>();
  (questionsAll || []).forEach((q) => qMap.set(q.id, q));

  // Teilnehmerdaten anreichern
  const studentIds = Array.from(new Set(responses.map((r) => r.student_id).filter(Boolean))) as string[];
  const studentMap = new Map<string, any>();
  if (studentIds.length) {
    const { data: studs } = await service.from('students').select('id, name, email').in('id', studentIds);
    studs?.forEach((s) => studentMap.set(s.id, s));
  }

  const enriched = responses.map((r) => ({
    ...r,
    student_name: studentMap.get(r.student_id || '')?.name || studentMap.get(r.student_id || '')?.email || '—',
    student_email: studentMap.get(r.student_id || '')?.email || '—',
    answers: (r.answers || []).map((a: any) => {
      const q = qMap.get(a.question_id);
      return {
        prompt: q?.prompt || 'Frage',
        qtype: q?.qtype,
        value: a.value,
        extra_text_label: q?.extra_text_label,
        extra_text: a.extra_text,
      };
    }),
  }));

  return NextResponse.json({ surveys, responses: enriched });
}
