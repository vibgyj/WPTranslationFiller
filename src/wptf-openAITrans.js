/**
 * This file includes all functions for translating with the openAI API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */
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

async function AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    var timeout = 50;
    errorstate = "OK";
    
    // Preprocess original
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");
    
    // Await the translation call
    var result = await getTransAI(original, destlang, record, apikeyOpenAI, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, is_editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss);
    
    return result;
}

// FIX: added openAiGloss parameter, removed double comma in reviewTransAI call
async function AIreview(original, destlang, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview, openAiGloss) {
    var originalPreProcessed = original;
    if (apikeyOpenAI != "") {
        var result = await reviewTransAI(original, destlang, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview, openAiGloss);
    }
    else {
        errorstate = "No apikey provided!"
    }
    return errorstate;
}


async function getTransAI(
  original, language, record, apikeyOpenAI, OpenAIPrompt,
  originalPreProcessed, rowId, transtype, plural_line, formal,
  locale, convertToLower, editor, counter, OpenAISelect,
  OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss
) {
  var show_debug = false;
  var myTtranslatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
  let prevstate = current ? current.innerText : "";
    
  let destlang = language;
  language = language.toUpperCase();
  var messages;

  let tempPrompt = OpenAIPrompt + '\n';
  let myprompt = "";

  // Handle tone and language in prompt
  if (OpenAITone === 'formal') {
    if (destlang === 'nl') {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone + " and use 'u' instead of 'je'");
    } else if (destlang === 'de') {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone + " and use 'Sie' instead of 'du'");
    } else if (destlang === 'fr') {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone + " use 'vous' instead of 'tu'");
    } else {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone);
    }
  } else {
    myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone);
  }

  // Compact glossary
  const filteredGloss = pruneGlossary(openAiGloss, originalPreProcessed, record);
  const compactGloss = filteredGloss.replace(/\n+/g, "|");

  // Replace glossary and language names
  myprompt = myprompt.replaceAll("{{OpenAiGloss}}", compactGloss);

  if (destlang === 'nl') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Dutch');
  else if (destlang === 'de') myprompt = myprompt.replaceAll("{{toLanguage}}", 'German');
  else if (destlang === 'fr') myprompt = myprompt.replaceAll("{{toLanguage}}", 'French');
  else if (destlang === 'uk') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Ukrainian');
  else if (destlang === 'es') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Spanish');
  else if (destlang === 'id') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Indonesian');
  else if (destlang === 'it') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Italian');
  else if (destlang === 'pt') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Portuguese');
  else if (destlang === 'ru') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Russian');
  else myprompt = myprompt.replaceAll("{{toLanguage}}", destlang);

  if (!originalPreProcessed) {
    originalPreProcessed = "No result of {originalPreprocessed} for original it was empty!";
  }
  myprompt = myprompt.replaceAll("{{text}}", originalPreProcessed);

  let maxTokens = estimateMaxTokens(originalPreProcessed);
  max_Tokens = maxTokens;

  messages = [
    { role: 'user', content: myprompt }
  ];

  if (OpenAISelect === 'undefined' || !OpenAISelect) {
    messageBox("error", "You did not set the OpenAI model!<br> Please check your options");
    return "NOK";
  }

  const mymodel = OpenAISelect.toLowerCase();
  if (show_debug) console.debug("Model selected:", mymodel);
  let dataNew = {};

  if (mymodel === "gpt-5" || mymodel === "gpt-5-mini" || mymodel === "gpt-5-nano") {
    dataNew = {
      model: mymodel,
      messages,
      max_completion_tokens: max_Tokens,
      top_p: Number(Top_p),
      top_k: Number(Top_k),
      frequency_penalty: 0,
      presence_penalty: 0,
      reasoning_effort: 'minimal',
      verbosity: 'low',
      apiKey: apikeyOpenAI,
      prompt_cache_key: 'WPTF translation',
    };
  }
  else if (mymodel === "gpt-5.1" || mymodel === "gpt-5.1-mini" || mymodel === "gpt-5.1-nano" || mymodel === "gpt-5.4" || mymodel === "gpt-5.5") {
    dataNew = {
      model: mymodel,
      messages,
      max_completion_tokens: max_Tokens,
      top_p: Number(Top_p),
      frequency_penalty: 0,
      presence_penalty: 0,
      reasoning_effort: 'none',
      verbosity: 'low',
      apiKey: apikeyOpenAI,
      prompt_cache_key: 'WPTF translation',
    };
  }
  else if (mymodel === "gpt-5.3-chat-latest") {
    dataNew = {
      model: mymodel,
      messages,
      max_completion_tokens: max_Tokens,
      top_p: Number(Top_p),
      frequency_penalty: 0,
      presence_penalty: 0,
      reasoning_effort: 'medium',
      verbosity: 'low',
      apiKey: apikeyOpenAI,
      prompt_cache_key: 'WPTF translation',
    };
  }
  else {
    dataNew = {
      model: mymodel,
      messages,
      max_tokens: max_Tokens,
      n: 1,
      temperature: OpenAItemp,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: Number(Top_p),
      apiKey: apikeyOpenAI,
    };
  }

  try {
    const start = Date.now();
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "OpenAI", data: dataNew },
        (res) => resolve(res)
      );
    });

    if (!result) {
      console.debug("OpenAI proxy returned undefined");
      return "NOK";
    }

    if (result.error) {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] "OpenAI proxy error:" ${duration}s`, result.error);
      const match = result.error.match(/Request failed \((\d+)\)/);
      const statusCode = match ? match[1] : "unknown";
      if (statusCode == '400') {
        if (editor) messageBox("warning", `Request failed with status ${statusCode} <br>${result.error}`);
        else return `Error 400`;
      }
      else if (statusCode == '401') {
        if (editor) messageBox("warning", `Request failed with status ${statusCode}. Please check your license!`);
        else return `Error 401`;
      }
      else if (statusCode == '403') {
        if (editor) messageBox("warning", `Request failed with status ${statusCode}. Country not supported!`);
        else return `Request failed with status ${statusCode}. Country not supported!`;
      }
      if (statusCode == '404') {
        if (editor) messageBox("warning", `Request failed with status ${statusCode}. Please check your license!<br> ${result.error}`);
        else return `Error 401`;
      }
      else if (statusCode == '429') {
        if (editor) messageBox("warning", `Request failed with status ${statusCode}. Rate limit reached!`);
        else return `Request failed with status ${statusCode}. Rate limit reached!`;
      }
      else if (statusCode == '500') {
        if (editor) messageBox("warning", `Request failed with status ${statusCode}. Server issue!`);
        else return `Request failed with status ${statusCode}. Server issue!`;
      }
      else {
        return `Request failed with status ${statusCode}. Some undefined error happened!`;
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug("OpenAI proxy response (raw):", result.result, " ", duration);

    const data = result.result;
    let text = data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (text === '""' || text === "") {
      text = "No suggestions";
    }

    const start1 = Date.now();
    myTranslatedText = await postProcessTranslation(
      original, text, replaceVerb, originalPreProcessed,
      "OpenAI", convertToLower, spellCheckIgnore, locale
    );

    const duration2 = ((Date.now() - start1) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] myTranslatedText postprocessed ${duration2}s`, myTranslatedText);

    const start2 = Date.now();
    await processTransl(
      original, myTranslatedText, language, record, rowId,
      transtype, plural_line, locale, convertToLower, current
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


// FIX: added openAiGloss parameter, filters glossary and injects into review prompt
async function reviewTransAI(original, language, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview, openAiGloss) {
    var current = "";
    var prevstate = "";
    var error;
    var data;

    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    language = language.toUpperCase();

    // Filter glossary for this specific original text and inject into prompt
    const filteredGloss = pruneGlossary(openAiGloss, original, record);
    const compactGloss = filteredGloss.replace(/\n+/g, "|");

    var prompt = reviewPrompt.replace('placeholder_original', original);
    prompt = prompt.replace('placeholder_translated', translatedText);
    prompt = prompt.replace('{{OpenAiGloss}}', compactGloss);

    var message = [{ 'role': 'user', 'content': prompt }];
    let mymodel = "gpt-4.1-mini";
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
    };

    var link = "https://api.openai.com/v1/chat/completions";

    try {
        const response = await fetch(link, {
            body: JSON.stringify(data1),
            method: "POST",
            headers: {
                "content-type": "application/json",
                Authorization: "Bearer " + apikeyOpenAI,
            },
        });

        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            errorstate = "NOK";
            const statusCode = response.status;
            if (statusCode == 400) { errorstate = "Error 400"; if (editor) messageBox("error", "Error 400:" + data?.error?.message); }
            else if (statusCode == 401) { errorstate = "Error 401"; if (editor) messageBox("error", "Error 401 Authorization failed."); }
            else if (statusCode == 404) { errorstate = "Error 404"; alert("Error 404 The requested resource could not be found."); }
            else if (statusCode == 429) { errorstate = "Error 429"; if (editor) messageBox("error", "Model " + mymodel + " is overloaded."); }
            else if (statusCode == 456) { errorstate = "Error 456"; }
            else if (statusCode == 503) { errorstate = "Error 503"; messageBox("error", "The server cannot handle the request"); }
            else { errorstate = "NOK"; if (editor) messageBox("error", "Uncaught error: " + statusCode); }
            return errorstate;
        }

        errorstate = "OK";
        const open_ai_response = data.choices[0];
        if (typeof open_ai_response.message.content !== 'undefined') {
            let text = open_ai_response.message.content;
            //console.debug("Review text response:", text);

            if (text.indexOf("Yes") !== -1) {
                // Remove existing checkmark if present then add fresh one
                if (preview.innerHTML.startsWith('\u{2705}')) {
                    preview.innerHTML = preview.innerHTML.replace('\u{2705}', "");
                }
                // Remove any previous reason element if the row was re-reviewed
                const existingReason = preview.querySelector('.review-reason');
                if (existingReason) existingReason.remove();

                preview.innerHTML = '\u{2705}' + " " + preview.innerHTML;
            } else {
                // Extract reason after "No: "
                const reasonMatch = text.match(/No[,:]?\s*(.*)/i);
                const reason = reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : "No reason provided";

                if (preview.innerHTML.startsWith('\u{26A0}')) {
                    preview.innerHTML = preview.innerHTML.replace('\u{26A0}', "");
                }
                // Remove any previous reason element to avoid duplicates
                const existingReason = preview.querySelector('.review-reason');
                if (existingReason) existingReason.remove();

                preview.innerHTML = '\u{26A0}' + " " + preview.innerHTML;

                // Add reason below the translation text
                const reasonElem = document.createElement('div');
                reasonElem.className = 'review-reason';
                reasonElem.style.cssText = 'font-size: 0.75em; color: #e53e3e; margin-top: 4px; font-style: italic;';
                reasonElem.innerText = reason;
                preview.appendChild(reasonElem);
            }
        } else {
            console.debug("No text received!");
            errorstate = "NOK";
        }

        return errorstate;

    } catch (err) {
        console.error("reviewTransAI fetch failed:", err);
        errorstate = "NOK";
        return errorstate;
    }
}