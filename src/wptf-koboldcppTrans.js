/**
 * This file includes all functions for translating with the KoboldCPP API and uses a promise
 * It depends on commonTranslate for additional translation functions
 * KoboldCPP exposes an OpenAI-compatible endpoint at http://localhost:5001/v1
 * No API key needed — runs locally.
 */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function KoboldAITranslate(original, destlang, record, koboldUrl, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    errorstate = "OK";
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "KoboldCPP");

    var result = await getTransKobold(original, destlang, record, koboldUrl, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss);
    return result;
}

async function KoboldAIReview(original, destlang, record, koboldUrl, OpenAIPrompt, reviewPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview, openAiGloss, model) {
    var originalPreProcessed = original;
    if (koboldUrl != "") {
        var result = await reviewTransKobold(original, destlang, record, koboldUrl, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview, openAiGloss, model);
    } else {
        errorstate = "No KoboldCPP URL provided!";
    }
    return errorstate;
}


async function getTransKobold(
  original, language, record, koboldUrl, OpenAIPrompt,
  originalPreProcessed, rowId, transtype, plural_line, formal,
  locale, convertToLower, editor, counter, OpenAISelect,
  OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss
) {
  var myTranslatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
  let prevstate = current ? current.innerText : "";
  
  let destlang = language;
  language = language.toUpperCase();

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

  myprompt = myprompt.replaceAll("{{OpenAiGloss}}", compactGloss ?? "");

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
  //console.debug("myprompt:",myprompt)
  let maxTokens = estimateMaxTokens(originalPreProcessed);
  max_Tokens = maxTokens;

  messages = [
    { role: 'system', content: myprompt },
    { role: 'user', content: originalPreProcessed },
    { role: 'assistant', content: "" }
    ];


  // KoboldCPP: simple OpenAI-compatible payload — no API key, no model variants
  const dataNew = {
    model: "koboldcpp",
    messages,
    max_tokens: max_Tokens,
    temperature: Number(OpenAItemp),
    frequency_penalty: 0,
    presence_penalty: 0,
    repeat_penalty: 1.1,
    top_k: Number(Top_k),
    think: false,
    baseUrl: koboldUrl || "http://localhost:5001",
  };

  try {
    const start = Date.now();
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "koboldCpp", data: dataNew },
        (res) => resolve(res)
      );
    });

    if (!result) {
      console.debug("KoboldCPP proxy returned undefined");
      return "NOK";
    }

    if (result.error) {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] KoboldCPP error: ${duration}s`, result.error);

      const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      const match = errorStr.match(/Request failed \((\d+)\)/);
      let statusCode = match ? match[1] : "unknown";

      let errorMessage = errorStr;
      try {
        const jsonMatch = errorStr.match(/Request failed \(\d+\): (\{[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          errorMessage = parsed?.error?.message ?? errorStr;
        }
      } catch (_) {}

      if (statusCode === '400') {
        if (editor) messageBox("warning", `KoboldCPP request failed (400)<br>${errorMessage}`);
        return `Error 400`;
      } else if (statusCode === '429') {
        if (editor) messageBox("warning", `KoboldCPP rate limit reached (429)`);
        return `Request failed with status 429. Rate limit reached!`;
      } else if (statusCode === '500') {
        if (editor) messageBox("warning", `KoboldCPP server error (500)`);
        return `Request failed with status 500. Server issue!`;
      } else {
          if (editor) messageBox("warning", `KoboldCPP request failed (${statusCode})<br>${errorMessage}`);
          errorstate = "NOK";
        return `Request failed with status ${statusCode}. ${errorMessage}`;
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug("KoboldCPP response:", result.result, duration + "s");

    const data = result.result;
    let text = result.result;

    if (text === '""' || text === "") {
      text = "No suggestions";
    }

    const start1 = Date.now();
    myTranslatedText = await postProcessTranslation(
      original, text, replaceVerb, originalPreProcessed,
      "KoboldCPP", convertToLower, spellCheckIgnore, locale
    );

    const duration2 = ((Date.now() - start1) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] postprocessed ${duration2}s`, myTranslatedText);

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
    console.error("Fetch KoboldCPP failed:", err);
    return null;
  }
}


async function reviewTransKobold(original, language, record, koboldUrl, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview, openAiGloss, model) {
    var current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    var prevstate = current.innerText;
    language = language.toUpperCase();

    const filteredGloss = pruneGlossary(openAiGloss, original, record);
    const compactGloss = filteredGloss.replace(/\n+/g, "|");

    var prompt = reviewPrompt.replace('{{placeholder_original}}', original);
    prompt = prompt.replace('{{placeholder_translated}}', translatedText);
    prompt = prompt.replace('{{OpenAiGloss}}', compactGloss);

    let maxTokens = estimateMaxTokens(originalPreProcessed);
    max_Tokens = maxTokens;

    var messages = [{ 'role': 'user', 'content': prompt }];

    const baseUrl = koboldUrl || "http://localhost:5001";

    // KoboldCPP: direct fetch, no API key needed
    const data1 = {
      model: model || "koboldcpp",
      messages,
      max_tokens: max_Tokens,
      temperature: 0,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: Number(Top_p),
      think: false,           // ← disables thinking mode
    };

    try {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data1),
        });

        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            errorstate = "NOK";
            const statusCode = response.status;
            if (statusCode == 400) { errorstate = "Error 400"; if (editor) messageBox("error", "KoboldCPP Error 400: " + data?.error?.message); }
            else if (statusCode == 429) { errorstate = "Error 429"; if (editor) messageBox("error", "KoboldCPP is overloaded."); }
            else if (statusCode == 500) { errorstate = "Error 500"; if (editor) messageBox("error", "KoboldCPP server error."); }
            else { errorstate = "NOK"; if (editor) messageBox("error", "KoboldCPP uncaught error: " + statusCode); }
            return errorstate;
        }

        errorstate = "OK";
        const open_kobold_response = data.choices[0];
        if (typeof open_kobold_response.message.content !== 'undefined') {
            let text = result.result;

            if (text != "" && text.indexOf("Yes") !== -1) {
                if (preview.innerHTML.startsWith('\u{2705}')) {
                    preview.innerHTML = preview.innerHTML.replace('\u{2705}', "");
                }
                const existingReason = preview.querySelector('.review-reason');
                if (existingReason) existingReason.remove();
                preview.innerHTML = '\u{2705}' + " " + preview.innerHTML;
            } else {
                const reasonMatch = text.match(/No[,:]?\s*(.*)/i);
                const reason = reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : "No reason provided";

                if (preview.innerHTML.startsWith('\u{26A0}')) {
                    preview.innerHTML = preview.innerHTML.replace('\u{26A0}', "");
                }
                const existingReason = preview.querySelector('.review-reason');
                if (existingReason) existingReason.remove();

                preview.innerHTML = '\u{26A0}' + " " + preview.innerHTML;

                const reasonElem = document.createElement('div');
                reasonElem.className = 'review-reason';
                reasonElem.style.cssText = 'font-size: 0.75em; color: #e53e3e; margin-top: 4px; font-style: italic;';
                reasonElem.innerText = reason;
                preview.appendChild(reasonElem);
            }
        } else {
            console.debug("No text received from KoboldCPP!");
            errorstate = "NOK";
        }

        return errorstate;

    } catch (err) {
        console.error("reviewTransKobold fetch failed:", err);
        errorstate = "NOK";
        return errorstate;
    }
}