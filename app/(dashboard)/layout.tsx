import Link from 'next/link';
import { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getPermissions, ensureSlugs } from '@/lib/permissions';
import { createClient } from '@supabase/supabase-js';
import MobileNav from '@/components/mobile-nav';
import TopNav from '@/components/top-nav';

const PAGES = [
  'admin-dashboard',
  'admin-support',
  'admin-costs',
  'admin-finance',
  'teacher-dashboard',
  'student-dashboard',
  'teacher-materials',
  'courses',
  'materials',
  'admin-bookings',
  'course-dates',
  'admin-students',
  'admin-leads',
  'student-materials',
  'admin-partners',
  'quizzes',
  'integrations',
  'admin-settings',
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await service
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const { data: settings } = await service
    .from('settings')
    .select('logo_path')
    .limit(1)
    .maybeSingle();

  const logoUrl = settings?.logo_path
    ? settings.logo_path.startsWith('http')
      ? settings.logo_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL}/storage/v1/object/public/media/${settings.logo_path}`
    : null;

  const roleLabel = profile?.role || (user as any)?.user_metadata?.role || null;
  const isTeacher = roleLabel === 'teacher';
  const isStudent = roleLabel === 'student';

  // Neue Seiten-Slugs automatisch für RBAC registrieren
  await ensureSlugs([
    'admin-dashboard',
  'admin-support',
  'admin-partners',
  'admin-roles',
  'admin-benefits',
  'admin-costs',
    'admin-finance',
    'courses',
    'materials',
    'course-dates',
    'admin-students',
    'admin-bookings',
    'admin-leads',
    'admin-costs',
    'student-dashboard',
    'student-materials',
    'student-profile',
    'teacher-materials',
    'admin-settings',
  ]);
  // Student-Kursunterlagen standardmäßig erlauben
  await service
    .from('role_permissions')
    .upsert(
      [
        { role: 'student', page_slug: 'student-dashboard', allowed: true },
        { role: 'student', page_slug: 'student-materials', allowed: true },
        { role: 'student', page_slug: 'student-profile', allowed: true },
        { role: 'admin', page_slug: 'student-materials', allowed: true },
        { role: 'admin', page_slug: 'student-profile', allowed: true },
        { role: 'admin', page_slug: 'admin-leads', allowed: true },
        { role: 'admin', page_slug: 'admin-settings', allowed: true },
        { role: 'teacher', page_slug: 'teacher-materials', allowed: true },
      ],
      { onConflict: 'role,page_slug' }
    );

  const permissions = await getPermissions(roleLabel);

  // Offene Support-Tickets (Badge)
  let supportOpen = 0;
  if (roleLabel === 'admin') {
    const { count } = await service
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']);
    supportOpen = count ?? 0;
  }

  // Admin: fehlende Slugs automatisch freischalten
  if (roleLabel === 'admin' && PAGES.length) {
    await service.from('role_permissions').upsert(
      PAGES.map((slug) => ({ role: 'admin', page_slug: slug, allowed: true })),
      { onConflict: 'role,page_slug' }
    );
  }

  const links = [
    { href: '/admin', label: 'Dashboard', roles: ['admin'], slug: 'admin-dashboard', pin: 'top' },
    { href: '/admin/courses', label: 'Kurse', roles: ['admin'], slug: 'courses' },
    { href: '/admin/materials', label: 'Kursmaterial', roles: ['admin'], slug: 'materials' },
    { href: '/admin/course-dates', label: 'Kurstermine', roles: ['admin'], slug: 'course-dates' },
    { href: '/admin/benefits', label: 'Benefits', roles: ['admin'], slug: 'admin-benefits' },
    { href: '/admin/costs', label: 'Kosten', roles: ['admin'], slug: 'admin-costs' },
    { href: '/admin/finance', label: 'Finanzen', roles: ['admin'], slug: 'admin-finance' },
    { href: '/admin/support', label: 'Support', roles: ['admin'], slug: 'admin-support' },
    { href: '/admin/partners', label: 'Partner', roles: ['admin'], slug: 'admin-partners' },
    { href: '/admin/leads', label: 'Leads', roles: ['admin'], slug: 'admin-leads' },
    { href: '/admin/bookings', label: 'Buchungsübersicht', roles: ['admin'], slug: 'admin-bookings' },
    { href: '/admin/students', label: 'Kursteilnehmer', roles: ['admin'], slug: 'admin-students' },
    { href: '/admin/quizzes', label: 'Quiz Verwaltung', roles: ['admin'], slug: 'quizzes' },
    { href: '/teacher', label: 'Dozent', roles: ['teacher'], slug: 'teacher-dashboard' },
    { href: '/teacher/materials', label: 'Kursunterlagen', roles: ['teacher'], slug: 'teacher-materials' },
    { href: '/quizzes', label: 'Quiz', roles: ['teacher', 'student'], slug: 'quizzes' },
    { href: '/student', label: 'Dashboard', roles: ['student'], slug: 'student-dashboard' },
    { href: '/student?tab=bookings', label: 'Meine Buchungen', roles: ['student'], slug: 'student-dashboard' },
    { href: '/student?tab=materials', label: 'Kursunterlagen', roles: ['student'], slug: 'student-materials' },
    { href: '/student?tab=quiz', label: 'Quiz', roles: ['student'], slug: 'student-dashboard' },
    { href: '/student?tab=feedback', label: 'Kurs Bewertung', roles: ['student'], slug: 'student-dashboard' },
    { href: '/student?tab=support', label: 'Support', roles: ['student'], slug: 'student-dashboard' },
    { href: '/student?tab=profile', label: 'Profil', roles: ['student'], slug: 'student-profile' },
    { href: '/admin/roles', label: 'Rollen & Rechte', roles: ['admin'], slug: 'admin-roles', pin: 'bottom' },
    { href: '/admin/settings', label: 'Einstellungen', roles: ['admin'], slug: 'admin-settings', pin: 'bottom' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-pink-500 text-slate-50 text-[15px] md:text-[16px] leading-relaxed">
      {/* Top Header full width, dark to match sidebar */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="w-full px-[2vh] md:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo + Titel: auf Handy Logo ohne Text */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 sm:h-16 sm:w-16 text-slate-900 grid place-items-center font-semibold">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-sm font-semibold text-white/80">LOGO</span>
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200">Music Mission Control</p>
              <p className="text-lg font-semibold text-white">Music Mission Institute</p>
            </div>
          </div>
      <div className="flex items-center gap-3 sm:gap-4 text-xs text-white uppercase tracking-[0.18em]">
            <span className="hidden sm:inline text-[12px] font-semibold text-white/80">
              {profile?.full_name ?? ''}
            </span>
            <span className="hidden sm:inline">{roleLabel ? `Rolle: ${roleLabel}` : ''}</span>
            <form action="/auth/signout" method="post" className="order-last">
              <button className="rounded-full border border-white/40 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10">
                Logout
              </button>
            </form>
            {/* Hamburger fürs Handy rechts neben Logout */}
            <MobileNav
              links={(() => {
                if (!roleLabel) return [];
                const filtered =
                  roleLabel === 'student'
                    ? links.filter((l) => l.roles.includes('student'))
                    : links.filter((l) => l.roles.includes(roleLabel as string) && (permissions[l.slug] ?? false));
                const sorted = filtered.slice().sort((a, b) => {
                  if (a.slug === 'admin-dashboard') return -1;
                  if (b.slug === 'admin-dashboard') return 1;
                  return a.label.localeCompare(b.label, 'de');
                });
                return sorted.map((l) => ({
                  href: l.href,
                  label: l.label,
                  badge: l.slug === 'admin-support' ? supportOpen : undefined,
                }));
              })()}
            />
          </div>
        </div>
      </header>

      {/* Content area below header */}
      <div className="pt-28 pb-12 px-3 md:px-6">
        <div className="w-full flex gap-8">
          {!isTeacher && !isStudent && (
            <aside className="hidden md:flex fixed top-28 bottom-6 left-4 w-64 flex-col rounded-2xl border border-white/12 bg-slate-950/85 backdrop-blur-xl text-white shadow-2xl text-[15px]">
              <nav className="flex-1 px-4 py-6 space-y-2">
                {(roleLabel
                  ? (() => {
                      const allowed = links.filter((l) =>
                        l.roles.includes(roleLabel as string) &&
                        (roleLabel === 'student' || roleLabel === 'teacher' ? true : (permissions[l.slug] ?? false))
                      );
                      const top = allowed.filter((l) => l.pin === 'top'); // Dashboard fix oben
                      const bottom = allowed
                        .filter((l) => l.pin === 'bottom')
                        .sort((a, b) => a.label.localeCompare(b.label, 'de'));
                      const middle = allowed
                        .filter((l) => !l.pin)
                        .sort((a, b) => a.label.localeCompare(b.label, 'de'));
                      return [...top, ...middle, ...bottom];
                    })()
                  : links
                ).map((l) => (
                  'children' in l && Array.isArray((l as any).children) ? (
                    <div key={l.label} className="group relative">
                      <div className="block rounded-lg px-5 py-3 text-[15px] font-semibold text-white/90 bg-white/10 border border-white/15 hover:border-white/25 transition">
                        {l.label}
                      </div>
                      <div className="hidden group-hover:block absolute left-[calc(100%+6px)] top-0 z-40 min-w-[200px] rounded-xl border border-white/15 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
                        {(l as any).children.map((c: any) => (
                          <Link
                            key={c.href}
                            href={c.href as any}
                            className="block px-4 py-2.5 text-[15px] font-semibold text-white/90 hover:bg-white/15 transition border-b border-white/10 last:border-b-0"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={l.href}
                      href={l.href as any}
                      className="relative block rounded-lg px-5 py-3 text-[15px] font-semibold text-white/90 bg-white/10 border border-white/15 hover:bg-white/18 hover:border-white/25 transition"
                    >
                      {l.label}
                      {l.href === '/admin/support' && supportOpen > 0 && (
                        <span className="absolute -right-2 -top-2 h-6 min-w-[22px] px-1 rounded-full bg-rose-500 text-white text-[12px] font-semibold flex items-center justify-center">
                          {supportOpen}
                        </span>
                      )}
                    </Link>
                  )
                ))}
              </nav>
            </aside>
          )}

          <main
            className={`flex-1 w-full ${isTeacher || isStudent ? '' : 'md:pl-72'} space-y-10 text-[17px] md:text-[18px]`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
