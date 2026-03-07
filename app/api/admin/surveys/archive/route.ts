import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const responseId = body.response_id as string | undefined;
  if (!responseId) return NextResponse.json({ error: 'response_id required' }, { status: 400 });

  const { error } = await service
    .from('course_survey_responses')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', responseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
