'use client';

import { useState } from 'react';
import BookingsClient from './bookings-client';
import ProfileWrapper from './profile-wrapper';
import Link from 'next/link';

type Booking = any;
type Course = { id: string; title: string; description: string | null; start_date?: string | null };
type StudentProfile = {
  id: string;
  name: string | null;
  street: string;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string;
  phone: string | null;
  email: string | null;
  birthdate: string | null;
} | null;

export default function StudentDashboardClient({
  bookings,
  courses,
  profile,
  showProfileInitially,
}: {
  bookings: Booking[];
  courses: Course[];
  profile: StudentProfile;
  showProfileInitially?: boolean;
}) {
  const [tab, setTab] = useState<'bookings' | 'materials' | 'profile'>(showProfileInitially ? 'profile' : 'bookings');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm font-semibold text-white/80 mb-2">
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'bookings' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('bookings')}
        >
          Meine Buchungen
        </button>
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'materials' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('materials')}
        >
          Kursunterlagen
        </button>
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'profile' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('profile')}
        >
          Profil
        </button>
      </div>

      {tab === 'bookings' && <BookingsClient bookings={bookings} />}

      {tab === 'materials' && (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-white space-y-2">
          <p className="text-sm text-white/80">
            Deine Kursunterlagen findest du hier:
          </p>
          <Link
            href="/student/materials"
            className="inline-flex items-center gap-2 rounded-lg bg-pink-500 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-pink-400 transition"
          >
            Kursunterlagen öffnen
          </Link>
          <div className="text-xs text-white/60">
            Zugeordnete Kurse: {courses.length ? courses.map((c) => c.title).join(', ') : 'keine Zuordnung'}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <ProfileWrapper open profile={profile} onClose={() => setTab('bookings')} />
      )}
    </div>
  );
}
