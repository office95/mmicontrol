'use client';

import { useEffect, useMemo, useState } from 'react';

type Participant = { student_id: string | null; name: string; email: string; phone?: string | null };
type Session = { id: string; date: string; entries: Entry[] };
type Entry = { student_id: string | null; status: 'present' | 'absent'; note?: string | null };

export default function AttendanceModal({
  courseId,
  courseTitle,
  participants: initialParticipants,
  readOnly = false,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  participants?: Participant[];
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants || []);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!initialParticipants) {
          const resP = await fetch(`/api/attendance/participants?course_id=${courseId}`);
          const dataP = await resP.json();
          if (!ignore && resP.ok) setParticipants(dataP);
        }
        const res = await fetch(`/api/attendance?course_id=${courseId}`);
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) setError(data.error || 'Fehler beim Laden');
          else {
            setSessions(data);
            if (data.length && !selectedSessionId) setSelectedSessionId(data[0].id);
          }
        }
      } catch (e: any) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [courseId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  const entryKey = (student_id: string | null | undefined, id?: string) => student_id ?? id ?? '';

  const entryMap = useMemo(() => {
    const map = new Map<string, Entry>();
    if (selectedSession) {
      selectedSession.entries.forEach((e) => {
        const key = entryKey(e.student_id, (e as any).id);
        map.set(key, e);
      });
    }
    return map;
  }, [selectedSession]);

  const displayParticipants: Participant[] =
    participants.length
      ? participants
      : selectedSession
        ? selectedSession.entries.map((e: any) => ({
            student_id: entryKey(e.student_id, e.id),
            name: e.student?.name ?? 'Teilnehmer',
            email: e.student?.email ?? '',
            phone: e.student?.phone ?? null,
          }))
        : [];

  const updateEntry = async (student_id: string | null, status: 'present' | 'absent', note?: string | null) => {
    if (readOnly || !selectedSession) return;
    const res = await fetch('/api/attendance/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: selectedSession.id, student_id, status, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Fehler beim Speichern');
      return;
    }
    // refresh local state
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedSession.id
          ? {
              ...s,
              entries: [
                ...s.entries.filter((e) => e.student_id !== student_id),
                { student_id, status, note: note ?? null } as Entry,
              ],
            }
          : s
      )
    );
  };

  const addSession = async () => {
    if (readOnly || !newDate) return;
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, date: newDate }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Kurstag konnte nicht angelegt werden');
      return;
    }
    setSessions((prev) => [...prev, { ...data, entries: [] }]);
    setSelectedSessionId(data.id);
    setNewDate('');
  };

  const badge = (txt: string) => (
    <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] uppercase tracking-[0.12em]">
      {txt}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl rounded-3xl bg-white text-ink shadow-2xl border border-slate-300 relative max-h-[90vh] overflow-hidden">
        <div className="absolute -right-24 -top-24 h-56 w-56 bg-emerald-300/50 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 bg-pink-300/50 blur-3xl" />

        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 relative z-10">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Anwesenheitsliste</p>
            <h3 className="text-2xl font-semibold text-ink drop-shadow-sm">{courseTitle}</h3>
            <div className="flex gap-2 flex-wrap">
              {badge(readOnly ? 'Ansicht' : 'Bearbeitung')}
              {selectedSession && badge(new Date(selectedSession.date).toLocaleDateString())}
            </div>
          </div>
          <button
            className="rounded-full bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-sm"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-4 relative z-10 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-2 flex-wrap">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`px-3 py-2 rounded-xl text-sm border ${
                    selectedSessionId === s.id
                      ? 'bg-pink-100 border-pink-300 text-pink-900'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-white'
                  }`}
                >
                  {new Date(s.date).toLocaleDateString()}
                </button>
              ))}
              {!sessions.length && <span className="text-sm text-white/70">Noch keine Kurstage.</span>}
            </div>
            {!readOnly && (
              <div className="flex gap-2 items-center ml-auto">
                <input
                  type="date"
                  className="input h-10 text-sm"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <button
                  className="rounded-xl bg-pink-500 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-pink-400 disabled:opacity-50"
                  onClick={addSession}
                  disabled={!newDate}
                >
                  Kurstag hinzufügen
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-slate-500">Lade...</p>}
        </div>

        {selectedSession && (
          <div className="relative z-10 px-6 pb-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-800">
                  <thead>
                    <tr className="text-left text-white/60 uppercase text-[11px] tracking-[0.12em]">
                      <th className="py-2 pr-3 text-slate-500">Teilnehmer</th>
                      <th className="py-2 pr-3 text-slate-500">Status</th>
                      <th className="py-2 pr-3 text-slate-500">Notiz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayParticipants.map((p) => {
                      const key = entryKey(p.student_id, undefined);
                      const entry = entryMap.get(key) || null;
                      return (
                        <tr key={p.student_id ?? p.email ?? key}>
                          <td className="py-2 pr-3">
                            <div className="font-semibold text-ink">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.student_id ? 'Student' : 'Gast'}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={readOnly || (!p.student_id && !entry)}
                                onClick={() => updateEntry(p.student_id, 'present', entry?.note)}
                                className={`px-3 py-1 rounded-lg border text-xs ${
                                  entry?.status === 'present'
                                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                anwesend
                              </button>
                              <button
                                disabled={readOnly || (!p.student_id && !entry)}
                                onClick={() => updateEntry(p.student_id, 'absent', entry?.note)}
                                className={`px-3 py-1 rounded-lg border text-xs ${
                                  entry?.status === 'absent'
                                    ? 'bg-pink-100 border-pink-400 text-pink-800'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                abwesend
                              </button>
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              disabled={readOnly || entry?.status !== 'absent'}
                              className="input h-9 w-full text-xs disabled:opacity-50"
                              placeholder="Notiz"
                              value={entry?.note ?? ''}
                              onChange={(e) => updateEntry(p.student_id, 'absent', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
