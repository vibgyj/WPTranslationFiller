// This array is used to replace wrong words in translation
// PSS version 04-03-2021
let replaceVerb = [];
// This array is used to replace verbs before translation
// It is also used to force google to translate informal
// This is done by replacing the formal word for a informal word
let replacePreVerb = [];

function setPreTranslationReplace(preTranslationReplace) {
    replacePreVerb = [];
    let lines = preTranslationReplace.split('\n');
    lines.forEach(function (item) {
        // Handle blank lines
        if (item != "") {
            replacePreVerb.push(item.split(','));
        }
    });
}

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
function pretranslate(original) {
    console.debug('Pretranslate with:', original);
    var prelines = [{ orig: 'One thought on &ldquo;%1$s&rdquo;', trans: 'Eén gedachte over &ldquo;%1$s&rdquo;' }, { orig: '%1$s thought on &ldquo;%2$s&rdquo;', trans: '%1$s gedachte over &ldquo;%2$s&rdquo;' }];
    console.debug('entry 1 :', prelines[0]);
    var result = prelines.filter(obj => obj.orig === original)[0];
    console.debug('result:', result);
    if (result != undefined) {
        console.log(result['trans']);
        transfound = result['trans'];
        console.debug('found:', transfound);
        translated = transfound;
    }
    else {
        translated = "";
    }

    return translated;
}

function checkComments(comment) {
    // PSS 09-03-2021 added check to see if we need to translate
    console.debug('checkComment started comment', comment);
    let toTranslate = false;
    switch (comment) {
        case 'Plugin Name of the plugin':
            toTranslate = false;
            break;
        case 'Author of the plugin':
            toTranslate = false;
            break;
        case 'Plugin Name of the plugin Author of the plugin':
            toTranslate = false;
            break;
        case 'Plugin URI of the plugin':
            toTranslate = false;
            break;
        case 'Author URI of the plugin':
            toTranslate = false;
            break;
        case 'Theme Name of the theme':
            toTranslate = false;
            break;
        case 'Theme Name of the plugin/theme':
            toTranslate = false;
            break;
        case 'Author of the theme':
            toTranslate = false;
            break;
        case 'Theme URI of the theme':
            toTranslate = false;
            break;
        case 'Author URI of the theme':
            toTranslate = false;
            break;
        default:
            toTranslate = true;
    }


    console.debug('before googletranslate do we need to translate:', toTranslate);
    return toTranslate;

}

function translatePage(apikey, destlang, postTranslationReplace, preTranslationReplace) {
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        // PSS 09-03-2021 added check to see if we need to translate
        //Needs to be put into a function, because now it is unnessary double code
        let toTranslate = true;
        // Check if the comment is present, if not then if will block the request for the details name etc.
        let element = e.querySelector('.source-details__comment');

        if (element != null) {
            let comment = e.querySelector('.source-details__comment p').innerText;
            comment = comment.trim();
            toTranslate = checkComments(comment);
            console.debug('comment:', comment);
            toTranslate = checkComments(comment);

        }


        console.debug('before googletranslate:', replacePreVerb);
        console.debug('before googletranslate do we need to translate:', toTranslate);

        if (toTranslate) {
            googleTranslate(original, destlang, e, apikey, replacePreVerb);
        }
        else {

            let translatedText = original;
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            console.debug('No need to translate copy the original', original);
        }
    }

    // Translation completed
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    translateButton.className += " translated";
}

function translateEntry(rowId, apikey, destlang, postTranslationReplace, preTranslationReplace) {
    console.debug('translateEntry started!');
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);

    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    console.debug('after document querySelector:', e);
    let original = e.querySelector("span.original-raw").innerText;


    //console.debug('after span querySelector:',original);
    // PSS 09-03-2021 added check to see if we need to translate
    let toTranslate = true;
    // Check if the comment is present, if not then if will block the request for the details name etc.   
    let element = e.querySelector('.source-details__comment');
    console.debug('checkComment started element', element);
    if (element != null) {
        // Fetch the comment with name
        let comment = e.querySelector('#editor-' + rowId + ' .source-details__comment p').innerText;
        toTranslate = checkComments(comment);
    }

    if (toTranslate) {
        let pretrans = pretranslate(original);
        if (pretrans === "") {
            googleTranslate(original, destlang, e, apikey, replacePreVerb);
        }
        else {
            console.debug('Pretranslated:', pretrans);
            let translatedText = pretrans;
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
        }
    }
    else {

        let translatedText = original;
        let textareaElem = e.querySelector("textarea.foreign-text");
        textareaElem.innerText = translatedText;
        console.debug('No need to translate copy the original', original);
    }

    // Translation completed
    let translateButton = document.querySelector(`#translate-${rowId}`);
    translateButton.className += " translated";
}

function googleTranslate(original, destlang, e, apikey, preverbs) {
    let originalPreProcessed = preProcessOriginal(original, preverbs);

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

            translatedText = postProcessTranslation(
                original, translatedText, replaceVerb, originalPreProcessed);
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
        newWord = newWord[0].toUpperCase() + newWord.slice(1);
    }
    console.log("replaceAt:", str.replace(word, newWord));
    return str.replace(word, newWord);
};

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

const placeHolderRegex = new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&\w{2,6};|%\w*%/gi);
function preProcessOriginal(original, preverbs) {
    // prereplverb contains the verbs to replace before translation
    for (let i = 0; i < preverbs.length; i++) {
        original = original.replaceAll(preverbs[i][0], preverbs[i][1]);
    }
    const matches = original.matchAll(placeHolderRegex);
    let index = 0;
    for (const match of matches) {
        original = original.replace(match[0], `[${index}]`);

        index++;
    }

    console.debug("After pre-processing:", original);
    return original;
}


function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed) {
    translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);

    // This section replaces the placeholders so they become html entities
    const matches = original.matchAll(placeHolderRegex);
    let index = 0;
    for (const match of matches) {
        translatedText = translatedText.replaceAll(`[${index}]`, match[0]);
        console.debug('postProcess matches found :', match[0]);
        index++;
    }

    // replverb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
    }

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
            let transval = placedicttrans[counter];
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
                    console.debug("processPlaceholderSpaces no blank before in org!");
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
                        // 11-03 PSS changed this to prevent removing the blank if the translated is not at the end of the line
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        console.debug('found at:', found);
                        if (!(found === (originalPreProcessed.length) - 2)) {
                            repl = transval.substring(0, transval.length - 1);
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            console.debug("processPlaceholderSpaces blank in behind removed in trans", translatedText);
                        }
                        else {
                            repl = transval.substring(0, transval.length) + " ";
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
                else {
                    if (!(transval.endsWith(" "))) {
                        console.debug("processPlaceholderSpaces no blank behind!!!");
                        // 11-03-2021 PSS changed this to prevent removing a blank when at end of line in trans
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        console.debug('found at:', found);
                        console.debug("length of line:", translatedText.length);
                        if (!(found === (translatedText.length) - 2)) {
                            console.debug('found at end of line:', found);
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
        console.debug("processPlaceholderBlank no placeholders found");
    }
    return translatedText;
}