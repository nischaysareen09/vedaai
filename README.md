````md
# VedaAI — AI Assessment Extraction & Answer Mapping

AI-powered assessment evaluation for teachers. Upload a question paper and a handwritten answer sheet, automatically extract and map questions to answers, highlight the exact answer locations, and review AI-assisted grading in one workspace.

## Features

- Upload question papers as PDF/images
- Upload handwritten answer sheets as PDF/images
- AI-powered question extraction
- Extracts questions in the original printed order
- Preserves question numbering
- Treats labelled sub-parts as separate questions
- Handles answers written out of order
- Detects unanswered questions
- Detects unmatched answers
- Maps answers to exact answer-sheet regions
- Highlights mapped answers visually
- Supports answers spanning multiple pages
- Question-level marks and evaluation
- AI-generated feedback
- Overall grading summary
- Interactive question navigation
- Teacher-friendly assessment workspace
- Responsive UI

## Core Workflow

```text
Question Paper + Answer Sheet
            ↓
      Document Processing
            ↓
      Question Extraction
            ↓
       Answer Extraction
            ↓
        Answer Mapping
            ↓
    Region Identification
            ↓
   Exact Answer Highlighting
            ↓
     AI Evaluation & Grading
            ↓
       Teacher Results
````

## How It Works

### 1. Upload

The teacher uploads:

* Question paper
* Student handwritten answer sheet

The application processes both documents and displays processing progress.

### 2. Question Extraction

Questions are extracted in their original printed order.

Sub-parts are treated independently.

Example:

```text
11 (a)
11 (b)
11 (c)
```

becomes three separate question entries.

### 3. Answer Extraction

The handwritten answer sheet is processed page-by-page.

The system identifies student responses and their approximate locations on the original pages.

### 4. Answer Mapping

Extracted answers are mapped to the corresponding questions.

The system supports:

* Normal question order
* Out-of-order answers
* Unanswered questions
* Unmatched answers
* Multi-page answers

### 5. Region Highlighting

Each mapped answer contains positional information:

```ts
{
  page: 5,
  x: 21,
  y: 38,
  width: 54,
  height: 16
}
```

The results viewer uses these coordinates to highlight the corresponding answer directly on the original handwritten answer sheet.

### 6. AI Evaluation

For mapped answers, the application can display:

* Student answer
* Score
* Maximum marks
* Feedback
* Answer status

## Results Workspace

The main results interface is designed around the teacher's workflow.

```text
┌────────────────┬────────────────────────┬──────────────────┐
│                │                        │                  │
│   Questions    │     Answer Sheet       │   AI Analysis    │
│                │                        │                  │
│   Question     │   Original Handwriting │   Question       │
│   Navigation   │                        │   Answer         │
│                │   Highlighted Region   │   Score          │
│   Status       │                        │   Feedback       │
│   Score        │   Page Navigation      │   Evaluation     │
│                │                        │                  │
└────────────────┴────────────────────────┴──────────────────┘
```

Selecting a question allows the teacher to quickly see:

```text
Question
   ↓
Student Answer
   ↓
Exact Answer Location
   ↓
Highlighted Region
   ↓
Score
   ↓
