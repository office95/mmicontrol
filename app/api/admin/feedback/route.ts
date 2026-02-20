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

  // Bei partner_id: Kurs-IDs des Partners holen und clientseitig filtern (kein SQL-Join nötig)
  if (partnerId) {
    const { data: partnerCourses, error: partnerErr } = await service
      .from('courses')
      .select('id')
      .eq('partner_id', partnerId);
    if (partnerErr) return NextResponse.json({ error: partnerErr.message }, { status: 400 });
    const allowed = new Set((partnerCourses || []).map((c: any) => c.id).filter(Boolean));
    rows = rows.filter((r) => allowed.has(r.course_id));
  }

  return NextResponse.json(rows);
}
