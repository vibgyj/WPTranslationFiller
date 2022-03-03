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
    console.debug("Original:", originalPreProcessed)
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
                if (transtype == "single") {
                    textareaElem = record.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    // PSS 29-03-2021 Added populating the value of the property to retranslate            
                    textareaElem.value = translatedText;
                    //PSS 25-03-2021 Fixed problem with description box issue #13
                    textareaElem.style.height = "auto";
                    textareaElem.style.height = textareaElem.scrollHeight + "px";
                    current.innerText = "transFill";
                    current.value = "transFill";
                    preview = document.querySelector("#preview-" + rowId + " td.translation");
                    preview.innerText = translatedText;
                    validateEntry(language, textareaElem, "", "", rowId, locale);

                    // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                    select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
                    //select = next_editor.getElementsByClassName("meta");
                    status = select.querySelector("dt").nextElementSibling;
                    //console.debug("bulksave status1:", select, status, rowId);
                    status.innerText = "transFill";
                }
                else {
                    // PSS 09-04-2021 added populating plural text
                    // PSS 09-07-2021 additional fix for issue #102 plural not updated
                    if (current != "null" && current == "current" && current == "waiting") {
                        row = rowId.split("-")[0];
                        //console.debug('rowId plural:', row)
                        textareaElem1 = f.querySelector("textarea#translation_" + row + "_0");
                    }
                    else {
                        //check_span_missing(rowId, plural_line);
                        let newrow = rowId.split("-")[1];
                        if (typeof newrow == "undefined") {
                            if (transtype != "single") {
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                                //console.debug('not single:',rowId,plural_line)
                                if (previewElem == null) {
                                    check_span_missing(rowId, plural_line);
                                }
                            }
                            if (plural_line == 1) {
                                //populate plural line if not already translated, so we can take original rowId
                                textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_0");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                //PSS 25-03-2021 Fixed problem with description box issue #13
                                textareaElem1.style.height = 'auto';
                                textareaElem1.style.height = textareaElem1.scrollHeight + 'px';
                                // Select the first li
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                                if (previewElem != null) {
                                    previewElem.innerText = translatedText;
                                }
                            }
                            if (plural_line == 2) {
                                textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                // Select the second li
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(2) .translation-text");
                                if (previewElem != null) {
                                    previewElem.innerText = translatedText;
                                }
                            }
                        }
                        else {
                            row = rowId.split("-")[0];
                            if (plural_line == 1) {
                                //populate singular line if already translated
                                textareaElem1 = record.querySelector("textarea#translation_" + row + "_0");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                                if (previewElem != null) {
                                    previewElem.innerText = translatedText;
                                }
                            }
                            else {
                                //populate plural line if  already translated
                                textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
                                // console.debug('newrow = not undefined!', row + "_1");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(2) .translation-text");
                                if (previewElem != null) {
                                    previewElem.innerText = translatedText;
                                }
                            }
                        }
                    }
                    // The line below is necessary to update the save button on the left in the panel
                    current.innerText = "transFill";
                    current.value = "transFill";
                    validateEntry(language, textareaElem1, "", "", rowId, locale);
                    
                }
                //return response.json()
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