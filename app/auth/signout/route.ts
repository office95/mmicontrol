import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  // Produktions-Login-URL bevorzugen, aber nie auf localhost zurückfallen
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  const base = envBase && !envBase.includes('localhost') ? envBase : origin;
  return NextResponse.redirect(new URL('/login', base));
}
