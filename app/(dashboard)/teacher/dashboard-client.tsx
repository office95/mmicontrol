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
};

type InterestRank = { place: number; labels: string[] };
type PieSlice = { label: string; value: number };
type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  duration_hours?: number | null;
  participants: { name: string; email: string; phone?: string | null; booking_date?: string | null }[];
  bookings_count?: number;
};

export default function DashboardClient({
  kpis,
  interests,
  sources,
  notes,
  courses,
}: {
  kpis: KPIs;
  interests: InterestRank[];
  sources: PieSlice[];
  notes: PieSlice[];
  courses: CourseCard[];
}) {
  const [tab, setTab] = useState<'perf' | 'courses' | 'materials'>('perf');

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm font-semibold text-white/80">
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
        <TeacherStatsClient kpis={kpis} interests={interests} sources={sources} notes={notes} />
      )}

      {tab === 'courses' && (
        courses && courses.length ? <CourseListClient courses={courses} /> : (
          <p className="text-slate-200 bg-white/5 border border-white/10 rounded-lg p-4">Noch keine Kurse zugewiesen.</p>
        )
      )}

      {tab === 'materials' && (
        <TeacherMaterials courses={courses} materials={[]} />
      )}
    </div>
  );
}
