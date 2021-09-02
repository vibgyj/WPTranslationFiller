/**
 * This file includes all functions for translating commonly used
 
 */


// This array is used to replace wrong words in translation
// PSS version 12-05-2021
let replaceVerb = [];
// This array is used to replace verbs before translation
// It is also used to force google to translate informal
// This is done by replacing the formal word for a informal word
let replacePreVerb = [];
// 06-05-2021 PSS These vars can probably removed after testen

function setPreTranslationReplace(preTranslationReplace) {
    replacePreVerb = [];
    if (preTranslationReplace != undefined) {
        let lines = preTranslationReplace.split('\n');
        lines.forEach(function (item) {
            // Handle blank lines
            if (item != "") {
                replacePreVerb.push(item.split(','));
            }
        });
    }
}


function setPostTranslationReplace(postTranslationReplace) {
    replaceVerb = [];
    if (postTranslationReplace != undefined) {
        let lines = postTranslationReplace.split('\n');
        lines.forEach(function (item) {
            // Handle blank lines
            if (item != "") {
                replaceVerb.push(item.split(','));
            }
        });
    }
}

const placeHolderRegex = new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&\w{2,6};|%\w*%/gi);
function preProcessOriginal(original, preverbs, translator) {
    // prereplverb contains the verbs to replace before translation
    for (let i = 0; i < preverbs.length; i++) {
        original = original.replaceAll(preverbs[i][0], preverbs[i][1]);
    }
    // 15-05-2021 PSS added check for translator
    if (translator == 'google') {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            original = original.replace(match[0], `[${index}]`);

            index++;
        }
        if (index == 0) {
            // console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    else if (translator == 'deepl') {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            original = original.replace(match[0], `<x>${index}</x>`);

            index++;
        }
        if (index == 0) {
            // console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    else if (translator == 'microsoft') {
        // const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        //console.debug("We do nothing");
        //for (const match of matches) {
        //   original = original.replace(match[0], `<x>${index}</x>`);

        //  index++;
        //}
        if (index == 0) {
            //  console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    //console.debug("After pre-processing:", original);
    return original;
}

function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, translator) {
    translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);
    //console.debug("after processPLaceholderSpaces",translatedText);
    // 09-05-2021 PSS fixed issue  #67 a problem where Google adds two blanks within the placeholder
    translatedText = translatedText.replaceAll('  ]', ']');

    // This section replaces the placeholders so they become html entities
    if (translator == "google") {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            translatedText = translatedText.replaceAll(`[${index}]`, match[0]);
            index++;
        }
    }
    else if (translator == "deepl") {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            translatedText = translatedText.replace(`<x>${index}</x>`, match[0]);
            index++;
        }
        // 21-06-2021 PSS added debug statement to find an issue with replacing placeholders
        //console.debug('Deepl after removing placeholders:', translatedText);
    }
    // replverb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
    }
    //console.debug("after replace verbs",translatedText);
    // Make translation to start with same case (upper/lower) as the original.
    if (isStartsWithUpperCase(original)) {
        if (!isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toUpperCase() + translatedText.slice(1);
            //console.debug('Applied upper case: ', translatedText);
        }
    }
    else {
        if (isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toLowerCase() + translatedText.slice(1);
            //console.debug('Applied lower case: ', translatedText);
        }
    }

    return translatedText;
}

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}


function checkComments(comment) {
    // PSS 09-03-2021 added check to see if we need to translate
    // console.debug('checkComment started comment', comment);
    let toTranslate = false;
    switch (comment) {
        case 'Plugin Name of the plugin/theme':
            toTranslate = false;
            break;
        case 'Plugin name.':
            toTranslate = false;
            break;
        case 'Plugin Name of the plugin':
            toTranslate = false;
            break;
        case 'Author of the plugin':
            toTranslate = false;
            break;
        case 'Plugin Name of the plugin Author of the plugin':
            toTranslate = false;
            break;
        case 'Plugin URI of the plugin':
            toTranslate = false;
            break;
        case 'Author URI of the plugin':
            toTranslate = false;
            break;
        case 'Theme Name of the theme':
            toTranslate = false;
            break;
        case 'Theme Name of the plugin/theme':
            toTranslate = false;
            break;
        case 'Author of the theme':
            toTranslate = false;
            break;
        case 'Theme URI of the theme':
            toTranslate = false;
            break;
        case 'Author URI of the theme':
            toTranslate = false;
            break;
        default:
            toTranslate = true;
    }
    //console.debug('before googletranslate do we need to translate:', toTranslate);
    return toTranslate;
}

