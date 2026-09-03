// lib/mistral.ts

import { Mistral } from "@mistralai/mistralai";

import {
  Question,
  QuestionMapping,
  AnswerRegion,
} from "./types";

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  console.warn(
    "[Mistral] MISTRAL_API_KEY is not set. Requests to Mistral will fail."
  );
}

const client = new Mistral({
  apiKey: apiKey || "",
});

const OCR_MODEL = "mistral-ocr-latest";
const TEXT_MODEL = "mistral-small-latest";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface OcrBlock {
  id: string;
  page: number;
  content: string;

  topLeftX: number;
  topLeftY: number;

  bottomRightX: number;
  bottomRightY: number;
}

export interface OcrPageResult {
  page: number;
  markdown: string;

  width: number;
  height: number;

  blocks: OcrBlock[];
}

/* ============================================================
 * API KEY
 * ============================================================ */

function ensureApiKey(): void {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error(
      "MISTRAL_API_KEY is not configured on the server. Add it to Vercel Environment Variables and redeploy."
    );
  }
}

/* ============================================================
 * SAFE OCR BLOCK PARSING
 * ============================================================ */

/**
 * Mistral's OCR SDK exposes page.blocks as a union of many
 * possible block types.
 *
 * Not every block type has:
 * - content
 * - topLeftX
 * - topLeftY
 * - bottomRightX
 * - bottomRightY
 *
 * Therefore we deliberately treat incoming blocks as unknown
 * and validate the properties we actually need.
 */
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function parseOcrBlocks(
  rawBlocks: readonly unknown[],
  pageNumber: number
): OcrBlock[] {
  const blocks: OcrBlock[] = [];

  rawBlocks.forEach(
    (
      rawBlock: unknown,
      blockIndex: number
    ) => {
      if (!isRecord(rawBlock)) {
        return;
      }

      const content =
        rawBlock["content"];

      const topLeftX =
        rawBlock["topLeftX"];

      const topLeftY =
        rawBlock["topLeftY"];

      const bottomRightX =
        rawBlock["bottomRightX"];

      const bottomRightY =
        rawBlock["bottomRightY"];

      /*
       * Only text blocks with usable coordinates
       * are useful for answer-region mapping.
       */
      if (
        typeof content !== "string" ||
        typeof topLeftX !== "number" ||
        typeof topLeftY !== "number" ||
        typeof bottomRightX !== "number" ||
        typeof bottomRightY !== "number"
      ) {
        return;
      }

      blocks.push({
        id: `p${pageNumber}-b${blockIndex}`,

        page: pageNumber,

        content: content.trim(),

        topLeftX,

        topLeftY,

        bottomRightX,

        bottomRightY,
      });
    }
  );

  return blocks;
}

/* ============================================================
 * OCR
 * ============================================================ */

/**
 * OCR a list of JPEG base64 images.
 *
 * pageOffset keeps the original page number when documents
 * are processed in chunks.
 */
export async function ocrImages(
  imageBase64: string[],
  pageOffset = 0
): Promise<OcrPageResult[]> {
  ensureApiKey();

  if (
    !Array.isArray(imageBase64) ||
    imageBase64.length === 0
  ) {
    return [];
  }

  const results: OcrPageResult[] = [];

  /*
   * Process sequentially.
   *
   * This is intentionally slower than Promise.all,
   * but is much safer for:
   * - API limits
   * - memory usage
   * - Vercel execution
   * - large answer sheets
   */
  for (
    let i = 0;
    i < imageBase64.length;
    i++
  ) {
    const base64 =
      imageBase64[i];

    if (
      typeof base64 !== "string" ||
      !base64.trim()
    ) {
      continue;
    }

    console.log(
      `[Mistral OCR] Processing page ${
        pageOffset + i + 1
      }`
    );

    const response =
      await client.ocr.process({
        model: OCR_MODEL,

        document: {
          type: "image_url",

          /*
           * pdf-processor.ts produces JPEG base64.
           */
          imageUrl:
            `data:image/jpeg;base64,${base64}`,
        },

        includeBlocks: true,
      });

    const page =
      response.pages?.[0];

    if (!page) {
      console.warn(
        `[Mistral OCR] No page returned for page ${
          pageOffset + i + 1
        }`
      );

      continue;
    }

    /*
     * IMPORTANT:
     *
     * page.blocks is a union of many Mistral OCR
     * block types. We do NOT access block.content
     * directly here.
     *
     * parseOcrBlocks() safely validates each block.
     */
    const rawBlocks =
      Array.isArray(page.blocks)
        ? (page.blocks as readonly unknown[])
        : [];

    const blocks =
      parseOcrBlocks(
        rawBlocks,
        pageOffset + i
      );

    results.push({
      page:
        pageOffset + i,

      markdown:
        typeof page.markdown ===
        "string"
          ? page.markdown
          : "",

      width:
        page.dimensions?.width ??
        1,

      height:
        page.dimensions?.height ??
        1,

      blocks,
    });

    console.log(
      `[Mistral OCR] Page ${
        pageOffset + i + 1
      }: ${blocks.length} usable OCR blocks`
    );
  }

  return results;
}

