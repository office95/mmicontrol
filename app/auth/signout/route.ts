import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function handle(request: Request) {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  const base = envBase && !envBase.includes('localhost') ? envBase : origin;
  return NextResponse.redirect(new URL('/login', base));
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
