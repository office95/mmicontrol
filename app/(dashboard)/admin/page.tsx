import Link from 'next/link';
import PendingApprovals from '@/components/pending-approvals';
import { createClient } from '@supabase/supabase-js';
// Kurs-Management ist auf eigener Seite /admin/courses

export const revalidate = 0; // always fresh
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Service client to bypass RLS for counts/pending
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pending } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('approved', false)
    .order('created_at', { ascending: false });
  const { data: courses } = await supabase.from('courses').select('id');
  const { data: teachers } = await supabase.from('profiles').select('id').eq('role', 'teacher');
  const { data: students } = await supabase.from('profiles').select('id').eq('role', 'student');

  // Partner & Feedback KPIs
  const { data: partners } = await supabase.from('partners').select('id, name');
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('partner_id, partner_name, booking_date, amount')
    .gte('booking_date', `${currentYear - 1}-01-01`);

  // Feedbacks mit Kurs-Partner-Zuordnung
  const { data: feedback } = await supabase
    .from('course_feedback')
    .select('course_id, ratings, recommend, courses(id, partner_id, title)');

  const courseFeedback = new Map<
    string,
    { title: string; count: number; sumOverall: number; recommendYes: number }
  >();
  (feedback || []).forEach((f: any) => {
    const cid = f.course_id;
    if (!cid) return;
    const recYes = (f.recommend || '').toLowerCase() === 'ja' ? 1 : 0;
    const entry = courseFeedback.get(cid) || {
      title: f.courses?.title ?? 'Kurs',
      count: 0,
      sumOverall: 0,
      recommendYes: 0,
    };
    entry.count += 1;
    entry.sumOverall += Number(f.ratings?.overall ?? 0);
    entry.recommendYes += recYes;
    courseFeedback.set(cid, entry);
  });

  const sum = (arr: any[]) => arr.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  const perPartner = (partners || []).map((p) => {
    const list = (bookings || []).filter((b) => b.partner_id === p.id);
    const fbList = (feedback || []).filter((f: any) => f.courses?.partner_id === p.id);
    const fbCount = fbList.length;
    const fbAvg =
      fbCount > 0
        ? Number(
            (
              fbList.reduce((acc: number, f: any) => acc + Number(f.ratings?.overall ?? 0), 0) /
              fbCount
            ).toFixed(1)
          )
        : 0;
    const fbRecYes = fbList.filter((f: any) => (f.recommend || '').toLowerCase() === 'ja').length;
    const fbRecPct = fbCount ? Math.round((fbRecYes / fbCount) * 100) : 0;

    const monthNow = list.filter((b) => {
      const d = b.booking_date ? new Date(b.booking_date) : null;
      return d && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const monthPrev = list.filter((b) => {
      const d = b.booking_date ? new Date(b.booking_date) : null;
      return d && d.getFullYear() === currentYear - 1 && d.getMonth() === currentMonth;
    });
    const yearNow = list.filter((b) => {
      const d = b.booking_date ? new Date(b.booking_date) : null;
      return d && d.getFullYear() === currentYear;
    });
    const yearPrev = list.filter((b) => {
      const d = b.booking_date ? new Date(b.booking_date) : null;
      return d && d.getFullYear() === currentYear - 1;
    });

    return {
      id: p.id,
      name: p.name || 'Ohne Partner',
      bookingsMonth: monthNow.length,
      bookingsMonthPrev: monthPrev.length,
      bookingsYear: yearNow.length,
      bookingsYearPrev: yearPrev.length,
      revenueMonth: sum(monthNow),
      revenueMonthPrev: sum(monthPrev),
      revenueYear: sum(yearNow),
      revenueYearPrev: sum(yearPrev),
      fbCount,
      fbAvg,
      fbRecPct,
    };
  });

  // Kurs-Feedback Aggregation (alle Kurse)
  const courseFeedbackList = Array.from(courseFeedback.entries()).map(([id, v]) => {
    const avg = v.count ? Number((v.sumOverall / v.count).toFixed(1)) : 0;
    const recPct = v.count ? Math.round((v.recommendYes / v.count) * 100) : 0;
    return {
      id,
      title: v.title,
      avg,
      count: v.count,
      recPct,
    };
  }).sort((a, b) => b.avg - a.avg);

  // Benefits (Verwaltung-Übersicht)
  const { data: benefits } = await supabase
    .from('benefit_companies')
    .select('id, name, status, target, action_title, discount_type, discount_value, code, valid_from, valid_to, country')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        </div>
      </div>

      <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-4 text-[17px] md:text-[18px]">
        <StatCard label="Offene Freigaben" value={pending?.length ?? 0} />
        <StatCard label="Gesamt Dozenten" value={teachers?.length ?? 0} />
        <StatCard label="Gesamt Teilnehmer" value={students?.length ?? 0} />
        <StatCard label="Gesamt Kurse" value={courses?.length ?? 0} />
      </div>

      <div className="card shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Offene Nutzer-Freigaben</h2>
        </div>
        <PendingApprovals users={pending ?? []} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Partner KPIs</h2>
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
          {perPartner.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-white/90">
                <KpiBox label="Buchungen Monat" value={p.bookingsMonth} prev={p.bookingsMonthPrev} />
                <KpiBox label="Buchungen Jahr" value={p.bookingsYear} prev={p.bookingsYearPrev} />
                <KpiBox label="Umsatz Monat" value={p.revenueMonth} prev={p.revenueMonthPrev} money />
                <KpiBox label="Umsatz Jahr" value={p.revenueYear} prev={p.revenueYearPrev} money />
                <KpiBox label="Ø Feedback" value={p.fbAvg} prev={0} suffix="/5" />
                <KpiBox label="Weiterempf." value={p.fbRecPct} prev={0} suffix="%" />
                <KpiBox label="# Feedbacks" value={p.fbCount} prev={0} />
              </div>
            </div>
          ))}
          {(!perPartner || perPartner.length === 0) && (
            <p className="text-white/80">Keine Partner vorhanden.</p>
          )}
        </div>
      </div>

      {/* Kurs-Feedback gesamt entfernt laut Anforderung */}

      <div className="card shadow-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Benefits (Firmen-Vorteile)</h2>
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 text-white px-3 py-2 text-sm font-semibold hover:bg-pink-500"
          >
            Neu anlegen (bald)
          </Link>
        </div>
        <p className="text-sm text-slate-600">Aktive und geplante Vorteile für Dozenten/Studierende.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(benefits || []).map((b) => {
            const statusColor =
              b.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              b.status === 'inactive' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              'bg-slate-100 text-slate-700 border-slate-200';
            const targetLabel =
              b.target === 'teachers' ? 'Dozenten' :
              b.target === 'students' ? 'Studierende' : 'Beide';
            const discountLabel =
              b.discount_type === 'percent' ? `${b.discount_value ?? ''}%` :
              b.discount_type === 'fixed' ? `${b.discount_value ?? ''} €` :
              'Vorteil';
            return (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ink">{b.name}</h3>
                  <span className={`text-[11px] px-2 py-1 rounded-full border ${statusColor}`}>{b.status}</span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{b.action_title ?? '—'}</p>
                <p className="text-xs text-slate-500">Zielgruppe: {targetLabel}</p>
                <p className="text-xs text-pink-700 font-semibold">Vorteil: {discountLabel}</p>
                <p className="text-xs text-slate-500">Code: {b.code || '—'}</p>
                <p className="text-xs text-slate-500">
                  Gültig: {b.valid_from ? new Date(b.valid_from).toLocaleDateString() : 'sofort'} – {b.valid_to ? new Date(b.valid_to).toLocaleDateString() : 'offen'}
                </p>
                <p className="text-[11px] text-slate-500">Land: {b.country || '—'}</p>
              </div>
            );
          })}
          {(!benefits || !benefits.length) && (
            <p className="text-slate-600">Noch keine Benefits angelegt.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-7 space-y-3 text-[17px] md:text-[18px]">
      <p className="text-[15px] md:text-[16px] text-slate-500">{label}</p>
      <p className="text-4xl md:text-5xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function KpiBox({ label, value, prev, money = false, suffix = '' }: { label: string; value: number; prev: number; money?: boolean; suffix?: string }) {
  const format = (n: number) => (money ? `${n.toFixed(2)} €` : `${n}${suffix}`);
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 shadow">
      <p className="text-xs uppercase tracking-[0.14em] text-white/70">{label}</p>
      <p className="text-xl font-semibold text-white">{format(value)}</p>
      <p className="text-[11px] text-white/60">Vorjahr: {format(prev)}</p>
    </div>
  );
}
