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

const rangeInput = document.getElementById(('screenWidth'));
const rangeValue = document.getElementById(('rangeValue'));

rangeInput.addEventListener('input', function () {
    rangeValue.textContent = this.value;
})

document.getElementById("exportverbs").addEventListener("click", export_verbs_csv);
// This array is used to replace wrong words in translation and is necessary for the export
let replaceVerb = [];

let apikeyTextbox = document.getElementById("google_api_key");
let apikeydeeplTextbox = document.getElementById("deepl_api_key");
let apikeydeeplCheckbox = document.getElementById("DeeplFree");
let apikeymicrosoftTextbox = document.getElementById("microsoft_api_key");
let apikeyOpenAITextbox = document.getElementById("OpenAI_api_key");
let apikeyDeepSeekTextbox = document.getElementById("deepseek_api_key");
let apikeyTranslateioTextbox = document.getElementById("Translateio_api_key");
let apikeyClaudeTextbox = document.getElementById("Claude_api_key");
let apikeyOllamaTextbox = document.getElementById("Ollama_api_key");
let apikeyLingvanexTextbox = document.getElementById("Lingvanex_api_key");
let apikeyGeminiTextbox = document.getElementById("gemini_api_key");
let transselectBox = document.getElementById("transselect");
let OpenAIselectBox = document.getElementById("OpenAIselect");
let ClaudselectBox = document.getElementById("ClaudSelect");
let OllamaselectBox = document.getElementById("Ollama_model");
let GeminiselectBox = document.getElementById("GeminiSelect");
let OpenAItempBox = document.getElementById("OpenAI_temp");
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
let LtToolLangCheckbox = document.getElementById("LangToolFree");
//let DownloadTextbox = document.getElementById("Download_path");
let TMwaitValue = document.getElementById("tmWait");
let OpenAIwaitValue = document.getElementById("OpenAIWait");
let DeepLwaitValue = document.getElementById("DeepLWait");
let bulkWaitValue = document.getElementById("bulkWait");
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

