import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import CourseListClient from './course-list-client';

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
  const registeredAt = user?.created_at ? new Date(user.created_at) : null;

  // Kurse über course_members (role = teacher)
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

  if (user?.id) {
    const { data: memberships } = await service
      .from('course_members')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('role', 'teacher');

    const ids = memberships?.map((m) => m.course_id).filter(Boolean) || [];

    if (ids.length) {
      const { data: courseRows } = await service
        .from('courses')
        .select('id, title, description, duration_hours')
        .in('id', ids);
      courses = (courseRows || []).map((c) => ({
        id: c.id as string,
        title: c.title as string,
        description: (c as any).description ?? null,
        duration_hours: (c as any).duration_hours ?? null,
        start_date: null,
        participants: [],
      }));

      // Nächstes Kursdatum je Kurs
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

      // Teilnehmer je Kurs laden (students auf Grund der Buchungen/Zuordnung)
      let participantMap = new Map<string, { name: string; email: string; phone?: string | null }[]>();
      const { data: enrollments } = await service
        .from('course_members')
        .select('course_id, profiles(full_name, id), created_at')
        .eq('role', 'student')
        .in('course_id', ids);

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

      courses = courses.map((c) => ({
        ...c,
        start_date: dateMap.get(c.id) ?? null,
        participants: participantMap.get(c.id) || [],
      }));
    }
  }

  // Nächster Kurs für Countdown
  const nextCourse = (courses || [])
    .filter((c) => c.start_date)
    .sort((a, b) => new Date(a.start_date as string | number).getTime() - new Date(b.start_date as string | number).getTime())[0];
  const nextStart = nextCourse?.start_date ? new Date(nextCourse.start_date) : null;
  const daysRemaining = nextStart ? Math.ceil((nextStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

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
