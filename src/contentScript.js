//var glossary;
loadGlossary();
addTranslateButtons();
if (!window.indexedDB) {
    messageBox("error", "Your browser doesn't support IndexedDB!<br> You cannot use local storage!");
    console.log(`Your browser doesn't support IndexedDB`);
}
else {
    // PSS added jsStore to be able to store and retrieve default translations
    var jsstoreCon = new JsStore.Connection();
    var db;
    db = myOpenDB(db);
   // console.debug("new db open:", db);   
}

var translator; // Declare the global variable

// Use chrome.local.get to retrieve the value
chrome.storage.local.get('transsel', async function (result) {
    translator = result.transsel; // Assign the value to the global variable
});


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

const csvParser = data => {
    const rows = data.split(/\r\n|\n/)
    return rows
}

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

//When performing bulk save the difference is shown in Meta #269
// We need to set the default value for showing differents
chrome.storage.local.get(["showTransDiff"], function (data) {
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
chrome.storage.local.get( ["glotDictGlos"],
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

document.addEventListener("keydown", async function (event) {
    // PSS 31-07-2021 added new function to scrape consistency tool
    if (event.altKey && event.shiftKey && (event.key === "&")) {
        var org_verb;
        var wrong_verb;
        event.preventDefault();
        chrome.storage.local.get(["destlang"],
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
                    if (f != "undefined" && e != null) {
                        wrong_verb = f.value;
                    }
                    else {
                        wrong_verb = "Wrong verb";
                    }
                    scrapeconsistency(data.destlang, org_verb, wrong_verb);
                }
                else {
                    messageBox("error", "You do not have permissions to start this function!");
                }
            }
        );
    }

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
        chrome.storage.local.set({
            convertToLower: true
        });
        chrome.storage.local.get(["convertToLower"], function (data) {
            if (data.convertToLower != "null") {
                convertToLow = data.convertToLower;
            }
        });
        UpperCaseButton.className = "UpperCase-button uppercase"
        toastbox("info", "Switching conversion on", "1200", "Conversion");
    }
    if (event.altKey && event.shiftKey && (event.key === "-")) {
        // This switches convert to lowercase off
        event.preventDefault();
        chrome.storage.local.set({
            convertToLower: false
        });
        chrome.storage.local.get(["convertToLower"], function (data) {
            if (data.convertToLower != "null") {
                convertToLow = data.convertToLower;
            }
        });
        UpperCaseButton.className = "UpperCase-button"
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
        chrome.storage.local.get( ["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
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
        chrome.storage.local.get(
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
        chrome.storage.local.get(
            ["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree", "TMwait", "spellCheckIgnore"],
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
                            result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, TMwait, data.spellCheckIgnore);
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
        SwitchTMClicked();
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

    if (event.altKey && event.shiftKey && (event.key === "F11")) {
       // console.debug("F11")
        event.preventDefault();
        toastbox("info", "checkFormal is started wait for the result!!", "2000", "CheckFormal");
        var dataFormal = 'Je hebt, U heeft\nje kunt, u kunt\nHeb je,Heeft u\nhelpen je,helpen u\nWil je,Wilt u\nom je,om uw\nkun je,kunt u\nzoals je,zoals u\nJe ,U \nje ,u \njouw,uw\nmet je,met uw\n';
        checkPageClicked(event);
      //  checkFormalPage(dataFormal);
        close_toast();

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


    if (event.altKey && event.shiftKey && (event.key === "S" || event.key === "s")) {
        event.preventDefault();
        chrome.storage.local.get(
            ["LtKey", "LtUser", "LtLang", "LtFree", "spellCheckIgnore"],
            function (data) {
                if (data.LtFree == true) {
                    startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
                }
                else {
                    if (typeof data.LtKey != "undefined" && data.LtKey != "") {

                        if (data.LtUser != "undefined" && data.LtUser != "") {
                            if (data.LtLang != "undefined" && data.LtLang != "") {
                                startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
                            }
                            else {
                                messageBox("error", "You need to set the language");
                            }
                        }
                        else {
                            messageBox("error", "You need to set the parameter for the user");
                        }
                    }
                    else {
                        messageBox("error", "No apikey is set for languagetool!");
                    }
                }
            }
        );
    }

    if (event.altKey && event.shiftKey && (event.key === "L" || event.key === "l")) {
        //event.preventDefault();
       // console.debug("Glossary loading started")
        var file;
        var arrayFiles;
        fileSelector.click();
        // console.debug("after fileSelector")
        fileSelector.addEventListener("change", (event) => {
            fileList = event.target.files;
            arrayFiles = Array.from(event.target.files)
            file = fileList[0];
            // console.debug("before checking file:",file)
            if (file.type == 'text/csv' || "application/vnd.ms-excel") {
                //console.debug("after file selection")
                if (fileList[0]) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var contents = e.target.result;
                        // console.debug("contents:", contents)
                        var glossary = csvParser(contents)
                        //console.debug("glossary:", glossary)
                       // glossary = Array.from(glossary);
                        chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                            var formal = checkFormal(false);
                            var DeeplFree = data.DeeplFree;
                           // console.debug("before load_glossary")
                            load_glossary(glossary, data.apikeyDeepl, DeeplFree, data.destlang)
                            file = ""
                        });

                        reader.onerror = function () {
                            console.log(reader.error);
                        };
                    };
                    reader.readAsText(fileList[0]);
                }
                else {
                    console.debug("No file selected")
                }
            }
            else {
                // File is wrong type so do not process it
                messageBox("error", "File is not a csv!");
            }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "D" || event.key === "d")) {
        //event.preventDefault();
       // console.debug("Glossary showing started")
  
       chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                var formal = checkFormal(false);
                var DeeplFree = data.DeeplFree;
                show_glossary(data.apikeyDeepl, DeeplFree, data.destlang)
       });                  
    }
    if (event.altKey && event.shiftKey && (event.key === "A" || event.key === "a")) {
        event.preventDefault();

       // console.debug("Translate started")
        let rowId = document.querySelector("#editor");
       // let myEditor = document.querySelector("source-string__singular");
        // console.debug("Translate started",rowId)
        //let rowId = myEditor.getAttribute("row");
        // rowId = event.target.id.split("-")[1];
        //let myrowId = event.target.id.split("-")[2];
        //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
        // So that needs to be added to the base rowId to find it
        if (typeof myrowId != "undefined" && myrowId != "translation") {
            newrowId = rowId.concat("-", myrowId);
            rowId = newrowId;
        }
        chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree","spellCheckIgnore"], function (data) {
            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
            var formal = checkFormal(false);
            var DeeplFree = data.DeeplFree;
            translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, DeeplFree, translationComplete, spellCheckIgnore);
        });
    }

    if (event.altKey && (event.key === "r" || event.key === "R")) {
        // PSS 29-07-2021 added a new function to replace verbs from the command line, or through a script collecting the links issue #111
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
if (divMenu != null) {
    optionlink.appendChild(a)
    divMenu.appendChild(optionlink);
}

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

//12-05-2022 PSS added a new buttons specials
var UpperCaseButton = document.createElement("a");
UpperCaseButton.href = "#";
UpperCaseButton.onclick = UpperCaseClicked;
UpperCaseButton.innerText = "Casing";

var SwitchTMButton = document.createElement("a");
SwitchTMButton.href = "#";
SwitchTMButton.className = "Switch-TM-button";
SwitchTMButton.onclick = SwitchTMClicked;
SwitchTMButton.innerText = "SwitchTM";

// We need to check if we have a glossary ID

var LoadGloss = document.createElement("a");
LoadGloss.href = "#";
LoadGloss.onclick = LoadGlossClicked;
LoadGloss.innerText = "LoadGloss";


var DispGloss = document.createElement("a");
DispGloss.href = "#";
DispGloss.className = "DispGloss-button";
DispGloss.onclick = DispGlossClicked;
DispGloss.innerText = "DispGloss";

// 12-05-2022 PSS here we add all buttons in the pagina together
var GpSpecials = document.querySelector("span.previous.disabled");
if (GpSpecials == null) {
    var GpSpecials = document.querySelector("a.previous");
}
if (GpSpecials != null && divProjects == null) {
    divPaging.insertBefore(UpperCaseButton, divPaging.childNodes[0]);
    divPaging.insertBefore(SwitchTMButton, divPaging.childNodes[0]);
    chrome.storage.local.get(["apikeyDeepl"], function (data) {
        let apikey=data.apikeyDeepl
        if (data.apikeyDeepl != null && data.apikeyDeepl !="" && typeof data.apikeyDeepl != 'undefined') {
            divPaging.insertBefore(LoadGloss, divPaging.childNodes[0]);
            divPaging.insertBefore(DispGloss, divPaging.childNodes[0]);
            glossloaded = checkGlossary(LoadGloss)
        }
    });
    UpperCase = localStorage.getItem(['switchUpper'])
    if (UpperCase == 'false') {
        UpperCaseButton.className = "UpperCase-button";
    }
    else {
        UpperCaseButton.className = "UpperCase-button uppercase"
    }
    //divPaging.insertBefore(impLocButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(exportButton, divPaging.childNodes[0]);
    //divPaging.insertBefore(importButton, divPaging.childNodes[0]);
}

async function checkGlossary() {
    var glos_isloaded = await localStorage.getItem(['deeplGlossary']);
   // console.debug("in check gloss:", glos_isloaded)
    if (glos_isloaded == null || glos_isloaded=="") {
        LoadGloss.className = "LoadGloss-button-red";
    } else {
        LoadGloss.className = "LoadGloss-button-green"
    }
}

function DispGlossClicked() {
   // console.debug("Glossary showing started")
    chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
        var formal = checkFormal(false);
        var DeeplFree = data.DeeplFree;
        show_glossary(data.apikeyDeepl, DeeplFree, data.destlang)
    });
}

