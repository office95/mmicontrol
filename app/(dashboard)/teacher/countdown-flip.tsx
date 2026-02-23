'use client';

import { useEffect, useState } from 'react';

export default function CountdownFlip({
  days,
  courseTitle,
}: {
  days: number | null;
  courseTitle: string;
}) {
  const frontText = days !== null && days >= 0 ? `${days} Tage` : 'Kurs läuft / vorbei';

  return (
    <div className="relative h-24 overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] uppercase tracking-[0.24em] text-white/70">Noch</span>
        <span className="text-2xl md:text-3xl font-extrabold leading-tight drop-shadow-lg text-white animate-pulse max-w-full text-center px-2 break-words leading-snug">
          {frontText}
        </span>
        <span className="text-[11px] uppercase tracking-[0.24em] text-white/70">bis Kursbeginn</span>
      </div>
    </div>
  );
}
