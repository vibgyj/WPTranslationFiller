/**
 * This file includes all functions for translating with the openRouter API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

// ─── Token-budget config ─────────────────────────────────────────────
// Hard output-token ceilings per model. These are PLACEHOLDERS — replace with
// the real values from each model's OpenRouter page or the /api/v1/models endpoint.
const MODEL_MAX_OUTPUT = {
    "deepseek/deepseek-v4-pro": 8192,
    "deepseek/deepseek-v4-flash": 8192,
    "openai/gpt-5.5": 16384,
    "openai/gpt-5.6-luna": 16384,
    "openai/gpt-chat-latest": 16384,
    "qwen/qwen3.6-flash": 8192,
    "qwen/qwen3.7-plus": 8192,
};
const DEFAULT_MAX_OUTPUT = 4096; // conservative fallback for unlisted models

// Token headroom to reserve for reasoning at each effort level. On OpenAI-style
// APIs the output cap also counts reasoning tokens, so this is added on top.
const REASONING_HEADROOM = { none: 0, minimal: 256, low: 1024, medium: 4096, high: 8192 };

// ─── Per-model request tuning ────────────────────────────────────────
// Declared at module scope so every function below can read them and they are
// always initialized before use (avoids the temporal-dead-zone ReferenceError).
// Keys must be the EXACT OpenRouter IDs you send (and that show up in your log).
//
// NOTE on reasoning:
//   - OpenAI gpt-5.x understand effort tiers → use { effort: "minimal" }.
//   - DeepSeek / Qwen treat effort as "reasoning ON", which is SLOWER. They had
//     reasoning on by default, so we explicitly disable it: { enabled: false }.
//   - If a model ever starts returning HTTP 400 on { enabled: false } it has
//     MANDATORY reasoning — change that one entry to {} to omit the param instead.
const modelConfig = {
    // Non-OpenAI: reasoning off (was on by default; large latency win).
    "deepseek/deepseek-v4-pro":   { reasoning: { enabled: false } },
    "deepseek/deepseek-v4-flash": { reasoning: { enabled: false } },
    "qwen/qwen3.6-flash":         { reasoning: { enabled: false } },
    "qwen/qwen3.7-plus":          { reasoning: { enabled: false } },

    // OpenAI: effort tiers work as intended.
    "openai/gpt-5.5":             { reasoning: { effort: "minimal" }, verbosity: "low" },
    "openai/gpt-5.6-luna":        { reasoning: { effort: "minimal" }, verbosity: "low" },
    "openai/gpt-chat-latest":     {},   // non-reasoning: send nothing extra
};

// Fallback models per primary. Keys must be the EXACT prefixed OpenRouter IDs.
const fallbackMap = {
    "openai/gpt-5.5":    ["openai/gpt-chat-latest"],
    "qwen/qwen3.7-plus": ["qwen/qwen3.6-flash"],
};

/**
 * Compute a safe max output-token budget for a translation request.
 *
 * @param {number} promptTokens        Estimated input tokens.
 * @param {string} model               Full prefixed id, e.g. "qwen/qwen3.7-plus".
 * @param {object} [opts]
 * @param {number} [opts.expansion=1.8] Output/input length ratio. Bump up if you
 *                                      see truncation (German, Finnish, from CJK…).
 * @param {number} [opts.floor=256]     Never cap below this.
 * @param {string} [opts.effort="none"] Reasoning effort you're sending for this model.
 * @returns {number} max output tokens to send.
 */
function computeMaxTokens(promptTokens, model, opts = {}) {
    const { expansion = 1.8, floor = 256, effort = "none" } = opts;

    const outputEstimate = Math.max(Math.ceil(promptTokens * expansion), floor);
    const budget = outputEstimate + (REASONING_HEADROOM[effort] ?? 0);
    const ceiling = MODEL_MAX_OUTPUT[model] ?? DEFAULT_MAX_OUTPUT;

    return Math.min(budget, ceiling);
}
// ─────────────────────────────────────────────────────────────────────

