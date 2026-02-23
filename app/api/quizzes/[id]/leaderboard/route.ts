import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function currentUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function hasAccess(userId: string, quizId: string, supa: ReturnType<typeof service>) {
  const { data: profile } = await supa.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile?.role === 'admin') return true;
  const { data: quiz } = await supa.from('quizzes').select('course_id').eq('id', quizId).maybeSingle();
  if (!quiz) return false;
  const { count } = await supa
    .from('course_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', quiz.course_id);
  return (count ?? 0) > 0;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }

  const quizId = ctx.params.id;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supa = service();
  const allowed = await hasAccess(user.id, quizId, supa);
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 20);
  const period = searchParams.get('period'); // optional week/month

  const since = (() => {
    if (period === 'week') return new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    if (period === 'month') return new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    return null;
  })();

  const query = supa
    .from('quiz_attempts')
    .select('alias,score,max_score,level_reached,duration_sec,created_at')
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('duration_sec', { ascending: true })
    .limit(Math.min(limit, 100));

  if (since) query.gte('created_at', since);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const toAlias = (val: string | null) => val || 'Player-' + Math.floor(Math.random() * 9000 + 1000);

  return NextResponse.json(
    (data || []).map((row: any, index: number) => ({
      rank: index + 1,
      alias: toAlias(row.alias),
      score: row.score,
      max_score: row.max_score,
      level_reached: row.level_reached,
      duration_sec: row.duration_sec,
      created_at: row.created_at,
    }))
  );
}
