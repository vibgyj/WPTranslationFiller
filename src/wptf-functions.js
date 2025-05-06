// This file contains functions used within various files

// This function shows the amount of records present in the local translation table
function Show_RecCount() {
    let count_locale = checkLocale();
    DispCount = document.createElement("a");
    DispCount.href = "#";
    DispCount.className = "DispCount-button";
    countTable(count_locale).then(count => {
        var divPaging = document.querySelector("div.paging");
        if (divPaging != null) {
            DispCount.innerText = count
            if (count == 1) {
                DispCount.style.background = 'yellow'
            }
            divPaging.insertBefore(DispCount, divPaging.childNodes[0]);

        }
    });
}

function getGlotDictStat() {
        var scripts = document.getElementsByTagName('script');
        //console.debug("scripts:", scripts)
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src');
            if (src && src.includes('glotdict.js')) {
                //console.debug("we found glotdict")
                return true;
            }
        }
        return false;
}

function check_untranslated() {
    var preview_list;
    // select all untranslated, if they are not present we can go on
    preview_list = document.querySelectorAll("tr.preview.no-translations");
    if (preview_list.length > 0) {
        return true;
    }
    else {
        return false;
    }
}
 
function findFirstBlankAfter(text, startPosition) {
    // this function finds the first word after the semi colon
    for (let i = startPosition; i < text.length; i++) {
        if (text[i] === ' ' || text[i] === '.' || text[i] === '"') {
            switch (text[i]) {
                case ".":
                    //console.debug("found period")
                    i = i - 1
                case '"':
                    i = i - 1
            }
            return i; // Found a blank, ".", or '"' character, return its position
        }
    }
    return -1; // Blank not found after startPosition
}

