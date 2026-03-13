import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PARTNER_COLUMNS =
  'id, status, provider_id, name, street, zip, city, country, state, phone, email, created_at, contract, contract_date, bank_name, iban, bic, contact_person, vat_number, tax_number, registry_number, provision1, provision2, provision3, provision4, provision5, provision6plus, rating_course, rating_teacher, rating_reliability, rating_engagement, logo_path, hero1_path, hero2_path, gallery_paths, teacher_name, teacher_image_path, teacher_description, teacher_profiles, website_slogan, website_description, website_tags';

export async function GET() {
  const { data, error } = await service.from('partners').select(PARTNER_COLUMNS).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = (data ?? []).map((p) => p.id).filter(Boolean);
  let bookingCountMap: Record<string, number> = {};
  let openSumMap: Record<string, number> = {};

  if (ids.length) {
    const { data: bookings } = await service
      .from('bookings')
      .select('id, partner_id, amount, status')
      .in('partner_id', ids)
      .in('status', ['offen', 'laufend', 'verschoben']);

    const bookingIds = (bookings ?? []).map((b) => b.id);
    const { data: payments } = await service
      .from('payments')
      .select('booking_id, amount')
      .in('booking_id', bookingIds.length ? bookingIds : ['00000000-0000-0000-0000-000000000000']);

    const payMap = (payments ?? []).reduce<Record<string, number>>((acc, p: any) => {
      acc[p.booking_id] = (acc[p.booking_id] || 0) + Number(p.amount || 0);
      return acc;
    }, {});

    (bookings ?? []).forEach((b) => {
      const paid = payMap[b.id] || 0;
      const open = Math.max(0, Number((Number(b.amount ?? 0) - paid).toFixed(2)));
      if (!b.partner_id) return;
      bookingCountMap[b.partner_id] = (bookingCountMap[b.partner_id] || 0) + 1;
      openSumMap[b.partner_id] = Number(((openSumMap[b.partner_id] || 0) + open).toFixed(2));
    });
  }

  const enhanced = (data ?? []).map((p) => {
    const ratings = [p.rating_course, p.rating_teacher, p.rating_reliability, p.rating_engagement].filter(
      (v) => v !== null && v !== undefined
    ) as number[];
    const rating_avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return {
      ...p,
      rating_avg,
      bookings_count: bookingCountMap[p.id] || 0,
      open_sum: openSumMap[p.id] || 0,
    };
  });

  return NextResponse.json(enhanced);
}

export async function POST(req: Request) {
  const body = await req.json();
  // Generate provider_id if not provided: P-<timestamp>-<rand>
  const providerId = body.provider_id || `P-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const payload = {
    status: body.status ?? 'active',
    provider_id: providerId,
    name: body.name,
    street: body.street,
    zip: body.zip,
    city: body.city,
    country: body.country,
    state: body.state,
    phone: body.phone,
    email: body.email,
    contract: body.contract ?? false,
    contract_date: body.contract_date,
    bank_name: body.bank_name,
    iban: body.iban,
    bic: body.bic,
    contact_person: body.contact_person,
    vat_number: body.vat_number,
    tax_number: body.tax_number,
    registry_number: body.registry_number,
    provision1: body.provision1,
    provision2: body.provision2,
    provision3: body.provision3,
    provision4: body.provision4,
    provision5: body.provision5,
    provision6plus: body.provision6plus,
    rating_course: body.rating_course ?? 0,
    rating_teacher: body.rating_teacher ?? 0,
    rating_reliability: body.rating_reliability ?? 0,
    rating_engagement: body.rating_engagement ?? 0,
    logo_path: body.logo_path ?? null,
    hero1_path: body.hero1_path ?? null,
    hero2_path: body.hero2_path ?? null,
    gallery_paths: body.gallery_paths ?? [],
    teacher_name: body.teacher_name ?? null,
    teacher_image_path: body.teacher_image_path ?? null,
    teacher_description: body.teacher_description ?? null,
    teacher_profiles: body.teacher_profiles ?? null,
    website_slogan: body.website_slogan ?? null,
    website_description: body.website_description ?? null,
    website_tags: body.website_tags ?? [],
  };
  if (!payload.name) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 });
  if (!payload.email) return NextResponse.json({ error: 'Email erforderlich' }, { status: 400 });
  const { data, error } = await service.from('partners').insert(payload).select(PARTNER_COLUMNS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// Update existing partner
export async function PATCH(req: Request) {
  const body = await req.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });

  const { id: _omit, ...rest } = body;
  const updates = {
    ...rest,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await service
    .from('partners')
    .update(updates)
    .eq('id', id)
    .select(PARTNER_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// Delete partner
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error } = await service.from('partners').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