// Call this at the start of your translation batch loop
function startTranslationBatch() {
  localStorage.setItem('openai_prompt_sent', 'false');
}

// Call this at the end of your translation batch loop or when needed
function endTranslationBatch() {
  localStorage.removeItem('openai_prompt_sent');
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function openRouterTranslate(original, destlang, record, apikeyOpenRouter, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenRouterSelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    var timeout = 50;
    errorstate = "OK";
    //console.debug("Starting openRouterTranslate for rowId:", rowId, "original:", original)
    // Preprocess original
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");
    
    // Wait the timeout delay if needed
    // await delay(timeout);
    const start = performance.now();
    // Await the translation call
    var result = await getopenRouter(original, destlang, record, apikeyOpenRouter, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, is_editor, counter, OpenRouterSelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss);
    //const duration = performance.now() - start;
    const durationSeconds = (performance.now() - start) / 1000;
    console.log(`model:` + OpenRouterSelect+ ` took ${durationSeconds.toFixed(3)}s`);
    // You can handle errorstate or result here if needed
    return result;
}

async function getopenRouter(
  original, language, record, apikeyOpenRouter, OpenAIPrompt,
  originalPreProcessed, rowId, transtype, plural_line, formal,
  locale, convertToLower, editor, counter,OpenRouterSelect,
  OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss
) {
  var show_debug = false
  var myTtranslatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    let prevstate = current ? current.innerText : "";
    
  let destlang = language;
    language = language.toUpperCase();
    var messages;

  // Strip [[COMMENT]] lines, then fill static placeholders once.
  if (typeof stripPromptComments === "function") {
        OpenAIPrompt = stripPromptComments(OpenAIPrompt);
  }

  let tempPrompt = OpenAIPrompt + '\n'
    let myprompt = "";

  // Handle tone and language in prompt
  let basePrompt = tempPrompt;

if (OpenAITone === 'formal') {
  if (destlang === 'nl') {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone + " and use 'u' instead of 'je'");
  } else if (destlang === 'de') {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone + " and use 'Sie' instead of 'du'");
  } else if (destlang === 'fr') {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone + " use 'vous' instead of 'tu'");
  } else {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone);
  }
} else {
  basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone);
}

basePrompt = basePrompt.replaceAll("{{toLanguage}}",
  destlang === 'nl' ? 'Dutch' :
  destlang === 'de' ? 'German' :
  destlang === 'fr' ? 'French' :
  destlang === 'uk' ? 'Ukrainian' :
  destlang === 'es' ? 'Spanish' :
  destlang === 'id' ? 'Indonesian' :
  destlang === 'it' ? 'Italian' :
  destlang === 'pt' ? 'Portuguese' :
  destlang === 'ru' ? 'Russian' :
  destlang
);

    // compact glossary (IMPORTANT IMPROVEMENT)
    //console.debug("Original glossary:", openAiGloss)
    const filteredGloss = pruneGlossary(openAiGloss, originalPreProcessed,record);
    //console.debug("Filtered glossary (line breaks):", filteredGloss)
const compactGloss = filteredGloss.replace(/\n+/g, "|");
// console.debug("Filtered glossary:", compactGloss)
const content = 
`INSTRUCTIONS:
${basePrompt}
GLOSSARY:
${compactGloss}
SOURCE_TEXT:
${originalPreProcessed}
RULE:
Return only translation.`;

