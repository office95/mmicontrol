'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type NavLink = { href: string; label: string };

export default function TopNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    if (pathname !== path) return false;
    if (!query) {
      // Nur aktiv, wenn keine Tab-Parameter gesetzt sind
      return !searchParams.has('tab');
    }
    const target = new URLSearchParams(query);
    for (const [k, v] of target.entries()) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-lg">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href as any}
          className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-semibold transition ${
            isActive(l.href)
              ? 'border-pink-400 bg-white text-slate-900 shadow-lg'
              : 'border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/10'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
