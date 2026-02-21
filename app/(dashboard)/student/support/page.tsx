'use client';

import { useEffect, useState } from 'react';

export default function StudentSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/support/tickets');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setTickets([]);
    } else {
      setError(null);
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-6 space-y-6">
      {/* Tabs wie im Dashboard */}
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        {[
          ['Meine Buchungen', '/student'],
          ['Kursunterlagen', '/student?tab=materials'],
          ['Profil', '/student?tab=profile'],
          ['Kurs Bewertung', '/student?tab=feedback'],
          ['Support', '/student/support'],
        ].map(([label, href]) => (
          <a
            key={label}
            href={href}
            className={`px-3 py-2 rounded-lg border ${href === '/student/support' ? 'border-pink-400 bg-pink-100 text-pink-800' : 'border-slate-300 bg-white text-slate-700 hover:border-pink-300 hover:text-pink-700'}`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">Support Center</p>
          <h1 className="text-2xl font-semibold">Wie können wir helfen?</h1>
          <p className="text-sm text-white/80">Erstelle ein Ticket oder sieh dir den bisherigen Verlauf an.</p>
        </div>
        <div className="rounded-xl bg-white/15 px-4 py-3 text-sm text-white/90 border border-white/30">
          Antworten von Mo–Fr 09:00–17:00 Uhr. Priorität Hoch wird bevorzugt.
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-3">
        <p className="text-sm text-slate-700">Neues Ticket</p>

      <div className="rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-3">
        <p className="text-sm text-slate-700">Neues Ticket</p>
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

      <div className="rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Meine Tickets</h2>
          {loading && <p className="text-sm text-slate-500">Lade…</p>}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !tickets.length && <p className="text-sm text-slate-600">Keine Tickets vorhanden.</p>}
        {tickets.length > 0 && (
          <div className="divide-y divide-slate-200">
            {tickets.map((t) => (
              <details key={t.id} className="py-3">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">{t.subject}</p>
                    <p className="text-xs text-slate-600">Ticket-Nr.: #{t.id?.slice(0, 8)?.toUpperCase() || '—'}</p>
                    <p className="text-xs text-slate-600">Status: {t.status} · Priorität: {t.priority} · Letzte Nachricht: {new Date(t.last_message_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full border text-xs ${t.status === 'open' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : t.status === 'in_progress' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>
                    {t.status}
                  </span>
                </summary>
                <TicketThread ticketId={t.id} />
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketThread({ ticketId }: { ticketId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/support/tickets?id=${ticketId}`);
    const data = await res.json();
    if (res.ok) {
      setMessages((data as any).support_messages || (data as any).messages || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [ticketId]);

  const send = async () => {
    if (!reply.trim()) return;
    const res = await fetch('/api/support/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, message: reply }),
    });
    if (res.ok) {
      setReply('');
      load();
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {loading && <p className="text-sm text-slate-500">Lade Verlauf…</p>}
      {!loading && messages.length === 0 && <p className="text-sm text-slate-600">Noch keine Antworten.</p>}
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-xl px-3 py-2 border ${m.author_role === 'admin' ? 'border-pink-200 bg-pink-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">{m.author_role}</div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.body}</p>
            <p className="text-[11px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-start">
        <textarea className="input flex-1 bg-white border border-slate-300 text-slate-900" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Antwort schreiben…" />
        <button
          className="rounded-lg bg-pink-600 text-white px-3 py-2 hover:bg-pink-500 disabled:opacity-60"
          onClick={send}
          disabled={!reply.trim()}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
