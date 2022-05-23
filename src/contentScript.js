//console.debug("Content script...");
// PSS added function from GlotDict to save records in editor
// PSS added glob_row to determine the actual row from the editor
var glob_row = 0;
var convertToLow = true;
var detailRow = 0;
var errorstate = "OK";
gd_wait_table_alter();
addCheckBox();
;// 09-09-2021 PSS added fix for issue #137 if GlotDict active showing the bar on the left side of the prio column
chrome.storage.sync
    .get(
        ["glotDictGlos"],
        function (data) {
            var showGlosLine = data.glotDictGlos;
            if (showGlosLine == "false") {
                const style = document.createElement("style");
                style.innerHTML = `
                 tr.preview.has-glotdict .original::before {
                 display: none !important;
                }
                 `;
                document.head.appendChild(style);
            }
            else {
                const style = document.createElement("style");
                style.innerHTML = `
                tr.preview.has-glotdict .original::before {
                width: 5px !important;
                }
                 `;
                document.head.appendChild(style);
            }

        });

// PSS added jsStore to be able to store and retrieve default translations
var jsstoreCon = new JsStore.Connection();
var db = getDbSchema();
var isDbCreated = jsstoreCon.initDb(db);

if (!isDbCreated){
//console.debug("Database is not created, so we create one", isDbCreated);
}
else {
    console.debug("Database is present");
}


//09-05-2021 PSS added fileselector for silent selection of file
var fileSelector = document.createElement("input");
fileSelector.setAttribute("type", "file");

// PSS 31-07-2021 added new function to scrape consistency tool
document.addEventListener("keydown", function (event) {
    if (event.altKey && event.shiftKey && (event.key === "&")) {
        var org_verb;
        var wrong_verb;
        event.preventDefault();
        chrome.storage.sync
            .get(
                ["destlang"],
                function (data) {
                    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
                    // issue #133 block non PTE/GTE users from using this function
                    if (is_pte) {
                        // issue #161 populate the consistency screen with the current values
                        let e = document.querySelector("#editor-" + glob_row + " div.editor-panel__left .panel-content .original");
                        if (e != "undefined" && e != null) {
                            org_verb = e.innerText;
                        }
                        else {
                            org_verb = "Original";
                        }
                        let f = document.querySelector("#editor-" + glob_row + " div.editor-panel__left .panel-content .foreign-text");
                        if (f != "undefined" && e != null){
                            wrong_verb = f.value;
                        }
                        else {
                            wrong_verb = "Wrong verb";
                        }
                        scrapeconsistency(data.destlang,org_verb,wrong_verb);
                    }
                    else {
                        messageBox("error", "You do not have permissions to start this function!");
                    }
                });
    }
});

document.addEventListener("keydown", function (event) {
    //console.debug("eventkey:", event.key);
    if (event.altKey && event.shiftKey && (event.key === "*")) {
        //event.preventDefault();
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        // issue #133 block non PTE/GTE users from using this function
        // if (is_pte) {
        // toastbox("info", "Bulksave started", 2000);
        bulkSave(event);
        // }
    }
    if (event.altKey && event.shiftKey && (event.key === "+")) {
        // This switches convert to lowercase on
        event.preventDefault();
        chrome.storage.sync.set({
            convertToLower: true
        });
        chrome.storage.sync.get(["convertToLower"], function (data) {
            if (data.convertToLower != "null") {
                convertToLow = data.convertToLower;
            }
        });
        toastbox("info", "Switching conversion on", "1200", "Conversion");
    }
    if (event.altKey && event.shiftKey && (event.key === "-")) {
        // This switches convert to lowercase off
        event.preventDefault();
        chrome.storage.sync.set({
            convertToLower: false
        });
        chrome.storage.sync.get(["convertToLower"], function (data) {
            if (data.convertToLower != "null") {
                convertToLow = data.convertToLower;
            }
        });
        toastbox("info", "Switching conversion off", "1200", "Conversion");
    }
    if (event.altKey && event.shiftKey && (event.key === "%")) {
        // This switches convert to lowercase off
        event.preventDefault();
        copyToClipBoard(detailRow);
    }
    if (event.altKey && event.shiftKey && (event.key === "#")) {
        event.preventDefault();
        // Make bulk checkbox active for non PTE
        setmyCheckBox(event);
    }
    if (event.altKey && event.shiftKey && (event.key === "@")) {
        event.preventDefault();
        // Make bulk checkbox not active for non PTE
        deselectCheckBox(event);
    }
    if (event.altKey && event.shiftKey && (event.key === "F1")) {
        event.preventDefault();
        // Reset database
        result = resetDB();
    }
    if (event.altKey && event.shiftKey && (event.key === "F2")) {
        event.preventDefault();
        // Delete database
        result = deleteDB();
    }
    if (event.altKey && event.shiftKey && (event.key === "F3")) {
        event.preventDefault();
        chrome.storage.sync
            .get(
                ["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree"],
                function (data) {
                    if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft") {

                        if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                            if (data.transsel != "undefined") {
                                //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                                var formal = checkFormal(false);
                                //var locale = checkLocale();
                                convertToLow = data.convertToLower;
                                var DeeplFree = data.DeeplFree;
                                result = populateWithLocal(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree);
                            }
                            else {
                                messageBox("error", "You need to set the translator API");
                            }
                        }
                        else {
                            messageBox("error", "You need to set the parameter for Destination language");
                        }
                    }
                    else {
                        messageBox("error", "For " + data.transsel + " no apikey is set!");
                    }
                });
    }

    if (event.altKey && event.shiftKey && (event.key === "F5")) {
        event.preventDefault();
        chrome.storage.sync
            .get(
                ["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree","TMwait"],
                function (data) {
                    if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft") {

                        if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                            if (data.transsel != "undefined") {
                                //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                                var formal = checkFormal(false);
                                //var locale = checkLocale();
                                convertToLow = data.convertToLower;
                                var DeeplFree = data.DeeplFree;
                                if (typeof data.TMwait == "undefined") {
                                    var TMwait = 500;
                                }
                                else {
                                   var TMwait = data.TMwait;
                                }
                                result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree,TMwait);
                            }
                            else {
                                messageBox("error", "You need to set the translator API");
                            }
                        }
                        else {
                            messageBox("error", "You need to set the parameter for Destination language");
                        }
                    }
                    else {
                        messageBox("error", "For " + data.transsel + " no apikey is set!");
                    }
                });
    }

    if (event.altKey && event.shiftKey && (event.key === "F6")) {
        event.preventDefault();
        var rule = {
            "id": 1,
            "priority": 1,
            "action": { "type": "allow" },
            "condition": {
                "regexFilter": "-get-tm-suggestions",
                "resourceTypes": ["xmlhttprequest"]
            }
        };

        resblock = chrome.declarativeNetRequest.updateEnabledRulesets({ addRules: [rule] });
        //console.debug("blockres:"), resblock;
    }

    if (event.altKey && event.shiftKey && (event.key === "F7")) {
        //event.preventDefault();
        let userAgent = navigator.userAgent;
        let browser;

        if (userAgent.match(/chrome|chromium|crios/i)) {
            browser = "chrome";
        } else if (userAgent.match(/firefox|fxios/i)) {
            browser = "firefox";
        } else if (userAgent.match(/safari/i)) {
            browser = "safari";
        } else if (userAgent.match(/opr\//i)) {
            browser = "opera";
        } else if (userAgent.match(/edg/i)) {
            browser = "edge";
        } else {
            browser = "No browser detection";
        }
       
        res = chrome.declarativeNetRequest.updateEnabledRuleset(
          {
              addRules: [{
                    "id": 1,
                   "priority": 1,
                 "action": { "type": "block" },
                "condition": {
                  "regexFilter": "-get-tm-suggestions",
                     "resourceTypes": ["xmlhttprequest"]
                 }
              }
              ],
               removeRuleIds: [1]
           },
        )
    }
});

