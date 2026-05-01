/**
 * This file includes all functions for translating with the Ollama API
 * It depends on commonTranslate for additional translation functions
 * Ollama provides a local LLM API compatible with OpenAI's chat format
 * Uses the AI Glossary database for rich translation context
 */

async function translateWithOllama(original, destlang, record, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss, apikeyOllama, LocalOllama, ollamaModel, ollamaPrompt) {
    var myTranslatedText = "";
    /****************************************************
 * LOCALE → LANGUAGE NAME
 ****************************************************/
const LOCALE_TO_LANGUAGE = {
    af: "Afrikaans",   ar: "Arabic",      bg: "Bulgarian",
    bn: "Bengali",     cs: "Czech",        da: "Danish",
    de: "German",      el: "Greek",        es: "Spanish",
    et: "Estonian",    fa: "Persian",      fi: "Finnish",
    fr: "French",      he: "Hebrew",       hi: "Hindi",
    hr: "Croatian",    hu: "Hungarian",    hy: "Armenian",
    id: "Indonesian",  it: "Italian",      ja: "Japanese",
    ka: "Georgian",    ko: "Korean",       lt: "Lithuanian",
    lv: "Latvian",     mk: "Macedonian",   ms: "Malay",
    nl: "Dutch",       no: "Norwegian",    pl: "Polish",
    pt: "Portuguese",  ro: "Romanian",     ru: "Russian",
    sk: "Slovak",      sl: "Slovenian",    sq: "Albanian",
    sr: "Serbian",     sv: "Swedish",      th: "Thai",
    tr: "Turkish",     uk: "Ukrainian",    ur: "Urdu",
    vi: "Vietnamese",  zh: "Chinese"
};
    // Ensure ollamaModel has a valid value, fallback to default
    let mymodel = (typeof ollamaModel === "string" && ollamaModel.trim()) ? ollamaModel : "gemma3:27b";
    // Replace glossary and language names
    
    //console.debug("Converted Glossary for Ollama:", convertedGlossary);
    //let newConverted = convertGlossaryToQuoted(convertedGlossary)
    let originalPreProcessed = await preProcessOriginal(original, preverbs, "Ollama");
   
    if (toBoolean(DebugMode)) console.debug("Ollama Pre-processed Original:", originalPreProcessed);
    // compact glossary (IMPORTANT IMPROVEMENT)
    //console.debug("Original glossary:", openAiGloss)
    const filteredGloss = pruneGlossary(
       openAiGloss,
       originalPreProcessed,
       record
     );
   // console.debug("Filtered glossary (line breaks):", filteredGloss)
    const compactGloss = filteredGloss.replace(/\n+/g, "|");
    //console.debug("Filtered glossary:", compactGloss)
    let convertedGlossary = await convertGlossaryForOllamaMerged(compactGloss)
    //originalPreProcessed = await applyGlossaryMap(originalPreProcessed, convertedGlossary)
  // Replace glossary and language names
    let myprompt = await ollamaPrompt.replaceAll("{{OpenAiGloss}}", convertedGlossary);
    myprompt =  await myprompt.replaceAll("{{TEXT}}", originalPreProcessed);
    //myprompt = ollamaPrompt
    myprompt = await myprompt.replaceAll("{{tone}}", OpenAITone);
    
     const resolvedLanguage = LOCALE_TO_LANGUAGE[destlang] ?? destlang;

     myprompt = await myprompt.replaceAll("{{toLanguage}}", resolvedLanguage);

    //console.debug("Ollama Prompt after replacements:", myprompt);
    if (toBoolean(is_editor)) {
        showTranslationSpinner(__("Fetching translation…"));
    }
     
    
    //console.debug("originalPreProcessed:", originalPreProcessed)
    let max_Tokens = await estimateMaxTokens(originalPreProcessed);
    let prompt_tokens = await estimateMaxTokens(myprompt);
    max_Tokens = max_Tokens
    
    return new Promise((resolve, reject) => {
                       
                        chrome.runtime.sendMessage({
                            action: "ollama_translate",
                            data: {
                                text: originalPreProcessed,                          // string to translate
                                apiKey: apikeyOllama,                   // your API key
                                systemPrompt:myprompt,                // string, e.g., "Translate EN → NL, formal"
                                model: mymodel,          // example model, must exist
                                temperature: 0,                    // optional
                                max_tokens: max_Tokens,                      // required by background
                                useLocal: LocalOllama,
                                repeat_penalty: 1.0,
                                do_not_complete: 1,
                                Top_p,
                                Top_k
                            }
                        }, async (response) => {
							
                            if (!response) {
                                hideTranslationSpinner();
                                if (typeof response != 'undefined') {
                                    const rawErr = response.error?.trim() || "Ollama translation failed";
                                    const errMsg = /unauthorized/i.test(rawErr)
                                        ? "Ollama API authorization failed. Check your API key."
                                        : rawErr;
                                    messageBox("error", "There has been an error: " + `${errMsg}`);
                                }
                                else {
                                    messageBox("error", "No response from Ollama API. Check your connection and settings.");
                                }
                                return "NOK";
                            }
                           if (!response.success) {
                               const rawErr = response.error?.trim() || "Ollama translation failed";
                               const errMsg = /unauthorized/i.test(rawErr)
                               ? "Ollama API authorization failed. Check your API key."
                              : rawErr;
                               hideTranslationSpinner();
                              messageBox("error", "There has been an error: " +  `${errMsg}`);
                              return "NOK";
                            }
                           
                            translatedText = response.translation
							translatedText = await normalizeExtraNewlines(original, translatedText)
                             let convertedGlossary = GLOBAL_GLOSSARY;
                             if (convertedGlossary) {
                                translatedText = applyOpenAiGlossary(
                                translatedText,
                                convertedGlossary
                                  );
                            }
                                 myTranslatedText = await postProcessTranslation(
                                    original,
                                    translatedText,
                                    replaceVerb,
                                    originalPreProcessed,
                                    "Ollama",
                                    convertToLower,
                                    spellCheckIgnore,
                                    destlang
                                  );
                            
                               let current = "untranslated"
                               await processTransl(
                                 original,
                                 myTranslatedText,
                                 destlang,
                                 record,
                                 rowId,
                                 transtype,
                                 plural_line,
                                 locale,
                                 convertToLower,
                                current
                            );
                                 hideTranslationSpinner();
                           resolve(response.translation);
                        })
                    })
}

