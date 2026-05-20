const { getSolverConfig } = require("../backend/solver");

module.exports = function handler(request, response) {
	const config = getSolverConfig();

	response.status(200).json({
		ok: true,
		provider: config.provider,
		model: config.provider === "openai" ? config.openAiModel : config.openRouterModel,
	});
};
