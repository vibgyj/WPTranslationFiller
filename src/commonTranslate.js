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
        if (index == 0) {
            //  console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    //console.debug("After pre-processing:", original);
    return original;
}

function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, translator) {
    translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);
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
    }
    // replverb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
    }
    // Make translation to start with same case (upper/lower) as the original.
    if (isStartsWithUpperCase(original)) {
        if (!isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toUpperCase() + translatedText.slice(1);
        }
    }
    else {
        if (isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toLowerCase() + translatedText.slice(1);
        }
    }
    // check if the returned translation does have the same ending as the original
    translatedText = checkStartEnd(original, translatedText);
    return translatedText;
}

function checkStartEnd(original, translatedText) {
    // 20-09-2021 Fix for issue #143
    // strip or add "." at the end of the line
    if (original.endsWith('.') == true) {
        if (translatedText.endsWith('.') == false) {
            translatedText = translatedText + ".";
        }
    }
    if (original.endsWith('.') == false) {
        if (translatedText.endsWith('.') == true) {
            //console.debug("translated ends with .");
            translatedText = translatedText.substring(0, translatedText.length - 1)
        }
    }
    // Strip or add blank at the end of the line
    if (original.endsWith(' ') == true) {
        if (translatedText.endsWith(' ') == false) {
            translatedText = translatedText + " ";
        }
    }
    if (original.endsWith(' ') == false) {
        if (translatedText.endsWith(' ') == true) {
            //console.debug("translated ends with blank");
            translatedText = translatedText.substring(0, translatedText.length - 1)
        }
    }
    if (original.startsWith(' ') == true) {
        if (translatedText.startsWith(' ') == false) {
            translatedText = " " + translatedText ;
        }
    }
    if (original.startsWith(' ') == false) {
        if (translatedText.startsWith(' ') == true) {
            translatedText = translatedText.substring(1, translatedText.length)
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
               // previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                replaced = false;
                // replverb contains the verbs to replace
                let preview = document.querySelector('#preview-' + newrowId + ' td.translation');
                for (let i = 0; i < replaceVerb.length; i++) {
                    if (translatedText.includes(replaceVerb[i][0])) {
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        if (currec != null) {
                            var current = currec.querySelector('span.panel-header__bubble');
                            var prevstate = current.innerText;
                            current.innerText = "transFill";
                        }

                        var orgText = translatedText;
                        // Enhencement issue #123
                        previewNewText = previewNewText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                        //console.debug("mark:", previewNewText, replaceVerb[i][1]);
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
                        // PSS we need to remove the current span, as the mark function adds one again
                        // PSS fix for issue #157
                        let span = document.querySelector('#preview-' + newrowId + ' td.translation span.translation-text');
                        span.remove();
                        // Enhancement issue #123
                        var myspan1 = document.createElement('span');
                        myspan1.className = "translation-text";             
                        preview.appendChild(myspan1);
                        myspan1.appendChild(document.createTextNode(previewNewText));
                        preview = document.querySelector('#preview-' + newrowId + ' td.translation');
                        // PSS populate the preview before marking
                        preview.innerText = DOMPurify.sanitize(previewNewText);
                        
                        // Highlight all keywords found in the page, so loop through the replacement array
                        var arr = [];
                        for (let i = 0; i < replaceVerb.length; i++) {
                            if (orgText.includes(replaceVerb[i][0] )){
                                high = replaceVerb[i][1];
                                high=high.trim();
                                if (high != '') {
                                    // push the verb into the array
                                    arr.push(high);              
                                }
                            }
                            // PSS we found everything to mark, so mark it issue #157
                            if (arr.length > 0) {
                                highlight(preview, arr);
                            }
                        }
                    }
                    let wordCount = countreplaced;
                    let percent = 10;
                    let toolTip = '';
                    result = { wordCount, percent, toolTip };
                    updateStyle(textareaElem, result, "", true, false, false, row);
                }

            }
        }
        
        messageBox("info", 'Replace verbs done ' + countreplaced + ' replaced' + ' words\n' + repl_verb);
        // Translation replacement completed
        let checkButton = document.querySelector(".paging a.check_translation-button");
        checkButton.className += " ready";
    }
    else {
        messageBox("error", "Your postreplace verbs are not populated add at least on line!");
    }
}

