import { Mistral } from '@mistralai/mistralai';
import { Question, QuestionMapping, AnswerRegion } from './types';

if (!process.env.MISTRAL_API_KEY) {
  console.warn('MISTRAL_API_KEY is not set. Requests to Mistral will fail.');
}

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// mistral-ocr-latest is a dedicated OCR/document model — much stronger on
// handwriting than a general vision-chat model, and billed on Mistral's OCR
// quota rather than the (separate, much smaller) chat token budget.
const OCR_MODEL = 'mistral-ocr-latest';

// Text-only model for the "reasoning" steps (parsing questions, matching
// answers, grading). Deliberately NOT a vision call — by this point we
// already have OCR'd text, so this step is cheap regardless of how many
// pages/images were involved.
const TEXT_MODEL = 'mistral-small-latest';

interface OcrBlock {
  id: string; // e.g. "p0-b3" = page 0, block 3
  page: number;
  content: string;
  topLeftX: number;
  topLeftY: number;
  bottomRightX: number;
  bottomRightY: number;
}

interface OcrPageResult {
  page: number;
  markdown: string;
  width: number;
  height: number;
  blocks: OcrBlock[];
}

async function ocrImage(imageBase64: string, pageIndex: number): Promise<OcrPageResult> {
  const response = await client.ocr.process({
    model: OCR_MODEL,
    document: { type: 'image_url', imageUrl: `data:image/png;base64,${imageBase64}` },
    // Paragraph-level bounding boxes for every text block on the page — this
    // is what lets us highlight the actual detected answer location instead
    // of asking an LLM to guess coordinates.
    includeBlocks: true,
  });

  const page = response.pages[0];
  if (!page) {
    return { page: pageIndex, markdown: '', width: 0, height: 0, blocks: [] };
  }

  const blocks: OcrBlock[] = (page.blocks ?? [])
    .filter((b: any) => typeof b?.content === 'string' && typeof b?.topLeftX === 'number')
    .map((b: any, idx: number) => ({
      id: `p${pageIndex}-b${idx}`,
      page: pageIndex,
      content: b.content,
      topLeftX: b.topLeftX,
      topLeftY: b.topLeftY,
      bottomRightX: b.bottomRightX,
      bottomRightY: b.bottomRightY,
    }));

  return {
    page: pageIndex,
    markdown: page.markdown ?? '',
    width: page.dimensions?.width ?? 0,
    height: page.dimensions?.height ?? 0,
    blocks,
  };
}

/**
 * Extracts a JSON array from a model response, tolerating markdown code
 * fences and stray prose. Returns [] (and logs) rather than throwing, so one
 * malformed response doesn't crash the whole request.
 */
