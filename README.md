thank-you to WTC

# 10x-LeetCode-Solver

A Chrome extension that solves LeetCode problems for you.

## Folder structure

```
backend/
  server.js          Local solver API
  .env              Local API keys and backend config

frontend/
  manifest.json     Chrome extension manifest
  popup/            React popup UI
  dist/             Built extension bundle
  release/          Generated Chrome Web Store ZIP package
  package.json      Frontend dependencies and build scripts

api/
  generate.js       Vercel POST /api/generate function
  health.js         Vercel GET /api/health function
```

## How to use

### 1) Install frontend packages

You need a recent version of Node.js.

```
npm --prefix frontend install
```

### 2) Build the frontend

From the repo root:

```
npm run frontend:build
```

Or from `frontend/`:

```
npm run build
```

### 3) Load the extension

Open Chrome's extension manager and load `frontend/` as the unpacked extension folder.

### 4) Run the local solver API

Create `backend/.env`, then add your OpenRouter key. The real `.env` file is ignored by git.

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
PORT=3000
```

From the repo root:

```
npm run backend
```

Or from `backend/`:

```
npm start
```

The extension settings should use `http://localhost:3000`.

## Deploy backend to Vercel

This repo includes Vercel serverless functions in `api/`.

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Add environment variables in Vercel:

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=your_model_here
APP_URL=https://your-vercel-project.vercel.app
```

Optional OpenAI config:

```
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

4. Deploy.
5. Test:

```
https://your-vercel-project.vercel.app/api/health
```

The extension API base URL should be:

```
https://your-vercel-project.vercel.app/api
```

## Build Chrome Web Store package

From PowerShell, replace the API URL with your deployed Vercel URL:

```
$env:API_URL="https://your-vercel-project.vercel.app/api"
npm run frontend:build
npm run frontend:package
```

Upload this ZIP to Chrome Web Store:

```
frontend/release/leetcode-solver-extension.zip
```

Manual Chrome Web Store steps:

1. Create a Chrome Web Store developer account.
2. Create a new extension item.
3. Upload `frontend/release/leetcode-solver-extension.zip`.
4. Fill listing copy, screenshots, category, distribution, and privacy fields.
5. Add a privacy policy URL. The extension sends LeetCode problem text, starter code, and generated solution requests to your backend and AI provider.
6. Submit for review.

