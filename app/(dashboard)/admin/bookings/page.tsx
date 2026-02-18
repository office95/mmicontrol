'use client';

import { useEffect, useMemo, useState } from 'react';
import ButtonLink from '@/components/button-link';

type BookingRow = {
  id: string;
  booking_code: string | null;
  booking_date: string | null;
  amount: number | null;
  course_id?: string | null;
  status: string;
  student_name: string | null;
  course_title: string | null;
  course_start: string | null;
  partner_name: string | null;
  student_email?: string | null;
  vat_rate?: number | null;
  price_net?: number | null;
  deposit?: number | null;
  saldo?: number | null;
  duration_hours?: number | null;
};

const STATUSES = ['alle', 'offen', 'Anzahlung erhalten', 'abgeschlossen', 'Zahlungserinnerung', '1. Mahnung', '2. Mahnung', 'Inkasso', 'Storno', 'Archiv'];

export default function BookingsPage() {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('alle');
  const [selected, setSelected] = useState<BookingRow | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/bookings');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setItems([]);
    } else {
      setItems(data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((b) => {
      const statusOk = status === 'alle' ? true : b.status === status;
      const text = `${b.student_name ?? ''} ${b.course_title ?? ''} ${b.partner_name ?? ''} ${b.booking_code ?? ''}`.toLowerCase();
      const searchOk = term === '' ? true : text.includes(term);
      return statusOk && searchOk;
    });
  }, [items, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Buchungsübersicht</h1>
          <p className="text-sm text-slate-200">Alle Buchungen mit Filter & Suche.</p>
        </div>
        <ButtonLink href="/admin">Zurück</ButtonLink>
      </div>

      <div className="flex items-center flex-wrap gap-3 justify-between">
        <select
          className="input h-8 py-1 text-sm w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="input h-8 py-1 text-sm max-w-sm ml-auto"
          placeholder="Suche: Teilnehmer, Kurs, Anbieter, Code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-6 shadow-xl text-slate-900 overflow-x-auto">
        {loading && <p className="text-sm text-slate-500">Lade Buchungen...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !filtered.length && <p className="text-sm text-slate-500">Keine Buchungen gefunden.</p>}

        {!loading && filtered.length > 0 && (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Buchungsdatum</th>
                <th className="py-2 pr-4">Kursteilnehmer</th>
                <th className="py-2 pr-4">Kurs</th>
                <th className="py-2 pr-4">Kursstart</th>
                <th className="py-2 pr-4">Kursbeitrag Brutto</th>
                <th className="py-2 pr-4">Anbieter</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="py-3 pr-4">{b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</td>
                  <td className="py-3 pr-4">{b.student_name ?? '—'}</td>
                  <td className="py-3 pr-4">{b.course_title ?? '—'}</td>
                  <td className="py-3 pr-4">{b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'}</td>
                  <td className="py-3 pr-4">
                    {b.amount != null && !isNaN(Number(b.amount))
                      ? `${Number(b.amount).toFixed(2)} €`
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">{b.partner_name ?? '—'}</td>
                  <td className="py-3 pr-4">{b.status}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setSelected(b); }}
                      className="inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 border border-pink-700 shadow-sm"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-ink"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-4">Kursübersicht</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[ 
                ['Kursteilnehmer', selected.student_name ?? '—'],
                ['Buchungscode', selected.booking_code ?? '—'],
                ['Buchungsdatum', selected.booking_date ? new Date(selected.booking_date).toLocaleDateString() : '—'],
                ['Kurs', selected.course_title ?? '—'],
                ['Kursstart', selected.course_start ? new Date(selected.course_start).toLocaleDateString() : '—'],
                ['Anbieter', selected.partner_name ?? '—'],
                ['Betrag (Brutto)', selected.amount != null ? `${Number(selected.amount).toFixed(2)} €` : '—'],
                ['USt-Satz', selected.vat_rate != null ? `${(Number(selected.vat_rate) * 100).toFixed(1)} %` : '—'],
                ['Netto', selected.price_net != null ? `${Number(selected.price_net).toFixed(2)} €` : '—'],
                ['Anzahlung', selected.deposit != null ? `${Number(selected.deposit).toFixed(2)} €` : '—'],
                ['Saldo', selected.saldo != null ? `${Number(selected.saldo).toFixed(2)} €` : '—'],
                ['Dauer (h)', selected.duration_hours != null ? `${selected.duration_hours} h` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</p>
                  <p className="text-[15px] text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
                onClick={() => setSelected(null)}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
