import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');
  if (!courseId) return NextResponse.json({ error: 'course_id required' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sessions, error } = await service
    .from('attendance_sessions')
    .select('id, course_id, date, attendance_entries(id, student_id, status, note, created_at, updated_at, students(name,email,phone))')
    .eq('course_id', courseId)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    (sessions || []).map((s: any) => ({
      id: s.id,
      course_id: s.course_id,
      date: s.date,
      entries: (s.attendance_entries || []).map((e: any) => ({
        id: e.id,
        student_id: e.student_id,
        status: e.status,
        note: e.note,
        created_at: e.created_at,
        updated_at: e.updated_at,
        student: {
          name: e.students?.name ?? e.students?.email ?? '',
          email: e.students?.email ?? '',
          phone: e.students?.phone ?? null,
        },
      })),
    }))
  );
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { course_id, date } = body || {};
  if (!course_id || !date) return NextResponse.json({ error: 'course_id and date required' }, { status: 400 });

  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Permission check: admin or teacher of course (course_members) or partner match via course_dates
  const { data: profile } = await service.from('profiles').select('role, partner_id').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin' || (user.user_metadata as any)?.role === 'admin';

  let allowed = false;
  if (isAdmin) allowed = true;
  if (!allowed) {
    const { count: cmCount } = await service
      .from('course_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .eq('user_id', user.id)
      .eq('role', 'teacher');
    if ((cmCount ?? 0) > 0) allowed = true;
  }
  if (!allowed && profile?.partner_id) {
    const { count: cdCount } = await service
      .from('course_dates')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .eq('partner_id', profile.partner_id);
    if ((cdCount ?? 0) > 0) allowed = true;
  }
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await service
    .from('attendance_sessions')
    .insert({ course_id, date, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
