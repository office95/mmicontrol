'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/providers/supabase-provider';

export function useProfile() {
  const { supabase, session } = useSupabase();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!session) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });
}
