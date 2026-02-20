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
type RecommendedCourse = {
  id: string;
  title: string;
  price_gross?: number | null;
  course_link?: string | null;
  cover_url?: string | null;
};

export default function DashboardClient({
  kpis,
  interests,
  sources,
  notes,
  courses,
  materials,
  recommended,
}: {
  kpis: KPIs;
  interests: InterestRank[];
  sources: PieSlice[];
  notes: PieSlice[];
  courses: CourseCard[];
  materials: any[];
  recommended: RecommendedCourse[];
}) {
  const [tab, setTab] = useState<'perf' | 'courses' | 'materials' | 'bookings'>('perf');

  const recFive = useMemo(() => recommended.slice(0, 5), [recommended]);

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
          className={`px-3 py-2 rounded-lg border ${tab === 'bookings' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('bookings')}
        >
          Meine Buchungen
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

      {tab === 'bookings' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Diese Kurse könnten dich auch interessieren</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recFive.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white text-ink border border-slate-200 shadow-md overflow-hidden flex flex-col">
                <div className="relative h-28 bg-slate-100">
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-slate-400">Kein Cover</div>
                  )}
                </div>
                <div className="p-3 space-y-1 flex-1 flex flex-col">
                  <p className="text-sm font-semibold leading-tight">{c.title}</p>
                  <p className="text-xs text-slate-600">
                    Kursbeitrag Brutto: {c.price_gross != null ? `${Number(c.price_gross).toFixed(2)} €` : '—'}
                  </p>
                  <div className="mt-auto">
                    <a
                      href={c.course_link || '#'}
                      target={c.course_link ? '_blank' : undefined}
                      className={`inline-flex items-center justify-center w-full rounded-lg px-3 py-2 text-sm font-semibold shadow ${
                        c.course_link
                          ? 'bg-pink-600 text-white hover:bg-pink-500'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Mehr dazu
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {!recFive.length && (
              <p className="text-white/80">Keine Empfehlungen vorhanden.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
