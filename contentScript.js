console.log('Content script...');

let glossary = [];
chrome.storage.sync.get(['glossary', 'glossaryA', 'glossaryB', 'glossaryC'
    , 'glossaryD', 'glossaryE', 'glossaryF', 'glossaryG', 'glossaryH', 'glossaryI'
    , 'glossaryJ', 'glossaryK', 'glossaryL', 'glossaryM', 'glossaryN', 'glossaryO'
    , 'glossaryP', 'glossaryQ', 'glossaryR', 'glossaryS', 'glossaryT', 'glossaryU'
    , 'glossaryV', 'glossaryW', 'glossaryX', 'glossaryY', 'glossaryZ'], function (data) {
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

        glossary.sort(function(a, b) {
            // to sory by descending order
            return b.key.length - a.key.length;
        });

        console.log(glossary);
        validatePage();
    });

function loadSet(x, set) {
    glossary = glossary.concat(set);
}

function validatePage() {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        let textareaElem = e.querySelector("textarea.foreign-text");
        textareaElem.addEventListener('input', function (e) {
            validateEntry(e.target);
        });
        let translation = textareaElem.innerText;

        var result = validate(original, translation);
        console.log(result);

        updateStyle(textareaElem, result);
    }
}

function updateStyle(textareaElem, result) {
    let rowId = textareaElem.parentElement.parentElement.parentElement
        .parentElement.parentElement.parentElement.parentElement.getAttribute('row');
    let priorityElem = document.querySelector('#preview-' + rowId + ' .priority');
    updateElementStyle(priorityElem, result);
    let headerElem = document.querySelector('#editor-' + rowId + ' .panel-header');
    updateElementStyle(headerElem, result);
}

function validateEntry(textareaElem) {
    let translation = textareaElem.value;
    let original = textareaElem.parentElement.parentElement.parentElement
        .querySelector("span.original-raw").innerText;

    let result = validate(original, translation);
    console.log(result);

    updateStyle(textareaElem, result);
}

function updateElementStyle(priorityElem, result) {
    if (result.wordCount == 0) return;

    if (result.percent == 100) {
        priorityElem.style.backgroundColor = 'green';
        return;
    }
    else if (result.percent > 66)
        priorityElem.style.backgroundColor = 'yellow';
    else if (result.percent > 33)
        priorityElem.style.backgroundColor = 'orange';
    else
        priorityElem.style.backgroundColor = 'red';

    priorityElem.setAttribute('title', result.toolTip);
}

function validate(original, translation) {
    let originalWords = original.split(' ');
    let translationWords = translation.split(' ');
    // console.log(originalWords, translationWords);

    let wordCount = 0;
    let foundCount = 0;
    let toolTip = '';
    for (let oWord of originalWords) {
        for (let gItem of glossary) {
            let gItemKey = gItem["key"];
            let gItemValue = gItem["value"];
            if (oWord.toLowerCase().startsWith(gItemKey)) {
                console.log('Word found:', gItemKey, gItemValue);
                wordCount++;

                let isFound = false;
                for (let gWord of gItemValue) {
                    for (let tWord of translationWords) {
                        if (taMatch(gWord, tWord)) {
                            console.log('+ Translation found:', gWord, tWord);
                            isFound = true;
                            break;
                        }
                    }
                }

                if (isFound) {
                    foundCount++;
                    console.log('- Translation found:', gItemKey, gItemValue);
                } else {
                    toolTip += `${gItemKey} - ${gItemValue}\n`;
                    console.log('x Translation not found:', gItemKey, gItemValue);
                }

                break;
            }
        }
    }

    let percent = foundCount * 100 / wordCount;
    console.log("Percent calculation:", wordCount, foundCount, percent);

    return { wordCount, percent, toolTip };
}

// Language specific matching. todo: get language code as param
// glossaryWord, translationWord
function taMatch(gWord, tWord) {
    let trimSize = gWord.charCodeAt(gWord.length - 1) == '\u0BCD'.charCodeAt(0)
        ? 2 : 1;
    let glossaryWord = gWord.substring(0, gWord.length - trimSize);
    // கோ
    glossaryWord = glossaryWord.replaceAll("\u0BC7\u0BBE", "\u0BCB");
    // கொ
    glossaryWord = glossaryWord.replaceAll("\u0BC6\u0BBE", "\u0BCA");

    console.log('taMatch:', gWord, glossaryWord, tWord);
    return tWord.startsWith(glossaryWord);
}