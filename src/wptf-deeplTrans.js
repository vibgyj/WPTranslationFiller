/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function translateText(original, destlang, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry, deepLcurrent) {
    destlang = destlang.toUpperCase()
    //console.debug("current in deepl:",deepLcurrent)
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
    //console.debug("original:",originalPreProcessed)
    if (formal === true) {
        formal_value = "prefer_more"
        mycontext = "This text is a legal message"
    }
    else {
        formal_value = "prefer_less"
        mycontext = "This text is a casual conversation with a friend."
    }

    if (destlang == "RO") {
        myformat = '0'
    }
    else {
        myformat = '1'
    }
    //console.debug("formal in Deepl:", formal, formal_value)
    //console.debug("targetlang:",destlang,deeplGlossary)
    let url = DeeplFree == true ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
    //  console.debug("url:",url,DeeplFree)
   // console.debug("deeplGlossary:",deeplGlossary)
    const requestBody = {
        auth_key: apikeyDeepl,
        text: [originalPreProcessed],  // You have text as an array
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
        DeepLFreePar: DeeplFree,
        DeeplURL: url
    };
    // changed function to send the request via the background script, otherwise a CORS error is generated
    chrome.runtime.sendMessage({ action: "translate", url, body: requestBody }, response => {
        if (chrome.runtime.lastError) {
            console.error("Error:", chrome.runtime.lastError.message);
            return;
        }
        //console.debug("response:", response.translations[0]);
        translated = response;

        if (translated && translated.hasOwnProperty('translations') && Array.isArray(translated.translations)) {
          
            processData(translated, original, record, row, originalPreProcessed, replaceVerb, spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent, destlang)
                .then(processedData => {
                   // console.debug("ProcessedData",processedData)
                    errorstate = (processedData === "OK") ? "OK" : processedData;
                    return errorstate;
                })
                .catch(err => {
                    console.error("Error in processData:", err);
                });
        } else {
            console.log("The result does not contain 'translations' :", translated,translated.error);
            if (translated && translated.error) {
               let error = translated.error
                switch (true) {
                    case error.startsWith('HTTP 400:'):
                        const match400 = error.match(/HTTP 400: \{"message":"([^"]+)"\}/);
                        if (match400) {
                            // Extract the message from the match and use it
                            const errorMessage = match400[1]; // This will hold the error message from DeepL
                            console.error("DeepL Error 400:", errorMessage);
                            messageBox("warning", `Request forbidden: ${errorMessage}`);
                            errorstate = `Request forbidden: ${errorMessage}`;
                        } else {
                            // If no specific message is found, handle as a generic 403 error
                            messageBox("warning", "Request forbidden<br>Please check your license, or your glossary");
                            errorstate = "Request forbidden<br>Please check your license, or glossary";
                        }
                        break;
                    case error.startsWith('HTTP 403:'):
                        const match403 = error.match(/HTTP 403: \{"message":"([^"]+)"\}/);
                        if (match403) {
                            // Extract the message from the match and use it
                            const errorMessage = match403[1]; // This will hold the error message from DeepL
                            console.error("DeepL Error 403:", errorMessage);
                            messageBox("warning", `Request forbidden: ${errorMessage}<br>Please check your license!`);
                            errorstate = `Request forbidden: ${errorMessage}<br>Please check your license!`;
                        } else {
                            // If no specific message is found, handle as a generic 403 error
                            messageBox("warning", "Request forbidden<br>Please check your license!");
                            errorstate = "Request forbidden<br>Please check your license!";
                        }
                        break;

                    case error.startsWith('HTTP 404:'):
                        messageBox("warning", "Page not found<br>Please check your DeepL glossary!<br>Or load a new glossary");
                        errorstate = "Page not found<br>Please check your DeepL glossary!<br>Or load a new glossary";
                        break;

                    case error.startsWith('HTTP 456:'):
                        errorstate = "456 Quota exceeded.<br> The character limit has been reached";
                        messageBox("warning", "You have exeeded your quota!<br>Please wait for a day or purchase a new licence");
                        break;

                    default:
                        console.debug("Unknown error:", error);
                        errorstate = `Unknown error: ${error}`;
                }

            } else if (translated && translated.message === "Quota Exceeded") {
                messageBox("warning", "You have exceeded your translation quota!");
            } else {
                console.debug("We have an unknown error:", translated ? translated.message : "No response received");
            }
        }
    });
}


async function deepLTranslate(original, language, record, apikeyDeepl, preverbs, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry) {
    var originalPreProcessed = preProcessOriginal(original, preverbs, "deepl");
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
        await translateText(original, language, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry,deepLcurrent)
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
        // Process data if it's an array
        return new Promise((resolve) => {
            setTimeout(() => {
                //console.log('Processing array data...');
                resolve(data.map(item => ({ ...item, processed: true }))); // Example processing
            }, 1000);
        });
    } else if (typeof data === 'object' && data !== null) {
        // Process data if it's an object
        return new Promise((resolve) => {
            setTimeout(() => {
                //console.log('Processing object data...');
                if (data.status === 403){
                    errorstate="403 check licence"
                    resolve(errorstate)
                }
                else if (data.status === 404){
                    errorstate= "404 The requested resource could not be found.<br>Maybe the glossary number is wrong!<br>Try loading a new glossary"
                    resolve(errorstate)
                }
                else if (data.status === 456) {
                    errorstate="456 Quota exceeded.<br> The character limit has been reached"
                    resolve(errorstate)
                }

                if (typeof data.translations != 'undefined') {
                   // console.debug("deepl result complete:",data.translations)
                    translatedText = data.translations[0].text;
                    // console.debug("deepl result", translatedText)
                    // to activate logging of the restoreCase set the last position to 'true'
                    if (locale != "ru" && locale != "uk") {
                        translatedText = restoreCase(original, translatedText, locale, spellCheckIgnore, false);
                    }
                    translatedText =  postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower, spellCheckIgnore, locale);
                    deepLresul = processTransl(original, translatedText, language, record, row, transtype, plural_line, locale, convertToLower, deepLcurrent);
                }
                // Example processing: add a processed field
                errorstate = "OK"
                resolve(errorstate)
                //resolve({ ...data, processed: true });
            }, 100);
        });
    } else {
        // Handle other data types if necessary
       // errorstate ="NOK"
        return errorstate
    }
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

