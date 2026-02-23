'use client';

import { useEffect, useState } from 'react';

export default function CountdownFlip({
  days,
  courseTitle,
}: {
  days: number | null;
  courseTitle: string;
}) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setFlipped((f) => !f), 5000);
    return () => clearInterval(id);
  }, []);

  const frontText = days !== null && days >= 0 ? `${days} Tage` : 'Kurs läuft / vorbei';
  const backText = courseTitle ? courseTitle : 'Kurs noch nicht geplant';

  return (
    <div className="relative h-24 overflow-hidden">
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ${
          flipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <span className="text-[11px] uppercase tracking-[0.24em] text-white/70">Noch</span>
        <span className="text-2xl md:text-3xl font-extrabold leading-tight drop-shadow-lg text-white animate-pulse max-w-full text-center px-2 break-words leading-snug">
          {frontText}
        </span>
        <span className="text-[11px] uppercase tracking-[0.24em] text-white/70">bis Kursbeginn</span>
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-4 w-full">
          <div className="text-center text-2xl md:text-3xl font-extrabold leading-snug drop-shadow-lg text-white animate-pulse max-w-full break-words hyphens-auto">
            {backText}
          </div>
        </div>
      </div>
    </div>
  );
}