// PSS 29-07-2021 added a new function to replace verbs from the command line, or through a script collecting the links issue #111
document.addEventListener("keydown", function (event) {
    if (event.altKey && (event.key === "r" || event.key === "R")) {
        event.preventDefault();
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        // issue #133 block non PTE/GTE users from using this function
        if (is_pte) {
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            const wrongverb = urlParams.get("wrongverb");
            const replverb = urlParams.get("replverb");
            var search = wrongverb;
            var repl = replverb;
            var e;
            var textareaElem;
            var translatedText;
            var replaced = false
            //myrow = event.target.parentElement.parentElement;
            //rowId = myrow.attributes.row.valueclose;
            for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
                let original = e.querySelector("span.original-raw").innerText;
                // Fetch the translations
                let element = e.querySelector(".source-details__comment");
                textareaElem = e.querySelector("textarea.foreign-text");
                translatedText = textareaElem.value;
                let replaced = false;

                // PSS 09-03-2021 added check to see if we need to translate
                let toTranslate = true;
                // Check if the comment is present, if not then it will block the request for the details name etc.   

                if (element != null) {
                    // Fetch the comment with name
                    if (typeof rowId != "undefined") {
                        let comment = e.querySelector("#editor-" + rowId + " .source-details__comment p").innerText;
                        toTranslate = checkComments(comment);
                    }
                    else {
                        toTranslate == true;
                    }
                }
                if (toTranslate == true) {
                    if (translatedText.includes(search)) {
                        translatedText = translatedText.replaceAll(search, repl);
                        replaced = true;
                        textareaElem.innerText = translatedText;
                        textareaElem.value = translatedText;
                        let glotpress_open = document.querySelector(`td.actions .edit`);
                        let glotpress_save = document.querySelector(`div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);

                        //let glotpress_approve = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .approve`);
                        let glotpress_close = document.querySelector(`div.editor-panel__left .panel-header-actions__cancel`);
                        glotpress_open.click();
                        glotpress_save.click();
                        //glotpress_approve.click();
                        //glotpress_close.click();
                        setTimeout(() => { glotpress_close.click(); }, 1500);
                    }
                    else {
                        messageBox("error", "Verb not found!" + search);
                        replaced = false;
                        break;
                    }
                }
                else {
                    messageBox("error", "The name of plugin/theme/url do not need to be replaced!");
                    replaced = false;
                }
                if (replaced == true) {
                    setTimeout(() => { window.close(); }, 1000);
                }
            }

        }
        else {
            messageBox("error", "You do not have permissions to start this function!");
        }
    }
});

let bulkbutton = document.getElementById("tf-bulk-button");
if (bulkbutton != null){
    bulkbutton.addEventListener("click", () => {
        bulkSave(event);
    });
}

// PSS added this one to be able to see if the Details button is clicked
// 16-06-2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
const el = document.getElementById("translations");
if (el != null) {
    el.addEventListener("click", checkbuttonClick);
}

const el3 = document.getElementById("translations");
if (el3 != null) {
    el3.addEventListener("click", checkactionClick);
}


//Add option link
var optionlink = document.createElement("li");
var a = document.createElement('a');

a.href = chrome.runtime.getURL('wptf-options.html');
var link = document.createTextNode("WPTF options");
a.appendChild(link)
optionlink.className = 'menu-item wptf_settings_menu'

var divMenu = document.querySelector("#menu-headline-nav");
optionlink.appendChild(a)
divMenu.appendChild(optionlink);
//Add translate button - start
var translateButton = document.createElement("a");
translateButton.href = "#";
translateButton.className = "translation-filler-button";
translateButton.onclick = translatePageClicked;
translateButton.innerText = "Translate";
var divPaging = document.querySelector("div.paging");
// 1-05-2021 PSS fix for issue #75 do not show the buttons on project page
var divProjects = document.querySelector("div.projects");

//12-05-2022 PSS added a new button for local translate
var localtransButton = document.createElement("a");
localtransButton.href = "#";
localtransButton.className = "local-trans-button";
localtransButton.onclick = localTransClicked;
localtransButton.innerText = "Local";

//12-05-2022 PSS added a new button for local translate
var tmtransButton = document.createElement("a");
tmtransButton.href = "#";
tmtransButton.className = "tm-trans-button";
tmtransButton.onclick = tmTransClicked;
tmtransButton.innerText = "TM";

//23-03-2021 PSS added a new button on first page
var checkButton = document.createElement("a");
checkButton.href = "#";
checkButton.className = "check_translation-button";
checkButton.onclick = checkPageClicked;
checkButton.innerText = "CheckPage";

//07-05-2021 PSS added a export button on first page
var exportButton = document.createElement("a");
exportButton.href = "#";
exportButton.className = "export_translation-button";
exportButton.onclick = exportPageClicked;
exportButton.innerText = "Export";

//07-05-2021 PSS added a import button on first page
var importButton = document.createElement("a");
importButton.href = "#";
importButton.id = "ImportDb";
//importButton.type = "file";
//importButton.style="display: none";
importButton.className = "import_translation-button";
importButton.onclick = importPageClicked;
importButton.innerText = "Import";

// 12-05-2022 PSS here we add all buttons in the pagina together
if (divPaging != null && divProjects == null) {
    divPaging.insertBefore(translateButton, divPaging.childNodes[0]);
    divPaging.insertBefore(localtransButton, divPaging.childNodes[0]);
    divPaging.insertBefore(tmtransButton, divPaging.childNodes[0]);
    divPaging.insertBefore(checkButton, divPaging.childNodes[0]);
    divPaging.insertBefore(exportButton, divPaging.childNodes[0]);
    divPaging.insertBefore(importButton, divPaging.childNodes[0]);
}

// 12-05-2022 PSS addid this function to start translating from translation memory button
function tmTransClicked(event) {
    event.preventDefault();
    chrome.storage.sync
        .get(
            ["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree", "TMwait"],
            function (data) {
                if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft") {

                    if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                        if (data.transsel != "undefined") {
                            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                            var formal = checkFormal(false);
                            //var locale = checkLocale();
                            convertToLow = data.convertToLower;
                            var DeeplFree = data.DeeplFree;
                            if (typeof data.TMwait == "undefined") {
                                var TMwait = 500;
                            }
                            else {
                                var TMwait = data.TMwait;
                            }
                            result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, TMwait);
                        }
                        else {
                            messageBox("error", "You need to set the translator API");
                        }
                    }
                    else {
                        messageBox("error", "You need to set the parameter for Destination language");
                    }
                }
                else {
                    messageBox("error", "For " + data.transsel + " no apikey is set!");
                }
            });

}
//12-05-2022 PSS added this function to start local translating with button
function localTransClicked(event) {
    event.preventDefault();
    chrome.storage.sync
        .get(
            ["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree"],
            function (data) {
                if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft") {

                    if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                        if (data.transsel != "undefined") {
                            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                            var formal = checkFormal(false);
                            //var locale = checkLocale();
                            convertToLow = data.convertToLower;
                            var DeeplFree = data.DeeplFree;
                            result = populateWithLocal(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree);
                        }
                        else {
                            messageBox("error", "You need to set the translator API");
                        }
                    }
                    else {
                        messageBox("error", "You need to set the parameter for Destination language");
                    }
                }
                else {
                    messageBox("error", "For " + data.transsel + " no apikey is set!");
                }
            });

}

function translatePageClicked(event) {
    event.preventDefault();
    chrome.storage.sync
        .get(
            ["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower","DeeplFree"],
            function (data) {
                if (typeof data.apikey != "undefined" && data.apikey !="" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl !="" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft !="" && data.transsel == "microsoft") {

                    if (data.destlang != "undefined" && data.destlang != null && data.destlang !="") {
                        if (data.transsel != "undefined") {
                            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                            var formal = checkFormal(false);
                            //var locale = checkLocale();
                            convertToLow = data.convertToLower;
                            var DeeplFree = data.DeeplFree;
                            translatePage(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree)
                        }
                        else {
                            messageBox("error", "You need to set the translator API");
                        }
                    }
                    else {
                        messageBox("error", "You need to set the parameter for Destination language");
                    }
                }
                else {
                    messageBox("error", "For " + data.transsel + " no apikey is set!");
                    }
            });
}

function checkLocale() {
    const localeString = window.location.href;
    locale = localeString.split("/");
    if (localeString.includes("wp-plugins") ) {
        locale = locale[7]
    }
    else {
        locale = locale[6]
    }
    return locale;
}
function checkFormal(formal) {
    const locString = window.location.href;
    if (locString.includes("default")) {
        return false;
    }
    else {
    return true;
    }
}

