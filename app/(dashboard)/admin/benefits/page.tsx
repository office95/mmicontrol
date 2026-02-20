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
  description?: string | null;
  discount_type: 'percent' | 'fixed' | 'perk' | null;
  discount_value: number | null;
  code: string | null;
  valid_from: string | null;
  valid_to: string | null;
  country: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  how_to_redeem?: string | null;
  members_card_required?: boolean | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<Benefit | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('benefit_companies')
      .select('id, name, status, target, action_title, description, discount_type, discount_value, code, valid_from, valid_to, country, logo_path, how_to_redeem, members_card_required, contact_name, phone, email, website, street, postal_code, city, state')
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

  const resetForm = () => {
    setCurrent(null);
    setLogoFile(null);
  };

  const openNew = () => {
    resetForm();
    setCurrent({
      id: '',
      name: '',
      status: 'active',
      target: 'both',
      action_title: '',
      description: '',
      discount_type: 'percent',
      discount_value: null,
      code: '',
      valid_from: null,
      valid_to: null,
      country: '',
      how_to_redeem: 'Members Card vorzeigen',
      members_card_required: true,
    });
    setModalOpen(true);
  };

  const openEdit = (b: Benefit) => {
    resetForm();
    setCurrent(b);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Benefit wirklich löschen?')) return;
    await supabase.from('benefit_companies').delete().eq('id', id);
    load();
  };

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    let payload: any = { ...current };
    // Leere Strings auf null setzen, um CHECK-Verletzungen zu vermeiden
    payload.country = (payload.country || '').trim() || null;
    payload.street = (payload.street || '').trim() || null;
    payload.postal_code = (payload.postal_code || '').trim() || null;
    payload.city = (payload.city || '').trim() || null;
    payload.state = (payload.state || '').trim() || null;
    payload.contact_name = (payload.contact_name || '').trim() || null;
    payload.phone = (payload.phone || '').trim() || null;
    payload.email = (payload.email || '').trim() || null;
    payload.website = (payload.website || '').trim() || null;
    payload.code = (payload.code || '').trim() || null;
    payload.action_title = (payload.action_title || '').trim() || null;
    payload.description = (payload.description || '').trim() || null;
    payload.how_to_redeem = (payload.how_to_redeem || '').trim() || null;
    if (!payload.id) {
      // kein UUID vorgeben -> DB Default gen_random_uuid() nutzen
      delete payload.id;
    }
    // Upload Logo falls Datei gewählt
    if (logoFile) {
      const ext = logoFile.name.split('.').pop() || 'png';
      const path = `logos/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('benefit-logos').upload(path, logoFile, {
        upsert: true,
        contentType: logoFile.type || undefined,
      });
      if (upErr) {
        alert('Upload fehlgeschlagen: ' + upErr.message);
        setSaving(false);
        return;
      }
      payload.logo_path = path;
    }
    // Insert / Update
    const { error: saveErr } = await supabase
      .from('benefit_companies')
      .upsert(payload, { onConflict: 'id' });
    if (saveErr) {
      alert('Speichern fehlgeschlagen: ' + saveErr.message);
    } else {
      setModalOpen(false);
      resetForm();
      load();
    }
    setSaving(false);
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
          onClick={(e) => { e.preventDefault(); openNew(); }}
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
                  <button
                    className="text-xs px-3 py-1 rounded-lg border border-white/30 text-white/80 hover:bg-white/10"
                    onClick={() => openEdit(b)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-lg border border-rose-300 text-rose-100 hover:bg-rose-500/20"
                    onClick={() => handleDelete(b.id)}
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        )}
      </div>

      {modalOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute -left-10 -top-16 h-48 w-48 bg-pink-100/60 rounded-full blur-3xl" />
            <div className="absolute -right-12 -bottom-20 h-56 w-56 bg-purple-100/60 rounded-full blur-3xl" />
            <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={() => { setModalOpen(false); resetForm(); }}>×</button>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-pink-500 font-semibold">
                    {current.id ? 'Benefit bearbeiten' : 'Neuen Benefit anlegen'}
                  </p>
                  <h3 className="text-2xl font-semibold text-ink">Firmen-Vorteil</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm space-y-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Benefit</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="space-y-1">
                      <span className="text-slate-600">Name*</span>
                      <input className="input" value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Vorteil / Titel</span>
                      <input className="input" value={current.action_title ?? ''} onChange={(e) => setCurrent({ ...current, action_title: e.target.value })} />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-slate-600">Beschreibung</span>
                      <textarea className="input h-24" value={current.description ?? ''} onChange={(e) => setCurrent({ ...current, description: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Rabattart</span>
                      <select className="input" value={current.discount_type ?? ''} onChange={(e) => setCurrent({ ...current, discount_type: e.target.value as any })}>
                        <option value="percent">Prozent</option>
                        <option value="fixed">Fixbetrag</option>
                        <option value="perk">Vorteil</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Wert</span>
                      <input className="input" type="number" value={current.discount_value ?? ''} onChange={(e) => setCurrent({ ...current, discount_value: e.target.value ? Number(e.target.value) : null })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Code (optional)</span>
                      <input className="input" value={current.code ?? ''} onChange={(e) => setCurrent({ ...current, code: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Zielgruppe</span>
                      <select className="input" value={current.target ?? 'both'} onChange={(e) => setCurrent({ ...current, target: e.target.value as any })}>
                        <option value="both">Beide</option>
                        <option value="teachers">Dozenten</option>
                        <option value="students">Studierende</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Status</span>
                      <select className="input" value={current.status} onChange={(e) => setCurrent({ ...current, status: e.target.value as any })}>
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                        <option value="archived">Archiv</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Gültig von</span>
                      <input className="input" type="date" value={current.valid_from ?? ''} onChange={(e) => setCurrent({ ...current, valid_from: e.target.value || null })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Gültig bis</span>
                      <input className="input" type="date" value={current.valid_to ?? ''} onChange={(e) => setCurrent({ ...current, valid_to: e.target.value || null })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Land</span>
                      <input className="input" value={current.country ?? ''} onChange={(e) => setCurrent({ ...current, country: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">How to redeem</span>
                      <input className="input" value={current.how_to_redeem ?? ''} onChange={(e) => setCurrent({ ...current, how_to_redeem: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Members Card Pflicht</span>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!current.members_card_required} onChange={(e) => setCurrent({ ...current, members_card_required: e.target.checked })} />
                        <span className="text-slate-600 text-sm">Ja</span>
                      </div>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Logo (optional)</span>
                      <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm space-y-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Firmendaten</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="space-y-1">
                      <span className="text-slate-600">Ansprechpartner</span>
                      <input className="input" value={current.contact_name ?? ''} onChange={(e) => setCurrent({ ...current, contact_name: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Telefon</span>
                      <input className="input" value={current.phone ?? ''} onChange={(e) => setCurrent({ ...current, phone: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">E-Mail</span>
                      <input className="input" type="email" value={current.email ?? ''} onChange={(e) => setCurrent({ ...current, email: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Website</span>
                      <input className="input" type="url" value={current.website ?? ''} onChange={(e) => setCurrent({ ...current, website: e.target.value })} />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-slate-600">Straße</span>
                      <input className="input" value={current.street ?? ''} onChange={(e) => setCurrent({ ...current, street: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">PLZ</span>
                      <input className="input" value={current.postal_code ?? ''} onChange={(e) => setCurrent({ ...current, postal_code: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Ort</span>
                      <input className="input" value={current.city ?? ''} onChange={(e) => setCurrent({ ...current, city: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600">Bundesland</span>
                      <input className="input" value={current.state ?? ''} onChange={(e) => setCurrent({ ...current, state: e.target.value })} />
                    </label>
                  </div>
                </section>
              </div>

              <div className="flex justify-end gap-2">
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100" onClick={() => { setModalOpen(false); resetForm(); }}>
                  Abbrechen
                </button>
                <button
                  className="rounded-lg bg-gradient-to-r from-pink-600 to-rose-500 text-white px-4 py-2 font-semibold hover:from-pink-500 hover:to-rose-400 disabled:opacity-60"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
