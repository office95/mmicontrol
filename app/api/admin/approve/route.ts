import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Service-Client mit Service-Key (server-side only) – umgeht Session-Probleme
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id, role = 'student', approved = true } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!['admin', 'teacher', 'student'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ approved, role })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
