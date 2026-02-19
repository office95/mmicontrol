'use client';

import { useEffect, useMemo, useState } from 'react';

type Course = { id: string; title: string };
type Partner = { id: string; name: string };

const STATES_AT = [
  'Burgenland',
  'Kärnten',
  'Niederösterreich',
  'Oberösterreich',
  'Salzburg',
  'Steiermark',
  'Tirol',
  'Vorarlberg',
  'Wien',
];
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

const SOURCE_OPTIONS = ['Facebook', 'Instagram', 'Google', 'ChatGPT', 'Website', 'Empfehlung', 'Youtube'];
const EXTRA_COURSES = [
  { id: 'extra-prof-audio', title: 'Professional Audio Diploma' },
  { id: 'extra-bachelor', title: 'Bachelor' },
];

export type LeadRow = {
  id?: string;
  lead_code?: string | null;
  requested_at?: string | null;
  salutation?: 'Herr' | 'Frau' | 'Firma' | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  country?: string | null;
  state?: string | null;
  interest_courses?: string[];
  interest_other?: string | null;
  partner_id?: string | null;
  source?: string[];
  source_note?: string | null;
  lead_quality?: string | null;
  newsletter?: boolean;
  status?: string | null;
  notes?: { created_at: string; text: string; todo?: string }[];
};

