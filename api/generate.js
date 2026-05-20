const { generateSolution } = require("../backend/solver");

function sendJson(response, statusCode, data) {
	response.status(statusCode).json(data);
}

module.exports = async function handler(request, response) {
	response.setHeader("Access-Control-Allow-Origin", "*");
	response.setHeader("Access-Control-Allow-Headers", "Content-Type");
	response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

	if (request.method === "OPTIONS") {
		sendJson(response, 204, {});
		return;
	}

	if (request.method !== "POST") {
		sendJson(response, 405, { error: "Use POST /api/generate" });
		return;
	}

	try {
		const prompt = request.body?.prompt;
		if (!prompt) {
			sendJson(response, 400, { error: "Missing prompt" });
			return;
		}

		const output = await generateSolution(prompt);
		sendJson(response, 200, { output });
	} catch (error) {
		sendJson(response, 500, { error: error.message });
	}
};
