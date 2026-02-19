import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { session_id, student_id, status, note } = body || {};
  if (!session_id || !status) return NextResponse.json({ error: 'session_id and status required' }, { status: 400 });

  const { data, error } = await supabase
    .from('attendance_entries')
    .upsert(
      { session_id, student_id, status, note: note ?? null },
      { onConflict: 'session_id,student_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
