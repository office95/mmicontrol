'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import PartnerModal from '@/components/partner-modal';
import ButtonLink from '@/components/button-link';
import { renderStars } from '@/components/star-utils';
import StatusBadge from '@/components/status-badge';

type Partner = {
  id: string;
  status: 'active' | 'inactive' | 'lead';
  provider_id: string | null;
  name: string;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  contact_person: string | null;
  vat_number: string | null;
  tax_number: string | null;
  registry_number: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  contract: boolean | null;
  contract_date: string | null;
  provision1: number | null;
  provision2: number | null;
  provision3: number | null;
  provision4: number | null;
  provision5: number | null;
  provision6plus: number | null;
  rating_course: number | null;
  rating_teacher: number | null;
  rating_reliability: number | null;
  rating_engagement: number | null;
  rating_avg?: number | null;
  active_courses?: number;
};

import type { PartnerRow } from '@/components/partner-modal';

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  lead: 'Lead',
};

export default function PartnersPage() {
  const { supabase } = useSupabase();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/partners');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setPartners([]);
    } else {
      setPartners(data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = partners.filter((p) => {
    const statusOk = filterStatus === 'all' ? true : p.status === filterStatus;
    const term = search.trim().toLowerCase();
    const text = `${p.name ?? ''} ${p.city ?? ''} ${p.state ?? ''} ${p.country ?? ''}`.toLowerCase();
    const searchOk = term === '' ? true : text.includes(term);
    return statusOk && searchOk;
  });

  const toPartnerRow = (p: Partner): PartnerRow => ({
    ...p,
    status: p.status ?? 'active',
    country: (p.country === 'Deutschland' ? 'Deutschland' : 'Österreich') as 'Österreich' | 'Deutschland',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Partner</h1>
          <p className="text-sm text-slate-200">Übersicht und Anlage von Partnern.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25"
            onClick={() => {
              setEditPartner(null);
              setOpenModal(true);
            }}
          >
            Neuer Partner
          </button>
          <ButtonLink href="/admin">Zurück</ButtonLink>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input max-w-xs h-8 py-1 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Alle</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option value="lead">Lead</option>
        </select>
        <input
          className="input max-w-sm h-8 py-1 text-sm"
          placeholder="Suche nach Name oder Ort"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-6 shadow-xl text-slate-900 space-y-3">
        {loading && <p className="text-sm text-slate-500">Lade Partner...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !filtered.length && <p className="text-sm text-slate-500">Keine Partner vorhanden.</p>}
        <div className="divide-y divide-slate-200">
          {filtered.map((p) => (
            <div key={p.id} className="py-4 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setEditPartner(p);
                        setOpenModal(true);
                      }}
                      className="text-left text-lg font-bold text-ink hover:underline"
                    >
                      {p.name}
                    </button>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>{p.state ?? '—'} · {p.country ?? '—'}</span>
                    {p.active_courses !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                        ● Aktive Kurse: {p.active_courses}
                      </span>
                    )}
                    {p.rating_avg !== null && p.rating_avg !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 text-[11px]">
                        {renderStars(p.rating_avg)}
                        <span className="font-semibold">{p.rating_avg.toFixed(1)}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Angelegt am {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setEditPartner(p);
                      setOpenModal(true);
                    }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm('Diesen Partner wirklich löschen?')) return;
                      const res = await fetch(`/api/admin/partners?id=${p.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        load();
                      } else {
                        const d = await res.json().catch(() => ({}));
                        alert(d.error || 'Löschen fehlgeschlagen');
                      }
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openModal && (
        <PartnerModal
          partner={editPartner ? toPartnerRow(editPartner) : undefined}
          onSaved={load}
          onClose={() => {
            setOpenModal(false);
            setEditPartner(null);
            load();
          }}
        />
      )}
    </div>
  );
}
