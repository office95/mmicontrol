'use client';

import { useMemo, useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import TeacherStatsClient from './stats-client';
import CourseListClient from './course-list-client';
import TeacherMaterials from './materials/teacher-materials-client';
import TeacherSupportTab from './support-tab';

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
  quizzes,
  materials,
  feedbacks,
  feedbackOverallAvg,
  benefits,
}: {
  kpis: KPIs;
  interests: InterestRank[];
  sources: PieSlice[];
  notes: PieSlice[];
  courses: CourseCard[];
  quizzes: { id: string; title: string; course_id: string | null; description: string | null }[];
  materials: any[];
  feedbacks: Feedback[];
  feedbackOverallAvg?: number | null;
  benefits: Benefit[];
}) {
  const [tab, setTab] = useState<'perf' | 'courses' | 'materials' | 'feedback' | 'benefits' | 'quiz' | 'support'>('perf');
  const [unread, setUnread] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourDone, setTourDone] = useState(false);

  const tourSteps: {
    id: string;
    title: string;
    desc: string;
    location: string;
    tab?: 'perf' | 'courses' | 'materials' | 'feedback' | 'benefits';
  }[] = [
    {
      id: 'tabs',
      title: 'Navigation',
      desc: 'Oben in der Hauptleiste liegen alle Bereiche: Performance, Kurse, Unterlagen, Feedback, Benefits.',
      location: 'Oben – Button-Leiste',
    },
    {
      id: 'charts',
      title: 'Performance & Charts',
      desc: 'Im Tab „Performance-Übersicht“ (erster Button) siehst du KPIs, Trends und Diagramme zu Buchungen und Teilnehmern.',
      location: 'Navigation · Performance-Übersicht',
      tab: 'perf',
    },
    {
      id: 'courses',
      title: 'Kurse & Teilnehmer',
      desc: 'Im Tab „Meine Kurse & Teilnehmer“ (zweiter Button) findest du Kurskarten mit Start, Dauer und TN-Zahl.',
      location: 'Navigation · Meine Kurse & Teilnehmer',
      tab: 'courses',
    },
    {
      id: 'attendance',
      title: 'Teilnehmer & Anwesenheit',
      desc: 'Im Kurs-Tab zeigt „Teilnehmer“ alle angemeldeten Personen mit Name, Telefon & E-Mail. Über „Anwesenheitsliste“ (öffnet ein Popup) trägst du pro Kurstag die Anwesenheit ein.',
      location: 'Kurskarte · Buttons Teilnehmer / Anwesenheitsliste',
      tab: 'courses',
    },
    {
      id: 'surveys',
      title: 'Fragebogen-Antworten',
      desc: 'Auf der Kurskarte „Fragebogen-Antworten“ öffnen: Hier siehst du die Antworten, die Teilnehmer vor Kursbeginn ausfüllen, damit du dich perfekt vorbereiten kannst.',
      location: 'Kurskarte · Button Fragebogen-Antworten',
      tab: 'courses',
    },
    {
      id: 'export',
      title: 'PDF / Export',
      desc: 'Im Fragebogen-Modal oben auf „PDF / Drucken“ – jede Einreichung als eigene Seite/PDF.',
      location: 'Fragebogen-Modal · PDF / Drucken',
      tab: 'courses',
    },
    {
      id: 'materials',
      title: 'Kursunterlagen',
      desc: 'Im Tab „Kursunterlagen“ findest du immer die aktuellen Materialien zu deinen Kursen, sortiert nach Kurs.',
      location: 'Navigation · Kursunterlagen',
      tab: 'materials',
    },
    {
      id: 'feedback',
      title: 'Kurs-Feedback',
      desc: 'Im Tab „Kurs-Feedback“ siehst du offene Feedbacks und die Rückmeldungen deiner Teilnehmer – hier erkennst du, was noch ausständig ist.',
      location: 'Navigation · Kurs-Feedback',
      tab: 'feedback',
    },
    {
      id: 'benefits',
      title: 'Benefits',
      desc: 'Im Tab „Benefits“ zeigen wir Partner mit Specials für MMI Members Card Besitzer – alle Aktionen auf einen Blick.',
      location: 'Navigation · Benefits',
      tab: 'benefits',
    },
    {
      id: 'support',
      title: 'Support & Hilfe',
      desc: 'Probleme, Wünsche, Anregungen? Über „Support“ schickst du uns eine Nachricht – wir antworten rasch auf dein Anliegen.',
      location: 'Navigation · Support',
    },
    {
      id: 'quiz',
      title: 'Music Mission Quiz',
      desc: 'Ganz unten das „Music Mission Quiz“: Damit trainieren auch deine Teilnehmer spielerisch Theorie – mehrere Levels, steigende Schwierigkeit und Highscore-Liste (anonymisierte Namen).',
      location: 'Seitenende · Quiz-Banner',
    },
  ];
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const loadUnread = async () => {
      try {
        const r = await fetch('/api/support/unread');
        const d = await r.json();
        setUnread(d.count || 0);
      } catch (e) {
        setUnread(0);
      }
    };
    loadUnread();

    const channel = supabase.channel('support-unread-teacher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, loadUnread)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, loadUnread)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const done = localStorage.getItem('teacherTourDone') === 'true';
    setTourDone(done);
  }, []);

  const startTour = () => {
    setTourStep(0);
    setShowTour(true);
  };

  const endTour = () => {
    setShowTour(false);
    setTourDone(true);
    localStorage.setItem('teacherTourDone', 'true');
  };

  const goToStep = (idx: number) => {
    const step = Math.max(0, Math.min(idx, tourSteps.length - 1));
    const target = tourSteps[step];
    if (target.tab) setTab(target.tab);
    setTourStep(step);
    setShowTour(true);
  };
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
  const quizMap = useMemo(() => {
    const m = new Map<string, { id: string; title: string; description: string | null; course_id: string | null }>();
    quizzes.forEach((q) => {
      if (q.course_id) m.set(q.course_id, q);
    });
    return m;
  }, [quizzes]);
  const [selectedQuizCourseId, setSelectedQuizCourseId] = useState<string | null>(null);
  const selectedQuiz = selectedQuizCourseId ? quizMap.get(selectedQuizCourseId) || null : null;

  // Options: Kurse + ggf. Kurs aus Quiz (falls nicht in courses)
  const quizCourseOptions = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.title));
    quizzes.forEach((q) => {
      if (q.course_id && !map.has(q.course_id)) map.set(q.course_id, q.title || q.course_id);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [courses, quizzes]);

  // Default-Auswahl: erster Kurs mit Quiz, sonst erster Kurs aus Options
  useEffect(() => {
    if (!quizCourseOptions.length) return;
    const firstWithQuiz = quizCourseOptions.find((o) => quizMap.has(o.id));
    const nextId = firstWithQuiz?.id || quizCourseOptions[0].id;
    setSelectedQuizCourseId((prev) => prev ?? nextId);
  }, [quizCourseOptions, quizMap]);
  const selectedFeedbacks = selectedCourseId ? feedbackByCourse.get(selectedCourseId) || [] : [];

  return (
    <div className="min-h-screen flex flex-col space-y-8">
      <div className="flex-1 space-y-8">
        <nav className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-4 bg-slate-950/85 border-b border-white/10 backdrop-blur-lg shadow-lg">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm font-semibold text-white/85">
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'perf' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('perf')}
            >
              Performance-Übersicht
            </button>
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'courses' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('courses')}
            >
              Meine Kurse & Teilnehmer
            </button>
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'materials' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('materials')}
            >
              Kursunterlagen
            </button>
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'feedback' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('feedback')}
            >
              Kurs-Feedback
            </button>
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'benefits' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('benefits')}
            >
              Benefits
            </button>
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'quiz' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('quiz')}
            >
              Quiz
            </button>
            <button
              className={`px-3 py-2 rounded-full border transition ${tab === 'support' ? 'border-pink-400 bg-pink-500/15 text-white shadow-pink-500/20 shadow-sm' : 'border-white/15 bg-white/5 hover:border-pink-300 hover:text-white'}`}
              onClick={() => setTab('support')}
            >
              Support
            </button>
            <button
              className="ml-auto px-3 py-2 rounded-full border border-pink-300/60 text-pink-50 hover:bg-pink-500/15 transition"
              onClick={startTour}
            >
              ? Hilfe / Tour
            </button>
          </div>
        </nav>

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

      {tab === 'quiz' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Quiz-Übersicht</h3>
                <p className="text-sm text-white/70">Quizze zu deinen Kursen. Fragen und Antworten werden zufällig gemischt.</p>
              </div>
              <a
                href="/admin/quizzes"
                className="text-xs px-3 py-2 rounded-full border border-white/30 text-white hover:bg-white/10"
              >
                Quiz verwalten (Admin)
              </a>
            </div>
            <div className="grid gap-3 mt-4">
              {quizzes.length === 0 && <p className="text-white/80">Noch keine Quizze vorhanden.</p>}
              {quizzes.map((q) => (
                <div key={q.id} className="rounded-xl border border-white/15 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-pink-200">{q.course_id || 'Kurs'}</p>
                    <h4 className="text-base font-semibold text-white">{q.title}</h4>
                    <p className="text-sm text-white/70 line-clamp-2">{q.description || 'Kein Beschreibungstext hinterlegt.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/quizzes?preview=1${q.course_id ? `&course_id=${q.course_id}` : ''}`}
                      className="rounded-full bg-pink-600 px-4 py-2 text-white text-sm font-semibold hover:bg-pink-500"
                    >
                      Zum Quiz
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'support' && <TeacherSupportTab />}

      {/* Music Mission Quiz – immer direkt vor dem Footer */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-pink-900/60 text-white overflow-hidden shadow-2xl">
        <div className="grid md:grid-cols-[1.3fr,1fr] gap-0">
          <div className="relative min-h-[220px]">
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=1600&q=80)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
            <div className="relative h-full w-full p-6 flex flex-col justify-end">
              <p className="text-[11px] uppercase tracking-[0.24em] text-pink-200 mb-2">Music Mission Quiz</p>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Music Mission Quiz</h2>
              <p className="text-sm text-white/80">Studio- und Live-Module trainieren – jetzt mit Zeitlimit & Levels.</p>
            </div>
          </div>
          <div className="p-6 sm:p-8 flex flex-col gap-4 justify-center">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">Modul-Quiz für deine Kurse</h3>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-white/80">
              <span className="px-3 py-1 rounded-full border border-white/20 bg-white/10">Module 1–20</span>
              <span className="px-3 py-1 rounded-full border border-white/20 bg-white/10">Zeitlimit & Levels</span>
              <span className="px-3 py-1 rounded-full border border-white/20 bg-white/10">Anonyme Bestenliste</span>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {courses.length > 1 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {courses.slice(0, 6).map((c) => (
                    <a
                      key={c.id}
                      href={`/quizzes?course_id=${c.id}`}
                      className="px-3 py-1 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 transition"
                    >
                      {c.title}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <a
                  href={`/quizzes${courses[0]?.id ? `?course_id=${courses[0].id}` : ''}`}
                  className="inline-flex items-center justify-center rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-pink-500 transition"
                >
                  Quiz öffnen
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div> {/* end flex-1 */}

      {showTour && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center px-4">
          <div className="max-w-lg w-full rounded-2xl bg-white text-ink p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Schritt {tourStep + 1} / {tourSteps.length}</p>
                <h3 className="text-xl font-semibold text-ink mt-1">{tourSteps[tourStep].title}</h3>
              </div>
              <button className="text-slate-500 hover:text-ink" onClick={endTour}>×</button>
            </div>
            <p className="text-sm text-slate-700 mt-3">{tourSteps[tourStep].desc}</p>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
                <span className="inline-flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                Ort: {tourSteps[tourStep].location}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => goToStep(tourStep - 1)}
                  disabled={tourStep === 0}
                >
                  Zurück
                </button>
                {tourStep < tourSteps.length - 1 ? (
                  <button
                    className="px-3 py-1.5 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600"
                    onClick={() => goToStep(tourStep + 1)}
                  >
                    Weiter
                  </button>
                ) : (
                  <button
                    className="px-3 py-1.5 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600"
                    onClick={endTour}
                  >
                    Tour beenden
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <FooterLinks />
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

function FooterLinks() {
  return (
    <div className="border-t border-white/10 pt-4 text-xs text-white/70 flex flex-wrap gap-4 justify-center">
      <a href="/legal/agb" target="_blank" rel="noreferrer" className="hover:text-white">AGB</a>
      <a href="/legal/datenschutz" target="_blank" rel="noreferrer" className="hover:text-white">DSGVO</a>
      <a href="/legal/impressum" target="_blank" rel="noreferrer" className="hover:text-white">Impressum</a>
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
