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

  if (id) {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by, support_messages(id, author_role, author_id, body, created_at)')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(ticket);
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, role, created_at, last_message_at')
    .order('last_message_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
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