/* ============================================================
 * JSON PARSING
 * ============================================================ */

/**
 * Parse a JSON array from model output.
 */
function safeParseJsonArray(
  raw: string,
  context: string
): any[] {
  if (
    !raw ||
    typeof raw !== "string"
  ) {
    return [];
  }

  let candidate =
    raw.trim();

  /*
   * Remove markdown code fences.
   */
  candidate =
    candidate.replace(
      /^```json\s*/i,
      ""
    );

  candidate =
    candidate.replace(
      /^```\s*/i,
      ""
    );

  candidate =
    candidate.replace(
      /\s*```$/i,
      ""
    );

  const start =
    candidate.indexOf("[");

  const end =
    candidate.lastIndexOf("]");

  if (
    start === -1 ||
    end === -1 ||
    end <= start
  ) {
    console.error(
      `[${context}] No JSON array found.`,
      raw.slice(0, 1000)
    );

    return [];
  }

  const json =
    candidate.slice(
      start,
      end + 1
    );

  try {
    const parsed =
      JSON.parse(json);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      `[${context}] JSON parse failed.`,
      error
    );

    return [];
  }
}

/* ============================================================
 * TEXT MODEL
 * ============================================================ */

async function callTextModel(
  prompt: string
): Promise<string> {
  ensureApiKey();

  const response =
    await client.chat.complete({
      model: TEXT_MODEL,

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      /*
       * temperature: 0 makes the model pick the single most likely
       * token every time instead of sampling — this is the main lever
       * for "grading the same sheet twice gives different results."
       *
       * randomSeed: per Mistral's docs, "different calls will generate
       * deterministic results" when this is fixed. Together these get
       * grading as close to reproducible as a hosted LLM API allows —
       * not perfect (Mistral can still update the model behind
       * "-latest" over time), but stable run-to-run for the same
       * document today.
       */
      temperature: 0,
      randomSeed: 42,
    });

  const content =
    response.choices?.[0]
      ?.message?.content;

  if (
    typeof content === "string"
  ) {
    return content;
  }

  /*
   * Some SDK versions can expose content
   * as structured content.
   */
  if (
    Array.isArray(content)
  ) {
    return content
      .map(
        (
          part: unknown
        ) => {
          if (
            !isRecord(part)
          ) {
            return "";
          }

          const text =
            part["text"];

          return typeof text ===
            "string"
            ? text
            : "";
        }
      )
      .join("");
  }

  return "";
}

/* ============================================================
 * QUESTION EXTRACTION
 * ============================================================ */

/**
 * Extract questions from OCR pages.
 */
export async function extractQuestionsFromOcr(
  pages: OcrPageResult[]
): Promise<Question[]> {
  if (
    !Array.isArray(pages) ||
    pages.length === 0
  ) {
    return [];
  }

  const combinedMarkdown =
    [...pages]
      .sort(
        (
          a: OcrPageResult,
          b: OcrPageResult
        ) =>
          a.page - b.page
      )
      .map(
        (
          page: OcrPageResult
        ) =>
          `--- PAGE ${
            page.page + 1
          } ---\n${
            page.markdown
          }`
      )
      .join("\n\n");

  const prompt = `
You are extracting questions from an exam question paper.

Return ONLY a JSON array.

Each object MUST be:

{
  "label": "1",
  "text": "exact question text",
  "marks": 1
}

Rules:

1. Preserve printed question numbering.
2. Preserve printed order.
3. Split subquestions into separate entries.
4. Examples:
   - 1(a)
   - 1(b)
   - 2(a)(i)
5. Do NOT create fake questions.
6. Do NOT merge separate numbered questions.
7. Extract the actual marks for each question.
8. If a question explicitly has 1 mark, marks MUST be 1.
9. Never use the answer score as the marks.
10. Never assign a score here.
11. Return ONLY JSON.

OCR:

${combinedMarkdown}
`;

  const text =
    await callTextModel(
      prompt
    );

  const parsed =
    safeParseJsonArray(
      text,
      "extractQuestions"
    );

  return parsed
    .map(
      (
        question: any,
        index: number
      ) => {
        const marks =
          Number(
            question?.marks
          );

        return {
          id:
            `q-${index}`,

          label:
            String(
              question?.label ??
                index + 1
            ).trim(),

          text:
            String(
              question?.text ??
                ""
            ).trim(),

          /*
           * If Mistral does not return marks,
           * use 1 as the safest minimum.
           */
          marks:
            Number.isFinite(
              marks
            ) &&
            marks > 0
              ? marks
              : 1,
        };
      }
    )
    .filter(
      (
        question: Question
      ) =>
        question.text.length >
        0
    );
}

/* ============================================================
 * ANSWER MAPPING + GRADING
 * ============================================================ */

export async function mapAndGradeAnswersFromOcr(
  pages: OcrPageResult[],
  questions: Question[]
): Promise<QuestionMapping[]> {
  if (
    !Array.isArray(questions) ||
    questions.length === 0
  ) {
    return [];
  }

  if (
    !Array.isArray(pages) ||
    pages.length === 0
  ) {
    return questions.map(
      (
        question: Question
      ) => ({
        questionId:
          question.id,

        status:
          "unanswered" as const,

        regions: [],

        answerText: "",

        score: 0,

        feedback:
          "No answer sheet OCR was available.",
      })
    );
  }

  /*
   * Flatten all OCR blocks.
   */
  const allBlocks: OcrBlock[] =
    pages.flatMap(
      (
        page: OcrPageResult
      ) =>
        Array.isArray(
          page.blocks
        )
          ? page.blocks
          : []
    );

  /*
   * Fast lookup by OCR block ID.
   */
  const blockLookup =
    new Map<string, OcrBlock>();

  allBlocks.forEach(
    (
      block: OcrBlock
    ) => {
      blockLookup.set(
        block.id,
        block
      );
    }
  );

  /*
   * Build the question list sent to Mistral.
   */
  const questionList =
    questions
      .map(
        (
          question: Question
        ) =>
          `${question.label}: ${
            question.text
          } [${
            question.marks ??
            1
          } marks]`
      )
      .join("\n");

  /*
   * Build OCR text while preserving
   * exact block IDs.
   */
  const ocrText =
    [...pages]
      .sort(
        (
          a: OcrPageResult,
          b: OcrPageResult
        ) =>
          a.page - b.page
      )
      .map(
        (
          page: OcrPageResult
        ) => {
          const blocks =
            page.blocks
              .map(
                (
                  block: OcrBlock
                ) =>
                  `[${block.id}] ${block.content}`
              )
              .join("\n");

          return `--- PAGE ${
            page.page + 1
          } ---\n${blocks}`;
        }
      )
      .join("\n\n");

  const prompt = `
You are grading a student's handwritten answer sheet.

IMPORTANT:
The OCR contains exact block IDs in square brackets.
Use ONLY those exact IDs when selecting answer regions.

QUESTIONS:

${questionList}

STUDENT ANSWER OCR:

${ocrText}

For EVERY question return exactly one object.

Return ONLY a JSON array.

Format:

[
  {
    "questionLabel": "1",
    "status": "answered",
    "blockIds": ["p0-b2"],
    "answerText": "student answer",
    "score": 1,
    "feedback": "Correct answer."
  }
]

Rules:

1. Every question must appear exactly once.
2. questionLabel must exactly match the question label.
3. status must be "answered" or "unanswered".
4. If no answer exists, use:
   - status = "unanswered"
   - blockIds = []
   - answerText = ""
   - score = 0
5. blockIds MUST contain exact OCR block IDs.
6. Do not invent block IDs.
7. score MUST be between 0 and the question's marks.
8. NEVER give more marks than the question allows.
9. If the question is worth 1 mark, the maximum score is 1.
10. Grade the student's actual answer, not the OCR quality.
11. Do not award marks for an answer belonging to another question.
12. If the answer is clearly correct, give full marks.
13. If the answer is partially correct, award only appropriate partial marks.
14. If the answer is unrelated to the question, give 0.
15. Keep feedback concise and constructive.
16. Do not use OCR blocks belonging to another question.
17. Return ONLY JSON.

Questions:

${questionList}

OCR:

${ocrText}
`;

  const text =
    await callTextModel(
      prompt
    );

  const parsed =
    safeParseJsonArray(
      text,
      "mapAndGradeAnswersFromOcr"
    );

  /*
   * Convert model output into our application's
   * strict QuestionMapping structure.
   */
  return questions.map(
    (
      question: Question
    ) => {
      const match =
        parsed.find(
          (
            item: any
          ) =>
            String(
              item?.questionLabel ??
                ""
            ).trim() ===
            question.label
        );

      /*
       * No valid answer found.
       */
      if (
        !match ||
        match.status !==
          "answered"
      ) {
        return {
          questionId:
            question.id,

          status:
            "unanswered" as const,

          regions: [],

          answerText: "",

          score: 0,

          feedback:
            "No answer was detected for this question.",
        };
      }

      /*
       * Only accept actual string block IDs.
       */
      const blockIds =
        Array.isArray(
          match.blockIds
        )
          ? match.blockIds.filter(
              (
                id: unknown
              ): id is string =>
                typeof id ===
                  "string" &&
                id.trim().length >
                  0
            )
          : [];

      /*
       * Resolve only block IDs that actually
       * exist in the OCR response.
       */
      const matchedBlocks: OcrBlock[] =
        blockIds
          .map(
            (
              id: string
            ): OcrBlock | undefined =>
              blockLookup.get(id)
          )
          .filter(
            (
              block:
                | OcrBlock
                | undefined
            ): block is OcrBlock =>
              Boolean(block)
          );

      /*
       * Convert OCR coordinates into percentages
       * for the answer-sheet viewer.
       */
      const regions: AnswerRegion[] =
        matchedBlocks.map(
          (
            block: OcrBlock
          ): AnswerRegion => {
            const page =
              pages.find(
                (
                  item: OcrPageResult
                ) =>
                  item.page ===
                  block.page
              );

            const pageWidth =
              page?.width || 1;

            const pageHeight =
              page?.height || 1;

            const x =
              (block.topLeftX /
                pageWidth) *
              100;

            const y =
              (block.topLeftY /
                pageHeight) *
              100;

            const width =
              ((block.bottomRightX -
                block.topLeftX) /
                pageWidth) *
              100;

            const height =
              ((block.bottomRightY -
                block.topLeftY) /
                pageHeight) *
              100;

            return {
              page:
                block.page,

              x:
                Math.max(
                  0,
                  Math.min(
                    100,
                    x
                  )
                ),

              y:
                Math.max(
                  0,
                  Math.min(
                    100,
                    y
                  )
                ),

              width:
                Math.max(
                  0,
                  Math.min(
                    100,
                    width
                  )
                ),

              height:
                Math.max(
                  0,
                  Math.min(
                    100,
                    height
                  )
                ),
            };
          }
        );

      /*
       * NEVER allow the AI to award more marks
       * than the question actually carries.
       */
      const rawScore =
        Number(
          match.score
        );

      const questionMarks =
        Number(
          question.marks ??
            1
        );

      const safeMarks =
        Number.isFinite(
          questionMarks
        ) &&
        questionMarks >= 0
          ? questionMarks
          : 1;

      const safeScore =
        Number.isFinite(
          rawScore
        )
          ? Math.max(
              0,
              Math.min(
                rawScore,
                safeMarks
              )
            )
          : 0;

      return {
        questionId:
          question.id,

        status:
          "answered" as const,

        regions,

        answerText:
          String(
            match.answerText ??
              ""
          ).trim(),

        score:
          safeScore,

        feedback:
          String(
            match.feedback ??
              ""
          ).trim(),
      };
    }
  );
}

/* ============================================================
 * BACKWARD COMPATIBILITY
 * ============================================================ */

/**
 * Older code may call extractQuestions()
 * directly with image base64 values.
 */
export async function extractQuestions(
  imageBase64: string[]
): Promise<Question[]> {
  const pages =
    await ocrImages(
      imageBase64,
      0
    );

  return extractQuestionsFromOcr(
    pages
  );
}

/**
 * Older code may call extractAndMapAnswers()
 * directly with answer-sheet images.
 */
export async function extractAndMapAnswers(
  answerSheetImages: string[],
  questions: Question[]
): Promise<QuestionMapping[]> {
  const pages =
    await ocrImages(
      answerSheetImages,
      0
    );

  return mapAndGradeAnswersFromOcr(
    pages,
    questions
  );
}