import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const supabase = createSupabaseServerClient();
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (id) {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by, support_messages(id, author_role, author_id, body, created_at)')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    let creator: { full_name: string | null; email: string | null } | null = null;
    if (ticket?.created_by) {
      const { data: c } = await service
        .from('profiles')
        .select('full_name, email')
        .eq('id', ticket.created_by)
        .maybeSingle();
      creator = c ?? null;
    }

    // Autor-Namen auflösen
    const authorIds = Array.from(new Set((ticket?.support_messages || []).map((m: any) => m.author_id).filter(Boolean)));
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds.length ? authorIds : ['00000000-0000-0000-0000-000000000000']);
    const nameMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => nameMap.set(p.id, p.full_name || ''));

    const msgs = (ticket?.support_messages || []).map((m: any) => ({
      ...m,
      author_name: m.author_role === 'admin' ? 'Music Mission Team' : nameMap.get(m.author_id) || 'Unbekannt',
    }));

    return NextResponse.json({ ...ticket, support_messages: msgs, creator });
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, role, created_at, last_message_at, created_by')
    .order('last_message_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const creators = Array.from(new Set((data || []).map((t) => t.created_by).filter(Boolean))) as string[];
  const creatorMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (creators.length) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creators);
    profiles?.forEach((p) => creatorMap.set(p.id, { full_name: p.full_name, email: (p as any).email ?? null }));
  }

  const enriched = (data || []).map((t) => ({
    ...t,
    creator: creatorMap.get(t.created_by) || null,
  }));

  return NextResponse.json(enriched || []);
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { data: session } = await supabase.auth.getUser();
  const user = session.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { subject, message, category, priority } = body || {};
  if (!subject || !message)
    return NextResponse.json({ error: 'subject und message erforderlich' }, { status: 400 });

  const role = (session.user.user_metadata?.role as string) || 'student';

  const { data: ticket, error } = await service
    .from('support_tickets')
    .insert({
      subject,
      message,
      created_by: user.id,
      role,
      priority: priority === 'high' ? 'high' : 'normal',
      status: 'open',
      last_message_at: new Date().toISOString(),
    })
    .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await service.from('support_messages').insert({
    ticket_id: ticket.id,
    author_id: user.id,
    author_role: role,
    body: message,
  });

  return NextResponse.json(ticket);
}

export async function PATCH(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: session } = await supabase.auth.getUser();
  const user = session.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, status, priority } = body || {};
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Nur Admin oder Besitzer darf
  const { data: ticket, error: tErr } = await service.from('support_tickets').select('created_by').eq('id', id).maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
  const isAdmin = (session.user.user_metadata?.role as string) === 'admin' || (session.user.app_metadata?.role as string) === 'admin';
  if (!isAdmin && ticket?.created_by !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const update: any = {};
  if (status) update.status = status;
  if (priority) update.priority = priority;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nichts zu aktualisieren' }, { status: 400 });
  update.last_message_at = new Date().toISOString();

  const { data, error } = await service
    .from('support_tickets')
    .update(update)
    .eq('id', id)
    .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
