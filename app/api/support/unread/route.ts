import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: session } = await supabase.auth.getUser();
  const user = session.user;
  if (!user) return NextResponse.json({ count: 0 });

  const { count, error } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .eq('status', 'open');

  if (error) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: count ?? 0 });
}
