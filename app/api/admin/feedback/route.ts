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

  // 1) Feedbacks laden
  const { data: fbData, error: fbErr } = await service
    .from('course_feedback')
    .select('id, booking_id, course_id, course_title, ratings, recommend, improve, created_at, student_id, students(name, email)')
    .maybeSingle(); // placeholder to satisfy type

  // Supabase Typing workaround: neu laden mit eq/in wenn nötig
  let feedbackQuery = service
    .from('course_feedback')
    .select('id, booking_id, course_id, course_title, ratings, recommend, improve, created_at, student_id, students(name, email))');
  if (courseId) feedbackQuery = feedbackQuery.eq('course_id', courseId);
  const { data: feedback, error: feedbackError } = await feedbackQuery;
  if (feedbackError) return NextResponse.json({ error: feedbackError.message }, { status: 400 });
  const feedbackRows = feedback || [];

  // 2) Buchungen zu Feedbacks holen (für partner_id / course_id Fallback)
  const bookingIds = Array.from(new Set(feedbackRows.map((f: any) => f.booking_id).filter(Boolean)));
  const bookingMap = new Map<string, any>();
  if (bookingIds.length) {
    const { data: bookings, error: bErr } = await service
      .from('bookings')
      .select('id, partner_id, course_id, course_date_id')
      .in('id', bookingIds);
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });
    bookings?.forEach((b) => bookingMap.set(b.id, b));
  }

  // 3) course_dates für Partner-Fallback
  const courseDateIds = Array.from(
    new Set(
      Array.from(bookingMap.values())
        .map((b: any) => b.course_date_id)
        .filter(Boolean)
    )
  );
  const courseDateMap = new Map<string, any>();
  if (courseDateIds.length) {
    const { data: cds, error: cdErr } = await service
      .from('course_dates')
      .select('id, course_id, partner_id')
      .in('id', courseDateIds);
    if (cdErr) return NextResponse.json({ error: cdErr.message }, { status: 400 });
    cds?.forEach((cd) => courseDateMap.set(cd.id, cd));
  }

  // 4) Kurse für Partner-Fallback
  const courseIds = Array.from(
    new Set([
      ...feedbackRows.map((f: any) => f.course_id).filter(Boolean),
      ...Array.from(courseDateMap.values()).map((cd: any) => cd.course_id).filter(Boolean),
    ])
  );
  const courseMap = new Map<string, any>();
  if (courseIds.length) {
    const { data: courseRows, error: cErr } = await service
      .from('courses')
      .select('id, partner_id')
      .in('id', courseIds);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
    courseRows?.forEach((c) => courseMap.set(c.id, c));
  }

  // 5) Zeilen anreichern
  let rows = feedbackRows.map((f: any) => {
    const booking = f.booking_id ? bookingMap.get(f.booking_id) : null;
    const cd = booking?.course_date_id ? courseDateMap.get(booking.course_date_id) : null;
    const cid = f.course_id ?? booking?.course_id ?? cd?.course_id ?? null;
    const course = cid ? courseMap.get(cid) : null;
    const partner_id = booking?.partner_id ?? cd?.partner_id ?? course?.partner_id ?? null;
    return {
      id: f.id,
      course_id: cid,
      course_title: f.course_title,
      ratings: f.ratings,
      recommend: f.recommend,
      improve: f.improve,
      created_at: f.created_at,
      student_name: f.students?.name ?? null,
      student_email: f.students?.email ?? null,
      partner_id,
    };
  });

  // 6) Partnerfilter anwenden (nach Anreicherung)
  if (partnerId) {
    rows = rows.filter((r) => r.partner_id === partnerId);
  }

  return NextResponse.json(rows);
}
