// Load the version from maniscript
var version = chrome.runtime.getManifest().version;
var scriptElm = document.createElement("script");
scriptElm.src = chrome.runtime.getURL("wptf-cute-alert.js");
document.body.appendChild(scriptElm);
const template = `
    <h1>WP Translation Filler - Options v${version}
    </h1>
    `;
// Show version in header of options screen
optionHeader = document.getElementById('container')
optionHeader.insertAdjacentHTML("afterbegin", template);
var link = document.createElement("link");
var parrotActive = 'false';
var inter;
link.type = "text/css";
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("wptf-cute-alert.css");

document.getElementsByTagName("head")[0].appendChild(link);

document.addEventListener("DOMContentLoaded", async () => {
            chrome.storage.local.get(["noUI"], async function (data) {
    // let userLang = checkLocale() || 'en-gb';
    //console.debug("Checking if UI should be loaded, noUI value:", data.noUI);
                if (!toBoolean(data.noUI)) {

                    try {
                        const urlParams = new URLSearchParams(window.location.search);
                        const locale = urlParams.get("lang") || "en";
                        const response = await fetch(`locales/options/${locale}.json`);
                        const translations = await response.json();

                        // Functie om een element tekst te vertalen, recursief
                        function translateElement(el) {
                            if (el.nodeType === Node.TEXT_NODE) {
                                const key = el.textContent.trim();
                                if (translations[key] !== undefined) {
                                    el.textContent = translations[key];
                                }
                            } else if (el.nodeType === Node.ELEMENT_NODE) {
                                // Voor input velden
                                if (el.tagName.toLowerCase() === "input" && el.type !== "checkbox") {
                                    const key = el.value.trim();
                                    if (translations[key] !== undefined) {
                                        el.value = translations[key];
                                    }
                                }

                                // Voor tooltip data-tooltip
                                if (el.hasAttribute("data-tooltip")) {
                                    const key = el.getAttribute("data-tooltip").trim();
                                    if (translations[key] !== undefined) {
                                        el.setAttribute("data-tooltip", translations[key]);
                                    }
                                }

                                // Recursief naar kinderen
                                el.childNodes.forEach(translateElement);
                            }
                        }

                        // Start vertalen vanaf container
                        const container = document.getElementById("container");
                        if (container) translateElement(container);

                        // console.log(`Loaded translations for locale: ${locale}`);
                    } catch (err) {
                        console.error("Error loading translations:", err);
                    }
                }
        });
})
const rangeInput = document.getElementById(('screenWidth'));
const rangeValue = document.getElementById(('rangeValue'));

rangeInput.addEventListener('input', function () {
    rangeValue.textContent = this.value;
})

document.getElementById("exportverbs").addEventListener("click", export_verbs_csv);
// This array is used to replace wrong words in translation and is necessary for the export
let replaceVerb = [];

let apikeyTextbox = document.getElementById("google_api_key");
let apikeyCerebrasTextbox = document.getElementById("cerebras_api_key");
let apikeydeeplTextbox = document.getElementById("deepl_api_key");
let apikeydeeplCheckbox = document.getElementById("DeeplFree");
let apikeymicrosoftTextbox = document.getElementById("microsoft_api_key");
let apikeykimiTextbox = document.getElementById("kimi_api_key");
let apikeyLaraTextbox = document.getElementById("lara_accessKeyId");
let LaraSecretTextbox = document.getElementById("lara_accessKeySecret");
let apikeygroqTextbox = document.getElementById("groq_api_key");
let apikeyOpenAITextbox = document.getElementById("OpenAI_api_key");
let apikeyOpenRouterTextbox = document.getElementById("openRouter_api_key");
let apikeyMistralTextbox = document.getElementById("Mistral_api_key");
let apikeyNLPTextbox = document.getElementById("nlpcloud_api_key");
let apikeyDeepSeekTextbox = document.getElementById("deepseek_api_key");
let apikeyTranslateioTextbox = document.getElementById("Translateio_api_key");
let apikeyClaudeTextbox = document.getElementById("Claude_api_key");
let apikeyOllamaTextbox = document.getElementById("Ollama_api_key");
let apikeyLingvanexTextbox = document.getElementById("Lingvanex_api_key");
let apikeyGeminiTextbox = document.getElementById("gemini_api_key");
let transselectBox = document.getElementById("transselect");
let cerebrasselectBox = document.getElementById("cerebrasSelect");
let KimiselectBox = document.getElementById("KimiSelect");
let OpenAIselectBox = document.getElementById("OpenAIselect");
let groqselectBox = document.getElementById("groqSelect");
let OpenRouterselectBox = document.getElementById("OpenRouterSelect");
let MistralselectBox = document.getElementById("MistralSelect");
let ClaudselectBox = document.getElementById("ClaudSelect");
let OllamaselectBox = document.getElementById("Ollama_model");
let GeminiselectBox = document.getElementById("GeminiSelect");
let OpenAItempBox = document.getElementById("OpenAI_temp");
let groqBatchSizeBox = document.getElementById("BatchSize");
let Top_k_Box = document.getElementById("AI_Top_k");
let Top_p_Box = document.getElementById("AI_Top_p");
let OpenAIToneBox = document.getElementById("ToneSelect");
let destLangTextbox = document.getElementById("destination_lang");
let uploadedFile = document.getElementById("glossary_file_uploaded");
let glossaryFile = document.getElementById("glossary_file");
let uploadedSecondFile = document.getElementById("glossary_file_second_uploaded");
let glossarySecondFile = document.getElementById("glossary_file_second");
let LtToolKeyTextbox = document.getElementById("languagetool_key");
let LtToolUserTextbox = document.getElementById("languagetool_user");
let LtToolLangTextbox = document.getElementById("languagetool_language");
let LtToolLangCheckbox = document.getElementById("LangTool_Free");
//let DownloadTextbox = document.getElementById("Download_path");
let TMwaitValue = document.getElementById("tmWait");
let OpenAIwaitValue = document.getElementById("OpenAIWait");
let DeepLwaitValue = document.getElementById("DeepLWait");
let bulkWaitValue = document.getElementById("bulkWait");
let LMkWaitValue = document.getElementById("LMStudioTimeout");
let TMtresholdValue = document.getElementById("TMtreshold");
let myScreenWidthValue = document.getElementById("screenWidth");
let verbsTextbox = document.getElementById("text_verbs");
let promptTextbox = document.getElementById("text_openai_prompt");
let ClaudePromptTextbox = document.getElementById("text_claude_prompt");
let OllamaPromptTextbox = document.getElementById("text_ollama_prompt");
let GeminiPromptTextbox = document.getElementById("text_gemini_prompt");
let reviewTextbox = document.getElementById("text_openai_review");
let preverbsTextbox = document.getElementById("text_pre_verbs");
let spellcheckTextbox = document.getElementById("text_ignore_verbs");
let showHistCheckbox = document.getElementById("show-history");
let showDiffCheckbox = document.getElementById("comp-translations");
let showGlotCheckbox = document.getElementById("show-glotDictGlos");
let showConvertCheckbox = document.getElementById("show-convertToLower");
let showLTCheckbox = document.getElementById("Auto-LT-spellcheck");
let showReviewCheckbox = document.getElementById("Auto-review-OpenAI");
let showForceFormal = document.getElementById("Force-formal");
let showDefGlossary = document.getElementById("use-default-glossary");
let showStrictValidation = document.getElementById("use-strict-validation");
let showAutoClipboard = document.getElementById("auto-copy-clipboard");
let showDisableClose = document.getElementById("disable-auto-close");
let showLocalOllama = document.getElementById("ollama-local");
let showNoPeriodCheckbox = document.getElementById("no-period");
let showdDebugModeCheckbox = document.getElementById("debugmode");
let showdNoUICheckbox = document.getElementById("NoUI");
let shownoChevronsCheckbox = document.getElementById("noChevrons");

document.getElementById('show-changelog-link').addEventListener('click', function (e) {
    e.preventDefault(); // Prevent the default link behavior
  //console.debug("we show it")
  showChangelog();    // Call your function
});

// ============================================================
// GROQ DYNAMIC MODEL LIST
// ============================================================

// Models we never want in a chat-model dropdown (audio, safety/guard, tts, language-specialized, etc.)
const GROQ_EXCLUDE_PATTERN = /whisper|tts|playai|orpheus|guard|allam|compound/i;

// Fallback list used if the fetch fails (no key yet, offline, API error, etc.)
const GROQ_FALLBACK_MODELS = [
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-safeguard-20b",
];

// Preferred default when a stored model is no longer available.
// Used instead of "just pick whatever sorts first" (which could land on
// a language- or task-specialized model like allam-2-7b).
const GROQ_PREFERRED_DEFAULT = "openai/gpt-oss-20b";