async function translatePage(apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace, formal) {
    // 19-06-2021 PSS added animated button for translation at translatePage
    locale = checkLocale();
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    //console.debug("Button classname:", translateButton.className);
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (translateButton.className == "translation-filler-button") {
        translateButton.className += " started";
    }
    else {

        translateButton.classList.remove("translation-filler-button" , "started", "translated");
        translateButton.classList.remove("translation-filler-button", "restarted", "translated");
        translateButton.className = "translation-filler-button restarted";
    }
    var transtype = "";
    var plural_line = "";
    var plural_present = "";
    var record = "";
    var row = "";
    var preview = "";
    // 15-05-2021 PSS added fix for issue #73
    // 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
    if (typeof postTranslationReplace != 'undefined' && postTranslationReplace.length != 0) {
        if (typeof preTranslationReplace != 'undefined' && preTranslationReplace.length != 0) {
            setPostTranslationReplace(postTranslationReplace);
            setPreTranslationReplace(preTranslationReplace);
            for (let record of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
                transtype = "single";
                // 16-08-2021 PSS fixed retranslation issue #118
                let rowfound = record.parentElement.parentElement.parentElement.parentElement.id;
                row = rowfound.split('-')[1];
                let newrow = rowfound.split('-')[2];
                if (typeof newrow != 'undefined') {
                    newrowId = row.concat("-", newrow);
                    row = newrowId;
                }
                else {
                    rowfound = record.querySelector(`div.translation-wrapper textarea`).id;
                    row = rowfound.split('_')[1];
                }
                let original = record.querySelector("span.original-raw").innerText;
                // 14-08-2021 PSS we need to put the status back of the label after translating
                let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
                if (transname != null) {
                    transname.className = "trans_name_div";
                    transname.innerText = 'URL, name of theme or plugin or author!';
                    current = document.querySelector(`#preview-${row} .priority button.save-button`);
                    current.innerText = "Save";
                    transtype = "single";
                }
                // If in the original field "Singular is present we have a plural translation
                pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
                if (pluralpresent != null) {
                    original = pluralpresent.innerText;
                    transtype = "plural";
                    plural_line = "1";
                }
                else {
                    transtype = "single";
                    plural_line = "0";
                }
                // PSS 09-03-2021 added check to see if we need to translate
                //Needs to be put into a function, because now it is unnessary double code
                let toTranslate = true;
                // Check if the comment is present, if not then if will block the request for the details name etc.
                let element = record.querySelector('.source-details__comment');
                if (element != null) {
                    let comment = record.querySelector('.source-details__comment p').innerText;
                    comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                    toTranslate = checkComments(comment.trim());
                    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                    if (currec != null) {
                        var current = currec.querySelector('span.panel-header__bubble');
                        var prevstate = current.innerText;
                    }
                }
                // Do we need to translate ??
                if (toTranslate) {
                    let pretrans = await findTransline(original, destlang);
                    // 07-05-2021 PSS added pretranslate in pages
                    if (pretrans == "notFound") {
                        // 20-06-2021 PSS fixed that translation stopped when the page already is completely translated issue #85
                        if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                            document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = 'hide';
                        }
                        if (transsel == "google") {
                            googleTranslate(original, destlang, record, apikey, replacePreVerb, row, transtype, plural_line,locale);
                        }
                        else if (transsel == "deepl") {
                            deepLTranslate(original, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line,formal,locale);
                        }
                        else if (transsel == "microsoft") {
                            microsoftTranslate(original, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line,locale);
                        }
                    }
                    else {
                        // Pretranslation found!
                        let translatedText = pretrans;
                        let textareaElem = record.querySelector("textarea.foreign-text");
                        textareaElem.innerText = translatedText;
                        textareaElem.value = translatedText;
                        if (typeof current != 'undefined') { 
                             current.innerText = 'transFill';
                             current.value = 'transFill';
                         }
                        // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                        select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                        //select = next_editor.getElementsByClassName("meta");
                        var status = select.querySelector('dt').nextElementSibling;
                        status.innerText = 'transFill';
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        if (currec != null) {
                            var current = currec.querySelector('span.panel-header__bubble');
                        }
                        
                        validateEntry(destlang, textareaElem, "", "", row);
                        // PSS 10-05-2021 added populating the preview field issue #68
                        // Fetch the first field Singular
                        let previewElem = document.querySelector('#preview-' + row + ' li:nth-of-type(1) span.translation-text');
                        if (previewElem != null) {
                            previewElem.innerText = translatedText;
                        }
                        else {
                            let preview = document.querySelector('#preview-' + row + ' td.translation');
                            let spanmissing = preview.querySelector(" span.missing");
                            if (spanmissing != null) {
                                if (plural_line == '1') {
                                    spanmissing.remove();
                                }
                                if (transtype != "single") {
                                    ul = document.createElement('ul');
                                    preview.appendChild(ul);
                                    var li1 = document.createElement('li');
                                    li1.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                    ul.appendChild(li1);
                                    var small = document.createElement('small');
                                    li1.appendChild(small);
                                    small.appendChild(document.createTextNode("Singular:"));
                                    var br = document.createElement('br');
                                    li1.appendChild(br);
                                    var myspan1 = document.createElement('span');
                                    myspan1.className = "translation-text";
                                    li1.appendChild(myspan1);
                                    myspan1.appendChild(document.createTextNode(translatedText));

                                    // Also create the second li
                                    var li2 = document.createElement('li');
                                    //li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                    ul.appendChild(li2);
                                    var small = document.createElement('small');
                                    li2.appendChild(small);
                                    small.appendChild(document.createTextNode("Plural:"));
                                    var br = document.createElement('br');
                                    li2.appendChild(br);
                                    var myspan2 = document.createElement('span');
                                    myspan2.className = "translation-text";
                                    li2.appendChild(myspan2);
                                    myspan2.appendChild(document.createTextNode("empty"));
                                }
                                else {
                                    preview.innerText = translatedText;
                                    current.innerText = 'transFill';
                                    current.value = 'transFill';
                                }
                            }
                            else {
                                // if it is as single with local then we need also update the preview
                                preview.innerText = translatedText;
                                current.innerText = 'transFill';
                                current.value = 'transFill';
                            }
                        }
                        if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                            document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = 'visible';
                        }
                    }
                    // 10-04-2021 PSS added translation of plural into translatePage
                    let e = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                    if (e != null) {
                        checkplural = e.querySelector(`#editor-${row} .source-string__plural span.original`);
                        if (checkplural != null) {
                            transtype = "plural";
                            plural_line = "2";
                            let plural = checkplural.innerText;
                            let pretrans = await findTransline(plural, destlang);
                            if (pretrans == "notFound") {
                                if (transsel == "google") {
                                    translatedText = googleTranslate(plural, destlang, e, apikey, replacePreVerb, row, transtype, plural_line,locale);
                                }
                                else if (transsel == "deepl") {
                                    translatedText = deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, row, transtype, plural_line,formal,locale);
                                }
                                else if (transsel == "microsoft") {
                                    translatedText = microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line,locale);
                                }
                            }
                            else {
                                // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
                                // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
                                let translatedText = pretrans;
                                // Plural second line
                                let rowId = row.split('-')[0];
                                if (current.innerText == 'current') {
                                    
                                    textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                                    textareaElem1.innerText = translatedText;
                                    textareaElem1.value = translatedText;
                                    // Populate the second line in preview Plural
                                    if (prevstate != 'current') {
                                        let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                                        if (preview != null) {
                                            preview.innerText = translatedText;
                                            preview.value = translatedText;
                                        }
                                    }
                                }
                                else {
                                    // 30-10-2021 PSS added a fix for issue #154
                                    // If the span missing is present it needs to be removed and the ul added otherwise the second line cannot be populated
                                    check_span_missing(row,plural_line);
                                    
                                    textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                                    textareaElem1.innerText = translatedText;
                                    textareaElem1.value = translatedText;
                                    let previewElem = document.querySelector('#preview-' + row + ' li:nth-of-type(2) .translation-text');
                                    if (previewElem != null) {
                                        previewElem.innerText = translatedText;
                                    }
                                    current.innerText = 'transFill';
                                    current.value = 'transFill';
                                }
                                validateEntry(destlang, textareaElem1, "", "", row);
                            }
                        }
                    }
                }
                else {
                    // This is when urls/plugin/theme names are present or local translation is present
                    let translatedText = original;
                    let textareaElem = record.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    let preview = document.querySelector('#preview-' + row + ' td.translation');
                    if (preview != null) {
                        preview.innerText = translatedText;
                        preview.value = translatedText;
                        // We need to alter the status otherwise the save button does not work
                        current.innerText = 'transFill';
                        current.value = 'transFill';
                    }
                }
                //14-09-2021 PSS changed the class to meet GlotDict behavior
                var currentClass = document.querySelector(`#editor-${row}`);
                var prevcurrentClass = document.querySelector(`#preview-${row}`);
                //currentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
                currentClass.classList.add("wptf-translated");
                currentClass.classList.replace("no-translations", "has-translations");
                //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
                prevcurrentClass.classList.replace("no-translations", "has-translations");
                prevcurrentClass.classList.add("wptf-translated");
                        //console.debug("currentClass:", currentClass);
                        //console.debug("currentClass:", prevcurrentClass);
            }
            // Translation completed  
            let translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " translated";
        }
        else {
            messageBox("error", "Your pretranslate replace verbs are not populated add at least on line!");
            // 07-07-2021 Fix for issue #98
            translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " after_error";
        }
    }
    else {
        messageBox("error", "Your postreplace verbs are not populated add at least on line!");
        // 07-07-2021 Fix for issue #98
        translateButton = document.querySelector(".paging a.translation-filler-button");
        translateButton.className += " after_error";
    }
}

