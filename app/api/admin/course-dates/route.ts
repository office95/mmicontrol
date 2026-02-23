import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  'id, code, status, start_date, end_date, time_from, time_to, price_tier_id, price_gross, vat_rate, price_net, deposit, saldo, duration_hours, course_id, partner_id, price_tier:price_tiers!course_dates_price_tier_id_fkey(id,label), course:courses!course_dates_course_id_fkey(id,title,price_gross,default_price_tier_id), partner:partners!course_dates_partner_id_fkey(id,name), bookings(count)';

export async function GET() {
  const { data, error } = await service
    .from('course_dates')
    .select(SELECT)
    .order('start_date', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // bookings(count) liefert z.B. [{count: 2}]
  const normalized = data?.map((row: any) => ({
    ...row,
    bookings_count: row.bookings?.[0]?.count ?? 0,
  }));

  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { course_id, partner_id, start_date, end_date, time_from, time_to, status = 'offen', price_tier_id } = body;

  if (!course_id || !start_date) {
    return NextResponse.json({ error: 'course_id und start_date sind erforderlich.' }, { status: 400 });
  }

  const { data: course } = await service
    .from('courses')
    .select('id, price_gross, vat_rate, price_net, deposit, saldo, duration_hours, default_price_tier_id')
    .eq('id', course_id)
    .maybeSingle();

  let appliedTierId = price_tier_id || course?.default_price_tier_id || null;
  let priceFields: any = {};
  if (appliedTierId) {
    const { data: tierPrice } = await service
      .from('course_price_tiers')
      .select('price_gross, vat_rate, price_net, deposit, saldo, duration_hours')
      .eq('course_id', course_id)
      .eq('price_tier_id', appliedTierId)
      .maybeSingle();
    if (tierPrice) priceFields = tierPrice;
  }
  // Fallback auf Kurs-Basispreise
  if (!priceFields.price_gross && course) {
    priceFields = {
      price_gross: course.price_gross,
      vat_rate: course.vat_rate,
      price_net: course.price_net,
      deposit: course.deposit,
      saldo: course.saldo,
      duration_hours: course.duration_hours,
    };
  }

  const { data, error } = await service
    .from('course_dates')
    .insert({
      course_id,
      partner_id,
      start_date,
      end_date,
      time_from,
      time_to,
      status,
      price_tier_id: appliedTierId,
      ...priceFields,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, course_id, partner_id, start_date, end_date, time_from, time_to, status, price_tier_id } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });

  let priceFields: any = {};
  let appliedTierId = price_tier_id;
  if (course_id) {
    const { data: course } = await service
      .from('courses')
      .select('id, price_gross, vat_rate, price_net, deposit, saldo, duration_hours, default_price_tier_id')
      .eq('id', course_id)
      .maybeSingle();
    if (!appliedTierId) appliedTierId = course?.default_price_tier_id ?? null;
    if (appliedTierId) {
      const { data: tierPrice } = await service
        .from('course_price_tiers')
        .select('price_gross, vat_rate, price_net, deposit, saldo, duration_hours')
        .eq('course_id', course_id)
        .eq('price_tier_id', appliedTierId)
        .maybeSingle();
      if (tierPrice) priceFields = tierPrice;
    }
    if (!priceFields.price_gross && course) {
      priceFields = {
        price_gross: course.price_gross,
        vat_rate: course.vat_rate,
        price_net: course.price_net,
        deposit: course.deposit,
        saldo: course.saldo,
        duration_hours: course.duration_hours,
      };
    }
  }

  const { data, error } = await service
    .from('course_dates')
    .update({
      course_id,
      partner_id,
      start_date,
      end_date,
      time_from,
      time_to,
      status,
      price_tier_id: appliedTierId,
      ...priceFields,
    })
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Preisfelder aus Kurs nachreichen
  if (data?.course_id && (!(data as any).course?.price_gross || (data as any).course?.price_gross === null)) {
    const { data: course } = await service
      .from('courses')
      .select('price_gross, vat_rate, price_net, deposit, saldo, duration_hours')
      .eq('id', data.course_id)
      .maybeSingle();
    if (course) {
      (data as any).course = { ...((data as any).course || {}), ...course } as any;
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });

  const { error } = await service.from('course_dates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
