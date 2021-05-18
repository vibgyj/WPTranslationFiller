document.getElementById("exportverbs").addEventListener("click", export_verbs_csv);
// This array is used to replace wrong words in translation and is necessary for the export
let replaceVerb = [];

let apikeyTextbox = document.getElementById('google_api_key');
let destLangTextbox = document.getElementById('destination_lang');
let uploadedFile = document.getElementById('text_glossary_file');
let glossaryFile = document.getElementById('glossary_file');
let verbsTextbox = document.getElementById('text_verbs');
let preverbsTextbox = document.getElementById('text_pre_verbs');

chrome.storage.sync.get(['apikey', 'destlang', 'glossaryFile', 'postTranslationReplace', 'preTranslationReplace'], function (data) {
    apikeyTextbox.value = data.apikey;
    destLangTextbox.value = data.destlang;
    uploadedFile.innerText = `Uploaded file: ${data.glossaryFile}`;
    verbsTextbox.value = data.postTranslationReplace;
    preverbsTextbox.value = data.preTranslationReplace;
    console.log("Saved options: ", data);
});

let button = document.getElementById('save');
button.addEventListener('click', function () {
    let apikey = apikeyTextbox.value;
    let destlang = destLangTextbox.value;
    let postTranslation = verbsTextbox.value;
    let preTranslation = preverbsTextbox.value;

    console.debug('Options: ', apikey, destlang, postTranslation, preTranslation);

    chrome.storage.sync.set({
        apikey: apikey,
        destlang: destlang,
        postTranslationReplace: postTranslation,
        preTranslationReplace: preTranslation
    });
    console.debug('Options loaded: ', apikey, destlang, postTranslation, preTranslation);

    if (glossaryFile.value !== "") {
        console.debug('Options: ', glossaryFile);
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

    alert("Setting successfully saved.");
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
                    if (value != "") {
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
        console.log(glossaryA);
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
    console.debug("Export started:");
    // 13-03-2021 PSS added locale to export filename
    var destlang = destLangTextbox.value;
    let export_file = 'export_verbs_' + destlang + '.csv';
    setPostTranslationReplace(verbsTextbox.value);
    let arrayData = [];
    for (let i = 0; i < replaceVerb.length; i++) {
        arrayData[i] = { original: replaceVerb[i][0], replacement: replaceVerb[i][1] };
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
    alert('Export verbs ready');

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
    size: 0,
    dataFile: []
};

let input = document.getElementById('importPost');
input.addEventListener('change', function () {
    if (input.files && input.files[0]) {
        let reader = new FileReader();
        reader.readAsBinaryString(input.files[0]);
        reader.onload = function (e) {
            console.log(e);
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
        if (counter > 0) {
            verbsTextbox.value += res.split(",") + '\n';
        }
        ++counter;
        //console.debug("counter:",counter);
    });
    //console.table(csvData);
    alert('Import ready');
}