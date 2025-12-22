// This is the starting script for the addon

var glossary = [];
var glossary1 = [];
var db;
var dbDeepL;
var jsstoreCon;
var myGlotDictStat;
var interCept = false;
var strictValidation = true
var StartObserver = true;
var LocRecCout
var autoCopyClipBoard;
var LoadGloss;
var DispCount;
var is_pte;
var classToolTip;
var is_entry = false;
var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;


chrome.storage.local.get(null, function (items) {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith("glossary1"));
});
function savePage() {
    var currentUrl = window.location.href
    chrome.storage.local.set({
        lastPageVisited: currentUrl
    });
}
savePage()

if (typeof addon_translations == 'undefined') {
    var addon_translations = {}
}

async function loadTranslations(language) {
    try {
        const response = fetch(chrome.runtime.getURL(`locales/${language}.json`)); // No await yet
        const res = await response; // Await only when needed

        if (res.ok) {
            addon_translations = await res.json();
        } else {
            console.debug(`File not loaded: ${language} translations`);
        }
    } catch (error) {
        console.error(error);
    }
}

// Function to get the translated string
function __(key) {
    return addon_translations[key] || key; // Return the translation or the key if not found
}


async function initTranslations(event) {
    let userLang = checkLocale() || 'en-gb';
    if (typeof addon_translations.length == 'undefined') {
        await loadTranslations(userLang); // Load Dutch translations (or any other language)
    }
    else {
        console.debug("Language is already present")
    }
    await translatedButton()
}

// The below is necessary to get the focus into the editor if it is opened straight from the menu
function initTextareaDetection() {
    const observerConfig = { childList: true, subtree: true };

    const initialObserver = new MutationObserver((mutationsList, observer) => {
        const activeTextarea = document.querySelector(".textareas.active");
        if (activeTextarea) {
            observer.disconnect();
            waitForEditableTextarea(activeTextarea);
        }
    });

    initialObserver.observe(document.body, observerConfig);
}

function waitForEditableTextarea(container) {
    const observerConfig = { childList: true, subtree: true };

    const textareaObserver = new MutationObserver((mutations, observer) => {
        // Wait for the content-editable element or specific textarea element to appear inside
        const contentEditable = container.querySelector('[contenteditable="true"], textarea');
        if (contentEditable) {
            observer.disconnect();
            startFullScript([container]);
        }
    });

    textareaObserver.observe(container, observerConfig);

    // Fallback: just in case it’s already ready
    const fallback = container.querySelector('[contenteditable="true"], textarea');
    if (fallback) {
        textareaObserver.disconnect();
        startFullScript([container]);
    }
}

if (document.body) {
  initTextareaDetection();
} else {
  window.addEventListener('DOMContentLoaded', () => {
    initTextareaDetection();
  });
}


//initTextareaDetection();
function setupTooltipHandler() {
    document.addEventListener("mouseover", (event) => {
        const tooltip = document.querySelector(".ui-tooltip");

        // Only act if hovering over an element that has a tooltip
        if (event.target.closest(".has-tooltip") && tooltip) {
            tooltip.style.display = "block";
            setTimeout(() => {
                if (!tooltip.matches(":hover") && !event.target.matches(":hover") && !event.target.closest(".dropdown")) {
                    tooltip.style.display = "none";
                }
            }, 2000);
        }
    });


  document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r" && event.ctrlKey && event.shiftKey) {
    event.preventDefault();
    console.log("Starting tests (Ctrl + Shift + R)...");

    // Create and style the button
    const btn = document.createElement("button");
    btn.textContent = "Click to select test file";

    btn.style.position = "fixed";
    btn.style.top = "50%";
    btn.style.left = "50%";
    btn.style.transform = "translate(-50%, -50%)";
    btn.style.padding = "1rem 2rem";
    btn.style.fontSize = "1.2rem";
    btn.style.zIndex = "10000";
    btn.style.cursor = "pointer";
    btn.style.borderRadius = "8px";
    btn.style.border = "1px solid #333";
    btn.style.backgroundColor = "#eee";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

    // Add a close "X" button on top right corner of the button
    const closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "2px";
    closeBtn.style.right = "6px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontSize = "1.2rem";
    closeBtn.style.userSelect = "none";
    closeBtn.title = "Close";

    // Wrapper for button and close btn to position closeBtn properly
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "50%";
    wrapper.style.left = "50%";
    wrapper.style.transform = "translate(-50%, -50%)";
    wrapper.style.zIndex = "10000";
    wrapper.style.display = "inline-block";

    btn.style.position = "relative"; // so closeBtn positions inside btn

    closeBtn.onclick = () => {
      wrapper.remove();
    };

    btn.onclick = () => {
      loadTestsFromFile();
      wrapper.remove();
    };

    wrapper.appendChild(btn);
    btn.appendChild(closeBtn);
    document.body.appendChild(wrapper);
  }
});



    document.addEventListener("mouseout", (event) => {
        const tooltip = document.querySelector(".ui-tooltip");

        // Only act if the mouse left a tooltip-related element and not a dropdown
        if (tooltip && !event.relatedTarget?.closest(".ui-tooltip") && !event.relatedTarget?.closest(".has-tooltip") && !event.relatedTarget?.closest(".dropdown")) {
            tooltip.style.display = "none";
            tooltip.style.position = "";
            tooltip.style.background = "transparent";
            tooltip.style.border = "none";
            tooltip.style.boxShadow = "none";
            tooltip.style.left = "";
            tooltip.style.top = "";
            tooltip.innerHTML = "";

            if (tooltip.parentElement) {
                tooltip.parentElement.style.position = "";
            }

            tooltip.remove();
        }
    });
}
function extractIdPart(idString) {
    const match = idString.match(/^translation_(.+)$/);
    return match ? match[1] : null;
}

function findEditorRow(textareaElem) {
    return textareaElem.closest('tr.editor');
}

async function startFullScript(textarea) {
    var rowId = 0
    var myEditor = ""
    currWindow = window.self;
    initTranslations();
    mytextarea = textarea[0].firstChild.nextElementSibling;
    myEditor = findEditorRow(mytextarea)
    rowId = await myEditor ? myEditor.getAttribute('row') : null;
    
    start_editor_mutation_server(textarea, "Details", "");
    pluralpresent = document.querySelector(`#editor-${rowId} div.textareas[data-plural-index="1"]`)
    if (pluralpresent != null) {
        let pluralTextarea = pluralpresent.querySelector('textarea')
        start_editor_mutation_server2(pluralTextarea, "Details", "");
    } 
    mytextarea.style.display = 'block';
    mytextarea.style.visibility = 'visible';
    mytextarea.disabled = false;
    mytextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mytextarea.focus();
    adjustLayoutScreen();
    setupTooltipHandler();
    // This needs to be called to get buttons in the first record when directly opened from the table
     addTranslateButtons(rowId)
    const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0
    });
   
    mytextarea.dispatchEvent(clickEvent);
    

    const myCustomEvent = new CustomEvent('myCustomEvent', {
        detail: { message: 'This is a custom event!' }
    });

    let is_loaded = await loadGlossaries(myCustomEvent);

    if (is_loaded === "success") {
        doValidation();
    } else {
        cuteAlert({
            type: "question",
            title: __("Glossary not loaded"),
            message: __("One of the glossaries is not loaded! Do you want to continue?"),
            confirmText: "Confirm",
            cancelText: "Cancel",
            myWindow: currWindow
        }).then((e) => {
            if (e === "confirm") {
                doValidation();
            } else {
                messageBox("info", __("Validate page aborted"));
            }
        });
    }
}
function doValidation() {
    chrome.storage.local.get(["showHistory", "destlang", "showTransDiff", "DefGlossary"], function (data) {
        if (data.showHistory != "null") {
            let locale = checkLocale();
            validatePage(data.destlang, data.showHistory, locale, data.showTransDiff, data.DefGlossary);
            if (data.showHistory === true) {
                const currentURL = window.location.href;
                if (!currentURL.includes("untranslated") && !check_untranslated()) {
                    validateOld(data.showTransDiff);
                }
            }
        }
    });
}

// Function to send a message to the injected script
function sendMessageToInjectedScript(message) {
    window.postMessage(message, '*');
}


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
var locale = checkLocale()
var showGlosLine;

gd_wait_table_alter();