function safeParseJsonArray(raw: string, context: string): any[] {
  const withoutFenceLabel = raw.replace(/```json/gi, '```');
  const fenceMatch = withoutFenceLabel.match(/```([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : withoutFenceLabel;

  const arrayMatch = candidate.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    console.error(`[${context}] No JSON array found in model response:`, raw.slice(0, 500));
    return [];
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`[${context}] Failed to parse JSON:`, err, raw.slice(0, 500));
    return [];
  }
}

async function callTextModel(prompt: string): Promise<string> {
  const response = await client.chat.complete({
    model: TEXT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  const content = response.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

export async function extractQuestions(imageBase64: string[]): Promise<Question[]> {
  // OCR every page first. This runs against Mistral's OCR quota, separate
  // from (and much larger than) the chat token budget used below.
  const ocrPages = await Promise.all(imageBase64.map((img, idx) => ocrImage(img, idx)));

  const combinedMarkdown = ocrPages
    .map((p) => `--- Page ${p.page + 1} ---\n${p.markdown}`)
    .join('\n\n');

  const prompt = `Below is the OCR text of a question paper (multiple pages, marked with "--- Page N ---"). Extract all questions. Return ONLY a JSON array, no other text, no markdown fences:
[{"label": "1", "text": "question text", "marks": 5}, {"label": "2(a)", "text": "...", "marks": 3}]

Rules:
- Preserve exact numbering (1, 2, 3, etc.)
- Split sub-parts into separate entries (11(a), 11(b) are separate)
- Return in printed order
- Include marks if shown
- Only return the JSON array, no other text

OCR text:
${combinedMarkdown}`;

  const text = await callTextModel(prompt);
  const parsed = safeParseJsonArray(text, 'extractQuestions');

  return parsed.map((q: any, idx: number) => ({
    id: `q-${idx}`,
    label: q.label,
    text: q.text,
    marks: typeof q.marks === 'number' ? q.marks : undefined,
  }));
}

export async function extractAndMapAnswers(
  answerSheetImages: string[],
  questions: Question[]
): Promise<QuestionMapping[]> {
  const ocrPages = await Promise.all(answerSheetImages.map((img, idx) => ocrImage(img, idx)));

  const allBlocks: OcrBlock[] = ocrPages.flatMap((p) => p.blocks);
  const blockLookup = new Map(allBlocks.map((b) => [b.id, b]));

  const combinedMarkdown = ocrPages
    .map(
      (p) =>
        `--- Page ${p.page + 1} ---\n` + p.blocks.map((b) => `[${b.id}] ${b.content}`).join('\n')
    )
    .join('\n\n');

  const questionList = questions
    .map((q) => `${q.label}: ${q.text}${q.marks ? ` [${q.marks} marks]` : ''}`)
    .join('\n');

  const prompt = `Below is the OCR text of a student's answer sheet, broken into labeled blocks like [p0-b3] (page 0, block 3). For each question below, find which block(s) contain the answer, extract the answer text, grade it, and give feedback.

Questions:
${questionList}

OCR blocks:
${combinedMarkdown}

Return ONLY a JSON array, no other text, no markdown fences:
[{
  "questionLabel": "1",
  "status": "answered",
  "blockIds": ["p0-b3", "p0-b4"],
  "answerText": "extracted answer text",
  "score": 4,
  "feedback": "Good explanation but missed..."
}]

Notes:
- blockIds must be exact block ids copied from the OCR text above (e.g. "p0-b3"), or an empty array if unanswered
- status should be "answered" if found, "unanswered" if not found
- provide score out of the question's total marks, never exceeding it
- provide constructive feedback for each answer
- only return the JSON array, no other text`;

  const text = await callTextModel(prompt);
  const parsed = safeParseJsonArray(text, 'extractAndMapAnswers');

  return questions.map((q) => {
    const match = parsed.find((m: any) => m.questionLabel === q.label);

    if (!match || match.status !== 'answered') {
      return {
        questionId: q.id,
        status: 'unanswered' as const,
        regions: [],
        answerText: '',
        score: undefined,
        feedback: '',
      };
    }

    // Regions come from real OCR-detected block coordinates, not
    // model-guessed percentages — converted to the same x/y/width/height
    // percentage format the canvas viewer already expects.
    const regions: AnswerRegion[] = (Array.isArray(match.blockIds) ? match.blockIds : [])
      .map((id: string) => blockLookup.get(id))
      .filter((b: OcrBlock | undefined): b is OcrBlock => !!b)
      .map((b: OcrBlock) => {
        const page = ocrPages[b.page];
        const width = page?.width || 1;
        const height = page?.height || 1;
        return {
          page: b.page,
          x: (b.topLeftX / width) * 100,
          y: (b.topLeftY / height) * 100,
          width: ((b.bottomRightX - b.topLeftX) / width) * 100,
          height: ((b.bottomRightY - b.topLeftY) / height) * 100,
        };
      });

    const rawScore = typeof match.score === 'number' ? match.score : undefined;
    const clampedScore =
      rawScore !== undefined && q.marks ? Math.max(0, Math.min(rawScore, q.marks)) : rawScore;

    return {
      questionId: q.id,
      status: 'answered' as const,
      regions,
      answerText: match.answerText || '',
      score: clampedScore,
      feedback: match.feedback || '',
    };
  });
}