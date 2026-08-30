// lib/mistral.ts

import { Mistral } from "@mistralai/mistralai";

import {
  Question,
  QuestionMapping,
  AnswerRegion,
} from "./types";

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  console.warn(
    "[Mistral] MISTRAL_API_KEY is not set."
  );
}

const client = new Mistral({
  apiKey: apiKey || "",
});

const OCR_MODEL = "mistral-ocr-latest";
const TEXT_MODEL = "mistral-small-latest";

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

function ensureApiKey() {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error(
      "MISTRAL_API_KEY is not configured on the server. Add it to Vercel Environment Variables and redeploy."
    );
  }
}

/**
 * OCR a list of JPEG base64 images.
 *
 * pageOffset keeps the original page number
 * when processing documents in chunks.
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
   * This is slower than Promise.all but much safer
   * for API rate limits and server memory.
   */
  for (
    let i = 0;
    i < imageBase64.length;
    i++
  ) {
    const base64 = imageBase64[i];

    if (
      typeof base64 !== "string" ||
      !base64
    ) {
      continue;
    }

    const response =
      await client.ocr.process({
        model: OCR_MODEL,

        document: {
          type: "image_url",

          /*
           * pdf-processor.ts produces JPEG.
           */
          imageUrl:
            `data:image/jpeg;base64,${base64}`,
        },

        includeBlocks: true,
      });

    const page = response.pages?.[0];

    if (!page) {
      continue;
    }

    const blocks: OcrBlock[] =
      (page.blocks ?? [])
        .filter(
          (block: any) =>
            typeof block?.content ===
              "string" &&
            typeof block?.topLeftX ===
              "number" &&
            typeof block?.topLeftY ===
              "number" &&
            typeof block?.bottomRightX ===
              "number" &&
            typeof block?.bottomRightY ===
              "number"
        )
        .map(
          (
            block: any,
            blockIndex: number
          ) => ({
            id: `p${
              pageOffset + i
            }-b${blockIndex}`,

            page:
              pageOffset + i,

            content:
              block.content,

            topLeftX:
              block.topLeftX,

            topLeftY:
              block.topLeftY,

            bottomRightX:
              block.bottomRightX,

            bottomRightY:
              block.bottomRightY,
          })
        );

    results.push({
      page:
        pageOffset + i,

      markdown:
        page.markdown ?? "",

      width:
        page.dimensions?.width ??
        1,

      height:
        page.dimensions?.height ??
        1,

      blocks,
    });
  }

  return results;
}

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

  let candidate = raw.trim();

  candidate = candidate.replace(
    /^```json\s*/i,
    ""
  );

  candidate = candidate.replace(
    /^```\s*/i,
    ""
  );

  candidate = candidate.replace(
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

  const json = candidate.slice(
    start,
    end + 1
  );

  try {
    const parsed = JSON.parse(json);

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

      temperature: 0.1,
    });

  const content =
    response.choices?.[0]
      ?.message?.content;

  if (
    typeof content ===
    "string"
  ) {
    return content;
  }

  /*
   * Some SDK versions can expose
   * content as structured content.
   */
  if (
    Array.isArray(content)
  ) {
    return content
      .map((part: any) =>
        typeof part?.text ===
        "string"
          ? part.text
          : ""
      )
      .join("");
  }

  return "";
}

/**
 * Extract questions from OCR pages.
 */
export async function extractQuestionsFromOcr(
  pages: OcrPageResult[]
): Promise<Question[]> {
  if (pages.length === 0) {
    return [];
  }

  const combinedMarkdown =
    pages
      .sort(
        (a, b) =>
          a.page - b.page
      )
      .map(
        (page) =>
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
            question.marks
          );

        return {
          id: `q-${index}`,

          label:
            String(
              question.label ??
                index + 1
            ).trim(),

          text:
            String(
              question.text ??
                ""
            ).trim(),

          /*
           * Do NOT silently invent 5 marks.
           *
           * If Mistral did not extract marks,
           * use 1 as the safest minimum.
           */
          marks:
            Number.isFinite(
              marks
            ) && marks > 0
              ? marks
              : 1,
        };
      }
    )
    .filter(
      (
        question: Question
      ) =>
        question.text.length > 0
    );
}

/**
 * Map and grade answers from OCR blocks.
 */
export async function mapAndGradeAnswersFromOcr(
  pages: OcrPageResult[],
  questions: Question[]
): Promise<QuestionMapping[]> {
  if (
    questions.length === 0
  ) {
    return [];
  }

  const allBlocks: OcrBlock[] =
    pages.flatMap(
      (page: OcrPageResult) =>
        page.blocks
    );

  const blockLookup =
    new Map<string, OcrBlock>(
      allBlocks.map(
        (
          block: OcrBlock
        ): [
          string,
          OcrBlock
        ] => [
          block.id,
          block,
        ]
      )
    );

  const questionList =
    questions
      .map(
        (question: Question) =>
          `${question.label}: ${
            question.text
          } [${
            question.marks ?? 1
          } marks]`
      )
      .join("\n");

  const ocrText =
    pages
      .sort(
        (a, b) =>
          a.page - b.page
      )
      .map(
        (page: OcrPageResult) => {
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
13. Give concise constructive feedback.
14. Return ONLY JSON.

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

  return questions.map(
    (
      question: Question
    ) => {
      const match =
        parsed.find(
          (item: any) =>
            String(
              item?.questionLabel ??
                ""
            ).trim() ===
            question.label
        );

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

      const blockIds =
        Array.isArray(
          match.blockIds
        )
          ? match.blockIds.filter(
              (
                id: unknown
              ): id is string =>
                typeof id ===
                "string"
            )
          : [];

      /*
       * Explicitly type every intermediate
       * block so TypeScript can safely infer
       * the following filter/map operations.
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
              block: OcrBlock | undefined
            ): block is OcrBlock =>
              Boolean(block)
          );

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

            return {
              page:
                block.page,

              x:
                Math.max(
                  0,
                  Math.min(
                    100,
                    (block.topLeftX /
                      pageWidth) *
                      100
                  )
                ),

              y:
                Math.max(
                  0,
                  Math.min(
                    100,
                    (block.topLeftY /
                      pageHeight) *
                      100
                  )
                ),

              width:
                Math.max(
                  0,
                  Math.min(
                    100,
                    ((block.bottomRightX -
                      block.topLeftX) /
                      pageWidth) *
                      100
                  )
                ),

              height:
                Math.max(
                  0,
                  Math.min(
                    100,
                    ((block.bottomRightY -
                      block.topLeftY) /
                      pageHeight) *
                      100
                  )
                ),
            };
          }
        );

      const rawScore =
        Number(
          match.score
        );

      const questionMarks =
        Number(
          question.marks ?? 1
        );

      const safeScore =
        Number.isFinite(
          rawScore
        )
          ? Math.max(
              0,
              Math.min(
                rawScore,
                questionMarks
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

/*
 * Keep these exports for compatibility
 * with older code.
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