AI Feedback
```

This avoids manually searching through every page of a handwritten answer sheet.

## Data Model

### Question

```ts
export interface Question {
  id: string;
  label: string;
  text: string;
  marks?: number;
}
```

### Answer Region

```ts
export interface AnswerRegion {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Question Mapping

```ts
export interface QuestionMapping {
  questionId: string;
  status: 'answered' | 'unanswered' | 'unmatched';
  regions: AnswerRegion[];
  answerText?: string;
  score?: number;
  feedback?: string;
}
```

### Extraction Result

```ts
export interface ExtractionResult {
  questions: Question[];
  mappings: QuestionMapping[];
  answerImages: string[];
}
```

## Tech Stack

* Next.js 16
* React
* TypeScript
* Tailwind CSS
* Next.js App Router
* Canvas API
* AI-powered document processing
* IndexedDB for answer-sheet image storage
* In-memory/session-based application state

## Project Structure

```text
ai-assessment/
│
├── app/
│   ├── api/
│   │   └── extract/
│   │       └── route.ts
│   │
│   ├── assignments/
│   ├── classroom/
│   ├── dashboard/
│   ├── library/
│   ├── results/
│   │   └── page.tsx
│   │
│   ├── page.tsx
│   └── layout.tsx
│
├── components/
│   ├── AnswerSheetViewer.tsx
│   ├── QuestionList.tsx
│   ├── GradingSummary.tsx
│   ├── Sidebar.tsx
│   └── ...
│
├── lib/
│   ├── types.ts
│   ├── image-storage.ts
│   └── ...
│
├── public/
│
├── docs/
│   └── screenshots/
│
├── .env.example
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ai-assessment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env.local
```

Use `.env.example` as the template and add the required AI/API credentials.

Never commit `.env.local` or API keys.

### 4. Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

Run:

```bash
npm run build
```

Then:

```bash
npm start
```

The project should complete the Next.js production build without TypeScript errors.

## API

The primary document-processing endpoint is:

```text
POST /api/extract
```

It receives the uploaded assessment documents and returns structured extraction and mapping data used by the results interface.

## Edge Cases

The application is designed to handle:

### Unanswered Questions

```text
Question 7
Status: Unanswered
Score: 0 / 5
```

### Out-of-Order Answers

```text
Question Paper:

1
2
3
4

Answer Sheet:

1
4
2
3
```

The system maps answers based on extracted content rather than assuming page/order position.

### Multi-Page Answers

```text
Question 5
   ↓
Page 4 — Region 1
   ↓
Page 5 — Region 2
```

Multiple regions can therefore belong to a single question.

### Unmatched Answers

If handwriting cannot be confidently associated with an extracted question, it can be represented as an unmatched response instead of being incorrectly assigned.

## Answer Highlighting

The answer viewer uses the original answer-sheet images and renders highlight regions using the Canvas API.

Example:

```text
Original handwritten page
          ↓
Find mapped region
          ↓
Calculate pixel coordinates
          ↓
Draw highlight overlay
          ↓
Teacher sees exact answer
```

The original handwriting remains visible underneath the highlight so that teachers can verify the mapping themselves.

## Screenshots

Project screenshots are stored in:

```text
docs/screenshots/
```

Suggested screenshots:

```text
docs/screenshots/
├── upload.png
├── dashboard.png
├── processing.png
└── results.png
```

## Security

Keep credentials outside the repository.

Never commit:

```text
.env.local
API keys
Access tokens
Private credentials
```

If a credential is accidentally exposed, revoke and regenerate it immediately.

## Current Limitations

AI document processing may be affected by:

* Very difficult handwriting
* Low-resolution scans
* Poor image quality
* Unusual page layouts
* Ambiguous answer boundaries
* OCR/model extraction errors

The original answer sheet remains available for teacher verification.

## Future Improvements

* Manual answer-region adjustment
* Drag-to-resize bounding boxes
* Mapping confidence indicators
* Teacher override for AI grading
* Custom grading rubrics
* Batch student evaluation
* Class-level analytics
* Exportable PDF reports
* Persistent assessment history
* Better handwriting recognition
* Answer comparison against reference solutions

## Design Philosophy

The application is designed around a simple teacher workflow:

```text
Upload
  ↓
Extract
  ↓
Map
  ↓
Verify
  ↓
Grade
```

The goal is not simply to extract text.

The goal is to make the relationship between a question and the student's handwritten answer immediately understandable.

A teacher should be able to answer three questions quickly:

1. **Was this question answered?**
2. **Where is the student's answer?**
3. **How well did the student answer it?**

VedaAI brings these three pieces together in a single assessment workspace.

## Assignment Alignment

The implementation addresses the core requirements:

| Requirement               | Implementation                |
| ------------------------- | ----------------------------- |
| Question paper upload     | PDF/Image upload              |
| Handwritten answer upload | PDF/Image upload              |
| Processing progress       | Processing state/UI           |
| Question extraction       | AI extraction pipeline        |
| Printed order             | Preserved question ordering   |
| Sub-parts                 | Separate question entries     |
| Out-of-order answers      | Answer-to-question mapping    |
| Unanswered questions      | Mapping status                |
| Unmatched answers         | Mapping status                |
| Exact answer region       | Coordinate-based regions      |
| Visual highlighting       | Canvas overlay                |
| Multi-page answers        | Multiple answer regions       |
| Grading                   | Score and grading summary     |
| AI feedback               | Question-level feedback       |
| Teacher review            | Interactive results workspace |

## Author

**Nischay Sareen**

AI Assessment Extraction & Answer Mapping

Built as part of the VedaAI hiring assignment.

```
```
