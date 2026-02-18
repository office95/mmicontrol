import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  const { id, name, street, zip, city, state, country, phone, birthdate } = body;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { error } = await service
    .from('students')
    .update({ name, street, zip, city, state, country, phone, birthdate })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