export default function LeadModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: LeadRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salutation, setSalutation] = useState<'Herr' | 'Frau' | 'Firma'>('Herr');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [country, setCountry] = useState<'Österreich' | 'Deutschland'>('Österreich');
  const [state, setState] = useState('');
  const [interestCourses, setInterestCourses] = useState<string[]>([]);
  const [interestOther, setInterestOther] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [source, setSource] = useState<string[]>([]);
  const [sourceNote, setSourceNote] = useState('');
  const [leadQuality, setLeadQuality] = useState('C');
  const [newsletter, setNewsletter] = useState(false);
  const [requestedAt, setRequestedAt] = useState('');
  const [status, setStatus] = useState('offen');
  const [notes, setNotes] = useState<{ created_at: string; text: string; todo?: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [tab, setTab] = useState<'data' | 'notes'>('data');

  useEffect(() => {
    async function loadRefs() {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/admin/courses?minimal=1'),
        fetch('/api/admin/partners'),
      ]);
      if (cRes.ok) setCourses(await cRes.json());
      if (pRes.ok) setPartners(await pRes.json());
    }
    loadRefs();
  }, []);

  useEffect(() => {
    if (!initial) return;
    setSalutation((initial.salutation as any) || 'Herr');
    setName(initial.name || '');
    setEmail(initial.email || '');
    setPhone(initial.phone || '');
    setBirthdate(initial.birthdate || '');
    setCountry((initial.country as any) || 'Österreich');
    setState(initial.state || '');
    setInterestCourses(initial.interest_courses || []);
    setInterestOther(initial.interest_other || '');
    setPartnerId(initial.partner_id || '');
    setSource(initial.source || []);
    setSourceNote(initial.source_note || '');
    setLeadQuality(initial.lead_quality || 'C');
    setNewsletter(Boolean(initial.newsletter));
    setRequestedAt(initial.requested_at || new Date().toISOString().slice(0, 10));
    setStatus(initial.status || 'offen');
    setNotes(initial.notes || []);
  }, [initial]);

  const courseOptions = useMemo(
    () => [...courses, ...EXTRA_COURSES].sort((a, b) => a.title.localeCompare(b.title)),
    [courses]
  );
  const partnerOptions = useMemo(
    () => partners.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [partners]
  );

  const states = country === 'Deutschland' ? STATES_DE : STATES_AT;

  const toggleInterest = (id: string) => {
    setInterestCourses((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSource = (s: string) => {
    setSource((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Split Interessen: echte Kurs-UUIDs vs. Extra-Pseudokurse
    const uuids: string[] = [];
    const extrasSelected: string[] = [];
    interestCourses.forEach((id) => {
      if (id.startsWith('extra-')) extrasSelected.push(id.replace('extra-', '').replace('-', ' '));
      else uuids.push(id);
    });
    const mergedOther = [interestOther || '', extrasSelected.join(', ')].filter(Boolean).join(' | ');

    const method = initial?.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/admin/leads', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: initial?.id,
        salutation,
        name,
        email,
        phone,
        country,
        state,
        interest_courses: uuids,
        interest_other: mergedOther || null,
        partner_id: partnerId || null,
        source,
        source_note: sourceNote || null,
        lead_quality: leadQuality,
        newsletter,
        requested_at: requestedAt || new Date().toISOString().slice(0, 10),
        status,
        birthdate: birthdate || null,
        notes,
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
      <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-5xl p-8 relative max-h-[90vh] min-h-[70vh] text-slate-900 space-y-6 overflow-hidden">
        <div className="overflow-y-auto max-h-[75vh] pr-1 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
          ✕
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-pink-500">Leads</p>
            <h2 className="text-2xl font-semibold text-ink">{initial ? 'Lead bearbeiten' : 'Neuen Lead anlegen'}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">
              Abbrechen
            </button>
            <button type="submit" form="lead-form" className="button-primary shadow-sm" disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 text-sm font-semibold text-slate-700">
          <button
            type="button"
            className={`px-3 py-2 rounded-lg border ${tab === 'data' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-700'}`}
            onClick={() => setTab('data')}
          >
            Stammdaten
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-lg border ${tab === 'notes' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-700'}`}
            onClick={() => setTab('notes')}
          >
            Notizen
          </button>
        </div>

        <form id="lead-form" className="space-y-6" onSubmit={handleSubmit}>
          {tab === 'data' && (
            <>
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Lead-ID">
                  <input className="input bg-slate-100" value={initial?.lead_code || 'wird automatisch vergeben'} disabled />
                </Field>
                <Field label="Anfragedatum">
                  <input
                    type="date"
                    className="input"
                    value={requestedAt}
                    onChange={(e) => setRequestedAt(e.target.value)}
                  />
                </Field>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Anrede">
                <select className="input" value={salutation} onChange={(e) => setSalutation(e.target.value as any)}>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                  <option value="Firma">Firma</option>
                </select>
              </Field>
              <Field label="Name*" required>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Email">
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            <Field label="Telefon">
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Geburtsdatum">
              <input
                type="date"
                className="input"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </Field>
            <Field label="Land">
              <select className="input" value={country} onChange={(e) => setCountry(e.target.value as any)}>
                <option>Österreich</option>
                  <option>Deutschland</option>
                </select>
              </Field>
              <Field label="Bundesland">
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

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-ink uppercase tracking-[0.15em]">Interesse an</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {courseOptions.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={interestCourses.includes(c.id)}
                    onChange={() => toggleInterest(c.id)}
                  />
                  {c.title}
                </label>
              ))}
            </div>
            <Field label="Weitere Hinweise">
              <input className="input" value={interestOther} onChange={(e) => setInterestOther(e.target.value)} />
            </Field>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-ink uppercase tracking-[0.15em]">Quelle</p>
            <div className="flex flex-wrap gap-3">
              {SOURCE_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={source.includes(s)}
                    onChange={() => toggleSource(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
            {source.includes('Empfehlung') && (
              <Field label="Wer hat empfohlen?">
                <input className="input" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} />
              </Field>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Lead-Qualität">
                <select className="input" value={leadQuality} onChange={(e) => setLeadQuality(e.target.value)}>
                  <option value="A">A – sehr wahrscheinlich</option>
                  <option value="B">B – wahrscheinlich</option>
                  <option value="C">C – möglich</option>
                  <option value="D">D – unwahrscheinlich</option>
                  <option value="E">E – Flop</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="offen">offen</option>
                  <option value="nicht erreicht">nicht erreicht</option>
                  <option value="erledigt">erledigt</option>
                  <option value="löschen">löschen</option>
                  <option value="Watchlist">Watchlist</option>
                  <option value="Email senden">Email senden</option>
                </select>
              </Field>
              <Field label="Partner">
                <select className="input" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Kein Partner</option>
                  {partnerOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={newsletter}
                    onChange={(e) => setNewsletter(e.target.checked)}
                  />
                  Werbung & Newsletter erwünscht
                </label>
              </section>
            </>
          )}

          {tab === 'notes' && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <textarea
                  className="input min-h-[80px] flex-1"
                  placeholder="Gesprächsnotiz"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <input
                  className="input md:w-64"
                  placeholder="To-do"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                />
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    if (!newNote.trim() && !newTodo.trim()) return;
                    setNotes((prev) => [
                      { created_at: new Date().toISOString(), text: newNote.trim(), todo: newTodo.trim() || undefined },
                      ...prev,
                    ]);
                    setNewNote('');
                    setNewTodo('');
                  }}
                >
                  Notiz hinzufügen
                </button>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {notes.length === 0 && <p className="text-sm text-slate-500">Noch keine Notizen.</p>}
                {notes.map((n, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-sm relative">
                    <p className="text-xs text-slate-500 mb-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                    {n.text && <p className="text-slate-800">{n.text}</p>}
                    {n.todo && <p className="text-xs text-pink-700 mt-1">To-do: {n.todo}</p>}
                    <div className="absolute top-2 right-2 flex gap-2 text-xs">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => {
                          setNewNote(n.text || '');
                          setNewTodo(n.todo || '');
                          setNotes((prev) => prev.filter((_, i) => i !== idx));
                          setTab('notes');
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => setNotes((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </form>
      </div>
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
