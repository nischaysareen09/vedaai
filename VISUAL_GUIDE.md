# 📸 Visual Guide & User Flow

## 🎨 Application Screenshots & Flow

### Screen 1: Home / Upload Page

**URL:** `http://localhost:3000/`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ 🌟 AI Assessment Grader | Powered by Gemini    │
├─────────────────────────────────────────────────┤
│                                                 │
│        Grade Assessments in Seconds             │
│   Upload question paper and answer sheet for    │
│         instant AI-powered evaluation           │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 1️⃣ Question Paper                         │ │
│  │ ┌─────────────────────────────────────┐   │ │
│  │ │  📄 Upload Question Paper           │   │ │
│  │ │     PDF or Image (JPG, PNG)         │   │ │
│  │ └─────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 2️⃣ Student Answer Sheet                   │ │
│  │ ┌─────────────────────────────────────┐   │ │
│  │ │  📄 Upload Answer Sheet             │   │ │
│  │ │     PDF or Image (JPG, PNG)         │   │ │
│  │ └─────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │      ✨ Start Grading →                   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  🎯 Accurate   ✍️ Smart    ⚡ Instant          │
│  Extraction    Mapping     Feedback            │
└─────────────────────────────────────────────────┘
```

**Colors:**
- Background: Light blue gradient
- Card: White with soft shadow
- Button: Blue to Indigo gradient
- Upload zones: Dashed border (gray → blue on hover)

---

### Screen 2: Processing States

**Progress Indicator:**
```
┌─────────────────────────────────────────┐
│   Converting question paper...          │
│   ● ─── ○ ─── ○ ─── ○                  │
│   1   2   3   4                         │
└─────────────────────────────────────────┘

Then:
│   Converting answer sheet...            │
│   ✓ ─── ● ─── ○ ─── ○                  │

Then:
│   AI is analyzing...                    │
│   ✓ ─── ✓ ─── ● ─── ○                  │

Finally:
│   Complete!                             │
│   ✓ ─── ✓ ─── ✓ ─── ✓                  │
```

---

### Screen 3: Results / Grading Page

**URL:** `http://localhost:3000/results`

**Layout (3-column):**
```
┌──────────────────────────────────────────────────────────────────┐
│ ← AI Assessment Grader      [Export] [✨ New Assessment]        │
├────────────┬─────────────────────────┬──────────────────────────┤
│            │                         │                          │
│ ┌────────┐ │  Answer Sheet Viewer    │  ✨ AI Analysis         │
│ │ GRADE  │ │ ┌───────────────────┐   │ ┌──────────────────┐   │
│ │  A+    │ │ │ Page 1            │   │ │ Question 1       │   │
│ │  92%   │ │ │                   │   │ │ [2 marks]        │   │
│ │        │ │ │   [Highlighted]   │   │ │ What is 2+2?     │   │
│ │ 46/50  │ │ │   ┌─────────┐     │   │ └──────────────────┘   │
│ └────────┘ │ │   │  Answer │     │   │                        │
│            │ │   │  Region │     │   │ Student Answer:        │
│ Questions  │ │   └─────────┘     │   │ ┌──────────────────┐   │
│ ┌────────┐ │ │                   │   │ │ 2 + 2 = 4        │   │
│ │✓ Q1  →│ │ │                   │   │ └──────────────────┘   │
│ │  2 pts │ │ │                   │   │                        │
│ └────────┘ │ │                   │   │ Score: 2 / 2           │
│            │ │                   │   │ ████████ 100%          │
│ ┌────────┐ │ └───────────────────┘   │                        │
│ │✓ Q2    │ │                         │ AI Feedback:           │
│ │  5 pts │ │ ┌───────────────────┐   │ ┌──────────────────┐   │
│ └────────┘ │ │ Page 2            │   │ │ Correct! Full    │   │
│            │ │                   │   │ │ marks awarded.   │   │
│ ┌────────┐ │ │                   │   │ └──────────────────┘   │
│ │✗ Q3a   │ │ │                   │   │                        │
│ │  Unans │ │ │                   │   │                        │
│ └────────┘ │ └───────────────────┘   │                        │
│            │                         │                          │
└────────────┴─────────────────────────┴──────────────────────────┘
    LEFT           CENTER                     RIGHT
    (3 cols)       (6 cols)                   (3 cols)
```

---

## 🎯 User Interaction Flow

### Interaction 1: Clicking a Question

