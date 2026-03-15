'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import AuthCard from '@/components/auth-card';
import { useSupabase } from '@/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : undefined);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: baseUrl ? `${baseUrl.replace(/\/$/, '')}/login` : undefined,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // auch wenn data.user null ist (z.B. bei confirm_email), trotzdem fortfahren
      setLoading(false);
      // Info-Mail ans Office: neuer User wartet auf Freigabe
      try {
        await fetch('/api/notify-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fullName, email }),
        });
      } catch (err) {
        console.warn('notify pending failed', err);
      }
      router.push(`/pending?email=${encodeURIComponent(email)}` as any);
    } catch (err: any) {
      console.error('signup error', err);
      setError(err?.message || 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.');
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Registrieren" subtitle="Account anlegen, Admin schaltet dich frei">
      <form className="space-y-4" onSubmit={handleRegister}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Voller Name</label>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">E-Mail</label>
          <input
            type="email"
            autoComplete="new-email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Passwort</label>
          <input
            type="password"
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <p className="text-xs text-slate-500">
            Mindestens 8 Zeichen, Groß- und Kleinbuchstaben sowie Ziffern & Symbole verwenden.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="button-primary w-full" disabled={loading}>
          {loading ? 'Registriere...' : 'Registrieren'}
        </button>
      </form>
    </AuthCard>
  );
}
