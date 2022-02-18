/**
 * This file includes all functions for translating with the Microsoft API
 * It depends on commonTranslate for additional translation functions
 */

var textareaElem = "";
var preview = "";
var translatedText = "";
var trntype = "";
async function microsoftTranslate(original, destlang, e, apikeyMicrosoft, preverbs, rowId, transtype, plural_line, locale, convertToLower) {
    var originalPreProcessed = preProcessOriginal(original, preverbs, "microsoft");
    //console.debug("microsoftTranslate result of preProcessOriginal:", originalPreProcessed);
    //var myRe = |(\</?([a-zA-Z]+[1-6]?)(\s[^>]*)?(\s?/)?\>|)/gm;
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        trntype = "plain";
    }
    else {
        trntype = "html";
    }
    let result = await getTransMicrosoft(e, destlang, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line, locale, convertToLower);
    return errorstate;
}

async function getTransMicrosoft(record, language, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line, locale, convertToLower) {
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
    var message;
    var link;

    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    let requestBody = [
        {
            "text": originalPreProcessed,
        }
    ];

    const myHeaders = new Headers({
        "Content-Type": "application/json; charset=UTF-8",
        "Ocp-Apim-Subscription-Key": apikeyMicrosoft,
    });

    myBody = JSON.stringify(requestBody);
    link = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&textType=" + trntype + "&from=en&to=" + language
    const response = fetch(link, {
        method: 'POST',
        headers: myHeaders,
        body: myBody
    })
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status 
                //console.debug("data:", data, this.response,response.error)
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
               
                translatedText = data[0].translations[0].text;
                //console.debug("translated text:", translatedText);
                // Currently for postProcessTranslation  "deepl" is set, this might need to be changed!!!
                translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower);
                //console.debug("sendAPIRequest translatedText after postProces:", translatedText);
                if (transtype == "single") {
                    // console.debug("sendAPIRequest single:");
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
                    // console.debug("is pure single:", preview.innerText);
                    preview.innerText = translatedText;
                    validateEntry(language, textareaElem, "", "", rowId);
                    // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                    select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
                    //select = next_editor.getElementsByClassName("meta");
                    var status = select.querySelector("dt").nextElementSibling;
                    //console.debug("bulksave status1:", select, status, rowId);
                    status.innerText = "transFill";
                }
                else {
                    //console.debug("sendAPIRequest plural_line:", plural_line);
                    // PSS 09-04-2021 added populating plural text
                    // PSS 09-07-2021 additional fix for issue #102 plural not updated
                    if (current != "null" && current == "current" && current == "waiting") {
                        row = rowId.split("-")[0];
                        textareaElem1 = f.querySelector("textarea#translation_" + row + "_0");
                        //textareaElem1.innerText = translatedText;
                        //textareaElem1.value = translatedText;
                    }
                    else {
                        let newrow = rowId.split("-")[1];
                        if (typeof newrow == "undefined") {
                            if (transtype != "single") {
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                                if (previewElem == null) {
                                    check_span_missing(rowId, plural_line);
                                }
                            }
                            if (plural_line == 1) {
                                //populate plural line if not already translated, so we can take original rowId!
                                //console.debug("singular updatet:", translatedText);
                                textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_0");
                                //console.debug("textareaElem1:", textareaElem1);
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                //PSS 25-03-2021 Fixed problem with description box issue #13
                                textareaElem1.style.height = 'auto';
                                textareaElem1.style.height = textareaElem1.scrollHeight + 'px';
                                // Select the first li
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                                //console.debug("prevElem:", previewElem);
                                if (previewElem != null) {
                                    previewElem.innerText = translatedText;
                                }
                            }
                            if (plural_line == 2) {
                                //console.debug("deepl row: ", rowId, transtype, plural_line);
                                //if (typeof translatedText != undefined) {
                                //console.debug("plural updatet:", translatedText);
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
                            //console.debug("newrow = not undefined!", newrow);
                            let row = rowId.split("-")[0];
                            if (plural_line == 1) {
                                //populate singular line if already translated
                                textareaElem1 = record.querySelector("textarea#translation_" + row + "_0");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                                // console.debug("Existing record plural_line 1:", translatedText);
                                if (previewElem != null) {
                                    previewElem.innerText = translatedText;
                                }
                            }
                            else {
                                //populate plural line if  already translated
                                textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
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
            }
        })
        .catch(error => {
            if (error[2] == '401') {
                //alert("Error in translation received status 401, Credentials are not valid!");
                errorstate = "Error 401";
            }
            else if (error[2] == "400") {
               // alert("Error in translation received status 400, One of the request inputs is not valid!");
                errorstate = "Error 400";
            }
            else if (error[2] == "403") {
               // //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
              //  alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else {
               // alert("Error message: " + error);
                errorstate = "Error" + error;
            }
        });
    return response;
}