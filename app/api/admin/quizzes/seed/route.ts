import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function isAdmin() {
  const supa = createSupabaseRouteClient();
  const { data } = await supa.auth.getUser();
  if (!data.user) return false;
  const svc = service();
  const { data: profile } = await svc.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin';
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supa = service();

  const { data: course } = await supa.from('courses').select('id,title').limit(1).maybeSingle();
  if (!course) return NextResponse.json({ error: 'no course found to attach quiz' }, { status: 400 });

  const quiz = {
    title: 'Harmonielehre Quickcheck',
    description: 'Level-basiertes Quiz rund um Intervalle, Akkorde und Stufen.',
    course_id: course.id,
    level_count: 5,
    time_per_question: 25,
    is_published: true,
  };

  const questions = [
    {
      prompt: 'Welches Intervall liegt zwischen C und G?',
      difficulty: 'easy',
      qtype: 'single',
      options: [
        { label: 'Quinte', is_correct: true },
        { label: 'Quarte' },
        { label: 'Terz' },
        { label: 'Sekunde' },
      ],
    },
    {
      prompt: 'Welche Töne enthält ein Cmaj7-Akkord?',
      difficulty: 'medium',
      qtype: 'multiple',
      options: [
        { label: 'C', is_correct: true },
        { label: 'E', is_correct: true },
        { label: 'G', is_correct: true },
        { label: 'B/H', is_correct: true },
        { label: 'D' },
      ],
    },
    {
      prompt: 'True or False: Ein verminderter Akkord besteht aus lauter kleinen Terzen.',
      difficulty: 'medium',
      qtype: 'boolean',
      options: [
        { label: 'Ja', is_correct: true },
        { label: 'Nein' },
      ],
    },
    {
      prompt: 'Ordne die Stufen in C-Dur nach Stärke der Spannung (niedrig → hoch).',
      difficulty: 'hard',
      qtype: 'order',
      options: [
        { label: 'Tonika (I)', is_correct: true },
        { label: 'Subdominante (IV)', is_correct: true },
        { label: 'Dominante (V)', is_correct: true },
      ],
    },
    {
      prompt: 'Welches Bild zeigt einen Dominantseptakkord in enger Lage?',
      difficulty: 'hard',
      qtype: 'media',
      media_url: 'https://dummyimage.com/600x200/111827/ffffff&text=Dominant7',
      options: [
        { label: 'Bild A', is_correct: true },
        { label: 'Bild B' },
        { label: 'Bild C' },
      ],
    },
  ];

  const { data: quizRow, error: qErr } = await supa
    .from('quizzes')
    .insert({ ...quiz })
    .select()
    .single();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

  const qPayload = questions.map((q, idx) => ({
    quiz_id: quizRow.id,
    difficulty: q.difficulty,
    qtype: q.qtype,
    prompt: q.prompt,
    media_url: q.media_url ?? null,
    order_index: idx,
  }));

  const { data: insertedQs, error: qsErr } = await supa.from('quiz_questions').insert(qPayload).select();
  if (qsErr) return NextResponse.json({ error: qsErr.message }, { status: 400 });

  const optPayload: any[] = [];
  insertedQs.forEach((row, i) => {
    questions[i].options.forEach((o: any, j: number) => {
      optPayload.push({
        question_id: row.id,
        label: o.label,
        is_correct: !!o.is_correct,
        order_index: o.order_index ?? j,
      });
    });
  });
  const { error: optErr } = await supa.from('quiz_answer_options').insert(optPayload);
  if (optErr) return NextResponse.json({ error: optErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, quiz_id: quizRow.id, course: course.title });
}
