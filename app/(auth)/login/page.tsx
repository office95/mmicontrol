'use client';
import AuthCard from '@/components/auth-card';
import { useSupabase } from '@/providers/supabase-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <AuthCard title="Login" subtitle="Mit E-Mail & Passwort anmelden">
      <form className="space-y-4" onSubmit={handleLogin}>
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
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="button-primary w-full" disabled={loading}>
          {loading ? 'Anmelden...' : 'Login'}
        </button>
        <div className="flex justify-end">
          <Link href="/forgot" className="text-sm text-pink-600 hover:underline">
            Passwort vergessen?
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
