#!/bin/bash

# 🚀 VedaAI Assignment - One-Click Deployment Script
# This script will guide you through deploying your application

echo "=================================="
echo "🚀 AI Assessment Grader Deployment"
echo "=================================="
echo ""

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the ai-assessment directory"
    exit 1
fi

echo "✅ Found project directory"
echo ""

# Step 2: Check for API key
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found"
    echo ""
    echo "📝 Please create .env.local with your Google API key:"
    echo "   GOOGLE_API_KEY=your_key_here"
    echo ""
    echo "Get your FREE API key from: https://aistudio.google.com/app/apikey"
    echo ""
    read -p "Press Enter once you've created .env.local..."
fi

echo "✅ Environment configured"
echo ""

# Step 3: Test build
echo "🔨 Testing build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful"
echo ""

# Step 4: Git setup
echo "📦 Setting up Git..."

if [ ! -d ".git" ]; then
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Step 5: Create .gitignore if needed
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOF
    echo "✅ Created .gitignore"
fi

# Step 6: Commit code
echo ""
echo "📝 Committing code..."
git add .
git commit -m "feat: AI Assessment Grader with Google Gemini - VedaAI Assignment"

echo "✅ Code committed"
echo ""

# Step 7: GitHub setup
echo "=================================="
echo "🔗 GitHub Setup"
echo "=================================="
echo ""
echo "Choose an option:"
echo "  1) Create new GitHub repo (requires GitHub CLI)"
echo "  2) I'll create it manually on GitHub.com"
echo ""
read -p "Enter choice (1 or 2): " github_choice

if [ "$github_choice" = "1" ]; then
    # Check if gh is installed
    if command -v gh &> /dev/null; then
        echo ""
        read -p "Enter repository name (default: ai-assessment): " repo_name
        repo_name=${repo_name:-ai-assessment}

        echo "Creating repository..."
        gh repo create $repo_name --public --source=. --remote=origin --push

        echo "✅ Repository created and code pushed!"
    else
        echo "❌ GitHub CLI not installed. Please install it or choose option 2."
        exit 1
    fi
elif [ "$github_choice" = "2" ]; then
    echo ""
    echo "📋 Manual GitHub Setup:"
    echo "  1. Go to: https://github.com/new"
    echo "  2. Create a new repository (make it PUBLIC)"
    echo "  3. Copy the repository URL"
    echo ""
    read -p "Enter your GitHub repository URL: " repo_url

    git remote add origin $repo_url
    git branch -M main
    git push -u origin main

    echo "✅ Code pushed to GitHub!"
else
    echo "❌ Invalid choice"
    exit 1
fi

echo ""

# Step 8: Vercel deployment
echo "=================================="
echo "☁️  Vercel Deployment"
echo "=================================="
echo ""
echo "Choose an option:"
echo "  1) Deploy with Vercel CLI (requires Vercel CLI)"
echo "  2) I'll deploy manually on Vercel.com"
echo ""
read -p "Enter choice (1 or 2): " vercel_choice

if [ "$vercel_choice" = "1" ]; then
    if command -v vercel &> /dev/null; then
        echo ""
        echo "Deploying to Vercel..."
        vercel --prod

        echo ""
        echo "✅ Deployed!"
        echo ""
        echo "⚠️  Don't forget to add environment variable:"
        echo "   GOOGLE_API_KEY=your_key"
        echo "   Go to: Vercel Dashboard → Settings → Environment Variables"
    else
        echo "❌ Vercel CLI not installed."
        echo "Install with: npm i -g vercel"
        exit 1
    fi
elif [ "$vercel_choice" = "2" ]; then
    echo ""
    echo "📋 Manual Vercel Deployment:"
    echo ""
    echo "  1. Go to: https://vercel.com"
    echo "  2. Click 'Import Project'"
    echo "  3. Select your GitHub repository"
    echo "  4. Add environment variable:"
    echo "     Name: GOOGLE_API_KEY"
    echo "     Value: (your Google API key)"
    echo "  5. Click 'Deploy'"
    echo ""
    echo "  Wait 2-3 minutes for deployment to complete"
    echo ""
fi

echo ""
echo "=================================="
echo "🎉 Deployment Complete!"
echo "=================================="
echo ""
echo "📝 Next Steps:"
echo "  1. Test your deployed app"
echo "  2. Copy the live URL"
echo "  3. Fill submission form: https://forms.gle/vFXzf3kcLmGougMr5"
echo ""
echo "Submission Form Fields:"
echo "  - Live URL: (from Vercel)"
echo "  - GitHub: (your repo URL)"
echo "  - AI Model: Google Gemini 1.5 Flash"
echo "  - Brief explanation: See SUBMISSION.md"
echo ""
echo "Good luck! 🚀"
echo ""
