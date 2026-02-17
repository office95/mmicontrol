import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-xl w-full p-8 space-y-6 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-brand-600">Music Mission Institute</p>
        <h1 className="text-3xl font-semibold text-ink">LearnSpace</h1>
        <p className="text-slate-600">
          Zentraler Zugang für Admins, Dozenten und Teilnehmer. Melde dich an oder registriere dich,
          um freigeschaltet zu werden.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/login" className="button-primary">Login</Link>
          <Link href="/register" className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white">
            Registrieren
          </Link>
        </div>
      </div>
    </main>
  );
}
