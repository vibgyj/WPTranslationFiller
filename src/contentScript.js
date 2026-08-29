// ============================================================
// REFACTORING NOTES (what changed and why)
// ============================================================
// 1. DEAD CODE REMOVED
//    - prevfindMissingTranslations()         – superseded by findMissingTranslations
//    - workingfindMissingTranslations()      – superseded by works2105findMissingTranslations
//    - works2105findMissingTranslations()    – superseded by working2105findMissingWords
//    - working2105findMissingWords()         – superseded by findAllMissingWords (caller)
//    - The entire unreachable lower block in validate() after the early return
//    - Duplicate sampleUse() definition (kept the first)
//    - loadSet1() – identical to loadSet(), all callers now use loadSet()
//    - Duplicate escapeRegExp() definition (kept the second, which covers more chars)
//
// 2. applyPercentStyle(panelTransMenu, priorityElem, percent, missingVerbsButton)
//    – Single function replaces copy-pasted color blocks in:
//      handleMutation(), MutationsPlural(), updateElementStyle()
//
// 3. checkbuttonClick() split into focused helpers:
//    - handleCopySuggestionClick(target)     – copy-suggestion branch
//    - resolveRowId(event)                   – rowId resolution from DOM
//    - handleDetailsAction(rowId, event)     – the "Details" branch (main body)
//    - processTMandAISuggestions(rowId)      – TM / DeepL / OpenAI suggestion post-processing
//    checkbuttonClick() is now a short dispatcher that calls these helpers.
// ============================================================

// ─── Global state ────────────────────────────────────────────
var glossary  = [];
var glossary1 = [];
var db;
var dbDeepL;
var jsstoreCon;
var myGlotDictStat;
var interCept           = false;
var strictValidation    = false;
var StartObserver       = true;
var LocRecCout;
var autoCopyClipBoard   = false;
var LoadGloss;
var DispCount;
var is_pte;
var classToolTip;
var is_entry            = false;
var is_pte              = document.querySelector("#bulk-actions-toolbar-top") !== null;
var GLOBAL_GLOSSARY     = [];
var no_period           = false;
var spaceMap            = {};
var Top_p               = 0.1;
var Top_k               = 1.;
var translator          = "";
var DefGlossary         = true;
var RecCount            = 0;
var showHistory         = false;
var DispClipboard;
var DisableautoClose    = false;
var DebugMode           = false;
var Rearrange_Sentences = true;
var PlaceholderLog = [];
var replaced_char = false
var noChevrons = false

chrome.storage.local.get(null, function (items) {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith("glossary1"));
});

function savePage() {
    var currentUrl = window.location.href;
    chrome.storage.local.set({ lastPageVisited: currentUrl });
}
savePage();

if (typeof addon_translations == 'undefined') {
    var addon_translations = {};
}

async function loadTranslations(language) {
    try {
        const url = chrome.runtime.getURL(`locales/${language}.json`);
        const res = await fetch(url);
        addon_translations = await res.json();
    } catch (error) {
        console.debug(`Failed to load "${language}.json", falling back to "en.json".`);
        try {
            const fallbackUrl = chrome.runtime.getURL('locales/en.json');
            const res = await fetch(fallbackUrl);
            addon_translations = await res.json();
        } catch (fallbackError) {
            console.debug("Failed to load default 'en.json' translations:", fallbackError);
            addon_translations = {};
        }
    }
}

function __(key) {
    return addon_translations[key] || key;
}

async function initTranslations(event) {
    
    chrome.storage.local.get(["noUI"], async function (data) {
        let userLang = await checkLocale() || 'en-gb';
        if (!toBoolean(data.noUI)) {
            if (typeof addon_translations.length == 'undefined') {
                await loadTranslations(userLang);
            } else {
                console.debug("Language is already present");
            }
        } else {
            await loadTranslations("en-gb");
        }
        await translatedButton();
    });
}

// ─── Editor detection & startup ──────────────────────────────
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
        const contentEditable = container.querySelector('[contenteditable="true"], textarea');
        if (contentEditable) {
            observer.disconnect();
            startFullScript([container]);
        }
    });

    textareaObserver.observe(container, observerConfig);

    const fallback = container.querySelector('[contenteditable="true"], textarea');
    if (fallback) {
        textareaObserver.disconnect();
        startFullScript([container]);
    }
}

if (document.body) {
    initTextareaDetection();
} else {
    window.addEventListener('DOMContentLoaded', () => { initTextareaDetection(); });
}

// ─── Tooltip handler ─────────────────────────────────────────
function setupTooltipHandler() {
    document.addEventListener("mouseover", (event) => {
        const tooltip = document.querySelector(".ui-tooltip");
        if (event.target.closest(".has-tooltip") && tooltip) {
            tooltip.style.display = "block";
            setTimeout(() => {
                if (!tooltip.matches(":hover") && !event.target.matches(":hover") && !event.target.closest(".dropdown")) {
                    tooltip.style.display = "none";
                }
            }, 2000);
        }
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('button.panel-header-actions__next.with-tooltip');
        if (!button) return;
        let tr = button.closest('tr');
        if (!tr) return;
        let nextTr = tr.nextElementSibling;
        if (nextTr) {
            rowId = nextTr.getAttribute("row");
            if (toBoolean(autoCopyClipBoard)) { copyToClipBoard(rowId); }
        }
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('button.panel-header-actions__previous.with-tooltip');
        if (!button) return;
        let tr = button.closest('tr');
        if (!tr) return;
        let secondPrevTr = tr.previousElementSibling?.previousElementSibling;
        if (secondPrevTr) {
            let rowId = secondPrevTr.getAttribute("row");
            if (toBoolean(autoCopyClipBoard)) { copyToClipBoard(rowId); }
           }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === "r" && event.ctrlKey && event.shiftKey) {
            if (event) event.preventDefault();
            const btn = document.createElement("button");
            btn.textContent = "Click to select test file";
            btn.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:1rem 2rem;font-size:1.2rem;z-index:10000;cursor:pointer;border-radius:8px;border:1px solid #333;background-color:#eee;box-shadow:0 2px 8px rgba(0,0,0,0.15);position:relative;";
            const closeBtn = document.createElement("span");
            closeBtn.textContent = "×";
            closeBtn.style.cssText = "position:absolute;top:2px;right:6px;cursor:pointer;font-size:1.2rem;user-select:none;";
            closeBtn.title = "Close";
            const wrapper = document.createElement("div");
            wrapper.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;display:inline-block;";
            closeBtn.onclick = () => wrapper.remove();
            btn.onclick = () => { loadTestsFromFile(); wrapper.remove(); };
            wrapper.appendChild(btn);
            btn.appendChild(closeBtn);
            document.body.appendChild(wrapper);
        }
    });

    document.addEventListener("mouseout", (event) => {
        const tooltip = document.querySelector(".ui-tooltip");
        if (tooltip && !event.relatedTarget?.closest(".ui-tooltip") && !event.relatedTarget?.closest(".has-tooltip") && !event.relatedTarget?.closest(".dropdown")) {
            tooltip.style.display = "none";
            tooltip.style.position = "";
            tooltip.style.background = "transparent";
            tooltip.style.border = "none";
            tooltip.style.boxShadow = "none";
            tooltip.style.left = "";
            tooltip.style.top = "";
            tooltip.innerHTML = "";
            if (tooltip.parentElement) tooltip.parentElement.style.position = "";
            tooltip.remove();
        }
    });
}

// ─── Utility ─────────────────────────────────────────────────
function extractIdPart(idString) {
    const match = idString.match(/^translation_(.+)$/);
    return match ? match[1] : null;
}

function findEditorRow(textareaElem) {
    return textareaElem.closest('tr.editor');
}

// ─── startFullScript ─────────────────────────────────────────
async function startFullScript(textarea) {
    var rowId  = 0;
    var myEditor = "";
    currWindow = window.self;
    await initTranslations();
    mytextarea = textarea[0].firstChild.nextElementSibling;
    myEditor   = await findEditorRow(mytextarea);
    rowId      = await myEditor ? myEditor.getAttribute('row') : null;
    start_editor_mutation_server(textarea, "Details", "");
    pluralpresent = document.querySelector(`#editor-${rowId} div.textareas[data-plural-index="1"]`);
    if (pluralpresent != null) {
        let pluralTextarea = pluralpresent.querySelector('textarea');
        start_editor_mutation_server2(pluralTextarea, "Details", "");
    }
    mytextarea.style.display     = 'block';
    mytextarea.style.visibility  = 'visible';
    mytextarea.disabled          = false;
    mytextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mytextarea.focus();
    adjustLayoutScreen();
    setupTooltipHandler();

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    mytextarea.dispatchEvent(clickEvent);

    const myCustomEvent = new CustomEvent('myCustomEvent', { detail: { message: 'This is a custom event!' } });

    await initPublicVars();
    startToggleListener();
    addCheckmarkClickListener();
    addTranslateButtons(rowId);
    let is_loaded = await loadGlossaries(myCustomEvent);

    if (is_loaded === "success") {
        doValidation();
        checkBlankLabels();
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
                checkBlankLabels();
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
function sendMessageToInjectedScript(message) {
    window.postMessage(message, '*');
}

// ─── IndexedDB / storage setup ───────────────────────────────
if (!window.indexedDB) {
    messageBox("error", "Your browser doesn't support IndexedDB!<br> You cannot use local storage!");
} else {
    jsstoreCon = new JsStore.Connection();
    db = myOpenDB(db);
}

if (typeof (Storage) !== "undefined") {
    interCept = localStorage.getItem("interXHR");
} else {
    interCept = false;
}

if (interCept === null || (interCept !== "true" && interCept !== "false")) {
    interCept = false;
    localStorage.setItem("interXHR", interCept);
}

sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });

// ─── Storage helpers ─────────────────────────────────────────
const setToonDiff = async function (obj) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(obj, resolve);
        } catch (ex) { reject(ex); }
    });
};

const getToonDiff = async function (key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(key, function (value) { resolve(value[key]); });
        } catch (ex) { reject(ex); }
    });
};

const csvParser = data => data.split(/\r\n|\n/);

// ─── ShowTransDiff default ────────────────────────────────────
chrome.storage.local.get(["showTransDiff"], function (data) {
    const setOn  = { toonDiff: true  };
    const setOff = { toonDiff: false };
    if (data.showTransDiff != "null") {
        setToonDiff(data.showTransDiff == true ? setOn : setOff);
    } else {
        setToonDiff(setOff);
    }
});

var glob_row      = 0;
var convertToLow  = true;
var detailRow     = 0;
var errorstate    = "OK";
var locale        = checkLocale();
var showGlosLine;

gd_wait_table_alter();
addCheckBox();
exportGlossaryForOpenAi(locale);

var parrotActive;
const script   = document.createElement('script');
script.src     = chrome.runtime.getURL('wptf-inject.js');
(document.head || document.documentElement).prepend(script);

var fileSelector = document.createElement("input");
fileSelector.setAttribute("type", "file");
// This function selects all checkboxes except those with the class "status-waiting" when the "select all" checkbox is checked. 
const selectAll = document.querySelector('th.gp-column-checkbox input[type="checkbox"]');

if (selectAll) {
  selectAll.addEventListener('change', function () {
    if (this.checked) {
      setTimeout(() => {
        document.querySelectorAll('tr[class*="status-"]').forEach(row => {
          if (!row.classList.contains('status-waiting') && !row.classList.contains('status-fuzzy')) {
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = false;
          }
        });
      }, 0);
    }
  });
}
// ─── Keyboard shortcuts ───────────────────────────────────────
document.addEventListener("keydown", async function (event) {

    if (event.altKey && event.shiftKey && (event.key === "&")) {
        if (event) event.preventDefault();
        var org_verb, wrong_verb;
        chrome.storage.local.get(["destlang"], function (data) {
            is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
            if (is_pte) {
                let e = document.querySelector("#editor-" + glob_row + " div.editor-panel__left .panel-content .original");
                org_verb   = (e != "undefined" && e != null) ? e.innerText : "Original";
                let f = document.querySelector("#editor-" + glob_row + " div.editor-panel__left .panel-content .foreign-text");
                wrong_verb = (f != "undefined" && e != null) ? f.value : "Wrong verb";
                scrapeconsistency(data.destlang, org_verb, wrong_verb);
            } else {
                messageBox("error", "You do not have permissions to start this function!");
            }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "?")) {
        if (event) event.preventDefault();
        await handleStats();
    }

    if (event.altKey && event.shiftKey && (event.key === "*")) {
        if (event) event.preventDefault();
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        chrome.storage.local.get(["bulkWait"], async function (data) {
            let bulkWait = data.bulkWait;
            if (bulkWait != null && typeof bulkWait != 'undefined') {
                let myInterCept = await localStorage.getItem('interXHR');
                let interCept   = myInterCept === 'true';
                sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
                bulk_timer = bulkWait;
                bulkSave("false", bulk_timer);
            }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "+")) {
        if (event) event.preventDefault();
        chrome.storage.local.set({ convertToLower: true });
        chrome.storage.local.get(["convertToLower"], function (data) {
            if (data.convertToLower != "null") convertToLow = data.convertToLower;
        });
        UpperCaseButton.className = "UpperCase-button uppercase";
        toastbox("info", "Switching conversion on", "1200", "Conversion");
    }

    if (event.altKey && event.shiftKey && (event.key === "-")) {
        if (event) event.preventDefault();
        chrome.storage.local.set({ convertToLower: false });
        chrome.storage.local.get(["convertToLower"], function (data) {
            if (data.convertToLower != "null") convertToLow = data.convertToLower;
        });
        UpperCaseButton.className = "UpperCase-button";
        toastbox("info", "Switching conversion off", "1200", "Conversion");
    }

    if (event.altKey && event.shiftKey && (event.key === "%")) {
        if (event) event.preventDefault();
        copyToClipBoard(detailRow);
    }

    if (event.altKey && event.shiftKey && (event.key === "U")) {
        if (event) event.preventDefault();
        chrome.storage.local.get(["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"], function (data) {
            var allrows = [], myrows = [], myFile;
            toastbox("info", "Select file is started", "2000", "Select file");
            var input = document.createElement('input');
            input.type = 'file';
            input.onchange = _this => {
                let files = Array.from(input.files);
                if (files && files[0]) {
                    myFile = files[0];
                    var reader = new FileReader();
                    reader.addEventListener('load', function (e) {
                        myrows = e.target.result.replace(/\r/g, "").split(/\n/);
                        let regel = '';
                        for (var i = 0; i < myrows.length - 1; i++) {
                            regel = myrows[i];
                            if (regel.startsWith("msgid") || regel.startsWith("msgstr") || regel.startsWith("msgctxt") || regel.startsWith("msgid_plural") || regel.startsWith("msgstr[0]") || regel.startsWith("msgstr[1]")) {
                                allrows.push(regel);
                            }
                        }
                        countimported = new_import_po(data.destlang, myFile, allrows);
                    });
                    reader.readAsText(myFile);
                } else {
                    messageBox("info", __("No file selected"));
                }
            };
            input.click();
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "#")) { if (event) event.preventDefault(); setmyCheckBox(event); }
    if (event.altKey && event.shiftKey && (event.key === "@")) { if (event) event.preventDefault(); deselectCheckBox(event); }
    if (event.altKey && event.shiftKey && (event.key === "F1")) { if (event) event.preventDefault(); result = resetDB(); }
    if (event.altKey && event.shiftKey && (event.key === "F2")) { if (event) event.preventDefault(); result = deleteDB(); }

    if (event.altKey && event.shiftKey && (event.key === "F3")) {
        if (event) event.preventDefault();
        chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyMistral", "apikeyClaude", "apikeyOllama", "apikeyLingvanex", "apikeyGemini", "apikeyNLP", "GeminiSelect", "GeminiPrompt", "LocalOllama", "OpenAIPrompt", "ClaudePrompt", "OpenAISelect", "MistralSelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss", "ClaudModel", "ollamaModel", "ollamaPrompt", "LMStudioWait"], function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined') {
                if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                    if (data.transsel != "undefined") {
                        convertToLow = data.convertToLower;
                        result = populateWithLocal(data.apikey, data.apikeyDeepl, data.apikeyDeepSeek, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, data.DeeplFree);
                    } else { messageBox("error", "You need to set the translator API"); }
                } else { messageBox("error", "You need to set the parameter for Destination language"); }
            } else { messageBox("error", "For " + data.transsel + " no apikey is set!"); }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "F5")) {
        if (event) event.preventDefault();
        chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "showHistory", "showTransDiff", "convertToLower", "DeeplFree", "TMwait", "spellCheckIgnore"], function (data) {
            if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft") {
                if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                    if (data.transsel != "undefined") {
                        let formal   = checkFormal(false);
                        convertToLow = data.convertToLower;
                        var TMwait   = (typeof data.TMwait == "undefined") ? 500 : data.TMwait;
                        result = populateWithTM(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, data.DeeplFree, TMwait, data.spellCheckIgnore, TMtreshold, interCept);
                    } else { messageBox("error", "You need to set the translator API"); }
                } else { messageBox("error", "You need to set the parameter for Destination language"); }
            } else { messageBox("error", "For " + data.transsel + " no apikey is set!"); }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "F6")) {
        if (event) event.preventDefault();
        var rule = { "id": 1, "priority": 1, "action": { "type": "allow" }, "condition": { "regexFilter": "-get-tm-suggestions", "resourceTypes": ["xmlhttprequest"] } };
        resblock = chrome.declarativeNetRequest.updateEnabledRulesets({ addRules: [rule] });
    }

    if (event.altKey && event.shiftKey && (event.key === "F7")) {
        res = chrome.declarativeNetRequest.updateEnabledRuleset({ addRules: [{ "id": 1, "priority": 1, "action": { "type": "block" }, "condition": { "regexFilter": "-get-tm-suggestions", "resourceTypes": ["xmlhttprequest"] } }], removeRuleIds: [1] });
    }

    if (event.altKey && event.shiftKey && (event.key === "F8")) {
        if (event) event.preventDefault();
        interCept = localStorage.getItem("interXHR");
        if (interCept === null || (interCept !== "true" && interCept !== "false")) {
            interCept = false;
            localStorage.setItem("interXHR", interCept);
        }
        if (interCept === "false") {
            toastbox("info", "Switching interceptXHR to on", "1200", "InterceptXHR");
            localStorage.setItem('interXHR', true);
            interCept = true;
        } else {
            toastbox("info", "Switching interceptXHR to off", "1200", "InterceptXHR");
            localStorage.setItem('interXHR', false);
            interCept = false;
        }
        sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
        location.reload();
    }

    if (event.altKey && event.shiftKey && (event.key === "F9"))  { if (event) event.preventDefault(); SwitchTMClicked(); }
    if (event.altKey && event.shiftKey && (event.key === "F10")) { if (event) event.preventDefault(); alert("Editor options:" + window['wpgpt_load_history_status']); }

    if (event.altKey && event.shiftKey && (event.key === "F11")) {
        if (event) event.preventDefault();
        toastbox("info", "checkFormal is started wait for the result!!", "2000", "CheckFormal");
        checkPageClicked(event);
        close_toast();
    }

    if (event.altKey && event.shiftKey && (event.key === "F12")) {
        cuteToast({ type: "info", message: "Counting is started", timer: 1000 }).then(() => countWordsinTable());
    }

    if (event.altKey && event.shiftKey && (event.key === "S" || event.key === "s")) {
        if (event) event.preventDefault();
        chrome.storage.local.get(["LtKey", "LtUser", "LtLang", "LtFree", "spellCheckIgnore"], function (data) {
            if (data.LtFree == true) {
                startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
            } else {
                if (typeof data.LtKey != "undefined" && data.LtKey != "") {
                    if (data.LtUser != "undefined" && data.LtUser != "") {
                        if (data.LtLang != "undefined" && data.LtLang != "") {
                            startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
                        } else { messageBox("error", "You need to set the language"); }
                    } else { messageBox("error", "You need to set the parameter for the user"); }
                } else { messageBox("error", "No apikey is set for languagetool!"); }
            }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "L" || event.key === "l")) {
        var file, arrayFiles;
        fileSelector.click();
        fileSelector.addEventListener("change", function onAltShiftLChange(event) {
            fileSelector.removeEventListener("change", onAltShiftLChange);
            fileList    = event.target.files;
            arrayFiles  = Array.from(event.target.files);
            file        = fileList[0];
            if (file.type == 'text/csv' || "application/vnd.ms-excel") {
                if (fileList[0]) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var ld_glossary = csvParser(e.target.result);
                        chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                            let formal   = checkFormal(false);
                            load_glossary(ld_glossary, data.apikeyDeepl, data.DeeplFree, data.destlang);
                            file = "";
                        });
                        reader.onerror = function () { console.log(reader.error); };
                    };
                    reader.readAsText(fileList[0]);
                }
            } else {
                messageBox("error", __("File is not a csv!"));
            }
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "D" || event.key === "d")) {
        chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
            show_glossary(data.apikeyDeepl, data.DeeplFree, data.destlang);
        });
    }

    if (event.altKey && event.shiftKey && (event.key === "A" || event.key === "a")) {
        if (event) event.preventDefault();
        let rowId = document.querySelector("#editor");
        if (typeof myrowId != "undefined" && myrowId != "translation") {
            rowId = rowId.concat("-", myrowId);
        }
        chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyClaude", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore"], function (data) {
            let formal = checkFormal(false);
            translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, data.DeeplFree, translationComplete, spellCheckIgnore);
        });
    }

    if (event.altKey && (event.key === "r" || event.key === "R")) {
        if (event) event.preventDefault();
        const urlParams  = new URLSearchParams(window.location.search);
        const search     = urlParams.get("wrongverb");
        const repl       = urlParams.get("replverb");
        for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            let textareaElem    = e.querySelector("textarea.foreign-text");
            let translatedText  = textareaElem.value;
            let replaced        = false;
            let element         = e.querySelector(".source-details__comment");
            let toTranslate     = true;
            if (element != null && typeof rowId != "undefined") {
                let comment = e.querySelector("#editor-" + rowId + " .source-details__comment p").innerText;
                toTranslate = checkComments(comment);
            }
            if (toTranslate == true) {
                if (translatedText.includes(search)) {
                    translatedText               = translatedText.replaceAll(search, repl);
                    replaced                     = true;
                    textareaElem.innerText       = translatedText;
                    textareaElem.value           = translatedText;
                    let glotpress_open  = document.querySelector(`td.actions .edit`);
                    let glotpress_save  = document.querySelector(`div.editor-panel__left div.panel-content div.translation-wrapper div.translation-actions .translation-actions__save`);
                    let glotpress_close = document.querySelector(`div.editor-panel__left .panel-header-actions__cancel`);
                    glotpress_open.click();
                    glotpress_save.click();
                    setTimeout(() => { glotpress_close.click(); }, 1500);
                } else {
                    messageBox("error", "Verb not found!" + search);
                    replaced = false;
                    break;
                }
            } else {
                messageBox("error", "The name of plugin/theme/url do not need to be replaced!");
                replaced = false;
            }
            if (replaced == true) { setTimeout(() => { window.close(); }, 1000); }
        }
    }
});