function check_span_missing(row,plural_line) {
    let preview = document.querySelector('#preview-' + row + ' td.translation');
    //console.debug("prev:", preview);
    let spanmissing = preview.querySelector(" span.missing");

    if (spanmissing != null) {
        //if (plural_line == '1') {
            // only remove when it is present and first plural line
            spanmissing.remove();
        //}
        
        ul = document.createElement('ul');
        preview.appendChild(ul);
        var li1 = document.createElement('li');
        li1.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
        ul.appendChild(li1);
        var small = document.createElement('small');
        li1.appendChild(small);
        small.appendChild(document.createTextNode("Singular:"));
        var br = document.createElement('br');
        li1.appendChild(br);
        var myspan1 = document.createElement('span');
        myspan1.className = "translation-text";
        li1.appendChild(myspan1);
        myspan1.appendChild(document.createTextNode("empty"));
        // Also create the second li
        var li2 = document.createElement('li');
        ul.appendChild(li2);
        var small = document.createElement('small');
        li2.appendChild(small);
        small.appendChild(document.createTextNode("Plural:"));
        var br = document.createElement('br');
        li2.appendChild(br);
        var myspan2 = document.createElement('span');
        myspan2.className = "translation-text";
        li2.appendChild(myspan2);
        myspan2.appendChild(document.createTextNode("empty"));
    }
}