messages = [
  {
    role: "user",
    content
  }
];

  if (OpenRouterSelect === 'undefined' || !OpenRouterSelect) {
    messageBox("error", "You did not set the OpenRouter model!<br> Please check your options");
        return "NOK";
    }

    const mymodel = OpenRouterSelect.toLowerCase();

    if (toBoolean(DebugMode)) console.debug("Model selected:", mymodel);
    const prompt_tokens = await estimateMaxTokens(content);
    const effort = modelConfig[mymodel]?.reasoning?.effort ?? "none";
    const max_Tokens = computeMaxTokens(prompt_tokens, mymodel, { effort });

    const base = {
        model: mymodel,
        messages,
        max_tokens: max_Tokens,   // OpenRouter normalized field — applies across all providers
        top_p: Number(Top_p),
        temperature: OpenAItemp,
        frequency_penalty: 0,
        presence_penalty: 0,
        apiKey: apikeyOpenRouter,
        prompt_cache_key: "WPTF translation",
    };

    let dataNew = { ...base, ...(modelConfig[mymodel] ?? {}) };

    const fallbacks = fallbackMap[mymodel];
    if (fallbacks) dataNew.models = [mymodel, ...fallbacks];
  
    try {
        const start = Date.now()
        //console.debug("We start call at :",start)
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "openRouter", data: { ...dataNew } },  // ✅ clone meesturen

              (res) => {
                  console.debug("openRouter chrome message response:", res);
                  //console.debug("openRouter model used:", res.modelUsed);
                  resolve(res);
              }
            );
        });
       let duration = ((Date.now() - start) / 1000).toFixed(2);
       if (toBoolean(DebugMode)) console.debug("openRouter proxy response (raw):", result.result," ",duration);
       if (!result) {
        console.debug("openRouter proxy returned undefined");
        return "NOK";
    }

       if (result.error) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
           if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] "openRouter proxy error:" ${duration}s`, result.error);
            // Example of result.error: "Request failed (401): <some text>"
           const match = result.error.match(/Request failed \((\d+)\)/);
           const statusCode = match ? match[1] : "unknown";
           //console.debug("Editor:",editor)
           if (statusCode == '400') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode} <br>${result.error}`
                   );
               }
               else {
                   return `Error 400`;
               }
           }
           else if (statusCode == '401') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Please check your license!`
                   );
               }
               else {
                   return `Error 401`;
               }
           }
           else if (statusCode == '403') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Country not supported!`
                   );
               }
               else {
                   return `Request failed with status ${statusCode}. Country not supported!`;
               }
           }
            if (statusCode == '404') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Please check your license!<br> ${result.error}`
                   );
               }
               else {
                   return `Error 401`;
               }
           }
           else if (statusCode == '429') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Rate limit reached!`
                   );
               }
               else {
                   return `Request failed with status ${statusCode}. Rate limit reached!`;
               }
           }
           else if (statusCode == '500') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Server issue!`
                   );
               }
               else {
                   return `Request failed with status ${statusCode}. Server issue!`;
               }
           }
           else {
               return `Request failed with status ${statusCode}. Some undefined error happened!`;
           }
    }
    duration = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug("openRouter proxy response (raw):", result.result," ",duration);

   //const data = result.result; // raw proxy response
       let text = result.result || "";
        
   if (text === '""' || text === "") {
       text = "No suggestions";
   }

    // Post-processing after successful result
    const start1 = Date.now()
    //console.debug("text received:",text)
    myTranslatedText = await postProcessTranslation(
        original,
        text,
        replaceVerb,
        originalPreProcessed,
        "openRouter",
        convertToLower,
        spellCheckIgnore,
        locale
        );
        
    const duration2 = ((Date.now() - start1) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] myTranslatedText postprocessed ${duration2}s`, myTranslatedText);

    //if (show_debug) console.debug(`[${new Date().toISOString()}] text processed by postProcessTranslation`);
    const start2 = Date.now()
    await processTransl(
        original,
        myTranslatedText,
        language,
        record,
        rowId,
        transtype,
        plural_line,
        locale,
        convertToLower,
        current
    );

     const duration3 = ((Date.now() - start2) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] after processTransl ${duration3}s`);
    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] All processed in ${durationSec} sec`);

    return "OK";

    } catch (err) {
        console.error("Fetch OpenAI failed:", err);
        return null;
    }
}



