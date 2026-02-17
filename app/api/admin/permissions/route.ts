import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const routeClient = () =>
  createRouteHandlerClient({
    cookies,
    headers,
  });

async function currentUser() {
  const supabase = routeClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function isAdmin() {
  const user = await currentUser();
  if (!user) return false;
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return profile?.role === 'admin';
}

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { data, error } = await service.from('role_permissions').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json();
  const { role, page_slug, allowed } = body;
  if (!role || !page_slug || typeof allowed !== 'boolean') {
    return NextResponse.json({ error: 'role, page_slug, allowed required' }, { status: 400 });
  }
  const { error, data } = await service
    .from('role_permissions')
    .upsert({ role, page_slug, allowed }, { onConflict: 'role,page_slug' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
