import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import SupportFilterSelect from '@/components/support-filter-select';

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
  created_by?: string;
  support_messages?: any[];
};

export default async function AdminSupportPage({ searchParams }: { searchParams?: { status?: string | string[] } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      id, subject, status, priority, role, created_at, last_message_at, message, created_by,
      support_messages (
        id, author_role, author_id, body, created_at,
        profiles:author_id ( full_name ),
        students:author_id ( full_name ),
        teachers:author_id ( full_name )
      )
    `)
    .order('last_message_at', { ascending: false })
    .limit(200);

  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = now.getMonth();

  const openCount = (tickets || []).filter((t) => t.status === 'open').length;
  const monthCount = (tickets || []).filter((t) => {
    const d = t.created_at ? new Date(t.created_at) : null;
    return d && d.getFullYear() === currYear && d.getMonth() === currMonth;
  }).length;
  const yearCount = (tickets || []).filter((t) => {
    const d = t.created_at ? new Date(t.created_at) : null;
    return d && d.getFullYear() === currYear;
  }).length;

  const closed = (tickets || []).filter((t) => t.status === 'closed' && t.last_message_at && t.created_at);
  const avgResolutionMs = closed.length
    ? closed.reduce((acc, t) => {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.last_message_at!).getTime();
        return acc + Math.max(0, end - start);
      }, 0) / closed.length
    : null;
  const avgResolutionDays = avgResolutionMs ? avgResolutionMs / (1000 * 60 * 60 * 24) : null;

  const statusParam = Array.isArray(searchParams?.status) ? searchParams?.status[0] : searchParams?.status;
  const allowed: Array<'all' | 'open' | 'in_progress' | 'closed'> = ['all', 'open', 'in_progress', 'closed'];
  const statusFilter = (allowed.includes((statusParam as any) || '') ? statusParam : 'all') as 'all' | 'open' | 'in_progress' | 'closed';
  const sortedTickets = (tickets || []).sort((a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime());
  const filteredTickets = sortedTickets.filter((t) =>
    statusFilter === 'all' ? true : (t.status || 'open') === statusFilter
  );
  const visibleTickets = filteredTickets.length ? filteredTickets : sortedTickets;

  return (
    <div className="min-h-screen bg-transparent text-white space-y-6 px-4 sm:px-6 lg:px-10 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Support</h1>
        <p className="text-sm text-white/70">Neueste Support-Tickets und schnelle Übersicht.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Offene Tickets" value={openCount} />
        <KpiCard label="Ø Erledigungsdauer" value={avgResolutionDays != null ? `${avgResolutionDays.toFixed(1)} Tage` : '—'} />
        <KpiCard label="Tickets diesen Monat" value={monthCount} />
        <KpiCard label="Tickets dieses Jahr" value={yearCount} />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xl text-slate-900">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Offene Tickets</h2>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-500">Status</label>
            <SupportFilterSelect current={statusFilter} />
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              offen: {(tickets || []).filter((t) => t.status === 'open').length}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              in Bearbeitung: {(tickets || []).filter((t) => t.status === 'in_progress').length}
            </span>
          </div>
        </div>

        {(!tickets || tickets.length === 0) && <p className="text-sm text-slate-600">Keine Tickets vorhanden.</p>}

        {visibleTickets && (
          <div className="divide-y divide-slate-200">
            {visibleTickets.map((t) => {
              const thread = [
                ...(t.message
                  ? [{
                      id: 'initial',
                      author_role: t.role || 'student',
                      author_id: t.created_by,
                      body: t.message,
                      created_at: t.created_at,
                      profiles: null,
                      students: null,
                      teachers: null,
                    }]
                  : []),
                ...((t.support_messages as any[]) || []),
              ];

              return (
                <details key={t.id} className="py-3 group">
                  <summary className="flex items-start justify-between cursor-pointer">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900 group-open:text-pink-700">{t.subject}</p>
                      {t.message && <p className="text-sm text-slate-700 line-clamp-2">{t.message}</p>}
                      <p className="text-xs text-slate-500">
                        Rolle: {t.role ?? '—'} · Erstellt: {new Date(t.created_at).toLocaleString()} · Letzte Nachricht: {new Date(t.last_message_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs ml-4">
                      <span className={`px-2 py-1 rounded-full border ${t.priority === 'high' ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>
                        {t.priority === 'high' ? 'High' : 'Normal'}
                      </span>
                      <span className={`px-2 py-1 rounded-full border ${t.status === 'open' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : t.status === 'in_progress' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>
                        {t.status}
                      </span>
                      <Link href={`/admin/support/${t.id}`} className="text-pink-600 hover:text-pink-700">Vollansicht</Link>
                    </div>
                  </summary>

                  <div className="mt-3 space-y-2">
                    {thread.map((m) => {
                      const name =
                        m.author_role === 'admin'
                          ? 'Music Mission Team'
                          : (m.profiles as any)?.full_name || (m.students as any)?.full_name || (m.teachers as any)?.full_name || m.author_role || 'Teilnehmer';
                      const cls =
                        m.author_role === 'admin'
                          ? 'border-rose-200 bg-rose-50'
                          : m.author_role === 'teacher'
                            ? 'border-indigo-200 bg-indigo-50'
                            : 'border-slate-200 bg-slate-50';
                      return (
                        <div key={m.id + String(m.created_at)} className={`rounded-xl px-3 py-2 border ${cls}`}>
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">{name}</div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.body}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm text-slate-900">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
