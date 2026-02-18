'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import ButtonLink from '@/components/button-link';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'teacher' | 'student';
type PermissionRow = { role: Role; page_slug: string; allowed: boolean };
type TeacherRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  partner_id: string | null;
  partner_name: string | null;
  courses: { id: string; title: string }[];
};
type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  approved?: boolean;
};
type Partner = { id: string; name: string | null };
type Course = { id: string; title: string };

const PAGES = [
  { slug: 'admin-dashboard', label: 'Dashboard Admin' },
  { slug: 'teacher-dashboard', label: 'Dashboard Dozent' },
  { slug: 'student-dashboard', label: 'Dashboard Teilnehmer' },
  { slug: 'teacher-materials', label: 'Kursunterlagen Dozent' },
  { slug: 'courses', label: 'Kurse verwalten' },
  { slug: 'materials', label: 'Kursmaterial' },
  { slug: 'admin-bookings', label: 'Buchungsübersicht' },
  { slug: 'course-dates', label: 'Kurstermine' },
  { slug: 'admin-students', label: 'Kursteilnehmer' },
  { slug: 'admin-leads', label: 'Leads' },
  { slug: 'student-materials', label: 'Kursunterlagen (Teilnehmer)' },
  { slug: 'admin-partners', label: 'Partner' },
  { slug: 'quizzes', label: 'Quiz' },
  { slug: 'integrations', label: 'Integrationen' },
];

