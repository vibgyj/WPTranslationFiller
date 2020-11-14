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
let glossary = {};
let glossaryA = {};
let glossaryB = {};
let glossaryC = {};
let glossaryD = {};
let glossaryE = {};
let glossaryF = {};
let glossaryG = {};
let glossaryH = {};
let glossaryI = {};
let glossaryJ = {};
let glossaryK = {};
let glossaryL = {};
let glossaryM = {};
let glossaryN = {};
let glossaryO = {};
let glossaryP = {};
let glossaryQ = {};
let glossaryR = {};
let glossaryS = {};
let glossaryT = {};
let glossaryU = {};
let glossaryV = {};
let glossaryW = {};
let glossaryX = {};
let glossaryY = {};
let glossaryZ = {};
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
                // glossary[key] = value;
                let startChar = key.substring(0, 1);
                console.log(key, startChar);
                switch (startChar) {
                    case "a":
                        glossaryA[key] = value;
                        break;
                    case "b":
                        glossaryB[key] = value;
                        break;
                    case "c":
                        glossaryC[key] = value;
                        break;
                    case "d":
                        glossaryD[key] = value;
                        break;
                    case "e":
                        glossaryE[key] = value;
                        break;
                    case "f":
                        glossaryF[key] = value;
                        break;
                    case "g":
                        glossaryG[key] = value;
                        break;
                    case "h":
                        glossaryH[key] = value;
                        break;
                    case "i":
                        glossaryI[key] = value;
                        break;
                    case "j":
                        glossaryJ[key] = value;
                        break;
                    case "k":
                        glossaryK[key] = value;
                        break;
                    case "l":
                        glossaryL[key] = value;
                        break;
                    case "m":
                        glossaryM[key] = value;
                        break;
                    case "n":
                        glossaryN[key] = value;
                        break;
                    case "o":
                        glossaryO[key] = value;
                        break;
                    case "p":
                        glossaryP[key] = value;
                        break;
                    case "q":
                        glossaryQ[key] = value;
                        break;
                    case "r":
                        glossaryR[key] = value;
                        break;
                    case "s":
                        glossaryS[key] = value;
                        break;
                    case "t":
                        glossaryT[key] = value;
                        break;
                    case "u":
                        glossaryU[key] = value;
                        break;
                    case "v":
                        glossaryV[key] = value;
                        break;
                    case "w":
                        glossaryW[key] = value;
                        break;
                    case "x":
                        glossaryX[key] = value;
                        break;
                    case "y":
                        glossaryY[key] = value;
                        break;
                    case "z":
                        glossaryZ[key] = value;
                        break;
                    default:
                        glossary[key] = value;
                        break;
                }
            }
        }
        console.log(glossary);
    };
    reader.readAsText(file);
});