function unEscape(htmlStr) {
    // function is a fix for issue #300 remove those chars from innerHTML result
    htmlStr = htmlStr.replace(/&lt;/g, "<");
    htmlStr = htmlStr.replace(/&gt;/g, ">");
    htmlStr = htmlStr.replace(/&quot;/g, "\"");
    htmlStr = htmlStr.replace(/&#39;/g, "\'");
    htmlStr = htmlStr.replace(/&amp;/g, "&");
    return htmlStr;
}


function checkDiscussion() {
    // This function checks if we are on the discussion table
    const locString = window.location.href;
    if (locString.includes("discussions")) {
        return true;
    }
    else {
        return false;
    }
}

function findArrayLine(allrows, original, transtype, plural_line) {
    // this function searches for the translation of an original within the loaded array
    var myorg;
    var res = 'notFound';
    var trans = " ";
    var result;
    //console.debug("transtype: ", transtype,original,plural_line)
    if (transtype === "single") {
        myorg = "msgid " + '"' + original + '"';
    }
    if (transtype === "plural" && plural_line == 1) {
        myorg = "msgid " + '"' + original + '"';
    }
    if (transtype === "plural" && plural_line == 2) {
        myorg = "msgid_plural " + '"' + original + '"';
    }
    //console.debug("in findArray orginal: ",original,myorg)

    result = allrows.indexOf(myorg);
    // console.debug("Did we find: ",myorg+" ",result)
    //console.debug("found:", result)
    if (transtype == "single") {
        if (result != -1) {
            trans = allrows.find((el, idx) => typeof el === "string" && idx === result + 1);
            //console.debug("Translation:", trans)
            res = trans.replace("msgstr ", "");
            res = res.slice(1, -1);
        }
        else {
            res = 'notFound';
        }
    }
    //console.debug("transtype = plural and plural_line =1:", result)
    if (transtype == "plural" && plural_line == 1) {
        // console.debug("transtype = plural and plural_line =1:",result)
        if (result != -1) {
            trans = allrows.find((el, idx) => typeof el === "string" && idx === result + 2);
            if (trans != -1) {
                res = trans.replace("msgstr[0] ", "");
                res = res.slice(1, -1);
                // console.debug("first line of plural: ", res);
            }
            else {
                res = "notFound";
            }
        }
        else {
            res = 'notFound';
        }
    }
    if (transtype == "plural" && plural_line == 2) {
        if (result != -1) {
            trans = allrows.find((el, idx) => typeof el === "string" && idx === result + 2);
            if (trans != -1) {
                res = trans.replace("msgstr[1] ", "");
                res = res.slice(1, -1);
                //console.debug("second line of plural:", res);
            }
            else {
                res = "notFound";
            }
        }
        else {
            res = 'notFound';
        }
    }

    return res;
}


function addtoClipBoardClicked(event) {
    // This function copies the original to the clipboard
    if (event != undefined) {
        event.preventDefault();
        copyToClipBoard(detailRow);
    }
}

function copyToClipBoard(detailRow) {
    let e = document.querySelector(`#editor-${detailRow} div.editor-panel__left div.panel-content`);
    if (e != null) {
        var content = e.querySelector("span.original-raw").innerText;
        if (content != null) {
            navigator.clipboard.writeText(content);
            toastbox("info", "Copy original to clipboard<br>" + content, "2500", "Copy");
        }
        else {
            toastbox("error", "No text found to copy", "1200", "Error");
        }
    }
    else {
        toastbox("error", "No text found to copy", "1200", "Error");
    }
}

function addCheckBox() {
    var BulkButton;
    // 18-10-2022 Fix for issue #253 table header wrong within tab discussions
    var discussion = checkDiscussion();
    if (!discussion) {
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        // if the translator is a PTE than we do not need to add the extra checkboxes
        if (!is_pte) {
            tablehead = document.getElementById("translations");
            BulkButton = document.createElement("button");
            BulkButton.id = "tf-bulk-button";
            BulkButton.className = "tf-bulk-button";
            BulkButton.onclick = startBulkSave;
            BulkButton.innerText = "Start";

            if (tablehead != null) {
                hoofd = tablehead.rows[0];
                var y = hoofd.insertCell(0);

                y.outerHTML = "<th class= 'thCheckBox' display:'table-cell'>Bulk</th>";
                var blkButton = document.querySelector("th.thCheckBox");
                //console.debug("bulk:", blkButton)
                // if (blkButton == null) {
                if (typeof blkButton != null) {
                    blkButton.appendChild(BulkButton);
                }
                //}
                for (let e of document.querySelectorAll("tr.preview")) {
                    //let mycheckBox = e.querySelector("td input");
                    //console.debug("mycheckbox:", mycheckBox)
                    var x = e.insertCell(0);
                    x.className = "myCheckBox";
                }
            }
        }
    }
}

function setmyCheckBox(event) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    // if the translator is a PTE than we do not need to add the extra checkboxes
    if (!is_pte) {
        //document.getElementsByClassName("myCheckBox").checked = true;
        document.querySelectorAll("tr.preview").forEach((preview, i) => {
            // if (!is_pte) {
            rowchecked = preview.querySelector("td input");
            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    prevtext = preview.querySelector("td.translation").innerText;
                    // Do not tick the box if preview contaings "No suggestions" issue #221
                    // Do not tick the box if preview has no translatione.g. "Double-click to add" issue #223
                    if (prevtext.search("No suggestions") == -1 && prevtext.search("Double-click to add") == -1) {
                        preview.querySelector("td input").checked = true;
                    }
                }
                else {
                    prevtext = preview.querySelector("td.translation").innerText;
                    if (prevtext.search("No suggestions") == -1 && prevtext.search("Double-click to add") == -1) {
                        preview.querySelector("td input").checked = false;
                    }
                }
            }
            // }
        });
    }
    else {
        document.querySelectorAll("tr.preview").forEach((preview, i) => {
            // if (!is_pte) {
            rowchecked = preview.querySelector("th input");
            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    prevtext = preview.querySelector("td.translation").innerText;
                    // Do not tick the box if preview contaings "No suggestions" issue #221
                    // Do not tick the box if preview has no translatione.g. "Double-click to add" issue #223
                    if (prevtext.search("No suggestions") == -1 && prevtext.search("Double-click to add") == -1) {
                        preview.querySelector("th input").checked = true;
                    }
                }
            }
            // }
        });
    }

}

function deselectCheckBox(event) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    // if the translator is a PTE than we do not need to add the extra checkboxes
    if (!is_pte) {
        //document.getElementsByClassName("myCheckBox").checked = true;
        document.querySelectorAll("tr.preview").forEach((preview, i) => {
            if (!is_pte) {
                rowchecked = preview.querySelector("td input");
                if (rowchecked != null) {
                    if (rowchecked.checked) {
                        preview.querySelector("td input").checked = false;
                    }
                }
            }
        });
    }
}

