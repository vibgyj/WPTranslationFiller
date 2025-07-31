/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function translateText(original, destlang, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry, deepLcurrent, DeepLWait) {
    destlang = destlang.toUpperCase();

    let formal_value, mycontext;
    if (formal === true) {
        formal_value = "prefer_more";
        mycontext = "This text is a legal message, do not add words that are not within the text provided";
    } else {
        formal_value = "prefer_less";
        mycontext = "This text is a casual conversation with a friend, do not add words that are not in the text provided";
    }

    const myformat = destlang === "RO" ? '0' : '1';
    //console.debug("DeepLFree:",DeeplFree)
   const isFree = DeeplFree === true || DeeplFree === "true";  // make it a true boolean
   const url = isFree ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";

    const requestBody = {
        auth_key: apikeyDeepl,
        text: [originalPreProcessed],
        source_lang: 'EN',
        target_lang: destlang,
        formality: formal_value,
        preserve_formatting: myformat,
        tag_handling: 'xml',
        ignore_tags: 'x',
        split_sentences: 'nonewlines',
        outline_detection: '0',
        context: [mycontext],
        glossary_id: deeplGlossary,
        DeeplURL: url,
        DeepLFreePar:DeeplFree
    };

    try {
        const translated = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "translate", url, body: requestBody }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        if (translated?.translations && Array.isArray(translated.translations)) {
            const processedData = await processData(translated, original, record, row, originalPreProcessed, replaceVerb, spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent, destlang);
            return processedData === "OK" ? "OK" : processedData;
        } else {
            const error = translated?.error || translated?.message;
            if (error) {
                switch (true) {
                    case error.startsWith('HTTP 400:'):
                        const match400 = error.match(/HTTP 400: \{"message":"([^"]+)"\}/);
                        const msg400 = match400 ? match400[1] : "Request forbidden";
                        messageBox("warning", `Request forbidden: ${msg400}`);
                        return `Request forbidden: ${msg400}`;
                    case error.startsWith('HTTP 403:'):
                        const match403 = error.match(/HTTP 403: \{"message":"([^"]+)"\}/);
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
        console.error("Error during DeepL translation:", err);
        return `DeepL request failed: ${err.message}`;
    }
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

