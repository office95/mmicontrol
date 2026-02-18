"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  profile: {
    id: string;
    name: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
    phone?: string | null;
    email: string | null;
    birthdate?: string | null;
  } | null;
};

export default function ProfileModal({ open, onClose, profile }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    street: profile?.street ?? "",
    zip: profile?.zip ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    country: profile?.country ?? "",
    phone: profile?.phone ?? "",
    birthdate: profile?.birthdate ?? "",
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function save() {
    if (!profile?.id) return;
    setSaving(true);
    await supabase
      .from("students")
      .update({
        name: form.name,
        street: form.street,
        zip: form.zip,
        city: form.city,
        state: form.state,
        country: form.country,
        phone: form.phone,
        birthdate: form.birthdate,
      })
      .eq("id", profile.id);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white text-ink shadow-2xl p-6">
        <button
          className="absolute top-3 right-3 text-slate-500 hover:text-ink"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className="text-xl font-semibold mb-4">Profil</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {(
            [
              ["Name", "name"],
              ["Straße", "street"],
              ["PLZ", "zip"],
              ["Ort", "city"],
              ["Bundesland", "state"],
              ["Land", "country"],
              ["Telefon", "phone"],
              ["Geburtsdatum", "birthdate"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="space-y-1">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</span>
              {editing ? (
                <input
                  className="input"
                  value={(form as any)[key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                  {(form as any)[key] || "—"}
                </div>
              )}
            </label>
          ))}

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500">Email</span>
            <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500">
              {profile?.email ?? "—"}
            </div>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 text-sm">
          {!editing && (
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
              onClick={() => setEditing(true)}
            >
              Bearbeiten
            </button>
          )}
          {editing && (
            <>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: profile?.name ?? "",
                    street: profile?.street ?? "",
                    zip: profile?.zip ?? "",
                    city: profile?.city ?? "",
                    state: profile?.state ?? "",
                    country: profile?.country ?? "",
                    phone: profile?.phone ?? "",
                    birthdate: profile?.birthdate ?? "",
                  });
                }}
              >
                Abbrechen
              </button>
              <button
                className="rounded-lg bg-pink-600 text-white px-4 py-2 hover:bg-pink-700 shadow"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </>
          )}
          {!editing && (
            <button
              className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
              onClick={onClose}
            >
              Schließen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
