// This array is used to replace wrong words in translation
// PSS version 12-05-2021
let replaceVerb = [];
// This array is used to replace verbs before translation
// It is also used to force google to translate informal
// This is done by replacing the formal word for a informal word
let replacePreVerb = [];
// 06-05-2021 PSS These vars can probably removed after testen
var result="";
var res="";

function setPreTranslationReplace(preTranslationReplace) {
    replacePreVerb = [];
    if (preTranslationReplace != undefined){
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
    if (postTranslationReplace != undefined){
       let lines = postTranslationReplace.split('\n');
       lines.forEach(function (item) {
         // Handle blank lines
         if (item != "") {
            replaceVerb.push(item.split(','));
           }
        });
    }
}
// 18-03-2021 PSS added pretranslate function so we can use a API to find existing records locally
// 18-04-2021 PSS now the function retrieves the data from the local database if present
async function pretranslate(original) {
    console.debug('pretranslate with:', original);
    var translated = "";
    
    res = await listRec(original).then(function(v){
        console.debug('answ:',v);
        translated=v;
    }).catch (function (err) {
        console.debug('Error retrieving pretrans',err.message);
    });
    console.log('resultaat translate:',translated);
    if (typeof  translated == 'undefined'){
        translated = 'notFound';
       }
    else if (typeof translated == 'object') {
        translated = 'notFound';  
    }
    else if (translated == ''){
		translated = 'notFound';
	}
	else 
		{
        console.debug('pretranslate line found:',translated);
        //translated = res;   
    }
    return translated;
}

function checkComments(comment) {
    // PSS 09-03-2021 added check to see if we need to translate
    console.debug('checkComment started comment', comment);
    let toTranslate = false;
    switch (comment) {
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
    console.debug('before googletranslate do we need to translate:', toTranslate);
    return toTranslate;
}
// 23-03-2021 PSS added function to check for wrong verbs
function checkPage(postTranslationReplace) {
    setPostTranslationReplace(postTranslationReplace);
    //setPreTranslationReplace(preTranslationReplace);
	let countreplaced =0;
    var translatedText;
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        
        // Fetch the translations
        let element = e.querySelector('.source-details__comment');
        let textareaElem = e.querySelector("textarea.foreign-text");
        translatedText = textareaElem.innerText ;
		//console.debug('Translated text to check:',translatedText);
		let replaced=false;
        // replverb contains the verbs to replace
        for (let i = 0; i < replaceVerb.length; i++) {
			   if (translatedText.includes(replaceVerb[i][0])){
				   //console.debug('Word in line found',replaceVerb[i][0]);
				   translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);  
				   countreplaced++ ;
				   replaced=true;
			   }
			   
			  
        }
        textareaElem.innerText = translatedText;
		//console.debug('Translated text checked:',translatedText);
		if (replaced){
		   let wordCount= countreplaced;
		   let percent = 10 ;
		   let toolTip='';
		   result={wordCount,percent,toolTip};
		   updateStyle(textareaElem, result);
		}
		replaced = false;
		
    }
	//var myForm = document.getElementById('translation-actions');
    //myForm.submit();
    alert('Replace verbs done '+countreplaced +' replaced');
    // Translation replacement completed
    let checkButton = document.querySelector(".paging a.check_translation-button");
    checkButton.className += " ready";
}
async function translatePage(apikey, apikeyDeepl,transSelect,destlang, postTranslationReplace, preTranslationReplace) {
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    console.debug("Deepl:" + apikeyDeepl + "TransSelect:" + transSelect);
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        console.debug('translatePage content:',e);
        let rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
        let row = rowfound.split('_')[1];
        console.debug("translatePage row:",row);
        let original = e.querySelector("span.original-raw").innerText;
        // PSS 09-03-2021 added check to see if we need to translate
        //Needs to be put into a function, because now it is unnessary double code
        let toTranslate = true;
        // Check if the comment is present, if not then if will block the request for the details name etc.
        let element = e.querySelector('.source-details__comment');
        if (element != null) {
            let comment = e.querySelector('.source-details__comment p').innerText;
            comment = comment.trim();
            toTranslate = checkComments(comment);
            console.debug('comment:', comment);
            toTranslate = checkComments(comment);
        }
        console.debug('before googletranslate:', replacePreVerb);
        console.debug('before googletranslate do we need to translate:', toTranslate);
        if (toTranslate) {
            let pretrans = await findTransline(original);
            // 07-05-2021 PSS added pretranslate in pages
            if (pretrans == "notFound") {
                let transtype = "single";
                document.getElementById("translate-" + row).style.visibility = 'hide';
                if (transSelect = "google") {
                    googleTranslate(original, destlang, e, apikey, replacePreVerb, row, transtype);
                }
                else if (transSelect == "deepl") {
                    deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype);
                }
            }
            else {
                console.debug('Pretranslated:', pretrans);
                let translatedText = pretrans;
                let textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                // PSS 10-05-2021 added populating the preview field issue #68
               let g = document.querySelector('td.translation');
               let previewElem = g.innerText; 
               console.debug('Text preview:',previewElem,row);
               let preview =  document.querySelector('#preview-'+row+' td.translation');
               preview.innerText = translatedText;
                document.getElementById("translate-" + row).style.visibility = 'visible';
            }
            // 10-04-2021 PSS added translation of plural into translatePage
            
            let f = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
            checkplural = f.querySelector(`#editor-${row} .source-string__plural span.original`);
            console.debug("translatePage checkplural:",checkplural);
            if (checkplural != null) {
              let plural = checkplural.innerText;
                transtype = "plural";
                if (transSelect == "google") {
                    translatedText = googleTranslate(plural, destlang, f, apikey, replacePreVerb, row, transtype);
                    console.debug('translatePage checkplural:', translatedText);
                }
                else if (transSelect == "deepl") {
                    deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype);
                }
            }
        }   
        else {
            let translatedText = original;
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            console.debug('translatePage No need to translate copy the original', original);
            }
    }

    // Translation completed
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    translateButton.className += " translated";
}

