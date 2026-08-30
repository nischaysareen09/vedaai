'use client';

import { saveAnswerImages } from '@/lib/image-storage';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { getHistory, AssessmentRecord } from '@/lib/history';
import { useTeacherProfile } from '@/lib/teacher-profile';
import { LayoutGrid, TrendingUp, FileCheck2 } from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useTeacherProfile();
  const [history, setHistory] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const totalGraded = history.length;
  const avgPercentage = totalGraded
    ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / totalGraded)
    : 0;
  const totalQuestions = history.reduce((sum, h) => sum + h.questionCount, 0);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
          <div className="px-8 py-4">
            <h1 className="text-lg font-semibold text-gray-900">Home</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-8 py-10">
          <h2 className="text-2xl text-gray-900 mb-1 font-[family-name:var(--font-fraunces)]">
            {profile ? `Good to see you, ${profile.teacherName.split(' ')[0]}` : 'Good to see you'}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {profile?.schoolName
              ? `${profile.schoolName}${profile.schoolArea ? ` · ${profile.schoolArea}` : ''}`
              : 'Your grading activity at a glance.'}
          </p>

          {totalGraded === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="Nothing graded yet"
              description="Grade your first assessment and it'll show up here — scores, trends, and recent activity."
              ctaLabel="Grade an assessment"
              ctaHref="/"
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <FileCheck2 className="w-5 h-5 text-orange-500 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">{totalGraded}</p>
                  <p className="text-xs text-gray-500">Assessments graded</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <TrendingUp className="w-5 h-5 text-orange-500 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">{avgPercentage}%</p>
                  <p className="text-xs text-gray-500">Average score</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <LayoutGrid className="w-5 h-5 text-orange-500 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
                  <p className="text-xs text-gray-500">Questions reviewed</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent activity</h3>
              <div className="space-y-2">
                {history.slice(0, 8).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{h.answerSheetName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(h.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        · {h.questionCount} questions
                      </p>
                    </div>
                    <div
                      className={`text-sm font-semibold shrink-0 ml-4 ${
                        h.percentage >= 60 ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {h.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}