// JavaScript source code

async function spellcheck_page(LtKey, LtUser, LtLang) {
    var replaced = false;
    var row;
    var newrowId;
    var myrow;
    var transtype;
    var toTranslate;
    var found_verbs = [];
    const countfound = 0
    var myresult;
    var timeout = 50;
    var replaced = false;
    var translatedText = "";
    var repl_verb = "";
    var countrows = 0;
    var result;
    var countreplaced = 0;
    var checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
    checkButton.innerText = "Checking";
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (checkButton.className == "check_translation-button") {
        checkButton.className += " started";
    }
    else {
        // console.debug("checkbutton2:", typeof checkButton)
        if (typeof checkbutton != null) {
            checkButton.classList.remove("check_translation-button", "started", "translated");
            checkButton.classList.remove("check_translation-button", "restarted", "translated");
            checkButton.className = "check_translation-button restarted";
        }
        else {
            checkButton.className = "check_translation-button started"
        }
    }
    // We need to know the amount of rows to show the finished message at the end of the process
    var table = document.getElementById("translations");
    var tr = table.rows;
    var tbodyRowCount = table.tBodies[0].rows.length;
       
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        setTimeout((timeout) => {
            found_verbs = [];
            countrows++;
            replaced = false;
            let original = e.querySelector("span.original-raw").innerText;

            let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
            row = rowfound.split("-")[1];
            let newrow = rowfound.split("-")[2];
            if (typeof newrow != "undefined") {
                newrowId = row.concat("-", newrow);
                row = newrowId;
            }
            else {
                rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
                row = rowfound.split("_")[1];
            }
            let spanmissing = document.querySelector(`#preview-${row} span.missing`);
            // If the page does not contain translations, we do not need to handle them
            //console.debug("spanmissing:",spanmissing)
            if (spanmissing == null) {
                // 30-08-2021 PSS fix for issue # 125
                let precomment = e.querySelector(".source-details__comment p");
                if (precomment != null) {
                    comment = precomment.innerText;
                    comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                    toTranslate =  checkComments(comment.trim());
                }
                else {
                    toTranslate = true;
                }
                if (toTranslate == true) {
                    // Check if it is a plural
                    // If in the original field "Singular is present we have a plural translation                
                    var pluralpresent = document.querySelector(`#preview-${row} .translation.foreign-text li:nth-of-type(1) span.translation-text`);
                    if (pluralpresent != null) {
                        transtype = "plural";
                    }
                    else {
                        transtype = "single";
                    }
                    // Fetch the translations
                    // let element = e.querySelector(".source-details__comment");
                    //  let textareaElem = e.querySelector("textarea.foreign-text");
                    // if (transtype == "single") {
                    //     translatedText = textareaElem.innerText;
                    // }

                    if (transtype == "single") {
                        // Fetch the translations
                        let element = e.querySelector(".source-details__comment");
                        let textareaElem = e.querySelector("textarea.foreign-text");
                        translatedText = textareaElem.innerText;
                        // Enhencement issue #123
                        previewNewText = textareaElem.innerText;
                        // Need to replace the existing html before replacing the verbs! issue #124
                        // previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        spell_result = spellcheck_entry(translatedText, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, LtKey, LtUser, LtLang)
                        if (replaced) {
                                repl_verb = result.repl_verb;
                                // 09-09-2022 PSS fix for issue #244
                                if (currec != null) {
                                    var current = currec.querySelector("span.panel-header__bubble");
                                    var prevstate = current.innerText;
                                    //current.innerText = "transFill";
                                }
                            }
                        }
                    }
                    else {
                        // plural line 1
                        let previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(1) span.translation-text");
                        previewNewText = previewElem.innerText;
                        translatedText = previewElem.innerText;
                        //console.debug("plural1 found:",previewElem,translatedText);
                        spellcheck_entry(translatedText, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText)
                       // result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced, original, countrows);
                       // previewNewText = result.previewNewText;
                      //  translatedText = result.translatedText;
                      //  countreplaced = 1;
                      //  countreplaced = result.countreplaced;
                      //  replaced = result.replaced;
                        orgText = previewNewText;
                        replaced = false;
                        if (replaced) {
                            previewElem.innerText = previewNewText;
                            let g = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                            // if current translation we need to split the rownumber
                            let newrowId = row.split("-")[0];
                            textareaElem1 = g.querySelector("textarea#translation_" + newrowId + "_0");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // Highlight all keywords found in the page, so loop through the replacement array
                            markElements(previewElem, replaceVerb, orgText);
                        }
                        // plural line 2
                        previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(2) span.translation-text");
                        //console.debug("plural2:", previewNewText, translatedText);
                        if (previewElem != null) {
                            previewNewText = previewElem.innerText;
                            translatedText = previewElem.innerText;
                            result = spellcheck_entry(translatedText)
                           // result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced, original, countrows);

                          //  previewNewText = result.previewNewText;
                          //  translatedText = result.translatedText;
                          //  countreplaced = result.countreplaced;
                           // countreplaced = 1;
                            replaced = false;
                            replaced = result.replaced;
                            if (replaced) {
                                // PSS fix for #188 label Transfill needs to be set
                                let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                                if (currec != null) {
                                    var current = currec.querySelector("span.panel-header__bubble");
                                    var prevstate = current.innerText;
                                    //current.innerText = "transFill";
                                }
                                previewElem.innerText = previewNewText;
                                let f = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                                // if current translation we need to split the rownumber
                                let rowId = row.split("-")[0];
                                textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                                if (textareaElem1 != null) {
                                    textareaElem1.innerText = translatedText;
                                    textareaElem1.value = translatedText;
                                    markElements(previewElem, replaceVerb, orgText);
                                }
                            }
                        }
                    }
                    if (replaced) {
                        // Only update the style if verbs are replaced!!
                        let wordCount = countreplaced;
                        let percent = 10;
                        let toolTip = "";
                        result = { wordCount, percent, toolTip };
                        updateStyle(textareaElem, result, "", true, false, false, row);
                    }
            }
            // tbodyRowCount includes also the editor rows, so we need to devide by "2"
            if (countrows == ((tbodyRowCount / 2) - 1)) {
                // Translation replacement completed
                checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
                checkButton.classList.remove("started");
                checkButton.className += " translated";
                checkButton.innerText = "Checked";
                checkButton.className += " ready";
                messageBox("info", "Check spelling done ");
            }
        }, timeout);
        timeout += 50;
    }
  }


