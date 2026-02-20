'use client';

import BookingsClient from './bookings-client';
import ProfileWrapper from './profile-wrapper';
import { useEffect, useMemo, useRef, useState } from 'react';

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
type RecommendedCourse = {
  id: string;
  title: string;
  price_gross?: number | null;
  course_link?: string | null;
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
  recommended,
  feedbackReminder,
  feedbacks,
}: {
  bookings: Booking[];
  courses: Course[];
  profile: StudentProfile;
  showProfileInitially?: boolean;
  materials: Material[];
  recommended: RecommendedCourse[];
  feedbackReminder?: boolean;
  feedbacks: Record<string, any>;
}) {
  const [tab, setTab] = useState<'bookings' | 'materials' | 'profile' | 'feedback'>(showProfileInitially ? 'profile' : 'bookings');
  const courseTitle = (cid: string | null) => courses.find((c) => c.id === cid)?.title ?? 'Kurs';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reminderVisible, setReminderVisible] = useState<boolean>(!!feedbackReminder);

  // sanftes Auto-Scroll der Empfehlungen (nur wenn Tab aktiv)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !recommended.length || tab !== 'bookings') return;
    el.scrollLeft = 0;
    const id = window.setInterval(() => {
      if (!el) return;
      el.scrollLeft += 1;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
        el.scrollLeft = 0;
      }
    }, 20);
    return () => window.clearInterval(id);
  }, [recommended, tab]);

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
        <button
          className={`px-3 py-2 rounded-lg border ${tab === 'feedback' ? 'border-pink-400 bg-pink-500/15 text-white' : 'border-white/20 bg-white/10'}`}
          onClick={() => setTab('feedback')}
        >
          Kurs Bewertung
        </button>
      </div>

      {tab === 'bookings' && <BookingsClient bookings={bookings} />}
      {tab === 'bookings' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mt-4">Diese Kurse könnten dich auch interessieren</h3>
          <div className="overflow-hidden" ref={scrollRef}>
            <div className="flex gap-4">
              {recommended.map((c) => (
                <div key={c.id} className="min-w-[210px] max-w-[220px] rounded-2xl bg-white text-ink border border-slate-200 shadow-md overflow-hidden flex flex-col">
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
              {!recommended.length && (
                <p className="text-white/80">Keine Empfehlungen vorhanden.</p>
              )}
            </div>
          </div>
        </div>
      )}

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

      {tab === 'feedback' && (
        <div className="space-y-4">
          <div className="text-sm text-white/80">
            Bitte bewerte deine Kurse. Das hilft uns, besser zu werden.
          </div>
          <FeedbackList
            bookings={bookings}
            feedbacks={feedbacks}
            onOpen={(b) => { setSelectedBooking(b); setShowFeedbackModal(true); }}
            onView={(b) => { setSelectedBooking(b); setShowFeedbackModal(true); }}
          />
        </div>
      )}

      {reminderVisible && !showFeedbackModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white text-ink rounded-2xl shadow-2xl p-6 max-w-xl w-full relative">
            <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={() => setReminderVisible(false)}>
              ×
            </button>
            <h3 className="text-xl font-semibold mb-2">Bitte Kurs bewerten</h3>
            <p className="text-sm text-slate-600 mb-4">Dein Kurs endet bald. Nimm dir eine Minute für dein Feedback.</p>
            <div className="flex gap-3">
              <button className="button-primary" onClick={() => { setTab('feedback'); setShowFeedbackModal(true); }}>
                Jetzt bewerten
              </button>
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100" onClick={() => setReminderVisible(false)}>
                Später
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && selectedBooking && (
        <FeedbackModal
          booking={selectedBooking}
          existing={feedbacks[selectedBooking.id]}
          readOnly={!!feedbacks[selectedBooking.id]}
          onClose={() => { setShowFeedbackModal(false); setSelectedBooking(null); }}
        />
      )}
    </div>
  );
}