function checkPageClicked(event) {
    event.preventDefault();
    toastbox("info", "checkPage is started wait for the result!!", "10000", "CheckPage");
    chrome.storage.sync
        .get(
            ["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
            function (data) {
                checkPage(data.postTranslationReplace);
                close_toast();
            }); 
}

function exportPageClicked(event) {
    event.preventDefault();
    chrome.storage.sync
        .get(
            ["apikey", "destlang"],
            function (data) {
                dbExport(data.destlang);
            });
   // res= dbExport();
    
}


let glossary = [];
chrome.storage.sync.get(["glossary", "glossaryA", "glossaryB", "glossaryC"
    , "glossaryD", "glossaryE", "glossaryF", "glossaryG", "glossaryH", "glossaryI"
    , "glossaryJ", "glossaryK", "glossaryL", "glossaryM", "glossaryN", "glossaryO"
    , "glossaryP", "glossaryQ", "glossaryR", "glossaryS", "glossaryT", "glossaryU"
    , "glossaryV", "glossaryW", "glossaryX", "glossaryY", "glossaryZ", "destlang"],
    function (data) {
        loadSet(glossary, data.glossary);
        loadSet(glossary, data.glossaryA);
        loadSet(glossary, data.glossaryB);
        loadSet(glossary, data.glossaryC);
        loadSet(glossary, data.glossaryD);
        loadSet(glossary, data.glossaryE);
        loadSet(glossary, data.glossaryF);
        loadSet(glossary, data.glossaryG);
        loadSet(glossary, data.glossaryH);
        loadSet(glossary, data.glossaryI);
        loadSet(glossary, data.glossaryJ);
        loadSet(glossary, data.glossaryK);
        loadSet(glossary, data.glossaryL);
        loadSet(glossary, data.glossaryM);
        loadSet(glossary, data.glossaryN);
        loadSet(glossary, data.glossaryO);
        loadSet(glossary, data.glossaryP);
        loadSet(glossary, data.glossaryQ);
        loadSet(glossary, data.glossaryR);
        loadSet(glossary, data.glossaryS);
        loadSet(glossary, data.glossaryT);
        loadSet(glossary, data.glossaryU);
        loadSet(glossary, data.glossaryV);
        loadSet(glossary, data.glossaryW);
        loadSet(glossary, data.glossaryX);
        loadSet(glossary, data.glossaryY);
        loadSet(glossary, data.glossaryZ);
        if (typeof data.glossary == "undefined") {
            messageBox("error", "Your glossary is not loaded because no file is loaded!!");
            //alert("Your glossary is not loaded because no file is loaded!!");
        }
        glossary.sort(function (a, b) {
            // to sory by descending order
            return b.key.length - a.key.length;
        });
        addTranslateButtons();
        if (glossary.length > 0) {
            chrome.storage.sync.get(["showHistory"], function (data) {
                if (data.showHistory != "null") {
                    locale = checkLocale();
                    validatePage(data.destlang, data.showHistory, locale);
                }
            });
        }
        else {
            messageBox("error", "Your glossary is not loaded because no file is loaded!!");
        }
        checkbuttonClick();
    });

function loadSet(x, set) {
    glossary = glossary.concat(set);
}

function addTranslateButtons() {
    //16 - 06 - 2021 PSS fixed this function addTranslateButtons to prevent double buttons issue #74
    for (let e of document.querySelectorAll("tr.editor")) {
        let rowId = e.getAttribute("row");
        
        let panelHeaderActions = e.querySelector("#editor-" + rowId + " .panel-header .panel-header-actions");
        var currentcel = document.querySelector(`#preview-${rowId} td.priority`);
        currentcel.innerText = "";
        // Add translate button
        let translateButton = document.createElement("my-button");
        importButton.href = "#";
        translateButton.id = `translate-${rowId}-translation-entry-my-button`;
        translateButton.className = "translation-entry-my-button";
        translateButton.onclick = translateEntryClicked;
        translateButton.innerText = "Translate";
        translateButton.style.cursor = "pointer";
        panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);

        // Add addtranslate button
        let addTranslateButton = document.createElement("my-button");
       
        importButton.href = "#";
        addTranslateButton.id = `translate-${rowId}-addtranslation-entry-my-button`;
        addTranslateButton.className = "addtranslation-entry-my-button";
        addTranslateButton.onclick = addtranslateEntryClicked;
        addTranslateButton.innerText = "Add Translation";
        addTranslateButton.style.cursor = "pointer";
        panelHeaderActions.insertBefore(addTranslateButton, panelHeaderActions.childNodes[0]);

        let TranslocalButton = document.createElement("local-button");
        TranslocalButton.id = `translate-${rowId}-translocal-entry-local-button`;
        TranslocalButton.className = "translocal-entry-local-button";
        TranslocalButton.innerText = "Local";
        TranslocalButton.style.visibility = "hidden";
        panelHeaderActions.insertBefore(TranslocalButton, panelHeaderActions.childNodes[0]);

        let translationActions = e.querySelector("#editor-" + rowId + " div.editor-panel__left .panel-content .translation-actions");
        let panelCont = document.createElement("copy-button"); 
        panelCont.className = "with-tooltip";
        panelCont.id = `meta-copy-to-clipboard`;
        panelCont.ariaLabel = "Copy original to clipboard";
        panelCont.style.cursor = "pointer";
        panelCont.onclick = addtoClipBoardClicked;
        let panelTool = document.createElement("span");
        panelTool.className = "tooltiptext";
        panelTool.className = "dashicons dashicons-clipboard";
        panelCont.appendChild(panelTool);
        translationActions.appendChild(panelCont);
    }
}

// 08-05-2021 PSS added import of records into local database
function importPageClicked(event) {
    event.preventDefault();
    fileSelector.click();
    fileSelector.addEventListener("change", (event) => {
        fileList = event.target.files;
        const arrayFiles = Array.from(event.target.files)
        const file = fileList[0];
        var obj_csv = {
            size: 0,
            dataFile: []
        };
        // 09-05-2021 PSS added check for proper import type
        // File type not recognized on some systems issue #183
        if (file.type == "text/csv" || "application/vnd.ms-excel") {
            if (fileList[0]) {
                let reader = new FileReader();
                //reader.readAsBinaryString(fileList[0]);
                // 30-10-2021 PSS added fix #156 for converting special chars
                reader.readAsText(fileList[0]);
                reader.onload = function (e) {
                    //console.log("functions started:",e);
                    obj_csv.size = e.total;
                    obj_csv.dataFile = e.target.result;
                    //console.log(obj_csv.dataFile)
                    //File is imported so process it
                    parseDataBase(obj_csv.dataFile);

                    //alert("Import is running please wait");          
                }
            }

        }
        else {
            // File is wrong type so do not process it
            messageBox("error", "File is not a csv!");
        }
    });
}

async function parseDataBase(data) {
    toastbox("info", "Import is started wait for the result!!", "2000", "Import database");
    //messageBox("info", "Import is started wait for the result");
    let csvData = [];
    let lbreak = data.split("\n");
    let counter = 0;
    // To make sure we can manipulate the data store it into an array
    lbreak.forEach(res => {
        // 09-07-2021 PSS altered the separator issue #104
        csvData.push(res.split("|"));
        ++counter;
    });
    if (counter > 0) {
        var arrayLength = csvData.length;
        for (var i = 0; i < arrayLength; i++) {
            if (i > 1) {
                // Store it into the database
                //Prevent adding empty line
                if (csvData[i][0] != "") {
                    if (i == 200 || i == 400 || i == 600 || i == 800 || i == 1000 || i == 1200) {
                        toastbox("info", "Adding is running <br>Records added:"+i, "2000", "Import database");
                    }
                    res = await addTransDb(csvData[i][0], csvData[i][1], csvData[i][2]);
                }
            }
        }
        close_toast();
        messageBox("info", "Import is ready records imported: " + i);

    }
    let importButton = document.querySelector(".paging a.import_translation-button");
    importButton.className += " ready";
}


function addtoClipBoardClicked(event) {
    if (event != undefined) {
        event.preventDefault();
        copyToClipBoard(detailRow);
    }
}

