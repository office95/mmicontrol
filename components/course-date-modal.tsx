'use client';

import { useEffect, useMemo, useState } from 'react';

type Course = { id: string; title: string; price_gross?: number | null; vat_rate?: number | null; price_net?: number | null; deposit?: number | null; saldo?: number | null; duration_hours?: number | null };
type Partner = { id: string; name: string };

export type CourseDateRow = {
  id?: string;
  code?: string | null;
  course_id: string | null;
  partner_id: string | null;
  start_date: string | null;
  end_date: string | null;
  time_from: string | null;
  time_to: string | null;
  status: string;
};

const STATUSES = ['offen', 'laufend', 'abgeschlossen', 'verschoben', 'abgesagt'] as const;

export default function CourseDateModal({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  initial?: CourseDateRow | null;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courseId, setCourseId] = useState<string | ''>('');
  const [partnerId, setPartnerId] = useState<string | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('offen');
  const [price, setPrice] = useState<string>('');
  const [vat, setVat] = useState<string>('');
  const [priceNet, setPriceNet] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [saldo, setSaldo] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    async function loadRefs() {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/partners'),
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      if (cRes.ok) setCourses(cData);
      if (pRes.ok) setPartners(pData);
    }
    loadRefs();
  }, []);

  useEffect(() => {
    if (!initial) return;
    setCourseId(initial.course_id || '');
    setPartnerId(initial.partner_id || '');
    setStartDate(initial.start_date || '');
    setEndDate(initial.end_date || '');
    setTimeFrom(initial.time_from || '');
    setTimeTo(initial.time_to || '');
    setStatus((initial.status as any) || 'offen');
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const method = initial?.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/admin/course-dates', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: initial?.id,
        course_id: courseId || null,
        partner_id: partnerId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        time_from: timeFrom || null,
        time_to: timeTo || null,
        status,
        price_gross: price ? Number(price) : null,
        vat_rate: vat ? Number(vat) : null,
        price_net: priceNet ? Number(priceNet) : null,
        deposit: deposit ? Number(deposit) : null,
        saldo: saldo ? Number(saldo) : null,
        duration_hours: duration ? Number(duration) : null,
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

  const courseOptions = useMemo(
    () => courses.sort((a, b) => a.title.localeCompare(b.title)),
    [courses]
  );

  useEffect(() => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    if (course.price_gross != null) setPrice(String(course.price_gross));
    if (course.vat_rate != null) setVat(String(course.vat_rate));
    if (course.price_net != null) setPriceNet(String(course.price_net));
    if (course.deposit != null) setDeposit(String(course.deposit));
    if (course.saldo != null) setSaldo(String(course.saldo));
    if (course.duration_hours != null) setDuration(String(course.duration_hours));
  }, [courseId, courses]);
  const partnerOptions = useMemo(
    () => partners.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [partners]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-4xl p-8 relative max-h-[90vh] overflow-y-auto text-slate-900 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
          ✕
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-pink-500">Kurstermine</p>
            <h2 className="text-2xl font-semibold text-ink">{initial ? 'Kurstermin bearbeiten' : 'Neuen Kurstermin anlegen'}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">
              Abbrechen
            </button>
            <button type="submit" form="course-date-form" className="button-primary shadow-sm" disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form id="course-date-form" className="space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Kurs*" required>
                <select
                  className="input"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                >
                  <option value="">Bitte Kurs wählen</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Anbieter">
                <select
                  className="input"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                >
                  <option value="">Kein Anbieter</option>
                  {partnerOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Kursstart*" required>
                <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </Field>
              <Field label="Kursende">
                <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Kurszeit von">
                <input type="time" className="input" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
              </Field>
              <Field label="Kurszeit bis">
                <input type="time" className="input" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Status">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              {initial?.code && (
                <Field label="Kurstermin-ID">
                  <input className="input bg-slate-100" value={initial.code} disabled />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Kursbeitrag Brutto">
                <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="USt-Satz">
                <input className="input" value={vat} onChange={(e) => setVat(e.target.value)} />
              </Field>
              <Field label="Kursbeitrag Netto">
                <input className="input" value={priceNet} onChange={(e) => setPriceNet(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Anzahlung">
                <input className="input" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
              </Field>
              <Field label="Saldo">
                <input className="input" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
              </Field>
              <Field label="Dauer (Stunden)">
                <input className="input" value={duration} onChange={(e) => setDuration(e.target.value)} />
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