addCheckBox();
exportGlossaryForOpenAi(locale)

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
                is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
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
        chrome.storage.local.get(["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"],
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
                        let errMessage = __("No file selected")
                        messageBox(info, errMessage)
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
            chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyClaude", "OpenAIPrompt", "ClaudePrompt" ,"OpenAISelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss"], function (data) {

            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined') {
                    if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                        if (data.transsel != "undefined") {
                            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                            convertToLow = data.convertToLower;
                            var DeeplFree = data.DeeplFree;

                            result = populateWithLocal(data.apikey, data.apikeyDeepl, data.apikeyDeepSeek, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree);
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
                            result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, TMwait, data.spellCheckIgnore, TMtreshold, interCept);
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
        // Use chrome.local.get to retrieve the value
        interCept = localStorage.getItem("interXHR");

        // Check if the value exists and is either "true" or "false"
        if (interCept === null || (interCept !== "true" && interCept !== "false")) {
            // If the value is not present or not a valid boolean value, set it to false
            interCept = false;
            localStorage.setItem("interXHR", interCept);
        }
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
    };

    if (event.altKey && event.shiftKey && (event.key === "F9")) {
        event.preventDefault();
        SwitchTMClicked();
    };

    if (event.altKey && event.shiftKey && (event.key === "F10")) {
        event.preventDefault();
        //$(document).ready(function () {
        var mysimple = window['wpgpt_load_history_status'];
        alert("Editor options:" + mysimple)
        // })

    };

    if (event.altKey && event.shiftKey && (event.key === "F11")) {
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
                        var ld_glossary = csvParser(contents)
                        chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                            //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                            var formal = checkFormal(false);
                            var DeeplFree = data.DeeplFree;
                            load_glossary(ld_glossary, data.apikeyDeepl, DeeplFree, data.destlang)
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
                let errMessage = __("File is not a csv!")
                messageBox("error", errMessage);
            }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "D" || event.key === "d")) {
        //event.preventDefault();

        chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
            var formal = checkFormal(false);
            var DeeplFree = data.DeeplFree;
            show_glossary(data.apikeyDeepl, DeeplFree, data.destlang)
        });
    }
    if (event.altKey && event.shiftKey && (event.key === "A" || event.key === "a")) {
        event.preventDefault();

        let rowId = document.querySelector("#editor");
        
        //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
        // So that needs to be added to the base rowId to find it
        if (typeof myrowId != "undefined" && myrowId != "translation") {
            newrowId = rowId.concat("-", myrowId);
            rowId = newrowId;
        }
        chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyClaude", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore"], function (data) {
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


// PSS added this one to be able to see if the Details button is clicked
// 16-06-2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
const el = document.getElementById("translations");
if (el != null) {
    el.addEventListener("click", (event) => {
        checkbuttonClick(event);
    });
}

const el3 = document.getElementById("translations");
if (el3 != null) {
    el3.addEventListener("click", checkactionClick());
}

//Add option link
let optionlink = document.createElement("li");
var a = document.createElement('a');
a.href = "#"
//a.href = chrome.runtime.getURL('wptf-options.html');
let link = document.createTextNode("WPTF options");
a.id = "openOptionsLink"
a.appendChild(link);
optionlink.className = 'menu-item wptf_settings_menu'

let databaselink = document.createElement("li");
var b = document.createElement('a');
b.href = "#"
//b.target = "_self";
link = document.createTextNode("WPTF database");
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


function openOptionsPage(event) {
    const url = chrome.runtime.getURL("wptf-options.html");
    window.open(url)
}

// Example: Listen for clicks on a link to trigger opening the modal
document.addEventListener('click', function (event) {
    // Check if the clicked element is the link that should open the modal
    if (event.target.id == 'openModalLink') {
        // Prevent the default action of the link
        event.preventDefault();
        // Create and open the modal
        createAndOpenModal();
    }
    else if (event.target.id == 'openOptionsLink') {
        // Prevent the default action of the link
        event.preventDefault();
        // Create and open the modal
        openOptionsPage();
    }
});

async function translatedButton() {
    //Add translate button - start
    let transContainer = document.createElement("div")
    transContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This function translates the table with translations from the API")
    let translateButton = document.createElement("a");
    translateButton.href = "#";
    translateButton.style.visibility = 'hidden'
    //translateButton.ID = 'Translate'
    translateButton.className = "translation-filler-button";
    translateButton.onclick = translatePageClicked;
    translateButton.innerText = __('Translate');
    transContainer.appendChild(translateButton)
    transContainer.appendChild(classToolTip)

    let divPaging = document.querySelector("div.paging");
    // 1-05-2021 PSS fix for issue #75 do not show the buttons on project page
    let divProjects = document.querySelector("div.projects");

    //12-05-2022 PSS added a new button for local translate
    let localtransContainer = document.createElement("div")
    localtransContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This function populates the table with translations from the local database")

    let localtransButton = document.createElement("a");
    localtransButton.href = "#";
    localtransButton.style.visible= 'hidden'
    localtransButton.className = "local-trans-button";
    localtransButton.onclick = localTransClicked;
    localtransButton.innerText = __("Local");
    localtransContainer.appendChild(localtransButton)
    localtransContainer.appendChild(classToolTip)

    //12-05-2022 PSS added a new button for local translate
    let TmContainer = document.createElement("div")
    TmContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button starts fetching existing translations from translation memory")
    //let TM = localStorage.getItem(['switchTM']);
    let tmtransButton = document.createElement("a");
    tmtransButton.href = "#";
    tmtransButton.style.visible = 'hidden'
    //if (TM == "false") {
    tmtransButton.className = "tm-trans-button";
    //}
    //else {
    //   tmtransButton.className = "tm-trans-button foreighn"
    //}
    tmtransButton.onclick = tmTransClicked;
    chrome.storage.local.get('TMtreshold', function (result) {
        treshold = result.TMtreshold; // Assign the value to the global variable
        tmtransButton.innerText = "TM " + treshold + "%";
    });
    //tmtransButton.innerText = "TM " +treshold;
    TmContainer.appendChild(tmtransButton)
    TmContainer.appendChild(classToolTip)

    //12-05-2022 PSS added a new button for local translate
    let TmDisableContainer = document.createElement("div")
    TmDisableContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button disables fetching existing translations from translation memory")

    // Use chrome.local.get to retrieve the value
    interCept = localStorage.getItem("interXHR");

    // Check if the value exists and is either "true" or "false"
    if (interCept === null || (interCept !== "true" && interCept !== "false")) {
        // If the value is not present or not a valid boolean value, set it to false
        interCept = false;
        localStorage.setItem("interXHR", interCept);
    }

    let tmDisableButton = document.createElement("a");
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
    tmDisableButton.innerText = __("Disable machine");
    TmDisableContainer.appendChild(tmDisableButton)
    TmDisableContainer.appendChild(classToolTip)

    //23-03-2021 PSS added a new button on first page
    let checkContainer = document.createElement("div")
    checkContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This function checks the page for missing verbs and if set starts spellchecking")

    let checkButton = document.createElement("a");
    checkButton.href = "#";
    checkButton.style.visibility= 'hidden'
    checkButton.className = "check_translation-button";
    checkButton.onclick = checkPageClicked;
    checkButton.innerText = __("CheckPage");
    checkContainer.appendChild(checkButton)
    checkContainer.appendChild(classToolTip)


    //23-03-2021 PSS added a new button on first page
    let implocContainer = document.createElement("div")
    implocContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button starts the import of a local po file containing translations into the current table")
    let impLocButton = document.createElement("a");
    impLocButton.href = "#";
    impLocButton.style = 'hidden'
    impLocButton.className = "impLoc-button";
    impLocButton.onclick = impFileClicked;
    impLocButton.innerText = __("Imp localfile");
    implocContainer.appendChild(impLocButton)
    implocContainer.appendChild(classToolTip)


    //23-03-2021 PSS added a new button on first page
    let implocDatabaseContainer = document.createElement("div")
    implocDatabaseContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button converts po and inserts to local database")
    let impDatabaseButton = document.createElement("a");
    impDatabaseButton.href = "#";
    impDatabaseButton.style.visibility = 'hidden'
    impDatabaseButton.className = "convLoc-button";
    impDatabaseButton.onclick = impLocDataseClicked;
    impDatabaseButton.innerText = __("Conv po DB");
    implocDatabaseContainer.appendChild(impDatabaseButton)
    implocDatabaseContainer.appendChild(classToolTip)

    //23-03-2021 PSS added a new button on first page
    let checkAllContainer = document.createElement("div")
    checkAllContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button selects all records")
    let checkAllButton = document.createElement("a");
    checkAllButton.href = "#";
    checkAllButton.style.visible = 'hidden'
    checkAllButton.className = "selectAll-button";
    checkAllButton.onclick = setmyCheckBox;
    checkAllButton.innerText = __("Select all");
    checkAllContainer.appendChild(checkAllButton)
    checkAllContainer.appendChild(classToolTip)
   
    //07-05-2021 PSS added a export button on first page
    let exportContainer = document.createElement("div")
    exportContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button starts the export of the local database")

    let exportButton = document.createElement("a");
    exportButton.href = "#";
    exportButton.style.visibility = 'hidden'
    exportButton.className = "export_translation-button";
    exportButton.onclick = exportPageClicked;
    exportButton.innerText = __("Export");
    exportContainer.appendChild(exportButton)
    exportContainer.appendChild(classToolTip)    


    let exportPoContainer = document.createElement("div")
    exportPoContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button starts the export of the local database to a .po file")

    let exportPoButton = document.createElement("a");
    exportPoButton.href = "#";
    exportPoButton.style.visible = 'hidden'
    exportPoButton.className = "export_translation-po-button";
    exportPoButton.onclick = exportPoClicked;
    exportPoButton.innerText = __("ExportPo");
    exportPoContainer.appendChild(exportPoButton)
    exportPoContainer.appendChild(classToolTip)


    //07-05-2021 PSS added a import button on first page
    let importContainer = document.createElement("div")
    importContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This button starts the import of a local file into the local database")
    let importButton = document.createElement("a");
    importButton.href = "#";
    importButton.style.visible = 'hidden'
    importButton.id = "ImportDb";
    //importButton.type = "file";
    //importButton.style="display: none";
    importButton.className = "import_translation-button";
    importButton.onclick = importPageClicked;
    importButton.innerText = __("Import");
    importContainer.appendChild(importButton)
    importContainer.appendChild(classToolTip)



    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    if (is_pte) {
        //07-05-2021 PSS added a bulksave button on first page
        var bulksaveContainer = document.createElement("div")
        bulksaveContainer.className = 'button-tooltip'
        classToolTip = document.createElement("span")
        classToolTip.className = 'tooltiptext'
        classToolTip.innerText = __("This is the function to save all suggestions selected in bulk")

        let bulksaveButton = document.createElement("a");
        bulksaveButton.href = "#";
        bulksaveButton.id = "BulkSave";
        bulksaveButton.className = "bulksave-button";
        bulksaveButton.onclick = startBulkSave;
        bulksaveButton.innerText = __("Bulksave");
        bulksaveContainer.appendChild(bulksaveButton)
        bulksaveContainer.appendChild(classToolTip)
    }

    //07-05-2021 PSS added a bulk save for existing translations into the local database
    let bulktolocContainer = document.createElement("div")
    bulktolocContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This is the function to populate the local database with selected items")

    let bulktolocalButton = document.createElement("a");
    bulktolocalButton.href = "#";
    bulktolocalButton.style.visible = 'hidden'
    bulktolocalButton.id = "BulkSave";
    bulktolocalButton.className = "save_tolocal-button";
    bulktolocalButton.onclick = savetolocalClicked;
    bulktolocalButton.innerText = __("Bulk local");
    bulktolocContainer.appendChild(bulktolocalButton)
    bulktolocContainer.appendChild(classToolTip)


     //07-05-2021 PSS added a copy original button
    let copyOrgContainer = document.createElement("div")
    copyOrgContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This is the function to copy originals  with selected items")

    let copyOrgButton = document.createElement("a");
    copyOrgButton.href = "#";
    copyOrgButton.style.visible = 'hidden'
    copyOrgButton.id = "CopyOrig";
    copyOrgButton.className = "copy_org-button";
    copyOrgButton.onclick = copyOrgClicked;
    copyOrgButton.innerText = __("Copy orig");
    copyOrgContainer.appendChild(copyOrgButton)
    copyOrgContainer.appendChild(classToolTip)


   

    let compairContainer = document.createElement("div")
    compairContainer.className = 'button-tooltip'
    classToolTip = document.createElement("span")
    classToolTip.className = 'tooltiptext'
    classToolTip.innerText = __("This is the function to compair the suggestion with the local entry")

    let compairButton = document.createElement("a");
    compairButton.href = "#";
    compairButton.style.visible = 'hidden'
    compairButton.id = "Compair";
    compairButton.className = "compair-button";
    compairButton.onclick = compairClicked;
    compairButton.innerText = __("Compair");
    compairContainer.appendChild(compairButton)
    compairContainer.appendChild(classToolTip)


    let statsContainer = document.createElement("div")

    // add stats button if handleStats function is defined

    if (typeof handleStats === "function") {

        statsContainer.className = 'button-tooltip'
        classToolTip = document.createElement("span")
        classToolTip.className = 'tooltiptext'
        classToolTip.innerText = __("This button starts fetching statistics of translations")
        var statsButton = document.createElement("a");
        statsButton.href = "#";
        statsButton.id = "statsButton";
        statsButton.className = "stats-button";
        statsButton.onclick = handleStats;
        statsButton.innerText = __("Stats");
        statsContainer.appendChild(statsButton)
        statsContainer.appendChild(classToolTip)
    }

    // here we add all buttons at once and make them viv
    requestAnimationFrame(() => {
        checkButton.style.visibility = 'visible'
        impLocButton.style = 'visible'
        impDatabaseButton.style.visibility = 'visible'
        checkAllButton.style.visible = 'visible'
        exportButton.style.visibility = 'visible'
        exportPoButton.style.visible = 'visible'
        importButton.style.visible = 'visible'
        bulktolocalButton.style.visible = 'visible'
        tmtransButton.style.visible = 'visible'
        localtransButton.style.visible = 'visible'
        translateButton.style.visibility = 'visible'
        copyOrgButton.style.visibility = 'visible'
        compairButton.style.visibility = 'visible'

    });

    let divGpActions = document.querySelector("div.paging");
    let wptfNavBar = document.createElement("div");
    let wptfNavBarCont = document.createElement("div");
    wptfNavBarCont.className = 'wptfNavBarCont'
    wptfNavBar.appendChild(wptfNavBarCont);
    wptfNavBar.className = "wptfNavBar";
    wptfNavBar.id = "wptfNavBar";
    if (divPaging != null && divProjects == null) {
        divGpActions.parentNode.insertBefore(wptfNavBar, divGpActions);
        let divNavBar = document.querySelector("div.wptfNavBarCont")
        
        if (is_pte) {
            divNavBar.appendChild(bulksaveContainer);
        }
        divNavBar.appendChild(copyOrgContainer);
        if (statsContainer != null) {
            divNavBar.appendChild(statsContainer);
        }
        if (!is_pte) {
            divNavBar.appendChild(checkAllContainer);
        }
        divNavBar.appendChild(importContainer);
        divNavBar.appendChild(exportContainer);
        // divNavBar.appendChild(exportButton);
        divNavBar.appendChild(exportPoContainer);
        divNavBar.appendChild(implocDatabaseContainer);
        divNavBar.appendChild(bulktolocContainer);
        //  divNavBar.appendChild(bulktolocalButton);
        divNavBar.appendChild(implocContainer);
        // divNavBar.appendChild(impLocButton);
        // divNavBar.appendChild(checkButton);
        divNavBar.appendChild(checkContainer);
        divNavBar.appendChild(compairContainer);
        // divNavBar.appendChild(tmtransButton);
        divNavBar.appendChild(TmContainer);
        divNavBar.appendChild(localtransContainer);
        //divNavBar.appendChild(localtransButton);
        divNavBar.appendChild(transContainer);

    }

    //12-05-2022 PSS added a new buttons specials
    let UpperCaseButton = document.createElement("a");
    UpperCaseButton.href = "#";
    UpperCaseButton.onclick = UpperCaseClicked;
    UpperCaseButton.innerText = __("Casing");

    let SwitchGlossButton = document.createElement("a");
    SwitchGlossButton.href = "#";
    SwitchGlossButton.style.visibility = 'hidden'
    SwitchGlossButton.onclick = SwitchGlossClicked;
    SwitchGlossButton.className = "Switch-Gloss-button";

    chrome.storage.local.get("DefGlossary").then((res) => {
        if (res.DefGlossary == true) {
            SwitchGlossButton.innerText = __("DefGlos");
            SwitchGlossButton.style.background = "green"
            SwitchGlossButton.style.color = "white"
        }
        else {
            SwitchGlossButton.innerText = "SecGlos";
            SwitchGlossButton.style.background = "orange"
        }
    });
    
    let SwitchTMButton = document.createElement("a");
    SwitchTMButton.href = "#";
    SwitchTMButton.style.visibility = 'hidden'
    SwitchTMButton.className = "Switch-TM-button";
    SwitchTMButton.onclick = SwitchTMClicked;
    SwitchTMButton.innerText = __("SwitchTM");
    let TM = localStorage.getItem(['switchTM']);
    if (TM == "true") {
        SwitchTMButton.style.background = "red"
        SwitchTMButton.style.color = "white"
    }
    else {
        SwitchTMButton.style.background = "green"
        SwitchTMButton.style.color = "white"
    }

    let FindDupButton = document.createElement("a");
    FindDupButton.href = "#";
    FindDupButton.style.visibility = 'hidden'
    FindDupButton.className = "Find-Dup-button";
    FindDupButton.onclick = FindDupClicked;
    FindDupButton.innerText = __("FindDup");
    

    // We need to check if we have a glossary ID

    LoadGloss = document.createElement("a");
    LoadGloss.href = "#";
    //LoadGloss.onclick = LoadGlossClicked;
    LoadGloss.innerText = __("GlossStatus");


    let DispGloss = document.createElement("a");
    DispGloss.href = "#";
    DispGloss.style.visibility = 'hidden'
    DispGloss.className = "DispGloss-button";
    DispGloss.onclick = DispGlossClicked;
    DispGloss.innerText = __("DispGloss");
    
    let DispClipboard = document.createElement("a");
    DispClipboard.href = "#";
    DispClipboard.style.visibility = 'hidden'
    DispClipboard.className = "DispClipboard-button";
    DispClipboard.onclick = DispClipboardClicked;
    DispClipboard.innerText = __("ClipBoard");
    chrome.storage.local.get('autoCopyClip', async function (result) {
        if (result.autoCopyClip == true) {
            DispClipboard.style.background = "red"
            DispClipboard.style.color = "white"
        }
        else {
            DispClipboard.style.background = "green"
            DispClipboard.style.color = "white"
        }
    });


    let WikiLink = document.createElement("a");
    WikiLink.href = 'https://github.com/vibgyj/WPTranslationFiller/wiki'
    WikiLink.innerText = __("WPTF Docs")
    WikiLink.className = 'menu-item-wptf_wiki'

    // Create a <select> element
    let dropdown = document.createElement("select");
    dropdown.name = "WPTF_select"
    // Add a default option (always visible, not selectable)
    let defaultOption = document.createElement("option");
    defaultOption.textContent = "DeepL";
    defaultOption.value = "";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    dropdown.appendChild(defaultOption);

    // Add actual options
    let options = [__("DispGloss"), __("LoadGloss"), __("EditGloss"), __("Upload"), __("DeleteAll")];
    options.forEach(optionText => {
        let option = document.createElement("option");
        option.value = optionText.toLowerCase().replace(/\s+/g, "-");
        option.textContent = optionText;
        dropdown.appendChild(option);
    });

    // Function to handle selection
    function handleSelectionChange(event) {
        let selectedIndex = event.target.selectedIndex; // Get the index
        if (selectedIndex > 0) { // Ignore default option (index 0)
            myFunction(selectedIndex);
        }

        // Reset dropdown to default option
        setTimeout(() => {
            dropdown.selectedIndex = 0;
        }, 100); // Short delay before reset
    }

    // Add event listener
    dropdown.addEventListener("change", handleSelectionChange);
    window.addEventListener("click", function (event) {
        let modal = document.getElementById("glossaryModal");
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
    document.getElementById('add-record')?.addEventListener('click', function () {
        let locale = checkLocale();
        mylocale = locale.toUpperCase();
        const newRecord = {
            locale: mylocale,
            original: 'original',
            translation: 'origineel'
        };
        chrome.runtime.sendMessage({ action: 'addGlossaryRecord', record: newRecord }, function (response) {
            if (response.success) {
                getGlossary(); // Reload the table with the updated records
            }
        });
    });

    function myFunction(index) {
        if (index == 1) {
            DispGlossClicked()
        }
        else if (index == 2) {
            LoadGlossClicked(index)
        }
        else if (index == 3) {
            openModalDeepL()

        }
        else if (index == 4) {
            chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                let language = checkLocale()
                loadGlossaryFromDB(data.apikeyDeepl, data.DeeplFree, language)
            })
        }
        else {
            chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                delete_all_glossary(data.apikeyDeepl, data.DeeplFree)
            })
        }
    }

    // 12-05-2022 PSS here we add all buttons in the pagina together
    let GpSpecials = document.querySelector("span.previous.disabled");
    if (GpSpecials == null) {
        GpSpecials = document.querySelector("a.previous");
    }
    if (GpSpecials != null && divProjects == null) {
        divPaging.insertBefore(WikiLink, divPaging.childNodes[0]);
        divPaging.insertBefore(UpperCaseButton, divPaging.childNodes[0]);
        divPaging.insertBefore(SwitchGlossButton, divPaging.childNodes[0]);
        divPaging.insertBefore(tmDisableButton, divPaging.childNodes[0]);
        divPaging.insertBefore(SwitchTMButton, divPaging.childNodes[0]);
        chrome.storage.local.get(["apikeyDeepl"], function (data) {
            //let apikey=data.apikeyDeepl
            if (data.apikeyDeepl != null && data.apikeyDeepl != "" && typeof data.apikeyDeepl != 'undefined') {
                divPaging.insertBefore(LoadGloss, divPaging.childNodes[0]);
                //   divPaging.insertBefore(DispGloss, divPaging.childNodes[0]);
                glossloaded = checkGlossary(LoadGloss)
                divPaging.insertBefore(dropdown, divPaging.childNodes[0])

            }
        });
        // divPaging.insertBefore(dropdown,divPaging.childNodes[0])
        divPaging.insertBefore(FindDupButton, divPaging.childNodes[0]);
        divPaging.insertBefore(DispClipboard, divPaging.childNodes[0]);
        UpperCase = localStorage.getItem(['switchUpper'])
        if (UpperCase == 'false') {
            UpperCaseButton.className = "UpperCase-button";
        }
        else {
            UpperCaseButton.className = "UpperCase-button uppercase"
        }
    }
    requestAnimationFrame(() => {
        SwitchGlossButton.style.visibility = 'visible'
        SwitchTMButton.style.visibility = 'visible'
        DispGloss.style.visibility = 'visible'
        DispClipboard.style.visibility = 'visible'
        FindDupButton.style.visibility = 'visible'
    })
}



async function checkGlossary(event) {
    let glos_isloaded = await localStorage.getItem(['deeplGlossary']);
    if (glos_isloaded == null || glos_isloaded == "") {
        LoadGloss.className = "LoadGloss-button-red";
    } else {
        LoadGloss.className = "LoadGloss-button-green"
    }
}

function openModalDeepL(event) {
    openDeeplModal()
    // injectDeepLModal(); // Call the function to inject the modal
}

function DispGlossClicked(event) {
    // function to show glossary
    chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
        var formal = checkFormal(false);
        let DeeplFree = data.DeeplFree;
        show_glossary(data.apikeyDeepl, DeeplFree, data.destlang)
    });
}
async function FindDupClicked(event) {
    await findDuplicates()
     await hideNonDuplicates();
}
function DispClipboardClicked(event) {
    // function to show glossary
    chrome.storage.local.get('autoCopyClip', async function (result) {
        autoCopyClipBoard = result.autoCopyClip; // Assign the value to the global variable
        //console.debug("result autoclip:",autoCopyClipBoard)
        // we get a sting so make it a boolean
        if (autoCopyClipBoard == true) {
            autoCopyClipBoard = false
            chrome.storage.local.set({
                autoCopyClip: autoCopyClipBoard
            });
            DispClipboard.style.background = "green"
            DispClipboard.style.color = "white"
            let errMessage = __("Auto copy to clipboard switched off")
            messageBox('info', errMessage)
        }
        else {
            autoCopyClipBoard = true
            chrome.storage.local.set({
                autoCopyClip: autoCopyClipBoard
            });
            DispClipboard.style.background = "red"
            let errMessage = __("Auto copy to clipboard switched on");
            messageBox('info', errMessage);
        }
    });
}

