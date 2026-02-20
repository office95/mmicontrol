'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import PartnerModal from '@/components/partner-modal';
import ButtonLink from '@/components/button-link';
import { renderStars } from '@/components/star-utils';
import StatusBadge from '@/components/status-badge';
import Spinner from '@/components/spinner';

type Partner = {
  id: string;
  status: 'active' | 'inactive' | 'lead';
  provider_id: string | null;
  name: string;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  contact_person: string | null;
  vat_number: string | null;
  tax_number: string | null;
  registry_number: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  contract: boolean | null;
  contract_date: string | null;
  provision1: number | null;
  provision2: number | null;
  provision3: number | null;
  provision4: number | null;
  provision5: number | null;
  provision6plus: number | null;
  rating_course: number | null;
  rating_teacher: number | null;
  rating_reliability: number | null;
  rating_engagement: number | null;
  rating_avg?: number | null;
  active_courses?: number;
};

import type { PartnerRow } from '@/components/partner-modal';

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  lead: 'Lead',
};

export default function PartnersPage() {
  const { supabase } = useSupabase();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [feedbackTitle, setFeedbackTitle] = useState<string>('Kurs-Feedback');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/partners');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setPartners([]);
    } else {
      setPartners(data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = partners
    .filter((p) => {
      const statusOk = filterStatus === 'all' ? true : p.status === filterStatus;
      const term = search.trim().toLowerCase();
      const text = `${p.name ?? ''} ${p.city ?? ''} ${p.state ?? ''} ${p.country ?? ''}`.toLowerCase();
      const searchOk = term === '' ? true : text.includes(term);
      return statusOk && searchOk;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }));

  const toPartnerRow = (p: Partner): PartnerRow => ({
    ...p,
    status: p.status ?? 'active',
    country: (p.country === 'Deutschland' ? 'Deutschland' : 'Österreich') as 'Österreich' | 'Deutschland',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Partner</h1>
          <p className="text-sm text-slate-200">Übersicht und Anlage von Partnern.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/15 border border-white/25 text-sm font-semibold text-white hover:bg-white/25"
            onClick={() => {
              setEditPartner(null);
              setOpenModal(true);
            }}
          >
            Neuer Partner
          </button>
          <ButtonLink href="/admin">Zurück</ButtonLink>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input max-w-xs h-8 py-1 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Alle</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option value="lead">Lead</option>
        </select>
        <input
          className="input max-w-sm h-8 py-1 text-sm"
          placeholder="Suche nach Name oder Ort"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-6 shadow-xl text-slate-900 space-y-3">
        {loading && <p className="text-sm text-slate-500">Lade Partner...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !filtered.length && <p className="text-sm text-slate-500">Keine Partner vorhanden.</p>}
        <div className="divide-y divide-slate-200">
          {filtered.map((p) => (
            <div key={p.id} className="py-4 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setEditPartner(p);
                        setOpenModal(true);
                      }}
                      className="text-left text-lg font-bold text-ink hover:underline"
                    >
                      {p.name}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-600">{p.state ?? '—'} · {p.country ?? '—'}</span>
                    {p.active_courses !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border border-slate-200 text-slate-700 bg-white">
                        ● Aktive Kurse: {p.active_courses}
                      </span>
                    )}
                    {p.rating_avg !== null && p.rating_avg !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border border-slate-200 text-slate-700 bg-white">
                        {renderStars(p.rating_avg)}
                        <span className="font-semibold text-pink-600">{p.rating_avg.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                  {p.status && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                      <StatusBadge status={p.status} />
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Angelegt am {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setEditPartner(p);
                    setOpenModal(true);
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  className="px-3 py-2 rounded-lg border border-pink-300 text-pink-700 hover:bg-pink-50"
                  onClick={async () => {
                    setFeedbackTitle(`Kurs-Feedback · ${p.name}`);
                    setFeedbackOpen(true);
                    setFeedbackLoading(true);
                    setFeedbackError(null);
                    const res = await fetch(`/api/admin/feedback?partner_id=${p.id}`);
                    const data = await res.json();
                    if (!res.ok) {
                      setFeedbackError(data.error || 'Fehler beim Laden');
                      setFeedbackItems([]);
                    } else {
                      setFeedbackItems(data);
                    }
                    setFeedbackLoading(false);
                  }}
                >
                  Kurs-Feedback
                </button>
                <button
                  className="px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    if (!confirm('Diesen Partner wirklich löschen?')) return;
                    const res = await fetch(`/api/admin/partners?id=${p.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        load();
                      } else {
                        const d = await res.json().catch(() => ({}));
                        alert(d.error || 'Löschen fehlgeschlagen');
                      }
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openModal && (
        <PartnerModal
          partner={editPartner ? toPartnerRow(editPartner) : undefined}
          onSaved={load}
          onClose={() => {
            setOpenModal(false);
            setEditPartner(null);
            load();
          }}
        />
      )}

      {feedbackOpen && (
        <FeedbackModal
          title={feedbackTitle}
          loading={feedbackLoading}
          error={feedbackError}
          items={feedbackItems}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

function FeedbackModal({
  title,
  loading,
  error,
  items,
  onClose,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  items: any[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-ink shadow-2xl p-6 relative">
        <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={onClose}>×</button>
        <h3 className="text-2xl font-semibold mb-3">{title}</h3>
        {items.length > 0 && (
          <div className="mb-4 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500 uppercase tracking-[0.14em]">Ø Gesamt</div>
            <div className="flex items-center gap-2">
              <StarInputReadOnly value={avgOverall(items)} />
              <span className="text-sm font-semibold text-ink">{avgOverall(items).toFixed(1)} / 5</span>
              <span className="text-xs text-slate-500">({items.length} Feedbacks)</span>
            </div>
          </div>
        )}
        {loading && (
          <p className="text-slate-600 flex items-center gap-2">
            <Spinner />
            Lade Feedback...
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && !items.length && <p className="text-slate-600">Keine Feedbacks vorhanden.</p>}
        <div className="space-y-3">
          {items.map((f, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <FeedbackRow label="Gesamt" value={Number(f.ratings?.overall ?? 0)} />
                <FeedbackRow label="Dozent" value={Number(f.ratings?.teacher ?? 0)} />
                <FeedbackRow label="Verständlich" value={Number(f.ratings?.clarity ?? 0)} />
                <FeedbackRow label="Praxis" value={Number(f.ratings?.practice ?? 0)} />
                <FeedbackRow label="Betreuung" value={Number(f.ratings?.support ?? 0)} />
                <FeedbackRow label="Technik" value={Number(f.ratings?.tech ?? 0)} />
              </div>
              <p className="text-sm text-slate-700">Weiterempfehlung: <strong>{f.recommend ?? '—'}</strong></p>
              {f.improve && (
                <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                  {f.improve}
                </div>
              )}
              {(f.student_name || f.student_email) && (
                <p className="text-xs text-slate-500">
                  Teilnehmer: {f.student_name ?? '—'} · {f.student_email ?? '—'}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Eingereicht am {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-24">{label}</span>
      <StarInputReadOnly value={value} />
      <span className="text-xs text-slate-500">{value.toFixed(1)}/5</span>
    </div>
  );
}

function StarInputReadOnly({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex gap-1 text-pink-500 text-lg">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'opacity-100' : 'opacity-30'}>★</span>
      ))}
    </div>
  );
}

function avgOverall(items: any[]) {
  if (!items.length) return 0;
  const sum = items.reduce((acc, f) => acc + Number(f.ratings?.overall ?? 0), 0);
  return sum / items.length;
}