// ─── Translations table click listener ───────────────────────
const el = document.getElementById("translations");
if (el != null) {
    el.addEventListener("click", (event) => {
        const target = event.target;
        if (target.closest(".translation-actions__save.button.is-primary")) {
            let tr = target.closest('tr');
            if (!tr) return;
            let nextTr = tr.nextElementSibling;
            if (nextTr) {
                rowId = nextTr.getAttribute("row");
                if (toBoolean(DisableautoClose)) {
                    if (toBoolean(autoCopyClipBoard)) { copyToClipBoard(rowId); }
                }
            }
        }
        checkbuttonClick(event);
    });
}

const el3 = document.getElementById("translations");
if (el3 != null) { el3.addEventListener("click", checkactionClick()); }

// ─── Menu links ───────────────────────────────────────────────
let optionlink   = document.createElement("li");
var a            = document.createElement('a');
a.href           = "#";
a.id             = "openOptionsLink";
a.appendChild(document.createTextNode("WPTF options"));
optionlink.className = 'menu-item wptf_settings_menu';

let databaselink = document.createElement("li");
var b            = document.createElement('a');
b.href           = "#";
b.id             = "openModalLink";
b.appendChild(document.createTextNode("WPTF database"));
databaselink.className = 'menu-item wptf_database_menu';

let fetchNewlink = document.createElement("li");
var c            = document.createElement('a');
c.href           = "#";
c.id             = "fetchNewlink";
c.appendChild(document.createTextNode("Fetch New"));
fetchNewlink.className = 'menu-item wptf_fetchnew_menu';

let fetchPTElink = document.createElement("li");
var d            = document.createElement('a');
d.href           = "#";
d.id             = "fetchPTElink";
d.appendChild(document.createTextNode("Fetch PTE"));
fetchPTElink.className = 'menu-item wptf_fetchpte_menu';

var divMenu = document.querySelector("#menu-headline-nav");
if (divMenu != null) {
    optionlink.appendChild(a);   divMenu.appendChild(optionlink);
    databaselink.appendChild(b); divMenu.appendChild(databaselink);
    fetchNewlink.appendChild(c); divMenu.appendChild(fetchNewlink);
    fetchPTElink.appendChild(d); divMenu.appendChild(fetchPTElink);
}

function openOptionsPage() {
    let Locale = checkLocale() || 'en-gb';
    window.open(chrome.runtime.getURL(`wptf-options.html?lang=${Locale}`));
}

document.addEventListener('click', function (event) {
    if (event.target.id == 'openModalLink')    { if (event) event.preventDefault(); createAndOpenModal(); }
    else if (event.target.id == 'openOptionsLink')  { if (event) event.preventDefault(); openOptionsPage(); }
    else if (event.target.id == 'fetchNewlink')     { if (event) event.preventDefault(); fetchNewClicked(); }
    else if (event.target.id == 'fetchPTElink')     { if (event) event.preventDefault(); fetchPTEClicked(); }
});

// ─── translatedButton (nav bar construction) ─────────────────
async function translatedButton() {
    // Helper to reduce repetition when building nav buttons
    function makeNavButton({ className, label, tooltip, handler, visible = true, href = "#" }) {
        let container   = document.createElement("div");
        container.className = 'button-tooltip';
        let tip         = document.createElement("span");
        tip.className   = 'tooltiptext';
        tip.innerText   = tooltip;
        let btn         = document.createElement("a");
        btn.href        = href;
        btn.className   = className;
        btn.onclick     = handler;
        btn.innerText   = label;
        if (!visible) btn.style.visibility = 'hidden';
        container.appendChild(btn);
        container.appendChild(tip);
        return { container, btn };
    }

    let divPaging   = document.querySelector("div.paging");
    let divProjects = document.querySelector("div.projects");

    const { container: transContainer,    btn: translateButton   } = makeNavButton({ className: "translation-filler-button",      label: __('Translate'),        tooltip: __("This function translates the table with translations from the API"),                                                 handler: translatePageClicked,    visible: false });
    const { container: localtransContainer, btn: localtransButton } = makeNavButton({ className: "local-trans-button", label: __("Local"), tooltip: __("This function populates the table with translations from the local database"), handler: localTransClicked, visible: false });
    const { container: TmContainer, btn: tmtransButton } = makeNavButton({ className: "tm-trans-button", label: "TM", tooltip: __("This button starts fetching existing translations from translation memory"), handler: tmTransClicked, visible: false });
    const { container: checkGlossContainer, btn: checkGlossButton } = makeNavButton({ className: "check_glossary-button", label: __("CheckGlossary"), tooltip: __("This function checks the page for missing glossary translation"), handler: checkGlossClicked, visible: false });
    const { container: checkContainer, btn: checkButton } = makeNavButton({ className: "check_translation-button", label: __("CheckPage"), tooltip: __("This function checks the page for missing verbs and if set starts spellchecking"), handler: checkPageClicked, visible: false });
    const { container: implocContainer,    btn: impLocButton      } = makeNavButton({ className: "impLoc-button",                  label: __("Imp localfile"),    tooltip: __("This button starts the import of a local po file containing translations into the current table"),                   handler: impFileClicked,          visible: false });
    const { container: implocDatabaseContainer, btn: impDatabaseButton } = makeNavButton({ className: "convLoc-button",           label: __("Conv po DB"),       tooltip: __("This button converts po and inserts to local database"),                                                              handler: impLocDataseClicked,     visible: false });
    const { container: checkAllContainer,  btn: checkAllButton    } = makeNavButton({ className: "selectAll-button",              label: __("Select all"),       tooltip: __("This button selects all records"),                                                                                    handler: setCheckBox,             visible: false });
    const { container: exportContainer,    btn: exportButton      } = makeNavButton({ className: "export_translation-button",     label: __("Export"),           tooltip: __("This button starts the export of the local database"),                                                                handler: exportPageClicked,       visible: false });
    const { container: exportPoContainer,  btn: exportPoButton    } = makeNavButton({ className: "export_translation-po-button",  label: __("ExportPo"),         tooltip: __("This button starts the export of the local database to a .po file"),                                                 handler: exportPoClicked,         visible: false });
    const { container: importContainer,    btn: importButton      } = makeNavButton({ className: "import_translation-button",     label: __("Import"),           tooltip: __("This button starts the import of a local file into the local database"),                                              handler: importPageClicked,       visible: false });
    const { container: bulktolocContainer, btn: bulktolocalButton } = makeNavButton({ className: "save_tolocal-button",           label: __("Bulk local"),       tooltip: __("This is the function to populate the local database with selected items"),                                            handler: savetolocalClicked,      visible: false });
    const { container: copyOrgContainer,   btn: copyOrgButton     } = makeNavButton({ className: "copy_org-button",               label: __("Copy orig"),        tooltip: __("This is the function to copy originals  with selected items"),                                                       handler: copyOrgClicked,          visible: false });
    const { container: compairContainer,   btn: compairButton     } = makeNavButton({ className: "compair-button",                label: __("Compare"),          tooltip: __("This is the function to compare the suggestion with the local entry"),                                               handler: compairClicked,          visible: false });
    const { container: fetchNewContainer,  btn: fetchNewButton    } = makeNavButton({ className: "fetchnew-button",               label: __("FetchNew"),         tooltip: __("This is the function to fetch newly added originals"),                                                                handler: fetchNewClicked,         visible: false });
    const { container: fetchPTEContainer,  btn: fetchPTEButton    } = makeNavButton({ className: "fetchpte-button",               label: __("Fetch PTE"),        tooltip: __("This is the function to fetch PTE projects"),                                                                         handler: fetchPTEClicked,         visible: false });

    // TM treshold label needs async storage read
    chrome.storage.local.get('TMtreshold', function (result) {
        tmtransButton.innerText = "TM " + result.TMtreshold + "%";
    });

    // TM Disable button (needs special colour logic)
    let TmDisableContainer  = document.createElement("div");
    TmDisableContainer.className = 'button-tooltip';
    classToolTip            = document.createElement("span");
    classToolTip.className  = 'tooltiptext';
    classToolTip.innerText  = __("This button disables fetching existing translations from translation memory");
    let tmDisableButton     = document.createElement("a");
    tmDisableButton.href    = "#";
    tmDisableButton.className = "tm-disable-button";
    interCept = localStorage.getItem("interXHR");
    if (interCept === null || (interCept !== "true" && interCept !== "false")) { interCept = false; localStorage.setItem("interXHR", interCept); }
    if (interCept === 'false') {
        tmDisableButton.style.background = "green"; tmDisableButton.style.color = "white";
    } else if (typeof interCept != 'undefined') {
        tmDisableButton.style.background = "red";   tmDisableButton.style.color = "white";
    } else {
        interCept = false; localStorage.setItem("interXHR", interCept);
    }
    sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
    tmDisableButton.onclick  = tmDisableClicked;
    tmDisableButton.innerText = __("Disable machine");
    TmDisableContainer.appendChild(tmDisableButton);
    TmDisableContainer.appendChild(classToolTip);

    // Stats button (optional)
    let statsContainer = document.createElement("div");
    if (typeof handleStats === "function") {
        statsContainer.className = 'button-tooltip';
        classToolTip             = document.createElement("span");
        classToolTip.className   = 'tooltiptext';
        classToolTip.innerText   = __("This button starts fetching statistics of translations");
        var statsButton          = document.createElement("a");
        statsButton.href         = "#";
        statsButton.id           = "statsButton";
        statsButton.className    = "stats-button";
        statsButton.onclick      = handleStats;
        statsButton.innerText    = __("Stats");
        statsContainer.appendChild(statsButton);
        statsContainer.appendChild(classToolTip);
    }

    // Bulk save (PTE only)
    var bulksaveContainer;
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    if (is_pte) {
        const result = makeNavButton({ className: "bulksave-button", label: __("Bulksave"), tooltip: __("This is the function to save all suggestions selected in bulk"), handler: startBulkSave });
        bulksaveContainer = result.container;
    }

    // Make all buttons visible
    requestAnimationFrame(() => {
        [checkButton, checkGlossButton,impDatabaseButton, exportButton, translateButton, copyOrgButton,
         compairButton, fetchNewButton, fetchPTEButton, impLocButton, checkAllButton,
         exportPoButton, importButton, bulktolocalButton, tmtransButton, localtransButton
        ].forEach(b => b.style.visibility = 'visible');
    });

    // Assemble nav bar
    let divGpActions   = document.querySelector("div.paging");
    let wptfNavBar     = document.createElement("div");
    let wptfNavBarCont = document.createElement("div");
    wptfNavBarCont.className = 'wptfNavBarCont';
    wptfNavBar.appendChild(wptfNavBarCont);
    wptfNavBar.className = "wptfNavBar";
    wptfNavBar.id        = "wptfNavBar";

    if (divPaging != null && divProjects == null) {
        divGpActions.parentNode.insertBefore(wptfNavBar, divGpActions);
        let divNavBar = document.querySelector("div.wptfNavBarCont");
        if (is_pte) divNavBar.appendChild(bulksaveContainer);
        divNavBar.appendChild(copyOrgContainer);
        if (statsContainer.firstChild) divNavBar.appendChild(statsContainer);
        if (!is_pte) divNavBar.appendChild(checkAllContainer);
        divNavBar.appendChild(importContainer);
        divNavBar.appendChild(exportContainer);
        divNavBar.appendChild(exportPoContainer);
        divNavBar.appendChild(implocDatabaseContainer);
        divNavBar.appendChild(bulktolocContainer);
        divNavBar.appendChild(implocContainer);
        divNavBar.appendChild(checkContainer);
        divNavBar.appendChild(checkGlossContainer);
        divNavBar.appendChild(compairContainer);
        divNavBar.appendChild(TmContainer);
        divNavBar.appendChild(localtransContainer);
        divNavBar.appendChild(transContainer);
    }

    // Paging-row buttons
    let UpperCaseButton = document.createElement("a");
    UpperCaseButton.href    = "#";
    UpperCaseButton.onclick = UpperCaseClicked;
    UpperCaseButton.innerText = __("Casing");

    let SwitchGlossButton = document.createElement("a");
    SwitchGlossButton.href      = "#";
    SwitchGlossButton.className = "Switch-Gloss-button";
    SwitchGlossButton.onclick   = SwitchGlossClicked;
    SwitchGlossButton.style.visibility = 'hidden';
    chrome.storage.local.get("DefGlossary").then((res) => {
        if (res.DefGlossary == true) { SwitchGlossButton.innerText = __("DefGlos"); SwitchGlossButton.style.background = "green"; SwitchGlossButton.style.color = "white"; }
        else                         { SwitchGlossButton.innerText = __("SecGlos"); SwitchGlossButton.style.background = "orange"; }
    });

    let SwitchTMButton = document.createElement("a");
    SwitchTMButton.href      = "#";
    SwitchTMButton.className = "Switch-TM-button";
    SwitchTMButton.onclick   = SwitchTMClicked;
    SwitchTMButton.innerText = __("SwitchTM");
    SwitchTMButton.style.visibility = 'hidden';
    let TM = localStorage.getItem(['switchTM']);
    SwitchTMButton.style.background = (TM == "true") ? "red" : "green";
    SwitchTMButton.style.color      = "white";

    let FindDupButton = document.createElement("a");
    FindDupButton.href      = "#";
    FindDupButton.className = "Find-Dup-button";
    FindDupButton.onclick   = FindDupClicked;
    FindDupButton.innerText = __("FindDup");
    FindDupButton.style.visibility = 'hidden';

    LoadGloss           = document.createElement("a");
    LoadGloss.href      = "#";
    LoadGloss.innerText = __("GlossStatus");

    let DispGloss = document.createElement("a");
    DispGloss.href      = "#";
    DispGloss.className = "DispGloss-button";
    DispGloss.onclick   = DispGlossClicked;
    DispGloss.innerText = __("DispGloss");
    DispGloss.style.visibility = 'hidden';

    DispClipboard           = document.createElement("a");
    DispClipboard.href      = "#";
    DispClipboard.className = "DispClipboard-button";
    DispClipboard.onclick   = DispClipboardClicked;
    DispClipboard.innerText = __("ClipBoard");
    DispClipboard.style.visibility = 'hidden';
    chrome.storage.local.get('autoCopyClip', function (result) {
        DispClipboard.style.background = result.autoCopyClip == true ? "red" : "green";
        DispClipboard.style.color      = "white";
    });

    let WikiLink      = document.createElement("a");
    WikiLink.href     = 'https://github.com/vibgyj/WPTranslationFiller/wiki';
    WikiLink.innerText = __("WPTF Docs");
    WikiLink.className = 'menu-item-wptf_wiki';

    // DeepL dropdown
    let dropdown = document.createElement("select");
    dropdown.name = "WPTF_select";
    let defaultOption       = document.createElement("option");
    defaultOption.textContent = "DeepL/AI"; defaultOption.value = ""; defaultOption.disabled = true; defaultOption.selected = true;
    dropdown.appendChild(defaultOption);
    [__("DispGloss"), __("LoadGloss"), __("EditGloss"), __("Upload"), __("DeleteAll")].forEach(optionText => {
        let opt       = document.createElement("option");
        opt.value     = optionText.toLowerCase().replace(/\s+/g, "-");
        opt.textContent = optionText;
        dropdown.appendChild(opt);
    });
    dropdown.addEventListener("change", function (event) {
        let idx = event.target.selectedIndex;
        if (idx > 0) myFunction(idx);
        setTimeout(() => { dropdown.selectedIndex = 0; }, 100);
    });

    window.addEventListener("click", function (event) {
        let modal = document.getElementById("glossaryModal");
        if (event.target == modal) modal.style.display = "none";
    });

    document.getElementById('add-record')?.addEventListener('click', function () {
        let locale = checkLocale();
        const newRecord = { locale: locale.toUpperCase(), original: 'original', translation: 'origineel' };
        chrome.runtime.sendMessage({ action: 'addGlossaryRecord', record: newRecord }, function (response) {
            if (response.success) getGlossary();
        });
    });

    function myFunction(index) {
        if      (index == 1) DispGlossClicked();
        else if (index == 2) LoadGlossClicked(index);
        else if (index == 3) openModalDeepL();
        else if (index == 4) chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) { loadGlossaryFromDB(data.apikeyDeepl, data.DeeplFree, checkLocale()); });
        else                 chrome.storage.local.get(["apikeyDeepl", "DeeplFree"], function (data) { delete_all_glossary(data.apikeyDeepl, data.DeeplFree); });
    }

    let GpSpecials = document.querySelector("span.previous.disabled") || document.querySelector("a.previous");
    if (GpSpecials != null && divProjects == null) {
        divPaging.insertBefore(WikiLink,       divPaging.childNodes[0]);
        divPaging.insertBefore(UpperCaseButton, divPaging.childNodes[0]);
        divPaging.insertBefore(SwitchGlossButton, divPaging.childNodes[0]);
        divPaging.insertBefore(tmDisableButton,   divPaging.childNodes[0]);
        divPaging.insertBefore(SwitchTMButton,    divPaging.childNodes[0]);
        chrome.storage.local.get(["apikeyDeepl"], function (data) {
            if (data.apikeyDeepl != null && data.apikeyDeepl != "" && typeof data.apikeyDeepl != 'undefined') {
                divPaging.insertBefore(LoadGloss, divPaging.childNodes[0]);
                checkGlossary(LoadGloss);
                divPaging.insertBefore(dropdown, divPaging.childNodes[0]);
            }
        });
        divPaging.insertBefore(FindDupButton,  divPaging.childNodes[0]);
        divPaging.insertBefore(DispClipboard,  divPaging.childNodes[0]);
        let UpperCase = localStorage.getItem(['switchUpper']);
        UpperCaseButton.className = (UpperCase == 'false') ? "UpperCase-button" : "UpperCase-button uppercase";
    }

    requestAnimationFrame(() => {
        SwitchGlossButton.style.visibility = 'visible';
        SwitchTMButton.style.visibility    = 'visible';
        DispGloss.style.visibility         = 'visible';
        DispClipboard.style.visibility     = 'visible';
        FindDupButton.style.visibility     = 'visible';
    });
}

