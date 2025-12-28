/**
 * Calls Lingvanex via background.js
 */
async function translateWithLingvanex(
    original,
    destlang,
    e,
    replacePreVerb,
    rowId,
    transtype,
    plural_line,
    formal,
    locale,
    convertToLower,
    spellCheckIgnore,
    is_editor,
    apiKeyLingvanex,
) {
    let convertedGlossary = GLOBAL_GLOSSARY 
    let originalPreProcessed = await preProcessOriginal(original, replacePreVerb, "lingvanex");
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "Lingvanex",
            data: {
                apiKey: apiKeyLingvanex,
                text: originalPreProcessed,
                sourceLang: "en", // auto-detect
                targetLang: destlang,
                translateMode: "html", // could be "html" if needed
            }
        }, (response) => {
            if (!response) {
                const errMsg = "No response from background.js";
                console.error(errMsg);
                alert(`Lingvanex Error: ${errMsg}`);
                resolve({ success: false, error: errMsg });
                return;
            }

            // Controleer of response een fout bevat
            if (!response.success) {
                console.error("Lingvanex Error:", response.error);
                alert(`Lingvanex Error: ${response.error}`);
                resolve(response); // return de response zodat caller nog steeds toegang heeft
                return;
            }

            // Success
            //console.log("Lingvanex Translation:", response.translation);
            let myTranslatedText =  postProcessTranslation(
                original,
                response.translation,
                replaceVerb,
                originalPreProcessed,
                "lingvanex",
                convertToLower,
                spellCheckIgnore,
                locale
            );
             if (convertedGlossary) {
                 myTranslatedText = applyOpenAiGlossary(myTranslatedText, convertedGlossary);
             }
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
            resolve(response);
        });
    });
}

// JavaScript source code
