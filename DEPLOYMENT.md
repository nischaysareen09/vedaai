# 🚀 Deployment Checklist for VedaAI Assignment

## Pre-Deployment Checklist

### 1. Code Quality ✅
- [x] All TypeScript errors resolved
- [x] Build completes successfully (`npm run build`)
- [x] No console errors in development
- [x] All components render correctly
- [x] Responsive design tested

### 2. Environment Setup ⏳
- [ ] Get Google Gemini API key from https://aistudio.google.com/app/apikey
- [ ] Test API key locally in `.env.local`
- [ ] Verify API calls work correctly

### 3. Git Repository ⏳
- [ ] Initialize git: `git init`
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial commit: AI Assessment Grader"`
- [ ] Create GitHub repository
- [ ] Add remote: `git remote add origin [your-repo-url]`
- [ ] Push: `git push -u origin main`

### 4. Vercel Deployment ⏳
- [ ] Go to https://vercel.com
- [ ] Sign in with GitHub
- [ ] Click "Import Project"
- [ ] Select your repository
- [ ] Configure project:
  - Framework Preset: Next.js
  - Build Command: `npm run build`
  - Output Directory: `.next`
- [ ] Add Environment Variable:
  - Name: `GOOGLE_API_KEY`
  - Value: [Your Gemini API key]
- [ ] Click "Deploy"
- [ ] Wait for deployment (2-3 minutes)
- [ ] Copy live URL

### 5. Testing Deployed App ⏳
- [ ] Open deployed URL
- [ ] Test file upload
- [ ] Test question extraction
- [ ] Test answer mapping
- [ ] Test highlighting
- [ ] Test on mobile/tablet
- [ ] Check console for errors

### 6. Submission ⏳
- [ ] Copy deployed URL
- [ ] Copy GitHub repository URL
- [ ] Fill submission form: https://forms.gle/vFXzf3kcLmGougMr5
- [ ] Include:
  - Live URL
  - GitHub repo
  - Brief explanation (see SUBMISSION.md)
  - AI model used: Google Gemini 1.5 Flash
  - Any limitations

---

## Quick Deployment Commands

```bash
# 1. Initialize Git
git init
git add .
git commit -m "feat: AI Assessment Grader with Google Gemini"

# 2. Create GitHub Repo (via GitHub CLI)
gh repo create ai-assessment --public --source=. --remote=origin
git push -u origin main

# Or manually:
# - Go to github.com/new
# - Create repository
# - Copy the remote URL
git remote add origin https://github.com/YOUR_USERNAME/ai-assessment.git
git push -u origin main

# 3. Deploy to Vercel (via Vercel CLI - optional)
npm i -g vercel
vercel login
vercel --prod
# Add GOOGLE_API_KEY when prompted
```

---

## Environment Variables for Vercel

```
GOOGLE_API_KEY=AIzaSyC_your_actual_key_here
```

---

## Post-Deployment

### Test These Features:
1. ✅ Upload PDF question paper
2. ✅ Upload PDF answer sheet
3. ✅ Processing completes without errors
4. ✅ Questions display correctly
5. ✅ Clicking question highlights answer
6. ✅ Scores and feedback show correctly
7. ✅ Responsive on mobile

### Performance Check:
- [ ] Page load time < 3 seconds
- [ ] API response time < 30 seconds
- [ ] No memory leaks
- [ ] Canvas rendering smooth

---

## Troubleshooting

### Issue: "API Key Not Found"
**Solution:** 
- Go to Vercel Dashboard → Settings → Environment Variables
- Add `GOOGLE_API_KEY`
- Redeploy

### Issue: "429 Too Many Requests"
**Solution:**
- Wait 1 minute (free tier: 15 req/min)
- Or upgrade Gemini API quota

### Issue: Build Fails
**Solution:**
```bash
# Locally test build
npm run build

# Check for TypeScript errors
npm run type-check

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Issue: PDF Not Processing
**Solution:**
- Check pdfjs worker URL is accessible
- Try with image files instead
- Check browser console for errors

---

## Submission Form Fields

**Live Deployed URL:**
```
https://your-app.vercel.app
```

**GitHub Repository:**
```
https://github.com/your-username/ai-assessment
```

**Brief Explanation:**
```
AI-powered assessment grader that extracts questions from papers,
maps handwritten answers, and provides instant grading with feedback.
Built with Next.js 14, TypeScript, Tailwind CSS, and Google Gemini
Vision API. Features interactive canvas-based highlighting, handles
sub-parts, out-of-order answers, and multi-page sheets.
```

**AI Model/API Used:**
```
Google Gemini 1.5 Flash (100% free tier)
```

**Important Assumptions/Limitations:**
```
- Requires clear, readable question papers and answer sheets
- OCR accuracy depends on handwriting quality
- Free tier: 15 requests/minute, 1500/day
- Results stored in session (lost on refresh as per requirements)
- Large PDFs (>10 pages) may take 30+ seconds
```

---

## Final Check Before Submission

- [ ] App is live and accessible
- [ ] All features working on deployed version
- [ ] GitHub repo is public
- [ ] README.md is complete
- [ ] SUBMISSION.md included
- [ ] No API keys in source code
- [ ] Clean git history
- [ ] Professional commit messages

---

**Ready to Submit!** 🎉

Good luck with your submission!