async function reviewopenRouter(original, language, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor,translatedText,preview) {
    var row = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var responseObj = "";
    var textareaElem = "";
    var select = "";
    var textareaElem1 = "";
    var previewElem = "";
    //var preview = "";
    var status = "";
    var error;
    var data;
    var link;
    var timeout = 1000;
    //console.debug("origpre:", originalPreProcessed)
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    language = language.toUpperCase();
    //console.debug("Review prompt:", reviewPrompt)
    var prompt = reviewPrompt.replace('placeholder_original', original)
    prompt = prompt.replace('placeholder_translated',translatedText)
    originalPreProcessed = "'" + originalPreProcessed + "'" + "|\n"
    var message = [{ 'role': 'user', 'content': prompt }];
    let mymodel = "gpt-3.5-turbo"
    var data1 = {
        messages: message,
        model: mymodel,
        max_tokens: 1000,
        n: 1,
        temperature: 0,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 0,
        stop: '|\n',
    }

    var newdata = {
        "model": "text-davinci-edit-001",
        "input": originalPreProcessed,
        "instruction": prompt,
        "temperature": 0,
        "top_p": 1
    }
    var data = {
        "model": "text-davinci-003",
        "prompt": "Translate into Dutch\n\n${originalPreProcessed}",
        "temperature": 0,
        "top_p": 1
    }

    
    var link = "https://api.openrouter.ai/v1/chat/completions";
    

    //console.debug("link:",link)
    const response = fetch(link, {
        body: JSON.stringify(data1),
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: "Bearer " + apikeyOpenAI,
        },
    })
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("Response:", data);
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status
                //console.debug("data:", data, response.status)
                if (typeof data != "undefined") {
                    errorstate = "NOK"
                    error = [data, error, response.status, errorstate];
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    errorstate = "NOK"
                    error = [data, message, response.status, errorstate];
                }
                return Promise.reject(error);
            }
            else {
                errorstate = "OK";
                //We do have a result so process it
                //console.debug('result:', data);
                open_ai_response = data.choices[0];
                if (typeof open_ai_response.message.content != 'undefined') {
                    let text = open_ai_response.message.content;
                    //console.debug("text:", text,original,translatedText);
                    if (text.indexOf("Yes") != -1) {
                        // We need to remove the existing checkmark if present
                        if (preview.innerHTML.startsWith('\u{2705}')){
                            preview.innerHTML = preview.innerHTML.replace('\u{2705}',"")
                        }
                        preview.innerHTML = '\u{2705}' + " " + preview.innerHTML
                        
                    }
                    else {
                        if (preview.innerHTML.startsWith('\u{26A0}}')) {
                            preview.innerHTML = preview.innerHTML.replace('\u{26A0}', "")
                        }
                        preview.innerHTML = '\u{26A0}' + " "+ preview.innerHTML
                    }
                    return Promise.resolve(errorstate)
                }
                else {
                    text = "No text received"
                    console.debug("No text received!")
                    errorstate = "NOK";
                }
                return Promise.resolve(errorstate)
            }
        })
        .catch(error => {
            //console.debug("error:",error)
            if (error[2] == "400") {
                errorstate = "Error 400";
                if (editor) {
                    messageBox("error", "Error 400:" + error[0].error.message)
                }
            }
            else if (error[2] == "401") {
                errorstate = "Error 401";
                if (editor) {
                    messageBox("error", "Error 401 Authorization failed.Please supply a valid auth_key parameter.")
                }
            }
            else if (error[2] == '404') {
                alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error[2] == '429') {
                if (editor) {
                    messageBox("error", "The model: " + mymodel + " is currently overloaded with other requests")
                }
                errorstate = "Error 429" + error[0].error.message;
            }
            else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456";
            }
            else if (error[2] == '503') {
                messageBox("error", "The server cannot handle the request")
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 503";
            }
            else {
                if (editor) {
                    messageBox("error", "Some uncatched error has been found." + error[0])
                }
                if (error != "undefined") {
                    if (error[0] != 'undefined') {
                        errorstate = error[0].error.message

                    }
                    else {
                        console.debug("error[0] is undefined! ", error)
                        errorstate = "NOK";
                    }
                }
                else {
                    errorstate = "OK";
                }
            }

            // console.debug("return of errorstate:", errorstate)
            return errorstate;
        }).then(err => {
            //console.debug("in then:", err);
            if (typeof err != "undefined") {
                let errorstate = err; return errorstate
            }
            else {
                console.debug("found err:", err)
            }

        })

}