// app/api/extract/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ocrImages,
  extractQuestionsFromOcr,
  mapAndGradeAnswersFromOcr,
  OcrPageResult,
} from "@/lib/mistral";

export const runtime = "nodejs";

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
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `${fieldName} must be a JSON string.`
    );
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(value);
  } catch {
    throw new Error(
      `${fieldName} contains invalid JSON.`
    );
  }

  if (
    !Array.isArray(parsed)
  ) {
    throw new Error(
      `${fieldName} must be an array.`
    );
  }

  const images =
    parsed.filter(
      (item) =>
        typeof item ===
          "string" &&
        item.length > 0
    );

  if (
    images.length === 0
  ) {
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
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  try {
    return JSON.parse(
      value
    ) as T;
  } catch {
    throw new Error(
      `${fieldName} contains invalid JSON.`
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    if (
      !process.env.MISTRAL_API_KEY
    ) {
      return jsonError(
        "MISTRAL_API_KEY is not configured on Vercel. Add it to the Production environment and redeploy.",
        500
      );
    }

    const formData =
      await request.formData();

    const modeValue =
      formData.get("mode");

    const mode =
      typeof modeValue ===
      "string"
        ? modeValue
        : "full";

    console.log(
      `[Extraction] mode=${mode}`
    );

    /*
     * ============================================================
     * QUESTIONS
     * ============================================================
     */
    if (
      mode === "questions"
    ) {
      const images =
        parseImages(
          formData.get(
            "questionImages"
          ),
          "questionImages"
        );

      const pageOffset =
        Number(
          formData.get(
            "pageOffset"
          ) || 0
        );

      const pages =
        await ocrImages(
          images,
          Number.isFinite(
            pageOffset
          )
            ? pageOffset
            : 0
        );

      const questions =
        await extractQuestionsFromOcr(
          pages
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
     * ============================================================
     */
    if (
      mode === "answer-ocr"
    ) {
      const images =
        parseImages(
          formData.get(
            "answerImages"
          ),
          "answerImages"
        );

      const pageOffset =
        Number(
          formData.get(
            "pageOffset"
          ) || 0
        );

      const pages =
        await ocrImages(
          images,
          Number.isFinite(
            pageOffset
          )
            ? pageOffset
            : 0
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
     * ============================================================
     */
    if (
      mode === "grade"
    ) {
      const questions =
        parseJson<any[]>(
          formData.get(
            "questions"
          ),
          "questions"
        );

      const pages =
        parseJson<OcrPageResult[]>(
          formData.get(
            "pages"
          ),
          "pages"
        );

      if (
        !Array.isArray(
          questions
        ) ||
        questions.length ===
          0
      ) {
        return jsonError(
          "No questions were supplied for grading."
        );
      }

      if (
        !Array.isArray(pages) ||
        pages.length ===
          0
      ) {
        return jsonError(
          "No answer OCR pages were supplied for grading."
        );
      }

      const mappings =
        await mapAndGradeAnswersFromOcr(
          pages,
          questions
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
    if (
      mode === "full"
    ) {
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

      const questionPages =
        await ocrImages(
          questionImages,
          0
        );

      const questions =
        await extractQuestionsFromOcr(
          questionPages
        );

      if (
        questions.length ===
        0
      ) {
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

    return jsonError(
      `Unsupported extraction mode: ${mode}`
    );
  } catch (error: unknown) {
    console.error(
      "[Extraction] Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "An error occurred during extraction.";

    return jsonError(
      message,
      500
    );
  }
}