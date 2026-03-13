import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  'id, student_id, salutation, name, street, zip, city, country, state, company, vat_number, birthdate, phone, email, bank_name, iban, bic, status, is_problem, problem_note, created_at, archived_at';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showArchived = searchParams.get('show_archived') === 'true';
  const base = service.from('students').select(SELECT).order('created_at', { ascending: false });
  const { data, error } = showArchived ? await base : await base.is('archived_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Latest booking per student + saldo
  const studentIds = (data ?? []).map((s) => s.id);
  if (!studentIds.length) return NextResponse.json(data);

  const { data: bookings } = await service
    .from('bookings')
    .select('id, student_id, course_title, course_start, booking_date, partner_name, status, amount')
    .in('student_id', studentIds)
    .order('booking_date', { ascending: false });

  const bookingsByStudent = new Map<string, any[]>();
  (bookings ?? []).forEach((b) => {
    const list = bookingsByStudent.get(b.student_id) || [];
    list.push(b);
    bookingsByStudent.set(b.student_id, list);
  });

  const bookingIds = (bookings ?? []).map((b) => b.id);
  const { data: payments } = await service
    .from('payments')
    .select('booking_id, amount')
    .in('booking_id', bookingIds.length ? bookingIds : ['00000000-0000-0000-0000-000000000000']);
  const payMap = (payments ?? []).reduce<Record<string, number>>((acc, p: any) => {
    acc[p.booking_id] = (acc[p.booking_id] || 0) + Number(p.amount || 0);
    return acc;
  }, {});

  const enriched = (data ?? []).map((s) => {
    const list = (bookingsByStudent.get(s.id) || []).sort(
      (a, b) => new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime()
    );
    if (!list.length) return s;
    const withSums = list.map((b) => {
      const paid = payMap[b.id] || 0;
      const open = Number(((b.amount ?? 0) - paid).toFixed(2));
      return { ...b, paid_total: paid, open_amount: open };
    });
    return {
      ...s,
      latest_booking: withSums[0],
      bookings: withSums,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 });
    const studentId = body.student_id || `STU-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
    const payload = {
      student_id: studentId,
      salutation: body.salutation,
      name: body.name,
    street: body.street,
    zip: body.zip,
    city: body.city,
    country: body.country,
    state: body.state,
    company: body.company,
    vat_number: body.vat_number,
    birthdate: body.birthdate,
    phone: body.phone,
    email: body.email,
    bank_name: body.bank_name,
    iban: body.iban,
    bic: body.bic,
    status: body.status ?? 'active',
    is_problem: !!body.is_problem,
    problem_note: body.problem_note,
  };
  const { data, error } = await service.from('students').insert(payload).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  const updates = {
    student_id: body.student_id,
    salutation: body.salutation,
    name: body.name,
    street: body.street,
    zip: body.zip,
    city: body.city,
    country: body.country,
    state: body.state,
    company: body.company,
    vat_number: body.vat_number,
    birthdate: body.birthdate,
    phone: body.phone,
    email: body.email,
    bank_name: body.bank_name,
    iban: body.iban,
    bic: body.bic,
    status: body.status ?? 'active',
    is_problem: !!body.is_problem,
    problem_note: body.is_problem ? body.problem_note : null,
  };
  const { data, error } = await service.from('students').update(updates).eq('id', id).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
  // Soft-Archive statt Hard-Delete
  const { error } = await service.rpc('archive_student', { p_student_id: id, p_actor: null });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, archived: true });
}