// ─── Glossary UI handlers ────────────────────────────────────
async function checkGlossary(event) {
    let glos_isloaded = await localStorage.getItem(['deeplGlossary']);
    LoadGloss.className = (glos_isloaded == null || glos_isloaded == "") ? "LoadGloss-button-red" : "LoadGloss-button-green";
}

function openModalDeepL()       { openDeeplModal(); }
function DispGlossClicked()     { chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) { show_glossary(data.apikeyDeepl, data.DeeplFree, data.destlang); }); }
async function FindDupClicked() { await findDuplicates(); await hideNonDuplicates(); }

function DispClipboardClicked() {
    chrome.storage.local.get('autoCopyClip', async function (result) {
        autoCopyClipBoard = result.autoCopyClip;
        if (toBoolean(autoCopyClipBoard) == true) {
            autoCopyClipBoard = false;
            chrome.storage.local.set({ autoCopyClip: false });
            DispClipboard.style.background = "green"; DispClipboard.style.color = "white";
            messageBox('info', __("Auto copy to clipboard switched off"));
        } else {
            autoCopyClipBoard = true;
            chrome.storage.local.set({ autoCopyClip: true });
            DispClipboard.style.background = "red";
            messageBox('info', __("Auto copy to clipboard switched on"));
        }
    });
}

function LoadGlossClicked() {
    fileSelector.click();
    fileSelector.addEventListener("change", function onLoadGlossChange(event) {
        fileSelector.removeEventListener("change", onLoadGlossChange);
        let file     = event.target.files[0];
        let fileList = event.target.files;
        if (!file) return;
        if (file.type == 'text/csv' || "application/vnd.ms-excel") {
            var reader = new FileReader();
            reader.onload = function (e) {
                var raw_glossary = csvParser(e.target.result);
                chrome.storage.local.get(["apikeyDeepl", "DeeplFree", "destlang"], function (data) {
                    // If the CSV has 3 columns (Locale,Original,Translation format),
                    // strip the header row and locale column before passing to load_glossary.
                    // DeepL expects only two columns: source,translation with no header.
                    var ld_glossary = raw_glossary;
                    if (raw_glossary.length > 0) {
                        var firstRow = raw_glossary[0].split(",");
                        if (firstRow.length >= 3 && firstRow[0].trim().toLowerCase() === "locale") {
                            // Has header + locale column — strip header and extract cols 2 & 3
                            var locale = checkLocale().toUpperCase();
                            ld_glossary = raw_glossary
                                .slice(1) // skip header row
                                .filter(row => {
                                    var cols = row.split(",");
                                    return cols.length >= 3 && cols[0].trim().toUpperCase() === locale;
                                })
                                .map(row => {
                                    var cols = row.split(",");
                                    // Rejoin in case translation contains commas
                                    return cols[1].trim() + "," + cols.slice(2).join(",").trim();
                                });
                        }
                    }
                    load_glossary(ld_glossary, data.apikeyDeepl, data.DeeplFree, data.destlang);
                });
                reader.onerror = function () { console.debug(reader.error); };
            };
            reader.readAsText(fileList[0]);
        } else {
            messageBox("error", __("File is not a csv!"));
        }
        event.target.value = "";
    });
}

function UpperCaseClicked(event) {
    event.preventDefault(event);
    chrome.storage.local.get(["convertToLower"], function (data) {
        var UpperCaseButton = document.querySelector('.UpperCase-button');
        if (data.convertToLower != "null") {
            convertToLow = data.convertToLower;
            if (convertToLow == true) {
                toastbox("info", "Switching conversion off", "1200", "Conversion");
                UpperCaseButton.className = "UpperCase-button";
                localStorage.setItem('switchUpper', 'false');
                chrome.storage.local.set({ convertToLower: false });
            } else {
                toastbox("info", "Switching conversion on", "1200", "Conversion");
                UpperCaseButton.className = "UpperCase-button uppercase";
                localStorage.setItem('switchUpper', 'true');
                chrome.storage.local.set({ convertToLower: true });
            }
        }
    });
}

function SwitchGlossClicked(event) {
    event.preventDefault(event);
    chrome.storage.local.get("DefGlossary").then((res) => {
        if (res.DefGlossary == true) { toastbox("info", __("Switching Glossary to second"), "2500", __("Glossary switch")); chrome.storage.local.set({ DefGlossary: false }); }
        else                         { toastbox("info", __("Switching Glossary to default"), "2500", __("Glossary switch")); chrome.storage.local.set({ DefGlossary: true }); }
        location.reload();
    });
}

function SwitchTMClicked(event) {
    if (event) event.preventDefault();
    const currentSwitch = localStorage.getItem("switchTM") === "true";
    const newSwitch     = !currentSwitch;
    localStorage.setItem("switchTM", newSwitch.toString());
    toastbox("info", newSwitch ? __("Switching TM to foreign") : __("Switching TM to local"), "4500", "TM switch");
    location.reload();
}

function tmDisableClicked(event) {
    event.preventDefault(event);
    let interCept = localStorage.getItem(['interXHR']);
    if (interCept === "false") {
        toastbox("info", "Switching interceptXHR to on", "1200", "InterceptXHR");
        localStorage.setItem('interXHR', true); interCept = true;
    } else {
        toastbox("info", "Switching interceptXHR to off", "1200", "InterceptXHR");
        localStorage.setItem('interXHR', false); interCept = false;
    }
    sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
    location.reload();
}

async function startSpellCheck(LtKey, LtUser, LtLang, LtFree, spellcheckIgnore) {
    await spellcheck_page(LtKey, LtUser, LtLang, LtFree, spellcheckIgnore);
}

// ─── DOM helpers ─────────────────────────────────────────────
function createElementWithId(type, id) {
    let element = document.createElement(type);
    element.id  = id;
    return element;
}

async function myOpenDB(db)     { return await openDB(db); }
async function myDeepLDB(dbDeepL) { return await openDeepLDatabase(dbDeepL); }

// ─── Bulk / save helpers ──────────────────────────────────────
async function startBulkSave(event) {
    if (event) event.preventDefault();
    await setToonDiff({ toonDiff: false });
    chrome.storage.local.get(["bulkWait"], async function (data) {
        let bulkWait = data.bulkWait;
        if (bulkWait != null && typeof bulkWait != 'undefined') {
            let ic   = localStorage.getItem("interXHR");
            if (ic === null || (ic !== "true" && ic !== "false")) { ic = false; localStorage.setItem("interXHR", ic); }
            let icBool = ic === 'true';
            sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: icBool });
            bulkSave("false", bulkWait);
        }
    });
}

async function savetolocalClicked(event)     { if (event) event.preventDefault(); await bulkSaveToLocal(); }
async function setCheckBox(event)            { if (event) { await setcheckBox(event); event.preventDefault(); } }
async function compairClicked()              { var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null; chrome.storage.local.get(["convertToLower", "spellCheckIgnore", "formal", "destlang"], function (data) { compairWithSuggestion(is_pte, data.convertToLower, data.spellCheckIgnore, data.destlang); }); }
async function fetchPTEClicked(event)        { if (event) event.preventDefault(); await loadEditorProjects(currentPage); }
async function fetchNewClicked(event)        { if (event) event.preventDefault(); await loadRecentOriginals(currentPage); }
async function copyOrgClicked(event)         { if (event) event.preventDefault(); await copyOrgRecords(); }

function tmTransClicked(event) {
    if (event) event.preventDefault();
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyClaude", "OpenAIPrompt", "ClaudePrompt", "OpenAISelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss", "TMtreshold", "ClaudModel", "TMwait"], function (data) {
        if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined') {
            if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                if (data.transsel != "undefined") {
                    let formal   = checkFormal(false);
                    convertToLow = data.convertToLower;
                    var TMwait   = (typeof data.TMwait == "undefined") ? 500 : data.TMwait;
                    result = populateWithTM(data.apikey, data.apikeyDeep, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, data.DeeplFree, TMwait, data.postTranslationReplace, data.preTranslationReplace, data.convertToLower, data.spellCheckIgnore, data.TMtreshold, interCept);
                } else { messageBox("error", "You need to set the translator API"); }
            } else { messageBox("error", "You need to set the parameter for Destination language"); }
        } else { messageBox("error", "For " + data.transsel + " no apikey is set!"); }
    });
}

function localTransClicked(event) {
    if (event) event.preventDefault();
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyDeepSeek", "apikeyTranslateio", "apikeyMicrosoft", "apikeygroq", "apikeyOpenAI", "apikeyOpenRouter", "apikeyMistral", "apikeyClaude", "apikeyOllama", "apikeyLingvanex", "apikeyGemini", "apikeyNLP", "OpenRouterSelect", "GeminiSelect", "groqSelect", "GeminiPrompt", "GeminiModel", "LocalOllama", "OpenAIPrompt", "ClaudePrompt", "OpenAISelect", "MistralSelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss", "ClaudModel", "ollamaModel", "ollamaPrompt", "LMStudioWait","apikeylara_accessKeyId","lara_accessKeySecret"], function (data) {
        if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyOpenRouter != "undefined" && data.apikeyOpenRouter != "" || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined' || typeof data.apikeyOpenRouter != "undefined" && data.apikeyOpenRouter != "" && data.OpenRouterSelect != 'undefined') {
            if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                if (data.transsel != "undefined") {
                    let formal     = checkFormal(false);
                    convertToLow   = data.convertToLower;
                    let OpenAItemp = parseFloat(data.OpenAItemp);
                    //console.debug("keys:",data.apikeylara_accessKeyId,data.lara_accessKeySecret)

                    result = populateWithLocal(data.apikey, data.apikeyDeepl, data.apikeyDeepSeek, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, convertToLow, data.DeeplFree, data.apikeyOpenAI, data.OpenAIPrompt, data.OpenAISelect, data.OpenAITone, OpenAItemp, data.apikeyClaude, data.ClaudePrompt, data.OpenAiGloss, data.ClaudModel, data.apikeyOllama, data.LocalOllama, data.ollamaModel, data.ollamaPrompt, data.apikeyLingvanex, data.apikeyGemini, data.GeminiSelect, data.GeminiPrompt, data.LMStudioWait, data.apikeyNLP, data.apikeyOpenRouter, data.OpenRouterSelect,data.apikeygroq, data.grogSelect, data.apikeylara_accessKeyId, data.lara_accessKeySecret);

                } else { messageBox("error", "You need to set the translator API"); }
            } else { messageBox("error", "You need to set the parameter for Destination language"); }
        } else { messageBox("error", "For " + data.transsel + " no apikey is set!"); }
    });
}

// ─── Import / export handlers ─────────────────────────────────
function impLocDataseClicked(event) {
    chrome.storage.local.get(["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"], function (data) {
        let allrows = [], myrows = [], myFile;
        toastbox("info", "Select file is started", "2000", "Select po file");
        let input = document.createElement('input');
        input.type = 'file';
        input.onchange = _this => {
            let files = Array.from(input.files);
            if (files && files[0]) {
                myFile = files[0];
                let reader = new FileReader();
                reader.addEventListener('load', function (e) {
                    myrows = e.target.result.replace(/\r/g, "").split(/\n/);
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
            } else {
                messageBox("info", __("No file selected"));
            }
            close_toast();
        };
        input.click();
    });
}

function impFileClicked(event) {
    if (event) event.preventDefault();
    chrome.storage.local.get(["apikey", "destlang", "postTranslationReplace", "preTranslationReplace"], function (data) {
        let allrows = [], myrows = [], myFile;
        toastbox("info", "Select file is started", "2000", "Select file");
        var input = document.createElement('input');
        input.type = 'file';
        input.onchange = _this => {
            let files = Array.from(input.files);
            if (files && files[0]) {
                myFile = files[0];
                let reader = new FileReader();
                reader.addEventListener('load', function (e) {
                    myrows = e.target.result.replace(/\r/g, "").split(/\n/);
                    let regel = '';
                    for (var i = 0; i < myrows.length - 1; i++) {
                        regel = myrows[i];
                        if (regel.startsWith("msgid") || regel.startsWith("msgstr") || regel.startsWith("msgctxt") || regel.startsWith("msgid_plural") || regel.startsWith("msgstr[0]") || regel.startsWith("msgstr[1]")) {
                            allrows.push(regel);
                        }
                    }
                    countimported = new_import_po(data.destlang, myFile, allrows);
                    messageBox("info", __("Records imported: ") + countimported);
                });
                reader.readAsText(myFile);
            } else {
                messageBox("info", __("No file selected"));
            }
            close_toast();
        };
        input.click();
    });
}

function translatePageClicked(event) {
    if (event) event.preventDefault();
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyCerebras", "apikeyDeepSeek", "apikeyMicrosoft", "apikeyKimi", "apikeyOpenAI", "apikeyOpenRouter", "apikeyMistral", "apikeyClaude", "apikeygroq", "apikeyTranslateio", "apikeyLingvanex", "apikeyNLP", "OpenAIPrompt", "ClaudePrompt", "CerebrasSelect", "ClaudSelect", "KimiSelect", "OpenAISelect", "OpenRouterSelect", "MistralSelect", "OpenAItemp", "OpenAIWait", "DeepLWait", "OpenAITone", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss", "ClaudModel", "apikeyOllama", "LocalOllama", "ollamaModel", "ollamaPrompt", "apikeyGemini", "GeminiSelect", "groqSelect", "GeminiPrompt", "LMStudioWait", "groqBatchSize", "apikeylara_accessKeyId","lara_accessKeySecret"], async function (data) {
       // if (typeof data.apikey != "undefined" && data.apikey != "" && data.transsel == "google" ||typeof data.laraAccessKeyId != "undefined" && data.laraAccessKeyId != "" && data.transsel == "LaraTrans" || typeof data.apikeyClaude != 'undefined' && data.apikeyClaude != "" || typeof data.apikeyDeepl != "undefined" && data.apikeyDeepl != "" && data.transsel == "deepl" || typeof data.apikeyMicrosoft != "undefined" && data.apikeyMicrosoft != "" && data.transsel == "microsoft" || typeof data.apikeyOpenAI != "undefined" && data.apikeyOpenAI != "" && data.transsel == "OpenAI" && data.OpenAISelect != 'undefined' || typeof data.apikeyDeepSeek != "undefined" && data.apikeyDeepSeek != "" && data.transsel == "deepseek" && data.OpenAISelect != 'undefined' || typeof data.apikeyTranslateio != "undefined" && data.apikeyTranslateio != "" && data.transsel == "translation_io" && data.OpenAISelect != 'undefined' || typeof data.apikeyOpenRouter != "undefined" && data.apikeyOpenRouter != "" && data.transsel == "openRouter" || typeof data.apikeyKimi != "undefined" && data.apikeyKimi != "" && data.transsel == "kimi") {
            if (data.destlang != "undefined" && data.destlang != null && data.destlang != "") {
                if (data.transsel != "undefined") {
                    let formal       = toBoolean(data.ForceFormal) === true ? true : checkFormal(false);
                    convertToLow     = data.convertToLower;
                    var openAIWait   = Number(data.OpenAIWait);
                    var OpenAItemp   = parseFloat(data.OpenAItemp);
                    var deeplGlossary = localStorage.getItem('deeplGlossary');
                    if (data.transsel == "LMStudio") {
                        let result = await checkModelAndContinue(data.ollamaModel);
                        if (!result) return;
                    }
                    
                    translatePage(data.apikey, data.apikeyCerebras, data.apikeyDeepl, data.apikeyMicrosoft, data.apikeyKimi, data.apikeyOpenAI, data.apikeyMistral, data.apikeyClaude, data.apikeyDeepSeek, data.apikeyTranslateio, data.apikeyNLP, data.OpenAIPrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, data.DeeplFree, data.OpenAISelect, data.MistralSelect, openAIWait, OpenAItemp, data.spellCheckIgnore, deeplGlossary, data.OpenAITone, data.DeepLWait, data.OpenAiGloss, data.ClaudePrompt, data.ClaudSelect, data.apikeyOllama, data.LocalOllama, data.ollamaModel, data.ollamaPrompt, data.apikeyLingvanex, data.apikeyGemini, data.GeminiSelect, data.GeminiPrompt, data.LMStudioWait, data.apikeyOpenRouter, data.OpenRouterSelect, data.apikeygroq, data.groqSelect, data.groqBatchSize, data.KimiSelect, data.CerebrasSelect, data.apikeylara_accessKeyId,data.lara_accessKeySecret);
                } else { messageBox("error", "You need to set the translator API"); }
            } else { messageBox("error", "You need to set the parameter for Destination language"); }
       // } else { messageBox("error", "For " + data.transsel + " no apikey is set!"); }
    });
}

