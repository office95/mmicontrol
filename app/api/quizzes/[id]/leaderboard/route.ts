import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Period = 'week' | 'month' | 'year' | 'all';

function dateRange(period: Period): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  if (period === 'all') return {};
  if (period === 'year') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
    return { from, to };
  }
  if (period === 'month') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    return { from, to };
  }
  // week (default): last 7 days
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service role key missing' }, { status: 500 });
  }
  const quizId = ctx.params.id;
  const url = new URL(req.url);
  const period = (url.searchParams.get('period') as Period) || 'year';
  const limit = Number(url.searchParams.get('limit') || 20);
  const { from, to } = dateRange(period);

  const supa = service();

  let q = supa
    .from('quiz_attempts')
    .select('alias,score,max_score,level_reached,duration_sec,completed_at,created_at', { head: false })
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('duration_sec', { ascending: true })
    .limit(limit);

  if (from) q = q.gte('completed_at', from);
  if (to) q = q.lte('completed_at', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data || []).map((r, idx) => ({
    rank: idx + 1,
    alias: r.alias || 'Player',
    score: r.score || 0,
    max_score: r.max_score || 0,
    level_reached: r.level_reached || 0,
    duration_sec: r.duration_sec || 0,
  }));

  return NextResponse.json(rows);
}