// 18-06-2021 PSS added function to find the new rowId after clicking "approve", "reject" ,"fuzzy", and "save" 
function checkactionClick(event) {
    if (event != undefined) {
        //let action = event.target.textContent;
        // 19-06-2021 PSS changed the type to classname to prevent possible translation issue
        let classname = event.target.getAttribute("class");
        if (classname == "approve" || classname == "reject" || classname == "fuzzy" || classname == "dashicons dashicons - backup") {
            // here we go back to the previous entry in the table to find the previous rowId    
            const firstLink = event.target.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
            // 18-06-2021 PSS added searching for previous translations issue  #84
            if (firstLink != null) {
                const nextLink = firstLink.nextElementSibling;
                if (nextLink != null) {
                    const newRowId = nextLink.getAttribute("row");
                    // Find the project to use in the link
                    let f = document.getElementsByClassName("breadcrumb");
                    let url = f[0].firstChild.baseURI;
                    let newurl = url.split("?")[0];
                    if (typeof newurl != "undefined") {
                        // find the prev/old translations if present
                        //url = newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + newRowId + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc";
                        url = newurl + "?filters%5Bstatus%5D=mystat&filters%5Boriginal_id%5D=" + newRowId;
                        //rowsFound = fetchOld("","",url,"True");
                        chrome.storage.sync.get(["showTransDiff"], function (data) {
                            if (data.showTransDiff != "null") {
                                fetchOldRec(url, newRowId);
                            }
                        });
                    }
                }
            }
        }
    }
    //else {
        // Necessary to prevent showing old translation exist if started from link "Translation history"
        //chrome.storage.sync.set({ "noOldTrans": "False" }, function () {
            // Notify that we saved.
            // alert("Settings saved");
       // });
   // }
        
}
// 04-04-2021 PSS issue #24 added this function to fix the problem with no "translate button in single"
// 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
function checkbuttonClick(event) {
    //console.debug("eventAction:", event)
    if (event != undefined) {
            var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
            //event.preventDefault(); caused a problem within the single page enttry  
            let action = event.target.textContent;
            // 30-06-2021 PSS added fetch status from local storage
            // Necessary to prevent showing old translation exist if started from link "Translation history"
            // alert(action);
            // 22-06-2021 PSS fixed issue #90 where the old translations were not shown if vladt WPGP Tool is active
            if (action == "Details" || action == "✓Details") {
                let rowId = event.target.parentElement.parentElement.getAttribute("row");
                glob_row = rowId;
                detailRow = rowId;
                let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);

                // We need to expand the amount of columns otherwise the editor is to small due to the addition of the extra column
                // if the translator is a PTE then we do not need to do this, as there is already an extra column
                let myrec = document.querySelector(`#editor-${detailRow}`);
                if (!is_pte) {
                    var tds = myrec.getElementsByTagName("td")[0];
                    tds.setAttribute("colspan", 5);
                }
                myrec.scrollIntoView(true);
                // 02-07-2021 PSS fixed issue #94 to prevent showing label of existing records in the historylist
                chrome.storage.sync.set({ "noOldTrans": "True" }, function () {
                    // Notify that we saved.
                    // alert("Settings saved");
                });
                // 13-06-2021 PSS added showing a new window if an existing translation is present, issue #81
                let f = document.getElementsByClassName("breadcrumb");
                let url = f[0].firstChild.baseURI;
                let newurl = url.split("?")[0];
                if (typeof newurl != "undefined") {
                    // 02-07-2021 PSS Sometimes the difference is not shown in the single entry #95
                    // Fetch only the current string to compaire with the waiting string
                    //url = newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + rowId + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc";
                    url = newurl + "?filters%5Bstatus%5D=mystat&filters%5Boriginal_id%5D=" + rowId;
                    chrome.storage.sync.get(["showTransDiff"], function (data) {
                        if (data.showTransDiff != "null") {
                            if (data.showTransDiff == true) {
                                fetchOldRec(url, rowId);
                            }
                        }
                    });
                }
                if (translateButton == null) {
                    let panelHeaderActions = document.querySelector("#editor-" + rowId + " .panel-header .panel-header-actions");
                    let translateButton = document.createElement("my-button");
                    translateButton.id = `translate-${rowId}-translation-entry-my-button`;
                    translateButton.className = "translation-entry-my-button";
                    translateButton.onclick = translateEntryClicked;
                    translateButton.innerText = "Translate";
                    panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);
                    // Add addtranslate button
                    let addTranslateButton = document.createElement("my-button");

                    addTranslateButton.id = `translate-${rowId}-addtranslation-entry-my-button`;
                    addTranslateButton.className = "addtranslation-entry-my-button";
                    addTranslateButton.onclick = addtranslateEntryClicked;
                    addTranslateButton.innerText = "Add Translation";
                    panelHeaderActions.insertBefore(addTranslateButton, panelHeaderActions.childNodes[0]);

                    let TranslocalButton = document.createElement("local-button");
                    TranslocalButton.id = `translate-${rowId}-translocal-entry-local-button`;
                    TranslocalButton.className = "translocal-entry-local-button";
                    TranslocalButton.innerText = "Local";
                    TranslocalButton.style.visibility = "hidden";
                    panelHeaderActions.insertBefore(TranslocalButton, panelHeaderActions.childNodes[0]);
                }
            }
    }
}

function translateEntryClicked(event) {
    event.preventDefault();
    let rowId = event.target.id.split("-")[1];
    let myrowId = event.target.id.split("-")[2];
    //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
    // So that needs to be added to the base rowId to find it
    if (typeof myrowId != "undefined" && myrowId != "translation") {
        newrowId = rowId.concat("-", myrowId);
        rowId = newrowId;
    }
    chrome.storage.sync
        .get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower","DeeplFree"], function (data) {
            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
            var formal = checkFormal(false);
            var DeeplFree = data.DeeplFree;
            translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower,DeeplFree);
        });
}

function updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var currcount;
    if (typeof rowId == "undefined") {
        let rowId = textareaElem.parentElement.parentElement.parentElement
           .parentElement.parentElement.parentElement.parentElement.getAttribute("row");
    }
    originalElem = document.querySelector("#preview-" + rowId + " .original");
    // 22-06-2021 PSS altered the position of the colors to the checkbox issue #89
    let checkElem = document.querySelector("#preview-" + rowId + " .priority");
    

    var saveButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
    // we need to take care that the save button is not added twice
   
    if (typeof checkElem == "object") {
        if (saveButton == null) {
            if (!is_pte) {
                let checkBx = document.querySelector("#preview-" + rowId + " .myCheckBox");
                var checkbox = document.createElement('input');
                checkbox.setAttribute("type", "checkbox");
                checkbox.setAttribute("name", "selected-row[]");
                checkBx.appendChild(checkbox);
                let myrec = document.querySelector(`#editor-${rowId}`);
                // We need to expand the amount of columns otherwise the editor is to small
                var tds = myrec.getElementsByTagName("td")[0];
                tds.setAttribute("colspan", 5);
               
            }
            // check for the status of the record
            var separator1 = document.createElement("div");
            separator1.setAttribute("class", "checkElem_save");
            if (checkElem != null) {
                checkElem.appendChild(separator1);
            }
            
            myrec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            current = myrec.querySelector("span.panel-header__bubble");
            // console.debug("updatestyle current:", current);
            let SavelocalButton = document.createElement("button");
            SavelocalButton.id = "tf-save-button";
            SavelocalButton.className = "tf-save-button";
            SavelocalButton.onclick = savetranslateEntryClicked;
            if (current.innerText == "untranslated") {
                SavelocalButton.innerText = "Empt";
                SavelocalButton.style.backgroundColor = "grey";
                checkElem.title = "No translation";
            }
            else if (current.innerText == "waiting") {
                SavelocalButton.innerText = "Appr";
                SavelocalButton.style.backgroundColor = "#0085ba";
                checkElem.title = "Approve the string";
            }
            else if (current.innerText == "transFill") {
                SavelocalButton.innerText = ("Save");
                SavelocalButton.style.backgroundColor = "#0085ba";
                checkElem.title = "Save the string";
            }
            else if (current.innerText == "fuzzy") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Reject the string";
            }
            else if (current.innerText == "current") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Curr");
                checkElem.title = "Current string";
            }
            else if (current.innerText == "rejected") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Rejected string";
            }
            //SavelocalButton.ariaLabel = "Save and approve translation";
            checkElem.appendChild(SavelocalButton);
        }
        else {
            saveButton.innerText = ("Save");
            saveButton.style.backgroundColor = "#0085ba";
            checkElem.title = "Save the string";
        }
    }
    //let origElem =  updateElementStyle(checkElem, result,"False",originalElem,"","","","","",rowId,showName);
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    updateElementStyle(checkElem, headerElem, result, "False", originalElem, "", "", "", "", rowId,showName,nameDiff,currcount);
    let row = rowId.split("-")[0];
    
    // 12-06-2021 PSS do not fetch old if within the translation
    // 01-07-2021 fixed a problem causing an undefined error
    // 05-07-2021 PSS prevent with toggle in settings to show label for existing strings #96
            if (showHistory == true) {
                if (newurl.substring(1, 9) != "undefined") {
                    fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", "False", originalElem,row,rowId);
                }
                else {
                    fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", "True", originalElem,row,rowId);
                }
            }
}

function validateEntry(language, textareaElem, newurl, showHistory,rowId,locale) {
    // 22-06-2021 PSS fixed a problem that was caused by not passing the url issue #91
    var translation;
    translation = textareaElem.value;
    // console.debug("value:",translation,textareaElem)
    let original = textareaElem.parentElement.parentElement.parentElement
        .querySelector("span.original-raw");
    let originalText = original.innerText;
    let result = validate(language, originalText, translation,locale);
    updateStyle(textareaElem, result, newurl, showHistory,"True","",rowId);
}

