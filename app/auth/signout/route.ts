import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  const fallback = new URL(request.url).origin;
  const base = process.env.NEXT_PUBLIC_APP_URL || fallback;
  return NextResponse.redirect(new URL('/login', base));
}
