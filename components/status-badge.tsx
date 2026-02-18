export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', text: 'Aktiv' },
    inactive: { bg: 'bg-slate-100 border-slate-200 text-slate-600', text: 'Inaktiv' },
    lead: { bg: 'bg-amber-50 border-amber-200 text-amber-700', text: 'Lead' },
  };
  const cfg = map[status] || map['inactive'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border ${cfg.bg}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {cfg.text}
    </span>
  );
}