function LoadGlossClicked() {
//event.preventDefault();
// console.debug("Glossary loading started")
var file;
var arrayFiles;
fileSelector.click();
// console.debug("after fileSelector")
fileSelector.addEventListener("change", (event) => {
    fileList = event.target.files;
    arrayFiles = Array.from(event.target.files)
    file = fileList[0];
    // console.debug("before checking file:",file)
    if (file.type == 'text/csv' || "application/vnd.ms-excel") {
        //console.debug("after file selection")
        if (fileList[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var contents = e.target.result;
                // console.debug("contents:", contents)
                var glossary = csvParser(contents)
                //console.debug("glossary:", glossary)
                // glossary = Array.from(glossary);
                chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                    //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                    var formal = checkFormal(false);
                    var DeeplFree = data.DeeplFree;
                    //console.debug("before load_glossary")
                    load_glossary(glossary, data.apikeyDeepl, DeeplFree, data.destlang)
                    file = ""
                });

                reader.onerror = function () {
                    console.log(reader.error);
                };
            };
            reader.readAsText(fileList[0]);
        }
        else {
            console.debug("No file selected")
        }
    }
    else {
        // File is wrong type so do not process it
        messageBox("error", "File is not a csv!");
    }
});
}

function UpperCaseClicked() {
    event.preventDefault();
    // This switches convert to lowercase on/off
    chrome.storage.local.get(["convertToLower"], function (data, UpperCaseButton) {
        var UpperCaseButton = document.querySelector('.UpperCase-button')
        if (data.convertToLower != "null") {
            convertToLow = data.convertToLower;
            if (convertToLow == true) {
                toastbox("info", "Switching conversion off", "1200", "Conversion");
                UpperCaseButton.className = "UpperCase-button"
                localStorage.setItem('switchUpper', 'false');
                chrome.storage.local.set({
                    convertToLower: false 
                });
            }
            else {
                toastbox("info", "Switching conversion on", "1200", "Conversion");
                UpperCaseButton.className = "UpperCase-button uppercase"
                localStorage.setItem('switchUpper', 'true');
                chrome.storage.local.set({
                    convertToLower: true
                });
            }
        }
    });
}

function SwitchTMClicked() {
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

}
async function startSpellCheck(LtKey, LtUser, LtLang,LtFree,spellcheckIgnore) {
    await spellcheck_page(LtKey, LtUser, LtLang,LtFree,spellcheckIgnore)
}

