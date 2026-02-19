import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  `id, booking_code, booking_date, amount, status, student_id, course_id, course_date_id, partner_id,
   course_title, course_start, partner_name, student_name, student_email, vat_rate, price_net, deposit, saldo, duration_hours`;

async function fillAmounts(rows: any | any[]) {
  const list = Array.isArray(rows) ? [...rows] : rows ? [{ ...rows }] : [];
  const missing = list.filter((r) => (r.amount === null || r.amount === undefined) && (r.course_date_id || r.course_id));
  if (!missing.length) return rows;
  const dateIds = Array.from(new Set(missing.map((r) => r.course_date_id).filter(Boolean)));
  const courseIds = Array.from(new Set(missing.map((r) => r.course_id).filter(Boolean)));

  const { data: cdData } = await service
    .from('course_dates')
    .select('id, course_id, course:courses(price_gross)')
    .in('id', dateIds.length ? dateIds : ['00000000-0000-0000-0000-000000000000']);
  const { data: courseData } = await service
    .from('courses')
    .select('id, price_gross')
    .in('id', courseIds.length ? courseIds : ['00000000-0000-0000-0000-000000000000']);

  const mapDate = Object.fromEntries(((cdData ?? []) as any[]).map((d) => [d.id, d.course?.price_gross != null ? Number(d.course.price_gross) : null]));
  const mapCourse = Object.fromEntries(((courseData ?? []) as any[]).map((d) => [d.id, d.price_gross != null ? Number(d.price_gross) : null]));

  const toUpdate: { id: string; amount: number | null }[] = [];
  list.forEach((r) => {
    const price =
      mapDate[r.course_date_id] ??
      mapCourse[r.course_id] ??
      null;
    // Nur fehlende Beträge auffüllen, nicht überschreiben
    if ((r.amount === null || r.amount === undefined) && price != null) {
      r.amount = price;
      if (r.id) toUpdate.push({ id: r.id, amount: price });
    }
  });

  if (toUpdate.length) {
    await service.from('bookings').upsert(toUpdate, { onConflict: 'id' });
  }

  return Array.isArray(rows) ? list : list[0];
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.student_id) return NextResponse.json({ error: 'student_id fehlt' }, { status: 400 });

  // Infos holen
  const { data: cd } = await service
    .from('course_dates')
    .select('course_id, start_date, partner_id, course:courses(price_gross,title), partner:partners(name)')
    .eq('id', body.course_date_id)
    .maybeSingle();
  const { data: stu } = await service.from('students').select('name,email').eq('id', body.student_id).maybeSingle();

  // Falls amount fehlt, Kursbeitrag aus Kurs laden
  let amount = body.amount;
  if (amount === undefined || amount === null || amount === '') {
    const coursePrice = (cd as any)?.course?.price_gross;
    amount = coursePrice != null ? Number(coursePrice) : null;
  }

  const payload = {
    booking_code: body.booking_code || `BU-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    booking_date: body.booking_date || new Date().toISOString().slice(0, 10),
    amount,
    vat_rate: body.vat_rate ?? null,
    price_net: body.price_net ?? null,
    deposit: body.deposit ?? null,
    saldo: body.saldo ?? null,
    duration_hours: body.duration_hours ?? null,
    status: body.status || 'offen',
    student_id: body.student_id,
    course_id: cd?.course_id ?? body.course_id ?? null,
    course_date_id: body.course_date_id,
    partner_id: body.partner_id ?? cd?.partner_id ?? null,
    course_title: (cd as any)?.course?.title ?? null,
    course_start: cd?.start_date ?? null,
    partner_name: (cd as any)?.partner?.name ?? null,
    student_name: stu?.name ?? null,
    student_email: stu?.email ?? null,
  };
  const { data, error } = await service.from('bookings').insert(payload).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const q = service.from('bookings').select(SELECT);
  if (id) q.eq('id', id).single();
  else q.order('booking_date', { ascending: false });
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const enriched = await fillAmounts(data);

  // Wenn Einzel-Buchung, Zahlungen mitliefern
  if (id && enriched) {
    const { data: payments } = await service
      .from('payments')
      .select('id, payment_date, amount, method, note, created_at')
      .eq('booking_id', id)
      .order('payment_date', { ascending: false });
    const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const amount = (enriched as any).amount ?? 0;
    (enriched as any).payments = payments ?? [];
    (enriched as any).paid_total = paid;
    (enriched as any).open_amount = Number((amount - paid).toFixed(2));
  }

  return NextResponse.json(enriched);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { data, error } = await service.from('bookings').update(body).eq('id', id).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const enriched = await fillAmounts(data);
  return NextResponse.json(enriched);
}