export default function RolesPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [tab, setTab] = useState<'pages' | 'teachers' | 'members'>('pages');
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [savingTeacher, setSavingTeacher] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [savingMember, setSavingMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/permissions', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Laden');
      setPerms([]);
    } else {
      setPerms(data);
      setError(null);
    }
    const [tRes, pRes, cRes, mRes] = await Promise.all([
      fetch('/api/admin/teachers'),
      fetch('/api/admin/partners'),
      fetch('/api/admin/courses?minimal=1'),
      fetch('/api/admin/members'),
    ]);
    if (tRes.ok) setTeachers(await tRes.json());
    if (pRes.ok) setPartners(await pRes.json());
    if (cRes.ok) setCourses(await cRes.json());
    if (mRes.ok) setMembers(await mRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (role: Role, page_slug: string, allowed: boolean) => {
    const res = await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role, page_slug, allowed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Speichern');
      return;
    }
    setPerms((prev) => {
      const filtered = prev.filter((p) => !(p.role === role && p.page_slug === page_slug));
      return [...filtered, data];
    });
    router.refresh();
  };

  const valueOf = (role: Role, page: string) =>
    perms.find((p) => p.role === role && p.page_slug === page)?.allowed ?? false;

  const handleTeacherSave = async (teacherId: string, partner_id: string | null, course_ids: string[]) => {
    setSavingTeacher(teacherId);
    const res = await fetch('/api/admin/teachers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id: teacherId, partner_id, course_ids }),
    });
    if (res.ok) {
      const refreshed = await fetch('/api/admin/teachers').then((r) => r.json());
      setTeachers(refreshed);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Speichern fehlgeschlagen');
    }
    setSavingTeacher(null);
  };

  const handleMemberRole = async (memberId: string, role: Role) => {
    setSavingMember(memberId);
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: memberId, role }),
    });
    if (res.ok) {
      const refreshed = await fetch('/api/admin/members').then((r) => r.json());
      setMembers(refreshed);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Speichern fehlgeschlagen');
    }
    setSavingMember(null);
  };

  const handleMemberDelete = async (memberId: string) => {
    if (!confirm('Member wirklich löschen?')) return;
    setSavingMember(memberId);
    const res = await fetch(`/api/admin/members?id=${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Löschen fehlgeschlagen');
    }
    setSavingMember(null);
  };

  const courseOptions = useMemo(
    () => courses.sort((a, b) => (a.title || '').localeCompare(b.title || '')),
    [courses]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Rollen & Rechte</h1>
          <p className="text-sm text-slate-200">Seiten & Dozentenberechtigungen verwalten.</p>
        </div>
        <ButtonLink href="/admin">Zurück</ButtonLink>
      </div>

      <div className="flex gap-4 text-sm font-semibold text-slate-200 border-b border-white/10">
        <button
          className={`pb-2 ${tab === 'pages' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setTab('pages')}
        >
          Seiten
        </button>
        <button
          className={`pb-2 ${tab === 'teachers' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setTab('teachers')}
        >
          Dozenten
        </button>
        <button
          className={`pb-2 ${tab === 'members' ? 'text-white border-b-2 border-pink-500' : 'text-slate-400'}`}
          onClick={() => setTab('members')}
        >
          Members
        </button>
      </div>

      {tab === 'pages' && (
        <div className="card p-6 shadow-xl text-slate-900 overflow-x-auto">
          {loading && <p className="text-sm text-slate-500">Lade...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Seite</th>
                  <th className="py-2 pr-4">Admin</th>
                  <th className="py-2 pr-4">Dozent</th>
                  <th className="py-2 pr-4">Teilnehmer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PAGES.map((p) => (
                  <tr key={p.slug}>
                    <td className="py-3 pr-4 font-semibold text-ink">{p.label}</td>
                    {(['admin', 'teacher', 'student'] as Role[]).map((role) => {
                      const val = valueOf(role, p.slug);
                      return (
                        <td key={role} className="py-3 pr-4">
                          <label className="inline-flex items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={val}
                              onChange={(e) => toggle(role, p.slug, e.target.checked)}
                            />
                            <span className="text-xs">{val ? 'sichtbar' : 'ausgeblendet'}</span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'teachers' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-4">
          {loading && <p className="text-sm text-slate-500">Lade...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && teachers.length === 0 && (
            <p className="text-sm text-slate-500">Keine Dozenten gefunden (Rolle teacher, approved).</p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {teachers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.full_name || 'Ohne Name'}</p>
                    <p className="text-xs text-slate-500">{t.email}</p>
                  </div>
                  <span className="px-2 py-1 text-[11px] rounded-full bg-pink-50 text-pink-700 border border-pink-200">Dozent</span>
                </div>
                <div className="space-y-2 text-sm">
                  <label className="text-xs font-semibold text-ink">Partner</label>
                  <select
                    className="input"
                    value={t.partner_id ?? ''}
                    onChange={(e) => handleTeacherSave(t.id, e.target.value || null, t.courses.map((c) => c.id))}
                  >
                    <option value="">Kein Partner</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 text-sm">
                  <label className="text-xs font-semibold text-ink">Kurse (anklicken zum Auswählen)</label>
                  <div className="flex flex-wrap gap-2">
                    {courseOptions.map((c) => {
                      const selected = t.courses.some((cc) => cc.id === c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const ids = selected
                              ? t.courses.filter((cc) => cc.id !== c.id).map((cc) => cc.id)
                              : [...t.courses.map((cc) => cc.id), c.id];
                            handleTeacherSave(t.id, t.partner_id ?? null, ids);
                          }}
                          className={`px-3 py-1 rounded-full border text-xs ${
                            selected
                              ? 'bg-pink-100 text-pink-700 border-pink-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-pink-200'
                          }`}
                        >
                          {c.title}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Nur Kurse aktivieren, die der Dozent unterrichtet – steuert Zugriff auf Kursmaterial & Buchungen.
                  </p>
                </div>
                {savingTeacher === t.id && <p className="text-xs text-slate-500">Speichern...</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="card p-6 shadow-xl text-slate-900 space-y-4">
          {loading && <p className="text-sm text-slate-500">Lade...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && members.length === 0 && (
            <p className="text-sm text-slate-500">Keine Members gefunden.</p>
          )}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <input
              type="search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Suchen nach Name oder E-Mail"
              className="input max-w-sm"
            />
            <span className="text-xs text-slate-500">Gesamt: {members.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {members
              .filter((m) => {
                const q = memberSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (m.full_name || '').toLowerCase().includes(q) ||
                  (m.email || '').toLowerCase().includes(q)
                );
              })
              .map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{m.full_name || 'Ohne Name'}</p>
                    <p className="text-xs text-slate-500">{m.email ?? '—'}</p>
                  </div>
                  <span className="px-2 py-1 text-[11px] rounded-full bg-slate-100 text-slate-700 border border-slate-200">{m.role}</span>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {(['admin','teacher','student'] as Role[]).map((r) => (
                    <button
                      key={r}
                      className={`px-3 py-1 rounded-lg border ${m.role === r ? 'border-pink-300 text-pink-700 bg-pink-50' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                      onClick={() => handleMemberRole(m.id, r)}
                      disabled={savingMember === m.id}
                    >
                      {r}
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 text-slate-700 bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(m.approved)}
                      onChange={() => {}}
                      onClick={async (e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        setSavingMember(m.id);
                        const res = await fetch('/api/admin/members', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: m.id, role: m.role, approved: checked }),
                        });
                        if (res.ok) {
                          const refreshed = await fetch('/api/admin/members').then((r) => r.json());
                          setMembers(refreshed);
                        } else {
                          const d = await res.json().catch(() => ({}));
                          setError(d.error || 'Speichern fehlgeschlagen');
                        }
                        setSavingMember(null);
                      }}
                    />
                    <span>Approved</span>
                  </label>
                  <button
                    className="ml-auto px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleMemberDelete(m.id)}
                    disabled={savingMember === m.id}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
