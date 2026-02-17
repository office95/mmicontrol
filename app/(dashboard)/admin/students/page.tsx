'use client';

import { useEffect, useMemo, useState } from 'react';
import ButtonLink from '@/components/button-link';
import StudentModal, { StudentRow } from '@/components/student-modal';
import BookingModal from '@/components/booking-modal';

type StudentListRow = {
  id: string;
  student_id: string | null;
  name: string;
  email: string | null;
  street: string | null;
  zip: string | null;
  company: string | null;
  vat_number: string | null;
  birthdate: string | null;
  phone: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  status: 'active' | 'inactive';
  country: string | null;
  state: string | null;
  city: string | null;
  is_problem: boolean;
  problem_note: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = { active: 'Aktiv', inactive: 'Inaktiv' };

export default function StudentsPage() {
  const [items, setItems] = useState<StudentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [bookingFor, setBookingFor] = useState<StudentListRow | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/students');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setItems([]);
    } else {
      setItems(data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((s) => {
      const statusOk = filterStatus === 'all' ? true : s.status === filterStatus;
      const text = `${s.name ?? ''} ${s.city ?? ''} ${s.state ?? ''} ${s.country ?? ''} ${s.email ?? ''}`.toLowerCase();
      const searchOk = term === '' ? true : text.includes(term);
      return statusOk && searchOk;
    });
  }, [items, search, filterStatus]);

  const openFor = (s: StudentListRow) => {
    setEditItem({
      id: s.id,
      student_id: s.student_id,
      name: s.name,
      email: s.email,
      street: s.street,
      zip: s.zip,
      city: s.city,
      country: (s.country as any) ?? null,
      state: s.state,
      company: s.company,
      vat_number: s.vat_number,
      birthdate: s.birthdate,
      phone: s.phone,
      bank_name: s.bank_name,
      iban: s.iban,
      bic: s.bic,
      status: s.status,
      is_problem: s.is_problem,
      problem_note: s.problem_note,
    });
    setOpenModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Kursteilnehmer</h1>
          <p className="text-sm text-slate-200">Teilnehmer verwalten, markieren und bearbeiten.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25"
            onClick={() => { setEditItem(null); setOpenModal(true); }}
          >
            Neuer Kursteilnehmer
          </button>
          <ButtonLink href="/admin">Zurück</ButtonLink>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input max-w-xs h-8 py-1 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="all">Alle</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
        <input
          className="input max-w-sm h-8 py-1 text-sm"
          placeholder="Suche nach Name oder Ort"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-6 shadow-xl text-slate-900">
        {loading && <p className="text-sm text-slate-500">Lade Kursteilnehmer...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !filtered.length && <p className="text-sm text-slate-500">Keine Kursteilnehmer vorhanden.</p>}

        <div className="divide-y divide-slate-200">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="space-y-1">
                <button
                  onClick={() => openFor(s)}
                  className={`text-left text-base font-bold ${s.is_problem ? 'text-red-600' : 'text-ink'} hover:underline`}
                >
                  {s.name}
                  {s.is_problem && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                      Problemkunde
                    </span>
                  )}
                </button>
                <p className="text-xs text-slate-500">
                  {s.state ?? '—'} · {s.country ?? '—'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {statusLabel[s.status] ?? s.status} · Angelegt: {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => openFor(s)}
                >
                  Bearbeiten
                </button>
                <button
                  className="px-3 py-1 rounded-lg border border-slate-300 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setBookingFor(s)}
                >
                  Buchung erfassen
                </button>
                <button
                  className="px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    if (!confirm('Diesen Kursteilnehmer löschen?')) return;
                    const res = await fetch(`/api/admin/students?id=${s.id}`, { method: 'DELETE' });
                    if (res.ok) load();
                    else {
                      const d = await res.json().catch(() => ({}));
                      alert(d.error || 'Löschen fehlgeschlagen');
                    }
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openModal && (
        <StudentModal
          initial={editItem ?? undefined}
          onSaved={load}
          onClose={() => {
            setOpenModal(false);
            setEditItem(null);
          }}
        />
      )}
      {bookingFor && (
        <BookingModal
          student={{ id: bookingFor.id, name: bookingFor.name }}
          onSaved={load}
          onClose={() => setBookingFor(null)}
        />
      )}
    </div>
  );
}
