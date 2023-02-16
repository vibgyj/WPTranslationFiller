//console.debug("Content script...");
var glossary;
loadGlossary();
if (!window.indexedDB) {
    messageBox("error", "Your browser doesn't support IndexedDB!<br> You cannot use local storage!");
    console.log(`Your browser doesn't support IndexedDB`);
}
else {
    // PSS added jsStore to be able to store and retrieve default translations
    var jsstoreCon = new JsStore.Connection();
    var db;
    db = myOpenDB(db);
    console.debug("new db open:", db);   
}

const setToonDiff = async function (obj) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(obj, function () {
                resolve();
            });
        } catch (ex) {
            reject(ex);
        }
    });
};
const getToonDiff = async function (key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(key, function (value) {
                resolve(value[key]);
            });
        } catch (ex) {
            reject(ex);
        }
    });
};

async function sampleUse() {
    let sampleObject1 = {
        'toonDiff': false
    };
    let sampleObject2 = {
        'toonDiff': false
    };
    await setToonDiff(sampleObject1);

    console.log(await getToonDiff('toonDiff'));

}

function createElementWithId(type, id) {
    let element = document.createElement(type);
    element.id = id;
    return element;
}

//sampleUse();
//When performing bulk save the difference is shown in Meta #269
// We need to set the default value for showing differents
chrome.storage.sync.get(["showTransDiff"], function (data) {
    if (data.showTransDiff != "null") {
        let setToonDiffOn = {
            'toonDiff': true
        };
        let setToonDiffOff = {
            'toonDiff': false
        };
        if (data.showTransDiff == true) {
            setToonDiff(setToonDiffOn);
        }
        else {
            // set toonDiff to false
            setToonDiff(setToonDiffOff);
        }
    }
    else {
        setToonDiff(setToonDiffOff);
    }
});

// PSS added function from GlotDict to save records in editor
// PSS added glob_row to determine the actual row from the editor
var glob_row = 0;
var convertToLow = true;
var detailRow = 0;
var errorstate = "OK";
var locale;

gd_wait_table_alter();
addCheckBox();

var parrotActive;
//localStorage.setItem('interXHR', 'false');
const script = document.createElement('script');
script.src = chrome.runtime.getURL('wptf-inject.js');
(document.head || document.documentElement).prepend(script);

;// 09-09-2021 PSS added fix for issue #137 if GlotDict active showing the bar on the left side of the prio column
chrome.storage.sync.get( ["glotDictGlos"],
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

//09-05-2021 PSS added fileselector for silent selection of file
var fileSelector = document.createElement("input");
fileSelector.setAttribute("type", "file");

// PSS 31-07-2021 added new function to scrape consistency tool
document.addEventListener("keydown", function (event) {
    if (event.altKey && event.shiftKey && (event.key === "&")) {
        var org_verb;
        var wrong_verb;
        event.preventDefault();
        chrome.storage.sync.get( ["destlang"],
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
            }
        );
    }
});

document.addEventListener("keydown", async function (event) {
    if (event.altKey && event.shiftKey && (event.key === "?")) {
        event.preventDefault();
        await handleStats();
    }
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
        // copy to clipboard
        event.preventDefault();
        copyToClipBoard(detailRow);
    }
    if (event.altKey && event.shiftKey && (event.key === "U")) {
        // import .po file
        event.preventDefault();
        chrome.storage.sync.get( ["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
            function (data) {
                var allrows = [];
                var myrows = [];
                var myFile;
                var pretrans;
                var transtype;
                toastbox("info", "Select file is started", "2000", "Select file");
                var input = document.createElement('input');
                input.type = 'file';
                input.onchange = _this => {
                    let files = Array.from(input.files);
                    //   console.log(files);
                    if (files && files[0]) {
                        myFile = files[0];
                        var reader = new FileReader();
                        reader.addEventListener('load', function (e) {
                            //output.textContent = e.target.result;
                            myrows = e.target.result.replace(/\r/g, "").split(/\n/);
                            // allrows = e.target.result.split(/\r|\n/);
                            // remove all unnessesary lines as those will take time to process
                            var regel = '';
                            for (var i = 0; i < myrows.length - 1; i++) {
                                regel = myrows[i];
                                if (regel.startsWith("msgid") || regel.startsWith("msgstr") || regel.startsWith("msgctxt") || regel.startsWith("msgid_plural") || regel.startsWith("msgstr[0]") || regel.startsWith("msgstr[1]")) {
                                    allrows.push(regel);
                                    //console.debug(allrows)
                                }
                            }

                            countimported = new_import_po(data.destlang, myFile,allrows);
                        });
                        reader.readAsText(myFile);
                    }
                    else {
                        messageBox(info, "No file selected")
                    }
                };
                input.click();
            }
        );  
        //modal.style.display = "none";
        //messageBox("info", "Import translation ready " + countimported);
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
        chrome.storage.sync.get(
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
            }
        );
    }

    if (event.altKey && event.shiftKey && (event.key === "F5")) {
        event.preventDefault();
        chrome.storage.sync.get(
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
            }
        );
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
    if (event.altKey && event.shiftKey && (event.key === "F8")) {
        event.preventDefault();
       // console.debug("F8")
        let int = localStorage.getItem(['interXHR']);
        if (int == "false") {
            toastbox("info", "Switching interceptXHR to on", "1200", "InterceptXHR");
            localStorage.setItem('interXHR', 'true');
        }
        else {
            toastbox("info", "Switching interceptXHR to off", "1200", "InterceptXHR");
            localStorage.setItem('interXHR', 'false');
        }
        location.reload();
    };

    if (event.altKey && event.shiftKey && (event.key === "F9")) {
        event.preventDefault();
        let int = localStorage.getItem(['switchTM']);
        if (int == "false") {
            toastbox("info", "Switching TM to foreign", "1200", "TM switch");
            localStorage.setItem('switchTM', 'true');
        }
        else {
            toastbox("info", "Switching TM to local", "1200", "TM switch");
            localStorage.setItem('switchTM', 'false');
        }
        location.reload();
    };

    if (event.altKey && event.shiftKey && (event.key === "F10")) {
        event.preventDefault();
        //$(document).ready(function () {
        var mysimple = window['wpgpt_load_history_status'];
       // console.log(mysimple);
      //  console.log($gp_editor_options['can_approve'])
        alert("Editor options:" + mysimple)
       // })
        
    };

    if (event.altKey && event.shiftKey && (event.key === "F12")) {
        
        cuteToast({
            type: "info",
            message: "Counting is started",
            timer: 1000,
        }).then((e) => {
            countWordsinTable();
        });

        //let wordCount = countWordsinTable();

    };

    if (event.altKey && event.shiftKey && (event.key === "F11")) {
       // console.debug("F11")
        event.preventDefault();
        toastbox("info", "checkFormal is started wait for the result!!", "2000", "CheckFormal");
        var dataFormal = 'Je hebt, U heeft\nje kunt, u kunt\nHeb je,Heeft u\nhelpen je,helpen u\nWil je,Wilt u\nom je,om uw\nkun je,kunt u\nzoals je,zoals u\nJe ,U \nje ,u \njouw,uw\nmet je,met uw\n';
        checkPageClicked(event);
      //  checkFormalPage(dataFormal);
        close_toast();

    };

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
    bulkbutton.addEventListener("click", (event) => {
         event.preventDefault();
         bulkSave(event);
    });
}