async function fetchGroqModels(apiKey) {
    const resp = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": "Bearer " + apiKey }
    });
    if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
    }
    const json = await resp.json();
   // console.debug("Fetched Groq models:", json.data.map(m => m.id));
    return json.data
        .map(m => m.id)
        .filter(id => !GROQ_EXCLUDE_PATTERN.test(id))
        .sort();
}

async function loadGroqModels(preselectValue) {
    const statusEl = document.getElementById("groqModelStatus");
    const selectEl = groqselectBox;
    const apiKey = apikeygroqTextbox.value;

    selectEl.innerHTML = "";
    const loadingOpt = document.createElement("option");
    loadingOpt.value = "";
    loadingOpt.textContent = "Loading models...";
    selectEl.appendChild(loadingOpt);
    if (statusEl) statusEl.textContent = "";

    let models;
    let usedFallback = false;

    try {
        if (!apiKey || apiKey === "groq-api key->" || apiKey.trim() === "") {
            throw new Error("No API key set");
        }
        models = await fetchGroqModels(apiKey);
        if (!models.length) throw new Error("Empty model list");
    } catch (err) {
        // console.warn("Could not fetch Groq models, using fallback list:", err.message);
        models = GROQ_FALLBACK_MODELS;
        usedFallback = true;
    }

    selectEl.innerHTML = "";
    models.forEach(id => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = id;
        selectEl.appendChild(opt);
    });

    if (preselectValue && models.includes(preselectValue)) {
        selectEl.value = preselectValue;
    } else if (preselectValue) {
        // stored model no longer exists (deprecated) - fall back to a known-good
        // default rather than whatever happens to sort first, and warn the user
        const fallbackChoice = models.includes(GROQ_PREFERRED_DEFAULT)
            ? GROQ_PREFERRED_DEFAULT
            : models[0];
        selectEl.value = fallbackChoice;
        if (statusEl) {
            statusEl.textContent = `Note: "${preselectValue}" is no longer available, switched to ${fallbackChoice}.`;
            statusEl.style.color = "#ffffff";
            statusEl.style.fontWeight = "bold";
        }
    } else {
        // no stored model at all - prefer the known-good default over index 0
        selectEl.value = models.includes(GROQ_PREFERRED_DEFAULT) ? GROQ_PREFERRED_DEFAULT : models[0];
    }

    if (usedFallback && statusEl && !statusEl.textContent) {
        statusEl.textContent = "Enter a valid Groq API key and click Refresh to load the live model list.";
        statusEl.style.color = "#ffffff";
        statusEl.style.fontWeight = "normal";
    } else if (!usedFallback && statusEl && !statusEl.textContent) {
        statusEl.textContent = `${models.length} models loaded.`;
        statusEl.style.color = "#ffffff";
        statusEl.style.fontWeight = "normal";
    }
}

document.getElementById("refreshGroqModels").addEventListener("click", function () {
    loadGroqModels(groqselectBox.value || undefined);
});

// ============================================================
// CEREBRAS DYNAMIC MODEL LIST
// ============================================================

// Cerebras' lijst is klein en bevat geen audio/tts/guard-modellen,
// dus we hebben eigenlijk geen exclude-pattern nodig. Toch meegenomen
// voor het geval ze later niet-chat modellen toevoegen.
const CEREBRAS_EXCLUDE_PATTERN = /whisper|tts|guard|embed/i;

// Fallback list used if the fetch fails (no key yet, offline, API error, etc.)
// Gebaseerd op wat je account nu kan aanroepen.
const CEREBRAS_FALLBACK_MODELS = [
    "gemma-4-31b",
    "gpt-oss-120b",
    "zai-glm-4.7",
];

// Preferred default when a stored model is no longer available.
const CEREBRAS_PREFERRED_DEFAULT = "gemma-4-31b";

async function fetchCerebrasModels(apiKey) {
    const resp = await fetch("https://api.cerebras.ai/v1/models", {
        headers: { "Authorization": "Bearer " + apiKey }
    });
    if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
    }
    const json = await resp.json();
    // console.debug("Fetched Cerebras models:", json.data.map(m => m.id));
    return json.data
        .map(m => m.id)
        .filter(id => !CEREBRAS_EXCLUDE_PATTERN.test(id))
        .sort();
}

async function loadCerebrasModels(preselectValue) {
    const statusEl = document.getElementById("cerebrasModelStatus");
    const selectEl = cerebrasselectBox;
    const apiKey = apikeyCerebrasTextbox.value;

    selectEl.innerHTML = "";
    const loadingOpt = document.createElement("option");
    loadingOpt.value = "";
    loadingOpt.textContent = "Loading models...";
    selectEl.appendChild(loadingOpt);
    if (statusEl) statusEl.textContent = "";

    let models;
    let usedFallback = false;

    try {
        if (!apiKey || apiKey === "cerebras-api key->" || apiKey.trim() === "") {
            throw new Error("No API key set");
        }
        models = await fetchCerebrasModels(apiKey);
        if (!models.length) throw new Error("Empty model list");
    } catch (err) {
        // console.warn("Could not fetch Cerebras models, using fallback list:", err.message);
        models = CEREBRAS_FALLBACK_MODELS;
        usedFallback = true;
    }

    selectEl.innerHTML = "";
    models.forEach(id => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = id;
        selectEl.appendChild(opt);
    });

    if (preselectValue && models.includes(preselectValue)) {
        selectEl.value = preselectValue;
    } else if (preselectValue) {
        const fallbackChoice = models.includes(CEREBRAS_PREFERRED_DEFAULT)
            ? CEREBRAS_PREFERRED_DEFAULT
            : models[0];
        selectEl.value = fallbackChoice;
        if (statusEl) {
            statusEl.textContent = `Note: "${preselectValue}" is no longer available, switched to ${fallbackChoice}.`;
            statusEl.style.color = "#ffffff";
            statusEl.style.fontWeight = "bold";
        }
    } else {
        selectEl.value = models.includes(CEREBRAS_PREFERRED_DEFAULT) ? CEREBRAS_PREFERRED_DEFAULT : models[0];
    }

    if (usedFallback && statusEl && !statusEl.textContent) {
        statusEl.textContent = "Enter a valid Cerebras API key and click Refresh to load the live model list.";
        statusEl.style.color = "#ffffff";
        statusEl.style.fontWeight = "normal";
    } else if (!usedFallback && statusEl && !statusEl.textContent) {
        statusEl.textContent = `${models.length} models loaded.`;
        statusEl.style.color = "#ffffff";
        statusEl.style.fontWeight = "normal";
    }
}