function FeedbackList({
  bookings,
  feedbacks,
  onOpen,
  onView,
}: {
  bookings: Booking[];
  feedbacks: Record<string, any>;
  onOpen: (b: Booking) => void;
  onView: (b: Booking) => void;
}) {
  const uniqueCourses = useMemo(() => bookings, [bookings]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {uniqueCourses.map((b) => (
        <div key={b.id} className="rounded-2xl bg-white/90 border border-slate-200 p-4 shadow-sm flex flex-col">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 mb-1">Kurs</p>
          <h4 className="text-lg font-semibold text-ink">{b.course_title ?? 'Kurs'}</h4>
          <p className="text-sm text-slate-600">{b.partner_name ?? 'Anbieter unbekannt'}</p>
          <p className="text-xs text-slate-500 mt-1">
            Start: {b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'}
          </p>
          <div className="mt-auto pt-3">
            {feedbacks[b.id] ? (
              <button
                className="w-full inline-flex items-center justify-center rounded-lg bg-slate-200 text-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-300"
                onClick={() => onView(b)}
              >
                Feedback ansehen
              </button>
            ) : (
              <button
                className="w-full inline-flex items-center justify-center rounded-lg bg-pink-600 text-white px-3 py-2 text-sm font-semibold hover:bg-pink-500"
                onClick={() => onOpen(b)}
              >
                Bewerten
              </button>
            )}
          </div>
        </div>
      ))}
      {!uniqueCourses.length && (
        <p className="text-white/80">Keine Kurse zur Bewertung gefunden.</p>
      )}
    </div>
  );
}

function StarInput({ value, onChange, readOnly = false }: { value: number; onChange: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1 text-pink-500 text-xl">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          className={`${i <= value ? 'text-pink-500' : 'text-slate-300'} ${readOnly ? 'cursor-default' : ''}`}
          onClick={() => !readOnly && onChange(i)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type FeedbackRecord = {
  ratings?: any;
  expectations?: string;
  improve?: string;
  recommend?: string;
  created_at?: string;
};

function FeedbackModal({ booking, existing, readOnly, onClose }: { booking: Booking; existing?: FeedbackRecord; readOnly?: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    overall: existing?.ratings?.overall ?? 0,
    teacher: existing?.ratings?.teacher ?? 0,
    clarity: existing?.ratings?.clarity ?? 0,
    practice: existing?.ratings?.practice ?? 0,
    support: existing?.ratings?.support ?? 0,
    tech: existing?.ratings?.tech ?? 0,
    expectations: existing?.expectations ?? 'voll',
    improve: existing?.improve ?? '',
    recommend: existing?.recommend ?? 'ja',
  });

  async function submit() {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await fetch('/api/student/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: booking.id,
        course_title: booking.course_title,
        course_id: null,
        ratings: {
          overall: form.overall,
          teacher: form.teacher,
          clarity: form.clarity,
          practice: form.practice,
          support: form.support,
          tech: form.tech,
        },
        expectations: form.expectations,
        improve: form.improve,
        recommend: form.recommend,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Speichern fehlgeschlagen');
    } else {
      setSuccess('Danke für dein Feedback!');
      setTimeout(onClose, 1200);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={onClose}>×</button>
        <h3 className="text-2xl font-semibold mb-2">Kurs bewerten</h3>
        <p className="text-sm text-slate-600 mb-4">{booking.course_title ?? 'Kurs'} · {booking.partner_name ?? 'Anbieter'}</p>

        <div className="space-y-4">
          {[
            ['Wie hat dir der Kurs gesamt gefallen?', 'overall'],
            ['Wie bewertest du den Dozenten insgesamt?', 'teacher'],
            ['Wie verständlich wurden die Inhalte vermittelt?', 'clarity'],
            ['Wie praxisnah war der Unterricht?', 'practice'],
            ['Wie gut hast du dich individuell betreut gefühlt?', 'support'],
            ['Wie bewertest du die technische Ausstattung & Räumlichkeiten?', 'tech'],
          ].map(([label, key]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-700">{label}</p>
              <StarInput
                value={(form as any)[key]}
                onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                readOnly={readOnly}
              />
            </div>
          ))}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Wurden deine Erwartungen an den Kurs erfüllt?</label>
            <select
              className="input"
              value={form.expectations}
              onChange={(e) => setForm((f) => ({ ...f, expectations: e.target.value }))}
              disabled={readOnly}
            >
              <option value="voll">Ja, voll und ganz</option>
              <option value="groesstenteils">Größtenteils</option>
              <option value="teilweise">Teilweise</option>
              <option value="nein">Nein</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Was könnten wir verbessern?</label>
            <textarea
              className="input"
              value={form.improve}
              onChange={(e) => setForm((f) => ({ ...f, improve: e.target.value }))}
              disabled={readOnly}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Würdest du den Kurs weiterempfehlen?</label>
            <select
              className="input"
              value={form.recommend}
              onChange={(e) => setForm((f) => ({ ...f, recommend: e.target.value }))}
              disabled={readOnly}
            >
              <option value="ja">Ja</option>
              <option value="vielleicht">Vielleicht</option>
              <option value="nein">Nein</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {success && <p className="text-sm text-emerald-600 mt-3">{success}</p>}
        {readOnly && existing?.created_at && (
          <p className="text-xs text-slate-500 mt-2">Gesendet am {new Date(existing.created_at).toLocaleDateString()}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100" onClick={onClose}>
            {readOnly ? 'Schließen' : 'Abbrechen'}
          </button>
          {!readOnly && (
            <button className="button-primary" onClick={submit} disabled={saving || success !== null}>
              {saving ? 'Speichern...' : 'Feedback senden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
