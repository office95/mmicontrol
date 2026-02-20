'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';

type CourseInitial = {
  id?: string;
  title?: string;
  description?: string | null;
  duration_hours?: number | null;
  price_gross?: number | null;
  vat_rate?: number | null;
  deposit?: number | null;
  category?: string | null;
  status?: 'active' | 'inactive';
  course_link?: string | null;
  cover_url?: string | null;
};

export default function AdminCourseForm({
  initial,
  onSaved,
}: {
  initial?: CourseInitial;
  onSaved?: () => void;
}) {
  const { supabase } = useSupabase();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [duration, setDuration] = useState<string>(initial?.duration_hours?.toString() ?? '');
  const [priceGross, setPriceGross] = useState<string>(initial?.price_gross?.toString() ?? '');
  const [vatMode, setVatMode] = useState<string>(
    initial?.vat_rate !== undefined && initial?.vat_rate !== null
      ? initial.vat_rate.toString()
      : '0.2'
  );
  const [customVat, setCustomVat] = useState<string>(
    initial?.vat_rate !== undefined && initial?.vat_rate !== null
      ? initial.vat_rate.toString()
      : '0.2'
  );
  const [deposit, setDeposit] = useState<string>(initial?.deposit?.toString() ?? '');
  const [status, setStatus] = useState<'active' | 'inactive'>(initial?.status ?? 'active');
  const [category, setCategory] = useState<string>(initial?.category ?? 'Extrem');
  const [courseLink, setCourseLink] = useState<string>(initial?.course_link ?? '');
  const [coverUrl, setCoverUrl] = useState<string>(initial?.cover_url ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>(initial?.cover_url ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync when initial changes (e.g., edit another course)
  useEffect(() => {
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setDuration(initial?.duration_hours?.toString() ?? '');
    setPriceGross(initial?.price_gross?.toString() ?? '');
    const vr = initial?.vat_rate;
    const vrStr = vr !== undefined && vr !== null ? vr.toString() : '0.2';
    setVatMode(vrStr);
    setCustomVat(vrStr);
    setDeposit(initial?.deposit?.toString() ?? '');
    setStatus(initial?.status ?? 'active');
    setCategory(initial?.category ?? 'Extrem');
    setCourseLink(initial?.course_link ?? '');
    setCoverUrl(initial?.cover_url ?? '');
    setCoverFile(null);
    setCoverPreview(initial?.cover_url ?? '');
    setSuccess(null);
    setError(null);
  }, [initial]);

  const vatValue = (() => {
    if (vatMode === 'custom') {
      const v = parseFloat(customVat);
      return isNaN(v) ? 0 : v;
    }
    const v = parseFloat(vatMode);
    return isNaN(v) ? 0 : v;
  })();

  const priceNet = (() => {
    const gross = parseFloat(priceGross);
    const vat = vatValue;
    if (isNaN(gross) || gross <= 0) return '0.00';
    const net = gross / (1 + (isNaN(vat) ? 0 : vat));
    return net.toFixed(2);
  })();

  const saldo = (() => {
    const gross = parseFloat(priceGross) || 0;
    const dep = parseFloat(deposit) || 0;
    return (gross - dep).toFixed(2);
  })();

  const vatAmount = (() => {
    const gross = parseFloat(priceGross);
    const net = parseFloat(priceNet);
    if (isNaN(gross) || isNaN(net)) return '0.00';
    return (gross - net).toFixed(2);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let finalCoverUrl = coverUrl;

    // optional cover upload
    if (coverFile) {
      const ext = coverFile.name.split('.').pop() || 'jpg';
      const path = `course-covers/${initial?.id ?? 'new'}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('materials')
        .upload(path, coverFile, { upsert: true });
      if (uploadErr) {
        setError(uploadErr.message);
        setLoading(false);
        return;
      }
      const { data: pub } = supabase.storage.from('materials').getPublicUrl(path);
      finalCoverUrl = pub.publicUrl;
    }

    const isEdit = Boolean(initial?.id);
    const res = await fetch('/api/admin/courses', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: initial?.id,
        title,
        description,
        duration_hours: duration ? Number(duration) : null,
        price_gross: priceGross ? Number(priceGross) : null,
        vat_rate: vatValue,
        deposit: deposit ? Number(deposit) : null,
        category,
        status,
        course_link: courseLink || null,
        cover_url: finalCoverUrl || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Anlegen');
      setSuccess(null);
    } else {
      if (isEdit) {
        setSuccess('Kurs gespeichert');
      } else {
        setTitle('');
        setDescription('');
        setDuration('');
        setPriceGross('');
        setDeposit('');
        setCourseLink('');
        setCoverUrl('');
        setCoverFile(null);
        setCoverPreview('');
        setSuccess('Kurs angelegt');
      }
      onSaved?.();
    }
    setLoading(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Kurstitel</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Beschreibung</label>
        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
        <p className="text-sm font-semibold text-slate-800">Basis</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kursdauer (Std)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kurslink (URL)</label>
            <input
              type="url"
              className="input"
              placeholder="https://…"
              value={courseLink}
              onChange={(e) => setCourseLink(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Cover (JPG oder PNG)</label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400">kein<br />Cover</span>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="input"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setCoverFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setCoverPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setCoverPreview(coverUrl);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
        <p className="text-sm font-semibold text-slate-800">Preise & USt</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kursbeitrag Brutto</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={priceGross}
              onChange={(e) => setPriceGross(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">USt</label>
            <select
              className="input"
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value)}
            >
              <option value="0">0%</option>
              <option value="0.2">20%</option>
              <option value="0.1">10%</option>
              <option value="custom">Manuell</option>
            </select>
            {vatMode === 'custom' && (
              <input
                type="number"
                min="0"
                step="0.01"
                className="input mt-2"
                placeholder="z.B. 0.2 für 20%"
                value={customVat}
                onChange={(e) => setCustomVat(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kategorie</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Extrem">Extrem</option>
              <option value="Intensiv">Intensiv</option>
              <option value="Workshop">Workshop</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kursbeitrag Netto</label>
            <input className="input bg-slate-100" value={priceNet} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">USt in €</label>
            <input className="input bg-slate-100" value={vatAmount} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Anzahlung</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Saldo (Brutto - Anzahlung)</label>
            <input className="input bg-slate-100" value={saldo} readOnly />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <button type="submit" className="button-primary" disabled={loading}>
        {loading ? 'Speichern...' : initial?.id ? 'Speichern' : 'Kurs anlegen'}
      </button>
    </form>
  );
}
