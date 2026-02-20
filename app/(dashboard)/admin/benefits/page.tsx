'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import Spinner from '@/components/spinner';

export type Benefit = {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';
  target: 'teachers' | 'students' | 'both' | null;
  action_title: string | null;
  discount_type: 'percent' | 'fixed' | 'perk' | null;
  discount_value: number | null;
  code: string | null;
  valid_from: string | null;
  valid_to: string | null;
  country: string | null;
};

const statusLabel: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  archived: 'Archiv',
};

const targetLabel: Record<string, string> = {
  teachers: 'Dozenten',
  students: 'Studierende',
  both: 'Beide',
};

export default function BenefitsPage() {
  const { supabase } = useSupabase();
  const [items, setItems] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('benefit_companies')
      .select('id, name, status, target, action_title, discount_type, discount_value, code, valid_from, valid_to, country')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setItems([]);
    } else {
      setItems((data || []) as Benefit[]);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const discountLabel = (b: Benefit) => {
    if (b.discount_type === 'percent') return `${b.discount_value ?? ''}%`;
    if (b.discount_type === 'fixed') return `${b.discount_value ?? ''} €`;
    if (b.discount_type === 'perk') return 'Vorteil';
    return '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Benefits</h1>
          <p className="text-sm text-slate-200">Firmen-Vorteile verwalten.</p>
        </div>
        <Link
          href="#"
          className="inline-flex items-center gap-2 rounded-lg bg-pink-600 text-white px-3 py-2 text-sm font-semibold hover:bg-pink-500"
        >
          Neuen Benefit anlegen
        </Link>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl p-4 text-white shadow-lg">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/80"><Spinner /> Lädt...</div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!loading && !error && !items.length && (
          <p className="text-white/80">Noch keine Benefits angelegt.</p>
        )}

        {!loading && !error && !!items.length && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-white/90">
              <thead className="text-xs uppercase tracking-[0.14em] text-white/60">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Zielgruppe</th>
                  <th className="px-3 py-2 text-left">Vorteil</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Gültig bis</th>
                  <th className="px-3 py-2 text-left">Land</th>
                  <th className="px-3 py-2 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5">
                    <td className="px-3 py-2 font-semibold text-white">{b.name}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-flex items-center px-2 py-1 rounded-full border border-white/20 bg-white/10 text-white/80">
                        {statusLabel[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/80">{targetLabel[b.target ?? 'both'] ?? 'Beide'}</td>
                    <td className="px-3 py-2 text-pink-200 font-semibold">{discountLabel(b)}</td>
                    <td className="px-3 py-2 text-white/70">{b.code || '—'}</td>
                    <td className="px-3 py-2 text-white/70">{b.valid_to ? new Date(b.valid_to).toLocaleDateString() : 'offen'}</td>
                    <td className="px-3 py-2 text-white/70">{b.country || '—'}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button className="text-xs px-3 py-1 rounded-lg border border-white/30 text-white/80 hover:bg-white/10">Bearbeiten</button>
                      <button className="text-xs px-3 py-1 rounded-lg border border-rose-300 text-rose-100 hover:bg-rose-500/20">Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
