/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function deepLTranslate(original, destlang, record, apikeyDeepl, preverbs, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore,deeplGlossary,is_entry) {
    // First we have to preprocess the original to remove unwanted chars
    var originalPreProcessed = preProcessOriginal(original, preverbs, "deepl");
    //console.debug("original:",original,row,record)
    let result = await getTransDeepl(original, destlang, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore,deeplGlossary,is_entry);
    return errorstate;
}

async function getTransDeepl(original, language, record, apikeyDeepl, originalPreProcessed, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore,deeplGlossary,is_entry) {
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
    console.debug("Original preprocessed:", originalPreProcessed)
    language = language.toUpperCase();
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    //console.debug("glossary:",deeplGlossary)
    let DeepLignoretags = ["<p>","<ul>","<li>"]
    if (language == "RO") {
        link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
    }
    else {
        if (!formal) {
            if (deeplGlossary == null) {
                link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=less&split_sentences=nonewlines&outline_detection=0&ignore_tags=" + DeepLignoretags
            }
            else {
            link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&glossary_id=" + deeplGlossary + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=less&split_sentences=nonewlines&outline_detection=0&ignore_tags="+DeepLignoretags
            }
        }
        else {
             if (deeplGlossary == null){
                 link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=more&split_sentences=nonewlines&outline_detection=0&ignore_tags=" + DeepLignoretags
             }
             else {
                 link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&glossary_id=" + deeplGlossary + "&preserve_formatting=false&tag_handling=xml&ignore_tags=x&formality=more&&split_sentences=nonewlines&outline_detection=0&ignore_tags=" + DeepLignoretags
             }
        }
    }

    //console.debug("deepl link:",link)
    const response = await fetch(link)
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
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
                    console.debug("deepl result", translatedText)

                    translatedText =  postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower, spellCheckIgnore, locale);
                    console.debug("deepl resultaat:", translatedText, deepLcurrent,convertToLower)
                  //  console.debug("deepl preprocessed:",originalPreProcessed,record)

                    deepLresul = processTransl(original, translatedText, language, record, row, transtype, plural_line, locale, convertToLower, deepLcurrent);
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
                console.debug("glossary value is not supported")
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
                messageBox("warning", "Error 456 Quota exceeded.<br> The character limit has been reached");
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