async function validateOld(showDiff) {
    var counter = 0;
    var vartime = 20000;
    var timeout = 0;
    var row;
    var rowfound;
    var newrow
    var startTime;
    var records = {};
    var textareaElem;
   // console.debug("we are checking for old strings");
   
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    var myheader = document.querySelector('header');
    // setPostTranslationReplace(postTranslationReplace, formal);
    records = await document.querySelectorAll("tr.preview")
    // we do not want to show the progress bar outside of the project table list
    //console.debug("lengte:",records.length,typeof records.length)
    if ((records.length) > 1) {
        let progressbar = document.querySelector(".indeterminate-progress-bar");
        if (progressbar == null) {
            myheader.insertAdjacentHTML('beforebegin', template);
            // progressbar = document.querySelector(".indeterminate-progress-bar");
            // progressbar.style.display = 'block';
        }
        else {
            console.debug("we start the bar")
            progressbar.style.display = 'block';
        }


        // 12 - 06 - 2021 PSS added project to url so the proper project is used for finding old translations
        let f = document.getElementsByClassName("breadcrumb");

        if (f[0] != null) {
            if (typeof f[0].firstChild != 'undefined') {
                let url = f[0].firstChild.baseURI;
                newurl = url.split("?")[0];
            }
            else {
                let url = ""
                newurl = ""
            }
        }
        else {
            let url = ""
            newurl = ""
        }
        // console.debug("newurl:", newurl)
        let single = "False";

        const processRecordWithDelay = async (record, delay,processed) => {
            try {
                const startTime = Date.now(); // Record the start time
                // Simulate processing the record
                let myrow = record.getAttribute("row");
                row = myrow
                rowId = row
                //   }
                let originalElem = record.querySelector(".original");
                counter++;
                current = document.querySelector("#editor-" + row + " div.editor-panel__left div.panel-header span.panel-header__bubble");
                textareaElem = record.querySelector(".translation.foreign-text");
                // console.debug("current:", current.innerText)
                let showName = false;
                //let showDiff = true;
                if (textareaElem != null) {
                    let prev_trans = textareaElem.innerText;
                    //console.debug("translation:", prev_trans)
                    // we need to set default values, otherwise errors will popup
                    let currcount = 0;
                    let wordCount=0;
                    let foundCount = 0;
                    let percent =100
                    let toolTip="";
                    let newText=""
                    let result = { wordCount, foundCount, percent, toolTip, newText }

                    checkElem = record.querySelector(".priority");
                    if (current.innerText != 'untranslated' && current.innerText != null) {
                        await fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId, showName, current.innerText, prev_trans, currcount, showDiff);
                    }
                }
                else {console.debug("we could not fetch the text of the record, probably de to 429 error")}
                const endTime = Date.now(); // Record the end time
                const timeDifference = endTime - startTime; // Calculate the time difference
                //console.log('Time taken for processing this record:', timeDifference, 'milliseconds');
                //console.debug("record!:",record)
                return record; // Return the processed record (if needed)
            } catch (error) {
                console.error('Error processing record:', error.message);
                throw error;
            }
        };

        const delayBetweenProcessing = 100; // Delay between processing each record in milliseconds

        const processRecordsSequentially = async () => {
            try {
                for (let i = 0; i < records.length; i++) {
                    await processRecordWithDelay(records[i], delayBetweenProcessing);
                    if (i < records.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delayBetweenProcessing)) 
                    }
                    else {
                        if ((records.length) > 1) {
                            let check=__("Check old is ready")
                                messageBox("info", check)
                            }
                    // checking old records done
                        progressbar = document.querySelector(".indeterminate-progress-bar");
                        let progressbarStyle = document.querySelector(".indeterminate-progress-bar__progress");

                        progressbarStyle.style.animation = 'none'
                        progressbar.style.display = "none";            
                        }
                }
            } catch (error) {
                console.error('Error processing records:', error.message);
            }
        };

        processRecordsSequentially();
    }
}
              //leftPanel, result.toolTip, textareaElem.textContent, rowId, false
