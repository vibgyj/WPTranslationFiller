/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function translateText(original, destlang, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry, deepLcurrent) {
    destlang = destlang.toUpperCase()
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
    //console.debug("original:",original)
    if (formal) {
        formal_value = "prefer_more"
    }
    else {
        formal_value = "prefer_less"
    }

    if (destlang == "RO") {
        myformat = "0"
    }
    else {
        myformat = "1"
    }
        let url = DeeplFree == true ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
        const requestBody = {
            auth_key: apikeyDeepl, // Include the API key in the body
            text: [originalPreProcessed],
            source_lang: "EN",
            target_lang: destlang,
            preserve_formatting: myformat, // false as "0", true as "1".
            tag_handling: "xml",
            ignore_tags: ["x"],
            formality: formal_value,
            split_sentences: "nonewlines",
            outline_detection: "0", // false as "0", true as "1"
            glossary_id: deeplGlossary
        };
      // console.debug("url:",url,requestBody)
    await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded", // Allowed header
        },
        body: new URLSearchParams(requestBody).toString(), // Encode the body as URL-encoded
    })
        .then((response) => {
            //console.debug("response:", response)
            if (response.ok) {
                data = response.json();
               //console.debug("we found data:", data) 
            }
            else if (!response.ok) {
               // console.debug("we found data:", response, response.ok, response.status)
                data = response.json()
               
                // throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return data
        })
        .then((translated) => {
           // console.debug("translation:", translated, "status: ", translated.ok)
            if (translated.hasOwnProperty('translations') && Array.isArray(translated.translations)) {
                // console.log("The result contains 'translations'");
               //console.debug("translation:",translated.translations[0])
                  processData(translated, original, record, row, originalPreProcessed, replaceVerb, spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent, destlang)
                    .then(processedData => {
                        console.debug("processedData:", processedData)
                        // Return the result to the higher function
                        if (processedData === "OK") {
                            errorstate = "OK"
                        }
                        else {
                            errorstate = processedData
                        }
                        return errorstate;
                    })
            } else {
                console.log("The result does not contain 'translations' :", translated);
                if (translated.status == '403') {
                    messageBox("warning", "Request forbidden<br>Please check your license!");
                    errorstate = "Request forbidden<br>Please check your license!"
                }
                else if (translated.status == '404') {
                    console.debug("Error during translation:", translated)
                    messageBox("warning", "Page not found<br>Please check your DeepL glossary!<br>Or load a new glossary")
                    errorstate = 'Page not found<br>Please check your DeepL glossary!<br>Or load a new glossary'
                }
                else if (translated.status == '456') {
                    errorstate = "456 Quota exceeded.<br> The character limit has been reached"

                }
                else if (translated.message == "Quota Exceeded") {

                    messageBox("warning", "You have exceeded your translation quota!")
                }
                else
                {
                    console.debug("We have unknown error:",translated.message)
                }
            }

        })
        .catch((error) => {
            console.debug("Entry:",is_entry,error)
            if (is_entry) {
                console.debug("Error during translation:", error);
                if (error == 'Error: HTTP error! Status: 403') {
                    messageBox("warning", "Request forbidden<br>" + error + "<br>Please check your license!");
                }
                else if (error == 'Error: HTTP error! Status: 404') {
                    console.debug("Error during translation:", error)
                    messageBox("warning", "Request forbidden<br>" + error + "<br>Please check your DeepL glossary!<br>Or load a new glossary")
                }
                else if (error.status == 'Error: HTTP error! Status: 456') {
                    errorstate = "456 Quota exceeded.<br> The character limit has been reached"
           
                }
                else if (error == 'TypeError: Failed to fetch') {
                    console.debug("Error during translation:", error)
                    errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
                }
                else {
                    messageBox("warning", "There has been an error<br>" + data.message);
                    // alert("Error message: " + error[1]);
                    console.debug("Error:", error)
                    errorstate = "Error " + error;
                }
            }
            else {
                console.debug("We are in page translation")
                    console.debug("Error:", error)
                    errorstate = "Error " + error;
                }
         });
        //await new Promise((resolve) => setTimeout(resolve, delay));
    //}
}


