'use client';

import {
  useState,
  DragEvent,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  pdfToImages,
  fileToBase64,
  compressBase64Image,
} from '@/lib/pdf-processor';

import {
  Upload,
  FileText,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Sparkles,
  ShieldCheck,
  Layers3,
  Brain,
  Loader2,
  RotateCcw,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import LoadingState from '@/components/LoadingState';
import { addHistoryRecord } from '@/lib/history';
import { saveAnswerImages } from '@/lib/image-storage';
import { useTeacherProfile } from '@/lib/teacher-profile';


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_FILE_MB = 10;

/**
 * Keep this small because Vercel has a request payload limit.
 *
 * 2 pages per request gives us a much safer margin than
 * sending an entire 20+ page answer sheet at once.
 */
const PAGES_PER_REQUEST = 2;


// ============================================================
// TYPES
// ============================================================

type SlotKey =
  | 'question'
  | 'answer';

type UploadSlotProps = {
  label: string;
  shortLabel: string;
  description: string;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  error: string | null;
  disabled: boolean;
  accent: 'blue' | 'violet';
};

type ExtractionQuestion = {
  id?: string;
  questionNumber?: number | string;
  question?: string;
  text?: string;
  marks?: number;
  [key: string]: any;
};

type ExtractionMapping = {
  questionNumber?: number | string;
  questionId?: string;
  score?: number;
  status?: string;
  [key: string]: any;
};


// ============================================================
// HELPERS
// ============================================================

function chunkArray<T>(
  array: T[],
  size: number
): T[][] {
  const chunks: T[][] = [];

  for (
    let i = 0;
    i < array.length;
    i += size
  ) {
    chunks.push(
      array.slice(
        i,
        i + size
      )
    );
  }

  return chunks;
}


function sleep(
  ms: number
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function formatBytes(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(0)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`;
}


function getFileType(
  file: File
): 'PDF' | 'Image' {
  return file.type ===
    'application/pdf'
    ? 'PDF'
    : 'Image';
}


function getInitials(
  name: string
): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() || ''
    )
    .join('');
}


/**
 * Extract the JSON error returned by the API.
 */
async function getApiError(
  response: Response
): Promise<string> {
  try {
    const data =
      await response.json();

    if (
      data?.error &&
      typeof data.error ===
        'string'
    ) {
      return data.error;
    }

    if (
      data?.message &&
      typeof data.message ===
        'string'
    ) {
      return data.message;
    }
  } catch {
    // Ignore JSON parsing errors.
  }

  if (response.status === 413) {
    return (
      'This batch is too large for the deployment. ' +
      'The page will need to be processed in smaller batches.'
    );
  }

  if (response.status === 429) {
    return (
      'The AI service is temporarily busy. ' +
      'Please wait a moment and try again.'
    );
  }

  if (response.status >= 500) {
    return (
      'The server could not complete this extraction. ' +
      'Please try again.'
    );
  }

  return (
    `Extraction failed with status ${response.status}.`
  );
}


// ============================================================
// UPLOAD SLOT
// ============================================================

function UploadSlot({
  label,
  shortLabel,
  description,
  file,
  onFile,
  onClear,
  error,
  disabled,
  accent,
}: UploadSlotProps) {
  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const inputId =
    `upload-${shortLabel
      .replace(/\s+/g, '-')
      .toLowerCase()}`;

  const accentClasses =
    accent === 'blue'
      ? {
          border:
            'border-blue-200 hover:border-blue-400',
          bg:
            'bg-blue-50/50',
          icon:
            'text-blue-600',
          badge:
            'bg-blue-100 text-blue-700',
          glow:
            'hover:shadow-blue-100',
        }
      : {
          border:
            'border-violet-200 hover:border-violet-400',
          bg:
            'bg-violet-50/50',
          icon:
            'text-violet-600',
          badge:
            'bg-violet-100 text-violet-700',
          glow:
            'hover:shadow-violet-100',
        };

  const handleFile = (
    selectedFile: File
  ) => {
    onFile(selectedFile);
  };

  const handleDrop = (
    event: DragEvent<HTMLLabelElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    if (disabled) {
      return;
    }

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  return (
    <div className="space-y-3">

      <input
        id={inputId}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const selected =
            event.target.files?.[0];

          if (selected) {
            handleFile(selected);
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
        onDragLeave={() =>
          setIsDragging(false)
        }
        onDrop={handleDrop}
        className={`
          group relative block
          min-h-[270px]
          overflow-hidden
          rounded-[28px]
          border-2
          border-dashed
          cursor-pointer
          transition-all
          duration-300
          ${accentClasses.border}
          ${accentClasses.glow}
          ${
            isDragging
              ? 'scale-[1.015] border-gray-900 bg-white shadow-2xl'
              : file
              ? 'bg-white shadow-sm'
              : 'bg-white hover:-translate-y-1 hover:shadow-xl'
          }
          ${
            disabled
              ? 'cursor-not-allowed opacity-70'
              : ''
          }
        `}
      >

        {/* Decorative background */}
        <div
          className={`
            absolute
            -right-12
            -top-12
            h-32
            w-32
            rounded-full
            blur-3xl
            transition-opacity
            ${
              accent === 'blue'
                ? 'bg-blue-200/40'
                : 'bg-violet-200/40'
            }
            ${
              isDragging
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }
          `}
        />

        <div className="relative flex min-h-[270px] flex-col items-center justify-center p-8">

          {file ? (
            <div className="w-full">

              <div className="mb-5 flex items-start justify-between">

                <div
                  className={`
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    ${accentClasses.badge}
                  `}
                >
                  <FileText
                    className={`h-7 w-7 ${accentClasses.icon}`}
                  />
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClear();
                  }}
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-gray-200
                    bg-white
                    text-gray-500
                    shadow-sm
                    transition
                    hover:border-red-200
                    hover:bg-red-50
                    hover:text-red-600
                  "
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <div className="mb-4">

                <div className="mb-2 flex items-center gap-2">

                  <span
                    className="
                      rounded-full
                      bg-emerald-50
                      px-2.5
                      py-1
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-emerald-700
                    "
                  >
                    Ready
                  </span>

                  <span className="text-xs text-gray-400">
                    {getFileType(file)}
                  </span>

                </div>

                <p
                  className="
                    truncate
                    text-base
                    font-bold
                    text-gray-950
                  "
                  title={file.name}
                >
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {formatBytes(file.size)}
                </p>

              </div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-gray-50
                  px-3
                  py-2.5
                  text-xs
                  text-gray-500
                "
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                <span>
                  Ready for AI processing
                </span>
              </div>

            </div>
          ) : (
            <>
              <div
                className={`
                  mb-5
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  transition-all
                  duration-300
                  ${
                    isDragging
                      ? 'scale-110 bg-gray-950 text-white'
                      : `${accentClasses.bg} ${accentClasses.icon}`
                  }
                `}
              >
                {isDragging ? (
                  <FileUp className="h-7 w-7" />
                ) : (
                  <Upload className="h-7 w-7" />
                )}
              </div>

              <p className="mb-2 text-center text-lg font-bold text-gray-950">
                {isDragging
                  ? 'Drop it here'
                  : `Upload ${label}`}
              </p>

              <p className="mb-5 max-w-[260px] text-center text-sm leading-6 text-gray-500">
                {description}
              </p>

              <div
                className={`
                  rounded-full
                  px-4
                  py-2
                  text-xs
                  font-semibold
                  ${accentClasses.badge}
                `}
              >
                PDF or image · max {MAX_FILE_MB}MB
              </div>
            </>
          )}

        </div>
      </label>

      {error && (
        <div
          className="
            flex
            items-start
            gap-2
            rounded-xl
            bg-red-50
            px-3
            py-2.5
            text-xs
            leading-5
            text-red-700
          "
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}


// ============================================================
// MAIN PAGE
// ============================================================

export default function Home() {

  const router =
    useRouter();

  const { profile } =
    useTeacherProfile();

  const [
    questionPaper,
    setQuestionPaper,
  ] = useState<File | null>(null);

  const [
    answerSheet,
    setAnswerSheet,
  ] = useState<File | null>(null);

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
    'Preparing your assessment...'
  );

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    progressDetail,
    setProgressDetail,
  ] = useState(
    'Waiting for files'
  );

  const [
    currentStep,
    setCurrentStep,
  ] = useState<
    | 'idle'
    | 'questions'
    | 'answers'
    | 'finalizing'
  >('idle');


  // ==========================================================
  // FILE VALIDATION
  // ==========================================================

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
      MAX_FILE_MB *
        1024 *
        1024
    ) {

      setErrors((current) => ({
        ...current,
        [slot]:
          `File is over ${MAX_FILE_MB}MB. Try a smaller scan.`,
      }));

      return;
    }

    setErrors((current) => ({
      ...current,
      [slot]: null,
    }));

    if (
      slot === 'question'
    ) {
      setQuestionPaper(file);
    } else {
      setAnswerSheet(file);
    }
  };


  // ==========================================================
  // IMAGE PREPARATION
  // ==========================================================

  const prepareImages =
    async (
      file: File,
      type: 'question' | 'answer'
    ): Promise<string[]> => {

      setLoadingLabel(
        type === 'question'
          ? 'Reading question paper...'
          : 'Reading answer sheet...'
      );

      setProgressDetail(
        type === 'question'
          ? 'Converting question pages into OCR-ready images'
          : 'Converting answer pages into OCR-ready images'
      );

      let images: string[];

      if (
        file.type ===
        'application/pdf'
      ) {

        images =
          await pdfToImages(
            file
          );

      } else {

        images = [
          await fileToBase64(
            file
          ),
        ];
      }

      if (!images.length) {
        throw new Error(
          `No pages could be read from the ${type} file.`
        );
      }

      /*
       * Compress again before sending.
       *
       * This protects us from large scans/images
       * even if pdfToImages already generated JPEGs.
       */
      setLoadingDetail(
        `Optimizing ${images.length} pages for secure processing...`
      );

      const compressed: string[] = [];

      for (
        let index = 0;
        index < images.length;
        index++
      ) {

        setProgressDetail(
          `Optimizing page ${
            index + 1
          } of ${images.length}`
        );

        const compressedImage =
          await compressBase64Image(
            images[index],
            1600,
            0.68
          );

        compressed.push(
          compressedImage
        );

        /*
         * Give the browser a tiny chance to breathe
         * on large 20+ page documents.
         */
        if (
          index % 3 ===
          0
        ) {
          await sleep(0);
        }
      }

      return compressed;
    };


  /*
   * Small helper so we can update only the detail text
   * without changing the main loading label.
   */
  const setLoadingDetail = (
    text: string
  ) => {
    setProgressDetail(text);
  };


  // ==========================================================
  // API: QUESTION EXTRACTION
  // ==========================================================

  const extractQuestions =
    async (
      questionImages: string[]
    ): Promise<ExtractionQuestion[]> => {

      const batches =
        chunkArray(
          questionImages,
          PAGES_PER_REQUEST
        );

      const allQuestions:
        ExtractionQuestion[] = [];

      setCurrentStep(
        'questions'
      );

      for (
        let index = 0;
        index < batches.length;
        index++
      ) {

        const batch =
          batches[index];

        const startPage =
          index *
            PAGES_PER_REQUEST +
          1;

        const endPage =
          startPage +
          batch.length -
          1;

        setLoadingLabel(
          'AI is reading the question paper'
        );

        setProgressDetail(
          `Question pages ${startPage}–${endPage} · batch ${
            index + 1
          } of ${batches.length}`
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
          String(
            startPage - 1
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

        if (!response.ok) {
          const message =
            await getApiError(
              response
            );

          throw new Error(
            `Question extraction failed on pages ${startPage}–${endPage}: ${message}`
          );
        }

        const data =
          await response.json();

        if (
          !Array.isArray(
            data.questions
          )
        ) {
          throw new Error(
            'The AI returned an invalid question extraction response.'
          );
        }

        allQuestions.push(
          ...data.questions
        );

        setProgress(
          Math.round(
            ((index + 1) /
              batches.length) *
              35
          )
        );

        await sleep(50);
      }

      if (
        allQuestions.length ===
        0
      ) {
        throw new Error(
          'No questions could be extracted. Please upload a clearer question paper.'
        );
      }

      return allQuestions;
    };


  // ==========================================================
  // API: ANSWER MAPPING
  // ==========================================================

  const extractAnswers =
    async (
      answerImages: string[],
      questions: ExtractionQuestion[]
    ): Promise<ExtractionMapping[]> => {

      const batches =
        chunkArray(
          answerImages,
          PAGES_PER_REQUEST
        );

      const allMappings:
        ExtractionMapping[] = [];

      setCurrentStep(
        'answers'
      );

      for (
        let index = 0;
        index < batches.length;
        index++
      ) {

        const batch =
          batches[index];

        const startPage =
          index *
            PAGES_PER_REQUEST +
          1;

        const endPage =
          startPage +
          batch.length -
          1;

        setLoadingLabel(
          'AI is mapping student answers'
        );

        setProgressDetail(
          `Answer pages ${startPage}–${endPage} · batch ${
            index + 1
          } of ${batches.length}`
        );

        const formData =
          new FormData();

        formData.append(
          'mode',
          'answers'
        );

        formData.append(
          'answerImages',
          JSON.stringify(batch)
        );

        /*
         * Questions are text/JSON, not images,
         * so sending them is relatively small.
         *
         * The AI gets the complete question list
         * for every answer batch.
         */
        formData.append(
          'questions',
          JSON.stringify(
            questions
          )
        );

        formData.append(
          'pageOffset',
          String(
            startPage - 1
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

        if (!response.ok) {
          const message =
            await getApiError(
              response
            );

          throw new Error(
            `Answer mapping failed on pages ${startPage}–${endPage}: ${message}`
          );
        }

        const data =
          await response.json();

        if (
          !Array.isArray(
            data.mappings
          )
        ) {
          throw new Error(
            'The AI returned an invalid answer mapping response.'
          );
        }

        allMappings.push(
          ...data.mappings
        );

        const answerProgress =
          35 +
          Math.round(
            ((index + 1) /
              batches.length) *
              55
          );

        setProgress(
          answerProgress
        );

        await sleep(50);
      }

      return allMappings;
    };


  // ==========================================================
  // DEDUPLICATE MAPPINGS
  // ==========================================================

  const mergeMappings =
    (
      mappings: ExtractionMapping[]
    ): ExtractionMapping[] => {

      const map =
        new Map<
          string,
          ExtractionMapping
        >();

      for (
        const mapping of mappings
      ) {

        const key =
          String(
            mapping.questionId ??
              mapping.questionNumber ??
              Math.random()
          );

        const existing =
          map.get(key);

        /*
         * If the same question appears
         * in multiple answer batches,
         * prefer the mapping containing
         * an actual score/status.
         */
        if (!existing) {

          map.set(
            key,
            mapping
          );

        } else {

          const existingScore =
            Number(
              existing.score ??
                0
            );

          const currentScore =
            Number(
              mapping.score ??
                0
            );

          if (
            mapping.status ===
              'answered' &&
            existing.status !==
              'answered'
          ) {
            map.set(
              key,
              mapping
            );
          } else if (
            currentScore >
            existingScore
          ) {
            map.set(
              key,
              mapping
            );
          }
        }
      }

      return Array.from(
        map.values()
      );
    };


  // ==========================================================
  // MAIN SUBMIT
  // ==========================================================

  const handleSubmit =
    async () => {

      if (
        !questionPaper ||
        !answerSheet
      ) {
        return;
      }

      if (
        errors.question ||
        errors.answer
      ) {
        return;
      }

      setLoading(true);

      setProgress(2);

      setCurrentStep(
        'idle'
      );

      try {

        // ------------------------------------------------------
        // STEP 1 — READ QUESTION PAPER
        // ------------------------------------------------------

        setLoadingLabel(
          'Preparing question paper...'
        );

        const questionImages =
          await prepareImages(
            questionPaper,
            'question'
          );

        setProgress(12);

        // ------------------------------------------------------
        // STEP 2 — READ ANSWER SHEET
        // ------------------------------------------------------

        setLoadingLabel(
          'Preparing answer sheet...'
        );

        const answerImages =
          await prepareImages(
            answerSheet,
            'answer'
          );

        setProgress(20);

        // ------------------------------------------------------
        // STEP 3 — EXTRACT QUESTIONS
        // ------------------------------------------------------

        const questions =
          await extractQuestions(
            questionImages
          );

        setProgress(38);

        // ------------------------------------------------------
        // STEP 4 — MAP ANSWERS
        // ------------------------------------------------------

        const mappings =
          await extractAnswers(
            answerImages,
            questions
          );

        setProgress(92);

        // ------------------------------------------------------
        // STEP 5 — MERGE RESULTS
        // ------------------------------------------------------

        setCurrentStep(
          'finalizing'
        );

        setLoadingLabel(
          'Finalizing assessment...'
        );

        setProgressDetail(
          'Combining AI evaluation results'
        );

        const finalMappings =
          mergeMappings(
            mappings
          );

        // ------------------------------------------------------
        // CALCULATE SCORE
        // ------------------------------------------------------

        const totalMarks =
          questions.reduce(
            (
              sum: number,
              question: ExtractionQuestion
            ) =>
              sum +
              Number(
                question.marks ??
                  0
              ),
            0
          );

        const earnedMarks =
          finalMappings.reduce(
            (
              sum: number,
              mapping: ExtractionMapping
            ) =>
              sum +
              Number(
                mapping.score ??
                  0
              ),
            0
          );

        const answeredCount =
          finalMappings.filter(
            (
              mapping: ExtractionMapping
            ) =>
              mapping.status ===
              'answered'
          ).length;

        const percentage =
          totalMarks > 0
            ? Math.round(
                (earnedMarks /
                  totalMarks) *
                  100
              )
            : 0;

        // ------------------------------------------------------
        // STORE HISTORY
        // ------------------------------------------------------

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
          percentage,
        });

        // ------------------------------------------------------
        // STORE ANSWER IMAGES
        // ------------------------------------------------------

        const imageStorageKey =
          `answer-sheet-${Date.now()}`;

        /*
         * Store locally in IndexedDB.
         *
         * This keeps the answer pages available
         * to the results viewer without pushing
         * the images back through Vercel.
         */
        const storageKey = `assessment-${Date.now()}`;

        await saveAnswerImages(
          storageKey,
          answerImages
        );

        // ------------------------------------------------------
        // STORE RESULT
        // ------------------------------------------------------

        sessionStorage.setItem(
          'extractionResult',
          JSON.stringify({
            questions,
            mappings:
              finalMappings,
            imageStorageKey,
            questionPaperName:
              questionPaper.name,
            answerSheetName:
              answerSheet.name,
            totalMarks,
            earnedMarks,
            answeredCount,
            percentage,
          })
        );

        setProgress(100);

        setProgressDetail(
          'Assessment complete — opening results'
        );

        await sleep(350);

        router.push(
          '/results'
        );

      } catch (error: any) {

        console.error(
          '[Assessment] Extraction failed:',
          error
        );

        const message =
          error?.message ||
          'An unexpected error occurred during assessment processing.';

        /*
         * Instead of a generic browser alert,
         * show the error on the page.
         */
        setErrors({
          question:
            null,
          answer:
            message,
        });

        setLoading(false);

      }
    };


  // ==========================================================
  // RESET
  // ==========================================================

  const handleReset =
    () => {

      if (loading) {
        return;
      }

      setQuestionPaper(
        null
      );

      setAnswerSheet(
        null
      );

      setErrors({
        question: null,
        answer: null,
      });

      setProgress(0);

      setProgressDetail(
        'Waiting for files'
      );
    };


  // ==========================================================
  // DERIVED STATE
  // ==========================================================

  const bothUploaded =
    Boolean(
      questionPaper &&
        answerSheet
    );

  const canSubmit =
    bothUploaded &&
    !errors.question &&
    !errors.answer &&
    !loading;


  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {

    return (
      <div className="flex h-screen bg-[#f7f8fc]">

        <Sidebar />

        <main className="ml-64 flex flex-1 items-center justify-center overflow-auto px-8">

          <div className="w-full max-w-2xl">

            <div
              className="
                overflow-hidden
                rounded-[32px]
                border
                border-gray-200
                bg-white
                shadow-xl
              "
            >

              <div className="p-10">

                <div className="mb-8 flex items-center gap-4">

                  <div
                    className="
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      bg-gray-950
                      text-white
                      shadow-lg
                    "
                  >
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                      VedaAI Assessment Engine
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-gray-950">
                      {loadingLabel}
                    </h1>

                  </div>

                </div>


                {/* Progress */}

                <div className="mb-8">

                  <div className="mb-3 flex items-center justify-between">

                    <span className="text-sm font-medium text-gray-600">
                      {progressDetail}
                    </span>

                    <span className="text-sm font-bold text-gray-950">
                      {progress}%
                    </span>

                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">

                    <div
                      className="
                        h-full
                        rounded-full
                        bg-gradient-to-r
                        from-blue-500
                        via-violet-500
                        to-fuchsia-500
                        transition-all
                        duration-500
                      "
                      style={{
                        width: `${progress}%`,
                      }}
                    />

                  </div>

                </div>


                {/* Processing pipeline */}

                <div className="space-y-3">

                  <ProcessingStep
                    icon={
                      <FileText className="h-5 w-5" />
                    }
                    title="Read question paper"
                    active={
                      currentStep ===
                      'questions'
                    }
                    complete={
                      currentStep ===
                        'answers' ||
                      currentStep ===
                        'finalizing'
                    }
                  />

                  <ProcessingStep
                    icon={
                      <Brain className="h-5 w-5" />
                    }
                    title="Understand questions"
                    active={
                      currentStep ===
                      'questions'
                    }
                    complete={
                      currentStep ===
                        'answers' ||
                      currentStep ===
                        'finalizing'
                    }
                  />

                  <ProcessingStep
                    icon={
                      <Layers3 className="h-5 w-5" />
                    }
                    title="Map student answers"
                    active={
                      currentStep ===
                      'answers'
                    }
                    complete={
                      currentStep ===
                      'finalizing'
                    }
                  />

                  <ProcessingStep
                    icon={
                      <CheckCircle2 className="h-5 w-5" />
                    }
                    title="Finalize evaluation"
                    active={
                      currentStep ===
                      'finalizing'
                    }
                    complete={false}
                  />

                </div>


                <div
                  className="
                    mt-8
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    bg-gray-50
                    px-4
                    py-4
                    text-sm
                    text-gray-500
                  "
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />

                  <span>
                    Processing is split into small batches to keep large assessments reliable on the deployed environment.
                  </span>

                </div>

              </div>

            </div>

          </div>

        </main>

      </div>
    );
  }


  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="flex h-screen bg-[#f7f8fc]">

      <Sidebar />

      <main className="ml-64 flex-1 overflow-auto">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <header
          className="
            sticky
            top-0
            z-30
            border-b
            border-gray-200/80
            bg-[#f7f8fc]/90
            backdrop-blur-xl
          "
        >

          <div className="flex items-center justify-between px-8 py-4">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                AI Assessment Workspace
              </p>

              <h1 className="mt-0.5 text-lg font-bold text-gray-950">
                New Assessment
              </h1>

            </div>


            {profile && (

              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-full
                  border
                  border-gray-200
                  bg-white
                  py-1.5
                  pl-1.5
                  pr-4
                  shadow-sm
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    bg-gray-950
                    text-xs
                    font-bold
                    text-white
                  "
                >
                  {getInitials(
                    profile.teacherName
                  )}
                </div>

                <span className="text-sm font-semibold text-gray-800">
                  {profile.teacherName}
                </span>

              </div>

            )}

          </div>

        </header>


        {/* ================================================== */}
        {/* CONTENT */}
        {/* ================================================== */}

        <div className="mx-auto max-w-6xl px-8 py-10">

          {/* HERO */}

          <section className="mb-10">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div className="max-w-3xl">

                <div
                  className="
                    mb-4
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-violet-200
                    bg-violet-50
                    px-3
                    py-1.5
                    text-xs
                    font-bold
                    text-violet-700
                  "
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-powered evaluation
                </div>

                <h2
                  className="
                    text-4xl
                    font-black
                    tracking-tight
                    text-gray-950
                    sm:text-5xl
                  "
                >
                  Turn paper exams into
                  <span
                    className="
                      ml-2
                      bg-gradient-to-r
                      from-blue-600
                      via-violet-600
                      to-fuchsia-600
                      bg-clip-text
                      text-transparent
                    "
                  >
                    actionable results.
                  </span>
                </h2>

                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-500">
                  Upload the question paper and student answer sheets. VedaAI reads the pages, understands the questions, maps answers, and prepares the evaluation automatically.
                </p>

              </div>


              <div
                className="
                  hidden
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  py-3
                  shadow-sm
                  lg:flex
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-emerald-50
                  "
                >
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>

                <div>

                  <p className="text-xs font-bold text-gray-900">
                    Smart processing
                  </p>

                  <p className="text-xs text-gray-500">
                    Large exams handled in batches
                  </p>

                </div>

              </div>

            </div>

          </section>


          {/* ================================================= */}
          {/* WORKFLOW STRIP */}
          {/* ================================================= */}

          <div
            className="
              mb-8
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-3
            "
          >

            <WorkflowCard
              number="01"
              icon={
                <Upload className="h-4 w-4" />
              }
              title="Upload"
              text="Add both exam documents"
              active={
                !bothUploaded
              }
            />

            <WorkflowCard
              number="02"
              icon={
                <Brain className="h-4 w-4" />
              }
              title="AI mapping"
              text="Questions and answers are aligned"
              active={bothUploaded}
            />

            <WorkflowCard
              number="03"
              icon={
                <CheckCircle2 className="h-4 w-4" />
              }
              title="Evaluate"
              text="Review scores and insights"
              active={false}
            />

          </div>


          {/* ================================================= */}
          {/* UPLOAD AREA */}
          {/* ================================================= */}

          <section
            className="
              rounded-[32px]
              border
              border-gray-200
              bg-white
              p-6
              shadow-sm
              sm:p-8
            "
          >

            <div className="mb-7 flex items-center justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-950">
                  Assessment documents
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Add the source material VedaAI should evaluate.
                </p>

              </div>


              {(questionPaper ||
                answerSheet) && (

                <button
                  type="button"
                  onClick={
                    handleReset
                  }
                  className="
                    hidden
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-gray-200
                    px-3
                    py-2
                    text-xs
                    font-semibold
                    text-gray-600
                    transition
                    hover:bg-gray-50
                    sm:flex
                  "
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>

              )}

            </div>


            <div
              className="
                grid
                gap-5
                md:grid-cols-2
              "
            >

              <UploadSlot
                label="Question Paper"
                shortLabel="question"
                description="Upload the exam paper containing the questions, marks, sections, and instructions."
                file={
                  questionPaper
                }
                onFile={(file) =>
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
                accent="blue"
              />

              <UploadSlot
                label="Answer Sheet"
                shortLabel="answer"
                description="Upload the student's handwritten or typed answer sheet for AI evaluation."
                file={
                  answerSheet
                }
                onFile={(file) =>
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
                accent="violet"
              />

            </div>


            {/* ================================================= */}
            {/* READY STATE */}
            {/* ================================================= */}

            <div
              className={`
                mt-6
                overflow-hidden
                rounded-2xl
                border
                transition-all
                duration-300
                ${
                  bothUploaded
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-gray-100 bg-gray-50'
                }
              `}
            >

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-3">

                  <div
                    className={`
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        bothUploaded
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-white text-gray-400'
                      }
                    `}
                  >
                    {bothUploaded ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Layers3 className="h-5 w-5" />
                    )}
                  </div>

                  <div>

                    <p className="text-sm font-bold text-gray-900">
                      {bothUploaded
                        ? 'Assessment ready'
                        : 'Waiting for both documents'}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {bothUploaded
                        ? 'Both files are ready for AI extraction and answer mapping.'
                        : 'Upload the question paper and answer sheet to continue.'}
                    </p>

                  </div>

                </div>


                <div className="flex items-center gap-2 text-xs text-gray-400">

                  <ShieldCheck className="h-4 w-4" />

                  <span>
                    Batch-safe processing
                  </span>

                </div>

              </div>

            </div>


            {/* ================================================= */}
            {/* ACTION */}
            {/* ================================================= */}

            <div className="mt-6">

              <button
                type="button"
                onClick={
                  handleSubmit
                }
                disabled={
                  !canSubmit
                }
                className={`
                  group
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-2xl
                  px-6
                  py-4
                  text-sm
                  font-bold
                  transition-all
                  duration-300
                  ${
                    canSubmit
                      ? `
                        bg-gray-950
                        text-white
                        shadow-lg
                        shadow-gray-200
                        hover:-translate-y-0.5
                        hover:bg-gray-900
                        hover:shadow-xl
                      `
                      : `
                        cursor-not-allowed
                        bg-gray-100
                        text-gray-400
                      `
                  }
                `}
              >

                <span>
                  {bothUploaded
                    ? 'Start AI Mapping'
                    : 'Upload both files to continue'}
                </span>

                {canSubmit ? (
                  <ArrowRight
                    className="
                      h-5
                      w-5
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                ) : (
                  <Upload className="h-4 w-4" />
                )}

              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                VedaAI processes large documents in small AI batches to avoid oversized requests.
              </p>

            </div>

          </section>


          {/* ================================================= */}
          {/* FOOTER FEATURES */}
          {/* ================================================= */}

          <div
            className="
              mt-6
              grid
              gap-4
              sm:grid-cols-3
            "
          >

            <FeatureCard
              icon={
                <Brain className="h-5 w-5" />
              }
              title="AI understanding"
              text="Reads printed and handwritten answers."
            />

            <FeatureCard
              icon={
                <Layers3 className="h-5 w-5" />
              }
              title="Answer mapping"
              text="Connects responses to the correct questions."
            />

            <FeatureCard
              icon={
                <ShieldCheck className="h-5 w-5" />
              }
              title="Reliable processing"
              text="Large exams are processed page-by-page."
            />

          </div>

        </div>

      </main>

    </div>
  );
}


// ============================================================
// PROCESSING STEP
// ============================================================

function ProcessingStep({
  icon,
  title,
  active,
  complete,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  complete: boolean;
}) {

  return (
    <div
      className={`
        flex
        items-center
        gap-3
        rounded-2xl
        border
        px-4
        py-3
        transition-all
        ${
          active
            ? 'border-violet-200 bg-violet-50'
            : complete
            ? 'border-emerald-100 bg-emerald-50/50'
            : 'border-gray-100 bg-gray-50'
        }
      `}
    >

      <div
        className={`
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          ${
            active
              ? 'bg-violet-600 text-white'
              : complete
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-white text-gray-400'
          }
        `}
      >
        {active ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : complete ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          icon
        )}
      </div>

      <span
        className={`
          text-sm
          font-semibold
          ${
            active
              ? 'text-violet-900'
              : complete
              ? 'text-emerald-800'
              : 'text-gray-500'
          }
        `}
      >
        {title}
      </span>

    </div>
  );
}


// ============================================================
// WORKFLOW CARD
// ============================================================

function WorkflowCard({
  number,
  icon,
  title,
  text,
  active,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  active: boolean;
}) {

  return (
    <div
      className={`
        flex
        items-center
        gap-3
        rounded-2xl
        border
        px-4
        py-3
        transition-all
        ${
          active
            ? 'border-violet-200 bg-white shadow-sm'
            : 'border-gray-200/70 bg-white/60'
        }
      `}
    >

      <span
        className="
          text-[10px]
          font-black
          tracking-widest
          text-gray-300
        "
      >
        {number}
      </span>

      <div
        className={`
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-lg
          ${
            active
              ? 'bg-violet-100 text-violet-600'
              : 'bg-gray-100 text-gray-400'
          }
        `}
      >
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-xs font-bold text-gray-900">
          {title}
        </p>

        <p className="truncate text-[11px] text-gray-400">
          {text}
        </p>

      </div>

    </div>
  );
}


// ============================================================
// FEATURE CARD
// ============================================================

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {

  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-2xl
        border
        border-gray-200
        bg-white
        p-4
      "
    >

      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-gray-50
          text-gray-700
        "
      >
        {icon}
      </div>

      <div>

        <p className="text-xs font-bold text-gray-900">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          {text}
        </p>

      </div>

    </div>
  );
}
