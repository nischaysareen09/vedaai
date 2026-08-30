# 🚀 Quick Start Guide

## Get Your FREE API Key (2 minutes)

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

## Setup & Run (3 steps)

### 1️⃣ Create `.env.local` file

In VS Code:
- Rename `.env.example` to `.env.local`
- Paste your API key:
  ```
  GOOGLE_API_KEY=AIzaSyC...your_key_here
  ```

### 2️⃣ Open Terminal

Press `Ctrl + ` ` (Control + Backtick)

### 3️⃣ Run

```bash
npm run dev
```

Open: http://localhost:3000

## 🎉 That's it! 

Upload a question paper and answer sheet to test.

## Need Help?

- **Error "API key not found"**: Restart dev server after creating `.env.local`
- **429 Error**: Wait 1 minute (free tier: 15 requests/min)
- **PDF issues**: Try with image files (.jpg, .png) instead

## Deploy to Vercel (FREE)

1. Push to GitHub
2. Import on vercel.com
3. Add `GOOGLE_API_KEY` in environment variables
4. Deploy!

---

**Google Gemini is 100% FREE** - No credit card needed!
