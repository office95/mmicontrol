'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string };

export default function TopNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const clean = href.split('?')[0];
    return pathname === clean || pathname.startsWith(clean + '/') || href === pathname;
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-lg">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href as any}
          className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-semibold transition ${
            isActive(l.href)
              ? 'border-2 border-pink-400 bg-white/5 text-white shadow-lg shadow-pink-500/30'
              : 'border-white/15 bg-white/5 text-white hover:border-white/25 hover:bg-white/10'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
