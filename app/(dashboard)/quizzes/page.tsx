import { redirect } from 'next/navigation';
import QuizPlayClient from '@/components/quiz/play-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function QuizzesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('id,title,description,course_id,module_id,level_count,time_per_question,is_published')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const safeQuizzes = quizzes || [];

  return (
    <main className="space-y-6">
      {error && <p className="text-sm text-red-300">{error.message}</p>}
      {safeQuizzes.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">Keine Quizze vorhanden.</div>
      )}
      {safeQuizzes.length > 0 && <QuizPlayClient quizzes={safeQuizzes as any} />}
    </main>
  );
}
