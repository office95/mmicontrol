'use client';

import { useEffect, useMemo, useState } from 'react';
import ButtonLink from '@/components/button-link';
import CourseDateModal, { CourseDateRow } from '@/components/course-date-modal';
import AttendanceModal from '@/components/attendance-modal';

type CourseDateListRow = {
  id: string;
  code: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  time_from: string | null;
  time_to: string | null;
  course_id: string | null;
  partner_id: string | null;
  course: { id: string; title: string } | null;
  partner: { id: string; name: string } | null;
  bookings_count?: number;
};

const statusColor: Record<string, string> = {
  offen: 'bg-amber-100 text-amber-700',
  laufend: 'bg-blue-100 text-blue-700',
  abgeschlossen: 'bg-emerald-100 text-emerald-700',
  verschoben: 'bg-indigo-100 text-indigo-700',
  abgesagt: 'bg-red-100 text-red-700',
};

export default function CourseDatesPage() {
  const [items, setItems] = useState<CourseDateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState<CourseDateRow | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'timeline'>('list');
  const [attendanceCourse, setAttendanceCourse] = useState<{ id: string; title: string } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [feedbackTitle, setFeedbackTitle] = useState<string>('Kurs-Feedback');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/course-dates');
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

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '')),
    [items]
  );

  const openFor = (t: CourseDateListRow) => {
    setEditItem({
      id: t.id,
      code: t.code,
      course_id: t.course_id,
      partner_id: t.partner_id,
      start_date: t.start_date,
      end_date: t.end_date,
      time_from: t.time_from,
      time_to: t.time_to,
      status: t.status,
    });
    setOpenModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Kurstermine</h1>
          <p className="text-sm text-slate-200">Termine planen, bearbeiten und zu Kursen zuordnen.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25"
            onClick={() => {
              setEditItem(null);
              setOpenModal(true);
            }}
          >
            Neuer Kurstermin
          </button>
          <ButtonLink href="/admin">Zurück</ButtonLink>
        </div>
      </div>

      <div className="flex gap-4 text-sm font-semibold text-slate-300 border-b border-white/10">
        <button
          className={`pb-2 ${activeTab === 'list' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setActiveTab('list')}
        >
          Liste
        </button>
        <button
          className={`pb-2 ${activeTab === 'timeline' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setActiveTab('timeline')}
        >
          Zeitachse
        </button>
      </div>

      <div className="card p-6 shadow-xl text-slate-900">
        {loading && <p className="text-sm text-slate-500">Lade Kurstermine...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !sorted.length && <p className="text-sm text-slate-500">Keine Kurstermine vorhanden.</p>}

        {activeTab === 'list' && (
          <div className="divide-y divide-slate-200">
            {sorted.map((t) => (
              <div key={t.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <button
                    onClick={() => openFor(t)}
                    className="text-left text-sm font-semibold text-ink hover:underline"
                  >
                    {t.course?.title ?? 'Unbekannter Kurs'}
                  </button>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-ink/70 mr-1">Start:</span>
                    {t.start_date ? new Date(t.start_date).toLocaleDateString() : '—'}
                    {t.time_from ? ` · ${t.time_from}` : ''}
                    {t.time_to ? ` - ${t.time_to}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">{t.partner?.name ?? 'Kein Anbieter'}</p>
                  <p className="text-xs text-ink font-semibold">
                    Gebuchte Teilnehmer: {t.bookings_count ?? 0}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-3 py-1 rounded-full border border-slate-200 ${statusColor[t.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {t.status}
                  </span>
                  <button
                    className="px-3 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    disabled={!t.course_id}
                    onClick={() => t.course_id && setAttendanceCourse({ id: t.course_id, title: t.course?.title ?? 'Kurs' })}
                  >
                    Anwesenheitsliste
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg border border-pink-300 text-pink-700 hover:bg-pink-50 disabled:opacity-50"
                    disabled={!t.course_id}
                    onClick={async () => {
                      if (!t.course_id) return;
                      setFeedbackTitle(`Kurs-Feedback · ${t.course?.title ?? 'Kurs'}`);
                      setFeedbackOpen(true);
                      setFeedbackLoading(true);
                      setFeedbackError(null);
                      const res = await fetch(`/api/admin/feedback?course_id=${t.course_id}`);
                      const data = await res.json();
                      if (!res.ok) {
                        setFeedbackError(data.error || 'Fehler beim Laden');
                        setFeedbackItems([]);
                      } else {
                        setFeedbackItems(data);
                      }
                      setFeedbackLoading(false);
                    }}
                  >
                    Kurs-Feedback
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setEditItem({
                        id: t.id,
                        code: t.code,
                        course_id: t.course_id,
                        partner_id: t.partner_id,
                        start_date: t.start_date,
                        end_date: t.end_date,
                        time_from: t.time_from,
                        time_to: t.time_to,
                        status: t.status,
                      });
                      setOpenModal(true);
                    }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm('Diesen Kurstermin löschen?')) return;
                      const res = await fetch(`/api/admin/course-dates?id=${t.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        load();
                      } else {
                        const d = await res.json().catch(() => ({}));
                        alert(d.error || 'Löschen fehlgeschlagen');
                      }
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timeline' && (() => {
          const today = new Date();
          const dayMs = 86_400_000;
          const toDate = (d: string | null) => (d ? new Date(d) : null);
          const starts = sorted.map((t) => toDate(t.start_date)).filter(Boolean) as Date[];
          const ends = sorted.map((t) => toDate(t.end_date || t.start_date)).filter(Boolean) as Date[];

          // Start 7 Tage vor heute, damit Kontext sichtbar bleibt
          let minDate = new Date(today.getTime() - 7 * dayMs);
          if (starts.length) {
            const minStart = Math.min(...starts.map((d) => d.getTime()));
            minDate = new Date(Math.min(minDate.getTime(), minStart));
          }
          let maxDate = new Date(
            Math.max(today.getTime(), ...(ends.length ? ends.map((d) => d.getTime()) : [today.getTime() + dayMs * 7]))
          );
          // Ansicht auf max. ~45 Tage (1,5 Monate) begrenzen, aber min. 45 Tage, damit Scroll möglich
          const targetDays = 45;
          if ((maxDate.getTime() - minDate.getTime()) / dayMs < targetDays) {
            maxDate = new Date(minDate.getTime() + targetDays * dayMs);
          } else if ((maxDate.getTime() - minDate.getTime()) / dayMs > targetDays) {
            maxDate = new Date(minDate.getTime() + targetDays * dayMs);
          }

          const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / dayMs));
          const pxPerDay = 14; // feines Grid, gut sichtbar
          const contentWidth = Math.max(1100, totalDays * pxPerDay);

          const posPx = (d: Date | null) => {
            if (!d) return 0;
            return ((d.getTime() - minDate.getTime()) / dayMs) * pxPerDay;
          };

          const todayPx = posPx(today);

          const months: { label: string; left: number; width: number }[] = [];
          let mCursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
          while (mCursor <= maxDate) {
            const mStart = new Date(mCursor);
            const mEnd = new Date(mCursor.getFullYear(), mCursor.getMonth() + 1, 1);
            months.push({
              label: mStart.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
              left: posPx(mStart),
              width: Math.max(80, posPx(mEnd) - posPx(mStart)),
            });
            mCursor = mEnd;
          }

          const dayTicks = Array.from({ length: totalDays + 1 }, (_, i) => {
            const date = new Date(minDate.getTime() + i * dayMs);
            return {
              x: posPx(date),
              isWeek: date.getDay() === 1,
              isMonthStart: date.getDate() === 1,
              draw: i % 2 === 0,
              showLabel: i % 2 === 0,
              label: date.getDate().toString().padStart(2, '0'),
            };
          });

          return (
            <div className="overflow-auto max-h-[78vh]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-5 w-full">
                <div className="overflow-x-auto">
                  <div style={{ width: `${contentWidth}px` }}>
                    {/* Kopf */}
                    <div className="relative h-14 mb-4">
                      {months.map((m, idx) => (
                        <div
                          key={idx}
                          className="absolute top-0 h-6 flex items-center justify-center text-[12px] font-semibold text-slate-700"
                          style={{ left: `${m.left}px`, width: `${m.width}px` }}
                        >
                          {m.label}
                        </div>
                      ))}
                      {dayTicks.filter((d) => d.draw).map((d, idx) => (
                        <div
                          key={idx}
                          className={`absolute bottom-0 h-6 w-px ${d.isMonthStart ? 'bg-pink-400' : d.isWeek ? 'bg-slate-300' : 'bg-slate-200/70'}`}
                          style={{ left: `${d.x}px` }}
                        >
                          {d.showLabel && (
                            <span className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                              {d.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Kompakte Liste */}
                    <div className="space-y-2">
                      {sorted.map((t) => {
                        const start = toDate(t.start_date);
                        const end = toDate(t.end_date || t.start_date);
                        const left = posPx(start);
                        const right = posPx(end || start);
                        const width = Math.max(2, right - left);
                        return (
                          <div key={t.id} className="relative h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden">
                            {dayTicks.filter((d) => d.draw).map((d, idx) => (
                        <div
                          key={idx}
                          className={`absolute top-0 bottom-0 w-px ${d.isMonthStart ? 'bg-pink-200' : d.isWeek ? 'bg-slate-200' : 'bg-slate-100'}`}
                          style={{ left: `${d.x}px` }}
                        />
                      ))}
                        <div
                          className="absolute top-1 bottom-3 w-[2px] bg-pink-500/80"
                          style={{ left: `${todayPx}px` }}
                        />
                        <div
                          className="absolute top-1.5 bottom-4 rounded-full bg-gradient-to-r from-[#0b3b91] via-[#1b67ff] to-[#24d18f] shadow-[0_3px_10px_rgba(0,65,170,0.18)]"
                          style={{ left: `${left}px`, width: `${width}px` }}
                        />
                            <div className="absolute left-1 right-1 bottom-1 text-[10px] leading-tight text-slate-600 truncate text-center">
                              {t.course?.title ?? 'Unbekannter Kurs'} · {t.partner?.name ?? 'Kein Anbieter'} · {t.bookings_count ?? 0} TN
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {openModal && (
        <CourseDateModal
          initial={editItem ?? undefined}
          onSaved={load}
          onClose={() => {
            setOpenModal(false);
            setEditItem(null);
          }}
        />
      )}

      {attendanceCourse && (
        <AttendanceModal
          courseId={attendanceCourse.id}
          courseTitle={attendanceCourse.title}
          readOnly
          onClose={() => setAttendanceCourse(null)}
        />
      )}

      {feedbackOpen && (
        <FeedbackModal
          title={feedbackTitle}
          loading={feedbackLoading}
          error={feedbackError}
          items={feedbackItems}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

function FeedbackModal({
  title,
  loading,
  error,
  items,
  onClose,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  items: any[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
        <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={onClose}>×</button>
        <h3 className="text-2xl font-semibold mb-3">{title}</h3>
        {loading && (
          <p className="text-slate-600 flex items-center gap-2">
            Lade Feedback...
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && !items.length && <p className="text-slate-600">Keine Feedbacks vorhanden.</p>}
        <div className="space-y-3">
          {items.map((f, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <FeedbackRow label="Gesamt" value={Number(f.ratings?.overall ?? 0)} />
                <FeedbackRow label="Dozent" value={Number(f.ratings?.teacher ?? 0)} />
                <FeedbackRow label="Verständlich" value={Number(f.ratings?.clarity ?? 0)} />
                <FeedbackRow label="Praxis" value={Number(f.ratings?.practice ?? 0)} />
                <FeedbackRow label="Betreuung" value={Number(f.ratings?.support ?? 0)} />
                <FeedbackRow label="Technik" value={Number(f.ratings?.tech ?? 0)} />
              </div>
              <p className="text-sm text-slate-700">Weiterempfehlung: <strong>{f.recommend ?? '—'}</strong></p>
              {f.improve && (
                <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                  {f.improve}
                </div>
              )}
              {(f.student_name || f.student_email) && (
                <p className="text-xs text-slate-500">
                  Teilnehmer: {f.student_name ?? '—'} · {f.student_email ?? '—'}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Eingereicht am {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-24">{label}</span>
      <StarInputReadOnly value={value} />
      <span className="text-xs text-slate-500">{value.toFixed(1)}/5</span>
    </div>
  );
}

function StarInputReadOnly({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex gap-1 text-pink-500 text-lg">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'opacity-100' : 'opacity-30'}>★</span>
      ))}
    </div>
  );
}
