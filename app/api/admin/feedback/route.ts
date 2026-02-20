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

  let courseIdsForPartner: string[] = [];
  if (partnerId) {
    const { data: partnerCourses, error: partnerErr } = await service
      .from('courses')
      .select('id')
      .eq('partner_id', partnerId);
    if (partnerErr) return NextResponse.json({ error: partnerErr.message }, { status: 400 });
    courseIdsForPartner = (partnerCourses || []).map((c: any) => c.id).filter(Boolean);
    if (!courseIdsForPartner.length) return NextResponse.json([]);
  }

  let query = service.from('course_feedback').select(baseSelect);

  if (courseId) query = query.eq('course_id', courseId);
  if (partnerId) query = query.in('course_id', courseIdsForPartner);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data || []).map((f: any) => ({
    id: f.id,
    course_id: f.course_id,
    course_title: f.course_title,
    ratings: f.ratings,
    recommend: f.recommend,
    improve: f.improve,
    created_at: f.created_at,
    student_name: f.students?.name ?? null,
    student_email: f.students?.email ?? null,
    partner_id: f.courses?.partner_id ?? null,
  }));

  return NextResponse.json(rows);
}
