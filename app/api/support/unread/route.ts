import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: session } = await supabase.auth.getUser();
  const user = session.user;
  if (!user) return NextResponse.json({ count: 0 });

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, status')
    .eq('created_by', user.id)
    .neq('status', 'closed');
  if (error || !tickets || tickets.length === 0) return NextResponse.json({ count: 0 });

  const ids = tickets.map((t) => t.id);
  const { data: msgs } = await supabase
    .from('support_messages')
    .select('ticket_id, author_id, created_at')
    .in('ticket_id', ids)
    .order('created_at', { ascending: false });

  const lastMap = new Map<string, any>();
  (msgs || []).forEach((m) => {
    if (!lastMap.has(m.ticket_id)) lastMap.set(m.ticket_id, m);
  });

  const unread = tickets.filter((t) => {
    const last = lastMap.get(t.id);
    if (!last) return false;
    return last.author_id !== user.id;
  }).length;

  return NextResponse.json({ count: unread });
}
