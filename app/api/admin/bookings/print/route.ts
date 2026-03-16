import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  invoice_number: string | null;
  payment_date: string | null;
  amount: number | null;
  method: string | null;
  note: string | null;
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('de-DE');
}

const moneyFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (v: number | null) => (v == null || isNaN(v) ? '—' : moneyFmt.format(Number(v)));

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
      .select('booking_id, invoice_number, payment_date, amount, method, note')
      .in('booking_id', ids);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    payments = payRows ?? [];
  }

  const paidMap = payments.reduce<Record<string, number>>((acc, p) => {
    const v = Number(p.amount || 0);
    acc[p.booking_id] = (acc[p.booking_id] || 0) + v;
    return acc;
  }, {});

  const paymentsByBooking = payments.reduce<Record<string, PaymentRow[]>>((acc, p) => {
    const list = acc[p.booking_id] || [];
    list.push(p);
    acc[p.booking_id] = list;
    return acc;
  }, {});

  const today = new Date();
  const todayYmd = today.toISOString().slice(0, 10);

  const rowsAll = list.map((b) => {
    const paid = paidMap[b.id] ?? 0;
    const gross = b.amount ?? 0;
    const open = Math.max(0, Number((gross - paid).toFixed(2)));
    const daysOver =
      b.due_date && b.due_date < todayYmd
        ? Math.max(0, Math.floor((today.getTime() - new Date(b.due_date).getTime()) / 86400000))
        : null;
    return { ...b, paid, open, daysOver, gross };
  });

  // Abgeschlossene ausblenden
  const rows = rowsAll.filter((r) => (r.status ?? '').toLowerCase() !== 'abgeschlossen');

  // PDF generieren
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 14 });
  const stream = new PassThrough();
  doc.pipe(stream);

  doc.y = 18;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0a0f1a').text('Offene Ford. – MM', { align: 'left' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(8.0).fillColor('#1f2937');
  doc.text(`Stichtag: ${today.toLocaleDateString('de-DE')}`);
  doc.text(`Datensätze: ${rows.length}`);
  const sumOpen = rows.reduce((s, r) => s + r.open, 0);
  doc.text(`Summe offen: ${formatMoney(sumOpen)} €`);
  doc.moveDown(0.6); // etwas mehr Abstand vor der Tabelle

  if (!rows.length) {
    doc.fontSize(11).fillColor('#111827').text('Keine Buchungen gefunden.', { align: 'left' });
    doc.end();
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="offene-forderungen.pdf"`,
      },
    });
  }

  // Tabellenkopf und Zeilen mit Pagination
  const headers: string[][] = [
    ['Auftragsnr'],
    ['Buch.dat'],
    ['Fällig'],
    ['Kunde'],
    ['Kursbetr. brutto'],
    ['USt %'],
    ['Offen'],
    ['Status'],
  ];
  // Noch mehr Abstand zwischen Brutto und USt (breitere USt-Spalte + kleiner Gap)
  const colWidths = [55, 55, 55, 110, 94, 72, 70, 72];
  const gapLastCols = 10;
  const tableWidth = colWidths.reduce((s, w) => s + w, 0) + gapLastCols;
  const contentWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const tableStartX = () => doc.page.margins.left + Math.max(0, (contentWidth() - tableWidth) / 2);

  const pageBottom = () => doc.page.height - doc.page.margins.bottom;

  const drawHeader = () => {
    const baseY = doc.y;
    const lineH = 6.8;
    const startX = tableStartX();
    const headerHeight = lineH * 2 + 1.2;

    // Hintergrund hellpink für Tabellenkopf
    doc.save();
    doc.rect(startX - 1, baseY - 0.6, tableWidth + 2, headerHeight + 0.6).fill('#ffe6ee');
    doc.restore();

    headers.forEach((lines, idx) => {
      const baseX = startX + colWidths.slice(0, idx).reduce((s, w) => s + w, 0);
      const x = idx === headers.length - 1 ? baseX + gapLastCols : baseX;
      lines.forEach((ln, i) => {
        doc.font('Helvetica-Bold').fontSize(6.6).fillColor('#0a0f1a');
        const offsetX = idx === 5 ? x + 6 : x; // etwas Luft vor USt
        doc.text(ln, offsetX, baseY + i * lineH, {
          width: colWidths[idx] - (idx === headers.length - 1 ? 2 : 0), // etwas luft für letzte Spalte
          align: idx === 4 || idx === 6 ? 'right' : 'left',
          lineBreak: false,
        });
      });
    });
    doc.y = baseY + headerHeight; // max 2 Zeilen + kleiner Abstand
    doc.font('Helvetica').fillColor('#111827').fontSize(6.4);
  };

  drawHeader();
  let y = doc.y;

  rows.forEach((r, idxRow) => {
    const vals = [
      r.invoice_number ?? '—',
      formatDate(r.booking_date),
      formatDate(r.due_date),
      r.student_name ?? '—',
      formatMoney(r.gross),
      r.vat_rate != null ? (Number(r.vat_rate) * 100).toFixed(1) : '—',
      formatMoney(r.open),
      r.status ?? '—',
    ];

    // Dynamische Zeilenhöhe pro Zeile (max Höhe der Zellen)
    const heights = vals.map((v, idx) =>
      doc.heightOfString(v, {
        width: colWidths[idx],
        lineGap: 0.3,
        align: idx === 4 || idx === 6 ? 'right' : 'left',
      })
    );
    const rowHeight = Math.max(...heights, 7) + 3.0; // noch mehr Puffer für Zeilenabstand

    if (y + rowHeight > pageBottom()) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
      drawHeader();
      y = doc.y;
    }

    // dezente Zebra-Hinterlegung
    if (idxRow % 2 === 0) {
      doc.save();
      doc.rect(tableStartX(), y - 1, tableWidth, rowHeight + 1.5).fill('#f8fafc');
      doc.restore();
    }

    let x = tableStartX();
    vals.forEach((v, idx) => {
      if (idx === headers.length - 1) x += gapLastCols;
      const offsetX = idx === 5 ? x + 6 : x; // USt-Spalte leicht einrücken
      doc.text(v, offsetX, y, {
        width: colWidths[idx],
        align: idx === 4 || idx === 6 ? 'right' : 'left',
        lineBreak: true,
        ellipsis: false,
      });
      x += colWidths[idx];
    });
    y += rowHeight;
    doc.y = y;

    // Zahlungsdetails unter der Zeile
    const pays = (paymentsByBooking[r.id] || []).slice().sort((a, b) => {
      const da = a.payment_date || '';
      const db = b.payment_date || '';
      return da.localeCompare(db);
    });
    if (pays.length) {
      const colW = [70, 70, 60, 90, tableWidth - (70 + 70 + 60 + 90)];
      const startX = tableStartX();
      const payFont = 'Helvetica';
      const paySize = 6.4;
      const baseY = y + 2;

      const labels = ['Re.-Nr.', 'Zahl.dat.', 'Betrag', 'Methode', 'Anmerk.'];
      let py = baseY;

      pays.forEach((p) => {
        const amount = formatMoney(p.amount);
        const rowH = 9.5;
        if (py + rowH > pageBottom()) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          drawHeader();
          y = doc.y;
          py = y + 2;
        }
        let px = startX;
        const cells = [p.invoice_number || '—', formatDate(p.payment_date), amount, p.method || '—', p.note || '—'];
        cells.forEach((cell, idx) => {
          doc.font(payFont).fontSize(paySize).fillColor('#0f172a');
          const label = labels[idx];
          doc.text(`${label} ${cell}`, px + 2, py, {
            width: colW[idx] - 3,
            align: idx === 2 ? 'right' : 'left',
            lineBreak: true,
          });
          px += colW[idx];
        });
        py += rowH;
      });
      y = py + 6; // spacing after payments
      doc.y = y;
    }

    // Extra Abstand + Trennlinie zwischen Aufträgen
    if (y + 10 > pageBottom()) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
      drawHeader();
      y = doc.y;
    }
    doc.moveTo(tableStartX(), y + 2).lineTo(tableStartX() + tableWidth, y + 2).strokeColor('#e2e8f0').lineWidth(0.7).stroke();
    y += 8;
    doc.y = y;
  });

  doc.end();

  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="offene-forderungen.pdf"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
