let runSolverInitiated = false
let problemText;
let languageText;
let sourceCodeText;
let lastProblemKey;

function injectScript(file, node) {
    var th = document.getElementsByTagName(node)[0];
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', file);
    th.appendChild(s);
}
injectScript( chrome.runtime.getURL('/contentScript.js'), 'body');


function runSolver() {
	//code to send message to open notification. This will eventually move into my extension logic
	chrome.runtime.sendMessage({type: "leetcode-solver-problem", data: {
		problemText,
		languageText,
		sourceCodeText
	}});
}

function sendEditorCommand(type, sourceCode, sendResponse) {
	const requestId = `${Date.now()}-${Math.random()}`;
	const timeoutId = setTimeout(() => {
		window.removeEventListener("sendChromeDataResult", handleResult);
		sendResponse({ ok: false, error: "Timed out while updating the LeetCode editor." });
	}, 5000);

	function handleResult(event) {
		if (event.detail?.requestId && event.detail.requestId !== requestId) {
			return;
		}

		clearTimeout(timeoutId);
		window.removeEventListener("sendChromeDataResult", handleResult);
		sendResponse(event.detail || { ok: true });
	}

	window.addEventListener("sendChromeDataResult", handleResult);
	window.dispatchEvent(new CustomEvent("sendChromeData", {detail: { sourceCode, type, requestId } }));
}

function isLeetCodeProblemPage() {
	return /^https:\/\/(www\.)?leetcode\.com\/problems\/[^/]+/.test(window.location.href);
}

function getTextFromSelectors(selectors) {
	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element && element.innerText && element.innerText.trim()) {
			return element.innerText.trim();
		}
	}

	return "";
}

function getProblemTitle() {
	const titleText = getTextFromSelectors([
		'[data-cy="question-title"]',
		'a[href^="/problems/"][class*="text-title"]',
		'a[href^="/problems/"]',
		'a[href^="/problems/"] div',
		'div[class*="text-title-large"]',
		'h1',
	]);

	return titleText || document.title.replace(" - LeetCode", "").trim();
}

function getProblemDescription() {
	const descriptionText = getTextFromSelectors([
		'[data-track-load="description_content"]',
		'div[data-track-load="description_content"] div',
		'[data-cy="question-content"]',
		'div[class*="question-content"]',
		'div[class*="elfjS"]',
		'div[class*="description"]',
	]);

	if (descriptionText) {
		return descriptionText;
	}

	const bodyText = document.body.innerText || "";
	const descriptionStart = bodyText.indexOf("Example 1:");
	const constraintsStart = bodyText.indexOf("Constraints:");
	if (descriptionStart > -1 && constraintsStart > descriptionStart) {
		const beforeExamples = bodyText.slice(0, descriptionStart);
		const problemIntro = beforeExamples.split("\n").filter(Boolean).slice(-8).join("\n");
		const constraintsEnd = bodyText.indexOf("Seen this question", constraintsStart);
		const constraints = bodyText.slice(
			constraintsStart,
			constraintsEnd > constraintsStart ? constraintsEnd : undefined
		);
		return [problemIntro, bodyText.slice(descriptionStart, constraintsStart), constraints].join("\n").trim();
	}

	return "";
}

function getLanguage() {
	return getTextFromSelectors([
		'#editor [id^="headlessui-listbox-button"]',
		'[data-cy="lang-select"]',
		'button[id^="headlessui-listbox-button"]',
		'button[aria-haspopup="listbox"]',
	]) || "Unknown";
}

function getSourceCode() {
	const monacoText = getTextFromSelectors([
		'#editor .view-lines',
		'.monaco-editor .view-lines',
		'[data-mode-id] .view-lines',
	]);

	if (monacoText) {
		return monacoText;
	}

	const textAreas = Array.from(document.querySelectorAll('textarea'));
	const sourceTextArea = textAreas.find((textarea) => textarea.value && textarea.value.trim());
	return sourceTextArea ? sourceTextArea.value.trim() : "";
}

function extractProblemInfo() {
	if (!isLeetCodeProblemPage()) {
		return null;
	}

	const descriptionText = getProblemDescription();
	if (!descriptionText) {
		return null;
	}

	const titleText = getProblemTitle();
	return {
		problemText: [titleText, descriptionText].filter(Boolean).join("\n\n"),
		languageText: getLanguage(),
		sourceCodeText: getSourceCode(),
	};
}

function publishProblemInfo(force = false) {
	const problemInfo = extractProblemInfo();
	if (!problemInfo) {
		return false;
	}

	const problemKey = [
		window.location.pathname,
		problemInfo.languageText,
		problemInfo.problemText.length,
		problemInfo.sourceCodeText.length,
	].join("|");

	if (force || problemKey !== lastProblemKey) {
		problemText = problemInfo.problemText;
		languageText = problemInfo.languageText;
		sourceCodeText = problemInfo.sourceCodeText;
		lastProblemKey = problemKey;
		runSolver();
		runSolverInitiated = true;
	}

	return true;
}

const intervalTime = 100;
const interval = setInterval(() => {
	if (isLeetCodeProblemPage()) {
		setTimeout(() => publishProblemInfo(!runSolverInitiated), 500);
	}
}, intervalTime);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "extract-current-problem") {
    	const foundProblem = publishProblemInfo(true);
    	sendResponse(foundProblem ? {
    		problemText,
    		languageText,
    		sourceCodeText
    	} : null);
    } else if (message.type === "autoPaste") {
    	sendEditorCommand("autoPaste", message.sourceCode, sendResponse);
    } else if (message.type === "autoType") {
    	sendEditorCommand("autoType", message.sourceCode, sendResponse);
    }

    return true
});