async function deepLTranslate(original, language, record, apikeyDeepl, preverbs, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry) {
    var originalPreProcessed = preProcessOriginal(original, preverbs, "deepl");
    language = language.toUpperCase();
    //console.debug("lang:",language)
    if (language == 'NL') {
        wordCount = originalPreProcessed.trim().split(/\s+/).length;
        //console.debug("wordcount:",wordCount)
        if (wordCount <= 5) {
            originalPreProcessed = originalPreProcessed[0] + originalPreProcessed.slice(1).toLowerCase();
           // console.debug("count kleiner:",originalPreProcessed)
        }
    }
    //console.debug("prepro:",originalPreProcessed)
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    let deepLcurrent = document.querySelector(`#editor-${row} span.panel-header__bubble`);
    prevstate = deepLcurrent.innerText;
    //console.debug("fetchin!")
    try {
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


async function okdeepLTranslate(original, language, record, apikeyDeepl, preverbs, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore,deeplGlossary,is_entry) {
    var translatedText = "";
    var ul = "";
    //var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var responseObj = "";
    var textareaElem = "";
    var select = "";
    var textareaElem1 = "";
    var previewElem = "";
    var preview = "";
    var status = "";
    var error;
    var data;
    var link;
    var deepLresult;
    //errorstate ="NOK"
    var originalPreProcessed = preProcessOriginal(original, preverbs, "deepl");
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    let deepLcurrent = document.querySelector(`#editor-${row} span.panel-header__bubble`);
   // console.debug("current in deepl:", deepLcurrent)
    prevstate = deepLcurrent.innerText;
    //console.debug("Original preprocessed:", originalPreProcessed)
    language = language.toUpperCase();
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    //console.debug("glossary:", deeplGlossary)
    if (typeof deeplGlossary == "undefined") {
        deeplGlossary =""
    }
    if (language == 'NL') {
        wordCount = originalPreProcessed.trim().split(/\s+/).length;
        console.debug("count:",wordCount)
        if (wordCount <= 5) {
            originalPreProcessed = originalPreProcessed[0] + originalPreProcessed.slice(1).toLowerCase();
        }
    }
    if (language == "RO") {
        link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
    }
    else {
        if (!formal) {
            if (deeplGlossary == null) {
                link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=true&tag_handling=xml&ignore_tags=x&formality=prefer_less&split_sentences=nonewlines&outline_detection=0"
            }
            else {
                link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&glossary_id=" + deeplGlossary + "&preserve_formatting=true&tag_handling=xml&ignore_tags=x&formality=prefer_less&split_sentences=nonewlines&outline_detection=0"
            }
        }
        else {
             if (deeplGlossary == null){
                 link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=prefer_more&split_sentences=nonewlines&outline_detection=0"
             }
             else {
                 link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&glossary_id=" + deeplGlossary + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=prefer_more&&split_sentences=nonewlines&outline_detection=0"
             }
        }
    }

    // Usage example:
    try {
        const processedData = await fetchWithRetry(link, {}, 3, 5000)
       .then(data => processData(data,original,record, row, originalPreProcessed,replaceVerb,spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent,language))  // Processing data with async function
       .then(processedData => {
               // console.debug("processedData:",processedData)
                // Return the processed data to the higher function
                if (processedData === "OK"){
                errorstate = "OK"
                }
                else {
                    errorstate = processedData
                }
                return errorstate;
            });
            //console.log('Processed Data in Higher Function:', processedData);
            return errorstate;  // Returning the processed data
       } catch (error) {
            
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //messageBox("warning", "There has been an error<br>"+ data.message);
               // alert("Error message: " + error[1]);
                console.debug("Error:",error)
                errorstate = "Error " + error;
            }
            return errorstate
        };

    //console.debug("deepl link:",link)
   
}

async function processData(data, original, record, row, originalPreProcessed, replaceVerb, spellCheckIgnore, transtype, plural_line, locale, convertToLower, deepLcurrent, language) {
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
                    //console.debug("deepl result", translatedText)
                    translatedText =  postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower, spellCheckIgnore, locale);
                   // console.debug("deepl na postprocess:", translatedText, deepLcurrent,convertToLower)
                  //  console.debug("deepl preprocessed:",originalPreProcessed,record) 
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

async function oldgetTransDeepl(original, language, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore,deeplGlossary,is_entry) {
    var translatedText = "";
    var ul = "";
    //var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var responseObj = "";
    var textareaElem = "";
    var select = "";
    var textareaElem1 = "";
    var previewElem = "";
    var preview = "";
    var status = "";
    var error;
    var data;
    var link;
    var deepLresult;
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    let deepLcurrent = document.querySelector(`#editor-${row} span.panel-header__bubble`);
   // console.debug("current in deepl:", deepLcurrent)
    prevstate = deepLcurrent.innerText;
    //console.debug("Original preprocessed:", originalPreProcessed)
    language = language.toUpperCase();
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    //console.debug("glossary:",deeplGlossary)
    if (language == "RO") {
        link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
    }
    else {
        if (!formal) {
            if (deeplGlossary == null) {
                link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=prefer_less&split_sentences=nonewlines&outline_detection=0"
            }
            else {
            link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&glossary_id=" + deeplGlossary + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=prefer_less&split_sentences=nonewlines&outline_detection=0"
            }
        }
        else {
             if (deeplGlossary == null){
                 link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=prefer_more&split_sentences=nonewlines&outline_detection=0"
             }
             else {
                 link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&glossary_id=" + deeplGlossary + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=prefer_more&&split_sentences=nonewlines&outline_detection=0"
             }
        }
    }

    //console.debug("deepl link:",link)
    const response = await fetch(link)
        .then(async response => {
            const isJson = await response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("response:", data);
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status
                if (typeof data != "undefined") {
                    error = [data, error, response.status];
                    errorstate="NOK"
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    error = [data, message, response.status];
                    errorstate="NOK"
                }
                return Promise.reject(error);
            }
            else {
                //We do have a result so process it
                if (typeof data.translations != 'undefined') {
                   // console.debug("deepl result complete:",data.translations)
                    translatedText = data.translations[0].text;
                    //console.debug("deepl result", translatedText)
                    translatedText =  await postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower, spellCheckIgnore, locale);
                   // console.debug("deepl na postprocess:", translatedText, deepLcurrent,convertToLower)
                  //  console.debug("deepl preprocessed:",originalPreProcessed,record) 
                    deepLresul = await processTransl(original, translatedText, language, record, row, transtype, plural_line, locale, convertToLower, deepLcurrent);
                    return Promise.resolve("OK");
                }
                else {
                    errorstate = '<br>We did not get a translation!<br>Message received:<br>' + error;
                    message="Error in recieving data"
                    error = [data, message, response.status];
                    return Promise.reject(error);
                }
               }
        })
        .catch(error => {
            if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                console.debug("glossary value DeepL might not be loaded")
                errorstate = "Error 400";
            }
            if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error[2] == '456') {
                messageBox("warning", __("Error 456 Quota exceeded.<br> The character limit has been reached"));
                errorstate = "Error 456";
            }
            else if (error[2] == '503') {
                messageBox("warning", "Dienst niet beschikbaar");
                errorstate = "Error 503";
            }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //messageBox("warning", "There has been an error<br>"+ data.message);
               // alert("Error message: " + error[1]);
                console.debug("Error:",error)
                errorstate = "Error " + error[1];
            }
            return errorstate
        });
}

