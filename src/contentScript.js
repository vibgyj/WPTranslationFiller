//var glossary;
var db;
var jsstoreCon;
var myGlotDictStat;
var interCept = false;
var strictValidation = true
var StartObserver = true;
var LocRecCout
var autoCopyClipBoard;

adjustLayoutScreen();

// The below is necessary to get the focus into the editor if it is opened straight from the menu
window.onload = function () {
    var textarea = document.getElementsByClassName("textareas active")
   // console.debug("text at start", textarea)
    // if there is no texarea, then we do not want to set focus to it
    if (typeof textarea[0] != 'undefined') {
        mytextarea = textarea[0].firstChild.nextElementSibling
        //if (textarea.length > 0) {
        start_editor_mutation_server(textarea, "Details")
      //   const textarea = document.querySelector(`#translation_${rowId}_0`);
                // Ensure the textarea is visible and enabled
                mytextarea.style.display = 'block'; // Ensure it's visible
                mytextarea.style.visibility = 'visible'; // Ensure it's visible
                mytextarea.disabled = false; // Ensure it's enabled
                // Scroll to the textarea if necessary
                mytextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Focus on the textarea to make it active
                mytextarea.focus();

        // we double click to make focus active
       var clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: 0

        });
       mytextarea.dispatchEvent(clickEvent)
    }
}

// Function to send a message to the injected script
function sendMessageToInjectedScript(message) {
    window.postMessage(message, '*');
}

let event = "start"
const myCustomEvent = new CustomEvent('myCustomEvent', {
    detail: { message: 'This is a custom event!' }
});
loadGlossary(CustomEvent);
addTranslateButtons(event);


if (!window.indexedDB) {
    messageBox("error", "Your browser doesn't support IndexedDB!<br> You cannot use local storage!");
    console.log(`Your browser doesn't support IndexedDB`);
}
else {
    // PSS added jsStore to be able to store and retrieve default translations
    jsstoreCon = new JsStore.Connection();
    db = myOpenDB(db);
    
}

var translator; // Declare the global variable
var DefGlossary = true;
var RecCount = 0;
var showHistory;

// Use chrome.local.get to retrieve the value
if (typeof (Storage) !== "undefined") {
    interCept = localStorage.getItem("interXHR");
}
else {
    interCept = false;
    //console.debug("Cannot read localstorage, set intercept to false");
}

// Check if the value exists and is either "true" or "false"
if (interCept === null || (interCept !== "true" && interCept !== "false")) {
    // If the value is not present or not a valid boolean value, set it to false
    interCept = false;
    localStorage.setItem("interXHR", interCept);
}

sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });


chrome.storage.local.get('showHistory', async function (result) {
    showHistory = result.showHistory; // Assign the value to the global variable
}); 
chrome.storage.local.get('transsel', async function (result) {
    translator = result.transsel; // Assign the value to the global variable
});


chrome.storage.local.get('DefGlossary', async function (result) {
    DefGlossary = result.DefGlossary; // Assign the value to the global variable
});

chrome.storage.local.get('strictValidate', async function (result) {
    strictValidation = result.strictValidate; // Assign the value to the global variable
    // we get a sting so make it a boolean
    if (strictValidation == "true") {
        strictValidation = true
    }
    else {
        strictValidation = false
    }
});

chrome.storage.local.get('autoCopyClip', async function (result) {
    autoCopyClipBoard = result.autoCopyClip; // Assign the value to the global variable
    // we get a sting so make it a boolean
    if (autoCopyClipBoard == true) {
        autoCopyClipBoard = true
    }
    else {
        autoCopyClipBoard = false
    }
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
   // console.log(await getToonDiff('toonDiff'));
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
var showGlosLine;

gd_wait_table_alter();
addCheckBox();


var parrotActive;
const script = document.createElement('script');
script.src = chrome.runtime.getURL('wptf-inject.js');
(document.head || document.documentElement).prepend(script);


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
                    //console.debug("checking:",data.destlang,org_verb,wrong_verb)
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
        event.preventDefault();
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        chrome.storage.local.get(["bulkWait"], async function (data) {
            let bulkWait = data.bulkWait
            var myInterCept;
            var interCept;
            if (bulkWait != null && typeof bulkWait != 'undefined') {
                myInterCept = await localStorage.getItem('interXHR')
                //console.debug("startbulksave via eventlistener:", myInterCept)
                if (myInterCept === 'true') {
                    interCept = true
                }
                else {
                    interCept = false
                }
                //localStorage.setItem('interXHR', interCept); // Set this to true or false based on your condition
                // Set this based on your condition
                sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
                bulk_timer = bulkWait
                //console.debug("bulk_timer")
                bulkSave("false", bulk_timer);
            }
        });
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
      //  console.debug("F8")
        // Use chrome.local.get to retrieve the value
        interCept = localStorage.getItem("interXHR");

        // Check if the value exists and is either "true" or "false"
        if (interCept === null || (interCept !== "true" && interCept !== "false")) {
            // If the value is not present or not a valid boolean value, set it to false
            interCept = false;
            localStorage.setItem("interXHR", interCept);
        }
     //   console.debug("interXHR after F8:",interCept)
        if (interCept === "false") {
            toastbox("info", "Switching interceptXHR to on", "1200", "InterceptXHR");
            localStorage.setItem('interXHR', true);
            interCept = true
            sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
         //   console.debug("after:", localStorage.getItem(['interXHR']))
        }
        else {
            toastbox("info", "Switching interceptXHR to off", "1200", "InterceptXHR");
            localStorage.setItem('interXHR', false);
            interCept = false
            sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
           // console.debug("after:", localStorage.getItem(['interXHR']))
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
        //if (is_pte) {
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
        //}
       // else {
      //      messageBox("error", "You do not have permissions to start this function!");
      //  }
    }
});


//the below code can be removed if starting from non PTE is 100% working
//the  belowremoved
//let bulkbutton = document.getElementById("tf-bulk-button");
//if (bulkbutton != null){
 //   bulkbutton.addEventListener("click", (event) => {
 //       event.preventDefault();
 //       console.debug("I clicked bulksave")
 //       chrome.storage.local.get(["bulkWait"], async function (data) {
 //           let bulkWait = data.bulkWait
 //           var myInterCept;
 //           var interCept;
 //           if (bulkWait != null && typeof bulkWait != 'undefined') {    
  //              myInterCept = await localStorage.getItem('interXHR')
  //              console.debug("startbulksave via eventlistener:", myInterCept)
  //              if (myInterCept === 'true') {
  //                  interCept = true
  //              }
  //              else {
   //                 interCept = false
  //              }
                //localStorage.setItem('interXHR', interCept); // Set this to true or false based on your condition
                // Set this based on your condition
  //              sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
   //             bulk_timer = bulkWait
   //             console.debug("bulk_timer")
   //             bulkSave("false", bulk_timer);
   //         }
   //     });
  //  });
// }

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

var databaselink = document.createElement("li");
var b = document.createElement('a');
b.href = "#"
//b.target = "_self";
var link = document.createTextNode("WPTF database");
b.id = "openModalLink"
b.appendChild(link);
databaselink.className = 'menu-item wptf_database_menu'

//here we add the links into the divMenu
var divMenu = document.querySelector("#menu-headline-nav");
if (divMenu != null) {
    optionlink.appendChild(a)
    divMenu.appendChild(optionlink);
    databaselink.appendChild(b)
    divMenu.appendChild(databaselink);
}

// Example: Listen for clicks on a link to trigger opening the modal
document.addEventListener('click', function (event) {
    // Check if the clicked element is the link that should open the modal
    if (event.target.id =='openModalLink') {
        // Prevent the default action of the link
        event.preventDefault();
        // Create and open the modal
        createAndOpenModal();
    }
});

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
var localtransContainer = document.createElement("div")
localtransContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This function populates the table with translations from the local database"

var localtransButton = document.createElement("a");
localtransButton.href = "#";
localtransButton.className = "local-trans-button";
localtransButton.onclick = localTransClicked;
localtransButton.innerText = "Local";
localtransContainer.appendChild(localtransButton)
localtransContainer.appendChild(classToolTip)

//12-05-2022 PSS added a new button for local translate
var TmContainer = document.createElement("div")
TmContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button starts fetching existing translations from translation memory"
//let TM = localStorage.getItem(['switchTM']);
var tmtransButton = document.createElement("a");
tmtransButton.href = "#";

//if (TM == "false") {
    tmtransButton.className = "tm-trans-button";
//}
//else {
 //   tmtransButton.className = "tm-trans-button foreighn"
//}
tmtransButton.onclick = tmTransClicked;
chrome.storage.local.get('TMtreshold', function (result) {
    treshold = result.TMtreshold; // Assign the value to the global variable
    tmtransButton.innerText = "TM " + treshold+"%";
});
//tmtransButton.innerText = "TM " +treshold;
TmContainer.appendChild(tmtransButton)
TmContainer.appendChild(classToolTip)

//12-05-2022 PSS added a new button for local translate
var TmDisableContainer = document.createElement("div")
TmDisableContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button disables fetching existing translations from translation memory"

// Use chrome.local.get to retrieve the value
interCept = localStorage.getItem("interXHR");

// Check if the value exists and is either "true" or "false"
if (interCept === null || (interCept !== "true" && interCept !== "false")) {
    // If the value is not present or not a valid boolean value, set it to false
    interCept = false;
    localStorage.setItem("interXHR", interCept);
}

var tmDisableButton = document.createElement("a");
tmDisableButton.href = "#";
tmDisableButton.className = "tm-disable-button";
if (interCept === 'false') {
    tmDisableButton.style.background = "green"
    tmDisableButton.style.color = "white"
    sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
}
else {
    if (typeof interCept != 'undefined') {
        tmDisableButton.style.background = "red"
        tmDisableButton.style.color = "white"
        sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
    }
    else {
        interCept = false;
        localStorage.setItem("interXHR", interCept);
        sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
    }
}
tmDisableButton.onclick = tmDisableClicked;

tmDisableButton.innerText = "Disable machine";
TmDisableContainer.appendChild(tmDisableButton)
TmDisableContainer.appendChild(classToolTip)

//23-03-2021 PSS added a new button on first page
var checkContainer = document.createElement("div")
checkContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This function checks the page for missing verbs and if set starts spellchecking"

var checkButton = document.createElement("a");
checkButton.href = "#";
checkButton.className = "check_translation-button";
checkButton.onclick = checkPageClicked;
checkButton.innerText = "CheckPage";
checkContainer.appendChild(checkButton)
checkContainer.appendChild(classToolTip)

//23-03-2021 PSS added a new button on first page
var implocContainer = document.createElement("div")
implocContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button starts the import of a local po file containing translations into the current table"
var impLocButton = document.createElement("a");
impLocButton.href = "#";
impLocButton.className = "impLoc-button";
impLocButton.onclick = impFileClicked;
impLocButton.innerText = "Imp localfile";
implocContainer.appendChild(impLocButton)
implocContainer.appendChild(classToolTip)


//23-03-2021 PSS added a new button on first page
var implocDatabaseContainer = document.createElement("div")
implocDatabaseContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button converts po and inserts to local database"
var impDatabaseButton = document.createElement("a");
impDatabaseButton.href = "#";
impDatabaseButton.className = "convLoc-button";
impDatabaseButton.onclick = impLocDataseClicked;
impDatabaseButton.innerText = "Conv po DB";
implocDatabaseContainer.appendChild(impDatabaseButton)
implocDatabaseContainer.appendChild(classToolTip)

//23-03-2021 PSS added a new button on first page
var checkAllContainer = document.createElement("div")
checkAllContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button selects all records"
var checkAllButton = document.createElement("a");
checkAllButton.href = "#";
checkAllButton.className = "selectAll-button";
checkAllButton.onclick = setmyCheckBox;
checkAllButton.innerText = "Select all";
checkAllContainer.appendChild(checkAllButton)
checkAllContainer.appendChild(classToolTip)

//07-05-2021 PSS added a export button on first page
var exportContainer = document.createElement("div")
exportContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button starts the export of the local database"

var exportButton = document.createElement("a");
exportButton.href = "#";
exportButton.className = "export_translation-button";
exportButton.onclick = exportPageClicked;
exportButton.innerText = "Export";
exportContainer.appendChild(exportButton)
exportContainer.appendChild(classToolTip)

//07-05-2021 PSS added a import button on first page
var importContainer = document.createElement("div")
importContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className = 'tooltiptext'
classToolTip.innerText = "This button starts the import of a local file into the local database"
var importButton = document.createElement("a");
importButton.href = "#";
importButton.id = "ImportDb";
//importButton.type = "file";
//importButton.style="display: none";
importButton.className = "import_translation-button";
importButton.onclick = importPageClicked;
importButton.innerText = "Import";
importContainer.appendChild(importButton)
importContainer.appendChild(classToolTip)

var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
if (is_pte) {
    //07-05-2021 PSS added a bulksave button on first page
    var bulksaveContainer = document.createElement("div")
    bulksaveContainer.className = 'button-tooltip'
    var classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = "This is the function to save all suggestions selected in bulk"

    var bulksaveButton = document.createElement("a");
    bulksaveButton.href = "#";
    bulksaveButton.id = "BulkSave";
    bulksaveButton.className = "bulksave-button";
    bulksaveButton.onclick = startBulkSave;
    bulksaveButton.innerText = "Bulksave";
    bulksaveContainer.appendChild(bulksaveButton)
    bulksaveContainer.appendChild(classToolTip)
}

//07-05-2021 PSS added a bulk save for existing translations into the local database
var bulktolocContainer = document.createElement("div")
bulktolocContainer.className = 'button-tooltip'
var classToolTip = document.createElement("span")
classToolTip.className='tooltiptext'
classToolTip.innerText = "This is the function to populate the local database with selected items"

var bulktolocalButton = document.createElement("a");
bulktolocalButton.href = "#";
bulktolocalButton.id = "BulkSave";
bulktolocalButton.className = "save_tolocal-button";
bulktolocalButton.onclick = savetolocalClicked;
bulktolocalButton.innerText = "Bulk local";
bulktolocContainer.appendChild(bulktolocalButton)
bulktolocContainer.appendChild(classToolTip)
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
        divNavBar.appendChild(bulksaveContainer);
    }
    if (statsButton != null) {
        divNavBar.appendChild(statsButton);
    }
    if (!is_pte) {
        console.debug("we are not pte")
        divNavBar.appendChild(checkAllContainer);
    }
    divNavBar.appendChild(importContainer);
    divNavBar.appendChild(exportContainer);
   // divNavBar.appendChild(exportButton);
    divNavBar.appendChild(implocDatabaseContainer);
    divNavBar.appendChild(bulktolocContainer);
  //  divNavBar.appendChild(bulktolocalButton);
    divNavBar.appendChild(implocContainer);
   // divNavBar.appendChild(impLocButton);
   // divNavBar.appendChild(checkButton);
    divNavBar.appendChild(checkContainer);
   // divNavBar.appendChild(tmtransButton);
    divNavBar.appendChild(TmContainer);
    divNavBar.appendChild(localtransContainer);
    //divNavBar.appendChild(localtransButton);
    divNavBar.appendChild(translateButton);
}

//12-05-2022 PSS added a new buttons specials
var UpperCaseButton = document.createElement("a");
UpperCaseButton.href = "#";
UpperCaseButton.onclick = UpperCaseClicked;
UpperCaseButton.innerText = "Casing";

var SwitchGlossButton = document.createElement("a");
SwitchGlossButton.href = "#";
SwitchGlossButton.onclick = SwitchGlossClicked;
SwitchGlossButton.className = "Switch-Gloss-button";

chrome.storage.local.get("DefGlossary").then((res) => {
    if (res.DefGlossary == true) {
        SwitchGlossButton.innerText = "DefGlos";
        SwitchGlossButton.style.background = "green"
        SwitchGlossButton.style.color = "white"
    }
    else {
        SwitchGlossButton.innerText = "SecGlos";
        SwitchGlossButton.style.background = "orange"
    }
});

var SwitchTMButton = document.createElement("a");
SwitchTMButton.href = "#";
SwitchTMButton.className = "Switch-TM-button";
SwitchTMButton.onclick = SwitchTMClicked;
SwitchTMButton.innerText = "SwitchTM";
let TM = localStorage.getItem(['switchTM']);
if (TM == "true") {
    SwitchTMButton.style.background = "red"
    SwitchTMButton.style.color = "white"
}
else {
    SwitchTMButton.style.background = "green"
    SwitchTMButton.style.color = "white"
}

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

var DispClipboard = document.createElement("a");
DispClipboard.href = "#";
DispClipboard.className = "DispClipboard-button";
DispClipboard.onclick = DispClipboardClicked;
DispClipboard.innerText = "ClipBoard";
chrome.storage.local.get('autoCopyClip', async function (result) {
    if (result.autoCopyClip == true){
        DispClipboard.style.background = "red"
        DispClipboard.style.color = "white"
    }
    else{
        DispClipboard.style.background = "green"
        DispClipboard.style.color = "white"
    }
});



var DispCount = document.createElement("a");
DispCount.href = "#";
DispCount.className = "DispCount-button";

