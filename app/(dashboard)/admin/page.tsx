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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        </div>
      </div>

      <div className="grid gap-5 md:gap-7 grid-cols-1 md:grid-cols-4">
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
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-6 space-y-2 text-[15px] md:text-base">
      <p className="text-sm md:text-[15px] text-slate-500">{label}</p>
      <p className="text-3xl md:text-4xl font-semibold text-ink">{value}</p>
    </div>
  );
}
