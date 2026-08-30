'use client';

import { useState, FormEvent } from 'react';
import { useTeacherProfile } from '@/lib/teacher-profile';
import { GraduationCap, X } from 'lucide-react';

export default function TeacherOnboarding() {
  const { profile, isEditing, isReady, closeEditor, saveProfile } = useTeacherProfile();
  const [teacherName, setTeacherName] = useState(profile?.teacherName ?? '');
  const [schoolName, setSchoolName] = useState(profile?.schoolName ?? '');
  const [schoolArea, setSchoolArea] = useState(profile?.schoolArea ?? '');

  if (!isReady || !isEditing) return null;

  // First-run setup is required before using the app; once a profile
  // exists, editing it later can be dismissed without changes.
  const canDismiss = !!profile;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !schoolName.trim()) return;
    saveProfile({
      teacherName: teacherName.trim(),
      schoolName: schoolName.trim(),
      schoolArea: schoolArea.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-medium border-2 border-dashed border-orange-300 p-7 animate-scale-in">
        {canDismiss && (
          <button
            onClick={closeEditor}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center mb-4">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-2xl text-gray-900 mb-1 font-[family-name:var(--font-fraunces)]">
          {canDismiss ? 'Update your details' : 'Welcome to your toolkit'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {canDismiss
            ? 'Change what shows on your sidebar and reports.'
            : "Tell us who's grading, so every report carries your name."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5" htmlFor="teacherName">
              Your name
            </label>
            <input
              id="teacherName"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="e.g. Modhur Rastogi"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5" htmlFor="schoolName">
              School name
            </label>
            <input
              id="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Delhi Public School"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5" htmlFor="schoolArea">
              Branch / area <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="schoolArea"
              value={schoolArea}
              onChange={(e) => setSchoolArea(e.target.value)}
              placeholder="e.g. Rohini Sector-7"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={!teacherName.trim() || !schoolName.trim()}
            className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {canDismiss ? 'Save changes' : "Let's go"}
          </button>
        </form>
      </div>
    </div>
  );
}