var WikiLink = document.createElement("a");
WikiLink.href = 'https://github.com/vibgyj/WPTranslationFiller/wiki'
WikiLink.innerText ="WPTF Docs"
WikiLink.className = 'menu-item-wptf_wiki'

// 12-05-2022 PSS here we add all buttons in the pagina together
var GpSpecials = document.querySelector("span.previous.disabled");
if (GpSpecials == null) {
    var GpSpecials = document.querySelector("a.previous");
}
if (GpSpecials != null && divProjects == null) {
    divPaging.insertBefore(WikiLink, divPaging.childNodes[0]);
    divPaging.insertBefore(UpperCaseButton, divPaging.childNodes[0]);
    divPaging.insertBefore(SwitchGlossButton, divPaging.childNodes[0]);
    divPaging.insertBefore(tmDisableButton, divPaging.childNodes[0]);
    divPaging.insertBefore(SwitchTMButton, divPaging.childNodes[0]);
    chrome.storage.local.get(["apikeyDeepl"], function (data) {
        //let apikey=data.apikeyDeepl
        if (data.apikeyDeepl != null && data.apikeyDeepl !="" && typeof data.apikeyDeepl != 'undefined') {
            divPaging.insertBefore(LoadGloss, divPaging.childNodes[0]);
            divPaging.insertBefore(DispGloss, divPaging.childNodes[0]);
            glossloaded = checkGlossary(LoadGloss)
        }
    });
    divPaging.insertBefore(DispClipboard, divPaging.childNodes[0]);
    UpperCase = localStorage.getItem(['switchUpper'])
    if (UpperCase == 'false') {
        UpperCaseButton.className = "UpperCase-button";
    }
    else {
        UpperCaseButton.className = "UpperCase-button uppercase"
    }
}

async function checkGlossary(event) {
    var glos_isloaded = await localStorage.getItem(['deeplGlossary']);
    if (glos_isloaded == null || glos_isloaded=="") {
        LoadGloss.className = "LoadGloss-button-red";
    } else {
        LoadGloss.className = "LoadGloss-button-green"
    }
}

function DispGlossClicked(event) {
    // function to show glossary
    chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
        var formal = checkFormal(false);
        var DeeplFree = data.DeeplFree;
        show_glossary(data.apikeyDeepl, DeeplFree, data.destlang)
    });
}

function DispClipboardClicked(event) {
    // function to show glossary
    chrome.storage.local.get('autoCopyClip', async function (result) {
    autoCopyClipBoard = result.autoCopyClip; // Assign the value to the global variable
    console.debug("result autoclip:",autoCopyClipBoard)
    // we get a sting so make it a boolean
    if (autoCopyClipBoard == true) {
        autoCopyClipBoard = false
        chrome.storage.local.set({
            autoCopyClip: autoCopyClipBoard
        });
        DispClipboard.style.background = "green"
        DispClipboard.style.color = "white"
        messageBox('info',"Auto copy to clipboard switched off")
    }
    else {
        autoCopyClipBoard = true
        chrome.storage.local.set({
            autoCopyClip: autoCopyClipBoard
        });
        DispClipboard.style.background = "red"
        messageBox('info',"Auto copy to clipboard switched on")
    }
});
}

function LoadGlossClicked(event) {
event.preventDefault(event);
var file;
var arrayFiles;
fileSelector.click();
fileSelector.addEventListener("change", (event) => {
    fileList = event.target.files;
    arrayFiles = Array.from(event.target.files)
    file = fileList[0];
    if (file.type == 'text/csv' || "application/vnd.ms-excel") {
        if (fileList[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var contents = e.target.result;
                var glossary = csvParser(contents)
                chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                    //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                    var formal = checkFormal(false);
                    var DeeplFree = data.DeeplFree;
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

function UpperCaseClicked(event) {
    event.preventDefault(event);
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

function SwitchGlossClicked(event) {
    event.preventDefault(event);
    chrome.storage.local.get("DefGlossary").then((res) => { 
        if (res.DefGlossary == true) {
        toastbox("info", "Switching Glossary to second", "1200", "Glossary switch");
        chrome.storage.local.set({ DefGlossary: false});
    }
    else {
        toastbox("info", "Switching Glossary to default", "1200", "Glossary switch");
        chrome.storage.local.set({ DefGlossary: true });
    }
    location.reload();
    }); 

}

function SwitchTMClicked(event) {
    event.preventDefault(event);
    int = localStorage.getItem(['switchTM']);
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

function tmDisableClicked(event) {
    event.preventDefault(event);
    // console.debug("F8")
    let interCept = localStorage.getItem(['interXHR']);
    if (interCept === "false") {
        toastbox("info", "Switching interceptXHR to on", "1200", "InterceptXHR");
        localStorage.setItem('interXHR', true);
        interCept = true
        sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
    }
    else {
        toastbox("info", "Switching interceptXHR to off", "1200", "InterceptXHR");
        localStorage.setItem('interXHR', false);
        interCept = false
        sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
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
    chrome.storage.local.get(["bulkWait"], async function (data) {
        let bulkWait = data.bulkWait
        var myInterCept;
        var interCept;
        if (bulkWait != null && typeof bulkWait != 'undefined') {
            // Use chrome.local.get to retrieve the value
            interCept = localStorage.getItem("interXHR");

            // Check if the value exists and is either "true" or "false"
            if (interCept === null || (interCept !== "true" && interCept !== "false")) {
                // If the value is not present or not a valid boolean value, set it to false
                interCept = false;
                localStorage.setItem("interXHR", interCept);
            }

            if (interCept === 'true') {
                interCept = true
            }
            else {
                interCept = false
            }
            //localStorage.setItem('interXHR', interCept); // Set this to true or false based on your condition
            // Example of setting interceptRequests from the content script
            // Set this based on your condition
            sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
            bulk_timer = bulkWait
            bulkSave("false", bulk_timer);
        }
    });

}

async function savetolocalClicked(event) {
    await bulkSaveToLocal();
}

// 12-05-2022 PSS addid this function to start translating from translation memory button
function tmTransClicked(event) {
    event.preventDefault();
    chrome.storage.local.get( 
        ["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree", "TMwait", "postTranslationReplace", "preTranslationReplace", "convertToLower", "spellCheckIgnore","TMtreshold"],
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
                        result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, TMwait, data.postTranslationReplace, data.preTranslationReplace, data.convertToLower,data.spellCheckIgnore,data.TMtreshold);
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



function impLocDataseClicked(event) {
    chrome.storage.local.get(
        ["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
        function (data) {
            var allrows = [];
            var myrows = [];
            var myFile;
            var pretrans;
            var transtype;
            toastbox("info", "Select file is started", "2000", "Select po file");
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
                            if (regel.startsWith("msgid") || regel.startsWith("msgstr") || regel.startsWith("msgctxt") || regel.startsWith("msgid_plural") || regel.startsWith("msgstr[0]") || regel.startsWith("msgstr[1]") || regel.startsWith("msgstr[2]") || regel.startsWith("msgstr[3]")) {
                                allrows.push(regel);
                            }
                        }
                        countimported = import_po_to_local(data.destlang, myFile, allrows);
                       
                    });
                    reader.readAsText(myFile);
                }
                else {
                    messageBox("info", "No file selected")
                }
                close_toast();
            };
            input.click();
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
                            }
                        }
                        countimported = new_import_po(data.destlang, myFile, allrows);
                        messageBox( info, "Records imported:" +countimported)
                        
                    });
                    reader.readAsText(myFile);
                }
                else {
                    messageBox("info", "No file selected")
                }
                close_toast();
            };
            input.click();
        }
    );
}

