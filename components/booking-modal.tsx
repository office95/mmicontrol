'use client';

import { useEffect, useMemo, useState } from 'react';

type CourseDate = {
  id: string;
  code: string | null;
  status: string;
  start_date: string | null;
  course_id: string | null;
  partner_id: string | null;
  course: { id: string; title: string; price_gross: number | null } | null;
  partner: { id: string; name: string } | null;
};

type PriceTier = {
  price_tier_id: string;
  price_gross?: number | null;
  vat_rate?: number | null;
  price_net?: number | null;
  deposit?: number | null;
  saldo?: number | null;
  duration_hours?: number | null;
  price_tier?: { id: string; label: string } | null;
};

type Student = { id: string; name: string };

const STATUSES = [
  'offen',
  'Anzahlung erhalten',
  'abgeschlossen',
  'Schlussrechnung versendet',
  'Zahlungserinnerung',
  '1. Mahnung',
  '2. Mahnung',
  'Inkasso',
  'Storno',
  'Archiv',
] as const;

export default function BookingModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dates, setDates] = useState<CourseDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courseDateId, setCourseDateId] = useState('');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [priceTierId, setPriceTierId] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('offen');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [priceNet, setPriceNet] = useState('');
  const [deposit, setDeposit] = useState('');
  const [saldo, setSaldo] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [code, setCode] = useState(`BU-${Date.now()}`);
  const [invoice, setInvoice] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    async function loadDates() {
      const res = await fetch('/api/admin/course-dates');
      const data = await res.json();
      if (res.ok) setDates(data);
    }
    loadDates();
  }, []);

  const selected = useMemo(() => dates.find((d) => d.id === courseDateId), [dates, courseDateId]);

  // Lade Preisstufen, wenn ein Kurstermin gewählt wurde
  useEffect(() => {
    async function loadTiers() {
      if (!selected?.course_id) {
        setPriceTiers([]);
        setPriceTierId('');
        return;
      }
      const res = await fetch(`/api/admin/courses?id=${selected.course_id}`);
      const data = await res.json();
      if (!res.ok) {
        setPriceTiers([]);
        setPriceTierId('');
        return;
      }
      const tiers = data?.course_price_tiers || [];
      setPriceTiers(tiers);
      const defaultId = data?.default_price_tier_id || tiers[0]?.price_tier_id || '';
      setPriceTierId(defaultId || '');
    }
    loadTiers();
  }, [selected?.course_id]);

  // Preise anwenden, wenn PKL geändert oder Kurstermin gewechselt
  useEffect(() => {
    const tier = priceTiers.find((t) => t.price_tier_id === priceTierId);
    if (tier) {
      const gross = tier.price_gross ?? null;
      const vat = tier.vat_rate ?? null;
      const net = tier.price_net ?? (gross != null && vat != null ? Number((gross / (1 + vat)).toFixed(2)) : null);
      const dep = tier.deposit ?? null;
      const sld = tier.saldo ?? (gross != null && dep != null ? Number((gross - dep).toFixed(2)) : null);
      const vatAmt = gross != null && net != null ? Number((gross - net).toFixed(2)) : null;
      setAmount(gross != null ? String(gross) : '');
      setVatRate(vat != null ? String(vat) : '');
      setPriceNet(net != null ? String(net) : '');
      setDeposit(dep != null ? String(dep) : '');
      setSaldo(sld != null ? String(sld) : '');
      setVatAmount(vatAmt != null ? String(vatAmt) : '');
    } else if (selected?.course?.price_gross != null) {
      // Fallback auf Kurs-Basispreis
      const gross = Number(selected.course.price_gross);
      setAmount(String(gross));
      setVatRate('');
      setPriceNet('');
      setDeposit('');
      setSaldo('');
      setVatAmount('');
    } else {
      setAmount('');
      setVatRate('');
      setPriceNet('');
      setDeposit('');
      setSaldo('');
      setVatAmount('');
    }
  }, [priceTierId, priceTiers, selected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice.trim()) {
      setError('Auftragsnummer ist Pflicht.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_code: code || undefined,
        student_id: student.id,
        course_date_id: courseDateId || null,
        partner_id: selected?.partner_id ?? null,
        amount: amount ? Number(amount) : null,
        price_tier_id: priceTierId || null,
        vat_rate: vatRate ? Number(vatRate) : null,
        price_net: priceNet ? Number(priceNet) : null,
        deposit: deposit ? Number(deposit) : null,
        saldo: saldo ? Number(saldo) : null,
        status,
        booking_date: bookingDate || null,
        invoice_number: invoice.trim(),
        due_date: dueDate || null,
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
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">✕</button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-pink-500">Buchung erfassen</p>
            <h2 className="text-2xl font-semibold text-ink">Für: {student.name}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Abbrechen</button>
            <button type="submit" form="booking-form" className="button-primary shadow-sm" disabled={loading}>{loading ? 'Speichern...' : 'Speichern'}</button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form id="booking-form" className="space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Buchungs-ID">
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
              </Field>
              <Field label="Buchungsdatum">
                <input type="date" className="input" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
              </Field>
              <Field label="Auftragsnummer" required>
                <input className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} required />
              </Field>
              <Field label="Fälligkeit">
                <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>

            <Field label="Kurstermin" required>
              <select className="input" value={courseDateId} onChange={(e) => setCourseDateId(e.target.value)} required>
                <option value="">Bitte wählen</option>
                {dates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.course?.title ?? 'Unbekannter Kurs'} {d.code ? `(${d.code})` : ''} · {d.start_date ?? ''}
                    {d.course?.title ? '' : ''}
                  </option>
                ))}
              </select>
            </Field>

            {priceTiers.length > 0 && (
              <Field label="Preisklasse (PKL)">
                <select className="input" value={priceTierId} onChange={(e) => setPriceTierId(e.target.value)}>
                  {priceTiers.map((t) => (
                    <option key={t.price_tier_id} value={t.price_tier_id}>
                      {t.price_tier?.label ?? 'PKL'}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Anbieter">
                <input className="input bg-slate-100" value={selected?.partner?.name ?? ''} disabled />
              </Field>
              <Field label="Kursbeitrag Brutto">
                <input
                  className="input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  readOnly={priceTiers.length > 0}
                  placeholder="Automatisch aus PKL"
                />
              </Field>
            </div>

            {priceTiers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="USt-Satz">
                  <input className="input bg-slate-100" value={vatRate} readOnly />
                </Field>
                <Field label="Kursbeitrag Netto">
                  <input className="input bg-slate-100" value={priceNet} readOnly />
                </Field>
                <Field label="Anzahlung">
                  <input className="input bg-slate-100" value={deposit} readOnly />
                </Field>
                <Field label="Saldo">
                  <input className="input bg-slate-100" value={saldo} readOnly />
                </Field>
                <Field label="USt Betrag (€)">
                  <input className="input bg-slate-100" value={vatAmount} readOnly />
                </Field>
              </div>
            )}

            <Field label="Status">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
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
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-slate-700 space-y-1">
      <span className="text-xs font-semibold text-ink flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
