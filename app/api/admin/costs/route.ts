import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  'id, cost_date, amount_gross, vat_rate, amount_net, vat_amount, vendor, description, attachment_url, category_id, course_id, partner_id, created_at, updated_at, cost_categories (id, name), courses (id, title), partners (id, name)';

function computeAmounts(amount_gross: number, vat_rate: number) {
  const gross = Number(amount_gross);
  const rate = Number(vat_rate || 0);
  const amount_net = Number((gross / (1 + rate / 100)).toFixed(2));
  const vat_amount = Number((gross - amount_net).toFixed(2));
  return { amount_net, vat_amount };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const category = searchParams.get('category_id');
  const course = searchParams.get('course_id');
  const partner = searchParams.get('partner_id');

  if (id) {
    const { data, error } = await service.from('costs').select(SELECT).eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  let q = service.from('costs').select(SELECT).order('cost_date', { ascending: false }).order('created_at', { ascending: false });
  if (from) q = q.gte('cost_date', from);
  if (to) q = q.lte('cost_date', to);
  if (category) q = q.eq('category_id', category);
  if (course) q = q.eq('course_id', course);
  if (partner) q = q.eq('partner_id', partner);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.cost_date) return NextResponse.json({ error: 'cost_date fehlt' }, { status: 400 });
  if (!body.amount_gross) return NextResponse.json({ error: 'amount_gross fehlt' }, { status: 400 });

  if (body.category_id) {
    const { data: cat } = await service.from('cost_categories').select('name').eq('id', body.category_id).maybeSingle();
    if ((cat?.name || '').toLowerCase() === 'honorarnote' && !body.partner_id) {
      return NextResponse.json({ error: 'Partner erforderlich bei Honorarnote' }, { status: 400 });
    }
  }

  const { amount_net, vat_amount } = computeAmounts(body.amount_gross, body.vat_rate ?? 0);

  const payload = {
    cost_date: body.cost_date,
    amount_gross: Number(body.amount_gross),
    vat_rate: Number(body.vat_rate ?? 0),
    amount_net,
    vat_amount,
    vendor: body.vendor || null,
    description: body.description || null,
    attachment_url: body.attachment_url || null,
    category_id: body.category_id || null,
    course_id: body.course_id || null,
    partner_id: body.partner_id || null,
  };

  const { data, error } = await service.from('costs').insert(payload).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });

  if (body.category_id) {
    const { data: cat } = await service.from('cost_categories').select('name').eq('id', body.category_id).maybeSingle();
    if ((cat?.name || '').toLowerCase() === 'honorarnote' && !body.partner_id) {
      return NextResponse.json({ error: 'Partner erforderlich bei Honorarnote' }, { status: 400 });
    }
  }

  const updates: any = { ...body };
  delete updates.id;
  if (updates.amount_gross !== undefined || updates.vat_rate !== undefined) {
    const gross = updates.amount_gross ?? body.amount_gross;
    const rate = updates.vat_rate ?? body.vat_rate ?? 0;
    const { amount_net, vat_amount } = computeAmounts(gross, rate);
    updates.amount_net = amount_net;
    updates.vat_amount = vat_amount;
  }

  const { data, error } = await service.from('costs').update(updates).eq('id', id).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error } = await service.from('costs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