function checkFormal(formal) {
    return !window.location.href.includes("default");
}

async function checkGlossClicked(event) {
    console.debug("checkGlossaryClicked called");
    //DryRun = false;
    glossaryQaSweep(DryRun = false);   
    }
async function checkPageClicked(event) {
    if (event) event.preventDefault();
    let formal = checkFormal(false);
    chrome.storage.local.get(["apikey", "apikeyOpenAI", "destlang", "transsel", "postTranslationReplace", "preTranslationReplace", "LtKey", "LtUser", "LtLang", "LtFree", "Auto_spellcheck", "spellCheckIgnore", "OpenAIPrompt", "reviewPrompt", "Auto_review_OpenAI", "convertToLower", "showHistory", "showTransDiff", "openAiGloss", "OpenAISelect", "apikeyOpenRouter", "OpenRouterSelect"], async function (data) {
        try {
            await checkPage(data.postTranslationReplace, formal, data.destlang, data.apikeyOpenAI, "", data.spellCheckIgnore, showHistory, data.apikeyOpenAI, data.OpenAIPrompt, data.reviewPrompt);
            if (data.Auto_review_OpenAI == true) await reviewPage(data.apikeyOpenAI, data.destlang, data.OpenAIPrompt, data.reviewPrompt, data.OpenAiGloss, data.OpenAISelect, data.apikeyOpenRouter,data.transsel,data.OpenRouterSelect);
            if (data.Auto_spellcheck   == true) await startSpellCheck(data.LtKey, data.LtUser, data.LtLang, data.LtFree, data.spellCheckIgnore);
        } catch (error) { console.error("An error occurred:", error); }
    });
}

function exportPageClicked(event) { if (event) event.preventDefault(); chrome.storage.local.get(["destlang"], function (data) { dbExport(data.destlang); }); }
function exportPoClicked(event)   { if (event) event.preventDefault(); chrome.storage.local.get(["destlang"], function (data) { exportIndexedDBToPO(data.destlang); }); }

// ─── Glossary loading ─────────────────────────────────────────
function getGlossaryData() {
    return new Promise((resolve, reject) => {
        const keys = [
            "glossary", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => "glossary" + l),
            "glossary1", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => "glossary1" + l),
            "destlang"
        ];

        chrome.storage.local.get(keys, function (data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }

            console.log(
                "chrome.storage.local:",
                Object.keys(data).length,
                "van",
                keys.length,
                "gevraagde keys gevonden"
            );

            console.log("gevonden keys:", Object.keys(data));

    resolve(data);
});
    });
}

async function loadGlossaries() {
    try {
        const data = await getGlossaryData();
        const glossaryValid  = typeof data.glossary  !== "undefined";
        const glossary1Valid = typeof data.glossary1 !== "undefined";
        if (!glossaryValid && !glossary1Valid) {
            console.warn("No glossary data found in chrome.storage.local");
            return "unsuccessful";
        }

        glossary.length  = 0;
        glossary1.length = 0;

        if (glossaryValid) {
            ["glossary", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => "glossary" + l)].forEach(key => loadSet(glossary, data[key]));
            glossary.sort((a, b) => b.key.length - a.key.length);
        }
        if (glossary1Valid) {
            ["glossary1", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => "glossary1" + l)].forEach(key => loadSet(glossary1, data[key]));
            glossary1.sort((a, b) => b.key.length - a.key.length);
        }
        if (toBoolean(DebugMode)) {
            console.debug("glossary loaded:", glossary.length, "entries; formal loaded:", glossary1.length, "entries");
        }
        return "success";
    } catch (error) {
        console.error("Error loading glossaries:", error);
        return "unsuccessful";
    }
}

// loadSet1 removed – identical to loadSet. All callers use loadSet().
function loadSet(targetArray, sourceArray) {
    if (!Array.isArray(sourceArray)) return;
    sourceArray.forEach((item, index) => {
        if (item && typeof item === "object" && typeof item.key !== "undefined" && typeof item.value !== "undefined") {
            targetArray.push(item);
        } else {
            console.warn("Skipping invalid entry at index", index, ":", item);
        }
    });
}

