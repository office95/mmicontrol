import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// Stores student course feedback
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { booking_id, course_id, course_title, ratings, expectations, improve, recommend } = body;

  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  // optional: derive student_id from bookings
  let student_id: string | null = null;
  const { data: booking } = await service
    .from('bookings')
    .select('student_id, student_email, course_id')
    .eq('id', booking_id)
    .maybeSingle();
  if (booking?.student_id) student_id = booking.student_id;

  // Nur eine Bewertung pro Buchung/User zulassen
  const { data: existing } = await service
    .from('course_feedback')
    .select('id')
    .eq('booking_id', booking_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Feedback bereits vorhanden' }, { status: 409 });
  }

  const { error } = await service.from('course_feedback').insert({
    booking_id,
    course_id: course_id ?? booking?.course_id ?? null,
    student_id,
    user_id: user.id,
    ratings,
    expectations,
    improve,
    recommend,
    course_title,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
