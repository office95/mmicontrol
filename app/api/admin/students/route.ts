import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SELECT =
  'id, student_id, name, street, zip, city, country, state, company, vat_number, birthdate, phone, email, bank_name, iban, bic, status, is_problem, problem_note, created_at';

export async function GET() {
  const { data, error } = await service.from('students').select(SELECT).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 });
  const studentId = body.student_id || `STU-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
  const payload = {
    student_id: studentId,
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
  const { error } = await service.from('students').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
