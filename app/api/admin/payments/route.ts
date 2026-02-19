import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function recomputeBooking(bookingId: string) {
  const { data: booking } = await service
    .from('bookings')
    .select('id, amount, status')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return;
  const { data: payments } = await service
    .from('payments')
    .select('amount')
    .eq('booking_id', bookingId);
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const amount = Number(booking.amount || 0);
  const open = Number((amount - paid).toFixed(2));

  // Auto-Status-Logik
  let newStatus = booking.status;
  if (open <= 0) newStatus = 'abgeschlossen';
  else if (open < amount) {
    if (!['Zahlungserinnerung','1. Mahnung','2. Mahnung','Inkasso','Storno','Archiv'].includes(newStatus)) {
      newStatus = 'Anzahlung erhalten';
    }
  }

  await service
    .from('bookings')
    .update({ saldo: open, status: newStatus })
    .eq('id', bookingId);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  let q = service.from('payments').select('id, booking_id, payment_date, amount, method, note, created_at');
  if (bookingId) q = q.eq('booking_id', bookingId);
  q = q.order('payment_date', { ascending: false });
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { booking_id, payment_date, amount, method, note } = body;
  if (!booking_id) return NextResponse.json({ error: 'booking_id fehlt' }, { status: 400 });
  if (!amount) return NextResponse.json({ error: 'amount fehlt' }, { status: 400 });

  const payload = {
    booking_id,
    payment_date: payment_date || new Date().toISOString().slice(0, 10),
    amount: Number(amount),
    method: method || null,
    note: note || null,
  };
  const { data, error } = await service.from('payments').insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await recomputeBooking(booking_id);
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const { data: pay } = await service.from('payments').select('booking_id').eq('id', id).maybeSingle();
  const { error } = await service.from('payments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (pay?.booking_id) await recomputeBooking(pay.booking_id);
  return NextResponse.json({ ok: true });
}
