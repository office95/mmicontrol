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

  // Ticket laden (robust, ohne sich auf Relations im Cache zu verlassen)
  let ticket = null;
  const ticketRes = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by')
    .eq('id', params.id)
    .maybeSingle();
  ticket = ticketRes.data;
  if (ticketRes.error) {
    console.error('ticket load error', ticketRes.error);
  }
  // Creator-Daten nachladen
  let creator: { full_name: string | null; email: string | null } | null = null;
  if (ticket?.created_by) {
    const { data: c } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ticket.created_by)
      .maybeSingle();
    creator = c ?? null;
  }

  const { data: messages } = await supabase
    .from('support_messages')
    .select('id, author_role, author_id, body, created_at')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true });

  // Autor-Namen nachladen
  const authorIds = Array.from(new Set((messages || []).map((m) => m.author_id).filter(Boolean))) as string[];
  const authorMap = new Map<string, string>();
  if (authorIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds);
    profiles?.forEach((p) => authorMap.set(p.id, p.full_name || ''));
  }

  const initialMessage = ticket?.message
    ? [{
        id: 'initial',
        author_role: ticket.role || 'student',
        author_id: ticket.created_by,
        body: ticket.message,
        created_at: ticket.created_at,
        profiles: null,
        students: null,
        teachers: null,
      }]
    : [];

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-6">
        <p>Ticket nicht gefunden.</p>
        <Link href="/admin/support" className="text-pink-600">Zurück</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white space-y-6 px-4 sm:px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Support</p>
          <h1 className="text-3xl font-semibold text-white">{ticket.subject}</h1>
          <p className="text-sm text-white/70">Status: {ticket.status} · Priorität: {ticket.priority} · Rolle: {ticket.role}</p>
          <p className="text-sm text-white/80 mt-1">
            Von: {(creator?.full_name as string) || '—'} · {(creator?.email as string) || '—'}
          </p>
        </div>
        <Link href="/admin/support" className="text-sm text-pink-200 hover:text-pink-100">Zurück zur Übersicht</Link>
      </div>

      <div className="rounded-2xl bg-white text-slate-900 p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="text-xs text-slate-600">Erstellt: {new Date(ticket.created_at).toLocaleString()} · Letzte Nachricht: {new Date(ticket.last_message_at).toLocaleString()}</div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {[...initialMessage, ...(messages || [])].map((m) => {
            const name =
              m.author_role === 'admin'
                ? 'Music Mission Team'
                : authorMap.get(m.author_id) || m.author_role || 'Teilnehmer';
            const cls =
              m.author_role === 'admin'
                ? 'border-rose-200 bg-rose-50'
                : m.author_role === 'teacher'
                  ? 'border-indigo-200 bg-indigo-50'
                  : 'border-slate-200 bg-slate-50';
            return (
              <div key={m.id} className={`rounded-2xl px-3 py-2 border ${cls}`}>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">{name}</div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.body}</p>
                <p className="text-[11px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
        <SupportReply ticketId={ticket.id} currentStatus={ticket.status} currentPriority={ticket.priority} />
      </div>
    </div>
  );
}
