'use client';

import {
  Question,
  QuestionMapping,
} from '@/lib/types';

import {
  Award,
  Target,
  TrendingUp,
  BarChart3,
  CircleHelp,
} from 'lucide-react';

interface GradingSummaryProps {
  questions: Question[];
  mappings: QuestionMapping[];
}

export default function GradingSummary({
  questions,
  mappings,
}: GradingSummaryProps) {
  const totalQuestions = questions.length;

  const answeredCount = mappings.filter(
    (m) => m.status === 'answered'
  ).length;

  const unansweredCount = mappings.filter(
    (m) => m.status === 'unanswered'
  ).length;

  const unmatchedCount = mappings.filter(
    (m) => m.status === 'unmatched'
  ).length;

  let totalMarks = 0;
  let earnedMarks = 0;

  questions.forEach((question) => {
    const marks = question.marks ?? 0;

    totalMarks += marks;

    const mapping = mappings.find(
      (m) => m.questionId === question.id
    );

    if (
      mapping?.status === 'answered' &&
      typeof mapping.score === 'number'
    ) {
      earnedMarks += Math.max(
        0,
        Math.min(mapping.score, marks)
      );
    }
  });

  const percentage =
    totalMarks > 0
      ? Math.round((earnedMarks / totalMarks) * 100)
      : 0;

  const getGrade = (value: number) => {
    if (value >= 90) {
      return {
        grade: 'A+',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
      };
    }

    if (value >= 80) {
      return {
        grade: 'A',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
      };
    }

    if (value >= 70) {
      return {
        grade: 'B',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      };
    }

    if (value >= 60) {
      return {
        grade: 'C',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      };
    }

    if (value >= 50) {
      return {
        grade: 'D',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
      };
    }

    return {
      grade: 'F',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    };
  };

  const gradeInfo = getGrade(percentage);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
          <Award className="w-5 h-5 text-white" />
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900">
            Overall Performance
          </h2>

          <p className="text-xs text-gray-500">
            Assessment Summary
          </p>
        </div>
      </div>

      {/* Grade */}
      <div
        className={`
          ${gradeInfo.bg}
          ${gradeInfo.border}
          rounded-xl
          p-4
          text-center
          border
        `}
      >
        <div className="flex items-center justify-center gap-4">
          <div
            className={`
              text-5xl
              font-extrabold
              ${gradeInfo.color}
            `}
          >
            {gradeInfo.grade}
          </div>

          <div className="text-left">
            <div
              className={`
                text-2xl
                font-bold
                ${gradeInfo.color}
              `}
            >
              {percentage}%
            </div>

            <div className="text-xs text-gray-600">
              Score
            </div>
          </div>
        </div>

        <div className="text-xs font-medium text-gray-700 mt-2">
          {earnedMarks} out of {totalMarks} marks
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {/* Answered */}
        <div className="bg-green-50 rounded-xl p-3 border border-green-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-green-600" />

            <span className="text-[10px] font-bold text-green-700 uppercase">
              Answered
            </span>
          </div>

          <div className="text-2xl font-bold text-green-700">
            {answeredCount}
          </div>

          <div className="text-[10px] text-green-600 mt-0.5">
            {totalQuestions > 0
              ? Math.round(
                  (answeredCount / totalQuestions) * 100
                )
              : 0}
            %
          </div>
        </div>

        {/* Unanswered */}
        <div className="bg-red-50 rounded-xl p-3 border border-red-200">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-red-600" />

            <span className="text-[10px] font-bold text-red-700 uppercase">
              Skipped
            </span>
          </div>

          <div className="text-2xl font-bold text-red-700">
            {unansweredCount}
          </div>

          <div className="text-[10px] text-red-600 mt-0.5">
            {totalQuestions > 0
              ? Math.round(
                  (unansweredCount / totalQuestions) * 100
                )
              : 0}
            %
          </div>
        </div>

        {/* Unmatched */}
        <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
          <div className="flex items-center gap-1.5 mb-1">
            <CircleHelp className="w-3.5 h-3.5 text-orange-600" />

            <span className="text-[10px] font-bold text-orange-700 uppercase">
              Unmatched
            </span>
          </div>

          <div className="text-2xl font-bold text-orange-700">
            {unmatchedCount}
          </div>

          <div className="text-[10px] text-orange-600 mt-0.5">
            Needs review
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Progress
          </span>

          <span className="font-bold text-gray-900">
            {percentage}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`
              h-full
              rounded-full
              transition-all
              duration-700
              ${
                percentage >= 80
                  ? 'bg-green-500'
                  : percentage >= 60
                  ? 'bg-blue-500'
                  : percentage >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }
            `}
            style={{
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}