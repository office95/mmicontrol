import Link from 'next/link';

export default function PendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-lg w-full p-8 space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-600">LearnSpace</p>
        <h1 className="text-2xl font-semibold text-ink">Warten auf Freigabe</h1>
        <p className="text-slate-600">
          Dein Account wurde erstellt und wartet auf Admin-Approval. Du erhältst Zugriff, sobald du
          freigeschaltet bist.
        </p>
        <Link href="/login" className="button-primary w-full justify-center">Zurück zum Login</Link>
      </div>
    </main>
  );
}
