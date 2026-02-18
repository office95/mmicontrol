'use client';

import { useState } from 'react';

type Participant = { name: string; email: string; phone?: string | null; booking_date?: string | null };
type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  duration_hours?: number | null;
  participants: Participant[];
};

export default function CourseListClient({ courses }: { courses: CourseCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const selected = courses.find((c) => c.id === openId) || null;

  return (
    <div className="space-y-4">
      {courses.map((c) => (
        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kurs</p>
              <h3 className="text-xl font-semibold text-ink">{c.title}</h3>
              <p className="text-sm text-slate-600">{c.description}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Start: {c.start_date ? new Date(c.start_date).toLocaleDateString() : 'kein Termin'}</div>
              <div>Dauer: {c.duration_hours != null ? `${c.duration_hours} h` : '—'}</div>
              <div>Teilnehmer: {c.participants.length}</div>
            </div>
            <button
              className="self-start md:self-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setOpenId(c.id)}
            >
              Teilnehmer
            </button>
          </div>
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-ink"
              onClick={() => setOpenId(null)}
            >
              ×
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Kurs</p>
                <h3 className="text-2xl font-semibold text-ink">{selected.title}</h3>
                <p className="text-sm text-slate-500">
                  Start: {selected.start_date ? new Date(selected.start_date).toLocaleDateString() : 'kein Termin'} · Dauer:{' '}
                  {selected.duration_hours != null ? `${selected.duration_hours} h` : '—'}
                </p>
              </div>
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => window.print()}
              >
                Teilnehmerliste drucken
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Buchungsdatum</th>
                    <th className="py-2 pr-4">Teilnehmer</th>
                    <th className="py-2 pr-4">Telefon</th>
                    <th className="py-2 pr-4">E-Mail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selected.participants.length === 0 && (
                    <tr>
                      <td className="py-2 pr-4 text-slate-500" colSpan={4}>Keine Teilnehmer eingetragen.</td>
                    </tr>
                  )}
                  {selected.participants.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-4 text-slate-600">
                        {p.booking_date ? new Date(p.booking_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 pr-4 text-ink">{p.name}</td>
                      <td className="py-2 pr-4 text-slate-600">{p.phone || '—'}</td>
                      <td className="py-2 pr-4 text-pink-600">{p.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