async function translateEntry(rowId, apikey,apikeyDeepl,transSelect, destlang, postTranslationReplace, preTranslationReplace) {
    console.debug('translateEntry started!');
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    console.debug("Deepl:" , apikeyDeepl , "TransSelect:" , transSelect);

    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    console.debug('after document querySelector:', e);
    let original = e.querySelector("span.original-raw").innerText;
    // PSS 09-03-2021 added check to see if we need to translate
    let toTranslate = true;
    // Check if the comment is present, if not then if will block the request for the details name etc.   
    let element = e.querySelector('.source-details__comment');
    console.debug('checkComment started element', element);
    if (element != null) {
        // Fetch the comment with name
        let comment = e.querySelector('#editor-' + rowId + ' .source-details__comment p').innerText;
        toTranslate = checkComments(comment);
    }
    if (toTranslate) {
        let pretrans = await findTransline(original);
        //let pretrans = await pretranslate(original);
        console.debug('pretranslate result:',pretrans);
        if (pretrans == "notFound") {
            let transtype = 'single';
            if (transSelect == "google") {
                googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype);
            }
            else if (transSelect == "deepl") {
                deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype);
                console.debug('translatedEntry deepl translation:', translatedText);
            }
            document.getElementById("translate-" + rowId).style.visibility = 'hide';
        }
        else {
            console.debug('Pretranslated:', pretrans);
            //document.getElementById('translate-' + rowId).checked = true;
            //document.getElementById('translate-' + rowId).disabled = true;
            let zoeken = "translate-" + rowId + '.translocal-entry-my-button';
            console.debug("zoek naar: " + zoeken);
            document.getElementById("translate-" + rowId).style.visibility = 'visible';         
            let translatedText = pretrans;
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
        }
    }
    else {

        let translatedText = original;
        let textareaElem = e.querySelector("textarea.foreign-text");
        textareaElem.innerText = translatedText;
        console.debug('No need to translate copy the original', original);
    }
    let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original`);
    console.debug('checkplural started element', checkplural);
    if (checkplural != null) {
        let plural = checkplural.innerText;
        let transtype = "plural";
        console.debug('checkplural content element', plural);
        if (transSelect == "google") {
            translatedText = googleTranslate(plural, destlang, f, apikey, replacePreVerb, rowId, transtype);
        }
        else if (transSelect == "deepl") {
            translatedText = deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype);
        }
        console.debug('checkplural:', translatedText);
    }
    else {
        console.debug('checkplural null');
    }
       
    // Translation completed
    let translateButton = document.querySelector(`#translate-${rowId}.translation-entry-my-button`);
    console.debug('translateButton entry:', translateButton);
    translateButton.className += " translated";
}

