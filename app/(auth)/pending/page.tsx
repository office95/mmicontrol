export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import Link from 'next/link';

export default function PendingPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const email = typeof searchParams?.email === 'string' ? searchParams.email : null;
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
        </div>
        <Link href="/login" className="button-primary w-full justify-center">Zurück zum Login</Link>
      </div>
    </main>
  );
}
