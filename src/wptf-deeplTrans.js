/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function translateText(
    original, destlang, record, apikeyDeepl, originalPreProcessed, row,
    transtype, plural_line, formal, locale, convertToLower,
    DeeplFree, spellCheckIgnore, deeplGlossary, is_entry,
    deepLcurrent, DeepLWait = 0
) {
    destlang = destlang.toUpperCase();

    const formal_value = formal ? "prefer_more" : "prefer_less";
    const mycontext = formal
        ? "This text is a legal message"
        : "This text is a casual conversation with a friend.";

    const myformat = destlang === "RO" ? "0" : "1";
     let isFree = DeeplFree === true || DeeplFree === "true"; // handle boolean or string
    
    const url = isFree === true ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
    const requestBody = {
        auth_key: apikeyDeepl,
        text: [originalPreProcessed],
        source_lang: "EN",
        target_lang: destlang,
        formality: formal_value,
        preserve_formatting: myformat,
        tag_handling: "xml",
        ignore_tags: "x",
        split_sentences: "nonewlines",
        outline_detection: "0"
    };

    if (mycontext) requestBody.context = [mycontext];
    if (deeplGlossary) requestBody.glossary_id = deeplGlossary;
    requestBody.DeepLFreePar = DeeplFree;
    requestBody.DeeplURL = url;

    const maxRetries = 5;
    let attempt = 0;
    let delay = DeepLWait || 1500; // start with TMWait / DeepLWait or default 1.5s

    return new Promise((resolve) => {

        function sendRequest() {
            chrome.runtime.sendMessage({ action: "DeepL", url, body: requestBody }, (translated) => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome runtime error:", chrome.runtime.lastError.message);
                    resolve(`DeepL request failed: ${chrome.runtime.lastError.message}`);
                    return;
                }

                // Success
                if (translated && Array.isArray(translated.translations)) {
                    processData(
                        translated, original, record, row, originalPreProcessed,
                        replaceVerb, spellCheckIgnore, transtype, plural_line,
                        locale, convertToLower, deepLcurrent, destlang
                    ).then(processedData => {
                        resolve(processedData === "OK" ? "OK" : processedData);
                    }).catch(err => {
                        console.error("Error in processData:", err);
                        resolve(`Processing error: ${err.message}`);
                    });
                    return;
                }

                // Handle 429 (rate limit) with retry/backoff
                if (translated && translated.error && translated.error.includes("429")) {
                    attempt++;
                    if (attempt <= maxRetries) {
                        console.warn(`DeepL 429 rate limit - retry ${attempt}/${maxRetries} in ${delay}ms`);
                        setTimeout(sendRequest, delay);
                        delay *= 2; // exponential backoff
                        return;
                    } else {
                        resolve("DeepL rate limit exceeded (429) after multiple retries");
                        return;
                    }
                }

                // Other DeepL errors
                let errorstate = "";
                if (translated && translated.error) {
                    const error = translated.error;
                    switch (true) {
                        case error.startsWith("HTTP 400:"):
                            const match400 = error.match(/HTTP 400: \{"message":"([^"]+)"\}/);
                            errorstate = match400 ? `Request forbidden: ${match400[1]}` : "Request forbidden";
                            messageBox("warning", errorstate);
                            break;
                        case error.startsWith("HTTP 403:"):
                            const match403 = error.match(/HTTP 403: \{"message":"([^"]+)"\}/);
                            errorstate = match403 ? `Request forbidden: ${match403[1]}<br>Please check your license!` : "Request forbidden<br>Please check your license!";
                            messageBox("warning", errorstate);
                            break;
                        case error.startsWith("HTTP 404:"):
                            errorstate = "Page not found<br>Please check your DeepL glossary or load a new glossary";
                            messageBox("warning", errorstate);
                            break;
                        case error.startsWith("HTTP 456:"):
                            errorstate = "456 Quota exceeded.<br>The character limit has been reached";
                            messageBox("warning", "You have exceeded your quota! Please wait or purchase a new licence");
                            break;
                        default:
                            console.debug("Unknown error:", error);
                            errorstate = `Unknown error: ${error}`;
                    }
                    resolve(errorstate);
                    return;
                } else if (translated && translated.message === "Quota Exceeded") {
                    messageBox("warning", "You have exceeded your translation quota!");
                    resolve("Quota exceeded");
                    return;
                } else {
                    console.debug("Unknown DeepL error:", translated ? translated.message : "No response received");
                    resolve("Unknown DeepL error");
                    return;
                }
            });
        }

        sendRequest();
    });
}


