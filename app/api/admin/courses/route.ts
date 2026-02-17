import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service client (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const minimal = searchParams.get('minimal') === '1';
  const select = minimal ? 'id, title, price_gross' : 'id, title, description, status, created_at, duration_hours, price_gross, vat_rate, price_net, deposit, saldo, category, vat_amount';
  if (id) {
    const { data, error } = await supabase
      .from('courses')
      .select(select)
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  const orderCol = minimal ? 'title' : 'created_at';
  const { data, error } = await supabase
    .from('courses')
    .select(select)
    .order(orderCol, { ascending: minimal ? true : false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    title,
    description,
    duration_hours,
    price_gross,
    vat_rate = 0.2,
    deposit,
    category,
    status = 'active',
  } = body;

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const grossNum = Number(price_gross) || 0;
  const vatNum = Number(vat_rate) ?? 0;
  const net = grossNum > 0 ? Number((grossNum / (1 + vatNum)).toFixed(2)) : 0;
  const depNum = deposit ? Number(deposit) : 0;
  const saldo = Number((grossNum - depNum).toFixed(2));
  const vatAmount = Number((grossNum - net).toFixed(2));

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title,
      description,
      duration_hours: duration_hours ? Number(duration_hours) : null,
      price_gross: grossNum || null,
      vat_rate: vatNum,
      price_net: net,
      deposit: deposit ? Number(deposit) : null,
      saldo: isNaN(saldo) ? null : saldo,
      vat_amount: isNaN(vatAmount) ? null : vatAmount,
      category: category || null,
      status: status === 'inactive' ? 'inactive' : 'active',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// PATCH: update course (edit / archive)
export async function PATCH(req: Request) {
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const {
    title,
    description,
    duration_hours,
    price_gross,
    vat_rate,
    deposit,
    category,
    status,
  } = body;

  const payload: Record<string, unknown> = {};

  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  if (duration_hours !== undefined) payload.duration_hours = Number(duration_hours);
  if (price_gross !== undefined) payload.price_gross = Number(price_gross);
  if (vat_rate !== undefined) payload.vat_rate = Number(vat_rate);
  if (deposit !== undefined) payload.deposit = Number(deposit);
  if (category !== undefined) payload.category = category;
  if (status !== undefined) payload.status = status === 'inactive' ? 'inactive' : 'active';

  // recompute net, saldo, vat_amount if gross/vat/deposit provided
  const grossNum = price_gross !== undefined ? Number(price_gross) : undefined;
  const vatNum = vat_rate !== undefined ? Number(vat_rate) : undefined;
  const depNum = deposit !== undefined ? Number(deposit) : undefined;

  if (grossNum !== undefined && vatNum !== undefined) {
    payload.price_net = Number((grossNum / (1 + (isNaN(vatNum) ? 0 : vatNum))).toFixed(2));
  }
  if (grossNum !== undefined && depNum !== undefined) {
    payload.saldo = Number((grossNum - depNum).toFixed(2));
  }
  if (grossNum !== undefined && payload.price_net !== undefined) {
    payload.vat_amount = Number((grossNum - (payload.price_net as number)).toFixed(2));
  }

  const { data, error } = await supabase
    .from('courses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