// 18-03-2021 PSS added pretranslate function so we can use a API to find existing records locally
// 18-04-2021 PSS now the function retrieves the data from the local database if present
async function pretranslate(original) {
    console.debug('pretranslate with:', original);
    var translated = "";

    res = await listRec(original).then(function (v) {
        console.debug('answ:', v);
        translated = v;
    }).catch(function (err) {
        console.debug('Error retrieving pretrans', err.message);
    });
    console.log('resultaat translate:', translated);
    if (typeof translated == 'undefined') {
        translated = 'notFound';
    }
    else if (typeof translated == 'object') {
        translated = 'notFound';
    }
    else if (translated == '') {
        translated = 'notFound';
    }
    else {
        console.debug('pretranslate line found:', translated);
        //translated = res;   
    }
    return translated;
}

function checkPage(postTranslationReplace) {
    setPostTranslationReplace(postTranslationReplace);
    //console.debug("CheckPage:", postTranslationReplace.length);
    // 15-05-2021 PSS added fix for issue #73add
    var replaced = false;
    if (postTranslationReplace.length != 0 && postTranslationReplace != "undefined") {
        //setPreTranslationReplace(preTranslationReplace);
        let countreplaced = 0;
        var translatedText;
        var repl_verb = "";
        for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            let original = e.querySelector("span.original-raw").innerText;
            let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
            let row = rowfound.split('-')[1];
            let newrow = rowfound.split('-')[2];
            if (typeof newrow != 'undefined') {
                newrowId = row.concat("-", newrow);
                row = newrowId;
            }
            else {
                rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
                let row = rowfound.split('_')[1];
            }
            // 30-08-2021 PSS fix for issue # 125
            let precomment = e.querySelector('.source-details__comment p');
            if (precomment != null) {
                comment = precomment.innerText;
                comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                toTranslate = checkComments(comment.trim());
            }
            else {
                toTranslate = true;
            }
            if (toTranslate) {
                // Check if it is a plural
                let pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) small`);
                //console.debug("TranslatePage plural present:", pluralpresent, row);
                if (pluralpresent != null) {
                    transtype = "plural";
                }
                else {
                    transtype = "single";
                }
                // Fetch the translations
                let element = e.querySelector('.source-details__comment');
                let textareaElem = e.querySelector("textarea.foreign-text");
                translatedText = textareaElem.innerText;
                // Enhencement issue #123
                previewNewText = textareaElem.innerText;
                // Need to replace the existing html before replacing the verbs! issue #124
                previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                //console.debug('Translated text to check:',translatedText);
                replaced = false;
                // replverb contains the verbs to replace

                for (let i = 0; i < replaceVerb.length; i++) {
                    if (translatedText.includes(replaceVerb[i][0])) {
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        if (currec != null) {
                            var current = currec.querySelector('span.panel-header__bubble');
                            var prevstate = current.innerText;
                            //console.debug("Previous state:", prevstate);
                            current.innerText = "transFill";
                        }

                        // Enhencement issue #123
                        previewNewText = previewNewText.replaceAll(replaceVerb[i][0], '<mark>' + replaceVerb[i][1] + '</mark>');
                        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);

                        repl_verb += replaceVerb[i][0] + "->" + replaceVerb[i][1] + "\n";
                        countreplaced++;
                        replaced = true;
                    }
                }
                // PSS 22-07-2021 fix for the preview text is not updated #109
                if (replaced) {
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    if (transtype == "single") {
                        let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
                        let row = rowfound.split('-')[1];
                        let newrow = rowfound.split('-')[2];
                        if (newrow != 'undefined') {
                            newrowId = row.concat("-", newrow);
                            row = newrowId;
                        }
                        let preview = document.querySelector('#preview-' + newrowId + ' td.translation');
                        // Enhencement issue #123
                        preview.innerHTML = previewNewText;
                    }
                    let wordCount = countreplaced;
                    let percent = 10;
                    let toolTip = '';
                    result = { wordCount, percent, toolTip };
                    //console.debug('googletranslate row:', rowfound);
                    updateStyle(textareaElem, result, "", true, false, false, row);
                }

            }
        }
        //var myForm = document.getElementById('translation-actions');
        //myForm.submit();
        alert('Replace verbs done ' + countreplaced + ' replaced' + ' words\n' + repl_verb);
        // Translation replacement completed
        let checkButton = document.querySelector(".paging a.check_translation-button");
        checkButton.className += " ready";
    }
    else {
        alert("Your postreplacement verbs is empty!!");
    }
}


async function translateEntry(rowId, apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace) {
    //console.debug('translateEntry started!');
    let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
    translateButton.className += " started";
    //16 - 06 - 2021 PSS fixed this function to prevent double buttons issue #74
    // 07-07-2021 PSS need to determine if current record
    let g = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = g.querySelector('span.panel-header__bubble');
    //console.debug('status plural:', current.innerText);
    //console.debug('plural rowId:', rowId);
    var transtype = "";
    var plural_line = "";
    checkplural = document.querySelector(`#editor-${rowId} .source-string__singular span.original`);
    if (typeof checkplural == null) {
        transtype = "single";
    }
    else {
        transtype = "plural";
        plural_line = "1";
    }

    var translatedText = "";
    // 15-05-2021 PSS added fix for issue #73
    if (postTranslationReplace.length != 0) {
        if (preTranslationReplace != 0) {
            setPostTranslationReplace(postTranslationReplace);
            setPreTranslationReplace(preTranslationReplace);
            let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
            let original = e.querySelector("span.original-raw").innerText;
            // PSS 09-03-2021 added check to see if we need to translate
            let toTranslate = true;
            // Check if the comment is present, if not then it will block the request for the details name etc.   
            let element = e.querySelector('.source-details__comment');
            //console.debug('checkComment started element', element);
            if (element != null) {
                // Fetch the comment with name
                let comment = e.querySelector('#editor-' + rowId + ' .source-details__comment p').innerText;
                toTranslate = checkComments(comment.trim());
            }
            if (toTranslate) {
                let pretrans = await findTransline(original, destlang);
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line);
                    }
                    else if (transsel == "deepl") {
                        deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line);
                    }
                    else if (transsel == "microsoft") {
                        microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line);
                    }
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'hide';
                    let textareaElem = e.querySelector("textarea.foreign-text");
                }
                else {
                    //console.debug('Pretranslated:', rowId,pretrans);
                    let translatedText = pretrans;
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    //let zoeken = "translate-" + rowId + '"-translocal-entry-local-button';  
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
                }
            }
            else {
                // no translation needed
                //console.debug('No need to translate copy the original', original);
                let translatedText = original;
                let textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                textareaElem.value = translatedText;
                current.innerText = 'transFill';
                current.value = 'transFill';

            }
            let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
            let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original`);
            //console.debug('checkplural started element source-string_plural', checkplural);
            if (checkplural != null) {
                let plural = checkplural.innerText;
                var transtype = "plural";
                let pretrans = await findTransline(plural, destlang);
                //console.debug('pretranslate result plural:', pretrans);
                // console.debug('checkplural content element', plural);
                plural_line = "2";
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        translatedText = googleTranslate(plural, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line);
                    }
                    else if (transsel == "deepl") {
                        translatedText = deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line);
                    }
                    else if (transsel == "microsoft") {
                        translatedText = microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line);
                    }
                }
                else {
                    let translatedText = pretrans;
                    // console.debug('translatedEntry plural:', translatedText);
                    // 21-06-2021 PSS fixed not populating plural issue #86

                    // 07-07-2021 PSS fixed problem with populating when status is current
                    if (current != 'null') {
                        let row = rowId.split('-')[0];
                        // console.debug('rowId plural:',row)
                        textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                        //  console.debug('existing plural text:', translatedText);
                    }
                    else {
                        textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                        // console.debug("translateEntry plural:", textareaElem1);
                        textareaElem1.innerText = translatedText;
                        // console.debug("plural newtext:", textareaElem1.innerText);
                        textareaElem1.value = translatedText;
                        document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
                        // console.debug("translatedEntry plural finished");
                    }
                }
            }
            else {
                console.debug('checkplural null');
            }
            // Translation completed
            let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            translateButton.className += " translated";
        }
        else {
            alert("Your pretranslate replace verbs are not populated add at least on line!!");
            let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            translateButton.className += " translated_error";
        }
    }
    else {
        alert("Your postreplace verbs are not populated add at least on line!!");
        let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
        translateButton.className += " translated_error";
    }
}
