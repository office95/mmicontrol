'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';

type PartnerStatus = 'active' | 'inactive' | 'lead' | 'archived';

type ContactPerson = { name: string; email: string; phone: string };

export type PartnerRow = {
  id: string;
  status: PartnerStatus;
  provider_id: string | null;
  name: string;
  created_at?: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: 'Österreich' | 'Deutschland' | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  contact_person: string | null;
  contact_people?: ContactPerson[] | null;
  vat_number: string | null;
  tax_number: string | null;
  registry_number: string | null;
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
  logo_path?: string | null;
  hero1_path?: string | null;
  hero2_path?: string | null;
  gallery_paths?: string[] | null;
  teacher_name?: string | null;
  teacher_image_path?: string | null;
  teacher_description?: string | null;
  teacher_profiles?: { name: string; image_path?: string | null; description?: string | null }[] | null;
  website_slogan?: string | null;
  website_description?: string | null;
  website_tags?: string[] | null;
};

const COUNTRIES = ['Österreich', 'Deutschland'] as const;
const STATES_AT = ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'];
const STATES_DE = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

export default function PartnerModal({
  onClose,
  partner,
  onSaved,
}: {
  onClose: () => void;
  partner?: PartnerRow | null;
  onSaved?: () => void;
}) {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<PartnerStatus>('active');
  const [country, setCountry] = useState<'Österreich' | 'Deutschland'>('Österreich');
  const [state, setState] = useState<string>('');
  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bank, setBank] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [contact, setContact] = useState('');
  const [contactPeople, setContactPeople] = useState<ContactPerson[]>([]);
  const [uid, setUid] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [registry, setRegistry] = useState('');
  const [contract, setContract] = useState(false);
  const [contractDate, setContractDate] = useState('');
  const [provision1, setProvision1] = useState('');
  const [provision2, setProvision2] = useState('');
  const [provision3, setProvision3] = useState('');
  const [provision4, setProvision4] = useState('');
  const [provision5, setProvision5] = useState('');
  const [provision6plus, setProvision6plus] = useState('');
  const [ratingCourse, setRatingCourse] = useState('0');
  const [ratingTeacher, setRatingTeacher] = useState('0');
  const [ratingReliability, setRatingReliability] = useState('0');
  const [ratingEngagement, setRatingEngagement] = useState('0');

  const [activeTab, setActiveTab] = useState<'details' | 'vertrag' | 'bank' | 'rating'>('details');
  const [bookings, setBookings] = useState<
    { id: string; booking_date: string | null; course_title: string | null; course_start: string | null; student_name: string | null; status: string; amount: number | null }[]
  >([]);
  const [showPastBookings, setShowPastBookings] = useState(false);

  const stateOptions = useMemo(() => (country === 'Österreich' ? STATES_AT : STATES_DE), [country]);

  const ratingValue = (val: string) => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
  };

  const avgRating = useMemo(() => {
    const vals = [
      ratingValue(ratingCourse),
      ratingValue(ratingTeacher),
      ratingValue(ratingReliability),
      ratingValue(ratingEngagement),
    ];
    const sum = vals.reduce((a, b) => a + b, 0);
    return vals.length ? sum / vals.length : 0;
  }, [ratingCourse, ratingTeacher, ratingReliability, ratingEngagement]);

  const ratingLabel = (val: number) => {
    if (val >= 4.5) return 'Hervorragend';
    if (val >= 4.0) return 'Sehr gut';
    if (val >= 3.0) return 'Gut';
    if (val >= 2.0) return 'Mittel';
    if (val > 0) return 'Schwach';
    return 'Keine Bewertung';
  };

  const partnerId = partner?.id;

  useEffect(() => {
    if (!partner) return;
    const contacts = Array.isArray(partner.contact_people) ? (partner.contact_people as ContactPerson[]) : [];
    const primary = contacts[0];
    setStatus(partner.status ?? 'active');
    setCountry((partner.country as any) ?? 'Österreich');
    setState(partner.state ?? '');
    setName(partner.name ?? '');
    setProviderId(partner.provider_id ?? '');
    setStreet(partner.street ?? '');
    setZip(partner.zip ?? '');
    setCity(partner.city ?? '');
    setPhone(partner.phone ?? primary?.phone ?? '');
    setEmail(partner.email ?? primary?.email ?? '');
    setBank(partner.bank_name ?? '');
    setIban(partner.iban ?? '');
    setBic(partner.bic ?? '');
    setContact(partner.contact_person ?? primary?.name ?? '');
    setContactPeople(contacts);
    setUid(partner.vat_number ?? '');
    setTaxNumber(partner.tax_number ?? '');
    setRegistry(partner.registry_number ?? '');
    setContract(!!partner.contract);
    setContractDate(partner.contract_date ?? '');
    setProvision1(partner.provision1?.toString() ?? '');
    setProvision2(partner.provision2?.toString() ?? '');
    setProvision3(partner.provision3?.toString() ?? '');
    setProvision4(partner.provision4?.toString() ?? '');
    setProvision5(partner.provision5?.toString() ?? '');
    setProvision6plus(partner.provision6plus?.toString() ?? '');
    setRatingCourse(partner.rating_course?.toString() ?? '0');
    setRatingTeacher(partner.rating_teacher?.toString() ?? '0');
    setRatingReliability(partner.rating_reliability?.toString() ?? '0');
    setRatingEngagement(partner.rating_engagement?.toString() ?? '0');
  }, [partner]);

  useEffect(() => {
    async function loadBookings() {
      if (!partner?.id) return;
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_date, course_title, course_start, student_name, status, amount')
        .eq('partner_id', partner.id)
        .order('booking_date', { ascending: false });
      setBookings(data || []);
    }
    if (partner?.id) loadBookings();
  }, [partner, supabase]);

  const filteredBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start des heutigen Tages

    return bookings.filter((b) => {
      if (showPastBookings) return true;
      const dateStr = b.course_start || b.booking_date;
      if (!dateStr) return false; // Ohne Datum ausblenden, kann per Toggle eingeblendet werden
      const d = new Date(dateStr);
      return d >= today;
    });
  }, [bookings, showPastBookings]);

  const addContactPerson = () => {
    setContactPeople((prev) => [...prev, { name: '', email: '', phone: '' }]);
  };

  const updateContactPerson = (idx: number, field: keyof ContactPerson, value: string) => {
    setContactPeople((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const removeContactPerson = (idx: number) => {
    setContactPeople((prev) => prev.filter((_, i) => i !== idx));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const contacts = contactPeople
      .map((c) => ({
        name: c.name.trim(),
        email: c.email.trim(),
        phone: c.phone.trim(),
      }))
      .filter((c) => c.name || c.email || c.phone);
    const primary = contacts[0];
    const res = await fetch('/api/admin/partners', {
      method: partner ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: partner?.id,
        status,
        provider_id: partner ? providerId || partner.provider_id : providerId || null,
        name,
        street: street || null,
        zip: zip || null,
        city: city || null,
        country,
        state: state || null,
        phone: phone || primary?.phone || null,
        email: email || primary?.email || null,
        bank_name: bank || null,
        iban: iban || null,
        bic: bic || null,
        contact_person: contact || primary?.name || null,
        contact_people: contacts,
        vat_number: uid || null,
        tax_number: taxNumber || null,
        registry_number: registry || null,
        contract: contract,
        contract_date: contractDate || null,
        provision1: provision1 ? Number(provision1) : null,
        provision2: provision2 ? Number(provision2) : null,
        provision3: provision3 ? Number(provision3) : null,
        provision4: provision4 ? Number(provision4) : null,
        provision5: provision5 ? Number(provision5) : null,
        provision6plus: provision6plus ? Number(provision6plus) : null,
        rating_course: Number(ratingCourse) || 0,
        rating_teacher: Number(ratingTeacher) || 0,
        rating_reliability: Number(ratingReliability) || 0,
        rating_engagement: Number(ratingEngagement) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Speichern fehlgeschlagen');
    } else {
      onSaved?.();
      onClose();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-5xl h-[85vh] p-8 relative overflow-y-auto text-slate-900 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
          ✕
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-pink-500">Partner</p>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-ink">{partner ? (partner as any).name ?? 'Partner' : 'Neuen Partner anlegen'}</h2>
                <div className="flex items-center gap-2 text-pink-500">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-lg">
                        {i < Math.round(avgRating) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{ratingLabel(avgRating)}</span>
                </div>
                {partner?.created_at && (
                  <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                    Seit {new Date(partner.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">
              Abbrechen
            </button>
            <button type="submit" form="partner-form" className="button-primary shadow-sm" disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="border-b border-slate-200 flex gap-4 text-sm font-semibold text-slate-600">
          <button
            className={`pb-2 border-b-2 ${activeTab === 'details' ? 'border-pink-500 text-pink-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('details')}
            type="button"
          >
            Titel
          </button>
          <button
            className={`pb-2 border-b-2 ${activeTab === 'vertrag' ? 'border-pink-500 text-pink-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('vertrag')}
            type="button"
          >
            Vertrag
          </button>
          <button
            className={`pb-2 border-b-2 ${activeTab === 'bank' ? 'border-pink-500 text-pink-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('bank')}
            type="button"
          >
            Bankverbindung
          </button>
          <button
            className={`pb-2 border-b-2 ${activeTab === 'rating' ? 'border-pink-500 text-pink-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('rating')}
            type="button"
          >
            Bewertung
          </button>
        </div>

        <form id="partner-form" className="space-y-6" onSubmit={handleSubmit}>
          {activeTab === 'details' && (
            <>
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Status">
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                      <option value="lead">Lead</option>
                      <option value="archived">Archiviert</option>
                    </select>
                  </Field>
                  <Field label="Anbieter-ID (automatisch)">
                    <input className="input bg-slate-100" value={providerId || partner?.provider_id || 'wird automatisch vergeben'} disabled />
                  </Field>
                  <Field label="Name*" required>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
                <p className="text-sm font-semibold text-ink">Kontakt & Adresse</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Ansprechpartner">
                    <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
                  </Field>
                  <Field label="Telefon">
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label="Email*" required>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </Field>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm font-semibold text-ink">Weitere Ansprechpartner</p>
                  <button
                    type="button"
                    onClick={addContactPerson}
                    className="inline-flex items-center gap-2 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"
                  >
                    <span className="text-lg leading-none">＋</span>
                    Ansprechpartner hinzufügen
                  </button>
                </div>
                <div className="space-y-3">
                  {contactPeople.length === 0 && (
                    <p className="text-sm text-slate-500">Noch keine weiteren Ansprechpartner angelegt.</p>
                  )}
                  {contactPeople.map((c, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Kontakt #{idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeContactPerson(idx)}
                          className="text-xs text-slate-500 hover:text-red-600"
                        >
                          Entfernen
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Name">
                          <input
                            className="input"
                            value={c.name}
                            onChange={(e) => updateContactPerson(idx, 'name', e.target.value)}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            className="input"
                            type="email"
                            value={c.email}
                            onChange={(e) => updateContactPerson(idx, 'email', e.target.value)}
                          />
                        </Field>
                        <Field label="Telefon">
                          <input
                            className="input"
                            value={c.phone}
                            onChange={(e) => updateContactPerson(idx, 'phone', e.target.value)}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Straße">
                    <input className="input" value={street} onChange={(e) => setStreet(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="PLZ">
                      <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} />
                    </Field>
                    <Field label="Ort" className="col-span-2">
                      <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
                    </Field>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Land">
                    <select
                      className="input"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value as any);
                        setState('');
                      }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bundesland" className="md:col-span-2">
                    <select className="input" value={state} onChange={(e) => setState(e.target.value)}>
                      <option value="">Bitte wählen</option>
                      {stateOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm font-semibold text-ink">Weitere Ansprechpartner</p>
                  <button
                    type="button"
                    onClick={addContactPerson}
                    className="inline-flex items-center gap-2 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50"
                  >
                    <span className="text-lg leading-none">＋</span>
                    Ansprechpartner hinzufügen
                  </button>
                </div>
                <div className="space-y-3">
                  {contactPeople.length === 0 && (
                    <p className="text-sm text-slate-500">Noch keine weiteren Ansprechpartner angelegt.</p>
                  )}
                  {contactPeople.map((c, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Kontakt #{idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeContactPerson(idx)}
                          className="text-xs text-slate-500 hover:text-red-600"
                        >
                          Entfernen
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Name">
                          <input
                            className="input"
                            value={c.name}
                            onChange={(e) => updateContactPerson(idx, 'name', e.target.value)}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            className="input"
                            type="email"
                            value={c.email}
                            onChange={(e) => updateContactPerson(idx, 'email', e.target.value)}
                          />
                        </Field>
                        <Field label="Telefon">
                          <input
                            className="input"
                            value={c.phone}
                            onChange={(e) => updateContactPerson(idx, 'phone', e.target.value)}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-ink">Firmendaten</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="UID-Nr">
                    <input className="input" value={uid} onChange={(e) => setUid(e.target.value)} />
                  </Field>
                  <Field label="Firmenbuchnummer">
                    <input className="input" value={registry} onChange={(e) => setRegistry(e.target.value)} />
                  </Field>
                  <Field label="Steuernummer">
                    <input className="input" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                  </Field>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-ink">Buchungen</p>
                <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                  <p>
                    Zeige {filteredBookings.length} von {bookings.length} Buchung{bookings.length === 1 ? '' : 'en'}
                    {!showPastBookings && bookings.length > filteredBookings.length && ` · Vergangene ausgeblendet`}
                  </p>
                  {bookings.length > 0 && (
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() => setShowPastBookings((v) => !v)}
                    >
                      {showPastBookings ? 'Vergangene ausblenden' : 'Vergangene einblenden'}
                    </button>
                  )}
                </div>

                {bookings.length === 0 && <p className="text-sm text-slate-500">Keine Buchungen für diesen Anbieter.</p>}
                {bookings.length > 0 && (
                  <div className="max-h-64 overflow-auto divide-y divide-slate-200">
                    {filteredBookings.map((b) => (
                      <div key={b.id} className="py-2 flex items-center justify-between text-sm text-slate-700">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-ink">{b.course_title ?? 'Kurs'}</p>
                          <p className="text-xs text-slate-500">
                            Start: {b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'} · Teilnehmer:{' '}
                            {b.student_name ?? '—'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>{b.status}</p>
                          {b.booking_date && <p>{new Date(b.booking_date).toLocaleDateString()}</p>}
                          {b.amount != null && <p className="text-ink font-semibold">{b.amount} €</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'vertrag' && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-ink">Vertrag & Provision</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Vertrag vorhanden?">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={contract} onChange={(e) => setContract(e.target.checked)} />
                      Ja
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={contractDate}
                      onChange={(e) => setContractDate(e.target.value)}
                      placeholder="Vertragsdatum"
                    />
                  </div>
                </Field>
                <Field label="Provisionen (%)" className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] uppercase tracking-[0.08em]">1 Teilnehmer</p>
                      <input className="input" placeholder="z.B. 10" value={provision1} onChange={(e) => setProvision1(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] uppercase tracking-[0.08em]">2 Teilnehmer</p>
                      <input className="input" placeholder="z.B. 12" value={provision2} onChange={(e) => setProvision2(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] uppercase tracking-[0.08em]">3 Teilnehmer</p>
                      <input className="input" placeholder="z.B. 14" value={provision3} onChange={(e) => setProvision3(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] uppercase tracking-[0.08em]">4 Teilnehmer</p>
                      <input className="input" placeholder="z.B. 16" value={provision4} onChange={(e) => setProvision4(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] uppercase tracking-[0.08em]">5 Teilnehmer</p>
                      <input className="input" placeholder="z.B. 18" value={provision5} onChange={(e) => setProvision5(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] uppercase tracking-[0.08em]">ab 6 Teilnehmer</p>
                      <input className="input" placeholder="z.B. 20" value={provision6plus} onChange={(e) => setProvision6plus(e.target.value)} />
                    </div>
                  </div>
                </Field>
              </div>
            </section>
          )}

          {activeTab === 'bank' && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-ink">Bankverbindung</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Bank">
                  <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} />
                </Field>
                <Field label="IBAN">
                  <input className="input" value={iban} onChange={(e) => setIban(e.target.value)} />
                </Field>
                <Field label="BIC">
                  <input className="input" value={bic} onChange={(e) => setBic(e.target.value)} />
                </Field>
              </div>
            </section>
          )}

          {activeTab === 'rating' && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
              <p className="text-sm font-semibold text-ink">Bewertung</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StarField
                  label="Kursort"
                  value={ratingValue(ratingCourse)}
                  onChange={(v) => setRatingCourse(String(v))}
                />
                <StarField
                  label="Dozent"
                  value={ratingValue(ratingTeacher)}
                  onChange={(v) => setRatingTeacher(String(v))}
                />
                <StarField
                  label="Verlässlichkeit"
                  value={ratingValue(ratingReliability)}
                  onChange={(v) => setRatingReliability(String(v))}
                />
                <StarField
                  label="Engagement"
                  value={ratingValue(ratingEngagement)}
                  onChange={(v) => setRatingEngagement(String(v))}
                />
              </div>
              <div className="text-sm text-slate-600">
                Gesamt: <span className="font-semibold text-ink">{ratingLabel(avgRating)}</span> ({avgRating.toFixed(1)} / 5)
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm text-slate-700 ${className ?? ''}`}>
      <span className="text-xs font-semibold text-ink flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function StarField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const labels = ['Schwach', 'Mittel', 'Gut', 'Sehr gut', 'Hervorragend'];
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-ink flex items-center gap-2">
        {label}
        <span className="text-[11px] text-slate-500">({value.toFixed(0)}/5)</span>
      </div>
      <div className="flex items-center gap-1 text-pink-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            type="button"
            key={i}
            className="text-xl leading-none"
            onClick={() => onChange(i + 1)}
          >
            {i < value ? '★' : '☆'}
          </button>
        ))}
        <span className="text-[11px] text-slate-500 ml-2">{labels[Math.max(0, Math.min(4, Math.round(value) - 1))] || 'Keine'}</span>
      </div>
    </div>
  );
}
