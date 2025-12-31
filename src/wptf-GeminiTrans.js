/**
 * Calls Gemini via background.js
 */
async function translateWithGemini(original, destlang, e, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, spellCheckIgnore, is_editor, apiKeyGemini, GeminiModel,GeminiPrompt) {
    
     let  myprompt = GeminiPrompt
     if (destlang === "nl") myprompt = myprompt.replaceAll("{{toLanguage}}", "Dutch");
     else if (destlang === "de") myprompt = myprompt.replaceAll("{{toLanguage}}", "German");
     else if (destlang === "fr") myprompt = myprompt.replaceAll("{{toLanguage}}", "French");
     else if (destlang === "uk") myprompt = myprompt.replaceAll("{{toLanguage}}", "Ukrainian"); 
     else if (destlang === "es") myprompt = myprompt.replaceAll("{{toLanguage}}", "Spanish");
     else if (destlang === "it") myprompt = myprompt.replaceAll("{{toLanguage}}", "Italia");
     else if (destlang === "pt") myprompt = myprompt.replaceAll("{{toLanguage}}", "Portuguese");
     else if (destlang === "ru") myprompt = myprompt.replaceAll("{{toLanguage}}", "Russian");
     else myprompt = myprompt.replaceAll("{{toLanguage}}", destlang);
     geminiTone = "ínformal"
     // Handle tone and language in prompt
  if (geminiTone === "formal") {
    if (destlang === "nl") {
      myprompt = tempPrompt.replaceAll("{{tone}}", geminiTone + " and use 'u' instead of 'je'");
    } else if (destlang === 'de') {
      myprompt = tempPrompt.replaceAll("{{tone}}", geminiTone + " and use 'Sie' instead of 'du'");
    } else if (destlang === 'fr') {
      myprompt = tempPrompt.replaceAll("{{tone}}", geminiTone + " use 'vous' instead of 'tu'");
    } else {
      myprompt = tempPrompt.replaceAll("{{tone}}", geminiTone);
    }
  } else {
    myprompt = myprompt.replaceAll("{{tone}}", geminiTone);
    }
 
 

    var convertedGlossary = GLOBAL_GLOSSARY;
    myprompt = myprompt.replaceAll("{{OpenAiGloss}}", convertedGlossary);
    
    let originalPreProcessed = await preProcessOriginal(
        original,
        replacePreVerb,
        "gemini"
    ); 
    let sourceLang = "en"
    let targetLang = destlang
      const prompt = `
             Translate from ${sourceLang} to ${targetLang}.
             follow the following rules ${myprompt}
            Text:
            ${originalPreProcessed}
            `.trim();
    formal = false
    
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                action: "Gemini",
                data: {
                    apiKey: apiKeyGemini,
                    text: originalPreProcessed,
                    sourceLang: "en",
                    targetLang: destlang,
                    formal,
                    locale,
                    model: GeminiModel,
                    prompt: prompt
                }
            },
            (response) => {
                if (!response) {
                    const errMsg = "No response from background.js";
                    console.debug(errMsg);
                   // alert(`Gemini Error: ${errMsg}`);
                    messageBox("error", "Gemini eorror: " + errMsg);
                    resolve({ success: false, error: errMsg });
                    return;
                }

                if (!response.success) {
                     if (toBoolean(is_editor)) {
                         console.debug("Gemini Error:", response.error);
                         messageBox("error", "Gemini eorror: " + response.error);
                         resolve(response);
                    }
                    else {
                        resolve("NOK")
                    }
                    return;
                }

                var translatedText = response.translation;
                
                if (convertedGlossary) {
                    translatedText = applyOpenAiGlossary(
                        translatedText,
                        convertedGlossary
                    );
                }
               
                let finalText = postProcessTranslation(
                    original,
                    translatedText,
                    replaceVerb,
                    originalPreProcessed,
                    "gemini",
                    convertToLower,
                    spellCheckIgnore,
                    locale
                );

                processTransl(
                    original,
                    finalText,
                    destlang,
                    e,
                    rowId,
                    transtype,
                    plural_line,
                    locale,
                    convertToLower,
                    "untranslated"
                );

                resolve(response);
            }
        );
    });
}
