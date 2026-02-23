import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function handle(request: Request) {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  // Immer auf die Login-Seite derselben Origin zurück
  return NextResponse.redirect(new URL('/login', origin));
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
