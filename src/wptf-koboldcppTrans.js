/**
 * KoboldCPP single-line translation, rewritten to use the SAME batch
 * JSON prompt/format as translatePageKobold, so you maintain ONE prompt.
 *
 * How it works:
 *   - Builds a JSON array of items exactly like the batch path:
 *       [{"i": rowId, "t": text, "g": prunedGlossary}, {dummy}]
 *   - Sends it with the batch prompt (i/t/g -> results/i/tr).
 *   - A neutral dummy item is added so the model stays in "batch mode",
 *     where it follows the glossary more reliably than for a lone item
 *     (behaviour you confirmed earlier with Groq).
 *   - Parses the JSON response with parseKobold and pulls out the item
 *     whose i matches rowId.
 *
 * Depends on (from koboldcpp-batch-translate.js):
 *   parseKobold, enforceGlossaryKobold, normalizeIdKobold
 * If the batch file is not loaded alongside this one, tell me and I'll
 * inline those helpers here.
 */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function KoboldAITranslate(original, destlang, record, koboldUrl, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss, mycontext) {
    errorstate = "OK";
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "KoboldCPP");

    var result = await getTransKobold(original, destlang, record, koboldUrl, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss, mycontext);
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
  OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss, mycontext
) {
  var myTranslatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
  let prevstate = current ? current.innerText : "";

  let destlang = language;
  language = language.toUpperCase();

  // ---- Tone handling (unchanged from your version) ----
  let toneForPrompt = OpenAITone;
  if (OpenAITone === 'formal') {
    if (destlang === 'nl')      toneForPrompt = OpenAITone + " and use 'u' instead of 'je'";
    else if (destlang === 'de') toneForPrompt = OpenAITone + " and use 'Sie' instead of 'du'";
    else if (destlang === 'fr') toneForPrompt = OpenAITone + " use 'vous' instead of 'tu'";
  }

  // ---- Language resolution (unchanged) ----
  const LANG_MAP = {
    nl: 'Dutch', de: 'German', fr: 'French', uk: 'Ukrainian',
    es: 'Spanish', id: 'Indonesian', it: 'Italian',
    pt: 'Portuguese', ru: 'Russian'
  };
  const toLanguage = LANG_MAP[destlang] ?? destlang;

  if (!originalPreProcessed) {
    originalPreProcessed = "No result of {originalPreprocessed} for original it was empty!";
  }

  // ---- Per-item glossary (same pruning as before) ----
  const filteredGloss = pruneGlossary(openAiGloss, originalPreProcessed, record);
  const compactGloss  = (filteredGloss || "").replace(/\n+/g, "|");

  // ---- Build the batch-style prompt with static placeholders ----
  // Strip [[COMMENT]] note lines first (stripPromptComments comes from
  // koboldcpp-batch-translate.js; both files are loaded together).
  if (typeof stripPromptComments === "function") {
    OpenAIPrompt = stripPromptComments(OpenAIPrompt);
  }
  // Fill {{toLanguage}} / {{tone}} / {{OpenAiGloss}} the same way the
  // batch path does. {{text}} is filled with the JSON items array.
  let basePrompt = (OpenAIPrompt + '\n')
    .replaceAll("{{toLanguage}}", toLanguage)
    .replaceAll("{{tone}}", toneForPrompt)
    .replaceAll("{{OpenAiGloss}}", compactGloss ?? "");

  // ---- JSON items: the real line + a neutral dummy ----
  // The dummy keeps the model in "batch mode" so it applies the
  // glossary as mechanically as it does for multi-item batches.
  const realItem = { i: String(rowId), t: originalPreProcessed };
  if (compactGloss) realItem.g = compactGloss;
  // Optional context (from the "context bubble" field). Only sent when
  // present. It is a hint to disambiguate the translation — the prompt
  // instructs the model to use it but never translate or echo it.
  if (mycontext && String(mycontext).trim()) {
    realItem.c = String(mycontext).trim();
  }
  const dummyItem = { i: "0", t: "OK" };
  const itemsJson = JSON.stringify([realItem, dummyItem]);

  let myprompt = basePrompt.replaceAll("{{text}}", itemsJson);

  let maxTokens    = estimateMaxTokens(originalPreProcessed);
  let prompt_tokens = estimateMaxTokens(myprompt);
  max_Tokens = maxTokens + prompt_tokens + 100; // small margin for JSON overhead

  messages = [{ role: "user", content: myprompt }];

  const dataNew = {
    model: "koboldcpp",
    messages,
    max_tokens: max_Tokens,
    temperature: Number(OpenAItemp),
    frequency_penalty: 0,
    presence_penalty: 0,
    repeat_penalty: 1.1,
    top_k: Number(Top_k),
    chat_template_kwargs: {
      enable_thinking: false
    },
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

    // ---- Error handling (unchanged) ----
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
    if (toBoolean(DebugMode)) console.debug("KoboldCPP raw response:", result.result, duration + "s");

    // ---- Parse the JSON batch response and pull out our row ----
    let text = "";
    const parsed = parseKobold(result); // from koboldcpp-batch-translate.js
    if (parsed) {
      const match = parsed.find(r => normalizeIdKobold(r.i ?? "") === normalizeIdKobold(rowId));
      if (match) {
        text = enforceGlossaryKobold(match.tr, compactGloss);
      } else {
        console.warn("[Kobold] single-line: no JSON item matched rowId=" + rowId +
          " | returned ids: " + parsed.map(r => r.i).join(", "));
      }
    } else {
      console.warn("[Kobold] single-line: response was not valid JSON — falling back to raw text");
      // Fallback: if the model ignored JSON and returned bare text,
      // use it as-is so the user still gets something.
      if (typeof result.result === "string") text = result.result.trim();
    }

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


// reviewTransKobold left unchanged from your version — it uses a
// separate review prompt, not the translation prompt, so it does not
// need the batch/JSON treatment.
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

    const data1 = {
      model: model || "koboldcpp",
      messages,
      max_tokens: max_Tokens,
      temperature: 0,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: Number(Top_p),
      chat_template_kwargs: { enable_thinking: false },
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
            let text = open_kobold_response.message.content;   // FIX: was result.result (undefined here)

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