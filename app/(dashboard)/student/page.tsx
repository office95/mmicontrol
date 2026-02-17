import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export default async function StudentPage() {
  // Auth-Client (für Session)
  const supabase = createSupabaseServerClient();
  // Service-Client (RLS-frei, nur serverseitig nutzen)
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginEmail = (user?.email || '').toLowerCase();

  // Studentendatensatz über E-Mail (service)
  const { data: student } = await service
    .from('students')
    .select('id, student_id, name, email, status, is_problem, problem_note, country, state, city')
    .eq('email', loginEmail)
    .maybeSingle();

  // Kurse über course_members (service)
  let courses:
    | {
        id: string;
        title: string;
        description: string | null;
        start_date?: string | null;
      }[]
    | null = [];
  if (user?.id) {
    const { data: memberships } = await service
      .from('course_members')
      .select('course_id')
      .eq('user_id', user.id);
    const ids = memberships?.map((m) => m.course_id).filter(Boolean) || [];
    if (ids.length) {
      const { data: courseRows } = await service
        .from('courses')
        .select('id, title, description')
        .in('id', ids);
      courses = courseRows || [];

      // Starttermine zu den Kursen laden
      const { data: dates } = await service
        .from('course_dates')
        .select('course_id, start_date')
        .in('course_id', ids);
      const dateMap = new Map<string, string | null>();
      const today = new Date();
      dates?.forEach((d) => {
        if (!d.start_date) return;
        const existing = dateMap.get(d.course_id);
        const currentDate = new Date(d.start_date);
        const existingDate = existing ? new Date(existing) : null;
        // wähle den nächstgelegenen zukünftigen Termin; falls keiner, nimm den frühesten vergangenen
        const isFuture = currentDate >= today;
        const isExistingFuture = existingDate ? existingDate >= today : false;
        if (!existing) {
          dateMap.set(d.course_id, d.start_date);
        } else if (isFuture && (!isExistingFuture || currentDate < existingDate!)) {
          dateMap.set(d.course_id, d.start_date);
        } else if (!isFuture && !isExistingFuture && currentDate < existingDate!) {
          // beide Vergangenheit: nimm den neueren (näher an heute)
          dateMap.set(d.course_id, d.start_date);
        }
      });
      // Kursliste mit Startdatum anreichern
      courses = courses.map((c) => ({
        ...c,
        start_date: dateMap.get(c.id) ?? null,
      }));
    }
  }

  // Buchungen (service, OR auf email + student_id)
  let bookings:
    | {
        id: string;
        booking_date: string | null;
        status: string;
        amount: number | null;
        course_title: string | null;
        course_start: string | null;
        partner_name: string | null;
        student_name?: string | null;
      }[]
    | null = [];

  if (loginEmail) {
    const orParts = [`student_email.eq.${loginEmail}`];
    if (student?.id) orParts.push(`student_id.eq.${student.id}`);

    const { data: bookingRows } = await service
      .from('bookings')
      .select('id, booking_date, status, amount, course_title, course_start, partner_name')
      .or(orParts.join(','))
      .order('booking_date', { ascending: false });
    bookings = bookingRows || [];
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/10 border border-white/15 rounded-xl p-5 shadow-lg">
        <p className="text-[12px] uppercase tracking-[0.28em] text-pink-200 mb-1">Willkommen</p>
        <p className="text-2xl font-semibold text-white">
          Hallo {student?.name ?? (user?.user_metadata as any)?.full_name ?? 'Teilnehmer'}, schön dass du da bist.
        </p>
        <p className="text-sm text-white/80 mt-1">Deine Übersicht</p>
      </div>

      {/* Profilbox entfernt, damit Inhalte nach oben rücken */}

      <h2 className="text-xl font-semibold text-white">Kurs Counter</h2>

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {(courses ?? []).map((c) => {
          const start = c.start_date ? new Date(c.start_date) : null;
          const today = new Date();
          const days = start ? Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div
              key={c.id}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70 shadow-2xl text-white p-5 space-y-4"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 bg-pink-500/30 rounded-full blur-3xl" />
              <div className="absolute -left-14 bottom-0 h-32 w-32 bg-purple-500/20 rounded-full blur-3xl" />

              <div className="flex items-center justify-between relative">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Kurs</p>
                  <h3 className="text-xl font-semibold">{c.title}</h3>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 shadow-lg ring-1 ring-white/20">
                  {start ? (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/80">Noch</p>
                      <p className="text-lg font-bold leading-tight animate-pulse">
                        {days !== null && days >= 0 ? `${days} Tage` : 'läuft / vorbei'}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/80">bis Kursbeginn</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/80">Termin</p>
                      <p className="text-lg font-bold leading-tight">folgt</p>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/80">&nbsp;</p>
                    </>
                  )}
                </div>
              </div>

              <div className="relative rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {start ? (
                    <>
                      <span>Kursstart:</span>
                      <span className="font-semibold text-white">{start.toLocaleDateString()}</span>
                    </>
                  ) : (
                    <span>Kursstart wird noch bekanntgegeben</span>
                  )}
                </div>
              </div>

              {c.description && (
                <p className="text-sm text-white/80 leading-relaxed relative">
                  {c.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold text-white">Meine Buchungen</h2>
      <div className="card p-5 space-y-3">
        {!bookings?.length && <p className="text-slate-600 text-sm">Keine Buchungen vorhanden.</p>}
        {bookings?.map((b) => (
          <div key={b.id} className="rounded-lg border border-slate-200 p-3 bg-white/60">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink">{b.course_title ?? 'Kurs unbekannt'}</span>
              <span className="text-slate-500">· Start: {b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'}</span>
              <span className="text-slate-500">· Status: {b.status}</span>
              {b.amount != null && <span className="text-slate-500">· Betrag: {b.amount} €</span>}
              {b.partner_name && <span className="text-slate-500">· Anbieter: {b.partner_name}</span>}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Buchungsdatum: {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
