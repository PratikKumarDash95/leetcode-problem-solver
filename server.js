const http = require("http");
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
	const envPath = path.join(__dirname, ".env");
	if (!fs.existsSync(envPath)) {
		return;
	}

	const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine || trimmedLine.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmedLine.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmedLine.slice(0, separatorIndex).trim();
		const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
		if (key && !process.env[key]) {
			process.env[key] = value;
		}
	}
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

function sendJson(response, statusCode, data) {
	response.writeHead(statusCode, {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Content-Type": "application/json",
	});
	response.end(JSON.stringify(data));
}

function readJson(request) {
	return new Promise((resolve, reject) => {
		let body = "";

		request.on("data", (chunk) => {
			body += chunk;
		});

		request.on("end", () => {
			try {
				resolve(body ? JSON.parse(body) : {});
			} catch (error) {
				reject(error);
			}
		});

		request.on("error", reject);
	});
}

function extractCode(text) {
	const codeBlockMatch = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
	return codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
}

async function generateSolution(prompt) {
	if (!OPENROUTER_API_KEY) {
		throw new Error("OPENROUTER_API_KEY is not set");
	}

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
			"HTTP-Referer": "http://localhost:3000",
			"X-Title": "LeetCode Solver",
		},
		body: JSON.stringify({
			model: OPENROUTER_MODEL,
			messages: [
				{
					role: "system",
					content: "Return only the completed LeetCode solution code. Do not include explanations.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.2,
		}),
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result?.error?.message || `OpenRouter returned ${response.status}`);
	}

	return extractCode(result.choices?.[0]?.message?.content || "");
}

const server = http.createServer(async (request, response) => {
	if (request.method === "OPTIONS") {
		sendJson(response, 204, {});
		return;
	}

	if (request.method === "GET" && request.url === "/health") {
		sendJson(response, 200, { ok: true });
		return;
	}

	if (request.method !== "POST" || request.url !== "/generate") {
		sendJson(response, 404, { error: "Use POST /generate" });
		return;
	}

	try {
		const { prompt } = await readJson(request);
		if (!prompt) {
			sendJson(response, 400, { error: "Missing prompt" });
			return;
		}

		const output = await generateSolution(prompt);
		sendJson(response, 200, { output });
	} catch (error) {
		sendJson(response, 500, { error: error.message });
	}
});

server.listen(PORT, () => {
	console.log(`LeetCode solver API running at http://localhost:${PORT}`);
	console.log(`Using OpenRouter model: ${OPENROUTER_MODEL}`);
	if (!OPENROUTER_API_KEY) {
		console.log("Set OPENROUTER_API_KEY before using /generate.");
	}
});
