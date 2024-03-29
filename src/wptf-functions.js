// This file contains functions used within various files

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


function validatePage(language, showHistory, locale,showDiff) {
    // This function checks the quality of the current translations
    // added timer to slow down the proces of fetching data
    // without it we get 429 errors when fetching old records
    var timeout = 0;
    var translation;
    var prev_trans;
    var rowcount = 0;
    // html code for counter in checkbox
    const line_counter = `
    <div class="line-counter">
        <span class="line-counter"></span>
    </div>
    `;
    //console.debug("validatePage:",language,showHistory, locale)
    // 12-06-2021 PSS added project to url so the proper project is used for finding old translations
    let f = document.getElementsByClassName("breadcrumb");
    let url = f[0].firstChild.baseURI;
    let newurl = url.split("?")[0];
    var divProjects = document.querySelector("div.projects");
    // We need to set the priority column only to visible if we are in the project 
    // PSS divProjects can be present but trhead is empty if it is not a project
    var tr = document.getElementById("translations");
    // 18-10-2022 Fix for issue #253 table header wrong within tab discussions
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

    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        setTimeout(() => {
            rowcount++
        let original = e.querySelector("span.original-raw").innerText;
        let textareaElem = e.querySelector("textarea.foreign-text");
        let rowId = textareaElem.parentElement.parentElement.parentElement
                .parentElement.parentElement.parentElement.parentElement.getAttribute("row");
           
        textareaElem.addEventListener("input", function (e, locale) {
                      //language, textareaElem, newurl, showHistory, rowId, locale, record
       // validateEntry(language, e.target, newurl, showHistory, rowId, "nl",e);
        });
        // we need to fetch the status of the record to pass on
        old_status = document.querySelector("#preview-" + rowId);
        let checkbox = old_status.getElementsByClassName("checkbox")
         
        if (checkbox.length != 0) {
            // add counter to checkbox
            checkbox[0].firstChild.insertAdjacentHTML('beforebegin', line_counter);
            checkbox[0].firstChild.nextSibling.textContent = rowcount
            }
        else {
            // if not a PTE it must be put in a different checkbox
            let mycheckbox = old_status.getElementsByClassName("myCheckBox")
            mycheckbox[0].insertAdjacentHTML('afterbegin', line_counter);
            mycheckbox[0].textContent = rowcount
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
            translation = textareaElem.innerText;
            ///console.debug("trans:",translation)
        if (original != translation && showName == true) {
            nameDiff = true;
        }
        else {
            nameDiff = false;
        }
        var result = validate(language, original, translation, locale);
        let record = e.previousSibling.previousSibling.previousSibling
                 
        // this is the start of validation, so no prev_trans is present      
        prev_trans = translation
        updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId,record,false,false,translation,[],prev_trans,old_status,showDiff);
        }, timeout);
        timeout += 20;
       
    }
    // 30-06-2021 PSS set fetch status from local storage
    chrome.storage.local.set({ "noOldTrans": "False" }, function () {
        // Notify that we saved.
        // alert("Settings saved");
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
