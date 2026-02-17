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

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
