import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function isAdmin() {
  const supa = createSupabaseRouteClient();
  const { data } = await supa.auth.getUser();
  if (!data.user) return false;
  const svc = service();
  const { data: profile } = await svc.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin';
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supa = service();
  const { searchParams } = new URL(req.url);
  const course_id = searchParams.get('course_id');
  const query = supa.from('modules').select('id, title, course_id, cover_url, module_number');
  if (course_id) query.eq('course_id', course_id);
  const { data, error } = await query.order('module_number', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supa = service();
  const body = await req.json().catch(() => ({}));
  const { course_id, module_numbers } = body || {};
  if (!course_id || !Array.isArray(module_numbers) || !module_numbers.length) {
    return NextResponse.json({ error: 'course_id and module_numbers[] required' }, { status: 400 });
  }

  // Upsert Module 1..20 (or provided) with default title "Modul X"
  const payload = module_numbers.map((n: number) => ({
    course_id,
    module_number: n,
    title: `Modul ${n}`,
  }));

  const { error } = await supa
    .from('modules')
    .upsert(payload, { onConflict: 'course_id,module_number' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
