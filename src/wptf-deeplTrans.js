/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */


async function deepLTranslate(original, destlang, record, apikeyDeepl, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree) {
    // First we have to preprocess the original to remove unwanted chars
    var originalPreProcessed = preProcessOriginal(original, preverbs, "deepl");
    let result = await getTransDeepl(original, destlang, record, apikeyDeepl, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree);
    return errorstate;
}


async function getTransDeepl(original, language, record, apikeyDeepl, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree) {
    var row = "";
    var translatedText = "";
    var ul = "";
    var current = "";
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
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    //console.debug("Original:", originalPreProcessed)
    language = language.toUpperCase();
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    if (language == "RO") {
        link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
    }
    else {
        if (!formal) {
            link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
        }
        else {
            link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&tag_handling=xml&ignore_tags=x&formality=more&split_sentences=nonewlines"
        }
    }
    //console.debug("deepl link:",link)
    const response = fetch(link)
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status
                if (typeof data != "undefined") {
                    error = [data, error, response.status];
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    error = [data, message, response.status];
                }
                return Promise.reject(error);
            }
            else {
                //We do have a result so process it
                translatedText = data.translations[0].text;
                translatedText = await postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower);
                processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                return Promise.resolve("OK");
               }
        })
        .catch(error => {
            if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456";
            }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //alert("Error message: " + error[1]);
                console.debug("Error:",error)
                errorstate = "Error " + error[1];
            }
        });
    //console.debug("endres:", response)
    return response;
}