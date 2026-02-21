import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  role: string | null;
  created_at: string;
  last_message_at: string;
  message?: string;
};

export default async function AdminSupportPage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, role, created_at, last_message_at, message')
    .order('last_message_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Support</h1>
        <p className="text-sm text-slate-200">Neueste Support-Tickets und schnelle Übersicht.</p>
      </div>

      <div className="card p-6 shadow-xl text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Offene Tickets</h2>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-200/40">
              offen: {(tickets || []).filter((t) => t.status === 'open').length}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-100 border border-amber-200/40">
              in Bearbeitung: {(tickets || []).filter((t) => t.status === 'in_progress').length}
            </span>
          </div>
        </div>

        {(!tickets || tickets.length === 0) && <p className="text-sm text-white/70">Keine Tickets vorhanden.</p>}

        {tickets && (
          <div className="divide-y divide-white/10">
            {tickets.map((t) => (
              <div key={t.id} className="py-3 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">{t.subject}</p>
                  {t.message && <p className="text-sm text-white/80 line-clamp-2">{t.message}</p>}
                  <p className="text-xs text-white/60">
                    Rolle: {t.role ?? '—'} · Erstellt: {new Date(t.created_at).toLocaleString()} · Letzte Nachricht: {new Date(t.last_message_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-full border ${t.priority === 'high' ? 'border-rose-200 text-rose-100 bg-rose-500/20' : 'border-white/20 text-white/80 bg-white/10'}`}>
                    {t.priority === 'high' ? 'High' : 'Normal'}
                  </span>
                  <span className={`px-2 py-1 rounded-full border ${t.status === 'open' ? 'border-emerald-200 text-emerald-100 bg-emerald-500/20' : t.status === 'in_progress' ? 'border-amber-200 text-amber-100 bg-amber-500/20' : 'border-slate-200 text-slate-100 bg-slate-500/20'}`}>
                    {t.status}
                  </span>
                  <Link href={`/admin/support/${t.id}`} className="text-pink-200 hover:text-pink-100">Öffnen</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
