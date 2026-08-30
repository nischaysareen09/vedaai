# 🧪 Testing Guide

## Local Testing (Before Deployment)

### Step 1: Setup & Run

```bash
# Make sure you're in the project directory
cd C:\Users\a\ai-assessment

# Install dependencies (if not already done)
npm install

# Create .env.local with your API key
# GOOGLE_API_KEY=AIzaSyC...your_key

# Run development server
npm run dev
```

Open: http://localhost:3000

---

## Test Cases to Verify

### ✅ Test Case 1: Basic Upload Flow

**Steps:**
1. Click "Upload Question Paper"
2. Select a PDF or image file
3. Verify file name appears with checkmark
4. Click "Upload Answer Sheet"
5. Select a PDF or image file
6. Verify file name appears with checkmark
7. Click "Start Grading" button
8. Verify progress steps show (1→2→3→4)

**Expected Result:** 
- Redirects to results page
- No errors in browser console

---

### ✅ Test Case 2: Question Extraction

**Steps:**
1. Complete Test Case 1
2. On results page, check left sidebar "Questions" section

**Verify:**
- [ ] All questions are extracted
- [ ] Questions are in correct order (1, 2, 3...)
- [ ] Sub-parts shown separately (if any: 1a, 1b, etc.)
- [ ] Question text is readable
- [ ] Marks are displayed correctly

---

### ✅ Test Case 3: Answer Mapping

**Steps:**
1. Click on first question in the list
2. Check center panel (Answer Sheet)

**Verify:**
- [ ] Blue highlight box appears on answer sheet
- [ ] Highlight is in approximately correct location
- [ ] Multiple regions highlight if answer spans pages
- [ ] Clicking different questions changes highlight

---

### ✅ Test Case 4: Grading & Feedback

**Steps:**
1. Click on an answered question
2. Check right panel "AI Analysis"

**Verify:**
- [ ] Question text displayed
- [ ] Student answer text extracted
- [ ] Score shown (e.g., "7 / 10")
- [ ] Percentage calculated correctly
- [ ] AI feedback is relevant and constructive

---

### ✅ Test Case 5: Unanswered Questions

**Steps:**
1. Find a question marked with red X icon
2. Click on it

**Verify:**
- [ ] Status shows "Not Answered"
- [ ] No highlight on answer sheet
- [ ] Right panel shows "Student did not answer"
- [ ] No score or feedback displayed

---

### ✅ Test Case 6: Grading Summary

**Steps:**
1. Check top-left card on results page

**Verify:**
- [ ] Grade letter displayed (A+, A, B, C, D, F)
- [ ] Percentage calculated correctly
- [ ] Total score shown (earned / total marks)
- [ ] Answered count correct
- [ ] Unanswered count correct
- [ ] Progress bar reflects percentage

---

### ✅ Test Case 7: Edge Cases

**Test 7a: Out-of-order answers**
- Upload question paper with Q1, Q2, Q3
- Upload answer sheet where student answered Q3, Q1, Q2
- **Verify:** All answers correctly mapped to questions

**Test 7b: Multi-page documents**
- Upload 3-page question paper
- Upload 5-page answer sheet
- **Verify:** All pages process correctly

**Test 7c: Image formats**
- Upload JPG question paper
- Upload PNG answer sheet
- **Verify:** Works same as PDF

**Test 7d: Large files**
- Upload 10+ page PDF
- **Verify:** Processing completes (may take 30+ seconds)

---

## Browser Testing

Test on these browsers:

- [ ] **Chrome/Edge** (latest) - Primary
- [ ] **Firefox** (latest)
- [ ] **Safari** (if on Mac)

---

## Responsive Testing

Test on these screen sizes:

- [ ] **Desktop**: 1920x1080 (Full layout)
- [ ] **Laptop**: 1440x900 (Slightly compressed)
- [ ] **Tablet**: 1024x768 (Stacked layout)

**How to test in Chrome:**
1. Press F12 to open DevTools
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select different devices from dropdown

---

## Performance Testing

### Load Time
- [ ] Home page loads < 2 seconds
- [ ] Results page loads < 2 seconds

### Processing Time
- [ ] 1-page assessment: ~15 seconds
- [ ] 3-page assessment: ~25 seconds
- [ ] 5-page assessment: ~40 seconds

### Console Errors
- [ ] No errors in browser console (F12)
- [ ] No warnings (except React dev warnings are OK)

---

## API Testing

### Verify Gemini API Works

**Test with curl:**
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Expected:** JSON response with generated content

### Rate Limit Check
- [ ] Can process 3 assessments in quick succession
- [ ] 16th request within 1 minute returns 429 error (expected)

---

## Deployment Testing (After Vercel Deploy)

### Basic Functionality
- [ ] Deployed URL loads correctly
- [ ] All static assets load (images, fonts)
- [ ] API route accessible
- [ ] Environment variable working (API key)

### End-to-End Test
1. [ ] Visit deployed URL
2. [ ] Upload test files
3. [ ] Complete full grading flow
4. [ ] Verify results are correct
5. [ ] Check browser console - no errors

---

## Sample Test Files

### Create Test Question Paper

**Option 1: Use a real exam paper**
- Download any sample exam PDF from internet
- Or scan/photo a printed question paper

**Option 2: Create simple test**
Create a Word doc with:
```
1. What is 2 + 2? [2 marks]
2. Explain photosynthesis. [5 marks]
3a. Define HTML. [2 marks]
3b. Define CSS. [2 marks]
```
Save as PDF.

### Create Test Answer Sheet

Write answers on paper, scan/photo it:
```
Q1: 2 + 2 = 4

Q2: Photosynthesis is the process by which plants
convert light energy into chemical energy...

Q3a: HTML stands for HyperText Markup Language

Q3b: CSS stands for Cascading Style Sheets
```

---

## Known Issues to Watch For

### Issue: "API Key Not Found"
**Fix:** Make sure `.env.local` exists with correct key

### Issue: PDF not converting
**Fix:** Try with image file first

### Issue: Highlight not appearing
**Check:** Browser console for canvas errors

### Issue: Slow processing
**Expected:** 15-40 seconds depending on file size

---

## Checklist Before Submission

- [ ] All 7 test cases pass
- [ ] Tested on Chrome
- [ ] Tested on desktop resolution
- [ ] No console errors
- [ ] Grading accuracy looks reasonable
- [ ] Highlighting works for most questions
- [ ] Loading states show correctly
- [ ] Can complete full flow without errors

---

## Success Criteria

✅ **Minimum Acceptable:**
- Upload works
- Questions extracted
- Basic answer mapping works
- Some highlighting appears
- Scores calculated

🌟 **Excellent:**
- All questions extracted accurately
- 80%+ answers mapped correctly
- Highlighting precise
- Feedback is relevant
- Handles edge cases smoothly

---

**Ready to test!** Go through each test case systematically. 🧪
