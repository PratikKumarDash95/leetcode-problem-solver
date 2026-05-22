const http = require("http");
const { generateSolution, getSolverConfig } = require("./solver");

const PORT = Number(process.env.PORT || 3000);

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
	const config = getSolverConfig();
	const providerNames = { openai: "OpenAI", openrouter: "OpenRouter", freemodel: "FreeModel" };
	const providerName = providerNames[config.provider] || config.provider;
	const modelMap = {
		openai: config.openAiModel,
		openrouter: config.openRouterModel,
		freemodel: config.freeModelModel,
	};
	const model = modelMap[config.provider];

	console.log(`LeetCode solver API running at http://localhost:${PORT}`);
	console.log(`Using ${providerName} model: ${model}`);

	if (config.provider === "openai" && !config.openAiApiKey) {
		console.log("Set OPENAI_API_KEY before using /generate.");
	}
	if (config.provider === "openrouter" && !config.openRouterApiKey) {
		console.log("Set OPENROUTER_API_KEY before using /generate.");
	}
	if (config.provider === "freemodel" && !config.freeModelApiKey) {
		console.log("Set FREEMODEL_API_KEY before using /generate.");
	}
});
