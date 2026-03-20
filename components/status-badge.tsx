export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { border: string; text: string }> = {
    active: { border: 'border-emerald-200 text-emerald-700', text: 'Aktiv' },
    inactive: { border: 'border-slate-200 text-slate-600', text: 'Inaktiv' },
    archived: { border: 'border-slate-300 text-slate-600', text: 'Archiviert' },
    lead: { border: 'border-amber-200 text-amber-700', text: 'Lead' },
    offen: { border: 'border-emerald-200 text-emerald-700', text: 'offen' },
    'Anzahlung erhalten': { border: 'border-emerald-200 text-emerald-700', text: 'Anzahlung' },
    abgeschlossen: { border: 'border-slate-300 text-slate-600', text: 'abgeschlossen' },
    'Schlussrechnung versendet': { border: 'border-indigo-200 text-indigo-700', text: 'Schlussrechnung versendet' },
    'Zahlungserinnerung': { border: 'border-amber-200 text-amber-700', text: 'Zahlungserinnerung' },
    '1. Mahnung': { border: 'border-amber-200 text-amber-700', text: '1. Mahnung' },
    '2. Mahnung': { border: 'border-rose-200 text-rose-700', text: '2. Mahnung' },
    Inkasso: { border: 'border-rose-200 text-rose-700', text: 'Inkasso' },
    Storno: { border: 'border-slate-300 text-slate-600', text: 'Storno' },
    Archiv: { border: 'border-slate-300 text-slate-600', text: 'Archiv' },
  };
  const cfg = map[status] || { border: 'border-slate-200 text-slate-700', text: status || 'Status' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border bg-white ${cfg.border}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {cfg.text}
    </span>
  );
}