function translatePageClicked(event) {
    event.preventDefault();
    var formal;
    chrome.storage.local.get(
        ["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "OpenAIPrompt", "OpenAISelect", "OpenAItemp", "OpenAIWait", "OpenAITone", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore","ForceFormal"],
        function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined')
            {
                if (data.destlang != "undefined" && data.destlang != null && data.destlang !="") {
                    if (data.transsel != "undefined") {
                        //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                        if (data.ForceFormal != true) {
                            formal = checkFormal(false);
                        }
                        else {
                            formal = true;
                        }
                        convertToLow = data.convertToLower;
                        var DeeplFree = data.DeeplFree;
                        var openAIWait = Number(data.OpenAIWait);
                        var OpenAItemp = parseFloat(data.OpenAItemp);
                        var deeplGlossary = localStorage.getItem('deeplGlossary');
                        var OpenAITone = data.OpenAITone;
                        translatePage(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.apikeyOpenAI, data.OpenAIPrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, data.DeeplFree, translationComplete, data.OpenAISelect, openAIWait, OpenAItemp, data.spellCheckIgnore,deeplGlossary,OpenAITone);
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
    var local = localeString.split("/");
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
   formal = (!locString.includes("default"));  
   return formal
}


function checkPageClicked(event) {
    event.preventDefault();
    var formal = checkFormal(false);
    var timeout = 500; 
    //toastbox("info", "Checkpage is started wait for the result!!", "2000", "CheckPage");
    chrome.storage.local.get(
        ["apikey", "apikeyOpenAI", "destlang", "transsel", "postTranslationReplace", "preTranslationReplace", "LtKey", "LtUser", "LtLang", "LtFree", "Auto_spellcheck", "spellCheckIgnore", "OpenAIPrompt", "reviewPrompt", "Auto_review_OpenAI", "postTranslationReplace", "preTranslationReplace", "convertToLower", "showHistory", "showTransDiff"],
        function (data) { 
            const promise1 = new Promise(async function (resolve, reject) {
                await checkPage(data.postTranslationReplace, formal, data.destlang, data.apikeyOpenAI, data.OpenAIPrompt, data.spellcheckIgnore, data.showHistory, data.showTransDiff);
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


function loadGlossary(event) {
    //event.preventDefault()
    glossary = [];
    chrome.storage.local.get(["glossary", "glossaryA", "glossaryB", "glossaryC"
        , "glossaryD", "glossaryE", "glossaryF", "glossaryG", "glossaryH", "glossaryI"
        , "glossaryJ", "glossaryK", "glossaryL", "glossaryM", "glossaryN", "glossaryO"
        , "glossaryP", "glossaryQ", "glossaryR", "glossaryS", "glossaryT", "glossaryU"
        , "glossaryV", "glossaryW", "glossaryX", "glossaryY", "glossaryZ", "destlang"],
        function (data) {
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
            }
            else {
                messageBox("error", "Your default glossary is not loaded because no file is loaded!!");
                return;
            }
        }
    );

    glossary1 = [];
    chrome.storage.local.get(["glossary1", "glossary1A", "glossary1B", "glossary1C"
        , "glossary1D", "glossary1E", "glossary1F", "glossary1G", "glossary1H", "glossary1I"
        , "glossary1J", "glossary1K", "glossary1L", "glossary1M", "glossary1N", "glossary1O"
        , "glossary1P", "glossary1Q", "glossary1R", "glossary1S", "glossary1T", "glossary1U"
        , "glossary1V", "glossary1W", "glossary1X", "glossary1Y", "glossary1Z", "destlang"],
        function (data) {
            if (typeof data.glossary1 != "undefined") {
                loadSet1(glossary1, data.glossary1);
                loadSet1(glossary1, data.glossary1A);
                loadSet1(glossary1, data.glossary1B);
                loadSet1(glossary1, data.glossary1C);
                loadSet1(glossary1, data.glossary1D);
                loadSet1(glossary1, data.glossary1E);
                loadSet1(glossary1, data.glossary1F);
                loadSet1(glossary1, data.glossary1G);
                loadSet1(glossary1, data.glossary1H);
                loadSet1(glossary1, data.glossary1I);
                loadSet1(glossary1, data.glossary1J);
                loadSet1(glossary1, data.glossary1K);
                loadSet1(glossary1, data.glossary1L);
                loadSet1(glossary1, data.glossary1M);
                loadSet1(glossary1, data.glossary1N);
                loadSet1(glossary1, data.glossary1O);
                loadSet1(glossary1, data.glossary1P);
                loadSet1(glossary1, data.glossary1Q);
                loadSet1(glossary1, data.glossary1R);
                loadSet1(glossary1, data.glossary1S);
                loadSet1(glossary1, data.glossary1T);
                loadSet1(glossary1, data.glossary1U);
                loadSet1(glossary1, data.glossary1V);
                loadSet1(glossary1, data.glossary1W);
                loadSet1(glossary1, data.glossary1X);
                loadSet1(glossary1, data.glossary1Y);
                loadSet1(glossary1, data.glossary1Z);

                glossary1.sort(function (a, b) {
                    // to sort by descending order
                    return b.key.length - a.key.length;
                });

                if (glossary.length > 27) {
                    chrome.storage.local.get(["showHistory", 'destlang', 'showTransDiff', 'DefGlossary'], function (data, event) {
                        if (data.showHistory != "null") {
                            let locale = checkLocale();
                             validatePage(data.destlang, data.showHistory, locale, data.showTransDiff);
                            if (data.showHistory == true) {
                                // Get the current URL
                                const currentURL = window.location.href;
                                // Check if the URL contains "untranslated, and also check if we come from other location with untranslated
                                if (!currentURL.includes("untranslated") && !check_untranslated()) {
                                    validateOld(data.showTransDiff);
                                }
                            }
                        }
                    });
                }
                else {
                    messageBox("error", "Your default glossary is not loaded because no file is loaded!!");
                    return;
                }
            }
            else {
                messageBox("error", "Your second glossary is not loaded because no file is loaded!!");
                return;
            }
        }
    );
}
    
function loadSet(x, set) {
    glossary = glossary.concat(set);
}

function loadSet1(x, set) {
    glossary1 = glossary1.concat(set);
}

function addTranslateButtons() {
    //16 - 06 - 2021 PSS fixed this function addTranslateButtons to prevent double buttons issue #74
    // This function adds the buttons for the editor
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

            // Add checktranslate button
            let checkTranslateButton = createElementWithId("my-button", `translate-${rowId}-checktranslation-entry-my-button`);
            checkTranslateButton.href = "#";
            checkTranslateButton.className = "checktranslation-entry-my-button";
            checkTranslateButton.onclick = checktranslateEntryClicked;
            checkTranslateButton.innerText = "Check Translation";
            checkTranslateButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(checkTranslateButton, panelTransDiv.childNodes[0]);

            // Add lowercase button
            let LocalCaseButton = createElementWithId("my-button", `translate-${rowId}-localcase-entry-my-button`);
            LocalCaseButton.href = "#";
            LocalCaseButton.className = "localcase-entry-my-button";
            LocalCaseButton.onclick = LowerCaseClicked;
            LocalCaseButton.innerText = "LowerCase";
            LocalCaseButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(LocalCaseButton, panelTransDiv.childNodes[0]);

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

// Show the amount of records present within the local translation table
Show_RecCount();

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
    toastbox("info", "Import of: " + (counter-1) + " records is started wait for the result!!", "1500", "Import database");
    let importButton = document.querySelector("a.import_translation-button");
    importButton.innerText="Started"
    if (counter >1) {
        var arrayLength = csvData.length;
        for (var i = 0; i < arrayLength; i++) {
            if (i > 1) {
                importButton.innerText =  i;
                // Store it into the database
                //Prevent adding empty line
                if (csvData[i][0] != "") {
                    if (i == 250 || i == 500 || i == 750 || i == 1000 || i == 1250 || i == 1500 || i == 1750 || i == 2000 || i == 2250 || i == 2500 || i == 2750 || i == 3000 || i == 3250 || i == 3500 || i == 3750) {
                        toastbox("info", "Adding is running <br>Records added:"+i, "500", "Import database");
                    }
                    let cntry = checkLocale()
                    if (csvData[i][2] === cntry) {
                        res = await addTransDb(csvData[i][0], csvData[i][1], csvData[i][2]);
                    }
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
}
// 04-04-2021 PSS issue #24 added this function to fix the problem with no "translate button in single"
// 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
async function checkbuttonClick(event) {
   // event.preventDefault(event);
    var textareaElem;
    var translateButton;
    var editor;
    var OpenAIres;
    var result;
    var newres;
    var lires = '0';
    var rowId
    var myrec;
    var mytextarea;
    var textarea;
    var detail_preview;
    var detail_glossary;
    var pluralTextarea;
    //var DefGlossary=true;
    //console.debug("event",event)
    if (event != undefined) {
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        let action = event.target.textContent;
        // 30-06-2021 PSS added fetch status from local storage
        // Necessary to prevent showing old translation exist if started from link "Translation history"
        // 22-06-2021 PSS fixed issue #90 where the old translations were not shown if vladt WPGP Tool is activ
       // console.debug("activeElement:", document.activeElement)

        mytarget = event.target;
        // we do need to make sure that we are in the editor, not meta or discussion
        if (action == "Details" || action == "✓Details" ) {
            mytarget = event.target.parentElement.parentElement;
            // defensive programming
            if (mytarget != null) {
                rowId = mytarget.getAttribute("row");
            }
            glob_row = rowId;
            detailRow = rowId;
            if (rowId == null) {
                editor = await waitForMyElement(`.editor`, 100).then((res) => {
                    if (res != "Time-out reached") {
                        rowId = res.getAttribute("row")
                    }
                    else { console.debug("not found:",res)}
                });
            }

            // We need to expand the amount of columns otherwise the editor is to small due to the addition of the extra column
            // if the translator is a PTE then we do not need to do this, as there is already an extra column
            myrec = document.querySelector(`#editor-${rowId}`);
            detail_preview = document.querySelector(`#preview-${rowId}`);
            detail_glossary = detail_preview.querySelector(`.glossary-word`)
            if (detail_glossary != null) {
                detail_glossary = true
            }
            else {
                detail_glossary = false
            }
            if (myrec != null) {
                mytextarea = myrec.getElementsByClassName('foreign-text autosize')
               // console.debug("mytext:",mytextarea)
                textarea = mytextarea[0]
                // Ensure the textarea is visible and enabled
                textarea.style.display = 'block'; // Ensure it's visible
                textarea.style.visibility = 'visible'; // Ensure it's visible
                textarea.disabled = false; // Ensure it's enabled
                // Scroll to the textarea if necessary
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Focus on the textarea to make it active
                textarea.focus();

                // we need to select the second element in the form
                newRowId = rowId.split("-")[0] +"_1"
                //console.debug("newrowId:",newRowId)
                pluralTextarea = myrec.querySelector(`#translation_${newRowId}`);
                pluralpresent = myrec.querySelector(`.editor-panel__left .source-string__plural .original-raw`);
               
                if (pluralTextarea != null) {
                    if (detail_glossary) {
                        // This one is started to detect changes in plural
                       // let observer2 = new MutationObserver(MutationsPlural);
                      //  observer2.observe(pluralTextarea, { attributes: true, childList: true, subtree: true });
                        start_editor_mutation_server2(pluralTextarea, action)
                    }
                }
                
               
               if (autoCopyClipBoard) {
                        copyToClipBoard(detailRow)
                }
                if (StartObserver) {
                    if (detail_glossary) {
                        start_editor_mutation_server(mytextarea, action)
                    }
                    // PSS only within the editor we want to copy the original to clipboard is parameter is set
                }
            }
            await waitForMyElement(`.editor`, 200).then((res) => {
                if (res != "Time-out reached") {
                    textareaElem = document.querySelector(`#editor-${rowId} textarea.foreign-text`);
                }
                else { console.debug("editor not found:", res) }
           
              if (detail_glossary) {
                if (typeof textareaElem != "null") {
                    let myres = chrome.storage.local.get(['destlang'], async function (data, event) {
                        let locale = checkLocale();
                        let originalText = myrec.querySelector("span.original-raw").innerText;
                        if (textareaElem.textContent == "") {
                            translation = "Empty"
                        }
                        else {
                            translation = textareaElem.textContent
                        }
                        let leftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        result = await validateEntry(locale, textareaElem, "", "", rowId, locale, "", false);
                        //console.debug("validate entry in content line 2192", result)
                        mark_glossary(leftPanel, result.toolTip, textareaElem.textContent, rowId, false)
                        //console.debug("detailresult:",result)
                        
                        if (typeof result != 'undefined') {
                            let editorElem = document.querySelector("#editor-" + rowId + " .original");
                            //19-02-2023 PSS we do not add the marker twice, but update it if present
                            if (result.toolTip.length != 0) {
                               // mark_glossary(leftPanel, result.toolTip, textareaElem.textContent, rowId,false)
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
                                        markspan1.innerHTML = "<br>----- Missing glossary verbs are marked -----<br>"
                                        // markspan2.innerHTML = result.newText;
                                    }
                                    //else { console.debug("markerpresent found") }
                                }
                            }
                            else {
                               // console.debug("marking needs to be removed")
                            }
                        }
                        if (pluralpresent != null) {
                           // we do have a plural

                              result = await validate(locale, pluralpresent.textContent, pluralTextarea.textContent, locale, "", rowId, true);
                              //console.debug("validate contentscript line 2228 resultplural:", result)
                              // plural is record with "_1"
                              newRowId = rowId.split("-")[0] +"_1"
                              const textarea = myrec.querySelector(`#translation_${newRowId}`);
                              // Ensure the textarea is visible and enabled
                              textarea.style.display = 'block'; // Ensure it's visible
                              textarea.style.visibility = 'visible'; // Ensure it's visible
                              textarea.disabled = false; // Ensure it's enabled
                              // Scroll to the textarea if necessary
                              textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // Focus on the textarea to make it active
                              textarea.focus();
                              mark_glossary(leftPanel, result.toolTip, pluralpresent.textContent, rowId, true)
                        }
                    });
                }
                else {
                    //console.debug("In editor no text is present!")
                    //console.debug("type toolTip:",typeof toolTip)
                      toolTip = ""
                      mark_glossary(leftPanel, toolTip, textareaElem.textContent, rowId,false)
                }
              }
            });
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

                    // Add checktranslate button
                    let checkTranslateButton = createElementWithId("my-button", `translate-${rowId}-checktranslation-entry-my-button`);
                    checkTranslateButton.href = "#";
                    checkTranslateButton.className = "checktranslation-entry-my-button";
                    checkTranslateButton.onclick = checktranslateEntryClicked;
                    checkTranslateButton.innerText = "Check Translation";
                    checkTranslateButton.style.cursor = "pointer";
                    panelTransDiv.insertBefore(checkTranslateButton, panelTransDiv.childNodes[0]);

                    // Add lowercase button
                    let LocalCaseButton = createElementWithId("my-button", `translate-${rowId}-localcase-entry-my-button`);
                    LocalCaseButton.href = "#";
                    LocalCaseButton.className = "localcase-entry-my-button";
                    LocalCaseButton.onclick = LowerCaseClicked;
                    LocalCaseButton.innerText = "LowerCase";
                    LocalCaseButton.style.cursor = "pointer";
                    panelTransDiv.insertBefore(LocalCaseButton, panelTransDiv.childNodes[0]);

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
            //translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
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
                url = newurl + "?filters%5Bstatus%5D=mystat&filters%5Boriginal_id%5D=" + rowId + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=desc";
               // url = newurl + "?filters%5Bstatus%5D=mystat&filters%5Boriginal_id%5D=" + rowId;
                chrome.storage.local.get(["showTransDiff"], async function (data) {
                    if (data.showTransDiff != "null") {
                        if (data.showTransDiff == true) {
                            let res = await getToonDiff('toonDiff');
                            if (res == true) {
                                fetchOldRec(url, rowId,data.showTransDiff);
                            }
                        }
                    }
                });
            }

            editor = document.querySelector(`#editor-${rowId}`);
            newres = editor.querySelector(`#editor-${rowId} .suggestions__translation-memory.initialized .suggestions-list`);
            res = await waitForElementInRow(`#editor-${rowId}`, '.suggestions__translation-memory.initialized .suggestions-list', 400)
                .then(async (element) => {
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
                                //console.debug("We did not find a li with score 100:",liscore)
                            }
                        }
                    }
                    else {
                        liscore = '0';
                    }
                })
                .catch ((error) => {
                   liscore = '0';
                });

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
        }
        
    }
}

function translationComplete(original, translated) {
    if (original == translated) {
        //console.info("Identical");
    }
}

function checktranslateEntryClicked(event) {
    event.preventDefault(event);
    var formal;
    let rowId = event.target.id.split("-")[1];
    let myrowId = event.target.id.split("-")[2];
    //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
    // So that needs to be added to the base rowId to find it
    if (typeof myrowId != "undefined" && myrowId != "checktranslation") {
        newrowId = rowId.concat("-", myrowId);
        rowId = newrowId;
    }
    chrome.storage.local.get(["postTranslationReplace",  "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal"], function (data) {
        //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
        if (data.ForceFormal != true) {
            formal = checkFormal(false);
        }
        else {
            formal = true;
        }
        var DeeplFree = data.DeeplFree;
        var OpenAItemp = parseFloat(data.OpenAItemp);
        var deeplGlossary = localStorage.getItem('deeplGlossary');
        var OpenAITone = data.OpenAITone
        checkEntry(rowId, data.postTranslationReplace, formal, data.convertToLower,translationComplete, data.spellCheckIgnore);
    });
}

function LowerCaseClicked(event) {
    event.preventDefault(event);
    if (event != undefined) {
        chrome.storage.local.get(["spellCheckIgnore"], function (data) {
        let rowId = event.target.id.split("-")[1];
        // console.log("addtranslateEntry clicked rowId", rowId);
        let myrowId = event.target.id.split("-")[2];
        //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
        // So that needs to be added to the base rowId to find it
        if (myrowId !== undefined && myrowId != "localcase") {
            newrowId = rowId.concat("-", myrowId);
            rowId = newrowId;
        }
    setLowerCase(rowId,data.spellCheckIgnore)         
    });
    }
}

function translateEntryClicked(event) {
    event.preventDefault(event);
    var formal;
    let rowId = event.target.id.split("-")[1];
    let myrowId = event.target.id.split("-")[2];
    //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
    // So that needs to be added to the base rowId to find it
    if (typeof myrowId != "undefined" && myrowId != "translation") {
        newrowId = rowId.concat("-", myrowId);
        rowId = newrowId;
    }
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "OpenAIPrompt", "OpenAISelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore","ForceFormal"], function (data) {
            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
        if (data.ForceFormal != true) {
            formal = checkFormal(false);
        }
        else {
            formal = true;
        }
        var DeeplFree = data.DeeplFree;
        var OpenAItemp = parseFloat(data.OpenAItemp);
        var deeplGlossary = localStorage.getItem('deeplGlossary');
        var OpenAITone = data.OpenAITone
        translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.apikeyOpenAI, data.OpenAIPrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, DeeplFree, translationComplete, data.OpenAISelect, OpenAItemp, data.spellCheckIgnore, deeplGlossary,OpenAITone);
        });
}

async function updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status,showDiff) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var currcount=1;
    var current;
    var checkElem;
    var current;
    var SavelocalButton;
    var imgsrc;
    var currText='untranslated'
    var debug = false;
    var currText = 'untranslated'
    var single
   //console.debug("updateStyle rowId:",rowId)
    //console.debug("updateStyle1:",showHistory,myHistory,my_checkpage,currstring)
    imgsrc = chrome.runtime.getURL('/');
    imgsrc = imgsrc.substring(0, imgsrc.lastIndexOf('/'));
    current = document.querySelector("#editor-" + rowId + " div.editor-panel__left div.panel-header span.panel-header__bubble");
    if (typeof rowId == "undefined") {
        let myRow = textareaElem.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("row");
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
        console.debug("updateStyle1:",showHistory,myHistory,my_checkpage,currstring)
        console.debug("updatestyle prev:", prev_trans)
        console.debug("updatestyle curr:", currstring, rowId)
        console.debug("ShowHistory:",showHistory)
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
            let res = await addCheckButton(rowId, checkElem,"1978")
            SavelocalButton = res.SavelocalButton;
        }
    }
    else {
        if (SavelocalButton == null) {
            let res = await addCheckButton(rowId, checkElem,"1984")
            SavelocalButton = res.SavelocalButton
        }
    }
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    let row = rowId.split("-")[0];
    if (currText != 'untranslated') {
       // console.debug("in updateStyle:",result)
        // this one is orange
        updateElementStyle(checkElem, headerElem, result, showHistory, originalElem, "", "", "", "", rowId, showName, nameDiff, currcount, currstring, currText, record, myHistory, my_checkpage, repl_array, prev_trans,old_status,showDiff);
    }
    
    row = rowId.split("-")[0];
    
    // 12-06-2021 PSS do not fetch old if within the translation
    // 01-07-2021 fixed a problem causing an undefined error
    // 05-07-2021 PSS prevent with toggle in settings to show label for existing strings #96
    if (showHistory == true) {
            single = "True";
        if (newurl.substring(1, 9) != "undefined") {
            single = "False";
        }
        // 31-01-2023 PSS fetchold should not be performed on untranslated lines issue #278
    //    if (current.innerText != 'untranslated') {
        //    let waiting = 5000
        //    setTimeout(async function () {
               await  fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId,showName,current.innerText,prev_trans,currcount,showDiff);
        //    }, waiting);
      //  }
    }
}

