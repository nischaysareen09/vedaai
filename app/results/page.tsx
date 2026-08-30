'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import QuestionList from '@/components/QuestionList';
import AnswerSheetViewer from '@/components/AnswerSheetViewer';
import { getAnswerImages } from '@/lib/image-storage';
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
import { Question, QuestionMapping } from '@/lib/types';

interface ResultsData {
  questions: Question[];
  mappings: QuestionMapping[];
  imageStorageKey?: string;
}

export default function ResultsPage() {
  const router = useRouter();

  const [result, setResult] = useState<ResultsData | null>(null);
  const [answerImages, setAnswerImages] = useState<string[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] =
    useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      const raw = sessionStorage.getItem('extractionResult');

      if (!raw) {
        router.replace('/');
        return;
      }

      try {
        const parsed = JSON.parse(raw) as ResultsData;

        if (
          !parsed ||
          !Array.isArray(parsed.questions) ||
          !Array.isArray(parsed.mappings)
        ) {
          throw new Error('Invalid extraction result');
        }

        const questions: Question[] = parsed.questions.map((question) => ({
          ...question,
          marks:
            typeof question.marks === 'number'
              ? question.marks
              : 5,
        }));

        const mappings: QuestionMapping[] = parsed.mappings.map(
          (mapping) => ({
            ...mapping,

            regions: Array.isArray(mapping.regions)
              ? mapping.regions
              : [],

            status:
              mapping.status === 'answered' ||
              mapping.status === 'unmatched' ||
              mapping.status === 'unanswered'
                ? mapping.status
                : 'unanswered',
          })
        );

        const normalized: ResultsData = {
          ...parsed,
          questions,
          mappings,
        };

        if (cancelled) return;

        setResult(normalized);

        if (questions.length > 0) {
          setSelectedQuestionId(questions[0].id);
        }

        if (parsed.imageStorageKey) {
          try {
            const images = await getAnswerImages(
              parsed.imageStorageKey
            );

            if (!cancelled) {
              setAnswerImages(
                Array.isArray(images) ? images : []
              );
            }
          } catch (error) {
            console.error(
              'Failed to load answer-sheet images:',
              error
            );

            if (!cancelled) {
              setAnswerImages([]);
            }
          }
        } else {
          setAnswerImages([]);
        }

        if (!cancelled) {
          setLoadingImages(false);
        }
      } catch (error) {
        console.error(
          'Failed to load extraction result:',
          error
        );

        if (!cancelled) {
          router.replace('/');
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const selectedQuestion = useMemo(() => {
    if (!result || !selectedQuestionId) return null;

    return (
      result.questions.find(
        (question) => question.id === selectedQuestionId
      ) ?? null
    );
  }, [result, selectedQuestionId]);

  const selectedMapping = useMemo(() => {
    if (!result || !selectedQuestionId) return null;

    return (
      result.mappings.find(
        (mapping) =>
          mapping.questionId === selectedQuestionId
      ) ?? null
    );
  }, [result, selectedQuestionId]);

  const selectedRegions = useMemo(() => {
    if (!selectedMapping) return [];

    return Array.isArray(selectedMapping.regions)
      ? selectedMapping.regions
      : [];
  }, [selectedMapping]);

  const stats = useMemo(() => {
    if (!result) {
      return {
        answered: 0,
        unanswered: 0,
        unmatched: 0,
        totalMarks: 0,
        scored: 0,
        mapped: 0,
      };
    }

    const answered = result.mappings.filter(
      (mapping) => mapping.status === 'answered'
    ).length;

    const unanswered = result.mappings.filter(
      (mapping) => mapping.status === 'unanswered'
    ).length;

    const unmatched = result.mappings.filter(
      (mapping) => mapping.status === 'unmatched'
    ).length;

    const mapped = result.mappings.filter(
      (mapping) =>
        Array.isArray(mapping.regions) &&
        mapping.regions.length > 0
    ).length;

    const totalMarks = result.questions.reduce(
      (sum, question) =>
        sum +
        (typeof question.marks === 'number'
          ? question.marks
          : 0),
      0
    );

    const scored = result.mappings.reduce(
      (sum, mapping) =>
        sum +
        (typeof mapping.score === 'number'
          ? mapping.score
          : 0),
      0
    );

    return {
      answered,
      unanswered,
      unmatched,
      totalMarks,
      scored,
      mapped,
    };
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen bg-[#0c0d1d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-5 h-5 text-violet-300 animate-pulse" />
          </div>

          <p className="text-sm font-bold text-white">
            Preparing assessment
          </p>

          <p className="text-xs text-white/40 mt-1">
            Loading extracted questions and answers…
          </p>
        </div>
      </div>
    );
  }

  const percentage =
    stats.totalMarks > 0
      ? Math.round(
          (stats.scored / stats.totalMarks) * 100
        )
      : 0;

  const mappingRate =
    result.questions.length > 0
      ? Math.round(
          (stats.mapped / result.questions.length) * 100
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

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestionId(questionId);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f2f9] text-gray-900">
      <Sidebar />

      <main className="flex-1 ml-64 min-w-0 flex flex-col overflow-hidden">
        {/* =========================================================
            TOP BAR
        ========================================================= */}

        <header className="h-[74px] shrink-0 bg-[#101126] text-white border-b border-white/10 px-5 lg:px-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -top-32 left-[35%] w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight">
                  Assessment Studio
                </h1>

                <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-300/20 text-[8px] font-black uppercase tracking-widest text-violet-200">
                  AI Review
                </span>
              </div>

              <p className="text-[10px] text-white/45 mt-0.5">
                Question extraction · answer mapping · grading
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/7 border border-white/10">
              <Activity className="w-3.5 h-3.5 text-emerald-300" />

              <span className="text-[9px] font-bold text-white/70">
                Analysis ready
              </span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#111126] text-[10px] font-black hover:bg-violet-50 transition shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Assessment
            </Link>
          </div>
        </header>

        {/* =========================================================
            PAGE CONTENT
        ========================================================= */}

        <div className="flex-1 min-h-0 overflow-auto p-4 lg:p-5">
          {/* =======================================================
              SCORE HERO
          ======================================================= */}

          <section className="mb-4 rounded-[24px] bg-[#111126] text-white overflow-hidden relative shadow-[0_20px_60px_rgba(30,27,75,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.30),transparent_28%),radial-gradient(circle_at_45%_100%,rgba(59,130,246,0.16),transparent_35%)]" />

            <div className="relative px-5 py-5 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-12 xl:col-span-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4 text-violet-200" />
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
                    <p className="text-5xl font-black tracking-tight leading-none">
                      {percentage}%
                    </p>

                    <p className="text-[10px] text-white/50 mt-2">
                      {stats.scored} of {stats.totalMarks} marks earned
                    </p>
                  </div>

                  <div className="pb-1">
                    <span className="inline-flex px-3 py-1.5 rounded-full bg-violet-400/15 border border-violet-300/20 text-sm font-black text-violet-100">
                      Grade {grade}
                    </span>

                    <p className="text-[9px] text-white/45 mt-2">
                      {quality}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden max-w-xl">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, percentage)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="col-span-12 xl:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <Metric
                  label="Answered"
                  value={stats.answered}
                  hint="Responses found"
                  icon={
                    <CheckCircle2 className="w-4 h-4" />
                  }
                  tone="green"
                />

                <Metric
                  label="Skipped"
                  value={stats.unanswered}
                  hint="No response"
                  icon={<XCircle className="w-4 h-4" />}
                  tone="red"
                />

                <Metric
                  label="Review"
                  value={stats.unmatched}
                  hint="Needs attention"
                  icon={
                    <CircleHelp className="w-4 h-4" />
                  }
                  tone="amber"
                />

                <Metric
                  label="Mapped"
                  value={`${mappingRate}%`}
                  hint={`${stats.mapped} located`}
                  icon={<Target className="w-4 h-4" />}
                  tone="violet"
                />
              </div>
            </div>
          </section>

          {/* =======================================================
              WORKSPACE
          ======================================================= */}

          <section className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[620px]">
            {/* =====================================================
                QUESTION NAVIGATOR
            ===================================================== */}

            <div className="col-span-12 lg:col-span-3 min-h-0 rounded-[22px] bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="shrink-0 px-4 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                      Navigation
                    </p>

                    <h2 className="text-sm font-black text-gray-950 mt-1">
                      Questions
                    </h2>
                  </div>

                  <span className="px-2 py-1 rounded-lg bg-gray-100 text-[9px] font-black text-gray-500">
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

              <div className="flex-1 min-h-0 overflow-hidden">
                <QuestionList
                  questions={result.questions}
                  mappings={result.mappings}
                  selectedQuestionId={selectedQuestionId}
                  onSelectQuestion={handleQuestionSelect}
                />
              </div>

              <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-3.5 h-3.5 text-violet-500" />

                  <p className="text-[9px] font-semibold text-gray-500">
                    Select any question to locate its answer.
                  </p>
                </div>
              </div>
            </div>

            {/* =====================================================
                ANSWER VIEWER
            ===================================================== */}

            <div className="col-span-12 lg:col-span-6 min-h-0 rounded-[22px] bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="shrink-0 px-4 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                    <ScanSearch className="w-4 h-4 text-violet-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                      Answer intelligence
                    </p>

                    <h2 className="text-sm font-black text-gray-950 truncate">
                      Locate the student's response
                    </h2>
                  </div>
                </div>

                {selectedQuestion && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[9px] font-black text-gray-600">
                      Q {selectedQuestion.label}
                    </span>

                    <ChevronRight className="w-3 h-3 text-gray-300" />

                    <span
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black ${
                        selectedRegions.length
                          ? 'bg-violet-50 text-violet-700 border border-violet-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {selectedRegions.length
                        ? `${selectedRegions.length} region${
                            selectedRegions.length === 1
                              ? ''
                              : 's'
                          }`
                        : 'No region'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 p-2">
                {loadingImages ? (
                  <div className="h-full rounded-2xl bg-[#f7f5ff] border border-violet-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                      </div>

                      <p className="text-xs font-bold text-gray-600">
                        Preparing document view…
                      </p>

                      <p className="text-[10px] text-gray-400 mt-1">
                        Loading handwritten pages
                      </p>
                    </div>
                  </div>
                ) : (
                  <AnswerSheetViewer
                    answerImages={answerImages}
                    selectedRegions={selectedRegions}
                  />
                )}
              </div>
            </div>

            {/* =====================================================
                AI ANALYSIS
            ===================================================== */}

            <div className="col-span-12 lg:col-span-3 min-h-0 rounded-[22px] bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="shrink-0 px-4 py-4 bg-gradient-to-br from-violet-50 via-white to-white border-b border-violet-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#111126] flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4 text-violet-200" />
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
                      {selectedQuestion.marks} MARKS
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {selectedQuestion ? (
                  <div className="space-y-4">
                    {/* Question */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-violet-600">
                          Question {selectedQuestion.label}
                        </span>

                        {selectedMapping?.status ===
                          'answered' && (
                          <span className="text-[9px] font-black text-emerald-600">
                            {selectedMapping.score ?? 0}/
                            {selectedQuestion.marks}
                          </span>
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[12px] leading-5.5 text-gray-800">
                          {selectedQuestion.text}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <StatusCard
                      mapping={selectedMapping}
                      regions={selectedRegions.length}
                    />

                    {/* Answer */}
                    {selectedMapping?.status ===
                      'answered' && (
                      <>
                        <InfoBlock title="Student answer">
                          <p className="text-[12px] leading-5.5 text-gray-700 whitespace-pre-wrap">
                            {selectedMapping.answerText ||
                              'No extracted answer text.'}
                          </p>
                        </InfoBlock>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center gap-1.5">
                              <BarChart3 className="w-3 h-3 text-gray-400" />

                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                Score
                              </p>
                            </div>

                            <p className="text-xl font-black text-gray-950 mt-1">
                              {selectedMapping.score ??
                                '—'}

                              <span className="text-[10px] text-gray-400">
                                {' '}
                                / {selectedQuestion.marks}
                              </span>
                            </p>
                          </div>

                          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-violet-500" />

                              <p className="text-[8px] font-black uppercase tracking-widest text-violet-500">
                                Location
                              </p>
                            </div>

                            <p className="text-xl font-black text-violet-700 mt-1">
                              {selectedRegions.length}
                            </p>

                            <p className="text-[8px] text-violet-500 mt-0.5">
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
                            <p className="text-[12px] leading-5.5 text-gray-700">
                              {selectedMapping.feedback}
                            </p>
                          </InfoBlock>
                        )}

                        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-3.5">
                          <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />

                            <div>
                              <p className="text-[10px] font-black text-violet-900">
                                Exact answer location
                              </p>

                              <p className="text-[9px] leading-4.5 text-violet-700 mt-1">
                                {selectedRegions.length
                                  ? 'The highlighted region on the answer sheet is the handwriting mapped to this question.'
                                  : 'The answer was detected, but no exact answer region is available.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Unmatched */}
                    {selectedMapping?.status ===
                      'unmatched' &&
                      selectedMapping.answerText && (
                        <InfoBlock title="Detected response">
                          <p className="text-[12px] leading-5.5 text-gray-700 whitespace-pre-wrap">
                            {selectedMapping.answerText}
                          </p>
                        </InfoBlock>
                      )}

                    {/* Unanswered */}
                    {selectedMapping?.status ===
                      'unanswered' && (
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5" />

                          <div>
                            <p className="text-[10px] font-black text-red-900">
                              No answer detected
                            </p>

                            <p className="text-[9px] text-red-700 mt-1 leading-4">
                              This question appears to have been
                              left unanswered.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center px-5">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                        <Target className="w-5 h-5 text-violet-400" />
                      </div>

                      <p className="text-xs font-bold text-gray-600">
                        Select a question
                      </p>

                      <p className="text-[10px] text-gray-400 mt-1 leading-4">
                        Its question, score, answer, feedback and
                        exact location will appear here.
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

/* ================================================================
   SMALL UI COMPONENTS
================================================================ */

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
        className={`w-2 h-2 rounded-full ${color}`}
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
  tone: 'green' | 'red' | 'amber' | 'violet';
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

      <p className="text-2xl font-black mt-2">
        {value}
      </p>

      <p className="text-[8px] opacity-55 mt-0.5">
        {hint}
      </p>
    </div>
  );
}

function StatusCard({
  mapping,
  regions,
}: {
  mapping: QuestionMapping | null;
  regions: number;
}) {
  if (mapping?.status === 'answered') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black text-emerald-900">
            Answer detected
          </p>

          <p className="text-[9px] text-emerald-700 mt-0.5">
            {regions > 0
              ? `${regions} exact region${
                  regions === 1 ? '' : 's'
                } mapped on the sheet.`
              : 'Response detected, but no region is available.'}
          </p>
        </div>
      </div>
    );
  }

  if (mapping?.status === 'unmatched') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
          <CircleHelp className="w-4 h-4 text-amber-600" />
        </div>

        <div>
          <p className="text-[10px] font-black text-amber-900">
            Needs review
          </p>

          <p className="text-[9px] text-amber-700 mt-0.5">
            A response exists but could not be confidently
            linked to this question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
        <XCircle className="w-4 h-4 text-red-600" />
      </div>

      <div>
        <p className="text-[10px] font-black text-red-900">
          Not answered
        </p>

        <p className="text-[9px] text-red-700 mt-0.5">
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
      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">
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