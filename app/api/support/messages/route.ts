import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';

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

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (session.user.user_metadata?.role as string) || profile?.role || 'unassigned';

  // prüfen, ob Nutzer Zugriff auf Ticket hat (RLS schützt zusätzlich)
  const { data: ticket, error: tErr } = await service
    .from('support_tickets')
    .select('id, created_by, status')
    .eq('id', ticket_id)
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
  if (ticket.status === 'closed') {
    return NextResponse.json({ error: 'ticket ist geschlossen' }, { status: 403 });
  }
  const isAdmin =
    role === 'admin' ||
    profile?.role === 'admin' ||
    (session.user.app_metadata?.role as string) === 'admin';
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

  // Status updaten: gewünschter Status falls mitgeschickt, sonst in_progress.
  // Sonderfall: erstes Admin-Reply auf ein offenes Ticket -> in_progress.
  const desired = (body?.status as string) || undefined;
  const allowedStatus = ['open', 'in_progress', 'closed'];
  let nextStatus = allowedStatus.includes(desired || '') ? desired : 'in_progress';
  if (!desired && ticket.status === 'open') {
    nextStatus = 'in_progress';
  }
  await service
    .from('support_tickets')
    .update({ status: nextStatus, last_message_at: new Date().toISOString() })
    .eq('id', ticket_id);

  // Notify admin mailbox (simple)
  await sendMail({
    to: process.env.NOTIFY_ADMIN_EMAIL || 'office@musicmission.at',
    subject: `Support: neue Nachricht zu Ticket ${ticket_id}`,
    text: `Ticket ${ticket_id}\nStatus: ${nextStatus}\nVon: ${role}\nNachricht:\n${message}`,
  });

  // Notify Ticket-Ersteller (nur wenn Absender nicht der Ersteller ist)
  try {
    if (ticket.created_by && ticket.created_by !== user.id) {
      const { data: ownerProfile } = await service
        .from('profiles')
        .select('full_name')
        .eq('id', ticket.created_by)
        .maybeSingle();
      const ownerUser = await service.auth.admin.getUserById(ticket.created_by);
      const ownerEmail = ownerUser.data?.user?.email;
      const ownerName = ownerProfile?.full_name || ownerUser.data?.user?.user_metadata?.full_name || 'Music Mission Nutzer';
      if (ownerEmail) {
        await sendMail({
          to: ownerEmail,
          subject: `Neue Antwort zu deinem Support-Ticket ${ticket_id}`,
          text: [
            `Hallo ${ownerName},`,
            '',
            'es gibt eine neue Antwort auf dein Support-Ticket.',
            `Ticket-ID: ${ticket_id}`,
            `Status: ${nextStatus}`,
            '',
            'Nachricht:',
            message,
            '',
            'Antworten kannst du direkt im Dashboard im Tab "Support".',
            '',
            'Liebe Grüße',
            'Music Mission Team'
          ].join('\n'),
        });
      }
    }
  } catch (e) {
    console.warn('support owner mail failed', e);
  }

  // Falls Ticket jetzt geschlossen wird: Abschluss-Mail an Ersteller
  try {
    if (nextStatus === 'closed' && ticket.created_by) {
      const u = await service.auth.admin.getUserById(ticket.created_by);
      const email = u.data?.user?.email;
      const name = u.data?.user?.user_metadata?.full_name || 'Music Mission Nutzer';
      if (email) {
        await sendMail({
          to: email,
          subject: `Ticket ${ticket_id} wurde geschlossen`,
          text: [
            `Hallo ${name},`,
            '',
            'dein Support-Ticket wurde soeben geschlossen.',
            `Ticket-ID: ${ticket_id}`,
            '',
            'Falls du noch etwas brauchst, erstelle einfach ein neues Ticket.',
            '',
            'Liebe Grüße',
            'Music Mission Team'
          ].join('\n'),
        });
      }
    }
  } catch (e) {
    console.warn('support closed mail failed', e);
  }

  return NextResponse.json({ ok: true });
}
