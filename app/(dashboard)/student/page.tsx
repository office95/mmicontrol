import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import StudentDashboardClient from './student-dashboard-client';

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
  let courseIds: string[] = [];
  let courseDates:
    | {
        course_id: string;
        start_date: string | null;
        end_date: string | null;
      }[]
    | null = [];

  if (user?.id) {
    const { data: memberships } = await service
      .from('course_members')
      .select('course_id')
      .eq('user_id', user.id);
    courseIds = memberships?.map((m) => m.course_id).filter(Boolean) || [];
    if (courseIds.length) {
      const { data: courseRows } = await service
        .from('courses')
        .select('id, title, description')
        .in('id', courseIds);
      courses = courseRows || [];

      // Starttermine zu den Kursen laden
      const { data: courseDatesData } = await service
        .from('course_dates')
        .select('course_id, start_date, end_date')
        .in('course_id', courseIds);
      courseDates = courseDatesData || [];
      const dateMap = new Map<string, string | null>();
      const today = new Date();
      courseDates.forEach((d) => {
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
  }[] | null = [];

  if (loginEmail) {
    const orParts = [`student_email.eq.${loginEmail}`];
    if (student?.id) orParts.push(`student_id.eq.${student.id}`);

    const { data: bookingRows } = await service
      .from('bookings')
      .select('id, booking_code, booking_date, status, amount, course_id, course_title, course_start, partner_name, student_name, vat_rate, price_net, deposit, saldo, duration_hours')
      .or(orParts.join(','))
      .order('booking_date', { ascending: false });
    bookings = bookingRows || [];
  }

  const bookingId = typeof searchParams?.booking === 'string' ? searchParams.booking : null;
  const selectedBooking = bookingId
    ? bookings?.find((b) => b.id === bookingId) || null
    : null;

  const showProfile = searchParams?.profile === '1';

  // Bereits abgegebene Feedbacks laden (pro Buchung / User)
  let feedbacks: Record<string, any> = {};
  const bookingIds = (bookings || []).map((b) => b.id);
  if (bookingIds.length && user?.id) {
    const { data: fbRows } = await service
      .from('course_feedback')
      .select('id, booking_id, ratings, expectations, improve, recommend, created_at')
      .eq('user_id', user.id)
      .in('booking_id', bookingIds);
    (fbRows || []).forEach((fb) => {
      feedbacks[fb.booking_id] = fb;
    });
  }

  // Kursunterlagen (Materials) direkt laden
  let materials: {
    id: string;
    title: string;
    course_id: string | null;
    module_number: number | null;
    signed_url?: string | null;
    cover_url?: string | null;
  }[] = [];
  if (courseIds.length) {
    const { data: materialsRaw } = await service
      .from('materials')
      .select('id, title, course_id, module_number, storage_path, cover_path, visibility')
      .in('course_id', courseIds)
      .in('visibility', ['students', 'both'])
      .order('module_number', { ascending: true });

    for (const m of materialsRaw || []) {
      const fileUrl = m.storage_path
        ? (await service.storage.from('materials').createSignedUrl(m.storage_path, 60 * 60)).data?.signedUrl ?? null
        : null;
      const coverUrl = m.cover_path
        ? (await service.storage.from('materials').createSignedUrl(m.cover_path, 60 * 60)).data?.signedUrl ?? null
        : null;
      materials.push({
        id: m.id,
        title: m.title,
        course_id: m.course_id,
        module_number: m.module_number,
        signed_url: fileUrl,
        cover_url: coverUrl,
      });
    }
  }

  // Kurs-Empfehlungen für Studenten: zufällige aktive Kurse (max 50)
  let recommended: {
    id: string;
    title: string;
    price_gross?: number | null;
    course_link?: string | null;
    cover_url?: string | null;
  }[] = [];
  {
    const { data: recRows } = await service
      .from('courses')
      .select('id, title, price_gross, course_link, cover_url')
      .eq('status', 'active')
      .limit(50);
    recommended = (recRows || []).sort(() => Math.random() - 0.5); // zufällige Reihenfolge, alle anzeigen
  }

  // Benefits (Rabatte) für Studierende: aktive, gültige, target passt
  let benefits: {
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
  }[] = [];
  {
    const { data: rows } = await service
      .from('benefit_companies')
      .select('id, name, action_title, description, logo_path, discount_type, discount_value, code, valid_from, valid_to, members_card_required, how_to_redeem, website, target, status')
      .eq('status', 'active');

    const today = new Date();
    for (const b of rows || []) {
      const fromOk = !b.valid_from || new Date(b.valid_from) <= today;
      const toOk = !b.valid_to || new Date(b.valid_to) >= today;
      const targetOk = !b.target || ['students', 'both'].includes(b.target);
      if (!(fromOk && toOk && targetOk)) continue;

      const logoUrl = b.logo_path
        ? (await service.storage.from('benefit-logos').createSignedUrl(b.logo_path, 60 * 60)).data?.signedUrl ?? null
        : null;

      benefits.push({
        id: b.id,
        name: b.name,
        action_title: b.action_title ?? null,
        description: b.description ?? null,
        logo_url: logoUrl,
        discount_type: b.discount_type ?? null,
        discount_value: b.discount_value ?? null,
        code: b.code ?? null,
        valid_from: b.valid_from ?? null,
        valid_to: b.valid_to ?? null,
        members_card_required: b.members_card_required ?? true,
        how_to_redeem: b.how_to_redeem ?? 'Members Card vorzeigen',
        website: b.website ?? null,
      });
    }
  }

  // Nächster Kurs für Countdown (falls vorhanden)
  const nextCourse = (courses || [])
    .filter((c) => c.start_date)
    .sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime())[0];
  const start = nextCourse?.start_date ? new Date(nextCourse.start_date) : null;
  const today = new Date();
  const days = start ? Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Feedback-Reminder (1 Woche vor Kursende, falls end_date vorhanden)
  let showFeedbackReminder = false;
  if (courseDates && courseDates.length) {
    const todayMs = Date.now();
    courseDates.forEach((d) => {
      const end = d.end_date ? new Date(d.end_date).getTime() : null;
      if (end && end - todayMs <= 7 * 24 * 60 * 60 * 1000 && end >= todayMs) {
        showFeedbackReminder = true;
      }
    });
  }

  // Support: offene Tickets zählen
  const { count: supportCount } = user?.id
    ? await service
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .in('status', ['open', 'in_progress'])
    : { count: 0 } as any;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white/80 text-sm">
          Support benötigt? Schreib uns.
        </div>
        <a
          href="/student/support"
          className="inline-flex items-center gap-2 rounded-full bg-white text-ink px-4 py-2 text-sm font-semibold shadow-lg hover:bg-pink-50"
        >
          Support
          {supportCount ? (
            <span className="inline-flex h-5 px-2 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold">
              {supportCount}
            </span>
          ) : null}
        </a>
      </div>

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

      <StudentDashboardClient
        bookings={bookings || []}
        courses={courses || []}
        materials={materials}
        recommended={recommended}
        feedbacks={feedbacks}
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
      showProfileInitially={showProfile}
      benefits={benefits}
      supportCount={supportCount || 0}
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