// PSS added this one to be able to see if the Details button is clicked
// 16-06-2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
const el = document.getElementById("translations");
if (el != null) {
    el.addEventListener("click", (event) => {
        //event.preventDefault();
        checkbuttonClick(event);
    });
}

const el3 = document.getElementById("translations");
if (el3 != null) {
    el3.addEventListener("click", checkactionClick());
}


//Add option link
var optionlink = document.createElement("li");
var a = document.createElement('a');
a.href = chrome.runtime.getURL('wptf-options.html');
var link = document.createTextNode("WPTF options");
a.appendChild(link);
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
let TM = localStorage.getItem(['switchTM']);
var tmtransButton = document.createElement("a");
tmtransButton.href = "#";

if (TM == "false") {
    tmtransButton.className = "tm-trans-button";
}
else {
    tmtransButton.className = "tm-trans-button foreighn"
}
tmtransButton.onclick = tmTransClicked;
tmtransButton.innerText = "TM";

//23-03-2021 PSS added a new button on first page
var checkButton = document.createElement("a");
checkButton.href = "#";
checkButton.className = "check_translation-button";
checkButton.onclick = checkPageClicked;
checkButton.innerText = "CheckPage";

//23-03-2021 PSS added a new button on first page
var impLocButton = document.createElement("a");
impLocButton.href = "#";
impLocButton.className = "impLoc-button";
impLocButton.onclick = impFileClicked;
impLocButton.innerText = "Imp localfile";

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
var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
if (is_pte) {
    //07-05-2021 PSS added a bulksave button on first page
    var bulksaveButton = document.createElement("a");
    bulksaveButton.href = "#";
    bulksaveButton.id = "BulkSave";
    bulksaveButton.className = "bulksave-button";
    bulksaveButton.onclick = startBulkSave;
    bulksaveButton.innerText = "Bulksave";
}

// add stats button if handleStats function is defined
if (typeof handleStats === "function") {
    var statsButton = document.createElement("a");
    statsButton.href = "#";
    statsButton.id = "statsButton";
    statsButton.className = "stats-button";
    statsButton.onclick = handleStats;
    statsButton.innerText = "Stats";
}

var divGpActions = document.querySelector("div.paging");
var wptfNavBar = document.createElement("div");
var wptfNavBarCont = document.createElement("div");
wptfNavBarCont.className = 'wptfNavBarCont'
wptfNavBar.appendChild(wptfNavBarCont);
wptfNavBar.className = "wptfNavBar";
wptfNavBar.id = "wptfNavBar";

if (divPaging != null && divProjects == null) {
    divGpActions.parentNode.insertBefore(wptfNavBar, divGpActions);
    const divNavBar = document.querySelector("div.wptfNavBarCont")
    if (is_pte) {
        divNavBar.appendChild(bulksaveButton);
    }

    if (statsButton != null) {
        divNavBar.appendChild(statsButton);
    }
    divNavBar.appendChild(importButton);
    divNavBar.appendChild(exportButton);
    divNavBar.appendChild(impLocButton);
    divNavBar.appendChild(checkButton);
    divNavBar.appendChild(tmtransButton);
    divNavBar.appendChild(localtransButton);
    divNavBar.appendChild(translateButton);
}

