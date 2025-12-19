// Helper: Wait for TM suggestion or "no-suggestions" element scoped to rowId's editor
function waitforTM(rowId, TMwait) {
  // console.debug("TMwait in waitforTM:", TMwait)
   
  const timeout = 10000; // max 10 seconds
  var suggestion
  return new Promise((resolve) => {
    let elapsed = 0;

    const interval = setInterval(() => {
      const editor = document.querySelector(`#editor-${rowId}`);
      if (!editor) return;

      const TMswitch = localStorage.getItem("switchTM");
      let tmContainer;

      if (TMswitch === "false") {
        // Standard TM
        tmContainer = editor.querySelector("details.suggestions__translation-memory.initialized");
        if (!tmContainer) {
          elapsed += TMwait;
          if (elapsed >= timeout) {
            clearInterval(interval);
            resolve("notfound");
          }
          return;
        }

        const noSuggestions = tmContainer.querySelector(".no-suggestions");
        if (noSuggestions) {
          clearInterval(interval);
          resolve("nosuggestions");
          return;
        }
      } else {
        // Other languages TM
         tmContainer = editor.querySelector(".suggestions__other-languages.initialized");
         if (!tmContainer) {
          elapsed += TMwait;
          if (elapsed >= timeout) {
            clearInterval(interval);
            resolve("notfound");
          }
          return;
        }
		const noSuggestions = tmContainer.querySelector(".no-suggestions");
        if (noSuggestions) {
          clearInterval(interval);
          resolve("nosuggestions");
          return;
        }
        
      }
        if (TMswitch != "true") {
            suggestion = tmContainer.querySelector(".translation-suggestion.with-tooltip.translation");
        }
        else {
            suggestion = tmContainer.querySelector(".translation-suggestion.with-tooltip");
        }
        if (suggestion) {
          //console.debug("suggestion found:",suggestion)
          clearInterval(interval);
          resolve(suggestion);
          return;
      }

      elapsed += TMwait;
      if (elapsed >= timeout) {
        clearInterval(interval);
        resolve("notfound");
      }
    }, TMwait);
  });
}


// Main function: handle intercept and start TM processing
async function populateWithTM(
    apikey,
    apikeyDeepl,
    apikeyMicrosoft,
    transsel,
    destlang,
    postTranslationReplace,
    preTranslationReplace,
    formal,
    convertToLower,
    DeeplFree,
    TMwait,
    postTranslationReplace,
    preTranslationReplace,
    convertToLower,
    spellCheckIgnore,
    TMtreshold,
    interCept
) {

    //console.debug("Starting Translation Memory process...");
    //console.debug("TMtreshold:",TMtreshold)
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    const myrecCount = document.querySelectorAll("tr.preview").length;
    if (myrecCount === 0) {
        console.debug("No records found to process.");
        return;
    }
    var GlotPressBulkButton = document.getElementById("bulk-actions-toolbar-bottom")
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
    translateButton.innerText = __("Translate");
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (translateButton.className == "tm-trans-button") {
        translateButton.className += " started";
    }
    else {
        translateButton.classList.remove("tm-trans-button", "started", "translated");
        translateButton.classList.remove("tm-trans-button", "restarted", "translated");
        translateButton.className = "tm-trans-button restarted";
    }
    interCept = localStorage.getItem("interXHR");
    const currWindow = window.self;

    if (interCept === "false") {
        const answer = await cuteAlert({
            type: "question",
            title: __("Auto translate"),
            message: __("Auto translate is on, do you want to continue?"),
            confirmText: "Confirm",
            cancelText: "Cancel",
            myWindow: currWindow
        });

        if (answer === "cancel") {
            const translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
            if (translateButton) {
                translateButton.className += " translated";
                translateButton.innerText = __("Translated");
            }
            messageBox("info", __("TM is stopped!"));
            StartObserver = true;
            return;
        }

        await processTM(
            myrecCount,
            destlang,
            TMwait,
            postTranslationReplace,
            preTranslationReplace,
            convertToLower,
            formal,
            spellCheckIgnore,
            TMtreshold,
            transsel,
            GlotPressBulkButton,
            100,
            interCept
        );
    } else {
        await processTM(
            myrecCount,
            destlang,
            TMwait,
            postTranslationReplace,
            preTranslationReplace,
            convertToLower,
            formal,
            spellCheckIgnore,
            TMtreshold,
            transsel,
            GlotPressBulkButton,
            100,
            interCept
        );
    }
}

//console.debug("TM run completed for", myrecCount, "records.");


