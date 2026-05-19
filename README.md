thank-you to WTC 

# 10x-LeetCode-Solver
A chrome extension that solves leet code problems for you


# How to use
### 1) Install the packages 
*(you need the lastest version of node)*

Run npm install (or yarn)
```
$ npm install
```
Build the frontend
```
$ npm run build
```

### 3) Load the extension
See [Chrome's developer tutorial](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/) on how to start a chrome extension project. You can select this repository as the unpacked extension to run (should work out of the box)

### 3) Run the local solver API

Create a local `.env` file, then add your OpenRouter key. The real `.env` file is ignored by git.

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
PORT=3000
```

```
$ node server.js
```

The extension settings should use `http://localhost:3000`.