async function translateEntry(rowId, apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace,formal) {
    let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
    translateButton.className += " started";
    //16 - 06 - 2021 PSS fixed this function to prevent double buttons issue #74
    // 07-07-2021 PSS need to determine if current record
    let g = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = g.querySelector('span.panel-header__bubble');
    var transtype = "";
    var plural_line = "";
    var checkplural = "";
    // To check if a plural is present we need to select the plural line!!
    var checkplural = document.querySelector(`#editor-${rowId} .source-string__plural span.original`);
    console.debug("checkplural:", checkplural);

    if (checkplural == null) {
        transtype = "single";
        console.debug("transtype:", transtype);
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
                        deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line,formal);
                    }
                    else if (transsel == "microsoft") {
                        microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line);
                    }
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'hide';
                    let textareaElem = e.querySelector("textarea.foreign-text");
                }
                else {
                    let translatedText = pretrans;
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    current.innerText = 'transFill';
                    current.value = 'transFill';
                    //let zoeken = "translate-" + rowId + '"-translocal-entry-local-button';  
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
                }
            }
            else {
                // no translation needed
                let translatedText = original;
                let textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                textareaElem.value = translatedText;
                current.innerText = 'transFill';
                current.value = 'transFill';

            }
            let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
            let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original`);
            if (checkplural != null) {
                let plural = checkplural.innerText;
                var transtype = "plural";
                let pretrans = await findTransline(plural, destlang);
                plural_line = "2";
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        translatedText = googleTranslate(plural, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line);
                    }
                    else if (transsel == "deepl") {
                        translatedText = deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line,formal);
                    }
                    else if (transsel == "microsoft") {
                        translatedText = microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line);
                    }
                }
                else {
                    let translatedText = pretrans;
                    // 21-06-2021 PSS fixed not populating plural issue #86

                    // 07-07-2021 PSS fixed problem with populating when status is current
                    if (current != 'null') {
                        let row = rowId.split('-')[0];
                        textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                    }
                    else {
                        textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                        document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
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
            messageBox("error", "Your pretranslate replace verbs are not populated add at least on line!!");
            let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            translateButton.className += " translated_error";
        }
    }
    else {
        messageBox("error", "Your postreplace verbs are not populated add at least on line!");
        let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
        translateButton.className += " translated_error";
    }
}

function bulkSave(event) {
    let timeout = 0;
    var counter = 0;
    document.querySelectorAll('tr.preview').forEach((preview, i) => {
        if (!preview.querySelector('th input').checked) {
            return;
        }
        counter++;
        setTimeout(() => {
            preview.querySelector('td.actions .edit').click();
            const editor = preview.nextElementSibling;
            editor.style.display = 'none';
            editor.querySelector('.translation-actions__save').click();
            confirm = "button.gp-js-message-dismiss";
            // PSS confirm the message for dismissal
            elementReady('.gp-js-message-dismiss').then(elm => { elm.click(); }
            );
            toastbox('info', "Saving suggestion: "+(i+1), 800);
        }, timeout);
        timeout +=1700;
    });
    if ( counter == 0) {
        messageBox("error", "You do not have translations selected!");
    }
    
}



function second(milliseconds) {
    return new Promise((resolve) => {
        (async () => {
            const date = Date.now();
            let currentDate = null;
            do {
                currentDate = Date.now();
            } while (currentDate - date < milliseconds);
        })();
        
        resolve("done waiting");
    });
}

async function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

async function delay(n) {
    return new Promise(function (resolve) {
        setTimeout(resolve("timer done"), n * 1000);
    });
}


function _waitForElement(selector, delay =5, tries = 50) {
    const element = document.querySelector(selector);

    if (!window[`__${selector}`]) {
      window[`__${selector}`] = 0;
    }

    function _search() {
      return new Promise((resolve) => {
        window[`__${selector}`]++;
        console.log("Search result:",window[`__${selector}`]);
        setTimeout(resolve, delay);
      });
    }

    if (element === null) {
      if (window[`__${selector}`] >= tries) {
        window[`__${selector}`] = 0;
        return Promise.reject(null);
      }

      return _search().then(() => _waitForElement(selector));
    } else {
      return Promise.resolve(element);
    }
  }


function elementReady(selector) {
    return new Promise((resolve, reject) => {
        let el = document.querySelector(selector);
        if (el) { resolve(el); }
        new MutationObserver((mutationRecords, observer) => {
            // Query for elements matching the specified selector
            Array.from(document.querySelectorAll(selector)).forEach((element) => {
                //console.debug("new elementReady",element);
                resolve(selector);
                //Once we have resolved we don't need the observer anymore.
                observer.disconnect();
            });
        })
            .observe(document.documentElement, {
                childList: true,
                subtree: true
            });
    });
}

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            console.debug("Selector found");
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                console.debug("In observer found");
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}
function close_toast(){
    const toastContainer = document.querySelector(".toast-container");
    toastContainer.remove();
}


function toastbox(type, message, time) {
    return new Promise((resolve) => {
    var myWindow = window.self;
    cuteToast({
        type: type, // or 'info', 'error', 'warning'
        message: message,
        timer: time,
        myWindow: myWindow
    })
        resolve("toast");
    }).catch((err) => {
        console.debug("error:", err)
    });
   // resolve("toast ready");

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

/**
 ** function copied from stackoverflow created by eclanrs
 ** https://stackoverflow.com/questions/8644428/how-to-highlight-text-using-javascript
 * Highlight keywords inside a DOM element
 * @param {string} elem Element to search for keywords in
 * @param {string[]} keywords Keywords to highlight
 * @param {boolean} caseSensitive Differenciate between capital and lowercase letters
 * @param {string} cls Class to apply to the highlighted keyword
 */
function highlight(elem, keywords, caseSensitive = false, cls = 'highlight') {
    const flags = caseSensitive ? 'gi' : 'g';
    // Sort longer matches first to avoid
    // highlighting keywords within keywords.
    keywords.sort((a, b) => b.length - a.length);
    Array.from(elem.childNodes).forEach(child => {
        const keywordRegex = RegExp(keywords.join('|'), flags);
        if (child.nodeType !== 3) { // not a text node
            highlight(child, keywords, caseSensitive, cls);
        } else if (keywordRegex.test(child.textContent)) {
            const frag = document.createDocumentFragment();
            let lastIdx = 0;
            child.textContent.replace(keywordRegex, (match, idx) => {
                const part = document.createTextNode(child.textContent.slice(lastIdx, idx));
                const highlighted = document.createElement('span');
                highlighted.textContent = match;
                highlighted.classList.add(cls);
                frag.appendChild(part);
                frag.appendChild(highlighted);
                lastIdx = idx + match.length;
            });
            const end = document.createTextNode(child.textContent.slice(lastIdx));
            frag.appendChild(end);
            child.parentNode.replaceChild(frag, child);
        }
    });
}

