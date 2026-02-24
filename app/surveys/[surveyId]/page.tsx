import { createSupabaseServerClient } from '@/lib/supabase-server';
import SurveyForm from './survey-form';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SurveyPage({ params, searchParams }: { params: { surveyId: string }, searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const bookingId = typeof searchParams.booking_id === 'string' ? searchParams.booking_id : null;
  const isPreview = searchParams.preview === '1';

  if (!bookingId && !isPreview) return <div className="text-white p-6">booking_id fehlt.</div>;

  let data: any = null;

  if (isPreview) {
    const { data: survey, error: surveyErr } = await supabase.from('course_surveys').select('*').eq('id', params.surveyId).single();
    const { data: questions, error: qErr } = await supabase.from('course_survey_questions').select('*').eq('survey_id', params.surveyId).order('position');
    if (surveyErr || qErr || !survey) return <div className="text-white p-6">Vorschau nicht möglich.</div>;
    data = { survey, questions, booking: { course_title: survey.course_id } };
  } else {
    // Direkt über Supabase (bypass fetch, behält Session)
    const { data: survey } = await supabase
      .from('course_surveys')
      .select('id, course_id, title, instructions')
      .eq('id', params.surveyId)
      .maybeSingle();
    if (!survey) return <div className="text-white p-6">Nicht gefunden oder keine Berechtigung.</div>;

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, course_id, course_title, student_id, student_email, course_dates(start_date)')
      .eq('id', bookingId!)
      .maybeSingle();
    if (!booking || booking.course_id !== survey.course_id) return <div className="text-white p-6">Nicht gefunden oder keine Berechtigung.</div>;

    const { data: questions } = await supabase
      .from('course_survey_questions')
      .select('id, qtype, prompt, options, required, position, extra_text_label, extra_text_required')
      .eq('survey_id', survey.id)
      .order('position', { ascending: true });

    data = { survey, questions, booking };
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border border-white/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-pink-200">Kursfragebogen</p>
          <h1 className="text-3xl font-semibold">{data?.survey?.title || 'Fragebogen'}</h1>
          <p className="text-sm text-white/80">Kurs: {data?.booking?.course_title || data?.survey?.course_id}</p>
          {data?.survey?.instructions && <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{data.survey.instructions}</p>}
        </div>

        <SurveyForm survey={data.survey} questions={data.questions || []} bookingId={bookingId || 'preview'} preview={isPreview} />
      </div>
    </div>
  );
}
