import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ocrImages,
  extractQuestionsFromOcr,
  mapAndGradeAnswersFromOcr,
  type OcrPageResult,
} from "@/lib/mistral";

export const runtime = "nodejs";

/*
 * Vercel function timeout.
 *
 * Each frontend request is intentionally small and represents
 * one batch of pages, so 60 seconds is normally sufficient.
 */
export const maxDuration = 60;

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    }
  );
}

function parseImages(
  value: FormDataEntryValue | null,
  fieldName: string
): string[] {
  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} must be a JSON string.`
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      `${fieldName} contains invalid JSON.`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `${fieldName} must be an array.`
    );
  }

  const images = parsed.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.length > 0
  );

  if (images.length === 0) {
    throw new Error(
      `No ${fieldName} were provided.`
    );
  }

  return images;
}

function parseJson<T>(
  value: FormDataEntryValue | null,
  fieldName: string
): T {
  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(
      `${fieldName} contains invalid JSON.`
    );
  }
}

function getPageOffset(
  value: FormDataEntryValue | null
): number {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return 0;
  }

  return Math.floor(parsed);
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ============================================================
     * API KEY CHECK
     * ============================================================
     */

    if (!process.env.MISTRAL_API_KEY) {
      console.error(
        "[Extraction] MISTRAL_API_KEY is missing."
      );

      return jsonError(
        "MISTRAL_API_KEY is not configured on Vercel. Add it to the Production environment and redeploy.",
        500
      );
    }

    /*
     * ============================================================
     * FORM DATA
     * ============================================================
     */

    const formData =
      await request.formData();

    const modeValue =
      formData.get("mode");

    const mode =
      typeof modeValue === "string"
        ? modeValue
        : "full";

    console.log(
      `[Extraction] mode=${mode}`
    );

    /*
     * ============================================================
     * QUESTIONS
     *
     * Receives one size-safe image batch.
     * OCR -> question extraction.
     * ============================================================
     */

    if (mode === "questions") {
      const images = parseImages(
        formData.get("questionImages"),
        "questionImages"
      );

      const pageOffset =
        getPageOffset(
          formData.get("pageOffset")
        );

      console.log(
        `[Extraction] questions: ${images.length} image(s), offset=${pageOffset}`
      );

      const pages =
        await ocrImages(
          images,
          pageOffset
        );

      if (pages.length === 0) {
        return jsonError(
          "Mistral OCR returned no readable pages for the question paper.",
          422
        );
      }

      const questions =
        await extractQuestionsFromOcr(
          pages
        );

      console.log(
        `[Extraction] questions extracted=${questions.length}`
      );

      return NextResponse.json({
        success: true,
        mode: "questions",
        questions,
      });
    }

    /*
     * ============================================================
     * ANSWER OCR
     *
     * OCR only.
     * Grading is intentionally done later using text + coordinates.
     * ============================================================
     */

    if (mode === "answer-ocr") {
      const images = parseImages(
        formData.get("answerImages"),
        "answerImages"
      );

      const pageOffset =
        getPageOffset(
          formData.get("pageOffset")
        );

      console.log(
        `[Extraction] answer-ocr: ${images.length} image(s), offset=${pageOffset}`
      );

      const pages =
        await ocrImages(
          images,
          pageOffset
        );

      if (pages.length === 0) {
        return jsonError(
          "Mistral OCR returned no readable answer-sheet pages.",
          422
        );
      }

      console.log(
        `[Extraction] answer pages OCR=${pages.length}`
      );

      return NextResponse.json({
        success: true,
        mode: "answer-ocr",
        pages,
      });
    }

    /*
     * ============================================================
     * FINAL GRADING
     *
     * This request contains only OCR text and coordinates.
     * No images are sent here.
     * ============================================================
     */

    if (mode === "grade") {
      const questions =
        parseJson<any[]>(
          formData.get("questions"),
          "questions"
        );

      const pages =
        parseJson<OcrPageResult[]>(
          formData.get("pages"),
          "pages"
        );

      if (
        !Array.isArray(questions) ||
        questions.length === 0
      ) {
        return jsonError(
          "No questions were supplied for grading."
        );
      }

      if (
        !Array.isArray(pages) ||
        pages.length === 0
      ) {
        return jsonError(
          "No answer OCR pages were supplied for grading."
        );
      }

      console.log(
        `[Extraction] grading: ${questions.length} question(s), ${pages.length} OCR page(s)`
      );

      const mappings =
        await mapAndGradeAnswersFromOcr(
          pages,
          questions
        );

      console.log(
        `[Extraction] mappings=${mappings.length}`
      );

      return NextResponse.json({
        success: true,
        mode: "grade",
        mappings,
      });
    }

    /*
     * ============================================================
     * FULL / BACKWARD COMPATIBILITY
     * ============================================================
     */

    if (mode === "full") {
      const questionImages =
        parseImages(
          formData.get(
            "questionImages"
          ),
          "questionImages"
        );

      const answerImages =
        parseImages(
          formData.get(
            "answerImages"
          ),
          "answerImages"
        );

      console.log(
        `[Extraction] full: questionImages=${questionImages.length}, answerImages=${answerImages.length}`
      );

      const questionPages =
        await ocrImages(
          questionImages,
          0
        );

      if (questionPages.length === 0) {
        return jsonError(
          "Mistral OCR returned no readable question-paper pages.",
          422
        );
      }

      const questions =
        await extractQuestionsFromOcr(
          questionPages
        );

      if (questions.length === 0) {
        return jsonError(
          "No questions could be extracted from the question paper.",
          422
        );
      }

      const answerPages =
        await ocrImages(
          answerImages,
          0
        );

      if (answerPages.length === 0) {
        return jsonError(
          "Mistral OCR returned no readable answer-sheet pages.",
          422
        );
      }

      const mappings =
        await mapAndGradeAnswersFromOcr(
          answerPages,
          questions
        );

      return NextResponse.json({
        success: true,
        mode: "full",
        questions,
        mappings,
      });
    }

    /*
     * ============================================================
     * UNKNOWN MODE
     * ============================================================
     */

    return jsonError(
      `Unsupported extraction mode: ${mode}`
    );
  } catch (error: unknown) {
    console.error(
      "[Extraction] Error:",
      error
    );

    let message =
      "An error occurred during extraction.";

    if (error instanceof Error) {
      message = error.message;
    }

    return jsonError(
      message,
      500
    );
  }
}