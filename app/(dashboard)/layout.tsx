import Link from 'next/link';
import { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getPermissions, ensureSlugs } from '@/lib/permissions';
import { createClient } from '@supabase/supabase-js';

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

  // Neue Seiten-Slugs automatisch für RBAC registrieren
  await ensureSlugs([
    'admin-partners',
    'admin-roles',
    'course-dates',
    'admin-students',
    'admin-bookings',
    'admin-leads',
    'student-materials',
    'admin-settings',
  ]);
  // Student-Kursunterlagen standardmäßig erlauben
  await service
    .from('role_permissions')
    .upsert(
      [
        { role: 'student', page_slug: 'student-materials', allowed: true },
        { role: 'admin', page_slug: 'student-materials', allowed: true },
        { role: 'admin', page_slug: 'admin-leads', allowed: true },
        { role: 'admin', page_slug: 'admin-settings', allowed: true },
      ],
      { onConflict: 'role,page_slug' }
    );

  const permissions = await getPermissions(roleLabel);

  const links = [
    { href: '/admin', label: 'Dashboard', roles: ['admin'], slug: 'admin-dashboard', pin: 'top' },
    { href: '/admin/course-dates', label: 'Kurstermine', roles: ['admin'], slug: 'course-dates' },
    { href: '/admin/courses', label: 'Kurse verwalten', roles: ['admin'], slug: 'courses' },
    { href: '/admin/materials', label: 'Kursmaterial', roles: ['admin'], slug: 'materials' },
    { href: '/admin/partners', label: 'Partner', roles: ['admin'], slug: 'admin-partners' },
    { href: '/admin/leads', label: 'Leads', roles: ['admin'], slug: 'admin-leads' },
    { href: '/admin/bookings', label: 'Buchungsübersicht', roles: ['admin'], slug: 'admin-bookings' },
    { href: '/admin/students', label: 'Kursteilnehmer', roles: ['admin'], slug: 'admin-students' },
    { href: '/teacher', label: 'Dozent', roles: ['teacher'], slug: 'teacher-dashboard' },
    { href: '/student', label: 'Dashboard', roles: ['student'], slug: 'student-dashboard' },
    { href: '/student/materials', label: 'Kursunterlagen', roles: ['student'], slug: 'student-materials' },
    { href: '/admin/roles', label: 'Rollen & Rechte', roles: ['admin'], slug: 'admin-roles', pin: 'bottom' },
    { href: '/admin/settings', label: 'Einstellungen', roles: ['admin'], slug: 'admin-settings', pin: 'bottom' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-pink-500 text-slate-50 text-[16px] md:text-[17px]">
      {/* Top Header full width, dark to match sidebar */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="w-full px-[2vh] md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 text-slate-900 grid place-items-center font-semibold">
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
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200">Music Mission Control</p>
              <p className="text-lg font-semibold text-white">Music Mission Institute</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white uppercase tracking-[0.18em]">
            {roleLabel ? `Rolle: ${roleLabel}` : ''}
          </div>
        </div>
      </header>

      {/* Content area below header */}
      <div className="pt-28 pb-12 px-3 md:px-6">
        <div className="max-w-screen-2xl w-full mx-auto flex gap-8">
          {/* Sidebar fixed on the very left with gradient black->pink and rounded edges, slightly below header */}
          <aside className="hidden md:flex fixed top-28 bottom-6 left-4 w-64 flex-col rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white shadow-2xl">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
              <div className="h-10 w-10 rounded-lg bg-white/20 text-white grid place-items-center font-semibold">LS</div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/80">Navigation</p>
                <p className="text-sm font-semibold text-white">{profile?.full_name || 'Willkommen'}</p>
                {roleLabel && (
                  <p className="text-[11px] text-white/70 uppercase tracking-[0.12em]">
                    Rolle: {roleLabel}
                  </p>
                )}
              </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {(roleLabel
                ? (() => {
                    const allowed = links.filter(
                      (l) => l.roles.includes(roleLabel as string) && (permissions[l.slug] ?? false)
                    );
                    const top = allowed.filter((l) => l.pin === 'top');
                    const bottom = allowed.filter((l) => l.pin === 'bottom');
                    const middle = allowed
                      .filter((l) => !l.pin)
                      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
                    return [...top, ...middle, ...bottom];
                  })()
                : links
              ).map((l) => (
                <Link
                  key={l.href}
                  href={l.href as any}
                  className="block rounded-lg px-5 py-3.5 text-[15px] md:text-[16px] font-semibold text-white/90 bg-white/12 border border-white/20 hover:bg-white/20 transition"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 pb-6">
              <form action="/auth/signout" method="post">
                <button className="w-full rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                  Logout
                </button>
              </form>
            </div>
          </aside>

          {/* Main content card container with left padding to not overlap sidebar */}
          <main className="flex-1 w-full md:pl-72 space-y-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
