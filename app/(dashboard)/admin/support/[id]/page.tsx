import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import SupportReply from '@/components/support-reply';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function SupportDetail({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by')
    .eq('id', params.id)
    .maybeSingle();

  const { data: messages } = await supabase
    .from('support_messages')
    .select('id, author_role, author_id, body, created_at')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true });

  if (!ticket) {
    return (
      <div className="text-white">
        <p>Ticket nicht gefunden.</p>
        <Link href="/admin/support" className="text-pink-200">Zurück</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Support</p>
          <h1 className="text-3xl font-semibold text-white">{ticket.subject}</h1>
          <p className="text-sm text-slate-200">Status: {ticket.status} · Priorität: {ticket.priority} · Rolle: {ticket.role}</p>
        </div>
        <Link href="/admin/support" className="text-sm text-pink-200 hover:text-pink-100">Zurück zur Übersicht</Link>
      </div>

      <div className="card p-6 shadow-xl text-white space-y-4">
        <div className="text-xs text-white/70">Erstellt: {new Date(ticket.created_at).toLocaleString()} · Letzte Nachricht: {new Date(ticket.last_message_at).toLocaleString()}</div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {messages?.map((m) => (
            <div key={m.id} className={`rounded-2xl px-3 py-2 border ${m.author_role === 'admin' ? 'border-pink-300/40 bg-pink-500/10' : 'border-white/15 bg-white/5'}`}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 mb-1">{m.author_role}</div>
              <p className="text-sm text-white/90 whitespace-pre-wrap">{m.body}</p>
              <p className="text-[11px] text-white/50 mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <SupportReply ticketId={ticket.id} currentStatus={ticket.status} currentPriority={ticket.priority} />
      </div>
    </div>
  );
}
