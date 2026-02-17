import { cookies, headers } from 'next/headers';
import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Supabase Client für Server Components
export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient({
    cookies: () => cookieStore,
  });
};

// Supabase Client für Route Handler (app/api)
export const createSupabaseRouteClient = () => {
  const cookieStore = cookies();
  const headerList = headers();
  return createRouteHandlerClient({
    cookies: () => cookieStore,
  });
};
