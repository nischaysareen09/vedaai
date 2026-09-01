'use client';

import {
  useState,
  type DragEvent,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  pdfToImages,
  fileToBase64,
  compressBase64Image,
} from '@/lib/pdf-processor';

import {
  saveAnswerImages,
  getAnswerImages,
} from '@/lib/image-storage';

import type { OcrPageResult } from '@/lib/mistral';
import type { Question } from '@/lib/types';

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
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import LoadingState from '@/components/LoadingState';

import {
  addHistoryRecord,
} from '@/lib/history';

import {
  useTeacherProfile,
} from '@/lib/teacher-profile';

// Chunking handles files of any page count.
// This only guards against genuinely oversized single-file uploads.
const MAX_FILE_MB = 50;

// Keep individual API requests comfortably below Vercel's
// serverless request-body limit.
const MAX_REQUEST_BYTES = 3 * 1024 * 1024;

type SlotKey =
  | 'question'
  | 'answer';

interface UploadSlotProps {
  type: SlotKey;
  label: string;
  description: string;
  file: File | null;
  onFile: (
    file: File
  ) => void;
  onClear: () => void;
  error: string | null;
  disabled: boolean;
  step: string;
}

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024 * 1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes /
          1024
      )
    )} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function FileIcon({
  type,
  active = false,
}: {
  type: SlotKey;
  active?: boolean;
}) {
  if (
    type === 'question'
  ) {
    return (
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          active
            ? 'bg-orange-500 text-white'
            : 'bg-orange-50 text-orange-600'
        }`}
      >
        <FileSearch className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
        active
          ? 'bg-violet-600 text-white'
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
  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const inputId =
    `upload-${type}`;

  const handleDrop = (
    event: DragEvent<HTMLLabelElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    if (disabled) {
      return;
    }

    const droppedFile =
      event.dataTransfer
        .files?.[0];

    if (droppedFile) {
      onFile(droppedFile);
    }
  };

  const isQuestion =
    type === 'question';

  return (
    <div className="min-w-0">
      <input
        id={inputId}
        type="file"
        accept=".pdf,image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const selected =
            event.target.files?.[0];

          if (selected) {
            onFile(selected);
          }

          event.target.value = '';
        }}
      />

      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();

          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`group block min-w-0 cursor-pointer overflow-hidden rounded-[28px] border transition-all ${
          disabled
            ? 'cursor-not-allowed opacity-70'
            : isDragging
              ? isQuestion
                ? 'border-orange-500 bg-orange-50 shadow-xl'
                : 'border-violet-500 bg-violet-50 shadow-xl'
              : file
                ? 'border-gray-200 bg-white shadow-lg'
                : error
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl'
        }`}
      >
        <div
          className={`h-1 w-full ${
            isQuestion
              ? 'bg-orange-500'
              : 'bg-violet-600'
          }`}
        />

        <div className="p-4 sm:p-7">
          <div className="mb-7 flex min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <FileIcon
                type={type}
                active={
                  Boolean(file) ||
                  isDragging
                }
              />

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
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

                <h3 className="truncate text-lg font-bold text-gray-950">
                  {label}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              </div>
            </div>

            {!file && (
              <span
                className={`hidden shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sm:block ${
                  isQuestion
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-violet-50 text-violet-700'
                }`}
              >
                Required
              </span>
            )}
          </div>

          {file ? (
            <div className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex min-w-0 items-center gap-4">
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

                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>
                      {formatFileSize(
                        file.size
                      )}
                    </span>

                    <span>
                      •
                    </span>

                    <span>
                      {file.type ===
                      'application/pdf'
                        ? 'PDF document'
                        : 'Image'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClear();
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />

                <span className="text-xs font-medium text-emerald-800">
                  File passed basic checks
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-5 py-9 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-200">
                <Upload className="h-6 w-6" />
              </div>

              <p className="text-sm font-bold text-gray-900">
                {isDragging
                  ? 'Release to add the file'
                  : 'Drop your file here'}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                or click to browse
              </p>

              <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">
                <span>PDF</span>
                <span>•</span>
                <span>JPG</span>
                <span>•</span>
                <span>PNG</span>
                <span>•</span>
                <span>
                  Max {MAX_FILE_MB}MB
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">
                {error}
              </span>
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
    <div className="flex min-w-0 items-start gap-3">
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

      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-900">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * Groups images into batches that stay under MAX_REQUEST_BYTES.
 *
 * The strings are base64, so their character length is a reasonable
 * approximation for request size.
 */
function chunkImagesBySize(
  images: string[],
  maxBytesPerChunk: number
): string[][] {
  const chunks: string[][] = [];

  let current: string[] = [];
  let currentBytes = 0;

  for (const image of images) {
    const approxBytes =
      image.length;

    if (
      current.length > 0 &&
      currentBytes +
        approxBytes >
        maxBytesPerChunk
    ) {
      chunks.push(current);

      current = [];
      currentBytes = 0;
    }

    current.push(image);
    currentBytes +=
      approxBytes;
  }

  if (
    current.length > 0
  ) {
    chunks.push(current);
  }

  return chunks;
}

async function parseExtractResponse(
  response: Response
): Promise<any> {
  if (!response.ok) {
    let message =
      'Assessment extraction failed.';

    try {
      const error =
        await response.json();

      if (
        typeof error?.error ===
        'string'
      ) {
        message =
          error.error;
      }
    } catch {
      // Keep fallback message.
    }

    throw new Error(
      message
    );
  }

  return response.json();
}

/**
 * Sends the question paper in size-safe batches.
 */
async function fetchQuestionsInBatches(
  images: string[],
  onProgress: (
    done: number,
    total: number
  ) => void
): Promise<Question[]> {
  const batches =
    chunkImagesBySize(
      images,
      MAX_REQUEST_BYTES
    );

  const allQuestions: any[] =
    [];

  let pageOffset = 0;

  for (
    const [
      index,
      batch,
    ] of batches.entries()
  ) {
    onProgress(
      index,
      batches.length
    );

    const formData =
      new FormData();

    formData.append(
      'mode',
      'questions'
    );

    formData.append(
      'questionImages',
      JSON.stringify(batch)
    );

    formData.append(
      'pageOffset',
      String(pageOffset)
    );

    const response =
      await fetch(
        '/api/extract',
        {
          method: 'POST',
          body: formData,
        }
      );

    const data =
      await parseExtractResponse(
        response
      );

    if (
      Array.isArray(
        data.questions
      )
    ) {
      allQuestions.push(
        ...data.questions
      );
    }

    pageOffset +=
      batch.length;
  }

  onProgress(
    batches.length,
    batches.length
  );

  return allQuestions.map(
    (
      question,
      index
    ) => ({
      ...question,
      id: `q-${index}`,
    })
  );
}

/**
 * Sends answer-sheet images in size-safe batches.
 */
async function fetchAnswerPagesInBatches(
  images: string[],
  onProgress: (
    done: number,
    total: number
  ) => void
): Promise<OcrPageResult[]> {
  const batches =
    chunkImagesBySize(
      images,
      MAX_REQUEST_BYTES
    );

  const allPages: OcrPageResult[] =
    [];

  let pageOffset = 0;

  for (
    const [
      index,
      batch,
    ] of batches.entries()
  ) {
    onProgress(
      index,
      batches.length
    );

    const formData =
      new FormData();

    formData.append(
      'mode',
      'answer-ocr'
    );

    formData.append(
      'answerImages',
      JSON.stringify(batch)
    );

    formData.append(
      'pageOffset',
      String(pageOffset)
    );

    const response =
      await fetch(
        '/api/extract',
        {
          method: 'POST',
          body: formData,
        }
      );

    const data =
      await parseExtractResponse(
        response
      );

    if (
      Array.isArray(
        data.pages
      )
    ) {
      allPages.push(
        ...data.pages
      );
    }

    pageOffset +=
      batch.length;
  }

  onProgress(
    batches.length,
    batches.length
  );

  return allPages;
}

/**
 * Final grading call.
 *
 * Only OCR text and block coordinates are sent here,
 * not the original images.
 */
async function fetchGrading(
  questions: Question[],
  pages: OcrPageResult[]
): Promise<any[]> {
  const formData =
    new FormData();

  formData.append(
    'mode',
    'grade'
  );

  formData.append(
    'questions',
    JSON.stringify(
      questions
    )
  );

  formData.append(
    'pages',
    JSON.stringify(
      pages
    )
  );

  const response =
    await fetch(
      '/api/extract',
      {
        method: 'POST',
        body: formData,
      }
    );

  const data =
    await parseExtractResponse(
      response
    );

  return Array.isArray(
    data.mappings
  )
    ? data.mappings
    : [];
}

export default function Home() {
  const [
    questionPaper,
    setQuestionPaper,
  ] = useState<File | null>(
    null
  );

  const [
    answerSheet,
    setAnswerSheet,
  ] = useState<File | null>(
    null
  );

  const [
    errors,
    setErrors,
  ] = useState<
    Record<
      SlotKey,
      string | null
    >
  >({
    question: null,
    answer: null,
  });

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingLabel,
    setLoadingLabel,
  ] = useState(
    'Preparing assessment...'
  );

  const [
    submitError,
    setSubmitError,
  ] = useState<
    string | null
  >(null);

  const router =
    useRouter();

  const { profile } =
    useTeacherProfile();

  const handleFile = (
    slot: SlotKey,
    file: File
  ) => {
    const isPdf =
      file.type ===
      'application/pdf';

    const isImage =
      file.type.startsWith(
        'image/'
      );

    if (
      !isPdf &&
      !isImage
    ) {
      setErrors(
        (current) => ({
          ...current,
          [slot]:
            'Please upload a PDF or image file.',
        })
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_MB *
        1024 *
        1024
    ) {
      setErrors(
        (current) => ({
          ...current,
          [slot]:
            `This file is larger than ${MAX_FILE_MB}MB.`,
        })
      );

      return;
    }

    setErrors(
      (current) => ({
        ...current,
        [slot]: null,
      })
    );

    setSubmitError(
      null
    );

    if (
      slot ===
      'question'
    ) {
      setQuestionPaper(
        file
      );
    } else {
      setAnswerSheet(
        file
      );
    }
  };

  const convertFileToImages =
    async (
      file: File,
      label: string
    ): Promise<string[]> => {
      setLoadingLabel(
        label
      );

      if (
        file.type ===
        'application/pdf'
      ) {
        return await pdfToImages(
          file
        );
      }

      const raw =
        await fileToBase64(
          file
        );

      const compressed =
        await compressBase64Image(
          raw,
          1600,
          0.72
        );

      return [
        compressed,
      ];
    };

  const handleSubmit =
    async () => {
      if (
        !questionPaper ||
        !answerSheet
      ) {
        return;
      }

      setSubmitError(
        null
      );

      setLoading(
        true
      );

      try {
        /*
         * =====================================================
         * STEP 1 — QUESTION PAPER → IMAGES
         * =====================================================
         */

        const questionImages =
          await convertFileToImages(
            questionPaper,
            'Reading question paper...'
          );

        if (
          questionImages.length ===
          0
        ) {
          throw new Error(
            'Could not read the question paper.'
          );
        }

        /*
         * =====================================================
         * STEP 2 — ANSWER SHEET → IMAGES
         * =====================================================
         */

        const answerImages =
          await convertFileToImages(
            answerSheet,
            'Reading answer sheet...'
          );

        if (
          answerImages.length ===
          0
        ) {
          throw new Error(
            'Could not read any answer-sheet pages.'
          );
        }

        /*
         * =====================================================
         * STEP 3 — QUESTIONS
         * =====================================================
         */

        const questions =
          await fetchQuestionsInBatches(
            questionImages,
            (
              done,
              total
            ) => {
              setLoadingLabel(
                total > 1
                  ? `Reading question paper (${done}/${total})...`
                  : 'Reading question paper with AI...'
              );
            }
          );

        if (
          questions.length ===
          0
        ) {
          throw new Error(
            'No questions could be extracted from the question paper. Try a clearer scan or a different file.'
          );
        }

        /*
         * =====================================================
         * STEP 4 — ANSWER SHEET OCR
         * =====================================================
         */

        const answerPages =
          await fetchAnswerPagesInBatches(
            answerImages,
            (
              done,
              total
            ) => {
              setLoadingLabel(
                total > 1
                  ? `Reading answer sheet (${done}/${total})...`
                  : 'Reading answer sheet with AI...'
              );
            }
          );

        if (
          answerPages.length ===
          0
        ) {
          throw new Error(
            'Could not read any answer-sheet pages.'
          );
        }

        /*
         * =====================================================
         * STEP 5 — GRADING
         * =====================================================
         */

        setLoadingLabel(
          'AI is grading the answers...'
        );

        const rawMappings =
          await fetchGrading(
            questions,
            answerPages
          );

        /*
         * =====================================================
         * STEP 6 — NORMALIZE SCORES
         * =====================================================
         */

        const questionMap =
          new Map<
            string,
            number
          >(
            questions.map(
              (
                question
              ) => [
                question.id,
                question.marks ??
                  1,
              ]
            )
          );

        const mappings =
          rawMappings.map(
            (
              mapping: {
                questionId?: string;
                score?: unknown;
                status?: string;
                regions?: unknown;
                answerText?: string;
                feedback?: string;
              }
            ) => {
              const maxMarks =
                questionMap.get(
                  mapping.questionId ||
                    ''
                ) ?? 1;

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
                questionId:
                  mapping.questionId ||
                  '',
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

        /*
         * =====================================================
         * STEP 7 — SAVE ANSWER SHEET IMAGES
         * =====================================================
         *
         * The images are stored in IndexedDB.
         * This allows the results page to display the actual
         * answer sheet without sending the images through
         * sessionStorage or Vercel.
         */

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

        const savedImages =
          await getAnswerImages(
            imageStorageKey
          );

        if (
          savedImages.length !==
          answerImages.length
        ) {
          throw new Error(
            'The answer sheet could not be saved locally. Please try again.'
          );
        }

        /*
         * =====================================================
         * STEP 8 — HISTORY
         * =====================================================
         */

        const totalMarks =
          questions.reduce(
            (
              sum: number,
              question: {
                marks?: number;
              }
            ) =>
              sum +
              (
                question.marks ??
                1
              ),
            0
          );

        const earnedMarks =
          mappings.reduce(
            (
              sum: number,
              mapping: {
                questionId: string;
                score: number;
              }
            ) => {
              const maxMarks =
                questionMap.get(
                  mapping.questionId
                ) ?? 1;

              return (
                sum +
                Math.max(
                  0,
                  Math.min(
                    maxMarks,
                    mapping.score
                  )
                )
              );
            },
            0
          );

        const answeredCount =
          mappings.filter(
            (
              mapping: {
                status?: string;
              }
            ) =>
              mapping.status ===
              'answered'
          ).length;

        addHistoryRecord({
          id: `assess-${Date.now()}`,

          createdAt:
            new Date().toISOString(),

          questionPaperName:
            questionPaper.name,

          answerSheetName:
            answerSheet.name,

          questionCount:
            questions.length,

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

        /*
         * =====================================================
         * STEP 9 — LIGHTWEIGHT SESSION RESULT
         * =====================================================
         *
         * IMPORTANT:
         * Do NOT store answer images here.
         * They are already in IndexedDB.
         */

        const extractionResult =
          {
            questions,
            mappings,
            imageStorageKey,
            createdAt:
              new Date().toISOString(),
          };

        sessionStorage.setItem(
          'extractionResult',
          JSON.stringify(
            extractionResult
          )
        );

        /*
         * =====================================================
         * STEP 10 — RESULTS
         * =====================================================
         */

        router.push(
          '/results'
        );
      } catch (
        error: unknown
      ) {
        console.error(
          '[VedaAI] Extraction error:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'An error occurred during extraction.';

        setSubmitError(
          message
        );

        setLoading(
          false
        );
      }
    };

  if (loading) {
    return (
      <LoadingState
        label={
          loadingLabel
        }
      />
    );
  }

  const bothUploaded =
    Boolean(
      questionPaper
    ) &&
    Boolean(
      answerSheet
    );

  const uploadedCount =
    Number(
      Boolean(
        questionPaper
      )
    ) +
    Number(
      Boolean(
        answerSheet
      )
    );

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
        (
          part
        ) =>
          part[0]?.toUpperCase()
      )
      .join('') ||
    'T';

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#f7f7f8] text-gray-950">
      {/* =====================================================
          DESKTOP SIDEBAR
          Hidden on screens smaller than 768px.
         ===================================================== */}

      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* =====================================================
          RESPONSIVE STYLES
         ===================================================== */}

      <style>{`
        .desktop-sidebar {
          display: block;
        }

        @media (max-width: 767px) {
          .desktop-sidebar {
            display: none !important;
          }

          main {
            width: 100% !important;
            min-width: 0 !important;
            margin-left: 0 !important;
          }

          main > header {
            width: 100% !important;
            min-width: 0 !important;
          }

          main > div {
            width: 100% !important;
            min-width: 0 !important;
          }

          main h1,
          main h2,
          main h3,
          main p,
          main span {
            overflow-wrap: anywhere;
          }
        }
      `}</style>

      {/* =====================================================
          MAIN CONTENT

          IMPORTANT:
          ml-0 on mobile.
          md:ml-64 only adds the desktop sidebar offset
          when the screen is at least 768px.
         ===================================================== */}

      <main className="ml-0 flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:ml-64">

        {/* ===================================================
            HEADER
           =================================================== */}

        <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[64px] min-w-0 items-center justify-between gap-3 px-4 sm:min-h-[72px] sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  AI Teacher&apos;s Toolkit
                </p>

                <h1 className="mt-0.5 truncate text-lg font-bold text-gray-950">
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
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-gray-900">
                    {profile.teacherName}
                  </p>

                  <p className="text-[10px] text-gray-400">
                    Teacher workspace
                  </p>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-xs font-bold text-white">
                  {teacherInitials}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ===================================================
            PAGE CONTENT
           =================================================== */}

        <div className="mx-auto w-full min-w-0 max-w-[1380px] px-4 py-5 sm:px-8 sm:py-7 lg:px-10">

          {/* =================================================
              HERO / OVERVIEW
             ================================================= */}

          <section className="mb-7">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

              {/* HERO */}

              <div className="relative min-w-0 overflow-hidden rounded-[30px] bg-gray-950 px-6 py-8 text-white shadow-2xl sm:px-9 sm:py-10">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />

                <div className="relative min-w-0">
                  <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-400" />

                    <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                      Assessment Studio
                    </span>
                  </div>

                  <h2 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
                    Turn two documents into a{' '}
                    <span className="text-orange-400">
                      mapped assessment.
                    </span>
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">
                    Upload the question paper and handwritten answer sheet. VedaAI extracts questions, locates responses and prepares the review workspace.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <div className="flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />

                      <span className="text-xs text-gray-300">
                        Files checked before processing
                      </span>
                    </div>

                    <div className="flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <Clock3 className="h-4 w-4 shrink-0 text-orange-400" />

                      <span className="text-xs text-gray-300">
                        AI-assisted analysis
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SETUP PROGRESS */}

              <div className="min-w-0 rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                      Setup progress
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-950">
                      {uploadedCount}/2
                    </p>
                  </div>

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
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
                    className={`h-full rounded-full transition-all ${
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
                    active={
                      Boolean(
                        questionPaper
                      )
                    }
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
                    active={
                      Boolean(
                        answerSheet
                      )
                    }
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
                    active={
                      bothUploaded
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              UPLOAD SECTION
             ================================================= */}

          <section>
            <div className="mb-5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                Assessment inputs
              </p>

              <h3 className="mt-1 text-xl font-bold text-gray-950">
                Add your two source documents
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                The order does not matter. VedaAI handles the mapping.
              </p>
            </div>

            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <UploadSlot
                type="question"
                step="01"
                label="Question Paper"
                description="The printed paper containing the questions"
                file={
                  questionPaper
                }
                onFile={(
                  file
                ) =>
                  handleFile(
                    'question',
                    file
                  )
                }
                onClear={() =>
                  setQuestionPaper(
                    null
                  )
                }
                error={
                  errors.question
                }
                disabled={
                  loading
                }
              />

              <UploadSlot
                type="answer"
                step="02"
                label="Student Answer Sheet"
                description="The handwritten responses to be analysed"
                file={
                  answerSheet
                }
                onFile={(
                  file
                ) =>
                  handleFile(
                    'answer',
                    file
                  )
                }
                onClear={() =>
                  setAnswerSheet(
                    null
                  )
                }
                error={
                  errors.answer
                }
                disabled={
                  loading
                }
              />
            </div>
          </section>

          {/* =================================================
              ACTION BAR
             ================================================= */}

          <section className="mt-5">
            <div className="min-w-0 overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
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

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {canSubmit
                        ? 'Your assessment is ready'
                        : 'Complete the setup to continue'}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {canSubmit
                        ? 'Start AI extraction and answer mapping.'
                        : `${2 - uploadedCount} document${
                            2 -
                              uploadedCount ===
                            1
                              ? ''
                              : 's'
                          } remaining`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    !canSubmit ||
                    loading
                  }
                  className={`group flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-xl px-6 text-sm font-bold sm:w-auto ${
                    canSubmit
                      ? 'bg-gray-950 text-white hover:bg-gray-800'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  Start AI Mapping

                  <ArrowRight
                    className={`h-4 w-4 ${
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
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-red-900">
                        We couldn&apos;t process this assessment
                      </p>

                      <p className="mt-1 break-words text-xs leading-5 text-red-700">
                        {submitError}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}