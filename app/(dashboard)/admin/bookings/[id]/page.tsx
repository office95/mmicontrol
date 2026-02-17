'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ButtonLink from '@/components/button-link';

const STATUSES = ['offen', 'Anzahlung erhalten', 'abgeschlossen', 'Zahlungserinnerung', '1. Mahnung', '2. Mahnung', 'Inkasso', 'Storno', 'Archiv'];

type Course = { id: string; title: string; price_gross?: number | null; vat_rate?: number | null; price_net?: number | null; deposit?: number | null; saldo?: number | null; duration_hours?: number | null };

type Booking = {
  id: string;
  booking_code: string | null;
  booking_date: string | null;
  amount: number | string | null;
  vat_rate?: number | string | null;
  price_net?: number | string | null;
  deposit?: number | string | null;
  saldo?: number | string | null;
  duration_hours?: number | string | null;
  status: string;
  student_name: string | null;
  student_email: string | null;
  course_title: string | null;
  course_start: string | null;
  partner_name: string | null;
  course_id?: string | null;
};

export default function BookingEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState<Booking | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const courseRes = await fetch('/api/admin/courses');
      const courseData = await courseRes.json();
      if (courseRes.ok) setCourses(courseData);

      const res = await fetch(`/api/admin/bookings?id=${params.id}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Fehler beim Laden');
      else {
        const normalized = {
          ...data,
          amount: data.amount != null ? Number(data.amount) : null,
          vat_rate: data.vat_rate ?? null,
          price_net: data.price_net ?? null,
          deposit: data.deposit ?? null,
          saldo: data.saldo ?? null,
          duration_hours: data.duration_hours ?? null,
        };
        setBooking(normalized);
        setForm(normalized);
      }
    }
    load();
  }, [params.id]);

  const save = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form ?? {}),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Speichern fehlgeschlagen');
    else router.push('/admin/bookings');
    setLoading(false);
  };

  const setField = (key: keyof Booking, value: any) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const courseOptions = useMemo(
    () => courses.sort((a, b) => (a.title || '').localeCompare(b.title || '')),
    [courses]
  );

  useEffect(() => {
    if (!form?.course_id) return;
    const c = courses.find((x) => x.id === form.course_id);
    if (!c) return;
    setForm((prev) =>
      prev
        ? {
            ...prev,
            amount: c.price_gross ?? prev.amount,
            vat_rate: c.vat_rate ?? prev.vat_rate,
            price_net: c.price_net ?? prev.price_net,
            deposit: c.deposit ?? prev.deposit,
            saldo: c.saldo ?? prev.saldo,
            duration_hours: c.duration_hours ?? prev.duration_hours,
            course_title: prev.course_title || c.title,
          }
        : prev
    );
  }, [form?.course_id, courses]);

  if (!form) return <p className="text-slate-200">Lade Buchung...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Buchung bearbeiten</h1>
          <p className="text-sm text-slate-200">{form.booking_code || form.id}</p>
        </div>
        <ButtonLink href="/admin/bookings">Zurück</ButtonLink>
      </div>

      <div className="max-w-4xl mx-auto bg-white/95 text-slate-900 rounded-3xl shadow-[0_28px_80px_rgba(15,23,42,0.25)] border border-slate-200/70 p-6 md:p-8 backdrop-blur">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Field label="Buchungscode">
            <input className="input" value={form.booking_code ?? ''} onChange={(e) => setField('booking_code', e.target.value)} />
          </Field>
          <Field label="Buchungsdatum">
            <input
              type="date"
              className="input"
              value={form.booking_date ?? ''}
              onChange={(e) => setField('booking_date', e.target.value)}
            />
          </Field>
          <Field label="Kurs">
            <select
              className="input"
              value={form.course_id ?? ''}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, course_id: e.target.value, course_title: courses.find((c) => c.id === e.target.value)?.title ?? '' } : prev))}
            >
              <option value="">Kurs wählen</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kursstart">
            <input
              type="date"
              className="input"
              value={form.course_start ?? ''}
              onChange={(e) => setField('course_start', e.target.value)}
            />
          </Field>
          <Field label="Anbieter">
            <input className="input" value={form.partner_name ?? ''} onChange={(e) => setField('partner_name', e.target.value)} />
          </Field>
          <Field label="Betrag (Brutto)">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.amount ?? ''}
              onChange={(e) => setField('amount', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="USt-Satz">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.vat_rate ?? ''}
              onChange={(e) => setField('vat_rate', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Betrag Netto">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.price_net ?? ''}
              onChange={(e) => setField('price_net', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Anzahlung">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.deposit ?? ''}
              onChange={(e) => setField('deposit', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Saldo">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.saldo ?? ''}
              onChange={(e) => setField('saldo', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Dauer (Stunden)">
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.duration_hours ?? ''}
              onChange={(e) => setField('duration_hours', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Kursteilnehmer">
            <input className="input" value={form.student_name ?? ''} onChange={(e) => setField('student_name', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" value={form.student_email ?? ''} onChange={(e) => setField('student_email', e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-8 flex gap-3 justify-end">
          <button
            className="button-primary px-5"
            onClick={save}
            disabled={loading}
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
          <ButtonLink href="/admin/bookings">Abbrechen</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-slate-700 space-y-1">
      <span className="text-xs font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
