'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/providers/supabase-provider';
import { useProfile } from '@/hooks/useProfile';
import Spinner from '@/components/spinner';

export default function DashboardRedirect() {
  const router = useRouter();
  const { session, loading } = useSupabase();
  const { data: profile, isLoading } = useProfile();

  useEffect(() => {
    if (loading || isLoading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (profile && profile.approved === false) {
      router.replace('/pending');
      return;
    }
    if (profile?.role === 'admin') router.replace('/admin');
    else if (profile?.role === 'teacher') router.replace('/teacher');
    else router.replace('/student');
  }, [session, profile, loading, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  );
}