**Before Click:**
```
Questions Sidebar          Answer Sheet
┌──────────┐              ┌─────────────┐
│ Q1 ✓ →  │              │             │
│ Q2 ✓    │              │   (No       │
│ Q3 ✗    │              │  highlight) │
└──────────┘              └─────────────┘
```

**After Clicking Q1:**
```
Questions Sidebar          Answer Sheet
┌──────────┐              ┌─────────────┐
│ Q1 ✓ →  │              │ ┌─────────┐ │
│ (BLUE)   │  ───────────→│ │ BLUE    │ │
│ Q2 ✓    │              │ │HIGHLIGHT│ │
│ Q3 ✗    │              │ └─────────┘ │
└──────────┘              └─────────────┘
```

---

### Interaction 2: Status Indicators

**Question Status Icons:**
```
✓ Green Check   = Answered
✗ Red X         = Unanswered  
⚠ Gray Alert    = Unknown/Unmatched
```

**Question Status Badges:**
```
[Answered]      = Green pill
[Not Answered]  = Red pill
[Unknown]       = Gray pill
```

---

## 🎨 Color Scheme Reference

### Primary Colors
```
Blue:     #0ea5e9  ██████  (Buttons, Highlights)
Indigo:   #6366f1  ██████  (Gradients)
```

### Status Colors
```
Success:  #22c55e  ██████  (Answered, Correct)
Warning:  #eab308  ██████  (Partial Credit)
Danger:   #ef4444  ██████  (Unanswered, Incorrect)
```

### Neutral Colors
```
Gray 50:  #f9fafb  ██████  (Backgrounds)
Gray 100: #f3f4f6  ██████  (Cards)
Gray 700: #374151  ██████  (Text)
Gray 900: #111827  ██████  (Headers)
```

---

## 📱 Responsive Breakpoints

### Desktop (1440px+)
- 3-column layout
- Full sidebar visibility
- Large canvas viewer

### Tablet (1024px - 1439px)
- 2-column layout
- Collapsible sidebar
- Medium canvas viewer

### Mobile (< 1024px)
- Stacked layout
- Full-width sections
- Touch-optimized

---

## ✨ Visual Design Details

### Cards & Containers
```
Border Radius:  12-16px (rounded-xl, rounded-2xl)
Shadow:         Soft shadow (rgba(0,0,0,0.07))
Border:         1-2px solid #e5e7eb
Padding:        16-24px
```

### Typography
```
Headers:   24px, Bold, Gray-900
Subheaders: 18px, Semibold, Gray-800
Body:      14px, Regular, Gray-700
Small:     12px, Medium, Gray-500
```

### Buttons
```
Primary:   Blue-Indigo gradient, White text, Bold
Secondary: Gray border, Gray-700 text, Medium
Hover:     Slight darkening, Shadow increase
```

### Animations
```
Fade In:    0.3s ease-in-out
Slide Up:   0.4s ease-out
Scale In:   0.3s ease-out
```

---

## 🖼️ Canvas Highlighting

### Highlight Style
```
Fill:       rgba(59, 130, 246, 0.2)  (Semi-transparent blue)
Stroke:     rgba(59, 130, 246, 0.8)  (Solid blue)
Line Width: 3px
```

### Scroll Behavior
- Automatically scrolls to first highlight
- Smooth scroll animation (500ms)
- Centers highlighted region in viewport

---

## 🎭 Loading States

### Spinner
```
    ⟳
   ╱ ╲
  ╱   ╲
 ╱     ╲
```
- Blue circular spinner
- 1s rotation
- Centered on page

### Progress Dots
```
Pending:   ○ Gray circle
Active:    ● Blue filled
Complete:  ✓ Blue checkmark
```

---

## 📊 Grading Summary Card

**Visual Hierarchy:**
```
┌────────────────────┐
│ 🏆 Overall         │
│                    │
│     A+    92%      │
│   ┌─────────┐     │
│   │ 46 / 50 │     │
│   └─────────┘     │
│                    │
│ ✓ Answered: 9     │
│ ✗ Unanswered: 1   │
│                    │
│ ▓▓▓▓▓▓▓▓▓░ 92%   │
└────────────────────┘
```

---

## 🔍 Attention to Detail

### Micro-interactions
- ✅ Hover states on all clickable elements
- ✅ Focus states for keyboard navigation
- ✅ Smooth transitions (200-300ms)
- ✅ Loading spinners during API calls
- ✅ Success animations on completion

### Accessibility
- ✅ Semantic HTML tags
- ✅ ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Sufficient color contrast (WCAG AA)
- ✅ Alt text for icons

---

This visual guide shows the polished, professional design implemented in the application! 🎨✨
