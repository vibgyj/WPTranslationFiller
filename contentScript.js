console.log('Content script...');

let glossary = {};
chrome.storage.sync.get(['glossary', 'glossaryA', 'glossaryB', 'glossaryC'
    , 'glossaryD', 'glossaryE', 'glossaryF', 'glossaryG', 'glossaryH', 'glossaryI'
    , 'glossaryJ', 'glossaryK', 'glossaryL', 'glossaryM', 'glossaryN', 'glossaryO'
    , 'glossaryP', 'glossaryQ', 'glossaryR', 'glossaryS', 'glossaryT', 'glossaryU'
    , 'glossaryV', 'glossaryW', 'glossaryX', 'glossaryY', 'glossaryZ'], function (data) {
        // console.log(data.glossary, data.glossaryA);
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

        console.log(glossary);
        validate();
    });

function loadSet(glossary, set) {
    for (let key in set) {
        glossary[key] = set[key];
    }
}

// let glossary = {
//     publish: ['வெளியிடு', 'பதிப்பி'],
//     activate: ['இயக்கு', 'செயல்படுத்து', 'செயற்படுத்து'],
//     post: ['பதிவு']
// }

function validate() {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        let translation = e.querySelector("textarea.foreign-text").innerText;
        // console.log(original, translation);

        let originalWords = original.split(' ');
        let translationWords = translation.split(' ');
        // console.log(originalWords, translationWords);

        let wordCount = 0;
        let foundCount = 0;
        let toolTip = '';
        for (let oWord of originalWords) {
            for (let key in glossary) {
                if (oWord.toLowerCase().includes(key)) {
                    // console.log('Word found:', key, glossary[key]);
                    wordCount++;

                    for (let gWord of glossary[key]) {
                        let isFound = false;
                        gWord = gWord.substring(0, gWord.length - 1);
                        for (let tWord of translationWords) {
                            // console.log(gWord, tWord);

                            if (tWord.includes(gWord)) {
                                console.log('Translation found:', gWord, tWord);
                                isFound = true;
                                break;
                            }
                        }

                        if (isFound) {
                            foundCount++;
                            console.log('- Translation found:', key, glossary[key]);
                        } else {
                            toolTip += `${key} - ${glossary[key]}\n`;
                            console.log('x Translation not found:', key, glossary[key]);
                        }
                    }

                    break;
                }
            }
        }

        let percent = foundCount * 100 / wordCount;

        let rowId = e.parentElement.parentElement.parentElement.parentElement.getAttribute('row');
        // console.log(rowId, wordCount, foundCount, percent);

        if (wordCount == 0) continue;
        let priorityElem = document.querySelector('#preview-' + rowId + ' .priority');
        if (percent == 100) {
            priorityElem.style.backgroundColor = 'green';
            continue;
        }
        else if (percent > 66)
            priorityElem.style.backgroundColor = 'yellow';
        else if (percent > 33)
            priorityElem.style.backgroundColor = 'orange';
        else
            priorityElem.style.backgroundColor = 'red';

        priorityElem.setAttribute('title', toolTip);
    }
}