async function validateEntry(language, textareaElem, newurl, showHistory, rowId, locale, record, showDiff) {
    // 22-06-2021 PSS fixed a problem that was caused by not passing the url issue #91
    var translation;
    var result = [];
    var original_preview;
    var raw;
    var originalText;
    var preview_raw;
    var hasGlossary;
    var span_glossary;
    var toolTip=""
    if (textareaElem != null) {
        translation = textareaElem.value;
    }
    else {
        translation = ""
    }
    if (translation == "") {
        translation = "Empty"
    }
    preview_raw = document.querySelector(`#preview-${rowId}`)
    if (preview_raw != null) {
        hasGlossary = preview_raw.querySelector('.glossary-word')

        if (hasGlossary != null) {
            hasGlossary = true;
        }
        else {
            hasGlossary = false;
        }
    }
    else {
        hasGlossary = false;
    }
   let leftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`)
    //remove_all_gloss(leftPanel)
    if (hasGlossary==true) {
        original_preview = preview_raw.querySelector(`#preview-${rowId} .original-text`)
        if (original_preview == null) {
            original_preview = document.querySelector(`#preview-${rowId} .original`)
        }
        raw = document.querySelector(`#editor-${rowId}`)
        if (raw != null) {
            originalRaw = raw.querySelector("span.original-raw");
            originalNew = raw.querySelector("span.original")
        }
        if (typeof textareaElem == 'object') {
            if (textareaElem.length == 0) {
                wordCount = 0;
                foundCount = 0;
                percent = 0;
               // toolTip = []
                newText = "";
            }
            else {
                originalText = originalRaw.textContent;
                if (hasGlossary) {
                    //We have a glossary word
                    result = await validate(language, originalText, translation, locale, "", rowId, false);
                    //console.debug("validate in content line 2691",result)
                    if (result.percent == 100) {
                        missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");
                        missingVerbsButton.style.visibility = "hidden"

                        if (raw != null) {
                            raw = originalNew.innerHTML
                        }
                    }
                    else {
                        if (result.toolTip.length > 0) {
                            // This when no translation is present
                            let leftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`)
                            //result = await validate(language, originalText, translation, locale, "", rowId, false);
                            //console.debug("validate in content line 2705", result)
                            mark_glossary(leftPanel, result.toolTip, translation, rowId,false)
                        }
                    }
                }
                
            }
            //textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status
            old_status = document.querySelector("#preview-" + rowId);
            updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId, record, false, false, translation, [], translation, record, old_status, showDiff);
            //}
        }
        else {
            wordCount = 0;
            foundCount = 0;
            if (textareaElem.innerText != 'No suggestions' && textareaElem.innerText.length != 0) {
                percent = 100;
                toolTip = ""
            }
            else {
                percent = 0
            }
            toolTip = ""
            newText = "";
            result = { wordCount, foundCount, percent, toolTip, newText }
            old_status = document.querySelector("#preview-" + rowId);
            updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId, record, false, false, translation, [], translation, record, old_status, showDiff);
        }
    }
    else {
        //We dont have a glossary in validateEntry
        wordCount = 0;
        foundCount = 0;
        if (textareaElem.innerText != 'No suggestions' && textareaElem.innerText.length !=0) {
            percent = 100;  
        }
        else {
            percent = 0
        }
        toolTip = ""
        newText = "";
        result = { wordCount, foundCount, percent, toolTip,newText }

        old_status = document.querySelector("#preview-" + rowId);
        updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId, record, false, false, translation, [], translation, record, old_status, showDiff);

    }
    return result;
}

function remove_all_gloss(myleftPanel, isPlural) {
    var spansArray
    if (typeof myleftPanel != 'undefined') {
        //console.debug("isPlural:",isPlural)
        singlepresent = myleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
        pluralpresent = myleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
        spansSingular = singlepresent.getElementsByClassName("glossary-word")
        
        if (isPlural == true) {
            //console.debug("we remove a plural")
            spansPlural = pluralpresent.getElementsByClassName("glossary-word")
            spansArray = Array.from(spansPlural)
        }
        else {
            //console.debug("we remove a single")
            spansArray = Array.from(spansSingular)
        }

       // console.debug("remove_all length:",spansArray.length)
        for (let i = 0; i < spansArray.length; i++) {
            console.debug()
            spansArray[i].classList.remove('highlight');
        }
    }
    else {
        console.debug("myleftPanel = undefined")
    }
}

function highlightExactWordInText(text, word) {
    //console.debug("text:",text,word)
    const regex = new RegExp(`\\b${word}\\b`, 'g'); // Exact match with word boundaries
    
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    return { found: count > 0, count };
}

function findMissingOccurrenceIndex(englishSentence, dutchSentence) {
    // Function to tokenize sentences into words with their original indexes
    const tokenizeWithIndexes = (sentence) => {
        const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
        return words.map((word, index) => ({ word, index }));
    };

    // Tokenize both sentences
    const englishWordsWithIndexes = tokenizeWithIndexes(englishSentence);
    const dutchWords = tokenizeWithIndexes(dutchSentence).map(({ word }) => word);

    // Create a map of word occurrences with their indexes for English
    const englishWordOccurrences = englishWordsWithIndexes.reduce((map, { word, index }) => {
        if (!map[word]) {
            map[word] = [];
        }
        map[word].push(index);
        return map;
    }, {});

    // Track missing occurrences
    const missingOccurrences = [];
    const usedIndexes = new Set();

    // Compare English words with Dutch words
    for (const [word, indexes] of Object.entries(englishWordOccurrences)) {
        let remainingIndexes = [...indexes];
        dutchWords.forEach(dutchWord => {
            if (word === dutchWord && remainingIndexes.length) {
                remainingIndexes.shift(); // Remove the first occurrence
            }
        });
        missingOccurrences.push(...remainingIndexes);
    }

    return missingOccurrences;
}


async function mark_glossary_old(myleftPanel, toolTip, translation, rowId, isPlural) {
    var foundarray = []
    var mytranslation = translation
    var markleftPanel;
    var spansArray;
    if ( toolTip != '') {
        var toolTipArray = toolTip.split("\n")
    }
    else {
        toolTipArray =[]
    }
    var debug = false;
    if (debug == true) {
        console.debug("ToolTip array:", toolTipArray);
        console.debug("myleftPanel:", myleftPanel)
        console.debug("in mark row:", rowId)
        console.debug("in mark row translation:", mytranslation)
     }
    if (typeof myleftPanel != 'undefined') {
        markleftPanel = myleftPanel
    }
    else {
        markleftPanel = await document.querySelector(`#editor-${rowId} .editor-panel`)
    }
    if (markleftPanel != null) {
        singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
        singularText = singlepresent.getElementsByClassName('original')[0]
        spansSingular = singlepresent.getElementsByClassName("glossary-word")
        //console.debug("single:", singularText.textContent)
        if (isPlural == true) {
            //console.debug("we mark a plural")
            pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
            spansPlural = pluralpresent.getElementsByClassName("glossary-word")
            var spansArray = Array.from(spansPlural)
        }
        else {
            var spansArray = Array.from(spansSingular)
        }
      //  console.debug('mark toolTip:',toolTip)
        // we need to remove all existing highlights before setting the new ones
        // do not remove this, is it will leave marking behind
        await remove_all_gloss(markleftPanel,isPlural)
        for (let i = 0; i < (toolTipArray.length - 1); i++) {
            let line_toolTip = toolTipArray[i]
            let words = line_toolTip.split('-')
            // we need to convert the textContext to lowercase otherwise find is not working
            let wordToFind = words[0].toLowerCase()
            wordToFind = wordToFind.trim()
            // we need to convert the textContext to lowercase otherwise find is not working
           // let spantext= span.innerText.toLowerCase()
            foundarray = await spansArray.filter(span => span.innerText.toLowerCase().includes(wordToFind))
           // console.debug("mark gevonden array van spans:",foundarray)
            if (typeof foundarray != 'undefined') {
                if (foundarray.length > 0) {
                    for (let i = 0; i < foundarray.length; i++) {
                        if (foundarray[i].innerText != "") {
                            let arraytext = (foundarray[i].innerText).toLowerCase()

                           // console.debug("mark arraytext:",arraytext.split(' '))
                            glossaryTranslation = words[1].trim()
                            //console.debug("mark glossary translation:",glossaryTranslation)
                            // as we removed the existing highlight first, we only have to mark the current glossary words
                            // The toolTip list only contains missing glossary words!
                            // console.debug("translation:",mytranslation)
                            if (glossaryTranslation != "") {
                                lowertranslation = translation.toLowerCase()
                                //console.debug("checkurl:", CheckUrl(lowertranslation, glossaryTranslation.toLowerCase()),glossaryTranslation)
                                if (!CheckUrl(lowertranslation, glossaryTranslation.toLowerCase())) {
                                    // !!! this might need improvement as the glossary can contains capitals
                                    // let searchTerm = thisresult[0]

                                    //console.debug("search:",searchTerm)
                                    // console.debug("translation:",lowertranslation)
                                    let words = lowertranslation.split(/[\s.,!?]+/)
                                    let orgwords = translation.split(/[\s.,!?]+/)
                                    //console.debug("words:",words)
                                    //console.debug("glossaryTranslation:",glossaryTranslation)
                                    //We do not want to mark a span that contains a glossaryword that has more then one translated word
                                    
                                   // console.debug("arraytext.split", arraytext.split(" ").length,arraytext)
                                    if (arraytext.split(" ").length == 1) {
                                        //console.debug("lengte is 1")
                                        if (words.some(word => word === glossaryTranslation)) {
                                           // console.debug("glossary translation:", glossaryTranslation)
                                            let rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), arraytext);
                                            //console.debug("result highlight:", rresult)
                                            if (rresult.found == true) {
                                                foundarray[i].classList.add('highlight')
                                            }
                                        }
                                        else if (orgwords.some(word => word === glossaryTranslation)) {
                                            //else if (!mytranslation.includes(glossaryTranslation)) {
                                            let rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), arraytext);
                                           // console.debug("result highlight:", rresult)
                                            if (rresult.found == true) {
                                                foundarray[i].classList.add('highlight')
                                            }
                                        }
                                        else {
                                            
                                           // console.debug("foundarray[1]:",foundarray[i])
                                            let rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), arraytext);
                                           // console.debug("result highlight:", rresult)
                                            if (rresult.found == true) {
                                                foundarray[i].classList.add('highlight')
                                            }
                                            
                                        }
                                    }
                                    else {
                                        //console.debug("mark we seem to have a glossary translation with multiple words:",arraytext)
                                        let rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), arraytext);
                                        //console.debug("mark result highlight:", rresult)
                                        //console.debug("mark search in translation:",glossaryTranslation)
                                        let transresult = highlightExactWordInText(translation.toLowerCase(), glossaryTranslation);
                                        console.debug("mark result trans:", transresult)
                                        const missingOccurrences = findMissingOccurrenceIndex(singularText.textContent.toLowerCase(), translation.toLowerCase());
                                        //if (rresult.foundCount != transresult.foundCount) {
                                            //console.log("Missing occurrence indexes:", missingOccurrences);
                                            if (transresult.found == false) {
                                                foundarray[i].classList.add('highlight')
                                            }
                                      //  }
                                        
                                        //if (!lowertranslation.includes(glossaryTranslation && glossaryTranslation.split(" ").length ==1)) {
                                        //    console.debug("glossary:", glossaryTranslation)
                                         //   foundarray[i].classList.add('highlight')
                                        //}
                                    }
                                }
                            }
                        }
                   }}
            }
        }
    }
    else {
        console.debug("No mark_leftPanel")
    }
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
                                          
