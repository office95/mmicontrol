import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseSelect =
  'id, lead_code, requested_at, name, email, phone, country, state, interest_courses, interest_other, partner_id, source, source_note, lead_quality, newsletter, status, notes, created_at, partner:partners(id,name)';

async function enrich(leads: any[]) {
  // Map course ids to titles for display
  const ids = Array.from(
    new Set(
      leads
        .flatMap((l) => l.interest_courses || [])
        .filter((v: any): v is string => !!v)
    )
  );
  let courseMap: Record<string, string> = {};
  if (ids.length) {
    const { data } = await service.from('courses').select('id,title').in('id', ids);
    courseMap = Object.fromEntries((data ?? []).map((c) => [c.id, c.title]));
  }
  return leads.map((l) => ({
    ...l,
    interest_titles: (l.interest_courses || []).map((id: string) => courseMap[id] || id),
  }));
}

export async function GET() {
  const { data, error } = await service
    .from('leads')
    .select(baseSelect)
    .order('requested_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const enriched = await enrich(data ?? []);
  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    name,
    email,
    phone,
    country,
    state,
    interest_courses = [],
    interest_other,
    partner_id,
    source = [],
    source_note,
    lead_quality = 'C',
    newsletter = false,
    requested_at,
    status = 'offen',
    notes = [],
  } = body;

  if (!name) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 });

  const lead_code = `LE-${nanoid(6).toUpperCase()}`;

  const { data, error } = await service
    .from('leads')
    .insert({
      lead_code,
      name,
      email,
      phone,
      country,
      state,
      interest_courses,
      interest_other,
      partner_id,
      source,
      source_note,
      lead_quality,
      newsletter,
      requested_at: requested_at || new Date().toISOString().slice(0, 10),
      status,
      notes,
    })
    .select(baseSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });

  // Nur Felder aktualisieren, die tatsächlich gesendet wurden,
  // damit beim Kanban-Drop keine anderen Werte überschrieben werden.
  const update: Record<string, any> = {};
  if ('name' in body) update.name = body.name;
  if ('email' in body) update.email = body.email;
  if ('phone' in body) update.phone = body.phone;
  if ('country' in body) update.country = body.country;
  if ('state' in body) update.state = body.state;
  if ('interest_courses' in body) update.interest_courses = body.interest_courses;
  if ('interest_other' in body) update.interest_other = body.interest_other;
  if ('partner_id' in body) update.partner_id = body.partner_id;
  if ('source' in body) update.source = body.source;
  if ('source_note' in body) update.source_note = body.source_note;
  if ('lead_quality' in body) update.lead_quality = body.lead_quality;
  if ('newsletter' in body) update.newsletter = body.newsletter;
  if ('requested_at' in body) update.requested_at = body.requested_at;
  if ('status' in body) update.status = body.status;
  if ('notes' in body) update.notes = body.notes;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Keine Felder zum Aktualisieren gesendet' }, { status: 400 });
  }

  const { data, error } = await service
    .from('leads')
    .update(update)
    .eq('id', id)
    .select(baseSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error } = await service.from('leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
