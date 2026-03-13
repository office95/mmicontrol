import { createClient } from '@supabase/supabase-js';
import PrintTrigger from './print-trigger';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  student_name: string | null;
  course_title: string | null;
  invoice_number: string | null;
  booking_date: string | null;
  due_date: string | null;
  course_start: string | null;
  amount: number | null;
  price_net: number | null;
  vat_rate: number | null;
  deposit: number | null;
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
    .select(
      'id, student_name, course_title, invoice_number, booking_date, due_date, course_start, amount, price_net, vat_rate, deposit, status'
    )
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

  return (
    <div className="print-container">
      <PrintTrigger />
      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; }
        h1 { margin: 0 0 6px 0; font-size: 20px; letter-spacing: 0.02em; }
        .meta { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px 10px; font-size: 11px; margin-bottom: 10px; }
        .meta strong { display: block; font-size: 11.5px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
        th, td { padding: 6px 6px; border-bottom: 1px solid #dbe2f0; }
        th { background: #f3f6fb; color: #0b1c3f; font-weight: 700; }
        .num { text-align: right; white-space: nowrap; }
        .date { text-align: right; white-space: nowrap; }
        tr.overdue td { background: #fff1f2; }
        tr.due-soon td { background: #fff7ed; }
        .print-container { padding: 12mm; }
      `,
        }}
      />
      <h1>Offene Forderungen</h1>
      <div className="meta">
        <div><strong>Stichtag</strong> {today.toLocaleDateString('de-DE')}</div>
        <div><strong>Summe offen</strong> {sumOpen.toFixed(2)} €</div>
        <div><strong>Datensätze</strong> {rows.length}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: '12%' }}>Kunde</th>
            <th style={{ width: '12%' }}>Kurs</th>
            <th style={{ width: '8%' }}>Re.-Nr.</th>
            <th style={{ width: '8%' }}>Buchungsdatum</th>
            <th style={{ width: '8%' }}>Fällig</th>
            <th style={{ width: '8%' }}>Kursstart</th>
            <th className="num" style={{ width: '7%' }}>Netto</th>
            <th className="num" style={{ width: '6%' }}>USt %</th>
            <th className="num" style={{ width: '7%' }}>Anzahlung</th>
            <th className="num" style={{ width: '7%' }}>Betrag</th>
            <th className="num" style={{ width: '7%' }}>Bezahlt</th>
            <th className="num" style={{ width: '7%' }}>Offen</th>
            <th className="num" style={{ width: '5%' }}>Tage üf.</th>
            <th style={{ width: '5%' }}>Status</th>
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
                <td>{b.course_title ?? '—'}</td>
                <td>{b.invoice_number ?? '—'}</td>
                <td className="date">{formatDate(b.booking_date)}</td>
                <td className="date">{formatDate(b.due_date)}</td>
                <td className="date">{formatDate(b.course_start)}</td>
                <td className="num">{formatMoney(b.price_net)}</td>
                <td className="num">{b.vat_rate != null ? (Number(b.vat_rate) * 100).toFixed(1) : '—'}</td>
                <td className="num">{formatMoney(b.deposit)}</td>
                <td className="num">{formatMoney(b.gross)}</td>
                <td className="num">{formatMoney((b as any).paid)}</td>
                <td className="num">{formatMoney((b as any).open)}</td>
                <td className="num">{b.daysOver != null ? b.daysOver : '—'}</td>
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
