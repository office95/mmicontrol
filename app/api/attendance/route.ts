import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');
  if (!courseId) return NextResponse.json({ error: 'course_id required' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: sessions, error } = await supabase
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

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({ course_id, date })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
