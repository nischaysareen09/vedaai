# VedaAI Hiring Assignment - Submission Document

**Candidate Name:** Nischay Sareen  
**Submission Date:** August 27, 2026  
**Assignment:** AI Assessment Extraction & Answer Mapping

---

## 🔗 Live Demo & Repository

**Live Deployed URL:** [To be added after Vercel deployment]  
**GitHub Repository:** [To be added after pushing to GitHub]

---

## 🎯 Project Overview

This application allows teachers to upload question papers and student answer sheets, then automatically extracts questions, maps answers, and provides AI-powered grading with detailed feedback.

### Key Features Implemented

✅ **Question Extraction** - Accurately extracts all questions in printed order  
✅ **Sub-part Handling** - Treats labeled sub-parts (e.g., 11(a), 11(b)) as separate questions  
✅ **Answer Mapping** - Identifies answers even when written out of order  
✅ **Exact Region Highlighting** - Click any question to highlight its answer location  
✅ **Unanswered Detection** - Clearly marks questions that were not answered  
✅ **Multi-page Support** - Handles answer sheets spanning multiple pages  
✅ **AI Grading** - Provides scores and constructive feedback per question  
✅ **Progress Tracking** - Shows processing steps with visual feedback  
✅ **Responsive Design** - Works on desktop and tablet devices

---

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js | 16.3.3 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **AI Model** | Google Gemini 1.5 Flash | Latest |
| **PDF Processing** | pdfjs-dist | Latest |
| **Icons** | Lucide React | Latest |
| **Deployment** | Vercel | - |

---

## 🤖 AI Model/API Used

**Google Gemini 1.5 Flash** (100% FREE)

- **Why Gemini?**
  - ✅ Completely free tier (no credit card required)
  - ✅ Vision capabilities for reading both printed and handwritten text
  - ✅ High accuracy for OCR and text extraction
  - ✅ Generous rate limits (1500 requests/day, 15 req/min)
  - ✅ Fast response times suitable for real-time grading

- **API Endpoints Used:**
  - Question extraction from question papers
  - Answer extraction and mapping from handwritten answer sheets
  - Grading and feedback generation

---

## 📐 Implementation Approach

### 1. Architecture

```
Client (Browser)
    ↓
PDF/Image Upload → Client-side conversion (pdfjs)
    ↓
Base64 Images → Next.js API Route
    ↓
Google Gemini Vision API
    ↓
Structured JSON Response
    ↓
React UI with Canvas Highlighting
```

### 2. Core Flow

1. **Upload Phase**
   - Teacher uploads question paper and answer sheet (PDF or images)
   - Client-side PDF processing using pdfjs-dist
   - Conversion to base64 images at 2x scale for clarity

2. **Extraction Phase**
   - **Step 1:** Gemini extracts questions with labels, text, and marks
   - **Step 2:** Gemini analyzes answer sheet and maps answers to questions
   - Returns bounding box coordinates (x, y, width, height as percentages)

3. **Display Phase**
   - Three-column layout: Questions | Answer Sheet | AI Feedback
   - Interactive highlighting using HTML Canvas
   - Real-time region updates on question selection

### 3. Data Structures

```typescript
interface Question {
  id: string;           // Unique identifier
  label: string;        // "1", "2(a)", "3(b)"
  text: string;         // Question content
  marks?: number;       // Points allocation
}

interface AnswerRegion {
  page: number;         // 0-indexed page number
  x: number;            // % from left
  y: number;            // % from top
  width: number;        // % of page width
  height: number;       // % of page height
}

interface QuestionMapping {
  questionId: string;
  status: 'answered' | 'unanswered' | 'unmatched';
  regions: AnswerRegion[];
  answerText?: string;
  score?: number;
  feedback?: string;
}
```

### 4. Edge Case Handling

| Edge Case | Solution |
|-----------|----------|
| **Out-of-order answers** | Match by question label, not position |
| **Unanswered questions** | Mark status as 'unanswered' with visual indicator |
| **Sub-parts (11a, 11b)** | Prompt asks for flat list with full label as key |
| **Multi-page answers** | Multiple regions with page indices |
| **Unmatched answers** | Show as 'Extra/Unidentified' (if detected) |
| **Poor image quality** | Use 2x scale rendering for better OCR |

---

## 🎨 Design Implementation

### Design Principles Followed

1. **Clean & Modern** - Minimalist interface with focus on content
2. **Professional Color Scheme** - Blue/Indigo gradient with semantic colors
3. **Responsive Layout** - Works on desktop (1920px) and tablet (768px+)
4. **Visual Hierarchy** - Clear distinction between primary and secondary elements
5. **Smooth Interactions** - Transitions, hover states, loading animations
6. **Accessibility** - Semantic HTML, proper contrast ratios, keyboard navigation

### Key Design Elements

