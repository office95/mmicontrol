"use client";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  booking_code: string | null;
  booking_date: string | null;
  status: string;
  amount: number | null;
  course_title: string | null;
  course_start: string | null;
  partner_name: string | null;
  student_name?: string | null;
  vat_rate?: number | null;
  price_net?: number | null;
  deposit?: number | null;
  saldo?: number | null;
  duration_hours?: number | null;
  payments?: Payment[];
  paid_total?: number;
  open_amount?: number;
};

type Payment = { id: string; payment_date: string | null; amount: number | null; method: string | null; note: string | null };

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const [selected, setSelected] = useState<Booking | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState<'overview' | 'payments'>('overview');

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    const load = async () => {
      setLoadingDetail(true);
      const res = await fetch(`/api/student/bookings?id=${selected.id}`);
      const data = await res.json();
      if (res.ok) {
        setDetail({ ...selected, ...data });
      } else {
        setDetail(selected);
      }
      setLoadingDetail(false);
    };
    load();
  }, [selected]);

  return (
    <>
      <div className="card p-5 space-y-3">
        {!bookings.length && <p className="text-slate-600 text-sm">Keine Buchungen vorhanden.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border border-slate-200 p-3 bg-white/60">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink">{b.course_title ?? 'Kurs unbekannt'}</span>
              <span className="text-slate-500">· Start: {b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'}</span>
              <span className="text-slate-500">· Status: {b.status}</span>
              {b.amount != null && <span className="text-slate-500">· Betrag: {b.amount} €</span>}
              {b.partner_name && <span className="text-slate-500">· Anbieter: {b.partner_name}</span>}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              <span>Buchungsdatum: {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</span>
              <button
                type="button"
                onClick={() => { setSelected(b); setTab('overview'); }}
                className="inline-flex items-center rounded-md bg-pink-600 text-white px-3 py-1 text-[12px] font-semibold shadow-sm hover:bg-pink-700 border border-pink-700"
              >
                Details
              </button>
            </div>
          </div>
        ))}
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
            <div className="flex gap-2 text-sm font-semibold text-slate-700 mb-3">
              <button
                className={`px-3 py-2 rounded-lg border ${tab === 'overview' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'}`}
                onClick={() => setTab('overview')}
              >
                Basis
              </button>
              <button
                className={`px-3 py-2 rounded-lg border ${tab === 'payments' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'}`}
                onClick={() => setTab('payments')}
              >
                Zahlungen
              </button>
            </div>

            {tab === 'overview' && (
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
            )}

            {tab === 'payments' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                {loadingDetail && <p className="text-slate-500">Lade Zahlungen...</p>}
                {!loadingDetail && (!detail?.payments || !detail.payments.length) && (
                  <p className="text-slate-500">Keine Zahlungen erfasst.</p>
                )}
                {!loadingDetail && detail?.payments?.length ? (
                  <div className="space-y-3">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <div className="text-slate-800 font-semibold">
                          {p.amount != null ? `${Number(p.amount).toFixed(2)} €` : '—'}
                        </div>
                        <div className="text-slate-600 text-xs">
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-slate-600 text-xs">{p.method || '—'}</div>
                        <div className="text-slate-500 text-xs">{p.note || ''}</div>
                      </div>
                    ))}
                    <div className="text-xs text-slate-600 flex justify-end gap-3">
                      <span>Bezahlt: {(detail.paid_total ?? 0).toFixed(2)} €</span>
                      <span>Offen: {(detail.open_amount ?? 0).toFixed(2)} €</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

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
    </>
  );
}
