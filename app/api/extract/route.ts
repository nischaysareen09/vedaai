import { NextRequest, NextResponse } from 'next/server';

import {
  extractQuestions,
  extractAndMapAnswers,
} from '@/lib/mistral';

export const maxDuration = 60;

/**
 * Vercel serverless functions have request payload limits.
 *
 * The frontend therefore sends the answer/question pages in small
 * batches instead of sending the entire document as one huge request.
 *
 * Supported modes:
 *
 *   questions
 *      Extract questions from one chunk of question-paper pages.
 *
 *   answers
 *      Extract/map answers from one chunk of answer-sheet pages.
 *
 * The frontend combines the responses.
 */

type ExtractionMode = 'questions' | 'answers';

function parseStringArray(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is string =>
        typeof item === 'string' && item.length > 0
    );
  } catch {
    return [];
  }
}

function parseQuestions(value: FormDataEntryValue | null): any[] {
  if (!value || typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getMode(formData: FormData): ExtractionMode | null {
  const rawMode = formData.get('mode');

  if (rawMode === 'questions' || rawMode === 'answers') {
    return rawMode;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    console.log(
      `[Extraction:${requestId}] Request received`
    );

    const formData = await request.formData();

    const mode = getMode(formData);

    if (!mode) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing or invalid extraction mode. Use "questions" or "answers".',
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * QUESTION EXTRACTION
     * ============================================================
     */

    if (mode === 'questions') {
      const questionImages = parseStringArray(
        formData.get('questionImages')
      );

      const startPageRaw = formData.get('startPage');
      const startPage =
        typeof startPageRaw === 'string'
          ? Number(startPageRaw)
          : 0;

      if (questionImages.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No question-paper images were provided.',
          },
          { status: 400 }
        );
      }

      console.log(
        `[Extraction:${requestId}] Extracting question chunk`,
        {
          pages: questionImages.length,
          startPage,
        }
      );

      const questions = await extractQuestions(
        questionImages
      );

      /*
       * Preserve the original page information when possible.
       *
       * extractQuestions normally returns question objects.
       * We attach a chunk offset so the frontend can retain
       * ordering across multiple API requests.
       */

      const questionsWithChunkInfo = questions.map(
        (question: any, index: number) => ({
          ...question,

          /*
           * Don't overwrite an existing page field.
           */
          sourcePage:
            typeof question.sourcePage === 'number'
              ? question.sourcePage
              : startPage + index,
        })
      );

      console.log(
        `[Extraction:${requestId}] Questions extracted:`,
        questionsWithChunkInfo.length
      );

      return NextResponse.json(
        {
          success: true,
          mode: 'questions',
          questions: questionsWithChunkInfo,
        },
        { status: 200 }
      );
    }

    /*
     * ============================================================
     * ANSWER EXTRACTION + MAPPING
     * ============================================================
     */

    if (mode === 'answers') {
      const answerImages = parseStringArray(
        formData.get('answerImages')
      );

      const questions = parseQuestions(
        formData.get('questions')
      );

      const startPageRaw = formData.get('startPage');

      const startPage =
        typeof startPageRaw === 'string'
          ? Number(startPageRaw)
          : 0;

      if (answerImages.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No answer-sheet images were provided.',
          },
          { status: 400 }
        );
      }

      if (questions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No extracted questions were provided for answer mapping.',
          },
          { status: 400 }
        );
      }

      console.log(
        `[Extraction:${requestId}] Mapping answer chunk`,
        {
          pages: answerImages.length,
          startPage,
          questions: questions.length,
        }
      );

      const mappings = await extractAndMapAnswers(
        answerImages,
        questions
      );

      /*
       * The AI sees only the current chunk, so make sure the
       * returned answer regions retain their absolute page index.
       *
       * If the mapping already contains a page property, offset it
       * by the starting page of this chunk.
       */

      const normalizedMappings = mappings.map(
        (mapping: any) => {
          if (
            typeof mapping.page === 'number'
          ) {
            return {
              ...mapping,
              page:
                mapping.page < startPage
                  ? mapping.page + startPage
                  : mapping.page,
            };
          }

          if (
            typeof mapping.answerPage === 'number'
          ) {
            return {
              ...mapping,
              page:
                mapping.answerPage + startPage,
            };
          }

          return mapping;
        }
      );

      console.log(
        `[Extraction:${requestId}] Mappings created:`,
        normalizedMappings.length
      );

      return NextResponse.json(
        {
          success: true,
          mode: 'answers',
          mappings: normalizedMappings,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported extraction mode.',
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error(
      `[Extraction:${requestId}] Error:`,
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'An error occurred during extraction.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}