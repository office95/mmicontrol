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
  const tiersSelect =
    'course_price_tiers:course_price_tiers(price_tier_id, price_gross, vat_rate, price_net, deposit, saldo, duration_hours, price_tier:price_tiers(id,label,position))';
  const select = minimal
    ? `id, title, price_gross, category, cover_url, course_link, default_price_tier_id, ${tiersSelect}`
    : `id, title, description, status, created_at, duration_hours, price_gross, vat_rate, price_net, deposit, saldo, category, vat_amount, course_link, cover_url, default_price_tier_id, ${tiersSelect}`;
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
    course_link,
    cover_url,
    price_tiers = [],
    default_price_tier_id,
    module_numbers = [],
  } = body;

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  // Preisstufen vorbereiten
  const tierInputs = Array.isArray(price_tiers) ? price_tiers.filter((t: any) => t?.label) : [];
  const tierLabels = Array.from(new Set(tierInputs.map((t: any) => String(t.label).trim()).filter(Boolean)));
  let tierRows: { id: string; label: string }[] = [];
  if (tierLabels.length) {
    const { data: tiers, error: tierErr } = await supabase
      .from('price_tiers')
      .upsert(
        tierLabels.map((label, idx) => ({ label, position: idx + 1 })),
        { onConflict: 'label' }
      )
      .select('id,label');
    if (tierErr) return NextResponse.json({ error: tierErr.message }, { status: 400 });
    tierRows = tiers ?? [];
  }

  const firstTier = tierInputs[0];
  const baseGross = firstTier?.price_gross ?? price_gross;
  const baseVat = firstTier?.vat_rate ?? vat_rate ?? 0.2;
  const baseDeposit = firstTier?.deposit ?? deposit;

  const grossNum = baseGross != null ? Number(baseGross) : 0;
  const vatNum = baseVat != null ? Number(baseVat) : 0;
  const net = grossNum > 0 ? Number((grossNum / (1 + vatNum)).toFixed(2)) : null;
  const depNum = baseDeposit != null ? Number(baseDeposit) : null;
  const saldo = grossNum != null && depNum != null ? Number((grossNum - depNum).toFixed(2)) : null;
  const vatAmount = grossNum != null && net != null ? Number((grossNum - net).toFixed(2)) : null;

  const defaultTierId =
    default_price_tier_id ||
    (firstTier?.label
      ? tierRows.find((t) => t.label === firstTier.label)?.id
      : undefined) ||
    undefined;

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title,
      description,
      duration_hours: duration_hours ? Number(duration_hours) : null,
      price_gross: grossNum || null,
      vat_rate: vatNum,
      price_net: net,
      deposit: depNum,
      saldo: saldo,
      vat_amount: vatAmount,
      category: category || null,
      status: status === 'inactive' ? 'inactive' : 'active',
      course_link: course_link || null,
      cover_url: cover_url || null,
      default_price_tier_id: defaultTierId || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Preisstufen speichern
  if (data?.id && tierInputs.length && tierRows.length) {
    const tierMap = Object.fromEntries(tierRows.map((t) => [t.label, t.id]));
    const rows = tierInputs.map((t: any, idx: number) => {
      const gross = t.price_gross != null ? Number(t.price_gross) : null;
      const vat = t.vat_rate != null ? Number(t.vat_rate) : null;
      const netVal =
        t.price_net != null
          ? Number(t.price_net)
          : gross != null && vat != null
            ? Number((gross / (1 + vat)).toFixed(2))
            : null;
      const depVal = t.deposit != null ? Number(t.deposit) : null;
      const saldoVal =
        gross != null && depVal != null ? Number((gross - depVal).toFixed(2)) : t.saldo != null ? Number(t.saldo) : null;
      return {
        course_id: data.id,
        price_tier_id: t.price_tier_id || tierMap[t.label],
        price_gross: gross,
        vat_rate: vat,
        price_net: netVal,
        deposit: depVal,
        saldo: saldoVal,
        duration_hours: t.duration_hours != null ? Number(t.duration_hours) : null,
      };
    });
    await supabase.from('course_price_tiers').upsert(rows, { onConflict: 'course_id,price_tier_id' });
    const keepIds = rows.map((r) => r.price_tier_id).filter(Boolean) as string[];
    if (keepIds.length) {
      await supabase
        .from('course_price_tiers')
        .delete()
        .eq('course_id', data.id)
        .not('price_tier_id', 'in', `(${keepIds.join(',')})`);
    }
  }

  // Module (optional)
  if (data?.id && Array.isArray(module_numbers)) {
    const nums = module_numbers.filter((n: any) => typeof n === 'number');
    if (nums.length) {
      const modulesPayload = nums.map((n: number) => ({
        course_id: data.id,
        module_number: n,
        title: `Modul ${n}`,
      }));
      await supabase.from('modules').upsert(modulesPayload, { onConflict: 'course_id,module_number' });
      // Lösche nicht mehr ausgewählte Module
      await supabase
        .from('modules')
        .delete()
        .eq('course_id', data.id)
        .not('module_number', 'in', `(${nums.join(',')})`);
    }
  }

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
    course_link,
    cover_url,
    price_tiers = [],
    default_price_tier_id,
    module_numbers = null,
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
  if (course_link !== undefined) payload.course_link = course_link;
  if (cover_url !== undefined) payload.cover_url = cover_url;
  if (default_price_tier_id !== undefined) payload.default_price_tier_id = default_price_tier_id || null;

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

  // Preisstufen aktualisieren
  const tierInputs = Array.isArray(price_tiers) ? price_tiers.filter((t: any) => t?.label) : [];
  if (tierInputs.length) {
    const tierLabels = Array.from(new Set(tierInputs.map((t: any) => String(t.label).trim()).filter(Boolean)));
    let tierRows: { id: string; label: string }[] = [];
    if (tierLabels.length) {
      const { data: tiers, error: tierErr } = await supabase
        .from('price_tiers')
        .upsert(
          tierLabels.map((label, idx) => ({ label, position: idx + 1 })),
          { onConflict: 'label' }
        )
        .select('id,label');
      if (tierErr) return NextResponse.json({ error: tierErr.message }, { status: 400 });
      tierRows = tiers ?? [];
    }
    const tierMap = Object.fromEntries(tierRows.map((t) => [t.label, t.id]));
    const rows = tierInputs.map((t: any) => {
      const gross = t.price_gross != null ? Number(t.price_gross) : null;
      const vat = t.vat_rate != null ? Number(t.vat_rate) : null;
      const netVal =
        t.price_net != null
          ? Number(t.price_net)
          : gross != null && vat != null
            ? Number((gross / (1 + vat)).toFixed(2))
            : null;
      const depVal = t.deposit != null ? Number(t.deposit) : null;
      const saldoVal =
        gross != null && depVal != null ? Number((gross - depVal).toFixed(2)) : t.saldo != null ? Number(t.saldo) : null;
      return {
        course_id: id,
        price_tier_id: t.price_tier_id || tierMap[t.label],
        price_gross: gross,
        vat_rate: vat,
        price_net: netVal,
        deposit: depVal,
        saldo: saldoVal,
        duration_hours: t.duration_hours != null ? Number(t.duration_hours) : null,
      };
    });
    await supabase.from('course_price_tiers').upsert(rows, { onConflict: 'course_id,price_tier_id' });
    const keepIds = rows.map((r) => r.price_tier_id).filter(Boolean) as string[];
    if (keepIds.length) {
      await supabase
        .from('course_price_tiers')
        .delete()
        .eq('course_id', id)
        .not('price_tier_id', 'in', `(${keepIds.join(',')})`);
    }
    // Falls keine default_price_tier_id gesetzt, erste als Default übernehmen
    if (payload.default_price_tier_id === undefined && keepIds.length) {
      await supabase.from('courses').update({ default_price_tier_id: keepIds[0] }).eq('id', id);
    }
  }

  // Module aktualisieren (wenn mitgesendet)
  if (Array.isArray(module_numbers)) {
    const nums = module_numbers.filter((n: any) => typeof n === 'number');
    if (nums.length) {
      const modulesPayload = nums.map((n: number) => ({
        course_id: id,
        module_number: n,
        title: `Modul ${n}`,
      }));
      await supabase.from('modules').upsert(modulesPayload, { onConflict: 'course_id,module_number' });
      await supabase
        .from('modules')
        .delete()
        .eq('course_id', id)
        .not('module_number', 'in', `(${nums.join(',')})`);
    } else {
      // wenn leere Liste geschickt: alle Module des Kurses löschen
      await supabase.from('modules').delete().eq('course_id', id);
    }
  }

  return NextResponse.json(data);
}
