"use client";
import { useState } from "react";

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
};

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const [selected, setSelected] = useState<Booking | null>(null);

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
                onClick={() => setSelected(b)}
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
    </>
  );
}
