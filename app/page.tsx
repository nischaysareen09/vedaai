'use client';

import { useState, DragEvent } from 'react';
import { useRouter } from 'next/navigation';

import { pdfToImages, fileToBase64 } from '@/lib/pdf-processor';
import { saveAnswerImages } from '@/lib/image-storage';

import {
  Upload,
  FileText,
  X,
  ArrowRight,
  AlertCircle,
  Check,
  Sparkles,
  FileSearch,
  ScanLine,
  MapPinned,
  ShieldCheck,
  Clock3,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import LoadingState from '@/components/LoadingState';
import { addHistoryRecord } from '@/lib/history';
import { useTeacherProfile } from '@/lib/teacher-profile';

const MAX_FILE_MB = 10;

type SlotKey = 'question' | 'answer';

interface UploadSlotProps {
  type: SlotKey;
  label: string;
  description: string;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  error: string | null;
  disabled: boolean;
  step: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FileIcon({
  type,
  active = false,
}: {
  type: SlotKey;
  active?: boolean;
}) {
  if (type === 'question') {
    return (
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
          active
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
            : 'bg-orange-50 text-orange-600'
        }`}
      >
        <FileSearch className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
        active
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
          : 'bg-violet-50 text-violet-600'
      }`}
    >
      <ScanLine className="h-6 w-6" />
    </div>
  );
}

function UploadSlot({
  type,
  label,
  description,
  file,
  onFile,
  onClear,
  error,
  disabled,
  step,
}: UploadSlotProps) {
  const [isDragging, setIsDragging] = useState(false);

  const inputId = `upload-${type}`;

  const handleIncomingFile = (incomingFile: File) => {
    onFile(incomingFile);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      handleIncomingFile(droppedFile);
    }
  };

  const isQuestion = type === 'question';

  return (
    <div className="min-w-0">
      <input
        id={inputId}
        type="file"
        accept=".pdf,image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];

          if (selectedFile) {
            handleIncomingFile(selectedFile);
          }

          e.target.value = '';
        }}
      />

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();

          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`group relative block cursor-pointer overflow-hidden rounded-[28px] border transition-all duration-300 ${
          disabled
            ? 'cursor-not-allowed opacity-70'
            : isDragging
              ? isQuestion
                ? 'border-orange-500 bg-orange-50 shadow-xl shadow-orange-500/10'
                : 'border-violet-500 bg-violet-50 shadow-xl shadow-violet-500/10'
              : file
                ? 'border-gray-200 bg-white shadow-lg shadow-gray-900/[0.04]'
                : error
                  ? 'border-red-300 bg-red-50/40'
                  : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-900/[0.06]'
        }`}
      >
        {/* Top accent */}
        <div
          className={`h-1 w-full ${
            isQuestion ? 'bg-orange-500' : 'bg-violet-600'
          }`}
        />

        <div className="p-6 sm:p-7">
          {/* Card header */}
          <div className="mb-7 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <FileIcon
                type={type}
                active={Boolean(file) || isDragging}
              />

              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                    Step {step}
                  </span>

                  {file && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Check className="h-3 w-3" />
                      Ready
                    </span>
                  )}
                </div>

                <h3 className="truncate text-lg font-bold tracking-tight text-gray-950">
                  {label}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              </div>
            </div>

            {!file && (
              <div
                className={`hidden rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sm:block ${
                  isQuestion
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-violet-50 text-violet-700'
                }`}
              >
                Required
              </div>
            )}
          </div>

          {file ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                  <FileText
                    className={`h-5 w-5 ${
                      isQuestion
                        ? 'text-orange-600'
                        : 'text-violet-600'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {file.name}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span className="text-gray-300">•</span>
                    <span>
                      {file.type === 'application/pdf'
                        ? 'PDF document'
                        : 'Image'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClear();
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />

                <span className="text-xs font-medium text-emerald-800">
                  File passed basic format and size checks
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl border border-dashed px-5 py-9 text-center transition-all ${
                isDragging
                  ? isQuestion
                    ? 'border-orange-400 bg-white'
                    : 'border-violet-400 bg-white'
                  : 'border-gray-300 bg-gray-50/70 group-hover:bg-gray-50'
              }`}
            >
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                  isDragging
                    ? isQuestion
                      ? 'bg-orange-500 text-white'
                      : 'bg-violet-600 text-white'
                    : 'bg-white text-gray-400 shadow-sm ring-1 ring-gray-200'
                }`}
              >
                <Upload className="h-6 w-6" />
              </div>

              <p className="text-sm font-bold text-gray-900">
                {isDragging
                  ? 'Release to add the file'
                  : 'Drop your file here'}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                or click to browse from your computer
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">
                <span>PDF</span>
                <span className="text-gray-300">•</span>
                <span>JPG</span>
                <span className="text-gray-300">•</span>
                <span>PNG</span>
                <span className="text-gray-300">•</span>
                <span>Max {MAX_FILE_MB}MB</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

function WorkflowStep({
  number,
  icon: Icon,
  title,
  description,
  active,
}: {
  number: string;
  icon: typeof FileSearch;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          active
            ? 'bg-gray-950 text-white'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        <Icon className="h-4 w-4" />

        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] font-black text-gray-700 shadow-sm ring-1 ring-gray-200">
          {number}
        </span>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-900">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [questionPaper, setQuestionPaper] =
    useState<File | null>(null);

  const [answerSheet, setAnswerSheet] =
    useState<File | null>(null);

  const [errors, setErrors] = useState<
    Record<SlotKey, string | null>
  >({
    question: null,
    answer: null,
  });

  const [loading, setLoading] = useState(false);

  const [loadingLabel, setLoadingLabel] =
    useState('Preparing assessment...');

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const router = useRouter();

  const { profile } = useTeacherProfile();

  const handleFile = (
    slot: SlotKey,
    file: File
  ) => {
    const isPdf =
      file.type === 'application/pdf';

    const isImage =
      file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setErrors((current) => ({
        ...current,
        [slot]:
          'Please upload a PDF or image file.',
      }));

      return;
    }

    if (
      file.size >
      MAX_FILE_MB * 1024 * 1024
    ) {
      setErrors((current) => ({
        ...current,
        [slot]: `This file is larger than ${MAX_FILE_MB}MB. Please upload a smaller scan.`,
      }));

      return;
    }

    setErrors((current) => ({
      ...current,
      [slot]: null,
    }));

    setSubmitError(null);

    if (slot === 'question') {
      setQuestionPaper(file);
    } else {
      setAnswerSheet(file);
    }
  };

  const handleSubmit = async () => {
    if (!questionPaper || !answerSheet) {
      return;
    }

    setSubmitError(null);
    setLoading(true);

    try {
      // =====================================================
      // STEP 1: Convert question paper into images
      // =====================================================

      setLoadingLabel(
        'Reading question paper...'
      );

      const questionImages =
        questionPaper.type ===
        'application/pdf'
          ? await pdfToImages(questionPaper)
          : [
              await fileToBase64(
                questionPaper
              ),
            ];

      // =====================================================
      // STEP 2: Convert answer sheet into images
      // =====================================================

      setLoadingLabel(
        'Reading answer sheet...'
      );

      const answerImages =
        answerSheet.type ===
        'application/pdf'
          ? await pdfToImages(answerSheet)
          : [
              await fileToBase64(
                answerSheet
              ),
            ];

      if (answerImages.length === 0) {
        throw new Error(
          'Could not read any answer-sheet pages.'
        );
      }

      // =====================================================
      // STEP 3: Send files + images to AI
      // =====================================================

      setLoadingLabel(
        'AI is analysing the assessment...'
      );

      const formData = new FormData();

      formData.append(
        'questionPaper',
        questionPaper
      );

      formData.append(
        'answerSheet',
        answerSheet
      );

      formData.append(
        'questionImages',
        JSON.stringify(questionImages)
      );

      formData.append(
        'answerImages',
        JSON.stringify(answerImages)
      );

      const response = await fetch(
        '/api/extract',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        let errorMessage =
          'Assessment extraction failed.';

        try {
          const error =
            await response.json();

          errorMessage =
            error.error ||
            errorMessage;
        } catch {
          // Keep fallback error.
        }

        throw new Error(
          errorMessage
        );
      }

      const data =
        await response.json();

      if (
        !data.questions ||
        !Array.isArray(
          data.questions
        )
      ) {
        throw new Error(
          'AI did not return valid questions.'
        );
      }

      if (
        !data.mappings ||
        !Array.isArray(
          data.mappings
        )
      ) {
        throw new Error(
          'AI did not return valid answer mappings.'
        );
      }

      // =====================================================
      // STEP 4: Calculate grading summary
      // =====================================================

      const totalMarks =
        data.questions.reduce(
          (
            sum: number,
            question: any
          ) =>
            sum +
            (question.marks || 0),
          0
        );

      const earnedMarks =
        data.mappings.reduce(
          (
            sum: number,
            mapping: any
          ) =>
            sum +
            (mapping.score || 0),
          0
        );

      const answeredCount =
        data.mappings.filter(
          (mapping: any) =>
            mapping.status ===
            'answered'
        ).length;

      // =====================================================
      // STEP 5: Save assessment history
      // =====================================================

      addHistoryRecord({
        id: `assess-${Date.now()}`,

        createdAt:
          new Date().toISOString(),

        questionPaperName:
          questionPaper.name,

        answerSheetName:
          answerSheet.name,

        questionCount:
          data.questions.length,

        answeredCount,

        totalMarks,

        earnedMarks,

        percentage:
          totalMarks > 0
            ? Math.round(
                (earnedMarks /
                  totalMarks) *
                  100
              )
            : 0,
      });

      // =====================================================
      // STEP 6: Save answer images in IndexedDB
      // =====================================================

      setLoadingLabel(
        'Saving answer sheet...'
      );

      const imageStorageKey =
        `answer-sheet-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

      await saveAnswerImages(
        imageStorageKey,
        answerImages
      );

      // =====================================================
      // STEP 7: Store lightweight result
      // =====================================================

      const extractionResult = {
        questions:
          data.questions,

        mappings:
          data.mappings,

        imageStorageKey,
      };

      sessionStorage.setItem(
        'extractionResult',
        JSON.stringify(
          extractionResult
        )
      );

      // =====================================================
      // STEP 8: Navigate to results
      // =====================================================

      router.push('/results');
    } catch (error: unknown) {
      console.error(
        'Extraction error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'An error occurred during extraction.';

      setSubmitError(message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        label={loadingLabel}
      />
    );
  }

  const bothUploaded =
    !!questionPaper &&
    !!answerSheet;

  const uploadedCount =
    Number(Boolean(questionPaper)) +
    Number(Boolean(answerSheet));

  const canSubmit =
    bothUploaded &&
    !errors.question &&
    !errors.answer;

  const teacherInitials =
    profile?.teacherName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase()
      )
      .join('') || 'T';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f8] text-gray-950">
      <Sidebar />

      <main className="ml-64 flex min-w-0 flex-1 flex-col overflow-auto">
        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center justify-between px-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  AI Teacher&apos;s Toolkit
                </p>

                <h1 className="mt-0.5 text-lg font-bold tracking-tight text-gray-950">
                  New Assessment
                </h1>
              </div>

              <div className="hidden h-8 w-px bg-gray-200 sm:block" />

              <div className="hidden items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-gray-600">
                  Workspace ready
                </span>
              </div>
            </div>

            {profile && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-gray-900">
                    {profile.teacherName}
                  </p>

                  <p className="text-[10px] text-gray-400">
                    Teacher workspace
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-xs font-bold text-white shadow-sm">
                  {teacherInitials}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <div className="mx-auto w-full max-w-[1380px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {/* =================================================
              HERO
          ================================================= */}

          <section className="mb-7">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="relative overflow-hidden rounded-[30px] bg-gray-950 px-7 py-8 text-white shadow-2xl shadow-gray-900/10 sm:px-9 sm:py-10">
                {/* Decorative grid */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
                    backgroundSize:
                      '34px 34px',
                  }}
                />

                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />

                <div className="relative">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-orange-400" />

                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                      Assessment Studio
                    </span>
                  </div>

                  <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
                    Turn two documents into a{' '}
                    <span className="text-orange-400">
                      mapped assessment.
                    </span>
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">
                    Upload the question paper and a handwritten
                    answer sheet. VedaAI will extract questions,
                    locate responses, and prepare the assessment
                    workspace for review.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-medium text-gray-300">
                        Files checked before processing
                      </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <Clock3 className="h-4 w-4 text-orange-400" />
                      <span className="text-xs font-medium text-gray-300">
                        AI-assisted analysis
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress card */}
              <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                      Setup progress
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
                      {uploadedCount}/2
                    </p>
                  </div>

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      bothUploaded
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {bothUploaded ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bothUploaded
                        ? 'w-full bg-emerald-500'
                        : uploadedCount === 1
                          ? 'w-1/2 bg-orange-500'
                          : 'w-0'
                    }`}
                  />
                </div>

                <div className="mt-6 space-y-5">
                  <WorkflowStep
                    number="1"
                    icon={FileSearch}
                    title="Question paper"
                    description={
                      questionPaper
                        ? 'Uploaded and ready'
                        : 'Add the source questions'
                    }
                    active={Boolean(
                      questionPaper
                    )}
                  />

                  <div className="ml-[17px] h-4 w-px bg-gray-200" />

                  <WorkflowStep
                    number="2"
                    icon={ScanLine}
                    title="Answer sheet"
                    description={
                      answerSheet
                        ? 'Uploaded and ready'
                        : 'Add the student responses'
                    }
                    active={Boolean(
                      answerSheet
                    )}
                  />

                  <div className="ml-[17px] h-4 w-px bg-gray-200" />

                  <WorkflowStep
                    number="3"
                    icon={MapPinned}
                    title="AI mapping"
                    description={
                      bothUploaded
                        ? 'Ready to start analysis'
                        : 'Unlocks after both files'
                    }
                    active={bothUploaded}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              UPLOAD SECTION
          ================================================= */}

          <section>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  Assessment inputs
                </p>

                <h3 className="mt-1 text-xl font-bold tracking-tight text-gray-950">
                  Add your two source documents
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  The order does not matter. VedaAI handles the mapping.
                </p>
              </div>

              {bothUploaded && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  Both documents are ready
                </div>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <UploadSlot
                type="question"
                step="01"
                label="Question Paper"
                description="The printed paper containing the questions"
                file={questionPaper}
                onFile={(file) =>
                  handleFile(
                    'question',
                    file
                  )
                }
                onClear={() =>
                  setQuestionPaper(null)
                }
                error={
                  errors.question
                }
                disabled={loading}
              />

              <UploadSlot
                type="answer"
                step="02"
                label="Student Answer Sheet"
                description="The handwritten responses to be analysed"
                file={answerSheet}
                onFile={(file) =>
                  handleFile(
                    'answer',
                    file
                  )
                }
                onClear={() =>
                  setAnswerSheet(null)
                }
                error={
                  errors.answer
                }
                disabled={loading}
              />
            </div>
          </section>

          {/* =================================================
              ACTION BAR
          ================================================= */}

          <section className="mt-5">
            <div
              className={`overflow-hidden rounded-[26px] border transition-all ${
                canSubmit
                  ? 'border-gray-200 bg-white shadow-lg shadow-gray-900/[0.04]'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      canSubmit
                        ? 'bg-gray-950 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {canSubmit ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <FileSearch className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {canSubmit
                        ? 'Your assessment is ready'
                        : 'Complete the setup to continue'}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {canSubmit
                        ? 'Start AI extraction and answer mapping.'
                        : `${2 - uploadedCount} document${
                            2 - uploadedCount === 1
                              ? ''
                              : 's'
                          } remaining`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    !canSubmit ||
                    loading
                  }
                  className={`group flex min-h-12 items-center justify-center gap-3 rounded-xl px-6 text-sm font-bold transition-all ${
                    canSubmit
                      ? 'bg-gray-950 text-white shadow-lg shadow-gray-950/10 hover:-translate-y-0.5 hover:bg-gray-800 active:translate-y-0'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  <span>
                    {canSubmit
                      ? 'Start AI Mapping'
                      : 'Start AI Mapping'}
                  </span>

                  <ArrowRight
                    className={`h-4 w-4 transition-transform ${
                      canSubmit
                        ? 'group-hover:translate-x-1'
                        : ''
                    }`}
                  />
                </button>
              </div>

              {submitError && (
                <div className="border-t border-red-100 bg-red-50 px-5 py-4 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-red-900">
                        We couldn&apos;t process this assessment
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-700">
                        {submitError}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSubmitError(null)
                      }
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              WHAT HAPPENS NEXT
          ================================================= */}

          <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_330px]">
            <div className="rounded-[26px] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                    Behind the workflow
                  </p>

                  <h3 className="mt-1 text-lg font-bold tracking-tight text-gray-950">
                    What happens after you start?
                  </h3>
                </div>

                <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 sm:flex">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <FileSearch className="h-4 w-4" />
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    Extract
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-gray-500">
                    Questions are detected and preserved in their
                    original printed order.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <MapPinned className="h-4 w-4" />
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    Locate
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-gray-500">
                    Responses are mapped to the exact handwritten
                    regions where possible.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    Review
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-gray-500">
                    Open the results workspace to inspect answers,
                    scores, and highlighted evidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Helpful note */}
            <div className="rounded-[26px] border border-gray-200 bg-[#fffaf5] p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-base font-bold text-gray-950">
                Better scans = better mapping
              </h3>

              <p className="mt-2 text-xs leading-5 text-gray-600">
                For handwritten answers, use a clear scan or
                well-lit photo. Keep the entire page visible and
                avoid heavy shadows or cropped margins.
              </p>

              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Entire page visible
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Text is reasonably sharp
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  File is under {MAX_FILE_MB}MB
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              FOOTER STATUS
          ================================================= */}

          <footer className="mt-8 flex flex-col gap-3 border-t border-gray-200 py-6 text-[11px] text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                Assessment workspace is ready
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span>PDF & image input</span>
              <span className="text-gray-300">•</span>
              <span>AI extraction</span>
              <span className="text-gray-300">•</span>
              <span>Answer mapping</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}