// ─── addTranslateButtons ─────────────────────────────────────
function addTranslateButtons(rowId) {
    let panelHeaderActions = document.querySelector("#editor-" + rowId + " .panel-header .panel-header-actions");
    if (panelHeaderActions != null) {
        var currentcel = document.querySelector(`#preview-${rowId} td.priority`);
        if (currentcel != null) currentcel.innerText = "";

        let panelTransMenu = document.querySelector(`#editor-${rowId} .panelTransMenu`);
        var newTransDiv    = document.querySelector(`#editor-${rowId} .panel-header`);
        if (panelTransMenu == null) {
            newTransDiv.insertAdjacentHTML("afterend", '<div class="panelTransMenu">');
            let panelTransDiv = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
            let panelHeader   = document.querySelector("#editor-" + rowId + " .panel-header");

            let translateButton = createElementWithId("my-button", `translate-${rowId}-translation-entry-my-button`);
            translateButton.href      = "#";
            translateButton.className = "translation-entry-my-button";
            translateButton.onclick   = translateEntryClicked;
            translateButton.innerText = __("Translate");
            translateButton.style.cursor = "pointer";
            if (panelTransDiv != null) panelTransDiv.appendChild(translateButton);

            let addTranslateButton = createElementWithId("my-button", `translate-${rowId}-addtranslation-entry-my-button`);
            addTranslateButton.href      = "#";
            addTranslateButton.className = "addtranslation-entry-my-button";
            addTranslateButton.onclick   = addtranslateEntryClicked;
            addTranslateButton.innerText = __("Add Translation");
            addTranslateButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(addTranslateButton, panelTransDiv.childNodes[0]);

            let checkTranslateButton = createElementWithId("my-button", `translate-${rowId}-checktranslation-entry-my-button`);
            checkTranslateButton.href      = "#";
            checkTranslateButton.className = "checktranslation-entry-my-button";
            checkTranslateButton.onclick   = checktranslateEntryClicked;
            checkTranslateButton.innerText = __("Check Translation");
            checkTranslateButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(checkTranslateButton, panelTransDiv.childNodes[0]);

            let LocalCaseButton = createElementWithId("my-button", `translate-${rowId}-localcase-entry-my-button`);
            LocalCaseButton.href      = "#";
            LocalCaseButton.className = "localcase-entry-my-button";
            LocalCaseButton.onclick   = LowerCaseClicked;
            LocalCaseButton.innerText = __("LowerCase");
            LocalCaseButton.style.cursor = "pointer";
            panelTransDiv.insertBefore(LocalCaseButton, panelTransDiv.childNodes[0]);

            let MissinglocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-missing-button`);
            MissinglocalButton.className      = "translocal-entry-missing-button";
            MissinglocalButton.innerText      = __("Missing glossary entry");
            MissinglocalButton.style.visibility = "hidden";
            MissinglocalButton.style.animation  = "blinking 1s infinite";
            let newspan = document.createElement("span");
            newspan.appendChild(MissinglocalButton);
            panelHeader.querySelector("h3").appendChild(newspan);

            let TranslocalButton = createElementWithId("local-button", `translate-${rowId}-translocal-entry-local-button`);
            TranslocalButton.className       = "translocal-entry-local-button";
            TranslocalButton.innerText       = __("Local");
            TranslocalButton.style.visibility = "hidden";
            let span = document.createElement("span");
            span.appendChild(TranslocalButton);
            panelHeader.querySelector("h3").appendChild(span);

            let translationActions = document.querySelector("#editor-" + rowId + " div.editor-panel__left .panel-content .translation-actions");
            let panelCont          = document.createElement("copy-button");
            panelCont.className    = "with-tooltip";
            panelCont.id           = `meta-copy-to-clipboard`;
            panelCont.ariaLabel    = "Copy original to clipboard";
            panelCont.style.cursor = "pointer";
            panelCont.onclick      = addtoClipBoardClicked;
            let panelTool          = document.createElement("span");
            panelTool.className    = "dashicons dashicons-clipboard";
            panelCont.appendChild(panelTool);
            translationActions.appendChild(panelCont);
        }
    }
}

Show_RecCount();

// ─── Import page handler ──────────────────────────────────────
function importPageClicked(event) {
    if (event) event.preventDefault();
    fileSelector.click();
    fileSelector.addEventListener("change", function onImportChange(event) {
        fileSelector.removeEventListener("change", onImportChange);
        fileList        = event.target.files;
        const file       = fileList[0];
        if (!file) { messageBox("error", __("No file selected")); return; }
        // Fixed: was always true due to bare string — now correctly checks both types
        if (file.type == "text/csv" || file.type == "application/vnd.ms-excel" || file.name.endsWith(".csv")) {
            let reader = new FileReader();
            reader.onload = function (e) {
                parseDataBase(e.target.result);
            };
            reader.onerror = function () {
                messageBox("error", __("Error reading file: ") + reader.error);
            };
            reader.readAsText(file);
        } else {
            messageBox("error", __("File is not a csv!"));
        }
    });
}

async function parseDataBase(data) {
    const csvData      = data.split("\n").map(line => line.split("|"));
    const importButton = document.querySelector("a.import_translation-button");
    const cntry        = checkLocale();
    const total        = csvData.length - 1;

    toastbox("info", `Import of ${total} records started. Please wait...`, "1500", "Import database");
    if (importButton) importButton.innerText = "Started";

    if (total < 1) { messageBox("error", "No records found in the CSV file."); return; }

    let importedCount = 0;
    let errorCount    = 0;
    for (let i = 1; i < csvData.length; i++) {
        const [orig, trans, country] = csvData[i];
        if (!orig || !country || country !== cntry) continue;
        try {
            await addTransDb(orig, trans, country);
            importedCount++;
        } catch (err) {
            errorCount++;
            console.warn(`Import error on row ${i}:`, err, orig, trans, country);
        }
        if (importedCount % 50 === 0 || importedCount === total) {
            if (importButton) importButton.innerText = `${importedCount}/${total}`;
            toastbox("info", `Imported ${importedCount} of ${total}...`, "1000", "Import database");
            await new Promise(r => setTimeout(r, 0));
        }
    }
    close_toast();
    const errMsg = errorCount > 0 ? ` (${errorCount} errors — check console)` : "";
    messageBox("info", `Import complete. Records processed: ${importedCount}${errMsg}`);
    if (importButton) importButton.classList.add("ready");
}

function addtoClipBoardClicked(event) {
    if (event != undefined) { event.preventDefault(); copyToClipBoard(detailRow); }
}

// ─── checkactionClick ─────────────────────────────────────────
function checkactionClick(event) {
    if (event != undefined) {
        let classname = event.target.getAttribute("class");
        if (classname == "approve" || classname == "reject" || classname == "fuzzy" || classname == "dashicons dashicons - backup") {
            const firstLink = event.target.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
            if (firstLink != null) {
                const nextLink = firstLink.nextElementSibling;
                if (nextLink != null) {
                    const newRowId = nextLink.getAttribute("row");
                    let f   = document.getElementsByClassName("breadcrumb");
                    let url = f[0].firstChild.baseURI;
                    let newurl = url.split("?")[0];
                    if (typeof newurl != "undefined") {
                        url = newurl + "?filters%5Bstatus%5D=mystat&filters%5Boriginal_id%5D=" + newRowId;
                        chrome.storage.local.get(["showTransDiff"], async function (data) {
                            if (data.showTransDiff != "null") {
                                chrome.storage.local.get(["toonDiff"]).then((result) => {
                                    if (result.toonDiff == true) fetchOldRec(url, rowId);
                                });
                            }
                        });
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// checkbuttonClick — split into focused helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Handle the copy-suggestion click branch.
 * Returns true if the event was handled so the caller can bail early.
 */
function handleCopySuggestionClick(target) {
    if (!target.classList.contains('copy-suggestion') &&
        !target.classList.contains('translation-suggestion__translation-meta') &&
        !target.classList.contains('translation-suggestion__translation')) {
        return false;
    }
    const row   = target.closest('tr');
    const rowId = row?.id;
    if (!rowId) { console.warn('No row found for the clicked copy button.'); return true; }
    let formal = checkFormal(false);
    //console.debug('Copy suggestion clicked for rowId:', rowId, 'formal:', formal);
    chrome.storage.local.get(["postTranslationReplace", "formal"], function (data) {
        // FIX: was `replaceVerb` (undefined) — unified to `replaceVerbs`
        let replaceVerbs = setPostTranslationReplace(data.postTranslationReplace, toBoolean(formal))
        //console.debug('Post-translation replace settings:', replaceVerbs);
        onCopySuggestionClicked(target, rowId, replaceVerbs);
    });
    return true;
}

/**
 * Resolve the rowId from a button-click event target.
 * Returns null if the click was not on a recognised action button.
 */
function resolveRowId(event) {
    let action       = event.target.textContent;
    let FireFoxAction = "";
    if (event.target.firstChild && typeof event.target.firstChild.data !== 'undefined') {
        FireFoxAction = event.target.firstChild.data;
    }
    const isDetails = action == "Details" || action == "✓Details" || FireFoxAction == "Details";
    if (!isDetails) return null;

    let mytarget = event.target.parentElement.parentElement;
    let rowId    = mytarget?.getAttribute("row") || null;
    if (rowId) {
        glob_row  = rowId;
        detailRow = rowId;
    }
    return rowId;
}

/**
 * Post-process TM and AI suggestions after opening the editor.
 * Handles the 100%-score short-circuit then falls through to DeepL/OpenAI.
 */
async function processTMandAISuggestions(rowId) {
    var liscore     = '0';
    var textFound   = "";
    var lires, liSuggestion, liSuggestion_raw;

    const editor  = document.querySelector(`#editor-${rowId}`);
    if (!editor) return;

    let newres = editor.querySelector(`#editor-${rowId} .suggestions__translation-memory.initialized .suggestions-list`);

    await waitForElementInRow(`#editor-${rowId}`, '.suggestions__translation-memory.initialized .suggestions-list', 400)
        .then(async () => {
            newres = editor.querySelector(`#editor-${rowId} .suggestions__translation-memory.initialized .suggestions-list`);
            lires  = newres.getElementsByTagName("li");
            if (lires[0] != null) {
                let scoreSpan = lires[0].querySelector(`span.translation-suggestion__score`);
                if (scoreSpan != null) {
                    let scoreText = scoreSpan.innerText;
                    liscore = Number(scoreText.substring(0, scoreText.length - 1));
                    if (liscore == 100) {
                        liSuggestion = lires[0].querySelector(`span.translation-suggestion__translation`);
                        let raw      = liSuggestion.innerHTML;
                        textFound    = raw.split("<span")[0] || liSuggestion.innerText;
                    }
                }
            } else { liscore = '0'; }
        })
        .catch(() => { liscore = '0'; });

    if (liscore == 100) return; // perfect TM match — nothing more to do

    // Determine which AI provider to try
    const suggestionClass = translator === 'OpenAI' ? '.translation-suggestion.with-tooltip.openai' : '.translation-suggestion.with-tooltip.deepl';
    const elemClass       = translator === 'OpenAI' ? "translation-suggestion with-tooltip openai" : "translation-suggestion with-tooltip deepl";

    await waitForElementInRow(`#editor-${rowId}`, suggestionClass, 4000)
        .then(async () => {
            const suggestions = editor.getElementsByClassName(elemClass);
            if (suggestions.length === 0) return;
            liSuggestion     = suggestions[0].querySelector(`span.translation-suggestion__translation`);
            liSuggestion_raw = suggestions[0].querySelector('span.translation-suggestion__translation-raw');
            textFound        = liSuggestion.innerText;
            const my_original = editor.querySelector(".original");
            if (my_original == null) return;
            const original = my_original.innerText;
            chrome.storage.local.get(["postTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "formal"], function (data) {
                setPostTranslationReplace(data.postTranslationReplace, data.formal);
                let locale       = checkLocale() || 'en';
                let correctedText = postProcessTranslation(original, textFound, replaceVerb, "", "", data.convertToLower, data.spellCheckIgnore, locale);
                liSuggestion.innerText     = correctedText;
                liSuggestion_raw.innerText = correctedText;
            });
        })
        .catch(() => { /* suggestion not present — silently ignore */ });
}

/**
 * Core logic for handling a "Details" click: sets up the editor row,
 * loads pre-translation, starts observers, and validates glossary.
 */
async function handleDetailsAction(rowId, event) {
    var myrec, mytextarea, textarea, pluralTextarea, detail_preview, detail_glossary;
    var pluralpresent, leftPanel;
    let locale    = checkLocale() || 'en';
    var is_pte    = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var OpenAIres, result, lires = '0';
    //console.debug("We hande details")
    // If rowId is still null, try waiting for the editor element
    if (rowId == null) {
        await waitForMyElement(`.editor`, 500, "resolveRowId").then((res) => {
            if (res != "Time-out reached") rowId = res.getAttribute("row");
        });
    }

    addTranslateButtons(rowId);

    if (toBoolean(Rearrange_Sentences)) updatePanelCheckmarks();

    let checkTranslateButton = await document.querySelector(`#editor-${rowId} .checktranslation-entry-my-button`);
    if (checkTranslateButton) checkTranslateButton.className = "checktranslation-entry-my-button";

    await waitForMyElement(`#editor-${rowId}`, 3000, "handleDetailsAction").then(async (res) => {
        if (res == "Time-out reached") return;

        myrec = document.querySelector(`#editor-${rowId}`);

        // Auto-copy to clipboard
        if (toBoolean(autoCopyClipBoard)) copyToClipBoard(rowId);

        mytextarea = myrec.getElementsByClassName('foreign-text');
        let mytranslation = mytextarea[0].innerHTML;

        if (mytranslation == "") {
            let myoriginal = myrec.getElementsByClassName("original")[0].textContent;
            let pretrans   = await findTransline(myoriginal, locale);
            if (pretrans != "notFound") {
                let formal = checkFormal(false)
                if (toBoolean(formal)) {
                    chrome.storage.local.get(["postTranslationReplace", "formal"], async function (data) {
                        let replaceVerbs = setPostTranslationReplace(data.postTranslationReplace, toBoolean(formal))
                        let mytranslatedText = await replaceVerbInTranslation(myoriginal, pretrans, replaceVerbs, debug = false, formal)
                        mytextarea[0].innerHTML = mytranslatedText;
                        mytextarea[0].innerText = mytranslatedText;
                    });
                }
                else {
                    mytextarea[0].innerHTML = pretrans;
                    mytextarea[0].innerText = pretrans;
                }
                let header      = await document.querySelector(`#editor-${rowId} .panel-header`);
                let localButton = await header.querySelector(`.translocal-entry-local-button`);
                if (localButton) localButton.style.visibility = "visible";
            }
        }

        // Auto-resize textarea
        requestAnimationFrame(() => {
            mytextarea[0].style.height = "auto";
            mytextarea[0].style.height = mytextarea[0].scrollHeight + "px";
        });

        // Click listener on textarea
        mytextarea[0].addEventListener("click", (e) => {
            if (detail_glossary) {
                let lp = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                start_editor_mutation_server(mytextarea, "Details", lp);
            }
            StartObserver = true;
        });

        if (typeof mytextarea != 'undefined') {
            detail_preview = getPreview(rowId);
            let localLabel = detail_preview.querySelector(`.trans_local_div`);
            if (localLabel != null) {
                let header      = await document.querySelector(`#editor-${rowId} .panel-header`);
                let localButton = await header.getElementsByClassName("translocal-entry-local-button");
                if (localButton[0]) localButton[0].style.visibility = "visible";
            }
            detail_glossary = detail_preview.querySelector(`.glossary-word`) != null;
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
            mytextarea[0].dispatchEvent(clickEvent);
        }
    });

    if (myrec != null) {
        myrec      = await document.querySelector(`#editor-${rowId}`);
        mytextarea = await myrec.getElementsByClassName('foreign-text');

        if (typeof textarea != 'undefined') {
            textarea = mytextarea[0];
            requestAnimationFrame(() => {
                textarea.style.display    = 'block';
                textarea.style.visibility = 'visible';
                textarea.disabled         = false;
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
            });
        }

        let newRowId      = rowId.split("-")[0] + "_1";
        pluralTextarea    = myrec.querySelector(`#translation_${newRowId}`);
        pluralpresent     = myrec.querySelector(`.editor-panel__left .source-string__plural .original-raw`);

        if (pluralpresent != null) {
            // Fill plural pre-translation if the second line is empty
            if (pluralTextarea != null && (pluralTextarea.value == "" || pluralTextarea.innerHTML == "")) {
                let pluralOriginalText = pluralpresent.textContent;
                let pluralPretrans     = await findTransline(pluralOriginalText, locale);
                if (pluralPretrans != "notFound") {
                    pluralTextarea.value    = pluralPretrans;
                    pluralTextarea.innerHTML = pluralPretrans;
                    let header      = document.querySelector(`#editor-${rowId} .panel-header`);
                    let localButton = header?.querySelector(`.translocal-entry-local-button`);
                    if (localButton) localButton.style.visibility = "visible";
                }
            }
            // Attach observer to the plural textarea
            if (detail_glossary && pluralTextarea != null) {
                leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                start_editor_mutation_server2(pluralTextarea, "Details", leftPanel);
            }
        } else {
            // No plural — attach observer to the singular textarea
            if (StartObserver && detail_glossary) {
                leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                start_editor_mutation_server(mytextarea, "Details", leftPanel);
            }
        }
    }

    // Glossary validation
    await waitForMyElement(`#editor-${rowId}`, 200, "handleDetailsAction-validate").then((res) => {
        if (res == "Time-out reached") return;
        textareaElem = document.querySelector(`#editor-${rowId} textarea.foreign-text`);
        //console.debug("glossary:",DefGlossary)
        if (detail_glossary && typeof textareaElem != "null") {
            chrome.storage.local.get(['destlang'], async function (data) {
                let locale = checkLocale();
                let originalText = myrec.querySelector("span.original-raw").innerText;
                let translation  = textareaElem.textContent || "Empty";
                let leftPanel    = await document.querySelector(`#editor-${rowId} .editor-panel__left`);

                result = await validateEntry(locale, textareaElem, false, false, rowId, locale, "", false, DefGlossary);
                //console.debug("Glossary validation result for rowId", rowId, ":", result);
                mark_glossary(leftPanel, result.toolTip, textareaElem.textContent, rowId, false);

                if (typeof result != 'undefined' && result.toolTip.length != 0) {
                    let editorElem = document.querySelector("#editor-" + rowId + " .original");
                    if (editorElem != null && !editorElem.querySelector("span.mark-explanation")) {
                        let markdiv   = document.createElement("div");
                        markdiv.setAttribute("class", "marker");
                        let markspan1 = document.createElement("span"); markspan1.setAttribute("class", "mark-devider");
                        let markspan2 = document.createElement("span"); markspan2.setAttribute("class", "mark-explanation");
                        markdiv.appendChild(markspan1);
                        markdiv.appendChild(markspan2);
                        editorElem.appendChild(markdiv);
                        markspan1.innerHTML = "<br>--" + __("Missing glossary verbs are marked") + "--";
                    }
                }

                if (pluralpresent != null && pluralTextarea != null) {
                    let newRowId2       = rowId.split("-")[0] + "_1";
                    // Use the textarea's value (the actual translation), not the source text
                    let pluralTranslation = pluralTextarea.value || pluralTextarea.textContent || "";
                    result = await validate(locale, pluralpresent.textContent, pluralTranslation, locale, false, rowId, true, DefGlossary);

                    // Also run findAllMissingWords so plural source spans get highlighted correctly
                    const pluralSourceElem = leftPanel.querySelector(`.source-string__plural`);
                    if (pluralSourceElem) {
                        const newGloss2   = createNewGlossArray(DefGlossary ? glossary : glossary1);
                        const pluralSpans  = Array.from(pluralSourceElem.getElementsByClassName("glossary-word"));
                        pluralSpans.forEach((sp, i) => { sp.setAttribute('gloss-index', i); sp.classList.remove('highlight'); });
                        if (pluralSpans.length > 0) {
                            const pluralGlossWords    = createGlossArray(pluralSpans, newGloss2);
                            const pluralMissing       = await findAllMissingWords(pluralTranslation, pluralGlossWords, locale);
                            pluralMissing.forEach(({ glossIndex }) => {
                                if (pluralSpans[glossIndex]) pluralSpans[glossIndex].classList.add('highlight');
                            });
                        }
                    }

                    await mark_glossary(leftPanel, result.toolTip, pluralTranslation, rowId, true);
                }
            });
        }
    });

    if (!is_pte && myrec != null) {
        var tds = myrec.getElementsByTagName("td")[0] || myrec.getElementsByTagName("tr")[0];
        if (tds) tds.setAttribute("colspan", 5);
    }

    // Smooth scroll to record
    if (myrec != null) {
        requestAnimationFrame(() => {
            const yOffset = -100;
            const y = myrec.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        });
    }

    chrome.storage.local.set({ "noOldTrans": "True" });

    // Fetch old translation diff
    let f      = document.getElementsByClassName("breadcrumb");
    let url    = f[0].firstChild.baseURI;
    let newurl = url.split("?")[0];
    if (typeof newurl != "undefined") {
        url = newurl + "?filters%5Bstatus%5D=mystat&filters%5Boriginal_id%5D=" + rowId + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=desc";
        chrome.storage.local.get(["showTransDiff"], async function (data) {
            if (data.showTransDiff == true) {
                let res = await getToonDiff('toonDiff');
                if (res == true) fetchOldRec(url, rowId, data.showTransDiff);
            }
        });
    }

    // Process TM / AI suggestions
    await processTMandAISuggestions(rowId);
}

/**
 * Main dispatcher — now a thin coordinator.
 */
async function checkbuttonClick(event) {
    if (event == undefined) return;

    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;

    // Branch 1: copy-suggestion click
    if (handleCopySuggestionClick(event.target)) return;

    // Branch 2: Details button click
    let rowId = resolveRowId(event);
    if (rowId === null) return; // not a recognised action — ignore

    await handleDetailsAction(rowId, event);
}

// ─── translationComplete ─────────────────────────────────────
function translationComplete(original, translated) {
    // placeholder for caller callback — parity check left to caller
}

// ─── Per-entry translation / check handlers ───────────────────
function checktranslateEntryClicked(event) {
    event.preventDefault(event);
    let rowId   = event.target.id.split("-")[1];
    let myrowId = event.target.id.split("-")[2];
    if (typeof myrowId != "undefined" && myrowId != "checktranslation") rowId = rowId.concat("-", myrowId);
    chrome.storage.local.get(["postTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal"], function (data) {
        let formal = toBoolean(data.ForceFormal) === true ? true : checkFormal(false);
        checkEntry(rowId, data.postTranslationReplace, formal, data.convertToLower, data.spellCheckIgnore);
    });
}

function LowerCaseClicked(event) {
    event.preventDefault(event);
    if (event != undefined) {
        chrome.storage.local.get(["spellCheckIgnore"], function (data) {
            let rowId   = event.target.id.split("-")[1];
                let myrowId = event.target.id.split("-")[2];
            if (myrowId !== undefined && myrowId != "localcase") rowId = rowId.concat("-", myrowId);
            setLowerCase(rowId, data.spellCheckIgnore);
        });
    }
}

function translateEntryClicked(event) {
    event.preventDefault(event);
    let rowId   = event.target.id.split("-")[1];
    let myrowId = event.target.id.split("-")[2];
    if (typeof myrowId != "undefined" && myrowId != "translation") rowId = rowId.concat("-", myrowId);
    
    chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyCerebras", "apikeyDeepSeek", "apikeyKimi", "apikeyTranslateio", "apikeyMicrosoft", "apikeyOpenAI", "apikeyOpenRouter", "apikeyMistral", "apikeyClaude", "apikeygroq", "apikeyOllama", "apikeyLingvanex", "apikeyGemini", "apikeyNLP", "CerebrasSelect", "GeminiSelect", "GeminiPrompt", "groqSelect", "KimiSelect", "LocalOllama", "OpenAIPrompt", "ClaudePrompt", "OpenAISelect", "OpenRouterSelect", "MistralSelect", "OpenAITone", "OpenAItemp", "transsel", "destlang", "postTranslationReplace", "preTranslationReplace", "convertToLower", "DeeplFree", "spellCheckIgnore", "ForceFormal", "OpenAiGloss", "ClaudSelect", "ollamaModel", "ollamaPrompt", "LMStudioWait", "apikeylara_accessKeyId","lara_accessKeySecret"], function (data) {
        let formal = toBoolean(data.ForceFormal) === true ? true : checkFormal(false);
        let OpenAItemp    = parseFloat(data.OpenAItemp);
        let deeplGlossary = localStorage.getItem('deeplGlossary');
        let koboldUrl = ""
        
        if (data.destlang != "undefined" && data.destlang != "") {
            translateEntry(rowId, data.apikey, data.apikeyCerebras, data.apikeyDeepl, data.apikeyDeepSeek, data.apikeyTranslateio, data.apikeyMicrosoft, data.apikeyOpenAI, data.apikeyMistral, data.apikeyClaude, data.apikeyKimi, data.apikeyNLP, data.OpenAIPrompt, data.ClaudePrompt, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace, formal, data.convertToLower, data.DeeplFree, data.OpenAISelect, data.MistralSelect, OpenAItemp, data.spellCheckIgnore, deeplGlossary, data.OpenAITone, data.OpenAiGloss, data.ClaudSelect, data.apikeyOllama, data.LocalOllama, data.ollamaModel, data.ollamaPrompt, data.apikeyLingvanex, data.apikeyGemini, data.GeminiSelect, data.GeminiPrompt, data.LMStudioWait, data.apikeyOpenRouter, data.OpenRouterSelect, data.apikeygroq, data.groqSelect, data.KimiSelect, data.CerebrasSelect,koboldUrl,data.apikeylara_accessKeyId,data.lara_accessKeySecret);
        } else {
            messageBox("error", "You need to set the parameter for Destination language");
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// applyPercentStyle
// Replaces copy-pasted color blocks in handleMutation,
// MutationsPlural, and updateElementStyle.
// ═══════════════════════════════════════════════════════════════
/**
 * @param {Element|null} panelTransMenu   – .panelTransMenu div
 * @param {Element|null} priorityElem     – td.priority element
 * @param {number}       percent          – 0-100
 * @param {Element|null} missingVerbsButton – the "Missing glossary entry" button
 */
function applyPercentStyle(panelTransMenu, priorityElem, percent, missingVerbsButton) {
    const styles = [
        { min: 100, max: 100, bg: "green",     label: "100" },
        { min: 66,  max: 99,  bg: "yellow",    label: "66"  },
        { min: 33,  max: 65,  bg: "orange",    label: "33"  },
        { min: 1,   max: 32,  bg: "darkorange",label: "10"  },
        { min: 0,   max: 0,   bg: "red",       label: null  }, // label set from span count
    ];

    const entry = styles.find(s => percent >= s.min && percent <= s.max) || styles[styles.length - 1];

    if (panelTransMenu) panelTransMenu.style.backgroundColor = entry.bg;

    if (priorityElem) {
        if (entry.label !== null) {
            priorityElem.innerHTML = `<span style="color:black">${entry.label}</span>`;
        }
        // caller is responsible for setting raw count text when percent === 0
    }

    if (missingVerbsButton) {
        if (percent < 100 && percent > 0) {
            missingVerbsButton.style.visibility = "visible";
        } else if (percent === 100) {
            missingVerbsButton.style.visibility = "hidden";
            missingVerbsButton.title = "";
        }
    }
}

// ─── updateStyle ─────────────────────────────────────────────
async function updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status, showDiff) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var currcount = 1;
    var current, checkElem, SavelocalButton, imgsrc, currText, single;

    imgsrc = chrome.runtime.getURL('/').slice(0, -1);

    current  = await document.querySelector("#editor-" + rowId + " div.editor-panel__left div.panel-header span.panel-header__bubble");
    currText = current != null ? current.innerText : "transFill";

    let originalElem  = document.querySelector("#preview-" + rowId + " .original");
    let markerpresent = document.querySelector("#preview-" + rowId + " .mark-tooltip");

    if (result != null && result.percent == 100 && markerpresent != null) markerpresent.remove();

    if (markerpresent == null && result.newText != "" && typeof result.newText != "undefined" && showName != true) {
        let markerimage = imgsrc + "/../img/warning-marker.png";
        if (current != null && current.innerText != "current") {
            originalElem.insertAdjacentHTML("afterbegin", '<div class="mark-tooltip">');
            let markdiv   = document.querySelector("#preview-" + rowId + " .mark-tooltip");
            let markimage = document.createElement("img"); markimage.src = markerimage;
            markdiv.appendChild(markimage);
            let markspan = document.createElement("span"); markspan.setAttribute("class", "mark-tooltiptext");
            markdiv.appendChild(markspan);
            markspan.innerHTML = result.newText;
        }
    }

    checkElem       = await document.querySelector("#preview-" + rowId + " .priority");
    SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button") ||
                      document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");

    if (typeof checkElem == "object") {
        if (SavelocalButton == null) {
            if (!toBoolean(is_pte)) {
                let checkBx   = document.querySelector("#preview-" + rowId + " .myCheckBox");
                if (checkBx != null && checkBx != 'undefined') {
                    inputBox = document.querySelector("#preview-" + rowId + " td input");
                    mycheckbox = document.createElement('input');
                    mycheckbox.setAttribute("type", "checkbox");
                    mycheckbox.setAttribute("name", "selected-row[]");
                    if (inputBox == null) checkBx.appendChild(mycheckbox);
                    const myPreview = getPreview(rowId);
                    if (myPreview.classList.contains("untranslated")) {
                        document.querySelector("#preview-" + rowId + " td input").checked = true;
                    }
                    let myrec = document.querySelector(`#editor-${rowId}`);
                    var tds   = myrec.getElementsByTagName("td")[0];
                    if (tds == null) tds.setAttribute("colspan", 5);
                }
            } else {
                const myPreview = getPreview(rowId);
                //console.debug("myPreview:", myPreview);
                if (myPreview.classList.contains("untranslated")) {
                    myPreview.querySelector("th input").checked = true;
                }
            }
            var separator1 = document.createElement("div");
            separator1.setAttribute("class", "checkElem_save");
            if (checkElem != null) checkElem.appendChild(separator1);
            res = await addCheckButton(rowId, checkElem, "updateStyle");
            SavelocalButton = res.SavelocalButton;
        } else {
            if (!is_pte) {
                let checkBx = document.querySelector("#preview-" + rowId + " .myCheckBox");
                if (checkBx != null) {
                    inputBox   = document.querySelector("#preview-" + rowId + " td input");
                    mycheckbox = document.createElement('input');
                    mycheckbox.setAttribute("type", "checkbox");
                    mycheckbox.setAttribute("name", "selected-row[]");
                    if (inputBox == null) checkBx.appendChild(mycheckbox);
                    const myPreview = getPreview(rowId);
                    if (myPreview.classList.contains("untranslated")) {
                        document.querySelector("#preview-" + rowId + " td input").checked = true;
                    }
                    let myrec = document.querySelector(`#editor-${rowId}`);
                    var tds   = myrec.getElementsByTagName("td")[0];
                    tds.setAttribute("colspan", 5);
                }
            }
        }
    } else {
        if (SavelocalButton == null) {
            res = await addCheckButton(rowId, checkElem, "updateStyle-else");
            SavelocalButton = res.SavelocalButton;
        }
    }

    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    if (currText != 'untranslated') {
        updateElementStyle(checkElem, headerElem, result, showHistory, originalElem, "", "", "", "", rowId, showName, nameDiff, currcount, currstring, currText, record, myHistory, my_checkpage, repl_array, prev_trans, old_status, showDiff);
    }

    if (showHistory == true && currText != 'untranslated') {
        single = (newurl.substring(1, 9) != "undefined") ? "False" : "True";
        await fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + rowId.split("-")[0] + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, rowId.split("-")[0], rowId, showName, current.innerText, prev_trans, currcount, showDiff);
    }
}

// ─── validateEntry ────────────────────────────────────────────
async function validateEntry(language, textareaElem, newurl, showHistory, rowId, locale, record, showDiff, DefGlossary) {
    var translation, result = [], original_preview, raw, originalText, preview_raw, hasGlossary, toolTip = "";

    if (typeof textareaElem === 'string') {
        translation = textareaElem;
    } else if (textareaElem !== null && typeof textareaElem === 'object' && !Array.isArray(textareaElem)) {
        translation = textareaElem.value;
    } else {
        translation = textareaElem.innerText;
    }

    addTranslateButtons(rowId);

    preview_raw = document.querySelector(`#preview-${rowId}`);
    hasGlossary = preview_raw != null ? (preview_raw.querySelector('.glossary-word') != null) : false;

    if (hasGlossary) {
        original_preview = preview_raw.querySelector(`#preview-${rowId} .original-text`) || document.querySelector(`#preview-${rowId} .original`);
        raw              = document.querySelector(`#editor-${rowId}`);
        let originalRaw  = raw?.querySelector("span.original-raw");
        let originalNew  = raw?.querySelector("span.original");

        if (typeof textareaElem == 'object') {
            if (textareaElem.length == 0) {
                result = { wordCount: 0, foundCount: 0, percent: 0, toolTip: "", newText: "" };
            } else {
                let originalText = originalRaw.textContent;
                result = await validate(language, originalText, translation, locale, false, rowId, false, DefGlossary);
                if (result.percent == 100) {
                    let missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");
                    if (missingVerbsButton) missingVerbsButton.style.visibility = "hidden";
                } else if (result.toolTip.length > 0) {
                    let leftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`);
                    mark_glossary(leftPanel, result.toolTip, translation, rowId, false);
                }
            }
            old_status = document.querySelector("#preview-" + rowId);
            updateStyle(textareaElem, result, newurl, showHistory, false, false, rowId, record, false, false, translation, [], translation, old_status, showDiff);
        } else {
            let wordCount = 0, foundCount = 0, percent = 0, newText = "";
            if (typeof textareaElem != "undefined" && textareaElem.innerText != 'No suggestions' && textareaElem.innerText.length != 0) {
                percent = 100; toolTip = "";
            }
            result     = { wordCount, foundCount, percent, toolTip, newText };
            old_status = document.querySelector("#preview-" + rowId);
            updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, false, false, translation, [], translation, old_status, showDiff);
        }
    } else {
        translation = (typeof textareaElem === 'string') ? textareaElem : textareaElem?.value || "";
        let percent = (translation != 'No suggestions') ? 100 : 0;
        result      = { wordCount: 0, foundCount: 0, percent, toolTip: "", newText: "" };
        old_status  = document.querySelector("#preview-" + rowId);
        updateStyle(textareaElem, result, newurl, false, false, nameDiff, rowId, record, false, false, translation, [], translation, old_status, false);
    }
    return result;
}

// ─── Glossary utilities ───────────────────────────────────────
function highlightExactWordInText(text, word) {
    const regex   = new RegExp(`\\b${word}\\b`, 'g');
    const matches = text.match(regex);
    return { found: matches !== null && matches.length > 0, count: matches ? matches.length : 0 };
}

function findMissingOccurrenceIndex(englishSentence, dutchSentence) {
    const tokenizeWithIndexes = (sentence) => {
        const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
        return words.map((word, index) => ({ word, index }));
    };
    const englishWordsWithIndexes = tokenizeWithIndexes(englishSentence);
    const dutchWords              = tokenizeWithIndexes(dutchSentence).map(({ word }) => word);
    const englishWordOccurrences  = englishWordsWithIndexes.reduce((map, { word, index }) => {
        if (!map[word]) map[word] = [];
        map[word].push(index);
        return map;
    }, {});
    const missingOccurrences = [];
    const usedIndexes        = new Set();
    for (const [word, indexes] of Object.entries(englishWordOccurrences)) {
        let remainingIndexes = [...indexes];
        dutchWords.forEach(dutchWord => { if (word === dutchWord && remainingIndexes.length) remainingIndexes.shift(); });
        missingOccurrences.push(...remainingIndexes);
    }
    return missingOccurrences;
}

// escapeRegExp – single canonical definition (covers more special chars)
function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
}

function decodeHtmlEntities(str) {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
}

let isProcessing       = false;
let currentTranslation = "";

// findMissingTranslations and working2105findMissingWords are the
// two live implementations. All previous iterations have been removed.

function working2105findAllMissingWords(translation, expectedWords, locale = 'nl') {
    const lowerTranslation = translation.toLowerCase();
    const pluralize        = plural_rules[locale] || (() => []);

    const groupedByWord = expectedWords.reduce((acc, entry) => {
        const key = entry.word.join('|');
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {});

    const missingGroups = [];

    for (const key in groupedByWord) {
        const group         = groupedByWord[key];
        const wordVariants  = group[0].word;
        const expectedCount = group.length;
        const distinctWords = [...new Set(wordVariants.map(w => w.toLowerCase()))];
        let actualCount     = 0;

        if (distinctWords.length > 1) {
            const concat1 = distinctWords.join('');
            const concat2 = distinctWords.slice().reverse().join('');
            if (lowerTranslation.includes(concat1) || lowerTranslation.includes(concat2)) actualCount = expectedCount;
        }

        if (actualCount === 0) {
            for (const variant of wordVariants) {
                const variantLower = variant.toLowerCase();
                const regex        = new RegExp(`\\b${variantLower}\\b`, 'gi');
                const matches      = lowerTranslation.match(regex);
                if (matches) actualCount += matches.length;

                if (actualCount < expectedCount && variantLower.length <= 2) {
                    const fallbackMatches = lowerTranslation.match(new RegExp(variantLower, 'gi'));
                    if (fallbackMatches) actualCount += fallbackMatches.length;
                }

                const plurals = pluralize(variantLower);
                for (const plural of plurals) {
                    const pluralMatches = lowerTranslation.match(new RegExp(`\\b${plural}\\b`, 'gi'));
                    if (pluralMatches) actualCount += pluralMatches.length;
                }

                if (actualCount < expectedCount) {
                    const wordsInTranslation = lowerTranslation.split(/\s+/);
                    for (const word of wordsInTranslation) {
                        if (word.includes(variantLower) && variantLower.length > 2 && !new RegExp(`\\b${variantLower}\\b`, 'i').test(word)) {
                            actualCount += 1;
                            break;
                        }
                    }
                }
            }
        }

        if (actualCount < expectedCount) {
            group.forEach(entry => missingGroups.push({ glossIndex: entry.glossIndex, word: entry.word, missingCount: 1 }));
        }
    }

    missingGroups.sort((a, b) => a.glossIndex - b.glossIndex);
    return missingGroups;
}

// findMissingTranslations – current live version
function findMissingTranslations(translationText, glossWords, locale = 'nl') {
    const translation             = translationText.toLowerCase();
    const missingGlossaryEntries  = [];

    glossWords.forEach((glossEntry) => {
        const glossaryTranslations = glossEntry.word || [];
        const originalWord         = glossEntry.originalWord || '';

        const hasGlossTranslation = glossaryTranslations.some(variant => isGlossaryWordInTranslation(translation, variant, locale));
        if (hasGlossTranslation) return;

        if (originalWord && isWordPresentUntranslated(translation, originalWord)) {
            missingGlossaryEntries.push({ glossIndex: glossEntry.glossIndex, word: glossaryTranslations, originalWord, reason: 'original word untranslated' });
            return;
        }
        missingGlossaryEntries.push({ glossIndex: glossEntry.glossIndex, word: glossaryTranslations, originalWord, reason: 'glossary translation missing' });
    });

    return missingGlossaryEntries;
}

function isGlossaryWordInTranslation(translation, variant, locale) {
    const lowerVariant       = variant.toLowerCase();
    const wordsInTranslation = translation.split(/\W+/);
    if (wordsInTranslation.includes(lowerVariant)) return true;
    if (matchesWithDutchVerbPrefix(locale, lowerVariant, translation)) return true;
    return false;
}

function isWordPresentUntranslated(translation, originalWord) {
    if (!originalWord) return false;
    const escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedWord}\\b|\\w*${escapedWord}\\w*`, 'i').test(translation);
}

// ─── updateRowButton ─────────────────────────────────────────
function updateRowButton(current, SavelocalButton, checkElem, GlossCount, foundCount, rowId) {
    if (typeof rowId != "undefined" && SavelocalButton != null) {
        const map = {
            "transFill":         [__("Save"),  __("save the string"),     false],
            "waiting":           [__("Appr"),  __("Approve the string"),  false],
            "current":           [__("Curr"),  "Current translation",      false, "tf-save-button-disabled"],
            "fuzzy":             [__("Rej"),   __("Reject the string"),   false],
            "changes requested": [__("Rej"),   __("Reject the string"),   false],
            "rejected":          [__("Rej"),   __("Reject the string"),   true,  "tf-save-button-disabled"],
            "untranslated":      [__("Empt"),  __("No translation"),      false, null, "grey", "white"],
            "old":               [__("Old"),   "Old translation",          false],
        };
        const entry = map[current];
        if (entry) {
            SavelocalButton.innerText = entry[0];
            checkElem.title           = entry[1];
            SavelocalButton.disabled  = entry[2];
            if (entry[3]) SavelocalButton.className = entry[3];
            if (entry[4]) SavelocalButton.style.backgroundColor = entry[4];
            if (entry[5]) checkElem.style.backgroundColor       = entry[5];
        } else {
            SavelocalButton.innerText = __("Undef");
            checkElem.title           = __("Something is wrong");
        }
    }
}

// ─── updateElementStyle ──────────────────────────────────────
async function updateElementStyle(checkElem, headerElem, result, oldstring, originalElem, wait, rejec, fuz, old, rowId, showName, nameDiff, currcount, currstring, current, record, myHistory, my_checkpage, repl_array, prev_trans, old_status, showDiff, translatorName) {
    var SavelocalButton, separator1, newtitle = '', headertitle = '', panelTransDiv, missingVerbsButton, missingverbs = "", newline = "\n", button_name = "Empty", res;

    if (typeof rowId == "undefined") { console.debug("no rowid!!"); return; }

    panelTransDiv      = document.querySelector("#editor-" + rowId + " div.panelTransMenu");
    missingVerbsButton = document.getElementById("translate-" + rowId + "-translocal-entry-missing-button");

    if (current != null && typeof current == 'string') {
        if (current == 'untranslated') current = 'Empty';
        SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button") ||
                          document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");
    }

    if (typeof result.toolTip != "undefined" && typeof missingverbs != "undefined" && typeof headerElem != "undefined" && headerElem != null) {
        headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
        newtitle    = checkElem.title.concat(missingverbs).concat(result.toolTip);
    } else {
        result.toolTip = ""; missingverbs = "";
    }
    if (missingVerbsButton != null) missingVerbsButton.title = headertitle;

    if (result.wordCount == 0) {
        let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
        current = h ? h.querySelector("span.panel-header__bubble").innerText : 'untranslated';
    }

    button_name = current == 'current' ? __('Save') : current == 'waiting' ? __('Appr') : current == 'fuzzy' ? __('Rej') : current == 'transFill' ? __('Save') : 'Undef!!';

    if (showName != true) {
        if (current != null && checkElem != null) {
            SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button") ||
                              document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");

            // ── Use applyPercentStyle instead of copy-pasted color blocks ──
            const priorityElem = checkElem;

            if (result.percent == 100) {
                checkElem.innerHTML = "100";
                checkElem.style.backgroundColor = "green";
                separator1 = document.createElement("div"); separator1.setAttribute("class", "checkElem_save"); checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "updateElementStyle-100");
                if (res?.SavelocalButton) { SavelocalButton = res.SavelocalButton; SavelocalButton.innerText = button_name; }
                applyPercentStyle(panelTransDiv, null, 100, missingVerbsButton);
                checkElem.title = __("Save the string");
                let lp = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                let markdiv = document.querySelector("#editor-" + rowId + " .marker");
                if (markdiv) markdiv.remove();

            } else if (result.percent > 0) {
                checkElem.innerHTML = `<span style="color:black">${result.percent}</span>`;
                separator1 = document.createElement("div"); separator1.setAttribute("class", "checkElem_save"); checkElem.appendChild(separator1);
                res = addCheckButton(rowId, checkElem, "updateElementStyle-partial");
                if (res?.SavelocalButton) { SavelocalButton = res.SavelocalButton; SavelocalButton.innerText = button_name; }
                checkElem.title = __("Save the string");
                // Set checkElem color to match the percent band
                const partialColors = [
                    { min: 66, bg: "yellow"     },
                    { min: 33, bg: "orange"     },
                    { min: 10, bg: "purple"     },
                    { min: 1,  bg: "darkorange" },
                ];
                const colorEntry = partialColors.find(e => result.percent >= e.min);
                checkElem.style.backgroundColor = colorEntry ? colorEntry.bg : "darkorange";
                applyPercentStyle(panelTransDiv, null, result.percent, missingVerbsButton);
                let lp = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                mark_glossary(lp, result.toolTip, currstring, rowId, false);

            } else {
                // percent == 0
                newtitle = checkElem.title;
                if ((result.wordCount - result.foundCount) == 0) {
                    checkElem.innerText = "0";
                    checkElem.style.backgroundColor = "green";
                    separator1 = document.createElement("div"); separator1.setAttribute("class", "checkElem_save"); checkElem.appendChild(separator1);
                    res = addCheckButton(rowId, checkElem, "updateElementStyle-0-eq");
                    if (res?.SavelocalButton) { SavelocalButton = res.SavelocalButton; }
                    let lp = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                    mark_glossary(lp, result.toolTip, currstring, rowId, false);
                    if (result.wordCount > 0) {
                        checkElem.title         = __("Do not save the string");
                        if (SavelocalButton) SavelocalButton.innerText = (currstring == "No suggestions") ? "Block!" : "Miss!";
                        if (currstring == "No suggestions" && SavelocalButton) SavelocalButton.disabled = true;
                    } else {
                        if (SavelocalButton) SavelocalButton.innerText = (currstring != "No suggestions") ? "NoGlos" : "Block";
                        if (currstring == "No suggestions") {
                            checkElem.style.backgroundColor = "red";
                            res = addCheckButton(rowId, checkElem, "updateElementStyle-0-block");
                            if (res?.SavelocalButton) { SavelocalButton = res.SavelocalButton; SavelocalButton.disabled = true; }
                        }
                    }
                    if (panelTransDiv) applyPercentStyle(panelTransDiv, null, 100, null); // green when no glossary words
                } else {
                    checkElem.innerText         = result.wordCount - result.foundCount;
                    checkElem.title             = "Check the string";
                    checkElem.style.backgroundColor = "red";
                    separator1 = document.createElement("div"); separator1.setAttribute("class", "checkElem_save"); checkElem.appendChild(separator1);
                    res = addCheckButton(rowId, checkElem, "updateElementStyle-0-miss");
                    if (res?.SavelocalButton) { SavelocalButton = res.SavelocalButton; }
                    let lp = document.querySelector(`#editor-${rowId} .editor-panel__left`);
                    mark_glossary(lp, result.toolTip, currstring, rowId, false);
                    if (current != "untranslated" && current != 'current') {
                        if (SavelocalButton) {
                            SavelocalButton.innerText = (currstring == "No suggestions") ? "Block!" : "Miss!";
                            if (currstring == "No suggestions") SavelocalButton.disabled = true;
                        }
                    } else {
                        if (SavelocalButton) SavelocalButton.innerText = "Rej";
                    }
                    applyPercentStyle(panelTransDiv, null, 0, missingVerbsButton);
                }
            }
            missingverbs = "Missing glossary entry\n";
        } else {
            console.debug("checkelem is null!!!");
        }
    } else {
        // showName == true
        if (current != "untranslated") {
            checkElem.innerHTML = "100";
            separator1 = document.createElement("div"); separator1.setAttribute("class", "checkElem_save"); checkElem.appendChild(separator1);
            res = addCheckButton(rowId, checkElem, "updateElementStyle-name");
            if (res?.SavelocalButton) { SavelocalButton = res.SavelocalButton; SavelocalButton.innerText = "Curr"; }
            checkElem.style.backgroundColor = "green";
            checkElem.title = "Current translation";
            if (panelTransDiv) applyPercentStyle(panelTransDiv, null, 100, null);
            let markdiv = document.querySelector("#editor-" + rowId + " .marker");
            if (markdiv) markdiv.remove();
        }
    }

    myToolTip = result.toolTip.length;
    if (typeof result != 'undefined' && myToolTip > 0) {
        if (headerElem?.title != "undefined") {
            headertitle = headerElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            newtitle    = checkElem.title.concat(newline).concat(missingverbs).concat(result.toolTip);
            if (result.toolTip.length > 0 && missingVerbsButton != null) {
                missingVerbsButton.style.visibility = "visible";
                missingVerbsButton.title            = headertitle;
            }
        } else {
            newtitle    = checkElem.title.concat(result.toolTip);
            headertitle = headerElem.title;
        }
    } else {
        if (checkElem != null) {
            newtitle    = checkElem.title.concat(result.toolTip);
            headertitle = headerElem ? headerElem.title : '';
            if (result.percent == 100 && panelTransDiv) applyPercentStyle(panelTransDiv, null, 100, null);
        } else { newtitle = "noCheckElem"; }
    }

    if (result.toolTip.length > 0 && showName != true) checkElem.setAttribute("title", result.toolTip);
    if (showName == true) await showNameLabel(originalElem, rowId, showName, nameDiff);
    if (oldstring == "True") showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, current, myHistory, my_checkpage, repl_array, prev_trans, old_status, rowId, "UpdateElementStyle", showDiff, translatorName);
}

// ─── showNameLabel / showOldstringLabel ──────────────────────
// (unchanged from original — logic preserved exactly)
function showNameLabel(originalElem, row, showName, nameDiff) {
    if (typeof originalElem != 'undefined') {
        let namelabelExist = originalElem.querySelector(".trans_name_div, .trans_name_div_true");
        if (namelabelExist == null) {
            var element1 = document.createElement("div");
            originalElem.appendChild(element1);
            if (nameDiff == true) {
                element1.setAttribute("class", "trans_name_div_true");
                element1.setAttribute("id", "trans_name_div_true");
                element1.appendChild(document.createTextNode(__("Difference in URL, name of theme or plugin or author!")));
            } else {
                element1.setAttribute("class", "trans_name_div");
                element1.setAttribute("id", "trans_name_div");
                element1.appendChild(document.createTextNode(__("URL, name of theme or plugin or author!")));
            }
        } else {
            let namelabelexist = originalElem.querySelector(".trans_name_div");
            if (namelabelexist != null) {
                let origElem   = document.querySelector("#preview-" + row + " .original");
                let currentTrans = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                nameDiff = isExactlyEqual(currentTrans, origElem.innerText);
                if (nameDiff != true) {
                    namelabelexist.setAttribute("class", "trans_name_div");
                } else {
                    namelabelexist.setAttribute("class", "trans_name_div_true");
                    namelabelexist.setAttribute("id", "trans_name_div_true");
                    namelabelexist.textContent = __("Difference in URL, name of theme or plugin or author!");
                }
            }
        }
    }
}

function showOldstringLabel(originalElem, currcount, wait, rejec, fuz, old, currstring, current, myHistory, my_check, repl_array, prev_trans, old_status, rowId, called_from, showDiff, translatorName) {
    var old_current;
    if (old_status != null && typeof old_status != 'undefined') {
        if (old_status.length != 0) {
            if (old_status.classList.contains("status-current")) old_current = "current";
        } else if (old_status.length == 0 && typeof old_status.classList != 'undefined') {
            if (old_status.classList.contains("status-waiting")) old_current = "waiting";
            else if (old_status.classList.contains("status-fuzzy")) old_current = "fuzzy";
        } else { old_current = 'untranslated'; }
    } else { old_current = 'untranslated'; }

    if (originalElem != undefined) {
        var labexist = originalElem.getElementsByClassName("trans_exists_div");
        if (labexist.length > 0) labexist[0].parentNode.removeChild(labexist[0]);

        let element1 = document.createElement("div");
        element1.setAttribute("class", "trans_exists_div");
        let preview = getPreview(rowId);

        if (my_check != true) {
            originalElem.appendChild(element1);
            element1.appendChild(document.createTextNode(__("Existing string(s)! ") + currcount + " " + wait + " " + rejec + " " + fuz + " " + old));
            currcount = currcount.replace("Current:", "");

            if ((+currcount) > 0 && current != 'current' && typeof prev_trans == 'object') {
                let wait_trans    = prev_trans.getElementsByClassName('translation-text');
                let waittrans_text = wait_trans[0]?.innerText || "";
                const isSame = waittrans_text === currstring;

                if (isSame) {
                    const br   = document.createElement('br');
                    const span = document.createElement("span");
                    element1.appendChild(br);
                    span.style.color    = "yellow";
                    span.textContent    = __("Current string is the same!");
                    element1.appendChild(span);
                } else if (showDiff == true) {
                    let element2 = document.createElement("div");
                    element2.setAttribute("class", "div.trans_original_div");
                    let element3 = document.createElement("span");
                    element3.setAttribute("class", "current-string");
                    element3.appendChild(document.createTextNode(currstring));
                    element2.appendChild(element3);
                    element1.appendChild(element2);

                    const diff     = JsDiff["diffWords"](current == 'waiting' ? currstring : waittrans_text, current == 'waiting' ? waittrans_text : currstring);
                    const fragment = document.createDocumentFragment();
                    diff.forEach((part) => {
                        const span = document.createElement("span");
                        span.className        = 'show_dif_in_original';
                        span.style.color      = part.added ? "#006400" : part.removed ? "red" : "white";
                        span.style.backgroundColor = part.added ? "white" : part.removed ? "white" : "grey";
                        span.appendChild(document.createTextNode(part.value));
                        fragment.appendChild(span);
                    });
                    element1.appendChild(fragment);
                    const br = document.createElement('br');
                    element1.appendChild(br);
                    element1.appendChild(document.createTextNode(" Current translator: " + translatorName));
                }
            }
        } else {
            element1.appendChild(document.createTextNode("Current string is updated with verbs"));
            let element2 = document.createElement("div");
            element2.setAttribute("class", "div.trans_original_div");
            element1.after(element2);
            let element3 = document.createElement("span");
            element3.setAttribute("class", "current-string");
            element3.appendChild(document.createTextNode(prev_trans));
            element2.appendChild(element3);
            markElements_previous(element3, repl_array, element3.innerText, [], repl_array, currstring);

            if (showDiff == true) {
                const diff     = JsDiff["diffWords"](currstring, prev_trans);
                const fragment = document.createDocumentFragment();
                diff.forEach((part) => {
                    const span = document.createElement("span");
                    span.style.color           = part.added ? "#006400" : part.removed ? "red" : "white";
                    span.style.backgroundColor = part.added ? "grey"    : part.removed ? "white" : "grey";
                    span.appendChild(document.createTextNode(part.value));
                    fragment.appendChild(span);
                });
            }
        }
    }
    return currstring;
}

// ─── addCheckButton ───────────────────────────────────────────
function addCheckButton(rowId, checkElem, lineNo) {
    let currentcel      = document.querySelector(`#preview-${rowId} td.priority`);
    let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button") ||
                          document.querySelector("#preview-" + rowId + " .tf-save-button-disabled");

    if (currentcel != null) {
        if (checkElem == null) {
            let sep = document.createElement("div"); sep.setAttribute("class", "checkElem_save"); currentcel.appendChild(sep);
            SavelocalButton = document.createElement("button");
            SavelocalButton.id = "tf-save-button"; SavelocalButton.className = "tf-save-button";
            SavelocalButton.innerText = "Curr"; SavelocalButton.onclick = savetranslateEntryClicked;
            currentcel.appendChild(SavelocalButton);
        } else {
            if (SavelocalButton == null) {
                SavelocalButton = document.createElement("button");
                SavelocalButton.id = "tf-save-button"; SavelocalButton.className = "tf-save-button";
                SavelocalButton.innerText = "Empt"; SavelocalButton.onclick = savetranslateEntryClicked;
                currentcel.appendChild(SavelocalButton);
            }
        }
    } else {
        SavelocalButton = "";
    }
    return { SavelocalButton };
}

// ─── savetranslateEntryClicked ────────────────────────────────
async function savetranslateEntryClicked(event) {
    var debug = false, autoCopySwitchedOff = false;
    const perfNow = () => performance.now();
    event.preventDefault(event);
    myrow = event.target.parentElement.parentElement;
    rowId = myrow.attributes.row.value;
    //console.debug("savetranslateEntryClicked: clicked for rowId " + rowId);
    let h       = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = h.querySelector("span.panel-header__bubble");

    if (current.innerText != "Empty" && current.innerText != "untranslated") {
        if (current.innerText == "transFill") {
            if (toBoolean(autoCopyClipBoard)) { autoCopySwitchedOff = true; autoCopyClipBoard = false; }
            let preview = getPreview(rowId);
            if (preview != null) {
                requestAnimationFrame(async () => {
                    preview.querySelector("td.actions .edit").click();
                    const editor = preview.nextElementSibling;
                    if (editor != null) await editor.querySelector(".translation-actions__save").click();
                    let recordDismiss = await waitForMyElement(`.gp-js-message-dismiss`, 1000, "savetranslate");
                    if (recordDismiss !== "Time-out reached") recordDismiss.click();
                });
            }
            if (autoCopySwitchedOff) { autoCopyClipBoard = true; autoCopySwitchedOff = false; }
        }

        if (current.innerText == "waiting") {
            let glotpress_open    = document.querySelector(`#preview-${rowId} td.actions .edit`);
            var glotpress_approve = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .approve`);
            let glotpress_close   = document.querySelector(`#editor-${rowId} div.editor-panel__left .panel-header-actions__cancel`);
            select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
            select.querySelector("dt").nextElementSibling.innerText = "waiting";
            glotpress_open.click();
            if (glotpress_approve != null) {
                glotpress_approve.click();
            } else {
                let preview2      = getPreview(rowId);
                let editor        = preview2.nextElementSibling;
                let glotpress_sug = editor.querySelector(".translation-actions__save");
                glotpress_sug.click();
            }
            select.querySelector("dt").nextElementSibling.innerText = "current";
            current.innerText = "current";
            glotpress_close.click();
            let prevrow = document.querySelector(`#preview-${rowId}.preview.status-waiting`);
            prevrow.classList.replace('status-waiting', 'status-current');
            //console.debug("prevrow for waiting:", prevrow);

            if (prevrow) prevrow.style.backgroundColor = "#b5e1b9";
        } else if (current.innerText == "fuzzy" || current.innerText == "changes requested") {
            let glotpress_open   = document.querySelector(`#preview-${rowId} td.actions .edit`);
            let glotpress_reject = document.querySelector(`#editor-${rowId} .editor-panel__right .status-actions .reject`);
            let glotpress_close  = document.querySelector(`#editor-${rowId} div.editor-panel__left .panel-header-actions__cancel`);
            glotpress_open.click(); glotpress_reject.click(); glotpress_close.click();
            let prevrow = document.querySelector(`#preview-${rowId}.preview.status-fuzzy`);
            if (prevrow) prevrow.className = "preview status-rejected priority-normal no-warnings has-translations";
        }

        let SavelocalButton = document.querySelector("#preview-" + rowId + " .tf-save-button");
        if (SavelocalButton != null) {
            SavelocalButton.className += " ready";
            SavelocalButton.disabled   = true;
        }
        const preview = document.querySelector(`#preview-${rowId}`);
        if (is_pte) {
            preview.querySelector(".checkbox input").checked = false;
        } else {
            preview.querySelector(".myCheckBox input").checked = false;
        }
    }
}

// ─── Misc glossary / counting utilities ──────────────────────
function countExactWordOccurrences(text, word) {
    const plainText = text.replace(/<[^>]*>/g, ' ');
    const matches   = plainText.match(new RegExp(`\\b${word}\\b`, 'gi'));
    return matches ? matches.length : 0;
}

function createNewGlossArray(gloss) {
    const sortedGlossArray = Object.values(gloss).map(entry => [entry.key, entry.value]).sort((a, b) => a[0].localeCompare(b[0]));
    return new Map(sortedGlossArray);
}

// ─── validate ────────────────────────────────────────────────
// NOTE: The large unreachable legacy block that used to live below the
// early return has been removed entirely. The findAllMissingWords path
// at the top IS the code that runs; the old span-walking loop was dead.
function validate(language, original, translation, locale, showDiff, rowId, isPlural, DefGlossary) {
    var wordCount = 0, foundCount = 0, percent = 0, toolTip = "", newText = "";
    var spansPlural, spansSingular, spans, spansArray, glossWords;
    var missingTranslations = [];

    if (toBoolean(DefGlossary)) { myglossary = glossary; } else { myglossary = glossary1; }
    newGloss = createNewGlossArray(myglossary);

    let isURL = isOnlyURL(original);
    if (isURL) { return { wordCount: 0, foundCount: 0, percent: 100, toolTip: "", newText: "" }; }

    if (myglossary.length == 0) { return { wordCount, foundCount, percent: 100, toolTip, newText }; }

    let markleftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`);
    if (!markleftPanel) { return { wordCount: 0, foundCount: 0, percent: 100, toolTip: "", newText: "" }; }

    let pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
    let singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
    if (!singlepresent) { return { wordCount: 0, foundCount: 0, percent: 100, toolTip: "", newText: "" }; }

    let singularText = singlepresent.getElementsByClassName('original')[0];
    if (pluralpresent) spansPlural  = pluralpresent.getElementsByClassName("glossary-word");
    spansSingular = singlepresent.getElementsByClassName("glossary-word");
    spans         = isPlural ? spansPlural : spansSingular;

    if (!spans || spans.length === 0) {
        return { wordCount: 0, foundCount: 0, percent: 100, toolTip: "", newText: "" };
    }

    spansArray          = Array.from(spans);
    glossWords          = createGlossArray(spansArray, newGloss);
    missingTranslations = findAllMissingWords(translation, glossWords, locale);

    if (missingTranslations.length != 0) {
        if ((spans.length - missingTranslations.length) != 0) {
            percent    = 100 - Math.round((missingTranslations.length * 100) / spans.length);
            toolTip    = buildTooltipFromGlossaryArray(missingTranslations);
            foundCount = spans.length - missingTranslations.length;
        } else {
            //console.debug("No glossary words found in translation",translation)
            percent = 0; foundCount = 0;
            toolTip   = buildTooltipFromGlossaryArray(missingTranslations); // ← add this
        }
    } else {
        percent    = 100;
        foundCount = spans.length;
    }
    wordCount = glossWords.length;
    return { wordCount, foundCount, percent, toolTip, newText };
}

// ─── containsExactWord / containsVerbMultipleTimes / findWordPositions ─
function containsExactWord(str, word) {
    return new RegExp(`\\b${word}\\b`, 'i').test(str);
}

function containsVerbMultipleTimes(text, verb) {
    const matches = text.match(new RegExp(`\\b${verb}\\b`, 'gi'));
    return matches ? [matches.length > 1, matches.length] : [false, 0];
}

function findWordPositions(text, word) {
    let positions = [], pos = text.indexOf(word), wordLength = word.length;
    while (pos !== -1) {
        let before = pos === 0 || /\W/.test(text[pos - 1]);
        let after  = pos + wordLength === text.length || /\W/.test(text[pos + wordLength]);
        if (before && after) positions.push(pos);
        pos = text.indexOf(word, pos + wordLength);
    }
    return positions;
}

// ─── match ────────────────────────────────────────────────────
function match(language, gWord, translation, gItemValue, original, oWord) {
    var glossaryverb, count = 0, myresult = false, positions = [];
    if (typeof language != 'undefined') {
        language = language.toLowerCase();
        if (language === "ta") return taMatch(gWord, translation);

        if (gItemValue.length == 1) {
            glossaryverb = gItemValue[0];
            let result = containsVerbMultipleTimes(original, oWord);
            if (result[1] == 1) {
                if (strictValidation ? containsExactWord(translation.toLowerCase(), glossaryverb) : translation.toLowerCase().includes(glossaryverb)) {
                    count++; myresult = true;
                }
            } else {
                let result1 = containsVerbMultipleTimes(original, oWord);
                let result2 = containsVerbMultipleTimes(translation, glossaryverb);
                if (result1[1] == result2[1]) { myresult = true; count += result2[1]; }
                else {
                    let dif = result2[1] - result1[1];
                    myresult = true;
                    if (dif > 0) count += result[1];
                }
            }
        } else {
            for (var i = 0; i < gItemValue.length; i++) {
                glossaryverb = gItemValue[i];
                let result   = containsVerbMultipleTimes(original, gWord);
                if (result[1] > 1) { count += result[1]; myresult = true; }
                else if (translation.includes(glossaryverb)) { count++; myresult = true; }
                else if (i > gItemValue.length) { myresult = false; }
            }
        }
        return { myresult, count };
    } else {
        if (!Array.isArray(gItemValue)) {
            glossaryverb = gItemValue;
            if (strictValidation ? containsExactWord(translation, glossaryverb) : translation.includes(glossaryverb)) { count++; myresult = true; }
        } else {
            for (var i = 0; i < gItemValue.length; i++) {
                glossaryverb = gItemValue[i];
                if (strictValidation ? containsExactWord(translation, glossaryverb) : translation.includes(glossaryverb)) { count++; myresult = true; break; }
            }
        }
        return { myresult, count };
    }
}

function taMatch(gWord, tWord) {
    let trimSize    = gWord.charCodeAt(gWord.length - 1) == "\u0BCD".charCodeAt(0) ? 2 : 1;
    let glossaryWord = gWord.substring(0, gWord.length - trimSize);
    glossaryWord     = glossaryWord.replaceAll("\u0BC7\u0BBE", "\u0BCB").replaceAll("\u0BC6\u0BBE", "\u0BCA");
    return tWord.includes(glossaryWord);
}

// ─── fetchOldRec ─────────────────────────────────────────────
async function fetchOldRec(url, rowId, showDiff) {
    var tbodyRowCount = 0, fetchOld_status = "", OldRec_status, diff, diffType = "diffWords";
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    if (e == null) return;

    let curr_trans  = e.querySelector("#editor-" + rowId + " .foreign-text").textContent;
    OldRec_status   = document.querySelector(`#editor-${rowId} span.panel-header__bubble`).innerHTML;

    const statusMap = {
        "current":     "waiting",
        "waiting":     "fuzzy",
        "rejected":    "current",
        "fuzzy":       "waiting",
        "old":         "current",
        "untranslated":"untranslated",
        "transFill":   "current",
    };
    let newurl = url.replace("mystat", statusMap[OldRec_status] || "current");
    fetchOld_status = statusMap[OldRec_status] || "";

    if (OldRec_status == "untranslated" || typeof newurl == "undefined") return;

    fetch(newurl, { headers: new Headers({ "User-agent": "Mozilla/4.0 Custom User Agent", 'Cache-Control': 'no-cache' }) })
        .then(r => r.text())
        .then(data => {
            var parser = new DOMParser();
            var doc    = parser.parseFromString(data, "text/html");
            var table  = doc.getElementById("translations");
            if (!table) return;
            tbodyRowCount = table.tBodies[0].rows.length;
            if (tbodyRowCount <= 1) return;

            // Remove old separators
            ["translator_sep1","translator_sep2","translator_sep3","translator_div1","translator_div2","translator_div3","translator_div4","translator_div5"].forEach(id => {
                let el = document.getElementById(id);
                if (el) el.remove();
            });

            rowContent = table.rows[tbodyRowCount - 1];
            orig       = rowContent.getElementsByClassName("original-text");
            trans      = rowContent.getElementsByClassName("translation-text");

            const makeDiv = (id, cssText, text) => {
                let el = createElementWithId("div", id);
                el.style.cssText = cssText;
                if (text) el.appendChild(document.createTextNode(text));
                return el;
            };

            const sepStyle = "width:100%;display:block;height:1px;border-bottom:1px solid grey;";
            const divStyle = "padding-left:10px;width:100%;display:block;word-break:break-word;background:lightgrey";

            let sep1 = makeDiv("translator_sep1", sepStyle, "");
            let sep2 = makeDiv("translator_sep2", sepStyle, "");
            let sep3 = makeDiv("translator_sep3", sepStyle, "");
            let sep4 = makeDiv("translator_sep4", sepStyle, "");
            let el1  = makeDiv("translator_div1", divStyle, "Existing translation ->" + fetchOld_status);
            let el2  = makeDiv("translator_div2", divStyle, OldRec_status == 'current' ? orig[0].innerText : trans[0].innerText);
            let el3  = makeDiv("translator_div3", divStyle, "");
            if (trans[0] != "undefined") {
                el3.appendChild(document.createTextNode(OldRec_status == "current" ? trans[0].innerText : orig[0].innerText));
            }
            let el4 = makeDiv("translator_div4", divStyle, "");
            let el5 = makeDiv("translator_div5", divStyle, "");

            let metaElem = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
            if (metaElem == null) return;
            [el1, sep1, el2, sep2, el3, sep3, sep3, el4, sep4, el5].forEach(n => metaElem.appendChild(n));

            var oldStr   = trans[0].innerText;
            var newStr   = curr_trans;
            var changes  = JsDiff[diffType](OldRec_status == 'current' ? oldStr : newStr, OldRec_status == 'current' ? newStr : oldStr);
            el4.appendChild(document.createTextNode(oldStr == newStr ? "Translation is the same" : "Translation has difference!"));

            var diff2    = JsDiff[diffType](OldRec_status == "current" ? oldStr : newStr, OldRec_status == "current" ? newStr : oldStr);
            var fragment = document.createDocumentFragment();
            diff2.forEach((part) => {
                const color = part.added ? "green" : part.removed ? "red" : "dark-grey";
                const bg    = part.added ? "white" : part.removed ? "white" : "dark-grey";
                let span    = document.createElement("span");
                span.style.color           = color;
                span.style.backgroundColor = bg;
                span.appendChild(document.createTextNode(part.value));
                fragment.appendChild(span);
            });
            el5.appendChild(fragment);
            metaElem.style.fontWeight = "900";
        }).catch(error => console.debug(error));
}

// ─── waitForElementInRow ─────────────────────────────────────
function waitForElementInRow(rowSelector, elementSelector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            const row     = document.querySelector(rowSelector);
            const element = row ? row.querySelector(elementSelector) : null;
            if (element) { clearInterval(intervalId); resolve(element); }
            timeout -= 100;
            if (timeout <= 0) { clearInterval(intervalId); reject(new Error(`Timeout waiting for ${elementSelector} in ${rowSelector}`)); }
        }, 200);
    });
}