// 12-05-2022 PSS here we add all buttons in the pagina together
if (divPaging != null && divProjects == null) {
    //divPaging.insertBefore(translateButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(localtransButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(tmtransButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(checkButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(impLocButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(exportButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(importButton, divPaging.childNodes[0]);
}

async function sampleUse() {
    let sampleObject1 = {
        'toonDiff': false
    };
    let sampleObject2 = {
        'toonDiff': false
    };
    await setToonDiff(sampleObject1);
    //console.log(await getToonDiff('toonDiff'));
}

async function myOpenDB(db) {
    let dbopen = await openDB(db);
    //console.debug("after open:",dbopen)
    return dbopen;
}

async function startBulkSave(event) {
    event.preventDefault(event);
    let sampleObject1 = {
        'toonDiff': true
    };
    let sampleObject2 = {
        'toonDiff': false
    };
    var value = 'false';
    //When performing bulk save the difference is shown in Meta #269
    await setToonDiff(sampleObject2);
    //chrome.storage.local.set({ toonDiff: value }).then((result) => {
    //       console.log("Value toonDiff is set to false");
    //});
    await bulkSave("false");
}

// 12-05-2022 PSS addid this function to start translating from translation memory button
function tmTransClicked(event) {
    event.preventDefault();
    chrome.storage.sync.get(
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
        }
    );
}


//12-05-2022 PSS added this function to start local translating with button
function localTransClicked(event) {
    event.preventDefault();
    chrome.storage.sync.get(
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
        }
    );
}

function impFileClicked(event) {
    event.preventDefault();
    chrome.storage.sync.get(
        ["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
        function (data) {
            var allrows = [];
            var myrows = [];
            var myFile;
            var pretrans;
            var transtype;
            toastbox("info", "Select file is started", "2000", "Select file");
            var input = document.createElement('input');
            input.type = 'file';
            input.onchange = _this => {
                let files = Array.from(input.files);
                //   console.log(files);
                if (files && files[0]) {
                    myFile = files[0];
                    var reader = new FileReader();
                    reader.addEventListener('load', function (e) {
                        //output.textContent = e.target.result;
                        myrows = e.target.result.replace(/\r/g, "").split(/\n/);
                        // allrows = e.target.result.split(/\r|\n/);
                        // remove all unnessesary lines as those will take time to process
                        var regel = '';
                        for (var i = 0; i < myrows.length - 1; i++) {
                            regel = myrows[i];
                            if (regel.startsWith("msgid") || regel.startsWith("msgstr") || regel.startsWith("msgctxt") || regel.startsWith("msgid_plural") || regel.startsWith("msgstr[0]") || regel.startsWith("msgstr[1]")) {
                                allrows.push(regel);
                                //console.debug(allrows)
                            }
                        }
                        countimported = new_import_po(data.destlang, myFile, allrows);
                        
                    });
                    reader.readAsText(myFile);
                }
                else {
                    messageBox(info, "No file selected")
                }
                close_toast();
            };
            input.click();
        }
    );
}

function translatePageClicked(event) {
    event.preventDefault();
    chrome.storage.sync.get(
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
                        translatePage(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, translationComplete);
                    }
                    else {
                        messageBox("error", "You need to set the translator API");
                    }
                }
                else {
                    messageBox("error", "You need to set the parameter for Destination language");
                }
            } else {
                messageBox("error", "For " + data.transsel + " no apikey is set!");
            }
        }
    );
}

function checkLocale() {
    // 30-11-2022 PSS If the stats button is used within a project then the locale is not determined properly #261
    const localeString = window.location.href;
    //console.debug("localestring:",localeString)
    var local = localeString.split("/");
    //console.debug("localestring:", local.length)
    if (local.length == 8) {
        locale = local[4];
    }
    else if (local.length == 9) {
        locale = local[6];
    }
    else if (local.length == 10) {
        locale = local[7];
    }
    else {
        locale ="";
    }
    return locale;
}

function checkFormal(formal) {
    const locString = window.location.href;
    return (! locString.includes("default"));
}