function updateElementStyle(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff,currcount) {
    var current;
    if (typeof rowId != "undefined") {
        var SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        if (SavelocalButton == "null") {
            
            SavelocalButton = document.createElement("button");
            SavelocalButton.id = "tf-save-button";
            SavelocalButton.className = "tf-save-button";
            let myrec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            if (myrec != "null") {
                current = myrec.querySelector("span.panel-header__bubble");
                if (current.innerText == "transFill") {
                    SavelocalButton.innerText = "Save";
                    SavelocalButton.disabled = false;
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Save the string";
                }
                else if (current.innerText == "waiting") {
                    SavelocalButton.innerText = "Appr";
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Approve the string";
                }
                else if (current.innerText == "current") {
                    SavelocalButton.innerText = "Curr";
                    checkElem.title = "Current translation";
                }
                else if (current.innerText == "rejected") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = ("Rej");
                    SavelocalButton.disabled = true;
                    checkElem.title = "Rejected string";
                }
                else if (current.innerText == "untranslated") {
                    SavelocalButton.innerText = "Empt";
                    SavelocalButton.style.backgroundColor = "grey";
                    checkElem.title = "No translation";
                }
                else if (current.innerText == "fuzzy") {
                    SavelocalButton.innerText = "Fuzz";
                    SavelocalButton.style.backgroundColor = "grey";
                    checkElem.title = "Fuzzy string";
                }
                SavelocalButton.title = "Something is wrong";
                checkElem.appendChild(SavelocalButton);
            }
        }
        else {
            //console.debug(" rowid:", rowId,typeof rowId)
            if (rowId != null && rowId !="") {
                let myrec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
                current = myrec.querySelector("span.panel-header__bubble");
                if (current.innerText == "transFill") {
                    SavelocalButton.innerText = "Save";
                    SavelocalButton.disabled = false;
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Save the string";
                }
                else if (current.innerText == "waiting") {
                    SavelocalButton.innerText = "Appr";
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Approve the string";
                }
                else if (current.innerText == "untranslated") {
                    SavelocalButton.style.backgroundColor = "grey";
                    SavelocalButton.innerText = "Empt";
                    checkElem.title = "No translation";
                }
                else if (current.innerText == "current") {
                    SavelocalButton.innerText = "Curr";
                    checkElem.title = "Current translation";
                }
                else if (current.innerText == "fuzzy") {
                    SavelocalButton.innerText = "Fuzz";
                    checkElem.title = "Fuzzy string";
                }
                else if (current.innerText == "rejected") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = ("Rej");
                    SavelocalButton.disabled = true;
                    checkElem.title = "Rejected string";
                }
                else {
                    console.debug("no current text found");
                }
            }
            else {
            
                current = document.querySelector("span.panel-header__bubble");
                // We are in editor
            
                
            }
        }
    }
    // 13-08-2021 PSS added a notification line when it concerns a translation of a name for the theme/plugin/url/author
    if (showName == true) {
        if (originalElem != undefined) {
            var element1 = document.createElement("div");
            originalElem.appendChild(element1);
            if (nameDiff == true) {
                element1.setAttribute("class", "trans_name_div_true");
                element1.setAttribute("id", "trans_name_div_true");
                element1.appendChild(document.createTextNode("Difference in URL, name of theme or plugin or author!"));
            }
            else {
                element1.setAttribute("class", "trans_name_div");
                element1.setAttribute("id", "trans_name_div");
                element1.appendChild(document.createTextNode("URL, name of theme or plugin or author!"));
            }
            //element1.style.cssText = "padding-left:0px; padding-top:20px";
            //originalElem.appendChild(element1);
        }
    }

    if (oldstring == "True") {
    // 05-07-2021 this function is need to set the flag back for noOldTrans at pageload
        // 22-06-2021 PSS added tekst for previous existing translations into the original element issue #89
        if (originalElem != undefined) {
            // 19-09-2021 PSS fixed issue #141 duplicate label creation
            var labexist = originalElem.getElementsByClassName("trans_exists_div");
            if (labexist.length > 0) {
                labexist[0].parentNode.removeChild(labexist[0]);
            }
            var element1 = document.createElement("div");
            element1.setAttribute("class", "trans_exists_div");
            originalElem.appendChild(element1);
            //element1.style.cssText = "padding-left:0px; padding-top:20px";
            element1.appendChild(document.createTextNode("Existing string(s)! " + currcount + " " + wait + " " + rejec + " " + fuz + " " + old));
            //originalElem.appendChild(element1);
        }
        else {
            console.debug("updateElementStyle empty!:", originalElem);
        }
    }
    if (typeof result.wordCount == "undefined") {
        SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        if (SavelocalButton != null) {
            let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            if (h != null) {
                current = h.querySelector("span.panel-header__bubble");
                if (current.innerText == "transFill") {
                    SavelocalButton.innerText = "Save";
                    SavelocalButton.disabled = false;
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.title = "Save the string";
                }
                else if (current.innerText == "waiting") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = "Appr";
                    checkElem.title = "Approve the string";
                }
                else if (current.innerText == "current") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = "Curr";
                    checkElem.title = "Save the string";
                }
               else if (current.innerText == "rejected") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = ("Rej");
                    SavelocalButton.disabled = true;
                    checkElem.title = "Rejected string";
                }
                else if (current.innerText == "fuzzy") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = ("Fuzz");
                    SavelocalButton.disabled = true;
                    checkElem.title = "Fuzzy string";
                }
                else {
                    SavelocalButton.innerText = "Appr";
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Something is wrong";
                }
            }
            else {
               // console.debug("no current found!");
                //SavelocalButton.innerText = "Save";
                SavelocalButton.title = "Do not save!!";
            }
        }
        return;
    }
    if (result.wordCount == 0) {
            SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");

            let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            if (h != null) {
                current = h.querySelector("span.panel-header__bubble");
                if (current.innerText == "transFill") {
                    SavelocalButton.innerText = "Save";
                    SavelocalButton.disabled = false;
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Save the string";
                }
                else if (current.innerText == "waiting") {
                    SavelocalButton.innerText = "Appr";
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    checkElem.title = "Approve the string";
                }
                else if (current.innerText == "current") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = "Curr";
                    checkElem.title = "Save the string";
                }
                else if (current.innerText == "rejected") {
                    SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = ("Rej");
                    SavelocalButton.disabled = true;
                    checkElem.title = "Rejected string";
                }
                else if (current.innerText == "untranslated") {
                    // SavelocalButton.innerText = "Save";
                    checkElem.title = "Do not save the string";
                }
                return; 
            }
    }
    if (result.percent == 100) {
        checkElem.innerHTML = "100";
        checkElem.style.backgroundColor = "green";

        if (current.innerText == "transFill") {
            SavelocalButton.style.backgroundColor = "#0085ba";
            SavelocalButton.innerText = "Save";
            SavelocalButton.disabled = false;
            checkElem.title = "Save the string";
        }
       
        if (typeof headerElem.style != "undefined") {
            headerElem.style.backgroundColor = "green";
            if (current.innerText == "transFill") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.disabled = false;
                SavelocalButton.innerText = ("Save");
                checkElem.title = "Save the string";
            }
            else if (current.innerText == "waiting") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                checkElem.title = "Approve the string";
            }
            else if (current.innerText == "current") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                checkElem.title = "Current string";
            }
            else if (current.innerText == "fuzzy") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Reject the string";
            }
            else if (current.innerText == "rejected") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Rejected string";
                SavelocalButton.disabled = true;
            }
        }
    }
    else if (result.percent > 66) {
        //checkElem.style.cssText = "padding-left:0px; text-align: right";
        newtitle = checkElem.title;
        checkElem.innerHTML = "66";
        var separator1 = document.createElement("div");
        separator1.setAttribute("class", "checkElem_save");
        checkElem.appendChild(separator1);
        SavelocalButton.style.backgroundColor = "#0085ba";
        checkElem.style.backgroundColor = "yellow";
        if (typeof headerElem.style != "undefined") {
            headerElem.style.backgroundColor = "yellow";
            checkElem.title = "Approve the string";
        }
    }
    else if (result.percent > 33) {
        //checkElem.style.cssText = "padding-left:0px; text-align: right";
        newtitle = checkElem.title;
        checkElem.innerHTML = "33";
        var separator1 = document.createElement("div");
        separator1.setAttribute("class", "checkElem_save");
        checkElem.appendChild(separator1);
        SavelocalButton.style.backgroundColor = "#0085ba";
       // SavelocalButton.innerText = "Save";
        checkElem.style.backgroundColor = "orange";
        if (typeof headerElem.style != "undefined") {
            headerElem.style.backgroundColor = "orange";
            checkElem.title = "Approve the string";
        }
    }
    
    else if (result.percent == 10) {
        //checkElem.style.cssText = "padding-left:0px; text-align: right";
        checkElem.innerHTML = "Mod";
        SavelocalButton.disabled = false;
        SavelocalButton.innerText = "Save";
        SavelocalButton.onclick = savetranslateEntryClicked;
        checkElem.style.backgroundColor = "purple";
        checkElem.title = "Save the string";
        if (typeof headerElem.style != "undefined") {
            headerElem.style.backgroundColor = "purple";   
        }
    }

    else if (result.percent == 0) {
            //console.debug("checkElem:", checkElem.innerHTML, result.percent, result.wordCount, result.toolTip)
            // We need to set the title here also, otherwise it will occassionally not be shown
        newtitle = checkElem.title;
        if (result.wordCount == 0) {
            checkElem.innerText = "0";
        }
        else {
            checkElem.innerText = result.wordCount;
        }
        var separator1 = document.createElement("div");
        separator1.setAttribute("class", "checkElem_save");
        checkElem.appendChild(separator1);
        if (SavelocalButton != null) {
            SavelocalButton.style.backgroundColor = "#0085ba";
            checkElem.style.backgroundColor = "red";
            SavelocalButton.style.animation = "blinking 1s infinite";
            SavelocalButton.style.cursor = "none";
            SavelocalButton.disabled = true;
            //SavelocalButton.innerText = "Save";
            checkElem.title = "Approve the string";
            if (typeof headerElem.style != "undefined") {
                headerElem.style.backgroundColor = "red";
            }
        }
        else {
            console.debug("SavelocalButton is null")
           // var separator1 = document.createElement("div");
           // separator1.setAttribute("class", "checkElem_save");
           // checkElem.appendChild(separator1);
          //  SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
           // SaveLocalButton.innerText="Empty"
        }
        }
        // we need to add the save button again after updating the element  
        SavelocalButton = document.createElement("button");
        SavelocalButton.id = "tf-save-button";
        SavelocalButton.className = "tf-save-button";
        SavelocalButton.onclick = savetranslateEntryClicked;
        current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
        // console.debug("current:",current.innerText,rowId,checkElem)
        if (current != null) {
            //current = h.querySelector("span.panel-header__bubble");
            if (current.innerText == "transFill") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = "Save";
                SavelocalButton.disabled = false;
                checkElem.title = "Save the string";
            }
            else if (current.innerText == "waiting") {
                SavelocalButton.innerText = "Appr";
                SavelocalButton.style.backgroundColor = "#0085ba";
                checkElem.title = "Approve the string";
            }
            else if (current.innerText == "current") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = "Curr";
                SavelocalButton.disabled = true;
                SavelocalButton.style.cursor = "none";
                checkElem.title = "Save the string";
            }
            else if (current.innerText == "fuzzy") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Reject the string";
            }
            else if (current.innerText == "rejected") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                SavelocalButton.innerText = ("Rej");
                SavelocalButton.disabled = true;
                checkElem.title = "Rejected string";
            }
            else if (current.innerText == "untranslated") {
                SavelocalButton.style.backgroundColor = "#0085ba";
                    SavelocalButton.innerText = ("Empt");
                    SavelocalButton.disabled = true;
                    checkElem.title = "Empty string";
                
            }
            else {
                SavelocalButton.innerText = "Undef";
                SavelocalButton.style.backgroundColor = "#0085ba";
                checkElem.title = "Something is wrong";
            }
            // 22-07-2021 PSS fix for wrong button text "Apply" #108 This needs to be investigated to check if the others also need to be moved down
            // console.debug("resultperc:", result.percent)
            if (result.percent == 0) {
                //checkElem.style.cssText = "padding-left:0px; text-align: right";
                checkElem.innerHTML = "0";
                var separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                //checkElem.style.backgroundColor = "red";
                SavelocalButton.disabled = false;
                SavelocalButton.style.pointerEvents = "none"
                SavelocalButton.style.animation = "blinking 1s infinite";
                //SavelocalButton.innerText = "Save";
                checkElem.title = "Do not save the string!!";
                //if (typeof headerElem.style != "undefined") {
                //headerElem.style.backgroundColor = "red";
                //SavelocalButton.innerText = "Save" 
                // }
            }
            else if (result.percent == 100) {
                SavelocalButton.innerText = ("Save");
                SavelocalButton.disabled = false;
                checkElem.title = "Save the string";
            }
            
            else if (result.percent > 66) {
                SavelocalButton.innerText = ("Save");
                SavelocalButton.disabled = false;
                checkElem.title = "Save the string";
            }
            else if (result.percent > 33) {
                SavelocalButton.innerText = ("Save");
                SavelocalButton.disabled = false;
                checkElem.title = "Save the string";
            }
            else if (result.percent == 10) {
                SavelocalButton.innerText = ("Save");
                SavelocalButton.disabled = false;
                checkElem.title = "Save the string";
            }
            else if (result.percent == 0) {
                SavelocalButton.innerText = ("Save");
                SavelocalButton.disabled = true;
                checkElem.title = "Save the string";
            }
        }
        //SavelocalButton.ariaLabel = "Save and approve translation";
        var saveButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        newline = "\n";
        missingverbs = "Missing verbs \n";

    if (saveButton == null) {
       // if (result.percent == 0) {
           // checkElem.innerText = "0";
           // var separator1 = document.createElement("div");
           // separator1.setAttribute("class", "checkElem_save");
           // checkElem.appendChild(separator1);
       // }
           checkElem.appendChild(SavelocalButton);
          
       }
        // 11-08-2021 PSS added aditional code to prevent duplicate missing verbs in individual translation
        headerElem.title = "";
       if (result.toolTip != "") {
            // 09-08-2021 PSS fix for issue #115 missing verbs are not shown within the translation
            if (typeof headerElem.title != "undefined") {
                headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            }
        }
        else {
           newtitle = checkElem.title.concat(result.toolTip);
           headertitle = headerElem.title;
        }
        checkElem.setAttribute("title", newtitle);
        // 09-08-2021 PSS fix for issue #115 missing verbs are not shown within the translation
        if (typeof headerElem.title != "undefined") {
            headerElem.setAttribute("title", headertitle);
        }
        //checkElem.setAttribute("title", result.toolTip);
}