document.getElementById('show-changelog-link').addEventListener('click', function (e) {
    e.preventDefault(); // Prevent the default link behavior
  //console.debug("we show it")
  showChangelog();    // Call your function
});
chrome.storage.local.get(["apikey", "apikeyDeepl", "apikeyMicrosoft", "apikeyOpenAI", "apikeyDeepSeek", "apikeyTranslateio", "apikeyClaude", "apikeyOllama", "apikeyLingvanex", "apikeyGemini", "GeminiPrompt", "OpenAIPrompt", "ClaudePrompt", "OpenAISelect", "ClaudSelect", "GeminiSelect", "OpenAITone", "OpenAItemp", "AI_Top_p", "AI_Top_k", "OpenAIWait", "DeepLWait", "reviewPrompt", "transsel", "destlang", "glossaryFile","glossaryFileSecond", "postTranslationReplace", "preTranslationReplace", "spellCheckIgnore", "showHistory", "showTransDiff", "glotDictGlos", "convertToLower", "DeeplFree", "TMwait", "bulkWait", "interXHR", "LtKey", "LtUser", "LtLang", "LtFree", "Auto_spellcheck", "Auto_review_OpenAI", "ForceFormal", "DefGlossary","WPTFscreenWidth","strictValidate", "autoCopyClip", "TMtreshold", "DownloadPath", "DisableAutoClose", "LocalOllama", "ollamaModel", "ollamaPrompt", "noPeriod"], function (data) {
    
  //  if (data.DownloadPath != null) {
  //      DownloadTextbox.value = data.DownloadPath
  //  }
  //  else {
  //      DownloadTextbox.value = "C:\Temp"
    //  }
  //console.debug("DeeplFree:",DeeplFree)
    if (data.DeeplFree != null) {
        if (data.DeeplFree == true) {
            apikeydeeplCheckbox.checked = true
        }
        else {
            apikeydeeplCheckbox.checked = false
        }
    }
    if (typeof data.TMwait == "undefined") {
        TMwait = 500;
    }
    else {
        TMwait = data.TMwait;
        TMwaitValue.value = TMwait;

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
    apikeydeeplTextbox.value = data.apikeyDeepl;
    apikeymicrosoftTextbox.value = data.apikeyMicrosoft;
    apikeyOpenAITextbox.value = data.apikeyOpenAI;
    apikeyDeepSeekTextbox.value = data.apikeyDeepSeek;
    apikeyTranslateioTextbox.value = data.apikeyTranslateio
    apikeyClaudeTextbox.value = data.apikeyClaude;
    apikeyLingvanexTextbox.value = data.apikeyLingvanex;
    apikeyGeminiTextbox.value = data.apikeyGemini;

    if (data.apikeyOllama == null && typeof data.apikeyOllama == "undefined") {
        apikeyOllamaTextbox.value = "Enter key or leave empty";
    }
    else {
        apikeyOllamaTextbox.value = data.apikeyOllama;

    }
    if (data.transsel == "") {
        transselectBox.value = "google";
    }
    else {
        transselectBox.value = data.transsel;
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
    //if (document.querySelector("#DeeplFree:checked") !== null) {
   //     console.debug("in save :", document.querySelector("#DeeplFree:checked"))
    //    let showDeeplFree = document.querySelector("#DeeplFree:checked");
    //    showDeepl = showDeeplFree.checked;
   // }
   // else {
   //     showDeepl = "false";
    //}
    let apikeyMicrosoft = apikeymicrosoftTextbox.value;
    let apikeyOpenAI = apikeyOpenAITextbox.value;
    let apikeyDeepSeek = apikeyDeepSeekTextbox.value;
    let apikeyTranslationio = apikeyTranslateioTextbox.value;
    let apikeyClaude = apikeyClaudeTextbox.value;
    let apikeyOllama = apikeyOllamaTextbox.value;
    let apikeyLingvanex = apikeyLingvanexTextbox.value;
    let apikeyGemini = apikeyGeminiTextbox.value;
    
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

    if (typeof OpenAIselectBox.value == "undefined") {
        OpenAIsel = "GPT-3.5-turbo";
    }
    else if (OpenAIselectBox.value == "") {
        OpenAIsel = "GPT-3.5-turbo";
    }
    else {
        OpenAIsel = OpenAIselectBox.value;
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
    if (document.querySelector("#LangToolFree:checked") !== null) {
        let LtFreeSet = document.querySelector("#LangToolFree:checked");
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
    console.debug("AI top p val:", AI_Top_p_Val)
    console.debug("AI top k val:", AI_Top_k_Val)
    if ((parseFloat(OpenAItempVal)) >= 0 && (parseFloat(OpenAItempVal)) <= 2) {
        chrome.storage.local.set({
            apikey: apikey,
            apikeyDeepl: apikeyDeepl,
            apikeyOpenAI: apikeyOpenAI,
            apikeyMicrosoft: apikeyMicrosoft,
            apikeyDeepSeek: apikeyDeepSeek,
            apikeyTranslateio: apikeyTranslationio,
            apikeyClaude: apikeyClaude,
            apikeyOllama: apikeyOllama,
            apikeyLingvanex: apikeyLingvanex,
            apikeyGemini: apikeyGemini,
            GeminiSelect: Geminisel,
            ClaudSelect: Claudsel,
            DeeplFree: showDeepl,
           // DownloadPath: DownloadTextbox.value,
            transsel: transsel,
            OpenAISelect: OpenAIsel,
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
            AI_Top_p: AI_Top_p_Val
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
let glossary = [];
let glossaryA = [];
let glossaryB = [];
let glossaryC = [];
let glossaryD = [];
let glossaryE = [];
let glossaryF = [];
let glossaryG = [];
let glossaryH = [];
let glossaryI = [];
let glossaryJ = [];
let glossaryK = [];
let glossaryL = [];
let glossaryM = [];
let glossaryN = [];
let glossaryO = [];
let glossaryP = [];
let glossaryQ = [];
let glossaryR = [];
let glossaryS = [];
let glossaryT = [];
let glossaryU = [];
let glossaryV = [];
let glossaryW = [];
let glossaryX = [];
let glossaryY = [];
let glossaryZ = [];

let second_file = document.getElementById("glossary_file_second");
let glossary1 = [];
let glossary1A = [];
let glossary1B = [];
let glossary1C = [];
let glossary1D = [];
let glossary1E = [];
let glossary1F = [];
let glossary1G = [];
let glossary1H = [];
let glossary1I = [];
let glossary1J = [];
let glossary1K = [];
let glossary1L = [];
let glossary1M = [];
let glossary1N = [];
let glossary1O = [];
let glossary1P = [];
let glossary1Q = [];
let glossary1R = [];
let glossary1S = [];
let glossary1T = [];
let glossary1U = [];
let glossary1V = [];
let glossary1W = [];
let glossary1X = [];
let glossary1Y = [];
let glossary1Z = [];

file.addEventListener("change", function () {
    var entry = "";
    var value = "";
    var file = this.files[0];

    if (this.files.length == 0) {
        return
    }
    //locale = "nl";
    
    var reader = new FileReader();
    reader.onload = function () {
        var lines = this.result.split("\n");
        // don"t read first(header) and last(empty) lines
        for (var line = 1; line < lines.length - 1; line++) {
            entry = lines[line].split(",");
            if (entry[1] && entry[1].length > 0) {
                let key = entry[0].replaceAll("\"", "").trim().toLowerCase();
                const found = entry[1].indexOf("-/");
                if (found == -1) {
                    value = entry[1].split("/");
                    for (let val in value) {
                        if (value != "") {
                            value[val] = value[val].replaceAll("\"", "").trim();
                            value[val] = value[val].replaceAll("&#39;", "'").trim();
                        }
                    }
                }
                else {
                    value = entry[1];
                }
                for (let val in value) {
                        if (value != "") {
                            value[val] = value[val].replaceAll("\"", "").trim();
                            value[val] = value[val].replaceAll("&#39;", "'").trim();
                        }
                    }
                
                startChar = key.substring(0, 1);
                switch (startChar) {
                    case "a":
                        pushToGlossary(glossaryA, key, value);
                        break;
                    case "b":
                        pushToGlossary(glossaryB, key, value);
                        break;
                    case "c":
                        pushToGlossary(glossaryC, key, value);
                        break;
                    case "d":
                        pushToGlossary(glossaryD, key, value);
                        break;
                    case "e":
                        pushToGlossary(glossaryE, key, value);
                        break;
                    case "f":
                        pushToGlossary(glossaryF, key, value);
                        break;
                    case "g":
                        pushToGlossary(glossaryG, key, value);
                        break;
                    case "h":
                        pushToGlossary(glossaryH, key, value);
                        break;
                    case "i":
                        pushToGlossary(glossaryI, key, value);
                        break;
                    case "j":
                        pushToGlossary(glossaryJ, key, value);
                        break;
                    case "k":
                        pushToGlossary(glossaryK, key, value);
                        break;
                    case "l":
                        pushToGlossary(glossaryL, key, value);
                        break;
                    case "m":
                        pushToGlossary(glossaryM, key, value);
                        break;
                    case "n":
                        pushToGlossary(glossaryN, key, value);
                        break;
                    case "o":
                        pushToGlossary(glossaryO, key, value);
                        break;
                    case "p":
                        pushToGlossary(glossaryP, key, value);
                        break;
                    case "q":
                        pushToGlossary(glossaryQ, key, value);
                        break;
                    case "r":
                        pushToGlossary(glossaryR, key, value);
                        break;
                    case "s":
                        pushToGlossary(glossaryS, key, value);
                        break;
                    case "t":
                        pushToGlossary(glossaryT, key, value);
                        break;
                    case "u":
                        pushToGlossary(glossaryU, key, value);
                        break;
                    case "v":
                        pushToGlossary(glossaryV, key, value);
                        break;
                    case "w":
                        pushToGlossary(glossaryW, key, value);
                        break;
                    case "x":
                        pushToGlossary(glossaryX, key, value);
                        break;
                    case "y":
                        pushToGlossary(glossaryY, key, value);
                        break;
                    case "z":
                        pushToGlossary(glossaryZ, key, value);
                        break;
                    default:
                        pushToGlossary(glossary, key, value);
                        break;
                }
            }
        }
    };
    reader.readAsText(file);
    let updatedfilename = document.getElementById("glossary_file");
    const thisdate = new Date();
    let myYear = thisdate.getFullYear();
    let mymonth = thisdate.getMonth();
    let myday = thisdate.getDate();
    let thisDay = myday + "-" + (mymonth + 1) + "-" + myYear;
    let myfiledate = "   " + thisDay;
    updatedfilename.innerText = file.name + myfiledate;
    messageBox("info", "Glossary import ready, make sure you save the options and restart the addon afterwards!")
});

second_file.addEventListener("change", function () {
    var entry = "";
    var value = "";
    var second_file = this.files[0];

    if (this.files.length == 0) {
        return
    }
    //locale = "nl";

    var reader = new FileReader();
    reader.onload = function () {
        var lines = this.result.split("\n");
        // don"t read first(header) and last(empty) lines
        for (var line = 1; line < lines.length - 1; line++) {
            entry = lines[line].split(",");
            if (entry[1] && entry[1].length > 0) {
                let key = entry[0].replaceAll("\"", "").trim().toLowerCase();
                const found = entry[1].indexOf("-/");
                if (found == -1) {
                    value = entry[1].split("/");
                    for (let val in value) {
                        if (value != "") {
                            value[val] = value[val].replaceAll("\"", "").trim();
                            value[val] = value[val].replaceAll("&#39;", "'").trim();
                        }
                    }
                }
                else {
                    value = entry[1];
                }
                for (let val in value) {
                    if (value != "") {
                        value[val] = value[val].replaceAll("\"", "").trim();
                        value[val] = value[val].replaceAll("&#39;", "'").trim();
                    }
                }

                startChar = key.substring(0, 1);
                switch (startChar) {
                    case "a":
                        pushToGlossary(glossary1A, key, value);
                        break;
                    case "b":
                        pushToGlossary(glossary1B, key, value);
                        break;
                    case "c":
                        pushToGlossary(glossary1C, key, value);
                        break;
                    case "d":
                        pushToGlossary(glossary1D, key, value);
                        break;
                    case "e":
                        pushToGlossary(glossary1E, key, value);
                        break;
                    case "f":
                        pushToGlossary(glossary1F, key, value);
                        break;
                    case "g":
                        pushToGlossary(glossary1G, key, value);
                        break;
                    case "h":
                        pushToGlossary(glossary1H, key, value);
                        break;
                    case "i":
                        pushToGlossary(glossary1I, key, value);
                        break;
                    case "j":
                        pushToGlossary(glossary1J, key, value);
                        break;
                    case "k":
                        pushToGlossary(glossary1K, key, value);
                        break;
                    case "l":
                        pushToGlossary(glossary1L, key, value);
                        break;
                    case "m":
                        pushToGlossary(glossary1M, key, value);
                        break;
                    case "n":
                        pushToGlossary(glossary1N, key, value);
                        break;
                    case "o":
                        pushToGlossary(glossary1O, key, value);
                        break;
                    case "p":
                        pushToGlossary(glossary1P, key, value);
                        break;
                    case "q":
                        pushToGlossary(glossary1Q, key, value);
                        break;
                    case "r":
                        pushToGlossary(glossary1R, key, value);
                        break;
                    case "s":
                        pushToGlossary(glossary1S, key, value);
                        break;
                    case "t":
                        pushToGlossary(glossary1T, key, value);
                        break;
                    case "u":
                        pushToGlossary(glossary1U, key, value);
                        break;
                    case "v":
                        pushToGlossary(glossary1V, key, value);
                        break;
                    case "w":
                        pushToGlossary(glossary1W, key, value);
                        break;
                    case "x":
                        pushToGlossary(glossary1X, key, value);
                        break;
                    case "y":
                        pushToGlossary(glossary1Y, key, value);
                        break;
                    case "z":
                        pushToGlossary(glossary1Z, key, value);
                        break;
                    default:
                        pushToGlossary(glossary1, key, value);
                        break;
                }
            }
        }
    };
    reader.readAsText(second_file);
    let updatedfilename = document.getElementById("glossary_file_second");
    const thisdate = new Date();
    let myYear = thisdate.getFullYear();
    let mymonth = thisdate.getMonth();
    let myday = thisdate.getDate();
    let thisDay = myday + "-" + (mymonth + 1) + "-" + myYear;
    let myfiledate = "   " + thisDay;
    updatedfilename.innerText = second_file.name + myfiledate;
    messageBox("info", "Glossary import ready, make sure you save the options and restart the addon afterwards!")
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
function checkLocale() {
    // function currently not used but maybe in future
    //need to fetch the locale from the filename
    return locale;
}
function pushToGlossary(glossary, key, value) {
    for (var i in glossary) {
        if (glossary[i].key == key) {
            glossary[i].value = glossary[i].value.concat(value);
            return;
        }
    }
    glossary.push({ key: key, value: value });
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

let input = document.getElementById("importPost");
input.addEventListener("change", function () {   
if (input.files && input.files[0]) {
    let reader = new FileReader();
        // 18-05-2021 PSS altered this to read as text, otherwise it converts characters
        reader.readAsText(input.files[0]);
        reader.onload = function (e) {
        obj_csv.size = e.total;
        obj_csv.dataFile = e.target.result;
        document.getElementById("text_verbs").value = "";
        parseData(obj_csv.dataFile);
    };
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
  console.debug("We are showing it");

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


