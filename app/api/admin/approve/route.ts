import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Service-Client mit Service-Key (server-side only) – umgeht Session-Probleme
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id, role = 'student', approved = true } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!['admin', 'teacher', 'student'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ approved, role })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mail an den Benutzer schicken
  try {
    const user = await supabase.auth.admin.getUserById(id);
    const email = user.data?.user?.email;
    const name = (user.data?.user?.user_metadata as any)?.full_name || 'Music Mission Nutzer';
    if (email) {
      const statusTxt = approved ? 'wurde freigeschaltet.' : 'ist noch nicht freigeschaltet.';
      await sendMail({
        to: email,
        subject: 'Dein Music Mission Dashboard Zugriff',
        text: [
          `Hallo ${name},`,
          '',
          `deine Rolle wurde auf "${role}" gesetzt und dein Account ${statusTxt}`,
          'Du kannst dich unter https://musicmissioncontrol.com anmelden.',
          '',
          'Liebe Grüße',
          'Music Mission Team'
        ].join('\\n'),
      });
    }
  } catch (e) {
    console.warn('approve mail failed', e);
  }

  return NextResponse.json({ ok: true });
}