function savetranslateEntryClicked(event) {
    var myWindow;
    let timeout = 0;
    //event.preventDefault();   
    myrow = event.target.parentElement.parentElement;
    rowId = myrow.attributes.row.value;
    
    // Determine status of record
    let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = h.querySelector("span.panel-header__bubble");
    // we take care that we can save the record by opening the editor save the record and close the editor again
    if (current.innerText != "Empty" && current.innerText != "untranslated") {
       if (current.innerText == "transFill") {
                let open_editor = document.querySelector(`#preview-${rowId} td.actions .edit`);
                let glotpress_save = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);
                //console.debug("newrowId:",newRowId)
                //if (newRowId != null) {
                //   var glotpress_close = document.querySelector(`#editor-${newRowId} button.panel-header-actions__cancel`);
                //}
                select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
                var status = select.querySelector("dt").nextElementSibling;
                status.innerText = "waiting";
                // 24-03-2022 PSS modified the saving of a record because the toast was sometimes remaining on screen issue #197
                setTimeout(() => {
                toastbox("info", "" , "700", "Saving suggestion", myWindow);
                let preview = document.querySelector(`#preview-${rowId}`);
                preview.querySelector("td.actions .edit").click();
                const editor = preview.nextElementSibling;
                if (editor != null) {
                   editor.style.display = "none";
                   editor.querySelector(".translation-actions__save").click();
                }
                // PSS confirm the message for dismissal
                foundlabel = elementReady(".gp-js-message-dismiss").then(confirm => {
                   if (confirm != '.gp-js-message-dismiss') {
                       confirm.click();
                   }
                });
       }, timeout);
       timeout += 1500;        
       }
       if (current.innerText == "waiting") {
                let glotpress_open = document.querySelector(`#preview-${rowId} td.actions .edit`);
                var glotpress_approve = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .approve`);
                let glotpress_close = document.querySelector(`#editor-${rowId} div.editor-panel__left .panel-header-actions__cancel`);
                select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
                var status = select.querySelector("dt").nextElementSibling;
                status.innerText = "waiting";
                glotpress_open.click();
                if (glotpress_approve != null) {
                   glotpress_approve.click();
                }
                else {
                    glotpress_save = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);
                    setTimeout(() => {
                        glotpress_save.click();
                        confirm = "button.gp-js-message-dismiss";
                        // PSS confirm the message for dismissal
                        elementReady(".gp-js-message-dismiss").then(elm => { elm.click(); }
                        );
                        toastbox("info", "Saving suggestion: " + (i + 1), "1200", "Saving", myWindow);

                    }, timeout);
                    timeout += 1000;
                    
                }
                
                status.innerText = "current";
                glotpress_close.click();
                prevrow = document.querySelector(`#preview-${rowId}.preview.status-waiting`);
                prevrow.style.backgroundColor = "#b5e1b9";
       }
       if (current.innerText == "fuzzy") {
                let glotpress_open = document.querySelector(`#preview-${rowId} td.actions .edit`);
                let glotpress_reject = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .reject`);
                let glotpress_close = document.querySelector(`#editor-${rowId} div.editor-panel__left .panel-header-actions__cancel`);
                glotpress_open.click();
                glotpress_reject.click();
                glotpress_close.click();
                prevrow = document.querySelector(`#preview-${rowId}.preview.status-fuzzy`);
                prevrow.style.backgroundColor = "#eb9090";
        }
        // Now we are done reset the button state
       let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
       SavelocalButton.className += " ready";
       SavelocalButton.disabled = true;
        SavelocalButton.display = "none";
    }
}

