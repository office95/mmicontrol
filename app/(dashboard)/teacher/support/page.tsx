'use client';

import { useEffect, useState } from 'react';

export default function TeacherSupportPage() {
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
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Support</p>
        <h1 className="text-3xl font-semibold text-white">Support für Dozenten</h1>
        <p className="text-sm text-slate-200">Tickets erstellen und den Verlauf einsehen.</p>
      </div>

      <div className="card p-6 shadow-xl text-white space-y-3">
        <p className="text-sm text-white/80">Neues Ticket</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input className="input" placeholder="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
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
          className="input h-24"
          placeholder="Nachricht"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="card p-6 shadow-xl text-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meine Tickets</h2>
          {loading && <p className="text-sm text-white/60">Lade…</p>}
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {!loading && !tickets.length && <p className="text-sm text-white/70">Keine Tickets vorhanden.</p>}
        {tickets.length > 0 && (
          <div className="divide-y divide-white/10">
            {tickets.map((t) => (
              <details key={t.id} className="py-3">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">{t.subject}</p>
                    <p className="text-xs text-white/60">Status: {t.status} · Priorität: {t.priority} · Letzte Nachricht: {new Date(t.last_message_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full border text-xs ${t.status === 'open' ? 'border-emerald-200 text-emerald-100 bg-emerald-500/20' : t.status === 'in_progress' ? 'border-amber-200 text-amber-100 bg-amber-500/20' : 'border-slate-200 text-slate-100 bg-slate-500/20'}`}>
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
      {loading && <p className="text-sm text-white/60">Lade Verlauf…</p>}
      {!loading && messages.length === 0 && <p className="text-sm text-white/70">Noch keine Antworten.</p>}
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-xl px-3 py-2 border ${m.author_role === 'admin' ? 'border-pink-300/40 bg-pink-500/10' : 'border-white/15 bg-white/5'}`}>
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 mb-1">{m.author_role}</div>
            <p className="text-sm text-white/90 whitespace-pre-wrap">{m.body}</p>
            <p className="text-[11px] text-white/50 mt-1">{new Date(m.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-start">
        <textarea className="input flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Antwort schreiben…" />
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
