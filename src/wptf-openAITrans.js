/**
 * getTransOpenAI — OpenAI / Cerebras translation, Groq method.
 *
 * Groq-method pieces (unchanged from your working version):
 *   1. prunedGlossary  — glossary pruned for THIS line.
 *   2. content         — text sent as a structured JSON payload.
 *   3. glossary per line — per-item `g` field, like Groq's [{ i, t, g }].
 *
 * This rebuild ONLY fixes ordering. The correct sequence is:
 *   build dataNew  ->  strip OpenAI-only params  ->  apply Cerebras reasoning.
 * Previously the param-strip and Cerebras block ran BEFORE dataNew existed
 * (temporal dead zone), so the reasoning setting was lost / threw. The
 * duplicated strip loop is also removed.
 */
async function getTransOpenAI(
  original, language, record, apikeyOpenAI, OpenAIPrompt,
  preverbs, rowId, transtype, plural_line, formal,
  locale, convertToLower, editor, counter, OpenAISelect,
    OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss, translator, URL,mycontext
) {
  var show_debug = false;
  var myURL = "";
  var myTtranslatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
  let prevstate = current ? current.innerText : "";
  let destlang = language;
  language = language.toUpperCase();
  var messages;
  var mymodel;
  const originalPreProcessed = await preProcessOriginal(original, preverbs, "alibaba");
   // console.debug("Original preprocessed:", originalPreProcessed);
  // Strip [[COMMENT]] lines, then fill static placeholders once.
  if (typeof stripPromptComments === "function") {
        OpenAIPrompt = stripPromptComments(OpenAIPrompt);
  }
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

  /****************************************************
   * GLOSSARY — Groq method (per line)
   ****************************************************/
  const prunedGlossary = pruneGlossary(openAiGloss, originalPreProcessed, record) || "";
  const compactGloss = prunedGlossary.replace(/\n+/g, "|");
  //  console.debug("Pruned glossary for row", rowId, ":", compactGloss);
  myprompt = myprompt.replaceAll("{{OpenAiGloss}}", compactGloss);
  //  console.debug("Prompt after glossary replacement:", myprompt);
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

  /****************************************************
   * CONTENT — Groq method
   ****************************************************/
    
    // Context: strip any [[COMMENT]] marker, include only when non-empty.
    const cleanContext = (typeof stripPromptComments === "function")
        ? stripPromptComments(String(mycontext ?? "")).trim()
        : String(mycontext ?? "").trim();

    const promptItems = [{
        i: rowId,
        t: originalPreProcessed,
        ...(cleanContext ? { c: cleanContext } : {}),
    ...(prunedGlossary ? { g: compactGloss } : {})
  }];
  const contentPayload = JSON.stringify(promptItems);

  myprompt = myprompt.replaceAll("{{text}}", contentPayload);
  //console.debug("Prompt after all replacements:", myprompt);

  let maxTokens = estimateMaxTokens(originalPreProcessed);
  max_Tokens = maxTokens;

  messages = [
    { role: 'user', content: myprompt }
  ];

  if (OpenAISelect === 'undefined' || !OpenAISelect) {
    messageBox("error", "You did not set the OpenAI model!<br> Please check your options");
    return "NOK";
  }

  mymodel = OpenAISelect.toLowerCase();
  
  // Endpoint selection
    if (translator == 'cerebras') {
        myURL = URL;
    }
    else if (translator == 'alibaba') {
        myURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
       // myURL = 'https://ws-jfu0174yr92bwsnt.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
        
      }
    else if (translator == 'OpenAI') {
        myURL = 'https://api.openai.com/v1/chat/completions';
    }
    
   // console.debug("Cerebras key:",apikeyOpenAI)
    const auth = { apiKey: apikeyOpenAI, URL: myURL };
    let dataNew = buildRequestParams(mymodel, translator, messages, max_Tokens, auth, { OpenAItemp });

 

   // console.debug("[Cerebras] mymodel:", JSON.stringify(mymodel),
   //               "effort:", effort ?? "(none/gemma)",
    //    "keys:", Object.keys(dataNew));
  
    //console.debug("Prompt after all replacements:", myprompt);
  try {
    // Only proceed for supported translators; action string matches the proxy
    const supported = ['OpenAI', 'cerebras', 'alibaba'];
    if (!supported.includes(translator)) {
      console.error("Unknown translator:", translator);
      return "NOK";
    }

    const start = Date.now();

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: translator, data: dataNew },
        (res) => {
          if (chrome.runtime.lastError) {
            // Channel died: listener missing/threw, or closed before sendResponse
            resolve({
              error: {
                status: 0,
                message: chrome.runtime.lastError.message,
                type: "channel_error"
              }
            });
            return;
          }
          resolve(res);
        }
        );
    });
    //  console.debug("foreground response:", response);
    // No envelope at all
    if (!response) {
      console.error(`${translator} proxy returned no response`);
      return "NOK";
    }

    // ---- Error path ----
    if (response.error) {
      const duration = ((Date.now() - start) / 1000).toFixed(2);

      // Normalize: error can be the new structured object OR the old string
      let statusCode, errorMessage;
      if (typeof response.error === 'object') {
        statusCode = String(response.error.status ?? "unknown");
        errorMessage = response.error.message ?? JSON.stringify(response.error);
      } else {
        const errorStr = String(response.error);
        const match = errorStr.match(/Request failed \((\d+)\)/);
        statusCode = match ? match[1] : "unknown";
        errorMessage = errorStr;
        const jsonMatch = errorStr.match(/Request failed \(\d+\): (\{[\s\S]*\})/);
        if (jsonMatch) {
          try { errorMessage = JSON.parse(jsonMatch[1])?.error?.message ?? errorStr; }
          catch (_) { }
        }
      }

      if (toBoolean(DebugMode)) {
        console.debug(`[${new Date().toISOString()}] ${translator} proxy error (${duration}s): status=${statusCode}`, response.error);
      }

      // Every branch returns — no fall-through into the success parser
      const messages = {
        '400': `Request failed with status ${statusCode}<br>${errorMessage}`,
        '401': `Request failed with status ${statusCode}. Please check your license!`,
        '403': `Request failed with status ${statusCode}. Country not supported!`,
        '404': `Request failed with status ${statusCode}. Please check your license!<br>${errorMessage}`,
        '429': `Request failed with status ${statusCode}. Rate limit reached!`,
        '500': `Request failed with status ${statusCode}. Server issue!`,
      };
      const msg = messages[statusCode] ?? `Request failed with status ${statusCode}.<br>${errorMessage}`;

      if (editor) {
        messageBox("warning", msg);
      }
      // Return a plain-text version regardless of editor mode
      return `Error ${statusCode}`;
    }

    // ---- Success path ----
    if (!response.result) {
      console.error(`${translator} proxy returned no result:`, response);
      return "NOK";
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`${translator} proxy response (raw):`, response.result, duration);

    const data = response.result;
    let raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
    //console.debug("raw translation content:", raw);

    // Groq method: the model replies with {"results":[{"i":"<rowId>","tr":"..."}]}.
    // Pull out the translation for THIS row. Fall back to plain text if the
    // model ignored the JSON format.
    let text = "";
    try {
      const parsed = JSON.parse(raw);
      const results = Array.isArray(parsed?.results) ? parsed.results
                    : Array.isArray(parsed) ? parsed
                    : [];
      const match = results.find(r => String(r?.i) === String(rowId)) ?? results[0];
      text = String(match?.tr ?? match?.t ?? "").trim();
    } catch (_) {
      text = raw;
    }
    if (text === '""' || text === "") text = "No suggestions";

    const start1 = Date.now();
    myTranslatedText = await postProcessTranslation(
      original, text, replaceVerb, originalPreProcessed,
      translator, convertToLower, spellCheckIgnore, locale
    );
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] postprocessed ${((Date.now() - start1) / 1000).toFixed(2)}s`, myTranslatedText);

    const start2 = Date.now();
    await processTransl(
      original, myTranslatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current
    );
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] after processTransl ${((Date.now() - start2) / 1000).toFixed(2)}s`);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] All processed in ${((Date.now() - start) / 1000).toFixed(2)} sec`);

    return "OK";

  } catch (err) {
    console.error(`${translator} translation failed:`, err);
    return null;
  }
}