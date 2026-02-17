import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Material = {
  id: string;
  title: string;
  course_id: string | null;
  module_number: number | null;
  storage_path: string | null;
  cover_path: string | null;
  visibility: string | null;
  signed_url?: string | null;
  cover_url?: string | null;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StudentMaterialsPage() {
  const supabase = createSupabaseServerClient();
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loginEmail = (user?.email || '').toLowerCase();

  // Student holen
  const { data: student } = await service
    .from('students')
    .select('id')
    .eq('email', loginEmail)
    .maybeSingle();

  if (!student) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-white">Kursunterlagen</h1>
        <p className="text-slate-200">Kein Kursteilnehmer-Datensatz zu deiner E-Mail gefunden.</p>
      </div>
    );
  }

  // Kurs-IDs über course_members (user_id = auth.user.id / profiles.id)
  const { data: memberships } = await service
    .from('course_members')
    .select('course_id')
    .eq('user_id', user?.id ?? '');
  const courseIds = memberships?.map((m) => m.course_id).filter(Boolean) || [];

  if (!courseIds.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-white">Kursunterlagen</h1>
        <p className="text-slate-200">Du bist derzeit in keinen Kurs eingeschrieben.</p>
      </div>
    );
  }

  // Kurstitel laden
  const { data: courses } = await service
    .from('courses')
    .select('id, title')
    .in('id', courseIds);
  const courseTitle = (cid: string | null) =>
    courses?.find((c) => c.id === cid)?.title ?? 'Kurs';

  // Materialien laden (nur Sichtbarkeit students/both)
  const { data: materialsRaw } = await service
    .from('materials')
    .select('id, title, course_id, module_number, storage_path, cover_path, visibility')
    .in('course_id', courseIds)
    .in('visibility', ['students', 'both'])
    .order('module_number', { ascending: true });

  const materials: Material[] = materialsRaw || [];

  // Signed URLs erzeugen
  const withUrls: Material[] = [];
  for (const m of materials) {
    const fileUrl = m.storage_path
      ? (
          await service.storage
            .from('materials')
            .createSignedUrl(m.storage_path, 60 * 60)
        ).data?.signedUrl ?? null
      : null;
    const coverUrl = m.cover_path
      ? (
          await service.storage
            .from('materials')
            .createSignedUrl(m.cover_path, 60 * 60)
        ).data?.signedUrl ?? null
      : null;
    withUrls.push({ ...m, signed_url: fileUrl, cover_url: coverUrl });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/10 border border-white/15 rounded-xl p-5 shadow-lg">
        <p className="text-[12px] uppercase tracking-[0.28em] text-pink-200 mb-1">Kursunterlagen</p>
        <h1 className="text-3xl font-semibold text-white">
          Deine Materialien zu gebuchten Kursen
        </h1>
        <p className="text-sm text-white/80 mt-1">
          {courses?.map((c) => c.title).join(' · ') || 'Kurse'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {withUrls.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl bg-white/80 border border-slate-200 shadow-lg overflow-hidden flex flex-col"
          >
            <div className="relative h-40 bg-slate-100">
              {m.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.cover_url}
                  alt={m.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-400 text-sm">
                  Kein Cover
                </div>
              )}
              <div className="absolute top-3 left-3 inline-flex items-center px-3 py-1 rounded-full bg-black/60 text-white text-xs">
                {courseTitle(m.course_id)}
              </div>
              {m.module_number != null && (
                <div className="absolute top-3 right-3 inline-flex items-center px-3 py-1 rounded-full bg-pink-500 text-white text-xs">
                  Modul {m.module_number}
                </div>
              )}
            </div>
            <div className="p-4 space-y-2 flex-1 flex flex-col">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Kurs
                </p>
                <h3 className="text-lg font-semibold text-ink">{courseTitle(m.course_id)}</h3>
                <p className="text-sm text-slate-600">{m.title}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                {m.cover_url && (
                  <a
                    href={m.cover_url}
                    target="_blank"
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cover ansehen
                  </a>
                )}
                {m.signed_url && (
                  <a
                    href={m.signed_url}
                    target="_blank"
                    className="px-3 py-2 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600"
                  >
                    PDF / Datei laden
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {!withUrls.length && (
          <p className="text-slate-200">Keine Materialien für deine Kurse gefunden.</p>
        )}
      </div>
    </div>
  );
}