async function mark_original(preview, toolTip, translation, rowId, isPlural){
   
    var missingTranslations = [];
    if (translation != "") {
        let myleftPanel = await document.querySelector(`#preview-${rowId} .original-text`)
        if (DefGlossary == true) {
            myglossary = glossary
        }
        else {
            myglossary = glossary1
        }
        newGloss = createNewGlossArray(myglossary)
        let markleftPanel = myleftPanel
        //let markleftPanel = document.querySelector(`#editor-${rowId} .editor-panel`)
        //console.debug("leftpanel:",markleftPanel,rowId)
        if (markleftPanel != null) {
            singlepresent = markleftPanel.innerText;
            singularText = markleftPanel.innerText;
            // we do not need to collect info for plural if it is not a plural
            if (isPlural == true) {
                pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
                pluralText = pluralpresent.getElementsByClassName('original')[0]
                if (pluralpresent != null) {
                    spansPlural = pluralpresent.getElementsByClassName("glossary-word")
                }
            }
            if (singlepresent != null) {
                spansSingular = markleftPanel.getElementsByClassName("glossary-word")
            }

            if (isPlural == true) {
                spans = spansPlural
            }
            else {
                spans = spansSingular
            }
            if (spans.length > 0) {
                //console.debug("houston we have a glossary")
                //console.debug("we have to mark the original", preview)
                //console.debug("spans:", spansSingular)
                wordCount = spans.length
                //console.debug("span length:", spans.length)
                var spansArray = Array.from(spans)
                // console.debug("array:", spansArray)
                for (spancnt = 1; spancnt < (spansArray.length); spancnt++) {
                    spansArray[spancnt].setAttribute('gloss-index', spancnt);
                }
                var glossWords = createGlossArray(spansArray, newGloss)
                //glossWords= newGloss
                //console.debug("glossWords:", glossWords)
                dutchText = translation
                if (isPlural == false) {
                //    await remove_all_gloss(markleftPanel, false)
                    missingTranslations = [];
                    // Run the function
                    //console.debug("Translation:",translation)
                    missingTranslations = await findMissingTranslations(glossWords, dutchText);

                    // Output the result
                    if (missingTranslations.length > 0) {
                        //console.debug("single missing:",missingTranslations)
                        //console.debug("single translation:",dutchText)
                        document.addEventListener("mouseover", (event) => {
                            const tooltip = document.querySelector(".ui-tooltip");

                            if (tooltip) {
                                tooltip.style.display = "block"; // Ensure it appears first
                                setTimeout(() => {
                                    if (!tooltip.matches(":hover")) {
                                        tooltip.style.display = "none"; // Hide only if not hovered
                                    }
                                }, 2000); // Adjust timing as needed
                            }
                        });


                        missingTranslations.forEach(({ word, glossIndex }) => {
                            spansArray[glossIndex].classList.add('highlight')
                            // spansArray[glossIndex].style.textDecorationColor = 'red'; 
                            // spansArray[glossIndex].style.color = 'red'; 
                            // console.log(`Missing translation for word: "${Array.isArray(word) ? word.join(', ') : word}" with gloss-index: ${glossIndex}`);
                        });
                    }
                    else {
                    //    await remove_all_gloss(markleftPanel, false)
                        //console.log("plural All glossary words are translated.");
                    }
                }

                if (isPlural == true) {
                    await remove_all_gloss(markleftPanel, true)
                    // console.debug("it is a plural")
                    // console.debug("pluralText:",pluralText)
                    // console.debug("plural translation:",dutchText)
                    // console.debug("spansPlural:",spansArray)

                    missingTranslations = [];
                    // Run the function
                    missingTranslations = await findMissingTranslations(glossWords, dutchText);
                    //console.debug(missingTranslations)
                    if (missingTranslations.length > 0) {
                        //console.debug("missing:",missingTranslations)
                        missingTranslations.forEach(({ word, glossIndex }) => {
                            //onsole.debug(`Missing translation for word: "${word}" with gloss-index: ${glossIndex}`);
                            //nsole.debug("span with missing translation:",spansArray[glossIndex])
                            spansArray[glossIndex].classList.add('highlight')
                        });
                    }
                    else {
                        await remove_all_gloss(markleftPanel, true)
                        //console.log("All glossary words are translated.");
                    }
                }
            }
        }
    }
    else {
        //console.debug("We do not have a translation!!!")
    }

}