document.getElementById("refreshCerebrasModels").addEventListener("click", function () {
    loadCerebrasModels(cerebrasselectBox.value || undefined);
});
chrome.storage.local.get(["apikey", "apikeyCerebras", "apikeyDeepl", "apikeyKimi", "apikeyMicrosoft", "apikeyOpenAI", "apikeyDeepSeek", "apikeyTranslateio", "apikeyClaude", "apikeygroq", "apikeyMistral", "apikeyOllama", "apikeyOpenRouter", "apikeyLingvanex", "apikeyGemini", "apikeyNLP", "GeminiPrompt", "OpenAIPrompt", "ClaudePrompt", "CerebrasSelect", "OpenAISelect", "OpenRouterSelect", "ClaudSelect", "KimiSelect", "GeminiSelect", "groqSelect", "MistralSelect", "OpenAITone", "OpenAItemp", "AI_Top_p", "AI_Top_k", "OpenAIWait", "DeepLWait", "LMStudioWait", "reviewPrompt", "transsel", "destlang", "glossaryFile", "glossaryFileSecond", "postTranslationReplace", "preTranslationReplace", "spellCheckIgnore", "showHistory", "showTransDiff", "glotDictGlos", "convertToLower", "DeeplFree", "TMwait", "bulkWait", "interXHR", "LtKey", "LtUser", "LtLang", "LtFree", "Auto_spellcheck", "Auto_review_OpenAI", "ForceFormal", "DefGlossary", "WPTFscreenWidth", "strictValidate", "autoCopyClip", "TMtreshold", "DownloadPath", "DisableAutoClose", "LocalOllama", "ollamaModel", "ollamaPrompt", "noPeriod", "DebugMode", "noUI", "groqBatchSize", "apikeylara_accessKeyId","lara_accessKeySecret", "noChevrons"], function (data) {
    
    if (data.DeeplFree == true) {
            apikeydeeplCheckbox.checked = true
    }
    else {
            apikeydeeplCheckbox.checked = false
    }
    
    if (typeof data.TMwait == "undefined") {
        TMwait = 500;
    }
    else {
        TMwait = data.TMwait;
        TMwaitValue.value = TMwait;

    }
    if (typeof data.groqBatchSize == "undefined") {
        groqBatchSize = 10;
    }
    else {
        groqBatchSize = data.groqBatchSize;
        groqBatchSizeBox.value = groqBatchSize;

    }
    if (typeof data.DeepLWait == "undefined") {
        DeepLWait = 500;
    }
    else {
        DeepLWaitVal = data.DeepLWait;
        DeepLWait.value = DeepLWaitVal;

    }

    if (typeof data.OpenAIWait == "undefined") {
        OpenAIWait = 7500;
    }
    else {
        OpenAIWaitVal = data.OpenAIWait;
        OpenAIWait.value = OpenAIWaitVal;

    }

    if (typeof data.LMStudioWait == "undefined") {
        LMWait = 20000;
    }
    else {
        LMkWaitValue.value = data.LMStudioWait;
    }

    if (typeof data.bulkWait == "undefined") {
        bulkWait = 1000;
    }
    else {
        bulkWait = data.bulkWait;
        bulkWaitValue.value = bulkWait;

    }
    if (typeof data.TMtreshold == "undefined") {
        TMtreshold.value = '100';
    }
    else {
        TMtreshold = data.TMtreshold;
        TMtresholdValue.value = TMtreshold;

    }
    if (typeof data.WPTFscreenWidth == "undefined") {
        myScreenWidth = '90';
        myScreenWidthValue.value = myScreenWidth;
        rangeValue.textContent = myScreenWidth
    }
    else {
        myScreenWidth = data.WPTFscreenWidth;
        myScreenWidthValue.value = myScreenWidth;
        rangeValue.textContent = myScreenWidth
    }
    if (typeof data.OpenAItemp == "undefined") {
        OpenAItemp = 1;
    }
    else {
        OpenAItempBox.value = data.OpenAItemp;
        OpenAItemp = data.OpenAItemp
    }

    if (typeof data.AI_Top_k == "undefined") {
        AI_Top_k = 1;
    }
    else {
        Top_k_Box.value = data.AI_Top_k;
        AI_Top_k = data.AI_Top_k
    }
    if (typeof data.AI_Top_p == "undefined") {
        AI_Top_p = 0.1;
    }
    else {
        Top_p_Box.value = data.AI_Top_p;
        AI_Top_p = data.AI_Top_p
    }
    if (typeof data.OpenAITone == "undefined") {
        OpenTone = 'informal';
    }
    else {
        OpenAIToneBox.value = data.OpenAITone;
        OpenAITone = data.OpenAITone
     }
 
    apikeydeeplCheckbox = data.DeeplFree;
    apikeyTextbox.value = data.apikey;
    apikeyCerebrasTextbox.value = data.apikeyCerebras;
    apikeydeeplTextbox.value = data.apikeyDeepl;
    apikeymicrosoftTextbox.value = data.apikeyMicrosoft;
    apikeyOpenAITextbox.value = data.apikeyOpenAI;
    apikeygroqTextbox.value = data.apikeygroq;
    apikeyOpenRouterTextbox.value = data.apikeyOpenRouter;
    apikeyMistralTextbox.value = data.apikeyMistral;
    apikeyDeepSeekTextbox.value = data.apikeyDeepSeek;
    apikeyTranslateioTextbox.value = data.apikeyTranslateio
    apikeyClaudeTextbox.value = data.apikeyClaude;
    apikeyLingvanexTextbox.value = data.apikeyLingvanex;
    apikeyGeminiTextbox.value = data.apikeyGemini;
    if (data.apikeyNLP == null && typeof data.apikeyNLP == "undefined") {
        apikeyNLPTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeyNLPTextbox.value = data.apikeyNLP;
    }
    if (data.apikeygroq == null && typeof data.apikeygroq == "undefined") {
        apikeygroqTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeygroqTextbox.value = data.apikeygroq;
    }
    if (data.apikeygroq == null && typeof data.apikeygroq == "undefined") {
        apikeygroqTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeygroqTextbox.value = data.apikeygroq;
    }
    if (data.apikeylara_accessKeyId== null && typeof data.apikeylara_accessKeyId == "undefined") {
        apikeyLaraTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeyLaraTextbox.value = data.apikeylara_accessKeyId;
    }

    if (data.lara_accessKeySecret == null && typeof data.lara_accessKeySecret == "undefined") {
        LaraSecretTextbox.value = "Enter secret or leave empty";
    }
    else {
        LaraSecretTextbox.value = data.lara_accessKeySecret;
    }
    if (data.apikeyKimi == null && typeof data.apikeyKimi == "undefined") {
        apikeykimiTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeykimiTextbox.value = data.apikeyKimi;
    }

    if (data.apikeyOllama == null && typeof data.apikeyOllama == "undefined") {
        apikeyOllamaTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeyOllamaTextbox.value = data.apikeyOllama;

    }
    if (data.apikeyCerebras == null && typeof data.apikeyCerebras == "undefined") {
        apikeyCerebrasTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeyCerebrasTextbox.value = data.apikeyCerebras;
    }

    if (data.transsel == "") {
        transselectBox.value = "google";
    }
    else {
        transselectBox.value = data.transsel;
    }

    if (typeof data.OpenRouterSelect == 'undefined') {
        OpenRouterselectBox.value = "openrouter/free";
    }
    else if (data.OpenRouterSelect == "") {
        OpenRouterselectBox.value = "openrouter/free";
    }
    else {
        OpenRouterselectBox.value = data.OpenRouterSelect;
    }

    if (typeof data.KimiSelect == 'undefined') {
        KimiselectBox.value = "kimi-k2.6";
    }
    else if (data.KimiSelect == "") {
        KimiselectBox.value = "kimi-k2.6";
    }
    else {
        KimiselectBox.value = data.KimiSelect;
    }

    if (typeof data.OpenAISelect == 'undefined') {
        OpenAIselectBox.value = "gpt-3.5-turbo";
    }
    else if (data.OpenAISelect == "") {
        OpenAIselectBox.value = "gpt-3.5-turbo";
    }
    else {
        OpenAIselectBox.value = data.OpenAISelect;
    }
    // Populate the Cerebras dropdown dynamically from the Cerebras API,
    // preselecting the stored model if it still exists (see loadCerebrasModels()).
    // console.debug("cerebrasselect:", data.CerebrasSelect)
    const storedCerebrasModel = (typeof data.CerebrasSelect == 'undefined' || data.CerebrasSelect == "")
        ? undefined
        : data.CerebrasSelect;
    loadCerebrasModels(storedCerebrasModel);

    // Populate the groq dropdown dynamically from the Groq API,
    // preselecting the stored model if it still exists (see loadGroqModels()).
    const storedGroqModel = (typeof data.groqSelect == 'undefined' || data.groqSelect == "")
        ? undefined
        : data.groqSelect;
    loadGroqModels(storedGroqModel);

    if (typeof data.MistralSelect == 'undefined') {
       MistralselectBox.value = "mistral-small-latest";
    }
    else if (data.MistralSelect == "") {
        MistralselectBox.value = "mistral-small-latest";
    }
    else {
        MistralselectBox.value = data.MistralSelect;
    }
    
    if (typeof data.GeminiSelect == 'undefined') {
         GeminiselectBox.value = "gemini-2.5-flash";
    }
    else if (data.GeminiSelect == "") {
         GeminiselectBox.value = "gemini-2.5-flash";
    }
    else {
         GeminiselectBox.value = data.GeminiSelect;
    }
    if (typeof data.ClaudSelect == 'undefined') {
        ClaudselectBox.value = "claude-3-5-haiku-latest";
    }
    else if (data.ClaudSelect == "") {
        ClaudselectBox.value = "claude-3-5-haiku-latest";
    }
    else {
        ClaudselectBox.value = data.ClaudSelect;
    }

    if (typeof data.ollamaModel == 'undefined') {
        OllamaselectBox.value = "gemma3:27b";
    }
    else if (data.ollamaModel == "") {
        OllamaselectBox.value = "gemma3:27b";
    }
    else {
        OllamaselectBox.value = data.ollamaModel;
    }
    destLangTextbox.value = data.destlang;
    // select synchroniseren met input
if ([...langselect.options].some(opt => opt.value === destLangTextbox.value)) {
    langselect.value = destLangTextbox.value;
} else {
    langselect.selectedIndex = -1; // geen match
}
    uploadedFile.innerText = `${data.glossaryFile}`;
    uploadedSecondFile.innerText = `${data.glossaryFileSecond}`;
    verbsTextbox.value = data.postTranslationReplace;
    preverbsTextbox.value = sortTextarea(data.preTranslationReplace);

    if (typeof data.OpenAIPrompt == 'undefined') {
        promptTextbox.value = 'Enter prompt'
    }
    else {
        promptTextbox.value = data.OpenAIPrompt;
    }
    if (typeof data.ClaudePrompt == 'undefined') {
        ClaudePromptTextbox.value = 'Enter prompt'
    }
    else {
        ClaudePromptTextbox.value = data.ClaudePrompt;
    }
    if (typeof data.ollamaPrompt == 'undefined') {
        OllamaPromptTextbox.value = 'Enter prompt'
    }
    else {
        OllamaPromptTextbox.value = data.ollamaPrompt;
    }
    if (typeof data.GeminiPrompt == 'undefined') {
        GeminiPromptTextbox.value = 'Enter prompt'
    }
    else {
        GeminiPromptTextbox.value = data.GeminiPrompt;
    }
    if (typeof data.reviewPrompt == 'undefined') {
        reviewTextbox.value = 'Enter prompt'
    }
    else {
        reviewTextbox.value = data.reviewPrompt;
    }
    if (typeof data.spellCheckIgnore == 'undefined') {
        spellcheckTextbox.value = 'WordPress'
    }
    else {
        spellcheckTextbox.value = sortTextarea(data.spellCheckIgnore);
    }
    if (data.showHistory != "null") {
        if (data.showHistory == true) {
            showHistCheckbox.checked = true;
        }
        else {
            showHistCheckbox.checked = false;
        }
    }
    if (data.noPeriod != "null") {
        if (data.noPeriod == true) {
            showNoPeriodCheckbox.checked = true;
        }
        else {
            showNoPeriodCheckbox.checked = false;
        }
    }
    if (data.showTransDiff != "null") {
        if (data.showTransDiff == true) {
            showDiffCheckbox.checked = true;
        }
        else {
            showDiffCheckbox.checked = false;
        }
    }
    if (data.glotDictGlos != "null") {
        if (data.glotDictGlos == true) {
            showGlotCheckbox.checked = true;
            // document.getElementById("comp-translations").checked = true;
        }
        else {
            showGlotCheckbox.checked = false;
            //document.getElementById("comp-translations").checked = false;
        }
    }
    if (data.convertToLower != "null") {
        if (data.convertToLower == true) {
            showConvertCheckbox.checked = true;
        }
        else {
            showConvertCheckbox.checked = false;
        }
    }
    if (data.interXHR != "null") {
        let parrotActive = data.interXHR;
    }
    else {
        let parrotActive = 'false';
    }
    if (data.LtKey != "null") {
        LtToolKeyTextbox.value = data.LtKey;
    }
    else {
        LtToolKeyTextbox.value = '-languagetool key->';
    }
    if (data.LtUser != "null") {
        LtToolUserTextbox.value = data.LtUser;
    }
    else {
        LtToolUserTextbox.value = '-languagetool user->';
    }
    if (data.LtLang != "null") {
        LtToolLangTextbox.value = data.LtLang;
    }
    else {
        LtToolLangTextbox.value = '-languagetool language->';
    }
    if (data.LtFree != "null") {
        if (data.LtFree == true) {
            LtToolLangCheckbox.checked = true;
        }
        else {

            LtToolLangCheckbox.checked = false;
        }
    }
    if (data.Auto_spellcheck != "null") {
        if (data.Auto_spellcheck == true) {
            showLTCheckbox.checked = true;
        }
        else {
            showLTCheckbox.checked = false;
        }
    }
    if (data.Auto_review_OpenAI != "null") {
        if (data.Auto_review_OpenAI == true) {
            showReviewCheckbox.checked = true;
        }
        else {
            showReviewCheckbox.checked = false;
        }
    }
    if (data.ForceFormal != "null") {
        if (data.ForceFormal == true) {
            showForceFormal.checked = true;
        }
        else {
            showForceFormal.checked = false;
        }
    }
    if (data.DefGlossary != "null") {
        if (data.DefGlossary == true) {
            showDefGlossary.checked = true;
        }
        else {
            showDefGlossary.checked = false;
        }
    }
    if (data.strictValidate != "null") {
        if (data.strictValidate == true) {
            showStrictValidation.checked = true;
        }
        else {
            showStrictValidation.checked = false;
        }
    }
    if (data.autoCopyClip != "null") {
        if (data.autoCopyClip == true) {
            showAutoClipboard.checked = true;
        }
        else {
            showAutoClipboard.checked = false;
        }
    }
    if (data.DisableAutoClose != "null") {
        if (data.DisableAutoClose == true) {
            showDisableClose.checked = true;
        }
        else {
           showDisableClose.checked = false;
        }
    }
   
    if (data.noPeriod != "null") {
        if (data.noPeriod == true) {
            showNoPeriodCheckbox.checked = true;
        }
        else {
           showNoPeriodCheckbox.checked = false;
        }
    }
    if (data.DebugMode != "null") {
        if (data.DebugMode == true) {
            showdDebugModeCheckbox.checked = true;
        }
        else {
           showdDebugModeCheckbox.checked = false;
        }
    }
    if (data.noUI != "null") {
        if (data.noUI == true) {
            showdNoUICheckbox.checked = true;
        }
        else {
            showdNoUICheckbox.checked = false;
        }
    }
    else {
        showdNoUICheckbox.checked = false;
    }
    if (data.noChevrons != "null") {
        if (data.noChevrons == true) {
            shownoChevronsCheckbox.checked = true;
        }
        else {
            shownoChevronsCheckbox.checked = false;
        }
    }
    else {
        shownoChevronsCheckbox.checked = false;
    }
    
    if (data.LocalOllama != "null" && typeof data.LocalOllama != "undefined") {
        if (data.LocalOllama == true) {
            showLocalOllama.checked = true;
        }
        else {
           showLocalOllama.checked = false;
        }
    }
   
});

