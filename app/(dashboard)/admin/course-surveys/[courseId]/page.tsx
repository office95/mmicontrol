import { createSupabaseServerClient } from '@/lib/supabase-server';
import SurveyEditor from './survey-editor';

export const dynamic = 'force-dynamic';

export default async function CourseSurveyPage({ params }: { params: { courseId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const courseId = params.courseId;
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description')
    .eq('id', courseId)
    .maybeSingle();

  const { data: survey } = await supabase
    .from('course_surveys')
    .select('id, title, instructions, open_days_before_start')
    .eq('course_id', courseId)
    .maybeSingle();

  const surveyId = survey?.id;
  const { data: questions } = surveyId
    ? await supabase
        .from('course_survey_questions')
        .select('id, qtype, prompt, options, required, position, extra_text_label, extra_text_required, archived')
        .eq('survey_id', surveyId)
        .eq('archived', false)
        .order('position', { ascending: true })
    : { data: [] as any[] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-pink-200">Admin · Kursfragebogen</p>
          <h1 className="text-3xl font-semibold text-white">{course?.title || 'Kurs'} · Fragebogen</h1>
          <p className="text-sm text-white/70">Erstelle Fragen, die Teilnehmer vor Kursstart beantworten.</p>
        </div>
        <a href="/admin/courses" className="px-3 py-2 rounded-lg border border-white/15 text-white bg-white/5 hover:border-pink-300">Zurück</a>
      </div>

      <SurveyEditor
        courseId={courseId}
        initialSurvey={survey || null}
        initialQuestions={questions || []}
      />
    </div>
  );
}
