import { NextRequest, NextResponse } from 'next/server';
import { saveAnswerImages } from '@/lib/image-storage';

import {
  extractQuestions,
  extractAndMapAnswers,
} from '@/lib/mistral';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const questionImagesRaw =
      formData.get('questionImages');

    const answerImagesRaw =
      formData.get('answerImages');

    if (!questionImagesRaw || !answerImagesRaw) {
      return NextResponse.json(
        {
          error: 'Missing question or answer images',
        },
        { status: 400 }
      );
    }

    let questionImages: string[];
    let answerImages: string[];

    try {
      questionImages = JSON.parse(
        questionImagesRaw as string
      );

      answerImages = JSON.parse(
        answerImagesRaw as string
      );
    } catch (error) {
      console.error(
        '[Extraction] Failed to parse image data:',
        error
      );

      return NextResponse.json(
        {
          error:
            'Invalid image data. Expected valid JSON arrays.',
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(questionImages) ||
      !Array.isArray(answerImages)
    ) {
      return NextResponse.json(
        {
          error:
            'questionImages and answerImages must be arrays.',
        },
        { status: 400 }
      );
    }

    if (questionImages.length === 0) {
      return NextResponse.json(
        {
          error:
            'No question paper images were provided.',
        },
        { status: 400 }
      );
    }

    if (answerImages.length === 0) {
      return NextResponse.json(
        {
          error:
            'No answer sheet images were provided.',
        },
        { status: 400 }
      );
    }

    console.log(
      '[Extraction] Starting extraction...'
    );

    console.log(
      '[Extraction] Question pages:',
      questionImages.length
    );

    console.log(
      '[Extraction] Answer pages:',
      answerImages.length
    );

    // ========================================================
    // STEP 1: Extract questions
    // ========================================================

    const questions =
      await extractQuestions(
        questionImages
      );

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            'No questions could be extracted from the question paper. Try a clearer scan or a different file.',
        },
        { status: 422 }
      );
    }

    console.log(
      '[Extraction] Questions extracted:',
      questions.length
    );

    // ========================================================
    // STEP 2: Extract and map answers
    // ========================================================

    const mappings =
      await extractAndMapAnswers(
        answerImages,
        questions
      );

    console.log(
      '[Extraction] Answer mappings created:',
      mappings.length
    );

    // ========================================================
    // STEP 3: Return result
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        questions,
        mappings,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      '[Extraction] Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'An error occurred during extraction.',
      },
      { status: 500 }
    );
  }
}