function deepLTranslate(original, destlang, e, apikeyDeepl, preverbs, rowId, transtype) {
    let originalPreProcessed = preProcessOriginal(original, preverbs, 'deepl');
    console.debug('deeplTranslate result of preProcessOriginal:', originalPreProcessed);
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "text";
    }
    else {
        var trntype = "html";
    }
   
    console.debug("deepLTranslate format type", trntype);
    translatedText = sendAPIRequestDeepl(e, destlang, apikeyDeepl, original, originalPreProcessed, rowId, transtype); 

    console.debug('result deepl:', translatedText);
    //translatedText = original;
    //textareaElem = e.querySelector("textarea.foreign-text");
    //textareaElem.innerText = translatedText;
}
function googleTranslate(original, destlang, e, apikey, preverbs,rowId,transtype) {
    let originalPreProcessed = preProcessOriginal(original, preverbs,'google');

    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "text";
    }
    else {
        var trntype = "html";
    }
    console.debug("format type", trntype);

    let requestBody = {
        "q": originalPreProcessed,
        "source": "en",
        "target": destlang,
        "format": trntype
    };
    console.debug("request body", requestBody);
    //sendAPIRequest(e, destlang, apikey, requestBody, original);
    translatedText=sendAPIRequest(e, destlang, apikey, requestBody, original, originalPreProcessed,rowId,transtype);
    console.debug('after sendAPIRequest:',translatedText,transtype);
}

function sendAPIRequestDeepl(e, language, apikey, original, originalPreProcessed, rowId, transtype) {
    console.debug('sendAPIreQuest original_line:', originalPreProcessed);
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        
        console.debug("Deepl translation:", this.response);
        responseObj = this.response;
        
        console.debug("Deepl ready state:", this.readyState);
        if (this.readyState == 4) {
            //responseObj = xhttp.response;
            responseObj = this.response;
            //alert(responseObj.translations[0].text);
            translatedText = responseObj.translations[0].text;
            console.debug("inside:", translatedText);
            //let responseObj = JSON.parse(this.translations);
            //let translatedText = responseObj.data.translations[0].translatedText;
            console.debug('sendAPIRequest result before postProces:', translatedText);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed,"deepl");
            console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            if (transtype == "single") {
                textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                // PSS 13-04-2021 added populating the preview field issue #64
                let g = document.querySelector('td.translation');
                let previewElem = g.innerText;
                console.debug('Text preview:', previewElem, rowId);
                let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                preview.innerText = translatedText;
                // PSS 29-03-2021 Added populating the value of the property to retranslate            
                textareaElem.value = translatedText;
                //PSS 25-03-2021 Fixed problem with description box issue #13
                textareaElem.style.height = 'auto';
                textareaElem.style.height = textareaElem.scrollHeight + 'px';
                // PSS 13-04-2021 removed the line below as it clears the content if you edit after use of translate button
                // textareaElem.style.overflow = 'auto' ;
            }
            else {
                // PSS 09-04-2021 added populating plural text
                console.debug('Row plural:', rowId);
                textareaElem1 = e.querySelector("textarea#translation_" + rowId + "_1");
                textareaElem1.innerText = translatedText;
                console.debug("plural newtext:", textareaElem1.innerText);
                textareaElem1.value = translatedText;
            }
            validateEntry(language, textareaElem);

        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            console.debug("issue with licence:", this.status);
            if (this.readyState == 4 && this.status == 400) {
                alert("Error in translation received status 400, maybe a license problem");
            }
            else if (this.readyState == 2 && this.status == 403) {
                alert("Error in translation received status 403, authorisation refused");
            }
        }
    };
    
    
    //let xhttp = new XMLHttpRequest();
    xhttp.open('POST', "https://api.deepl.com/v2/translate?auth_key=" + apikey + "&text=" + originalPreProcessed +"&target_lang=NL&preserve_formatting=1&split_sentences=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines");
    xhttp.responseType = 'json';
    xhttp.send();
   
    xhttp.onload = function () {
       let responseObj = xhttp.response;
    };

}


