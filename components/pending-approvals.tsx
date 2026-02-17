'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/providers/supabase-provider';

interface PendingUser {
  id: string;
  full_name: string | null;
  created_at?: string | null;
  admin_id?: string;
}

export default function PendingApprovals({ users }: { users: PendingUser[] }) {
  const [items, setItems] = useState(users);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { supabase } = useSupabase();

  async function handleApprove(id: string, role: 'admin' | 'teacher' | 'student') {
    setLoadingId(id);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const adminId = sessionData.session?.user.id;

    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ id, role, approved: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Fehler beim Freischalten');
    } else {
      setItems((prev) => prev.filter((u) => u.id !== id));
      router.refresh(); // Server-Daten neu laden
    }
    setLoadingId(null);
  }

  if (!items.length) return <p className="text-sm text-slate-500">Keine offenen Freigaben.</p>;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((u) => (
        <div key={u.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm text-slate-700">
          <div>
            <p className="font-medium">{u.full_name || 'Unbekannt'}</p>
            <p className="text-slate-500 text-xs">
              Registriert am: {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['student', 'teacher', 'admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleApprove(u.id, role)}
                disabled={loadingId === u.id}
                className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:border-brand-500 hover:text-brand-600 transition"
              >
                {loadingId === u.id ? '...' : `Freischalten: ${role}`}
              </button>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
