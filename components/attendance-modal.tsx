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

  const entryMap = useMemo(() => {
    const map = new Map<string, Entry>();
    if (selectedSession) {
      selectedSession.entries.forEach((e) => {
        const key = e.student_id || e.student_id === null ? e.student_id ?? '' : '';
        map.set(key, e);
      });
    }
    return map;
  }, [selectedSession]);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white text-ink shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-3 right-3 text-slate-500 hover:text-ink" onClick={onClose}>
          ×
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Kurs</p>
            <h3 className="text-2xl font-semibold text-ink">{courseTitle}</h3>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input h-10"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <button
                className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-brand-700 disabled:opacity-50"
                onClick={addSession}
                disabled={!newDate}
              >
                Kurstag hinzufügen
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {loading && <p className="text-sm text-slate-500 mb-2">Lade...</p>}

        <div className="flex flex-wrap gap-2 mb-4">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSessionId(s.id)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                selectedSessionId === s.id ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-300 text-slate-700'
              }`}
            >
              {new Date(s.date).toLocaleDateString()}
            </button>
          ))}
          {!sessions.length && <p className="text-sm text-slate-500">Noch keine Kurstage angelegt.</p>}
        </div>

        {selectedSession && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600">
                Kurstag: {new Date(selectedSession.date).toLocaleDateString()}
              </p>
              {readOnly && <span className="text-xs text-slate-400">Nur Ansicht</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3">Teilnehmer</th>
                    <th className="py-2 pr-3">E-Mail</th>
                    <th className="py-2 pr-3">Telefon</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Notiz (bei abwesend)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {participants.map((p) => {
                    const entry = entryMap.get(p.student_id ?? '') || null;
                    return (
                      <tr key={p.student_id ?? p.email}>
                        <td className="py-2 pr-3 text-ink">{p.name}</td>
                        <td className="py-2 pr-3 text-slate-600">{p.email}</td>
                        <td className="py-2 pr-3 text-slate-600">{p.phone || '—'}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-slate-700 text-xs">
                              <input
                                type="radio"
                                disabled={readOnly || (!p.student_id && !entry)}
                                checked={entry?.status === 'present'}
                                onChange={() => updateEntry(p.student_id, 'present', entry?.note)}
                              />
                              anwesend
                            </label>
                            <label className="flex items-center gap-1 text-slate-700 text-xs">
                              <input
                                type="radio"
                                disabled={readOnly || (!p.student_id && !entry)}
                                checked={entry?.status === 'absent'}
                                onChange={() => updateEntry(p.student_id, 'absent', entry?.note)}
                              />
                              abwesend
                            </label>
                            {!p.student_id && (
                              <span className="text-[11px] text-amber-600">kein student_id</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            disabled={readOnly || entry?.status !== 'absent'}
                            className="input h-9 w-full text-xs"
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
        )}
      </div>
    </div>
  );
}
