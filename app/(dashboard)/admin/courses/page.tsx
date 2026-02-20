'use client';

import AdminCourseList from '@/components/admin-course-list';
import { useState } from 'react';
import CourseModal from '@/components/course-modal';
import ButtonLink from '@/components/button-link';

export default function AdminCoursesPage() {
  const [open, setOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
          <h1 className="text-3xl font-semibold text-white">Kurse</h1>
          <p className="text-sm text-slate-200">Kurse anlegen, bearbeiten und archivieren.</p>
        </div>
        <div className="flex items-center gap-3">
          <ButtonLink href="/admin">Zurück</ButtonLink>
          <button
            onClick={() => {
              setEditCourse(null);
              setOpen(true);
            }}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 shadow"
          >
            Neuen Kurs anlegen
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4 text-slate-900 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Alle Kurse</h2>
        </div>
        <AdminCourseList
          refresh={refreshKey}
          onEdit={(course) => { setEditCourse(course); setOpen(true); }}
        />
      </div>

      {open && (
        <CourseModal
          initialCourse={editCourse}
          onClose={() => { setOpen(false); setEditCourse(null); }}
          onSaved={() => {
            setOpen(false);
            setEditCourse(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
