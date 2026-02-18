import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseSelect = `id, name, email, phone, country, state, city, birthdate, status, type, lead_quality, lead_status, source, interest_courses, note, created_at`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // lead | student | all
  const filter = type && type !== 'all' ? { type } : {};

  const query = service.from('students').select(baseSelect).order('created_at', { ascending: false });
  const { data, error } = Object.keys(filter).length ? await query.match(filter) : await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { error, data } = await service.from('students').insert({ ...body }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error, data } = await service.from('students').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error } = await service.from('students').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Convert Lead -> Student
export async function PUT(req: Request) {
  const body = await req.json();
  const { id, by } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error, data } = await service
    .from('students')
    .update({ type: 'student', converted_at: new Date().toISOString(), converted_by: by ?? null })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

