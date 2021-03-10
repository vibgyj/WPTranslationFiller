// This array is used to replace wrong words in translation
let replaceVerb = [];
// This array is used to replace verbs before translation
// It is also used to force google to translate informal
// This is done by replacing the formal word for a informal word
let replacePreVerb = [];

function setPreTranslationReplace(preTranslationReplace) {
    replacePreVerb = [];
    let lines = preTranslationReplace.split('\n');    
    lines.forEach(function (item) {
        // Handle blank lines
        if (item != "") {
        replacePreVerb.push(item.split(','));
       }
    });
}

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

function checkComments(comment){
     // PSS 09-03-2021 added check to see if we need to translate
    console.debug('checkComment started comment',comment);
    toTranslate = false
    switch(comment){
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
    
    
    console.debug('before googletranslate do we need to translate:',toTranslate);  
    return toTranslate;

}

function translatePage(apikey, destlang, postTranslationReplace,preTranslationReplace) {
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        toTranslate = true;
        // Check if the comment is present, if not then if will block the request for the details name etc.
        let element = e.querySelector('.source-details__comment');
        
        if (element != null){
           comment = e.querySelector('.source-details__comment p').innerText;
           //Need to remove the extra blanks
           comment = comment.trim();
           toTranslate = checkComments(comment);   
           console.debug('comment:',comment);
           toTranslate = checkComments(comment);   
        }
        console.debug('before googletranslate do we need to translate:',toTranslate);  

        if (toTranslate){
            googleTranslate(original, destlang, e, apikey,replacePreVerb);
            }
        else {
            
            translatedText = original;
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            console.debug('No need to translate copy the original',original);
        } 
    }

    // Translation completed
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    translateButton.className += " translated";
}

function translateEntry(rowId, apikey, destlang, postTranslationReplace, preTranslationReplace) {
    console.debug('translateEntry started!');
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    let toTranslate = true;
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    console.debug('after document querySelector:',e);
    let original = e.querySelector("span.original-raw").innerText;
    // Check if the comment is present, if not then if will block the request for the details name etc.   
    let element = e.querySelector('.source-details__comment');
    console.debug('checkComment started element',element);
    if (element != null){
       // Fetch the comment with name
       comment = e.querySelector('#editor-' + rowId + ' .source-details__comment p').innerText;
       toTranslate = checkComments(comment);   
    }   
    // If no comment is set we need to translate
    if (toTranslate){
        googleTranslate(original, destlang, e, apikey,replacePreVerb);
        }
    else {
        
        translatedText = original;
        let textareaElem = e.querySelector("textarea.foreign-text");
        textareaElem.innerText = translatedText;
        console.debug('No need to translate copy the original',original);
    }    

    // Translation completed
    let translateButton = document.querySelector(`#translate-${rowId}`);
    translateButton.className += " translated";
}

function googleTranslate(original, destlang, e, apikey, preverbs) {
    let originalPreProcessed = preProcessOriginal(original,preverbs);

    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    // console.log("Contains html.",myArray);

    if (myArray == null) {
        transtype = "text";
    }
    else {
        transtype = "html";
    }
    console.log("format type", transtype);

    let requestBody = {
        "q": originalPreProcessed,
        "source": "en",
        "target": destlang,
        "format": transtype
    };
    console.log("request body", requestBody);

    sendAPIRequest(e, destlang, apikey, requestBody, original);
}

function sendAPIRequest(e, language, apikey, requestBody, original) {
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let responseObj = JSON.parse(this.responseText);
            let translatedText = responseObj.data.translations[0].translatedText;
            console.debug("Translated text: ", translatedText);

            translatedText = postProcessTranslation(
                original, translatedText,replaceVerb);
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            validateEntry(language, textareaElem);
        }
        //PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
		else { 
            if (this.readyState == 4 && this.status == 400){
                alert("Error in translation received status 400, maybe a license problem");
                }
            }   
    };
    xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify(requestBody));
}

const placeHolderRegex = /%(\d{1,2}\$)?[sdl]{1}|&#\d{1,4};|&\w{2,6};/gi;
function preProcessOriginal(original, preverbs) {   
    // prereplverb contains the verbs to replace before translation
    for (let i = 0; i < preverbs.length; i++) {
        original = original.replaceAll(preverbs[i][0], preverbs[i][1]);
    }
    const pattern = new RegExp(placeHolderRegex);
    const matches = original.matchAll(pattern);
    let index = 0;
    for (const match of matches) {
        original = original.replace(match[0], `[${index}]`);

        index++;
    }
    
    console.debug("After pre-processing:", original);
    return original;
}

