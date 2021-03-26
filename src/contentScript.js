console.log('Content script...');

// Add translate button - start
var translateButton = document.createElement("a");
translateButton.href = "#";
translateButton.className = "translation-filler-button"
translateButton.onclick = translatePageClicked;
translateButton.innerText = "Translate";
var divPaging = document.querySelector("div.paging");
divPaging.insertBefore(translateButton, divPaging.childNodes[0]);

//23-03-2021 PSS added a new button on first page
var checkButton = document.createElement("a");
checkButton.href = "#";
checkButton.className = "check_translation-button"
checkButton.onclick = checkPageClicked;
checkButton.innerText = "CheckPage";
var divPaging = document.querySelector("div.paging");
divPaging.insertBefore(checkButton, divPaging.childNodes[0]);

function translatePageClicked(event) {
    event.preventDefault();
    console.log("Translate clicked!");
    chrome.storage.sync
        .get(
            ['apikey', 'destlang', 'postTranslationReplace', 'preTranslationReplace'],
            function (data) {
                translatePage(data.apikey, data.destlang, data.postTranslationReplace, data.preTranslationReplace);
            });
}
// Add translation button - end

function checkPageClicked(event) {
    event.preventDefault();
    console.log("Checkpage clicked!");
    chrome.storage.sync
        .get(
            ['apikey', 'destlang', 'postTranslationReplace', 'preTranslationReplace'],
            function (data) {
                checkPage(data.postTranslationReplace);
            });
}

let glossary = [];
chrome.storage.sync.get(['glossary', 'glossaryA', 'glossaryB', 'glossaryC'
    , 'glossaryD', 'glossaryE', 'glossaryF', 'glossaryG', 'glossaryH', 'glossaryI'
    , 'glossaryJ', 'glossaryK', 'glossaryL', 'glossaryM', 'glossaryN', 'glossaryO'
    , 'glossaryP', 'glossaryQ', 'glossaryR', 'glossaryS', 'glossaryT', 'glossaryU'
    , 'glossaryV', 'glossaryW', 'glossaryX', 'glossaryY', 'glossaryZ', 'destlang'],
    function (data) {
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

        glossary.sort(function (a, b) {
            // to sory by descending order
            return b.key.length - a.key.length;
        });
        //console.log(glossary);
        addTranslateButtons();
        validatePage(data.destlang);
    });

function loadSet(x, set) {
    glossary = glossary.concat(set);
}

function addTranslateButtons() {
    for (let e of document.querySelectorAll("tr.editor")) {
        let rowId = e.getAttribute('row');
        let panelHeaderActions = e.querySelector('#editor-' + rowId + ' .panel-header .panel-header-actions');
        // Add translate button
        let translateButton = document.createElement("button");
        translateButton.id = `translate-${rowId}`;
        translateButton.className = "translation-filler-button"
        translateButton.onclick = translateEntryClicked;
        translateButton.innerText = "Translate";
        panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);
    }
}

function translateEntryClicked(event) {
    event.preventDefault();
    console.log("Translate Entry clicked!", event);
    let rowId = event.target.id.split('-')[1];
    let myrowId = event.target.id.split('-')[2];
    //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
    // So that needs to be added to the base rowId to find it
    if (myrowId !== undefined) {
        newrowId = rowId.concat("-", myrowId);
        rowId = newrowId;
        console.debug('Line already translated new rowId:',rowId);
    }
    chrome.storage.sync
        .get(['apikey', 'destlang', 'postTranslationReplace', 'preTranslationReplace'], function (data) {
            translateEntry(rowId, data.apikey, data.destlang, data.postTranslationReplace, data.preTranslationReplace);
        });
    console.debug('after translateEntry');
}

function validatePage(language) {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        let textareaElem = e.querySelector("textarea.foreign-text");
        textareaElem.addEventListener('input', function (e) {
            validateEntry(language, e.target);
        });
        let translation = textareaElem.innerText;

        var result = validate(language, original, translation);
        console.log(result);

        updateStyle(textareaElem, result);
    }
}

function updateStyle(textareaElem, result) {
    let rowId = textareaElem.parentElement.parentElement.parentElement
        .parentElement.parentElement.parentElement.parentElement.getAttribute('row');
    let priorityElem = document.querySelector('#preview-' + rowId + ' .priority');
    updateElementStyle(priorityElem, result);
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    updateElementStyle(headerElem, result);
}

function validateEntry(language, textareaElem) {
    let translation = textareaElem.value;
    let original = textareaElem.parentElement.parentElement.parentElement
        .querySelector("span.original-raw").innerText;

    let result = validate(language, original, translation);
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
        
    else if (result.percent == 10)
        priorityElem.style.backgroundColor = 'purple';	
		    
    else
        priorityElem.style.backgroundColor = 'red';

    priorityElem.setAttribute('title', result.toolTip);
}

function validate(language, original, translation) {
    let originalWords = original.split(' ');

    let wordCount = 0;
    let foundCount = 0;
    let toolTip = '';
    console.debug('Translation value:', translation);
    //PSS 09-03-2021 Added check to prevent calculatiing on a empty translation
    if (translation.length >0) {
        console.debug('validate check the line started');						 
        for (let oWord of originalWords) {
            for (let gItem of glossary) {
                let gItemKey = gItem["key"];
                let gItemValue = gItem["value"];
                if (oWord.toLowerCase().startsWith(gItemKey.toLowerCase())) {
                    console.log('Word found:', gItemKey, gItemValue);
                    wordCount++;

                    let isFound = false;
                    for (let gWord of gItemValue) {
                        if (match(language, gWord.toLowerCase(), translation.toLowerCase())) {
                            console.log('+ Translation found:', gWord);
                            isFound = true;
                            break;
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
    }
    else {
        foundCount = 0;
        wordCount  = 0;
         }
    let percent = foundCount * 100 / wordCount;
    console.log("Percent calculation:", wordCount, foundCount, percent);

    return { wordCount, percent, toolTip };
}

// Language specific matching.
function match(language, gWord, tWord) {
    switch (language) {
        case 'ta':
            return taMatch(gWord, tWord);
        default:
            return tWord.includes(gWord);
    }
}

function taMatch(gWord, tWord) {
    let trimSize = gWord.charCodeAt(gWord.length - 1) == '\u0BCD'.charCodeAt(0)
        ? 2 : 1;
    let glossaryWord = gWord.substring(0, gWord.length - trimSize);
    // கோ
    glossaryWord = glossaryWord.replaceAll("\u0BC7\u0BBE", "\u0BCB");
    // கொ
    glossaryWord = glossaryWord.replaceAll("\u0BC6\u0BBE", "\u0BCA");

    console.log('taMatch:', gWord, glossaryWord, tWord);

    return tWord.includes(glossaryWord);
}