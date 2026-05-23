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

function getSolverConfig() {
	const openRouterApiKey = process.env.OPENROUTER_API_KEY;
	const openAiApiKey = process.env.OPENAI_API_KEY;
	const freeModelApiKey = process.env.FREEMODEL_API_KEY;
	const provider = (process.env.AI_PROVIDER || (freeModelApiKey ? "freemodel" : openRouterApiKey ? "openrouter" : "openai")).toLowerCase();

	return {
		provider,
		openRouterApiKey,
		openAiApiKey,
		freeModelApiKey,
		openRouterModel: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
		openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
		freeModelModel: process.env.FREEMODEL_MODEL || "gpt-5.4",
		freeModelUrl: process.env.FREEMODEL_URL || "https://api.freemodel.dev",
	};
}

function extractCode(text) {
	const codeBlockMatch = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
	return codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
}

function formatProviderError(providerName, status, result) {
	const error = result?.error || {};
	const parts = [
		`${providerName} returned ${status}`,
		error.code ? `code: ${error.code}` : "",
		error.message ? `message: ${error.message}` : "",
		error.metadata?.provider_name ? `provider: ${error.metadata.provider_name}` : "",
		error.metadata?.raw ? `raw: ${String(error.metadata.raw).slice(0, 300)}` : "",
	].filter(Boolean);

	return parts.join(" | ");
}

async function generateSolution(prompt) {
	const config = getSolverConfig();
	const useOpenAI = config.provider === "openai";
	const useFreeModel = config.provider === "freemodel";
	const apiKey = useFreeModel ? config.freeModelApiKey : useOpenAI ? config.openAiApiKey : config.openRouterApiKey;
	const model = useFreeModel ? config.freeModelModel : useOpenAI ? config.openAiModel : config.openRouterModel;
	const providerName = useFreeModel ? "FreeModel" : useOpenAI ? "OpenAI" : "OpenRouter";
	const url = useFreeModel
		? `${config.freeModelUrl}/v1/chat/completions`
		: useOpenAI
		? "https://api.openai.com/v1/chat/completions"
		: "https://openrouter.ai/api/v1/chat/completions";

	if (!apiKey) {
		const keyName = useFreeModel ? "FREEMODEL_API_KEY" : useOpenAI ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY";
		throw new Error(`${keyName} is not set`);
	}

	const headers = {
		"Authorization": `Bearer ${apiKey}`,
		"Content-Type": "application/json",
	};

	if (!useOpenAI && !useFreeModel) {
		headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost:3000";
		headers["X-Title"] = "LeetCode Solver";
	}

	const systemPrompt = "Return only the completed LeetCode solution code. Do not include explanations.";
	const body = {
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: prompt },
		],
		temperature: 0.2,
	};

	if (useFreeModel) {
		body.reasoning_effort = "high";
	}

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});

	const responseText = await response.text();
	let result = {};
	try {
		result = responseText ? JSON.parse(responseText) : {};
	} catch (error) {
		throw new Error(`Provider returned non-JSON response (${response.status}): ${responseText.slice(0, 200)}`);
	}

	if (!response.ok) {
		throw new Error(formatProviderError(providerName, response.status, result));
	}

	const content = result.choices?.[0]?.message?.content || "";
	return extractCode(content);
}

module.exports = {
	generateSolution,
	getSolverConfig,
};