async function validatePage(language, showHistory, locale,showDiff, DefGlossary) {
    // This function checks the quality of the current translations
    // added timer to slow down the proces of fetching data
    // without it we get 429 errors when fetching old records
    var translation;
    var prev_trans;
    var rowcount = 0;
    var checkbox;
    var my_line_counter;
    var myGlotDictStat;
    var newurl;
    var old_status;
    var formal = checkFormal(false);
    var myglossary = ""
    //console.debug("Is formal:",formal)
    if (formal == true) {
        //console.debug("we have formal")
        DefGlossary == true
        myglossary = glossary1
    }
    else {
         DefGlossary == false
         myglossary = glossary
        }
    //console.debug("validatePage glossary:",myglossary)
    // html code for counter in checkbox
    const line_counter = `
    <div class="line-counter">
        <span class="text-line-counter"></span>
    </div>
    `;
   
    // 12-06-2021 PSS added project to url so the proper project is used for finding old translations
    let f = document.getElementsByClassName("breadcrumb");
    //console.debug("breadcrumb:",f)
    if (f[0] != null) {
        if (typeof f[0].firstChild != 'undefined') {
            let url = f[0].firstChild.baseURI;
            newurl = url.split("?")[0];
        }
        else {
            let url = ""
            newurl = ""
        }
    }
    else {
        let url = ""
        newurl=""
    }
    var divProjects = document.querySelector("div.projects");
    // We need to set the priority column only to visible if we are in the project 
    // PSS divProjects can be present but trhead is empty if it is not a project
    var tr = document.getElementById("translations");
    // 18-10-2022 Fix for issue #253 table header wrong within tab discussions
    //console.debug("Trows:",tr)
    var discussion = checkDiscussion();
    if (!discussion) {
        if (tr != null) {
            trhead = tr.tHead.children[0]
            // 26-06-2021 PSS set  the visibillity of the Priority column back to open
            trprio = trhead.children[1];
            trprio.style.display = "table-cell";
            trprio.innerHTML = "Qual";
            var all_col = document.getElementsByClassName("priority");
            for (var i = 0; i < all_col.length; i++) {
                all_col[i].style.display = "table-cell";
            }
        }
    }
    await set_glotdict_style().then(function (myGlotDictStat) {
    //console.debug("glotdict:", myGlotDictStat)
    // Use the retrieved data here or export it as needed
    // increase the timeout if buttons from GlotDict are not shown
    // this set when the checkbox show GlotDict is set
    var increaseWith = 0
    var timeout = 0;
      if (myGlotDictStat) {
        timeout = 250;
        increaseWith = 150
       }
       
     
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            setTimeout(async function() {
                rowcount++
                let original = e.querySelector("span.original-raw").innerText;
                let textareaElem = e.querySelector("textarea.foreign-text");
                let rowId = textareaElem.parentElement.parentElement.parentElement
                    .parentElement.parentElement.parentElement.parentElement.getAttribute("row");

                // we need to fetch the status of the record to pass on
                let  preview = document.querySelector("#preview-" + rowId)
                old_status = document.querySelector("#preview-" + rowId);
                /// checkbox = old_status.querySelector('input[type="checkbox"]'
                if (old_status != null) {
                    checkbox = old_status.getElementsByClassName("checkbox")
                    glossary_word = old_status.getElementsByClassName("glossary-word")
                }
                if (checkbox[0] != null) {
                    my_line_counter = checkbox[0].querySelector("div.line-counter")
                    // mark lines with glossary word into checkbox
                    if (glossary_word.length != 0) {
                        checkbox[0].style.background = "LightSteelBlue"
                        checkbox[0].title = "Has glossary word"
                    }
                    // add counter to checkbox, but do not add it twice      
                    if (my_line_counter == null) {
                        checkbox[0].insertAdjacentHTML('afterbegin', line_counter);
                        let this_line_counter = checkbox[0].querySelector("span.text-line-counter")
                        this_line_counter.innerText = rowcount
                    }

                }
                else {
                    // if not a PTE it must be put in a different checkbox
                    //console.debug("we are not a PTE")
                    if (old_status != null) {
                        let mycheckbox = old_status.getElementsByClassName("myCheckBox")
                        mycheckbox[0].insertAdjacentHTML('afterbegin', line_counter);
                        let this_line_counter = mycheckbox[0].querySelector("span.text-line-counter")
                        this_line_counter.innerText = rowcount
                        if (glossary_word.length != 0) {
                            mycheckbox[0].style.background = "LightSteelBlue"
                            mycheckbox[0].title = "Has glossary word"
                        }
                    }
                    // mycheckbox[0].textContent = rowcount
                }
                let element = e.querySelector(".source-details__comment");
                let toTranslate = false;
                let showName = false;
                if (element != null) {
                    // Fetch the comment with name
                    let comment = e.querySelector("#editor-" + rowId + " .source-details__comment p").innerText;
                    if (comment != null) {
                        toTranslate = checkComments(comment.trim());
                    }
                    else {
                        toTranslate = true;
                    }
                }
                else {
                    toTranslate = true;
                }
                if (toTranslate == false) {
                    showName = true;
                }
                else {
                    showName = false;
                }
                if (textareaElem.innerText!=""){
                translation = textareaElem.innerText;
               // console.debug("we do have a innerText")
                }
                else {
                    translation = textareaElem.textContent
                }
                if (original != translation && showName == true) {
                    nameDiff = true;
                }
                else {
                    nameDiff = false;
                }

                var result = validate(language, original, translation, locale, false, rowId, false, DefGlossary);
                // console.debug("validate in validatepage line 580:",original,result)
                let record = e.previousSibling.previousSibling.previousSibling
                // this is the start of validation, so no prev_trans is present      
                prev_trans = translation
              //  if (showHistory === 'false') {
               //     waiting = 0;
              //  }
              //  else {
              //      waiting = 100;
              //  }
               // setTimeout(async function () {
                // PSS this is the one with orange
                 await updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, false, false, translation, [], prev_trans, old_status, showDiff);

                 await mark_original(preview, result.toolTip, textareaElem.textContent, rowId, false)
                //}, waiting);
           if (rowcount == 1){
               //console.debug(" we are starting observer")
             // console.debug("e:",e)
              mytextarea = e.getElementsByClassName('foreign-text')
              //console.debug("after start textarea:",mytextarea)
             //if (StartObserver) {
             // start_editor_mutation_server(mytextarea, "Details") 
              //}
           }
            }, timeout);
            timeout += increaseWith;
        }
        
        // 30-06-2021 PSS set fetch status from local storage
        chrome.storage.local.set({ "noOldTrans": "False" }, function () {
            // Notify that we saved.
            // alert("Settings saved");
        });

        
    });
}
function countWordsinTable() {
    var counter = 0;
    var wordCount = 0;
    var pluralpresent;
    var original;
    // toastbox("info", "Counting started", "1000", "Counting");
    for (let record of document.querySelectorAll("tr.preview")) {
        counter++;
        pluralpresent = record.querySelector(`.translation.foreign-text li:nth-of-type(1) span.translation-text`);
        if (pluralpresent != null) {
            wordCount = wordCount + countWords(pluralpresent.innerText);
            pluralpresent = record.querySelector(`.translation.foreign-text li:nth-of-type(2) span.translation-text`).innerText;
            wordCount = wordCount + countWords(pluralpresent);
        }
        else {
           // console.debug('record:', record)
            myClassList = record.classList
           // console.debug("classlist:",myClassList)
            if (myClassList.contains('status-current') || myClassList.contains('untranslated')) {
                original = record.querySelector("span.original-text");
                //console.debug("original:", original)
                if (original != null) {
                    wordCount = wordCount + countWords(original.innerText);
                }
            }
            //else {console.debug("not found!") }
        }
    }
    // console.debug("records counted:", counter, wordCount);
    messageBox("info", "Records counted: " + counter+ " Words counted:" + wordCount);
}

