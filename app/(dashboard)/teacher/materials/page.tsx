import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import TeacherMaterialsClient from './teacher-materials-client';

export default async function TeacherMaterialsPage() {
  const supabase = createSupabaseServerClient();
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Kurse, für die der Lehrer berechtigt ist
  const { data: memberships } = await service
    .from('course_members')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('role', 'teacher');

  const courseIds = memberships?.map((m) => m.course_id).filter(Boolean) || [];

  let courses: { id: string; title: string }[] = [];
  if (courseIds.length) {
    const { data: courseRows } = await service
      .from('courses')
      .select('id, title')
      .in('id', courseIds);
    courses = courseRows || [];
  }

  // Materialien, die zu diesen Kursen gehören und für teacher sichtbar sind
  let materials: {
    id: string;
    title: string;
    course_id: string;
    course_title: string | null;
    module_id: string | null;
    module_number: number | null;
    type: string | null;
    storage_path: string | null;
    cover_path: string | null;
    created_at: string | null;
    visibility: string | null;
  }[] = [];

  if (courseIds.length) {
    const { data: materialRows } = await service
      .from('materials')
      .select('id, title, course_id, module_id, module_number, type, storage_path, cover_path, created_at, visibility, courses(title)')
      .in('course_id', courseIds)
      .in('visibility', ['teachers', 'both']);

    materials = (materialRows || []).map((m) => ({
      id: m.id,
      title: m.title,
      course_id: m.course_id,
      module_id: m.module_id,
      module_number: m.module_number,
      type: m.type,
      storage_path: m.storage_path,
      cover_path: m.cover_path,
      created_at: m.created_at,
      visibility: m.visibility,
      course_title: (m as any).courses?.title ?? null,
    }));
  }

  return <TeacherMaterialsClient courses={courses} materials={materials} />;
}
