import { useState, useEffect } from "react";

import pacman from "../../pacman.svg";

import "../styles/solver-form.scss";

const DEFAULT_API_URL = process.env.API_URL || "http://localhost:3000";

function getProblemTitle(problemInfo) {
	return problemInfo?.problemText?.split("\n").find((line) => line.trim()) || "Current LeetCode problem";
}

function getProblemMeta(problemInfo) {
	const lines = problemInfo?.problemText?.split("\n").map((line) => line.trim()).filter(Boolean) || [];
	const description = lines.slice(1).join(" ");

	return description || "Statement loaded privately for the solver prompt.";
}

function getTitleSlugFromUrl(url) {
	const match = url?.match(/leetcode\.com\/problems\/([^/?#]+)/);
	return match ? match[1] : "";
}

function htmlToText(html) {
	const doc = new DOMParser().parseFromString(html || "", "text/html");
	return doc.body.innerText.trim();
}

function setLeetCodeEditorFromPage(sourceCode, commandType) {
	try {
	function parseSolutionCode(code) {
		if (!code) {
			return "";
		}

		if (code.indexOf("[PYTHON]") > -1) {
			const start = code.indexOf("[PYTHON]") + "[PYTHON]".length;
			const end = code.indexOf("[/PYTHON]");
			return (end > -1 ? code.slice(start, end) : code.slice(start)).trim();
		}

		const codeBlock = /```(?:[\w+#.-]+)?\s*([\s\S]*?)```/;
		const match = codeBlock.exec(code);
		return (match ? match[1] : code).trim();
	}

	function typeWithDelay(editor, parsedSourceCode) {
		let addedChars = "";
		let index = 0;
		const characters = parsedSourceCode.split("");

		function typeNextCharacter() {
			if (index >= characters.length) {
				return;
			}

			const character = characters[index];
			index += 1;
			addedChars += character;
			replaceEditorValue(editor, addedChars);
			window.setTimeout(typeNextCharacter, 20 + Math.round(Math.random() * 40));
		}

		typeNextCharacter();
	}

	function getEditorDomNode(editor) {
		return editor?.getDomNode?.()
			|| document.querySelector("#editor .monaco-editor")
			|| document.querySelector(".monaco-editor");
	}

	function focusEditor(editor) {
		editor?.focus?.();

		const editorNode = getEditorDomNode(editor);
		if (!editorNode) {
			return;
		}

		editorNode.scrollIntoView?.({ block: "center", inline: "nearest" });
		editorNode.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
		editorNode.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
		editorNode.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));

		const input = editorNode.querySelector("textarea.inputarea")
			|| editorNode.querySelector("textarea")
			|| document.querySelector(".monaco-editor textarea.inputarea")
			|| document.querySelector("#editor textarea");

		input?.focus?.();
	}

	function replaceEditorValue(editor, value) {
		focusEditor(editor);

		if (editor?.executeEdits && editor?.getModel?.()) {
			const model = editor.getModel();
			editor.executeEdits("leetcode-solver", [{
				range: model.getFullModelRange(),
				text: value,
				forceMoveMarkers: true,
			}]);
			editor.pushUndoStop?.();
			return;
		}

		editor.setValue(value);
	}

	function setNativeValue(element, value) {
		const prototype = Object.getPrototypeOf(element);
		const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
		if (descriptor?.set) {
			descriptor.set.call(element, value);
		} else {
			element.value = value;
		}

		element.dispatchEvent(new InputEvent("input", {
			bubbles: true,
			cancelable: true,
			inputType: "insertText",
			data: value,
		}));
		element.dispatchEvent(new Event("change", { bubbles: true }));
	}

	function replaceDomEditorValue(value) {
		const textarea = document.querySelector("#editor textarea")
			|| document.querySelector(".monaco-editor textarea.inputarea")
			|| document.querySelector("textarea.inputarea")
			|| Array.from(document.querySelectorAll("textarea")).find((node) => node.offsetParent !== null);

		if (textarea) {
			textarea.focus();
			setNativeValue(textarea, value);
			return true;
		}

		const editable = document.querySelector("#editor [contenteditable='true']")
			|| document.querySelector(".cm-content[contenteditable='true']")
			|| document.querySelector("[contenteditable='true']");

		if (!editable) {
			return false;
		}

		editable.focus();
		document.execCommand?.("selectAll", false, null);
		if (document.execCommand?.("insertText", false, value)) {
			return true;
		}

		editable.textContent = value;
		editable.dispatchEvent(new InputEvent("input", {
			bubbles: true,
			cancelable: true,
			inputType: "insertText",
			data: value,
		}));
		return true;
	}

	const monaco = window.monaco;
	const parsedSourceCode = parseSolutionCode(sourceCode);
	const editors = monaco?.editor?.getEditors ? monaco.editor.getEditors() : [];
	const focusedEditor = editors.find((editor) => editor.hasTextFocus?.());
	const codeEditor = focusedEditor || editors.find((editor) => editor.getModel?.()?.getLanguageId?.());
	const model = monaco?.editor?.getModels?.()[0];
	const editor = codeEditor || (model ? { setValue: (value) => model.setValue(value) } : null);

	if (!editor) {
		if (replaceDomEditorValue(parsedSourceCode)) {
			return { ok: true, method: "dom" };
		}

		return {
			ok: false,
			error: "LeetCode editor is not ready. Click inside the code editor once, then try Apply or Type again.",
			debug: {
				hasMonaco: Boolean(monaco?.editor),
				textareaCount: document.querySelectorAll("textarea").length,
				contentEditableCount: document.querySelectorAll("[contenteditable='true']").length,
			},
		};
	}

	if (commandType === "autoType") {
		typeWithDelay(editor, parsedSourceCode);
		return { ok: true, method: "monaco-type" };
	}

	replaceEditorValue(editor, parsedSourceCode);
	return { ok: true, method: "monaco" };
	} catch (error) {
		return { ok: false, error: error?.message || String(error) };
	}
}

async function fetchProblemFromLeetCode(titleSlug) {
	const response = await fetch("https://leetcode.com/graphql", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			query: `
				query questionData($titleSlug: String!) {
					question(titleSlug: $titleSlug) {
						title
						content
						codeSnippets {
							lang
							code
						}
					}
				}
			`,
			variables: { titleSlug },
		}),
	});

	if (!response.ok) {
		throw new Error(`LeetCode returned ${response.status}`);
	}

	const result = await response.json();
	const question = result?.data?.question;
	if (!question) {
		return null;
	}

	const javaSnippet = question.codeSnippets?.find((snippet) => snippet.lang === "Java");
	const firstSnippet = question.codeSnippets?.[0];

	return {
		problemText: [question.title, htmlToText(question.content)].filter(Boolean).join("\n\n"),
		languageText: javaSnippet?.lang || firstSnippet?.lang || "Java",
		sourceCodeText: javaSnippet?.code || firstSnippet?.code || "",
	};
}

