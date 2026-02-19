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

  const frontText = days !== null && days >= 0 ? `Noch ${days} Tage bis Kursbeginn` : 'Kurs läuft / vorbei';
  const backText = courseTitle ? `Nächster Kurs: ${courseTitle}` : 'Noch kein Kurs geplant';

  return (
    <div className="relative h-16" style={{ perspective: '1000px' }}>
      <div
        className={`absolute inset-0 transition-transform duration-900 ease-[cubic-bezier(0.3,0.7,0.2,1.1)] [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-3xl font-extrabold leading-tight drop-shadow-lg text-white">{frontText}</span>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center [transform:rotateY(180deg)]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-3xl font-extrabold leading-tight drop-shadow-lg text-white">{backText}</span>
        </div>
      </div>
    </div>
  );
}
