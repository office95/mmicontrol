'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export default function SupportSearch({ status }: { status: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get('q') || '');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTerm(searchParams.get('q') || '');
  }, [searchParams]);

  const update = (value: string) => {
    setTerm(value);
    startTransition(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (value) params.set('q', value); else params.delete('q');
      if (status) params.set('status', status);
      router.push(`/admin/support?${params.toString()}`);
    });
  };

  return (
    <input
      name="q"
      value={term}
      onChange={(e) => update(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      placeholder="Suche Betreff oder Ticket-Nr."
    />
  );
}