function sendAPIRequest(e, language, apikey, requestBody, original, originalPreProcessed,rowId,transtype) {
    console.debug('sendAPIreQuest original_line:', originalPreProcessed);
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let responseObj = JSON.parse(this.responseText);
            let translatedText = responseObj.data.translations[0].translatedText;
            console.debug('sendAPIRequest result before postProces:', translatedText);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "google");
            console.debug('sendAPIRequest translatedText after postProces:',translatedText);
            if (transtype == "single"){
               textareaElem = e.querySelector("textarea.foreign-text");
               textareaElem.innerText = translatedText;
               // PSS 13-04-2021 added populating the preview field issue #64
               let g = document.querySelector('td.translation');
               let previewElem = g.innerText; 
               console.debug('Text preview:',previewElem,rowId);
               let preview =  document.querySelector('#preview-'+rowId+' td.translation');
               preview.innerText = translatedText;
               // PSS 29-03-2021 Added populating the value of the property to retranslate            
               textareaElem.value = translatedText;
               //PSS 25-03-2021 Fixed problem with description box issue #13
               textareaElem.style.height = 'auto';
               textareaElem.style.height = textareaElem.scrollHeight + 'px'; 
               // PSS 13-04-2021 removed the line below as it clears the content if you edit after use of translate button
              // textareaElem.style.overflow = 'auto' ;
            }
            else {
            // PSS 09-04-2021 added populating plural text
            console.debug('Row plural:',rowId);
            textareaElem1 = e.querySelector("textarea#translation_" + rowId + "_1");
            textareaElem1.innerText = translatedText;
            console.debug("plural newtext:",textareaElem1.innerText);
            textareaElem1.value = translatedText; 
            }
            validateEntry(language,textareaElem);
            
        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            if (this.readyState == 4 && this.status == 400) {
                alert("Error in translation received status 400, maybe a license problem");
            }
        }
    };
    xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify(requestBody));
}

// PSS 01-30-2021 added this to prevent wrong replacement of searches
String.prototype.replaceAt = function (str, word, newWord) {
    console.debug("replaceAt:", '"' + word + '"');
    console.debug("replaceAt:", '"' + newWord + '"');
    if (word[0] === word[0].toUpperCase()) {
        newWord = newWord[0].toUpperCase() + newWord.slice(1);
    }
    console.debug("replaceAt:", str.replace(word, newWord));
    return str.replace(word, newWord);
};

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

const placeHolderRegex = new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&\w{2,6};|%\w*%/gi);
function preProcessOriginal(original, preverbs,translator) {
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
        if (index === 0) {
            console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    else if (translator == 'deepl') {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            original = original.replace(match[0], `<x>${index}</x>`);

            index++;
        }
        if (index === 0) {
            console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    console.debug("After pre-processing:", original);
    return original;
}


function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed,translator) {
    translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);
    console.debug("after processPLaceholderSpaces",translatedText);
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
            translatedText = translatedText.replaceAll(`<x>${index}</x>`, match[0]);
            index++;
        }

    }
    // replverb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
    }
    console.debug("after replace verbs",translatedText);
    // Make translation to start with same case (upper/lower) as the original.
    if (isStartsWithUpperCase(original)) {
        if (!isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toUpperCase() + translatedText.slice(1);
            console.debug('Applied upper case: ', translatedText);
        }
    }
    else {
        if (isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toLowerCase() + translatedText.slice(1);
            console.debug('Applied lower case: ', translatedText);
        }
    }
    
return translatedText;
}

