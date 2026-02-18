import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // 1) profiles
  const { data, error } = await service
    .from('profiles')
    .select('id, full_name, role, approved')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 2) emails über auth.admin.listUsers() (robuster als Join auf auth.users)
  const userMap = new Map<string, string | null>();
  const users = await service.auth.admin.listUsers();
  users.data?.users?.forEach((u) => userMap.set(u.id, u.email ?? null));

  const mapped = (data || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    approved: p.approved,
    email: userMap.get(p.id) ?? null,
  }));

  return NextResponse.json(mapped);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, role, approved } = body;
  if (!id) return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });
  const updates: any = {};
  if (role) updates.role = role;
  if (approved !== undefined) updates.approved = approved;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'keine Felder' }, { status: 400 });
  const { error } = await service.from('profiles').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  // auth admin delete
  const { data, error } = await service.auth.admin.deleteUser(id);
  if (error) {
    // Fallback: Profil löschen, auch wenn Auth-User nicht gefunden wird
    await service.from('profiles').delete().eq('id', id);
    await service.from('students').delete().eq('id', id);
    await service.from('course_members').delete().eq('user_id', id);
    return NextResponse.json({ ok: true, warning: error.message });
  }
  // sicherheitshalber Profil löschen
  await service.from('course_members').delete().eq('user_id', id);
  await service.from('students').delete().eq('id', id);
  await service.from('profiles').delete().eq('id', id);
  return NextResponse.json({ ok: true, data });
}
