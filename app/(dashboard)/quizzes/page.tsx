import { redirect } from 'next/navigation';
import QuizPlayClient from '@/components/quiz/play-client';
import TopNav from '@/components/top-nav';
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

  const showTabs = profile?.role === 'teacher' || profile?.role === 'student';

  const tabLinks = profile?.role === 'teacher'
    ? [
        { href: '/teacher', label: 'Dashboard' },
        { href: '/teacher/materials', label: 'Kursunterlagen' },
        { href: '/quizzes', label: 'Quiz' },
      ]
    : profile?.role === 'student'
      ? [
          { href: '/student', label: 'Dashboard' },
          { href: '/student?tab=materials', label: 'Kursunterlagen' },
          { href: '/student?tab=feedback', label: 'Kurs Bewertung' },
          { href: '/student/support', label: 'Support' },
          { href: '/student?tab=profile', label: 'Profil' },
        ]
      : [];

  return (
    <main className="space-y-6">
      {showTabs && tabLinks.length > 0 && (
        <nav className="sticky top-0 z-30 -mx-4 px-4 pt-1 pb-3 bg-slate-950/85 border-b border-white/10 backdrop-blur-lg shadow-lg">
          <div className="max-w-6xl mx-auto">
            <TopNav links={tabLinks} />
          </div>
        </nav>
      )}
      {error && <p className="text-sm text-red-300">{error.message}</p>}
      {includeDrafts && <p className="text-xs text-amber-200">Vorschau zeigt auch unveröffentlichte Quizze.</p>}
      {safeQuizzes.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">Keine Quizze vorhanden.</div>
      )}
      {safeQuizzes.length > 0 && <QuizPlayClient quizzes={safeQuizzes as any} initialQuizId={preselectId || safeQuizzes[0]?.id} />}
    </main>
  );
}
