import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Auth-Seiten und statische Pfade überspringen, damit kein Redirect-Loop entsteht
  const PUBLIC_PATHS = ['/login', '/register', '/forgot', '/reset', '/pending'];
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return res;
  }

  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  );

  // Session sicherstellen
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Unangemeldet -> auf Login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Rolle laden (Policy erlaubt Self-Select)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();
  const role = profile?.role || session.user.user_metadata?.role || null;

  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  // Admin-Bereich strikt nur für admin
  if ((isAdminPath || isAdminApi) && role !== 'admin') {
    if (isAdminApi) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    // redirect je nach Rolle
    if (role === 'teacher') return NextResponse.redirect(new URL('/teacher', req.url));
    if (role === 'student') return NextResponse.redirect(new URL('/student', req.url));
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
