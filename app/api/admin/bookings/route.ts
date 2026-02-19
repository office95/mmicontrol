import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  `id, booking_code, booking_date, amount, status, student_id, course_id, course_date_id, partner_id,
   course_title, course_start, partner_name, student_name, student_email, vat_rate, price_net, deposit, saldo, duration_hours,
   next_dunning_at, auto_dunning_enabled`;

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
  const wantMetrics = searchParams.get('metrics');

  // KPI / Metrics View
  if (wantMetrics) {
    const { data: bookings, error } = await service.from('bookings').select(SELECT);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const list = await fillAmounts(bookings || []);
    const ids = Array.from(new Set((list as any[]).map((r) => r.id).filter(Boolean)));

    const { data: payAgg } = await service
      .from('payments')
      .select('booking_id, amount, payment_date')
      .in('booking_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

    const sumByBooking = (payAgg ?? []).reduce<Record<string, number>>((acc, row: any) => {
      acc[row.booking_id] = (acc[row.booking_id] || 0) + Number(row.amount || 0);
      return acc;
    }, {});

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const last7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const paymentsLast7 = (payAgg ?? []).filter((p) => p.payment_date && p.payment_date >= last7);
    const payments_last7_sum = paymentsLast7.reduce((s, p) => s + Number(p.amount || 0), 0);
    const payments_last7_count = Array.from(new Set(paymentsLast7.map((p) => p.booking_id))).length;

    const open_sum = (list as any[]).reduce((sum, r: any) => {
      const paid = sumByBooking[r.id] || 0;
      const open = Math.max(0, Number((r.amount ?? 0) - paid));
      return sum + open;
    }, 0);

    const dunningStatuses = ['Zahlungserinnerung', '1. Mahnung', '2. Mahnung', 'Inkasso'];
    const dunning_due = (list as any[]).filter(
      (r: any) =>
        dunningStatuses.includes(r.status) &&
        r.next_dunning_at &&
        r.next_dunning_at <= todayStr
    ).length;

    const by_status = (list as any[]).reduce<Record<string, number>>((acc, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      open_sum,
      dunning_due,
      payments_last7_sum,
      payments_last7_count,
      by_status,
    });
  }

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

  // Bei Listenansicht: Zahlungssummen je Buchung mitgeben
  if (!id && Array.isArray(enriched) && enriched.length) {
    const ids = Array.from(new Set((enriched as any[]).map((r) => r.id).filter(Boolean)));
    if (ids.length) {
      const { data: payAgg } = await service
        .from('payments')
        .select('booking_id, amount')
        .in('booking_id', ids);
      const sumByBooking = (payAgg ?? []).reduce<Record<string, number>>((acc, row: any) => {
        const key = row.booking_id;
        acc[key] = (acc[key] || 0) + Number(row.amount || 0);
        return acc;
      }, {});
      (enriched as any[]).forEach((row: any) => {
        const paid = sumByBooking[row.id] || 0;
        const amount = row.amount ?? 0;
        row.paid_total = paid;
        row.open_amount = Number((amount - paid).toFixed(2));
      });
    }
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
