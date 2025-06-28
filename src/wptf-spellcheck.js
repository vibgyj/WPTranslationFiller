// JavaScript source code

async function spellcheck_page(LtKey, LtUser, LtLang, LtFree, spellcheckIgnore) {
   // console.debug("spellcheckpage:",spellcheckIgnore)
    var replaced = false;
    var row;
    var newrowId;
    var myrow;
    var transtype;
    var toTranslate;
    var found_verbs;
    const countfound = 0;
    var spell_result;
    var timeout = 0;
    var replaced = false;
    var translatedText = "";
    var repl_verb = [];
    var end_table;
    var countrows = 0;
    var result;
    var countreplaced = 0;
    var checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
    var tableRecords;

    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    var myheader = document.querySelector('header');
    checkButton.innerText = "Checking";
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (checkButton.className == "check_translation-button") {
        checkButton.className += " started";
    }
    else {
        // console.debug("checkbutton2:", typeof checkButton)
        if (typeof checkbutton != null) {
          //  checkButton.classList.remove("check_translation-button", "started", "translated");
          //  checkButton.classList.remove("check_translation-button", "restarted", "translated");
          //  checkButton.className = "check_translation-button restarted";
        }
        else {
           // checkButton.className = "check_translation-button started"
        }
    }
    // We need to know the amount of rows to show the finished message at the end of the process
   // var table = document.getElementById("translations");
   // var tr = table.rows;
    //var tbodyRowCount = table.tBodies[0].rows.length;
    tableRecords = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content").length;
    progressbar = document.querySelector(".indeterminate-progress-bar");
    inprogressbar = document.querySelector(".indeterminate-progress-bar__progress")
    //console.debug("table records:",tableRecords)
    if (progressbar == null) {
        myheader.insertAdjacentHTML('beforebegin', template);
        // progressbar = document.querySelector(".indeterminate-progress-bar");
        progressbar.style.display = 'block;';
    }
    else {
        // we need to remove the style of inprogress to see the animation again
        inprogressbar.style=""
        progressbar.style.display = 'block';
    }
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        countrows++;
        setTimeout(async function (timeout,countrows) {
           // countrows++;
            end_table = false;
            found_verbs = [];
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
            let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header span.panel-header__bubble`);
            // We only need to process the actual lines not the untranslatedy
            if (currec != null) {
                if (currec.innerText == "transFill" || currec.innerText == "current" || currec.innerText == "waiting") {
                    //countrows++;
                    let spanmissing = document.querySelector(`#preview-${row} span.missing`);
                    // If the page does not contain translations, we do not need to handle the
                    if (spanmissing == null) {
                        // 30-08-2021 PSS fix for issue # 125
                        let precomment = e.querySelector(".source-details__comment p");
                        if (precomment != null) {
                            comment = precomment.innerText;
                            comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                            toTranslate = checkComments(comment.trim());
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

                            if (transtype == "single") {
                                replaced = false
                                // Fetch the translations
                                let element = e.querySelector(".source-details__comment");
                                let textareaElem = e.querySelector("textarea.foreign-text");
                                translatedText = textareaElem.innerText;
                                // Enhencement issue #123
                                previewNewText = textareaElem.innerText;
                                // Need to replace the existing html before replacing the verbs! issue #124
                                // previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                                // console.debug("line to check:",translatedText,previewNewText)
                                if (translatedText != "") {
                                    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                                    // console.debug("before LT:",translatedText)
                                    spell_result = await spellcheck_entry(translatedText, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, LtKey, LtUser, LtLang, LtFree, spellcheckIgnore)
                                }
                            }
                            else {
                                replaced = false;
                                let previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(1) span.translation-text");
                                previewNewText = previewElem.innerText;
                                translatedText = previewElem.innerText;
                                //console.debug("plural1 found:",previewElem,translatedText,previewNewText);
                                currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                                if (translatedText != "") {
                                    spell_result = await spellcheck_entry(translatedText, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, LtKey, LtUser, LtLang, LtFree, spellcheckIgnore)
                                }
                                // plural line 2
                                previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(2) span.translation-text");
                                //console.debug("plural2:", previewNewText, translatedText);
                                if (previewElem != null) {
                                    previewNewText = previewElem.innerText;
                                    translatedText = previewElem.innerText;
                                    replaced = false;
                                    if (translatedText != "") {
                                        spell_result = await spellcheck_entry(translatedText, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, LtKey, LtUser, LtLang, LtFree, spellcheckIgnore)
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

                }
            }
            // tbodyRowCount includes also the editor rows, so we need to devide by "2"
            if (countrows == tableRecords ) {
                // Translation replacement completed
                checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
                //checkButton.classList.remove("started");
                checkButton.className = "check_translation-button ready";
                checkButton.innerText = "Checked";
               // checkButton.className += " ready";
                if (errorstate != "OK") {
                    messageBox("error", "Check spelling done<br> " + errorstate + "<br> on one of the records")
                    errorstate = "OK"
                }
                else {
                    messageBox("info", "Check spelling done<br> " + "OK" + "<br>")
                }
                progressbar = document.querySelector(".indeterminate-progress-bar");
                progressbar.style.display = "none";
                setTimeout(() => {
                    close_toast();
                    toastbox("info", "Spellcheck ready", "2000", "Spellcheck");
                }, 200);    
            }
            }, timeout, errorstate, countrows);
        timeout += 120;
    }
    return errorstate
}

//# this handles the entry to check
async function spellcheck_entry(translation, found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, LtKey, LtUser, LtLang, LtFree, spellcheckIgnore) {
    //console.debug("spellcheckIgnore:", spellcheckIgnore)
    var spellcheck_verb = [];
    found_verbs = [];
    var response;
    var repl_verb;
    var myurl;
    const update = {
        text: 'fout',
        language :LtLang,
        username: LtUser,
        apiKey: LtKey,
        enabledOnly : 'false'
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
    };
    
   
    let text = prepare_spellcheck(translation);
    
    //console.debug("after prepare:",text)
    if (LtFree == true) {
        myurl = 'https://api.languagetool.org/v2/check?text=' + text + '&language=' + LtLang;
    } else {
       myurl = 'https://api.languagetoolplus.com/v2/check?text=' + text + '&language=' + LtLang + '&username=' + LtUser + '&apiKey=' + LtKey + '&enabledOnly=false'
    }
    response = await fetch(myurl, {
        method: 'POST',
        mode: 'cors',
        credentials: "same-origin"
    }).then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("response:", response)
            //console.debug("response data:", data)
           
           // console.debug("Response:", response);
            // check for error response
            if (!response.ok) {
                replaced = false
                // get error message from body or default to response status
                //console.debug("data:", response.status)
                if (typeof data != "undefined") {
                    //mydata = "No results"
                    //var myerror = { data:mydata, message: "Response not OK", status: response.status }
                    if (response.status != "") {
                        errorstate = response.status
                    }
                    else {
                        errorstate = 'NOK'
                    }
                    throw new Error(response.status);
                }
                else {
                   // let message = 'Nodata received!';
                    //mydata = "noData";
                   // var myerror = response.status
                   // console.debug("errrr:", myerror)
                    //console.debug("status:",response.status)
                    if (response.status != "") {
                        errorstate = response.status
                    }
                    else {
                        errorstate == "NOK"
                    }
                    throw new Error(response.status);
                }
                //return Promise.reject(error);
                //throw new Error("There has been an error:"+ [data,"noData", response.status]);
            }
            else {
                //We do have a result so process it
                //console.debug('result:', data);
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
                            //console.debug("spellcheck_verb:", spellcheck_verb)
                            if (spellcheck_verb == "  ") {
                                spellcheck_verb = "[]";
                            }
                            found_verbs.push([spellcheck_verb, spellcheck_verb]);
                            countfound++;
                            replaced = true

                          //  entry_res = await process_result(found_verbs, replaced, countfound, e, newrowId, currec, previewNewText)
                            errorstate = "OK"
                            //console.debug("res:", entry_res)
                        }
                        else {
                            errorstate = "OK"
                           // console.debug("no replacements contents!")
                            replaced = false;
                        }   
                    }
                    // PSS result only needs to be processed if all verb in sentence have been found
                   // console.debug("found verbs:", found_verbs)
                   // console.debug("ignore:", spellcheckIgnore)
                    entry_res = await process_result(found_verbs, replaced, countfound, e, newrowId, currec, previewNewText, spellcheckIgnore)
                    if (typeof data.translations != 'undefined') {
                        translatedText = data.translations[0].text;
                    }
                }
                else {
                    replaced = false;
                  //  console.debug("We did not find a result!")
                    
                }
               // if (typeof data.translations != 'undefined') {
               //     translatedText = data.translations[0].text;
               // }
            }

        })
        .catch(error => {
            checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
            checkButton.classList.remove("started");
            checkButton.className += " translated";
            checkButton.innerText = "Checked";
            checkButton.className += " ready";
            //if (errorstate != "OK") {
               // messageBox("error", "Error during spell check: " + error[2]+"<br>"+translation.substr(0,30))
            //}
           // console.debug("error in spellcheck:", error)
           // console.debug("error in spellcheck:", errorstate)
           // console.debug("message:", error.message)
            if (error.message == "400" || errorstate == '400') {
                //   alert("Error 400 NoData.")
                errorstate = "Error 400";
               // errorstate = '<br>We did not get data<br>';
               // console.debug("We have an error:", errorstate);

            }
            else if (error.message == "403" || errorstate == '403') {
                // alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403 Authorization failed";
               // console.debug("We have an error:",error.message);
            }
            else if (error.message == '404' || errorstate == '404') {
                //   alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404 resource could not be found<br>Perhaps wrong glossary";
                //console.debug("We have an error:", errorstate);

            }
            else if (error.message == '456' || errorstate == '406') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456 Quota exceeded";
              //  console.debug("We have an error:", errorstate);

            }
            else if (error.message == '500' || errorstate == '500') {
                errorstate = "Error 500 no data received";
               // console.debug("We have an error no data:", errorstate);

            }
            else if (error.message == '504' || errorstate == '504') {
                errorstate = "Error 504 gateway timout";
                
              //  console.debug("We have an error:", "Gateway timeout spellchecker");

            }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error.message == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Languagetool<br>Check your internet connection';
              //  console.debug("We have an error:", errorstate);

            }
            else {
                //alert("Error message: " + error[1])
              //  console.debug("Error:", error)
                errorstate = "Error " + error[1];

            }
        }).then(error => {return error})
    return replaced
}
//# prepare the translation for spellchecking to prevent errors
function prepare_spellcheck (translation) {
    // We need to replace the placeholder, otherwise the spellcheck includes to many errors
    const placeHolderRegex = /%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&#x\d{1,4};|&\w{2,6};|%\w*%/gi;
    const matches = [...translation.matchAll(placeHolderRegex)];
    if (matches != null) {
        index = 0;
        for (const match of matches) {
            translation = translation.replace(match[0], `[${index}]`);
            index++;
        }
    }
    // We need to convert the text to Utf8 otherwise the API does not accept it!!
    let prepared = translation.replace(/[&\/\\#,+()$~%'":*<>{}]/g, ' ')
    //let prepared = JSON.stringify(translation)
     prepared = encodeURIComponent(prepared);
    //console.debug("jason:",prepared)
    
    return prepared
}
//# this function processes the result of the check
async function process_result(found_verbs, replaced, countfound, e, newrowId, currec, orgText, spellcheckIgnore) {
   // console.debug("foundverbs:", found_verbs, replaced,countfound,e,newrowId,currec,orgText,spellcheckIgnore)
    repl_verb = found_verbs;
    if (replaced) {
        //console.debug("We have found errors",currec,newrowId,orgText)
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
               // console.debug("spellcheck:",found_verbs)
                markElements(preview, found_verbs, orgText, spellcheckIgnore,repl_verb);
            }
        //}

    }
    
}