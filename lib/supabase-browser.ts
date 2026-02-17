import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Supabase Client für Client Components
export const createSupabaseBrowserClient = () =>
  createClientComponentClient();
