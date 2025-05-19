/**
 * This file includes all functions for translating with the Microsoft API
 * It depends on commonTranslate for additional translation functions
 */
var result = "";
var res = "";
var textareaElem = "";
var preview = "";
var translatedText = "";
var trntype = "";
async function googleTranslate(original, destlang, e, apikey, preverbs, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore, deeplGlossary, is_entry) {
   // console.debug("spellcheckignore:", spellCheckIgnore)
    var trntype;
    let originalPreProcessed = preProcessOriginal(original, preverbs, "google");
    //console.debug("originalPreprocessed:", originalPreProcessed)
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        trntype = "text";
    }
    else {
        trntype = "html";
    }

    let requestBody = {
        "q": originalPreProcessed,
        "source": "en",
        "target": destlang,
        "format": trntype
    };
    let result = await getTransGoogle(e, destlang, apikey, requestBody, original, originalPreProcessed, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore, deeplGlossary, is_entry);
    return errorstate;
}

async function getTransGoogle(record, language, apikey, requestBody, original, originalPreProcessed, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore, deeplGlossary, is_entry) {
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

    const myHeaders = new Headers({
        "Content-Type": "application/json; charset=UTF-8",
    });
    myBody = JSON.stringify(requestBody);
    link = "https://translation.googleapis.com/language/translate/v2?key="+ apikey
    const response = fetch(link, {
        method: 'POST',
        headers: myHeaders,
        body: myBody
    })
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            // check for error response
            if (response.status != "200"){
                // get error message from body or default to response status 
                //console.debug("data:", data, response,data.error)
                if (typeof data != "undefined") {
                    error = [response];
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    error = [data];
                }
                return Promise.reject(error);
            }
            else {
                //We do have a result so process it
                translatedText = data.data.translations[0].translatedText;
                //console.debug("translated text:", translatedText);
                // Currently for postProcessTranslation  "deepl" is set, this might need to be changed!!!
               // console.debug("spellcheckignore:",spellCheckIgnore)
                translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "google", convertToLower, spellCheckIgnore,locale);
                processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                return Promise.resolve("OK");
            }
        })
        .catch(error => {
            console.debug("error:",error)
            if (error[0].status == '401') {
                //alert("Error in translation received status 401, Credentials are not valid!");
                errorstate = "Error 401";
            }
            else if (error[0].status == '400') {
                //alert("API key not valid. Please pass a valid API key. Errorcode: "+error[0].status);
                errorstate = "Error 400";
            }
            else if (error[0].status == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[0].status == '404') {
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
// PSS 01-30-2021 added this to prevent wrong replacement of searches
String.prototype.replaceAt = function (str, word, newWord) {
    //console.debug("replaceAt:", '"' + word + '"');
    //console.debug("replaceAt:", '"' + newWord + '"');
    if (word[0] == word[0].toUpperCase()) {
        newWord = newWord[0].toUpperCase() + newWord.slice(1);
    }
    // console.debug("replaceAt:", str.replace(word, newWord));
    return str.replace(word, newWord);
};
