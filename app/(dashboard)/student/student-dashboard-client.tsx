'use client';

import { useState } from 'react';
import BookingsClient from './bookings-client';
import ProfileWrapper from './profile-wrapper';

type Booking = any;
type Course = { id: string; title: string; description: string | null; start_date?: string | null };
type Material = {
  id: string;
  title: string;
  course_id: string | null;
  module_number: number | null;
  signed_url?: string | null;
  cover_url?: string | null;
};
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
  materials,
}: {
  bookings: Booking[];
  courses: Course[];
  profile: StudentProfile;
  showProfileInitially?: boolean;
  materials: Material[];
}) {
  const [tab, setTab] = useState<'bookings' | 'materials' | 'profile'>(showProfileInitially ? 'profile' : 'bookings');
  const courseTitle = (cid: string | null) => courses.find((c) => c.id === cid)?.title ?? 'Kurs';

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-sm font-semibold text-white/80 mt-1 mb-6">
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
        <div className="space-y-3">
          <div className="text-sm text-white/80">
            Zugeordnete Kurse: {courses.length ? courses.map((c) => c.title).join(', ') : 'keine Zuordnung'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {materials.map((m) => (
              <div key={m.id} className="rounded-2xl bg-white text-ink border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="relative h-32 bg-slate-100">
                  {m.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-400 text-xs">Kein Cover</div>
                  )}
                  <div className="absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-full bg-black/60 text-white text-[11px]">
                    {courseTitle(m.course_id)}
                  </div>
                  {m.module_number != null && (
                    <div className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full bg-pink-500 text-white text-[11px]">
                      Modul {m.module_number}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Titel</p>
                    <h3 className="text-lg font-semibold text-ink leading-tight">{m.title}</h3>
                  </div>
                  <div className="mt-auto flex gap-2">
                    {m.signed_url ? (
                      <a
                        href={m.signed_url}
                        target="_blank"
                        className="px-3 py-2 rounded-lg bg-pink-600 text-white text-xs font-semibold hover:bg-pink-500"
                      >
                        Öffnen
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">keine Datei</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!materials.length && (
              <p className="text-white/80">Keine Kursunterlagen für deine Kurse gefunden.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <ProfileWrapper open profile={profile} onClose={() => setTab('bookings')} />
      )}
    </div>
  );
}