function validate(language, original, translation, locale) {
    let originalWords = original.split(" ");
    var wordCount = 0;
    var foundCount = 0;
    let percent = 0;
    var toolTip = [];
    // 17-05-2021 PSS added check to prevent errors with empty glossary be aware that if the glossary gets more entries the amount needs to be adepted
    if (glossary.length > 27) {
        //PSS 09-03-2021 Added check to prevent calculatiing on a empty translation
        if (translation.length > 0) {
            for (let oWord of originalWords) {
                for (let gItem of glossary) {
                    let gItemKey = gItem["key"];
                    let gItemValue = gItem["value"];
                    //if (oWord.toLowerCase().startsWith(gItemKey.toLowerCase())) {
                    if (oWord.toLowerCase() == gItemKey.toLowerCase()) {          
                        wordCount++;
                        let isFound = false;
                        for (let gWord of gItemValue) {
                           // console.debug("translation:", translation, "gWord:",gWord.toLowerCase(), "translation:",translation.toLowerCase())
                            if (match(language, gWord.toLowerCase(), translation.toLowerCase(),gItemValue)) {
                                isFound = true;
                                break;
                            }
                        }
                        if (isFound) {
                            foundCount++;
                        }
                        else {
                            if (!(toolTip.hasOwnProperty("`${gItemKey}`"))) {
                                toolTip += `${gItemKey} - ${gItemValue}\n`;
                           }
                         }
                          // break;
                    }
                }
            }
        }
        else {
            foundCount = 0;
            wordCount = 0;
            percent = 0;
            
        }
    }
    else {
        console.debug("Glossary empty!!");
    }
    // 27-03-2021 PSS added this to prevent devision by zero      
    if (wordCount != 0) {
        percent = foundCount * 100 / wordCount;
        }
    else {
        percent = 0;
    }
    // console.debug("wordcount:",wordCount,percent)
    return { wordCount, percent, toolTip };
    }


    // Language specific matching.
function match(language, gWord, tWord, gItemValue) {
    var glossaryverb;
    if (typeof language != 'undefined') {
        // language is set to uppercase, so we need to return it to lowercase
        language = language.toLowerCase();
        switch (language) {
            case "ta":
                return taMatch(gWord, tWord);
            default:
                return tWord.includes(gWord);
        }
    }
    else {
        if (tWord.len == "1") {
            return tWord.includes(gWord);
        }
        else {
            if (!Array.isArray(gItemValue)) {
                glossaryverb = gItemValue.toLowerCase();
            }
            else {
                // if the glossary contains an array we need to walk through the array
                for (var i = 0; i < gItemValue.length; i++) {
                    glossaryverb = gItemValue[i].toLowerCase();
                    if (tWord.includes(glossaryverb) == true) {
                        break;
                      }
                } 
            }
            return tWord.includes(glossaryverb);
        }
    }
}

    function taMatch(gWord, tWord) {
        let trimSize = gWord.charCodeAt(gWord.length - 1) == "\u0BCD".charCodeAt(0)
            ? 2 : 1;
        let glossaryWord = gWord.substring(0, gWord.length - trimSize);
        // கோ
        glossaryWord = glossaryWord.replaceAll("\u0BC7\u0BBE", "\u0BCB");
        // கொ
        glossaryWord = glossaryWord.replaceAll("\u0BC6\u0BBE", "\u0BCA");

        //console.log("taMatch:", gWord, glossaryWord, tWord);

        return tWord.includes(glossaryWord);
    }
    // 14-06-2021 PSS added fetch old records to show in meta if present
    // 14-06-2021 PSS added the old translation into the metabox, and draw lines between the translations
    // 22-06-2021 PSS added functionality to show differences in the translations
    async function fetchOldRec(url, rowId) {
        // 23-06-2021 PSS added original translation to show in Meta
        let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
        if (e != null) {
            let original = e.querySelector("#editor-" + rowId + " .foreign-text").textContent;
            let status = document.querySelector(`#editor-${rowId} span.panel-header__bubble`).innerHTML;
            switch (status) {
                case "current":
                    newurl = url.replace("mystat", "waiting");
                    break;
                case "waiting":
                    newurl = url.replace("mystat", "current");
                    break;
                case "rejected":
                    newurl = url.replace("mystat", "current");
                    break;
                case "fuzzy":
                    newurl = url.replace("mystat", "current");
                    break;
                case "old":
                    newurl = url.replace("mystat", "current");
                    break;
                case "untranslated":
                    newurl = url.replace("mystat", "untranslated");
                    break;
                // below is a fix for issue #144
                case "transFill":
                    newurl = url.replace("mystat", "current");
                    break;
            }
            // fix for issue #99
            if (status != "untranslated" && typeof newurl != "undefined") {
                //console.debug("fetchOldrec original:", newurl, rowId, original);
                var diffType = "diffWords";
                fetch(newurl, {
                    headers: new Headers({
                        "User-agent": "Mozilla/4.0 Custom User Agent"
                    })
                })
                    .then(response => response.text())
                    .then(data => {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(data, "text/html");
                        //console.log("html:", doc);
                        var table = doc.getElementById("translations");
                        let tr = table.rows;
                        var tbodyRowCount = table.tBodies[0].rows.length;
                        if (tbodyRowCount > 1) {
                            // 16-06-2021 The below code fixes issue  #82
                            let translateorigsep = document.getElementById("translator_sep1");
                            if (translateorigsep != null) {
                                document.getElementById("translator_sep1").remove();
                                document.getElementById("translator_sep2").remove();
                                document.getElementById("translator_sep3").remove();
                                document.getElementById("translator_div1").remove();
                                document.getElementById("translator_div2").remove();
                                document.getElementById("translator_div3").remove();
                                document.getElementById("translator_div4").remove();
                                document.getElementById("translator_div5").remove();
                            }

                            rowContent = table.rows[tbodyRowCount - 1];
                            orig = rowContent.getElementsByClassName("original-text");
                            trans = rowContent.getElementsByClassName("translation-text");

                            var separator1 = document.createElement("div");
                            separator1.setAttribute("id", "translator_sep1");
                            separator1.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px solid grey;";
                            separator1.appendChild(document.createTextNode(""));

                            var separator2 = document.createElement("div");
                            separator2.setAttribute("id", "translator_sep2");
                            separator2.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px #C4C4C4;";
                            separator2.appendChild(document.createTextNode(""));

                            var separator3 = document.createElement("div");
                            separator3.setAttribute("id", "translator_sep3");
                            separator3.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px #C4C4C4;";
                            separator3.appendChild(document.createTextNode(""));

                            var separator4 = document.createElement("div");
                            separator4.setAttribute("id", "translator_sep4");
                            separator4.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px #C4C4C4;";
                            separator4.appendChild(document.createTextNode(""));

                            var element1 = document.createElement("div");
                            element1.setAttribute("id", "translator_div1");
                            element1.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                            element1.appendChild(document.createTextNode("Previous existing translation"));

                            var element2 = document.createElement("div");
                            element2.setAttribute("id", "translator_div2");
                            element2.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                            element2.appendChild(document.createTextNode(orig[0].innerText));

                            var element3 = document.createElement("div");
                            element3.setAttribute("id", "translator_div3");
                            element3.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                            // If within editor you have no translation
                            if (trans[0] != "undefined") {
                                element3.appendChild(document.createTextNode(trans[0].innerText));
                            }

                            // 23-06-2021 PSS added the current translation below the old to be able to mark the differences issue #92                

                            var element4 = document.createElement("div");
                            element4.setAttribute("id", "translator_div4");
                            element4.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";


                            var element5 = document.createElement("div");
                            element5.setAttribute("id", "translator_div5");
                            element5.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                            //element5.appendChild(document.createTextNode(""));

                            let metaElem = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
                            if (metaElem != null) {
                                metaElem.appendChild(element1);
                                metaElem.appendChild(separator1);
                                metaElem.appendChild(element2);
                                metaElem.appendChild(separator2);
                                metaElem.appendChild(element3);
                                metaElem.appendChild(separator3);
                                metaElem.appendChild(separator3);
                                metaElem.appendChild(element4);
                                metaElem.appendChild(separator4);
                                metaElem.appendChild(element5);

                                // Strings are retrieved and compared
                                var oldStr = trans[0].innerText;
                                var newStr = original;
                                var diffType = "diffWords";
                                var changes = JsDiff[diffType](oldStr, newStr);
                                if (oldStr.length != newStr.length) {
                                    textdif = "  ->Length not equal!";
                                }
                                else {
                                    textdif = "";
                                }
                                if (oldStr == newStr) {
                                    element4.appendChild(document.createTextNode("New translation is the same"));
                                }
                                else {
                                    element4.appendChild(document.createTextNode("New translation difference!"));
                                }
                                //04-10-2021 PSS changed the class to resolve issue #157
                                const diff = JsDiff[diffType](oldStr, newStr),
                                fragment = document.createDocumentFragment();
                                diff.forEach((part) => {
                                    // green for additions, red for deletions
                                    // dark grey for common parts
                                    const color = part.added ? "green" :
                                        part.removed ? "red" : "dark-grey";
                                    span = document.createElement("span");
                                    span.style.color = color;
                                    span.appendChild(document
                                        .createTextNode(part.value));
                                    fragment.appendChild(span);
                                });
                                element5.appendChild(fragment);
                                metaElem.style.fontWeight = "900";
                            }
                        }
                    }).catch(error => console.debug(error));
            }
        }
}

