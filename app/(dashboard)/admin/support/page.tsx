import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import SupportFilterSelect from '@/components/support-filter-select';
import SupportSearch from '@/components/support-search';

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

export default async function AdminSupportPage({ searchParams }: { searchParams?: { status?: string | string[]; q?: string | string[] } }) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let ticketsError: string | null = null;
  let tickets:
    | {
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
      }[]
    | null = null;

  const rich = await supabase
    .from('support_tickets')
    .select(`
      id, subject, status, priority, role, created_at, last_message_at, message, created_by,
      support_messages (
        id, author_role, author_id, body, created_at
      )
    `)
    .order('last_message_at', { ascending: false })
    .limit(200);

  if (rich.error) {
    ticketsError = rich.error.message;
    const fallback = await supabase
      .from('support_tickets')
      .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by')
      .order('last_message_at', { ascending: false })
      .limit(200);
    tickets = fallback.data || [];
    if (fallback.error && !ticketsError) ticketsError = fallback.error.message;
  } else {
    tickets = rich.data || [];
  }

  // Wenn keine Tickets geladen wurden, mit einfacher Abfrage erneut versuchen
  if (!tickets || tickets.length === 0) {
    const { data: fallback } = await supabase
      .from('support_tickets')
      .select('id, subject, status, priority, role, created_at, last_message_at, message, created_by')
      .order('created_at', { ascending: false })
      .limit(200);
    tickets = fallback || [];
  }

  // Offene Tickets als "gesehen" markieren: auf in_progress setzen, sobald Admin Übersicht öffnet
  if (tickets && tickets.length) {
    const openIds = tickets.filter((t) => t.status === 'open').map((t) => t.id);
    if (openIds.length) {
      await supabase.from('support_tickets').update({ status: 'in_progress' }).in('id', openIds);
      tickets.forEach((t) => {
        if (t.status === 'open') t.status = 'in_progress';
      });
    }
  }

  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = now.getMonth();

  // Autoren auflösen
  const creatorIds = Array.from(new Set((tickets || []).map((t) => t.created_by).filter(Boolean))) as string[];
  let creatorMap = new Map<string, { name: string; email: string }>();
  if (creatorIds.length) {
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creatorIds);
    creators?.forEach((c) => {
      creatorMap.set(c.id, {
        name: c.full_name || 'Unbekannt',
        email: (c as any).email || '',
      });
    });
  }

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
  const qParam = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const allowed: Array<'all' | 'open' | 'in_progress' | 'closed'> = ['all', 'open', 'in_progress', 'closed'];
  const statusFilter = (allowed.includes((statusParam as any) || '') ? statusParam : 'all') as 'all' | 'open' | 'in_progress' | 'closed';
  const statusLabel =
    statusFilter === 'open'
      ? 'Offen'
      : statusFilter === 'in_progress'
        ? 'In Bearbeitung'
        : statusFilter === 'closed'
          ? 'Geschlossen'
          : 'Alle Tickets';
  const weight = { open: 0, in_progress: 1, closed: 2 } as Record<string, number>;
  const sortedTickets = (tickets || []).sort((a, b) => {
    const wa = weight[a.status] ?? 3;
    const wb = weight[b.status] ?? 3;
    if (wa !== wb) return wa - wb;
    return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime();
  });
  const filteredTickets = sortedTickets.filter((t) => {
    const statusOk = statusFilter === 'all' ? true : (t.status || 'open') === statusFilter;
    const queryOk = qParam
      ? (t.subject?.toLowerCase().includes(qParam.toLowerCase()) || t.id.toLowerCase().includes(qParam.toLowerCase()))
      : true;
    return statusOk && queryOk;
  });
  const visibleTickets = filteredTickets.length ? filteredTickets : sortedTickets;

  return (
    <div className="min-h-screen bg-transparent text-slate-900 px-4 sm:px-6 lg:px-10 py-8">
      <div className="rounded-2xl bg-white/10 border border-white/15 p-6 shadow-lg text-white mb-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">Admin · Support</p>
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="text-3xl font-semibold">Ticket-Management</h1>
          <span className="px-3 py-1.5 rounded-full bg-white/15 text-sm">{statusLabel}</span>
        </div>
        <p className="text-sm text-white/80 mt-1">Alle Support-Anfragen, schnelle Filterung und direkter Zugriff auf Threads.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Offene Tickets" value={openCount} />
        <KpiCard label="Ø Erledigungsdauer" value={avgResolutionDays != null ? `${avgResolutionDays.toFixed(1)} Tage` : '—'} />
        <KpiCard label="Tickets diesen Monat" value={monthCount} />
        <KpiCard label="Tickets dieses Jahr" value={yearCount} />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xl text-slate-900 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{statusLabel}</h2>
            <p className="text-xs text-slate-500">{visibleTickets.length} Tickets · {(tickets || []).length} gesamt</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-500">Status</label>
            <SupportFilterSelect current={statusFilter} />
          </div>
          <div className="flex items-center gap-2">
            <SupportSearch status={statusFilter} />
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Offen: {(tickets || []).filter((t) => t.status === 'open').length}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              In Bearbeitung: {(tickets || []).filter((t) => t.status === 'in_progress').length}
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Geschlossen: {(tickets || []).filter((t) => t.status === 'closed').length}
            </span>
          </div>
        </div>

        {ticketsError && <p className="text-sm text-rose-600">Fehler beim Laden: {ticketsError}</p>}
        {(!tickets || tickets.length === 0) && <p className="text-sm text-slate-600">Keine Tickets vorhanden.</p>}

        {visibleTickets && (
          <div className="divide-y divide-slate-200">
            {visibleTickets.map((t) => {
              const messages = (t.support_messages as any[]) || [];
              const hasInitialAlready = messages.some(
                (m) => m.body === t.message && m.author_id === t.created_by
              );
              const thread = [
                ...(!hasInitialAlready && t.message
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
                ...messages,
              ];

              return (
                <details
                  key={t.id}
                  className={`py-4 group rounded-xl border ${t.status === 'open' ? 'border-rose-200 bg-rose-50/60 shadow-md' : 'border-slate-200 bg-white'}`}
                >
                  <summary className="flex items-start justify-between cursor-pointer px-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {t.status === 'open' && (
                          <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-rose-500 text-white">Neu</span>
                        )}
                        <p className="text-base font-semibold text-slate-900 group-open:text-pink-700">{t.subject}</p>
                      </div>
                      <p className="text-xs font-mono text-slate-600 font-semibold">Ticket #{t.id?.slice(0,8)?.toUpperCase()}</p>
                      <p className="text-xs text-slate-500">
                        Von: {creatorMap.get(t.created_by || '')?.name ?? '—'} · {creatorMap.get(t.created_by || '')?.email ?? ''}
                      </p>
                      {t.message && <p className="text-sm text-slate-700 line-clamp-2">{t.message}</p>}
                      <p className="text-xs text-slate-500">
                        Rolle: {t.role ?? '—'} · Erstellt: {new Date(t.created_at).toLocaleString()} · Letzte Nachricht: {new Date(t.last_message_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs ml-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded-full border ${t.priority === 'high' ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>
                          <span className="text-[10px] uppercase tracking-[0.14em] mr-1 text-slate-500">Priorität</span>
                          {t.priority === 'high' ? 'High' : 'Normal'}
                        </span>
                        <span className={`px-2 py-1 rounded-full border ${t.status === 'open' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : t.status === 'in_progress' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>
                          <span className="text-[10px] uppercase tracking-[0.14em] mr-1 text-slate-500">Status</span>
                          {t.status === 'open' ? 'Offen' : t.status === 'in_progress' ? 'In Bearbeitung' : 'Geschlossen'}
                        </span>
                      </div>
                      <Link href={`/admin/support/${t.id}`} className="px-3 py-1 rounded-full bg-pink-600 text-white text-xs font-semibold hover:bg-pink-500">
                        Antworten
                      </Link>
                    </div>
                  </summary>

                  <div className="mt-3 space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
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
                            : 'border-slate-200 bg-white';
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
