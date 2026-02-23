import { createSupabaseServerClient } from '@/lib/supabase-server';
import SurveyForm from './survey-form';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SurveyPage({ params, searchParams }: { params: { surveyId: string }, searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const bookingId = typeof searchParams.booking_id === 'string' ? searchParams.booking_id : null;
  if (!bookingId) return <div className="text-white p-6">booking_id fehlt.</div>;

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/student/surveys/${params.surveyId}?booking_id=${bookingId}`, {
    headers: { cookie: '' }, // handled server-side in route
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) return <div className="text-white p-6">Nicht gefunden oder keine Berechtigung.</div>;
  const data = await res.json();

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border border-white/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-pink-200">Kursfragebogen</p>
          <h1 className="text-3xl font-semibold">{data?.survey?.title || 'Fragebogen'}</h1>
          <p className="text-sm text-white/80">Kurs: {data?.booking?.course_title || data?.survey?.course_id}</p>
          {data?.survey?.instructions && <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{data.survey.instructions}</p>}
        </div>

        <SurveyForm survey={data.survey} questions={data.questions || []} bookingId={bookingId} />
      </div>
    </div>
  );
}
