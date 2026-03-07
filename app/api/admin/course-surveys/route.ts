import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRouteClient } from '@/lib/supabase-server';

// Service-Client (RLS-bypass) getrennt vom Auth-Client, damit wir
// Admin-Check weiter über die Session fahren können.
const serviceClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabase = createSupabaseRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { course_id, survey, questions } = await req.json();
  if (!course_id) return NextResponse.json({ error: 'course_id fehlt' }, { status: 400 });

  // Nur Admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Upsert survey
  const { data: upserted, error: upErr } = await serviceClient
    .from('course_surveys')
    .upsert({
      id: survey?.id,
      course_id,
      title: survey?.title || 'Kursfragebogen',
      instructions: survey?.instructions || '',
      open_days_before_start: survey?.open_days_before_start ?? 7,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const surveyId = upserted.id;

  // Fragen non-destruktiv upserten (IDs behalten) und entfernte Fragen archivieren statt löschen
  const incoming = (questions || []).map((q: any, idx: number) => ({
    id: q.id, // wenn vorhanden, behalten
    survey_id: surveyId,
    qtype: q.qtype || 'text',
    prompt: q.prompt || 'Frage',
    options: q.options || null,
    required: q.required ?? true,
    position: q.position ?? idx + 1,
    extra_text_label: q.extra_text_label || null,
    extra_text_required: q.extra_text_required ?? false,
    archived: false,
  }));

  // Archive questions that are not part of the incoming payload
  const incomingIds = incoming.map((q: any) => q.id).filter(Boolean) as string[];
  if (incomingIds.length) {
    await serviceClient
      .from('course_survey_questions')
      .update({ archived: true })
      .eq('survey_id', surveyId)
      .not('id', 'in', incomingIds as string[]);
  } else {
    // Keine IDs übermittelt -> nur neue Fragen, alte bleiben unberührt aber nicht hart gelöscht
    await serviceClient
      .from('course_survey_questions')
      .update({ archived: true })
      .eq('survey_id', surveyId);
  }

  if (incoming.length) {
    const { error: qErr } = await serviceClient
      .from('course_survey_questions')
      .upsert(incoming, { onConflict: 'id' });
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, survey_id: surveyId });
}