let backbutton = document.getElementById("backbutton");
backbutton.addEventListener("click", function () {
    chrome.storage.local.get('lastPageVisited', async function (result) {
        const pathname = ""
        const url = window.location.href.replace(pathname, result.lastPageVisited);
        window.close()
    })
});

let button = document.getElementById("save");
button.addEventListener("click", function () {
    let apikey = apikeyTextbox.value;
    let apikeyDeepl = apikeydeeplTextbox.value;

    const check = document.getElementById('DeeplFree');
    if (check.checked) {
       showDeepl = true
    } else {
         showDeepl = "false";
    }
    let apikeycerebras = apikeyCerebrasTextbox.value;
    let apikeyMicrosoft = apikeymicrosoftTextbox.value;
    let apikeygroq = apikeygroqTextbox.value;
    let apikeyOpenRouter = apikeyOpenRouterTextbox.value;
    let apikeyMistral = apikeyMistralTextbox.value;
    let apikeyDeepSeek = apikeyDeepSeekTextbox.value;
    let apikeyKimi = apikeykimiTextbox.value;
    let apikeyOpenAI = apikeyOpenAITextbox.value;
    let apikeyTranslationio = apikeyTranslateioTextbox.value;
    let apikeyClaude = apikeyClaudeTextbox.value;
    let apikeyOllama = apikeyOllamaTextbox.value;
    let apikeyLingvanex = apikeyLingvanexTextbox.value;
    let apikeyGemini = apikeyGeminiTextbox.value;
    let apikeyNLP = apikeyNLPTextbox.value;
    
    if (typeof transselectBox.value == "undefined") {
         transsel = "google";
    }
    else if (transselectBox.value == "") {
        transsel = "google";
    }
    else {
        transsel = transselectBox.value;
    }

    if (typeof OpenAIToneBox.value == "undefined") {
        OpenAITone = "informal";
    }
    else if (OpenAIToneBox.value == "") {
        OpenAITone = "informal";
    }
    else {
        OpenAITone = OpenAIToneBox.value;
    }

    if (typeof OpenRouterselectBox.value == "undefined") {
        OpenRoutersel = "openrouter/free";
    }
    else if (OpenRouterselectBox.value == "") {
        OpenRoutersel = "openrouter/free";
    }
    else {
        OpenRoutersel = OpenRouterselectBox.value;
    }

    if (typeof OpenAIselectBox.value == "undefined") {
        OpenAIsel = "GPT-3.5-turbo";
    }
    else if (OpenAIselectBox.value == "") {
        OpenAIsel = "GPT-3.5-turbo";
    }
    else {
        OpenAIsel = OpenAIselectBox.value;
    }
    if (typeof cerebrasselectBox.value == "undefined") {
        cerebrassel = "gemma-4-31b";
    }
    else if (cerebrasselectBox.value == "") {
        cerebrassel = "gemma-4-31b";
    }
    else {
        cerebrassel = cerebrasselectBox.value;
    }
    // Groq model now comes from a dynamically populated dropdown (see loadGroqModels()).
    // Fall back to a current, non-deprecated model id if nothing is selected.
    if (typeof groqselectBox.value == "undefined" || groqselectBox.value == "") {
        groqsel = "openai/gpt-oss-20b";
    }
    else {
        groqsel = groqselectBox.value;
    }

    if (typeof MistralselectBox.value == "undefined") {
        Mistralsel = "mistral-small-latest";
    }
    else if (MistralselectBox.value == "") {
        MistralAIsel = "mistral-small-latest";
    }
    else {
        Mistralsel = MistralselectBox.value;
    }
     if (typeof ClaudselectBox.value == "undefined") {
        Claudsel = "claude-3-5-haiku-latest";
    }
    else if (ClaudselectBox.value == "") {
        Claudsel = "claude-3-5-haiku-latest";
    }
    else {
        Claudsel = ClaudselectBox.value;
    }
     if (typeof GeminiselectBox.value == "undefined") {
        Geminisel = "gemini-2.5-flash";
    }
    else if (GeminiselectBox.value == "") {
        Geminisel = "gemini-2.5-flash";
    }
    else {
        Geminisel = GeminiselectBox.value;
    }

    if (KimiSelect.value == "") {
        Kimisel = "kimi-k2.6";
    }
    else {
        Kimisel = KimiSelect.value;
    }
    
    let destlang = destLangTextbox.value;
    let postTranslation = verbsTextbox.value;
    let promptText = promptTextbox.value;
    let ClaudePrompt = ClaudePromptTextbox.value
    let reviewText = reviewTextbox.value;
    let preTranslation = preverbsTextbox.value;
    let spellIgnoreverbs = spellcheckTextbox.value;
    let TMwaitVal = TMwaitValue.value;
    let OpenAIVal = OpenAIwaitValue.value;
    let DeepLVal = DeepLwaitValue.value;
    let bulkWaitVal = bulkWaitValue.value;
    let OpenAItempVal = OpenAItempBox.value;
    let AI_Top_k_Val = Top_k_Box.value;
    let AI_Top_p_Val = Top_p_Box.value;
    let TMtresholdVal = document.getElementById("TMtreshold").value;
    let theScreenWidthValue = myScreenWidthValue.value
    if (document.querySelector("#show-history:checked") !== null) {
        let Hist = document.querySelector("#show-history:checked");
        showHist = Hist.checked;
        }
    else {
        showHist = "false";
    }
    if (document.querySelector("#comp-translations:checked") !== null) {   
        let showDiff = document.querySelector("#comp-translations:checked");
        showDifference = showDiff.checked;
    }
    else {
        showDifference = "false";
    }
    if (document.querySelector("#show-glotDictGlos:checked") !== null) {
        let showGlos = document.querySelector("#show-glotDictGlos:checked");
        showDictGlosLine = showGlos.checked;
    }
    else {
        showDictGlosLine = "false";
    }
    if (document.querySelector("#show-convertToLower:checked") !== null) {
        let showConvert = document.querySelector("#show-convertToLower:checked");
        showConvertToLower = showConvert.checked;
    }
    else {
        showConvertToLower = "false";
    }
    if (parrotActive = null) {
       let  inter = 'false'
    }
    else {
       let inter = parrotActive;
    }
    if (document.querySelector("#LangTool_Free:checked") !== null) {
        let LtFreeSet = document.querySelector("#LangTool_Free:checked");
        LtFreeChecked = LtFreeSet.checked;
    }
    else {
        LtFreeChecked = "false";
    }

    if (document.querySelector("#Auto-LT-spellcheck:checked") !== null) {
        let Auto_spellcheck_Set = document.querySelector("#Auto-LT-spellcheck:checked");
        LtAutoSpell = Auto_spellcheck_Set.checked;
    }
    else {
        LtAutoSpell = "false";
    }


    if (document.querySelector("#Auto-review-OpenAI:checked") !== null) {
        let Auto_review_Set = document.querySelector("#Auto-review-OpenAI:checked");
        OpenAIreview = Auto_review_Set.checked;
    }
    else {
        OpenAIreview = "false";
    }
    if (document.querySelector("#Force-formal:checked") !== null) {
        let Force_formal_Set = document.querySelector("#Force-formal:checked");
        Force_formal = Force_formal_Set.checked;
    }
    else {
        Force_formal = "false";
    }
    if (document.querySelector("#use-default-glossary:checked") !== null) {
        let Def_Glossary_Set = document.querySelector("#use-default-glossary:checked");
        Def_Glossary = Def_Glossary_Set.checked;
    }
    else {
        Def_Glossary = "false";
    }
    if (document.querySelector("#use-strict-validation:checked") !== null) {
        let strictValidate_Set = document.querySelector("#use-strict-validation:checked");
        strictValidat = strictValidate_Set.checked;
    }
    else {
        strictValidat = "false";
    }
    if (document.querySelector("#auto-copy-clipboard:checked") !== null) {
        let autoCopyClip_Set = document.querySelector("#auto-copy-clipboard:checked");
        autoCopyClipBoard = autoCopyClip_Set.checked;
    }
    else {
        autoCopyClipBoard = "false";
    }

    if (document.querySelector("#disable-auto-close:checked") !== null) {
        let autoCopyClip_Set = document.querySelector("#disable-auto-close:checked");
        showClose = autoCopyClip_Set.checked;
    }
    else {
        showClose = "false";
    }
    if (document.querySelector("#ollama-local:checked") !== null) {
        let localOllama_Set = document.querySelector("#ollama-local:checked");
        localOllama = localOllama_Set.checked;
    }
    else {
        localOllama = "false";
    }
    if (document.querySelector("#no-period:checked") !== null) {
        let showNoPeriod_Set = document.querySelector("#no-period:checked");
        showNoPeriod = showNoPeriod_Set.checked;
    }
    else { 
        showNoPeriod = "false";
    }
    if (document.querySelector("#debugmode:checked") !== null) {
        let showDebugMode_Set = document.querySelector("#debugmode:checked");
        showDebugMode = showDebugMode_Set.checked;
    }
    else { 
        showDebugMode = "false";
    }
    if (document.querySelector("#NoUI:checked") !== null) {
        let showNoUI_Set = document.querySelector("#NoUI:checked");
        showNoUI = showNoUI_Set.checked;
    }
    else { 
        showNoUI = "false";
    }
    if (document.querySelector("#noChevrons:checked") !== null) {
        let shownoChevrons_Set = document.querySelector("#noChevrons:checked");
        shownoChevrons = shownoChevrons_Set.checked;
    }
    else {
        shownoChevrons = false;
    }

    if ((parseFloat(OpenAItempVal)) >= 0 && (parseFloat(OpenAItempVal)) <= 2) {
        
        chrome.storage.local.set({
            apikey: apikey,
            apikeyCerebras: apikeycerebras,
            apikeyDeepl: apikeyDeepl,
            apikeylara_accessKeyId: apikeyLaraTextbox.value,
            lara_accessKeySecret: LaraSecretTextbox.value,
            apikeyOpenAI: apikeyOpenAI,
            apikeyKimi: apikeyKimi,
            apikeygroq: apikeygroq,
            apikeyOpenRouter: apikeyOpenRouter,
            apikeyMistral: apikeyMistral,
            apikeyMicrosoft: apikeyMicrosoft,
            apikeyDeepSeek: apikeyDeepSeek,
            apikeyTranslateio: apikeyTranslationio,
            apikeyClaude: apikeyClaude,
            apikeyOllama: apikeyOllama,
            apikeyNLP: apikeyNLP,
            apikeyLingvanex: apikeyLingvanex,
            apikeyGemini: apikeyGemini,
            GeminiSelect: Geminisel,
            KimiSelect: Kimisel,
            MistralSelect: Mistralsel,
            ClaudSelect: Claudsel,
            DeeplFree: showDeepl,
           // DownloadPath: DownloadTextbox.value,
            transsel: transsel,
            OpenAISelect: OpenAIsel,
            CerebrasSelect: cerebrassel,
            groqSelect: groqsel,
            OpenRouterSelect: OpenRoutersel,
            ollamaModel: OllamaselectBox.value.trim(),
            OpenAITone:OpenAITone,
            OpenAItemp: OpenAItempVal,
            destlang: destlang,
            postTranslationReplace: postTranslation,
            preTranslationReplace: preTranslation,
            OpenAIPrompt: promptText,
            ClaudePrompt: ClaudePrompt,
            ollamaPrompt: OllamaPromptTextbox.value,
            GeminiPrompt: GeminiPromptTextbox.value,
            reviewPrompt: reviewText,
            spellCheckIgnore: spellIgnoreverbs,
            showHistory: showHist,
            showTransDiff: showDifference,
            glotDictGlos: showDictGlosLine,
            convertToLower: showConvertToLower,
            TMwait: TMwaitVal,
            DeepLWait:DeepLVal,
            OpenAIWait: OpenAIVal,
            bulkWait: bulkWaitVal,
            LMStudioWait: LMkWaitValue.value,
            TMtreshold:TMtresholdVal,
            interXHR: inter,
            LtKey: LtToolKeyTextbox.value,
            LtUser: LtToolUserTextbox.value,
            LtLang: LtToolLangTextbox.value,
            LtFree: LtFreeChecked,
            Auto_spellcheck: LtAutoSpell,
            Auto_review_OpenAI: OpenAIreview,
            ForceFormal: Force_formal,
            DefGlossary: Def_Glossary,
            WPTFscreenWidth: theScreenWidthValue,
            strictValidate: strictValidat,
            autoCopyClip: autoCopyClipBoard,
            DisableAutoClose: showClose,
            LocalOllama: localOllama,
            noPeriod: showNoPeriod,
            AI_Top_k: AI_Top_k_Val,
            AI_Top_p: AI_Top_p_Val,
            DebugMode: showDebugMode,
            noChevrons: shownoChevrons,
            noUI: showNoUI,
            groqBatchSize: groqBatchSizeBox.value
        });

        if (glossaryFile.value !== "") {
            // 06-05-2022 PSS fix for issue #208
            const thisdate = new Date();
            let myYear = thisdate.getFullYear();
            let mymonth = thisdate.getMonth();
            let myday = thisdate.getDate();
            let thisDay = myday + "-" + (mymonth + 1) + "-" + myYear;

            myfile = glossaryFile.value.replace("C:\\fakepath\\", "");
            myfile = myfile + "   " + thisDay;
            chrome.storage.local.set({ glossaryFile: myfile });

            chrome.storage.local.set({ glossary: glossary });
            chrome.storage.local.set({ glossaryA: glossaryA });
            chrome.storage.local.set({ glossaryB: glossaryB });
            chrome.storage.local.set({ glossaryC: glossaryC });
            chrome.storage.local.set({ glossaryD: glossaryD });
            chrome.storage.local.set({ glossaryE: glossaryE });
            chrome.storage.local.set({ glossaryF: glossaryF });
            chrome.storage.local.set({ glossaryG: glossaryG });
            chrome.storage.local.set({ glossaryH: glossaryH });
            chrome.storage.local.set({ glossaryI: glossaryI });
            chrome.storage.local.set({ glossaryJ: glossaryJ });
            chrome.storage.local.set({ glossaryK: glossaryK });
            chrome.storage.local.set({ glossaryL: glossaryL });
            chrome.storage.local.set({ glossaryM: glossaryM });
            chrome.storage.local.set({ glossaryN: glossaryN });
            chrome.storage.local.set({ glossaryO: glossaryO });
            chrome.storage.local.set({ glossaryP: glossaryP });
            chrome.storage.local.set({ glossaryQ: glossaryQ });
            chrome.storage.local.set({ glossaryR: glossaryR });
            chrome.storage.local.set({ glossaryS: glossaryS });
            chrome.storage.local.set({ glossaryT: glossaryT });
            chrome.storage.local.set({ glossaryU: glossaryU });
            chrome.storage.local.set({ glossaryV: glossaryV });
            chrome.storage.local.set({ glossaryW: glossaryW });
            chrome.storage.local.set({ glossaryX: glossaryX });
            chrome.storage.local.set({ glossaryY: glossaryY });
            chrome.storage.local.set({ glossaryZ: glossaryZ });
        }

        if (glossarySecondFile.value !== "") {
            // 06-05-2022 PSS fix for issue #208
            const thisdate = new Date();
            let myYear = thisdate.getFullYear();
            let mymonth = thisdate.getMonth();
            let myday = thisdate.getDate();
            let thisDay = myday + "-" + (mymonth + 1) + "-" + myYear;

            mySecondfile = glossarySecondFile.value.replace("C:\\fakepath\\", "");
            mySecondfile = mySecondfile + "   " + thisDay;
            chrome.storage.local.set({ glossaryFileSecond: mySecondfile });
            chrome.storage.local.set({ glossary1: glossary1 });
            chrome.storage.local.set({ glossary1A: glossary1A });
            chrome.storage.local.set({ glossary1B: glossary1B });
            chrome.storage.local.set({ glossary1C: glossary1C });
            chrome.storage.local.set({ glossary1D: glossary1D });
            chrome.storage.local.set({ glossary1E: glossary1E });
            chrome.storage.local.set({ glossary1F: glossary1F });
            chrome.storage.local.set({ glossary1G: glossary1G });
            chrome.storage.local.set({ glossary1H: glossary1H });
            chrome.storage.local.set({ glossary1I: glossary1I });
            chrome.storage.local.set({ glossary1J: glossary1J });
            chrome.storage.local.set({ glossary1K: glossary1K });
            chrome.storage.local.set({ glossary1L: glossary1L });
            chrome.storage.local.set({ glossary1M: glossary1M });
            chrome.storage.local.set({ glossary1N: glossary1N });
            chrome.storage.local.set({ glossary1O: glossary1O });
            chrome.storage.local.set({ glossary1P: glossary1P });
            chrome.storage.local.set({ glossary1Q: glossary1Q });
            chrome.storage.local.set({ glossary1R: glossary1R });
            chrome.storage.local.set({ glossary1S: glossary1S });
            chrome.storage.local.set({ glossary1T: glossary1T });
            chrome.storage.local.set({ glossary1U: glossary1U });
            chrome.storage.local.set({ glossary1V: glossary1V });
            chrome.storage.local.set({ glossary1W: glossary1W });
            chrome.storage.local.set({ glossary1X: glossary1X });
            chrome.storage.local.set({ glossary1Y: glossary1Y });
            chrome.storage.local.set({ glossary1Z: glossary1Z });
        }
        
        messageBox("info", "Settings successfully saved.<br>Please make sure that you enter<br>values in Destination Language<br> and select a Glossary File<br>and enter values in <br>Post Translation Replace");
    }
    else {
        messageBox("error","The value you have entered for temperature is wrong<br>It should be between 0 and 2<br>You can add a value like 0.4");

    }
    });


