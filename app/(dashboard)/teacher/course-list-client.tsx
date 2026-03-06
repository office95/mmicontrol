'use client';

import { useMemo, useState, useEffect } from 'react';
import AttendanceModal from '@/components/attendance-modal';

type Participant = { name: string; email: string; phone?: string | null; booking_date?: string | null; student_id?: string | null };
type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  course_date_id?: string | null;
  reschedule?: { latest: any | null; history: any[] };
  duration_hours?: number | null;
  participants: Participant[];
  survey_id?: string | null;
  survey_responses_count?: number | null;
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
  const [surveyCourse, setSurveyCourse] = useState<CourseCard | null>(null);

  const selected = useMemo(() => courses.find((c) => c.id === openId) || null, [courses, openId]);

  return (
    <div className="space-y-4">
      {courses.map((c) => (
        <div
          key={c.id}
          className="relative rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg transition hover:shadow-2xl hover:-translate-y-[2px]"
        >
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-pink-100/70 blur-2xl" />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="space-y-1 md:space-y-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Kurs</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-ink drop-shadow-sm">{c.title}</h3>
                  <div className="flex flex-wrap gap-3 text-[13px] font-medium text-slate-800">
                    <span>Start: <strong className="text-ink">{formatDate(c.reschedule?.latest?.new_start_date ?? c.start_date)}</strong></span>
                    <span>· Dauer: <strong className="text-ink">{c.duration_hours != null ? `${c.duration_hours} h` : '—'}</strong></span>
                    <span>· TN: <strong className="text-ink">{c.participants.length}</strong></span>
                    {c.reschedule?.latest && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100 text-[12px] font-semibold">
                        Verschoben v{c.reschedule.latest.version}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-700">{c.description}</p>
                {c.reschedule?.latest && (
                  <div className="mt-2 text-[13px] text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 inline-flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">Neuer Start:</span>
                    <span>{c.reschedule.latest.new_start_date ? new Date(c.reschedule.latest.new_start_date).toLocaleDateString() : '—'}</span>
                    <span className="text-slate-600">Grund: {c.reschedule.latest.reason || 'nicht angegeben'}</span>
                  </div>
                )}
                {c.reschedule?.history?.length ? (
                  <details className="mt-1 text-[12px] text-slate-600 border border-slate-200 rounded-lg bg-white/80 p-2">
                    <summary className="cursor-pointer text-ink font-semibold flex items-center gap-2">Verschiebungshistorie</summary>
                    <div className="mt-2 space-y-1">
                      {c.reschedule.history.map((r) => (
                        <div key={`${c.id}-r-${r.version}`} className="flex flex-wrap gap-2">
                          <span className="font-semibold text-indigo-700">v{r.version}</span>
                          <span>{r.old_start_date ? new Date(r.old_start_date).toLocaleDateString() : '—'} → {r.new_start_date ? new Date(r.new_start_date).toLocaleDateString() : '—'}</span>
                          {r.reason && <span className="text-slate-500">Grund: {r.reason}</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-ink hover:bg-slate-100 transition"
                  onClick={() => setOpenId(c.id)}
                >
                  Teilnehmer
                </button>
                <button
                  className="rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-sm text-pink-700 hover:bg-pink-100 transition"
                  onClick={() => setAttendanceCourse(c)}
                >
                  Anwesenheitsliste
                </button>
                <button
                  className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100 transition"
                  onClick={() => setSurveyCourse(c)}
                  disabled={!c.survey_id}
                >
                  Fragebogen-Antworten {c.survey_responses_count ? `(${c.survey_responses_count})` : ''}
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

      {surveyCourse && (
        <SurveyModal
          course={surveyCourse}
          onClose={() => setSurveyCourse(null)}
        />
      )}
    </div>
  );
}

function SurveyModal({ course, onClose }: { course: CourseCard; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ surveys: any[]; responses: any[] } | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      const respId = (() => {
        try {
          const url = new URL(window.location.href);
          return url.searchParams.get('response_id');
        } catch {
          return null;
        }
      })();
      const res = await fetch(
        `/api/teacher/course-surveys?course_id=${course.id}${respId ? `&response_id=${respId}` : ''}`,
        { cache: 'no-store' }
      );
      const json = await res.json().catch(() => ({}));
      if (ignore) return;
      if (!res.ok) setError(json.error || 'Fehler beim Laden');
      else setData(json);
      setLoading(false);
    };
    load();
    return () => { ignore = true; };
  }, [course.id]);

  return (
    <div className="survey-print-wrap fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 print:bg-white print:static">
      <div className="survey-print w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-ink shadow-2xl p-6 relative print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
        <button className="absolute top-3 right-3 text-slate-500 hover:text-ink no-print" onClick={onClose}>×</button>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-2xl font-semibold">Fragebogen-Antworten · {course.title}</h3>
          <button
            className="no-print rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => window.print()}
          >
            PDF / Drucken
          </button>
        </div>
        {loading && <p className="text-sm text-slate-500">Lade…</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {data && (
          <div className="space-y-4">
            {(data.surveys || []).map((s) => {
              const rForSurvey = (data.responses || []).filter((r) => r.survey_id === s.id);
              return (
                <div
                  key={s.id}
                  className="survey-section rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{s.title || 'Fragebogen'}</p>
                    <span className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                      Eingereicht: {rForSurvey.length}
                    </span>
                  </div>
                  {rForSurvey.length === 0 && (
                    <p className="text-sm text-slate-500">Noch keine Antworten.</p>
                  )}
                  {rForSurvey.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-lg bg-white px-3 py-2 space-y-1"
                    >
                      <p className="text-sm text-slate-700">
                        Teilnehmer: {r.student_name || r.student_email || '—'} ·{' '}
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                      </p>
                      <div className="space-y-1 text-sm">
                        {(r.answers || []).map((a: any, i: number) => (
                          <div key={i} className="border border-slate-200 rounded-lg bg-slate-50 px-3 py-2">
                            <p className="font-semibold text-slate-800">{a.prompt}</p>
                            <p className="text-slate-700">{a.value || '—'}</p>
                            {a.extra_text_label && (
                              <p className="text-slate-600 mt-1">
                                <span className="font-semibold">{a.extra_text_label}:</span> {a.extra_text || '—'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <style jsx global>{`
          @media print {
            @page {
              margin: 5mm 8mm 8mm 8mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
            body * {
              visibility: hidden;
            }
            .survey-print-wrap,
            .survey-print-wrap * {
              visibility: visible;
            }
            .survey-print-wrap {
              position: static !important;
              inset: auto !important;
              display: block !important;
              align-items: flex-start !important;
              justify-content: flex-start !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              background: white !important;
            }
            .survey-print {
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 0 8px 0 !important;
              background: white !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              page-break-inside: auto !important;
            }
            .survey-section {
              page-break-inside: avoid;
              page-break-before: auto !important;
              margin: 0 0 8px 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
