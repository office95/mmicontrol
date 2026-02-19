import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import CourseListClient from './course-list-client';
import TeacherStatsClient from './stats-client';

export default async function TeacherPage() {
  const supabase = createSupabaseServerClient();
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginEmail = (user?.email || '').toLowerCase();
  const fullName = (user?.user_metadata as any)?.full_name || loginEmail || 'Dozent';

  // Partner-Zuordnung des Dozenten (aus profiles.partner_id)
  let teacherPartner: string | null = null;
  if (user?.id) {
    const { data: profile } = await service
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .maybeSingle();
    teacherPartner = (profile as any)?.partner_id ?? null;
  }
  const registeredAt = user?.created_at ? new Date(user.created_at) : null;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  // Kurse & Partner-Filter
  let courses:
    | {
        id: string;
        title: string;
        description: string | null;
        start_date: string | null;
      duration_hours?: number | null;
      participants: { name: string; email: string; phone?: string | null }[];
    }[]
  | null = [];

  // 1) Kurs-IDs: Schnittmenge aus Kurs-Memberships des Dozenten UND/ODER Partner-Kurse
  let courseIds: string[] = [];
  if (user?.id) {
    const { data: memberships } = await service
      .from('course_members')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('role', 'teacher');
    courseIds = memberships?.map((m) => m.course_id).filter(Boolean) || [];
  }
  if (teacherPartner) {
    const { data: partnerCourses } = await service
      .from('courses')
      .select('id')
      .eq('partner_id', teacherPartner);
    const partnerIds = partnerCourses?.map((c) => c.id as string).filter(Boolean) || [];
    courseIds = Array.from(new Set([...courseIds, ...partnerIds]));
  }

  // 2) Kurse laden (nach Partner gefiltert, falls gesetzt)
  if (courseIds.length) {
    const { data: courseRows } = await service
      .from('courses')
      .select('id, title, description, duration_hours, partner_id')
      .in('id', courseIds);

    const filteredCourses = teacherPartner
      ? (courseRows || []).filter((c: any) => (c.partner_id ?? null) === teacherPartner || courseIds.includes(c.id as string))
      : (courseRows || []);

    courses = filteredCourses.map((c) => ({
      id: c.id as string,
      title: c.title as string,
      description: (c as any).description ?? null,
      duration_hours: (c as any).duration_hours ?? null,
      start_date: null,
      participants: [],
    }));

    // Termine holen
    const { data: dates } = await service
      .from('course_dates')
      .select('course_id, start_date')
      .in('course_id', courseIds);

    const dateMap = new Map<string, string | null>();
    const today = new Date();
    dates?.forEach((d) => {
      if (!d.start_date) return;
      const existing = dateMap.get(d.course_id);
      const currentDate = new Date(d.start_date);
      const existingDate = existing ? new Date(existing) : null;
      const isFuture = currentDate >= today;
      const isExistingFuture = existingDate ? existingDate >= today : false;
      if (!existing) {
        dateMap.set(d.course_id, d.start_date);
      } else if (isFuture && (!isExistingFuture || currentDate < existingDate!)) {
        dateMap.set(d.course_id, d.start_date);
      } else if (!isFuture && !isExistingFuture && currentDate < existingDate!) {
        dateMap.set(d.course_id, d.start_date);
      }
    });

    // Teilnehmer via enrollments (optional)
    let participantMap = new Map<string, { name: string; email: string; phone?: string | null }[]>();
    const { data: enrollments } = await service
      .from('course_members')
      .select('course_id, profiles(full_name, id), created_at')
      .eq('role', 'student')
      .in('course_id', courseIds);

    if (enrollments?.length) {
      const studentIds = Array.from(new Set(enrollments.map((e: any) => e.profiles?.id).filter(Boolean)));
      let studentMap = new Map<string, { name: string; email: string; phone?: string | null }>();
      if (studentIds.length) {
        const { data: studentRows } = await service
          .from('students')
          .select('id, name, email, phone')
          .in('id', studentIds);
        studentRows?.forEach((s) => studentMap.set(s.id, { name: s.name ?? s.email ?? 'Teilnehmer', email: s.email ?? '', phone: s.phone }));
      }
      enrollments.forEach((e: any) => {
        const cid = e.course_id as string;
        const stu = studentMap.get(e.profiles?.id) || { name: e.profiles?.full_name ?? 'Teilnehmer', email: '' };
        (stu as any).booking_date = e.created_at || null;
        const list = participantMap.get(cid) || [];
        list.push(stu);
        participantMap.set(cid, list);
      });
    }

    courses = courses
      .map((c) => ({
        ...c,
        start_date: dateMap.get(c.id) ?? null,
        participants: participantMap.get(c.id) || [],
      }))
      .filter((c) => c.start_date)
      .sort((a, b) => new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime());
  }

  // Nächster Kurs für Countdown
  const nextCourse = (courses || [])
    .filter((c) => c.start_date)
    .sort((a, b) => new Date(a.start_date as string | number).getTime() - new Date(b.start_date as string | number).getTime())[0];
  const nextStart = nextCourse?.start_date ? new Date(nextCourse.start_date) : null;
  const daysRemaining = nextStart ? Math.ceil((nextStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  // Buchungen und Students für KPIs
  let monthBookings = 0;
  let monthBookingsPrev = 0;
  let yearBookings = 0;
  let yearBookingsPrev = 0;
  let topInterests: { label: string; count: number }[] = [];
  let sources: { label: string; value: number }[] = [];
  let notes: { label: string; value: number }[] = [];

  try {
    const courseIds = courses?.map((c) => c.id) ?? [];
    // Buchungen: Partner-filter, aber fallback auf Kurs-Zuordnung falls partner_id fehlt
    const { data: bookings, error: bookingsErr } = await service
      .from('bookings')
      .select('id, course_id, course_date_id, student_id, booking_date, created_at, partner_id, amount, course_title, course_dates(course_id)');

    const bookingsData = bookingsErr ? [] : bookings || [];
    const scopedBookingsRaw = bookingsData.filter((b: any) => {
      const partnerMatch = teacherPartner ? (b.partner_id ?? null) === teacherPartner : true;
      if (partnerMatch) return true;
      // fallback: Kurs-Zuordnung (hilft, wenn partner_id in booking leer ist)
      const cid = b.course_id as string | null;
      const cdCid = (b as any).course_dates?.course_id as string | null;
      return (cid && courseIds.includes(cid)) || (cdCid && courseIds.includes(cdCid));
    });

    const scopedBookings = scopedBookingsRaw;

    const studentIds = Array.from(new Set(scopedBookings.map((b) => b.student_id).filter(Boolean)));

    const studentsBookings = studentIds.length
      ? (
          await service
            .from('students')
            .select('*')
            .in('id', studentIds)
        ).data || []
      : [];

    // Students nur aus relevanten Buchungen (Partner-Scope erfolgt über scopedBookings)
    const studentsAll = studentsBookings || [];

    // Leads mit Partner für Quellen / Skills (statt note) – '*' um Schema-Mismatches zu vermeiden
    const leads = teacherPartner
      ? (
          await service
            .from('leads')
            .select('*')
            .eq('partner_id', teacherPartner)
        ).data || []
      : [];


    const isSameMonthYear = (d: Date, year: number, month: number) => d.getFullYear() === year && d.getMonth() === month;

    scopedBookings.forEach((b) => {
      const dateStr = b.booking_date || b.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isSameMonthYear(d, currentYear, currentMonth)) monthBookings++;
      if (isSameMonthYear(d, prevYear, currentMonth)) monthBookingsPrev++;
      if (d.getFullYear() === currentYear) yearBookings++;
      if (d.getFullYear() === prevYear) yearBookingsPrev++;
    });

    // Interests aus Leads.interest_name + Bookings.course_title
    const freq: Record<string, number> = {};
    const inc = (key: string) => {
      const k = key?.toString().trim();
      if (!k) return;
      freq[k] = (freq[k] || 0) + 1;
    };
    (leads || []).forEach((l: any) => {
      const val = (l as any).interest_name ?? (l as any).interest_courses;
      const handle = (x: any) => {
        const raw = x?.toString().trim();
        if (!raw) return;
        inc(raw);
      };
      if (Array.isArray(val)) val.forEach(handle);
      else if (typeof val === 'string') val.split(/[,;\n]+/).forEach(handle);
      else handle(val);
    });
    (scopedBookings || []).forEach((b: any) => inc(b.course_title));
    topInterests = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }));

    // Source pie (Leads + Students-Fallback)
    const sourceFreq: Record<string, number> = {};
    const addSource = (val: any) => {
      if (Array.isArray(val)) val = val.join(', ');
      const key = (typeof val === 'string' ? val : String(val ?? 'Unbekannt')).trim() || 'Unbekannt';
      sourceFreq[key] = (sourceFreq[key] || 0) + 1;
    };
    (leads || []).forEach((l: any) => addSource(l.source));
    // Fallback: wenn keine Leads, nimm Student-Quellen
    if (!Object.keys(sourceFreq).length) {
      (studentsAll || []).forEach((s: any) => addSource(s.source));
    }
    const totalSources = Object.values(sourceFreq).reduce((a, b) => a + b, 0) || 1;
    sources = Object.entries(sourceFreq).map(([label, value]) => ({ label, value: (value / totalSources) * 100 }));

    // Skills/Erfahrungen aus Leads (skills Feld), Fallback note aus Students
    const noteFreq: Record<string, number> = {};
    const addNote = (val: string | string[] | null | undefined) => {
      if (Array.isArray(val)) {
        val.forEach((v) => addNote(v));
        return;
      }
      const key = (val || 'Keine Angabe').toString().trim() || 'Keine Angabe';
      noteFreq[key] = (noteFreq[key] || 0) + 1;
    };
    (leads || []).forEach((l: any) => addNote(l.skills ?? l.notes ?? l.note));
    if (!Object.keys(noteFreq).length) {
      (studentsAll || []).forEach((s: any) => addNote((s as any).notes ?? (s as any).note));
    }
    const totalNotes = Object.values(noteFreq).reduce((a, b) => a + b, 0) || 1;
    notes = Object.entries(noteFreq).map(([label, value]) => ({ label, value: (value / totalNotes) * 100 }));
  } catch (err) {
    console.error('Teacher dashboard data error', err);
    monthBookings = 0;
    monthBookingsPrev = 0;
    yearBookings = 0;
    yearBookingsPrev = 0;
    topInterests = [];
    sources = [];
    notes = [];
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white/10 border border-white/15 rounded-xl p-6 shadow-lg relative overflow-hidden">
        <div className="space-y-1">
          <p className="text-[12px] uppercase tracking-[0.28em] text-pink-200 mb-1">Willkommen</p>
          <p className="text-2xl font-semibold text-white">Hallo {fullName}, schön dass du da bist.</p>
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
              {nextStart && daysRemaining !== null && daysRemaining >= 0 ? `${daysRemaining} Tage` : nextStart ? 'läuft / vorbei' : '—'}
            </p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/80 mt-2">bis Kursbeginn</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Meine Kurse & Teilnehmer</h2>
        <TeacherStatsClient
          kpis={{ monthBookings, monthBookingsPrev, yearBookings, yearBookingsPrev }}
          interests={topInterests}
          sources={sources}
          notes={notes}
        />
        {courses && courses.length > 0 ? (
          <CourseListClient courses={courses} />
        ) : (
          <p className="text-slate-200 bg-white/5 border border-white/10 rounded-lg p-4">
            Noch keine Kurse zugewiesen.
          </p>
        )}
      </div>
    </div>
  );
}
