import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// Service client for admin/read-all use cases
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
      .select('*, messages:support_messages(id, author_id, author_role, body, created_at)')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(ticket);
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, created_at, last_message_at, role')
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
    .select('id, subject, status, priority, created_at, last_message_at, role')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // erste Nachricht in support_messages
  await service.from('support_messages').insert({
    ticket_id: ticket.id,
    author_id: user.id,
    author_role: role,
    body: message,
  });

  return NextResponse.json(ticket);
}
