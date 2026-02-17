'use client';
import AuthCard from '@/components/auth-card';
import { useSupabase } from '@/providers/supabase-provider';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Route liegt bei /reset (ohne /auth), daher Redirect entsprechend setzen
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Reset-E-Mail gesendet. Bitte Posteingang prüfen.');
    }
  }

  return (
    <AuthCard title="Passwort vergessen" subtitle="Link zum Zurücksetzen per E-Mail senden">
      <form className="space-y-4" onSubmit={handleSend}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">E-Mail</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button type="submit" className="button-primary w-full" disabled={loading}>
          {loading ? 'Sende...' : 'Reset-Link schicken'}
        </button>
      </form>
    </AuthCard>
  );
}