async function set_glotdict_style() {
    // this function sets the color of the box for glossary words present within a single line
    return new Promise(function (resolve) {
        let myTimeout = 120;
        setTimeout(() => {
            chrome.storage.local.get(["glotDictGlos"],
                function (data) {
                    let myGlotDictStat = getGlotDictStat()
                    //console.debug("is GlotDict active:", myGlotDictStat)
                    if (myGlotDictStat) {
                        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
                        //if (showGlosLine==true) {
                        // 09-09-2021 PSS added fix for issue #137 if GlotDict active showing the bar on the left side of the prio column
                        showGlosLine = data.glotDictGlos;
                        //console.debug("showGlosLine", showGlosLine)
                        // Do not show the GlotDict
                        if (showGlosLine == 'false') {
                            //console.debug("showGlosLine:", showGlosLine)
                          //  console.debug("pte:", is_pte)
                            if (is_pte) {
                                //console.debug("We are PTE")
                                const style = document.createElement("style");
                                style.innerHTML = `
                              table.translations tr.preview.has-glotdict .original::before {
                              display: none !important;
                            }
                            `;
                                document.head.appendChild(style);
                            }
                            else {
                                const style = document.createElement("style");
                                style.innerHTML = `
                             table.translations tr.preview.has-glotdict .original::before {
                              display: none !important;
                        }
                        `;
                                document.head.appendChild(style);
                            }
                        }
                        else {
                            // show GlotDoct is active
                            //console.debug("are we PTE:", is_pte)
                            if (is_pte) {
                                //console.debug("we are showing the GlotDict")
                                const style = document.createElement("style");
                                style.innerHTML = `
                               table.translations tr.preview.has-glotdict .original::before {
                               width: 3px !important;
                               position: inline !important;
                               margin-left: -14px !important;
                               top: calc(-0.5em + 17px) !important;
                               height:100% !important;
                              /**display: none !important;*/
                            }
                            `;
                                document.head.appendChild(style);
                            }
                            else {
                                const style = document.createElement("style");
                                style.innerHTML = `
                              tr.preview.has-glotdict .original::before {
                              width: 3px !important;
                              height 100% !important;
                              position: inline !important;
                              top: calc(-0.5em + 17px) !important;
                              margin-left: -14px !important;
                    }
                      `;
                                document.head.appendChild(style);
                            }
                        }
                        resolve(myGlotDictStat)
                    }
                    else {
                        resolve(myGlotDictStat)
                    }
                });
        }, myTimeout);
    });
}

