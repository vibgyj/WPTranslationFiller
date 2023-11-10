var scriptElm = document.createElement("script");
scriptElm.src = chrome.runtime.getURL("wptf-cute-alert.js");
document.body.appendChild(scriptElm);

//var meta = document.createElement("meta");
//meta.setAttribute("name", "viewport");
//meta.setAttribute("content", "width=device-width, initial-scale=1.0");
//meta.setAttribute("Content-Type", "image/svg+xml");
//document.getElementsByTagName("head")[0].appendChild(meta);
//myWindow.focus();
var link = document.createElement("link");
var parrotActive = 'false';
var inter;
link.type = "text/css";
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("wptf-cute-alert.css");

document.getElementsByTagName("head")[0].appendChild(link);


document.getElementById("exportverbs").addEventListener("click", export_verbs_csv);
// This array is used to replace wrong words in translation and is necessary for the export
let replaceVerb = [];

let apikeyTextbox = document.getElementById("google_api_key");
let apikeydeeplTextbox = document.getElementById("deepl_api_key");
let apikeydeeplCheckbox = document.getElementById("DeeplFree");
let apikeymicrosoftTextbox = document.getElementById("microsoft_api_key");
let transselectBox = document.getElementById("transselect");
let destLangTextbox = document.getElementById("destination_lang");
let uploadedFile = document.getElementById("text_glossary_file");
let glossaryFile = document.getElementById("glossary_file");
let LtToolKeyTextbox = document.getElementById("languagetool_key");
let LtToolUserTextbox = document.getElementById("languagetool_user");
let LtToolLangTextbox = document.getElementById("languagetool_language");
let LtToolLangCheckbox = document.getElementById("LangToolFree");
let TMwaitValue = document.getElementById("tmWait");
let verbsTextbox = document.getElementById("text_verbs");
let preverbsTextbox = document.getElementById("text_pre_verbs");
let spellcheckTextbox = document.getElementById("text_ignore_verbs");
let showHistCheckbox = document.getElementById("show-history");
let showDiffCheckbox = document.getElementById("comp-translations");
let showGlotCheckbox = document.getElementById("show-glotDictGlos");
let showConvertCheckbox = document.getElementById("show-convertToLower");
let showLTCheckbox = document.getElementById("Auto-LT-spellcheck");

