'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import QuestionList from '@/components/QuestionList';
import AnswerSheetViewer from '@/components/AnswerSheetViewer';

import {
  getAnswerImages,
} from '@/lib/image-storage';

import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  CircleHelp,
  MapPin,
  Target,
  BrainCircuit,
  Activity,
  ChevronRight,
  FileSearch,
  BarChart3,
  ScanSearch,
} from 'lucide-react';

import {
  Question,
  QuestionMapping,
} from '@/lib/types';

interface ResultsData {
  questions: Question[];
  mappings: QuestionMapping[];
  imageStorageKey?: string;
  createdAt?: string;
}

export default function ResultsPage() {
  const router =
    useRouter();

  const [
    result,
    setResult,
  ] =
    useState<ResultsData | null>(
      null
    );

  const [
    answerImages,
    setAnswerImages,
  ] =
    useState<string[]>([]);

  const [
    selectedQuestionId,
    setSelectedQuestionId,
  ] =
    useState<string | null>(
      null
    );

  const [
    loadingImages,
    setLoadingImages,
  ] =
    useState(true);

  const [
    imageError,
    setImageError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let cancelled =
      false;

    async function loadResults() {
      try {
        const raw =
          sessionStorage.getItem(
            'extractionResult'
          );

        if (!raw) {
          router.replace('/');
          return;
        }

        const parsed =
          JSON.parse(
            raw
          ) as ResultsData;

        if (
          !parsed ||
          !Array.isArray(
            parsed.questions
          ) ||
          !Array.isArray(
            parsed.mappings
          )
        ) {
          throw new Error(
            'Invalid extraction result.'
          );
        }

        const questions: Question[] =
          parsed.questions.map(
            (
              question
            ) => {
              const rawMarks =
                Number(
                  question.marks
                );

              const marks =
                Number.isFinite(
                  rawMarks
                ) &&
                rawMarks > 0
                  ? rawMarks
                  : 1;

              return {
                ...question,
                marks,
              };
            }
          );

        const questionMap =
          new Map<
            string,
            Question
          >();

        questions.forEach(
          (question) => {
            questionMap.set(
              question.id,
              question
            );
          }
        );

        const mappings: QuestionMapping[] =
          parsed.mappings.map(
            (
              mapping
            ) => {
              const question =
                questionMap.get(
                  mapping.questionId
                );

              const maxMarks =
                question &&
                typeof question.marks ===
                  'number' &&
                question.marks > 0
                  ? question.marks
                  : 1;

              const rawScore =
                Number(
                  mapping.score
                );

              const score =
                Number.isFinite(
                  rawScore
                )
                  ? Math.max(
                      0,
                      Math.min(
                        maxMarks,
                        rawScore
                      )
                    )
                  : 0;

              const status =
                mapping.status ===
                  'answered' ||
                mapping.status ===
                  'unanswered' ||
                mapping.status ===
                  'unmatched'
                  ? mapping.status
                  : 'unanswered';

              return {
                ...mapping,
                score,
                status,
                regions:
                  Array.isArray(
                    mapping.regions
                  )
                    ? mapping.regions
                    : [],
              };
            }
          );

        const normalized: ResultsData =
          {
            ...parsed,
            questions,
            mappings,
          };

        if (cancelled) {
          return;
        }

        setResult(
          normalized
        );

        setSelectedQuestionId(
          questions[0]?.id ??
            null
        );

        setLoadingImages(
          true
        );

        setImageError(
          null
        );

        if (
          !parsed.imageStorageKey
        ) {
          setAnswerImages(
            []
          );

          setImageError(
            'This assessment has no answer-sheet storage key.'
          );

          setLoadingImages(
            false
          );

          return;
        }

        try {
          console.log(
            '[VedaAI] Loading answer sheet:',
            parsed.imageStorageKey
          );

          const images =
            await getAnswerImages(
              parsed.imageStorageKey
            );

          if (
            cancelled
          ) {
            return;
          }

          console.log(
            '[VedaAI] Answer images loaded:',
            images.length
          );

          if (
            images.length ===
            0
          ) {
            setAnswerImages(
              []
            );

            setImageError(
              'No answer-sheet pages were found in browser storage.'
            );
          } else {
            setAnswerImages(
              images
            );

            setImageError(
              null
            );
          }
        } catch (
          error
        ) {
          console.error(
            '[VedaAI] Failed to load answer sheet:',
            error
          );

          if (
            !cancelled
          ) {
            setAnswerImages(
              []
            );

            setImageError(
              error instanceof Error
                ? error.message
                : 'Could not load the saved answer sheet.'
            );
          }
        }

        if (
          !cancelled
        ) {
          setLoadingImages(
            false
          );
        }
      } catch (
        error
      ) {
        console.error(
          '[VedaAI] Failed to load results:',
          error
        );

        if (
          !cancelled
        ) {
          router.replace(
            '/'
          );
        }
      }
    }

    loadResults();

    return () => {
      cancelled =
        true;
    };
  }, [router]);

  const selectedQuestion =
    useMemo(() => {
      if (
        !result ||
        !selectedQuestionId
      ) {
        return null;
      }

      return (
        result.questions.find(
          (
            question
          ) =>
            question.id ===
            selectedQuestionId
        ) ?? null
      );
    }, [
      result,
      selectedQuestionId,
    ]);

  const selectedMapping =
    useMemo(() => {
      if (
        !result ||
        !selectedQuestionId
      ) {
        return null;
      }

      return (
        result.mappings.find(
          (
            mapping
          ) =>
            mapping.questionId ===
            selectedQuestionId
        ) ?? null
      );
    }, [
      result,
      selectedQuestionId,
    ]);

  const selectedRegions =
    useMemo(() => {
      if (
        !selectedMapping
      ) {
        return [];
      }

      return Array.isArray(
        selectedMapping.regions
      )
        ? selectedMapping.regions
        : [];
    }, [
      selectedMapping,
    ]);

  const selectedScore =
    useMemo(() => {
      if (
        !selectedQuestion ||
        !selectedMapping
      ) {
        return 0;
      }

      const maxMarks =
        Number(
          selectedQuestion.marks
        );

      const safeMax =
        Number.isFinite(
          maxMarks
        ) &&
        maxMarks > 0
          ? maxMarks
          : 1;

      const rawScore =
        Number(
          selectedMapping.score
        );

      if (
        !Number.isFinite(
          rawScore
        )
      ) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          safeMax,
          rawScore
        )
      );
    }, [
      selectedQuestion,
      selectedMapping,
    ]);

  const stats =
    useMemo(() => {
      if (!result) {
        return {
          answered: 0,
          unanswered: 0,
          unmatched: 0,
          mapped: 0,
          totalMarks: 0,
          scored: 0,
        };
      }

      const answered =
        result.mappings.filter(
          (
            mapping
          ) =>
            mapping.status ===
            'answered'
        ).length;

      const unanswered =
        result.mappings.filter(
          (
            mapping
          ) =>
            mapping.status ===
            'unanswered'
        ).length;

      const unmatched =
        result.mappings.filter(
          (
            mapping
          ) =>
            mapping.status ===
            'unmatched'
        ).length;

      const mapped =
        result.mappings.filter(
          (
            mapping
          ) =>
            Array.isArray(
              mapping.regions
            ) &&
            mapping.regions
              .length > 0
        ).length;

      const totalMarks =
        result.questions.reduce(
          (
            sum,
            question
          ) => {
            const marks =
              Number(
                question.marks
              );

            return (
              sum +
              (Number.isFinite(
                marks
              ) &&
              marks > 0
                ? marks
                : 0)
            );
          },
          0
        );

      const scored =
        result.mappings.reduce(
          (
            sum,
            mapping
          ) => {
            const question =
              result.questions.find(
                (
                  item
                ) =>
                  item.id ===
                  mapping.questionId
              );

            const maxMarks =
              question
                ? Number(
                    question.marks
                  )
                : 1;

            const safeMax =
              Number.isFinite(
                maxMarks
              ) &&
              maxMarks > 0
                ? maxMarks
                : 1;

            const rawScore =
              Number(
                mapping.score
              );

            const safeScore =
              Number.isFinite(
                rawScore
              )
                ? Math.max(
                    0,
                    Math.min(
                      safeMax,
                      rawScore
                    )
                  )
                : 0;

            return (
              sum +
              safeScore
            );
          },
          0
        );

      return {
        answered,
        unanswered,
        unmatched,
        mapped,
        totalMarks,
        scored,
      };
    }, [result]);

  const percentage =
    stats.totalMarks >
    0
      ? Math.round(
          (stats.scored /
            stats.totalMarks) *
            100
        )
      : 0;

  const mappingRate =
    result &&
    result.questions.length >
      0
      ? Math.round(
          (stats.mapped /
            result.questions.length) *
            100
        )
      : 0;

  const grade =
    percentage >= 90
      ? 'A+'
      : percentage >= 80
        ? 'A'
        : percentage >= 70
          ? 'B'
          : percentage >= 60
            ? 'C'
            : percentage >= 50
              ? 'D'
              : 'F';

  const quality =
    mappingRate >= 90
      ? 'Excellent mapping'
      : mappingRate >= 70
        ? 'Strong mapping'
        : 'Needs review';

  const handleQuestionSelect =
    (
      questionId: string
    ) => {
      setSelectedQuestionId(
        questionId
      );
    };

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0d1d]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
            <Sparkles className="h-5 w-5 animate-pulse text-violet-300" />
          </div>

          <p className="text-sm font-bold text-white">
            Preparing assessment
          </p>

          <p className="mt-1 text-xs text-white/40">
            Loading extracted questions and answer sheet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f2f9] text-gray-900">
      <Sidebar />

      <main className="ml-64 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative flex h-[74px] shrink-0 items-center justify-between overflow-hidden border-b border-white/10 bg-[#101126] px-5 text-white lg:px-6">
          <div className="absolute -top-32 left-[35%] h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black">
                  Assessment Studio
                </h1>

                <span className="rounded-full border border-violet-300/20 bg-violet-500/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-violet-200">
                  AI Review
                </span>
              </div>

              <p className="mt-0.5 text-[10px] text-white/45">
                Question extraction · answer mapping · grading
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:flex">
              <Activity className="h-3.5 w-3.5 text-emerald-300" />

              <span className="text-[9px] font-bold text-white/70">
                Analysis ready
              </span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-black text-[#111126]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Assessment
            </Link>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-auto p-4 lg:p-5">
          <section className="relative mb-4 overflow-hidden rounded-[24px] bg-[#111126] text-white shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.30),transparent_28%)]" />

            <div className="relative grid grid-cols-12 items-center gap-4 px-5 py-5">
              <div className="col-span-12 xl:col-span-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                    <BrainCircuit className="h-4 w-4 text-violet-200" />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
                      Assessment overview
                    </p>

                    <p className="text-[10px] text-white/35">
                      AI-generated performance snapshot
                    </p>
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-5xl font-black leading-none">
                      {percentage}%
                    </p>

                    <p className="mt-2 text-[10px] text-white/50">
                      {stats.scored} of{' '}
                      {stats.totalMarks} marks earned
                    </p>
                  </div>

                  <div className="pb-1">
                    <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-400/15 px-3 py-1.5 text-sm font-black text-violet-100">
                      Grade {grade}
                    </span>

                    <p className="mt-2 text-[9px] text-white/45">
                      {quality}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 max-w-xl overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          percentage
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:col-span-7">
                <Metric
                  label="Answered"
                  value={
                    stats.answered
                  }
                  hint="Responses found"
                  icon={
                    <CheckCircle2 className="h-4 w-4" />
                  }
                  tone="green"
                />

                <Metric
                  label="Skipped"
                  value={
                    stats.unanswered
                  }
                  hint="No response"
                  icon={
                    <XCircle className="h-4 w-4" />
                  }
                  tone="red"
                />

                <Metric
                  label="Review"
                  value={
                    stats.unmatched
                  }
                  hint="Needs attention"
                  icon={
                    <CircleHelp className="h-4 w-4" />
                  }
                  tone="amber"
                />

                <Metric
                  label="Mapped"
                  value={`${mappingRate}%`}
                  hint={`${stats.mapped} located`}
                  icon={
                    <Target className="h-4 w-4" />
                  }
                  tone="violet"
                />
              </div>
            </div>
          </section>

          <section className="grid min-h-[620px] h-[calc(100vh-220px)] grid-cols-12 gap-4">
            <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm lg:col-span-3">
              <div className="shrink-0 border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                      Navigation
                    </p>

                    <h2 className="mt-1 text-sm font-black text-gray-950">
                      Questions
                    </h2>
                  </div>

                  <span className="rounded-lg bg-gray-100 px-2 py-1 text-[9px] font-black text-gray-500">
                    {result.questions.length}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <Legend
                    color="bg-emerald-400"
                    label="Answered"
                  />

                  <Legend
                    color="bg-red-400"
                    label="Skipped"
                  />

                  <Legend
                    color="bg-amber-400"
                    label="Review"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <QuestionList
                  questions={
                    result.questions
                  }
                  mappings={
                    result.mappings
                  }
                  selectedQuestionId={
                    selectedQuestionId
                  }
                  onSelectQuestion={
                    handleQuestionSelect
                  }
                />
              </div>
            </div>

            <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm lg:col-span-6">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 bg-violet-50">
                    <ScanSearch className="h-4 w-4 text-violet-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                      Answer intelligence
                    </p>

                    <h2 className="truncate text-sm font-black text-gray-950">
                      Locate the student&apos;s response
                    </h2>
                  </div>
                </div>

                {selectedQuestion && (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[9px] font-black text-gray-600">
                      Q {selectedQuestion.label}
                    </span>

                    <ChevronRight className="h-3 w-3 text-gray-300" />

                    <span
                      className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                        selectedRegions.length
                          ? 'border border-violet-100 bg-violet-50 text-violet-700'
                          : 'border border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      {selectedRegions.length
                        ? `${selectedRegions.length} region${
                            selectedRegions.length ===
                            1
                              ? ''
                              : 's'
                          }`
                        : 'No region'}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 p-2">
                {loadingImages ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-violet-100 bg-[#f7f5ff]">
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
                        <Sparkles className="h-5 w-5 animate-pulse text-violet-500" />
                      </div>

                      <p className="text-xs font-bold text-gray-600">
                        Preparing document view...
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        Loading handwritten pages
                      </p>
                    </div>
                  </div>
                ) : answerImages.length >
                  0 ? (
                  <AnswerSheetViewer
                    answerImages={
                      answerImages
                    }
                    selectedRegions={
                      selectedRegions
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-red-100 bg-red-50/50 p-6">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>

                      <h3 className="text-sm font-bold text-gray-900">
                        Answer sheet unavailable
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-gray-500">
                        {imageError ||
                          'The answer-sheet pages could not be loaded.'}
                      </p>

                      <Link
                        href="/"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-xs font-bold text-white"
                      >
                        Upload again
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm lg:col-span-3">
              <div className="shrink-0 border-b border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111126]">
                      <Sparkles className="h-4 w-4 text-violet-200" />
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                        AI insight
                      </p>

                      <h2 className="text-sm font-black text-gray-950">
                        Question review
                      </h2>
                    </div>
                  </div>

                  {selectedQuestion && (
                    <span className="text-[9px] font-black text-gray-400">
                      {selectedQuestion.marks}{' '}
                      MARKS
                    </span>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {selectedQuestion ? (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-violet-600">
                          Question{' '}
                          {
                            selectedQuestion.label
                          }
                        </span>

                        {selectedMapping?.status ===
                          'answered' && (
                          <span className="text-[9px] font-black text-emerald-600">
                            {selectedScore}/
                            {
                              selectedQuestion.marks
                            }
                          </span>
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[12px] leading-5 text-gray-800">
                          {
                            selectedQuestion.text
                          }
                        </p>
                      </div>
                    </div>

                    <StatusCard
                      mapping={
                        selectedMapping
                      }
                      regions={
                        selectedRegions.length
                      }
                    />

                    {selectedMapping?.status ===
                      'answered' && (
                      <>
                        <InfoBlock title="Student answer">
                          <p className="whitespace-pre-wrap text-[12px] leading-5 text-gray-700">
                            {selectedMapping.answerText ||
                              'No extracted answer text.'}
                          </p>
                        </InfoBlock>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center gap-1.5">
                              <BarChart3 className="h-3 w-3 text-gray-400" />

                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                Score
                              </p>
                            </div>

                            <p className="mt-1 text-xl font-black text-gray-950">
                              {selectedScore}

                              <span className="text-[10px] text-gray-400">
                                {' '}
                                /{' '}
                                {
                                  selectedQuestion.marks
                                }
                              </span>
                            </p>
                          </div>

                          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-violet-500" />

                              <p className="text-[8px] font-black uppercase tracking-widest text-violet-500">
                                Location
                              </p>
                            </div>

                            <p className="mt-1 text-xl font-black text-violet-700">
                              {
                                selectedRegions.length
                              }
                            </p>

                            <p className="mt-0.5 text-[8px] text-violet-500">
                              mapped region
                              {selectedRegions.length ===
                              1
                                ? ''
                                : 's'}
                            </p>
                          </div>
                        </div>

                        {selectedMapping.feedback && (
                          <InfoBlock
                            title="AI feedback"
                            violet
                          >
                            <p className="text-[12px] leading-5 text-gray-700">
                              {
                                selectedMapping.feedback
                              }
                            </p>
                          </InfoBlock>
                        )}

                        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3.5">
                          <div className="flex items-start gap-2.5">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />

                            <div>
                              <p className="text-[10px] font-black text-violet-900">
                                Exact answer location
                              </p>

                              <p className="mt-1 text-[9px] leading-4 text-violet-700">
                                {selectedRegions.length
                                  ? 'The highlighted region on the answer sheet is the handwriting mapped to this question.'
                                  : 'The answer was detected, but no exact answer region is available.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedMapping?.status ===
                      'unmatched' &&
                      selectedMapping.answerText && (
                        <InfoBlock title="Detected response">
                          <p className="whitespace-pre-wrap text-[12px] leading-5 text-gray-700">
                            {
                              selectedMapping.answerText
                            }
                          </p>
                        </InfoBlock>
                      )}

                    {selectedMapping?.status ===
                      'unanswered' && (
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <XCircle className="mt-0.5 h-4 w-4 text-red-500" />

                          <div>
                            <p className="text-[10px] font-black text-red-900">
                              No answer detected
                            </p>

                            <p className="mt-1 text-[9px] leading-4 text-red-700">
                              This question appears to have been left unanswered.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <Target className="mx-auto mb-3 h-6 w-6 text-violet-400" />

                      <p className="text-xs font-bold text-gray-600">
                        Select a question
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${color}`}
      />

      <span className="text-[8px] font-bold text-gray-400">
        {label}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone:
    | 'green'
    | 'red'
    | 'amber'
    | 'violet';
}) {
  const styles = {
    green:
      'text-emerald-200 bg-emerald-400/10 border-emerald-300/10',

    red:
      'text-red-200 bg-red-400/10 border-red-300/10',

    amber:
      'text-amber-200 bg-amber-400/10 border-amber-300/10',

    violet:
      'text-violet-200 bg-violet-400/10 border-violet-300/10',
  }[tone];

  return (
    <div
      className={`rounded-2xl border p-3 ${styles}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black uppercase tracking-widest opacity-70">
          {label}
        </span>

        {icon}
      </div>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>

      <p className="mt-0.5 text-[8px] opacity-55">
        {hint}
      </p>
    </div>
  );
}

function StatusCard({
  mapping,
  regions,
}: {
  mapping:
    | QuestionMapping
    | null;
  regions: number;
}) {
  if (
    mapping?.status ===
    'answered'
  ) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>

        <div>
          <p className="text-[10px] font-black text-emerald-900">
            Answer detected
          </p>

          <p className="mt-0.5 text-[9px] text-emerald-700">
            {regions > 0
              ? `${regions} exact region${
                  regions === 1
                    ? ''
                    : 's'
                } mapped on the sheet.`
              : 'Response detected, but no region is available.'}
          </p>
        </div>
      </div>
    );
  }

  if (
    mapping?.status ===
    'unmatched'
  ) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
          <CircleHelp className="h-4 w-4 text-amber-600" />
        </div>

        <div>
          <p className="text-[10px] font-black text-amber-900">
            Needs review
          </p>

          <p className="mt-0.5 text-[9px] text-amber-700">
            A response exists but could not be confidently linked to this question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white">
        <XCircle className="h-4 w-4 text-red-600" />
      </div>

      <div>
        <p className="text-[10px] font-black text-red-900">
          Not answered
        </p>

        <p className="mt-0.5 text-[9px] text-red-700">
          No response was detected for this question.
        </p>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  children,
  violet = false,
}: {
  title: string;
  children: React.ReactNode;
  violet?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-gray-400">
        {title}
      </p>

      <div
        className={`rounded-2xl border p-3.5 ${
          violet
            ? 'border-violet-100 bg-violet-50/60'
            : 'border-gray-200 bg-white'
        }`}
      >
        {children}
      </div>
    </div>
  );
}