let file = document.getElementById("glossary_file");

file.addEventListener("change", function () {

    if (this.files.length === 0) {
        return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    let locale = urlParams.get("lang") || "en";
    locale = locale.toUpperCase()
    const selectedFile = this.files[0];

    const reader = new FileReader();

    reader.onload = async function () {

        try {

            const text = this.result;

            const lines = text
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .split("\n");

            const records = [];

            // Eerste regel is de header:
            // en,nl,pos,description

            for (let i = 1; i < lines.length; i++) {

                const line = lines[i].trim();

                if (!line) {
                    continue;
                }

                const entry = parseGlossaryCSVLine(line);

                if (entry.length < 2) {
                    continue;
                }

                let original = entry[0]
                    .replace(/^"|"$/g, "")
                    .trim();

                let translation = entry[1]
                    .replace(/^"|"$/g, "")
                    .trim();

                if (!original || !translation) {
                    continue;
                }

                translation = translation
                    .replaceAll("&#39;", "'")
                    .trim();

                records.push({
                    type: "default",
                    locale: locale,
                    original: original,
                    translation: translation
                });
            }

      //      console.log(
       //         "Default glossary parsed:",
       //         records.length
        //    );

         //   console.log(
         //       "First records:",
         //       records.slice(0, 5)
          //  );

            try {

                const response = await new Promise(function (resolve, reject) {

                    chrome.runtime.sendMessage(
                        {
                            action: "importDefaultGlossary",
                            dbName: "WPGlossary",
                            records: records
                        },
                        function (response) {

                            if (chrome.runtime.lastError) {
                                reject(
                                    new Error(
                                        chrome.runtime.lastError.message
                                    )
                                );
                                return;
                            }

                            resolve(response);
                        }
                    );
                });

              //  console.log(
               //     "WPGlossary default import response:",
               //     response
               // );

                if (response && response.success) {
                    messageBox(
                        "info",
                       "Glossary import ready added: "+response.result.added
                     );

                } else {

                    console.error(
                        "WPGlossary default import failed:",
                        response
                    );
                }

            }
            catch (error) {

                console.error(
                    "Error importing default glossary to WPGlossary:",
                    error
                );
            }

        }
        catch (error) {

            console.error(
                "Error reading default glossary:",
                error
            );
        }
    };

    reader.readAsText(selectedFile);
});

let second_file = document.getElementById("glossary_file_second");

second_file.addEventListener("change", function () {

    if (this.files.length === 0) {
        return;
    }

    const selectedFile = this.files[0];

    const reader = new FileReader();
    const urlParams = new URLSearchParams(window.location.search);
    let locale = urlParams.get("lang") || "en";
    locale = locale.toUpperCase()
    reader.onload = async function () {

        try {

            const text = this.result;

            const lines = text
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .split("\n");

            const records = [];

            // Eerste regel is de header:
            // en,nl,pos,description

            for (let i = 1; i < lines.length; i++) {

                const line = lines[i].trim();

                if (!line) {
                    continue;
                }

                const entry = parseGlossaryCSVLine(line);

                if (entry.length < 2) {
                    continue;
                }

                let original = entry[0]
                    .replace(/^"|"$/g, "")
                    .trim();

                let translation = entry[1]
                    .replace(/^"|"$/g, "")
                    .trim();

                if (!original || !translation) {
                    continue;
                }

                translation = translation
                    .replaceAll("&#39;", "'")
                    .trim();

                records.push({
                    type: "formal",
                    locale: locale,
                    original: original,
                    translation: translation
                });
            }

          //  console.log(
          //      "Formal glossary parsed:",
           //     records.length
          //  );

           // console.log(
           //     "First Formal records:",
           //     records.slice(0, 5)
           // );

            try {

                const response = await new Promise(function (resolve, reject) {

                    chrome.runtime.sendMessage(
                        {
                            action: "importDefaultGlossary",
                            dbName: "WPGlossary",
                            records: records
                        },
                        function (response) {

                            if (chrome.runtime.lastError) {
                                reject(
                                    new Error(
                                        chrome.runtime.lastError.message
                                    )
                                );
                                return;
                            }

                            resolve(response);
                        }
                    );
                });

                //console.log(
                //    "WPGlossary Formal import response:",
                //    response
               // );

                if (response && response.success) {
                    
                    messageBox(
                        "info",
                        "Number of Formal glossary records imported: " + `${response.result.added}`

                     );
                   
                } else {

                    console.error(
                        "WPGlossary Formal import failed:",
                        response
                    );
                }

            }
            catch (error) {

                console.error(
                    "Error importing Formal glossary to WPGlossary:",
                    error
                );
            }

        }
        catch (error) {

            console.error(
                "Error reading Formal glossary:",
                error
            );
        }
    };

    reader.readAsText(selectedFile);

    let updatedfilename = document.getElementById(
        "glossary_file_second"
    );

    const thisdate = new Date();

    let myYear = thisdate.getFullYear();
    let mymonth = thisdate.getMonth();
    let myday = thisdate.getDate();

    let thisDay =
        myday +
        "-" +
        (mymonth + 1) +
        "-" +
        myYear;

    let myfiledate = "   " + thisDay;

    updatedfilename.innerText =
        selectedFile.name +
        myfiledate;
   
});




function sortTextarea(text) {
    var sortedText =""
    if (typeof text != "undefined") {
        let lines = text.split('\n');
        lines.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        sortedText = lines.join('\n');
    }
    return sortedText
}

function export_verbs_csv() {
    const destlang = destLangTextbox.value;

    // Add today's date in YYYY-MM-DD format
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

    const export_file = `export_verbs_${destlang}_${dateStr}.csv`;

    // Parse input into replaceVerb array
    setPostTranslationReplace(verbsTextbox.value);

    // CSV header
    const delimiter = ",";
    const arrayHeader = ["original", "translation", "country"];
    const header = arrayHeader.join(delimiter) + "\n";
    let csv = header;

    // Build CSV content
    replaceVerb.forEach(entry => {
        const original = entry[0] || "";
        const translation = entry[1] || "";
        const country = entry[2] || "";

        // Only add 'country' column if present
        const row = country ? [original, translation, country].join(delimiter)
                            : [original, translation].join(delimiter);
        csv += row + "\n";
    });

    // Export as CSV
    const csvData = new Blob([csv], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(csvData);

    const hiddenElement = document.createElement("a");
    hiddenElement.href = csvUrl;
    hiddenElement.target = "_blank";
    hiddenElement.download = export_file;
    hiddenElement.click();

    messageBox("info", "Export verbs ready <br>Wait until explorer is shown to save the file");
}

function setPostTranslationReplace(postTranslationReplace) {

    replaceVerb = [];
    const lines = postTranslationReplace.trim().split("\n");
    lines.forEach(line => {
        if (line.trim() !== "") {
            const parts = line.split(",");
            // Keep up to 3 parts: original, translation, country (optional)
            replaceVerb.push([parts[0], parts[1] || "", parts[2] || ""]);
        }
    });
}


var obj_csv = {
    size:0,
    dataFile:[]
    };

const importInput = document.getElementById("importPost");

importInput.addEventListener("change", function (event) {

    if (importInput.files && importInput.files[0]) {

        let reader = new FileReader();
        reader.readAsText(importInput.files[0]);

        reader.onload = function (e) {

            obj_csv.size = e.total;
            obj_csv.dataFile = e.target.result;

            document.getElementById("text_verbs").value = "";
            parseData(obj_csv.dataFile);
        };

    } else {
        messageBox("error", "No file selected or file could not be read.");
    }

});
function parseData(data) {
   
    let lbreak = data.split("\n");
    let verbsText = "";

    // Skip header
    for (let i = 1; i < lbreak.length; i++) {
        const line = lbreak[i];

        // Skip truly empty lines (do NOT trim valid ones)
        if (line === "" || line === "\r") continue;

        const parts = line.split(",");

        const original = parts[0] ?? "";
        const translation = parts[1] ?? "";
        const country = parts[2] ?? "";

        const newLine = country !== "" ? `${original},${translation},${country}` : `${original},${translation}`;
        verbsText += newLine + "\n";
    }

    verbsTextbox.value = verbsText;
    messageBox("info", "Import ready");
}

function messageBox(type, message) {
    var myWindow = window.self;
    cuteAlert({
        type: type,
        title: "Message",
        message: message,
        buttonText: "OK",
        myWindow: myWindow,
        closeStyle: "alert-close",
    });
}

async function showChangelog() {
  //console.debug("We are showing it");

  try {
    const response = await fetch(chrome.runtime.getURL('/Changelog.txt'));
    const text = await response.text();

    const changelogTab = window.open("", "_blank");

    if (!changelogTab) {
      throw new Error("Popup or tab blocked by browser settings.");
    }

    changelogTab.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Changelog</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            padding: 2em;
            background-color: #f9f9f9;
            color: #333;
          }
          pre {
            white-space: pre-wrap;
            font-size: 1.0em;
            font-family: monospace;
            background-color: #fff;
            padding: 1em;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h2>📄 Changelog</h2>
        <pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </body>
      </html>
    `);

    changelogTab.document.close();

  } catch (error) {
    console.error("Failed to load changelog:", error);
  }
}

input = document.getElementById("destination_lang");
const select = document.getElementById("langselect");

// select → input
select.addEventListener("change", function () {
    input.value = this.value;
});

// input → select
input.addEventListener("input", function () {
    const value = this.value.toLowerCase();

    for (let option of select.options) {
        if (option.value === value) {
            select.value = value;
            return;
        }
    }

    // geen match → selectie leeg maken
    select.selectedIndex = -1;
});
const toBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
    }
    if (typeof value === "number") return value === 1;
    return false;
};

    // ============================================================
// BACKUP & RESTORE SETTINGS
// ============================================================

document.getElementById("backupSettings").addEventListener("click", function () {
    chrome.storage.local.get(null, function (data) {
        const keysToBackup = [
            "apikey", "apikeyCerebras", "apikeyDeepl", "apikeyKimi", "apikeyMicrosoft",
            "apikeyOpenAI", "apikeyDeepSeek", "apikeyTranslateio", "apikeyClaude",
            "apikeygroq", "apikeyMistral", "apikeyOllama", "apikeyOpenRouter",
            "apikeyLingvanex", "apikeyGemini", "apikeyNLP",
            "apikeylara_accessKeyId", "lara_accessKeySecret",
            "GeminiPrompt", "OpenAIPrompt", "ClaudePrompt", "ollamaPrompt", "reviewPrompt",
            "CerebrasSelect", "OpenAISelect", "OpenRouterSelect", "ClaudSelect",
            "KimiSelect", "GeminiSelect", "groqSelect", "MistralSelect", "ollamaModel",
            "OpenAITone", "OpenAItemp", "AI_Top_p", "AI_Top_k",
            "OpenAIWait", "DeepLWait", "LMStudioWait", "TMwait", "bulkWait",
            "groqBatchSize",
            "transsel", "destlang",
            "glossaryFile", "glossaryFileSecond",
            "postTranslationReplace", "preTranslationReplace", "spellCheckIgnore",
            "showHistory", "showTransDiff", "glotDictGlos", "convertToLower",
            "DeeplFree", "TMtreshold", "interXHR",
            "LtKey", "LtUser", "LtLang", "LtFree",
            "Auto_spellcheck", "Auto_review_OpenAI", "ForceFormal", "DefGlossary",
            "WPTFscreenWidth", "strictValidate", "autoCopyClip", "DisableAutoClose",
            "LocalOllama", "noPeriod", "DebugMode", "noUI",
            "DownloadPath", "noChevrons"
        ];

        const backup = {};
        keysToBackup.forEach(key => {
            if (typeof data[key] !== "undefined") {
                backup[key] = data[key];
            }
        });

        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const filename = `wptf_settings_backup_${dateStr}.json`;

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        messageBox("info", "Settings backup created:<br><strong>" + filename + "</strong>" +"<br>The glossary files are not within the backup!<br>You need to load them again after restoring!");
    });
});

document.getElementById("restoreSettings").addEventListener("click", function () {
    document.getElementById("restoreFile").click();
});

document.getElementById("restoreFile").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) {
        messageBox("error", "No file selected.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const restored = JSON.parse(e.target.result);

            // Basic validation: check it looks like a WPTF backup
            if (typeof restored !== "object" || Array.isArray(restored)) {
                throw new Error("Invalid backup file format.");
            }

            chrome.storage.local.set(restored, function () {
                if (chrome.runtime.lastError) {
                    messageBox("error", "Restore failed:<br>" + chrome.runtime.lastError.message);
                    return;
                }

                // Reload the page to reflect restored values in all form fields
                messageBox("info", "Settings restored successfully!<br>The page will reload to apply the restored settings.");
                setTimeout(() => location.reload(), 2000);
            });

        } catch (err) {
            messageBox("error", "Failed to read backup file:<br>" + err.message);
        }
    };
    reader.readAsText(file);

    // Reset so same file can be re-selected if needed
    event.target.value = "";
});
// ── Load-prompt-from-file buttons ─────────────────────────────
const api = globalThis.browser ?? globalThis.chrome;

// prompts/<name>/<name>.txt  (name comes from the button's data-prompt)
function promptURL(name) {
    return api.runtime.getURL(`prompts/${name}/${name}.txt`);
}

async function loadPrompt(name) {
    const res = await fetch(promptURL(name));
    if (!res.ok) throw new Error(`Couldn't find prompts/${name}/${name}.txt`);
    return res.text();
}

// the field this button feeds = the id in the preceding <label for="...">
function targetFieldFor(btn) {
    let el = btn.previousElementSibling;
    while (el && el.tagName !== "LABEL") el = el.previousElementSibling;
    const id = el?.getAttribute("for");
    return id ? document.getElementById(id) : null;
}

function initPromptButtons() {
    document.querySelectorAll("button.load-prompt").forEach(btn => {
        btn.addEventListener("click", async () => {
            const name = btn.dataset.prompt;
            const field = targetFieldFor(btn);
            if (!name || !field) {
                console.warn("load-prompt: missing data-prompt or target field", btn);
                return;
            }

            const text = await getBundledPrompt(name);
            if (text == null) {
                cuteAlert({
                    type: "info",
                    title: "No prompt available",
                    message: `There's no bundled prompt for "${name}" yet.`,
                    myWindow: window.self,
                });
                return;
            }

            cuteAlert({
                type: "question",
                title: "Load prompt",
                message: `Load the "${name}" prompt from file?`,
                confirmText: "Load",
                cancelText: "Cancel",
                myWindow: window.self,
            }).then((e) => {
                if (e !== "confirm") return;
                field.value = text;   // already fetched — no second request
            });
        });
  });
}
// ── Backup-prompt-to-file buttons ─────────────────────────────
// reuses `api` and targetFieldFor() from the load code

function dateStamp() {
    return new Date().toISOString().slice(0, 10);   // 2026-08-05
}

// 2026-08-05_14-30-05
function dateStamp() {
    return new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
}

async function backupPrompt(name, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    try {
        await api.downloads.download({
            url,
            filename: `prompts/${name}/${name}_${dateStamp()}.txt`,
            saveAs: true,          // <- the only change; true = always prompt, false = always silent
        });
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

function initBackupPromptButtons() {
    document.querySelectorAll("button.backup-prompt").forEach(btn => {
        btn.addEventListener("click", async () => {
            const name = btn.dataset.prompt;
            const field = targetFieldFor(btn);
            if (!name || !field) return console.warn("backup-prompt: missing data/field", btn);

            try {
                await backupPrompt(name, field.value);
            } catch (err) {
                console.error(err);
                cuteAlert({
                    type: "error", title: "Backup failed",
                    message: err.message, myWindow: window.self
                });
            }
        });
  });
}

// returns the prompt text, or null if the folder has no usable .txt
async function getBundledPrompt(name) {
    try {
        const res = await fetch(promptURL(name));
        if (!res.ok) return null;
        const text = await res.text();
        return text.trim().length ? text : null;   // missing OR empty → null
    } catch {
        return null;                               // FILE_NOT_FOUND rejects
    }
}
// let the user pick a .txt, return its text (or null if cancelled)
function pickPromptText() {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,text/plain";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            resolve(file ? await file.text() : null);
        }, { once: true });
        input.click();
    });
}
function initImportPromptButtons() {
    document.querySelectorAll("button.import-prompt").forEach(btn => {
        btn.addEventListener("click", async () => {
            const field = targetFieldFor(btn);
            if (!field) return console.warn("import-prompt: no target field", btn);

            const text = await pickPromptText();
            if (text == null) return;          // user cancelled
            field.value = text;
        });
    });
}

document.addEventListener("DOMContentLoaded", initImportPromptButtons);

document.addEventListener("DOMContentLoaded", initBackupPromptButtons);
document.addEventListener("DOMContentLoaded", initPromptButtons);

//chrome.runtime.sendMessage(
//    {
//        action: "getWPGlossaryTest"
//    },
//    function (response) {
//        console.log("WPGlossary test response:", response);
//    }
//);

async function importDefaultGlossaryToDB(records) {

    return new Promise(function (resolve, reject) {

        chrome.runtime.sendMessage(
            {
                action: "importDefaultGlossary",
                dbName: "WPGlossary",
                records: records
            },
            function (response) {

                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                if (!response || !response.success) {
                    reject(new Error(
                        response && response.error
                            ? response.error
                            : "Unknown error importing default glossary"
                    ));
                    return;
                }

                resolve(response);
            }
        );
    });
}
const testRecords = [
    {
        locale: "NL",
        original: "appearance",
        translation: "weergave"
    }
];


async function importDefaultGlossaryViaBackground(records) {

    return new Promise((resolve, reject) => {

        chrome.runtime.sendMessage(
            {
                action: "importDefaultGlossary",
                records: records
            },
            function (response) {

                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                if (!response || !response.success) {
                    reject(
                        new Error(
                            response && response.error
                                ? response.error
                                : "Unknown error importing default glossary"
                        )
                    );
                    return;
                }

                resolve(response);
            }
        );
    });
}

function parseGlossaryCSVLine(line) {

    const result = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {

        const char = line[i];

        if (char === '"') {

            if (insideQuotes && line[i + 1] === '"') {

                value += '"';
                i++;

            }
            else {

                insideQuotes = !insideQuotes;

            }
        }
        else if (char === "," && !insideQuotes) {

            result.push(value);
            value = "";

        }
        else {

            value += char;

        }
    }

    result.push(value);

    return result;
}

async function processDefaultGlossaryImport(file) {

    try {

        const text = await file.text();

        const lines = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n");

        const records = [];

        // Regel 0 is de header:
        // en,nl,pos,description
        for (let i = 1; i < lines.length; i++) {

            const line = lines[i].trim();

            if (!line) {
                continue;
            }

            const entry = parseGlossaryCSVLine(line);

            if (entry.length < 3) {
                continue;
            }

            const original = entry[0]
                .replace(/^"|"$/g, "")
                .trim();

            const translation = entry[1]
                .replace(/^"|"$/g, "")
                .trim();

            if (!original || !translation) {
                continue;
            }

            records.push({
                type: "default",
                locale: "NL",
                original: original,
                translation: translation
            });
        }

        console.log(
            "Default glossary records parsed:",
            records.length
        );

        if (records.length === 0) {
            throw new Error("No glossary records found in CSV");
        }

        const result =
            await importDefaultGlossaryViaBackground(records);

        console.log(
            "Default glossary import result:",
            result
        );

        return result;

    }
    catch (error) {

        console.error(
            "Error processing default glossary:",
            error
        );

        throw error;
    }
}