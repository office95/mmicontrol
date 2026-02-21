import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { data: session } = await supabase.auth.getUser();
  const user = session.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { ticket_id, message } = body || {};
  if (!ticket_id || !message) return NextResponse.json({ error: 'ticket_id und message erforderlich' }, { status: 400 });

  const role = (session.user.user_metadata?.role as string) || 'student';

  // prüfen, ob Nutzer Zugriff auf Ticket hat (RLS schützt zusätzlich)
  const { data: ticket, error: tErr } = await service
    .from('support_tickets')
    .select('id, created_by, status')
    .eq('id', ticket_id)
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
  const isAdmin = role === 'admin' || (session.user.app_metadata?.role as string) === 'admin';
  if (!isAdmin && ticket.created_by !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await service.from('support_messages').insert({
    ticket_id,
    author_id: user.id,
    author_role: role,
    body: message,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Status updaten: admin -> in_progress, user auf geschlossenem Ticket -> in_progress
  const nextStatus = isAdmin ? 'in_progress' : ticket.status === 'closed' ? 'in_progress' : ticket.status;
  await service
    .from('support_tickets')
    .update({ status: nextStatus, last_message_at: new Date().toISOString() })
    .eq('id', ticket_id);

  return NextResponse.json({ ok: true });
}