async function deepLTranslate(original, language, record, apikeyDeepl, preverbs, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry, DeepLWait) {
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "deepl");
    //console.debug("deeplGlossary:",deeplGlossary)
    language = language.toUpperCase();
   
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    var deepLcurrent = document.querySelector(`#editor-${row} span.panel-header__bubble`);
    prevstate = 'untranslated';
    //console.debug("fetchin!")
    //console.debug('preprosessed:', typeof originalPreProcessed)
    if (originalPreProcessed == 'undefined') {
        //console.debug("undefined:", originalPreProcessed)
        originalPreProcessed = "No result of {originalPreprocessed} for original it was empty!"
    }
    try {
        //console.debug("before translateText:",DeeplFree)
        await translateText(original, language, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry,deepLcurrent,DeepLWait)
    }
    catch (error) {
        // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
        if (error == 'TypeError: Failed to fetch') {
            errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
        }
        else {
            //messageBox("warning", "There has been an error<br>"+ data.message);
            // alert("Error message: " + error[1]);
            console.debug("Error:", error)
            errorstate = "Error " + error;
        }
        return errorstate
    };

}

async function processData(data, original, record, row, originalPreProcessed, replaceVerb, spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent, language) {
    //console.debug("current in deepl:", deepLcurrent)
    //console.debug("data in deepl:", data)

    if (Array.isArray(data)) {
        // Simulate async delay for array processing if needed
        await new Promise(resolve => setTimeout(resolve, 0));
        // Example processing - mark each item processed
        return data.map(item => ({ ...item, processed: true }));
    } 
    
    if (typeof data === 'object' && data !== null) {
        // Simulate async delay before processing
        await new Promise(resolve => setTimeout(resolve, 100));

        if (data.status === 403) {
            return "403 check licence";
        }
        if (data.status === 404) {
            return "404 The requested resource could not be found.<br>Maybe the glossary number is wrong!<br>Try loading a new glossary";
        }
        if (data.status === 456) {
            return "456 Quota exceeded.<br> The character limit has been reached";
        }

        if (typeof data.translations !== 'undefined') {
            let translatedText = data.translations[0].text;

            if (locale !== "ru" && locale !== "uk") {
                translatedText = await restoreCase(original, translatedText, locale, spellCheckIgnore, false);
            }

            translatedText = await postProcessTranslation(
                original,
                translatedText,
                replaceVerb,
                originalPreProcessed,
                "deepl",
                convertToLower,
                spellCheckIgnore,
                locale
            );

            //console.debug("translated in DeepL:", translatedText);

            await processTransl(
                original,
                translatedText,
                language,
                record,
                row,
                transtype,
                plural_line,
                locale,
                convertToLower,
                deepLcurrent
            );
        }

        return "OK";
    }

    // For other data types, just return error state or handle accordingly
    return "NOK";
}

   
async function fetchWithRetry(url, options = {}, retries = 3, timeout = 5000) {
    const fetchWithTimeout = (resource, options) => {
        const { timeout } = options;
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Request timed out'));
            }, timeout);

            fetch(resource, options)
                .then(response => {
                    clearTimeout(timer);
                    resolve(response);
                })
                .catch(err => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    };

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetchWithTimeout(url, { ...options, timeout });
            if (response.status === 404) {
                errorstate= "404 The requested resource could not be found.<br> Maybe the glossary for DeepL is not loaded<br>Try loading the glossary"
                return response;
            }
            else if (response.status === 403) {
                // Return the response directly for 403 Forbidden
                errorstate = "403 check licence"
                return response;
            }
            else if (response.status === 456){
                errorstate = "456 Quota exceeded.<br> The character limit has been reached"
                return response;
            }
            if (!response.ok) {
                errorstate = response.status
                return response
               // throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Check if the Content-Type is application/json
            const contentType = response.headers.get('Content-Type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Expected application/json but received ${contentType}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            
            if (i === retries - 1) {
                errorstate = `Failed after ${retries} retries: ${error.message}`
                return errorstate
               // throw new Error(`Failed after ${retries} retries: ${error.message}`);
            }
        }
    }
}