function LoadGlossClicked(event) {
    //event.preventDefault(event);
    var file;
    fileSelector.click();
    //fileSelector.addEventListener("change", () => console.debug("Event triggered"));
    fileSelector.addEventListener("change", (event) => {
        // event.preventDefault();
        file = event.target.files[0];
        fileList = event.target.files;
        if (!file) return;
        if (file.type == 'text/csv' || "application/vnd.ms-excel") {
            if (file) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var contents = e.target.result;
                    var ld_glossary = csvParser(contents)
                    chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                        //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                        var formal = checkFormal(false);
                        var DeeplFree = data.DeeplFree;
                        load_glossary(ld_glossary, data.apikeyDeepl, DeeplFree, data.destlang)
                    });
                    reader.onerror = function () {
                        console.debug(reader.error);
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
            let errMessage = __("File is not a csv!")
            messageBox("error", "File is not a csv!");
        }
        // we need to clear this value otherwise the same file is not processed
        event.target.value = ""
        file = "";
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
            toastbox("info", __("Switching Glossary to second"), "2500", __("Glossary switch"));
            chrome.storage.local.set({ DefGlossary: false });
        }
        else {
            toastbox("info", __("Switching Glossary to default"), "2500", __("Glossary switch"));
            chrome.storage.local.set({ DefGlossary: true });
        }
        location.reload();
    });

}

function SwitchTMClicked(event) {
    event.preventDefault();

    const formal = checkFormal(false);
    const currentSwitch = localStorage.getItem("switchTM") === "true";

    // Debug logging
    console.debug("formal:", formal, "currentSwitch:", currentSwitch);

    // Flip the switch
    const newSwitch = !currentSwitch;
    localStorage.setItem("switchTM", newSwitch.toString());

    // Set message based on the state you're switching TO
    const message = newSwitch
        ? __("Switching TM to foreign")
        : __("Switching TM to local");

    toastbox("info", message, "4500", "TM switch");
    location.reload();
}


function tmDisableClicked(event) {
    event.preventDefault(event);
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

async function startSpellCheck(LtKey, LtUser, LtLang, LtFree, spellcheckIgnore) {
    await spellcheck_page(LtKey, LtUser, LtLang, LtFree, spellcheckIgnore)
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

async function myDeepLDB(dbDeepL) {
    dbDeepLOpen = await openDeepLDatabase(dbDeepL)
    return dbDeepLOpen
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


async function compairClicked(event) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var formal = checkFormal(false);
    chrome.storage.local.get(["convertToLower", "spellCheckIgnore", "formal","destlang"], function (data) {

        compairWithSuggestion(is_pte, data.convertToLower, data.spellCheckIgnore, data.destlang)
    });
}

async function copyOrgClicked(event) {
    await copyOrgRecords()
}

// 12-05-2022 PSS addid this function to start translating from translation memory button
function tmTransClicked(event) {
    event.preventDefault();
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyClaude", "OpenAIPrompt", "ClaudePrompt" ,"OpenAISelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss", "TMtreshold","ClaudModel"], function (data) {
       
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined') {

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
                        result = populateWithTM(data.apikey, data.apikeyDeep, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, TMwait, data.postTranslationReplace, data.preTranslationReplace, data.convertToLower, data.spellCheckIgnore, data.TMtreshold, interCept);
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
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyClaude", "OpenAIPrompt", "ClaudePrompt" ,"OpenAISelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss","ClaudModel"], function (data) {
       
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined') {

                if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                    if (data.transsel != "undefined") {
                        //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
                        var formal = checkFormal(false);
                        //var locale = checkLocale();
                        convertToLow = data.convertToLower;
                        var DeeplFree = data.DeeplFree;
                        let OpenAItemp = parseFloat(data.OpenAItemp);
                        //console.debug("localTrans:", data.OpenAiGloss)
                        myGlossary = data.OpenAiGloss
                        result = populateWithLocal(data.apikey, data.apikeyDeepl, data.apikeyDeepSeek, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, DeeplFree, data.apikeyOpenAI, data.OpenAIPrompt, data.OpenAISelect, data.OpenAITone, OpenAItemp, data.apikeyClaude, data.ClaudePrompt, myGlossary, data.ClaudModel);
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
            let allrows = [];
            let myrows = [];
            var myFile;
            var pretrans;
            var transtype;
            toastbox("info", "Select file is started", "2000", "Select po file");
            let input = document.createElement('input');
            input.type = 'file';
            input.onchange = _this => {
                let files = Array.from(input.files);
                //   console.log(files);
                if (files && files[0]) {
                    myFile = files[0];
                    let reader = new FileReader();
                    reader.addEventListener('load', function (e) {
                        //output.textContent = e.target.result;
                        myrows = e.target.result.replace(/\r/g, "").split(/\n/);
                        // allrows = e.target.result.split(/\r|\n/);
                        // remove all unnessesary lines as those will take time to process
                        let regel = '';
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
                    let errMessage = __("No file selected");
                    messageBox("info", errMessage);
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
            let allrows = [];
            let myrows = [];
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
                    let reader = new FileReader();
                    reader.addEventListener('load', function (e) {
                        //output.textContent = e.target.result;
                        myrows = e.target.result.replace(/\r/g, "").split(/\n/);
                        // allrows = e.target.result.split(/\r|\n/);
                        // remove all unnessesary lines as those will take time to process
                        let regel = '';
                        for (var i = 0; i < myrows.length - 1; i++) {
                            regel = myrows[i];
                            if (regel.startsWith("msgid") || regel.startsWith("msgstr") || regel.startsWith("msgctxt") || regel.startsWith("msgid_plural") || regel.startsWith("msgstr[0]") || regel.startsWith("msgstr[1]")) {
                                allrows.push(regel);
                            }
                        }
                        countimported = new_import_po(data.destlang, myFile, allrows);
                        let errMessage = __("Records imported: ")
                        messageBox("info", errMessage + countimported)

                    });
                    reader.readAsText(myFile);
                }
                else {
                    let errMessage = __("No file selected")
                    messageBox("info", errMessage)
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
        ["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyMicrosoft", "apikeyOpenAI", "apikeyClaude", "apikeyTranslateio", "OpenAIPrompt", "ClaudePrompt", "OpenAISelect", "OpenAItemp", "OpenAIWait", "DeepLWait", "OpenAITone", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss","ClaudModel", "apikeyOllama","LocalOllama", "ollamaModel","ollamaPrompt"],
        function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined') {
                if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
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
                        // OpenAiGloss is populated from the DeepL glossary within indexedDB
                        OpenAiGloss = data.OpenAiGloss;
    
                        translatePage(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.apikeyOpenAI, data.apikeyClaude, data.apikeyDeepSeek, data.apikeyTranslateio, data.OpenAIPrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, data.DeeplFree, translationComplete, data.OpenAISelect, openAIWait, OpenAItemp, data.spellCheckIgnore, deeplGlossary, OpenAITone, data.DeepLWait, OpenAiGloss, data.ClaudePrompt,data.ClaudModel,data.apikeyOllama,data.LocalOllama, data.ollamaModel, data.ollamaPrompt);
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


function checkFormal(formal) {
    const locString = window.location.href;
    formal = (!locString.includes("default"));
    return formal
}

async function checkPageClicked(event) {
    event.preventDefault();
    var formal = checkFormal(false);
    chrome.storage.local.get(
        ["apikey", "apikeyOpenAI", "destlang", "transsel", "postTranslationReplace", "preTranslationReplace", "LtKey", "LtUser", "LtLang", "LtFree", "Auto_spellcheck", "spellCheckIgnore", "OpenAIPrompt", "reviewPrompt", "Auto_review_OpenAI", "postTranslationReplace", "preTranslationReplace", "convertToLower", "showHistory", "showTransDiff"],
        async function (data) {
            try {
                await checkPage(data.postTranslationReplace, formal, data.destlang, data.apikeyOpenAI);
                if (data.Auto_spellcheck == true) {
                    await startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
                }
            } catch (error) {
                console.error("An error occurred:", error);
            }
        }
    );
}

function exportPageClicked(event) {
    event.preventDefault();
    chrome.storage.local.get(
        ["apikey", "destlang"],
        function (data) {
            // Run the export function
            dbExport(data.destlang);
        }
    );
    // res= dbExport();
}

function exportPoClicked(event) {
    event.preventDefault();
    chrome.storage.local.get(
        ["apikey", "destlang"],
        function (data) {
            // Run the export function
            exportIndexedDBToPO(data.destlang);
        }
    );
    // res= dbExport();
}


// Wrap chrome.storage.local.get in a Promise
function getGlossaryData() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([
            "glossary", "glossaryA", "glossaryB", "glossaryC", "glossaryD",
            "glossaryE", "glossaryF", "glossaryG", "glossaryH", "glossaryI",
            "glossaryJ", "glossaryK", "glossaryL", "glossaryM", "glossaryN",
            "glossaryO", "glossaryP", "glossaryQ", "glossaryR", "glossaryS",
            "glossaryT", "glossaryU", "glossaryV", "glossaryW", "glossaryX",
            "glossaryY", "glossaryZ",
            "glossary1", "glossary1A", "glossary1B", "glossary1C", "glossary1D",
            "glossary1E", "glossary1F", "glossary1G", "glossary1H", "glossary1I",
            "glossary1J", "glossary1K", "glossary1L", "glossary1M", "glossary1N",
            "glossary1O", "glossary1P", "glossary1Q", "glossary1R", "glossary1S",
            "glossary1T", "glossary1U", "glossary1V", "glossary1W", "glossary1X",
            "glossary1Y", "glossary1Z",
            "destlang"
        ], function (data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data);
            }
        });
    });
}
// Load glossary and glossary1 into global arrays
async function loadGlossaries() {
    try {
        const data = await getGlossaryData();

        // Validate
        const glossaryValid = typeof data.glossary !== "undefined";
        const glossary1Valid = typeof data.glossary1 !== "undefined";

        if (!glossaryValid && !glossary1Valid) {
            //messageBox("error", "Neither glossary nor glossary1 were loaded because no files are available!");
            return "unsuccessful";
        }

        // Clear existing arrays
        glossary.length = 0;
        glossary1.length = 0;

        // Load glossary
        if (glossaryValid) {
            const keys = ["glossary", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(l => "glossary" + l);
            keys.forEach(key => loadSet(glossary, data[key]));

            glossary.sort((a, b) => b.key.length - a.key.length);
        }

        // Load glossary1
        if (glossary1Valid) {
            const keys1 = ["glossary1", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(l => "glossary1" + l);
            keys1.forEach(key => loadSet(glossary1, data[key]));

            glossary1.sort((a, b) => b.key.length - a.key.length);
        }

        return "success";

    } catch (error) {
        console.error("Error loading glossaries:", error);
        return "unsuccessful";
    }
}

function old_loadGlossary(event) {
    //event.preventDefault()
    //glossary = [];
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
                    // to sort by descending order
                    return b.key.length - a.key.length;
                });
                //console.debug("gloss length:", glossary, length)
            }
            else {
                messageBox("error", "Your default glossary is not loaded because no file is loaded!!");
                return;
            }
        })

    //glossary1 = [];
    chrome.storage.local.get(["glossary1", "glossary1A", "glossary1B", "glossary1C"
        , "glossary1D", "glossary1E", "glossary1F", "glossary1G", "glossary1H", "glossary1I"
        , "glossary1J", "glossary1K", "glossary1L", "glossary1M", "glossary1N", "glossary1O"
        , "glossary1P", "glossary1Q", "glossary1R", "glossary1S", "glossary1T", "glossary1U"
        , "glossary1V", "glossary1W", "glossary1X", "glossary1Y", "glossary1Z", "destlang"],
        function (data) {
            //console.debug("second gloss:",data.glossary1)
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
                // console.debug("glossary1:", glossary1.length)

            }
            else {
                messageBox("error", "Your second glossary is not loaded because no file is loaded!!");
                //return ;
            }

            //console.debug("gloss length before:", glossary1)
            if (glossary.length > 1) {
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
                //return;
            }
        });
    let glossary_loaded = "OK"
    let glossary1_loaded = "OK"
    return { glossary_loaded, glossary1_loaded };
}


function loadSet(targetArray, sourceArray) {
    if (!Array.isArray(sourceArray)) return;

    sourceArray.forEach((item, index) => {
        if (
            item &&
            typeof item === "object" &&
            typeof item.key !== "undefined" &&
            typeof item.value !== "undefined"
        ) {
            targetArray.push(item);
        } else {
            console.warn("Skipping invalid entry at index", index, ":", item);
        }
    });
}

function loadSet1(targetArray, sourceArray) {
    if (!Array.isArray(sourceArray)) return;

    sourceArray.forEach((item, index) => {
        if (
            item &&
            typeof item === "object" &&
            typeof item.key !== "undefined" &&
            typeof item.value !== "undefined"
        ) {
            targetArray.push(item);
        } else {
            console.warn("Skipping invalid entry at index", index, ":", item);
        }
    });
}

function addTranslateButtons(rowId) {
    //16 - 06 - 2021 PSS fixed this function addTranslateButtons to prevent double buttons issue #74
    // This function adds the buttons for the editor
    //for (let e of document.querySelectorAll("tr.editor")) {
    //let rowId = e.getAttribute("row");
    //console.debug("we add the buttons on row:",rowId)
    let panelHeaderActions = document.querySelector("#editor-" + rowId + " .panel-header .panel-header-actions");
    //console.debug("panelHeaderActions:",panelHeaderActions)
    if (panelHeaderActions != null) {
        var currentcel = document.querySelector(`#preview-${rowId} td.priority`);
        if (currentcel != null) {
            currentcel.innerText = "";
        }
        let panelTransMenu = document.querySelector(`#editor-${rowId} .panelTransMenu`);
        //console.debug("panelTrans:",panelTransMenu)
        var newTransDiv = document.querySelector(`#editor-${rowId} .panel-header`);
        if (panelTransMenu == null) {
            newTransDiv.insertAdjacentHTML("afterend", '<div class="panelTransMenu">');
            let panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
            let translateButton = createElementWithId("my-button", `translate-${rowId}-translation-entry-my-button`);
            translateButton.href = "#";
            translateButton.className = "translation-entry-my-button";
            translateButton.onclick = translateEntryClicked;
            translateButton.innerText = __("Translate");
            translateButton.style.cursor = "pointer";
            if (panelTransDiv != null) {
                panelTransDiv.appendChild(translateButton);
            }
            // Add addtranslate button
            let addTranslateButton = createElementWithId("my-button", `translate-${rowId}-addtranslation-entry-my-button`);
            addTranslateButton.href = "#";
            addTranslateButton.className = "addtranslation-entry-my-button";
            addTranslateButton.onclick = addtranslateEntryClicked;
            addTranslateButton.innerText = __("Add Translation");
            addTranslateButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(addTranslateButton, panelTransDiv.childNodes[0]);

            // Add checktranslate button
            let checkTranslateButton = createElementWithId("my-button", `translate-${rowId}-checktranslation-entry-my-button`);
            checkTranslateButton.href = "#";
            checkTranslateButton.className = "checktranslation-entry-my-button";
            checkTranslateButton.onclick = checktranslateEntryClicked;
            checkTranslateButton.innerText = __("Check Translation");
            checkTranslateButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(checkTranslateButton, panelTransDiv.childNodes[0]);

            // Add lowercase button
            let LocalCaseButton = createElementWithId("my-button", `translate-${rowId}-localcase-entry-my-button`);
            LocalCaseButton.href = "#";
            LocalCaseButton.className = "localcase-entry-my-button";
            LocalCaseButton.onclick = LowerCaseClicked;
            LocalCaseButton.innerText = __("LowerCase");
            LocalCaseButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(LocalCaseButton, panelTransDiv.childNodes[0]);

            let TranslocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-local-button`);
            TranslocalButton.className = "translocal-entry-local-button";
            TranslocalButton.innerText = __("Local");
            TranslocalButton.style.visibility = "hidden";
            panelTransDiv.insertBefore(TranslocalButton, panelTransDiv.childNodes[0]);

            let MissinglocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-missing-button`);
            MissinglocalButton.className = "translocal-entry-missing-button";
            MissinglocalButton.innerText = __("Missing glossary entry");
            MissinglocalButton.style.visibility = "hidden";
            MissinglocalButton.style.animation = "blinking 1s infinite";
            panelTransDiv.insertBefore(MissinglocalButton, panelTransDiv.childNodes[0]);

            let translationActions = document.querySelector("#editor-" + rowId + " div.editor-panel__left .panel-content .translation-actions");
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
    //}
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
            errMessage = __("File is not a csv!")
            messageBox("error", errMessage);
        }
    });
}

