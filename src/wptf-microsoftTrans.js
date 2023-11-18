/**
 * This file includes all functions for translating with the Microsoft API
 * It depends on commonTranslate for additional translation functions
 */

var textareaElem = "";
var preview = "";
var translatedText = "";
var trntype = "";
async function microsoftTranslate(original, destlang, e, apikeyMicrosoft, preverbs, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore) {
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
    let result = await getTransMicrosoft(e, destlang, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
    return errorstate;
}

async function getTransMicrosoft(record, language, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line, locale, convertToLower, spellCheckIgnore) {
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
                translatedText = data[0].translations[0].text;
                translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower, spellCheckIgnore,locale);
                processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                return Promise.resolve("OK");
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