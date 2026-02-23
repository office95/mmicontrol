import { redirect } from 'next/navigation';
import QuizPlayClient from '@/components/quiz/play-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function QuizzesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const previewRequested = (searchParams?.preview ?? '') === '1';
  const courseFilter = typeof searchParams?.course_id === 'string' ? searchParams.course_id : null;
  const preselectId = typeof searchParams?.quiz_id === 'string' ? searchParams.quiz_id : null;
  const mayPreview = profile?.role === 'admin' || profile?.role === 'teacher';
  const includeDrafts = previewRequested && mayPreview;

  const query = supabase
    .from('quizzes')
    .select('id,title,description,course_id,module_id,level_count,time_per_question,is_published')
    .order('created_at', { ascending: false });

  if (courseFilter) query.eq('course_id', courseFilter);

  if (!includeDrafts) query.eq('is_published', true);

  const { data: quizzes, error } = await query;
  const safeQuizzes = quizzes || [];

  return (
    <main className="space-y-6">
      {error && <p className="text-sm text-red-300">{error.message}</p>}
      {includeDrafts && <p className="text-xs text-amber-200">Vorschau zeigt auch unveröffentlichte Quizze.</p>}
      {safeQuizzes.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">Keine Quizze vorhanden.</div>
      )}
      {safeQuizzes.length > 0 && <QuizPlayClient quizzes={safeQuizzes as any} initialQuizId={preselectId || safeQuizzes[0]?.id} />}
    </main>
  );
}
