'use client';

import { useState } from 'react';

export default function SupportReply({ ticketId, currentStatus, currentPriority }: { ticketId: string; currentStatus?: string; currentPriority?: string }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(currentStatus || 'in_progress');
  const [priority, setPriority] = useState(currentPriority || 'normal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, message }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Fehler beim Senden');
      }
      // Status/Prio ggf. aktualisieren
      await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status, priority }),
      });
      setMessage('');
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 text-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Antwort</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 min-h-[90px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Antwort schreiben..."
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</label>
            <select className="input bg-white border border-slate-300 text-slate-900" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">offen</option>
              <option value="in_progress">in Bearbeitung</option>
              <option value="closed">geschlossen</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Priorität</label>
            <select className="input bg-white border border-slate-300 text-slate-900" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="normal">normal</option>
              <option value="high">hoch</option>
            </select>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
          onClick={() => setMessage('')}
          disabled={saving}
        >
          Leeren
        </button>
        <button
          className="rounded-lg bg-pink-600 text-white px-4 py-2 hover:bg-pink-500 disabled:opacity-60"
          onClick={send}
          disabled={saving || !message.trim()}
        >
          {saving ? 'Senden…' : 'Antwort senden'}
        </button>
      </div>
    </div>
  );
}
