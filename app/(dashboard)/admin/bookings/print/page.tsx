import { createClient } from '@supabase/supabase-js';
import PrintTrigger from './print-trigger';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  student_name: string | null;
  invoice_number: string | null;
  booking_date: string | null;
  due_date: string | null;
  amount: number | null;
  status: string | null;
};

type PaymentRow = {
  booking_id: string;
  amount: number | null;
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('de-DE');
}

function formatMoney(v: number | null): string {
  if (v == null || isNaN(v)) return '—';
  return v.toFixed(2) + ' €';
}

export default async function PrintBookings() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return (
      <div className="print-container">
        <p>SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, student_name, invoice_number, booking_date, due_date, amount, status')
    .order('booking_date', { ascending: false });

  const list: BookingRow[] = bookings ?? [];
  const ids = list.map((b) => b.id);

  let payments: PaymentRow[] = [];
  if (ids.length) {
    const { data: payRows } = await supabase
      .from('payments')
      .select('booking_id, amount')
      .in('booking_id', ids);
    payments = payRows ?? [];
  }

  const paidMap = payments.reduce<Record<string, number>>((acc, p) => {
    const v = Number(p.amount || 0);
    if (!acc[p.booking_id]) acc[p.booking_id] = 0;
    acc[p.booking_id] += v;
    return acc;
  }, {});

  const today = new Date();
  const todayYmd = today.toISOString().slice(0, 10);

  const rows = list.map((b) => {
    const paid = paidMap[b.id] ?? 0;
    const gross = b.amount ?? 0;
    const open = Math.max(0, Number((gross - paid).toFixed(2)));
    const daysOver =
      b.due_date && b.due_date < todayYmd
        ? Math.max(0, Math.floor((today.getTime() - new Date(b.due_date).getTime()) / 86400000))
        : null;
    return { ...b, paid, open, daysOver, gross };
  });

  const sumOpen = rows.reduce((s, r) => s + r.open, 0);
  const overdue = rows.filter((r) => (r.daysOver ?? 0) > 0 && r.open > 0);
  const sumOverdue = overdue.reduce((s, r) => s + r.open, 0);

  return (
    <div className="print-container">
      <PrintTrigger />
      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0a0f1a; margin: 0; background: white !important; }
        header, aside, .no-print { display: none !important; }
        h1 { margin: 0 0 4px 0; font-size: 20px; letter-spacing: 0.01em; }
        .meta { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px 10px; font-size: 11px; margin-bottom: 10px; }
        .meta strong { display: block; font-size: 11.5px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
        th, td { padding: 7px 7px; border-bottom: 1px solid #e2e8f0; color: #0a0f1a; }
        th { background: #f1f5f9; color: #0a1533; font-weight: 700; }
        .num { text-align: right; white-space: nowrap; }
        .date { text-align: right; white-space: nowrap; }
        tr.overdue td { background: #fff1f2; }
        tr.due-soon td { background: #fff7ed; }
        .print-container { padding: 6mm 10mm 10mm 10mm; }
      `,
        }}
      />
      <h1>Offene Forderungen</h1>
      <div className="meta">
        <div><strong>Stichtag</strong> {today.toLocaleDateString('de-DE')}</div>
        <div><strong>Summe offen</strong> {sumOpen.toFixed(2)} €</div>
        <div><strong>Offene Positionen</strong> {rows.length}</div>
        <div><strong>Überfällig</strong> {overdue.length} / {sumOverdue.toFixed(2)} €</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Kunde</th>
            <th style={{ width: '12%' }}>Beleg</th>
            <th style={{ width: '12%' }}>Rech.datum</th>
            <th style={{ width: '12%' }}>Fällig</th>
            <th className="num" style={{ width: '14%' }}>Offen (€)</th>
            <th className="num" style={{ width: '10%' }}>Tage üf.</th>
            <th style={{ width: '12%' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const rowClass =
              b.open > 0 && b.due_date
                ? b.due_date < todayYmd
                  ? 'overdue'
                  : b.due_date <= today.toISOString().slice(0, 10)
                    ? 'due-soon'
                    : ''
                : '';
            return (
              <tr key={b.id} className={rowClass}>
                <td>{b.student_name ?? '—'}</td>
                <td>{b.invoice_number ?? '—'}</td>
                <td className="date">{formatDate(b.booking_date)}</td>
                <td className="date">{formatDate(b.due_date)}</td>
                <td className="num">{formatMoney((b as any).open)}</td>
                <td className="num">{b.daysOver != null && b.daysOver > 0 ? b.daysOver : '—'}</td>
                <td>{b.status ?? '—'}</td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={14} style={{ textAlign: 'center', padding: '18px 0' }}>
                Keine Buchungen gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
