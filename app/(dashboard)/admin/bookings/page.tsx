'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ButtonLink from '@/components/button-link';

type BookingRow = {
  id: string;
  booking_code: string | null;
  booking_date: string | null;
  amount: number | null;
  course_id?: string | null;
  status: string;
  student_name: string | null;
  course_title: string | null;
  course_start: string | null;
  partner_name: string | null;
  student_email?: string | null;
  vat_rate?: number | null;
  price_net?: number | null;
  deposit?: number | null;
  saldo?: number | null;
  duration_hours?: number | null;
  payments?: PaymentRow[];
  paid_total?: number;
  open_amount?: number;
  next_dunning_at?: string | null;
  auto_dunning_enabled?: boolean | null;
};

type Metrics = {
  open_sum: number;
  dunning_due: number;
  payments_last7_sum: number;
  payments_last7_count: number;
  by_status: Record<string, number>;
};

const STATUSES = ['alle', 'offen', 'Anzahlung erhalten', 'abgeschlossen', 'Zahlungserinnerung', '1. Mahnung', '2. Mahnung', 'Inkasso', 'Storno', 'Archiv'];

type PaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  method?: string | null;
  note?: string | null;
};

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('alle');
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payNote, setPayNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [viewTab, setViewTab] = useState<'overview' | 'open'>('overview');
  const [modalTab, setModalTab] = useState<'overview' | 'payments' | 'dunning'>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/bookings');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setItems([]);
    } else {
      setItems(data);
      setError(null);
    }
    setLoading(false);

    const mRes = await fetch('/api/admin/bookings?metrics=1');
    if (mRes.ok) {
      const m = await mRes.json();
      setMetrics(m);
    }
  };

  useEffect(() => { load(); }, []);

  // Öffne Modal direkt, wenn ?id=... gesetzt ist (z. B. von Kursteilnehmer-Ansicht)
  useEffect(() => {
    const presetId = searchParams.get('id');
    if (presetId) {
      loadOne(presetId);
    }
  }, [searchParams]);

  const loadOne = async (id: string) => {
    const res = await fetch(`/api/admin/bookings?id=${id}`);
    const data = await res.json();
    if (res.ok) {
      const fallback = items.find((b) => b.id === id) || {};
      setSelected({ ...fallback, ...data });
      setPayments(data.payments || []);
      setModalTab('overview');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((b) => {
      const statusOk = status === 'alle' ? true : b.status === status;
      const text = `${b.student_name ?? ''} ${b.course_title ?? ''} ${b.partner_name ?? ''} ${b.booking_code ?? ''}`.toLowerCase();
      const searchOk = term === '' ? true : text.includes(term);
      return statusOk && searchOk;
    });
  }, [items, search, status]);

  const derivedVat = selected?.vat_rate ?? (selected?.amount != null ? 0.2 : null);
  const derivedNet =
    selected?.price_net ??
    (derivedVat != null && selected?.amount != null
      ? Number(selected.amount) / (1 + Number(derivedVat))
      : null);
  const derivedSaldo =
    selected?.saldo ??
    selected?.open_amount ??
    (selected?.amount != null && selected?.paid_total != null
      ? Number(selected.amount) - Number(selected.paid_total)
      : null);
  const derivedDeposit = selected?.deposit ?? 0;
  const derivedDuration = selected?.duration_hours ?? 0;

  const openItems = filtered.filter((b) => (b.open_amount ?? b.saldo ?? 0) > 0.001);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body { background: white !important; color: #111 !important; }
          .no-print { display: none !important; }
          .print-open-saldo { display: block !important; }
          table.print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          table.print-table th, table.print-table td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #ccc; }
          h2.print-title { font-size: 16px; margin: 0 0 8px 0; }
        }
        @media screen {
          .print-open-saldo { display: none; }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Buchungsübersicht</h1>
          <p className="text-sm text-slate-200">Alle Buchungen mit Filter & Suche.</p>
        </div>
        <ButtonLink href="/admin">Zurück</ButtonLink>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <GlassCard label="Offener Betrag" value={`${metrics.open_sum.toFixed(2)} €`} tone={metrics.open_sum > 0 ? 'warn' : 'good'}>
            <p className="text-xs text-slate-100/80">Summe aller offenen Beträge</p>
          </GlassCard>
          <GlassCard label="Fällige Mahnungen" value={metrics.dunning_due.toString()} tone={metrics.dunning_due > 0 ? 'warn' : 'good'}>
            <p className="text-xs text-slate-100/80">heute/überfällig</p>
          </GlassCard>
          <GlassCard label="Zahlungen 7d" value={`${metrics.payments_last7_sum.toFixed(2)} €`}>
            <p className="text-xs text-slate-100/80">{metrics.payments_last7_count} Buchungen</p>
          </GlassCard>
          <GlassCard label="Mahn-Status" value="">
            <div className="flex flex-wrap gap-2 text-[11px] text-white/90">
              {['Zahlungserinnerung', '1. Mahnung', '2. Mahnung', 'Inkasso'].map((s) => (
                <span key={s} className="rounded-full bg-white/10 px-2 py-1 border border-white/10">
                  {s}: {metrics.by_status[s] || 0}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      <div className="flex items-center flex-wrap gap-3 justify-between">
        <select
          className="input h-8 py-1 text-sm w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="input h-8 py-1 text-sm max-w-sm ml-auto"
          placeholder="Suche: Teilnehmer, Kurs, Anbieter, Code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-6 shadow-xl text-slate-900 overflow-x-auto">
        <div className="flex gap-3 mb-4 text-sm font-semibold text-slate-600">
          {(['overview', 'open'] as const).map((t) => (
            <button
              key={t}
              className={`pb-2 border-b-2 ${viewTab === t ? 'border-pink-500 text-ink' : 'border-transparent text-slate-400'}`}
              onClick={() => setViewTab(t)}
            >
              {t === 'overview' ? 'Übersicht' : 'Offene Saldenliste'}
            </button>
          ))}
        </div>

        {viewTab === 'open' && !loading && (
          <>
            <div className="flex items-center justify-between mb-3 text-sm text-slate-700">
              <div>Offene Salden: {openItems.length} Buchungen · Gesamt: {openItems.reduce((s, b) => s + (Number(b.open_amount ?? b.saldo ?? 0) || 0), 0).toFixed(2)} €</div>
              <button
                className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => window.print()}
              >
                Drucken (A4)
              </button>
            </div>
            <OpenSaldoTable items={openItems} />

            {/* Druckansicht ohne Boxen */}
            <div className="print-open-saldo mt-6">
              <h2 className="print-title">Offene Saldenliste</h2>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Buchungsdatum</th>
                    <th>Teilnehmer</th>
                    <th>Kurs</th>
                    <th>Status</th>
                    <th>Offener Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {openItems.map((b) => {
                    const open = Number(b.open_amount ?? b.saldo ?? 0) || 0;
                    return (
                      <tr key={b.id}>
                        <td>{b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</td>
                        <td>{b.student_name ?? '—'}</td>
                        <td>{b.course_title ?? '—'}</td>
                        <td>{b.status}</td>
                        <td>{open.toFixed(2)} €</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {viewTab !== 'open' && (
          <>
            {loading && <p className="text-sm text-slate-500">Lade Buchungen...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !filtered.length && <p className="text-sm text-slate-500">Keine Buchungen gefunden.</p>}

            {!loading && filtered.length > 0 && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Buchungsdatum</th>
                    <th className="py-2 pr-4">Kursteilnehmer</th>
                    <th className="py-2 pr-4">Kurs</th>
                    <th className="py-2 pr-4">Kursstart</th>
                    <th className="py-2 pr-4">Kursbeitrag Brutto</th>
                    <th className="py-2 pr-4">Anbieter</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((b) => (
                    <tr key={b.id} className="align-top">
                      <td className="py-3 pr-4">{b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</td>
                      <td className="py-3 pr-4">{b.student_name ?? '—'}</td>
                      <td className="py-3 pr-4">{b.course_title ?? '—'}</td>
                      <td className="py-3 pr-4">{b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'}</td>
                      <td className="py-3 pr-4">
                        {b.amount != null && !isNaN(Number(b.amount))
                          ? `${Number(b.amount).toFixed(2)} €`
                          : '—'}
                      </td>
                      <td className="py-3 pr-4">{b.partner_name ?? '—'}</td>
                      <td className="py-3 pr-4">{b.status}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); loadOne(b.id); }}
                          className="inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 border border-pink-700 shadow-sm"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-slate-500 hover:text-ink"
              onClick={() => {
                setSelected(null);
                const params = new URLSearchParams(searchParams.toString());
                params.delete('id');
                const query = params.toString();
                const url = `/admin/bookings${query ? `?${query}` : ''}`;
                router.replace(url as any);
              }}
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-2">Buchung verwalten</h3>
            <p className="text-sm text-slate-600 mb-4">
              {selected.student_name ?? '—'} · {selected.course_title ?? '—'} · Code {selected.booking_code ?? '—'}
            </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  ['overview', 'Basis'],
                  ['payments', 'Zahlungen'],
                  ['dunning', 'Status & Mahnwesen'],
                ].map(([key, label]) => (
                <button
                  key={key}
                  className={`rounded-full border px-4 py-1 text-sm font-semibold transition ${modalTab === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setModalTab(key as any)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <InfoCard label="Betrag brutto" value={selected.amount != null ? `${Number(selected.amount).toFixed(2)} €` : '—'} />
              <InfoCard label="Offener Betrag" value={selected.open_amount != null ? `${Number(selected.open_amount).toFixed(2)} €` : selected.saldo != null ? `${Number(selected.saldo).toFixed(2)} €` : '—'} tone={selected.open_amount !== undefined ? (selected.open_amount <= 0 ? 'good' : 'warn') : undefined} />
              <InfoCard label="Status" value={selected.status} />
              <InfoCard label="Kursstart" value={selected.course_start ? new Date(selected.course_start).toLocaleDateString() : '—'} />
            </div>

            <div className="space-y-6">
              {modalTab === 'overview' && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-ink uppercase tracking-[0.15em] mb-3">Basis</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {[
                      ['Rechnungsnummer', selected.invoice_number ? `MMI-${selected.invoice_number}` : '—'],
                      ['Kursteilnehmer', selected.student_name ?? '—'],
                      ['Buchungscode', selected.booking_code ?? '—'],
                      ['Buchungsdatum', selected.booking_date ? new Date(selected.booking_date).toLocaleDateString() : '—'],
                      ['Kurs', selected.course_title ?? '—'],
                      ['Kursstart', selected.course_start ? new Date(selected.course_start).toLocaleDateString() : '—'],
                      ['Anbieter', selected.partner_name ?? '—'],
                      ['USt-Satz', derivedVat != null ? `${(Number(derivedVat) * 100).toFixed(1)} %` : '—'],
                      ['Netto', derivedNet != null ? `${Number(derivedNet).toFixed(2)} €` : '—'],
                      ['Anzahlung', derivedDeposit != null ? `${Number(derivedDeposit).toFixed(2)} €` : '—'],
                      ['Saldo', derivedSaldo != null ? `${Number(derivedSaldo).toFixed(2)} €` : '—'],
                      ['Dauer (h)', derivedDuration != null ? `${derivedDuration} h` : '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</p>
                        <p className="text-[15px] text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {modalTab === 'payments' && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink uppercase tracking-[0.15em]">Zahlungen</p>
                    <span className="text-xs text-slate-500">
                      Bezahlt: {(selected.paid_total ?? 0).toFixed(2)} € · Offen: {(selected.open_amount ?? selected.saldo ?? 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Datum</label>
                      <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Betrag</label>
                      <input type="number" className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0,00" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Zahlungsmethode</label>
                      <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                        <option value="">Bitte wählen</option>
                        {['WIX Payment', 'Stripe', 'Banküberweisung', 'Barzahlung', 'Kreditkarte', 'Apple Pay', 'Google Pay'].map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Kommentar</label>
                      <select
                        className="input"
                        value={payNote}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPayNote(val);
                          setSelected((prev) => {
                            if (!prev) return prev;
                            if (val === 'Anzahlung') return { ...prev, status: 'Anzahlung erhalten' } as BookingRow;
                            if (val === 'Restzahlung') return { ...prev, status: 'abgeschlossen' } as BookingRow;
                            return prev; // Teilzahlung oder leer -> unverändert
                          });
                        }}
                      >
                        <option value="">Bitte wählen</option>
                        <option value="Anzahlung">Anzahlung</option>
                        <option value="Restzahlung">Restzahlung</option>
                        <option value="Teilzahlung">Teilzahlung</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="rounded-lg bg-pink-600 text-white px-4 py-2 hover:bg-pink-700 shadow"
                      disabled={savingPayment}
                      onClick={async () => {
                        if (!selected) return;
                        setSavingPayment(true);
                        // Status-Ableitung basierend auf Kommentar
                        let derivedStatus = selected.status;
                        if (payNote === 'Anzahlung') derivedStatus = 'Anzahlung erhalten';
                        else if (payNote === 'Restzahlung') derivedStatus = 'abgeschlossen';

                        const res = await fetch('/api/admin/payments', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            booking_id: selected.id,
                            payment_date: payDate,
                            amount: Number(payAmount || 0),
                            method: payMethod || null,
                            note: payNote || null,
                          }),
                        });
                        setSavingPayment(false);
                        if (res.ok) {
                          // Status ggf. aktualisieren
                          if (derivedStatus && derivedStatus !== selected.status) {
                            await fetch('/api/admin/bookings', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: selected.id, status: derivedStatus }),
                            });
                          }
                          setPayAmount('');
                          setPayMethod('');
                          setPayNote('');
                          loadOne(selected.id);
                          load(); // Liste aktualisieren
                        } else {
                          const d = await res.json().catch(() => ({}));
                          alert(d.error || 'Zahlung konnte nicht gespeichert werden.');
                        }
                      }}
                    >
                      {savingPayment ? 'Speichern...' : 'Zahlung buchen'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {payments.length === 0 && <p className="p-3 text-sm text-slate-500">Noch keine Zahlungen.</p>}
                    {payments.map((p) => (
                      <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-ink">{new Date(p.payment_date).toLocaleDateString()} · {Number(p.amount).toFixed(2)} €</p>
                          <p className="text-xs text-slate-500">{p.method || '—'} {p.note ? `· ${p.note}` : ''}</p>
                        </div>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={async () => {
                            if (!confirm('Zahlung löschen?')) return;
                            const res = await fetch(`/api/admin/payments?id=${p.id}`, { method: 'DELETE' });
                            if (res.ok && selected) {
                              loadOne(selected.id);
                              load();
                            }
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {modalTab === 'dunning' && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-ink uppercase tracking-[0.15em]">Status & Mahnwesen</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm items-end">
                    <div>
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</label>
                      <select
                        className="input"
                        value={selected.status}
                        onChange={(e) => setSelected((prev) => prev ? { ...prev, status: e.target.value } : prev)}
                      >
                        {STATUSES.slice(1).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Nächste Mahnung am</label>
                      <input
                        type="date"
                        className="input"
                        value={(selected as any).next_dunning_at || ''}
                        onChange={(e) => setSelected((prev: any) => prev ? { ...prev, next_dunning_at: e.target.value } : prev)}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-6 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={(selected as any).auto_dunning_enabled || false}
                        onChange={(e) => setSelected((prev: any) => prev ? { ...prev, auto_dunning_enabled: e.target.checked } : prev)}
                      />
                      <span>Automatische Mahn-E-Mails aktiv</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
                      disabled={statusSaving}
                      onClick={async () => {
                        if (!selected) return;
                        setStatusSaving(true);
                        const res = await fetch('/api/admin/bookings', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: selected.id,
                            status: selected.status,
                            next_dunning_at: (selected as any).next_dunning_at || null,
                            auto_dunning_enabled: (selected as any).auto_dunning_enabled ?? null,
                          }),
                        });
                        setStatusSaving(false);
                        if (!res.ok) {
                          const d = await res.json().catch(() => ({}));
                          alert(d.error || 'Status konnte nicht gespeichert werden.');
                        } else {
                          loadOne(selected.id);
                          load();
                        }
                      }}
                    >
                      Status speichern
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  const cls =
    tone === 'good'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
      : tone === 'warn'
        ? 'text-amber-700 bg-amber-50 border-amber-100'
        : 'text-slate-800 bg-white border-slate-200';
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</p>
      <p className="text-[15px] font-semibold">{value}</p>
    </div>
  );
}

function GlassCard({ label, value, tone, children }: { label: string; value: string; tone?: 'good' | 'warn'; children?: React.ReactNode }) {
  const toneCls = tone === 'good'
    ? 'from-emerald-400/30 to-emerald-500/10 border-emerald-200/40'
    : tone === 'warn'
      ? 'from-amber-400/30 to-amber-500/10 border-amber-200/40'
      : 'from-white/20 to-white/5 border-white/20';
  return (
    <div className={`rounded-2xl border ${toneCls} bg-gradient-to-br backdrop-blur-xl p-4 shadow-xl text-white`}> 
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 mb-2">{label}</p>
      <p className="text-2xl font-semibold mb-1">{value}</p>
      {children}
    </div>
  );
}

// Offene Saldenliste
function OpenSaldoTable({ items }: { items: BookingRow[] }) {
  const total = items.reduce((s, b) => s + (Number(b.open_amount ?? b.saldo ?? 0) || 0), 0);
  const sorted = [...items].sort((a, b) => Number(b.open_amount ?? b.saldo ?? 0) - Number(a.open_amount ?? a.saldo ?? 0));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
        <span>Offene Salden: {sorted.length} Buchungen</span>
        <span className="font-semibold text-pink-600">{total.toFixed(2)} € gesamt</span>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2 pr-4">Buchungsdatum</th>
            <th className="py-2 pr-4">Teilnehmer</th>
            <th className="py-2 pr-4">Kurs</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4 text-right">Offener Betrag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sorted.map((b) => {
            const open = Number(b.open_amount ?? b.saldo ?? 0) || 0;
            return (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="py-2 pr-4 text-slate-700">{b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</td>
                <td className="py-2 pr-4">
                  <div className="font-semibold text-ink">{b.student_name ?? '—'}</div>
                  <div className="text-xs text-slate-500">{b.partner_name ?? '—'}</div>
                </td>
                <td className="py-2 pr-4">
                  <div className="text-slate-800">{b.course_title ?? '—'}</div>
                  <div className="text-xs text-slate-500">Start: {b.course_start ? new Date(b.course_start).toLocaleDateString() : '—'}</div>
                </td>
                <td className="py-2 pr-4 text-xs">
                  <span className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {b.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-semibold text-pink-700">{open.toFixed(2)} €</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