var stringToHTML = function (str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, "text/html");
    return doc;
};

// 11-06-2021 PSS added function to mark that existing translation is present
async function fetchOld(checkElem, result, url, single, originalElem, row, rowId) {
        // 30-06-2021 PSS added fetch status from local storage
        //chrome.storage.sync
          //  .get(
          //      ["noOldTrans"],
           //     function (data) {
           //         single = data.noOldTrans;
            //    });

        const data = fetch(url, {
            headers: new Headers({
                "User-agent": "Mozilla/4.0 Custom User Agent"
            })
        })
            .then(response => response.text())
            .then(data => {
                //05-11-2021 PSS added fix for issue #159 causing an error message after restarting the add-on
                currURL = window.location.href;
                // &historypage is added by GlotDict or WPGPT, so no extra parameter is necessary for now
                if (currURL.includes("&historypage") == false) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(data, "text/html");
                    //console.log("html:", doc);
                    var table = doc.getElementById("translations");
                    let tr = table.rows;
                    if (table != undefined) {
                        const tbodyRowCount = table.tBodies[0].rows.length;
                        // 04-07-2021 PSS added counter to message for existing translations
                        var rejected = table.querySelectorAll("tr.preview.status-rejected");
                        var waiting = table.querySelectorAll("tr.preview.status-waiting");
                        var fuzzy = table.querySelectorAll("tr.preview.status-fuzzy");
                        var current = table.querySelectorAll("tr.preview.status-current");
                        var old = table.querySelectorAll("tr.preview.status-old");
                        if (typeof current != "null" && current.length != 0) {
                            currcount = " Current:" + current.length;
                        }
                        else {
                            currcount = "";
                        }
                        if (waiting.length != 0) {
                            wait = " Waiting:" + waiting.length;
                        }
                        else {
                            wait = "";
                        }
                        if (rejected.length != 0) {
                            rejec = " Rejected:" + rejected.length;
                        }
                        else {
                            rejec = "";
                        }
                        if (fuzzy.length != 0) {
                            fuz = " Fuzzy:" + fuzzy.length;
                        }
                        else {
                            fuz = "";
                        }
                        if (old.length != 0) {
                            old = " Old:" + old.length;
                        }
                        else {
                            old = "";
                        }
                        if (tbodyRowCount > 2 && single == "False") {
                                               
                            updateElementStyle(checkElem, "", result, "True", originalElem, wait, rejec, fuz, old, rowId, "", "",currcount);
                        }
                        else if (tbodyRowCount > 2 && single == "True") {
                            updateElementStyle(checkElem, "", result, "False", originalElem, wait, rejec, fuz, old, rowId, "", "",currcount);
                            //var windowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes,width=800,height=650,left=600,top=0";
                            //window.open(url, "_blank", windowFeatures);
                        }
                    }
                }
            }).catch(error => console.debug(error));
}

/**
 * Auto hide next editor when status action open it.
 *
 * @param {object} editor
 * @returns {void}
 */
function gd_auto_hide_next_editor(editor) {
    var myRow;
    var newRow;

    const preview = editor.nextElementSibling;
    if (!preview) {
        return;
    }
    const next_editor = preview.nextElementSibling;
    // if it is the last row we need to add the checkboxes if the translator is not a PTE
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    if (!next_editor) {
        if (!is_pte) {
            oldRow = editor.id;
            newRow = oldRow.replace("editor", "preview")
            myRow = document.querySelector(`#${newRow}`);
            myRow.style.backgroundColor = "#b5eeee";
            var x = myRow.insertCell(0);
            x.className = "myCheckBox";
        }
        else {
            oldRow = editor.id;
            newRow = oldRow.replace("editor", "preview")
            myRow = document.querySelector(`#${newRow}`);
            myRow.style.backgroundColor = "#b5e1b9";
        }
        return;
    }
    const next_preview = next_editor.previousElementSibling;
    if (!next_preview || !next_editor.classList.contains("editor") || !next_preview.classList.contains("preview")) {
        return;
    }
    // Determine which row we need to push to the top
    oldRow = editor.id;
    newRow = oldRow.replace("editor", "preview")
    myRow = document.querySelector(`#${newRow}`);
    if (!is_pte) {
        myRow.style.backgroundColor = "#b5eeee";
    }
    else {
        myRow.style.backgroundColor = "#b5e1b9";
    }
   
    // With center it works best, but it can be put on the top, center, bottom
    //elmnt.scrollIntoView({ behavior: "smooth", block: "start", inline: "end" });
    myRow.scrollIntoView(true);
    // We need to add the checkboxes if the translator is not a PTE
    // We need to add the extra cell on front of the preview line
    if (!is_pte) {
        var x = myRow.insertCell(0);
        x.className = "myCheckBox";
    }
    next_editor.style.display = "none";
    next_preview.style.display = "table-row";
}

/**
 * Mutations Observer for Translation Table Changes:
 * Auto hide next editor on status actions.
 * Add clone buttons on new preview rows and add glossary links.
 *
 * @triggers gd_add_column, gd_add_meta
 */
        function gd_wait_table_alter() {
            if (document.querySelector("#translations tbody") !== null) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        const user_is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
                        mutation.addedNodes.forEach((addedNode) => {
                            // Don"t treat text nodes.
                            if (1 !== addedNode.nodeType) {
                                return;
                            }
                            const row_is_preview = addedNode.classList.contains("preview");
                            const row_is_editor = addedNode.classList.contains("editor");
                            const is_new_translation = mutation.previousSibling && mutation.previousSibling.matches(".editor.untranslated");
                            let status_has_changed = false;
                            if (row_is_editor && mutation.previousSibling && mutation.previousSibling.matches('[class*="status-"]')) {
                                let status_before = "";
                                let status_after = "";
                                status_before = RegExp(/status-[a-z]*/).exec(mutation.previousSibling.className)[0];
                                status_after = RegExp(/status-[a-z]*/).exec(addedNode.className)[0];
                                status_has_changed = status_before !== status_after;
                            }
                            // console.debug("before hide editor");
                            // if (user_is_pte && row_is_editor ) {
                            //if (user_is_pte && row_is_editor && !is_new_translation && status_has_changed) {
                            
                            gd_auto_hide_next_editor(addedNode);
                            // }
                            // if (user_is_pte && row_is_preview) {
                            //    gd_add_column_buttons(addedNode);
                            // }
                            //if (row_is_preview) {
                            // addedNode.querySelectorAll(".glossary-word").forEach(gd_add_glossary_links);
                            // }
                        });
                    });
                });

                observer.observe(document.querySelector("#translations tbody"), {
                    attributes: true,
                    childList: true,
                    characterData: true,
                });
            }
}


