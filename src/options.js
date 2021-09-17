var scriptElm = document.createElement('script');
scriptElm.src = chrome.extension.getURL('cute-alert.js');
document.body.appendChild(scriptElm);

//var meta = document.createElement('meta');
//meta.setAttribute('name', 'viewport');
//meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
//meta.setAttribute('Content-Type', 'image/svg+xml');
//document.getElementsByTagName('head')[0].appendChild(meta);
//myWindow.focus();
var link = document.createElement("link");

link.type = "text/css";
link.rel = "stylesheet";
link.href = chrome.extension.getURL('cute-alert.css');

document.getElementsByTagName('head')[0].appendChild(link);


document.getElementById("exportverbs").addEventListener("click", export_verbs_csv);
// This array is used to replace wrong words in translation and is necessary for the export
let replaceVerb = [];

let apikeyTextbox = document.getElementById('google_api_key');
let apikeydeeplTextbox = document.getElementById('deepl_api_key');
let apikeymicrosoftTextbox = document.getElementById('microsoft_api_key');
let transselectBox = document.getElementById('transselect');
let destLangTextbox = document.getElementById('destination_lang');
let uploadedFile = document.getElementById('text_glossary_file');
let glossaryFile = document.getElementById('glossary_file');
let verbsTextbox = document.getElementById('text_verbs');
let preverbsTextbox = document.getElementById('text_pre_verbs');
let showHistCheckbox = document.getElementById('show-history');
let showDiffCheckbox = document.getElementById('comp-translations');
let showGlotCheckbox = document.getElementById('show-glotDictGlos');
//console.debug("Diff:", showDiffCheckbox);
//console.debug("Hist:", showHistCheckbox);

chrome.storage.sync.get(['apikey','apikeyDeepl','apikeyMicrosoft','transsel', 'destlang', 'glossaryFile', 'postTranslationReplace','preTranslationReplace','showHistory', 'showTransDiff', 'glotDictGlos'], function (data) {
    apikeyTextbox.value = data.apikey;
    apikeydeeplTextbox.value = data.apikeyDeepl;
    apikeymicrosoftTextbox.value = data.apikeyMicrosoft;
    if (data.transsel == "") {
        transselectBox.value = "google";
    }
    else {
        transselectBox.value = data.transsel;
    }
    destLangTextbox.value = data.destlang;
    uploadedFile.innerText = `Uploaded file: ${data.glossaryFile}`;
    verbsTextbox.value = data.postTranslationReplace;
    preverbsTextbox.value = data.preTranslationReplace;
    if (data.showHistory != 'null') {
        console.debug(data.showHistory);
        if (data.showHistory == true) {
            showHistCheckbox.checked = true;
            //document.getElementById('show-history').checked = true;
        }
        else {
            showHistCheckbox.checked = false;
            //document.getElementById('show-history').checked = false;
        }
    }
    
    if (data.showTransDiff != 'null') {
        if (data.showTransDiff == true) {
            showDiffCheckbox.checked = true;
           // document.getElementById('comp-translations').checked = true;
        }
        else {
            showDiffCheckbox.checked = false;
            //document.getElementById('comp-translations').checked = false;
        }
    }
    if (data.glotDictGlos != 'null') {
        if (data.glotDictGlos == true) {
            showGlotCheckbox.checked = true;
            // document.getElementById('comp-translations').checked = true;
        }
        else {
            showGlotCheckbox.checked = false;
            //document.getElementById('comp-translations').checked = false;
        }
    }
    //console.log("Read options: ", data);
});


