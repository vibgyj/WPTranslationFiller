/**
 * This file includes all functions for translating with the google API
 * It depends on commonTranslate for additional translation functions
 */

var result="";
var res = "";

function googleTranslate(original, destlang, e, apikey, preverbs, rowId, transtype, plural_line) {
    var trntype;
    let originalPreProcessed = preProcessOriginal(original, preverbs,"google");
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
    translatedText=sendAPIRequest(e, destlang, apikey, requestBody, original, originalPreProcessed,rowId,transtype,plural_line);
}


function sendAPIRequest(record, language, apikey, requestBody, original, originalPreProcessed,rowId,transtype,plural_line) {
    //console.debug("sendAPIRequest original_line Google:", originalPreProcessed);
    var row = "";
    var translatedText = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var preview = "";
    var spanmissing = "";
    var previewElem = "";
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var responseObj = JSON.parse(this.responseText);
            translatedText = responseObj.data.translations[0].translatedText;
            //console.debug("sendAPIRequest result before postProces:", translatedText);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "google");
            //console.debug("sendAPIRequest translatedText after postProces:", translatedText);
            //console.debug("sendAPIRequest transtype:", transtype);
            if (transtype == "single") {
              // console.debug("sendAPIRequest single:");
                textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                current.innerText = "transFill";
                current.value = "transFill";
                // PSS 29-03-2021 Added populating the value of the property to retranslate            
                textareaElem.value = translatedText;
                //PSS 25-03-2021 Fixed problem with description box issue #13
                textareaElem.style.height = "auto";
                textareaElem.style.height = textareaElem.scrollHeight + "px";
                preview = document.querySelector("#preview-" + rowId + " td.translation");
                //console.debug("is pure single:", preview.innerText);
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
                // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != "null" && current == "current" && current == "waiting") {
                    row = rowId.split("-")[0];
                    //console.debug("rowId plural:", row)
                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_0");
                    //textareaElem1.innerText = translatedText;
                    //textareaElem1.value = translatedText;
                    //console.debug("existing plural text:", translatedText);
                }
                else {
                    //console.debug("Google plural_line in plural:", plural_line, rowId, translatedText);
                    let newrow = rowId.split("-")[1];
                    if (typeof newrow == "undefined") {
                        //console.debug("newrow = undefined!");
                        //console.debug("plural_line:", plural_line);
                        preview = document.querySelector("#preview-" + rowId + " td.translation");
                        spanmissing = preview.querySelector(" span.missing");
                        if (spanmissing != null) {
                            spanmissing.remove();
                        }
                        if (transtype != "single") {
                            previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                            if (previewElem == null) {
                                ul = document.createElement("ul");
                                preview.appendChild(ul);
                                var li1 = document.createElement("li");
                                li1.style.cssText = "text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;";
                                ul.appendChild(li1);
                                var small = document.createElement("small");
                                li1.appendChild(small);
                                small.appendChild(document.createTextNode("Singular:"));
                                var br = document.createElement("br");
                                li1.appendChild(br);
                                var myspan1 = document.createElement("span");
                                myspan1.className = "translation-text";
                                li1.appendChild(myspan1);
                                myspan1.appendChild(document.createTextNode("empty"));
                                // Also create the second li
                                var li2 = document.createElement("li");
                                ul.appendChild(li2);
                                var small = document.createElement("small");
                                li2.appendChild(small);
                                small.appendChild(document.createTextNode("Plural:"));
                                var br = document.createElement("br");
                                li2.appendChild(br);
                                var myspan2 = document.createElement("span");
                                myspan2.className = "translation-text";
                                li2.appendChild(myspan2);
                                myspan2.appendChild(document.createTextNode("empty"));
                            }
                        }
                        if (plural_line == 1) {
                            //populate plural line if not already translated, so we can take original rowId!
                            console.debug("singular updatet:", translatedText);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_0");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            //PSS 25-03-2021 Fixed problem with description box issue #13
                            textareaElem1.style.height = "auto";
                            textareaElem1.style.height = textareaElem1.scrollHeight + "px";
                            // Select the first li
                            previewElem = document.querySelector("#preview-" + rowId + " li:nth-of-type(1) .translation-text");
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        if (plural_line == 2) {
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
                            //console.debug("Existing record plural_line 1:", translatedText);
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        else {
                            //populate plural line if  already translated
                            textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
                            //console.debug("newrow = not undefined!", row + "_1");
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
                validateEntry(language, textareaElem1, "", "", rowId);
                //console.debug("Validate entry textareaElem1")
            }
            //14-09-2021 PSS changed the class to meet GlotDict behavior
            var currentClass = document.querySelector(`#editor-${rowId}`);
            var prevcurrentClass = document.querySelector(`#preview-${rowId}`);
            currentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            currentClass.classList.add("untranslated", "priority-normal", "no-warnings", "has-translations");
            prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            prevcurrentClass.classList.add("untranslated", "priority-normal", "no-warnings", "has-translations");
        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            if (this.readyState == 4 && this.status == 400) {
                alert("Error in translation received status 400, maybe a license problem\n\nClick on OK until all records are processed!!!");
            }
        }
    };
    xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify(requestBody));
}

// PSS 01-30-2021 added this to prevent wrong replacement of searches
String.prototype.replaceAt = function (str, word, newWord) {
    //console.debug("replaceAt:", '"' + word + '"');
    //console.debug("replaceAt:", '"' + newWord + '"');
    if (word[0] === word[0].toUpperCase()) {
        newWord = newWord[0].toUpperCase() + newWord.slice(1);
    }
   // console.debug("replaceAt:", str.replace(word, newWord));
    return str.replace(word, newWord);
};

// PSS 04-03-2021 Completely rewritten the processPlaceholderSpace function, because wrong replacements were made when removing blanks
function processPlaceholderSpaces(originalPreProcessed, translatedText) {
    if (originalPreProcessed === "") {
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
        if (found === -1) {
            break;
        }
            // PSS if at beginning of the line we cannot have a blank before
            if (found === 1) {
                part = originalPreProcessed.substring(found - 1, found + 3);
                placedictorg[counter] = part;
            }
            else if (found === (originalPreProcessed.length) - 3) {
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
            if (found === -1) {
                break;
                }
               // PSS if at beginning of the line we cannot have a blank before       
                if (found === 1) {
                    part = translatedText.substring(found - 1, found + 3);
                    placedicttrans[counter] = part;
                }
                else if (found === (translatedText.length) - 3) {
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
            if (placedictorg[counter] === placedicttrans[counter]) {
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


