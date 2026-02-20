import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');
  const partnerId = searchParams.get('partner_id');

  if (!courseId && !partnerId) {
    return NextResponse.json({ error: 'course_id oder partner_id erforderlich' }, { status: 400 });
  }

  const baseSelect =
    'id, course_id, course_title, ratings, recommend, improve, created_at, student_id, students(name, email)';

  // Erst alle Feedbacks (optional auf course_id eingeschränkt)
  let query = service.from('course_feedback').select(baseSelect);
  if (courseId) query = query.eq('course_id', courseId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let rows =
    (data || []).map((f: any) => ({
      id: f.id,
      course_id: f.course_id,
      course_title: f.course_title,
      ratings: f.ratings,
      recommend: f.recommend,
      improve: f.improve,
      created_at: f.created_at,
      student_name: f.students?.name ?? null,
      student_email: f.students?.email ?? null,
    })) ?? [];

  // Bei partner_id: Kurs-IDs des Partners holen (courses.partner_id ODER course_dates.partner_id) und filtern
  if (partnerId) {
    const allowed = new Set<string>();

    const { data: partnerCourses, error: coursesErr } = await service
      .from('courses')
      .select('id')
      .eq('partner_id', partnerId);
    if (coursesErr) return NextResponse.json({ error: coursesErr.message }, { status: 400 });
    (partnerCourses || []).forEach((c: any) => c?.id && allowed.add(c.id));

    const { data: partnerDates, error: datesErr } = await service
      .from('course_dates')
      .select('course_id')
      .eq('partner_id', partnerId);
    if (datesErr) return NextResponse.json({ error: datesErr.message }, { status: 400 });
    (partnerDates || []).forEach((c: any) => c?.course_id && allowed.add(c.course_id));

    if (!allowed.size) return NextResponse.json([]);
    rows = rows.filter((r) => r.course_id && allowed.has(r.course_id));
  }

  return NextResponse.json(rows);
}
