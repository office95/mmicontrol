'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSupabase } from '@/providers/supabase-provider';
import { useState } from 'react';

export default function PendingPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { supabase } = useSupabase();
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendMsg(null);
    setResendErr(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/login`,
      },
    });
    setResending(false);
    if (error) {
      setResendErr(error.message);
    } else {
      setResendMsg('E-Mail erneut versendet. Bitte Posteingang/Spam prüfen.');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-lg w-full p-8 space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-pink-500">Music Mission Control</p>
        <h1 className="text-2xl font-semibold text-ink">Fast fertig – bitte E-Mail bestätigen</h1>
        <div className="space-y-3 text-slate-600">
          <p>
            Wir haben dir soeben eine Bestätigungs-E-Mail {email ? `an ${email} ` : ''}gesendet. Bitte klicke auf den Link in der E-Mail, erst danach können wir deinen Zugang freischalten.
          </p>
          <ul className="text-sm space-y-1 text-slate-500">
            <li>· Prüfe auch Spam/Promo-Ordner.</li>
            <li>· Falls nichts ankommt: 1–2 Minuten warten und erneut versuchen.</li>
          </ul>
          {email && (
            <div className="space-y-2">
              <button
                className="button-primary w-full justify-center"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sende erneut…' : 'Bestätigungs-E-Mail erneut senden'}
              </button>
              {resendMsg && <p className="text-xs text-emerald-600">{resendMsg}</p>}
              {resendErr && <p className="text-xs text-red-600">{resendErr}</p>}
            </div>
          )}
        </div>
        <Link href="/login" className="button-primary w-full justify-center">Zurück zum Login</Link>
      </div>
    </main>
  );
}
