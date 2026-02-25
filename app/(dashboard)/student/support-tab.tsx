'use client';

import { useEffect, useState } from 'react';

export default function StudentSupportTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [message, setMessage] = useState('');
  const [unread, setUnread] = useState(0);
  const [seenTick, setSeenTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [hasMore, setHasMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const seenKey = (id: string) => `support_seen_${id}`;
  const isTicketUnread = (t: any) => {
    if (typeof window === 'undefined') return false;
    const last = t.last_message_at ? new Date(t.last_message_at).getTime() : 0;
    const seen = Number(localStorage.getItem(seenKey(t.id)) || 0);
    return last > seen;
  };

  const load = async (nextPage = page) => {
    setLoading(true);
    const res = await fetch(`/api/support/tickets?limit=${pageSize}&offset=${nextPage * pageSize}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setTickets([]);
    } else {
      setError(null);
      setTickets(data || []);
      setHasMore((data || []).length === pageSize);
      setPage(nextPage);
      setUnread(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(0);
    fetch('/api/support/unread').then(async (r) => {
      const d = await r.json();
      setUnread(d.count || 0);
    });
  }, []);

  const create = async () => {
    if (!subject.trim() || !message.trim()) return;
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, priority }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Konnte Ticket nicht anlegen');
      return;
    }
    setSubject('');
    setMessage('');
    setPriority('normal');
    load();
  };

  const filteredTickets = tickets.filter((t) =>
    statusFilter === 'all' ? true : (t.status || 'open') === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 shadow-xl border border-white/10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">Support · Teilnehmer</p>
        <h1 className="text-3xl font-semibold">Wie können wir dir helfen?</h1>
        <p className="text-sm text-white/80">Erstelle ein Ticket oder sieh dir die bisherigen im Verlauf an.</p>
      </div>

      <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-3 text-slate-900">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-700">Neues Ticket</p>
          {unread > 0 && (
            <span className="inline-flex h-6 px-2 items-center rounded-full bg-rose-500 text-white text-[11px] font-semibold">
              {unread} neu
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input className="input bg-white border border-slate-300 text-slate-900" placeholder="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <select className="input bg-white border border-slate-300 text-slate-900" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="normal">Priorität: Normal</option>
            <option value="high">Priorität: Hoch</option>
          </select>
          <button
            className="rounded-lg bg-pink-600 text-white px-4 py-2 font-semibold hover:bg-pink-500 disabled:opacity-60"
            onClick={create}
            disabled={!subject.trim() || !message.trim()}
          >
            Ticket senden
          </button>
        </div>
        <textarea
          className="input h-24 bg-white border border-slate-300 text-slate-900"
          placeholder="Nachricht"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4 text-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Meine Tickets</h2>
          {loading && <p className="text-sm text-slate-500">Lade…</p>}
          <div className="flex items-center gap-2 text-sm">
            <label className="text-xs uppercase tracking-[0.14em] text-slate-500">Status</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Alle</option>
              <option value="open">Offen</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="closed">Geschlossen</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !tickets.length && <p className="text-sm text-slate-600">Keine Tickets vorhanden.</p>}
        {!loading && tickets.length > 0 && filteredTickets.length === 0 && (
          <p className="text-sm text-slate-600">Keine Tickets mit diesem Status.</p>
        )}
        {tickets.length > 0 && filteredTickets.length > 0 && (
          <div className="divide-y divide-slate-200">
            {filteredTickets.map((t) => {
              const isOpen = openId === t.id;
              return (
              <details key={t.id} className="py-3" open={isOpen}>
                <summary
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    setOpenId((prev) => prev === t.id ? null : t.id);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(seenKey(t.id), Date.now().toString());
                      setSeenTick((x) => x + 1);
                    }
                  }}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">{t.subject}</p>
                    <p className="text-xs text-slate-600">
                      Von: {(t as any).creator?.full_name ?? `ID: ${(t as any).created_by?.slice(0,8) ?? '—'}`} · {(t as any).creator?.email ?? '—'}
                    </p>
                    <p className="text-xs text-slate-600">Ticket-Nr.: #{t.id?.slice(0, 8)?.toUpperCase() || '—'}</p>
                    <p className="text-xs text-slate-600">Status: {t.status === 'open' ? 'Offen' : t.status === 'in_progress' ? 'In Bearbeitung' : 'Geschlossen'} · Priorität: {t.priority === 'high' ? 'High' : 'Normal'} · Letzte Nachricht: {new Date(t.last_message_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTicketUnread(t) && <span className="px-2 py-1 rounded-full bg-rose-500 text-white text-[11px] font-semibold">Neu</span>}
                    <span className={`px-2 py-1 rounded-full border text-xs ${t.status === 'open' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : t.status === 'in_progress' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>
                      {t.status === 'open' ? 'Offen' : t.status === 'in_progress' ? 'In Bearbeitung' : 'Geschlossen'}
                    </span>
                  </div>
                </summary>
                {isOpen && <TicketThread ticketId={t.id} />}
              </details>
            )})}
          </div>
        )}
        <div className="flex items-center justify-between pt-3">
          <button
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"
            onClick={() => load(Math.max(0, page - 1))}
            disabled={page === 0 || loading}
          >
            ← Zurück
          </button>
          <span className="text-xs text-slate-600">Seite {page + 1}</span>
          <button
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"
            onClick={() => load(page + 1)}
            disabled={!hasMore || loading}
          >
            Weiter →
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketThread({ ticketId }: { ticketId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/support/messages?ticket_id=${ticketId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setMessages([]);
    } else {
      setError(null);
      setMessages(data || []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [ticketId]);

  const send = async () => {
    if (!reply.trim()) return;
    const res = await fetch('/api/support/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, message: reply }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Konnte Nachricht nicht senden');
      return;
    }
    setReply('');
    load();
  };

  return (
    <div className="mt-3 space-y-3">
      {loading && <p className="text-sm text-slate-500">Lade…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {messages.map((m, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{m.author_name || 'Support'}</p>
            <p className="text-[11px] text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <textarea
          className="input h-20 bg-white border border-slate-300 text-slate-900"
          placeholder="Antwort schreiben"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          className="self-end rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
          onClick={send}
          disabled={!reply.trim()}
        >
          Antworten
        </button>
      </div>
    </div>
  );
}