async function updateElementStyle(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff,currcount,currstring,current,record,myHistory,my_checkpage,repl_array,prev_trans,old_status,showDiff) {												   	  
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
    var button_name = "Empty";
    var debug = false;
    if (debug == true) {
        console.debug("updateElementStyle curr:", currstring)
        console.debug("updateElementStyle prev:", prev_trans)
        console.debug("updateElementStyle currcount:", currcount)
    }
    if (typeof rowId != "undefined") {
        
        //let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
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
        missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");
        //console.debug("concat:",rowId,"newline:",newline,"tooltip:",typeof result.toolTip,"missingverbs:",typeof missingverbs,typeof headerElem.title)
        //headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
        if (typeof result.toolTip !="undefined" && typeof missingverbs !="undefined" && typeof headerElem !="undefined"){
           headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
           newtitle = checkElem.title.concat(missingverbs).concat(result.toolTip);
        }
        else{
            result.toolTip=""
            missingverbs=""
        
        }
        if (missingVerbsButton != null) {
            missingVerbsButton.title = headertitle;
        }
        
        if (result.wordCount == 0) {
            let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            if (h != null) {
                current = h.querySelector("span.panel-header__bubble");
                current = current.innerText
            }
            else {
                current = 'untranslated'
            }
        }
        if (current == 'current') {
            button_name = 'Save'
        }
        else if (current == 'waiting') {
            button_name = 'Appr'
        }
        else if (current == 'fuzzy') {
            button_name = 'Rej'
        }
        else if (current =='transFill') {
            button_name = 'Save'
        }
        else {button_name == 'Undef!!'}
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
               // console.debug("result.percentage:",result.percent)
                if (checkElem != null) {
                    if (result.percent == 100) {
                        checkElem.innerHTML = "100";
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "2211")
                        if (res != null) {
                            SavelocalButton = res.SavelocalButton
                            if (SavelocalButton != null) {
                                SavelocalButton.innerText = button_name;
                            }
                        }
                        checkElem.style.backgroundColor = "green";
                        checkElem.title = "Save the string";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                       // span_glossary = myleftPanel.querySelector(".glossary-word")
                        remove_all_gloss(myleftPanel)
                        if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
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
                    else if (result.percent >= 66) {
                        newtitle = checkElem.title;
                        checkElem.innerHTML = '<span style="color:black">66</span>';
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "1547")
                        SavelocalButton = res.SavelocalButton
                        SavelocalButton.innerText = button_name;
                        checkElem.style.backgroundColor = "yellow";
                        checkElem.title = "Save the string";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        //span_glossary = myleftPanel.querySelector(".glossary-word")
                        //remove_all_gloss(myleftPanel)
                        //mark_glossary(myleftPanel, result.toolTip, currstring, rowId,false)
                        if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
                            panelTransDiv.style.backgroundColor = "yellow";
                            missingVerbsButton.style.visibility = "visible";
                        }
                    }
                    else if (result.percent >= 33 && result.percent <66) {
                        newtitle = checkElem.title;
                        checkElem.innerHTML = "33";
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "1561")
                        SavelocalButton = res.SavelocalButton
                        SavelocalButton.innerText = button_name;
                        checkElem.title = "Save the string";
                        checkElem.style.backgroundColor = "orange";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        //remove_all_gloss(myleftPanel)
                       // mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                        if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
                            panelTransDiv.style.backgroundColor = "orange";
                            missingVerbsButton.style.visibility = "visible";
                        }
                    }
                    else if (result.percent == 10) {
                        checkElem.innerHTML = "Mod";
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "2264")
                        SavelocalButton = res.SavelocalButton
                        SavelocalButton.disabled = false;
                        SavelocalButton.innerText = button_name;
                        SavelocalButton.onclick = savetranslateEntryClicked;
                        checkElem.style.backgroundColor = "purple";
                        checkElem.title = "Save the string";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                       // span_glossary = myleftPanel.querySelector(".glossary-word")
                       // remove_all_gloss(myleftPanel)
                       // mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                        if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
                            panelTransDiv.style.backgroundColor = "purple";
                            missingVerbsButton.style.visibility = "visible";
                        }
                    }
                    else if (result.percent < 33 && result.percent > 0) {
                        newtitle = checkElem.title;
                        checkElem.innerHTML = result.percent;
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "3051")
                        SavelocalButton = res.SavelocalButton
                        SavelocalButton.innerText = button_name;
                        checkElem.title = "Check the string";
                        checkElem.style.backgroundColor = "darkorange";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        //span_glossary = myleftPanel.querySelector(".glossary-word")
                        //remove_all_gloss(myleftPanel)
                       // mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                        if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
                            panelTransDiv.style.backgroundColor = "darkorange";
                            missingVerbsButton.style.visibility = "visible";
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
                            myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                           // span_glossary = myleftPanel.querySelector(".glossary-word")
                            //remove_all_gloss(myleftPanel)
                            //mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                            if (result.wordCount > 0) {
                                checkElem.title = "Do not save the string";
                                SavelocalButton.innerText = "Miss!";
                                if (currstring == "No suggestions") {
                                    SavelocalButton.innerText = "Block!";
                                    SavelocalButton.disabled = true;
                                }
                            }
                            else {
                                if (currstring != "No suggestions") {
                                    checkElem.title = "Save the string";
                                    SavelocalButton.innerText = "NoGlos";
                                }
                                else {
                                    //We found an error!!!
                                    checkElem.title = "Do not save the string";
                                    SavelocalButton.innerText = "Block";
                                    checkElem.style.backgroundColor = "red";
                                    res = addCheckButton(rowId, checkElem, "3024")
                                    SavelocalButton = res.SavelocalButton
                                    SavelocalButton.disabled = true;
                                }
                            }
                            if (typeof headerElem != "undefined" && headerElem != null) {
                                panelTransDiv.style.backgroundColor = "";
                            }
                        }
                        else {
                            // the string does contain glossary words that are not used!
                            //console.debug("result when glossary words are not used:",result)
                            checkElem.innerText = result.wordCount - result.foundCount;
                            checkElem.title = "Check the string";
                            checkElem.style.backgroundColor = "red";
                            let separator1 = document.createElement("div");
                            separator1.setAttribute("class", "checkElem_save");
                            checkElem.appendChild(separator1);
                            res = addCheckButton(rowId, checkElem, "3024")
                            SavelocalButton = res.SavelocalButton
                            myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                           // span_glossary = myleftPanel.querySelector(".glossary-word")
                           // remove_all_gloss(myleftPanel)
                           // mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)

                            if (current != "untranslated" && current != 'current') {
                                SavelocalButton.innerText = "Miss!";
                                if (currstring == "No suggestions") {
                                    SavelocalButton.innerText = "Block!";
                                    SavelocalButton.disabled = true;
                                }
                            }
                            else {
                                SavelocalButton.innerText = "Rej";
                            }
                            if (typeof headerElem != "undefined" && headerElem != null) {
                                if (panelTransDiv != null) {
                                // TESTEN!!!! by first line
                                    panelTransDiv.style.backgroundColor = "red";
                                    if (missingVerbsButton != null) {
                                        missingVerbsButton.style.visibility = "visible"
                                        missingVerbsButton.title= headertitle;
                                    }
                                }
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
        myToolTip = result.toolTip.length;

        if ((typeof result != 'undefined') &&  myToolTip.length > 0) {
            headerElem.title = "";
            headertitle = '';
            // 09-08-2021 PSS fix for issue #115 missing verbs are not shown within the translation
            if (typeof headerElem.title != "undefined") {
                headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                if ((result.toolTip).length > 0) {
                   // missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");
                    if (missingVerbsButton != null) {
                        missingVerbsButton.style.visibility = "visible"
                        missingVerbsButton.title= headertitle;
                    }
                }
               // headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
               // newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            }
            else {
                entrymissing = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button")
                if (entrymissing != null && typeof entrymissing != 'undefined') {
                    if ((result.toolTip == 0)){
                        //entrymissing.style.visibility = "hidden";
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
                newtitle = "noCheckElem"
                }
        }
        if ( result.toolTip.length > 0) {
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
           showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old,currstring,current,myHistory,my_checkpage,repl_array,prev_trans,old_status,rowId,"UpdateElementStyle",showDiff);
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

function showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, current,myHistory,my_check,repl_array,prev_trans,old_status,rowId,called_from,showDiff) {
    // 05-07-2021 this function is needed to set the flag back for noOldTrans at pageload
    // 22-06-2021 PSS added tekst for previous existing translations into the original element issue #89
    var old_current;
    var wait_trans;
    var waittrans_text;
    var diff;
    //console.debug("showOldstringLabel:", originalElem)
   // console.debug("called from:", called_from)
   // console.debug("old_status showOldString:",old_status, typeof old_status)
    if (old_status != null && typeof old_status != 'undefined') {
        if (old_status.length != 0) {
            if (old_status.classList.contains("status-current")) {
                old_current = "current"
            }
        }
        else if (old_status.length == 0 && typeof old_status.classList != 'undefined') {
            if (old_status.classList.contains("status-waiting")) {
                old_current = "waiting"
            }
            else if (old_status.classList.contains("status-fuzzy")) {
                old_current = "fuzzy"
            }
        }
        else {
            old_current = 'untranslated'
        }
    }
    else {
        old_current = 'untranslated'
    }
   
    var debug = false;
    if (debug == true) {
        console.debug("called from:", called_from)
        console.debug("current:", old_current)
        console.debug("old:", old_status) // is opject string containing the actual status
        console.debug("current:", current);
        console.debug("currstring:", currstring)
        console.debug("prev_trans:", prev_trans)
        console.debug("showDiff:",showDiff)
       
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
                if (diffexist != null) {
                    diffexist.remove();
                }
            if ((+currcount) > 0 && current != 'current') {
                if (typeof prev_trans == 'object') {
                    if (prev_trans.classList.contains("status-waiting")) {
                       // console.debug("We do have a waiting!")
                    }
                    wait_trans = prev_trans.getElementsByClassName('translation-text')
                    waittrans_text = wait_trans[0].innerText
                    const result = waittrans_text === currstring
                    if (result) {
                        console.debug('The strings are similar.');
                    } else {
                        diffType = "diffWords"
                        if (showDiff == true) {
                            let element2 = document.createElement("div")
                            element2.setAttribute("class", "div.trans_original_div");
                            // element1.after(element2)
                            let element3 = document.createElement("span");
                            element3.setAttribute("class", "current-string");
                            element3.appendChild(document.createTextNode(currstring));
                            element2.appendChild(element3)
                            element1.appendChild(element2)
                            if (current == 'waiting' && typeof current != 'undefined') {
                                diff = JsDiff[diffType](currstring, waittrans_text);
                            }
                            else {
                                diff = JsDiff[diffType](waittrans_text, currstring);
                              
                                
                            }
                            fragment = document.createDocumentFragment();
                            diff.forEach((part) => {
                                // green for additions, red for deletions
                                // dark grey for common parts
                                const color = part.added ? "#006400" :
                                    part.removed ? "red" : "white";
                                const background_color = part.added ? "white" :
                                    part.removed ? "white" : "grey";
                                span = document.createElement("span");
                                span.className = 'show_dif_in_original'
                                span.style.color = color;
                                span.style.backgroundColor = background_color;
                                span.style.font.size = '12px';
                                span.appendChild(document
                                    .createTextNode(part.value));
                                fragment.appendChild(span);
                                span.part.value.fontWeight = '900'
                            });
                           element1.appendChild(fragment);
                        }
                    }
                }
                else if (typeof prev_trans == 'string') {
                    if (result) {
                        console.debug('The strings are similar.');
                    } else {
                       // console.debug('The strings are not similar.');
                        if (typeof prev_trans == 'object') {
                            //console.debug(" we have an object instead of string")
                            prev_trans = prev_trans.getElementsByClassName('translation foreign-text')
                            prev_trans = prev_trans[0].innerText
                           // console.debug("prev_trans text:", prev_trans)
                        }
                        else {
                          //  console.debug("we do not have an object!:", prev_trans)
                        }
                        if (typeof current == 'object') {

                        }
                        if (showDiff == true) {
                            diffType = "diffWords"
                            //console.debug("we are comparing current with previous",)           
                            //const diff = JsDiff[diffType](prev_trans, currstring);
                            diff = JsDiff[diffType](currstring, prev_trans);
                            fragment = document.createDocumentFragment();
                            diff.forEach((part) => {
                                // green for additions, red for deletions
                                // dark grey for common parts
                                const color = part.added ? "#006400" :
                                    part.removed ? "red" : "white";
                                const background_color = part.added ? "grey" :
                                    part.removed ? "white" : "grey";
                                span = document.createElement("span");
                                span.className = 'show_dif_in_original'
                                span.style.color = color;
                                span.style.backgroundColor = background_color;
                                span.style.font.size = '12px';
                                span.appendChild(document
                                    .createTextNode(part.value));
                                fragment.appendChild(span);
                                span.part.value.fontWeight = '900'
                            });
                            let element2 = document.createElement("div")
                            element2.setAttribute("class", "div.trans_original_div");
                            element2.appendChild(fragment);
                            element1.appendChild(element2)
                        }
                    }
                }
                if (old_current != "current") {
                    //console.debug("we do not have a current!:", old_current)
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
            if (showDiff == true) {
                var diffType = "diffWords";
                //console.debug("We are somewhere else")
                diff = JsDiff[diffType](currstring, prev_trans);
                //var changes = JsDiff[diffType](prev_trans, currstring);
                fragment = document.createDocumentFragment();
                diff.forEach((part) => {
                    // green for additions, red for deletions
                    // dark grey for common parts
                    const color = part.added ? "#006400" :
                        part.removed ? "red" : "white";
                    const background_color = part.added ? "grey" :
                        part.removed ? "white" : "grey";
                    span = document.createElement("span");
                    span.style.color = color;
                    span.style.backgroundColor = background_color;
                    span.appendChild(document
                        .createTextNode(part.value));
                    fragment.appendChild(span);
                    });
                  //  element4.appendChild(fragment);
                }
                if (old_current != "current") {        
                    //console.debug("we do not have a current!:",old_current)
                }
                else {
                    //console.debug("we have a current!")
                }
        }
    }
    else {
        //console.debug("updateElementStyle empty!:", originalElem);
    }
    return currstring;
}

function addCheckButton(rowId, checkElem, lineNo) {
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
    var autoCopySwitchedOff = false;

    event.preventDefault(event);
    myrow = event.target.parentElement.parentElement;
    rowId = myrow.attributes.row.value;
    //chrome.storage.local.get(["bulkWait"], function (data) {
     //   let bulkWait = data.bulkWait
     //   if (bulkWait != null && typeof bulkWait != 'undefined') {
     //       bulk_timer = bulkWait
     //   }
      //  else {
      //      bulk_timer = 1500;
      //  }
    var bulk_timer = 200
    // Determine status of record
    let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = h.querySelector("span.panel-header__bubble");
    var current_rec = document.querySelector(`#preview-${rowId}`);
    // we take care that we can save the record by opening the editor save the record and close the editor again
    if (current.innerText != "Empty" && current.innerText != "untranslated") {
        if (current.innerText == "transFill") {
            let open_editor = document.querySelector(`#preview-${rowId} td.actions .edit`);
            let glotpress_save = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);
            select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
            var status = select.querySelector("dt").nextElementSibling;
            status.innerText = "waiting"
            // 24-03-2022 PSS modified the saving of a record because the toast was sometimes remaining on screen issue #197
            setTimeout(() => {
                if (autoCopyClipBoard) {
                    autoCopySwitchedOff = true
                    autoCopyClipBoard = false
                }
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
                        let dismiss = document.querySelector('.gp-js-message-dismiss')
                        if (dismiss != null) {
                       // if (confirm == '.gp-js-message-dismiss') {
                          //  if (typeof confirm === 'function') {
                           // confirm.click();
                            dismiss.click()
                               // close_toast();
                           // }
                        }
                    });
                }
                if (autoCopySwitchedOff) {
                    autoCopyClipBoard = true
                    autoCopySwitchedOff =false
                }
                
            }, bulk_timer);
           // timeout += bulk_timer;
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
                glotpress_suggest.click();
            }
            status.innerText = "current";
            current.innerText = "current";
            // we need to close the editor as we do not need it
            glotpress_close.click();
            prevrow = document.querySelector(`#preview-${rowId}.preview.status-waiting`);
            prevrow.style.backgroundColor = "#b5e1b9";
        }
        else if (current.innerText == "fuzzy") {
            let glotpress_open = document.querySelector(`#preview-${rowId} td.actions .edit`);
            let glotpress_reject = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .reject`);
            let glotpress_close = document.querySelector(`#editor-${rowId} div.editor-panel__left .panel-header-actions__cancel`);
            glotpress_open.click();
            glotpress_reject.click();
            glotpress_close.click();
            prevrow = document.querySelector(`#preview-${rowId}.preview.status-fuzzy`);
            prevrow.className = "preview status-rejected priority-normal no-warnings has-translations"
           // prevrow.style.backgroundColor = "#eb9090";
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
  //  });
}

function countExactWordOccurrences(text, word) {
    // Create a regular expression to match the exact word
    // \b asserts a word boundary, ensuring we match only whole words
    const regex = new RegExp(`\\b${word}\\b`, 'g');

    // Use the match method to find all matches
    const matches = text.match(regex);

    // Return the number of matches or 0 if no matches were found
    return matches ? matches.length : 0;
}

//---------

// Function to normalize text
function normalizeText(text) {
    text = text.replace(/[^\w\s%]|_/g, ' ').trim();
    text = text.replace(/\s+/g, ' ');
    return text.toLowerCase(); // Ensure case-insensitive matching
}

// Function to find missing translations
function findMissingTranslations(spans, dutchText) {
    var normalizedText = normalizeText(dutchText);
    var wordFoundMap = {};
    var textCopy = normalizedText; // Copy of the text to avoid modifying the original
    //console.debug("textCopy:", textCopy);

    spans.forEach(({ word, glossIndex }) => {
        let wordsToCheck = Array.isArray(word) ? word : [word];
        let found = false;
        wordsToCheck.forEach((singleWord) => {
            //console.debug("search for:", singleWord);
            if (!found) {
                var normalizedWord = normalizeText(singleWord);  // Normalize the glossary word
                var regex = new RegExp(`\\b${escapeRegExp(normalizedWord)}\\b`, "g");
                let match;
                while ((match = regex.exec(textCopy)) !== null) {
                    found = true;
                    // Remove the found word from the text to avoid overlap
                    textCopy = textCopy.slice(0, match.index) + textCopy.slice(match.index + match[0].length);
                    break; // Stop searching after the first match for this word
                }
                // If not found in case-sensitive search, attempt a case-insensitive search
                if (!found) {
                    //console.debug("Attempting case-insensitive search");
                    regex = new RegExp(`\\b${escapeRegExp(normalizedWord)}\\b`, "gi"); // 'i' for case-insensitivity
                    while ((match = regex.exec(textCopy)) !== null) {
                        found = true;
                        // Remove the found word from the text to avoid overlap
                        textCopy = textCopy.slice(0, match.index) + textCopy.slice(match.index + match[0].length);
                        break; // Stop searching after the first match for this word
                    }
                }
            }
        });
        wordFoundMap[glossIndex] = found;
        //console.log(`Found word "${Array.isArray(word) ? word.join(', ') : word}" with gloss-index ${glossIndex}: ${wordFoundMap[glossIndex]}`);
    });

    //console.log('Word found map:', wordFoundMap);
    var missingTranslations = [];
    spans.forEach(({ word, glossIndex }) => {
        if (!wordFoundMap[glossIndex]) {
            missingTranslations.push({ word, glossIndex });
        }
    });
    return missingTranslations;
}

// Helper function to normalize the text by removing unwanted characters and converting to lowercase
function normalizeText(text) {
    text = text.replace(/[^\w\s%]|_/g, ' ').trim();
    text = text.replace(/\s+/g, ' ');
    return text.toLowerCase(); // Ensure case-insensitive matching
}

// Helper function to escape special characters in the regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// Function to escape special characters in regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

//-------------
function createGlossArray(spansArray,map) {
    var glossaryWord = []
    //console.debug("map:",map)
    for (spancnt = 0; spancnt < (spansArray.length); spancnt++) {
        glossText = spansArray[spancnt]
        glossText = glossText.textContent
        wordToFind = glossText.toLowerCase()
        thisresult = findByKey(map, wordToFind)
        //thisresult = findByKey(map, glossText)
        //console.debug("thisresult after find in map",thisresult)
       // console.debug("found in array:", thisresult[0], spancnt)
        if (thisresult != null) {
            glossaryWord.push({
                word: thisresult,
                glossIndex: spancnt
            });
        }
        else {
            glossaryWord.push({
                word: wordToFind,
                glossIndex: spancnt
            });
        }
    }
    //console.debug("glossaryword:",glossaryWord)
    return glossaryWord
}

function createNewGlossArray (gloss){

// Convert glossary object to array of [key, value] pairs and sort by key
const sortedGlossArray = Object.values(gloss)
    .map(entry => [entry.key, entry.value]) // Create [key, value] pairs
    .sort((a, b) => a[0].localeCompare(b[0])); // Sort alphabetically by key
//console.debug("sorted:",sortedGlossArray)
// Create a Map from the sorted array
const sortedGlossMap = new Map(sortedGlossArray);
//console.debug("mapped:",sortedGlossMap)
//console.log("Sorted Glossary Map:");
//sortedGlossMap.forEach((value, key) => {
 //   console.debug(`${key}: ${value}`);
//});
return sortedGlossMap
}

async function mark_glossary(myleftPanel, toolTip, translation, rowId, isPlural) {
    //console.debug("translation",translation)
    //console.debug('Caller:', getCallerFunctionName());
    var missingTranslations =[];
    if (translation != "") {
        if (DefGlossary == true) {
            myglossary = glossary
        }
        else {
            myglossary = glossary1
        }
        newGloss = createNewGlossArray (myglossary)
       // myGlossArray = Array.from(myglossary)
        //map = new Map(myGlossArray.map(obj => [obj.key, obj.value]))
        
        let markleftPanel = myleftPanel
        //let markleftPanel = document.querySelector(`#editor-${rowId} .editor-panel`)
        //console.debug("leftpanel:",markleftPanel,rowId)
        if (markleftPanel != null) {
            singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
            singularText = singlepresent.getElementsByClassName('original')[0]
            // we do not need to collect info for plural if it is not a plural
            if (isPlural == true){
               pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
               pluralText= pluralpresent.getElementsByClassName('original')[0]
               if (pluralpresent != null) {
                spansPlural = pluralpresent.getElementsByClassName("glossary-word")
               }
            }    
            if (singlepresent != null){
               spansSingular = singlepresent.getElementsByClassName("glossary-word")
            }
            
            if (isPlural == true) {
                spans = spansPlural
            }
            else {
                spans = spansSingular
            }
            if (spans.length > 0) {
                // console.debug("houston we have a glossary")
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
                if (isPlural == false){
                    remove_all_gloss(markleftPanel,false)
                    missingTranslations =[];
                   // Run the function
                   missingTranslations = await findMissingTranslations(glossWords, dutchText);
              
                   // Output the result
                   if (missingTranslations.length > 0) {
                          //console.debug("single missing:",missingTranslations)
                          //console.debug("single translation:",dutchText)
                          missingTranslations.forEach(({word, glossIndex }) => {
                                spansArray[glossIndex].classList.add('highlight')
                                // console.log(`Missing translation for word: "${Array.isArray(word) ? word.join(', ') : word}" with gloss-index: ${glossIndex}`);
                          });
                   } 
                   else {
                         remove_all_gloss(markleftPanel,false)
                         //console.log("plural All glossary words are translated.");
                    }
                }
         
                if (isPlural == true) {
                       remove_all_gloss(markleftPanel,true)
                      // console.debug("it is a plural")
                      // console.debug("pluralText:",pluralText)
                      // console.debug("plural translation:",dutchText)
                      // console.debug("spansPlural:",spansArray)

                       missingTranslations =[];
                      // Run the function
                      missingTranslations = await findMissingTranslations(glossWords, dutchText);
                      //console.debug(missingTranslations)
                      if (missingTranslations.length > 0) {
                         //console.debug("missing:",missingTranslations)
                         missingTranslations.forEach(({word, glossIndex }) => {
                              //onsole.debug(`Missing translation for word: "${word}" with gloss-index: ${glossIndex}`);
                              //nsole.debug("span with missing translation:",spansArray[glossIndex])
                             spansArray[glossIndex].classList.add('highlight')
                         });
                      } 
                      else {
                            remove_all_gloss(markleftPanel,true)
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

function validate(language, original, translation, locale, showDiff,rowId,isPlural) {
    var count = 0;
    var wordCount = 0;
    var wordsCount = 0;
    var foundCount = 0;
    var myfoundCount = 0
    let percent = 0;
    var toolTip = "";
    var isFound = false;
    var map;
    var thisresult;
    var searchTerm;
    var NewsearchTerm;
    var spansPlural;
    var spansSingular;
    var debug = false;
    var lowertranslation;
    var isFound = false
    var spancnt = 0;
    var rresult = 0;
    var transresult = 0;
   // console.debug('Caller:', getCallerDetails());
    if (debug == true) {
        console.debug("original:", original)
        console.debug("translation:",translation)
    }
    if (DefGlossary == true) {
        myglossary = glossary
    }
    else {
        myglossary = glossary1
    }
    myGlossArray = Array.from(myglossary)
    map = new Map(myGlossArray.map(obj => [obj.key, obj.value]))
    
    //if (glossary_word.length != 0) {
    let markleftPanel = document.querySelector(`#editor-${rowId} .editor-panel`)
    //console.debug("leftpanel:",markleftPanel,rowId)
    newText = ""
    if (markleftPanel != null) {
        pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
        singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
        singularText = singlepresent.getElementsByClassName('original')[0]

        if (pluralpresent !=null){
               //console.debug("plural text:",pluralpresent.innerText.trim())
               spansPlural = pluralpresent.getElementsByClassName("glossary-word")
        }
        spansSingular = singlepresent.getElementsByClassName("glossary-word")
        //console.debug("spans singular:",spansSingular)
        if (isPlural == true) {
            spans = spansPlural
        }
        else {
             spans= spansSingular
        }
        if (spans.length > 0) {
           // console.debug("houston we have a glossary")
            //console.debug("spans:", spansSingular)
             wordCount = spans.length
            //console.debug("span length:", spans.length)
            var spansArray = Array.from(spans)
            for (spancnt = 0; spancnt < (spansArray.length); spancnt++) {
                   // console.debug("loop through glossary links:",)                      
                    myfoundCount=0
                    thisresult =""
                    wordToFind = spansArray[spancnt].textContent
                    wordToFind = wordToFind.toLowerCase()
                    thisresult = findByKey(map, wordToFind)
                    //console.debug("thisresult after find in map",thisresult,wordToFind)
                    if (thisresult != null && typeof thisresult !='undefined') {
                        searchTerm = thisresult[0]
                        const word = searchTerm;
                        translation = translation.replace(/[;!?,.()<>"/]/g, ' ')
                      //  console.debug("validate translation:",translation)
                        lowertranslation = translation.toLowerCase()
                        count = countExactWordOccurrences(original.toLowerCase(), wordToFind)

                        //console.log(`The word "${wordToFind}" appears ${count} times.`);
                        wordsCount = wordToFind.trim().split(/[\s:]+/).filter(Boolean).length;
                        //console.debug("wordcount result:", wordsCount, wordToFind,count)
                        if (thisresult.length == 1) {
                            // if we only have one existense of the original, we have only one translation
                            if (count == 1) {
                                if (wordsCount == 1) {
                                    // we need to remove all chars that do not belong to the single word
                                    let words = lowertranslation.split(/[\s.,!?&:]+/)
                                    let orgwords = translation.split(/[\s.,!?&:]+/)

                                    if (words.some(word => word === searchTerm)) {
                                        // if (translation.toLowerCase().includes(thisresult[0])) {
                                       // console.debug("we found glossary in translation:", searchTerm, spancnt)
                                        foundCount += 1
                                        // no break here otherwise the list of glossaries is not comleted
                                    }
                                    else if (orgwords.some(word => word === searchTerm)) {
                                        foundCount += 1
                                        // no break here otherwise the list of glossaries is not comleted
                                    }
                                    else if (lowertranslation.includes(" " + searchTerm + " ")) {
                                        // this might be necessary to find words between ''
                                      //  console.debug("this is wrong:", searchTerm)
                                        foundCount += 1
                                    }
                                    else if (lowertranslation.includes(" " + searchTerm)) {
                                        if (strictValidation == false) {
                                           foundCount += 1
                                            //console.debug('We found combined word')
                                       }
                                    }
                                    else if (lowertranslation.includes(searchTerm + " ")) {
                                        if (strictValidation == false) {
                                            foundCount += 1
                                            //console.debug('We found combined word')
                                        }
                                    }
                                    else if (lowertranslation.includes(searchTerm)) {
                                        foundCount += 1
                                        //console.debug('We found combined word')
                                    }
                                    else if (!lowertranslation.includes(" " + searchTerm + " ")) {
                                        lowertranslation = lowertranslation.replace(/['"/]/g, ' ')
                                        if (lowertranslation.includes(" " + searchTerm + " ")) {
                                            foundCount += 1
                                        }
                                        else {
                                           // console.debug("translation does not contain glossaryword:", searchTerm, thisresult)
                                            toolTip += wordToFind + " - " + searchTerm + "\n"
                                        }
                                    }
                                   
                                }
                                else {
                                   // console.debug("multi we found a glossary word with two words:", wordToFind)
                                    searchTerm = thisresult[0]
                                   // console.debug("multi searchTerm:", searchTerm)
                                    translation = translation.replace(/[;!?&,.()<>"/]/g, ' ')
                                    lowertranslation = translation.toLowerCase()
                                    rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), wordToFind);
                                  //  console.debug("multi result original:", rresult.found, rresult.count)
                                    transresult = highlightExactWordInText(translation.toLowerCase(), searchTerm);
                                  //  console.debug("multi result trans:", transresult.found, transresult.count)
                                    //console.debug("multi diff:", rresult.count - transresult.count)
                                    //if (lowertranslation.includes(searchTerm)) {
                                    if (rresult.count == transresult.count) {
                                       // console.debug("multi we found glossary in translation:", searchTerm)
                                        foundCount += 1
                                    }
                                    else if (rresult.count - transresult.count != 0) {
                                        // Sometimes we have a glossary entry starting with capital, so we need to check it again
                                        transresult = highlightExactWordInText(translation.toLowerCase(), searchTerm.toLowerCase());
                                        if (transresult.count == 0){
                                          //  console.debug("multi we do have a difference")
                                          toolTip += wordToFind + " - " + "check translation" + "\n"
                                         // console.debug("multi toolTip after find:",toolTip)
                                        }
                                        else {
                                            foundCount +=1
                                        }
                                    }
                                    else if (transresult.found == false) {
                                        toolTip += wordToFind + " - " + "check translation" + "\n"
                                    }
                                    else {console.debug("multi something is wrong here!")}
                                }

                            } // count is more than one
                            else {
                                //console.debug("word is more than one time present!!: ",wordToFind)
                                const word = searchTerm;
                                translation = translation.replace(/[;!?,.()<>"/]/g, ' ')
                                lowertranslation = translation.toLowerCase()
                                // wordToFind = original word!!
                               // console.debug("word:", wordToFind)
                                wordsCount = wordToFind.trim().split(/[\s:]+/).filter(Boolean).length;
                                //console.debug("wordlength original:", wordsCount)
                                rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), wordToFind);
                                //console.debug("multi result original highlight:", rresult.found, rresult.count)
                                transresult = highlightExactWordInText(translation.toLowerCase(), searchTerm);
                                const multicount = countExactWordOccurrences(lowertranslation, searchTerm);
                                //console.debug("multi searchTerm found in translation:",rresult.count, transresult,multicount,wordToFind,searchTerm)
                                if (wordsCount == 1 && multicount == 1) {
                                    let words = lowertranslation.split(/[\s.,!?&:]+/)
                                    let orgtranswords = translation.split(/[\s.,!?:&]+/)
                                    // console.debug("validat multi:",words,"searchTerm:",searchTerm)
                                    if (words.some(word => word === searchTerm)) {
                                        //  console.debug("we found glossary in translation:", searchTerm, i)
                                        foundCount += 1
                                        // no break here otherwise the list of glossaries is not comleted
                                    }
                                    else if (orgtranswords.some(word => word === searchTerm)) {
                                        foundCount += 1
                                        // no break here otherwise the list of glossaries is not comleted
                                    }
                                    else if (lowertranslation.includes(" " + searchTerm)) {
                                         if (strictValidation == false) {
                                            foundCount += 1
                                           // console.debug('We found combined word')
                                        }
                                    }
                                    else if (lowertranslation.includes(searchTerm + " ")) {
                                        if (strictValidation == false) {
                                            foundCount += 1
                                            console.debug('We found combined word')
                                        }
                                    }
                                    else {
                                        lowertranslation = lowertranslation.replace(/['",/]/g, ' ')
                                        //     console.debug("lower:", lowertranslation, '"' + searchTerm + '"')
                                        if (lowertranslation.includes(" " + searchTerm + " ")) {
                                            // this might be necessary to find words between ''
                                            //   console.debug("this is wrong:", searchTerm)
                                            foundCount += 1
                                        }
                                        else {
                                            //console.debug("translation does not contain glossaryword:", searchTerm, wordToFind)
                                            toolTip += wordToFind + " - " + searchTerm + "\n"
                                        }
                                    }
                                   // if (multicount < count) {
                                    //    console.debug("houston we have found it", searchTerm,wordToFind)
                                    //    foundCount -= 1
                                     //   toolTip += wordToFind + " - " + searchTerm + "\n"
                                   // }
                                    //console.debug("foundCount + myfoundCount + count:", foundCount, myfoundCount, count, toolTip)
                                }
                                else {
                                  //  console.debug("multi with more then one :",searchTerm,wordToFind)
                                    rresult = highlightExactWordInText(singularText.textContent.toLowerCase(), wordToFind.toLowerCase());
                                    transresult = highlightExactWordInText(translation.toLowerCase(), searchTerm);
                                   // console.debug("multi more then one:", rresult.count, transresult.count, wordToFind, searchTerm)
                                   // console.debug("resultaat:",rresult.count === transresult.count)
                                    if (transresult.found == true && (rresult.count == transresult.count) == true) {
                                       // console.debug("multi we found:", searchTerm)
                                        foundCount += 1
                                    }
                                    else if (transresult.found == false){
                                        // check for exact compare e.g no convert to lowercase
                                        let transresult = highlightExactWordInText(translation, searchTerm);
                                        if (transresult.found == true) {
                                            // if there are more then one then we need to make sure they all match
                                            if (transresult.count == rresult.count) {
                                                foundCount += 1
                                            }
                                            else {
                                               // console.debug("we did not catch it!!!")
                                                toolTip += wordToFind + " - " + searchTerm + "\n"
                                            }
                                        }
                                        else {
                                            // not the same to mark them
                                            toolTip += wordToFind + " - " + searchTerm + "\n"
                                        }

                                    }
                                    else if (transresult.found == true && rresult.count - transresult.count < 0) {
                                        foundCount += 1
                                        //console.debug("We found more then in original:",searchTerm)
                                     //   if (!(toolTip.hasOwnProperty("`${wordToFind}`"))) {
                                      //      toolTip += `${wordToFind} - ${searchTerm}\n`;
                                      //  }

                                       // toolTip += wordToFind + " - " + searchTerm + "\n"
                                    }
                                    else if (transresult.found == true && rresult.count - transresult.count > 0 && transresult.count < rresult.count) {
                                        foundCount += 1
                                        //console.debug("We found less then in original:", searchTerm)
                                        //   if (!(toolTip.hasOwnProperty("`${wordToFind}`"))) {
                                        //      toolTip += `${wordToFind} - ${searchTerm}\n`;
                                        //  }

                                        // toolTip += wordToFind + " - " + searchTerm + "\n"
                                    }
                                    else if (lowertranslation.includes(" " + searchTerm)) {
                                        if (strictValidation == false) {
                                            foundCount += 1
                                           // console.debug('We found combined word')
                                        }
                                    }
                                    else if (lowertranslation.includes(searchTerm + " ")) {
                                        if (strictValidation == false) {
                                            foundCount += 1
                                           // console.debug('We found combined word')
                                        }
                                    }
                                   
                                  //  else if (translation.includes(searchTerm)) {
                                  //      myfoundCount += 1
                                     //   console.debug("translation does contain:", searchTerm, wordToFind)
                                       
                                  //  }
                                 //   else if (!translation.includes(searchTerm)) {
                                        //myfoundCount += 1
                                  //      console.debug("translation does not contain glossaryword:", searchTerm, wordToFind)
                                  //      toolTip += wordToFind + " - " + searchTerm + "\n"
                                  //  }
                                   // console.debug("myfoundCount:",myfoundCount)
                                }
                            }
                                
                            //console.debug("translation + foundCount + count:",searchTerm, foundCount, count, toolTip)
                        }
                        else if (thisresult != null && thisresult.length > 1) {
                            // if the glossary word does contain more words, we need to check the other words as well
                            // but start with the first one
                            // console.debug("we found more then one:", wordToFind, thisresult)
                            // if (thisresult!=null){
                            // console.debug("lengte thisresult:",thisresult,thisresult.length,translation)

                            isFound = false
                            for (let cnt = 0; cnt < thisresult.length; cnt++) {
                                //console.debug("counter:",cnt)
                                //if (found == false) {
                                NewsearchTerm = thisresult[cnt]
                               // console.debug("NewSearchTerm:", NewsearchTerm)
                                wordsCount = NewsearchTerm.trim().split(/\s+/).filter(Boolean).length;
                               // console.debug("wordcount in multiple:", wordsCount)
                             //   console.debug("zoekterm:", NewsearchTerm)
                                if (wordsCount == 1) {
                                    // we need to remove all chars that do not belong to the single word
                                    translation = translation.replace(/[:;!?&,.()<>"/]/g, ' ')
                                  // console.debug("translation:",translation)
                                    lowertranslation = translation.toLowerCase()
                                    let words = lowertranslation.split(/[\s.,!?&()]+/)
                                 //   console.debug("words:", words)
                                    let orgwords = translation.split(/[\s.,!?&()]+/)
                                    if (words.some(word => word === NewsearchTerm)) {
                                        // console.debug("we found glossary in translation:", NewsearchTerm.trim())
                                        foundCount += 1
                                        isFound = true
                                    }
                                    else if (orgwords.some(word => word === NewsearchTerm.trim())) {
                                        foundCount += 1
                                        isFound = true

                                    }
                                    else if (lowertranslation.includes(" " + NewsearchTerm.trim().toLowerCase() + " ")) {
                                        // console.debug("Search for  multi")
                                        foundCount += 1
                                        isFound = true
                                    }
                                    else if (lowertranslation.includes(" " + NewsearchTerm)) {
                                        if (strictValidation == false) {
                                            foundCount += 1
                                           //console.debug('We found combined word')
                                            isFound = true
                                        }
                                    }
                                    else if (lowertranslation.includes(NewsearchTerm + " ")) {
                                        if (strictValidation == false) {
                                            foundCount += 1
                                           // console.debug('We found combined word')
                                            isFound = true
                                        }
                                    }


                                    // we did not find one of the words
                                }
                                else {
                                    //console.debug("we found more then one word in the entry")
                                }

                                 if (isFound == true) {
                                   //console.debug("more then one isFound:", isFound)
                                   break;
                                 }
                            }

                            //console.debug("at the end:", foundCount, isFound)
                            if (foundCount == 0 && isFound != true) {
                                //console.debug("we did not have a result")
                                toolTip += wordToFind + " - " + "wrong translation" + "\n"
                                // break;
                            }
                            else if (foundCount > 0 && isFound != true) {
                                // the glossary translation did not match the translation
                                toolTip += wordToFind + " - " + "check translation" + "\n"
                            }
                            // console.debug("we need to clean!!")
                        }
                        else {
                            //console.debug("we have no result:",wordToFind)
                            toolTip += wordToFind + " - " + "NoGloss" + "\n"
                        }
                    }
                    else {
                            //console.debug("we have no result:",wordToFind)
                        toolTip += wordToFind + " - " + "NoGloss" + "\n"
                       // break;
                    }
             }
            }
            else {
                //console.debug("no glossary")
                wordCount=0;
                toolTip =""
                foundcount=0;
                percent=100;
            }
        }
        else {
           // console.debug("no leftpanel:",rowId)
            wordCount=0;
            toolTip =""
            foundcount=0;
            percent=100;
            //return { wordCount, foundCount, percent, toolTip, newText }
            }
  
    foundCount = foundCount + myfoundCount
    if (wordCount == 0 && foundCount == 0 && translation != 'Empty') {
        if (translation != 'No suggestions') {
            toolTip = ""
            percent = 100;
        }
        else {
            percent = 0;
            wordCount = 1;
            foundCount = 0;
            toolTip += `No glossary words\n`;
        }
    }
    else if ((wordCount == 0 && foundCount == 0 && translation == 'Empty')) {
        percent = 0;
        toolTip="Translation is empty"
    }
    else if (wordCount == foundCount) {
        // console.debug("counts are equal!")
        percent = 100;
        toolTip=""
    }
    else if ((wordCount - foundCount) > 0) {
        //console.debug("we found a difference")
        percent = Math.round((foundCount * 100) / wordCount);
    }
    //console.debug("total toolTip:",toolTip)
    newText =""
    //console.debug("before return:",wordCount,foundCount,percent,toolTip)
    return { wordCount, foundCount, percent, toolTip, newText };

}

function containsExactWord(str, word) {
    // Create a regular expression with word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'i'); // 'i' for case-insensitive match
    return regex.test(str);
}

function containsVerbMultipleTimes(text, verb) {
    // Create a regular expression to match the verb as a whole word
    var count = 0;
    var matches = [];
    var morethenone = false;
    //const regex = new RegExp(`\\b${verb}\\b`, 'gi');
    const regex = new RegExp(`\\b${verb}\\b`, 'gi');
    // Find all matches
    matches = text.match(regex);
    // Check if the number of matches is greater than 1
    if (matches != null) {
        count = matches.length
        morethenone = matches && matches.length > 1
    }
    else {
        count = 0
        morethenone = false;
    }
    return [morethenone, count]
}

function findWordPositions(text, word) {
   // console.debug("text:", text)
  //  console.debug("word:",word)
    let positions = [];
    let pos = text.indexOf(word);
    let wordLength = word.length;

    while (pos !== -1) {
        // Check if the found word is a whole word
        let before = pos === 0 || /\W/.test(text[pos - 1]);
        let after = pos + wordLength === text.length || /\W/.test(text[pos + wordLength]);

        if (before && after) {
            positions.push(pos);
        }

        pos = text.indexOf(word, pos + wordLength);
    }

    return positions;
}


// Language specific matching.
function match(language, gWord, translation, gItemValue,original,oWord) {
    var glossaryverb;
    var count = 0;
    var myresult = false
    var positions=[];
    if (typeof language != 'undefined') {
        // language is set to uppercase, so we need to return it to lowercase issue #281
        language = language.toLowerCase();
        switch (language) {
            case "ta":
                return taMatch(gWord, translation);
            default:
                // 13-02-2023 PSS fixed a problem when the glossary string only includes one verb
                if (gItemValue.length == 1) {
               // if (!Array.isArray(gItemValue)) {
                    glossaryverb = gItemValue[0]
                  //  if (containsExactWord(tWord, glossaryverb)) {
                    let result = containsVerbMultipleTimes(original, oWord)
                    if (result[1] == 1) {
                        // we need to find the exact match if parameter is set   
                        if (strictValidation) {
                            if (containsExactWord(translation.toLowerCase(), glossaryverb)) {
                                count += 1
                                myresult = true
                            }
                        }
                        else {
                            if (translation.toLowerCase().includes(glossaryverb)) {
                                //console.debug("we found string containing glossary word:", glossaryverb, containsExactWord(translation, glossaryverb))
                                count +=1
                                myresult = true
                            }
                            else {
                                console.debug("we did not find the word:", glossaryverb)
                                myresult= false
                            }
                        }      
                    }
                    else {
                        //console.debug("The word exists more then once!",oWord)
                        positions = findWordPositions(original, gWord);
                       // console.debug(`The word '${oWord}' was found in original  at positions: ${positions}`);
                        //console.debug("count of verbs when more then one in original:", positions.length)
                        positions = findWordPositions(translation, glossaryverb);
                       // console.debug(`The word '${glossaryverb}' was found in translation  at positions: ${positions}`);
                       // console.debug("count of verbs when more then one in translation:", positions.length)
                        let result1 = containsVerbMultipleTimes(original, oWord)
                        let result2 = containsVerbMultipleTimes(translation, glossaryverb)
                       // console.debug("result2:",result2,oWord)
                        if (result1[1] == result2[1]) {
                            myresult = true
                          //  console.debug("result2 count:",result2[1])
                            count += result2[1]
                        }
                        else {
                           // console.debug("we have a difference in count between original and translation", result1[1], result2[1])
                            let dif = result2[1] - result1[1]
                            if (dif > 0) {
                                count += result[1];
                                myresult = true;
                            }
                            else {
                                myresult = true;
                            }
                        }
                    }
                }
                else {
                    // if the glossary contains an array we need to walk through the array
                    for (var i = 0; i < gItemValue.length; i++) {
                        glossaryverb = gItemValue[i];
                        //console.debug("glossaryverb in array:", glossaryverb)
                        let result =  containsVerbMultipleTimes(original, gWord)
                        if (result[1] >1) {
                            console.debug("we have more then one")
                            count += result[1]
                            myresult =true
                        }
                        else {
                            let result =  translation.includes(glossaryverb)
                            if (result) {
                            //if (tWord.includes(glossaryverb)) {
                                // if (containsExactWord(tWord, glossaryverb)) {
                              //  console.debug("we found multiple word1:", glossaryverb)
                                count += 1
                                myresult = true;
                            }
                            else {
                              //  console.debug("we did not find multiple word:", "glossaryverb ",glossaryverb,"translation:", translation)
                                if (i > gItemValue.length) {
                                    myresult =false
                                    //return false
                                }
                            }
                        }
                    }
                }
                return { myresult, count };
        }
    }
    else {
        if (translation.len == "1") {
            if (strictValidation) {
                if (containsExactWord(translation, glossaryverb)) {
                    // if (translation.includes(glossaryverb)) {
                    //console.debug("we found exact original word:", glossaryverb, containsExactWord(translation, glossaryverb))
                    count++
                    myresult = true
                }
            }
            else {
                if (translation.includes(glossaryverb)) {
                    //console.debug("we found string containing glossary word:", glossaryverb, containsExactWord(translation, glossaryverb))
                    count++
                    myresult = true
                }
            }
            return { myresult, count};
        }
        else {
            if (!Array.isArray(gItemValue)) {
                glossaryverb = gItemValue;
                if (strictValidation) {
                    if (containsExactWord(translation, glossaryverb)) {
                        count +=1
                        myresult = true
                    }
                }
                else {
                    if (translation.includes(glossaryverb)) {
                        count +=1
                        myresult = true
                    }
                }
            }
            else {
                // if the glossary contains an array we need to walk through the array
                for (var i = 0; i < gItemValue.length; i++) {
                    glossaryverb = gItemValue[i];
                    if (strictValidation) {
                        if (containsExactWord(translation, glossaryverb)) {
                            count +=1
                            myresult = true
                            break
                        }
                    }
                    else {
                        if (translation.includes(glossaryverb)) {
                            count +=1
                            myresult = true
                            break
                        }
                    }
                } 
            }
            return { myresult, count };
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
    return tWord.includes(glossaryWord);
}

// 14-06-2021 PSS added fetch old records to show in meta if present
// 14-06-2021 PSS added the old translation into the metabox, and draw lines between the translations
// 22-06-2021 PSS added functionality to show differences in the translations
async function fetchOldRec(url, rowId,showDiff) {
    // 23-06-2021 PSS added original translation to show in Meta
    var tbodyRowCount = 0;
    var fetchOld_status ="";
    var diff;
    var diffType = "diffWords"; // this is to determine the differenct between lines
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    if (e != null) {
        let curr_trans = e.querySelector("#editor-" + rowId + " .foreign-text").textContent;
        let OldRec_status = document.querySelector(`#editor-${rowId} span.panel-header__bubble`).innerHTML;
        switch (OldRec_status) {
            case "current":
                newurl = url.replace("mystat", "waiting");
                fetchOld_status = "current"
                break;
            case "waiting":
                newurl = url.replace("mystat", "fuzzy");
                fetchOld_status ="fuzzy"
                break;
            case "rejected":
                newurl = url.replace("mystat", "current");
                break;
            case "fuzzy":
                newurl = url.replace("mystat", "waiting");
                fetchOld_status = "waiting"
                break;
            case "old":
                newurl = url.replace("mystat", "current");
                fetchOld_status = "current"
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
        if (OldRec_status != "untranslated" && typeof newurl != "undefined") {
            var diffType = "diffWords";
            fetch(newurl, {
                headers: new Headers({
                    "User-agent": "Mozilla/4.0 Custom User Agent",
                    'Cache-Control': 'no-cache'
                })
            }).then(response => response.text())
            .then(data => {
                var parser = new DOMParser();
                var doc = parser.parseFromString(data, "text/html");
                //console.log("html:", doc);
                var table = doc.getElementById("translations");
                // if there is no table with results, then we do need to set the value to 0
                if (typeof table != 'undefined' && table != null) {
                    //let tr = table.rows;
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
                    element1.appendChild(document.createTextNode("Existing translation ->" + fetchOld_status));

                    var element2 = createElementWithId("div", "translator_div2");
                    element2.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                    if (OldRec_status = 'current') {
                        element2.appendChild(document.createTextNode(orig[0].innerText));
                    }
                    else {
                        element2.appendChild(document.createTextNode(trans[0].innerText));
                    }

                    var element3 = createElementWithId("div", "translator_div3");
                    element3.style.cssText = "padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey";
                    // If within editor you have no translation
                    if (trans[0] != "undefined") {
                        if (OldRec_status == "current") {
                            element3.appendChild(document.createTextNode(trans[0].innerText));
                        }
                        else {
                            //console.debug("we have no current:", OldRec_status)
                            element3.appendChild(document.createTextNode(orig[0].innerText));
                        }
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
                        var newStr = curr_trans;
                        if (OldRec_status == 'current') {
                            var changes = JsDiff[diffType](oldStr, newStr);
                            if (oldStr.length != newStr.length) {
                                textdif = "  ->Length not equal!";
                            } else {
                                textdif = "";
                            }
                        }
                        else {
                            var changes = JsDiff[diffType](newStr,oldStr);
                            if (oldStr.length != newStr.length) {
                                textdif = "  ->Length not equal!";
                            } else {
                                textdif = "";
                            }

                        }
                        if (oldStr == newStr) {
                            element4.appendChild(document.createTextNode("Translation is the same"));
                        } else {
                            element4.appendChild(document.createTextNode("Translation has difference!"));
                        }

                        //04-10-2021 PSS changed the class to resolve issue #157
                        if (OldRec_status == "current") {
                            diff = JsDiff[diffType](oldStr, newStr);
                        }
                        else {
                            diff = JsDiff[diffType](newStr , oldStr);
                        }
                        fragment = document.createDocumentFragment();
                        diff.forEach((part) => {
                            // green for additions, red for deletions
                            // dark grey for common parts
                            if (status == "current") {
                                const color = part.added ? "green" :
                                    part.removed ? "red" : "dark-grey";
                                const background_color = part.added ? "white" :
                                    part.removed ? "white" : "dark-grey";
                                span = document.createElement("span");
                                span.style.color = color;
                                span.style.backgroundColor = background_color;
                                span.appendChild(document
                                    .createTextNode(part.value));
                                fragment.appendChild(span);
                            }
                            else if (status = "waiting"){
                                const color = part.added ? "green" :
                                    part.removed ? "red" : "dark-grey";
                                const background_color = part.added ? "white" :
                                    part.removed ? "white" : "dark-grey";
                                span = document.createElement("span");
                                span.style.color = color;
                                span.style.backgroundColor = background_color;
                                span.appendChild(document
                                    .createTextNode(part.value));
                                fragment.appendChild(span);
                            }
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
async function fetchOld(checkElem, result, url, single, originalElem, row, rowId, showName, current, prev_trans, currcount, showDiff) {
    var mycurrent = current;
   // console.debug("fetchold:",mycurrent)
    // 30-06-2021 PSS added fetch status from local storage
    //chrome.storage.sync
    //  .get(
    //      ["noOldTrans"],
    //     function (data) {
    //         single = data.noOldTrans;
    //    });
    const headers = new Headers({
        'Content-Type': 'application/json',
        'User-agent': 'Mozilla/4.0 Custom User Agent',
        'Cache-Control': 'no-cache'
    });

    fetch(url,{
        headers: headers, // Pass the headers object
    })
        .then(response => {
            if (!response.ok) {
                //console.debug("status:", response.status)
                if (response && response.status === 429) {
                    console.debug('Too many requests error 429 record not processed:', rowId, originalElem.innerText);
                }
                else if (response && response.status === 501) {
                    console.debug('No response error 501 record not processed:', rowId)
                }
                else {
                    console.debug("error:", response)
                }

            }
            return response.text();
        }).then(async data => {
            //05-11-2021 PSS added fix for issue #159 causing an error message after restarting the add-on
            currURL = window.location.href;
            // &historypage is added by GlotDict or WPGPT, so no extra parameter is necessary for now
            if (currURL.includes("&historypage") == false) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(data, "text/html");
                //console.log("html:", doc);
                var table = await doc.getElementById("translations");
                //console.debug("table:",table)
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
                        else { currstring = currstring.innerText }
                    }
                    else {
                        currcount = "";
                    }
                    if (waiting.length != 0) {
                       // console.debug("Waiting:", waiting)
                        waiting_rec = waiting[0]
                        prev_trans = waiting_rec.querySelector("td.translation.foreign-text")
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
                    if (old.length != 0 && waiting.length == 0) {
                        //console.debug("old:", old[0])
                        prev_trans = old[0]
                        prev_trans = prev_trans.querySelector("td.translation.foreign-text")
                        //console.debug("old:", prev_trans)
                        old = " Old:" + old.length;
                    }
                    else {
                        old = "";
                    }
                    //console.debug("result of records found:",wait, rejec, fuz, old, rowId)
                   
                    if (tbodyRowCount > 2 && single == "False") {
                        // we need to fetch the previous state first
                        old_status = document.querySelector("#preview-" + rowId);
                        myHistory = true;
                        my_checkpage = false;
                        repl_array = [];
                       // showDiff = 'true';
                        //(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff, currcount, currstring, current, record, myHistory, my_checkpage, repl_array, prev_trans, old_status, showDiff) {
                        showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, mycurrent, myHistory, my_checkpage, repl_array, prev_trans, old_status, rowId, "UpdateElementStyle", showDiff);
                        //console.debug("result before updateelementstyle:",result)
                        let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
                        updateElementStyle(checkElem, headerElem, result, "True", originalElem, wait, rejec, fuz, old, rowId, showName, "", currcount, currstring, mycurrent, "", false, false, [], prev_trans, old_status, showDiff);
                    }
                    else if (tbodyRowCount > 2 && single == "True") {
                         updateElementStyle(checkElem, headerElem, result, "False", originalElem, wait, rejec, fuz, old, rowId, showName, "",currcount,currstring,mycurrent,"",true,false,[],prev_trans,current);
                        //var windowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes,width=800,height=650,left=600,top=0";
                        //window.open(url, "_blank", windowFeatures);
                    }
                }
            }
        }).catch(error => {
            if (error.response && error.response.status === 429) {
                console.debug('Too many requests. Please try again later.');
            } else {
                console.debug('Error fetching or processing data:', error.message);
            }
         })
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
    myRow.scrollIntoView({ block: "start" });
    // we do not want the view to close to the header, so move it a bit down
    window.scrollBy(0, -30);
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
    var status_has_changed;
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
                    status_has_changed = false;
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

// Function to remove a div element with a specified class name
function removeDiv(className) {
    // Select the div element with the specified class name
    var divToRemove = document.querySelector("." + className);
    // Check if the div element exists
    if (divToRemove) {
        // Remove the div element
        divToRemove.parentNode.removeChild(divToRemove);
        var legend = document.getElementById('legend');
        var divElements = legend.getElementsByTagName("div");
        // Loop through the list of div elements
        for (var i = 0; i < divElements.length; i++) {
            // Check if the text content of the div matches the value you're looking for
            if (divElements[i].textContent === "Contains a Glossary term") {
                // Set the text content of the div to an empty string
                divElements[i].textContent = "";
                break; // Exit the loop once the value is found and set
            }
        }
    } else {
        // Element not found
        console.log("Element not found.");
    }
    }

// Function to be called whenever a new node is added to the DOM
chrome.storage.local.get(["glotDictGlos"],
    async function (data) {
        // we need to wait before checking the status of GlotDict
        setTimeout(async function()  {
                showGlosLine = data.glotDictGlos;
                if (showGlosLine == "false") {
                    function handleNewNode(mutationsList, observer) {
                        mutationsList.forEach(mutation => {
                            if (mutation.type === 'childList') {
                                // Iterate over the added nodes
                                for (var i = 0; i < mutation.addedNodes.length; i++) {
                                    var node = mutation.addedNodes[i];
                                    // Check if the added node is an element
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        //console.debug("node:",node,node.classList[1])
                                        // Check if the added node has the class "div-to-remove"
                                        if (node.classList.contains('has-glotdict')) {
                                            // Remove the div element
                                            // console.debug("we start removing:")
                                            removeDiv("box.has-glotdict");
                                            observer.disconnect()
                                        }
                                    }
                                }
                            }
                        });
                    }
                    // Create a MutationObserver instance
                    var observer = new MutationObserver(handleNewNode);
                    // Start observing the DOM for changes
                    observer.observe(document.body, { childList: true, subtree: true });
                }
                else {
                    //console.debug("GlotDict show glossary word false!", showGlosLine)
                }
        }, 10)
    });



function handleInputEvent(event,rowId) {
   // console.log('Text input detected:', event.target.value);
}

function stopObserving(observer) {
    observer.disconnect();
}

function startObserving(observer, textarea, config) {
    //console.debug("singles observer is started")
    //console.debug("observer:", typeof textarea)
    if (typeof textarea == 'object') {
        observer.observe(textarea, config);
        textarea.addEventListener('input', () => {
            console.debug("we start listening")
            textarea.setAttribute('value',textarea.value)
        })
    }
    //console.debug("observer started:", observer)
    return observer
}



function start_editor_mutation_server(textarea, action) {
        //console.debug("action =:",action)
        //event.preventDefault(event)
       // console.debug("typeof textarea:",typeof textarea,textarea)
        // Set up the MutationObserver
        observer = new MutationObserver(handleMutation);

        // Observer configuration
        var config = { characterData: true, subtree: true };
        //var config = { attributes: false };
        // Start observing the textarea
        // if (typeof textarea !='undefined') {
    if (typeof observer != 'undefined' && typeof textarea != 'undefined' || typeof textarea == 'object') {
        //console.debug("textarea in start:", textarea)
        //console.debug("observer:", observer)
        if (typeof observer == 'object') {
            stopObserving(observer)
          //  console.debug(" we are stopping the observer!")
        }
        
        if (textarea.length != 0) {
            observer.observe(textarea[0], { attributes: true, childList: true, subtree: true });
           // let observerstart = startObserving(observer, textarea[0], config)
           // console.debug("observerstart:",observerstart)
        }
        // observer.observe(textarea, config);
    }
    else {
        console.debug("in observer start object or textarea is not defined")
    }

}

function start_editor_mutation_server2(pluralTextarea, action) {
    //console.debug("action =:",action)
    //console.debug("typeof textarea:",typeof textarea,textarea)
    // Set up the MutationObserver
    // let observer2 = new MutationObserver(MutationsPlural);
                      //  observer2.observe(pluralTextarea, { attributes: true, childList: true, subtree: true });
    let observer2 = new MutationObserver(MutationsPlural);

    // Start observing the textarea
    
    if (typeof observer2 != 'undefined' && typeof pluralTextarea != 'undefined' || typeof pluralTextarea == 'object') {
       
        stopObserving(observer2)
        //   }
        // test 
        if (pluralTextarea.length != 0) {
            observer2.observe(pluralTextarea, { attributes: true, childList: true, subtree: true });
        }
        
    }
    else {
        console.debug("in observer start object or textarea is not defined")
    }

}

function findByKey(map, searchKey) {
    return map.get(searchKey) || null;
}
// Function to handle DOM mutations
async function handleMutation(mutationsList, observer) {
    //console.debug("We handle mutations")
    var leftPanel;
    var MutResult;
    var MyResult;
    var valResult;
    var original;
    var OriginalText;
    var preview;
    var myRowId;
    var preview_original;
    var myeditor_original;
    var spans;
    var map;
    var panelTransMenu;
    var markerpresent;
    var translation;
    //DefGlossary
    if (DefGlossary == true) {
        var myglossary = glossary
    }
    else {
        var myglossary = glossary1
    }
    //for (const mutation of mutationsList) {
        mutation = mutationsList[0]
        //console.debug("mutation type:", mutation.type)
        //console.debug("mutationslist:",mutationsList)
        if (mutation.type === 'childList') {
            //console.debug('Child list mutation detected:', mutation);
        }
        else if (mutation.type === 'attributes') {
           // console.debug('Attribute mutation detected:', mutation.target);
            var closestParent = mutation.target;
            //console.debug(closestParent)
            // we need to go back in the Dom to get the rowId
            rowId = closestParent.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.getAttribute ("row")
            
            detailPreview = await document.querySelector(`#preview-${rowId}`);
            detailEditor = await document.querySelector(`#editor-${rowId}`);
            if (detailEditor != null) {
                // we did find a detailEditor
                mypluralOriginal = detailEditor.getElementsByClassName("source-string__plural")

                // we only need to validate if there are glossary words
                //console.debug("detailPreview",detailPreview)
                if (detailPreview != null) {
                    leftPanel = closestParent.parentElement.parentElement.parentElement.parentElement
                    original = await leftPanel.getElementsByClassName("original-raw")[0]
                    //console.debug("original:",original)
                    textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                    translation = await mutation.target.value
                    mutation.target.focus()
                    let panelContent = await mutation.target.parentNode.parentNode.parentNode
                    //console.debug("mutation.target:",mutation.target.parentNode)
                    let ClassList = await mutation.target.parentNode.classList
                    isPlural = ClassList.length == 1
                    // console.debug("is plural:",isPlural)
                    OriginalText = original.textContent
                    myGlossArray = await Array.from(myglossary)
                    map = new Map(myGlossArray.map(obj => [obj.key, obj.value]))
                    //console.debug("before MyResult:", OriginalText)
                    //console.debug("before MyResult:", translation)
                    if (typeof translation != 'undefined'){
                        MyResult = await validate(locale, OriginalText, translation, locale, false, rowId, false) 
                    }

                    spans = await leftPanel.getElementsByClassName("glossary-word")
                    if (MyResult != null) {
                        //console.debug("validate result in mutation 5059:", MyResult.toolTip, MyResult.wordCount, MyResult.foundCount)

                        if (MyResult.wordCount == 0) {
                            var spansArray = await Array.from(spans)
                            MyResult.wordCount = spansArray.length
                            for (let i = 0; i < spansArray.length; i++) {
                                if (spansArray[i].innerText != "") {
                                    wordToFind = spansArray[i].textContent
                                    wordToFind = wordToFind.toLowerCase()
                                    let thisresult = findByKey(map, wordToFind)
                                    if (thisresult != null) {
                                        // console.debug(`found in map: value = ${thisresult[0]}`)
                                        //console.debug("we found it", thisresult[0])
                                        if (!translation.includes(wordToFind)) {
                                            MyResult.toolTip += wordToFind + " - " + thisresult[0] + "\n"
                                            //console.debug("tooltip:", MutResult.toolTip)
                                        }
                                        else { console.debug("we did find:", wordToFind, translation) }
                                    }
                                    else {
                                        console.debug("this is the one")
                                        MyResult.toolTip += wordToFind + " - " + "NoGloss" + "\n"
                                    }
                                }
                            }

                            MyResult.percent = 0;
                        }
                        //remove_all_gloss(leftPanel, false)
                        //console.debug("Tooltip:", MyResult.toolTip)
                        mark_glossary(leftPanel, "", translation, myRowId, false)
                       // mark_glossary(leftPanel, MyResult.toolTip, translation, myRowId, false)
                        //console.debug("MyResult toolTip:",MyResult.toolTip)
                        let missingVerbsButton = leftPanel.getElementsByClassName("translocal-entry-missing-button");
                        //console.debug("mutations we have a missingVerbsButton:",missingVerbsButton)
                        panelTransMenu = leftPanel.getElementsByClassName("panelTransMenu")
                        let headerElem = leftPanel.querySelector(`.panel-header`);
                        editor = leftPanel.querySelector('.original-raw')
                        preview = leftPanel.parentElement.parentElement.parentElement
                        myRowId = preview.getAttribute("row")
                        preview_original = document.querySelector(`#preview-${myRowId} .original-text`)
                        myeditor_original = document.querySelector(`#editor-${myRowId} .original`)
                        if (typeof editor == 'object') {
                            editor_original = editor.innerHTML
                            //console.debug("Myresult.wordCount and MyResult.foundCount:",MyResult.wordCount,MyResult.foundCount)
                            if (MyResult.wordCount != MyResult.foundCount) {
                                //leftPanel = await document.querySelector(`#editor-${myRowId} .editor-panel__left`)
                                if (MyResult.toolTip.length > 0) {
                                    // console.debug("houston we have a difference:", MutResult.toolTip)
                                    let newline = "\n";
                                    let missingverbs = "Missing glossary entry\n";
                                    let headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(MyResult.toolTip);
                                    if (missingVerbsButton[0] != null) {
                                        missingVerbsButton[0].style.visibility = "visible"
                                        missingVerbsButton[0].title = headertitle;
                                        if (leftPanel != null) {
                                            markerpresent = leftPanel.getElementsByClassName("marker");
                                        }
                                        if (MyResult.percent == 100) {
                                            panelTransMenu[0].style.backgroundColor = "green";
                                            missingVerbsButton[0].style.visibility = "hidden"
                                            //if (valResult.percent == 100) {
                                            // deze verwijderen en de algemene aanroep gebruiken!!!
                                            if (leftPanel != null) {
                                                //span_glossary = await leftPanel.querySelectorAll(".glossary-word")
                                                remove_all_gloss(leftPanel, false)
                                            }
                                            if (typeof markerpresent[0] != 'undefined') {
                                                markerpresent[0].remove()
                                            }
                                        }
                                        else if (MyResult.percent >= 66) {
                                            //else if (valResult.percent >= 66) {
                                            panelTransMenu[0].style.backgroundColor = "yellow";
                                            //textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                        }
                                        else if (MyResult.percent >= 33 && MyResult.percent < 66) {
                                            //else if (valResult.percent >= 33) {
                                            panelTransMenu[0].style.backgroundColor = "orange";
                                            // textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                        }
                                        else if (MyResult.percent >= 10) {
                                            //else if (valResult.percent == 10) {
                                            panelTransMenu[0].style.backgroundColor = "purple";
                                            //textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                        }
                                        else if (MyResult.percent < 33 && MyResult.percent > 0) {
                                            // else if (valResult.percent < 33 && valResult.percent > 0) {
                                            panelTransMenu[0].style.backgroundColor = "darkorange";
                                            // textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                        }
                                        else if (MyResult.percent == 0) {
                                            panelTransMenu[0].style.backgroundColor = "red";
                                            //textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                        }
                                        mark_glossary(leftPanel, "", translation, myRowId, false)
                                    }
                                }
                                else {
                                    // console.debug("Tooltip empty")
                                    // span_glossary = leftPanel.querySelectorAll(".glossary-word")
                                    // console.debug("span_glossary:", span_glossary)
                                    remove_all_gloss(leftPanel,false)
                                    let markerpresent = leftPanel.getElementsByClassName("marker");
                                    //if (markerpresent != null) {
                                    //  console.debug("We found explanation:", markerpresent)
                                    if (typeof markerpresent[0] != 'undefined') {
                                        // this is the texline below the original when a glossary word is missing
                                        markerpresent[0].remove()
                                    }
                                    missingVerbsButton[0].style.visibility = "hidden"
                                    missingVerbsButton[0].title = "";
                                    toolTip = ""
                                    panelTransMenu[0].style.backgroundColor = "green";
                                }
                            }
                            else {
                                //console.debug("percentage:", result.percent, leftPanel)
                                textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                MutResult = await validate(locale, original.textContent, translation, locale, false, rowId, false)
                                //console.debug("validate in content line 5168", MutResult)
                                // console.debug("MutResult:",MutResult)
                                myOriginal = leftPanel.getElementsByClassName("original")
                                if (MutResult.percent == 100) {
                                    // if (valResult.percent == 100) {
                                    let markerpresent = leftPanel.getElementsByClassName("marker");
                                    //if (markerpresent != null) {
                                    //console.debug("We found explanation:", markerpresent)
                                    if (typeof markerpresent[0] != 'undefined') {
                                        markerpresent[0].remove()
                                    }
                                    textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                    // console.debug("100%:", result)
                                    // console.debug("myeditor_original:", myeditor_original)
                                    // console.debug("preview_original:", preview_original)
                                    if (myeditor_original != null && preview_original != null) {
                                        myeditor_original.innerHTML = preview_original.innerHTML
                                    }
                                    //console.debug("editor_original:", myeditor_original.innerHTML)
                                    // console.debug("preview_original:", preview_original.innerHTML)
                                    //}
                                    panelTransMenu[0].style.backgroundColor = "green";
                                    remove_all_gloss(leftPanel,false)
                                }
                                else if (MutResult.percent == 0) {
                                    console.debug(("wordcount:", MutResult.wordCount))
                                    console.debug("We have 0%")
                                }
                                missingVerbsButton[0].style.visibility = "hidden"
                                missingVerbsButton[0].title = "";
                                toolTip = ""
                            }
                            mark_glossary(leftPanel, "", translation, myRowId, false)
                        }
                        else {
                            console.debug("preview is null geen vertaling aanwezig")
                            missingVerbsButton[0].style.visibility = "hidden"
                            missingVerbsButton[0].title = "";
                            toolTip = ""
                        }
                    }
                
                    //console.debug("We can make markings!! but it needs amending")
                    //console.debug("translation before return:",translation)
                    //mark_glossary(leftPanel, "", translation, rowId, false)
                 }
             }
    } 
}

function MutationsPlural(mutations, observer) {
    var pluralOriginal;
    var detailEditor;
    if (DefGlossary == true) {
        var myglossary = glossary
    }
    else {
        var myglossary = glossary1
    }
    mutations.forEach(async function (mutation) {
        let targetTextarea = mutation.target;
        //console.log('Change detected in:', targetTextarea.id, 'Content:', targetTextarea.value);
        var closestParent = mutation.target;
        //console.debug(closestParent)
        // we need to go back in the Dom to get the rowId
        rowId = closestParent.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.getAttribute("row")

        detailPreview = document.querySelector(`#preview-${rowId}`);
        detailEditor = document.querySelector(`#editor-${rowId}`);
        if (detailEditor != null) {
            mypluralOriginal = detailEditor.getElementsByClassName("source-string__plural")
            pluralOriginal = mypluralOriginal[0].querySelector(".original-raw")
            //console.debug("pluralOriginal:",pluralOriginal)
            // we only need to validate if there are glossary words
            if (detailPreview != null) {
                detail_glossary = detailPreview.querySelector(`.glossary-word`)
                leftPanel = closestParent.parentElement.parentElement.parentElement.parentElement
                pluralpresent = leftPanel.querySelector(`.editor-panel__left .source-string__plural`);

                //console.debug("leftPanel:", leftPanel)
                //console.debug("pluralpresent:",pluralpresent)
                translation = await mutation.target.value
                //console.debug("plural original:", pluralOriginal.textContent)
               //console.debug("plural mutation translation:", translation)

                mutation.target.focus()

                myGlossArray = await Array.from(myglossary)
                map = new Map(myGlossArray.map(obj => [obj.key, obj.value]))
                MyResult = await validate(locale, pluralOriginal.textContent, translation, "", false, rowId, true)
                //console.debug("validate in content line 5275", MyResult)
                //console.debug("before marking 4625",MutResult.toolTip)
                mark_glossary(leftPanel, "", translation, rowId,true)
                MyResult.percent = 0;
                let missingVerbsButton = leftPanel.getElementsByClassName("translocal-entry-missing-button");
                panelTransMenu = leftPanel.getElementsByClassName("panelTransMenu")
                let headerElem = leftPanel.querySelector(`.panel-header`);
                editor = leftPanel.querySelector('.original-raw')
                preview = leftPanel.parentElement.parentElement.parentElement
                myRowId = preview.getAttribute("row")
                preview_original = document.querySelector(`#preview-${rowId} .original-text`)
                myeditor_original = document.querySelector(`#editor-${rowId} .original`)
                if (typeof editor == 'object') {
                    editor_original = editor.innerHTML
                    if (MyResult.wordCount != MyResult.foundCount) {
                        //leftPanel = await document.querySelector(`#editor-${myRowId} .editor-panel__left`)
                        if (MyResult.toolTip.length > 0) {
                            // console.debug("houston we have a difference:", MutResult.toolTip)
                            let newline = "\n";
                            let missingverbs = "Missing glossary entry\n";
                            let headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(MyResult.toolTip);

                            if (missingVerbsButton[0] != null) {
                                missingVerbsButton[0].style.visibility = "visible"
                                missingVerbsButton[0].title = headertitle;
                                if (leftPanel != null) {
                                    markerpresent = leftPanel.getElementsByClassName("marker");
                                }
                                if (MyResult.percent == 100) {
                                    panelTransMenu[0].style.backgroundColor = "green";
                                    //if (valResult.percent == 100) {
                                    // deze verwijderen en de algemene aanroep gebruiken!!!
                                    if (leftPanel != null) {
                                        //span_glossary = await leftPanel.querySelectorAll(".glossary-word")
                                        remove_all_gloss(leftPanel,true)
                                    }
                                    if (typeof markerpresent[0] != 'undefined') {
                                        markerpresent[0].remove()
                                    }
                                }
                                else if (MyResult.percent >= 66) {
                                    //else if (valResult.percent >= 66) {
                                    panelTransMenu[0].style.backgroundColor = "yellow";
                                    //textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                   // span_glossary = leftPanel.querySelector(".glossary-word")
                                   // remove_all_gloss(leftPanel,true)
                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId,true)
                                }
                                else if (MyResult.percent >= 33) {
                                    //else if (valResult.percent >= 33) {
                                    panelTransMenu[0].style.backgroundColor = "orange";
                                    // textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                   // span_glossary = leftPanel.querySelector(".glossary-word")
                                   // remove_all_gloss(leftPanel,true)
                                  //  mark_glossary(leftPanel, MyResult.toolTip, translation,rowId,true)
                                }
                                else if (MyResult.percent >= 10) {
                                    //else if (valResult.percent == 10) {
                                    panelTransMenu[0].style.backgroundColor = "purple";
                                    //textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                  //  span_glossary = leftPanel.querySelector(".glossary-word")
                                   // remove_all_gloss(leftPanel,true)
                                    //mark_glossary(leftPanel, MyResult.toolTip, translation, rowId,true)
                                }
                                else if (MyResult.percent < 33 && MyResult.percent > 0) {
                                    // else if (valResult.percent < 33 && valResult.percent > 0) {
                                    panelTransMenu[0].style.backgroundColor = "darkorange";
                                    // textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                  //  span_glossary = leftPanel.querySelector(".glossary-word")
                                   // remove_all_gloss(leftPanel,true)
                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId,true)
                                }
                                else if (MyResult.percent == 0) {
                                    panelTransMenu[0].style.backgroundColor = "red";
                                    //textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                                  //  span_glossary = leftPanel.querySelector(".glossary-word")
                                   // if (typeof span_glossary != 'undefined') {
                                  //      remove_all_gloss(leftPanel,true)
                                       // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId,true)
                                 //   }
                                }
                                mark_glossary(leftPanel, MyResult.toolTip, translation, rowId,true)
                            } // missingverbs is null
                        }
                        else {
                            // console.debug("Tooltip empty")
                            // span_glossary = leftPanel.querySelectorAll(".glossary-word")
                            // console.debug("span_glossary:", span_glossary)
                            remove_all_gloss(leftPanel,true)
                            let markerpresent = leftPanel.getElementsByClassName("marker");
                            //if (markerpresent != null) {
                            //  console.debug("We found explanation:", markerpresent)
                            if (typeof markerpresent[0] != 'undefined') {
                                // this is the texline below the original when a glossary word is missing
                                markerpresent[0].remove()
                            }
                            missingVerbsButton[0].style.visibility = "hidden"
                            missingVerbsButton[0].title = "";
                            toolTip = ""
                            panelTransMenu[0].style.backgroundColor = "green";
                        }
                    }
                    else {
                       // mypluralOriginal = await detailEditor.getElementsByClassName("source-string__plural")
                      // pluralOriginal = mypluralOriginal[0].querySelector(".original-raw")
                        textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                       // console.debug("detailEditor:",detailEditor)
                        
                        MutResult = await validate(locale, pluralOriginal.textContent, translation, locale, false, rowId, true)
                        if (MutResult.percent == 100) {
                            let markerpresent = leftPanel.getElementsByClassName("marker");
                            if (typeof markerpresent[0] != 'undefined') {
                                markerpresent[0].remove()
                            }
                            textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                            // console.debug("100%:", result)
                            // console.debug("myeditor_original:", myeditor_original)
                            // console.debug("preview_original:", preview_original)
                            if (myeditor_original != null && preview_original != null) {
                                myeditor_original.innerHTML = preview_original.innerHTML
                            }
                            //console.debug("editor_original:", myeditor_original.innerHTML)
                            // console.debug("preview_original:", preview_original.innerHTML)

                            //}
                            panelTransMenu[0].style.backgroundColor = "green";
                            remove_all_gloss(leftPanel, true)
                        }
                        else if (MutResult.percent == 0) {
                            //else if (valResult.percent == 0) {
                            console.debug(("wordcount:", MutResult.wordCount))
                            console.debug("We have 0%")
                        }
                        missingVerbsButton[0].style.visibility = "hidden"
                        missingVerbsButton[0].title = "";
                        toolTip = ""
                    }
                }
                else {
                    // console.debug("preview is null geen vertaling aanwezig")
                    missingVerbsButton[0].style.visibility = "hidden"
                    missingVerbsButton[0].title = "";
                    toolTip = ""
                }
            }
        }
    });
}