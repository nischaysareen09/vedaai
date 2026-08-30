'use client';

import { saveAnswerImages } from '@/lib/image-storage';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function AssignmentsPage() {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
          <div className="px-8 py-4">
            <h1 className="text-lg font-semibold text-gray-900">Assignments</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-8 py-10">
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Homework and take-home work will live here, separate from in-class Exams."
            ctaLabel="Go to Exams"
            ctaHref="/"
          />
        </div>
      </main>
    </div>
  );
}