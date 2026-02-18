export function renderStars(rating: number) {
  const full = Math.round(rating);
  const stars = Array.from({ length: 5 }).map((_, i) => (
    <span key={i} className={i < full ? 'text-pink-500' : 'text-slate-300'}>★</span>
  ));
  return <span className="inline-flex items-center gap-0.5 text-[13px] leading-none">{stars}</span>;
}
