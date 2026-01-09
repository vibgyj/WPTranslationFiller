// LMStudio translate
async function translateWithLMStudio(original, destlang, record, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss, apikeyOllama, LocalOllama, ollamaModel, ollamaPrompt){
    let mymodel = (typeof ollamaModel === "string" && ollamaModel.trim()) ? ollamaModel : "gemma3:27b";
     
    // Replace glossary and language names
    //console.debug("Ollama Prompt before replacements:", openAiGloss)
    let convertedGlossary = convertGlossaryForOllama(openAiGloss)
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
        showTranslationSpinner("Translating…");
    }
     
    let originalPreProcessed = await preProcessOriginal(original, preverbs, "Ollama");
    //console.debug("Ollama Pre-processed Original:", originalPreProcessed); 
    //originalPreProcessed = '"""' + originalPreProcessed + '"""';
    //console.debug("Ollama Pre-processed Original:", originalPreProcessed);
    let max_Tokens = estimateMaxTokens(originalPreProcessed);
    let prompt_tokens = estimateMaxTokens(myprompt);
    max_Tokens = max_Tokens + prompt_tokens
     const start = Date.now()
                    return new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: "LMStudio_translate",
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
                            console.debug("LMStudio response:", response);
                            if (!response) {
                                hideTranslationSpinner();
                                if (typeof response != 'undefined') {
                                    const rawErr = response.error?.trim() || "LMStudio translation failed";
                                    const errMsg = /unauthorized/i.test(rawErr)
                                        ? "LMStudio API authorization failed. Check your API key."
                                        : rawErr;
                                    messageBox("error", "There has been an error: " + `${errMsg}`);
                                }
                                else {
                                    messageBox("error", "No response fromMStudio. Check your connection and settings.");
                                }
                                return "NOK";
                            }
                           if (!response.ok) {
                               const rawErr = response.error?.trim() || "LMStudio translation failed";
                               console.debug("response:", response)
                               console.debug("response error:",response.text)
                               const errMsg = response.text
                              
                               hideTranslationSpinner();
                              messageBox("error", "There has been an error: " +  `${errMsg}`);
                              return "NOK";
                            }
                            const duration = ((Date.now() - start) / 1000).toFixed(2);
                           console.debug("Duur:",duration)
                            translatedText = response.text
                             let convertedGlossary = GLOBAL_GLOSSARY;
                             if (convertedGlossary) {
                                translatedText = applyOpenAiGlossary(
                                translatedText,
                                convertedGlossary
                                  );
                            }
                                let myTranslatedText = postProcessTranslation(
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
