'use client';

import { saveAnswerImages } from '@/lib/image-storage';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { Users } from 'lucide-react';

export default function ClassroomPage() {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
          <div className="px-8 py-4">
            <h1 className="text-lg font-semibold text-gray-900">My Classroom</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-8 py-10">
          <EmptyState
            icon={Users}
            title="No classes yet"
            description="Add students and sections here so graded results can roll up per class. Coming soon — for now, grade assessments one at a time from Exams."
            ctaLabel="Go to Exams"
            ctaHref="/"
          />
        </div>
      </main>
    </div>
  );
}