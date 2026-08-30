'use client';

import { Question, QuestionMapping } from '@/lib/types';
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  XCircle,
} from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  mappings: QuestionMapping[];
  selectedQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
}

export default function QuestionList({
  questions,
  mappings,
  selectedQuestionId,
  onSelectQuestion,
}: QuestionListProps) {
  const getScoreColor = (score: number, maxMarks: number) => {
    if (maxMarks <= 0) {
      return 'bg-gray-100 text-gray-700 border-gray-200';
    }

    const percentage = (score / maxMarks) * 100;

    if (percentage >= 80) {
      return 'bg-green-50 text-green-700 border-green-200';
    }

    if (percentage >= 50) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }

    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getMapping = (questionId: string) => {
    return mappings.find(
      (mapping) => mapping.questionId === questionId
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">
              Extracted Questions
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              {questions.length} questions extracted
            </p>
          </div>

          <ChevronDown className="w-4 h-4 text-purple-600" />
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No questions extracted.
          </div>
        ) : (
          questions.map((question, index) => {
            const mapping = getMapping(question.id);

            const isSelected =
              selectedQuestionId === question.id;

            const marks = question.marks ?? 0;

            const score =
              typeof mapping?.score === 'number'
                ? mapping.score
                : undefined;

            const scoreColor =
              score !== undefined
                ? getScoreColor(score, marks)
                : 'bg-gray-100 text-gray-700 border-gray-200';

            const status =
              mapping?.status ?? 'unanswered';

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onSelectQuestion(question.id)}
                className={`
                  w-full text-left px-4 py-3
                  border-b border-gray-200
                  transition-colors
                  border-l-4
                  ${
                    isSelected
                      ? 'bg-purple-50 border-l-purple-600'
                      : 'bg-white border-l-transparent hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Number */}
                  <div
                    className={`
                      w-8 h-8 rounded-full
                      flex items-center justify-center
                      shrink-0 text-xs font-bold
                      ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`
                          text-sm leading-5 line-clamp-2
                          ${
                            isSelected
                              ? 'text-gray-900 font-medium'
                              : 'text-gray-800'
                          }
                        `}
                      >
                        {question.text}
                      </p>

                      {isSelected && (
                        <ChevronDown className="w-4 h-4 text-purple-600 shrink-0 rotate-[-90deg]" />
                      )}
                    </div>

                    {/* Status / score */}
                    <div className="mt-2">
                      {status === 'answered' &&
                      score !== undefined ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`
                              inline-flex items-center gap-1
                              px-2 py-1 rounded-md
                              border text-xs font-semibold
                              ${scoreColor}
                            `}
                          >
                            <span>
                              {score}/{marks}
                            </span>
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Graded
                          </span>
                        </div>
                      ) : status === 'unanswered' ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="
                              inline-flex items-center gap-1
                              px-2 py-1 rounded-md
                              border border-red-200
                              bg-red-50
                              text-red-700
                              text-xs font-semibold
                            "
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            0/{marks}
                          </span>

                          <span className="text-xs font-medium text-red-600">
                            Unanswered
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="
                              inline-flex items-center gap-1
                              px-2 py-1 rounded-md
                              border border-orange-200
                              bg-orange-50
                              text-orange-700
                              text-xs font-semibold
                            "
                          >
                            <CircleHelp className="w-3.5 h-3.5" />
                            —/{marks}
                          </span>

                          <span className="text-xs font-medium text-orange-600">
                            Unmatched
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-white border-t border-gray-200 shrink-0">
        <p className="text-[11px] text-gray-400 text-center">
          Click a question to view its answer
        </p>
      </div>
    </div>
  );
}