import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');
  if (!courseId) return NextResponse.json({ error: 'course_id required' }, { status: 400 });
  const supabase = createSupabaseServerClient();

  // Teilnehmer aus course_members (students) + bookings
  const participants: { student_id: string | null; name: string; email: string; phone?: string | null }[] = [];
  const seen = new Set<string>();

  const { data: enrollments } = await supabase
    .from('course_members')
    .select('profiles(id), course_id')
    .eq('role', 'student')
    .eq('course_id', courseId);

  const profileIds = Array.from(new Set((enrollments || []).map((e: any) => e.profiles?.id).filter(Boolean)));
  if (profileIds.length) {
    const { data: students } = await supabase
      .from('students')
      .select('id, name, email, phone')
      .in('id', profileIds);
    (students || []).forEach((s: any) => {
      const key = s.id || s.email;
      if (!key || seen.has(key)) return;
      seen.add(key);
      participants.push({ student_id: s.id, name: s.name ?? s.email ?? 'Teilnehmer', email: s.email ?? '', phone: s.phone ?? null });
    });
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('student_id, student_email, student_name, student_phone, course_id, course_dates(course_id)')
    .or(`course_id.eq.${courseId},course_dates.course_id.eq.${courseId}`);

  (bookings || []).forEach((b: any) => {
    const key = b.student_id || b.student_email;
    if (!key || seen.has(key)) return;
    seen.add(key);
    participants.push({
      student_id: b.student_id ?? null,
      name: b.student_name ?? b.student_email ?? 'Teilnehmer',
      email: b.student_email ?? '',
      phone: b.student_phone ?? null,
    });
  });

  return NextResponse.json(participants);
}
