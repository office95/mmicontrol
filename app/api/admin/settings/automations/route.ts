import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await service
    .from('automation_settings')
    .select('id, title, description, active')
    .order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const list = Array.isArray(body.automations) ? body.automations : [];
    if (!list.length) return NextResponse.json({ ok: true });

    const { error } = await service
      .from('automation_settings')
      .upsert(
        list.map((a: any) => ({
          id: a.id,
          title: a.title ?? a.id,
          description: a.description ?? null,
          active: !!a.active,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Fehler beim Speichern' }, { status: 400 });
  }
}

