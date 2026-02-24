'use client';

import BookingsClient from './bookings-client';
import ProfileWrapper from './profile-wrapper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Payment = { id: string; payment_date: string | null; amount: number | null; method: string | null; note: string | null };

type Booking = {
  id: string;
  booking_code: string | null;
  booking_date: string | null;
  status: string;
  amount: number | null;
  course_id?: string | null;
  course_title: string | null;
  course_start: string | null;
  partner_name: string | null;
  student_name?: string | null;
  vat_rate?: number | null;
  price_net?: number | null;
  deposit?: number | null;
  saldo?: number | null;
  duration_hours?: number | null;
  payments?: Payment[];
  paid_total?: number;
  open_amount?: number;
};
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
  quizzes,
  profile,
  initialTab,
  materials,
  recommended,
  benefits,
  feedbackReminder,
  feedbacks,
  surveysOpen,
}: {
  bookings: Booking[];
  courses: Course[];
  quizzes: { id: string; title: string; description: string | null; course_id: string | null; level_count: number; time_per_question: number }[];
  profile: StudentProfile;
  initialTab?: 'bookings' | 'materials' | 'profile' | 'feedback';
  materials: Material[];
  recommended: RecommendedCourse[];
  benefits: Benefit[];
  feedbackReminder?: boolean;
  feedbacks: Record<string, any>;
  surveysOpen?: { survey_id: string; course_id: string; course_title?: string | null; booking_id: string; title: string; instructions?: string | null; start_date?: string | null }[];
}) {
  const [tab, setTab] = useState<'bookings' | 'materials' | 'profile' | 'feedback'>(initialTab || 'bookings');
  const [unread, setUnread] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id || null);
  const courseQuiz = useMemo(() => quizzes.find((q) => q.course_id === selectedCourseId) || null, [quizzes, selectedCourseId]);
  const courseTitle = (cid: string | null) => courses.find((c) => c.id === cid)?.title ?? 'Kurs';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const benefitsRef = useRef<HTMLDivElement | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reminderVisible, setReminderVisible] = useState<boolean>(!!feedbackReminder);

  // sanftes Auto-Scroll der Empfehlungen (nur wenn Tab aktiv)
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const loadUnread = async () => {
      try {
        const r = await fetch('/api/support/unread');
        const d = await r.json().catch(() => ({}));
        setUnread(d.count || 0);
      } catch (e) {
        setUnread(0);
      }
    };

    loadUnread();

    const channel = supabase.channel('support-unread-student')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, loadUnread)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, loadUnread)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const marqueeBenefits = benefits.length ? [...benefits, ...benefits] : [];

  // JS-Marquee für Benefits (scrollLeft Loop)
  useEffect(() => {
    const el = benefitsRef.current;
    if (!el || !marqueeBenefits.length || tab !== 'bookings') return;
    let raf: number;
    let last = performance.now();
    const speed = 40; // px pro Sekunde

    const tick = (ts: number) => {
      const dt = ts - last;
      last = ts;
      el.scrollLeft += (speed * dt) / 1000;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [marqueeBenefits.length, tab]);

  return (
    <div className="min-h-screen flex flex-col space-y-10">
      <div className="flex-1 space-y-10">
      {(surveysOpen || []).length > 0 && (
        <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-900/60 via-amber-800/50 to-amber-900/60 p-4 sm:p-5 text-amber-50 shadow-xl ring-1 ring-amber-300/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Kursfragebogen offen</p>
              <h3 className="text-xl font-semibold">Bitte vor Kursstart ausfüllen</h3>
              <p className="text-sm text-amber-100/80">Hilft uns, den Kurs optimal vorzubereiten.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(surveysOpen || []).map((s) => (
              <a
                key={`${s.survey_id}_${s.booking_id}`}
                href={`/surveys/${s.survey_id}?booking_id=${s.booking_id}`}
                className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-800/40 px-3 py-2 text-sm text-amber-50 hover:bg-amber-700/40 transition"
              >
                <div>
                  <div className="font-semibold line-clamp-1">{s.title}</div>
                  <div className="text-amber-100/80 text-xs line-clamp-1">{s.course_title || s.course_id}</div>
                </div>
                <span className="text-[11px] uppercase tracking-[0.14em] text-amber-200">Start</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabs innerhalb des Student-Dashboards */}
      <nav className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-4 bg-slate-950/85 border-b border-white/10 backdrop-blur-lg shadow-lg">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm font-semibold text-white/85">
          {(
            [
              { key: 'bookings', label: 'Dashboard', tab: 'bookings' },
              { key: 'materials', label: 'Kursunterlagen', tab: 'materials' },
              { key: 'feedback', label: 'Kurs Bewertung', tab: 'feedback' },
              { key: 'support', label: 'Support', tab: 'support' },
              { key: 'profile', label: 'Profil', tab: 'profile' },
            ] as const
          ).map((item) => {
            const active = tab === item.tab;
            const href = item.tab === 'support' ? '/student/support' : `/student?tab=${item.tab}`;
            return (
              <a
                key={item.key}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.tab === 'support') {
                    window.location.href = '/student/support';
                  } else {
                    setTab(item.tab as any);
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', item.tab);
                    window.history.replaceState({}, '', url.toString());
                  }
                }}
                className={`px-3 py-2 rounded-full border transition ${
                  active
                    ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm'
                    : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'
                }`}
              >
                {item.label}
                {item.key === 'support' && unread > 0 && (
                  <span className="ml-2 inline-flex h-5 px-2 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold">
                    {unread}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </nav>

      {tab === 'bookings' && <BookingsClient bookings={bookings} />}

      {tab === 'bookings' && (
        <div className="rounded-2xl border border-white/10 bg-slate-950 text-white overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-[1.2fr,1fr] gap-0 relative">
            <div className="relative min-h-[220px]">
              <div
                className="absolute inset-0 bg-center bg-cover"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=1600&q=80)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
              <div className="relative h-full w-full p-6 flex flex-col justify-end">
                <p className="text-[11px] uppercase tracking-[0.24em] text-pink-200 mb-2">Music Mission Quiz</p>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Music Mission Quiz</h2>
                <p className="text-sm text-white/80 line-clamp-2">{courseQuiz?.description || 'Bildungs-Boost für deine Module – produzieren, mischen, live.'}</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex flex-col gap-4 justify-center bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950">
              <div className="space-y-1">
                <h3 className="text-2xl font-semibold">{courseQuiz?.title || 'Teste dein Wissen'}</h3>
                <p className="text-sm text-white/80 line-clamp-3">{courseQuiz?.description || ''}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                {courses.length > 1 && (
                  <select
                    className="rounded-full border border-white/25 bg-black/40 px-3 py-2 text-sm text-white"
                    value={selectedCourseId || ''}
                    onChange={(e) => setSelectedCourseId(e.target.value || null)}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                )}
                <a
                  href={courseQuiz ? `/quizzes?course_id=${courseQuiz.course_id}&quiz_id=${courseQuiz.id}` : '#'}
                  className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition ${courseQuiz ? 'bg-pink-600 text-white hover:bg-pink-500' : 'bg-slate-700 text-slate-300 cursor-not-allowed'}`}
                  aria-disabled={!courseQuiz}
                  onClick={(e) => { if (!courseQuiz) e.preventDefault(); }}
                >
                  {courseQuiz ? 'Zum Quiz' : 'Kein Quiz hinterlegt'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

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

          <div className="mt-4 space-y-2">
            <h3 className="text-lg font-semibold text-white">Benefits für dich</h3>
            <p className="text-sm text-white/70">Members Card vorzeigen und Vorteile nutzen.</p>
            <div className="overflow-hidden relative" ref={benefitsRef}>
              <div className="flex gap-4 py-2 min-w-full whitespace-nowrap">
                {marqueeBenefits.map((b, idx) => (
                  <div key={`${b.id}-${idx}`} className="min-w-[210px] max-w-[220px] rounded-2xl bg-white text-ink border border-slate-200 shadow-md overflow-hidden flex flex-col">
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
                        {b.action_title || b.description || 'Mit Members Card erhältlich.'}
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
                  <p className="text-white/80">Aktuell keine Benefits hinterlegt.</p>
                )}
              </div>
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
      <FooterLinks />
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

function FooterLinks() {
  return (
    <div className="border-t border-white/10 pt-4 text-xs text-white/70 flex flex-wrap gap-4 justify-center">
      <a href="/legal/agb" target="_blank" rel="noreferrer" className="hover:text-white">AGB</a>
      <a href="/legal/datenschutz" target="_blank" rel="noreferrer" className="hover:text-white">DSGVO</a>
      <a href="/legal/impressum" target="_blank" rel="noreferrer" className="hover:text-white">Impressum</a>
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
        course_id: booking.course_id ?? null,
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
