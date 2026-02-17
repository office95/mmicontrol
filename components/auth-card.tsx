import Link from 'next/link';
import { ReactNode } from 'react';

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">LearnSpace</p>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600 mt-2">{subtitle}</p>}
        </div>
        {children}
        <div className="text-sm text-slate-600 flex items-center justify-between">
          <Link href="/" className="hover:text-brand-600">Zurück</Link>
          <Link href={title === 'Login' ? '/register' : '/login'} className="hover:text-brand-600">
            {title === 'Login' ? 'Account anlegen' : 'Schon ein Konto? Login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
