import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const course_date_id = searchParams.get('course_date_id');

  let query = service
    .from('course_reschedules')
    .select('id, course_date_id, version, reason, old_start_date, old_end_date, new_start_date, new_end_date, old_time_from, old_time_to, new_time_from, new_time_to, created_at, created_by, course_dates(id, course_id, start_date, end_date, time_from, time_to, course:courses(id,title))')
    .order('version', { ascending: false });

  if (course_date_id) query = query.eq('course_date_id', course_date_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const body = await req.json();
  let { course_date_id, start_date, end_date, time_from, time_to, reason, update_bookings } = body || {};
  // leere Strings in NULL umwandeln
  start_date = start_date || null;
  end_date = end_date || null;
  time_from = time_from || null;
  time_to = time_to || null;
  reason = reason || null;

  if (!course_date_id || !start_date) return NextResponse.json({ error: 'course_date_id und start_date erforderlich' }, { status: 400 });

  const { data: cd, error: cdErr } = await service
    .from('course_dates')
    .select('id, course_id, start_date, end_date, time_from, time_to, course:courses(title)')
    .eq('id', course_date_id)
    .maybeSingle();
  if (cdErr) return NextResponse.json({ error: cdErr.message }, { status: 400 });
  if (!cd) return NextResponse.json({ error: 'Kurstermin nicht gefunden' }, { status: 404 });

  const { data: resEntry, error: insErr } = await service
    .from('course_reschedules')
    .insert({
      course_date_id,
      old_start_date: cd.start_date,
      old_end_date: cd.end_date,
      new_start_date: start_date,
      new_end_date: end_date,
      old_time_from: cd.time_from,
      old_time_to: cd.time_to,
      new_time_from: time_from,
      new_time_to: time_to,
      reason,
    })
    .select('*')
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  const { error: updErr } = await service
    .from('course_dates')
    .update({ start_date, end_date, time_from, time_to, status: 'verschoben' })
    .eq('id', course_date_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  if (update_bookings) {
    await service
      .from('bookings')
      .update({ course_start: start_date })
      .eq('course_date_id', course_date_id);
  }

  // Notify admin mailbox
  await sendMail({
    to: process.env.NOTIFY_ADMIN_EMAIL || 'office@musicmission.at',
    subject: `Kurstermin verschoben: ${course_date_id}`,
    text: `Kurstermin wurde verschoben.\nNeuer Start: ${start_date}\nNeues Ende: ${end_date || '-'}\nGrund: ${reason || '-'}\nCourseDate ID: ${course_date_id}`,
  });

  // Notify betroffene Lehrende/Studierende per E-Mail
  try {
    const recipients = new Set<string>();
    // course members
    if (cd?.course_id) {
      const { data: members } = await service
        .from('course_members')
        .select('user_id')
        .eq('course_id', cd.course_id);
      for (const m of members || []) {
        const u = await service.auth.admin.getUserById(m.user_id);
        const email = u.data?.user?.email;
        if (email) recipients.add(email);
      }
    }
    // bookings (falls Gast-Mailadresse hinterlegt)
    const { data: bookings } = await service
      .from('bookings')
      .select('student_email')
      .eq('course_date_id', course_date_id);
    for (const b of bookings || []) {
      if (b.student_email) recipients.add(b.student_email.toLowerCase());
    }

    if (recipients.size) {
      const title = cd?.course?.title || 'Kurs';
      const text = [
        `Kurstermin wurde verschoben: ${title}`,
        `Neuer Start: ${start_date}`,
        end_date ? `Neues Ende: ${end_date}` : undefined,
        reason ? `Grund: ${reason}` : undefined,
        '',
        'Bitte im Dashboard die aktualisierten Termine beachten.',
      ].filter(Boolean).join('\n');
      await sendMail({
        to: Array.from(recipients),
        subject: `Update: Neuer Starttermin für ${title}`,
        text,
      });
    }
  } catch (e) {
    console.warn('reschedule notify users failed', e);
  }

  const { data: history } = await service
    .from('course_reschedules')
    .select('id, course_date_id, version, reason, old_start_date, old_end_date, new_start_date, new_end_date, old_time_from, old_time_to, new_time_from, new_time_to, created_at')
    .eq('course_date_id', course_date_id)
    .order('version', { ascending: false });

  return NextResponse.json({ reschedule: resEntry, history: history || [] });
}
