import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  `id, booking_code, booking_date, amount, status, student_id, course_id, course_date_id, partner_id,
   course_title, course_start, partner_name, student_name, student_email, vat_rate, price_net, deposit, saldo, duration_hours`;

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const email = user.email.toLowerCase();

  const q = service.from('bookings').select(SELECT);
  if (id) {
    q.eq('id', id).maybeSingle();
  } else {
    q.or(`student_email.eq.${email},student_id.eq.${user.id}`);
    q.order('booking_date', { ascending: false });
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // details include payments
  if (id && data) {
    const bid = (data as any).id;
    const { data: payments } = await service
      .from('payments')
      .select('id, payment_date, amount, method, note, created_at')
      .eq('booking_id', bid)
      .order('payment_date', { ascending: false });
    const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const amount = (data as any).amount ?? 0;
    (data as any).payments = payments ?? [];
    (data as any).paid_total = paid;
    (data as any).open_amount = Number((amount - paid).toFixed(2));
  }

  // list mode: nothing extra
  return NextResponse.json(data);
}
