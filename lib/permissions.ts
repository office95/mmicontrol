import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function canAccess(role: string | null | undefined, page: string) {
  if (!role) return false;
  const { data } = await supabase
    .from('role_permissions')
    .select('allowed')
    .eq('role', role)
    .eq('page_slug', page)
    .maybeSingle();
  return data?.allowed === true;
}

export async function getPermissions(role: string | null | undefined) {
  if (!role) return {};
  const { data } = await supabase
    .from('role_permissions')
    .select('page_slug, allowed')
    .eq('role', role);
  const map: Record<string, boolean> = {};
  data?.forEach((row) => {
    map[row.page_slug] = row.allowed;
  });
  return map;
}

/**
 * Ensure given slugs exist in role_permissions for all roles.
 * Defaults: admin=true, teacher=false, student=false.
 */
export async function ensureSlugs(slugs: string[]) {
  if (!slugs.length) return;
  const rows: { role: string; page_slug: string; allowed: boolean }[] = [];
  slugs.forEach((slug) => {
    rows.push({ role: 'admin', page_slug: slug, allowed: true });
    rows.push({ role: 'teacher', page_slug: slug, allowed: false });
    rows.push({ role: 'student', page_slug: slug, allowed: false });
  });
  // nur fehlende Einträge anlegen, bestehende nicht überschreiben
  await supabase.from('role_permissions').upsert(rows, {
    onConflict: 'role,page_slug',
  });
}
