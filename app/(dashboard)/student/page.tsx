import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import ProfileModal from '@/components/student-profile-modal';
import ProfileWrapper from './profile-wrapper';

export default async function StudentPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
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

  const registeredAt = user?.created_at ? new Date(user.created_at) : null;

  const loginEmail = (user?.email || '').toLowerCase();

  // Studentendatensatz über E-Mail (service)
  const { data: student } = await service
    .from('students')
    .select('id, student_id, name, email, status, is_problem, problem_note, country, state, city, phone, street, zip, birthdate')
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
  let bookings: {
    id: string;
    booking_code: string | null;
    booking_date: string | null;
    status: string;
    amount: number | null;
    course_title: string | null;
    course_start: string | null;
    partner_name: string | null;
    student_name?: string | null;
    vat_rate?: number | null;
    price_net?: number | null;
    deposit?: number | null;
    saldo?: number | null;
    duration_hours?: number | null;
  }[] | null = [];

  if (loginEmail) {
    const orParts = [`student_email.eq.${loginEmail}`];
    if (student?.id) orParts.push(`student_id.eq.${student.id}`);

    const { data: bookingRows } = await service
      .from('bookings')
      .select('id, booking_code, booking_date, status, amount, course_title, course_start, partner_name, student_name, vat_rate, price_net, deposit, saldo, duration_hours')
      .or(orParts.join(','))
      .order('booking_date', { ascending: false });
    bookings = bookingRows || [];
  }

  const bookingId = typeof searchParams?.booking === 'string' ? searchParams.booking : null;
  const selectedBooking = bookingId
    ? bookings?.find((b) => b.id === bookingId) || null
    : null;

  const showProfile = searchParams?.profile === '1';

  // Nächster Kurs für Countdown (falls vorhanden)
  const nextCourse = (courses || [])
    .filter((c) => c.start_date)
    .sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime())[0];
  const start = nextCourse?.start_date ? new Date(nextCourse.start_date) : null;
  const today = new Date();
  const days = start ? Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white/10 border border-white/15 rounded-xl p-6 shadow-lg relative overflow-hidden">
        <div className="space-y-1">
          <p className="text-[12px] uppercase tracking-[0.28em] text-pink-200 mb-1">Willkommen</p>
          <p className="text-2xl font-semibold text-white">
            Hallo {student?.name ?? (user?.user_metadata as any)?.full_name ?? 'Teilnehmer'}, schön dass du da bist.
          </p>
          <div className="text-sm text-white/80 mt-1 space-x-2">
            <span>Deine Übersicht</span>
            {registeredAt && (
              <span className="text-white/60">· registriert am {registeredAt.toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -right-10 -top-10 h-32 w-32 bg-pink-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white px-6 py-5 shadow-2xl ring-2 ring-white/30 min-w-[240px] text-center transform hover:scale-[1.02] transition">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/80 mb-2">Noch</p>
            <p className="text-3xl font-extrabold leading-tight drop-shadow-lg animate-pulse">
              {start && days !== null && days >= 0 ? `${days} Tage` : start ? 'läuft / vorbei' : '—'}
            </p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/80 mt-2">bis Kursbeginn</p>
          </div>
        </div>
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
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              <span>Buchungsdatum: {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</span>
              <a
                href={`/student?booking=${b.id}`}
                className="inline-flex items-center rounded-md bg-slate-900 text-white px-3 py-1 text-[12px] font-semibold shadow-sm hover:bg-slate-800"
              >
                Details
              </a>
            </div>
          </div>
        ))}
      </div>

      <ProfileWrapper
        open={showProfile}
        profile={
          student
            ? {
                id: student.id,
                name: student.name,
                street: (student as any).street || '',
                city: student.city,
                state: student.state,
                country: student.country,
                zip: (student as any).zip || '',
                phone: student.phone,
                email: student.email,
                birthdate: (student as any).birthdate || '',
              }
            : null
        }
      />

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-ink"
              onClick={() => (window.location.href = '/student')}
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-4">Kursübersicht</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {([
                ['Kursteilnehmer', selectedBooking.student_name ?? '—'],
                ['Buchungscode', selectedBooking.booking_code ?? '—'],
                ['Buchungsdatum', selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleDateString() : '—'],
                ['Kurs', selectedBooking.course_title ?? '—'],
                ['Kursstart', selectedBooking.course_start ? new Date(selectedBooking.course_start).toLocaleDateString() : '—'],
                ['Anbieter', selectedBooking.partner_name ?? '—'],
                ['Betrag (Brutto)', selectedBooking.amount != null ? `${Number(selectedBooking.amount).toFixed(2)} €` : '—'],
                ['USt-Satz', selectedBooking.vat_rate != null ? `${(Number(selectedBooking.vat_rate) * 100).toFixed(1)} %` : '—'],
                ['Netto', selectedBooking.price_net != null ? `${Number(selectedBooking.price_net).toFixed(2)} €` : '—'],
                ['Anzahlung', selectedBooking.deposit != null ? `${Number(selectedBooking.deposit).toFixed(2)} €` : '—'],
                ['Saldo', selectedBooking.saldo != null ? `${Number(selectedBooking.saldo).toFixed(2)} €` : '—'],
                ['Dauer (h)', selectedBooking.duration_hours != null ? `${selectedBooking.duration_hours} h` : '—'],
              ] as const).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</p>
                  <p className="text-[15px] text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
                onClick={() => (window.location.href = '/student')}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
