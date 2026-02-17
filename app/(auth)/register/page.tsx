'use client';
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/pending');
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
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="button-primary w-full" disabled={loading}>
          {loading ? 'Registriere...' : 'Registrieren'}
        </button>
      </form>
    </AuthCard>
  );
}
