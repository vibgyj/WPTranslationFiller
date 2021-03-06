// This array is used to replace wrong words in translation
// PSS version 04-03-2021
let replaceVerb = [];

function setPostTranslationReplace(postTranslationReplace) {
    replaceVerb = [];
    let lines = postTranslationReplace.split('\n');
    lines.forEach(function (item) {
        // Handle blank lines
        if (item != "") {
            replaceVerb.push(item.split(','));
        }
    });
}

function translatePage(apikey, destlang, postTranslationReplace, formal) {
    setPostTranslationReplace(postTranslationReplace);

    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        original = googleTranslate(original, destlang, e, apikey, formal);
    }

    // Translation completed
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    translateButton.className += " translated";
}

function translateEntry(rowId, apikey, destlang, postTranslationReplace, formal) {
    setPostTranslationReplace(postTranslationReplace);

    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    let original = e.querySelector("span.original-raw").innerText;
    googleTranslate(original, destlang, e, apikey, formal);

    // Translation completed
    let translateButton = document.querySelector(`#translate-${rowId}`);
    translateButton.className += " translated";
}

function googleTranslate(original, destlang, e, apikey, formal) {
    let originalPreProcessed = preProcessOriginal(original, formal);

    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    // console.log("Contains html.",myArray);

    if (myArray == null) {
        transtype = "text";
    }
    else {
        transtype = "html";
    }
    console.log("format type", transtype);

    let requestBody = {
        "q": originalPreProcessed,
        "source": "en",
        "target": destlang,
        "format": transtype
    };
    console.log("request body", requestBody);
    //sendAPIRequest(e, destlang, apikey, requestBody, original);

    sendAPIRequest(e, destlang, apikey, requestBody, original, originalPreProcessed);
}

function sendAPIRequest(e, language, apikey, requestBody, original, originalPreProcessed) {
    console.debug('sendAPIreQuest original_line:', originalPreProcessed);
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let responseObj = JSON.parse(this.responseText);
            let translatedText = responseObj.data.translations[0].translatedText;
            console.debug("sendAPIrequest Translated text: ", translatedText);

            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed);
            // translatedText = processPlaceholderSpaces(original, translatedText);

            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            validateEntry(language, textareaElem);
        }
        //PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            if (this.readyState == 4 && this.status == 400) {
                alert("Error in translation received status 400, maybe a license problem");
            }
        }
    };
    xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify(requestBody));
}

// PSS 01-30-2021 added this to prevent wrong replacement of searches
String.prototype.replaceAt = function (str, word, newWord) {
    console.log("replaceAt:", '"' + word + '"');
    console.log("replaceAt:", '"' + newWord + '"');
    if (word[0] === word[0].toUpperCase()) {
        newWord = newWord[0].toUpperCase() + newWord.slice(1)
    }
    console.log("replaceAt:", str.replace(word, newWord));
    return str.replace(word, newWord)
}

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

const placeHolderRegex = /%(\d{1,6}\$)?[sdl]{1}|&#\d{1,6};|&\w{1,6};|%\w*%/gi;

function preProcessOriginal(original, formal) {
    const pattern = new RegExp(placeHolderRegex);
    const matches = original.matchAll(pattern);
    let index = 0;
    for (const match of matches) {
        original = original.replace(match[0], `[${index}]`);

        index++;
    }
    if (formal) {
        original = original.replace('Your ', 'Je ');
        original = original.replace(' your ', ' je ');
        original = original.replace('You ', 'Je ');
        original = original.replace(' you ', ' je ');
    }
    console.log("After pre-processing:", original);
    console.log('preProcessOriginal use_formal:', formal);

    return original;
}


function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed) {
    console.debug('postProcess before spaces original', original);
    console.debug('postProcess before spaces translated', translatedText);
    console.debug('postProcess before spaces translated', originalPreProcessed);
    // PSS 04-03-2021 moved the processPlaceholderSpaces up because now the raw string with placeholders is used
    translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);
    console.debug('postProcess after removeSpaces', translatedText);
    // This section replaces the placeholders so they become html entities

    //const tocheck = /%(\d{1,6}\$)?[sdl]{1}|&#\d{1,6};{1,2}|&\w{1,6};/gi;
    // PSS 04-03-2021 new regex because the % was missed, also not used the general variable for it
    // This can be put back if everything is stabilised
    const tocheck = /%(\d{1,6}\$)?[sdl]{1}|&#\d{1,6};|&\w{1,6};|%\w*%/gi;
    console.debug('postProcess pattern:', tocheck);
    const pattern = new RegExp(tocheck);

    const matches = original.matchAll(pattern);
    console.debug('postProcess matches result', matches);
    let index = 0;
    for (const match of matches) {
        translatedText = translatedText.replaceAll(`[${index}]`, match[0]);
        console.debug('postProcess matches found :', match[0]);
        index++;
    }

    console.debug('postProcess after replacing placeholders', translatedText, 'length of index:', index);
    // replverb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
    }

    console.debug('postProcess after replacing verbs :', translatedText);

    // Make translation to start with same case (upper/lower) as the original.
    if (isStartsWithUpperCase(original)) {
        if (!isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toUpperCase() + translatedText.slice(1);
            console.debug('Applied upper case: ', translatedText);
        }
    }
    else {
        if (isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toLowerCase() + translatedText.slice(1);
            console.debug('Applied lower case: ', translatedText);
        }
    }

    return translatedText;
}