function checkPageClicked(event) {
    event.preventDefault();
    var formal = checkFormal(false);
    toastbox("info", "CheckPage is started wait for the result!!", "2000", "CheckPage");
    chrome.storage.sync.get(
        ["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
        function (data) {
            checkPage(data.postTranslationReplace,formal);
            close_toast();
        }
    );
}

function exportPageClicked(event) {
    event.preventDefault();
    chrome.storage.sync.get(
        ["apikey", "destlang"],
        function (data) {
            dbExport(data.destlang);
        }
    );
    // res= dbExport();
}


function loadGlossary() {
    glossary = [];
    chrome.storage.sync.get(["glossary", "glossaryA", "glossaryB", "glossaryC"
        , "glossaryD", "glossaryE", "glossaryF", "glossaryG", "glossaryH", "glossaryI"
        , "glossaryJ", "glossaryK", "glossaryL", "glossaryM", "glossaryN", "glossaryO"
        , "glossaryP", "glossaryQ", "glossaryR", "glossaryS", "glossaryT", "glossaryU"
        , "glossaryV", "glossaryW", "glossaryX", "glossaryY", "glossaryZ", "destlang"],
        function (data) {
            //console.debug('data:', data)
            if (typeof data.glossary != "undefined") {
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

                glossary.sort(function (a, b) {
                    // to sory by descending order
                    return b.key.length - a.key.length;
                });
                addTranslateButtons();
                //console.debug("glossary:", glossary.length)
                if (glossary.length > 27) {
                    chrome.storage.sync.get(["showHistory"], function (data) {
                        if (data.showHistory != "null") {
                            locale = checkLocale();
                            validatePage(data.destlang, data.showHistory, locale);
                        }
                    });
                }
                else {
                    messageBox("error", "Your glossary is not loaded because no file is loaded!!");
                    return;
                }
                checkbuttonClick();
            }
            else {
                messageBox("error", "Your glossary is not loaded because no file is loaded!!");
                return;
            }
        }
    );
}
    

function loadSet(x, set) {
    glossary = glossary.concat(set);
}

function addTranslateButtons() {
    //16 - 06 - 2021 PSS fixed this function addTranslateButtons to prevent double buttons issue #74
    for (let e of document.querySelectorAll("tr.editor")) {
        let rowId = e.getAttribute("row");

        let panelHeaderActions = e.querySelector("#editor-" + rowId + " .panel-header .panel-header-actions");
        if (panelHeaderActions != null) {
            var currentcel = document.querySelector(`#preview-${rowId} td.priority`);
            if (currentcel != null) {
                currentcel.innerText = "";
            }
            // Add translate button
            let translateButton = createElementWithId("my-button", `translate-${rowId}-translation-entry-my-button`);
            translateButton.href = "#";
            translateButton.className = "translation-entry-my-button";
            translateButton.onclick = translateEntryClicked;
            translateButton.innerText = "Translate";
            translateButton.style.cursor = "pointer";
            panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);

            // Add addtranslate button
            let addTranslateButton = createElementWithId("my-button", `translate-${rowId}-addtranslation-entry-my-button`);
            addTranslateButton.href = "#";
            addTranslateButton.className = "addtranslation-entry-my-button";
            addTranslateButton.onclick = addtranslateEntryClicked;
            addTranslateButton.innerText = "Add Translation";
            addTranslateButton.style.cursor = "pointer";
            panelHeaderActions.insertBefore(addTranslateButton, panelHeaderActions.childNodes[0]);

            let TranslocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-local-button`);
            TranslocalButton.className = "translocal-entry-local-button";
            TranslocalButton.innerText = "Local";
            TranslocalButton.style.visibility = "hidden";
            panelHeaderActions.insertBefore(TranslocalButton, panelHeaderActions.childNodes[0]);

            let MissinglocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-missing-button`);
            MissinglocalButton.className = "translocal-entry-missing-button";
            MissinglocalButton.innerText = "Missing verbs";
            MissinglocalButton.style.visibility = "hidden";
            MissinglocalButton.style.animation = "blinking 1s infinite";
            panelHeaderActions.insertBefore(MissinglocalButton, panelHeaderActions.childNodes[0]);


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
    let csvData = [];
    let lbreak = data.split("\n");
    let counter = 0;
    // To make sure we can manipulate the data store it into an array
    lbreak.forEach(res => {
        // 09-07-2021 PSS altered the separator issue #104
        csvData.push(res.split("|"));
        ++counter;
    });
    // 24-08-2022 PSS fixes enhancement #237
    toastbox("info", "Import of: " + (counter-1) + " records is started wait for the result!!", "3000", "Import database");
    let importButton = document.querySelector("a.import_translation-button");
    importButton.innerText="Started"
    if (counter > 0) {
        var arrayLength = csvData.length;
        for (var i = 0; i < arrayLength; i++) {
            if (i > 1) {
                importButton.innerText =  i;
                // Store it into the database
                //Prevent adding empty line
                if (csvData[i][0] != "") {
                    if (i == 100 || i == 200 || i == 300 || i == 400 || i == 500 || i == 600 || i == 700 || i == 800 || i == 900 || i == 1000 || i == 1100 || i == 1200 || i == 1300 || i == 1400 || i == 1500) {
                        toastbox("info", "Adding is running <br>Records added:"+i, "1500", "Import database");
                    }
                   // console.debug("before addDB record:"+i);
                    res = await addTransDb(csvData[i][0], csvData[i][1], csvData[i][2]);
                }
            }
        }
        close_toast();
        messageBox("info", "Import is ready records imported: " + (i-1));

    }
    //importButton = document.querySelector(".paging a.import_translation-button");
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
                        chrome.storage.sync.get(["showTransDiff"], async function (data) {
                            if (data.showTransDiff != "null") {
                                chrome.storage.local.get(["toonDiff"]).then((result) => {
                                    console.log("Value toonDiff currently is " + result.toonDiff);
                                    if (result.toonDiff == true) {
                                        fetchOldRec(url, rowId);
                                    }
                                });
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
async function checkbuttonClick(event) {
    
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
            //localStorage.setItem('interXHR', 'false');
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
                chrome.storage.sync.get(["showTransDiff"], async function (data) {
                    if (data.showTransDiff != "null") {
                        if (data.showTransDiff == true) {
                            let res = await getToonDiff('toonDiff');
                            //chrome.storage.local.get(["toonDiff"]).then((result) => {
                                //console.log("Value toonDiff currently is " + res);
                                if (res == true) {
                                    fetchOldRec(url, rowId);
                                }
                            // });
                        }
                    }
                });
            }
            if (translateButton == null) {
                let panelHeaderActions = document.querySelector("#editor-" + rowId + " .panel-header .panel-header-actions");

                let translateButton = createElementWithId("my-button", `translate-${rowId}-translation-entry-my-button`);
                translateButton.className = "translation-entry-my-button";
                translateButton.onclick = translateEntryClicked;
                translateButton.innerText = "Translate";
                panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);

                // Add addtranslate button
                let addTranslateButton = createElementWithId("my-button", `translate-${rowId}-addtranslation-entry-my-button`);
                addTranslateButton.className = "addtranslation-entry-my-button";
                addTranslateButton.onclick = addtranslateEntryClicked;
                addTranslateButton.innerText = "Add Translation";
                panelHeaderActions.insertBefore(addTranslateButton, panelHeaderActions.childNodes[0]);

                let TranslocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-local-button`);
                TranslocalButton.className = "translocal-entry-local-button";
                TranslocalButton.innerText = "Local";
                TranslocalButton.style.visibility = "hidden";
                panelHeaderActions.insertBefore(TranslocalButton, panelHeaderActions.childNodes[0]);

                let MissinglocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-missing-button`);
                MissinglocalButton.className = "translocal-entry-missing-button";
                MissinglocalButton.innerText = "Missing verbs";
                MissinglocalButton.style.visibility = "hidden";
                MissinglocalButton.style.animation = "blinking 1s infinite";
                panelHeaderActions.insertBefore(MissinglocalButton, panelHeaderActions.childNodes[0]);
            }
        }
    }
}