function SolverForm({ settingsOpen, onCloseSettings }) {
	const [loading, setLoading] = useState(false);
	const [solution, setSolution] = useState();
	const [leetCodeProblemInfo, setLeetCodeProblemInfo] = useState()
	const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
	const [draftApiUrl, setDraftApiUrl] = useState(DEFAULT_API_URL);
	const [error, setError] = useState("");
		
	useEffect(() => {
		let interval; 

		const fetchCurrentProblemInfo  = (cb) => {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				const activeTab = tabs[0];
				if (!activeTab?.id) {
					return
				}

				const loadFromLeetCodeApi = async () => {
					const titleSlug = getTitleSlugFromUrl(activeTab.url);
					if (!titleSlug) {
						return;
					}

					try {
						const apiProblem = await fetchProblemFromLeetCode(titleSlug);
						if (apiProblem) {
							clearInterval(interval)
							setLeetCodeProblemInfo(apiProblem)
						}
					} catch (error) {
						setError(`Could not load problem from LeetCode. (${error.message})`)
					}
				}

				chrome.tabs.sendMessage(activeTab.id, {
					type: "extract-current-problem"
				}, (tabResponse) => {
					const response = tabResponse || null

					if (response) {
						clearInterval(interval)
						setLeetCodeProblemInfo(response)
						return
					}

					chrome.runtime.sendMessage({
						type: "get-current-problem"
					}, (backgroundResponse) => {
						if (backgroundResponse) {
							clearInterval(interval)
							setLeetCodeProblemInfo(backgroundResponse)
						}
					})

					loadFromLeetCodeApi()
				})
			})
		}

		interval = setInterval(() => {
			fetchCurrentProblemInfo()
		}, 100);

		return () => {
			clearInterval(interval)
		}
	}, [])

	useEffect(() => {
		chrome.storage.sync.get({ apiUrl: DEFAULT_API_URL }, ({ apiUrl }) => {
			setApiUrl(apiUrl);
			setDraftApiUrl(apiUrl);
		});
	}, []);

	const saveSettings = () => {
		const nextApiUrl = draftApiUrl.trim().replace(/\/+$/, "");
		chrome.storage.sync.set({ apiUrl: nextApiUrl || DEFAULT_API_URL }, () => {
			setApiUrl(nextApiUrl || DEFAULT_API_URL);
			onCloseSettings();
		});
	}

	
	const solve = async () => {
		if (!leetCodeProblemInfo) {
			setError("Open a LeetCode problem page first.");
			return;
		}

		const getSolutionPrompt = () => {
		return `[INST]
		<<SYS>>
		You are a senior software engineer bot. Your role is to get coding interview problems and solve them using the given programming language.
		Your duties are the following
		- You must follow the directions you're given and ensure every single point in the problem is addressed.
		- You must ensure each example case in the given problem would successfully run
		- You MUST implement each constraint that is given in the problem statement
		- You Do NOT need to address the given follow up at the end of the problem.
		- You will be given the incomplete problem source code. You must complete the source code given using the problem statement.
		- Only respond with the solution written in the given programming language. Remember the solution must be a completed version of the incomplete source code. 
		- Structure your response in markdown code format with the code between 3 back ticks;
		- You must complete the problem in the desired programming language given by the user. ONLY use the programming language given.

		Let me reiterate
		- You must follow the directions you're given and ensure every single point in the problem is addressed.
		- You must ensure each example case in the given problem would successfully run
		- You MUST implement each constraint that is given in the problem statement


		The user will probide the language to solve the problem and the problem in the below:
		LANGUAGE: the desired programming language
		PROBLEM: the problem 
		INCOMPLETE SOURCE CODE: the incomplete source code

		<</SYS>>

		LANGUAGE: ${leetCodeProblemInfo.languageText}
		PROBLEM: ${leetCodeProblemInfo.problemText} 
		INCOMPLETE SOURCE CODE: ${leetCodeProblemInfo.sourceCodeText}
		[/INST]`
		};
		setError("")
		setLoading(true)
		const prompt = getSolutionPrompt()
		try {
			const response = await fetch(apiUrl + "/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					prompt
				})
			})
			const result = await response.json()
			if (!response.ok) {
				throw new Error(result?.error || `API returned ${response.status}`);
			}
			if (!Object.prototype.hasOwnProperty.call(result || {}, "output")) {
				throw new Error(`API response did not include an output field. Response: ${JSON.stringify(result)}`);
			}
			setSolution(result.output);
	
		} catch(e) {
			setError(`Could not get a solution. Check Settings API URL and make sure your solver server is running. (${e.message})`)
		}
		
		setLoading(false)

	}

	const executeEditorScript = (tabId, commandType, callback) => {
		if (!chrome.scripting?.executeScript) {
			callback({ ok: false, error: "Missing extension scripting permission. Reload the extension after rebuilding." });
			return;
		}

		chrome.scripting.executeScript({
			target: { tabId },
			world: "MAIN",
			func: setLeetCodeEditorFromPage,
			args: [solution, commandType],
		}, (results) => {
			const runtimeError = chrome.runtime.lastError;
			if (runtimeError) {
				callback({ ok: false, error: runtimeError.message });
				return;
			}

			if (!results?.length) {
				callback({ ok: false, error: "Chrome did not return an injection result. Make sure the active tab is a LeetCode problem page, then reload the page." });
				return;
			}

			callback(results[0]?.result || { ok: false, error: "The injected editor script returned no result." });
		});
	};

	const updateEditor = (commandType) => {
		setError("")
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			const activeTab = tabs[0];
			const actionLabel = commandType === "autoType" ? "type into" : "paste into";

			if (!activeTab?.id) {
				setError(`Could not ${actionLabel} LeetCode editor. (No active tab)`)
				return;
			}

			executeEditorScript(activeTab.id, commandType, (scriptResponse) => {
				if (scriptResponse?.ok) {
					setError("")
					return;
				}

				chrome.tabs.sendMessage(activeTab.id, { type: commandType, sourceCode: solution }, (response) => {
					const runtimeError = chrome.runtime.lastError;
					if (!response?.ok) {
						setError(`Could not ${actionLabel} LeetCode editor. (${response?.error || scriptResponse?.error || runtimeError?.message || "No response from page"})`)
					} else {
						setError("")
					}
				});
			});
		});
	}

	const autoPaste = () => updateEditor("autoPaste")

	const autoType = () => updateEditor("autoType")

	return <div className="solver-form h-100 w-100 flex flex-column">
		{settingsOpen && <div className="solver-form__settings">
			<label htmlFor="api-url"><b>API URL</b></label>
			<input
				id="api-url"
				type="text"
				value={draftApiUrl}
				placeholder="http://localhost:3000"
				onChange={(event) => setDraftApiUrl(event.target.value)}
			/>
			<p>Your server must expose POST /generate and return JSON like {"{ \"output\": \"...\" }"}.</p>
			<div className="solver-form__settings-actions">
				<button type="button" onClick={saveSettings}>Save</button>
				<button type="button" onClick={onCloseSettings}>Cancel</button>
			</div>
		</div>}
		{error && <div className="solver-form__error">{error}</div>}
		{!leetCodeProblemInfo && <div className="solver-form__empty flex flex-grow justify-center align-center">
			<div>
				<p className="solver-form__eyebrow">Waiting for LeetCode</p>
				<h2>Open a problem page</h2>
				<p className="solver-form__empty-copy">The extension will detect the active problem and keep the full statement out of this panel.</p>
			</div>
		</div>}
		{leetCodeProblemInfo && <div className="solver-form__workspace">
			<div className="solver-form__hero">
				<div className="solver-form__hero-content">
					<p className="solver-form__eyebrow">Problem detected</p>
					<h2>{getProblemTitle(leetCodeProblemInfo)}</h2>
					<p className="solver-form__summary">{getProblemMeta(leetCodeProblemInfo)}</p>
				</div>
				<div className="solver-form__action-square">
					{!loading && !solution && <button className="solver-form__submit cursor-pointer" onClick={solve}>
						Solve it
					</button>}
					{loading && <div className="solver-form__loading flex align-center justify-center w-100">
						<img src={pacman} alt="Solving" />
					</div>}
					{solution && <div className="solver-form__solution w-100 flex flex-column">
						<div className="solver-form__section-title">
							<span>Answer</span>
							<button type="button" onClick={solve} disabled={loading}>Again</button>
						</div>
						<div className="solver-form__options w-100 flex align-center justify-center">
							<button className="solver-form__options-btn" onClick={autoPaste}>
								Apply
							</button>
							<button className="solver-form__options-btn" onClick={autoType}>
								Type
							</button>
						</div>
						<textarea readOnly value={solution}></textarea>
					</div>}
				</div>
			</div>
		</div>}
	</div>
}

export default SolverForm;
