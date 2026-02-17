'use client';

import { useEffect, useMemo, useState } from 'react';

type Country = 'Österreich' | 'Deutschland';
const COUNTRIES: Country[] = ['Österreich', 'Deutschland'];
const STATES_AT = ['Burgenland','Kärnten','Niederösterreich','Oberösterreich','Salzburg','Steiermark','Tirol','Vorarlberg','Wien'];
const STATES_DE = ['Baden-Württemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen','Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thüringen'];

export type StudentRow = {
  id: string;
  student_id: string | null;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: Country | null;
  state: string | null;
  company: string | null;
  vat_number: string | null;
  birthdate: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  status: 'active' | 'inactive';
  is_problem: boolean;
  problem_note: string | null;
  created_at?: string;
};

export default function StudentModal({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  initial?: StudentRow | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState<Country>('Österreich');
  const [state, setState] = useState('');
  const [company, setCompany] = useState('');
  const [vat, setVat] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bank, setBank] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isProblem, setIsProblem] = useState(false);
  const [problemNote, setProblemNote] = useState('');

  const states = useMemo(() => (country === 'Österreich' ? STATES_AT : STATES_DE), [country]);

  useEffect(() => {
    if (!initial) return;
    setName(initial.name ?? '');
    setStudentId(initial.student_id ?? null);
    setStreet(initial.street ?? '');
    setZip(initial.zip ?? '');
    setCity(initial.city ?? '');
    setCountry((initial.country as Country) ?? 'Österreich');
    setState(initial.state ?? '');
    setCompany(initial.company ?? '');
    setVat(initial.vat_number ?? '');
    setBirthdate(initial.birthdate ?? '');
    setPhone(initial.phone ?? '');
    setEmail(initial.email ?? '');
    setBank(initial.bank_name ?? '');
    setIban(initial.iban ?? '');
    setBic(initial.bic ?? '');
    setStatus(initial.status ?? 'active');
    setIsProblem(!!initial.is_problem);
    setProblemNote(initial.problem_note ?? '');
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const safeCountry = country || 'Österreich';
    const res = await fetch('/api/admin/students', {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: initial?.id,
        name,
        student_id: studentId,
        street: street || null,
        zip: zip || null,
        city: city || null,
        country: safeCountry,
        state: state || null,
        company: company || null,
        vat_number: company ? vat || null : null,
        birthdate: birthdate || null,
        phone: phone || null,
        email: email || null,
        bank_name: bank || null,
        iban: iban || null,
        bic: bic || null,
        status,
        is_problem: isProblem,
        problem_note: isProblem ? problemNote || null : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Speichern fehlgeschlagen');
    } else {
      onSaved();
      onClose();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-5xl p-8 relative max-h-[90vh] overflow-y-auto text-slate-900 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
          ✕
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-pink-500">Kursteilnehmer</p>
            <h2 className="text-2xl font-semibold text-ink">
              {initial ? 'Kursteilnehmer bearbeiten' : 'Neuen Kursteilnehmer anlegen'}
            </h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">
              Abbrechen
            </button>
            <button type="submit" form="student-form" className="button-primary shadow-sm" disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form id="student-form" className="space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Kursteilnehmer-ID">
                <input className="input bg-slate-100" value={studentId ?? 'wird automatisch vergeben'} disabled />
              </Field>
              <Field label="Status">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </Field>
              <Field label="Problemkunde">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isProblem} onChange={(e) => setIsProblem(e.target.checked)} />
                  <span>Markieren</span>
                </label>
              </Field>
            </div>
            {isProblem && (
              <Field label="Grund (Problemkunde)">
                <textarea className="input" rows={2} value={problemNote} onChange={(e) => setProblemNote(e.target.value)} />
              </Field>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-ink">Person</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Name*" required>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Geburtsdatum">
                <input type="date" className="input" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </Field>
              <Field label="Telefon">
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Email">
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Firma (optional)">
                <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
              {company ? (
                <Field label="UID-Nr">
                  <input className="input" value={vat} onChange={(e) => setVat(e.target.value)} />
                </Field>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-ink">Adresse</p>
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
                    setCountry(e.target.value as Country);
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
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
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
