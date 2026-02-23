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