// Process each record sequentially with proper awaits
async function processTM(myrecCount, destlang, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, TMtreshold, transsel, GlotPressBulkButton, FetchLiDelay, interCept) {
    await sleep(1000); // wait a bit for populating the table
    //console.debug("Threshold:",TMtreshold)
    var copyClip = false
    if (autoCopyClipBoard) {
        copyClip = false;
        autoCopyClipBoard = false;
    }
    else {
        copyClip = false;
        autoCopyClipBoard = false;
    }
    const previewRows = document.querySelectorAll("tr.preview");
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var myheader = document.querySelector('header');
    var TMswitch = localStorage.getItem('switchTM')
    var editor
    var counter = 0
    var foundTM = 0
    var plural_line
    var original
    var pluralpresent
    var prevstate
    var textFound
    var debug = false
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    progressbar = document.querySelector(".indeterminate-progress-bar");
    inprogressbar = document.querySelector(".indeterminate-progress-bar__progress")
    //console.debug("processTM")
    if (progressbar == null) {
        myheader.insertAdjacentHTML('beforebegin', template);
        // progressbar = document.querySelector(".indeterminate-progress-bar");
        //progressbar.style.display = 'block;';
    }
    else {
        // we need to remove the style of inprogress to see the animation again
        inprogressbar.style = ""
        progressbar.style.display = 'block';
    }
    setPostTranslationReplace(postTranslationReplace,formal);
     //console.debug()
     //setPreTranslationReplace(preTranslationReplace);
    for (let i = 0; i < myrecCount; i++) {
        const previewRow = previewRows[i];
        if (!previewRow) continue;
        //console.debug("we are processing:",counter)
        counter++
        transtype = "single";
        plural_line = "0";
        let rowId = previewRow.getAttribute("row")
        // 18-07-2025 PSS we need to check if the row is not null
        if (rowId != null && rowId !="") {
            const preview = document.querySelector(`#preview-${rowId}`);
            const editoropen = preview?.querySelector("td.actions .edit");
            let record = document.querySelector(`#editor-${rowId}`)
            editor = document.querySelector(`#editor-${rowId}`)
            editorClose = editor.querySelector(".panel-header-actions")
            let previewName = preview.querySelector("td.translation");
            original = editor.querySelector("span.original-raw").innerText;
            let currec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            // We need to determine the current state of the record
            if (currec != null) {
                current = currec.querySelector("span.panel-header__bubble");
                prevstate = current.innerText;
            }
            pluralpresent = document.querySelector(`#preview-${rowId} .original li:nth-of-type(1) .original-text`);
            if (pluralpresent != null) {
                // currently we do not process plural within TM, as it will only give one result
                // original = pluralpresent.innerText
                transtype = "plural";
                plural_line = "1";
            }
            let toTranslate = true
            let element = editor.querySelector(".source-details__comment");

            if (element != null) {
                let comment = editor.querySelector(".source-details__comment p").innerText;
                comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                toTranslate = checkComments(comment.trim());
            }
            // if it is only an URL we do not need to fetch TM
            if (await isOnlyURL(original) == true) {
                toTranslate = false
            }
            
            //console.debug("transtype:",transtype)
            if (transtype == "single") {
                if (!toTranslate) {
                    if (autoCopyClipBoard) {
                        copyClip = false;
                        autoCopyClipBoard = false;
                    }
                    //console.debug("Whe have an URL or project name", original)
                    // here we add a copy of the original as it is a name!
                    let translatedText = original;
                    textareaElem = editor.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    textareaElem.innerHTML = translatedText;
                    textareaElem.value = translatedText;
                    let previewName = preview.querySelector("td.translation");
                    if (previewName != null) {
                        previewName.innerText = translatedText;
                        previewName.value = translatedText;
                        pretrans = "FoundName";

                        //10-05-2022 PSS added poulation of status
                        select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content .meta`);
                        var status = select.querySelector("dd");
                        status.innerText = "transFill";
                        status.value = "transFill";
                        if (toTranslate == false) {
                            showName = true;
                        }
                        else {
                            showName = false;
                        }
                        if (showName == true) {
                            let originalElem = document.querySelector("#preview-" + rowId + " .original");
                            showNameLabel(originalElem, rowId)
                        }
                    }
                    let transname = document.querySelector(`#preview-${rowId} .original div.trans_name_div_true`);
                    if (transname != null) {
                        transname.className = "trans_name_div";
                        transname.innerText = __("URL, name of theme or plugin or author!");
                        // In case of a plugin/theme name we need to set the button to blue
                        translated = true
                        //mark_as_translated(row, current, translated, preview)
                    }
                    translated = true
                    foundTM++
                   // await mark_as_translated(rowId, current, translated, preview)
                  
                    result = await validateEntry(destlang, textareaElem, false, false, rowId, locale, record, false, DefGlossary);
                   // await processTransl(original, translatedText, locale, record, row, transtype, plural_line, locale, false, current)
                    await mark_preview(preview, result.toolTip, textareaElem.textContent, rowId, false)
                    await mark_as_translated(rowId, current, translated, preview)

                }
                else {
                    if (editoropen) {
                        editoropen.click();

                        let suggestionResult = await waitforTM(rowId, TMwait);
                        //console.debug("suggestion:",suggestionResult)
                        if (suggestionResult == "notfound" && suggestionResult == "nosuggestions") {
                            //console.debug("Timed out waiting for TM suggestion element for record:", rowId);

                            //console.debug("preview:", previewName)
                            if (previewName != null) {
                                previewName.innerText = "No suggestions"
                                previewName.value = "No suggestions"
                                textFound = "No suggestions"
                                updateStyle(textareaElem, result, "", showHistory, false, false, rowId, editor, false, false, textFound, [], "transFill", "old", false)
                            }
                            // Treat timeout as no suggestions for further processing
                            // (replace suggestionResult value)
                            //suggestionResult = "nosuggestions";
                        }

                        
                        else if (suggestionResult instanceof Element) {
                            const scoreText = suggestionResult.querySelector(".translation-suggestion__score")?.textContent.trim();
                            let score = scoreText ? parseInt(scoreText.replace("%", ""), 10) : 0;
                            //console.debug("score:",score)
                            if (TMswitch != "true") {
                                if (score >= TMtreshold) {
                                    //console.debug(`✅ TM suggestion accepted (score: ${score}%) for record: ${rowId}`);

                                    foundTM++
                                    const cleanTranslation = suggestionResult.querySelector(".translation-suggestion__translation")?.textContent.trim();
                                    const rawTranslation = suggestionResult.querySelector(".translation-suggestion__translation-raw")?.textContent.trim();

                                    if (convertToLower == true) {
                                        textFound = convert_lower(rawTranslation, spellCheckIgnore)
                                    }
                                    else {
                                        textFound = check_hyphen(rawTranslation, spellCheckIgnore);
                                    }
                                    if (formal) {
                                        textFound = await replaceVerbInTranslation(original, textFound, replaceVerb, debug = false)
                                    }
                                   // console.debug("text:",textFound)
                                    if (previewName != null) {
                                        previewName.innerText = textFound
                                        previewName.value = textFound
                                    }
                                    let textareaElem = editor.querySelector("textarea.foreign-text");
                                    //console.debug("texarea:", textareaElem)
                                    if (textareaElem != null) {
                                        textareaElem.innerText = textFound;
                                        textareaElem.innerHTML = textFound;
                                        textareaElem.textContent = textFound;
                                        checkEntry(rowId, postTranslationReplace, formal, convertToLower, true, spellCheckIgnore);
                                    }
                                    
                                    if (debug == true) {
                                        console.debug("✅ Found TM suggestion element for record:", rowId);
                                        console.debug("Clean translation:", cleanTranslation);
                                        console.debug("Raw translation:", rawTranslation);
                                        console.debug("Outer HTML:", suggestionResult.outerHTML);
                                    }

                                  //  result = await validateEntry(destlang, textareaElem, "", "", rowId, locale, editor, false);
                                    let showDiff = false
                                    let old_status = "current"
                                    let showHistory = false
                                    let newurl = ""
                                    //10-05-2022 PSS added poulation of status
                                    let select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content .meta`);
                                    let status = select.querySelector("dd");
                                    status.innerText = "transFill";
                                    status.value = "transFill";
                                    current.innerText = 'transFill'
                                     record = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                                     await processTransl(original, cleanTranslation, locale, record, rowId, transtype, plural_line, locale, false, current)

                                }
                                else {
                                    //console.debug(`⛔ TM suggestion rejected (score: ${score}%) below threshold (${TMtreshold}%) for record: ${rowId}`);
                                    if (previewName != null) {
                                        previewName.innerText = __("Below threshold: ") + score
                                        previewName.value = "Below threshold: " + score
                                        let newurl = ""
                                        updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId, editor, false, false, textFound, [], "transFill", "old", false)
                                    }
                                }
                            }
                            else {
                                //console.debug("we have switched TM:")
                                foundTM++
                                const cleanTranslation = suggestionResult.querySelector(".translation-suggestion__translation")?.textContent.trim();
                                const rawTranslation = suggestionResult.querySelector(".translation-suggestion__translation-raw")?.textContent.trim();
                                let select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content .meta`);
                                let status = select.querySelector("dd");
                                status.innerText = "transFill";
                                status.value = "transFill";
                                if (convertToLower == true) {
                                    textFound = convert_lower(rawTranslation, spellCheckIgnore)
                                }
                                else {
                                    textFound = check_hyphen(rawTranslation, spellCheckIgnore);
                                }
                                editor = document.querySelector(`#editor-${rowId}`)
            
                                original = editor.querySelector("span.original-raw").innerText;
                                if (formal) {
                                    textFound = await replaceVerbInTranslation(original, textFound, replaceVerb, debug = false)
                                }
                                debug = false
                                if (debug == true) {
                                    console.debug("Clean translation:", cleanTranslation);
                                    console.debug("Raw translation:", rawTranslation);
                                    console.debug("textFound:", textFound)
                                }

                                let textareaElem = editor.querySelector("textarea.foreign-text");
                                //console.debug("texarea:", textareaElem)
                                if (textareaElem != null) {
                                    textareaElem.innerText = textFound;
                                    textareaElem.innerHTML = textFound;
                                    textareaElem.textContent = textFound;
                                    checkEntry(rowId, postTranslationReplace, formal, convertToLower, true, spellCheckIgnore);
                                }
                                previewName.innerText = textFound
                                previewName.value = textFound
                                current.innerText = 'transFill'
                                let newurl = ""
                                result = await validateEntry(destlang, textareaElem, "", "", rowId, locale, editor, false);

                                await mark_as_translated(rowId, current, textFound, preview)
                                updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId, editor, false, false, textFound, [], "transFill", "old", false)

                            }
                            if (score >= TMtreshold) {
                                // We need to set the checkbox here, as processTransl thinks we are in editor
                                if (is_pte) {
                                    rowchecked = preview.querySelector(".checkbox input");
                                }
                                else {
                                    rowchecked = preview.querySelector(".myCheckBox input");
                                }

                                if (rowchecked != null) {
                                    if (!rowchecked.checked) {
                                        rowchecked.checked = true;
                                    }
                                }
                            }
                        }
                       // else {
                        //    console.debug("Unexpected result from waitforTM:", suggestionResult);
                      //  }
                        //editor.style.removeProperty("display");
                    }

                    if (counter == myrecCount) {
                        // Translation completed  
                        translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
                        translateButton.classList.remove("started")
                        translateButton.className += " translated";
                        translateButton.innerText = __("Translated");
                        progressbar = document.querySelector(".indeterminate-progress-bar");
                        progressbar.style.display = "none";
                       // toastbox("info", __("We have found: ") + parseInt(foundTM), "3000", " TM records");
                        if (counter > 0) {
                            if (GlotPressBulkButton != null && typeof GlotPressBulkButton != "undefined") {
                                let button = GlotPressBulkButton.getElementsByClassName("button")
                                button[0].disabled = true;
                            }
                        }
                        // We need to enable autoCopyClipBoard if it was active
                        if (copyClip) {
                            autoCopyClipBoard = true;
                        }
                        // This one is closing the last editor!!
                        // We need to enable the preview again, as it is set to none at this point
                        //editor.style.display = 'none'
                        editor.style.removeProperty("display");
                        preview.style.display = 'table-row' 

                    }
                }
            }
            else {
               // console.debug("We have a plural")
            }

            if (foundTM == 0 && counter == myrecCount) {
                // Translation completed  
                translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
                translateButton.classList.remove("started")
                translateButton.className += " translated";
                translateButton.innerText = __("Translated");
                progressbar = document.querySelector(".indeterminate-progress-bar");
                progressbar.style.display = "none";
               // toastbox("info", __("We have found: ") + parseInt(foundTM), "3000", " TM records");
                if (counter > 0) {
                    if (GlotPressBulkButton != null && typeof GlotPressBulkButton != "undefined") {
                        let button = GlotPressBulkButton.getElementsByClassName("button")
                        button[0].disabled = true;
                    }
                }
                // We need to enable autoCopyClipBoard if it was active
                if (copyClip) {
                    autoCopyClipBoard = true;
                }
            }
            else if (foundTM != 0 && counter == myrecCount) {
                // Translation completed  
                translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
                translateButton.classList.remove("started")
                translateButton.className += " translated";
                translateButton.innerText = __("Translated");
                progressbar = document.querySelector(".indeterminate-progress-bar");
                progressbar.style.display = "none";
               // toastbox("info", __("We have found: ") + parseInt(foundTM), "3000", " TM records");
                if (counter > 0) {
                    if (GlotPressBulkButton != null && typeof GlotPressBulkButton != "undefined") {
                        let button = GlotPressBulkButton.getElementsByClassName("button")
                        button[0].disabled = true;
                    }
                }
                // We need to enable autoCopyClipBoard if it was active
                if (copyClip) {
                    autoCopyClipBoard = true;
                }
            }
        }
        else {
        //console.debug("rowId is null!!")
        }
        
    }
     toastbox("info", __("We have found: ") + parseInt(foundTM), "3000", " TM records");
}

