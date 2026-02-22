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
type Benefit = {
  id: string;
  name: string;
  action_title: string | null;
  description: string | null;
  logo_url: string | null;
  discount_type: string | null;
  discount_value: number | null;
  code: string | null;
  valid_from: string | null;
  valid_to: string | null;
  members_card_required: boolean;
  how_to_redeem: string | null;
  website: string | null;
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
  benefits,
  supportCount,
}: {
  kpis: KPIs;
  interests: InterestRank[];
  sources: PieSlice[];
  notes: PieSlice[];
  courses: CourseCard[];
  materials: any[];
  feedbacks: Feedback[];
  feedbackOverallAvg?: number | null;
  benefits: Benefit[];
  supportCount?: number;
}) {
  const [tab, setTab] = useState<'perf' | 'courses' | 'materials' | 'feedback' | 'benefits'>('perf');
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
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'benefits' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('benefits')}
        >
          Benefits
        </button>
        <a
          href="/teacher/support"
          className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:border-pink-300 hover:text-white flex items-center gap-2"
        >
          Support
          {supportCount ? (
            <span className="inline-flex h-5 px-2 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold">
              {supportCount}
            </span>
          ) : null}
        </a>
      </div>

      {tab === 'perf' && (
        <TeacherStatsClient
          kpis={kpis}
          interests={interests}
          sources={sources}
          notes={notes}
          feedbackOverallAvg={feedbackOverallAvg}
        />
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

      {tab === 'benefits' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Benefits für Dozenten</h3>
            <p className="text-sm text-white/70">Members Card vorzeigen und Vorteil nutzen.</p>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 py-3 min-w-full">
                {benefits.map((b) => (
                  <div key={b.id} className="min-w-[220px] max-w-[240px] rounded-2xl bg-white text-ink border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="relative h-24 bg-slate-100">
                      {b.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs text-slate-400">Logo</div>
                      )}
                      <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[11px] font-semibold shadow">
                        <span>Deal</span>
                        <span className="rounded bg-white/20 px-1">
                          {b.discount_type === 'percent'
                            ? `${b.discount_value ?? ''}%`
                            : b.discount_type === 'fixed'
                              ? `${b.discount_value ?? ''} €`
                              : 'Vorteil'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 space-y-1 flex-1 flex flex-col">
                      <p className="text-sm font-semibold leading-tight">{b.name}</p>
                      <p className="text-sm text-pink-700 font-semibold">
                        {b.action_title || b.description || 'Vorteil mit Members Card.'}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-3">
                        {b.description || 'Members Card vorzeigen und sparen.'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Gültig: {b.valid_to ? new Date(b.valid_to).toLocaleDateString() : 'offen'}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        {b.how_to_redeem || 'Members Card vorzeigen'}
                      </p>
                      <div className="mt-auto">
                        {b.website ? (
                          <a
                            href={b.website}
                            target="_blank"
                            className="inline-flex items-center justify-center w-full rounded-lg px-3 py-2 text-xs font-semibold shadow bg-pink-600 text-white hover:bg-pink-500"
                          >
                            Mehr dazu
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">Kein Link</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!benefits.length && (
                  <p className="text-white/80">Keine Benefits hinterlegt.</p>
                )}
              </div>
            </div>
          </div>
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