async function parseDataBase(data) {
    const csvData = data.split("\n").map(line => line.split("|"));
    const importButton = document.querySelector("a.import_translation-button");
    const cntry = checkLocale();
    const total = csvData.length - 1;

    toastbox("info", `Import of ${total} records started. Please wait...`, "1500", "Import database");
    importButton.innerText = "Started";

    if (total < 1) {
        messageBox("error", "No records found in the CSV file.");
        return;
    }

    let importedCount = 0;

    for (let i = 1; i < csvData.length; i++) {
        const [orig, trans, country] = csvData[i];
        if (!orig || !country || country !== cntry) continue;

        // Sequential insert/update — fastest for JsStore
        await addTransDb(orig, trans, country);

        importedCount++;

        // Update UI every 50 records (adjust as needed)
        if (importedCount % 50 === 0 || importedCount === total) {
            importButton.innerText = `${importedCount}/${total}`;
            toastbox("info", `Imported ${importedCount} of ${total}...`, "1000", "Import database");
            // Yield to UI
            await new Promise(r => setTimeout(r, 0));
        }
    }

    close_toast();
    messageBox("info", `Import complete. Records processed: ${importedCount}`);
    importButton.classList.add("ready");
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
    var pluralTextarea = ""
    var FireFoxAction = ""
    var leftPanel;
    let locale = checkLocale() || 'en';
    var myLocale = locale
    var target = event.target;
     // console.debug("buttonclick")
    // Check if the clicked element is the copy-suggestion button
    if (target.classList.contains('copy-suggestion') || target.classList.contains('translation-suggestion__translation-meta') || target.classList.contains('translation-suggestion__translation')) {
        const row = target.closest('tr');
        const rowId = row?.id;
        if (rowId) {
            chrome.storage.local.get(["postTranslationReplace", "formal"], function (data) {
                replaceVerbs = setPostTranslationReplace(data.postTranslationReplace, data.formal);
                onCopySuggestionClicked(target, rowId, replaceVerbs);
            });





        } else {
            console.warn('No row found for the clicked copy button.');
        }
    }
    else {
        if (target.classList.contains('textareas active')) {
        console.debug("we are in editor")
    }
       // addTranslateButtons(rowId)
    }
   
   // console.debug("after check copy")
    if (event != undefined) {
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        let action = event.target.textContent;
        FireFoxAction = event.target.FirstChild;
        //console.debug("Fire: ",FireFoxAction)
        if (action != null) {
            if (typeof FireFoxAction != 'undefined') {
                FireFoxAction = event.target.firstChild.data
            }
            else { FireFoxAction = "" }
            // 30-06-2021 PSS added fetch status from local storage
            // Necessary to prevent showing old translation exist if started from link "Translation history"
            // 22-06-2021 PSS fixed issue #90 where the old translations were not shown if vladt WPGP Tool is activ
            // console.debug("activeElement:", document.activeElement)

            mytarget = event.target;
        }

        //console.debug("action:",action)
        // we do need to make sure that we are in the editor, not meta or discussion
        if (action == "Details" || action == "✓Details" || FireFoxAction == "Details") {
            mytarget = event.target.parentElement.parentElement;
            // defensive programming
            if (mytarget != null) {
                rowId = mytarget.getAttribute("row");
            }
            //console.debug("row:",rowId)
            glob_row = rowId;
            detailRow = rowId;
            if (rowId == null) {
                editor = await waitForMyElement(`.editor`, 500, "2621").then((res) => {
                    if (res != "Time-out reached") {
                        //console.debug("We found it:",editor)
                        rowId = res.getAttribute("row")
                    }
                    else { console.debug("not found:", res) }
                });
            }
            addTranslateButtons(rowId);
            let checkTranslateButton = await document.querySelector(`#editor-${rowId} .checktranslation-entry-my-button`)
            checkTranslateButton.className = "checktranslation-entry-my-button"
            await waitForMyElement(`#editor-${rowId}`, 3000, "2685").then(async(res) => {
                if (res != "Time-out reached") {
                    myrec = document.querySelector(`#editor-${rowId}`);
                    //console.debug("myrec:",myrec)
                    mytextarea = myrec.getElementsByClassName('foreign-text'); 
                    //console.debug("textarea:",mytextarea)
                    let mytranslation = mytextarea[0].innerHTML
                    if (mytranslation == "") {
                        let myoriginal = myrec.getElementsByClassName("original")[0].textContent
                        let pretrans = await findTransline(myoriginal, myLocale);
                        if (pretrans != "notFound") {
                           mytextarea[0].innerHTML = pretrans
                            mytextarea[0].innerText = pretrans
                           // activate the Local label
                           document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = "visible";

                        }
                    }
                    requestAnimationFrame(() => {
                        mytextarea[0].style.height = "auto"; // Initial reset
                        const newHeight = mytextarea[0].scrollHeight; // Layout read
                        mytextarea[0].style.height = newHeight + "px"; // Layout write
                    });


                    //    setTimeout(() => {
                    //const textarea = document.querySelector(`#editor-${rowId}`);; // Adjust this selector if needed

                    // if (textarea) {
                    mytextarea[0].addEventListener("click", (e) => {
                        //console.debug("Textarea clicked");
                        if (detail_glossary) {
                            //console.debug("We are starting the observer:", mytextarea)
                            // We need to start the mutation server, if the textarea is clicked on
                            let leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                            //console.debug("before mutation:", leftPanel)
                            start_editor_mutation_server(mytextarea, action, leftPanel)
                        }
                       // mytextarea = textarea.getElementsByClassName('foreign-text')
                       // console.debug("tet:",mytextarea)
                        // Optional: get cursor position
                        const cursorPos = mytextarea[0].selectionStart;
                        //console.debug("Cursor position:", cursorPos);
                        StartObserver = true;
                       
                    });

                    //console.debug("mytext in open:",mytextarea)
                    if (typeof mytextarea != 'undefined') {
                        // console.debug("mytext:", mytextarea,"2270")
                        detail_preview = getPreview(rowId)
                        //detail_preview = document.querySelector(`#preview-${rowId}`);
                        detail_glossary = detail_preview.querySelector(`.glossary-word`)
                        //console.debug("detail_glossary:",detail_glossary)
                        if (detail_glossary != null) {
                            detail_glossary = true
                        }
                        else {
                            detail_glossary = false
                        }
                    }
                    else {
                        mytextarea = document.querySelector(`#editor-${rowId} .foreign-text autosize`);
                       // console.debug("mytext2:", mytextarea)
                    }
                }
                else { console.debug("editor not found:", res) }
            })
            if (myrec != null) {
                myrec = await document.querySelector(`#editor-${rowId}`);
                // console.debug("editor:",editor)
                mytextarea = await myrec.getElementsByClassName('foreign-text')
                // console.debug("mytext:",mytextarea,myrec)
                if (typeof textarea != 'undefined') {
                    textarea = mytextarea[0]
                    requestAnimationFrame(() => {
                        // Ensure the textarea is visible and enabled
                        textarea.style.display = 'block'; // Ensure it's visible
                        textarea.style.visibility = 'visible'; // Ensure it's visible
                        textarea.disabled = false; // Ensure it's enabled
                        // Scroll to the textarea if necessary
                        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Focus on the textarea to make it active
                        textarea.focus();
                    });
                }

                // we need to select the second element in the form
                newRowId = rowId.split("-")[0] + "_1"
                //console.debug("newrowId:",newRowId)
                pluralTextarea = myrec.querySelector(`#translation_${newRowId}`);
                pluralpresent = myrec.querySelector(`.editor-panel__left .source-string__plural .original-raw`);
                if (autoCopyClipBoard) {
                    copyToClipBoard(detailRow)
                }

                if (pluralTextarea != "") {
                    if (detail_glossary) {
                        // This one is started to detect changes in plural
                        leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        pluralTextarea= leftPanel.querySelector("textareas.active")
                        //console.debug("before mutation plural:", pluralTextarea)
                        start_editor_mutation_server2(pluralTextarea, action, leftPanel)
                    }
                }
                else { 
                   //console.debug("before startObserver",StartObserver)
                   if (StartObserver) {
                      if (detail_glossary) {
                         //console.debug("We are starting the observer:", mytextarea)
                         leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                         //console.debug("before mutation:", leftPanel)
                         start_editor_mutation_server(mytextarea, action, leftPanel)
                      }
                   }
                }
            }
            await waitForMyElement(`#editor-${rowId}`, 200, "2661").then((res) => {
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
                            let showName = false
                            let showDiff = false
                            result = await validateEntry(locale, textareaElem, showName, showDiff, rowId, locale, "", false, DefGlossary);
                            //console.debug("validate entry in content line 2192", result)
                            //20-04
                           // console.debug("Called by:", whoCalledMe());
                            mark_glossary(leftPanel, result.toolTip, textareaElem.textContent, rowId, false)

                            if (typeof result != 'undefined') {
                                let editorElem = document.querySelector("#editor-" + rowId + " .original");
                                //19-02-2023 PSS we do not add the marker twice, but update it if present
                                if (result.toolTip.length != 0) {
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
                                            let markspanText = "<br>--" + __("Missing glossary verbs are marked") + "--"
                                            markspan1.innerHTML = markspanText
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
                                //console.debug("pluralpresent in line 2806:", pluralpresent)
                                //console.debug("pluralpresent in line 2807:", pluralTextarea)
                                //console.debug("pluralpresent in line 2808:", translation)
                                if (pluralTextarea != "" && pluralTextarea != null && pluralTextarea.textContent != null) {
                                    //PSS 12-07
                                                                                  
                                    result = await validate(locale, pluralpresent.textContent, pluralTextarea.textContent,locale, false, rowId, true, DefGlossary);
                                }
                                //console.debug("validate contentscript line 2228 resultplural:", result)
                                // plural is record with "_1"
                                newRowId = rowId.split("-")[0] + "_1"
                                const textarea = myrec.querySelector(`#translation_${newRowId}`);
                                // Ensure the textarea is visible and enabled
                                
                                requestAnimationFrame(() => {
                                    textarea.style.display = 'block'; // Ensure it's visible
                                    textarea.style.visibility = 'visible'; // Ensure it's visible
                                    textarea.disabled = false; // Ensure it's enabled
                                    // Scroll to the textarea if necessary
                                    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    // Focus on the textarea to make it active
                                    textarea.focus();
                                });
                                
                                await mark_glossary(leftPanel, result.toolTip, pluralpresent.textContent, rowId, true)
                            }
                        });
                    }
                    else {
                        //console.debug("In editor no text is present!")
                        //console.debug("type toolTip:",typeof toolTip)
                        toolTip = ""
                        // mark_glossary(leftPanel, toolTip, textareaElem.textContent, rowId, false)
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
                requestAnimationFrame(() => {
                    const yOffset = -100; // adjust for your header height
                   const y = myrec.getBoundingClientRect().top + window.scrollY + yOffset;
                   window.scrollTo({ top: y, behavior: 'smooth' });

                    //myrec.scrollIntoView(true);
                });
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
                                fetchOldRec(url, rowId, data.showTransDiff);
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
                .catch((error) => {
                    liscore = '0';
                });

            if (liscore != 100) {
                if (translator == 'OpenAI') {
                    res = await waitForElementInRow(`#editor-${rowId}`, '.translation-suggestion.with-tooltip.openai', 4000)
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
                    res = await waitForElementInRow(`#editor-${rowId}`, '.translation-suggestion.with-tooltip.deepl', 4000)
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
    chrome.storage.local.get(["postTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal"], function (data) {
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
        checkEntry(rowId, data.postTranslationReplace, formal, data.convertToLower, translationComplete, data.spellCheckIgnore);
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
            setLowerCase(rowId, data.spellCheckIgnore)
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
    
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyClaude", "apikeyOllama", "LocalOllama", "OpenAIPrompt", "ClaudePrompt" ,"OpenAISelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss","ClaudModel", "apikeyOllama", "LocalOllama", "ollamaModel","ollamaPrompt"], function (data) {
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
        var myOpenAiGloss = data.OpenAiGloss
        //console.debug("before transl 3122:",myOpenAiGloss)
        //console.debug("DeeplGlossary in translateEntry:",deeplGlossary)
        if (data.destlang != "undefined" && data.destlang != "") {
            translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyDeepSeek,data.apikeyTranslateio, data.apikeyMicrosoft, data.apikeyOpenAI, data.apikeyClaude,data.OpenAIPrompt, data.ClaudePrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, DeeplFree, translationComplete, data.OpenAISelect, OpenAItemp, data.spellCheckIgnore, deeplGlossary, OpenAITone, myOpenAiGloss,data.ClaudModel,data.apikeyOllama, data.LocalOllama, data.ollamaModel,data.ollamaPrompt);
        }
        else {
            messageBox("error", "You need to set the parameter for Destination language");
        }
    });
}

async function updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status, showDiff) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var currcount = 1;
    var current;
    var checkElem;
    var current;
    var SavelocalButton;
    var imgsrc;
    var debug = false
    var currText;
    var single
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;

    //console.debug("updateStyle rowId:",rowId)
    //console.debug("updateStyle1:",showHistory,myHistory,my_checkpage,currstring)
    imgsrc = chrome.runtime.getURL('/');
    imgsrc = imgsrc.substring(0, imgsrc.lastIndexOf('/'));
    current = await document.querySelector("#editor-" + rowId + " div.editor-panel__left div.panel-header span.panel-header__bubble");
    
    //console.debug("before:", current.innerText)
    if (current != null) {
        currText = current.innerText
    }
    else {
        currText = "transFill"
    }
    let originalElem = document.querySelector("#preview-" + rowId + " .original");
    if (originalElem != null) {
        let glossary = originalElem.querySelector('span .glossary-word');
    }
    let markerpresent = document.querySelector("#preview-" + rowId + " .mark-tooltip");
    if (result != null && result.percent == 100) {
        if (markerpresent != null) {
            markerpresent.remove();
        }
    }
    if (debug == true) {
        console.debug("updateStyle1:", showHistory, myHistory, my_checkpage, currstring)
        console.debug("UpdateStyle1 record:", record)
        console.debug("updatestyle prev:", prev_trans)
        console.debug("updatestyle curr:", currstring, rowId)
        console.debug("ShowHistory:", showHistory)
    }
    // 17-02-2023 PSS do not add the marker twice if a retranslation is done
    if (markerpresent == null) {
        // if an original text contains a glossary verb that is not in the tranlation highlight it
        if (result.newText != "" && typeof result.newText != "undefined") {
            if (showName != true) {
                let markerimage = imgsrc + "/../img/warning-marker.png";
                if (current != null) {
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
    checkElem = await document.querySelector("#preview-" + rowId + " .priority");
   // console.debug("checkElem:",checkElem,rowId)
    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
    if (SavelocalButton == null) {
        SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
    }
    // we need to take care that the save button is not added twice
    //myrec = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    // pss 12-10-2023 this one needs to be improved as we now have the record containing the editor details
    if (typeof checkElem == "object") {
        if (SavelocalButton == null) {
            if (!is_pte) {
                let checkBx = document.querySelector("#preview-" + rowId + " .myCheckBox");
                // if there is no checkbox, we do not need to add the input to it and alter the columns
                if (checkBx != null) {
                    inputBox = document.querySelector("#preview-" + rowId + " td input")
                    mycheckbox = document.createElement('input');
                    mycheckbox.setAttribute("type", "checkbox");
                    mycheckbox.setAttribute("name", "selected-row[]");
                    // if the inputBox is already present, we do not need to add it again
                    if (inputBox == null) {
                        checkBx.appendChild(mycheckbox);
                    }
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
            // pss 18-04
            res = await addCheckButton(rowId, checkElem, "3139")
            SavelocalButton = res.SavelocalButton;
        }
        else {
            // if the button is present but the checkbox not, then we need to add it (happens with first row of table)
            if (!is_pte) {
                let checkBx = document.querySelector("#preview-" + rowId + " .myCheckBox");
                // if there is no checkbox, we do not need to add the input to it and alter the columns
                if (checkBx != null) {
                    inputBox = document.querySelector("#preview-" + rowId + " td input")
                    mycheckbox = document.createElement('input');
                    mycheckbox.setAttribute("type", "checkbox");
                    mycheckbox.setAttribute("name", "selected-row[]");
                    // if the inputBox is already present, we do not need to add it again
                    if (inputBox == null) {
                        checkBx.appendChild(mycheckbox);
                    }
                    let myrec = document.querySelector(`#editor-${rowId}`);
                    // We need to expand the amount of columns otherwise the editor is to small
                    var tds = myrec.getElementsByTagName("td")[0];
                    tds.setAttribute("colspan", 5);
                }
            }
        }
    }
    else {
        if (SavelocalButton == null) {
            res = await addCheckButton(rowId, checkElem, "3166")
            SavelocalButton = res.SavelocalButton
        }
    }
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    let row = rowId.split("-")[0];
    if (currText != 'untranslated') { 
        updateElementStyle(checkElem, headerElem, result, showHistory, originalElem, "", "", "", "", rowId, showName, nameDiff, currcount, currstring, currText, record, myHistory, my_checkpage, repl_array, prev_trans, old_status, showDiff);
    }
   
    row = rowId.split("-")[0];

    // 12-06-2021 PSS do not fetch old if within the translation
    // 01-07-2021 fixed a problem causing an undefined error
    // 05-07-2021 PSS prevent with toggle in settings to show label for existing strings #96
    if (showHistory == true) {
        single = "True";
        // console.debug("newurl", newurl)
        if (newurl.substring(1, 9) != "undefined") {
            //   console.debug("newurl", newurl)
            single = "False";
        }
        // 31-01-2023 PSS fetchold should not be performed on untranslated lines issue #278
       
        await fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId, showName, current.innerText, prev_trans, currcount, showDiff);
    }
}

async function validateEntry(language, textareaElem, newurl, showHistory, rowId, locale, record, showDiff, DefGlossary) {
    // 22-06-2021 PSS fixed a problem that was caused by not passing the url issue #91
    var translation;
    var result = [];
    var original_preview;
    var raw;
    var originalText;
    var preview_raw;
    var hasGlossary;
    var span_glossary;
    var toolTip = ""
    
    //console.debug("RowId",rowId)
    if (typeof textareaElem === 'string') {
        translation = textareaElem;
       // console.debug('It is a string');
    } else if (textareaElem !== null && typeof textareaElem === 'object' && !Array.isArray(textareaElem)) {
        //console.log('It is a plain object');
        translation = textareaElem.value;
        //console.debug("Validate translation:", translation);
    } else {
       // console.log('It is something else');
        translation = textareaElem.innerText;
    }
    // do not remove the below call, otherwise an error is generated
    addTranslateButtons(rowId);
    
    preview_raw = document.querySelector(`#preview-${rowId}`)
    if (preview_raw != null) {
        hasGlossary = await preview_raw.querySelector('.glossary-word')

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
    //let leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
    //remove_all_gloss(leftPanel)
    //console.debug("do we have glossary:",hasGlossary,textareaElem.innerHTML)
    if (hasGlossary == true) {
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
                    result = await validate(language, originalText, translation, locale, false, rowId, false, DefGlossary);
                    //console.debug("validate in content line 3287",result)
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
                            mark_glossary(leftPanel, result.toolTip, translation, rowId, false)
                        }
                    }
                }

            }
            //textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status
            old_status = document.querySelector("#preview-" + rowId);
            //console.debug("validateEntry:",translation)
            //console.debug("nameDiff1:",nameDiff)
            let showName = false
            updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, false, false, translation, [], translation, record, old_status, showDiff);
            //}
        }
        else {
           // console.debug("textareaElem:", textareaElem)
            wordCount = 0;
            foundCount = 0;
            if (typeof textareaElem != "undefined") {
                if (textareaElem.innerText != 'No suggestions' && textareaElem.innerText.length != 0) {
                    percent = 100;
                    toolTip = ""
                }
                else {
                    percent = 0
                }
            }
            else {
                //console.debug("we have no textareaElem!!")
                percent = 100
                tooltip = ""
                wordCount = 0
                foundCount = 0
            }
            //toolTip = ""
            newText = "";
            result = { wordCount, foundCount, percent, toolTip, newText }
            old_status = document.querySelector("#preview-" + rowId);
            //console.debug("before updateStyle:", textareaElem, rowId, translation)
            console.debug("nameDiff2:",nameDiff)
            updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, false, false, translation, [], translation, record, old_status, showDiff);
        }
    }
    else {
       // console.debug("We dont have a glossary in validateEntry")
        if (typeof textareaElem === 'string') {
            translation = textareaElem
            //console.debug('It is a string');
        }
        else if (textareaElem !== null && typeof value === 'object' && !Array.isArray(value)) {
           // console.debug('It is a plain object');
            translation = textareaElem.value;
           // console.debug("Validate translation:", translation)
        } 

        wordCount = 0;
        foundCount = 0;
       
        if (translation != 'No suggestions') {
            percent = 100;
        }
        else {
            percent = 0
        }
        toolTip = ""
        newText = "";
        result = { wordCount, foundCount, percent, toolTip, newText }
        old_status = document.querySelector("#preview-" + rowId);
        showDiff = false
        updateStyle(textareaElem, result, newurl, showHistory, false, nameDiff, rowId, record, false, false, translation, [], translation, record, old_status, showDiff);

    }
    return result;
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


function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, '\\$&');
}


