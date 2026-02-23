'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = {
  href: string;
  label: string;
  badge?: number;
};

export default function SidebarNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => {
    const clean = href.split('?')[0];
    return pathname === clean || pathname.startsWith(clean + '/');
  };

  return (
    <nav className="flex-1 px-4 py-6 space-y-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href as any}
          className={`relative block rounded-lg px-5 py-3.5 text-[16px] md:text-[17px] font-semibold transition ${
            isActive(l.href)
              ? 'border border-pink-400 bg-pink-600/30 text-white shadow-lg shadow-pink-500/30'
              : 'border border-white/20 bg-white/12 text-white/90 hover:bg-white/20 hover:border-pink-300/60'
          }`}
        >
          {l.label}
          {l.badge ? (
            <span className="absolute -right-2 -top-2 h-6 min-w-[22px] px-1 rounded-full bg-rose-500 text-white text-[12px] font-semibold flex items-center justify-center">
              {l.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