function translationComplete(original, translated) {
    if (original == translated) {
        console.info("Identical");
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
            translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, DeeplFree, translationComplete);
        });
}

function updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var currcount;
    var checkElem;
    var current;
    var SavelocalButton;
    var imgsrc;
    imgsrc = chrome.runtime.getURL('/');
    imgsrc = imgsrc.substring(0, imgsrc.lastIndexOf('/'));
    if (typeof rowId == "undefined") {
        let rowId = textareaElem.parentElement.parentElement.parentElement
           .parentElement.parentElement.parentElement.parentElement.getAttribute("row");
    }
    let originalElem = document.querySelector("#preview-" + rowId + " .original");
    let glossary = originalElem.querySelector('span .glossary-word');

    // if an original text contains a glossary verb that is not in the tranlation highlight it
    if (result.newText != "" && typeof result.newText != "undefined") {
        let markerimage = imgsrc + "/../img/warning-marker.png";
        originalElem.insertAdjacentHTML("afterbegin", '<div class="mark-tooltip">');
        let markdiv = document.querySelector("#preview-" + rowId + " .mark-tooltip");
        let markimage = document.createElement("img");
        markimage.src = markerimage;
        markdiv.appendChild(markimage)
        let markspan = document.createElement("span");
        markspan.setAttribute("class", "mark-tooltiptext");
        markdiv.appendChild(markspan);
        markspan.innerHTML = result.newText;
    }

    // 22-06-2021 PSS altered the position of the colors to the checkbox issue #89
    checkElem = document.querySelector("#preview-" + rowId + " .priority");
    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
    if (SavelocalButton == null) {
        SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
    }
    
    // we need to take care that the save button is not added twice
    myrec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    current = myrec.querySelector("span.panel-header__bubble");
    if (typeof checkElem == "object") {
        if (SavelocalButton == null) {
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
            // we need to add the button!
            let res = addCheckButton(rowId, checkElem,"1341")
            SavelocalButton = res.SavelocalButton;
        }
    }
    else {
        if (SavelocalButton == null) {
            let res = addCheckButton(rowId, checkElem,"1348")
            SavelocalButton = res.SavelocalButton
        }
    }
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    updateElementStyle(checkElem, headerElem, result, "False", originalElem, "", "", "", "", rowId,showName,nameDiff,currcount);
    let row = rowId.split("-")[0];
    
    // 12-06-2021 PSS do not fetch old if within the translation
    // 01-07-2021 fixed a problem causing an undefined error
    // 05-07-2021 PSS prevent with toggle in settings to show label for existing strings #96
    if (showHistory == true) {
        let single = "True";
        if (newurl.substring(1, 9) != "undefined") {
            single = "False";
        }
        // 31-01-2023 PSS fetchold should not be performed on untranslated lines issue #278
        if (current.innerText != 'untranslated') {
            fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId);
        }
    }
}

function validateEntry(language, textareaElem, newurl, showHistory,rowId,locale) {
    // 22-06-2021 PSS fixed a problem that was caused by not passing the url issue #91
    var translation;
    var result=[];
    translation = textareaElem.value;
    let original = textareaElem.parentElement.parentElement.parentElement
        .querySelector("span.original-raw");
    let originalText = original.innerText;
    result = validate(language, originalText, translation, locale);
    updateStyle(textareaElem, result, newurl, showHistory, "True", "", rowId);
    return result;
}