function toastbox(type, message, time, titel, currWindow) {
    playSound = null;
        return new Promise((resolve) => {
            cuteToast({
                type: type, // or 'info', 'error', 'warning'
                message: message,
                timer: time,
                playSound,
                img: "/img",
                title: titel,
                myWindow: currWindow,
            })
            resolve("toast");
        }).catch((err) => {
            console.debug("error:", err)
        });
        // resolve("toast ready");
}

function close_toast() {
    const toastContainer = document.querySelector(".toast-container");
    if (toastContainer != null) {
        toastContainer.remove();
    }
}

function messageBox(type, message) {
    currWindow = window.self;
    cuteAlert({
        type: type,
        title: "Message",
        message: message,
        buttonText: "OK",
        myWindow: currWindow,
        closeStyle: "alert-close",
    });
}

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function getPreview(rowId) {
    preview = document.querySelector(`#preview-${rowId}`)
    return preview
}
function exportGlossaryForOpenAi(locale = "nl") {
    const request = indexedDB.open("DeeplGloss", 1); // use versioning to trigger onupgradeneeded

    request.onupgradeneeded = function (event) {
        const dbDeepL = event.target.result;
        if (!dbDeepL.objectStoreNames.contains("glossary")) {
            const store = dbDeepL.createObjectStore("glossary", { keyPath: "id", autoIncrement: true });
            store.createIndex("locale_original", ["locale", "original"], { unique: true });
        }
    };


    request.onsuccess = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("glossary")) {
            console.warn("Glossary store not found after upgrade.");
            return;
        }

        const transaction = db.transaction(["glossary"], "readonly");
        const store = transaction.objectStore("glossary");

        const glossaryMap = new Map();

        store.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                const { locale: entryLocale, original, translation } = cursor.value;
                if (entryLocale?.toLowerCase() === locale.toLowerCase()) {
                    glossaryMap.set(original, translation);
                }
                cursor.continue();
            } else {
                const lines = Array.from(glossaryMap.entries())
                    .map(([key, value]) => `"${key}" -> "${value}"`)
                    .join(", ");

                chrome.storage.local.set({ OpenAiGloss: lines }, () => {
                    console.log("OpenAiGloss stored");
                });
            }
        };
    };

    request.onerror = function (event) {
        console.error("Failed to open IndexedDB:", event);
    };
}
