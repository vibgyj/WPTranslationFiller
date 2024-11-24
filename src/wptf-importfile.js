async function new_import_po(destlang,myFile,allrows) {
    var pretrans;
    var transtype;
    
    // here we start processing the table
    // 19-06-2021 PSS added animated button for translation at translatePage
    let impLocButton = document.querySelector(".wptfNavBarCont a.impLoc-button");
    impLocButton.innerText = "Importing";
    //console.debug("Button classname:", translateButton.className);
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (impLocButton.className == "impLoc-button") {
        impLocButton.className += " started";
                }
    else {
        impLocButton.classList.remove("started", "imported");
        impLocButton.classList.remove("restarted", "imported");
        impLocButton.className = "impLoc-button restarted";
    }
    toastbox("info", "Import started", "000", "Importing");
                
    for (let record of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        transtype = "single";
        // 16-08-2021 PSS fixed retranslation issue #118
        let rowfound = record.parentElement.parentElement.parentElement.parentElement.id;
        row = rowfound.split("-")[1];
        let newrow = rowfound.split("-")[2];
        if (typeof newrow != "undefined") {
            newrowId = row.concat("-", newrow);
            row = newrowId;
        }
        else {
            rowfound = record.querySelector(`div.translation-wrapper textarea`).id;
            row = rowfound.split("_")[1];
        }
        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
        // We need to determine the current state of the record
        if (currec != null) {
            var current = currec.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
        }
        let original = record.querySelector("span.original-raw").innerText;
        // 14-08-2021 PSS we need to put the status back of the label after translating
        let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
        if (transname != null) {
            transname.className = "trans_name_div";
            transname.innerText = "URL, name of theme or plugin or author!";
            // In case of a plugin/theme name we need to set the button to blue
            let curbut = document.querySelector(`#preview-${row} .priority .tf-save-button`);
            curbut.style.backgroundColor = "#0085ba";
            curbut.innerText = "Save";
            transtype = "single";
        }
        // If in the original field "Singular is present we have a plural translation
        pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
        if (pluralpresent != null) {
            original = pluralpresent.innerText;
            transtype = "plural";
            plural_line = "1";
        }
        else {
            transtype = "single";
            plural_line = "0";
        }
        // PSS 09-03-2021 added check to see if we need to translate
        //Needs to be put into a function, because now it is unnessary double code
        toTranslate = true;
        // Check if the comment is present, if not then if will block the request for the details name etc.
        let element = record.querySelector(".source-details__comment");
        if (element != null) {
            let comment = record.querySelector(".source-details__comment p").innerText;
            comment = comment.replace(/(\r\n|\n|\r)/gm, "");
            toTranslate = checkComments(comment.trim());
        }
        // Do we need to translate ??

        if (toTranslate) {
            
            // console.debug("We search for:",original)
            pretrans = findArrayLine(allrows,original,transtype,plural_line);
            //console.debug("Pretrans found:",pretrans)
            if (pretrans != 'notFound') {
                // Pretranslation found!
                // console.debug("pretrans in found:", pretrans);
                let translatedText = pretrans;
                // 23-08-2022 PSS added fix for issue #236
                // The below vars are not need here, so set them to a default value
                let countreplaced = 0;
                let repl_verb = [];
                let countrows = 0;
                let replaced = false;
                let previewNewText = translatedText;
                // console.debug("nieuw:", "'"+ previewNewText+ "'");
                result = await check_start_end(translatedText, previewNewText, countreplaced, repl_verb, original, replaced, countrows)
                // console.debug(result.translatedText)
                let textareaElem = record.querySelector("textarea.foreign-text");
                let preview = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                    translatedText=result.translatedText; 
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    //console.debug("na:", "'" + translatedText + "'");
                    if (typeof current != "undefined") {
                        current.innerText = "transFill";
                        current.value = "transFill";
                    }
                    // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                    select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                    //select = next_editor.getElementsByClassName("meta");
                    var status = select.querySelector("dt").nextElementSibling;
                    status.innerText = "transFill";
                    status.value = "transFill";
                    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                    if (currec != null) {
                        var current = currec.querySelector("span.panel-header__bubble");
                    }
                    validateEntry(destlang, textareaElem, "", "", row);
                    // PSS 10-05-2021 added populating the preview field issue #68
                    // Fetch the first field Singular
                    let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(1) span.translation-text");
                    if (previewElem != null) {
                        // previewElem.innerText = translatedText;
                    }
                    else {
                        //console.debug("it seems to be a single as li is not found");
                        let preview = document.querySelector("#preview-" + row + " td.translation");
                        let spanmissing = preview.querySelector(" span.missing");
                        if (spanmissing != null) {
                            if (plural_line == "1") {
                                spanmissing.remove();
                            }
                            if (transtype != "single") {
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
                                myspan1.appendChild(document.createTextNode(translatedText));

                                // Also create the second li
                                var li2 = document.createElement("li");
                                //li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
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
                            else {
                                // console.debug("jey it is a single!!");
                                let preview = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                                // console.debug("newtext:","'"+translatedText+"'")
                                preview.innerText = translatedText;
                                current.innerText = "transFill";
                                current.value = "transFill";
                                var element1 = document.createElement("div");
                                element1.setAttribute("class", "trans_local_div");
                                element1.setAttribute("id", "trans_local_div");
                                element1.appendChild(document.createTextNode("Import"));
                                preview.appendChild(element1);

                                // we need to set the checkbox as marked
                                preview = document.querySelector(`#preview-${row}`);
                                rowchecked = preview.querySelector("td input");
                                if (rowchecked != null) {
                                    if (!rowchecked.checked) {
                                        rowchecked.checked = true;
                                    }
                                }
                            }
                        }
                        else {
                            let preview = document.querySelector("#preview-" + row + " td.translation");
                            //console.debug("no span:",preview)
                            // if it is as single with local then we need also update the preview
                            // console.debug("single:", "'" + translatedText + "'");
                            preview.innerText = translatedText;
                            preview.value = translatedText;
                            current.innerText = "transFill";
                            current.value = "transFill";
                            var element1 = document.createElement("div");
                            element1.setAttribute("class", "trans_local_div");
                            element1.setAttribute("id", "trans_local_div");
                            element1.appendChild(document.createTextNode("Import"));
                            preview.appendChild(element1);
                            // we need to set the checkbox as marked
                            preview = document.querySelector(`#preview-${row}`);
                            rowchecked = preview.querySelector("td input");
                            if (rowchecked != null) {
                                if (!rowchecked.checked) {
                                    rowchecked.checked = true;
                                }
                            }
                        }
                    }
                    if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                        document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = "visible";
                    }
            }
            else {
                // console.debug("pretrans not found single!");
                preview = document.querySelector(`#preview-${row}`);
                if (preview != null) {
                    preview.style.display = "none";
                    rowchecked = preview.querySelector("td input");
                    if (rowchecked != null) {
                        //if (!rowchecked.checked) {
                        rowchecked.checked = false;
                        //  }
                    }

                }
            }
            // 10-04-2021 PSS added translation of plural into translatePage
            let e = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
            if (e != null) {
                checkplural = e.querySelector(`#editor-${row} .source-string__plural span.original`);
                if (checkplural != null) {
                    transtype = "plural";
                    plural_line = "2";
                    let plural = checkplural.innerText;
                    // let pretrans = await findTransline(plural, destlang);
                    pretrans = findArrayLine(allrows, plural, transtype, plural_line);
                    if (pretrans == "notFound") {
                        //console.debug("plural pretrans not found!");
                    }
                    else {
                        let countreplaced = 0;
                        let repl_verb = [];
                        let countrows = 0;
                        let replaced = false;
                        result = await check_start_end(pretrans, pretrans, countreplaced, repl_verb, plural, replaced, countrows)
                        // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
                        // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
                        let translatedText = result.translatedText;
                        // Plural second line
                        let rowId = row.split("-")[0];
                        if (current.innerText == "current") {
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // Populate the second line in preview Plural
                            if (prevstate != "current") {
                                let preview = document.querySelector("#preview-" + rowId + " td.translation");
                                if (preview != null) {
                                    preview.innerText = translatedText;
                                    preview.value = translatedText;
                                    var element1 = document.createElement("div");
                                    element1.setAttribute("class", "trans_local_div");
                                    element1.setAttribute("id", "trans_local_div");
                                    element1.appendChild(document.createTextNode("Import"));
                                    preview.appendChild(element1);
                                }
                            }
                        }
                        else {
                            // 30-10-2021 PSS added a fix for issue #154
                            // If the span missing is present it needs to be removed and the ul added otherwise the second line cannot be populated
                            check_span_missing(row, plural_line);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(2) .translation-text");
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                                var element1 = document.createElement("div");
                                element1.setAttribute("class", "trans_local_div");
                                element1.setAttribute("id", "trans_local_div");
                                element1.appendChild(document.createTextNode("Import"));
                                previewElem.appendChild(element1);
                            }
                            current.innerText = "transFill";
                            current.value = "transFill";
                        }
                        // we need to set the checkbox as marked
                        preview = document.querySelector(`#preview-${row}`);
                        rowchecked = preview.querySelector("td input");
                        if (rowchecked != null) {
                            if (!rowchecked.checked) {
                                rowchecked.checked = true;
                            }
                        }
                        validateEntry(destlang, textareaElem1, "", "", row);
                    }
                }
            }
        }
        else {
            // This is when urls/plugin/theme names are present or local translation is present
            //console.debug("name or local:",original)
            let translatedText = original;
            let textareaElem = record.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            let preview = document.querySelector("#preview-" + row + " td.translation");
            if (preview != null) {
                preview.innerText = translatedText;
                preview.value = translatedText;
                pretrans = "FoundName";
                // We need to alter the status otherwise the save button does not work
                current.innerText = "transFill";
                current.value = "transFill";
                //10-05-2022 PSS added poulation of status
                select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                var status = select.querySelector("dt").nextElementSibling;
                status.innerText = "transFill";
                status.value = "transFill";
                // we need to set the checkbox as marked
                preview = document.querySelector(`#preview-${row}`);
                rowchecked = preview.querySelector("td input");
                if (rowchecked != null) {
                    if (!rowchecked.checked) {
                        rowchecked.checked = true;
                    }
                }
                validateEntry(destlang, textareaElem, "", "", row);
            }
        }
        //14-09-2021 PSS changed the class to meet GlotDict behavior
        var currentClass = document.querySelector(`#editor-${row}`);
        var prevcurrentClass = document.querySelector(`#preview-${row}`);
        if (pretrans != 'notFound') {
            //currentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            currentClass.classList.add("wptf-translated");
            currentClass.classList.replace("no-translations", "has-translations");
            currentClass.classList.replace("untranslated", "status-waiting");
            //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            prevcurrentClass.classList.replace("no-translations", "has-translations");
            prevcurrentClass.classList.replace("untranslated", "status-waiting");
            prevcurrentClass.classList.add("wptf-translated");
            // 12-03-2022 PSS changed the background if record was set to fuzzy and new translation is set
            prevcurrentClass.style.backgroundColor = "#ffe399";
        }
        else {
            // We need to adept the class to hide the untranslated lines
            // Hiding the row is done through CSS tr.preview.status-hidden
            prevcurrentClass.classList.replace("untranslated", "status-hidden");
        }
                    
    };
    // Translation completed  
    impLocButton = document.querySelector(".wptfNavBarCont a.impLoc-button");
    impLocButton.classList.remove("started");
    impLocButton.className += " imported";
    impLocButton.innerText = "Imported";
    parrotActive = 'false';

}

