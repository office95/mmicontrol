import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const selectCourses = async (teacherId: string) => {
  const { data } = await service
    .from('course_members')
    .select('course_id, courses(title)')
    .eq('user_id', teacherId)
    .eq('role', 'teacher');
  return (data ?? []).map((r) => ({ id: r.course_id as string, title: (r as any).courses?.title || '' }));
};

// GET: alle Dozenten (approved) mit Partner und Kursen
export async function GET() {
  // Profile ziehen (ohne Email, die kommt aus auth.users)
  const { data: teachers, error } = await service
    .from('profiles')
    .select('id, full_name, partner_id, approved, role')
    .eq('role', 'teacher');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = (teachers ?? []).map((t) => t.id);
  let emailMap: Record<string, string> = {};
  if (ids.length) {
    const { data: authUsers } = await service
      .from('auth.users')
      .select('id,email')
      .in('id', ids);
    emailMap = Object.fromEntries((authUsers ?? []).map((u: any) => [u.id, u.email]));
  }

  // Partner-Namen holen (falls partner_id existiert)
  let partnerMap: Record<string, string> = {};
  const partnerIds = Array.from(new Set((teachers ?? []).map((t: any) => t.partner_id).filter(Boolean)));
  if (partnerIds.length) {
    const { data: partners } = await service.from('partners').select('id,name').in('id', partnerIds);
    partnerMap = Object.fromEntries((partners ?? []).map((p: any) => [p.id, p.name]));
  }

  const enriched = await Promise.all(
    (teachers ?? []).map(async (t: any) => ({
      id: t.id,
      full_name: t.full_name,
      email: emailMap[t.id] ?? null,
      partner_id: t.partner_id || null,
      partner_name: t.partner_id ? partnerMap[t.partner_id] || null : null,
      courses: await selectCourses(t.id),
    }))
  );
  return NextResponse.json(enriched);
}

// PATCH: Partner + Kurse setzen
export async function PATCH(req: Request) {
  const body = await req.json();
  const { teacher_id, partner_id, course_ids = [] } = body;
  if (!teacher_id) return NextResponse.json({ error: 'teacher_id fehlt' }, { status: 400 });

  // Partner speichern (in profiles.partner_id annehmen)
  const { error: upErr } = await service
    .from('profiles')
    .update({ partner_id: partner_id || null })
    .eq('id', teacher_id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Kurszuweisungen (course_members) differenziell synchronisieren
  const uniqueIds = Array.from(new Set(course_ids.filter(Boolean)));
  const { data: current } = await service
    .from('course_members')
    .select('course_id')
    .eq('user_id', teacher_id)
    .eq('role', 'teacher');

  const currentIds = new Set((current ?? []).map((r: any) => r.course_id));
  const desired = new Set(uniqueIds);

  const toInsert = uniqueIds.filter((cid) => !currentIds.has(cid)).map((cid) => ({
    course_id: cid,
    user_id: teacher_id,
    role: 'teacher',
  }));
  const toDelete = Array.from(currentIds).filter((cid) => !desired.has(cid));

  if (toInsert.length) {
    const { error: insErr } = await service
      .from('course_members')
      .upsert(toInsert, { onConflict: 'course_id,user_id,role' });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  if (toDelete.length) {
    await service
      .from('course_members')
      .delete()
      .eq('user_id', teacher_id)
      .eq('role', 'teacher')
      .in('course_id', toDelete);
  }

  return NextResponse.json({ ok: true });
}
