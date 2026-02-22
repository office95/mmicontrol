'use client';

const OPTIONS: Array<{ value: 'all' | 'open' | 'in_progress' | 'closed'; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'open', label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'closed', label: 'Erledigt' },
];

export default function SupportFilterSelect({ current }: { current: 'all' | 'open' | 'in_progress' | 'closed' }) {
  const go = (v: string) => {
    const target = v === 'all' ? '/admin/support' : `/admin/support?status=${v}`;
    window.location.href = target;
  };

  return (
    <select
      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold"
      value={current}
      onChange={(e) => go(e.target.value)}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
