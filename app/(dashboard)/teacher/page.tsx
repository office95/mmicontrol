import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function TeacherPage() {
  const supabase = createSupabaseServerClient();
  // RLS sorgt dafür, dass nur eigene Kurse zurückkommen
  const { data: ownCourses } = await supabase.from('courses').select('id, title, description');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Meine Kurse</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {(ownCourses ?? []).map((c) => (
          <div key={c.id} className="card p-5 space-y-2">
            <p className="text-sm text-slate-500">Kurs</p>
            <h3 className="text-xl font-semibold text-ink">{c.title}</h3>
            <p className="text-slate-600 text-sm">{c.description}</p>
          </div>
        ))}
        {!ownCourses?.length && <p className="text-slate-600">Keine Kurse zugewiesen.</p>}
      </div>
    </div>
  );
}