var stringToHTML = function (str) {
    var parser = new DOMParser();
    return parser.parseFromString(str, "text/html");
};

// ─── fetchOld ────────────────────────────────────────────────
async function fetchOld(checkElem, result, url, single, originalElem, row, rowId, showName, current, prev_trans, currcount, showDiff) {
    var mycurrent = current, rejected, waiting, fuzzy, curr, old = "", wait = "", rejc = "", fuz = "", translatorName = "";
    const headers = new Headers({ 'Content-Type': 'application/json', 'User-agent': 'Mozilla/4.0 Custom User Agent', 'Cache-Control': 'no-cache' });

    fetch(url, { headers })
        .then(response => {
            if (!response.ok) {
                console.debug("fetchOld skipped — status:", response.status, rowId);
                throw new Error("fetchOld HTTP " + response.status);
            }
            return response.text();
        })
        .then(async data => {
            currURL = window.location.href;
            if (currURL.includes("&historypage")) return;

            var parser = new DOMParser();
            var doc    = parser.parseFromString(data, "text/html");
            var table  = await doc.getElementById("translations");
            if (table == null) return;

            let tr             = table.rows;
            let currstring     = "";
            const tbodyRowCount = table.tBodies[0].rows.length;
            rejected = table.querySelectorAll("tr.preview.status-rejected");
            waiting  = table.querySelectorAll("tr.preview.status-waiting");
            fuzzy    = table.querySelectorAll("tr.preview.status-fuzzy");
            curr     = table.querySelectorAll("tr.preview.status-current");
            old      = table.querySelectorAll("tr.preview.status-old");

            if (curr && curr.length != 0) {
                currcount  = " Current:" + curr.length;
                currstring = table.querySelector("tr.preview.status-current");
                let curreditor = table.querySelector("tr.editor.status-current");
                let panelRight = curreditor.querySelector('.editor-panel__right .meta');
                const dlElements = panelRight.querySelectorAll('dl');
                let targetIndex  = 1;
                dlElements.forEach(dl => { if (dl.textContent.includes('UTC')) targetIndex += 1; });
                translatorName = dlElements[targetIndex]?.querySelector('dd')?.textContent.trim();
                currstring     = currstring.querySelector(".translation-text")?.innerText || "";
            } else { currcount = ""; }

            if (waiting && waiting.length != 0) {
                prev_trans = waiting[0].querySelector("td.translation.foreign-text");
                wait       = " Waiting:" + waiting.length;
            } else { wait = ""; }

            rejc = rejected.length != 0 ? " Rejected:" + rejected.length : "";
            fuz  = fuzzy.length   != 0 ? " Fuzzy:"    + fuzzy.length    : "";

            if (old.length != 0 && waiting.length == 0) {
                prev_trans = old[0].querySelector("td.translation.foreign-text");
                old        = " Old:" + old.length;
            } else { old = ""; }

            if (tbodyRowCount > 2 && single == "False") {
                let old_status = document.querySelector("#preview-" + rowId);
                showOldstringLabel(originalElem, currcount, wait, rejc, fuz, old, currstring, mycurrent, true, false, [], prev_trans, old_status, rowId, "fetchOld", showDiff, translatorName);
            } else if (tbodyRowCount > 2 && single == "True") {
                // headerElem resolved in scope from outer function — kept for parity
                updateElementStyle(checkElem, headerElem, result, "False", originalElem, wait, rejc, fuz, old, rowId, showName, "", currcount, currstring, mycurrent, "", true, false, [], prev_trans, current, translatorName);
            }
        })
        .catch(error => console.debug('fetchOld error:', error.message));
}

