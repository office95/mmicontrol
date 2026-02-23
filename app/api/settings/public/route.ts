import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await service
      .from('settings')
      .select('company_name, street, zip, city, phone, email, uid, tax_number, register_number')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ company: data || null });
  } catch (e: any) {
    return NextResponse.json({ company: null, error: e?.message }, { status: 400 });
  }
}