// PSS 04-03-2021 Completely rewritten the processPlaceholderSpace function, because wrong replacements were made when removing blanks
function processPlaceholderSpaces(originalPreProcessed, translatedText) {
    if (originalPreProcessed === "") {
        console.debug('preprocessed empty');
    }
    console.debug("processPlaceholderSpaces not translated", originalPreProcessed);
    console.debug("processPlaceholderSpacesk translated", translatedText);

    var placedictorg = {};
    var placedicttrans = {};
    var found = 0;
    var counter = 0;
    while (counter < 20) {
        // PSS 03-03-2021 find if the placeholder is present and at which position
        found = originalPreProcessed.search("[" + counter + "]");
        console.debug('processPlaceholderSpaces found start:', found, " ", '[' + counter + ']');
        if (found === -1) {
            break;
        }
        else {
            // PSS if at beginning of the line we cannot have a blank before
            if (found === 1) {
                part = originalPreProcessed.substring(found - 1, found + 3);
                placedictorg[counter] = part;
            }
            else if (found === (originalPreProcessed.length) - 3) {
                // PSS if at end of line it is possible that no blank is behind
                console.debug('found at end of line!!', found);
                part = originalPreProcessed.substring(found - 2, found + 2);
                placedictorg[counter] = part;
            }
            else {
                // PSS we are in the middle
                part = originalPreProcessed.substring(found - 2, found + 3);
                placedictorg[counter] = part;
            }
            console.debug("processPlaceholderSpaces at matching in original line:", '"' + part + '"');
        }
        counter++;
    }
    var lengteorg = Object.keys(placedictorg).length;
    if (lengteorg > 0) {
        counter = 0;
        while (counter < 20) {
            found = translatedText.search("[" + counter + "]");
            console.debug('processPlaceholderSpaces found in translatedText start:', found, " ", '[' + counter + ']');
            if (found === -1) {
                break;
            }
            else {
                // PSS if at beginning of the line we cannot have a blank before
                if (found === 1) {
                    part = translatedText.substring(found - 1, found + 3);
                    placedicttrans[counter] = part;
                }
                else if (found === (translatedText.length) - 3) {
                    // PSS if at end of line it is possible that no blank is behind
                    console.debug('found at end of line!!', found);
                    part = originalPreProcessed.substring(found - 2, found + 2);
                    placedictorg[counter] = part;
                }
                else {
                    // PSS we are in the middle	
                    part = translatedText.substring(found - 2, found + 3);
                    placedicttrans[counter] = part;
                }
                console.debug("processPlaceholderSpaces at matching in translated line:", '"' + part + '"');
            }
            counter++;
        }
        counter = 0;
        // PSS here we loop through the found placeholders to check if a blank is not present or to much
        while (counter < (Object.keys(placedicttrans).length)) {
            console.debug("processPlaceholderSpaces found it in original:", counter, '"' + placedictorg[counter] + '"');
            console.debug("processPlaceholderSpaces found it in original:", originalPreProcessed);
            console.debug("processPlaceholderSpaces found it in trans:", counter, '"' + placedicttrans[counter] + '"');
            console.debug("processPlaceholderSpaces found it in trans", translatedText);
            orgval = placedictorg[counter];
            transval = placedicttrans[counter];
            if (placedictorg[counter] === placedicttrans[counter]) {
                console.debug('processPlaceholderSpaces values are equal!');
            }
            else {
                console.debug('processPlaceholderSpaces values are not equal!:', '"' + placedictorg[counter] + '"', " " + '"' + placedicttrans[counter] + '"');
                console.debug('orgval', '"' + orgval + '"');
                if (orgval.startsWith(" ")) {
                    console.debug("processPlaceholderSpaces in org blank before!!!");
                    if (!(transval.startsWith(" "))) {
                        console.debug("processPlaceholderSpaces in trans no blank before!!!");
                        repl = transval.substr(0, 1) + " " + transval.substr(1,);
                        translatedText = translatedText.replaceAt(translatedText, transval, repl);
                    }
                }
                else {
                    transval = placedicttrans[counter];
                    repl = transval.substr(1,);
                    console.debug("processPlaceholderSpaces no blank before in org!",);
                    if (transval.startsWith(" ")) {
                        console.debug("processPlaceholderSpaces apparently blank in front in trans!!!");
                        translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        console.debug("processPlaceholderSpaces blank in front removed in trans", translatedText);
                    }

                }
                if (!(orgval.endsWith(" "))) {
                    console.debug("processPlaceholderSpaces apparently in org no blank behind!!!");
                    console.debug('processPlaceholderSpaces values are not equal!:', '"' + orgval + '"', " ", '"' + transval + '"');
                    if (transval.endsWith(" ")) {
                        console.debug("processPlaceholderSpaces in trans blank behind!!!");
                        console.debug('processPlaceholderSpaces values are not equal!:', orgval, transval);
                        repl = transval.substring(0, transval.length - 1);
                        translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        console.debug("processPlaceholderSpaces blank in behind removed in trans", translatedText);
                    }
                }
                else {
                    if (!(transval.endsWith(" "))) {
                        console.debug("processPlaceholderSpaces no blank behind!!!");
                        repl = transval.substring(0, transval.length - 1) + " " + transval.substring(transval.length - 1,);
                        translatedText = translatedText.replaceAt(translatedText, transval, repl);
                    }
                }
            }
            counter++;
        }
    }
    else {
        console.debug("processPlaceholderBlank no placeholders found");
    }
    return translatedText;
}