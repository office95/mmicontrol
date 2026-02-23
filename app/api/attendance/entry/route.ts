import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { session_id, student_id, status, note } = body || {};
  if (!session_id || !status) return NextResponse.json({ error: 'session_id and status required' }, { status: 400 });

  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // check course for this session
  const { data: sessionRow, error: sErr } = await service
    .from('attendance_sessions')
    .select('course_id')
    .eq('id', session_id)
    .maybeSingle();
  if (sErr || !sessionRow) return NextResponse.json({ error: sErr?.message || 'session not found' }, { status: 400 });

  const { data: profile } = await service.from('profiles').select('role, partner_id').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin' || (user.user_metadata as any)?.role === 'admin';
  let allowed = false;
  if (isAdmin) allowed = true;
  if (!allowed) {
    const { count: cmCount } = await service
      .from('course_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('course_id', sessionRow.course_id)
      .eq('user_id', user.id)
      .eq('role', 'teacher');
    if ((cmCount ?? 0) > 0) allowed = true;
  }
  if (!allowed && profile?.partner_id) {
    const { count: cdCount } = await service
      .from('course_dates')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', sessionRow.course_id)
      .eq('partner_id', profile.partner_id);
    if ((cdCount ?? 0) > 0) allowed = true;
  }
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await service
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
