'use client';

import { useState } from 'react';
import Link from 'next/link';

type NavLink = { href: string; label: string; badge?: number };

export default function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden relative">
      <button
        aria-label="Menü öffnen"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/40 text-white text-sm font-semibold hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lg leading-none">☰</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white text-sm font-semibold">Navigation</span>
            <button className="text-white text-lg leading-none px-2" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href as any}
                className="flex items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <span>{l.label}</span>
                {l.badge ? (
                  <span className="inline-flex min-w-[22px] h-5 px-2 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold">
                    {l.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
