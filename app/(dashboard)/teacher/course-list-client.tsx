'use client';

import { useMemo, useState } from 'react';
import AttendanceModal from '@/components/attendance-modal';

type Participant = { name: string; email: string; phone?: string | null; booking_date?: string | null; student_id?: string | null };
type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  duration_hours?: number | null;
  participants: Participant[];
};

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : 'kein Termin');

const colorForDate = (start: string | null) => {
  if (!start) return 'from-slate-500/30 to-slate-300/20 border-slate-200';
  const date = new Date(start);
  const now = new Date();
  if (date >= now) return 'from-pink-500/25 via-fuchsia-500/15 to-blue-500/25 border-pink-200/60';
  return 'from-slate-600/20 to-slate-500/10 border-slate-300/60';
};

export default function CourseListClient({ courses }: { courses: CourseCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [attendanceCourse, setAttendanceCourse] = useState<CourseCard | null>(null);

  const selected = useMemo(() => courses.find((c) => c.id === openId) || null, [courses, openId]);

  return (
    <div className="space-y-4">
      {courses.map((c) => (
        <div
          key={c.id}
          className={`relative rounded-2xl border border-white/15 backdrop-blur bg-transparent p-5 shadow-lg transition hover:shadow-2xl hover:-translate-y-[2px]`}
        >
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/20 blur-2xl" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Kurs</p>
              <h3 className="text-xl font-semibold text-white drop-shadow-sm">{c.title}</h3>
              <p className="text-sm text-white/80">{c.description}</p>
            </div>
            <div className="flex flex-col gap-2 text-[13px] font-medium text-white/90">
              <div className="flex gap-3">
                <span>Start: <strong>{formatDate(c.start_date)}</strong></span>
                <span>· Dauer: <strong>{c.duration_hours != null ? `${c.duration_hours} h` : '—'}</strong></span>
                <span>· TN: <strong>{c.participants.length}</strong></span>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-white/60 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition"
                  onClick={() => setOpenId(c.id)}
                >
                  Teilnehmer
                </button>
                <button
                  className="rounded-full border border-pink-200 bg-pink-500/20 px-4 py-2 text-sm text-white hover:bg-pink-500/30 transition"
                  onClick={() => setAttendanceCourse(c)}
                >
                  Anwesenheitsliste
                </button>
              </div>
            </div>
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

      {attendanceCourse && (
        <AttendanceModal
          courseId={attendanceCourse.id}
          courseTitle={attendanceCourse.title}
          participants={attendanceCourse.participants.map((p) => ({
            student_id: (p as any).student_id ?? null,
            name: p.name,
            email: p.email,
            phone: p.phone,
          }))}
          onClose={() => setAttendanceCourse(null)}
        />
      )}
    </div>
  );
}
