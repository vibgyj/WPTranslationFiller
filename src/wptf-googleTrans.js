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
async function googleTranslate(original, destlang, e, apikey, preverbs, rowId, transtype, plural_line, locale, convertToLower) {
    var trntype;
    let originalPreProcessed = preProcessOriginal(original, preverbs, "google");
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
    let result = await getTransGoogle(e, destlang, apikey, requestBody, original, originalPreProcessed, rowId, transtype, plural_line, locale, convertToLower);
    return errorstate;
}

async function getTransGoogle(record, language, apikey, requestBody, original, originalPreProcessed, rowId, transtype, plural_line, locale, convertToLower) {
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
                translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "google", convertToLower);
                processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
            }
        })
        .catch(error => {
            //console.debug("error:",error)
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

// PSS 04-03-2021 Completely rewritten the processPlaceholderSpace function, because wrong replacements were made when removing blanks
function processPlaceholderSpaces(originalPreProcessed, translatedText) {
    if (originalPreProcessed == "") {
        console.debug("preprocessed empty");
    }
    //console.debug("processPlaceholderSpaces not translated", originalPreProcessed);
    //console.debug("processPlaceholderSpaces translated", translatedText);

    var placedictorg = {};
    var placedicttrans = {};
    var found = 0;
    var counter = 0;
    while (counter < 20) {
        // PSS 03-03-2021 find if the placeholder is present and at which position
        found = originalPreProcessed.search("[" + counter + "]");
        // console.debug("processPlaceholderSpaces found start:", found, " ", "[" + counter + "]");
        if (found == -1) {
            break;
        }
        // PSS if at beginning of the line we cannot have a blank before
        if (found == 1) {
            part = originalPreProcessed.substring(found - 1, found + 3);
            placedictorg[counter] = part;
        }
        else if (found == (originalPreProcessed.length) - 3) {
            // PSS if at end of line it is possible that no blank is behind
            // console.debug("found at end of line!!", found);
            part = originalPreProcessed.substring(found - 2, found + 2);
            placedictorg[counter] = part;
        }
        else {
            // PSS we are in the middle
            part = originalPreProcessed.substring(found - 2, found + 3);
            placedictorg[counter] = part;
        }
        //console.debug("processPlaceholderSpaces at matching in original line:", '"' + part + '"');
        counter++;
    }
    var lengteorg = Object.keys(placedictorg).length;
    if (lengteorg > 0) {
        counter = 0;
        while (counter < 20) {
            found = translatedText.search("[" + counter + "]");
            //console.debug("processPlaceholderSpaces found in translatedText start:", found, " ", "[" + counter + "]");
            if (found == -1) {
                break;
            }
            // PSS if at beginning of the line we cannot have a blank before       
            if (found == 1) {
                part = translatedText.substring(found - 1, found + 3);
                placedicttrans[counter] = part;
            }
            else if (found == (translatedText.length) - 3) {
                // PSS if at end of line it is possible that no blank is behind
                //console.debug("found at end of line!!", found);
                // 24-03-2021 find typo was placedictorg instead of placedicttrans
                part = translatedText.substring(found - 2, found + 2);
                //console.debug('found string at end of line:',part);
                placedicttrans[counter] = part;
            }
            else {
                // PSS we are in the middle	
                part = translatedText.substring(found - 2, found + 3);
                placedicttrans[counter] = part;
            }
            //console.debug("processPlaceholderSpaces at matching in translated line:", '"' + part + '"');
            counter++;
        }
        counter = 0;
        // PSS here we loop through the found placeholders to check if a blank is not present or to much
        while (counter < (Object.keys(placedicttrans).length)) {
            orgval = placedictorg[counter];
            let transval = placedicttrans[counter];
            if (placedictorg[counter] == placedicttrans[counter]) {
                //console.debug('processPlaceholderSpaces values are equal!');
            }
            else {
                // console.debug('processPlaceholderSpaces values are not equal!:', '"' + placedictorg[counter] + '"', " " + '"' + placedicttrans[counter] + '"');
                // console.debug('orgval', '"' + orgval + '"');
                if (typeof orgval != "undefined") {
                    if (orgval.startsWith(" ")) {
                        // console.debug("processPlaceholderSpaces in org blank before!!!");
                        if (!(transval.startsWith(" "))) {
                            // 24-03-2021 PSS found another problem when the placeholder is at the start of the line
                            found = translatedText.search("[" + counter + "]");
                            // console.debug('processPlaceholderSpaces found at :', found);
                            if (found != 1) {
                                // console.debug("processPlaceholderSpaces in trans no blank before!!!");
                                repl = transval.substr(0, 1) + " " + transval.substr(1,);
                                translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            }
                        }
                    }
                    else {
                        transval = placedicttrans[counter];
                        repl = transval.substr(1,);
                        // console.debug("processPlaceholderSpaces no blank before in org!");
                        if (transval.startsWith(" ")) {
                            //  console.debug("processPlaceholderSpaces apparently blank in front in trans!!!");
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            // console.debug("processPlaceholderSpaces blank in front removed in trans", translatedText);
                        }

                    }
                    if (!(orgval.endsWith(" "))) {
                        //console.debug("processPlaceholderSpaces apparently in org no blank behind!!!");
                        // console.debug('processPlaceholderSpaces values are not equal!:', '"' + orgval + '"', " ", '"' + transval + '"');
                        if (transval.endsWith(" ")) {
                            // console.debug("processPlaceholderSpaces in trans blank behind!!!");
                            //console.debug('processPlaceholderSpaces values are not equal!:', orgval, transval);
                            // 11-03 PSS changed this to prevent removing the blank if the translated is not at the end of the line
                            // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                            found = translatedText.search("[" + counter + "]");
                            //23-03-2021 PSS added another improvement to the end of the line 
                            foundorg = originalPreProcessed.search("[" + counter + "]");
                            //  console.debug('found at:', found);
                            if (found != (originalPreProcessed.length) - 2) {
                                //if (foundorg===found){
                                repl = transval.substring(0, transval.length - 1);
                                translatedText = translatedText.replaceAt(translatedText, transval, repl);
                                //  console.debug("processPlaceholderSpaces blank in behind removed in trans", translatedText);
                                //}
                            }
                            else {
                                repl = transval.substring(0, transval.length) + " ";
                                translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            }
                        }
                    }
                }
                else {
                    if (!(transval.endsWith(" "))) {
                        // console.debug("processPlaceholderSpaces no blank behind!!!");
                        // 11-03-2021 PSS changed this to prevent removing a blank when at end of line in trans
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        //  console.debug("found at:", found);
                        //  console.debug("length of line:", translatedText.length);
                        if (found != (translatedText.length) - 2) {
                            // console.debug("found at end of line:", found);
                            repl = transval.substring(0, transval.length - 1) + " " + transval.substring(transval.length - 1,);
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                        else {
                            repl = transval.substring(0, transval.length) + " ";
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
            }
            counter++;
        }
    }
    else {
        //console.debug("processPlaceholderBlank no placeholders found",translatedText);
        return translatedText;
    }
    return translatedText;
}