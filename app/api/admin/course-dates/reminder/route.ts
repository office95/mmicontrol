import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Secures cron: set CRON_SECRET; call with Authorization: Bearer <secret>
function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

type ReminderRow = {
  id: string;
  start_date: string | null;
  time_from: string | null;
  time_to: string | null;
  course_id: string | null;
  partner_id: string | null;
  course: { title: string | null } | null;
  partner: { name: string | null } | null;
};

export async function GET(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const baseUrl = process.env.APP_BASE_URL || 'https://musicmissioncontrol.com';
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'no-reply@musicmissioncontrol.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ error: 'SMTP env missing (SMTP_HOST, SMTP_USER, SMTP_PASS)' }, { status: 400 });
  }

  // Load admins
  const { data: admins, error: adminErr } = await service
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
    .not('email', 'is', null);
  if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 400 });
  const recipients = (admins || []).map((a: any) => a.email).filter(Boolean);
  if (!recipients.length) return NextResponse.json({ error: 'no admin recipients' }, { status: 400 });

  // Load course dates
  const { data: dates, error: dateErr } = await service
    .from('course_dates')
    .select('id, start_date, time_from, time_to, course_id, partner_id, course:courses!course_dates_course_id_fkey(title), partner:partners!course_dates_partner_id_fkey(name)')
    .in('status', ['offen', 'laufend', 'verschoben']);
  if (dateErr) return NextResponse.json({ error: dateErr.message }, { status: 400 });

  const normalized: ReminderRow[] = (dates || []).map((d: any) => ({
    id: d.id,
    start_date: d.start_date,
    time_from: d.time_from,
    time_to: d.time_to,
    course_id: d.course_id,
    partner_id: d.partner_id,
    course: Array.isArray(d.course) ? d.course[0] ?? null : d.course ?? null,
    partner: Array.isArray(d.partner) ? d.partner[0] ?? null : d.partner ?? null,
  }));

  const sorted = normalized.filter((d) => !!d.id);
  sorted.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);

  const needFollowUp = sorted.filter((t) => {
    if (!t.start_date) return false;
    const start = new Date(t.start_date);
    start.setHours(0, 0, 0, 0);
    // only consider dates that started already or start within 7 days
    if (start > horizon) return false;
    // suppress if there is a later date with same course + partner
    const hasLater = sorted.some(
      (d) =>
        d.course_id === t.course_id &&
        ((d.partner_id || null) === (t.partner_id || null)) &&
        d.start_date &&
        t.start_date &&
        d.start_date > t.start_date
    );
    return !hasLater;
  });

  if (!needFollowUp.length) {
    return NextResponse.json({ sent: 0, info: 'no courses need follow-up' });
  }

  const lines = needFollowUp.map((t) => {
    const start = t.start_date ? new Date(t.start_date).toLocaleDateString('de-AT') : '—';
    const time =
      t.time_from && t.time_to ? ` · ${t.time_from} - ${t.time_to}` : t.time_from ? ` · ${t.time_from}` : '';
    const course = t.course?.title || 'Kurs';
    const partner = t.partner?.name || 'Kein Anbieter';
    const link = `${baseUrl}/admin/course-dates?cloneFrom=${t.id}`;
    return `- ${course} · Anbieter: ${partner} · Start: ${start}${time}\n  → Folgetermin anlegen: ${link}`;
  });

  const subject = `⚠️ Kurstermine auffüllen – ${today.toLocaleDateString('de-AT')}`;
  const text = [
    'Hallo Admin-Team,',
    '',
    'für folgende Kurse fehlt ein Folgetermin (gleicher Kurs & Anbieter) oder der Start liegt in ≤ 7 Tagen:',
    '',
    ...lines,
    '',
    'Viele Grüße',
    'Music Mission Control',
  ].join('\n');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: recipients,
    subject,
    text,
  });

  return NextResponse.json({ sent: recipients.length, courses: needFollowUp.length });
}
