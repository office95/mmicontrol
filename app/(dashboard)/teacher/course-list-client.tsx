'use client';

type Participant = { name: string; email: string; phone?: string | null };
type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  duration_hours?: number | null;
  participants: Participant[];
};

export default function CourseListClient({ courses }: { courses: CourseCard[] }) {
  return (
    <div className="space-y-4">
      {courses.map((c) => (
        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kurs</p>
              <h3 className="text-xl font-semibold text-ink">{c.title}</h3>
              <p className="text-sm text-slate-600">{c.description}</p>
              <p className="text-sm text-slate-500 mt-1">
                Start: {c.start_date ? new Date(c.start_date).toLocaleDateString() : 'kein Termin'} · Dauer:{' '}
                {c.duration_hours != null ? `${c.duration_hours} h` : '—'}
              </p>
            </div>
            <button
              className="self-start md:self-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => window.print()}
            >
              Liste drucken
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Teilnehmer</th>
                  <th className="py-2 pr-4">Telefon</th>
                  <th className="py-2 pr-4">E-Mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {c.participants.length === 0 && (
                  <tr>
                    <td className="py-2 pr-4 text-slate-500" colSpan={3}>Keine Teilnehmer eingetragen.</td>
                  </tr>
                )}
                {c.participants.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-4 text-ink">{p.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{p.phone || '—'}</td>
                    <td className="py-2 pr-4 text-pink-600">{p.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