chrome.storage.local.get(["apikey","apikeyDeepl","apikeyMicrosoft","transsel", "destlang", "glossaryFile", "postTranslationReplace","preTranslationReplace","spellCheckIgnore","showHistory", "showTransDiff", "glotDictGlos", "convertToLower", "DeeplFree","TMwait","interXHR","LtKey","LtUser","LtLang","LtFree","Auto_spellcheck"], function (data) {
    apikeyTextbox.value = data.apikey;
    apikeydeeplTextbox.value = data.apikeyDeepl;
    if (data.DeeplFree != null) {
        if (data.DeeplFree == true) {
            apikeydeeplCheckbox.checked = true
        }
        else {
            apikeydeeplCheckbox.checked = false
        }
    }
    if (typeof data.TMwait == 'undefined') {
        TMwait = 500;
    }
    else {
        TMwait = data.TMwait;
        TMwaitValue.value = TMwait;

    }
    apikeydeeplCheckbox = data.DeeplFree;
    apikeymicrosoftTextbox.value = data.apikeyMicrosoft;
    if (data.transsel == "") {
        transselectBox.value = "google";
    }
    else {
        transselectBox.value = data.transsel;
    }
    destLangTextbox.value = data.destlang;
    uploadedFile.innerText = `${data.glossaryFile}`;
    verbsTextbox.value = data.postTranslationReplace;
    preverbsTextbox.value = data.preTranslationReplace;
    if (typeof data.spellCheckIgnore == 'undefined') {
        spellcheckTextbox.value = 'WordPress'
    }
    else {
        spellcheckTextbox.value = data.spellCheckIgnore;
    }
    if (data.showHistory != "null") {
        //console.debug(data.showHistory);
        if (data.showHistory == true) {
            showHistCheckbox.checked = true;
            //document.getElementById("show-history").checked = true;
        }
        else {
            showHistCheckbox.checked = false;
            //document.getElementById("show-history").checked = false;
        }
    }
    
    if (data.showTransDiff != "null") {
        if (data.showTransDiff == true) {
            showDiffCheckbox.checked = true;
            let value = true;
            chrome.storage.local.set({ toonDiff: value }).then(() => {
                //console.log("Value toonDiff is set to true");
            });
        }
        else {
            showDiffCheckbox.checked = false;
            let value = false;
            chrome.storage.local.set({ toonDiff: value }).then(() => {
                //console.log("Value toonDiff is set to false");
            });
            //document.getElementById("comp-translations").checked = false;
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
   
});

let backbutton = document.getElementById("backbutton");
backbutton.addEventListener("click", function () {
   // console.debug("back clicked!!")
    window.history.back()
});

let button = document.getElementById("save");
button.addEventListener("click", function () {
    let apikey = apikeyTextbox.value;
    let apikeyDeepl = apikeydeeplTextbox.value;
    
    if (document.querySelector("#DeeplFree:checked") !== null) {
        
        let showDeeplFree = document.querySelector("#DeeplFree:checked");
        showDeepl = showDeeplFree.checked;
    }
    else {
        showDeepl = "false";
    }
    let apikeyMicrosoft = apikeymicrosoftTextbox.value;
    if (typeof transselectBox.value == "undefined") {
         transsel = "google";
    }
    else if (transselectBox.value == "") {
        transsel = "google";
    }
    else {
        transsel = transselectBox.value;
    }
    let destlang = destLangTextbox.value;
    let postTranslation = verbsTextbox.value;
    let preTranslation = preverbsTextbox.value;
    let spellIgnoreverbs = spellcheckTextbox.value;
    let TMwaitVal = TMwaitValue.value;
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
        console.debug("free:",LtFreeSet)
        LtFreeChecked = LtFreeSet.checked;
    }
    else {
        LtFreeChecked = "false";
    }

    if (document.querySelector("#Auto-LT-spellcheck:checked") !== null) {

        let Auto_spellcheck_Set = document.querySelector("#Auto-LT-spellcheck:checked");
        console.debug("spell:", Auto_spellcheck_Set)
        LtAutoSpell = Auto_spellcheck_Set.checked;
    }
    else {
        LtAutoSpell = "false";
    }
    console.debug("spell:",LtAutoSpell)
    chrome.storage.local.set({
        apikey: apikey,
        apikeyDeepl: apikeyDeepl,
        DeeplFree : showDeepl,
        apikeyMicrosoft: apikeyMicrosoft,
        transsel: transsel,
        destlang: destlang,
        postTranslationReplace: postTranslation,
        preTranslationReplace: preTranslation,
        spellCheckIgnore: spellIgnoreverbs,
        showHistory: showHist,
        showTransDiff: showDifference,
        glotDictGlos: showDictGlosLine,
        convertToLower: showConvertToLower,
        TMwait: TMwaitVal,
        interXHR: inter,
        LtKey: LtToolKeyTextbox.value,
        LtUser: LtToolUserTextbox.value,
        LtLang: LtToolLangTextbox.value,
        LtFree: LtFreeChecked,
        Auto_spellcheck: LtAutoSpell
    });
    //console.debug("Options saved: ", apikey, apikeyDeepl,apikeyMicrosoft,transsel,destlang, postTranslation,preTranslation, showHist, showDifference);
 
    if (glossaryFile.value !== "") {
        //console.debug("Options: ", glossaryFile);
        // 06-05-2022 PSS fix for issue #208
        const thisdate = new Date();
        let myYear = thisdate.getFullYear();
        let mymonth = thisdate.getMonth();
        let myday = thisdate.getDate();
        let thisDay = myday + "-" + (mymonth +1) + "-" + myYear;
        
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
    messageBox("info", "Settings successfully saved.<br>Please make sure that you enter<br>values in Destination Language<br> and select a Glossary File<br>and enter values in <br>Post Translation Replace");
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
                //console.debug(" entry 1:", entry[1]);
                const found = entry[1].indexOf("-/");
                //console.debug(" entry 1:", entry[1],found);
                if (found == -1) {
                    value = entry[1].split("/");
                    //console.debug(" -/ not found", value);
                    for (let val in value) {
                        if (value != "") {
                            value[val] = value[val].replaceAll("\"", "").trim();
                        }
                    }
                }
                else {
                    value = entry[1];
                   // console.debug("/ found:", value);
                }
                //console.debug("wefound:", value);
                for (let val in value) {
                        if (value != "") {
                            value[val] = value[val].replaceAll("\"", "").trim();
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
        //console.log(glossaryA);
    };
    reader.readAsText(file);
    let updatedfilename = document.getElementById("text_glossary_file");
    const thisdate = new Date();
    let myYear = thisdate.getFullYear();
    let mymonth = thisdate.getMonth();
    let myday = thisdate.getDate();
    let thisDay = myday + "-" + (mymonth + 1) + "-" + myYear;
    let myfiledate = "   " + thisDay;
    updatedfilename.innerText = file.name + myfiledate;
    messageBox("info", "Glossary import ready, make sure you save the options and restart the addon afterwards!")
});

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
    //console.debug("Export started:");
    // 13-03-2021 PSS added locale to export filename
    var destlang = destLangTextbox.value;
    let export_file = "export_verbs_" + destlang + ".csv";
    setPostTranslationReplace(verbsTextbox.value);
    let arrayData = [];
    for (let i = 0; i < replaceVerb.length; i++) {
          arrayData[i] = { original: replaceVerb[i][0], replacement:  replaceVerb[i][1] };
         }
   // let header ="original,replace");
    let delimiter = ",";
    let arrayHeader = ["original", "translation", "country"];
    let header = arrayHeader.join(delimiter) + "\n";
       let csv = header;
       arrayData.forEach(obj => {
           let row = [];
           for (var key in obj) {
               if (obj.hasOwnProperty(key)) {
                   row.push(obj[key]);
               }
           }
           csv += row.join(delimiter) + "\n";
       });

       let csvData = new Blob([csv], { type: "text/csv" });
       let csvUrl = URL.createObjectURL(csvData);

       let hiddenElement = document.createElement("a");
       hiddenElement.href = csvUrl;
       hiddenElement.target = "_blank";
       hiddenElement.download = export_file;
       hiddenElement.click();
       messageBox("info", "Export verbs ready");

   }
// PSS 08-03-2021 added this to prepare data for export to csv   
function setPostTranslationReplace(postTranslationReplace) {
     replaceVerb = [];
     let lines = postTranslationReplace.split("\n");
     lines.forEach(function (item) {
     // Handle blank lines
     if (item != "") {
       replaceVerb.push(item.split(","));
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
        //console.log(e);
        obj_csv.size = e.total;
        obj_csv.dataFile = e.target.result;
       //console.log(obj_csv.dataFile)
       document.getElementById("text_verbs").value = "";
       parseData(obj_csv.dataFile);
    };
   }
});
     
function parseData(data) {
    let csvData = [];
    let lbreak = data.split("\n");
    let counter = 0;
    lbreak.forEach(res => {
        csvData.push(res.split(","));
        if (counter >0) {
            verbsTextbox.value += res.split(",") + "\n";
        }
        ++counter;
        //console.debug("counter:",counter);
    });
    //console.table(csvData);
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