// ─── gd_auto_hide_next_editor ────────────────────────────────
function gd_auto_hide_next_editor(editor) {
    var myRow, newRow;
    const preview   = editor.nextElementSibling;
    if (!preview) return;
    const next_editor = preview.nextElementSibling;
    var is_pte        = document.querySelector("#bulk-actions-toolbar-top") !== null;

    if (!next_editor) {
        oldRow = editor.id; newRow = oldRow.replace("editor", "preview");
        myRow  = document.querySelector(`#${newRow}`);
        myRow.style.backgroundColor = is_pte ? "#b5e1b9" : "#b5eeee";
        if (!is_pte) { var x = myRow.insertCell(0); x.className = "myCheckBox"; }
        return;
    }
    const next_preview = next_editor.previousElementSibling;
    if (!next_preview || !next_editor.classList.contains("editor") || !next_preview.classList.contains("preview")) return;

    oldRow = editor.id; newRow = oldRow.replace("editor", "preview");
    myRow  = document.querySelector(`#${newRow}`);
    myRow.style.backgroundColor = is_pte ? "#b5e1b9" : "#b5eeee";
    myRow.scrollIntoView({ block: "start" });
    window.scrollBy(0, -30);
    if (!is_pte) { var x = myRow.insertCell(0); x.className = "myCheckBox"; }
    next_editor.style.display  = "none";
    next_preview.style.display = "table-row";
}

