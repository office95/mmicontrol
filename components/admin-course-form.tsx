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
  price_net?: number | null;
  saldo?: number | null;
  category?: string | null;
  status?: 'active' | 'inactive';
  course_link?: string | null;
  cover_url?: string | null;
  default_price_tier_id?: string | null;
  course_price_tiers?: {
    price_tier_id: string;
    price_gross?: number | null;
    vat_rate?: number | null;
    price_net?: number | null;
    deposit?: number | null;
    saldo?: number | null;
    duration_hours?: number | null;
    price_tier?: { id: string; label: string } | null;
  }[];
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
  const [priceTiers, setPriceTiers] = useState<
    { tempId: string; label: string; price_gross: string; vat_rate: string; deposit: string; duration_hours: string; price_net?: string; saldo?: string; price_tier_id?: string }[]
  >(() => {
    if (initial?.course_price_tiers?.length) {
      return initial.course_price_tiers.map((t, idx) => ({
        tempId: `tier-${idx}`,
        label: t.price_tier?.label || `PKL${idx + 1}`,
        price_gross: t.price_gross?.toString() ?? '',
        vat_rate: t.vat_rate?.toString() ?? '0.2',
        deposit: t.deposit?.toString() ?? '',
        duration_hours: t.duration_hours?.toString() ?? '',
        price_net: t.price_net?.toString(),
        saldo: t.saldo?.toString(),
        price_tier_id: t.price_tier_id,
      }));
    }
    return [
      {
        tempId: 'tier-1',
        label: 'PKL1',
        price_gross: initial?.price_gross?.toString() ?? '',
        vat_rate: initial?.vat_rate?.toString() ?? '0.2',
        deposit: initial?.deposit?.toString() ?? '',
        duration_hours: initial?.duration_hours?.toString() ?? '',
        price_net: initial?.price_net?.toString(),
        saldo: initial?.saldo?.toString(),
      },
    ];
  });
  const [defaultTierId, setDefaultTierId] = useState<string | null>(initial?.default_price_tier_id ?? null);

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
    if (initial?.course_price_tiers?.length) {
      setPriceTiers(
        initial.course_price_tiers.map((t, idx) => ({
          tempId: `tier-${idx}-${t.price_tier_id || Date.now()}`,
          label: t.price_tier?.label || `PKL${idx + 1}`,
          price_gross: t.price_gross?.toString() ?? '',
          vat_rate: t.vat_rate?.toString() ?? '0.2',
          deposit: t.deposit?.toString() ?? '',
          duration_hours: t.duration_hours?.toString() ?? '',
          price_net: t.price_net?.toString(),
          saldo: t.saldo?.toString(),
          price_tier_id: t.price_tier_id,
        }))
      );
      setDefaultTierId(initial.default_price_tier_id ?? null);
    }
  }, [initial]);

  useEffect(() => {
  }, [initial?.id]);

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
    const tiersOrdered = (() => {
      if (!defaultTierId) return [...priceTiers];
      const hitIdx = priceTiers.findIndex((t) => t.price_tier_id === defaultTierId || t.tempId === defaultTierId);
      if (hitIdx <= 0) return [...priceTiers];
      const arr = [...priceTiers];
      const [hit] = arr.splice(hitIdx, 1);
      arr.unshift(hit);
      return arr;
    })();
    const tiersPayload = tiersOrdered.map((t) => ({
      label: t.label || 'PKL',
      price_tier_id: t.price_tier_id,
      price_gross: t.price_gross ? Number(t.price_gross) : null,
      vat_rate: t.vat_rate ? Number(t.vat_rate) : null,
      deposit: t.deposit ? Number(t.deposit) : null,
      duration_hours: t.duration_hours ? Number(t.duration_hours) : null,
    }));

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
        default_price_tier_id: defaultTierId && defaultTierId.startsWith('tier-') ? null : defaultTierId,
        price_tiers: tiersPayload,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Anlegen');
      setSuccess(null);
    } else {
      const savedCourseId = (data?.id as string) || initial?.id;
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

      <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Preisstaffeln (PKL)</p>
          <button
            type="button"
            className="text-sm text-pink-600 hover:text-pink-700 font-semibold"
            onClick={() =>
              setPriceTiers((prev) => [
                ...prev,
                {
                  tempId: `tier-${Date.now()}`,
                  label: `PKL${prev.length + 1}`,
                  price_gross: '',
                  vat_rate: '0.2',
                  deposit: '',
                  duration_hours: '',
                },
              ])
            }
          >
            + PKL hinzufügen
          </button>
        </div>
        <p className="text-xs text-slate-500">Beispiel: PKL1 = 400 €, PKL2 = 549 € (z.B. anderes Bundesland).</p>
        <div className="space-y-3">
          {priceTiers.map((tier, idx) => {
            const gross = parseFloat(tier.price_gross) || 0;
            const vat = parseFloat(tier.vat_rate) || 0;
            const dep = parseFloat(tier.deposit) || 0;
            const net = gross ? (gross / (1 + vat)).toFixed(2) : '';
            const saldoVal = (gross - dep).toFixed(2);
            const isDefault = tier.price_tier_id === defaultTierId || (!defaultTierId && idx === 0);
            return (
              <div key={tier.tempId} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Label</label>
                    <input
                      className="input"
                      value={tier.label}
                      onChange={(e) =>
                        setPriceTiers((prev) =>
                          prev.map((t) => (t.tempId === tier.tempId ? { ...t, label: e.target.value } : t))
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="default-tier"
                      checked={isDefault}
                      onChange={() => setDefaultTierId(tier.price_tier_id || tier.tempId)}
                    />
                    <span className="text-slate-700">Standard</span>
                  </div>
                  {priceTiers.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setPriceTiers((prev) => prev.filter((t) => t.tempId !== tier.tempId))}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Brutto</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={tier.price_gross}
                      onChange={(e) =>
                        setPriceTiers((prev) =>
                          prev.map((t) => (t.tempId === tier.tempId ? { ...t, price_gross: e.target.value } : t))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">USt</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={tier.vat_rate}
                      onChange={(e) =>
                        setPriceTiers((prev) =>
                          prev.map((t) => (t.tempId === tier.tempId ? { ...t, vat_rate: e.target.value } : t))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Anzahlung</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={tier.deposit}
                      onChange={(e) =>
                        setPriceTiers((prev) =>
                          prev.map((t) => (t.tempId === tier.tempId ? { ...t, deposit: e.target.value } : t))
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Dauer (Std)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={tier.duration_hours}
                      onChange={(e) =>
                        setPriceTiers((prev) =>
                          prev.map((t) => (t.tempId === tier.tempId ? { ...t, duration_hours: e.target.value } : t))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Netto (auto)</label>
                    <input className="input bg-slate-100" value={net} readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Saldo (auto)</label>
                    <input className="input bg-slate-100" value={isNaN(Number(saldoVal)) ? '' : saldoVal} readOnly />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
        <p className="text-sm font-semibold text-slate-800">Module (optional)</p>
        <p className="text-xs text-slate-500">Vordefinierte Module 1–20 auswählen. Bei Bedarf mehrere wählen.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const selected = selectedModules.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() =>
                  setSelectedModules((prev) =>
                    prev.includes(n) ? prev.filter((m) => m !== n) : [...prev, n].sort((a, b) => a - b)
                  )
                }
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  selected
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                Modul {n}
              </button>
            );
          })}
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
