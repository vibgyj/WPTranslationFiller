/**
 * This is the API from languageio golinguist.com
 * Translate text using Golinguist / LanguageIO (LinguistNow) API
 * with UTF-8 encoding
 * @param {string} original - the source sentence to translate
 * @param {string} locale - target locale / language code, e.g. "fr", "nl"
 * @returns {Promise<string>} - resolves to the translated text
 */
async function translateWithGolinguist(original, locale,record,row,apikeyTranslatio, preverbs, spellCheckIgnore,transtype,plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry) {
    let deepLcurrent = "current"
    var current=""
    let destlang = "nl"
    let show_debug = true
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");
     //apiKey: "PfxyyA4ucL609TYwut1A8ajdM4QpZC3lqgRPxJw7",
    try {
        const start = Date.now();
        const body = []
        const requestBody = {
        apiKey: apikeyTranslatio,
        text: original,
        source_lang: "en-us",
        target_lang: "nl-nl",
        trans_url : "https://agw.golinguist.com/linguistnow/resources/v1/translate"
    };
        const translated = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "translateio",  body: requestBody }, response => {
                console.debug("response:",response)
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.debug("response:",response)
                    resolve(response);
                }
            });
        });
       
        if (translated?.translation ) {
            console.debug("translated:", translated.translation)
             translatedText = await postProcessTranslation(
            original,
            translated.translation,
            replaceVerb,
            originalPreProcessed,
            "transalteio",        // tag for debugging
            convertToLower,
            spellCheckIgnore,
            locale
        );

        if (show_debug) console.debug(`[${new Date().toISOString()}] text processed by postProcessTranslation`);
        translatedText = await convert_lower(translatedText, spellCheckIgnore);
        await processTransl(
            original,
            translatedText,
            locale,
            record,
            row,
            transtype,
            plural_line,
            locale,
            convertToLower,
            current
        );

        if (show_debug) {
            const durationSec = ((Date.now() - start) / 1000).toFixed(2);
            console.debug(`[${new Date().toISOString()}] All processed in ${durationSec}s`);
           }
            const processedData = await processData(translated, original, record, row, originalPreProcessed, replaceVerb, spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent, destlang);
            return processedData === "OK" ? "OK" : processedData;
        } else {
            
            const error = translated?.error || translated?.message;
            console.debug("error:",error)
            if (error) {
                switch (true) {
                    case error.startsWith('HTTP 400:'):
                        const match400 = error.match(/HTTP 400: \{"message":"([^"]+)"\}/);
                        const msg400 = match400 ? match400[1] : "Request forbidden";
                        messageBox("warning", `Request forbidden: ${msg400}`);
                        return `Request forbidden: ${msg400}`;
                    case error.startsWith('API error 403'):
                        const match403 = error.match(/API error 403: \{"message":"([^"]+)"\}/);
                        const msg403 = match403 ? match403[1] : "Request forbidden";
                        messageBox("warning", `Request forbidden: ${msg403}<br>Please check your license!`);
                        return `Request forbidden: ${msg403}<br>Please check your license!`;
                    case error.startsWith('HTTP 404:'):
                        messageBox("warning", "Page not found<br>Please check your DeepL glossary!<br>Or load a new glossary");
                        return "Page not found<br>Please check your DeepL glossary!<br>Or load a new glossary";
                    case error.startsWith('HTTP 456:'):
                        messageBox("warning", "You have exceeded your quota!<br>Please wait for a day or purchase a new licence");
                        return "456 Quota exceeded.<br> The character limit has been reached";
                    default:
                        console.debug("Unknown error:", error);
                        return `Unknown error: ${error}`;
                }
            } else {
                console.debug("We have an unknown error:", translated ? translated.message : "No response received");
                return "Unknown error";
            }
        }
    } catch (err) {
        console.error("Error duringtranslationio translation:", err);
        return `translationio request failed: ${err.message}`;
    }
}

// Example usage
//translateWithGolinguist("Привет, как дела?", "en")
//  .then(tx => console.log("English:", tx))
 // .catch(e => console.error("Error:", e));
