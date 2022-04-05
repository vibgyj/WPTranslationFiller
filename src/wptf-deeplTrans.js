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
    if (language == "RO") {
        if (DeeplFree == true ) {
            link = "https://api-free.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
        }
        else {
            link = "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
        }
    }
    else {
        if (!formal) {
            if (DeeplFree == true) {
                //console.debug("Free",DeeplFree);
                link = `https://api-free.deepl.com/v2/translate?auth_key=` + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
            }
            else {
               // console.debug("Payed");
                link = "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
            }
        }
        else {
            //console.debug("formal");
            if (DeeplFree == true) {
                link = "https://api-free.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=more&split_sentences=nonewlines"
            }
            else {
                link = "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
            }
        }
    }

    const response = fetch(link)
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("Response:", data.message);
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status
                //console.debug("data:", data, response.status)
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
                //console.debug('result:', data.translations[0].text);
                translatedText = data.translations[0].text;
                translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower);
                processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
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
            else {
                alert("Error message: " + error[1]);
                console.debug("Error:",error)
                errorstate = "Error " + error[1];
            }
        });
    //console.debug("endres:", response)
    return response;
}