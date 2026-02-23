import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function currentUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function membershipCourseIds(userId: string, supa: ReturnType<typeof service>) {
  const { data } = await supa
    .from('course_members')
    .select('course_id')
    .eq('user_id', userId);
  return (data ?? []).map((r) => r.course_id).filter(Boolean);
}

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supa = service();
  const { data: profile } = await supa.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  const courseIds = isAdmin ? null : await membershipCourseIds(user.id, supa);

  const query = supa
    .from('quizzes')
    .select('id,title,description,course_id,module_id,level_count,time_per_question,allow_mixed_modules,is_published,created_at,courses(title),modules(module_number)')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query.eq('is_published', true);
    if (!courseIds || !courseIds.length) return NextResponse.json([]);
    query.in('course_id', courseIds as string[]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(
    (data || []).map((q: any) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      course_id: q.course_id,
      course_title: q.courses?.title ?? null,
      module_id: q.module_id,
      module_number: q.modules?.module_number ?? null,
      level_count: q.level_count,
      time_per_question: q.time_per_question,
      allow_mixed_modules: q.allow_mixed_modules,
      is_published: q.is_published,
      created_at: q.created_at,
    }))
  );
}
