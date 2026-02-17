'use client';
import AuthCard from '@/components/auth-card';
import { useSupabase } from '@/providers/supabase-provider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setError('Link ungültig oder abgelaufen.');
    });
  }, [supabase]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Passwort aktualisiert. Bitte neu einloggen.');
      setTimeout(() => router.push('/login'), 1200);
    }
  }

  return (
    <AuthCard title="Neues Passwort" subtitle="Neues Passwort setzen und anmelden">
      <form className="space-y-4" onSubmit={handleReset}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Neues Passwort</label>
          <input
            type="password"
            minLength={8}
            className="input"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button type="submit" className="button-primary w-full">
          Passwort speichern
        </button>
      </form>
    </AuthCard>
  );
}
