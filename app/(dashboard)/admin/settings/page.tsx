'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const defaultOpening = days.map((d) => ({ day: d, enabled: d !== 'Sa' && d !== 'So', from: '09:00', to: '17:00' }));

type Contact = { name: string; role: string; phone: string; email: string };
type Company = {
  company_name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  uid: string;
  tax_number: string;
  register_number: string;
  bank_name: string;
  iban: string;
  bic: string;
  logo_path?: string | null;
};

export default function SettingsPage() {
  const [tab, setTab] = useState<'company' | 'bank' | 'tax' | 'legal' | 'media'>('company');
  const [contacts, setContacts] = useState<Contact[]>([{ name: '', role: '', phone: '', email: '' }]);
  const [taxContacts, setTaxContacts] = useState<Contact[]>([{ name: '', role: '', phone: '', email: '' }]);
  const [opening, setOpening] = useState(defaultOpening);
  const [company, setCompany] = useState<Company>({
    company_name: '',
    street: '',
    zip: '',
    city: '',
    phone: '',
    email: '',
    uid: '',
    tax_number: '',
    register_number: '',
    bank_name: '',
    iban: '',
    bic: '',
    logo_path: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const mediaUrl = (path?: string | null) =>
    path
      ? path.startsWith('http')
        ? path
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`
      : null;

  const addContact = () => setContacts((p) => [...p, { name: '', role: '', phone: '', email: '' }]);
  const updateContact = (idx: number, field: keyof Contact, value: string) =>
    setContacts((p) => p.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const addTaxContact = () => setTaxContacts((p) => [...p, { name: '', role: '', phone: '', email: '' }]);
  const updateTaxContact = (idx: number, field: keyof Contact, value: string) =>
    setTaxContacts((p) => p.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      if (data?.settings) {
        setCompany({
          company_name: data.settings.company_name || '',
          street: data.settings.street || '',
          zip: data.settings.zip || '',
          city: data.settings.city || '',
          phone: data.settings.phone || '',
          email: data.settings.email || '',
          uid: data.settings.uid || '',
          tax_number: data.settings.tax_number || '',
          register_number: data.settings.register_number || '',
          bank_name: data.settings.bank_name || '',
          iban: data.settings.iban || '',
          bic: data.settings.bic || '',
          logo_path: data.settings.logo_path || null,
        });
      }
      setContacts(data?.contacts ?? [{ name: '', role: '', phone: '', email: '' }]);
      setTaxContacts(data?.taxContacts ?? [{ name: '', role: '', phone: '', email: '' }]);
      const nextHours = (data?.officeHours ?? []).map((o: any) => ({
        day: o.weekday || o.day,
        enabled: !!o.enabled,
        from: o.time_from || o.from || '09:00',
        to: o.time_to || o.to || '17:00',
      }));
      setOpening(nextHours.length ? nextHours : defaultOpening);
    }
    setLoading(false);
  };

  const save = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: company,
        contacts,
        taxContacts,
        officeHours: opening.map((o) => ({ weekday: o.day, enabled: o.enabled, time_from: o.from, time_to: o.to })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage('Gespeichert');
      await load();
    } else {
      setMessage(data.error || 'Fehler beim Speichern');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Einstellungen</h1>
        <p className="text-sm text-slate-200">Unternehmensdaten, Banken, Medien & Recht verwalten.</p>
      </div>

      <div className="flex gap-4 text-sm font-semibold text-slate-200 border-b border-white/10">
        <TabButton label="Unternehmensdaten" active={tab === 'company'} onClick={() => setTab('company')} />
        <TabButton label="Bank" active={tab === 'bank'} onClick={() => setTab('bank')} />
        <TabButton label="Steuerberater" active={tab === 'tax'} onClick={() => setTab('tax')} />
        <TabButton label="Recht" active={tab === 'legal'} onClick={() => setTab('legal')} />
        <TabButton label="Medien" active={tab === 'media'} onClick={() => setTab('media')} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
        {message && <p className="text-sm text-slate-200">{message}</p>}
      </div>

      {tab === 'company' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-6">
          <Section title="Firma">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Firma" value={company.company_name} onChange={(v) => setCompany({ ...company, company_name: v })} placeholder="Music Mission Institute" />
              <Input label="Telefon" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} placeholder="+43 ..." />
              <Input label="Email" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} placeholder="office@..." />
              <Input label="Straße" value={company.street} onChange={(v) => setCompany({ ...company, street: v })} placeholder="Straße 1" />
              <Input label="PLZ" value={company.zip} onChange={(v) => setCompany({ ...company, zip: v })} placeholder="9020" />
              <Input label="Ort" value={company.city} onChange={(v) => setCompany({ ...company, city: v })} placeholder="Klagenfurt" />
            </div>
          </Section>

          <Section title="Ansprechpartner">
            <div className="space-y-4">
              {contacts.map((c, idx) => (
                <div key={idx} className="grid md:grid-cols-4 gap-3 relative">
                  <Input label="Name" value={c.name} onChange={(v) => updateContact(idx, 'name', v)} />
                  <Input label="Funktion" value={c.role} onChange={(v) => updateContact(idx, 'role', v)} />
                  <Input label="Telefon" value={c.phone} onChange={(v) => updateContact(idx, 'phone', v)} />
                  <Input label="Email" value={c.email} onChange={(v) => updateContact(idx, 'email', v)} />
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      className="absolute -right-2 -top-3 text-xs text-red-600 hover:underline"
                      onClick={() => setContacts((p) => p.filter((_, i) => i !== idx))}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              ))}
              <button className="text-sm text-pink-600" onClick={addContact}>
                + Ansprechpartner hinzufügen
              </button>
            </div>
          </Section>

          <Section title="Logo">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden grid place-items-center">
                {mediaUrl(company.logo_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(company.logo_path)!} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-500">kein Logo</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="input"
                  disabled={logoUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLogoUploading(true);
                    setMessage(null);
                    const ext = file.name.split('.').pop() || 'png';
                    const path = `logos/${Date.now()}.${ext}`;
                    const { error: upErr } = await supabase.storage.from('media').upload(path, file, { upsert: true });
                    if (upErr) {
                      setMessage(upErr.message);
                    } else {
                      setCompany((c) => ({ ...c, logo_path: path }));
                      setMessage('Logo hochgeladen. Speichern nicht vergessen.');
                    }
                    setLogoUploading(false);
                  }}
                />
                <p className="text-xs text-slate-500">
                  PNG oder JPG, ideal 512x512px. Upload speichert ins Bucket „media“.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Firmendaten">
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="UID" value={company.uid} onChange={(v) => setCompany({ ...company, uid: v })} placeholder="ATU..." />
              <Input label="Steuernummer" value={company.tax_number} onChange={(v) => setCompany({ ...company, tax_number: v })} placeholder="123/4567" />
              <Input label="Firmenbuchnummer" value={company.register_number} onChange={(v) => setCompany({ ...company, register_number: v })} placeholder="FN ..." />
            </div>
          </Section>

          <Section title="Bürozeiten">
            <div className="space-y-3">
              {opening.map((o, idx) => (
                <div key={o.day} className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 w-14">
                    <input
                      type="checkbox"
                      checked={o.enabled}
                      onChange={(e) =>
                        setOpening((p) => p.map((d, i) => (i === idx ? { ...d, enabled: e.target.checked } : d)))
                      }
                    />
                    <span>{o.day}</span>
                  </label>
                  <input
                    type="time"
                    className="input w-32"
                    value={o.from}
                    onChange={(e) => setOpening((p) => p.map((d, i) => (i === idx ? { ...d, from: e.target.value } : d)))}
                    disabled={!o.enabled}
                  />
                  <span className="text-slate-500">bis</span>
                  <input
                    type="time"
                    className="input w-32"
                    value={o.to}
                    onChange={(e) => setOpening((p) => p.map((d, i) => (i === idx ? { ...d, to: e.target.value } : d)))}
                    disabled={!o.enabled}
                  />
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === 'bank' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-6">
          <Section title="Bank">
            <div className="grid md:grid-cols-3 gap-4">
              <Input label="Bank" value={company.bank_name} onChange={(v) => setCompany({ ...company, bank_name: v })} placeholder="Meine Bank" />
              <Input label="IBAN" value={company.iban} onChange={(v) => setCompany({ ...company, iban: v })} placeholder="AT.." />
              <Input label="BIC" value={company.bic} onChange={(v) => setCompany({ ...company, bic: v })} placeholder="XXXXXX" />
            </div>
          </Section>
        </div>
      )}

      {tab === 'tax' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-6">
          <Section title="Steuerberater">
            <Input label="Name" placeholder="Kanzlei" />
            <div className="space-y-4 mt-4">
              {taxContacts.map((c, idx) => (
                <div key={idx} className="grid md:grid-cols-4 gap-3 relative">
                  <Input label="Ansprechpartner" value={c.name} onChange={(v) => updateTaxContact(idx, 'name', v)} />
                  <Input label="Funktion" value={c.role} onChange={(v) => updateTaxContact(idx, 'role', v)} />
                  <Input label="Telefon" value={c.phone} onChange={(v) => updateTaxContact(idx, 'phone', v)} />
                  <Input label="Email" value={c.email} onChange={(v) => updateTaxContact(idx, 'email', v)} />
                  {taxContacts.length > 1 && (
                    <button
                      type="button"
                      className="absolute -right-2 -top-3 text-xs text-red-600 hover:underline"
                      onClick={() => setTaxContacts((p) => p.filter((_, i) => i !== idx))}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              ))}
              <button className="text-sm text-pink-600" onClick={addTaxContact}>
                + Ansprechpartner hinzufügen
              </button>
            </div>
          </Section>
        </div>
      )}

      {tab === 'legal' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-6">
          <Section title="Rechtliche Dokumente">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-ink mb-1">AGB</p>
                <input type="file" accept="application/pdf" className="input" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-1">DSGVO</p>
                <input type="file" accept="application/pdf" className="input" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink mb-1">Weitere Dokumente</p>
                <input type="file" accept="application/pdf" className="input" multiple />
                <p className="text-xs text-slate-500 mt-1">Zusätzliche PDFs (Verträge etc.)</p>
              </div>
            </div>
          </Section>
        </div>
      )}

      {tab === 'media' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-6">
          <Section title="Medien">
            <input type="file" accept="application/pdf,image/png,image/jpeg" className="input" multiple />
            <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG hochladen und verwalten (Speicherung folgt).</p>
          </Section>
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`pb-2 ${active ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value?: string; onChange?: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm text-slate-700">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <input
        className="input mt-1"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}