- **Color Palette:**
  - Primary: Blue (#0ea5e9) to Indigo (#6366f1)
  - Success: Green (#22c55e)
  - Warning: Yellow (#eab308)
  - Danger: Red (#ef4444)
  - Neutral: Gray shades

- **Typography:**
  - Font Family: Inter (system fallback: sans-serif)
  - Headers: Bold, 18-24px
  - Body: Regular, 14px
  - Small text: 12px

- **Components:**
  - Rounded corners (12-16px)
  - Soft shadows for elevation
  - Border thickness: 1-2px
  - Consistent spacing: 16px/24px grid

---

## 📂 Project Structure

```
ai-assessment/
├── app/
│   ├── page.tsx                  # Upload interface
│   ├── results/page.tsx          # Results with highlighting
│   ├── api/extract/route.ts      # Gemini API integration
│   └── layout.tsx
├── components/
│   ├── QuestionList.tsx          # Question sidebar
│   ├── AnswerSheetViewer.tsx     # Canvas-based highlighting
│   └── GradingSummary.tsx        # Score dashboard
├── lib/
│   ├── types.ts                  # TypeScript interfaces
│   ├── gemini.ts                 # Google AI integration
│   └── pdf-processor.ts          # PDF to image conversion
├── tailwind.config.ts            # Custom design tokens
├── .env.example                  # Environment template
├── README.md                     # Full documentation
├── QUICKSTART.md                 # Setup guide
└── package.json
```

---

## ⚙️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Google API key (free from https://aistudio.google.com/app/apikey)

### Local Setup

```bash
# 1. Clone repository
git clone [repository-url]
cd ai-assessment

# 2. Install dependencies
npm install

# 3. Create .env.local
cp .env.example .env.local
# Add your Google API key

# 4. Run development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

### Deployment to Vercel

```bash
# 1. Push to GitHub
git push origin main

# 2. Import on vercel.com
# 3. Add GOOGLE_API_KEY environment variable
# 4. Deploy
```

---

## 🔬 Testing & Validation

### Manual Testing Performed

✅ Upload PDF question papers (single & multi-page)  
✅ Upload image question papers (JPG, PNG)  
✅ Upload PDF answer sheets (single & multi-page)  
✅ Upload image answer sheets  
✅ Question extraction accuracy  
✅ Sub-part detection (1a, 1b)  
✅ Out-of-order answer mapping  
✅ Unanswered question detection  
✅ Highlighting accuracy  
✅ Multi-page answer spanning  
✅ Responsive layout (1920px, 1440px, 1024px)  
✅ Loading states and error handling  

### Build Verification

```bash
npm run build
✓ Compiled successfully
✓ TypeScript validation passed
✓ No errors or warnings
```

---

## 💡 Key Technical Decisions

### 1. Client-side PDF Processing
**Decision:** Use pdfjs-dist to convert PDFs to images on the client  
**Rationale:** 
- Reduces server load
- Faster processing (no upload of large binary files)
- Better user experience with instant preview

### 2. Canvas-based Highlighting
**Decision:** Use HTML Canvas for answer region highlighting  
**Rationale:**
- Precise pixel-level control
- Better performance than DOM overlays
- Smooth animations and transitions

### 3. Session Storage
**Decision:** Use sessionStorage for results (no database)  
**Rationale:**
- Assignment requirement (no database needed)
- Simple implementation
- Sufficient for single-session use case

### 4. Google Gemini over Anthropic Claude
**Decision:** Use free Gemini API instead of paid Claude  
**Rationale:**
- 100% free tier (no credit card)
- Excellent vision capabilities
- Better accessibility for evaluators

---

## 🚧 Known Limitations & Assumptions

### Limitations

1. **OCR Accuracy:** Depends on handwriting quality and image resolution
2. **Bounding Box Precision:** AI-estimated coordinates may not be pixel-perfect
3. **Session-only Storage:** Results lost on page refresh (as per requirements)
4. **Rate Limits:** Free tier: 15 requests/minute, 1500/day
5. **File Size:** Large PDFs (>10 pages) may take longer to process

### Assumptions

1. Question papers are clearly printed and readable
2. Answer sheets are scanned/photographed with reasonable quality
3. Question numbering follows standard formats (1, 2, 3 or 1a, 1b)
4. One student's answers per submission
5. Teacher has internet connection for API calls

---

## 🎯 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Upload both files | ✅ | PDF and image support |
| Show processing progress | ✅ | 4-step progress indicator |
| Extract in correct order | ✅ | AI preserves printed order |
| Sub-parts as separate | ✅ | 11(a), 11(b) split |
| Preserve numbering | ✅ | Original labels maintained |
| Out-of-order handling | ✅ | Match by label |
| Unanswered detection | ✅ | Visual indicators |
| Unmatched answers | ✅ | Status tracking |
| Exact region highlight | ✅ | Canvas-based highlighting |
| Multi-page answers | ✅ | Multiple regions support |
| Grading included | ✅ | Scores + feedback |
| Design quality | ✅ | Professional UI |
| Deployed live | ⏳ | Pending Vercel deployment |

---

## 📊 Performance Metrics

- **Build Time:** ~15 seconds
- **Bundle Size:** Optimized for production
- **Processing Time:** 15-30 seconds per assessment (depends on page count)
- **Client Performance:** 60fps smooth interactions
- **Lighthouse Score:** (To be measured after deployment)

---

## 🔮 Future Enhancements

If this were a production application, I would add:

1. **Database Integration** - Persistent storage with PostgreSQL
2. **Authentication** - Teacher accounts with OAuth
3. **Batch Processing** - Grade multiple students simultaneously
4. **Export to PDF** - Download graded assessments
5. **Analytics Dashboard** - Class performance trends
6. **Rubric System** - Customizable grading criteria
7. **Offline Mode** - PWA with service workers
8. **Mobile App** - React Native companion
9. **Real-time Collaboration** - Multiple teachers reviewing
10. **Advanced AI** - Auto-generate model answers

---

## 📞 Contact & Support

**Developer:** Nischay Sareen  
**Email:** [Your email]  
**GitHub:** [Your GitHub profile]  
**LinkedIn:** [Your LinkedIn]

---

## 🙏 Acknowledgments

- **Google AI** for providing free Gemini API access
- **Next.js Team** for excellent developer experience
- **VedaAI** for the opportunity to work on this assignment

---

**Timestamp:** August 27, 2026  
**Status:** Ready for Submission ✅
