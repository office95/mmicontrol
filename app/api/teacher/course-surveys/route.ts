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
  if (!courseId) return NextResponse.json({ error: 'course_id required' }, { status: 400 });

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

  const { data: survey } = await service
    .from('course_surveys')
    .select('id, title')
    .eq('course_id', courseId)
    .maybeSingle();
  if (!survey) return NextResponse.json({ responses: [] });

  const { data: questions } = await service
    .from('course_survey_questions')
    .select('id, prompt, qtype, options, required, position, extra_text_label')
    .eq('survey_id', survey.id)
    .order('position', { ascending: true });
  const qMap = new Map<string, any>();
  (questions || []).forEach((q) => qMap.set(q.id, q));

  const { data: responses } = await service
    .from('course_survey_responses')
    .select('id, survey_id, booking_id, student_id, submitted_at, course_survey_answers(question_id, value, extra_text)')
    .eq('survey_id', survey.id)
    .order('submitted_at', { ascending: false });

  // Teilnehmerdaten anreichern
  const studentIds = Array.from(new Set((responses || []).map((r) => r.student_id).filter(Boolean))) as string[];
  const studentMap = new Map<string, any>();
  if (studentIds.length) {
    const { data: studs } = await service.from('students').select('id, name, email').in('id', studentIds);
    studs?.forEach((s) => studentMap.set(s.id, s));
  }

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

  return NextResponse.json({ survey, responses: enriched });
}