function createElementWithId(type, id) {
    let element = document.createElement(type);
    element.id = id;
    return element;
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
    chrome.storage.local.get(
        ["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree", "TMwait", "postTranslationReplace", "preTranslationReplace", "convertToLower", "spellCheckIgnore"],
        function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI") {
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
                        result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, TMwait, data.postTranslationReplace, data.preTranslationReplace, data.convertToLower,data.spellCheckIgnore);
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
    chrome.storage.local.get(
        ["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree"],
        function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI") {

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
    chrome.storage.local.get(
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
    chrome.storage.local.get(
        ["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "OpenAIPrompt", "OpenAISelect", "OpenAItemp", "OpenAIWait", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore"],
        function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined')
            {
                if (data.destlang != "undefined" && data.destlang != null && data.destlang !="") {
                    if (data.transsel != "undefined") {
                        //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                        var formal = checkFormal(false);
                        //var locale = checkLocale();
                        convertToLow = data.convertToLower;
                        var DeeplFree = data.DeeplFree;
                        var openAIWait = Number(data.OpenAIWait);
                        var OpenAItemp = parseFloat(data.OpenAItemp);
                        var deeplGlossary = localStorage.getItem('deeplGlossary');
                        //console.debug("glossary_id:", deeplGlossary)
                        translatePage(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.apikeyOpenAI, data.OpenAIPrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, data.DeeplFree, translationComplete, data.OpenAISelect, openAIWait, OpenAItemp, data.spellCheckIgnore,deeplGlossary);
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
    var timeout = 500;
   
    //toastbox("info", "Checkpage is started wait for the result!!", "2000", "CheckPage");
   
    
    chrome.storage.local.get(
        ["apikey", "apikeyOpenAI", "destlang", "transsel", "postTranslationReplace", "preTranslationReplace", "LtKey", "LtUser", "LtLang", "LtFree", "Auto_spellcheck", "spellCheckIgnore", "OpenAIPrompt", "reviewPrompt", "Auto_review_OpenAI", "postTranslationReplace", "preTranslationReplace", "convertToLower", "showHistory"],
        function (data) { 
            const promise1 = new Promise(async function (resolve, reject) {
                await checkPage(data.postTranslationReplace, formal, data.destlang, data.apikeyOpenAI, data.OpenAIPrompt, data.spellcheckIgnore, data.showHistory);
                resolve(data);     
            });
            const promise2 = new Promise(async function (resolve, reject) {
                await promise1;
                if (data.Auto_spellcheck == true) {
                    if (typeof data.spellcheckIgnore == 'undefined') {
                        data.spellcheckIgnore = []
                        }
                    await startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
                    resolve(data)
                }
                else {
                    resolve(data)
                }
            });

            const promise3 = new Promise(async function (resolve, reject) {
                await promise2;
                if (data.transsel == "OpenAI") {
                    if (data.Auto_review_OpenAI == true) {
                        if (data.apikeyOpenAI != "") {
                            //console.debug("review started:", val)
                            startreviewOpenAI(data.apikeyOpenAI, data.destlang, data.OpenAIPrompt, data.reviewPrompt);
                            resolve(data)
                        }
                    }
                }
            });
            promise1.then(function (data) {
                console.debug("promise1:");   
            });
            promise2.then(function (data) {
                console.debug("promise2:");   
            });
            promise3.then(function (data) {
                console.debug("promise3:");
            });
        }
    );
}

function exportPageClicked(event) {
    event.preventDefault();
    chrome.storage.local.get(
        ["apikey", "destlang"],
        function (data) {
            dbExport(data.destlang);
        }
    );
    // res= dbExport();
}


function loadGlossary() {
    glossary = [];
    chrome.storage.local.get(["glossary", "glossaryA", "glossaryB", "glossaryC"
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
                

                if (glossary.length > 27) {
                    chrome.storage.local.get(["showHistory",'destlang'], function (data,event) {
                        if (data.showHistory != "null") {
                            let locale = checkLocale();
                            validatePage(data.destlang, data.showHistory, locale,"");
                        }
                    });
                }
                else {
                    messageBox("error", "Your glossary is not loaded because no file is loaded!!");
                    return;
                }
               // checkbuttonClick();
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
            var newTransDiv = document.querySelector(`#editor-${rowId} .panel-header`);
            newTransDiv.insertAdjacentHTML("afterend", '<div class="panelTransMenu">');
            let panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
           
            let translateButton = createElementWithId("my-button", `translate-${rowId}-translation-entry-my-button`);
            translateButton.href = "#";
            translateButton.className = "translation-entry-my-button";
            translateButton.onclick = translateEntryClicked;
            translateButton.innerText = "Translate";
            translateButton.style.cursor = "pointer";
            if (panelTransDiv != null) {
                panelTransDiv.appendChild(translateButton);
            }
            // Add addtranslate button
            let addTranslateButton = createElementWithId("my-button", `translate-${rowId}-addtranslation-entry-my-button`);
            addTranslateButton.href = "#";
            addTranslateButton.className = "addtranslation-entry-my-button";
            addTranslateButton.onclick = addtranslateEntryClicked;
            addTranslateButton.innerText = "Add Translation";
            addTranslateButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(addTranslateButton, panelTransDiv.childNodes[0]);

            let TranslocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-local-button`);
            TranslocalButton.className = "translocal-entry-local-button";
            TranslocalButton.innerText = "Local";
            TranslocalButton.style.visibility = "hidden";
            panelTransDiv.insertBefore(TranslocalButton, panelTransDiv.childNodes[0]);

            let MissinglocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-missing-button`);
            MissinglocalButton.className = "translocal-entry-missing-button";
            MissinglocalButton.innerText = "Missing glossary entry";
            MissinglocalButton.style.visibility = "hidden";
            MissinglocalButton.style.animation = "blinking 1s infinite";
            panelTransDiv.insertBefore(MissinglocalButton, panelTransDiv.childNodes[0]);

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
                // 30-10-2021 PSS added fix #156 for converting special chars
                reader.readAsText(fileList[0]);
                reader.onload = function (e) {
                    obj_csv.size = e.total;
                    obj_csv.dataFile = e.target.result;
                    //console.log(obj_csv.dataFile)
                    //File is imported so process it
                    parseDataBase(obj_csv.dataFile);
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
                        chrome.storage.local.get(["showTransDiff"], async function (data) {
                            if (data.showTransDiff != "null") {
                                chrome.storage.local.get(["toonDiff"]).then((result) => {
                                   // console.log("Value toonDiff currently is " + result.toonDiff);
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
    var textareaElem;
    var translateButton;
    var editor;
    var OpenAIres;
    var newres;
    var lires = '0';
    if (event != undefined) {
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        //event.preventDefault(); caused a problem within the single page enttry  
        let action = event.target.textContent;
        // 30-06-2021 PSS added fetch status from local storage
        // Necessary to prevent showing old translation exist if started from link "Translation history"
        // 22-06-2021 PSS fixed issue #90 where the old translations were not shown if vladt WPGP Tool is active
        if (action == "Details" || action == "✓Details") {
            let rowId = event.target.parentElement.parentElement.getAttribute("row");
            glob_row = rowId;
            detailRow = rowId;

            //localStorage.setItem('interXHR', 'false');
            // We need to expand the amount of columns otherwise the editor is to small due to the addition of the extra column
            // if the translator is a PTE then we do not need to do this, as there is already an extra column
            let myrec = document.querySelector(`#editor-${detailRow}`);
            if (!is_pte) {
                if (myrec != null) {
                    var tds = myrec.getElementsByTagName("td")[0];
                    if (tds == null) {
                        var tds = myrec.getElementsByTagName("tr")[0];
                    }
                    tds.setAttribute("colspan", 5);
                }
            }
            if (myrec != null) {
                // we are not in listmode
                myrec.scrollIntoView(true);
            }

            let panelTransDiv = document.querySelector(`#editor-${rowId} div.panelTransMenu`)
            //console.debug("panelTransDiv:", panelTransDiv)
            if (panelTransDiv == null) {
                // If the transdiv is not present we need to add it
                var newTransDiv = document.querySelector(`#editor-${rowId} .panel-header`);
                if (newTransDiv != null) {
                    newTransDiv.insertAdjacentHTML("afterend", '<div class="panelTransMenu">');
                    // We need to repopulate the panelTransDiv as it now exists
                    panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
                    translateButton = document.querySelector(`#editor-${rowId}-translation-entry-my-button`);

                    translateButton = createElementWithId("my-button", `translate-${rowId}--translation-entry-my-button`);
                    translateButton.className = "translation-entry-my-button";
                    translateButton.onclick = translateEntryClicked;
                    translateButton.innerText = "Translate";
                    panelTransDiv.insertBefore(translateButton, panelTransDiv.childNodes[0]);

                    addTranslateButton = createElementWithId("my-button", `translate-${rowId}-addtranslation-entry-my-button`);
                    addTranslateButton.className = "addtranslation-entry-my-button";
                    addTranslateButton.onclick = addtranslateEntryClicked;
                    addTranslateButton.innerText = "Add Translation";
                    panelTransDiv.insertBefore(addTranslateButton, panelTransDiv.childNodes[0]);

                    TranslocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-local-button`);
                    TranslocalButton.className = "translocal-entry-local-button";
                    TranslocalButton.innerText = "Local";
                    TranslocalButton.style.visibility = "hidden";
                    panelTransDiv.insertBefore(TranslocalButton, panelTransDiv.childNodes[0]);

                    MissinglocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-missing-button`);
                    MissinglocalButton.className = "translocal-entry-missing-button";
                    MissinglocalButton.innerText = "Missing glossary entry";
                    MissinglocalButton.style.visibility = "hidden";
                    MissinglocalButton.style.animation = "blinking 1s infinite";
                    panelTransDiv.insertBefore(MissinglocalButton, panelTransDiv.childNodes[0]);
                }
            }
            translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            // We need the current textareaElem for evaluation of the translated text
            textareaElem = document.querySelector(`#editor-${rowId} textarea.foreign-text`);
            result = await validateEntry('nl', textareaElem, "", "", rowId, "nl");

            // 02-07-2021 PSS fixed issue #94 to prevent showing label of existing records in the historylist
            chrome.storage.local.set({ "noOldTrans": "True" }, function () {
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
                chrome.storage.local.get(["showTransDiff"], async function (data) {
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


            editor = document.querySelector(`#editor-${rowId}`);
            newres = editor.querySelector(`#editor-${rowId} .suggestions__translation-memory.initialized .suggestions-list`);
            res = await waitForElementInRow(`#editor-${rowId}`, '.suggestions__translation-memory.initialized .suggestions-list', 400)
                .then(async (element) => {
                    //console.debug("we found suggestion list:", element)
                    newres = editor.querySelector(`#editor-${rowId} .suggestions__translation-memory.initialized .suggestions-list`);
                    lires = newres.getElementsByTagName("li");
                    if (lires[0] != null) {
                        liscore = lires[0].querySelector(`span.translation-suggestion__score`);
                        if (liscore != null) {
                            liscore = liscore.innerText;
                            liscore = Number(liscore.substring(0, liscore.length - 1))
                            if (liscore == 100) {
                                liSuggestion = lires[0].querySelector(`span.translation-suggestion__translation`);
                                textFound = liSuggestion.innerHTML;
                                textFoundSplit = textFound.split("<span")[0]
                                if (textFoundSplit != null) {
                                    textFound = textFoundSplit;
                                }
                                else {
                                    textFound = liSuggestion.innerText;
                                }
                            }
                            else {
                                console.debug("We did not find a li with score 100:",liscore)
                            }
                        }
                    }
                    else {
                        liscore = '0';
                    }
                })
                .catch ((error) => {
                   //console.debug("element not found:", error)
                   liscore = '0';
                   //console.error(error.message);
                });

            //console.debug("lires:", newres, Number(liscore));
            if (liscore != 100) {
                if (translator == 'OpenAI') {
                    res = await waitForElementInRow(`#editor-${rowId}`, '.translation-suggestion.with-tooltip.openai', 5000)
                        .then(async (element) => {
                            // We seem to have suggesttions, so now define them further
                            OpenAIres = editor.getElementsByClassName("translation-suggestion with-tooltip openai");
                            if (OpenAIres.length > 0) {
                                liSuggestion = OpenAIres[0].querySelector(`span.translation-suggestion__translation`);
                                liSuggestion_raw = OpenAIres[0].querySelector('span.translation-suggestion__translation-raw');
                                textFound = liSuggestion.innerText
                               // console.debug("text found:", textFound)
                                let my_original = editor.querySelector(".original");
                                if (my_original != null) {
                                    original = my_original.innerText
                                    chrome.storage.local.get(["postTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "formal"], function (data) {
                                        setPostTranslationReplace(data.postTranslationReplace, data.formal);
                                        let correctedText = liSuggestion.innerText = postProcessTranslation(original, textFound, replaceVerb, "", "", data.convertToLower, data.spellCheckIgnore, locale)
                                        liSuggestion.innerText = correctedText
                                        // raw is the text copied into the editor
                                        liSuggestion_raw.innerText = correctedText
                                    });
                                }
                            }
                        })
                        .catch((error) => {
                            //console.debug("element not found:", error)
                            //console.error(error.message);
                        });
                }
                else {
                    // we do not have OpenAI so try DeepL
                    res = await waitForElementInRow(`#editor-${rowId}`, '.translation-suggestion.with-tooltip.deepl', 5000)
                        .then(async (element) => {
                            DeepLres = editor.getElementsByClassName("translation-suggestion with-tooltip deepl");
                            if (DeepLres.length > 0) {
                                liSuggestion = DeepLres[0].querySelector(`span.translation-suggestion__translation`);
                                liSuggestion_raw = DeepLres[0].querySelector('span.translation-suggestion__translation-raw');
                                textFound = liSuggestion.innerText
                                let my_original = editor.querySelector(".original");
                                if (my_original != null) {
                                    original = my_original.innerText
                                    chrome.storage.local.get(["postTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "formal"], function (data) {
                                        setPostTranslationReplace(data.postTranslationReplace, data.formal);
                                        let correctedText = liSuggestion.innerText = postProcessTranslation(original, textFound, replaceVerb, "", "", data.convertToLower, data.spellCheckIgnore, locale)
                                        liSuggestion.innerText = correctedText
                                        // raw is the text copied into the editor
                                        liSuggestion_raw.innerText = correctedText
                                        //console.debug("Corrected text:",correctedText)
                                    });
                                }
                                else {
                                    console.debug("We did not find a text")
                                }
                            }
                            else {
                                console.debug("We did not find a result")
                            }

                        })
                        .catch((error) => {
                           // console.debug("element not found:", error)
                            //console.error(error.message);
                        });
                }
            }
            else {
                //console.debug("we did find a 100 % score")
            }
             
           
               
            if (typeof textareaElem != "null") {
                // we need to use await otherwise there is not result.newText
                result = await validateEntry('nl', textareaElem, "", "", rowId, "nl");
                if (result.newText != "") {
                    let editorElem = document.querySelector("#editor-" + rowId + " .original");
                    //19-02-2023 PSS we do not add the marker twice, but update it if present
                    if (editorElem != null) {
                        let markerpresent = editorElem.querySelector("span.mark-explanation");
                        if (markerpresent == null) {
                            let markdiv = document.createElement("div");
                            markdiv.setAttribute("class", "marker");
                            let markspan1 = document.createElement("span");
                            let markspan2 = document.createElement("span");
                            markspan1.setAttribute("class", "mark-devider");
                            markspan2.setAttribute("class", "mark-explanation");
                            markdiv.appendChild(markspan1);
                            markdiv.appendChild(markspan2);
                            editorElem.appendChild(markdiv);
                            markspan1.innerHTML = "----- Missing glossary verbs are marked -----<br>"
                            markspan2.innerHTML = result.newText;
                        }
                        else {
                            if (markerpresent != null) {
                                markerpresent.innerHTML = result.newText;
                            }
                            //else { console.debug("markerpresent not found") }
                        }
                    }
                   // else { console.debug("markerpresent not found")}
                }
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
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "OpenAIPrompt", "OpenAISelect", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore"], function (data) {
            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
        var formal = checkFormal(false);
        var DeeplFree = data.DeeplFree;
        var OpenAItemp = parseFloat(data.OpenAItemp);
        var deeplGlossary = localStorage.getItem('deeplGlossary');
        //console.debug("glossary_id:", deeplGlossary)
        translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.apikeyOpenAI, data.OpenAIPrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, DeeplFree, translationComplete, data.OpenAISelect, OpenAItemp, data.spellCheckIgnore, deeplGlossary);
        });
}

async function updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId,record,myHistory,my_checkpage,currstring,repl_array,prev_trans,old_status) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var currcount;
    var current;
    var checkElem;
    var current;
    var SavelocalButton;
    var imgsrc;
    var currText='untranslated'
    var debug = false;
    var currText = 'untranslated'
    
    //console.debug("updateStyle1:",showHistory,myHistory,my_checkpage,currstring)
    imgsrc = chrome.runtime.getURL('/');
    imgsrc = imgsrc.substring(0, imgsrc.lastIndexOf('/'));
    current = document.querySelector("#editor-" + rowId + " div.editor-panel__left div.panel-header span.panel-header__bubble");
    if (typeof rowId == "undefined") {
        let myRow = textareaElem.parentElement.parentElement.parentElement
            .parentElement.parentElement.parentElement.parentElement.getAttribute("row");
        current = document.querySelector("#editor-" + myRow + " div.editor-panel__left div.panel-header span.panel-header__bubble");
        rowId = myrow
    }
    if (current == null) {
        currText = 'untranslated'
    }
    else {
        currText = current.innerText
    }
    let originalElem = document.querySelector("#preview-" + rowId + " .original");
    if (originalElem != null) {
        let glossary = originalElem.querySelector('span .glossary-word');
    }
    let markerpresent = document.querySelector("#preview-" + rowId + " .mark-tooltip");
    if (result.percent == 100) {
        if (markerpresent != null){
            markerpresent.remove();
            }
    }
    if (debug == true) {
        console.debug("updatestyle:", repl_array, prev_trans,current,rowId)
    }
    // 17-02-2023 PSS do not add the marker twice if a retranslation is done
    if (markerpresent == null) {
        // if an original text contains a glossary verb that is not in the tranlation highlight it
        if (result.newText != "" && typeof result.newText != "undefined") {
            if (showName != true) {
                let markerimage = imgsrc + "/../img/warning-marker.png";
                if (current != null){
                    if (current.innerText != "current") {
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
                }
            }
        }
    }

    // 22-06-2021 PSS altered the position of the colors to the checkbox issue #89
    checkElem = document.querySelector("#preview-" + rowId + " .priority");
    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
    if (SavelocalButton == null) {
        SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
    }
    
    // we need to take care that the save button is not added twice
    //myrec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    // pss 12-10-2023 this one needs to be improved as we now have the record containing the editor details
    //current = document.querySelector("#editor-" + rowId + " div.editor-panel__left div.panel-header span.panel-header__bubble");
    if (typeof checkElem == "object") {
        if (SavelocalButton == null) {
            if (!is_pte) {
                let checkBx = document.querySelector("#preview-" + rowId + " .myCheckBox");
                // if there is no checkbox, we do not need to add the input to it and alter the columns
                if (checkBx != null) { 
                  // console.debug("checkbox:", checkBx, checkBx.length)
                   mycheckbox = document.createElement('input');
                   mycheckbox.setAttribute("type", "checkbox");
                   mycheckbox.setAttribute("name", "selected-row[]");
                   checkBx.appendChild(mycheckbox);
                   let myrec = document.querySelector(`#editor-${rowId}`);
                   // We need to expand the amount of columns otherwise the editor is to small
                   var tds = myrec.getElementsByTagName("td")[0];
                   tds.setAttribute("colspan", 5);
                }
            }
            // check for the status of the record
            var separator1 = document.createElement("div");
            separator1.setAttribute("class", "checkElem_save");
            if (checkElem != null) {
                checkElem.appendChild(separator1);
            }
            // we need to add the button!
            let res = await addCheckButton(rowId, checkElem,"1710")
            SavelocalButton = res.SavelocalButton;
        }
    }
    else {
        if (SavelocalButton == null) {
            let res = await addCheckButton(rowId, checkElem,"1716")
            SavelocalButton = res.SavelocalButton
        }
    }
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
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
            fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId, showName, current.innerText,old_status);
        }
    }
    //let currstring = "";
    //console.debug("updateStyle2:", showHistory, myHistory, my_checkpage)
    if (currText != 'untranslated') {
        await updateElementStyle(checkElem, headerElem, result, showHistory, originalElem, "", "false", "", "", rowId, showName, nameDiff, currcount, currstring, currText, record, myHistory, my_checkpage, repl_array, prev_trans,old_status);
    }
    
    row = rowId.split("-")[0];
    
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
           fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId,showName,current.innerText);
        }
    }
}
async function validateEntry(language, textareaElem, newurl, showHistory, rowId, locale, record) {
    //console.debug("validateEntry:",record)
    // 22-06-2021 PSS fixed a problem that was caused by not passing the url issue #91
    var translation;
    var result=[];
    translation = textareaElem.value;
    //console.debug("value textareaElem",translation)
    if (translation == "") {
        translation ="Empty"
    }
    let original = textareaElem.parentElement.parentElement.parentElement
        .querySelector("span.original-raw");
    let originalText = original.innerText;
    result = validate(language, originalText, translation, locale, record);
    //console.debug("result validate:",result,translation)
     //textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status
    updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId,record,false,false,"",[],"","untranslated");
    return result;
}

function updateRowButton(current, SavelocalButton, checkElem, GlossCount, foundCount, rowId, lineNo) {
    if (typeof rowId != "undefined" && SavelocalButton !=null) {
        switch (current) {
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
}
                                          
async function updateElementStyle(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff,currcount,currstring,current,record,myHistory,my_checkpage,repl_array,prev_trans,old_status) {												   	  
    //var current;
    var SavelocalButton;
    var separator1;
    var newtitle='';
    var headertitle = '';
    //headerElem.title = "";
    var panelTransTitle = '';
    var panelTransDiv;
    var missingVerbsButton;
    var missingverbs = "";
    var newline = "\n";
    var debug = false;
    if (debug == true) {
        console.debug("updateElementStyle:",myHistory,my_checkpage,oldstring,currstring)
    }
    if (typeof rowId != "undefined") {
        
        //let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
       // console.debug("current in updateElementStyle:",rowId,current)
        // 05-07-2023 PSS corrected this to prevent error when innerText is not found
        if (current != null) {
           // current = current.innerText;
            if (typeof current == 'string') {
                if (current == 'untranslated') {
                    current = 'Empty';
                }
                if (current == 'current') {
                    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
                }
                else {
                    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
                   // SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
                }
            }
            else {
               // console.debug("Bubble not found!");
            }
        }
        else {
           // console.debug("current is not found!");
        }
        // We need to have the new bar to be able to set the color
        panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
        // PSS the below code needs to be improved see code in commonTranslate
       // if (typeof result.wordCount == "undefined") {
         //   if (SavelocalButton != null) {
          //      current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
          //      if (current != null) {
                    // this is duplicate and is not necessary
                  //updateRowButton(current, SavelocalButton, checkElem, result.wordCount, result.foundCount,rowId,"1528");
             //   }
             //   else {
              //      SavelocalButton.title = "Do not save!!";
              //  }
           // }
           // return;
        //}
        if (result.wordCount == 0) {
           // console.debug("rowId in updateElementStyle:",rowId)
            let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);

            
           // current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
            if (h != null) {
                current = h.querySelector("span.panel-header__bubble");
                current = current.innerText
            }
            else {
                current = 'untranslated'
            }
        }
        // We do not need to style the record if it concerns the name label
        if (showName != true) {
            if (current != null) {
                SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
                if (SavelocalButton == null) {
                    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
                }
                // we need to update the button color and content/tooltip
                // 22-07-2021 PSS fix for wrong button text "Apply" #108 
                // moved the below code, and remove the duplicat of this code
                //console.debug("percentage:",result.percent)
                if (checkElem != null) {
                    if (result.percent == 100) {
                        checkElem.innerHTML = "100";
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "1593")
                        if (res != null) {
                            SavelocalButton = res.SavelocalButton
                            if (SavelocalButton != null) {
                                SavelocalButton.innerText = "Appr";
                            }
                        }
                        checkElem.style.backgroundColor = "green";
                        checkElem.title = "Save the string";
                        if (typeof headerElem != "undefined" && headerElem != null) {
                            if (panelTransDiv != null) {
                                panelTransDiv.style.backgroundColor = "green";
                            }
                            //headerElem.style.backgroundColor = "green";
                            // 20-02-2023 FIx for issue #286
                            let markdiv = document.querySelector("#editor-" + rowId + " .marker");
                            if (markdiv != null) {
                                markdiv.remove();
                            }
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
                        if (typeof headerElem != "undefined" && headerElem != null) {
                            panelTransDiv.style.backgroundColor = "yellow";
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
                        if (typeof headerElem != "undefined" && headerElem != null) {
                            panelTransDiv.style.backgroundColor = "orange";
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
                        if (typeof headerElem != "undefined" && headerElem != null) {
                            panelTransDiv.style.backgroundColor = "purple";
                        }
                    }
                    else if (result.percent < 33 && result.percent > 0) {
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
                        if (typeof headerElem != "undefined" && headerElem != null) {
                            panelTransDiv.style.backgroundColor = "darkorange";
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
                            if (typeof headerElem != "undefined" && headerElem != null) {
                                panelTransDiv.style.backgroundColor = "";
                                //headerElem.style.backgroundColor = "";
                            }
                        }
                        else {
                            // the string does contain glossary words that are not used!
                            checkElem.innerText = result.wordCount - result.foundCount;
                            checkElem.title = "Check the string";
                            checkElem.style.backgroundColor = "red";
                            let separator1 = document.createElement("div");
                            separator1.setAttribute("class", "checkElem_save");
                            checkElem.appendChild(separator1);
                            res = addCheckButton(rowId, checkElem, "1612")
                            SavelocalButton = res.SavelocalButton
                            if (current != "untranslated" && current != 'current') {
                                SavelocalButton.innerText = "Miss!";
                                //SavelocalButton.disabled = true;
                            }
                            else {
                                SavelocalButton.innerText = "Rej";
                            }
                            if (typeof headerElem != "undefined" && headerElem != null) {
                                panelTransDiv.style.backgroundColor = "red";
                            }
                        }
                    }
                    // newline = "\n";
                    missingverbs = "Missing glossary entry\n";
                    // We need to update the rowbutton
                   // await updateRowButton(current, SavelocalButton, checkElem, result.wordCount, result.foundCount, rowId, "2005");
                }
                else {
                    console.debug("checkelem is null!!!")
                }
            }
        }
        else {
            if (current != "untranslated") {
                checkElem.innerHTML = "100";
                separator1 = document.createElement("div");
                separator1.setAttribute("class", "checkElem_save");
                checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "1539")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.innerText = "Curr";
                checkElem.style.backgroundColor = "green";
                checkElem.title = "Current translation";
                if (typeof headerElem.style != "undefined") {
                    panelTransDiv.style.backgroundColor = "green";
                    //headerElem.style.backgroundColor = "green";
                    // 20-02-2023 FIx for issue #286
                    let markdiv = document.querySelector("#editor-" + rowId + " .marker");
                    if (markdiv != null) {
                        markdiv.remove();
                    }
                }
            }
        }

        // 11-08-2021 PSS added aditional code to prevent duplicate missing verbs in individual translation
        if ((result.toolTip).length > 0) {
            headerElem.title = "";
            headertitle = '';
            // 09-08-2021 PSS fix for issue #115 missing verbs are not shown within the translation
            if (typeof headerElem.title != "undefined") {
                headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                if ((result.toolTip).length > 0) {
                   // console.debug('missing verbs:', result.toolTip)
                    missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");
                    if (typeof missingVerbsButton != "undefined") {
                        missingVerbsButton.style.visibility = "visible"
                        missingVerbsButton.title= headertitle;
                    }
                }
                headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            }
            else {
                entrymissing = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button")
                if (entrymissing != null && typeof entrymissing != 'undefined') {
                    if ((result.toolTip == 0)){
                        entrymissing.style.visibility = "hidden";
                    }
                }
                newtitle = checkElem.title.concat(result.toolTip);
                headertitle = headerElem.title;
            }
        }
        else {
            if (checkElem != null) {
                newtitle = checkElem.title.concat(result.toolTip);
                headertitle = headerElem.title;
                if (typeof headerElem.style != "undefined") {
                    if (result.percent == 100) {
                        if (panelTransDiv != null) {
                            panelTransDiv.style.backgroundColor = "green";
                            // headerElem.style.backgroundColor = "green";
                        }
                    }
                }
            }
            else {
                newtitle = "noCeckElem"
                }
            if (document.getElementById("translate-" + rowId + "-translocal-entry-missing-button") != null) {
                document.getElementById("translate-" + rowId + "-translocal-entry-missing-button").style.visibility = "hidden";
            }
        }
        if ((result.toolTip).length > 0) {
            // no need to set the tooltip for a plugin/theme name
            if (showName != true) {
                checkElem.setAttribute("title", result.toolTip);
            }
        }
        // 13-08-2021 PSS added a notification line when it concerns a translation of a name for the theme/plugin/url/author																										  																																	
        if (showName == true) {
            showNameLabel(originalElem)											 
        }
        
        if (oldstring == "True") {
            
            // 22-06-2021 PSS added tekst for previous existing translations into the original element issue #89
            showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old,currstring,current,myHistory,my_checkpage,repl_array,prev_trans,old_status,rowId,"UpdateElementStyle");
        }
    }
    else {
        console.debug("no rowid!!")
    }
}

function showNameLabel(originalElem) {
    var namelabelexist;
    if (typeof originalElem != 'undefined') {
        namelabelexist = originalElem.querySelector(".trans_name_div");
        // do not add the label twice
        if (namelabelexist == null) {
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
}

function showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, current,myHistory,my_check,repl_array,prev_trans,old_status,rowId,called_from) {
    // 05-07-2021 this function is needed to set the flag back for noOldTrans at pageload
    // 22-06-2021 PSS added tekst for previous existing translations into the original element issue #89
    var old_current
    //console.debug("showOldstringLabel:", originalElem)
   // console.debug("called from:", called_from)
    if (old_status != null) {
        if (old_status.length != 0) {
            if (old_status[0].classList.contains("status-current")) {
                old_current = "current"
            }
        }
        else if (old_status.length == 0) {
            if (old_status.classList.contains("status-waiting")) {
                old_current = "waiting"
            }
            else if (old_status.classList.contains("status-fuzzy")) {
                old_current = "fuzzy"
            }
        }
    }
    else {
        old_current = 'untranslated'
    }
    var debug = false;
    if (debug == true) {
        console.debug("called from:", called_from)
        console.debug("current:", old_current)
        console.debug("old:", old_status)
    }
    if (originalElem != undefined) {
        // 19-09-2021 PSS fixed issue #141 duplicate label creation
        
            var labexist = originalElem.getElementsByClassName("trans_exists_div");
            if (labexist.length > 0) {
                labexist[0].parentNode.removeChild(labexist[0]);
            }
            let element1 = document.createElement("div");
            element1.setAttribute("class", "trans_exists_div");
          //  originalElem.appendChild(element1);
          // 
        let preview = document.querySelector(`#preview-${rowId}`)
        if (my_check != true) {
               originalElem.appendChild(element1);
               element1.appendChild(document.createTextNode("Existing string(s)! " + currcount + " " + wait + " " + rejec + " " + fuz + " " + old));
                currcount = currcount.replace("Current:", "");
                var diffexist = preview.querySelector("trans_original_div");
                //console.debug("trans_original:",diffexist)
                if (diffexist != null) {
                    diffexist.remove();
                }
            if ((+currcount) > 0 && current != 'current') {
                let element2 = document.createElement("div")
                element2.setAttribute("class", "div.trans_original_div");
               // element1.after(element2)
                let element3 = document.createElement("span");
                element3.setAttribute("class", "current-string");
                element3.appendChild(document.createTextNode(currstring));
                element2.appendChild(element3)
                element1.appendChild(element2)
                if (old_current != "current") {
                    console.debug("we do not have a current!:", old_current)
                }
            }
        }
            else {
             
                element1.appendChild(document.createTextNode("Current string is updated with verbs"));
                // this needs to be shown always if coming from checkpage
          //  if ((+currcount) > 0 || my_check== true) {
                let element2 = document.createElement("div")
                element2.setAttribute("class", "div.trans_original_div");
                element1.after(element2)
                let element3 = document.createElement("span");
                element3.setAttribute("class", "current-string");
                element3.appendChild(document.createTextNode(prev_trans));
                element2.appendChild(element3)
                markElements_previous(element3, repl_array, element3.innerText, [], repl_array, currstring);
                let element4 = document.createElement("div")             
                var diffType = "diffWords";
                var changes = JsDiff[diffType](prev_trans, currstring);
                fragment = document.createDocumentFragment();
                changes.forEach((part) => {
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
                element4.appendChild(fragment);
              //  element3.appendChild(element4)
                if (old_current != "current") {        
                    console.debug("we do not have a current!:",old_current)
                }
                else {
                    console.debug("we have a current!")
                }

          //  }
           // console.debug("we come from checkpage!!")
        }
    }
    else {
        console.debug("updateElementStyle empty!:", originalElem);
    }
}

function addCheckButton(rowId, checkElem, lineNo) {
    //console.debug("addCeckButton!", rowId, checkElem, lineNo)
    var currentcel = document.querySelector(`#preview-${rowId} td.priority`);
    // we came from translate entry, so there is not save button
        let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        if (SavelocalButton == null) {
            let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
        }
        if (currentcel != null) {
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
                 if (currentcel != null) {
                    SavelocalButton = document.createElement("button");
                    SavelocalButton.id = "tf-save-button";
                    SavelocalButton.className = "tf-save-button";
                    SavelocalButton.innerText = ("Empt");
                    SavelocalButton.onclick = savetranslateEntryClicked;
                    currentcel.appendChild(SavelocalButton);
                 }
               }
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
                //toastbox("info", "" , "600", "Saving suggestion", myWindow);
                let preview = document.querySelector(`#preview-${rowId}`);
                if (preview != null) {
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
                                // close_toast();
                            }
                        }
                    });
                }
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
                       //17-02-2023 PSS fix for issue #283
                       original = newText;
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
    if (wordCount == 0 && foundCount == 0 && translation != 'Empty') {
        percent = 100;
    }
    else if ((wordCount == 0 && foundCount == 0 && translation == 'Empty')) {
        percent = 0;
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
    var tbodyRowCount = 0;
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
                // if there is no table with results, then we do need to set the value to 0
                if (typeof table != 'undefined') {
                    let tr = table.rows;
                    tbodyRowCount = table.tBodies[0].rows.length;
                }
                else {
                    tbodyRowCount = 0;
                }
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

// this function waits until a defined element in a row is present
function waitForElementInRow(rowSelector, elementSelector, timeout = 5000) {
    //console.debug("timeout:",timeout,rowSelector,elementSelector)
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            const row = document.querySelector(rowSelector);
            const element = row ? row.querySelector(elementSelector) : null;
            if (element) {
                clearInterval(intervalId);
                resolve(element);
            }
            else {
               // console.debug("timeout:",timeout)
            }
            if (timeout <= 0) {
                clearInterval(intervalId);
                reject(new Error(`Timeout waiting for element with selector ${elementSelector} in row ${rowSelector}`));
            }
            timeout -= 100;
        }, 200);
    });
}

var stringToHTML = function (str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, "text/html");
    return doc;
};

// 11-06-2021 PSS added function to mark that existing translation is present
async function fetchOld(checkElem, result, url, single, originalElem, row, rowId, showName, current) {
    var mycurrent = current;
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
            .then(async data => {
                //05-11-2021 PSS added fix for issue #159 causing an error message after restarting the add-on
                currURL = window.location.href;
                // &historypage is added by GlotDict or WPGPT, so no extra parameter is necessary for now
                if (currURL.includes("&historypage") == false) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(data, "text/html");
                    //console.log("html:", doc);
                    var table = await doc.getElementById("translations");
                    if (table != null) {
                        let tr = table.rows;
                        let currstring = "";
                           const tbodyRowCount = table.tBodies[0].rows.length;
                           // 04-07-2021 PSS added counter to message for existing translations
                           let rejected = table.querySelectorAll("tr.preview.status-rejected");
                           let waiting = table.querySelectorAll("tr.preview.status-waiting");
                           let fuzzy = table.querySelectorAll("tr.preview.status-fuzzy");
                           let current = table.querySelectorAll("tr.preview.status-current");
                           let old = table.querySelectorAll("tr.preview.status-old");
                           if (typeof current != "null" && current.length != 0) {
                               currcount = " Current:" + current.length;
                               //console.debug("table:",table)
                               currstring = table.querySelector("tr.preview.status-current");
                               currstring = currstring.querySelector(".translation-text")
                               if (currstring.innerText == null) {
                                   currstring = "";
                               }
                               else {currstring = currstring.innerText }
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
                               updateElementStyle(checkElem, "", result, "True", originalElem, wait, rejec, fuz, old, rowId, showName, "", currcount,currstring,mycurrent,"",false,false,[],"",current);
                           }
                        else if (tbodyRowCount > 2 && single == "True") {
                               updateElementStyle(checkElem, "", result, "False", originalElem, wait, rejec, fuz, old, rowId, showName, "",currcount,currstring,mycurrent,"",false,false,[],"",current);
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