function postProcessTranslation(original, translatedText, replverb) {
    // replverb contains the verbs to replace
    for (let i = 0; i < replverb.length; i++) {
        translatedText = translatedText.replaceAll(replverb[i][0], replverb[i][1]);
    }

    // This section replaces the placeholders so they become html entities
    const pattern = new RegExp(placeHolderRegex);
    const matches = original.matchAll(pattern);
    let index = 0;
    for (const match of matches) {
        translatedText = translatedText.replaceAll(`[${index}]`, match[0]);

        index++;
    }

    // Make translation to start with same case (upper/lower) as the original.
    if (isStartsWithUpperCase(original)) {
        if (!isStartsWithUpperCase(translatedText))  {
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

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

// todo: This function needs to be fixed before being used. It has failing specs.
function processPlaceholderSpaces(original, translatedText) {
    console.log("placeholdercheck original", original);
    console.log("placeholdercheck translated", translatedText);
    // Just set to let it run once! 
    var placehold = [
        ["/(<.+?>)"]];
    var i = 0;
    var placedicttrans = {};
    // This can be removed as the regex finds all !!!
    while (i < placehold.length) {
        var placedicttrans = {};
        //tocheck = placehold[i][0] ;
        //console.log("placeholdercheck placeholder tocheck",tocheck);
        //var check = /%(\d{1,2}\$){0,2}[sd]|&.{1,5};
        //var check = /em>[a-z]\*/gi ;
        var check = /%(\d{1,2}\$){0,1}[sd]{1,1}/gi;
        //var check =placehold[i][0];
        //var check = /(<.+?>)/g ;
        console.log('placeholder', check);
        //var check = /%(\d{1,4}\${0,4})*/gi ;
        const pattern = new RegExp(check);
        console.log("placeholdercheck placeholder pattern", pattern);
        const matches = original.matchAll(pattern);
        var x = 0;
        var placedictorg = {};
        for (const match of matches) {
            console.log("placeholdercheck match in original", original);
            console.log("placeholdercheck match in translated", translatedText);
            console.log(`Found ${match[0]} start=${match.index} end=${match.index + match[0].length}.`);
            var start = match.index;
            eindcheck = match[0].length;
            console.log("placeholdercheck found match:", match[0]);
            //console.log("placeholdercheck found start:",start);
            //console.log("placeholdercheck found x:",x);				
            if (start == 0) {
                part = original.substring(start, eindcheck + 1);
                placedictorg[x] = part;
            }
            else {
                part = original.substring(start - 1, start + eindcheck + 1);
                placedictorg[x] = part;
            }
            console.log("placeholdercheck at begin in original line:", '"' + part + '"');
            x++;
        }
        lengte = Object.keys(placedictorg).length;
        if (lengte > 0) {
            console.log("placeholdercheck lengte original:", lengte);
            console.log("placeholdercheck original", original);
        }
        var x = 0;
        var placedicttrans = {};
        const matchtrans = translatedText.matchAll(pattern);
        for (const match of matchtrans) {
            console.log(`Found in trans ${match[0]} start=${match.index} end=${match.index + match[0].length}.`);
            var start = match.index;
            console.log("placeholdercheck found in trans:", start);
            eindcheck = match[0].length;
            if (start == 0) {
                part = translatedText.substring(start, eindcheck + 1);
                placedicttrans[x] = part;
            }
            else {
                part = translatedText.substring(start - 1, start + eindcheck + 1);
                placedicttrans[x] = part;
            }
            console.log("placeholdercheck at begin in trans:", placedicttrans[x]);
            x++;
        }
        var lengte = Object.keys(placedicttrans).length;
        if (lengte > 0) {
            console.log("placeholdercheck lengte translated:", lengte);
            console.log("placeholdercheck translated", translatedText);
            console.log("placeholdercheck translated");
        }
        else {
            console.log("placeholdercheck lengte 0")
        }
        var count = 0;
        var lengte = Object.keys(placedicttrans).length;
        if (lengte > 0) {
            while (count < Object.keys(placedicttrans).length) {
                console.log("placeholdercheck found them in original:", count, placedictorg[count]);
                console.log("placeholdercheck found them in", original);
                console.log("placeholdercheck found them in trans:", count, placedicttrans[count]);
                console.log("placeholdercheck found them in", translatedText);
                if (placedictorg[count].startsWith(" ")) {
                    console.log("placeholdercheck found blank in original at start", count, placedictorg[count]);
                    console.log("placeholdercheck found blank in original at start", count, placedicttrans[count]);
                    if (!placedicttrans[count].startsWith(" ")) {
                        console.log("placeholdercheck not found blank in translated", placedicttrans[count]);
                        console.log("placeholdercheck not found blank in", translatedText);
                        replwith = placedicttrans[count].substr(0, 1) + " " + placedicttrans[count].substr(1,)
                        translatedText = translatedText.replace(placedicttrans[count], replwith);
                        console.log("placeholdercheck not found blank in but now added", translatedText);
                        // below is needed after adding a blank otherwise the search is not working for the follwing actions!
                        //placedicttrans[count]=placedictorg[count];
                    }
                    else {
                        console.log("placeholdercheck found blank in translated at start", placedictorg[count]);
                    }
                }
                else {
                    console.log("placeholdercheck not found blank at start original", '"' + placedictorg[count] + '"');
                }
                if (placedictorg[count].endsWith(" ")) {
                    console.log("placeholdercheck found blank at end original", '"' + placedictorg[count] + '"');
                    console.log("placeholdercheck found at end translated", '"' + placedicttrans[count] + '"');
                    if (!placedicttrans[count].endsWith(" ")) {
                        console.log("placeholdercheck not found blank at end translated", placedicttrans[count]);
                        console.log("placeholdercheck not found blank at end", translatedText);
                        if (translatedText.indexOf((placedicttrans[count])) > 0) {
                            replwith = placedicttrans[count].substr(1, (placedicttrans[count].length - 1)) + " " + placedicttrans[count].substr((placedicttrans[count].length - 1));
                            console.log("placeholdercheck replaced end not at beginnen of line", replwith);
                        }
                        else {
                            console.log('length of placeholder', (placedicttrans[count].length), placedicttrans[count]);
                            replwith = placedicttrans[count].substr(0, (placedicttrans[count].length - 1)) + " " + placedicttrans[count].substr((placedicttrans[count].length - 1));
                            console.log("placeholdercheck replaced end is at beginnen of line", replwith);
                        }
                        console.log("placeholdercheck replaced end", replwith);
                        translatedText = translatedText.replace(placedicttrans[count], replwith);
                    }
                }
                else {
                    //It does not seem to end with a blank	
                    console.log("placeholdercheck not found blank at end", translatedText);
                    if (placedicttrans[count].endsWith(":")) {
                        console.log("placeholdercheck found : at end", original);
                        console.log("placeholdercheck found : at end", translatedText);
                        replwith = placedictorg[count].substr(0, (placedictorg[count].length));
                        search = placedicttrans[count].substr(0, (placedicttrans[count].length));
                        console.log("placeholdercheck search", search);
                        translatedText = translatedText.replace(search, replwith);
                        console.log("placeholdercheck not found blank at end but : now blank behind added", replwith);
                    }
                    else if (placedictorg[count].endsWith(",")) {
                        console.log("placeholdercheck not found blank at end original is , instead", '"' + placedictorg[count] + '"');
                        replwith = placedictorg[count];
                        search = placedicttrans[count].substr(0, (placedicttrans[count].length));
                        translatedText = translatedText.replace(search, replwith);
                    }
                    else {
                        console.log("placeholdercheck not found blank at end original and is no : instead", '"' + placedictorg[count] + '"');
                    }
                }
                //Sometimes there is a semicolon that went missing    				     
                if (placedicttrans[count].endsWith(":")) {
                    console.log("placeholdercheck not found blank at end original is : instead", '"' + placedictorg[count] + '"');
                    replwith = placedicttrans[count].substr(0, (placedicttrans[count].length)) + " " + placedicttrans[count].substr((placedicttrans[count].length));
                    console.log("placeholdercheck replaced end is at beginnen of line", replwith);
                    // translatedText = translatedText.replace(placedicttrans[count], replwith);
                }
                count++;
            }
        }
        i++;
    }
    // Last moment repair after fixing the blanks needs to be fixed elsewhere!!!
    // The dot at the end of the line is sometimes missing so add it
    if (original.endsWith(".")) {
        if (!translatedText.endsWith(".")) {
            translatedText = translatedText + '.';
        }
    }
    return translatedText;
}