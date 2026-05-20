async function timeout(miliseconds) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, miliseconds)
    })
}

function parseCode(code) {

  if (code.indexOf('[PYTHON]') > -1) {
    const start = code.indexOf('[PYTHON]') + '[PYTHON]'.length

    let end = null;
    if (code.indexOf("[/PYTHON]") > -1) {
        end = code.indexOf("[/PYTHON]")
    }

    return (end) ? code.slice(start, end) : code.slice(start);
  } else {
    const codeblock = /```(?:[\w+#.-]+)?\s*([\s\S]*?)```/;
    const match = codeblock.exec(code)
    if (match) {
    return match[1].trim()
    } else {
    return code.trim()
    }
  }
}

function getEditor() {
    const monaco = window.monaco;
    if (!monaco?.editor) {
        return null;
    }

    const editors = monaco.editor.getEditors ? monaco.editor.getEditors() : [];
    const focusedEditor = editors.find((editor) => editor.hasTextFocus?.());
    if (focusedEditor) {
        return focusedEditor;
    }

    const codeEditor = editors.find((editor) => editor.getModel?.()?.getLanguageId?.());
    if (codeEditor) {
        return codeEditor;
    }

    const model = monaco.editor.getModels?.()[0];
    if (!model) {
        return null;
    }

    return {
        setValue: (value) => model.setValue(value),
    };
}

function getEditorDomNode(editor) {
    return editor?.getDomNode?.()
        || document.querySelector('#editor .monaco-editor')
        || document.querySelector('.monaco-editor');
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

async function setEditorValue(sourceCode, type) {
    const editor = getEditor();
    if (!editor) {
        throw new Error("LeetCode editor is not ready.");
    }

    const parsedSourceCode = parseCode(sourceCode);

    if (type === "autoPaste") {
        replaceEditorValue(editor, parsedSourceCode);
        return;
    }

    let addedChars = "";
    const codeCharSplit = parsedSourceCode.split("");
    while (codeCharSplit.length > 0) {
        addedChars += codeCharSplit.shift();
        await timeout(20 + Math.round(Math.random() * 40));
        replaceEditorValue(editor, addedChars);
    }
}

window.addEventListener("sendChromeData", async function(evt){
    const { sourceCode, type, requestId } = evt.detail;
    try {
        await setEditorValue(sourceCode, type);
        window.dispatchEvent(new CustomEvent("sendChromeDataResult", {detail: { ok: true, type, requestId } }));
    } catch (error) {
        window.dispatchEvent(new CustomEvent("sendChromeDataResult", {detail: { ok: false, type, requestId, error: error.message } }));
    }
});
