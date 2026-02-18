import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await service
    .from('profiles')
    .select('id, full_name, role, approved, auth_users:auth.users(email)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const mapped = (data || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    approved: p.approved,
    email: p.auth_users?.email ?? null,
  }));
  return NextResponse.json(mapped);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, role } = body;
  if (!id || !role) return NextResponse.json({ error: 'id und role erforderlich' }, { status: 400 });
  const { error } = await service.from('profiles').update({ role }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  // auth admin delete
  const { data, error } = await service.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // profile will be removed via trigger or cascade
  return NextResponse.json({ ok: true, data });
}

