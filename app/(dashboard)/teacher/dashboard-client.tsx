'use client';

import { useState } from 'react';
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
};

export default function DashboardClient({
  kpis,
  interests,
  sources,
  notes,
  courses,
  materials,
  feedbacks,
}: {
  kpis: KPIs;
  interests: InterestRank[];
  sources: PieSlice[];
  notes: PieSlice[];
  courses: CourseCard[];
  materials: any[];
  feedbacks: Feedback[];
}) {
  const [tab, setTab] = useState<'perf' | 'courses' | 'materials'>('perf');
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
      </div>

      {tab === 'perf' && (
        <div className="space-y-6">
          <TeacherStatsClient kpis={kpis} interests={interests} sources={sources} notes={notes} />

          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Kurs-Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(courses || []).map((c) => {
                const list = feedbackByCourse.get(c.id) || [];
                const count = list.length;
                const avg = (key: keyof NonNullable<Feedback['ratings']>) => {
                  if (!count) return 0;
                  const sum = list.reduce((acc, f) => acc + (Number(f.ratings?.[key] ?? 0)), 0);
                  return Number((sum / count).toFixed(1));
                };
                const recYes = list.filter((f) => (f.recommend || '').toLowerCase() === 'ja').length;
                const recPct = count ? Math.round((recYes / count) * 100) : 0;
                const lastImprove = list[0]?.improve || list[list.length - 1]?.improve || '';
                return (
                  <div key={c.id} className="rounded-2xl bg-white/90 text-ink border border-slate-200 p-4 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Kurs</p>
                        <h4 className="text-base font-semibold text-ink">{c.title}</h4>
                      </div>
                      <span className="text-sm text-slate-500">{count} Feedbacks</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                      <span>Gesamt: <strong className="text-pink-600">{avg('overall')}</strong></span>
                      <span>Dozent: <strong className="text-pink-600">{avg('teacher')}</strong></span>
                      <span>Praxis: <strong className="text-pink-600">{avg('practice')}</strong></span>
                    </div>
                    <p className="text-sm text-slate-600">Weiterempfehlung: <strong className="text-emerald-600">{recPct}%</strong></p>
                    {lastImprove && (
                      <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg p-2">
                        „{lastImprove}“
                      </div>
                    )}
                    {!count && (
                      <p className="text-xs text-slate-500">Noch kein Feedback.</p>
                    )}
                  </div>
                );
              })}
              {(!courses || courses.length === 0) && (
                <p className="text-slate-200">Keine Kurse.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        courses && courses.length ? <CourseListClient courses={courses} /> : (
          <p className="text-slate-200 bg-white/5 border border-white/10 rounded-lg p-4">Noch keine Kurse zugewiesen.</p>
        )
      )}

      {tab === 'materials' && (
        <TeacherMaterials courses={courses} materials={materials} />
      )}
    </div>
  );
}
