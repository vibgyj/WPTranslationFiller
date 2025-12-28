/**
 * This file includes all functions for translating with the Microsoft API
 * It depends on commonTranslate for additional translation functions
 */
var result = "";
var res = "";
var textareaElem = "";
var preview = "";
var translatedText = "";
var trntype = "";
async function googleTranslate(original, destlang, e, apiKey, preverbs, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore, deeplGlossary, is_entry) {

    // pre-process before sending to Google
    let originalPreProcessed = await preProcessOriginal(original, replacePreVerb, "google");

    let convertedGlossary = GLOBAL_GLOSSARY;
    
    return new Promise((resolve, reject) => {

        chrome.runtime.sendMessage(
            {
                action: "google_translate",
                payload: {
                    apiKey: apiKey,
                    text: originalPreProcessed,
                    targetLang: destlang,
                    sourceLang: "en"
                }
            },
            function (response) { // <- no async here
                try {
                    if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
                    if (!response) throw new Error("No response from background");
                    if (!response.ok) throw new Error(`[GoogleTranslate] ${response.error.type}: ${response.error.message}`);

                    let translatedText = response.result.text;
                    let myTranslatedText = translatedText;

                    if (convertedGlossary) {
                        console.debug("Applying glossary to:", translatedText);
                        myTranslatedText = applyOpenAiGlossary(translatedText, convertedGlossary);
                        console.debug("After glossary:", myTranslatedText); 
                    }
                    myTranslatedText = postProcessTranslation(
                        original,
                        myTranslatedText,
                        replaceVerb,
                        originalPreProcessed,
                        "google",
                        convertToLower,
                        spellCheckIgnore,
                        locale
                    );

                    processTransl(
                        original,
                        myTranslatedText,
                        destlang,
                        e,
                        rowId,
                        transtype,
                        plural_line,
                        locale,
                        convertToLower,
                        "untranslated"
                    );

                    console.debug("Final translated text:", myTranslatedText);

                    resolve("OK");

                } catch (err) {
                    reject(err);
                }
            }
        );

    });
}