function removeQuotes(str) {
    return str.replace(/^(['"])(.*)\1$/, '$2');
}

async function import_po_to_local(destlang, myFile, allrows) {
    var counter = 0;
    var type = "single";
    var complete = false;
    var original = ""
    var translation =""
    // PSS walk through rows found in import
    for (const item of allrows) {
        //console.debug("item:", item)
        if (item.startsWith("msgid ")) {
            counter++
            original = item.replace("msgid ", "")
            original = removeQuotes(original)
            console.debug("original:", original)
            complete = false;
        }
        else if (item.startsWith("msgstr ")) {
            translation = item.replace("msgstr ", "")
            translation = removeQuotes(translation)
            console.debug("translation:", translation)
            complete = true;
            type = "single"
            
        }
        if (!complete) {
            if (item.startsWith("msgstr[0] ")) {
                translation = item.replace("msgstr[0] ", "")
                translation = removeQuotes(translation)
                console.debug("translation plural single:", translation)
                complete = true;
                type = "single"
            }
        }
        if (!complete) {
        
}
        if (complete) {
            if (original != "") {
                res = addTransDb(original, translation, destlang);
            }
            complete=false
        }

        if (!complete) {

            if (item.startsWith("msgid_plural ")) {
                type = "plural"
                plural_original = item.replace("msgid_plural ", "")
                plural_original = removeQuotes(plural_original)
                console.debug("original plural:", original)
                type = "plural"
                complete = false
            }
            else if (item.startsWith("msgstr[1] ")) {
                translation = item.replace("msgstr[1] ", "")
                translation = removeQuotes(translation)
                console.debug("translation plural single:", translation)
                complete = true;
                type = "plural"
                counter++
            }
        }
          
       // console.debug("orig:",original,"trans:",translation)
        if (complete) {
            console.debug("we are saving plural")
            if (plural_original != "") {
                res = await addTransDb(plural_original, translation, destlang);
            }
           complete = false;
           plural_orginal = ""
           translation=""
        }
        //console.debug("item:",item)
        if (item.startsWith("msgstr[2] ")) {
            translation = item.replace("msgstr[2] ", "")
            translation = removeQuotes(translation)
            console.debug("translation plural plural_02:", translation)
            plural_original = plural_original + "_02"
            counter++
            res = await addTransDb(plural_original, translation, destlang);
        }
        if (item.startsWith("msgstr[3] ")) {
            translation = item.replace("msgstr[3] ", "")
            translation = removeQuotes(translation)
            console.debug("translation plural plural_03:", translation)
            plural_original = plural_original + "_03"
            counter++
            res = await addTransDb(plural_original, translation, destlang);
        }
    }
    messageBox("info", "Records imported:" + counter)
    return counter
}
