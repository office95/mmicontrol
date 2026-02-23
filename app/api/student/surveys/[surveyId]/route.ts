import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendMail } from '@/lib/mailer';

export async function GET(req: Request, { params }: { params: { surveyId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  // Survey + Questions
  const { data: survey, error } = await supabase
    .from('course_surveys')
    .select('id, course_id, title, instructions, open_days_before_start')
    .eq('id', params.surveyId)
    .maybeSingle();
  if (error || !survey) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Check booking belongs to user
  const email = (user.email || '').toLowerCase();
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, course_id, student_id, student_email, course_dates(start_date)')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: 'booking not found' }, { status: 404 });
  if (!((booking.student_id && booking.student_id === user.id) || (booking.student_email || '').toLowerCase() === email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (booking.course_id !== survey.course_id) return NextResponse.json({ error: 'booking not matching course' }, { status: 400 });

  const { data: questions } = await supabase
    .from('course_survey_questions')
    .select('id, qtype, prompt, options, required, position')
    .eq('survey_id', survey.id)
    .order('position', { ascending: true });

  return NextResponse.json({ survey, questions, booking });
}

export async function POST(req: Request, { params }: { params: { surveyId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { booking_id, answers } = await req.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, course_id, student_id, student_email')
    .eq('id', booking_id)
    .maybeSingle();
  const email = (user.email || '').toLowerCase();
  if (!booking || !((booking.student_id && booking.student_id === user.id) || (booking.student_email || '').toLowerCase() === email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!booking.student_id) return NextResponse.json({ error: 'student_id fehlt in booking' }, { status: 400 });

  // Check survey belongs to course
  const { data: survey } = await supabase
    .from('course_surveys')
    .select('id, course_id')
    .eq('id', params.surveyId)
    .maybeSingle();
  if (!survey || survey.course_id !== booking.course_id) return NextResponse.json({ error: 'survey/course mismatch' }, { status: 400 });

  // Create response (unique per booking)
  const { data: response, error: respErr } = await supabase
    .from('course_survey_responses')
    .insert({ survey_id: survey.id, student_id: booking.student_id, booking_id })
    .select('id')
    .single();
  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 400 });

  const payload = (answers || []).map((a: any) => ({
    response_id: response.id,
    question_id: a.question_id,
    value: a.value ?? '',
  }));
  if (payload.length) {
    const { error: ansErr } = await supabase.from('course_survey_answers').insert(payload);
    if (ansErr) return NextResponse.json({ error: ansErr.message }, { status: 400 });
  }

  // Notify zugehörige Dozenten per E-Mail
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SUPABASE_URL || '';
    const { data: teachers } = await supabase
      .from('course_members')
      .select('user_id')
      .eq('course_id', survey.course_id)
      .eq('role', 'teacher');

    const teacherIds = Array.from(new Set((teachers || []).map((t: any) => t.user_id).filter(Boolean)));

    for (const tid of teacherIds) {
      const userRes = await supabase.auth.admin.getUserById(tid);
      const email = userRes.data?.user?.email;
      if (!email) continue;
      await sendMail({
        to: email,
        subject: 'Neuer Kursfragebogen eingereicht',
        text: [
          'Hallo,',
          '',
          'es wurde ein Kursfragebogen ausgefüllt.',
          `Kurs-ID: ${survey.course_id}`,
          `Booking-ID: ${booking_id}`,
          '',
          `Antworten ansehen: ${siteUrl}/teacher?tab=courses`,
          '',
          'Liebe Grüße',
          'Music Mission Team',
        ].join('\n'),
      });
    }
  } catch (e) {
    console.warn('survey teacher mail failed', e);
  }

  return NextResponse.json({ ok: true });
}
