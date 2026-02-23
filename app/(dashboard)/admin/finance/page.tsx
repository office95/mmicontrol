import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminFinancePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Umsatz & Kosten aggregiert (Monat, Jahr, Vorjahr)
  const { data: revenueAggRaw } = await supabase.rpc('finance_revenue_summary').single();
  const revenueAgg = revenueAggRaw || {} as any;
  const { data: costAggRaw } = await supabase.rpc('finance_cost_summary').single();
  const costAgg = costAggRaw || {} as any;

  // Kosten nach Kategorie
  const { data: costByCat } = await supabase.rpc('finance_cost_by_category');

  // Offene Forderungen (Saldo > 0)
  const { data: openInvoices } = await supabase
    .from('bookings')
    .select('id, booking_date, course_title, student_name, saldo')
    .gt('saldo', 0)
    .order('booking_date', { ascending: false })
    .limit(10);

  // Kurs-Umsatz Top 5
  const { data: topCourses } = await supabase.rpc('finance_top_courses');

  return (
    <main className="space-y-6">
      <header className="grid gap-4 md:grid-cols-3">
        <StatCard title="Umsatz Monat" value={revenueAgg?.month_current ?? 0} delta={revenueAgg?.month_delta ?? 0} fmt="€" />
        <StatCard title="Umsatz Jahr" value={revenueAgg?.year_current ?? 0} delta={revenueAgg?.year_delta ?? 0} fmt="€" />
        <StatCard title="Offene Forderungen" value={openInvoices?.reduce((s, b) => s + (b.saldo || 0), 0) ?? 0} fmt="€" />
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Kosten nach Kategorie">
          <div className="space-y-3">
            {(costByCat || []).map((row: any) => (
              <div key={row.category_name || 'uncat'} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                <span>{row.category_name || 'Unkategorisiert'}</span>
                <span className="font-semibold">{formatEuro(row.amount)}</span>
              </div>
            ))}
            {!costByCat?.length && <p className="text-sm text-white/70">Keine Kostendaten vorhanden.</p>}
          </div>
        </Panel>

        <Panel title="Top Kurse nach Umsatz (YTD)">
          <div className="space-y-2 text-sm text-white/90">
            {(topCourses || []).map((c: any, idx: number) => (
              <div key={c.course_id || idx} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="font-semibold">{c.title || 'Kurs'}</p>
                  <p className="text-xs text-white/60">{c.participants ?? 0} TN</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatEuro(c.revenue)}</p>
                  <p className="text-xs text-emerald-300">Ø TN: {c.avg_rev_per_student ? formatEuro(c.avg_rev_per_student) : '—'}</p>
                </div>
              </div>
            ))}
            {!topCourses?.length && <p className="text-sm text-white/70">Keine Umsatzzahlen gefunden.</p>}
          </div>
        </Panel>
      </div>

      <Panel title="Offene Forderungen (Top 10)">
        <div className="divide-y divide-white/10 text-sm text-white/90">
          {(openInvoices || []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold">{b.course_title || 'Kurs'}</p>
                <p className="text-xs text-white/60">{b.student_name || 'Teilnehmer'} · {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}</p>
              </div>
              <p className="font-semibold text-amber-200">{formatEuro(b.saldo)}</p>
            </div>
          ))}
          {!openInvoices?.length && <p className="text-sm text-white/70 py-2">Keine offenen Forderungen.</p>}
        </div>
      </Panel>
    </main>
  );
}

function StatCard({ title, value, delta, fmt = '€' }: { title: string; value: number; delta?: number; fmt?: '€' | '' }) {
  const trend = delta ?? 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-4 shadow-xl text-white">
      <p className="text-xs uppercase tracking-[0.24em] text-white/60">{title}</p>
      <p className="text-3xl font-bold mt-1">{fmt === '€' ? formatEuro(value) : value}</p>
      {delta !== undefined && (
        <p className={`text-sm font-semibold ${trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs. Vorjahr
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function formatEuro(val?: number | null) {
  const n = Number(val || 0);
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 });
}
