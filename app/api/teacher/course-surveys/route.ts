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

  // Hinweis: Service-Role verwendet; keine zusätzliche Teacher-RLS hier, View filtert nach Bedarf

  // Neue, robuste Variante: alles aus View v_teacher_course_surveys holen.
  // Wichtig: Bisher wurde strikt nach teacher_id gefiltert. Das blockiert
  // Dozenten ohne expliziten course_members-Eintrag, obwohl sie über
  // partner_id Zugriff auf Kurse haben (Teacher-Dashboard zeigt diese Kurse
  // schon an). Daher filtern wir hier nach Partner und optional Kurs/Survey,
  // nicht mehr ausschließlich nach teacher_id.
  const filters: any = {};
  if (courseId) filters.course_id = courseId;
  if (surveyIdParam) filters.survey_id = surveyIdParam;

  const { data: profile } = await service
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .maybeSingle();
  const teacherPartner = (profile as any)?.partner_id ?? null;

  const { data: viewRows } = await service
    .from('v_teacher_course_surveys')
    .select('teacher_id, survey_id, course_id, course_partner_id, survey_title, survey_created_at, response_id, booking_id, student_id, submitted_at, question_id, value, extra_text')
    .match(filters)
    .order('submitted_at', { ascending: false });

  // Sicherheitsfilter: Dozenten sehen nur Kurse ihres Partners (Standardfall)
  // oder – falls kein Partner gesetzt sein sollte – nur eigene course_members.
  let filteredRows = teacherPartner
    ? (viewRows || []).filter((r) => r.course_partner_id === teacherPartner)
    : (viewRows || []).filter((r) => r.teacher_id === user.id);

  // Fallback: Wenn wegen fehlender course_members-Einträge keine Rows gefunden wurden,
  // aber ein Partner gesetzt ist, hole Surveys + Responses direkt über Partner-Filter.
  if ((!filteredRows || filteredRows.length === 0) && teacherPartner) {
    // 1) Surveys der Partner-Kurse
    const { data: partnerSurveys } = await service
      .from('course_surveys')
      .select('id, course_id, title, created_at, courses(partner_id)')
      .eq('courses.partner_id', teacherPartner);

    const surveysScoped = (partnerSurveys || []).filter((s: any) =>
      (!courseId || s.course_id === courseId) && (!surveyIdParam || s.id === surveyIdParam)
    );

    const surveyIdsScoped = surveysScoped.map((s: any) => s.id);

    // 2) Responses + Answers für diese Surveys
    const { data: responsesRaw } = surveyIdsScoped.length
      ? await service
          .from('course_survey_responses')
          .select('id, survey_id, booking_id, student_id, submitted_at')
          .in('survey_id', surveyIdsScoped)
      : { data: [] };

    const responseIds = (responsesRaw || []).map((r) => r.id);
    const { data: answersRaw } = responseIds.length
      ? await service
          .from('course_survey_answers')
          .select('response_id, question_id, value, extra_text')
          .in('response_id', responseIds)
      : { data: [] };

    const answersByResponse = new Map<string, any[]>();
    (answersRaw || []).forEach((a: any) => {
      const list = answersByResponse.get(a.response_id) || [];
      list.push(a);
      answersByResponse.set(a.response_id, list);
    });

    const getPartnerId = (survey: any) => {
      if (!survey) return teacherPartner;
      const c = (survey as any).courses;
      if (Array.isArray(c)) return c[0]?.partner_id ?? teacherPartner;
      return c?.partner_id ?? teacherPartner;
    };

    filteredRows = [];
    (responsesRaw || []).forEach((r) => {
      const survey = surveysScoped.find((s: any) => s.id === r.survey_id);
      const coursePartnerId = getPartnerId(survey);
      const answers = answersByResponse.get(r.id) || [];
      answers.forEach((a: any) => {
        filteredRows!.push({
          teacher_id: user.id,
          survey_id: r.survey_id,
          course_id: survey?.course_id ?? null,
          course_partner_id: coursePartnerId,
          survey_title: survey?.title ?? 'Fragebogen',
          survey_created_at: survey?.created_at ?? null,
          response_id: r.id,
          booking_id: r.booking_id,
          student_id: r.student_id,
          submitted_at: r.submitted_at,
          question_id: a.question_id,
          value: a.value,
          extra_text: a.extra_text,
        });
      });
      // Falls keine Antworten (sollte selten vorkommen), trotzdem Response pushen
      if (!answers.length) {
        filteredRows!.push({
          teacher_id: user.id,
          survey_id: r.survey_id,
          course_id: survey?.course_id ?? null,
          course_partner_id: coursePartnerId,
          survey_title: survey?.title ?? 'Fragebogen',
          survey_created_at: survey?.created_at ?? null,
          response_id: r.id,
          booking_id: r.booking_id,
          student_id: r.student_id,
          submitted_at: r.submitted_at,
          question_id: null,
          value: null,
          extra_text: null,
        });
      }
    });
  }

  const surveysMap = new Map<string, { id: string; course_id: string; title: string; created_at: string | null }>();
  type AnswerEntry = { question_id: string | null; value: any; extra_text: any };
  type ResponseEntry = {
    id: string;
    survey_id: string;
    booking_id: string | null;
    student_id: string | null;
    submitted_at: string | null;
    answers: AnswerEntry[];
  };

  const responsesMap = new Map<string, ResponseEntry>();

  (filteredRows || []).forEach((r) => {
    if (!surveysMap.has(r.survey_id)) {
      surveysMap.set(r.survey_id, {
        id: r.survey_id,
        course_id: r.course_id,
        title: r.survey_title,
        created_at: r.survey_created_at,
      });
    }
    if (r.response_id) {
      const resp: ResponseEntry = responsesMap.get(r.response_id) || {
        id: r.response_id,
        survey_id: r.survey_id,
        booking_id: r.booking_id,
        student_id: r.student_id,
        submitted_at: r.submitted_at,
        answers: [] as AnswerEntry[],
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
  const questionIds = Array.from(new Set((filteredRows || []).map((r) => r.question_id).filter(Boolean) as string[]));
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
