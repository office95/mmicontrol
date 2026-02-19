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
  const backText = courseTitle ? courseTitle : 'Noch kein Kurs geplant';

  return (
    <div className="relative h-16 overflow-hidden">
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          flipped ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="text-3xl font-extrabold leading-tight drop-shadow-lg text-white animate-pulse">
          {frontText}
        </span>
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          flipped ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-3xl font-extrabold leading-tight drop-shadow-lg text-white animate-pulse">
          {backText}
        </span>
      </div>
    </div>
  );
}