function updateRowButton(current, SavelocalButton, checkElem, GlossCount, foundCount, rowId, lineNo) {

    if (typeof rowId != "undefined" && SavelocalButton !=null) {
        switch (current.innerText) {
            case "transFill":
                    SavelocalButton.innerText = "Save";
                    checkElem.title = "save the string";
                    SavelocalButton.disabled = false;
                break;
            case "waiting":
                 SavelocalButton.innerText = "Appr";
                 checkElem.title = "Approve the string";
                 SavelocalButton.disabled = false;
                 break;
            case "current":
                SavelocalButton.innerText = "Curr";
                SavelocalButton.className = "tf-save-button-disabled"
                checkElem.title = "Current translation";
                break;
            case "fuzzy":
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Reject the string";
                break;
            case "changes requested":
                SavelocalButton.innerText = ("Rej");
                checkElem.title = "Reject the string";
                break;
            case "rejected":
                SavelocalButton.innerText = ("Rej");
                SavelocalButton.disabled = true;
                SavelocalButton.className = "tf-save-button-disabled"
                checkElem.title = "Rejected string";
                break;
            case "untranslated":
                SavelocalButton.innerText = "Empt";
                SavelocalButton.style.backgroundColor = "grey";
                checkElem.style.backgroundColor = "white";
                checkElem.title = "No translation";
                break;
            case "old":
                SavelocalButton.innerText = ("Old");
                checkElem.title = "Old translation";
                break;
            default:
                SavelocalButton.innerText = "Undef";
                checkElem.title = "Something is wrong";
                break;
        }
    }
    //console.debug("Row or SavelocalButton empty!!");
}

async function updateElementStyle(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff,currcount) {
    var current;
    var SavelocalButton;
    var separator1;
    var newtitle='';
    var headertitle = '';
    headerElem.title = ""

    if (typeof rowId != "undefined") {
        current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
        if (current == null) {
           // console.debug("current is null", current)
            current = 'Empty';
        }
        if (current.innerText == 'current') {
            SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        }
        else {
             SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
        }
     
        // PSS the below code needs to be improved see code in commonTranslate
        if (typeof result.wordCount == "undefined") {
            if (SavelocalButton != null) {
                current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
                //let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
                if (current != null) {
                    updateRowButton(current, SavelocalButton, checkElem, result.wordCount, result.foundCount,rowId,"1513");
                }
                else {
                    SavelocalButton.title = "Do not save!!";
                }
            }
            return;
        }
        if (result.wordCount == 0) {
            // SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
            current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
        }

        if (current != null) {
            SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
            if (SavelocalButton == null) {
                SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
            }
            // we need to update the button color and content/tooltip
            // 22-07-2021 PSS fix for wrong button text "Apply" #108 
            // moved the below code, and remove the duplicat of this code
            //console.debug("percentage:",result.percent)
            if (result.percent == 100) {
                checkElem.innerHTML = "100";
                separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "1539")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.innerText = "Appr";
                checkElem.style.backgroundColor = "green";
                checkElem.title = "Save the string";
                if (typeof headerElem.style != "undefined") {
                    headerElem.style.backgroundColor = "green";
                }
            }
            else if (result.percent > 66) {
                newtitle = checkElem.title;
                checkElem.innerHTML = '<span style="color:black">66</span>';
                separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "1547")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.innerText = "Save";
                checkElem.style.backgroundColor = "yellow";
                checkElem.title = "Save the string";
                if (typeof headerElem.style != "undefined") {
                    headerElem.style.backgroundColor = "yellow";
                }
            }
            else if (result.percent > 33) {
                newtitle = checkElem.title;
                checkElem.innerHTML = "33";
                separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "1561")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.innerText = "Save";
                checkElem.title = "Save the string";
                checkElem.style.backgroundColor = "orange";
               
                if (typeof headerElem.style != "undefined") {
                   headerElem.style.backgroundColor = "orange";
                  //headerElem.setAttribute("background", "orange");
                }
            }
            else if (result.percent == 10) {
                checkElem.innerHTML = "Mod";
                separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "1574")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.disabled = false;
                SavelocalButton.innerText = "Save";
                SavelocalButton.onclick = savetranslateEntryClicked;
                checkElem.style.backgroundColor = "purple";
                checkElem.title = "Save the string";
                if (typeof headerElem.style != "undefined") {
                    headerElem.style.backgroundColor = "purple";
                }
            }
            else if (result.percent < 33 && result.percent >0) {
                newtitle = checkElem.title;
                checkElem.innerHTML = result.percent;
                separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "1561")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.innerText = "Save";
                checkElem.title = "Check the string";
                checkElem.style.backgroundColor = "darkorange";

                if (typeof headerElem.style != "undefined") {
                    headerElem.style.backgroundColor = "darkorange";
                }
            }

            else if (result.percent == 0) {
                // We need to set the title here also, otherwise it will occassionally not be shown
                newtitle = checkElem.title;
                if ((result.wordCount - result.foundCount) == 0) {
                    checkElem.innerText = "0";
                    checkElem.style.backgroundColor = "green";
                    let separator1 = document.createElement("div");
                    separator1.setAttribute("class", "checkElem_save");
                    checkElem.appendChild(separator1);
                    res = addCheckButton(rowId, checkElem, "1593")
                    SavelocalButton = res.SavelocalButton
                    if (result.wordCount > 0) {
                        checkElem.title = "Do not save the string";
                        SavelocalButton.innerText = "Miss!";
                    }
                    else {
                        checkElem.title = "Save the string";
                        SavelocalButton.innerText = "NoGlos";
                    }
                    if (typeof headerElem.style != "undefined") {
                        headerElem.style.backgroundColor = "";
                    }
                }
                else {
                    checkElem.innerText = result.wordCount - result.foundCount;
                    checkElem.title = "Check the string";
                    checkElem.style.backgroundColor = "red";
                    let separator1 = document.createElement("div");
                    separator1.setAttribute("class", "checkElem_save");
                    checkElem.appendChild(separator1);
                    res = addCheckButton(rowId, checkElem, "1612")
                    SavelocalButton = res.SavelocalButton
                    if (current.innerText != "untranslated" && current.innerText != 'current') {
                        SavelocalButton.innerText = "Rej";
                        //SavelocalButton.disabled = true;
                    }
                    if (typeof headerElem.style != "undefined") {
                        headerElem.style.backgroundColor = "red";
                    }
                }
            }
            newline = "\n";
            missingverbs = "Missing verbs \n";
            // We need to update the rowbutton
            await updateRowButton(current, SavelocalButton, checkElem, result.wordCount,result.foundCount, rowId, "1643");
        }

        // 11-08-2021 PSS added aditional code to prevent duplicate missing verbs in individual translation
        if ((result.toolTip).length > 0) {
            headerElem.title = "";
            headertitle = '';
            
            // 09-08-2021 PSS fix for issue #115 missing verbs are not shown within the translation
            if (typeof headerElem.title != "undefined") {
                headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                headerElem.setAttribute("title", headertitle);
                if ((result.toolTip).length > 0) {
                   // console.debug('missing verbs:', result.toolTip)
                    document.getElementById("translate-" + rowId + "-translocal-entry-missing-button").style.visibility = "visible";
                }
                headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            }
            else {
                document.getElementById("translate-" + rowId + "-translocal-entry-missing-button").style.visibility = "hidden";
                newtitle = checkElem.title.concat(result.toolTip);
                headertitle = headerElem.title;
            }
        }
        else {
            newtitle = checkElem.title.concat(result.toolTip);
            headertitle = headerElem.title;
            if (typeof headerElem.style != "undefined") {
                if (result.percent == 100) {
                    headerElem.style.backgroundColor = "green";
                }
            }
            if (document.getElementById("translate-" + rowId + "-translocal-entry-missing-button") != null) {
                document.getElementById("translate-" + rowId + "-translocal-entry-missing-button").style.visibility = "hidden";
            }

        }
        if ((result.toolTip).length > 0) {
            checkElem.setAttribute("title", result.toolTip);
        }

        // 13-08-2021 PSS added a notification line when it concerns a translation of a name for the theme/plugin/url/author
        if (showName == true) {
            showNameLabel(originalElem)
        }
        if (oldstring == "True") {
            // 22-06-2021 PSS added tekst for previous existing translations into the original element issue #89
            showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old);
        }
    }
    else {
        console.debug("no rowid!!")
    }
}

