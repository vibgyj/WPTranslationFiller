/**
 * This file includes all functions for translating with the Ollama API
 * It depends on commonTranslate for additional translation functions
 * Ollama provides a local LLM API compatible with OpenAI's chat format
 * Uses the AI Glossary database for rich translation context
 */

// Wrapper function that reads Ollama settings from storage
// This simplifies integration by not requiring all function signatures to be modified
async function translateWithOllama(original, destlang, record, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss, apikeyOllama, LocalOllama, ollamaModel, ollamaPrompt) {
    var myTranslatedText = "";
    //let mymodel = "gpt-oss:20b"
    // Ensure ollamaModel has a valid value, fallback to default
    let mymodel = (typeof ollamaModel === "string" && ollamaModel.trim()) ? ollamaModel : "gemma3:27b";
    // Replace glossary and language names
    //console.debug("Ollama Prompt before replacements:", openAiGloss)
    let convertedGlossary = convertGlossaryForOllamaMerged(openAiGloss)
    //let newConverted = convertGlossaryToQuoted(convertedGlossary)
    //console.debug("Ollama Converted Glossary:", convertedGlossary)
    let myprompt = ollamaPrompt.replaceAll("{{OpenAiGloss}}", convertedGlossary);
    
    myprompt = myprompt.replaceAll("{{tone}}", OpenAITone);
     if (destlang === 'nl') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Dutch');
     else if (destlang === 'de') myprompt = myprompt.replaceAll("{{toLanguage}}", 'German');
     else if (destlang === 'fr') myprompt = myprompt.replaceAll("{{toLanguage}}", 'French');
     else if (destlang === 'uk') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Ukrainian'); 
     else if (destlang === 'es') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Spanish');
     else if (destlang === 'it') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Italian');
     else if (destlang === 'pt') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Portuguese');
     else if (destlang === 'ru') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Russian');
     else myprompt = myprompt.replaceAll("{{toLanguage}}", destlang);
    //console.debug("Ollama Prompt after replacements:", myprompt);
    if (toBoolean(is_editor)) {
        showTranslationSpinner(__("Fetching translation…"));
    }
     
    let originalPreProcessed = await preProcessOriginal(original, preverbs, "Ollama");
    //console.debug("Ollama Pre-processed Original:", originalPreProcessed); 
    //originalPreProcessed = '"""' + originalPreProcessed + '"""';
    //console.debug("Ollama Pre-processed Original:", originalPreProcessed);
    let max_Tokens = estimateMaxTokens(originalPreProcessed);
    let prompt_tokens = estimateMaxTokens(myprompt);
    max_Tokens = max_Tokens + prompt_tokens
                    return new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: "ollama_translate",
                            data: {
                                text: originalPreProcessed,                          // string to translate
                                target_lang: destlang,               // optional, can be ignored by background
                                apiKey: apikeyOllama,                   // your API key
                                systemPrompt:myprompt,                // string, e.g., "Translate EN → NL, formal"
                                model: mymodel,          // example model, must exist
                                temperature: 0,                    // optional
                                max_tokens: max_Tokens,                      // required by background
                                useLocal: LocalOllama,
                                repeat_penalty: 1.0,
                                do_not_complete: 1
                            }
                        }, (response) => {
                           // console.debug("response:",response)
							
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
							translatedText = normalizeExtraNewlines(original, translatedText)
                             let convertedGlossary = GLOBAL_GLOSSARY;
                             if (convertedGlossary) {
                                translatedText = applyOpenAiGlossary(
                                translatedText,
                                convertedGlossary
                                  );
                            }
                                 myTranslatedText = postProcessTranslation(
                                 original,
                                 translatedText,
                                 replaceVerb,
                                originalPreProcessed,
                                "Ollama",
                                convertToLower,
                                spellCheckIgnore,
                                destlang
                                    );
                                     //console.debug("Ollama Translated Text:", myTranslatedText)
                           
                               let current = "untranslated"
                               processTransl(
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

