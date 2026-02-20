'use client';

import { useMemo, useState } from 'react';
import TeacherStatsClient from './stats-client';
import CourseListClient from './course-list-client';
import TeacherMaterials from './materials/teacher-materials-client';

type KPIs = {
  monthBookings: number;
  monthBookingsPrev: number;
  yearBookings: number;
  yearBookingsPrev: number;
  yearParticipants: number;
  yearParticipantsPrev: number;
};

type InterestRank = { place: number; labels: string[] };
type PieSlice = { label: string; value: number };
type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  duration_hours?: number | null;
  participants: { name: string; email: string; phone?: string | null; booking_date?: string | null; student_id?: string | null }[];
  bookings_count?: number;
};
type Feedback = {
  course_id: string | null;
  course_title: string | null;
  ratings?: {
    overall?: number;
    teacher?: number;
    clarity?: number;
    practice?: number;
    support?: number;
    tech?: number;
  };
  recommend?: string | null;
  improve?: string | null;
  created_at?: string | null;
  student_name?: string | null;
  student_email?: string | null;
};

export default function DashboardClient({
  kpis,
  interests,
  sources,
  notes,
  courses,
  materials,
  feedbacks,
  feedbackOverallAvg,
}: {
  kpis: KPIs;
  interests: InterestRank[];
  sources: PieSlice[];
  notes: PieSlice[];
  courses: CourseCard[];
  materials: any[];
  feedbacks: Feedback[];
  feedbackOverallAvg?: number | null;
}) {
  const [tab, setTab] = useState<'perf' | 'courses' | 'materials' | 'feedback'>('perf');
  const feedbackByCourse = useMemo(() => {
    const map = new Map<string, Feedback[]>();
    feedbacks.forEach((f) => {
      const cid = f.course_id || 'unknown';
      const list = map.get(cid) || [];
      list.push(f);
      map.set(cid, list);
    });
    return map;
  }, [feedbacks]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const selectedFeedbacks = selectedCourseId ? feedbackByCourse.get(selectedCourseId) || [] : [];

  return (
    <div className="space-y-4">
      <div
        className="flex gap-2 text-sm font-semibold text-white/80"
        style={{ marginBottom: '2vh' }}
      >
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'perf' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('perf')}
        >
          Performance-Übersicht
        </button>
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'courses' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('courses')}
        >
          Meine Kurse & Teilnehmer
        </button>
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'materials' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('materials')}
        >
          Kursunterlagen
        </button>
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'feedback' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('feedback')}
        >
          Kurs-Feedback
        </button>
      </div>

      {tab === 'perf' && (
        <TeacherStatsClient kpis={kpis} interests={interests} sources={sources} notes={notes} />
      )}

      {tab === 'courses' && (
        courses && courses.length ? <CourseListClient courses={courses} /> : (
          <p className="text-slate-200 bg-white/5 border border-white/10 rounded-lg p-4">Noch keine Kurse zugewiesen.</p>
        )
      )}

      {tab === 'materials' && (
        <TeacherMaterials courses={courses} materials={materials} />
      )}

      {tab === 'feedback' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-3">Kurs-Feedback</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {(courses || []).map((c) => {
                const list = feedbackByCourse.get(c.id) || [];
                const count = list.length;
                const avgVal = (key: keyof NonNullable<Feedback['ratings']>) => {
                  if (!count) return 0;
                  const sum = list.reduce((acc, f) => acc + (Number(f.ratings?.[key] ?? 0)), 0);
                  return Number((sum / count).toFixed(1));
                };
                const avgOverall = avgVal('overall');
                const recYes = list.filter((f) => (f.recommend || '').toLowerCase() === 'ja').length;
                const recPct = count ? Math.round((recYes / count) * 100) : 0;
                const lastImprove = list[0]?.improve || list[list.length - 1]?.improve || '';
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className="text-left rounded-2xl bg-white/70 text-ink border border-white/40 shadow-lg overflow-hidden transition hover:-translate-y-1 hover:shadow-2xl backdrop-blur-sm"
                  >
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Kurs</p>
                          <h4 className="text-base font-semibold text-ink">{c.title}</h4>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                          {count} Feedbacks
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarDisplay value={avgOverall} />
                        <span className="text-sm text-slate-600">{avgOverall.toFixed(1)} / 5</span>
                      </div>
                      <p className="text-sm text-slate-600">Weiterempfehlung: <strong className="text-emerald-600">{recPct}%</strong></p>
                      {lastImprove && (
                        <div className="text-xs text-slate-500 bg-slate-100/80 border border-slate-200 rounded-lg p-2 line-clamp-2">
                          „{lastImprove}“
                        </div>
                      )}
                      {!count && <p className="text-xs text-slate-500">Noch kein Feedback.</p>}
                    </div>
                  </button>
                );
              })}
              {(!courses || courses.length === 0) && (
                <p className="text-white/80">Keine Kurse.</p>
              )}
            </div>
          </div>

          {selectedCourseId && (
            <FeedbackModal
              course={courses.find((c) => c.id === selectedCourseId) || null}
              feedbacks={selectedFeedbacks}
              onClose={() => setSelectedCourseId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex gap-1 text-pink-500 text-lg">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'opacity-100' : 'opacity-30'}>★</span>
      ))}
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

function FeedbackModal({ course, feedbacks, onClose }: { course: CourseCard | null; feedbacks: Feedback[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
        <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={onClose}>×</button>
        <h3 className="text-2xl font-semibold mb-2">Kursbewertung · {course?.title ?? 'Kurs'}</h3>
        {!feedbacks.length && <p className="text-slate-600">Noch kein Feedback.</p>}
        <div className="space-y-3">
          {feedbacks.map((f, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Gesamt</span>
                  <StarInputReadOnly value={Number(f.ratings?.overall ?? 0)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Dozent</span>
                  <StarInputReadOnly value={Number(f.ratings?.teacher ?? 0)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Verständlich</span>
                  <StarInputReadOnly value={Number(f.ratings?.clarity ?? 0)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Praxis</span>
                  <StarInputReadOnly value={Number(f.ratings?.practice ?? 0)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Betreuung</span>
                  <StarInputReadOnly value={Number(f.ratings?.support ?? 0)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Technik</span>
                  <StarInputReadOnly value={Number(f.ratings?.tech ?? 0)} />
                </div>
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
        <div className="mt-4 flex justify-end">
          <button className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
