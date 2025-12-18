/**
 * This file includes all functions for translating with the Ollama API
 * It depends on commonTranslate for additional translation functions
 * Ollama provides a local LLM API compatible with OpenAI's chat format
 */

// Wrapper function that reads Ollama settings from storage
// This simplifies integration by not requiring all function signatures to be modified
async function ollamaTranslateFromStorage(original, destlang, record, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["ollamaUrl", "ollamaKey", "ollamaModel", "OpenAiGloss"], async function(data) {
            let ollamaUrl = data.ollamaUrl || 'http://localhost:11434';
            let ollamaKey = data.ollamaKey || '';
            let ollamaModel = data.ollamaModel || 'llama3.2';
            // Use glossary from parameter or storage
            let glossary = openAiGloss || data.OpenAiGloss || '';

            // Use OpenAI prompt and settings as they are compatible
            let result = await ollamaTranslate(
                original, destlang, record,
                ollamaUrl, ollamaKey, ollamaModel,
                OpenAIPrompt, preverbs, rowId, transtype, plural_line,
                formal, locale, convertToLower, editor, counter,
                OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, glossary
            );
            resolve(result);
        });
    });
}

async function ollamaTranslate(original, destlang, record, ollamaUrl, ollamaKey, ollamaModel, ollamaPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, ollamaTemp, spellCheckIgnore, ollamaTone, is_editor, openAiGloss) {
    var timeout = 100;
    errorstate = "OK";

    // First we have to preprocess the original to remove unwanted chars
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");

    setTimeout(async function (timeout) {
        var result = getTransOllama(original, destlang, record, ollamaUrl, ollamaKey, ollamaModel, ollamaPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, ollamaTemp, spellCheckIgnore, ollamaTone, openAiGloss);
    }, timeout);
    timeout += 1;
    return errorstate;
}

function getTransOllama(original, language, record, ollamaUrl, ollamaKey, ollamaModel, ollamaPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, ollamaTemp, spellCheckIgnore, ollamaTone, openAiGloss) {
    var row = "";
    var translatedText = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var responseObj = "";
    var textareaElem = "";
    var select = "";
    var textareaElem1 = "";
    var previewElem = "";
    var preview = "";
    var status = "";
    var error;
    var data;
    var link;
    var lang = window.navigator.language;
    var show_debug = false;
    var myprompt;

    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    language = language.toUpperCase();

    let tempPrompt = ollamaPrompt + '\n';
    // Replace tone placeholder in the prompt
    myprompt = tempPrompt.replaceAll("{{tone}}", ollamaTone);
    // Replace glossary placeholder in the prompt
    myprompt = myprompt.replaceAll("{{OpenAiGloss}}", openAiGloss || '');

    if (originalPreProcessed == '') {
        originalPreProcessed = "No result of {originalPreprocessed} for original it was empty!";
    }
    originalPreProcessed = '"' + originalPreProcessed + '"';

    var message = [
        { 'role': 'system', 'content': myprompt },
        { 'role': 'user', 'content': `translate this: ${originalPreProcessed}` }
    ];

    if (ollamaModel != 'undefined' && ollamaModel != '') {
        let mymodel = ollamaModel;

        var dataNew = {
            messages: message,
            model: mymodel,
            stream: false,
            options: {
                temperature: ollamaTemp || 0.5
            }
        };

        // Construct the Ollama API URL - ensure it ends with /api/chat
        link = ollamaUrl.replace(/\/+$/, ''); // Remove trailing slashes
        if (!link.endsWith('/api/chat')) {
            if (!link.endsWith('/api')) {
                link = link + '/api/chat';
            } else {
                link = link + '/chat';
            }
        }

        if (show_debug) {
            console.debug("Ollama link:", link);
            console.debug("original:", original);
            console.debug("prompt:", myprompt);
            console.debug("model:", mymodel);
            console.debug("temp:", ollamaTemp);
            console.debug("tone:", ollamaTone);
            console.debug(`[${new Date().toISOString()}] started`);
        }

        // Build headers - only add Authorization if key is provided
        let headers = {
            "Content-Type": "application/json"
        };

        if (ollamaKey && ollamaKey.trim() !== '') {
            headers["Authorization"] = "Bearer " + ollamaKey;
        }

        const response = fetch(link, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(dataNew)
        })
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                data = isJson && await response.json();

                if (!response.ok) {
                    if (typeof data != "undefined") {
                        errorstate = "NOK";
                        error = [data, error, response.status, errorstate];
                    } else {
                        let message = 'Noresponse';
                        data = "noData";
                        errorstate = "NOK";
                        error = [data, message, response.status, errorstate];
                    }
                    return Promise.reject(error);
                } else {
                    errorstate = "OK";

                    // Ollama response format: { message: { role: "assistant", content: "..." } }
                    let ollama_response = data.message;
                    if (typeof ollama_response != 'undefined' && typeof ollama_response.content != 'undefined') {
                        let text = ollama_response.content;

                        if (text == '""' || text == '') {
                            text = original + " no translation received";
                            translatedText = original + " No translation received";
                        }

                        translatedText = await postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower, spellCheckIgnore, locale);
                        await processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                        return Promise.resolve(errorstate);
                    } else {
                        text = "No suggestions";
                        translatedText = await postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower, spellCheckIgnore, locale);
                        if (translatedText != "") {
                            await processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                        }
                        errorstate = "NOK";
                    }
                    return Promise.resolve(errorstate);
                }
            })
            .catch(error => {
                console.debug("Ollama error:", error);
                if (editor) {
                    let translateButton = document.querySelector("translation-entry-mybutton");
                } else {
                    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
                }

                if (translateButton) {
                    translateButton.className += " translated";
                    translateButton.innerText = "Translated";
                }

                if (error[2] == "400") {
                    errorstate = "Error 400";
                    if (editor) {
                        messageBox("error", "Error 400: Bad request to Ollama");
                    }
                } else if (error[2] == "401") {
                    errorstate = "Error 401";
                    if (editor) {
                        messageBox("error", "Error 401 Authorization failed. Please check your Ollama API key.");
                    }
                } else if (error[2] == '404') {
                    errorstate = "Error 404";
                    if (editor) {
                        messageBox("error", "Error 404: Model not found or Ollama server not reachable. Check your URL and model name.");
                    }
                } else if (error[2] == '500') {
                    errorstate = "Error 500";
                    if (editor) {
                        messageBox("error", "Error 500: Ollama server error. Check if the model is loaded.");
                    }
                } else if (error == "TypeError: Failed to fetch") {
                    messageBox("error", "Cannot connect to Ollama server. Check if Ollama is running and the URL is correct.");
                    errorstate = "Connection error";
                } else {
                    if (editor) {
                        messageBox("error", "Ollama error: " + (error[0]?.error || error));
                    }
                    if (typeof error != 'undefined') {
                        console.debug("Ollama error final:", error);
                        errorstate = error[0]?.error?.message || "NOK";
                    } else {
                        errorstate = "NOK";
                    }
                }

                return errorstate;
            }).then(err => {
                if (typeof err != "undefined") {
                    let errorstate = err;
                    return errorstate;
                } else {
                    console.debug("Ollama found err:", err);
                }
            });
    } else {
        messageBox("error", "You did not set the Ollama model!<br> Please check your options");
    }
}
