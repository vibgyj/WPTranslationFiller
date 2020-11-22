let apikeyTextbox = document.getElementById('google_api_key');
let destLangTextbox = document.getElementById('destination_lang');

chrome.storage.sync.get(['apikey', 'destlang'], function (data) {
    apikeyTextbox.value = data.apikey;
    destLangTextbox.value = data.destlang;
});

let button = document.getElementById('save');
button.addEventListener('click', function () {
    let apikey = apikeyTextbox.value;
    let destlang = destLangTextbox.value;

    chrome.storage.sync.set({ apikey: apikey, destlang: destlang });

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

    var reader = new FileReader();
    reader.onload = function (progressEvent) {
        var lines = this.result.split('\n');
        // don't read first(header) and last(empty) lines
        for (var line = 1; line < lines.length - 1; line++) {
            entry = lines[line].split(',');
            if (entry[1] && entry[1].length > 0) {
                let key = entry[0].replaceAll("\"", "").trim().toLowerCase();
                let value = entry[1].split('/');
                for (let val in value) {
                    value[val] = value[val].replaceAll("\"", "").trim();
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
        if (glossary[i]["key"] == key) {
            glossary[i]["value"] = glossary[i]["value"].concat(value);
            return;
        }
    }
    glossary.push({ key: key, value: value });
}