function showNameLabel(originalElem) {
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
    }
}

function showOldstringLabel(originalElem,currcount,wait,rejec,fuz,old) {
    // 05-07-2021 this function is needed to set the flag back for noOldTrans at pageload
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
        element1.appendChild(document.createTextNode("Existing string(s)! " + currcount + " " + wait + " " + rejec + " " + fuz + " " + old));
    }
    else {
        console.debug("updateElementStyle empty!:", originalElem);
    }
}

function addCheckButton(rowId, checkElem, lineNo) {
    //console.debug("addCeckButton!", rowId, checkElem, lineNo)
    var currentcel = document.querySelector(`#preview-${rowId} td.priority`);
    let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
    if (SavelocalButton == null) {
        let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
    }
    if (checkElem == null) {
        separator1 = document.createElement("div");
        separator1.setAttribute("class", "checkElem_save");
        currentcel.appendChild(separator1);
        SavelocalButton = document.createElement("button");
        SavelocalButton.id = "tf-save-button";
        SavelocalButton.className = "tf-save-button";
        SavelocalButton.innerText = ("Curr");
        SavelocalButton.onclick = savetranslateEntryClicked;
        currentcel.appendChild(SavelocalButton);

    }
    else {
        //checkElem is present
        if (SavelocalButton == null) {
            SavelocalButton = document.createElement("button");
            SavelocalButton.id = "tf-save-button";
            SavelocalButton.className = "tf-save-button";
            SavelocalButton.innerText = ("Tmp");
            SavelocalButton.onclick = savetranslateEntryClicked;
            currentcel.appendChild(SavelocalButton);
        }
    }
    return { SavelocalButton };
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
                        if (typeof confirm === 'function') {
                            confirm.click();
                        }
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
                // 25-08-2022 PSS changes made to fix issue #238
                let preview = document.querySelector(`#preview-${rowId}`);
                let editor = preview.nextElementSibling;
                let glotpress_suggest = editor.querySelector(".translation-actions__save");
                
                //glotpress_save = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);
                //setTimeout(() => { 
                glotpress_suggest.click();
            }
            status.innerText = "current";
            current.innerText = "current";
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
        if (current.innerText == "changes requested") {
            let glotpress_open = document.querySelector(`#preview-${rowId} td.actions .edit`);
            let glotpress_reject = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .reject`);
            let glotpress_close = document.querySelector(`#editor-${rowId} div.editor-panel__left .panel-header-actions__cancel`);
            glotpress_open.click();
            glotpress_reject.click();
            glotpress_close.click();
            prevrow = document.querySelector(`#preview-${rowId}.preview.status-changesrequested`);
            prevrow.style.backgroundColor = "#eb9090";
        }
        // Now we are done reset the button state
        let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        // If we click the row button on the left, we do not have a SavelocalButton!!
        if (SavelocalButton != null) {
            SavelocalButton.className += " ready";
            SavelocalButton.disabled = true;
            SavelocalButton.display = "none";
        }
    }
}