// Utility function to decode HTML entities
function decodeHtmlEntities(str) {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
}


let isProcessing = false; // Flag to prevent multiple calls
let currentTranslation = ""; // To track the current state of the translation


function working2findAllMissingWords(translation, expectedWords, locale = 'nl') {
    const lowerTranslation = translation.toLowerCase();
    const pluralize = plural_rules[locale] || (() => []);

    // Group expectedWords by joined word variants string
    const groupedByWord = expectedWords.reduce((acc, entry) => {
        const key = entry.word.join('|');
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {});

    const missingGroups = [];

    for (const key in groupedByWord) {
        const group = groupedByWord[key];
        const wordVariants = group[0].word;
        const expectedCount = group.length;
        const distinctWords = [...new Set(wordVariants.map(w => w.toLowerCase()))];
        let actualCount = 0;

        // Check for combined words
        if (distinctWords.length > 1) {
            const concat1 = distinctWords.join('');
            const concat2 = distinctWords.slice().reverse().join('');
            if (lowerTranslation.includes(concat1) || lowerTranslation.includes(concat2)) {
                actualCount = expectedCount;
            }
        }

        // If no combined word match, search individual variants
        if (actualCount === 0) {
            for (const variant of wordVariants) {
                const variantLower = variant.toLowerCase();

                // Exact match (whole word)
                const regex = new RegExp(`\\b${variantLower}\\b`, 'gi');
                const matches = lowerTranslation.match(regex);
                if (matches) actualCount += matches.length;

                // Substring fallback for short words like "u"
                if (actualCount < expectedCount && variantLower.length <= 2) {
                    const fallbackRegex = new RegExp(`${variantLower}`, 'gi');
                    const fallbackMatches = lowerTranslation.match(fallbackRegex);
                    if (fallbackMatches) actualCount += fallbackMatches.length;
                }

                // Check plural forms
                const plurals = pluralize(variantLower);
                for (const plural of plurals) {
                    const pluralRegex = new RegExp(`\\b${plural}\\b`, 'gi');
                    const pluralMatches = lowerTranslation.match(pluralRegex);
                    if (pluralMatches) actualCount += pluralMatches.length;
                }

                // If still not matched, check if variant is part of any translation word
                if (actualCount < expectedCount) {
                    const wordsInTranslation = lowerTranslation.split(/\s+/);
                    for (const word of wordsInTranslation) {
                        if (
                            word.includes(variantLower) &&
                            variantLower.length > 2 &&
                            !new RegExp(`\\b${variantLower}\\b`, 'i').test(word)
                        ) {
                            actualCount += 1;
                            console.debug(`[DEBUG] "${variantLower}" found inside combined word "${word}"`);
                            break;
                        }
                    }
                }

                console.debug(
                    `[DEBUG] Glossary variant "${variant}" | Count so far: ${actualCount}/${expectedCount}`
                );
            }
        }

        // If actual occurrences less than expected, mark all as missing
        if (actualCount < expectedCount) {
            group.forEach(entry => {
                missingGroups.push({
                    glossIndex: entry.glossIndex,
                    word: entry.word,
                    missingCount: 1,
                });
            });
        }
    }

    // Sort by glossIndex for consistent ordering
    missingGroups.sort((a, b) => a.glossIndex - b.glossIndex);
    return missingGroups;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
}

function works2105findMissingTranslations(glossWords, original, translatedText, glossary, locale = "nl") {
    var version = '1.0.0'
    console.debug("glossWords:", glossWords);
    if (typeof translatedText !== "string") {
        console.warn("findMissingTranslations: translatedText must be a string", translatedText);
        return [];
    }

    const normalizedTranslatedText = translatedText.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const normalizedTranslatedTokens = normalizedTranslatedText.split(/\s+/);

    const glossIndexUsage = new Map();
    const requiredCounts = new Map();
    const variantCounts = new Map();
    const variantUsageByGlossIndex = new Map();

    const missingWords = [];

    // Count required per glossIndex
    for (const item of glossWords) {
        const glossIndex = item.glossIndex;
        requiredCounts.set(glossIndex, (requiredCounts.get(glossIndex) || 0) + 1);
    }

    // Count total available per variant in translated text
    for (const item of glossWords) {
        const rawWords = Array.isArray(item.word) ? item.word : [item.word];
        for (let raw of rawWords) {
            const variants = raw.split('/').map(v =>
                v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
            );
            for (let variant of variants) {
                if (!variantCounts.has(variant)) {
                    const count = countOccurrences(normalizedTranslatedText, variant);
                    variantCounts.set(variant, count);
                }
            }
        }
    }

    // Attempt match for each glossary word
    for (const item of glossWords) {
        const rawWords = Array.isArray(item.word) ? item.word : [item.word];
        const glossIndex = item.glossIndex;
        const required = requiredCounts.get(glossIndex);
        let used = glossIndexUsage.get(glossIndex) || 0;

        if (used >= required) continue;

        for (let raw of rawWords) {
            const variants = raw.split('/').map(v =>
                v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
            );

            for (let variant of variants) {
                if (!variant) continue;

                const totalAvailable = variantCounts.get(variant) || 0;

                const glossKey = glossIndex + '|' + variant;
                const usedByThisGloss = variantUsageByGlossIndex.get(glossKey) || 0;

                const globalUsed = [...variantUsageByGlossIndex.entries()]
                    .filter(([k, _]) => k.endsWith('|' + variant))
                    .reduce((sum, [, val]) => sum + val, 0);

                const prefixMatchAllowed = variant.length > 1;
                const prefixMatch = prefixMatchAllowed && matchesWithLocalePrefix(variant, normalizedTranslatedTokens, locale);

                const combinedMatch = variant.length > 2 &&
                    normalizedTranslatedTokens.some(token =>
                        token.length > variant.length && token.includes(variant)
                    );

                const canUse =
                    globalUsed < totalAvailable || prefixMatch || combinedMatch;

                if (canUse && used < required) {
                    used++;
                    glossIndexUsage.set(glossIndex, used);
                    variantUsageByGlossIndex.set(glossKey, usedByThisGloss + 1);

                    console.debug(`✅ GlossIndex ${glossIndex} - Variant "${variant}" assigned, used by this gloss: ${usedByThisGloss + 1}, global used: ${globalUsed + 1}`);
                    break; // stop after assigning 1 usage for this glossWord
                }

                console.debug(`GlossIndex ${glossIndex} - Variant "${variant}" found ${totalAvailable} time(s), used by this gloss: ${usedByThisGloss}, global used: ${globalUsed}`);
            }

            if (used >= required) break;
        }
    }

    // Check for any glossIndex that didn't meet required matches
    for (const [glossIndex, required] of requiredCounts.entries()) {
        const used = glossIndexUsage.get(glossIndex) || 0;
        if (used < required) {
            const firstItem = glossWords.find(g => g.glossIndex === glossIndex);
            if (firstItem) {
                missingWords.push({
                    word: firstItem.word,
                    glossIndex,
                    missingCount: required - used
                });
                console.warn(`❌ Glossary word(s) not fully matched: ${firstItem.word} (glossIndex: ${glossIndex}, missing: ${required - used})`);
            }
        }
    }

    console.debug("✅ Final GlossIndexUsage map:", glossIndexUsage);
    return missingWords;
}


function workingfindMissingTranslations(glossWords, original, translatedText, glossary, locale = "nl") {
    console.debug("glossWords:", glossWords);
    if (typeof translatedText !== "string") {
        console.warn("findMissingTranslations: translatedText must be a string", translatedText);
        return [];
    }

    const normalizedTranslatedText = translatedText.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const normalizedTranslatedTokens = normalizedTranslatedText.split(/\s+/);

    const glossIndexUsage = new Map();        // Track per glossIndex how many matches used
    const requiredCounts = new Map();         // How many times each glossIndex is required
    const variantGlobalUsage = new Map();     // Track total usage per variant
    const variantGlobalCounts = new Map();    // Track total occurrences per variant

    const missingWords = [];

    // Count how many times each glossIndex should appear
    for (const item of glossWords) {
        const glossIndex = item.glossIndex;
        requiredCounts.set(glossIndex, (requiredCounts.get(glossIndex) || 0) + 1);
    }

    // Count occurrences of each unique variant only once
    const countedVariants = new Set();

    for (const item of glossWords) {
        const rawWords = Array.isArray(item.word) ? item.word : [item.word];
        for (let raw of rawWords) {
            const variants = raw.split('/').map(v =>
                v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
            );
            for (let variant of variants) {
                if (!variant) continue;
                if (countedVariants.has(variant)) continue;  // already counted this variant
                const count = countOccurrences(normalizedTranslatedText, variant);
                variantGlobalCounts.set(variant, count);
                countedVariants.add(variant);
            }
        }
    }

    for (const item of glossWords) {
        const rawWords = Array.isArray(item.word) ? item.word : [item.word];
        const glossIndex = item.glossIndex;

        const requiredCount = requiredCounts.get(glossIndex);
        const usedCount = glossIndexUsage.get(glossIndex) || 0;
        if (usedCount >= requiredCount) continue;

        let found = false;

        for (let raw of rawWords) {
            const variants = raw.split('/').map(v =>
                v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
            );

            for (let variant of variants) {
                if (!variant) continue;

                const globalUsed = variantGlobalUsage.get(variant) || 0;
                const globalAvailable = variantGlobalCounts.get(variant) || 0;

                console.debug(`GlossIndex ${glossIndex} - Variant "${variant}" found ${globalAvailable} time(s), used ${globalUsed} time(s)`);

                const prefixMatchAllowed = variant.length > 1;

                const combinedMatch = variant.length > 2 && normalizedTranslatedTokens.some(token =>
                    token.length > variant.length && token.includes(variant)
                );

                const prefixMatch = prefixMatchAllowed && matchesWithDutchVerbPrefix(variant, normalizedTranslatedTokens, locale);

                if (
                    globalUsed < globalAvailable ||
                    prefixMatch ||
                    combinedMatch
                ) {
                    glossIndexUsage.set(glossIndex, usedCount + 1);
                    variantGlobalUsage.set(variant, globalUsed + 1);
                    found = true;
                    break;
                }
            }

            if (found) break;
        }

        const updatedUsed = glossIndexUsage.get(glossIndex) || 0;
        if (updatedUsed < requiredCount) {
            const existing = missingWords.find(w => w.glossIndex === glossIndex);
            if (!existing) {
                missingWords.push({ word: rawWords, glossIndex });
                console.warn(`❌ Glossary word(s) not found: ${rawWords.join(', ')} (glossIndex: ${glossIndex})`);
                console.debug("🔎 Current translation text:", normalizedTranslatedText);
                console.debug("🧠 Current translation tokens:", normalizedTranslatedTokens);
                console.debug("🗂 GlossIndexUsage map:", glossIndexUsage);
            }
        }
    }

    return missingWords;
}

function prevfindMissingTranslations(glossWords, translatedText, glossary, locale = "nl") {
    console.debug("glossWords:", glossWords);
    if (typeof translatedText !== "string") {
        console.warn("findMissingTranslations: translatedText must be a string", translatedText);
        return [];
    }

    const normalizedTranslatedText = translatedText.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const normalizedTranslatedTokens = normalizedTranslatedText.split(/\s+/);

    const glossIndexUsage = new Map();        // Track per glossIndex
    const requiredCounts = new Map();         // Count how many times each glossIndex should be matched
    const variantGlobalUsage = new Map();     // Track how many times each normalized variant is already matched
    const variantGlobalCounts = new Map();    // Count total appearances in translatedText

    const missingWords = [];

    // Count how many times each glossIndex should appear
    for (const item of glossWords) {
        const glossIndex = item.glossIndex;
        requiredCounts.set(glossIndex, (requiredCounts.get(glossIndex) || 0) + 1);
    }

    // Pre-calculate global available counts for all variants
    for (const item of glossWords) {
        const rawWords = Array.isArray(item.word) ? item.word : [item.word];
        for (let raw of rawWords) {
            const variants = raw.split('/').map(v =>
                v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
            );
            for (let variant of variants) {
                if (!variant) continue;
                const existing = variantGlobalCounts.get(variant) || 0;
                variantGlobalCounts.set(variant, existing + countOccurrences(normalizedTranslatedText, variant));
            }
        }
    }

    for (const item of glossWords) {
        const rawWords = Array.isArray(item.word) ? item.word : [item.word];
        const glossIndex = item.glossIndex;

        const requiredCount = requiredCounts.get(glossIndex);
        const usedCount = glossIndexUsage.get(glossIndex) || 0;
        if (usedCount >= requiredCount) continue;

        let found = false;

        for (let raw of rawWords) {
            const variants = raw.split('/').map(v =>
                v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim()
            );

            for (let variant of variants) {
                if (!variant) continue;

                const globalUsed = variantGlobalUsage.get(variant) || 0;
                const globalAvailable = variantGlobalCounts.get(variant) || 0;

                console.debug(`GlossIndex ${glossIndex} - Variant "${variant}" found ${globalAvailable} time(s), used ${globalUsed} time(s)`);

                const prefixMatchAllowed = variant.length > 1;

                const combinedMatch = variant.length > 2 && normalizedTranslatedTokens.some(token =>
                    token.length > variant.length && token.includes(variant)
                );

                const prefixMatch = prefixMatchAllowed && matchesWithDutchVerbPrefix(variant, normalizedTranslatedTokens, locale);

                if (
                    globalUsed < globalAvailable ||
                    prefixMatch ||
                    combinedMatch
                ) {
                    glossIndexUsage.set(glossIndex, usedCount + 1);
                    variantGlobalUsage.set(variant, globalUsed + 1);
                    found = true;
                    break;
                }
            }

            if (found) break;
        }

        const updatedUsed = glossIndexUsage.get(glossIndex) || 0;
        if (updatedUsed < requiredCount) {
            const existing = missingWords.find(w => w.glossIndex === glossIndex);
            if (!existing) {
                missingWords.push({ word: rawWords, glossIndex });
                console.warn(`❌ Glossary word(s) not found: ${rawWords.join(', ')} (glossIndex: ${glossIndex})`);
                console.debug("🔎 Current translation text:", normalizedTranslatedText);
                console.debug("🧠 Current translation tokens:", normalizedTranslatedTokens);
                console.debug("🗂 GlossIndexUsage map:", glossIndexUsage);
            }
        }
    }

    return missingWords;
}


function updateRowButton(current, SavelocalButton, checkElem, GlossCount, foundCount, rowId, lineNo) {
    if (typeof rowId != "undefined" && SavelocalButton != null) {
        switch (current) {
            case "transFill":
                SavelocalButton.innerText = __("Save");
                checkElem.title = __("save the string");
                SavelocalButton.disabled = false;
                break;
            case "waiting":
                SavelocalButton.innerText = __("Appr");
                checkElem.title = __("Approve the string");
                SavelocalButton.disabled = false;
                break;
            case "current":
                SavelocalButton.innerText = __("Curr");
                SavelocalButton.className = "tf-save-button-disabled"
                checkElem.title = "Current translation";
                break;
            case "fuzzy":
                SavelocalButton.innerText = __("Rej");
                checkElem.title = __("Reject the string");
                break;
            case "changes requested":
                SavelocalButton.innerText = __("Rej");
                checkElem.title = __("Reject the string");
                break;
            case "rejected":
                SavelocalButton.innerText = __("Rej");
                SavelocalButton.disabled = true;
                SavelocalButton.className = "tf-save-button-disabled"
                checkElem.title = __("Reject the string");
                break;
            case "untranslated":
                SavelocalButton.innerText = __("Empt");
                SavelocalButton.style.backgroundColor = "grey";
                checkElem.style.backgroundColor = "white";
                checkElem.title = __("No translation");
                break;
            case "old":
                SavelocalButton.innerText = __("Old");
                checkElem.title = "Old translation";
                break;
            default:
                SavelocalButton.innerText = __("Undef");
                checkElem.title = __("Something is wrong");
                break;
        }
    }
}

async function updateElementStyle(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff, currcount, currstring, current, record, myHistory, my_checkpage, repl_array, prev_trans, old_status, showDiff,translatorName) {
    var SavelocalButton;
    var separator1;
    var newtitle = '';
    var headertitle = '';
    //headerElem.title = "";
    var panelTransTitle = '';
    var panelTransDiv;
    var missingVerbsButton;
    var missingverbs = "";
    var newline = "\n";
    var button_name = "Empty";
    var debug = false;
    var panelTransDiv;
    var res;
    if (debug == true) {
        console.debug("updateElementStyle curr:", currstring)
        console.debug("updateElementStyle prev:", prev_trans)
        console.debug("updateElementStyle currcount:", currcount)
    }
    if (typeof rowId != "undefined") {
        // We need to have the new bar to be able to set the color
        panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
        //console.debug("panelTransDiv:",panelTransDiv)
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
        //panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
        missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");
        //console.debug("concat:",rowId,"newline:",newline,"tooltip:",typeof result.toolTip,"missingverbs:",typeof missingverbs,typeof headerElem.title)
        //headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
        // 02-05-2025 PSS needs to be improved
        if (typeof result.toolTip != "undefined" && typeof missingverbs != "undefined" && typeof headerElem != "undefined" && headerElem != null) {
            headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            newtitle = checkElem.title.concat(missingverbs).concat(result.toolTip);
        }
        else {
            result.toolTip = ""
            missingverbs = ""

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
            button_name = __('Save')
        }
        else if (current == 'waiting') {
            button_name = __('Appr')
        }
        else if (current == 'fuzzy') {
            button_name = __('Rej')
        }
        else if (current == 'transFill') {
            button_name = __('Save')
        }
        else { button_name == 'Undef!!' }
        // We do not need to style the record if it concerns the name label
        //console.debug("showname:",showName,currstring)
        if (showName != true) {
            if (current != null) {
                SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
                if (SavelocalButton == null) {
                    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
                }
                // we need to update the button color and content/tooltip
                // 22-07-2021 PSS fix for wrong button text "Apply" #108
                // moved the below code, and remove the duplicat of this code
                //console.debug("result.percentage:",result.percent,currstring)
                //console.debug("result.precent:",result.percent,result.toolTip)
                if (checkElem != null) {
                    if (result.percent == 100) {
                        checkElem.innerHTML = "100";
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        //18-04 pss
                        res = addCheckButton(rowId, checkElem, "3701")
                        if (res != null) {
                            SavelocalButton = res.SavelocalButton
                            if (SavelocalButton != null) {
                                SavelocalButton.innerText = button_name;
                            }
                        }
                        checkElem.style.backgroundColor = "green";
                        checkElem.title = __("Save the string");
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        // span_glossary = myleftPanel.querySelector(".glossary-word")
                       // await remove_all_gloss(myleftPanel,false)
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
                    else if (result.percent >= 66 && result.percent < 100 ) {
                        newtitle = checkElem.title;
                        checkElem.innerHTML = '<span style="color:black">'+ result.percent + '</span>';
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "4047")
                        if (res != null) {
                            SavelocalButton = res.SavelocalButton
                            SavelocalButton.innerText = button_name;
                        }
                        checkElem.style.backgroundColor = "yellow";
                        checkElem.title = __("Save the string");
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                        if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
                            panelTransDiv.style.backgroundColor = "yellow";
                            missingVerbsButton.style.visibility = "visible";
                        }
                    }
                    else if (result.percent >= 33 && result.percent < 66) {
                        // console.debug("We have a 50:",result.percent,headerElem)
                        newtitle = checkElem.title;
                        checkElem.innerHTML = result.percent;
                        separator1 = document.createElement("div");
                        separator1.setAttribute("class", "checkElem_save");
                        checkElem.appendChild(separator1);
                        res = addCheckButton(rowId, checkElem, "4069")
                        SavelocalButton = res.SavelocalButton
                        SavelocalButton.innerText = button_name;
                        checkElem.title = __("Save the string");
                        checkElem.style.backgroundColor = "orange";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
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
                        res = addCheckButton(rowId, checkElem, "3772")
                        if (res != null) {
                            SavelocalButton = res.SavelocalButton
                            SavelocalButton.disabled = false;
                            SavelocalButton.innerText = button_name;
                            SavelocalButton.onclick = savetranslateEntryClicked;
                        }
                        checkElem.style.backgroundColor = "purple";
                        checkElem.title = __("Save the string");
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
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
                        res = addCheckButton(rowId, checkElem, "4108")
                        if (res != null) {
                            SavelocalButton = res.SavelocalButton
                            SavelocalButton.innerText = button_name;
                        }
                        checkElem.title = "Check the string";
                        checkElem.style.backgroundColor = "darkorange";
                        myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                        mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
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
                            res = addCheckButton(rowId, checkElem, "3771")
                            if (res != null) {
                                SavelocalButton = res.SavelocalButton
                            }
                            myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                            mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                            if (result.wordCount > 0) {
                                checkElem.title = __("Do not save the string");
                                SavelocalButton.innerText = "Miss!";
                                if (currstring == "No suggestions") {
                                    if (res != null) {
                                        SavelocalButton.innerText = "Block!";
                                        SavelocalButton.disabled = true;
                                    }
                                }
                            }
                            else {
                                if (currstring != "No suggestions") {
                                    //checkElem.title = __("Save the string");
                                    SavelocalButton.innerText = "NoGlos";
                                }
                                else {
                                    //We found an error!!!
                                    checkElem.title = __("Do not save the string");
                                    SavelocalButton.innerText = "Block";
                                    checkElem.style.backgroundColor = "red";
                                    res = addCheckButton(rowId, checkElem, "3843")
                                    SavelocalButton = res.SavelocalButton
                                    SavelocalButton.disabled = true;
                                }
                            }
                            if (typeof headerElem != "undefined" && headerElem != null && panelTransDiv != null) {
                                panelTransDiv.style.backgroundColor = "";
                            }
                        }
                        else {
                            // the string does contain glossary words that are not used!
                           // console.debug("result when glossary words are not used:",result,result.toolTip)
                            checkElem.innerText = result.wordCount - result.foundCount;
                            checkElem.title = "Check the string";
                           if (result.wordCount - result.foundCount > 0) {
                                //console.debug("result.toolTip:",result.toolTip)
                                checkElem.title.concat(result.toolTip)
                            }
                            
                            checkElem.style.backgroundColor = "red";
                            let separator1 = document.createElement("div");
                            separator1.setAttribute("class", "checkElem_save");
                            checkElem.appendChild(separator1);
                            res = addCheckButton(rowId, checkElem, "3815")
                            SavelocalButton = res.SavelocalButton
                            myleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`)
                            mark_glossary(myleftPanel, result.toolTip, currstring, rowId, false)
                           // console.debug("current:",current)
                            if (current != "untranslated" && current != 'current') {
                               // console.debug("res:",res)   
                                    if (res != null) {
                                        SavelocalButton.innerText = "Miss!";
                                        if (currstring == "No suggestions") {
                                            SavelocalButton.innerText = "Block!";
                                            SavelocalButton.disabled = true;
                                        }
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
                                        missingVerbsButton.title = headertitle;
                                    }
                                }
                            }
                        }
                    }
                    // newline = "\n";
                    missingverbs = "Missing glossary entry\n";
                    // We need to update the rowbutton
                   // await updateRowButton(current, SavelocalButton, checkElem, result.wordCount, result.foundCount, rowId, "3847");
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
                res = addCheckButton(rowId, checkElem, "3907")
                SavelocalButton = res.SavelocalButton
                SavelocalButton.innerText = "Curr";
                checkElem.style.backgroundColor = "green";
                checkElem.title = "Current translation";
                if (typeof headerElem.style != "undefined") {
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
        }
        // 11-08-2021 PSS added aditional code to prevent duplicate missing verbs in individual translation
        myToolTip = result.toolTip.length;

        if ((typeof result != 'undefined') && myToolTip.length > 0) {
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
                        missingVerbsButton.title = headertitle;
                    }
                }
                // headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
                // newtitle = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            }
            else {
                entrymissing = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button")
                if (entrymissing != null && typeof entrymissing != 'undefined') {
                    if ((result.toolTip == 0)) {
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
        if (result.toolTip.length > 0) {
            // no need to set the tooltip for a plugin/theme name
            if (showName != true) {
                checkElem.setAttribute("title", result.toolTip);
            }
        }
        // 13-08-2021 PSS added a notification line when it concerns a translation of a name for the theme/plugin/url/author	
        if (showName == true) {  
            // PSS 12-07 added await and showName, nameDiff because the label did not changed color when a difference in the name
            await showNameLabel(originalElem,rowId,showName,nameDiff)
        }
        if (oldstring == "True") {
            // 22-06-2021 PSS added tekst for previous existing translations into the original element issue #89
            showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, current, myHistory, my_checkpage, repl_array, prev_trans, old_status, rowId, "UpdateElementStyle", showDiff,translatorName);
        }
    }
    else {
        console.debug("no rowid!!")
    }
}

function showNameLabel(originalElem,row,showName,nameDiff) {
    var namelabelExist;
    var debug = false
    if (debug == true) {
        console.debug("ShowNameLabel originalElem:", originalElem.innerText)
        console.debug("ShowNameLabel showName:", showName)
        console.debug("ShowNameLabel nameDiff:", nameDiff)
        console.debug("Row:",row)
    }
    if (typeof originalElem != 'undefined') {
        namelabelExist = originalElem.querySelector(".trans_name_div, .trans_name_div_true");
        //console.debug("namelabelexist:", namelabelExist)
        // do not add the label twice
        if (namelabelExist == null) {
            //console.debug("We need to add the label",nameDiff)
            var element1 = document.createElement("div");
            originalElem.appendChild(element1);
            if (nameDiff == true) {
                // We need to add the div and set the text accordingly
                element1.setAttribute("class", "trans_name_div_true");
                element1.setAttribute("id", "trans_name_div_true");
                element1.appendChild(document.createTextNode(__("Difference in URL, name of theme or plugin or author!")));
                //console.debug("label added!")
            }
            else {
                // We need to set the label if it is a name
                element1.setAttribute("class", "trans_name_div");
                element1.setAttribute("id", "trans_name_div");
                element1.appendChild(document.createTextNode(__("URL, name of theme or plugin or author!")));
            }

        }
        else {
           // console.debug("originalElem:",originalElem)
            namelabelexist = originalElem.querySelector(".trans_name_div");
           // console.debug("we do have alreay a label with namediff", namelabelexist)
            if (namelabelexist != null) {
                //console.debug("we have a div for difference")
                // We need to nameDiff to false otherwise the label will be red
                let originalElem = document.querySelector("#preview-" + row + " .original");
                let currentTrans = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                let originalTrans = originalElem
                //console.debug("trans:", currentTrans)
                //console.debug("original:", originalElem.innerText)
                nameDiff = isExactlyEqual(currentTrans, originalElem.innerText)
                if (nameDiff != true) {
                   // console.debug("We have no difference!")
                   // namelabelexist.innerText = __("URL, name of theme or plugin or author!")
                    namelabelexist.setAttribute("class", "trans_name_div");
                }
                else {
                    namelabelexist.setAttribute("class", "trans_name_div_true");
                    namelabelexist.setAttribute("id", "trans_name_div_true");
                    namelabelexist.textContent = __("Difference in URL, name of theme or plugin or author!")
                }
                
            }
            else {
                console.debug("there is no label at all:", row)
                console.debug("original:",originalElem)
            }
        }      
    }
}

function showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, current, myHistory, my_check, repl_array, prev_trans, old_status, rowId, called_from, showDiff, translatorName) {
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
        console.debug("old:", old_status) // is opject string containing the actual status.
        console.debug("old recNo:", old_status.getAttribute('row'))
        console.debug("current:", current);
        console.debug("currstring:", currstring)
        console.debug("prev_trans:", prev_trans)
        console.debug("showDiff:", showDiff)
        console.debug("translatorName:",translatorName)

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
        let preview = getPreview(rowId)
        // let preview = document.querySelector(`#preview-${rowId}`)
        if (my_check != true) {
            originalElem.appendChild(element1);
            element1.appendChild(document.createTextNode(__("Existing string(s)! ") + currcount + " " + wait + " " + rejec + " " + fuz + " " + old));
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
                        const br = document.createElement('br');
                        element1.appendChild(br);
                        const span = document.createElement("span");
                        span.style.color = "yellow";
                        span.textContent = __("Current string is the same!");
                        element1.appendChild(span);


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
                            // Here we add the original translator of the current record
                            element1.appendChild(fragment);
                            const br = document.createElement('br');
                            element1.appendChild(br);
                            element1.appendChild(document.createTextNode(" Current translator: " + translatorName));
                        }
                    }
                }
                else if (typeof prev_trans == 'string') {
                    if (result) {
                        console.debug('The strings are similar.');
                        const br = document.createElement('br');
                        element1.appendChild(br);
                        const span = document.createElement("span");
                        span.style.color = "yellow";
                        span.textContent = __("Current string is the same!");
                        element1.appendChild(span);
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
    //console.debug("we add a checkbutton",currentcel,rowId,lineNo)
    // we came from translate entry, so there is no save button
    let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
    if (SavelocalButton == null) {
        SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
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
    else {
        console.debug("We have no current")
        SaveLocalButton = ""
    }
    return { SavelocalButton };
}


async function savetranslateEntryClicked(event) {
    var debug = true
    var myWindow;
    var autoCopySwitchedOff = false;
    const perfNow = () => performance.now();
    event.preventDefault(event);
    myrow = event.target.parentElement.parentElement;
    rowId = myrow.attributes.row.value;
    
    var bulk_timer = 200
    // Determine status of record
    let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = h.querySelector("span.panel-header__bubble");
    var current_rec = getPreview(rowId)
    //var current_rec = document.querySelector(`#preview-${rowId}`);
    // we take care that we can save the record by opening the editor save the record and close the editor again
    if (current.innerText != "Empty" && current.innerText != "untranslated") {
        if (current.innerText == "transFill") {
            let open_editor = document.querySelector(`#preview-${rowId} td.actions .edit`);
            let glotpress_save = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);
            select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
            var status = select.querySelector("dt").nextElementSibling;
            status.innerText = "waiting"
            // 24-03-2022 PSS modified the saving of a record because the toast was sometimes remaining on screen issue #197
            //setTimeout(async() => {
                if (autoCopyClipBoard) {
                    autoCopySwitchedOff = true
                    autoCopyClipBoard = false
                }
                //toastbox("info", "" , "600", "Saving suggestion", myWindow);
                let preview = getPreview(rowId)
                //let preview = document.querySelector(`#preview-${rowId}`);
            if (preview != null) {
                    requestAnimationFrame(async() => {
                    preview.querySelector("td.actions .edit").click();
                    const editor = preview.nextElementSibling;
                    if (editor != null) {
                        // editor.style.display = "none";
                       // we do not need to hide the editor, saving is doing that automatically
                        await editor.querySelector(".translation-actions__save").click();
                    }
                   
                        // PSS confirm the message for dismissal
                        //let t_start = perfNow();
                        let t_dismiss1_start = perfNow();
                        let recordDismiss = await waitForMyElement(`.gp-js-message-dismiss`, 1000, "4733");
                        let t_dismiss1_end = perfNow();
                        if (debug) {
                            console.debug(`Dismiss1 found in ${(t_dismiss1_end - t_dismiss1_start).toFixed(1)} ms`);
                        }
                        if (recordDismiss !== "Time-out reached") recordDismiss.click();
                   
                   });    
            }
            if (autoCopySwitchedOff) {
                    autoCopyClipBoard = true
                    autoCopySwitchedOff = false
            }
                 

          //  }, bulk_timer);
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
                let preview = getPreview(rowId)
                // let preview = document.querySelector(`#preview-${rowId}`);
                let editor = preview.nextElementSibling;
                let glotpress_suggest = editor.querySelector(".translation-actions__save");
                glotpress_suggest.click();
            }
            status.innerText = "current";
            current.innerText = "current";
            // we need to close the editor as we do not need it
            glotpress_close.click();
            prevrow = document.querySelector(`#preview-${rowId}.preview.status-waiting`);
            if (prevrow != null) {
                prevrow.style.backgroundColor = "#b5e1b9";
            }
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

    // Remove HTML tags (e.g., <a href="...">link</a>)
    const plainText = text.replace(/<[^>]*>/g, ' ');

    // Create a regex that matches the exact word using word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'gi');

    // Match and count
    const matches = plainText.match(regex);
    return matches ? matches.length : 0;

}



function createNewGlossArray(gloss) {

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

function isWordPresentUntranslated(translation, originalWord) {
    if (!originalWord) return false;

    // Escape special regex characters in originalWord
    const escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Look for whole word or combined word occurrences containing originalWord
    // E.g. 'website' or 'mywebsite' or 'website123' (combined)
    const regex = new RegExp(`\\b${escapedWord}\\b|\\w*${escapedWord}\\w*`, 'i');
    return regex.test(translation);
}

// Find missing glossary entries in a given translation
function findMissingTranslations(translationText, glossWords, locale = 'nl') {
    const translation = translationText.toLowerCase();
    const missingGlossaryEntries = [];

    glossWords.forEach((glossEntry) => {
        const glossaryTranslations = glossEntry.word || [];
        const originalWord = glossEntry.originalWord || '';

        // 1) Check if any glossary translation word is present in the translation
        const hasGlossTranslation = glossaryTranslations.some(variant => {
            return isGlossaryWordInTranslation(translation, variant, locale);
        });

        if (hasGlossTranslation) {
            // Found glossary translation word -> no missing
            return;
        }

        // 2) No glossary translation found -> check if original English word is untranslated in translation
        if (originalWord && isWordPresentUntranslated(translation, originalWord)) {
            // untranslated original English word found -> report missing
            missingGlossaryEntries.push({
                glossIndex: glossEntry.glossIndex,
                word: glossaryTranslations,
                originalWord: originalWord,
                reason: 'original word untranslated'
            });
            return;
        }

        // 3) Neither found -> report missing glossary translation
        missingGlossaryEntries.push({
            glossIndex: glossEntry.glossIndex,
            word: glossaryTranslations,
            originalWord: originalWord,
            reason: 'glossary translation missing'
        });
    });

    return missingGlossaryEntries;
}


// Helper: Check if glossary translation word (variant) is in the translation
function isGlossaryWordInTranslation(translation, variant, locale) {
    const lowerVariant = variant.toLowerCase();

    // Split translation into words (including handling combined words)
    const wordsInTranslation = translation.split(/\W+/);

    if (wordsInTranslation.includes(lowerVariant)) {
        return true;
    }

    // Check for Dutch verb prefixes, plurals, combined words etc.
    if (matchesWithDutchVerbPrefix(locale, lowerVariant, translation)) {
        return true;
    }

    // You can add more custom checks here if needed

    return false;
}




function oldcreateGlossArray(spansArray, map) {
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



function validate(language, original, translation, locale, showDiff, rowId, isPlural, DefGlossary) {
    //console.debug("validate started!!")
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
    missingTranslations =[]
    const stack = new Error().stack;
    // console.debug("Call stack:\n", stack);
    // console.debug('Caller:', getCallerDetails());
    //console.debug("debug:",debug)
    if (debug == true) {
        console.debug("original:", original)
        console.debug("translation:", translation)
        console.debug("Row:",rowId)
        console.debug("Devglossary:", DefGlossary)
        console.debug("Glossary:", glossary)
        // console.debug("showName:", showName)
        console.debug("showDiff:", showDiff)
    }
    //DefGlossary = true
    if (DefGlossary == true) {
        myglossary = glossary
    }
    else {
        myglossary = glossary1
    }
    //console.debug("myglossary:",myglossary)
    newGloss = createNewGlossArray(myglossary);
    let isURL = isOnlyURL(original)
    
    if (!isURL) {
        if (myglossary.length != 0) {
            Array.from(myglossary).forEach((obj, i) => {
                if (!obj || typeof obj.key === "undefined" || typeof obj.value === "undefined") {
                    console.warn("Invalid glossary entry at index", i, ":", obj);
                }
            });
            // console.log("Invalid entry at index 368:", myglossary[368]);
            myGlossArray = Array.from(myglossary)
            // console.debug("glossaryArray:", myGlossArray)
            map = new Map(myGlossArray.map(obj => [obj.key, obj.value]))
            //console.debug("map :", map)
            //if (glossary_word.length != 0) {
             let markleftPanel =  document.querySelector(`#editor-${rowId} .editor-panel__left`)
            newText = ""
            if (markleftPanel != null) {
                pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
                singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
                singularText = singlepresent.getElementsByClassName('original')[0]

                if (pluralpresent != null) {
                    spansPlural = pluralpresent.getElementsByClassName("glossary-word")
                }
                spansSingular = singlepresent.getElementsByClassName("glossary-word")
                //console.debug("spans singular:",spansSingular)
                if (isPlural == true) {
                    spans = spansPlural
                }
                else {
                    spans = spansSingular
                }
                if (spans.length > 0) {
                    spansArray = Array.from(spans)
                    glossWords = createGlossArray(spansArray, newGloss)
                    missingTranslations =  findAllMissingWords(translation, glossWords, locale)
                    //console.debug("We have missing words:",missingTranslations,missingTranslations.length)
                    if (missingTranslations.length != 0) {
                        //console.debug("difference:", spans.length - missingTranslations.length)
                        //newpercentage = spans.length / missingTranslations.length
                        if ((spans.length - missingTranslations.length) != 0) {
                            newpercentage = Math.round((missingTranslations.length * 100) / spans.length);
                            newpercentage = 100 - newpercentage
                            //console.debug("missing:", missingTranslations)
                            toolTip = buildTooltipFromGlossaryArray(missingTranslations);
                           // console.debug("toolTip:", toolTip); // Output: "je, account"
                            foundCount = spans.length - missingTranslations.length
                        }
                        else {
                            newpercentage = 0;
                            foundCount = 0
                        }
                        //console.debug("We have a percentage:", newpercentage)
                    }
                    else {
                        newpercentage = 100;
                        foundCount = spans.length
                    }
                    
                    //console.debug("We have no missing glossary words percentage: ", newpercentage)
                    wordCount = spans.length
                    percent = newpercentage
                    newText = ""
                    return { wordCount, foundCount, percent, toolTip, newText };

                    //console.debug("houston we have a glossary")
                    //console.debug("spans:", spansSingular)
                    wordCount = spans.length
                    //console.debug("span length:", spans.length)
                    var spansArray = Array.from(spans)
                    for (spancnt = 0; spancnt < (spansArray.length); spancnt++) {
                        // console.debug("loop through glossary links:",)                      
                        myfoundCount = 0
                        thisresult = ""
                        wordToFind = spansArray[spancnt].textContent
                        wordToFind = wordToFind.toLowerCase()
                        thisresult = findByKey(map, wordToFind)
                        //console.debug("thisresult after find in map",thisresult,wordToFind)
                        if (thisresult != null && typeof thisresult != 'undefined') {
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
                                            if (transresult.count == 0) {
                                                //  console.debug("multi we do have a difference")
                                                toolTip += wordToFind + " - " + "check translation" + "\n"
                                                // console.debug("multi toolTip after find:",toolTip)
                                            }
                                            else {
                                                foundCount += 1
                                            }
                                        }
                                        else if (transresult.found == false) {
                                            toolTip += wordToFind + " - " + "check translation" + "\n"
                                        }
                                        else { console.debug("multi something is wrong here!") }
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
                                        else if (transresult.found == false) {
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
                                    }
                                }
                                //console.debug("translation + foundCount + count:",searchTerm, foundCount, count, toolTip)
                            }
                            else if (thisresult != null && thisresult.length > 1) {
                                // if the glossary word does contain more words, we need to check the other words as well
                                // but start with the first one
                                isFound = false
                                for (let cnt = 0; cnt < thisresult.length; cnt++) {
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
                                            foundCount += 1
                                            isFound = true
                                        }
                                        else if (lowertranslation.includes(" " + NewsearchTerm)) {
                                            if (strictValidation == false) {
                                                foundCount += 1
                                                isFound = true
                                            }
                                        }
                                        else if (lowertranslation.includes(NewsearchTerm + " ")) {
                                            if (strictValidation == false) {
                                                foundCount += 1
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
                                // console.debug("we have no result:", wordToFind)
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
                   //console.debug("no glossary words")
                    wordCount = 0;
                    toolTip = ""
                    foundcount = 0;
                    percent = 100;
                }
            }
            else {
                // console.debug("no leftpanel:",rowId)
                wordCount = 0;
                toolTip = ""
                foundcount = 0;
                percent = 100;
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
                toolTip = "Translation is empty"
            }
            else if (wordCount == foundCount) {
                // console.debug("counts are equal!")
                percent = 100;
                toolTip = ""
            }
            else if ((wordCount - foundCount) > 0) {
                //console.debug("we found a difference")
                percent = Math.round((foundCount * 100) / wordCount);
            }
            //console.debug("total toolTip:",toolTip)
        }
        else {
            if (debug) {
                console.debug("No glossary")
            }
        }
    }
    else {
       // console.debug("We do have an URL only:", original, isURL)
        percent = 100;
        toolTip = ""
    }
    newText = ""
    // console.debug("before return:",wordCount,foundCount,percent,toolTip)
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
function match(language, gWord, translation, gItemValue, original, oWord) {
    var glossaryverb;
    var count = 0;
    var myresult = false
    var positions = [];
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
                                count += 1
                                myresult = true
                            }
                            else {
                                console.debug("we did not find the word:", glossaryverb)
                                myresult = false
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
                        let result = containsVerbMultipleTimes(original, gWord)
                        if (result[1] > 1) {
                            console.debug("we have more then one")
                            count += result[1]
                            myresult = true
                        }
                        else {
                            let result = translation.includes(glossaryverb)
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
                                    myresult = false
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
            return { myresult, count };
        }
        else {
            if (!Array.isArray(gItemValue)) {
                glossaryverb = gItemValue;
                if (strictValidation) {
                    if (containsExactWord(translation, glossaryverb)) {
                        count += 1
                        myresult = true
                    }
                }
                else {
                    if (translation.includes(glossaryverb)) {
                        count += 1
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
                            count += 1
                            myresult = true
                            break
                        }
                    }
                    else {
                        if (translation.includes(glossaryverb)) {
                            count += 1
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
async function fetchOldRec(url, rowId, showDiff) {
    // 23-06-2021 PSS added original translation to show in Meta
    var status;
    var tbodyRowCount = 0;
    var fetchOld_status = "";
    var OldRec_status
    var diff;
    var diffType = "diffWords"; // this is to determine the differenct between lines
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    if (e != null) {
        let curr_trans = e.querySelector("#editor-" + rowId + " .foreign-text").textContent;
        OldRec_status = document.querySelector(`#editor-${rowId} span.panel-header__bubble`).innerHTML;
        switch (OldRec_status) {
            case "current":
                newurl = url.replace("mystat", "waiting");
                fetchOld_status = "current"
                break;
            case "waiting":
                newurl = url.replace("mystat", "fuzzy");
                fetchOld_status = "fuzzy"
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
                    //console.debug("table:",table)
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
                        rowContent = table.rows[tbodyRowCount -1];
                       // console.debug("rowcontent:",rowContent)
                        orig = rowContent.getElementsByClassName("original-text");
                       // console.debug("orig:",orig)
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
                            console.debug("orig[0]:",orig[0])
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
                                var changes = JsDiff[diffType](newStr, oldStr);
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
                                diff = JsDiff[diffType](newStr, oldStr);
                            }
                            fragment = document.createDocumentFragment();
                            if (typeof fragment != "undefined") {
                                diff.forEach((part) => {
                                    // 03-03-2025 PSS changed the name "status" to "OldRec_status" as it generated a visual error, it was also nowhere defined
                                    // green for additions, red for deletions
                                    // dark grey for common parts
                                    if (OldRec_status == "current") {
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
                                    else if (OldRec_status = "waiting") {
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
    var rejected;
    var waiting;
    var fuzzy;
    var current;
    var old = "";
    var wait = ""
    var curr = ""
    var rejec = ""
    var translatorName = ""
    // console.debug("fetchold:",mycurrent,url)
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

    fetch(url, {
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
                var table = await doc.getElementById("translations");
                if (table != null) {
                    let tr = table.rows;
                    let currstring = "";
                    const tbodyRowCount = table.tBodies[0].rows.length;
                    // 04-07-2021 PSS added counter to message for existing translations
                    rejected = table.querySelectorAll("tr.preview.status-rejected");
                    waiting = table.querySelectorAll("tr.preview.status-waiting");
                    fuzzy = table.querySelectorAll("tr.preview.status-fuzzy");
                    curr = table.querySelectorAll("tr.preview.status-current");
                    //console.debug("curr:",curr.length,tbodyRowCount)
                    old = table.querySelectorAll("tr.preview.status-old");
                    //console.debug("waiting:", curr)
                    if (curr != "" && curr.length != 0) {
                        currcount = " Current:" + curr.length;
                        //console.debug("table:",table)
                        currstring = table.querySelector("tr.preview.status-current");
                        curreditor = table.querySelector("tr.editor.status-current");
                        panelRight = curreditor.querySelector('.editor-panel__right .meta')
                        const dlElements = panelRight.querySelectorAll('dl');
                        let targetIndex = 1; // normally we want the third <dl>

                        // Check if any <dl> contains "UTC"
                        dlElements.forEach(dl => {
                            if (dl.textContent.includes('UTC')) {
                                targetIndex += 1; // shift up by one
                            }
                        });

                        // Now get the corrected <dl> and extract the <dd> value
                        const targetDl = dlElements[targetIndex];
                        translatorName = targetDl?.querySelector('dd')?.textContent.trim();
                        currstring = currstring.querySelector(".translation-text")
                        if (currstring.innerText == null) {
                            currstring = "";
                        }
                        else { currstring = currstring.innerText }
                    }
                    else {
                        currcount = "";
                    }
                    //console.debug("waiting:",waiting)
                    if (waiting != "" && waiting.length != 0) {
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
                       // console.debug("old1:",old[0])
                        prev_trans = prev_trans.querySelector("td.translation.foreign-text")
                        //console.debug("old:", prev_trans)
                        old = " Old:" + old.length;
                    }
                    else {
                        old = "";
                    }
                    //console.debug("result of records found:",wait, rejec, fuz, old, rowId)
                    //console.debug("single:",single)
                    if (tbodyRowCount > 2 && single == "False") {
                        // we need to fetch the previous state first
                        old_status = document.querySelector("#preview-" + rowId);
                        myHistory = true;
                        my_checkpage = false;
                        repl_array = [];
                        // showDiff = 'true';
                        //(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff, currcount, currstring, current, record, myHistory, my_checkpage, repl_array, prev_trans, old_status, showDiff) {
                        showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, mycurrent, myHistory, my_checkpage, repl_array, prev_trans, old_status, rowId, "UpdateElementStyle", showDiff, translatorName);
                        //console.debug("result before updateelementstyle:",result)
                        let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
                        // 12-04-PSS We do not need to update the style when we find an old one!!
                        // updateElementStyle(checkElem, headerElem, result, "True", originalElem, wait, rejec, fuz, old, rowId, showName, "", currcount, currstring, mycurrent, "", false, false, [], prev_trans, old_status, showDiff);
                    }
                    else if (tbodyRowCount > 2 && single == "True") {
                        updateElementStyle(checkElem, headerElem, result, "False", originalElem, wait, rejec, fuz, old, rowId, showName, "", currcount, currstring, mycurrent, "", true, false, [], prev_trans, current,translatorName);
                        //var windowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes,width=800,height=650,left=600,top=0";
                        //window.open(url, "_blank", windowFeatures);
                    }
                }
            }
        }).catch(error => {
            if (error.response && error.response.status === 429) {
                console.debug('Too many requests. Please try again later.');
            } else {
                console.debug('Error fetching or processing data possible not in projects!:', error.message);
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
        let observer = new MutationObserver((mutations) => {
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
                   
                    chrome.storage.local.get(["DisableAutoClose"], function (data) {
                        const disable = String(data.DisableAutoClose) === "true"; // normalize to boolean
                        // Run gd_wait_table_alter if toggle is NOT explicitly true
                        if (!disable) {
                            gd_auto_hide_next_editor(addedNode);
                        }
                        else {
                            // we need to determine the row to add the buttons
                            //If a new editor is opened we need the buttons for translation
                            const preview = addedNode.nextElementSibling;
                            const next_editor = preview.nextElementSibling;
                            let myrow = next_editor.getAttribute('row')
                            addTranslateButtons(myrow);
                        }
                     });
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
        setTimeout(async function () {
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
        }, 20)
    });



function handleInputEvent(event, rowId) {
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
            textarea.setAttribute('value', textarea.value)
        })
    }
    console.debug("observer started:", observer)
    return observer
}



let editorObserver;

function start_editor_mutation_server(textarea, action, leftPanel) {
    //console.debug("start mutserver:", textarea, action, "myLeftPanel:", leftPanel);

    let targetNode = textarea instanceof Node ? textareas.active :
        textarea[0] instanceof Node ? textarea[0] : null;

    if (!targetNode) {
       // console.debug("start_editor_mutation_server: textarea is not valid");
        return;
    }

    // Prevent multiple listeners
    if (targetNode._observerAttached) return;
    targetNode._observerAttached = true;

    // Detect user input
    targetNode.addEventListener('input', () => {
        //console.debug("Input event triggered by user:", targetNode.value);

        // Simulate a mutation record to keep compatibility with handleMutation
        const fakeMutation = {
            target: targetNode,
            type: "characterData",
            oldValue: null
        };

        handleMutation([fakeMutation]);
    });

    // Wrap value setter to detect programmatic changes
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetNode), 'value');
    if (descriptor && descriptor.set) {
        const originalSetter = descriptor.set;
        Object.defineProperty(targetNode, 'value', {
            set(newValue) {
                originalSetter.call(this, newValue);

               // console.debug("Programmatic change to textarea:", newValue);

                const fakeMutation = {
                    target: targetNode,
                    type: "characterData",
                    oldValue: null
                };

                handleMutation([fakeMutation]);
            },
            get: descriptor.get
        });
    }

    //console.debug("start_editor_mutation_server: Input listener + value trap attached to:", targetNode);
}

function start_editor_mutation_server2(pluralTextarea, action, leftPanel) {
    //console.debug("start mutserver:", pluralTextarea, action, "myLeftPanel:", leftPanel);

    let targetNode = pluralTextarea instanceof Node ? pluralTextarea :
        pluralTextarea instanceof Node ? textarea : null;

    if (!targetNode) {
        //console.debug("start_editor_mutation_server2: textarea is not valid");
        return;
    }

    // Prevent multiple listeners
    if (targetNode._observerAttached) return;
    targetNode._observerAttached = true;

    // Detect user input
    targetNode.addEventListener('input', () => {
        //console.debug("Input event triggered by user:", targetNode.value);

        // Simulate a mutation record to keep compatibility with handleMutation
        const fakeMutation = {
            target: targetNode,
            type: "characterData",
            oldValue: null
        };
        MutationsPlural([fakeMutation])
        //handleMutation([fakeMutation]);
    });

    // Wrap value setter to detect programmatic changes
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetNode), 'value');
    if (descriptor && descriptor.set) {
        const originalSetter = descriptor.set;
        Object.defineProperty(targetNode, 'value', {
            set(newValue) {
                originalSetter.call(this, newValue);
               // console.debug("Programmatic change to textarea:", newValue);
                const fakeMutation = {
                    target: targetNode,
                    type: "characterData",
                    oldValue: null
                };
                MutationsPlural([fakeMutation])
                //handleMutation([fakeMutation]);
            },
            get: descriptor.get
        });
    }

    //console.debug("start_editor_mutation_server: Input listener + value trap attached to:", targetNode);
}


function findByKey(map, searchKey) {
    return map.get(searchKey) || null;
}

function decodeHTML(html) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = html;
    return textArea.value;
}
// Function to handle DOM mutations
async function handleMutation(mutationsList, observer) {
    //console.debug("We handle mutations:", mutationsList);
    var spansArry=[]
    const mutation = mutationsList[0];
    if (!mutation || !mutation.target) return;

    const closestParent = mutation.target.closest ? mutation.target.closest('[row]') : mutation.target.parentElement.closest('[row]');
   // console.debug("glosestParent:", closestParent)
    if (!closestParent) return;

    const row = closestParent.getAttribute("row");
    //console.debug("row:", row);
    // Use row-based lookup to reliably get the left panel
    const leftPanel = document.querySelector(`#editor-${row} .editor-panel__left`);
    if (!leftPanel) {
        console.debug(`Could not find leftPanel for row ${row}`);
        return;
    }
    //console.debug("leftPanel:", leftPanel)
    if (!leftPanel) return;

    addTranslateButtons(row);

    const detailPreview = document.querySelector(`#preview-${row}`);
    const detailEditor = document.querySelector(`#editor-${row}`);
    if (!detailEditor || !detailPreview) return;

    const originalElem = leftPanel.querySelector(".original-raw");
    const originalText = originalElem?.textContent;
    const textareaActiveElem = leftPanel.querySelector("div.textareas.active");
    const textareaElem = textareaActiveElem.querySelector("textarea.foreign-text");
    const translation = textareaElem.value;
    textareaElem?.focus();
    //console.debug("translation:",translation)
    if (!translation) {
        console.debug("we have no translation!")
        return;
    }

    const glossaryToUse = DefGlossary ? glossary : glossary1;
    const newGloss = createNewGlossArray(glossaryToUse);

    let spansSingular = [], spansPlural = [], spans = [];
    let isPlural = leftPanel.querySelector(".source-string__plural") !== null;

    const singlePresent = leftPanel.querySelector(`.editor-panel__left .source-string__singular`);
    const pluralPresent = leftPanel.querySelector(`.editor-panel__left .source-string__plural`);

    if (pluralPresent != null) {
        spansPlural = pluralPresent.getElementsByClassName("glossary-word");
        spans = spansPlural
        // Add gloss-index attribute and remove previous highlights
        spansArray = Array.from(spans);
        for (let spancnt = 0; spancnt < spansArray.length; spancnt++) {
            spansArray[spancnt].setAttribute('gloss-index', spancnt);
            spansArray[spancnt].classList.remove('highlight');
        }
    }

    if (singlePresent != null) {
        spansSingular = singlePresent.getElementsByClassName("glossary-word");
        spans = spansSingular
        spansArray = Array.from(spans);
        // Add gloss-index attribute and remove previous highlights
        for (let spancnt = 0; spancnt < spansArray.length; spancnt++) {
            spansArray[spancnt].setAttribute('gloss-index', spancnt);
            spansArray[spancnt].classList.remove('highlight');
        }
    }

    const glossWords = createGlossArray(spansArray, newGloss);
    missingTranslations = await findAllMissingWords(translation, glossWords, locale)
    //console.debug("missing in handlemutation:",missingTranslations)
    const toolTipLines = [];

    const toolTip = toolTipLines.join('\n');
    const foundCount = spansArray.length - missingTranslations.length;

    const markerPresent = leftPanel.getElementsByClassName("marker");
    const missingVerbsButton = leftPanel.getElementsByClassName("translocal-entry-missing-button")[0];
    const panelTransMenu = leftPanel.getElementsByClassName("panelTransMenu")[0];
    const priorityElem = document.querySelector(`#preview-${row} .priority`);

    if (missingTranslations.length > 0) {
        if (missingVerbsButton) {
            missingVerbsButton.style.visibility = "visible";
            const headerTitle = leftPanel.querySelector('.panel-header')?.title || "";
            missingVerbsButton.title = `${headerTitle}\nMissing glossary entry\n${toolTip}`;
        }

        const percent = Math.round((foundCount / spansArray.length) * 100);
        if (percent === 100) {
            panelTransMenu.style.backgroundColor = "green";
            priorityElem.innerHTML = '<span style="color:black">100</span>';
            if (markerPresent[0]) markerPresent[0].remove();
        } else if (percent >= 66) {
            panelTransMenu.style.backgroundColor = "yellow";
            priorityElem.innerHTML = '<span style="color:black">66</span>';
        } else if (percent >= 33) {
            panelTransMenu.style.backgroundColor = "orange";
            priorityElem.innerHTML = '<span style="color:black">33</span>';
        } else if (percent > 0) {
            panelTransMenu.style.backgroundColor = "darkorange";
            priorityElem.innerHTML = '<span style="color:black">10</span>';
        } else {
            panelTransMenu.style.backgroundColor = "red";
            priorityElem.innerText = spansArray.length;
        }
        //console.debug("before marking:", toolTip, translation)
        mark_glossary(leftPanel, toolTip, translation, row, false);
    } else {
        if (missingVerbsButton) {
            missingVerbsButton.style.visibility = "hidden";
            missingVerbsButton.title = "";
        }
        if (markerPresent[0]) markerPresent[0].remove();
        panelTransMenu.style.backgroundColor = "green";
        priorityElem.innerHTML = '<span style="color:black">100</span>';
    }

    const inputId = `translation_${row}_0`;
    const inputElement = document.getElementById(inputId);
    if (inputElement) inputElement.focus();
}

function MutationsPlural(mutationsList, observer) {
    //console.debug("We handle plural:",mutationsList)
    var pluralOriginal;
    var detailEditor;
    var glossWords;
    if (DefGlossary == true) {
        var myglossary = glossary
    }
    else {
        var myglossary = glossary1
    }
    const glossaryToUse = DefGlossary ? glossary : glossary1;
    const newGloss = createNewGlossArray(glossaryToUse);
    
    const mutation = mutationsList[0];
    //console.debug("mutation in plural:",mutation)
    if (!mutation || !mutation.target) return;
    const closestParent = mutation.target.closest ? mutation.target.closest('[row]') : mutation.target.parentElement.closest('[row]');
    // console.debug("glosestParent:", closestParent)
    if (!closestParent) return;
    var leftPanel = closestParent.parentElement.parentElement.parentElement.parentElement

    const pluralPresent = leftPanel.querySelector(`.editor-panel__left .source-string__plural`);

    if (pluralPresent != null) {
        spansPlural = pluralPresent.getElementsByClassName("glossary-word");
       // console.debug("spansPlural plural:", spansPlural)
        spans = spansPlural
        // Add gloss-index attribute and remove previous highlights
        spansArray = Array.from(spans);
        glossWords = createGlossArray(spansArray, newGloss);
        for (let spancnt = 0; spancnt < spansArray.length; spancnt++) {
            spansArray[spancnt].setAttribute('gloss-index', spancnt);
            spansArray[spancnt].classList.remove('highlight');
        }
    }
    mutationsList.forEach(async function (mutation) {
        let targetTextarea = mutation.target;
        //console.log('Change detected in:', targetTextarea.id, 'Content:', targetTextarea.value);
        var closestParent = mutation.target;
        //console.debug(closestParent)
        // we need to go back in the Dom to get the rowId
        rowId = closestParent.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.getAttribute("row")
        detailPreview = getPreview(rowId)
        // detailPreview = document.querySelector(`#preview-${rowId}`);
        detailEditor = document.querySelector(`#editor-${rowId}`);
        if (detailEditor != null) {
            mypluralOriginal = detailEditor.getElementsByClassName("source-string__plural")
            pluralOriginal = mypluralOriginal[0].querySelector(".original-raw")
            //console.debug("pluralOriginal:",pluralOriginal)
            // we only need to validate if there are glossary words
            if (detailPreview != null) {
                detail_glossary = detailPreview.querySelector(`.glossary-word`)
                pluralpresent = leftPanel.querySelector(`.editor-panel__left .source-string__plural`);
                translation = await mutation.target.value
                //console.debug("translation plural:",translation)
                mutation.target.focus()
                myGlossArray = await Array.from(myglossary)
                map = new Map(myGlossArray.map(obj => [obj.key, obj.value]))
                MyResult = await validate(locale, pluralOriginal.textContent, translation, locale, false, rowId, true, DefGlossary)
                mark_glossary(leftPanel, "", translation, rowId, true)
                missingTranslations = await findAllMissingWords(translation, glossWords, locale)
                const toolTipLines = [];
                // Below also marks second plural!!
                missingTranslations.forEach(({ word, glossIndex }) => {
                     spansArray[glossIndex].classList.add('highlight');
                     toolTipLines.push(`${Array.isArray(word) ? word.join(', ') : word} - Missing`);
                });

                MyResult.percent = 0;
                let missingVerbsButton = leftPanel.getElementsByClassName("translocal-entry-missing-button");
                panelTransMenu = leftPanel.getElementsByClassName("panelTransMenu")
                let headerElem = leftPanel.querySelector(`.panel-header`);
                editor = leftPanel.querySelector('.original-raw')
                //preview = leftPanel.parentElement.parentElement.parentElement
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

                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)
                                }
                                else if (MyResult.percent >= 66 && MyResult.percent < 100) {
                                    panelTransMenu[0].style.backgroundColor = "yellow";
                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)
                                }
                                else if (MyResult.percent >= 33) {
                                    //else if (valResult.percent >= 33) {
                                    panelTransMenu[0].style.backgroundColor = "orange";

                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)
                                }
                                else if (MyResult.percent >= 10) {
                                    //else if (valResult.percent == 10) {
                                    panelTransMenu[0].style.backgroundColor = "purple";
                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)
                                }
                                else if (MyResult.percent < 33 && MyResult.percent > 0) {
                                    // else if (valResult.percent < 33 && valResult.percent > 0) {
                                    panelTransMenu[0].style.backgroundColor = "darkorange";
                                 //   mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)
                                }
                                else if (MyResult.percent == 0) {
                                    panelTransMenu[0].style.backgroundColor = "red";
                                   // mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)
                                    //   }
                                }
                                mark_glossary(leftPanel, MyResult.toolTip, translation, rowId,true)
                            } // missingverbs is null
                        }
                        else {
                            // console.debug("Tooltip empty")
                            // span_glossary = leftPanel.querySelectorAll(".glossary-word")
                            // console.debug("span_glossary:", span_glossary)
                            //await remove_all_gloss(leftPanel, preview,true, rowId)
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
                        MutResult = await validate(locale, pluralOriginal.textContent, translation, locale, false, rowId, true, DefGlossary)
                        if (MutResult.percent == 100) {
                            let markerpresent = leftPanel.getElementsByClassName("marker");
                            if (typeof markerpresent[0] != 'undefined') {
                                markerpresent[0].remove()
                            }
                            textareaElem = await leftPanel.querySelector(`textarea.foreign-text`);
                            if (myeditor_original != null && preview_original != null) {
                                myeditor_original.innerHTML = preview_original.innerHTML
                            }
                            panelTransMenu[0].style.backgroundColor = "green";
                            mark_glossary(leftPanel, MyResult.toolTip, translation, rowId, true)

                            await remove_all_gloss(leftPanel,"",false,rowId)
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