// ─── gd_wait_table_alter ─────────────────────────────────────
function gd_wait_table_alter() {
    var status_has_changed;
    if (document.querySelector("#translations tbody") === null) return;

    let observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const user_is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
            mutation.addedNodes.forEach((addedNode) => {
                if (1 !== addedNode.nodeType) return;
                const row_is_editor    = addedNode.classList.contains("editor");
                status_has_changed = false;
                if (row_is_editor && mutation.previousSibling && mutation.previousSibling.matches('[class*="status-"]')) {
                    let status_before = RegExp(/status-[a-z]*/).exec(mutation.previousSibling.className)?.[0];
                    let status_after  = RegExp(/status-[a-z]*/).exec(addedNode.className)?.[0];
                    status_has_changed = status_before !== status_after;
                }

                chrome.storage.local.get(["DisableAutoClose"], function (data) {
                    const disable = toBoolean(data.DisableAutoClose);
                    if (!disable) {
                        gd_auto_hide_next_editor(addedNode);
                    } else {
                        const editor = addedNode.nextElementSibling;
                        if (editor != null) {
                            let newrow     = editor.getAttribute('row');
                            let prevPreview = document.querySelector("#preview-" + newrow);
                            let newPrevRow = prevPreview.getAttribute("row");
                            let checkBx    = document.querySelector("#preview-" + newPrevRow + " .myCheckBox");
                            var is_pte     = document.querySelector("#bulk-actions-toolbar-top") !== null;

                            if (!is_pte) {
                                prevPreview.style.backgroundColor = "#b5eeee";
                                if (checkBx == null) {
                                    inputBox   = document.querySelector("#preview-" + newPrevRow + " td input");
                                    mycheckbox = document.createElement('input');
                                    mycheckbox.setAttribute("type", "checkbox");
                                    mycheckbox.setAttribute("name", "selected-row[]");
                                    if (inputBox == null) {
                                        var x = prevPreview.insertCell(0);
                                        x.className = "myCheckBox";
                                    }
                                    let myrec = document.querySelector(`#editor-${newPrevRow}`);
                                    var tds   = myrec.getElementsByTagName("td")[0];
                                    if (tds == null) tds.setAttribute("colspan", 5);
                                }
                            }
                            const next_editor = editor.nextElementSibling;
                            if (next_editor != null) {
                                let myrow = next_editor.getAttribute('row');
                                if (myrow != null) addTranslateButtons(myrow);
                            }
                        }
                    }
                });
            });
        });
    });

    observer.observe(document.querySelector("#translations tbody"), { attributes: true, childList: true, characterData: true });
}

// ─── removeDiv ───────────────────────────────────────────────
function removeDiv(className) {
    var divToRemove = document.querySelector("." + className);
    if (divToRemove) {
        divToRemove.parentNode.removeChild(divToRemove);
        var legend      = document.getElementById('legend');
        var divElements = legend.getElementsByTagName("div");
        for (var i = 0; i < divElements.length; i++) {
            if (divElements[i].textContent === "Contains a Glossary term") {
                divElements[i].textContent = ""; break;
            }
        }
    }
}

// ─── GlotDict gloss-line hide watcher ────────────────────────
chrome.storage.local.get(["glotDictGlos"], async function (data) {
    setTimeout(async function () {
        showGlosLine = data.glotDictGlos;
        if (showGlosLine == "false") {
            function handleNewNode(mutationsList, observer) {
                mutationsList.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        for (var i = 0; i < mutation.addedNodes.length; i++) {
                            var node = mutation.addedNodes[i];
                            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('has-glotdict')) {
                                removeDiv("box.has-glotdict"); observer.disconnect();
                            }
                        }
                    }
                });
            }
            var observer = new MutationObserver(handleNewNode);
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }, 20);
});

// ─── Mutation observer servers ────────────────────────────────
let editorObserver;

function start_editor_mutation_server(textarea, action, leftPanel) {
    let targetNode = textarea instanceof Node ? textarea :
                     textarea[0] instanceof Node ? textarea[0] : null;
    if (!targetNode) { console.debug("start_editor_mutation_server: textarea is not valid"); return; }
    if (targetNode._observerAttached) return;
    targetNode._observerAttached = true;

    targetNode.addEventListener('input', () => {
        handleMutation([{ target: targetNode, type: "characterData", oldValue: null }]);
    });

    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetNode), 'value');
    if (descriptor?.set) {
        const originalSetter = descriptor.set;
        Object.defineProperty(targetNode, 'value', {
            set(newValue) {
                originalSetter.call(this, newValue);
                handleMutation([{ target: targetNode, type: "characterData", oldValue: null }]);
            },
            get: descriptor.get
        });
    }
}

function start_editor_mutation_server2(pluralTextarea, action, leftPanel) {
    let targetNode = pluralTextarea instanceof Node ? pluralTextarea : null;
    if (!targetNode) return;
    if (targetNode._observerAttached) return;
    targetNode._observerAttached = true;

    targetNode.addEventListener('input', () => {
        MutationsPlural([{ target: targetNode, type: "characterData", oldValue: null }]);
    });

    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetNode), 'value');
    if (descriptor?.set) {
        const originalSetter = descriptor.set;
        Object.defineProperty(targetNode, 'value', {
            set(newValue) {
                originalSetter.call(this, newValue);
                MutationsPlural([{ target: targetNode, type: "characterData", oldValue: null }]);
            },
            get: descriptor.get
        });
    }
}

function findByKey(map, searchKey) { return map.get(searchKey) || null; }

function decodeHTML(html) {
    const textArea   = document.createElement('textarea');
    textArea.innerHTML = html;
    return textArea.value;
}

// ─── handleMutation ──────────────────────────────────────────
async function handleMutation(mutationsList) {
    const mutation = mutationsList[0];
    if (!mutation || !mutation.target) return;

    const closestParent = mutation.target.closest ? mutation.target.closest('[row]') : mutation.target.parentElement.closest('[row]');
    if (!closestParent) return;

    const row       = closestParent.getAttribute("row");
    const leftPanel = document.querySelector(`#editor-${row} .editor-panel__left`);
    if (!leftPanel) return;

    addTranslateButtons(row);

    const detailPreview = document.querySelector(`#preview-${row}`);
    const detailEditor  = document.querySelector(`#editor-${row}`);
    if (!detailEditor || !detailPreview) return;

    const originalElem       = leftPanel.querySelector(".original-raw");
    const textareaActiveElem = leftPanel.querySelector("div.textareas.active");
    if (!textareaActiveElem) return;
    const textareaElem = textareaActiveElem.querySelector("textarea.foreign-text");
    const translation  = textareaElem?.value;
    textareaElem?.focus();
    if (!translation) return;

    const glossaryToUse = DefGlossary ? glossary : glossary1;
    const newGloss      = createNewGlossArray(glossaryToUse);

    let spans = [], spansArray = [];
    const singlePresent = leftPanel.querySelector(`.editor-panel__left .source-string__singular`);
    const pluralPresent = leftPanel.querySelector(`.editor-panel__left .source-string__plural`);

    // Determine which source string the active textarea belongs to.
    // The plural textarea has a data-plural-index="1" on its container;
    // if the active textarea is inside that container we validate against
    // the plural source string, otherwise against the singular.
    const activePluralIndex = textareaActiveElem?.closest('[data-plural-index]')?.getAttribute('data-plural-index');
    const isEditingPlural   = activePluralIndex === "1";

    if (isEditingPlural && pluralPresent) {
        spans = pluralPresent.getElementsByClassName("glossary-word");
    } else if (singlePresent) {
        spans = singlePresent.getElementsByClassName("glossary-word");
    }

    spansArray = Array.from(spans);
    spansArray.forEach((sp, i) => { sp.setAttribute('gloss-index', i); sp.classList.remove('highlight'); });

    const glossWords        = createGlossArray(spansArray, newGloss);
    missingTranslations     = await findAllMissingWords(translation, glossWords, locale);

    const panelTransMenu    = leftPanel.getElementsByClassName("panelTransMenu")[0];
    const missingVerbsButton = leftPanel.getElementsByClassName("translocal-entry-missing-button")[0];
    const priorityElem      = document.querySelector(`#preview-${row} .priority`);
    const markerPresent     = leftPanel.getElementsByClassName("marker");

    if (missingTranslations.length > 0) {
        // Add highlight class to spans for missing words
        missingTranslations.forEach(({ glossIndex }) => {
            if (spansArray[glossIndex]) spansArray[glossIndex].classList.add('highlight');
        });

        const toolTip = buildTooltipFromGlossaryArray(missingTranslations);
        const percent = Math.round(((spansArray.length - missingTranslations.length) / spansArray.length) * 100);

        if (missingVerbsButton) {
            missingVerbsButton.style.visibility = "visible";
            missingVerbsButton.title            = `${leftPanel.querySelector('.panel-header')?.title || ""}\nMissing glossary entry\n${toolTip}`;
        }

        applyPercentStyle(panelTransMenu, null, percent, missingVerbsButton);

        if (priorityElem) {
            priorityElem.style.backgroundColor = percent >= 66 ? "yellow"
                : percent >= 33 ? "orange"
                : percent >= 10 ? "purple"
                : percent >  0  ? "darkorange"
                : "red";
            priorityElem.innerHTML = percent > 0
                ? `<span style="color:black">${percent}</span>`
                : String(spansArray.length);
        }

        if (markerPresent[0]) markerPresent[0].remove();
        mark_glossary(leftPanel, toolTip, translation, row, false);
    } else {
        // All glossary words present — clear all highlights and markers
        spansArray.forEach(sp => sp.classList.remove('highlight'));
        if (markerPresent[0]) markerPresent[0].remove();
        await remove_all_gloss(leftPanel, "", false, row);
        if (missingVerbsButton) { missingVerbsButton.style.visibility = "hidden"; missingVerbsButton.title = ""; }
        applyPercentStyle(panelTransMenu, null, 100, missingVerbsButton);
        if (priorityElem) {
            priorityElem.style.backgroundColor = "green";
            priorityElem.innerHTML = '<span style="color:black">100</span>';
        }
    }

    const inputElement = document.getElementById(`translation_${row}_0`);
    if (inputElement) inputElement.focus();
}

// ─── MutationsPlural ─────────────────────────────────────────
function MutationsPlural(mutationsList) {
    const glossaryToUse = DefGlossary ? glossary : glossary1;
    const newGloss      = createNewGlossArray(glossaryToUse);

    const mutation = mutationsList[0];
    if (!mutation || !mutation.target) return;

    mutationsList.forEach(async function (mutation) {
        // Resolve rowId reliably via closest [row] attribute
        const rowParent = mutation.target.closest ? mutation.target.closest('[row]')
                        : mutation.target.parentElement.closest('[row]');
        if (!rowParent) return;
        rowId = rowParent.getAttribute("row");

        detailPreview  = getPreview(rowId);
        let detailEditor = document.querySelector(`#editor-${rowId}`);
        if (!detailEditor || !detailPreview) return;

        // Resolve leftPanel reliably from rowId
        let leftPanel = document.querySelector(`#editor-${rowId} .editor-panel__left`);
        if (!leftPanel) return;

        let mypluralOriginal = detailEditor.getElementsByClassName("source-string__plural");
        let pluralOriginal   = mypluralOriginal[0]?.querySelector(".original-raw");
        if (!pluralOriginal) return;

        // Build spansArray from the plural source string inside this editor
        const pluralPresent = leftPanel.querySelector(`.source-string__plural`);
        let spansArray = [], glossWords = [];
        if (pluralPresent) {
            let spansPlural = pluralPresent.getElementsByClassName("glossary-word");
            spansArray      = Array.from(spansPlural);
            glossWords      = createGlossArray(spansArray, newGloss);
            // Reset plural spans only — do NOT touch singular spans
            spansArray.forEach((sp, i) => { sp.setAttribute('gloss-index', i); sp.classList.remove('highlight'); });
        }

        if (spansArray.length === 0) return; // no glossary words in plural source — nothing to do

        // Read translation directly from the textarea — do NOT call focus()
        // as that re-triggers input events and interferes with the singular handler
        let translation = mutation.target.value;
        if (!translation) return;

        missingTranslations = await findAllMissingWords(translation, glossWords, locale);

        // Mark only the plural source spans — singular spans are managed by handleMutation
        missingTranslations.forEach(({ glossIndex }) => {
            if (spansArray[glossIndex]) spansArray[glossIndex].classList.add('highlight');
        });

        let missingVerbsButton = leftPanel.getElementsByClassName("translocal-entry-missing-button");
        let panelTransMenu     = leftPanel.getElementsByClassName("panelTransMenu");
        let headerElem         = leftPanel.querySelector(`.panel-header`);
        let markerPresent      = leftPanel.getElementsByClassName("marker");
        const priorityElem     = document.querySelector(`#preview-${rowId} .priority`);

        if (missingTranslations.length > 0) {
            const toolTip = buildTooltipFromGlossaryArray(missingTranslations);
            const percent = Math.round(((spansArray.length - missingTranslations.length) / spansArray.length) * 100);

            if (missingVerbsButton[0]) {
                missingVerbsButton[0].style.visibility = "visible";
                missingVerbsButton[0].title = (headerElem?.title || "") + "\nMissing glossary entry\n" + toolTip;
            }
            applyPercentStyle(panelTransMenu[0], null, percent, missingVerbsButton[0]);
            if (priorityElem) {
                priorityElem.style.backgroundColor = percent >= 66 ? "yellow"
                    : percent >= 33 ? "orange"
                    : percent >= 10 ? "purple"
                    : percent >  0  ? "darkorange"
                    : "red";
                priorityElem.innerHTML = percent > 0
                    ? `<span style="color:black">${percent}</span>`
                    : String(spansArray.length);
            }
            if (markerPresent[0]) markerPresent[0].remove();
            mark_glossary(leftPanel, toolTip, translation, rowId, true);
        } else {
            // Plural line is correct — clear only plural span highlights, not singular ones
            spansArray.forEach(sp => sp.classList.remove('highlight'));
            if (markerPresent[0]) markerPresent[0].remove();
            if (missingVerbsButton[0]) { missingVerbsButton[0].style.visibility = "hidden"; missingVerbsButton[0].title = ""; }
            applyPercentStyle(panelTransMenu[0], null, 100, null);
            if (priorityElem) { priorityElem.style.backgroundColor = "green"; priorityElem.innerHTML = '<span style="color:black">100</span>'; }
            // Only remove glossary markers on the plural source string element, not the whole leftPanel
            const pluralSourceElem = leftPanel.querySelector(`.source-string__plural`);
            if (pluralSourceElem) await remove_all_gloss(pluralSourceElem, "", false, rowId);
        }
    });
}