function validate(language, original, translation, locale) {
    let originalWords = original.split(" ");
    var wordCount = 0;
    var foundCount = 0;
    let percent = 0;
    var toolTip = [];
    var isFound = false;
    var newText = "";
    //PSS 09-03-2021 Added check to prevent calculatiing on a empty translation
        
    if (translation.length > 0) {
       for (let oWord of originalWords) {
           for (let gItem of glossary) {
               let gItemKey = gItem["key"];
               let gItemValue = gItem["value"];
               // Fix for not comparing properly due to special chars issue #279
               oWord = oWord.replace(/[^a-zA-Z0-9 ]/g, '');
               // we compare the original word against the key of the glossary
               //console.debug("oWord:", oWord.toLowerCase(),"Itemkey", gItemKey.toLowerCase())
               if (oWord.toLowerCase() == gItemKey.toLowerCase()) {
                   wordCount++;
                   isFound = false;
                   for (let gWord of gItemValue) {
                       // here we match the translation against the glossary noun
                      // console.debug("compare:", gWord.toLowerCase(), translation.toLowerCase(), gItemValue)
                       if (match(language, gWord.toLowerCase(), translation.toLowerCase(), gItemValue)) {
                           isFound = true;
                           break;
                       }
                   }
                   if (isFound) {
                       foundCount++;
                   }
                   else {
                       // here we mark the verb if a glossary verb is not present issue #282
                       let re = new RegExp(oWord, "g"); // search for all instances
                       newText = original.replace(re, `<mark>${oWord}</mark>`);
                       if (!(toolTip.hasOwnProperty("`${gItemKey}`"))) {
                           toolTip += `${gItemKey} - ${gItemValue}\n`;
                       }
                   }
               }
           }
       }
    }
    else {
         foundCount = 0;
         wordCount = 0;
         percent = 0;
    }
    // 12-02-2023 PSS Modified the code below as it was not correct
    if (wordCount == 0 && foundCount == 0) {
        percent = 100;
    }
    else if (wordCount == foundCount ) {
            percent = 100;
    }      
    else if ((wordCount - foundCount) >0) {      
        percent = (foundCount * 100) / wordCount;
    }
    return { wordCount, foundCount, percent, toolTip, newText };
}


// Language specific matching.
function match(language, gWord, tWord, gItemValue) {
    var glossaryverb;
    if (typeof language != 'undefined') {
        // language is set to uppercase, so we need to return it to lowercase issue #281
        language = language.toLowerCase();
        switch (language) {
            case "ta":
                return taMatch(gWord, tWord);
            default:
                // 13-02-2023 PSS fixed a problem when the original only includes one verb
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
            }).then(response => response.text())
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

                    var separator1 = createElementWithId("div", "translator_sep1");
                    separator1.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px solid grey;";
                    separator1.appendChild(document.createTextNode(""));

                    var separator2 = createElementWithId("div", "translator_sep2");
                    separator2.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px #C4C4C4;";
                    separator2.appendChild(document.createTextNode(""));

                    var separator3 = createElementWithId("div", "translator_sep3");
                    separator3.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px #C4C4C4;";
                    separator3.appendChild(document.createTextNode(""));

                    var separator4 = createElementWithId("div", "translator_sep4");
                    separator4.style.cssText = "width:100%; display:block; height:1px; border-bottom: 1px #C4C4C4;";
                    separator4.appendChild(document.createTextNode(""));

                    var element1 = createElementWithId("div", "translator_div1");
                    element1.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                    element1.appendChild(document.createTextNode("Previous existing translation"));

                    var element2 = createElementWithId("div", "translator_div2");
                    element2.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                    element2.appendChild(document.createTextNode(orig[0].innerText));

                    var element3 = createElementWithId("div", "translator_div3");
                    element3.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                    // If within editor you have no translation
                    if (trans[0] != "undefined") {
                        element3.appendChild(document.createTextNode(trans[0].innerText));
                    }

                    // 23-06-2021 PSS added the current translation below the old to be able to mark the differences issue #92                
                    var element4 = createElementWithId("div", "translator_div4");
                    element4.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";


                    var element5 = createElementWithId("div", "translator_div5");
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
                        } else {
                            textdif = "";
                        }
                        if (oldStr == newStr) {
                            element4.appendChild(document.createTextNode("New translation is the same"));
                        } else {
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
                    if (table != null) {
                           let tr = table.rows;
                           const tbodyRowCount = table.tBodies[0].rows.length;
                           // 04-07-2021 PSS added counter to message for existing translations
                           let rejected = table.querySelectorAll("tr.preview.status-rejected");
                           let waiting = table.querySelectorAll("tr.preview.status-waiting");
                           let fuzzy = table.querySelectorAll("tr.preview.status-fuzzy");
                           let current = table.querySelectorAll("tr.preview.status-current");
                           let old = table.querySelectorAll("tr.preview.status-old");
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
                              updateElementStyle(checkElem, "", result, "True", originalElem, wait, rejec, fuz, old, rowId, "", "", currcount);
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
