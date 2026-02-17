'use client';
import { useState } from 'react';
import AdminCourseForm from './admin-course-form';

export default function CourseModal({
  onClose,
  onSaved,
  initialCourse,
}: {
  onClose: () => void;
  onSaved?: () => void;
  initialCourse?: any;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
        >
          ✕
        </button>
        <h2 className="text-2xl font-semibold text-ink mb-6">
          {initialCourse ? 'Kurs bearbeiten' : 'Neuen Kurs anlegen'}
        </h2>
        <AdminCourseForm
          initial={initialCourse}
          onSaved={() => {
            onSaved?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
