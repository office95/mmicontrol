import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';

export async function POST(req: Request) {
  const { name, email } = await req.json().catch(() => ({ name: null, email: null }));
  if (!email) return NextResponse.json({ error: 'email erforderlich' }, { status: 400 });

  const safeName = (name || '').toString().trim() || 'Unbekannter Nutzer';
  const safeEmail = email.toString().trim();

  const text = [
    'Neuer Registrierungs-Request für Music Mission Control',
    '',
    `Name:  ${safeName}`,
    `E-Mail: ${safeEmail}`,
    '',
    'Bitte im Admin-Dashboard unter "Rollen & Rechte" oder "Offene Nutzer-Freigaben" prüfen und freischalten.',
  ].join('\n');

  const res = await sendMail({
    to: 'office@musicmission.at',
    subject: 'Neuer Member wartet auf Freigabe',
    text,
  });

  if (!res.ok && !(res as any).skipped) {
    return NextResponse.json({ error: 'Mailversand fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: res.ok, skipped: (res as any).skipped || false });
}

