import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supa = createSupabaseRouteClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { alias } = await req.json().catch(() => ({}));
  if (!alias || typeof alias !== 'string' || !alias.trim()) {
    return NextResponse.json({ error: 'alias required' }, { status: 400 });
  }

  const { error } = await supa
    .from('profiles')
    .update({ full_name: alias.trim() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, alias: alias.trim() });
}
