'use client';

import { useEffect } from 'react';

export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