// PSS 04-03-2021 Completely rewritten the processPlaceholderSpace function, because wrong replacements were made when removing blanks
function processPlaceholderSpaces(originalPreProcessed, translatedText) {
    if (originalPreProcessed === "") {
        console.debug('preprocessed empty');
    }
    console.debug("processPlaceholderSpaces not translated", originalPreProcessed);
    console.debug("processPlaceholderSpaces translated", translatedText);

    var placedictorg = {};
    var placedicttrans = {};
    var found = 0;
    var counter = 0;
    while (counter < 20) {
        // PSS 03-03-2021 find if the placeholder is present and at which position
        found = originalPreProcessed.search("[" + counter + "]");
        console.debug('processPlaceholderSpaces found start:', found, " ", '[' + counter + ']');
        if (found === -1) {
            break;
        }
        else {
            // PSS if at beginning of the line we cannot have a blank before
            if (found === 1) {
                part = originalPreProcessed.substring(found - 1, found + 3);
                placedictorg[counter] = part;
            }
            else if (found === (originalPreProcessed.length) - 3) {
                // PSS if at end of line it is possible that no blank is behind
                console.debug('found at end of line!!', found);
                part = originalPreProcessed.substring(found - 2, found + 2);
                placedictorg[counter] = part;
            }
            else {
                // PSS we are in the middle
                part = originalPreProcessed.substring(found - 2, found + 3);
                placedictorg[counter] = part;
            }
            console.debug("processPlaceholderSpaces at matching in original line:", '"' + part + '"');
        }
        counter++;
    }
    var lengteorg = Object.keys(placedictorg).length;
    if (lengteorg > 0) {
        counter = 0;
        while (counter < 20) {
            found = translatedText.search("[" + counter + "]");
            console.debug('processPlaceholderSpaces found in translatedText start:', found, " ", '[' + counter + ']');
            if (found === -1) {
                break;
            }
            else {
                // PSS if at beginning of the line we cannot have a blank before
                if (found === 1) {
                    part = translatedText.substring(found - 1, found + 3);
                    placedicttrans[counter] = part;
                }
                else if (found === (translatedText.length) - 3) {
                    // PSS if at end of line it is possible that no blank is behind
                    console.debug('found at end of line!!', found);
                    // 24-03-2021 find typo was placedictorg instead of placedicttrans
                    part = translatedText.substring(found - 2, found + 2);
                    console.debug('found string at end of line:',part);
                    placedicttrans[counter] = part;
                }
                else {
                    // PSS we are in the middle	
                    part = translatedText.substring(found - 2, found + 3);
                    placedicttrans[counter] = part;
                }
                console.debug("processPlaceholderSpaces at matching in translated line:", '"' + part + '"');
            }
            counter++;
        }
        counter = 0;
        // PSS here we loop through the found placeholders to check if a blank is not present or to much
        while (counter < (Object.keys(placedicttrans).length)) {
            console.debug("processPlaceholderSpaces found it in original:", counter, '"' + placedictorg[counter] + '"');
            console.debug("processPlaceholderSpaces found it in original:", originalPreProcessed);
            console.debug("processPlaceholderSpaces found it in trans:", counter, '"' + placedicttrans[counter] + '"');
            console.debug("processPlaceholderSpaces found it in trans", translatedText);
            orgval = placedictorg[counter];
            let transval = placedicttrans[counter];
            if (placedictorg[counter] === placedicttrans[counter]) {
                console.debug('processPlaceholderSpaces values are equal!');
            }
            else {
                console.debug('processPlaceholderSpaces values are not equal!:', '"' + placedictorg[counter] + '"', " " + '"' + placedicttrans[counter] + '"');
                console.debug('orgval', '"' + orgval + '"');
                if (orgval.startsWith(" ")) {
                    console.debug("processPlaceholderSpaces in org blank before!!!");
                    if (!(transval.startsWith(" "))) {
                        // 24-03-2021 PSS found another problem when the placeholder is at the start of the line
                        found = translatedText.search("[" + counter + "]");
                        console.debug('processPlaceholderSpaces found at :', found);
                        if (found != 1){
                           console.debug("processPlaceholderSpaces in trans no blank before!!!");
                           repl = transval.substr(0, 1) + " " + transval.substr(1,);
                           translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
                else {
                    transval = placedicttrans[counter];
                    repl = transval.substr(1,);
                    console.debug("processPlaceholderSpaces no blank before in org!");
                    if (transval.startsWith(" ")) {
                        console.debug("processPlaceholderSpaces apparently blank in front in trans!!!");
                        translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        console.debug("processPlaceholderSpaces blank in front removed in trans", translatedText);
                    }

                }
                if (!(orgval.endsWith(" "))) {
                    console.debug("processPlaceholderSpaces apparently in org no blank behind!!!");
                    console.debug('processPlaceholderSpaces values are not equal!:', '"' + orgval + '"', " ", '"' + transval + '"');
                    if (transval.endsWith(" ")) {
                        console.debug("processPlaceholderSpaces in trans blank behind!!!");
                        console.debug('processPlaceholderSpaces values are not equal!:', orgval, transval);
                        // 11-03 PSS changed this to prevent removing the blank if the translated is not at the end of the line
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        //23-03-2021 PSS added another improvement to the end of the line 
                        foundorg= originalPreProcessed.search("[" + counter + "]");
                        console.debug('found at:', found);
                        if (found != (originalPreProcessed.length) - 2) {
                            //if (foundorg===found){
                               repl = transval.substring(0, transval.length - 1);
                               translatedText = translatedText.replaceAt(translatedText, transval, repl);
                               console.debug("processPlaceholderSpaces blank in behind removed in trans", translatedText);
                            //}
                        }
                        else {
                            repl = transval.substring(0, transval.length) + " ";
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
                else {
                    if (!(transval.endsWith(" "))) {
                        console.debug("processPlaceholderSpaces no blank behind!!!");
                        // 11-03-2021 PSS changed this to prevent removing a blank when at end of line in trans
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        console.debug('found at:', found);
                        console.debug("length of line:", translatedText.length);
                        if (found != (translatedText.length) - 2) {
                            console.debug('found at end of line:', found);
                            repl = transval.substring(0, transval.length - 1) + " " + transval.substring(transval.length - 1,);
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                        else {
                            repl = transval.substring(0, transval.length) + " ";
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
            }
            counter++;
        }
    }
    else {
        console.debug("processPlaceholderBlank no placeholders found",translatedText);
        return translatedText;
    }
return translatedText;
}
