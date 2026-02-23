'use client';

import { useEffect, useMemo, useState } from 'react';
import ButtonLink from '@/components/button-link';

type Category = { id: string; name: string; description?: string | null };
type Course = { id: string; title: string | null };
type CostRow = {
  id: string;
  cost_date: string;
  amount_gross: number;
  vat_rate: number;
  amount_net: number;
  vat_amount: number;
  vendor?: string | null;
  description?: string | null;
  attachment_url?: string | null;
  category_id?: string | null;
  course_id?: string | null;
  partner_id?: string | null;
  cost_categories?: Category | null;
  courses?: Course | null;
  partners?: { id: string; name: string | null } | null;
};

export default function CostsPage() {
  const [items, setItems] = useState<CostRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostRow | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [vendor, setVendor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [courseId, setCourseId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (filterCat) qs.set('category_id', filterCat);
    if (filterCourse) qs.set('course_id', filterCourse);
    const res = await fetch('/api/admin/costs' + (qs.toString() ? `?${qs.toString()}` : ''));
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setItems([]);
    } else {
      setError(null);
      setItems(data || []);
    }
    setLoading(false);
  };

  const loadMeta = async () => {
    const [catRes, courseRes, partnerRes] = await Promise.all([
      fetch('/api/admin/cost-categories'),
      fetch('/api/admin/courses'),
      fetch('/api/admin/partners'),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
    if (courseRes.ok) setCourses(await courseRes.json());
    if (partnerRes.ok) setPartners(await partnerRes.json());
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    load();
  }, [from, to, filterCat, filterCourse]);

  const resetForm = () => {
    setEditing(null);
    setDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setVatRate('20');
    setVendor('');
    setCategoryId('');
    setCourseId('');
    setPartnerId('');
    setDescription('');
    setAttachment('');
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row: CostRow) => {
    setEditing(row);
    setDate(row.cost_date);
    setAmount(String(row.amount_gross));
    setVatRate(String(row.vat_rate ?? 0));
    setVendor(row.vendor || '');
    setCategoryId(row.category_id || '');
    setCourseId(row.course_id || '');
    setPartnerId(row.partner_id || '');
    setDescription(row.description || '');
    setAttachment(row.attachment_url || '');
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const catId = categoryId;

    if (showPartner && !partnerId) {
      alert('Bitte Partner auswählen (Honorarnote).');
      setSaving(false);
      return;
    }

    const payload = {
      cost_date: date,
      amount_gross: Number(amount),
      vat_rate: Number(vatRate || 0),
      vendor: vendor || null,
      category_id: catId || null,
      course_id: courseId || null,
      description: description || null,
      attachment_url: attachment || null,
      partner_id: showPartner ? (partnerId || null) : null,
    };

    const url = '/api/admin/costs' + (editing ? '' : '');
    const res = await fetch(url + (editing ? '' : ''), {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Speichern fehlgeschlagen');
      return;
    }
    setModalOpen(false);
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Kosten-Eintrag löschen?')) return;
    const res = await fetch(`/api/admin/costs?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Löschen fehlgeschlagen');
      return;
    }
    load();
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return alert('Name für Kategorie eingeben.');
    const res = await fetch('/api/admin/cost-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim(), description: newCategoryDesc || null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Kategorie konnte nicht angelegt werden.');
      return;
    }
    const cat = await res.json();
    setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name, 'de')));
    setNewCategoryName('');
    setNewCategoryDesc('');
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Kategorie löschen? (Nur möglich, wenn keine Kosten darauf verweisen)')) return;
    const res = await fetch(`/api/admin/cost-categories?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Kategorie konnte nicht gelöscht werden.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (categoryId === id) setCategoryId('');
  };

  const total = useMemo(
    () => items.reduce((s, r) => s + Number(r.amount_gross || 0), 0),
    [items]
  );

  const showPartner = (() => {
    const selectedCat = categories.find((c) => c.id === categoryId);
    return (selectedCat?.name || '').toLowerCase() === 'honorarnote';
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-pink-500 font-semibold">Admin</p>
          <h1 className="text-2xl font-semibold text-white">Kosten</h1>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            onClick={openNew}
          >
            Kosten erfassen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Summe gefiltert</p>
          <p className="text-2xl font-semibold text-ink">{total.toFixed(2)} €</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Einträge</p>
          <p className="text-2xl font-semibold text-ink">{items.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kategorien verwalten</p>
              <p className="text-sm text-slate-600">Hier anlegen/löschen, erscheinen sofort im Dropdown.</p>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Neue Kategorie"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Beschreibung (optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
              </div>
              <button className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm" onClick={addCategory}>Anlegen</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, 'de'))
              .map((c) => (
                <span key={c.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-slate-700">
                  {c.name}
                  <button className="text-red-600 text-xs" onClick={() => deleteCategory(c.id)}>✕</button>
                </span>
              ))}
            {categories.length === 0 && <span className="text-sm text-slate-500">Noch keine Kategorien.</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Von</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Bis</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Kategorie</label>
            <select className="input" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">Alle</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Kurs/Projekt</label>
            <select className="input" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
              <option value="">Alle</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title || c.id}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="text-sm text-slate-500 hover:underline" onClick={() => { setFrom(''); setTo(''); setFilterCat(''); setFilterCourse(''); }}>
              Filter zurücksetzen
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {loading && <p className="p-3 text-sm text-slate-500">Lade ...</p>}
          {error && <p className="p-3 text-sm text-red-600">{error}</p>}
          {!loading && !items.length && <p className="p-3 text-sm text-slate-500">Keine Einträge.</p>}
          {items.map((r) => (
            <div key={r.id} className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
              <div>
                <p className="font-semibold text-ink">
                  {new Date(r.cost_date).toLocaleDateString()} · {Number(r.amount_gross).toFixed(2)} € (Netto {Number(r.amount_net).toFixed(2)} € · USt {Number(r.vat_amount).toFixed(2)} €)
                </p>
                <p className="text-xs text-slate-500">
                  {r.vendor || '—'} · {r.cost_categories?.name || 'keine Kategorie'}
                  {r.courses?.title ? ` · Kurs: ${r.courses.title}` : ''}
                  {r.partners?.name ? ` · Partner: ${r.partners.name}` : ''}
                  {r.description ? ` · ${r.description}` : ''}
                  {r.attachment_url ? ` · Beleg: ${r.attachment_url}` : ''}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <button className="text-blue-600 hover:underline" onClick={() => openEdit(r)}>Bearbeiten</button>
                <button className="text-red-600 hover:underline" onClick={() => remove(r.id)}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{editing ? 'Kosten bearbeiten' : 'Kosten erfassen'}</h2>
              <button className="text-slate-500 hover:text-slate-700" onClick={() => { setModalOpen(false); resetForm(); }}>×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Datum</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Betrag (Brutto)</label>
                <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">USt-Satz (%)</label>
                <input type="number" className="input" value={vatRate} onChange={(e) => setVatRate(e.target.value)} placeholder="20" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Kategorie</label>
                <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Bitte wählen</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  className="input mt-2"
                  placeholder="oder neue Kategorie"
                  value={newCategoryName}
                  onChange={(e) => { setNewCategoryName(e.target.value); if (e.target.value) setCategoryId(''); }}
                />
              </div>
              {showPartner && (
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Partner (bei Honorarnote)</label>
                  <select className="input" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                    <option value="">Bitte wählen</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Lieferant</label>
                <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="z. B. AWS, Druckerei" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Kurs/Projekt (optional)</label>
                <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">Keiner</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title || c.id}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Beschreibung</label>
                <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs uppercase tracking-[0.12em] text-slate-500">Beleg-Link (PDF/JPG)</label>
                <input className="input" value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="text-slate-600 hover:underline" onClick={() => { setModalOpen(false); resetForm(); }}>Abbrechen</button>
              <button
                className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
