import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

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

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select(
      'id, student_name, course_title, invoice_number, booking_date, due_date, course_start, amount, price_net, vat_rate, deposit, status'
    )
    .order('booking_date', { ascending: false });
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  const list: BookingRow[] = bookings ?? [];
  const ids = list.map((b) => b.id);

  let payments: PaymentRow[] = [];
  if (ids.length) {
    const { data: payRows, error: pErr } = await supabase
      .from('payments')
      .select('booking_id, amount')
      .in('booking_id', ids);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    payments = payRows ?? [];
  }

  const paidMap = payments.reduce<Record<string, number>>((acc, p) => {
    const v = Number(p.amount || 0);
    acc[p.booking_id] = (acc[p.booking_id] || 0) + v;
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

  // PDF generieren
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  const stream = new PassThrough();
  doc.pipe(stream);

  doc.fontSize(16).fillColor('#0a0f1a').text('Offene Forderungen', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#1f2937');
  doc.text(`Stichtag: ${today.toLocaleDateString('de-DE')}`);
  doc.text(`Datensätze: ${rows.length}`);
  const sumOpen = rows.reduce((s, r) => s + r.open, 0);
  doc.text(`Summe offen: ${sumOpen.toFixed(2)} €`);
  doc.moveDown(0.5);

  // Tabellenkopf und Zeilen mit Pagination
  const headers = [
    'Kunde',
    'Kurs',
    'Re.-Nr.',
    'Buchung',
    'Fällig',
    'Kursstart',
    'Netto',
    'USt %',
    'Anzahlung',
    'Betrag',
    'Bezahlt',
    'Offen',
    'Tage üf.',
    'Status',
  ];
  const colWidths = [90, 100, 60, 65, 65, 65, 55, 45, 65, 65, 65, 65, 50, 60];

  const drawHeader = () => {
    let hx = doc.x;
    let hy = doc.y;
    doc.fontSize(9).fillColor('#0a0f1a').font('Helvetica-Bold');
    headers.forEach((h, idx) => {
      doc.text(h, hx, hy, { width: colWidths[idx], continued: idx !== headers.length - 1 });
      hx += colWidths[idx];
    });
    doc.moveDown(0.5);
  };

  drawHeader();
  let y = doc.y;
  const rowHeight = doc.currentLineHeight() + 2;
  doc.font('Helvetica').fillColor('#111827');

  rows.forEach((r) => {
    // Prüfen, ob genug Platz für nächste Zeile, sonst neue Seite + Header
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
      drawHeader();
      y = doc.y;
      doc.font('Helvetica').fillColor('#111827');
    }

    const vals = [
      r.student_name ?? '—',
      r.course_title ?? '—',
      r.invoice_number ?? '—',
      formatDate(r.booking_date),
      formatDate(r.due_date),
      formatDate(r.course_start),
      r.price_net != null ? r.price_net.toFixed(2) : '—',
      r.vat_rate != null ? (Number(r.vat_rate) * 100).toFixed(1) : '—',
      r.deposit != null ? r.deposit.toFixed(2) : '—',
      r.gross != null ? r.gross.toFixed(2) : '—',
      r.paid != null ? r.paid.toFixed(2) : '—',
      r.open != null ? r.open.toFixed(2) : '—',
      r.daysOver != null ? String(r.daysOver) : '—',
      r.status ?? '—',
    ];
    let x = doc.x;
    vals.forEach((v, idx) => {
      doc.text(v, x, y, {
        width: colWidths[idx],
        continued: idx !== vals.length - 1,
        align: idx >= 6 && idx <= 12 ? 'right' : 'left',
      });
      x += colWidths[idx];
    });
    y = doc.y;
  });

  doc.end();

  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="offene-forderungen.pdf"`,
    },
  });
}