function spellcheck_entry(translation, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, LtKey, LtUser, LtLang) {
    var spellcheck_verb;
    var response;
    var repl_verb;
    const update = {
        text: 'fout',
        language :'nl-NL',
        username: 'peter@psmits.com',
        apiKey: 'XX',
        enabledOnly : 'false'
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
    };
    
    // We need to convert the text to Utf8 otherwise the API does not accept it!!
    let text = encodeURI(translation);
    let link = 'https://api.languagetoolplus.com/v2/check?text=' + text+ '&language=' + LtLang + '&username=' + LtUser + '&apiKey=' + LtKey + '&enabledOnly=false'
    response = fetch(link, {
        method: 'POST',
        mode: 'cors',
        credentials: "same-origin"
        })
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("response:", isJson, response)

            //data = isJson && await response.json();
           // console.debug("Response:", data);
            // check for error response
            if (!response.ok) {
                replaced=false
                // get error message from body or default to response status
                console.debug("data:", response.status)
                if (typeof data != "undefined") {
                    error = [data, error, response.status];
                }
                else {
                    let message = 'NoData';
                    data = "noData";
                    error = [ message, response.status];
                }
                return Promise.reject(error);
            }
            else {
                //We do have a result so process it
                // console.debug('result:', data);
                if (typeof data.matches[0] != 'undefined') {
                    // The matches is an array and can have multiple entries
                    for (var i = 0; i < data.matches.length; i++) {
                        let replacements = data.matches[i].replacements;
                        if (typeof (replacements) != 'undefined') {
                                 // console.debug("replacements:", replacements)
                                 //console.debug("context offset:", data.matches[0].context.offset)
                                 // console.debug("context length:", data.matches[0].context.length)
                                 // console.debug("context length:", data.matches[0].context.text)
                                 spellcheck_verb = data.matches[i].context.text.substr(data.matches[i].context.offset, data.matches[i].context.length)
                                 if (spellcheck_verb == "  ") {
                                     spellcheck_verb = "[]";
                                 } 
                                 found_verbs.push([spellcheck_verb, spellcheck_verb]);
                                 countfound++;
                                 replaced = true
                                 entry_res = await process_result(found_verbs, replaced, countfound, e, newrowId, currec, previewNewText)
                                 //console.debug("res:", entry_res)
                         }
                    }

                }
                //else {console.debug("We did not find an error!") };
               // translatedText = data.translations[0].text; 
                }
            
        })
        .catch(error => {
            if (error[2] == "400") {
                alert("Error 400 NoData.")
            errorstate = '<br>We did not get data<br>';
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
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456";
            }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //alert("Error message: " + error[1]);
                console.debug("Error:", error)
                errorstate = "Error " + error[1];
            }
        });
}

function process_result(found_verbs, replaced, countfound, e, newrowId,currec, orgText) {
    //console.debug("foundverbs:", found_verbs, countfound)
    repl_verb = found_verbs;
    if (replaced) {
        //console.debug("We have found errors")
        if (currec != null) {
            var current = currec.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
           // current.innerText = "transFill";
        }
        let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
        let row = rowfound.split("-")[1];
        let myrow = row;
        let newrow = rowfound.split("-")[2];
        if (newrow != "undefined") {
            newrowId = row.concat("-", newrow);
            row = newrowId;
        }
        let preview = document.querySelector("#preview-" + newrowId + " td.translation");
         if (preview == null) {
            preview = document.querySelector("#preview-" + myrow + " td.translation");
         }
        // PSS we need to remove the current span, as the mark function adds one again
        // PSS fix for issue #157
        let span = document.querySelector("#preview-" + newrowId + " td.translation span.translation-text");
        if (span == null) {
            span = document.querySelector("#preview-" + myrow + " td.translation span.translation-text");
        }
        if (span != null) {
            //span.remove();
        }
        // Enhancement issue #123
        var myspan1 = document.createElement("span");
        myspan1.className = "translation-text";
        preview = document.querySelector("#preview-" + newrowId + " td.translation");
        if (preview == null) {
            preview = document.querySelector("#preview-" + myrow + " td.translation");
        }
        // if there is no preview for the plural, we do not need to populate it
        //if (preview != null) {
         //   preview.appendChild(myspan1);
         //   myspan1.appendChild(document.createTextNode(previewNewText));

            // PSS populate the preview before marking
           // preview.innerText = DOMPurify.sanitize(previewNewText);
           // console.debug("OrgText:", orgText)
          //  console.debug("preview:", preview)
          //  console.debug("found_verbs:", found_verbs)
        
            if (typeof preview != "undefined") {
                markElements(preview, found_verbs, orgText);
            }
        //}

    }
    
}