let button = document.getElementById('save');
button.addEventListener('click', function () {
    let apikey = apikeyTextbox.value;
    let apikeyDeepl = apikeydeeplTextbox.value;
    let apikeyMicrosoft = apikeymicrosoftTextbox.value;
    if (typeof transselectBox.value == 'undefined') {
         transsel = "google";
    }
    else if (transselectBox.value == "") {
        transsel = '"google';
    }
    else {
        transsel = transselectBox.value;
    }
    let destlang = destLangTextbox.value;
    let postTranslation = verbsTextbox.value;
    let preTranslation = preverbsTextbox.value;
    if (document.querySelector('#show-history:checked') !== null) {
        //console.debug('diff:', document.querySelector('#show-history:checked'));
        let Hist = document.querySelector('#show-history:checked');
        showHist = Hist.checked;
        }
    else {
        showHist = 'false';
    }
    if (document.querySelector('#comp-translations:checked') !== null) {   
        //console.debug('diff:', document.querySelector('#comp-translations:checked'));
        let showDiff = document.querySelector('#comp-translations:checked');
        showDifference = showDiff.checked;
    }
    else {
        showDifference = 'false';
    }
    
    if (document.querySelector('#show-glotDictGlos:checked') !== null) {
        //console.debug('diff:', document.querySelector('#comp-translations:checked'));
        let showGlos = document.querySelector('#show-glotDictGlos:checked');
        showDictGlosLine = showGlos.checked;
    }
    else {
        showDictGlosLine = 'false';
    }
    chrome.storage.sync.set({
        apikey: apikey,
        apikeyDeepl: apikeyDeepl,
        apikeyMicrosoft:apikeyMicrosoft,
        transsel: transsel,
        destlang: destlang,
        postTranslationReplace: postTranslation,
        preTranslationReplace: preTranslation,
        showHistory: showHist,
        showTransDiff: showDifference,
        glotDictGlos: showDictGlosLine
    });
    //console.debug('Options saved: ', apikey, apikeyDeepl,apikeyMicrosoft,transsel,destlang, postTranslation,preTranslation, showHist, showDifference);
 
    if (glossaryFile.value !== "") {
        //console.debug('Options: ', glossaryFile);
        chrome.storage.sync.set({ glossaryFile: glossaryFile.value.replace("C:\\fakepath\\", "") });

        chrome.storage.sync.set({ glossary: glossary });
        chrome.storage.sync.set({ glossaryA: glossaryA });
        chrome.storage.sync.set({ glossaryB: glossaryB });
        chrome.storage.sync.set({ glossaryC: glossaryC });
        chrome.storage.sync.set({ glossaryD: glossaryD });
        chrome.storage.sync.set({ glossaryE: glossaryE });
        chrome.storage.sync.set({ glossaryF: glossaryF });
        chrome.storage.sync.set({ glossaryG: glossaryG });
        chrome.storage.sync.set({ glossaryH: glossaryH });
        chrome.storage.sync.set({ glossaryI: glossaryI });
        chrome.storage.sync.set({ glossaryJ: glossaryJ });
        chrome.storage.sync.set({ glossaryK: glossaryK });
        chrome.storage.sync.set({ glossaryL: glossaryL });
        chrome.storage.sync.set({ glossaryM: glossaryM });
        chrome.storage.sync.set({ glossaryN: glossaryN });
        chrome.storage.sync.set({ glossaryO: glossaryO });
        chrome.storage.sync.set({ glossaryP: glossaryP });
        chrome.storage.sync.set({ glossaryQ: glossaryQ });
        chrome.storage.sync.set({ glossaryR: glossaryR });
        chrome.storage.sync.set({ glossaryS: glossaryS });
        chrome.storage.sync.set({ glossaryT: glossaryT });
        chrome.storage.sync.set({ glossaryU: glossaryU });
        chrome.storage.sync.set({ glossaryV: glossaryV });
        chrome.storage.sync.set({ glossaryW: glossaryW });
        chrome.storage.sync.set({ glossaryX: glossaryX });
        chrome.storage.sync.set({ glossaryY: glossaryY });
        chrome.storage.sync.set({ glossaryZ: glossaryZ });
    }
    messageBox("info", "Settings successfully saved.\nPlease make sure that you enter values\nin Destination Language and select a Glossary File\nand enter values in Post Translation Replace");
});

let file = document.getElementById('glossary_file');
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

file.addEventListener('change', function () {
    var file = this.files[0];
    var entry = "";
    var reader = new FileReader();
    reader.onload = function () {
        var lines = this.result.split('\n');
        // don't read first(header) and last(empty) lines
        for (var line = 1; line < lines.length - 1; line++) {
            entry = lines[line].split(',');
            if (entry[1] && entry[1].length > 0) {
                let key = entry[0].replaceAll("\"", "").trim().toLowerCase();
                let value = entry[1].split('/');
                for (let val in value) {
                    if (value != ""){
                       value[val] = value[val].replaceAll("\"", "").trim();
                    }
                }

                let startChar = key.substring(0, 1);
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
});

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
    let export_file = 'export_verbs_' + destlang + '.csv';
    setPostTranslationReplace(verbsTextbox.value);
    let arrayData = [];  
    for (let i = 0; i < replaceVerb.length; i++) {
          arrayData[i] = { original: replaceVerb[i][0], replacement:  replaceVerb[i][1] };
         }
   // let header ="original,replace");
    let delimiter = ',';
    let arrayHeader = ["original", "translation", "country"];
    let header = arrayHeader.join(delimiter) + '\n';
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

       let csvData = new Blob([csv], { type: 'text/csv' });  
       let csvUrl = URL.createObjectURL(csvData);

       let hiddenElement = document.createElement('a');
       hiddenElement.href = csvUrl;
       hiddenElement.target = '_blank';
       hiddenElement.download = export_file;
       hiddenElement.click();
       messageBox("info", "Export verbs ready");

   }
// PSS 08-03-2021 added this to prepare data for export to csv   
function setPostTranslationReplace(postTranslationReplace) {
     replaceVerb = [];
     let lines = postTranslationReplace.split('\n');
     lines.forEach(function (item) {
     // Handle blank lines
     if (item != "") {
       replaceVerb.push(item.split(','));
       }
    });
}

var obj_csv = {
    size:0,
    dataFile:[]
    };

let input = document.getElementById('importPost');
input.addEventListener('change', function () {   
if (input.files && input.files[0]) {
    let reader = new FileReader();
        // 18-05-2021 PSS altered this to read as text, otherwise it converts characters
        reader.readAsText(input.files[0]);
        reader.onload = function (e) {
        //console.log(e);
        obj_csv.size = e.total;
        obj_csv.dataFile = e.target.result;
       //console.log(obj_csv.dataFile)
       document.getElementById('text_verbs').value = "";
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
            verbsTextbox.value += res.split(",") + '\n';
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