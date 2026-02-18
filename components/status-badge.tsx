export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { border: string; text: string }> = {
    active: { border: 'border-emerald-200 text-emerald-700', text: 'Aktiv' },
    inactive: { border: 'border-slate-200 text-slate-600', text: 'Inaktiv' },
    lead: { border: 'border-amber-200 text-amber-700', text: 'Lead' },
  };
  const cfg = map[status] || map['inactive'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border bg-white ${cfg.border}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {cfg.text}
    </span>
  );
}
