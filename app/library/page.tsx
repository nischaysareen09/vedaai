'use client';

import { saveAnswerImages } from '@/lib/image-storage';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { getHistory, AssessmentRecord } from '@/lib/history';
import { BookOpen, FileText } from 'lucide-react';

export default function LibraryPage() {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const papers = Array.from(new Set(history.map((h) => h.questionPaperName)));

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
          <div className="px-8 py-4">
            <h1 className="text-lg font-semibold text-gray-900">My Library</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-8 py-10">
          {papers.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No question papers yet"
              description="Every question paper you've graded with is saved here for reuse."
              ctaLabel="Upload a question paper"
              ctaHref="/"
            />
          ) : (
            <div className="space-y-2">
              {papers.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
                >
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}