// This file contains functions used within various files

function addCheckBox() {
    var BulkButton;
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

function setmyCheckBox(event) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    // if the translator is a PTE than we do not need to add the extra checkboxes
    if (!is_pte) {
        //document.getElementsByClassName("myCheckBox").checked = true;
        document.querySelectorAll("tr.preview").forEach((preview, i) => {
            if (!is_pte) {
                rowchecked = preview.querySelector("td input");
                if (rowchecked != null) {
                    if (!rowchecked.checked) {
                        preview.querySelector("td input").checked = true;
                    }
                }
            }
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

// This function copies the original to the clipboard
function addtoClipBoardClicked(event) {
    if (event != undefined) {
        event.preventDefault();
        copyToClipBoard(detailRow);
    }
}

// This function checks the quality of the current translations
function validatePage(language, showHistory, locale) {
    // 12-06-2021 PSS added project to url so the proper project is used for finding old translations
    let f = document.getElementsByClassName("breadcrumb");
    let url = f[0].firstChild.baseURI;
    let newurl = url.split("?")[0];
    var divProjects = document.querySelector("div.projects");
    // We need to set the priority column only to visible if we are in the project 
    // PSS divProjects can be present but trhead is empty if it is not a project
    var tr = document.getElementById("translations");
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

    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        //console.debug("original:", original);
        let textareaElem = e.querySelector("textarea.foreign-text");
        let rowId = textareaElem.parentElement.parentElement.parentElement
            .parentElement.parentElement.parentElement.parentElement.getAttribute("row");
        textareaElem.addEventListener("input", function (e, locale) {
            //    console.debug("target:", e.target);
            validateEntry(language, e.target, newurl, showHistory, rowId, locale);
        });
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
        let translation = textareaElem.innerText;
        if (original != translation && showName == true) {
            nameDiff = true;
        }
        else {
            nameDiff = false;
        }
        var result = validate(language, original, translation, locale);
        updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId);
    }
    // 30-06-2021 PSS set fetch status from local storage
    chrome.storage.sync.set({ "noOldTrans": "False" }, function () {
        // Notify that we saved.
        // alert("Settings saved");
    });
}

