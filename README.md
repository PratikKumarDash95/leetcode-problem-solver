thank-you to WTC

https://github.com/PratikKumarDash95/leetcode-problem-solver/raw/main/public/Video%20Project%201.mp4

<br>
<img src="public/Screenshot%202026-05-28%20104703.png" width="400" />

# LeetCode-Solver

A Chrome extension that generates LeetCode solutions using an AI backend you control.

## About this project

This project includes a Chrome extension UI, a local Node.js backend for development, and Vercel serverless functions for production. The extension sends the current LeetCode problem prompt to your backend, which calls an AI provider and returns only the solution code.

## Tech stack

- Chrome Extension (Manifest V3)
- React + Webpack (extension popup UI)
- Node.js (local backend)
- Vercel Serverless Functions (production backend)
- OpenRouter / OpenAI (AI providers)

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

### Install and use (local dev)

1) Install frontend dependencies

```
npm --prefix frontend install
```

2) Build the extension

```
npm run frontend:build
```

3) Load the extension in Chrome

- Go to chrome://extensions
- Enable Developer Mode
- Click "Load unpacked" and select `frontend/`

4) Run the local backend

Create `backend/.env` with your key:

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
PORT=3000
```

Then start the server:

```
npm run backend
```

5) Use the extension

- Open any LeetCode problem page
- Open the extension popup
- Ensure API URL is set to `http://localhost:3000`
- Click generate

### Install and use (production backend)

1) Deploy the backend to Vercel (steps below).
2) Set the extension API URL to your Vercel endpoint:

```
https://your-vercel-project.vercel.app/api
```

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

## Direct download link (no Web Store)

If you want to share a click-to-download link without the Chrome Web Store, publish the ZIP as a GitHub Release asset and put the URL here:

https://github.com/PratikKumarDash95/leetcode-problem-solver/releases/latest/download/leetcode-solver-extension.zip

## Manual install from ZIP (no Web Store)

1) Download the ZIP from the link above.
2) Extract it to a folder.
3) Go to chrome://extensions
4) Enable Developer Mode.
5) Click "Load unpacked" and select the extracted folder.

Manual Chrome Web Store steps:

1. Create a Chrome Web Store developer account.
2. Create a new extension item.
3. Upload `frontend/release/leetcode-solver-extension.zip`.
4. Fill listing copy, screenshots, category, distribution, and privacy fields.
5. Add a privacy policy URL. The extension sends LeetCode problem text, starter code, and generated solution requests to your backend and AI provider.
6. Submit for review.

