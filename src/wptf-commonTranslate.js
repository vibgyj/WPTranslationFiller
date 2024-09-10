/**
 * This file includes all functions for translating commonly used
 */
var currWindow = "";
//document.addEventListener('DOMContentLoaded', setupEvents);
// This array is used to replace wrong words in translation
// PSS version 12-05-2021
let replaceVerb = [];
// This array is used to replace verbs before translation
// It is also used to force google to translate informal
// This is done by replacing the formal word for a informal word
let replacePreVerb = [];
// 06-05-2021 PSS These vars can probably removed after testing

function getCallerDetails() {
    const error = new Error();
    const stack = error.stack.split('\n').map(line => line.trim());

    // Make sure there are enough lines in the stack trace
    if (stack.length >= 4) {
        // The 3rd line (index 3) usually contains the calling function information
        const callerLine = stack[3];

        // Patterns to match stack traces with or without function names
        const match = callerLine.match(/at (.+?) \((.+):(\d+):(\d+)\)/) || 
                      callerLine.match(/at (.+):(\d+):(\d+)/);

        if (match) {
            const functionName = match[1] || 'Anonymous function';
            const fileName = match[2] || 'Unknown file';
            const lineNumber = match[3] || 'Unknown line';
            return `Caller: ${functionName}, File: ${fileName}, Line: ${lineNumber}`;
        }
    }

    return 'Unknown caller';
}




// Count words in a given string
function countWords(str) {
    const arr = str.split(' ');
    return arr.filter(word => word !== '').length;
}



function setPreTranslationReplace(preTranslationReplace) {
    replacePreVerb = [];
    if (preTranslationReplace != undefined) {
        let lines = preTranslationReplace.split("\n");
        lines.forEach(function (item) {
            // Handle blank lines
            if (item != "") {
                replacePreVerb.push(item.split(","));
            }
        });
    }
}

function setIgnoreSpellCheck() {

}
function setPostTranslationReplace(postTranslationReplace, formal) {
    // PSS 21-07-2022 Currently when using formal, the translation is still default #225
    replaceVerb = [];
    if (postTranslationReplace != undefined) {
        let lines = postTranslationReplace.split("\n");
        lines.forEach(function (item) {
            // Handle blank lines
            if (item != "") {
                if (formal) {
                    item = item.replace(/^##form:/,'')
                }
                else {
                    item = item.replace(/^##def:/,'')
                }
                if (item.startsWith("##") == false) {
                    replaceVerb.push(item.split(","));
                }
            }
        });
    }
}

const placeHolderRegex = new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&#x\d{1,4};|&\w{2,6};|%\w*%| # /gi);
const linkRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]<a[^>]*>|<span[^>]*>)/ig;
// the below regex is to prevent DeepL to crash or make no sence of the translation
const markupRegex = new RegExp(/<span[^>]*>|<a[^>]*>|&#[0-9]+;|&[a-z]+;|<ul>|<li>/g);
const specialChar = new RegExp(/ # | #|\#|&#->/ig);
function preProcessOriginal(original, preverbs, translator) {
    var index = 0;
    // prereplverb contains the verbs to replace before translation
    for (let i = 0; i < preverbs.length; i++) {
            if (!CheckUrl(original, preverbs[i][0])) {
                original = original.replaceAll(preverbs[i][0], preverbs[i][1]);
            }
    }
    // 15-05-2021 PSS added check for translator
    if (translator == "google") {
        const matches = original.matchAll(placeHolderRegex);
        if (matches != null) {
            index = 0;
            for (const match of matches) {
                original = original.replace(match, `[${index}]`);

                index++;
            }
        }
    }
    else if (translator == "deepl") {

        // Deepl does remove crlf so we need to replace them before sending them to the API
        //original = original.replaceAll('\r', "mylinefeed");
        original = original.replace(/(.!?\r\n|\n|\r)/gm, "<x>mylinefeed</x>");
        // Deepl does remove tabs so we need to replace them before sending them to the API
        //let regex = (/&(nbsp|amp|quot|lt|gt);/g);
        original = original.replaceAll(/(\t)/gm, "<x>mytb</x>");
       // original = original.replace(/(.!?\r\n|\n|\r)/gm, " [xxx] ");

        const matches = original.matchAll(placeHolderRegex);
        if (matches != null) {
            index = 0;
            for (const match of matches) {
                original = original.replace(match, `{replacevar${index}}`);
                index++;
            }
        }
        // We need to remove markup that contains & and ; otherwise translation will fail
        let markupmatches = original.match(markupRegex)
        if (markupmatches != null) {
            index = 1;
            for (const markupmatch of markupmatches) {
                //console.debug("before:",markupmatch)
                original = original.replace(markupmatch, `{mymark_var${index}}`);
                index++;
            }
        }
       // console.debug("original:",original)
        // 06-07-2023 PSS fix for issue #301 translation by OpenAI of text within the link
        const linkmatches = original.match(linkRegex);
        if (linkmatches != null) {
            index = 1;
            for (const linkmatch of linkmatches) {
                original = original.replace(linkmatch, `{linkvar${index}}`);
                original = original.replace('.{', '. {');
                index++;
            }
        }
        // DeepL does not like # and -> so we need to replace them before translating
        
        const charmatches = original.matchAll(specialChar);
        if (charmatches != null) {
            index = 1;
            for (const charmatch of charmatches) {
              //  console.debug("charmatch:", charmatch)
                original = original.replace(charmatch, `{special_var${index}}`);
                index++;
            }
        }
       
    }
    else if (translator == "microsoft") {
        // const matches = original.matchAll(placeHolderRegex);
        index = 0;
        if (index == 0) {
            //  console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    if (translator == "OpenAI") {
        const matches = original.matchAll(placeHolderRegex);
        if (matches != null) {
            index = 1;
            for (const match of matches) {
                original = original.replace(match, `{var ${index}}`);
                original = original.replace('.{', '. {');
                index++;
            }
        }
        // 06-07-2023 PSS fix for issue #301 translation by OpenAI of text within the link
        const linkmatches = original.match(linkRegex);
        if (linkmatches != null) {
            index = 1;
            for (const linkmatch of linkmatches) {
                original = original.replace(linkmatch, `{linkvar ${index}}`);
                original = original.replace('.{', '. {');
                index++;
            }
        }
    }
    return original;
}

function startsWithCapital(word) {
    return /[A-Z]/.test(word.charAt(0))
}

/**
 * Replace a specific word (which may include brackets or curly braces) in a string with a given replacement.
 * @param {string} str - The input string containing the word to be replaced.
 * @param {string} target - The target word to be replaced, which may include brackets or curly braces.
 * @param {string} replacement - The word to replace the target word with.
 * @returns {string} - The modified string with the target word replaced.
 */
function replaceWord(str, target, replacement) {
    // Create a dynamic regular expression to match the target word
    const escapedTarget = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape special characters in the target word
    const regex = new RegExp(escapedTarget, 'g'); // Create a global regular expression

    // Replace the target word with the replacement word
    return str.replace(regex, replacement);
}

function old_replaceWord(text, oldWord, newWord) {
    // Create a regular expression with word boundaries and global flag
    let regex = new RegExp(`\\b${oldWord}\\b`, 'g');
    return text.replace(regex, newWord);
}

function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, translator, convertToLower, spellCheckIgnore,locale) {
    var pos;
    var index = 0;
    var foundIgnore;
    //console.debug("before posrepl: '"+ translatedText +"'")
    let debug = false;
    if (debug == true) {
        console.debug("original: ", original);
        console.debug("translatedText :", translatedText);
        console.debug("replaceVerb :", replaceVerb);
        console.debug("originalPreProcessed :",originalPreProcessed);
        console.debug("spellCheckIgnore :", spellCheckIgnore);
        console.debug("translator :", translator);
    }
    if (originalPreProcessed != "") {
        translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);
    }
    
    // 09-05-2021 PSS fixed issue  #67 a problem where Google adds two blanks within the placeholder
    translatedText = translatedText.replaceAll("  ]", "]");
    // This section replaces the placeholders so they become html entities
    if (translator == "google") {
        const matches = original.matchAll(placeHolderRegex);
        if (matches != null) {
            index = 0;
            for (const match of matches) {
                translatedText = translatedText.replaceAll(`{${index}}`, match);
                index++;
            }
        }
    }
    else if (translator == "deepl") {
        const matches = original.matchAll(placeHolderRegex);
        if (matches != null) {
            index = 0;
            for (const match of matches) {
                translatedText = translatedText.replace(`{replacevar${index}}`, match);
                index++;
            }
        }
        // We need to replace & and ; before sending the string to DeepL, because DeepL does not hanle them but crashes
        const markupmatches = original.match(markupRegex);
        index = 1;
        if (markupmatches !=null ) {
            for (const markupmatch of markupmatches) {
                translatedText = translatedText.replace(`{mymark_var${index}}`, markupmatch);
                index++;
            }
        }
        
        // Deepl does remove crlf so we need to replace them after sending them to the API
        translatedText = translatedText.replaceAll("<x>mylinefeed</x>", "\n");
       // translatedText = translatedText.replaceAll("<x>mylinefeed</x>", "\n");
        // Deepl does remove tabs so we need to replace them after sending them to the API
        translatedText = translatedText.replaceAll("<x>mytb</x>", "\t");
        translatedText = translatedText.replaceAll("<x>semicolon</x>", ";");

        const linkmatches = original.match(linkRegex);
        //console.debug("linkmatches1:",linkmatches)
        if (linkmatches != null) {
            index = 1;
            for (const match of linkmatches) {
                translatedText = translatedText.replace(`{linkvar${index}}`, match);
                index++;
            }
        }
        const charmatches = original.matchAll(specialChar);
        if (charmatches != null) {
            index = 1;
            for (const charmatch of charmatches) {
                //console.debug("char:", charmatch)
                translatedText = translatedText.replace(`{special_var${index}}`, charmatch);
                index++;
            }
        }
        
    }
    else if (translator == "OpenAI") {
        const matches = original.matchAll(placeHolderRegex);
        index = 1;
        //console.debug("translated in OpenAI:",translatedText)
        for (const match of matches) {
          //  translatedText = translatedText.replace(`{var ${index}}`, match);
           index++;
        }
        // 06-07-2023 PSS fix for issue #301 translation by OpenAI of text within the link
        const linkmatches = original.match(linkRegex);
        //console.debug("linkmatches2:", linkmatches)
        if (linkmatches != null) {
            index = 1;
            for (const match of linkmatches) {
                translatedText = translatedText.replace(`{linkvar ${index}}`, match);
                index++;
            }
        }
        if (translatedText.endsWith(".") == true) {
            if (original.endsWith(".") != true) {
                translatedText = translatedText.substring(0, translatedText.length - 1)
            }
        }
        if (translatedText.startsWith("'") == true) {
            if (original.startsWith("'") != true) {
                translatedText = translatedText.substring(1, translatedText.length)
            }
        }
        if (translatedText.endsWith("'") == true) {
            if (original.endsWith("'") != true) {
                translatedText = translatedText.substring(0, translatedText.length - 1)
            }
        }
        if (translatedText.startsWith('"') == true) {
            if (original.startsWith('"') != true) {
                translatedText = translatedText.substring(1, translatedText.length)
            }
        }
        if (translatedText.endsWith('"') == true) {
            if (original.endsWith('"') != true) {
                translatedText = translatedText.substring(0, translatedText.length - 1)
            }
        }
        // OpenAI adds sometimes a "'" due to the placeholder at te beginning of the line like '<x>1</x>'
        // So we need to remove the "'"
        if (translatedText.startsWith("'") == true) {
           if (original.startsWith("'") != true) {
               translatedText = translatedText.substring(1, translatedText.length)
           }
        }
       // console.debug("orig:",original,translatedText)
        if (translatedText.endsWith("'") == true) {
            if (original.endsWith("'") != true) {
               translatedText = translatedText.substring(0, translatedText.length - 1)
            }
        }
    }
    //If convert to lower is not true, we need to check if there are hyphens present which do not belong there (word is in ignore list)
    // removing the hyphens is also done in lower_case function, so this needs improvement in future
    translatedText = check_hyphen(translatedText, spellCheckIgnore);
    //console.debug("aftercheck_hyphen:",translatedText)
    // check if there is a blank after the tag 
    pos=translatedText.indexOf("</a>");
    found = translatedText.substring(pos, pos + 5);
    if (found.substr(found.length - 1) != " ") {
        if (found.substr(found.length - 1) != "." && found.substr(found.length - 1) != "<" && found.length ==5) {
            translatedText = translatedText.replace("</a>", "</a> ");
        }
    }
    // check if there is a blank between end tag ">" and "." as Google ads that automatically
    // fix for issue #254
    pos = translatedText.indexOf("> .");
    if (pos != -1) {
        translatedText = translatedText.replace("> .", ">");
    }
    // replaceVerb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        // 30-12-2021 PSS need to improve this, because Deepl does not accept '#' so for now allow to replace it
        if (replaceVerb[i][1] != '#' && replaceVerb[i][1] != '&') {
                // PSS solution for issue #291
            //console.debug("repl:", "'"+replaceVerb[i][0]+"'")
            replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
            //console.debug("match in URL:", CheckUrl(translatedText, replaceVerb[i][0]), translatedText,replaceVerb[i][0])

            if (!CheckUrl(translatedText, replaceVerb[i][0])) {
               // console.debug("replaceverb:", replaceVerb[i][0], " ", replaceVerb[i][1])
                translatedText = replaceWord(translatedText, replaceVerb[i][0], replaceVerb[i][1]);
               // translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
            }
        }
        else {
            // PSS solution for issue #291
            replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
            if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
            }
        }
    }
    //console.debug("after replace verb:",translatedText)
    // for short sentences sometimes the Capital is not removed starting from the first one, so correct that if param is set
    if (convertToLower == true) {
        translatedText = convert_lower(translatedText, spellCheckIgnore);
        // if the uppercase verbs are set to lower we need to reprocess the sentences otherwise you need to add uppercase variants as well!!
        for (let i = 0; i < replaceVerb.length; i++) {
            // 30-12-2021 PSS need to improve this, because Deepl does not accept '#' so for now allow to replace it
            if (replaceVerb[i][1] != '#' && replaceVerb[i][1] != '&') { 
                // PSS solution for issue #291
                replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
                if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                    translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                }
            }
            else {
                // PSS solution for issue #291
                replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
                if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                    translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                }
            }
        }
    }
    // check if a sentence has ": " and check if next letter is uppercase
    // maybe more locales need to be added here, but for now only Dutch speaking locales have this grammar rule
    if (locale == "nl" || locale == "nl-be") {
        pos = translatedText.indexOf(": ");
        let positionOfFirstBlank = findFirstBlankAfter(translatedText, pos +2);
        if (positionOfFirstBlank !== -1) {
            if (typeof spellCheckIgnore != 'undefined') {
                lines = spellCheckIgnore.split("\n");
            }
            // we need the complete word to check if it is in the ignore list before setting it to lowercase
            let checkword = translatedText.substr(pos + 2, positionOfFirstBlank - (pos + 2))
            if (lines.indexOf(checkword) != -1) {
                foundIgnore = true
            }
            else {
                foundIgnore = false
            }
        } else {
              foundIgnore = false;
        }

        if (pos != -1) {
            // if we find the semicolon, then determine next char after the blank, and check if the word after semicolon is not all capitals
            let allUpper = false;
            upper = translatedText.substr(pos + 2, 2).toUpperCase();
            if ((translatedText.substr(pos + 2, 2) == upper) == true) {
                allUpper = true;
            }
            let mychar = translatedText.substr(pos + 2, 1)
            if (allUpper != true && foundIgnore == false) {
                translatedText = translatedText.substring(0, pos + 2) + mychar.toLowerCase() + translatedText.substring(pos + 3);
            }
        }
    }
    if (locale == "nl" || locale == "nl-be") {
        pos = translatedText.indexOf("; ");
        if (pos != -1) {
            // if we find the semicolon, then determine next char after the blank
            let mychar = translatedText.substr(pos + 2, 1)
            translatedText = translatedText.substring(0, pos + 2) + mychar.toLowerCase() + translatedText.substring(pos + 3);
        }
    }
    // check if the returned translation does have the same start/ending as the original
    let previewNewText = translatedText
    result = check_start_end(translatedText, previewNewText, 0, "", original, "", 0);
    //console.debug("after checking:", result, result.translatedText)
    translatedText = result.translatedText;
   // console.debug("end of post:",translatedText)
    return translatedText;
}

function check_hyphen(translatedText,spellCheckIgnore){
    var lines = [];
    var myword;
    if (typeof spellCheckIgnore != 'undefined') {
        lines = spellCheckIgnore.split("\n");
    }
    let capsArray = []
    let wordsArray = translatedText.split(' ')
    wordsArray.forEach(word => {
        //console.debug("word:", word)
        if (word != "->") {
            myword = word.split("-");
            //console.debug("myword:",myword)
            if (myword.length == 1) {
                // we need to check what char the word ends, otherwise it will not be found in the ignore list
                if (word.endsWith(".") || word.endsWith(":") || word.endsWith(";") || word.endsWith("!") || word.endsWith("?") || word.endsWith(",")) {
                    checkword = word.substr(0, word.length - 1)
                }
                else {
                    checkword = word
                }
            }
            else {
                //we need to remove wrong characters at the start of the word
                if (myword[0].startsWith("(")) {
                    checkword = myword[0].substr(1, myword[0].length)
                }
                else {
                    checkword = myword[0];
                }
            }
            // check if the word is in the ignore list, if not we remove the "-" by a blank as it does not belong into the word
            // but we should not do that within a link!!
            //console.debug("in :", lines.indexOf(checkword))
            if (lines.indexOf(checkword) != -1) {
                // console.debug("we found in ignorelist:",checkword,word)
                if (word != "--" && word != "-")
                    // if the word is a URL we do not remove the "-"
                    // if (word.substr('http') == -1) {
                    word = word.replace("-", " ")
                // }
            }
            capsArray.push(word)
        }
        else {
            capsArray.push(word)
        }
    })
    converted = capsArray.join(' ');
    //console.debug("converted:",converted)
    return converted
}

function capt(word) {
    return word
        .toLowerCase()
        .replace(/\w/, firstLetter => firstLetter.toUpperCase());
}

// check if the provided string has more then one Capital
function isUpperCase(myString, pos) {
    return (myString.charAt(pos) == myString.charAt(pos).toUpperCase());
}

function convert_lower(text, spellCheckIgnore) {
    var myword;
    // if the word is found in spellCheckIgnore, then the uppercasing should not be applied
    // Sometimes the word contains a '-', then we only need to find the first part
    //console.debug("text:", "'" + text + "'")
    text = text.trim()
    let wordsArray = text.split(' ')
    //console.debug("wordsArray after split:",wordsArray)
    let capsArray = []
    var counter = 0;
    //var myword = "";
    var cleanword;
    var allUpper;
    var myword;
    var searchword;
    var upper;
    // We need to convert the ignore tabel in an array to find an exact match of the word
    let lines = spellCheckIgnore.split("\n");
    wordsArray.forEach(word => {
        // do not convert the first word in sentence to lowercase
        if (counter != 0) {
            if (word != "") {
                //console.debug("word in the middle:",word)
                // if the word contains "--" or single "-" we do not split it
                if (word != "--" && word != "-") {
                    // for some words we do not want to remove the "-", then we need to put it into the ignore list
                    myword = word.split("-");
                   // console.debug("myword:", myword)
                    if (myword.length == 1) {
                        if (word.endsWith(".") || word.endsWith(":") || word.endsWith(";") || word.endsWith("!") || word.endsWith("?") || word.endsWith(",")) {
                            checkword = word.substr(0, word.length - 1)
                        }
                        else {
                            checkword = word
                        }
                    }
                    else {
                        checkword = myword[0];
                    }
                    // check if the first letter of the word is a capital and it is not in the ignorelist
                    allUpper = false;
                    // is a word constains "',s" we need to remove itg, otherwise the result is wrong example API's
                    if (checkword.endsWith("'s")){
                        checkword = checkword.replace("'s","")
                    }
                    // convert the word to all upper
                    upper = checkword.toUpperCase();
                   
                    // console.debug("word counter !0:",cleanword,upper,(cleanword == upper))
                    if ((checkword == upper) == true) {
                        allUpper = true;
                    }
                    if (lines.indexOf(checkword) === -1) {
                        if (allUpper != true) {
                            if (startsWithCapital(word)) {
                                capsArray.push(word[0].toLowerCase() + word.slice(1));
                            }
                            else {
                                capsArray.push(word)
                            }
                        }
                        else {
                            capsArray.push(word)
                            }
                    }
                    else {
                        //it is in the ignore list so keep the first letter as capital
                        capsArray.push(word)
                    }
                }
                else {
                    // we have a single "--" or "-"
                    capsArray.push(word)
                }
            }
        }
        else {
            // it is the first word of the sentence
            // 07-01-2022 PSS fixed issue #170 undefined UpperCase error
            // first letter of the word, but do nothing with it as it is empty
            if (word != "") {
                //if (typeof word[0] != "undefined") {
                let lines = spellCheckIgnore.split("\n");
                if (word.endsWith(".") || word.endsWith(",") || word.endsWith("!") || word.endsWith("?") || word.endsWith(")")) {
                    searchword = word.substr(0, (word.length) - 1)
                }
                else {
                    searchword = word
                }
                if (lines.indexOf(searchword) === -1) {
                    capsArray.push(word[0].toLowerCase() + word.slice(1));
                }
                else {
                     capsArray.push(word);
                }
            }
        }
     counter++;
    });
    converted = capsArray.join(' ');
    // Because now all sentences start with lowercase in longer texts, we need to put back the uppercase at the start of the sentence
    converted = applySentenceCase(converted);
    return converted
}

function removeTags(str) {
    if ((str === null) || (str === ''))
        return false;
    else
        str = str.toString();

    // Regular expression to identify HTML tags in
    // the input string. Replacing the identified
    // HTML tag with a null string.
    return str.replace(/(<([^>]+)>)/ig, '');
}

function applySentenceCase(str) {
    //25-03-2023 PSS improved capitalizing first letter in sentence
    //03-08-2023 Fixed the problem with tabs present in the text, which were not added
    // So the regex needed to be altered to include the tabs
    var mySentences = str.match(/[^.?!\/t]*[^.!?\s][^.!?\n]*(?:[.!?](?!['\"]?\s|$)[^.!?]*)*[.!?]?['\"]?(?=\s|$)/gm)
   // var mySentences = str.match(/[^.!?\s][^.!?\n]*(?:[.!?](?!['"]?\s|$)[^.!?]*)*[.!?]?['"]?(?=\s|$)/gm);
    if (mySentences != null) {
        for (let i = 0; i < mySentences.length; i++) {
            if (!mySentences[i][0].startsWith(" ")){
                mySentences[i] = mySentences[i][0].toUpperCase() + mySentences[i].substring(1,);
            }
            else {
                // 03-08-2023 PSs fixed a problem where the second sentence did not get converted back to uppercase because it started with a blanc
                mySentences[i] = mySentences[i][1].toUpperCase() + mySentences[i].substring(2,)
            }
        }
        mySentences = mySentences.join(' ');
        str = mySentences;
        //sometimes a blank is present before the "." which is not OK
        str = str.replaceAll(' .', '.')
    } else {
        console.debug("Regex error !");
    }
    return str
}

function CheckUrl(translated, searchword) {
    // check if the text contains an URL
    // not only check http strings but also links starting with <a and starting with <span
    // also check for class= to prevent replaments in class name
    const mymatches = translated.match(/\b((https?|http?|ftp|file):\/\/|(www|ftp)\.)[-A-Z0-9+&@#\/%?=~_|$!:,.;]*[A-Z0-9+&@#\/%=~_|$]|<a[^>]*>|class=\"[^\"]*\"|<span[^>]*>/ig);
        if (mymatches != null) {
            for (const match of mymatches) {
                foundmysearch = match.includes(searchword);
                if (foundmysearch) {
                    foundmysearch = true
                   // console.debug("found an url!:",translated)
                    break;
                }
            }
        }
        else {
            //console.debug("did not find an url:",translated)
            foundmysearch = false;
        }
    return foundmysearch;
}

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

function checkComments(comment) {
    // PSS 09-03-2021 added check to see if we need to translate
    //console.debug("comment:",comment)
    let toTranslate = false;
    switch (comment) {
        case "Plugin Name of the plugin/theme":
            toTranslate = false;
            break;
        case "Plugin name.":
            toTranslate = false;
            break;
        case "Plugin Name of the plugin":
            toTranslate = false;
            break;
        case "Author of the plugin":
            toTranslate = false;
            break;
        case "Plugin Name of the plugin Author of the plugin":
            toTranslate = false;
            break;
        case "Plugin URI of the plugin":
            toTranslate = false;
            break;
        case "Author URI of the plugin":
            toTranslate = false;
            break;
        case "Theme Name of the theme":
            toTranslate = false;
            break;
        case "Theme Name of the plugin/theme":
            toTranslate = false;
            break;
        case "Author of the theme":
            toTranslate = false;
            break;
        case "Theme URI of the theme":
            toTranslate = false;
            break;
        case "Theme URI of the plugin/theme":
            toTranslate = false;
            break;
        case "Author URI of the theme":
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
    var translated = "";
    res = await listRec(original).then(function (v) {
        translated = v;
    }).catch(function (err) {
        console.debug("Error retrieving pretrans", err.message);
    });
    if (typeof translated == "undefined") {
        translated = "notFound";
    }
    else if (typeof translated == "object") {
        translated = "notFound";
    }
    else if (translated == "") {
        translated = "notFound";
    }
    else {
        console.debug("pretranslate line found:", translated);
        //translated = res;
    }
    return translated;
}


function checkFormalPage(dataFormal) {
    //console.debug('postrepl content:', dataFormal)
    //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
    var formal = checkFormal(false);
    setPostTranslationReplace(dataFormal,formal);
    //console.debug("CheckFormal started")
    // 15-05-2021 PSS added fix for issue #73add
    var replaced = false;
    if (dataFormal.length != 0 && dataFormal != "undefined") {
        //setPreTranslationReplace(preTranslationReplace);
        let countreplaced = 0;
        var translatedText = "";
        var repl_verb = "";
        for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            replaced = false;
            let original = e.querySelector("span.original-raw").innerText;
            let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
            let row = rowfound.split("-")[1];
            let newrow = rowfound.split("-")[2];
            if (typeof newrow != "undefined") {
                newrowId = row.concat("-", newrow);
                row = newrowId;
            }
            else {
                rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
                let row = rowfound.split("_")[1];
            }
            // 30-08-2021 PSS fix for issue # 125
            let precomment = e.querySelector(".source-details__comment p");
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
                // If in the original field "Singular is present we have a plural translation                
                var pluralpresent = document.querySelector(`#preview-${row} .translation.foreign-text li:nth-of-type(1) span.translation-text`);
               // console.debug("plural:",pluralpresent)
                if (pluralpresent != null) {
                    transtype = "plural";
                }
                else {
                    transtype = "single";
                }
                // Fetch the translations
                let element = e.querySelector(".source-details__comment");
                let textareaElem = e.querySelector("textarea.foreign-text");
                if (transtype == "single") {
                    translatedText = textareaElem.innerText;
                }

                if (transtype == "single") {
                    // Enhencement issue #123
                    previewNewText = textareaElem.innerText;
                    // Need to replace the existing html before replacing the verbs! issue #124
                    // previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                    result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced,original,countrows);
                    previewNewText = result.previewNewText;
                    translatedText = result.translatedText;
                    countreplaced = result.countreplaced;
                    replaced = result.replaced;
                    orgText = result.orgText;
                    repl_verb = result.repl_verb;
                    repl_arry = result.repl_array
                    
                    // PSS 22-07-2021 fix for the preview text is not updated #109
                    if (replaced) {
                        if (currec != null) {
                            var current = currec.querySelector("span.panel-header__bubble");
                            var prevstate = current.innerText;
                            current.innerText = "transFill";
                        }
                        textareaElem.innerText = translatedText;
                        textareaElem.value = translatedText;
                        //console.debug("found single!");
                        let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
                        let row = rowfound.split("-")[1];
                        let myrow = row;
                        let newrow = rowfound.split("-")[2];
                        if (newrow != "undefined") {
                            newrowId = row.concat("-", newrow);
                            row = newrowId;
                        }
                        // below changes are necessary to populate replaced verbs on table that has not been saved
                        var preview = document.querySelector("#preview-" + newrowId + " td.translation");
                        if (preview == null) {
                            preview = document.querySelector("#preview-" + myrow + " td.translation");
                           
                        }
                        // PSS we need to remove the current span, as the mark function adds one again
                        // PSS fix for issue #157
                        var span = document.querySelector("#preview-" + newrowId + " td.translation span.translation-text");
                        if (span == null) {
                            span = document.querySelector("#preview-" + myrow + " td.translation span.translation-text");
                        }
                        if (span != null) {
                            span.remove();
                        }
                        // Enhancement issue #123
                        var myspan1 = document.createElement("span");
                        myspan1.className = "translation-text";
                        preview.appendChild(myspan1);
                        myspan1.appendChild(document.createTextNode(previewNewText));

                        preview = document.querySelector("#preview-" + newrowId + " td.translation");
                        if (preview != null) {
                            // PSS populate the preview before marking
                            preview.innerText = DOMPurify.sanitize(previewNewText);
                        }
                        else {
                            preview = document.querySelector("#preview-" + myrow + " td.translation");
                        }
                        // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                        markElements(preview, replaceVerb, orgText, spellcheckIgnore,repl_array);
                    }
                }
                else {
                    // plural line 1
                    let previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(1) span.translation-text");
                    previewNewText = previewElem.innerText;
                    translatedText = previewElem.innerText;
                   // console.debug("plural1 found:",previewElem,translatedText);
                    result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced,original,countrows);
                    previewNewText = result.previewNewText;
                    translatedText = result.translatedText;
                    countreplaced = result.countreplaced;
                    replaced = result.replaced;
                    orgText = result.orgText;
                    repl_verb = result.repl_verb;
                    if (replaced) {
                        previewElem.innerText = previewNewText;
                        let g = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                        // if current translation we need to split the rownumber
                        let newrowId = row.split("-")[0];
                        textareaElem1 = g.querySelector("textarea#translation_" + newrowId + "_0");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                        // Highlight all keywords found in the page, so loop through the replacement array
                        // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                        markElements(previewElem, replaceVerb, orgText, spellcheckIgnore,repl_verb);
                    }
                    // plural line 2
                    previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(2) span.translation-text");
                   // console.debug("plural2:", previewNewText, translatedText);
                    if (previewElem != null) {
                        previewNewText = previewElem.innerText;
                        translatedText = previewElem.innerText;
                      //  console.debug("plural2:", previewNewText, translatedText);
                        result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced,original,countrows);
                        previewNewText = result.previewNewText;
                        translatedText = result.translatedText;
                        countreplaced = result.countreplaced;
                        replaced = result.replaced;
                        repl_verb = result.repl_verb;
                        if (replaced) {
                            // PSS fix for #188 label Transfill needs to be set
                            let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                            if (currec != null) {
                                var current = currec.querySelector("span.panel-header__bubble");
                                var prevstate = current.innerText;
                                current.innerText = "transFill";
                            }
                            previewElem.innerText = previewNewText;
                            let f = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                            // if current translation we need to split the rownumber
                            let rowId = row.split("-")[0];
                            textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                            if (textareaElem1 != null) {
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = translatedText;
                                // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                                markElements(previewElem, replaceVerb, orgText, spellcheckIgnore,repl_verb);
                            }
                        }
                    }
                }
                if (replaced) {
                    // Only update the style if verbs are replaced!!
                    let wordCount = countreplaced;
                    let percent = 10;
                    let toolTip = "";
                    result = { wordCount, percent, toolTip };
                    updateStyle(textareaElem, result, "", true, false, false, row,'',false,false,'',[],'','',false);
                }
            }
        }

        messageBox("info", "Replace verbs done " + countreplaced + " replaced" + " words<br>" + repl_verb);
        // Translation replacement completed
        let checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
        checkButton.className += " ready";
    }
    else {
        messageBox("error", "Your postreplace verbs are not populated add at least on line!");
    }
}

async function checkPage(postTranslationReplace, formal, destlang, apikeyOpenAI, OpenAIPrompt, spellcheckIgnore,showHistory) {
    var timeout = 10;
    var countrows = 0;
    var tableRecords = 0;
    var orgText = ""
    var progressbar = "";
    var countreplaced = 0;
    var wordCount = 0;
    var recWordCount = 0;
    var replaced = false;
    var row;
    var newrowId;
    var myrow;
    var result;
    var preview;
    var previewElem1;
    var previewElem2;
    var prev_trans;
    //var spellcheckIgnore = [];
    var repl_verb = []; //contains the list of found and replaced words
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    var myheader = document.querySelector('header');
   // setPostTranslationReplace(postTranslationReplace, formal);
    progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar == null) {
        myheader.insertAdjacentHTML('beforebegin', template);
       // progressbar = document.querySelector(".indeterminate-progress-bar");
       // progressbar.style.display = 'block';
    }
    else {
        progressbar.style.display = 'block';
    }
    //15-10- 2021 PSS enhencement for Deepl to go into formal issue #152
    var formal = checkFormal(false);
    setPostTranslationReplace(postTranslationReplace, formal);
   // console.debug('repl:',replaceVerb,formal)
    // 15-05-2021 PSS added fix for issue #73add
    
    var checkButton = await document.querySelector(".wptfNavBarCont a.check_translation-button");
    checkButton.innerText = "Checking";
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (checkButton.className == "check_translation-button") {
        checkButton.className += " started";
    }
    else {
       // console.debug("checkbutton2:", typeof checkButton)
        if (typeof checkbutton != null) {
            checkButton.classList.remove("check_translation-button", "started", "translated");
            checkButton.classList.remove("check_translation-button", "restarted", "translated");
            checkButton.className = "check_translation-button restarted";
        }
            else {
                checkButton.className = "check_translation-button started"
            }
    }
    
    if (postTranslationReplace.length != 0 && postTranslationReplace != "undefined") {
        //setPreTranslationReplace(preTranslationReplace);
        var translatedText = "";
        tableRecords = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content").length;
        for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {

            countrows++;
            //  setTimeout(() => {
            replaced = false;
            let original = e.querySelector("span.original-raw").innerText;
            let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
            row = rowfound.split("-")[1];
            let newrow = rowfound.split("-")[2];
            if (typeof newrow != "undefined") {
                newrowId = row.concat("-", newrow);
                row = newrowId;
            }
            else {
                rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
                row = rowfound.split("_")[1];
            }
            let spanmissing = document.querySelector(`#preview-${row} span.missing`);
            // If the page does not contain translations, we do not need to handle them
            if (spanmissing == null) {
                // 30-08-2021 PSS fix for issue # 125
                let precomment = e.querySelector(".source-details__comment p");
                if (precomment != null) {
                    comment = precomment.innerText;
                    comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                    toTranslate = checkComments(comment.trim());
                }
                else {
                    toTranslate = true;
                }
                if (toTranslate == true) {
                    // Check if it is a plural
                    // If in the original field "Singular is present we have a plural translation                
                    var pluralpresent = document.querySelector(`#preview-${row} .translation.foreign-text li:nth-of-type(1) span.translation-text`);
                    if (pluralpresent != null) {
                        transtype = "plural";
                    }
                    else {
                        transtype = "single";
                    }
                    mypreview = document.querySelector("#preview-" + newrowId);
                    if (mypreview == null) {
                        mypreview = document.querySelector("#preview-" + row);
                    }
                    if (transtype == "single") {
                        // Fetch the translations
                        let element = e.querySelector(".source-details__comment");
                        let textareaElem = e.querySelector("textarea.foreign-text");
                        translatedText = textareaElem.innerText;
                        prev_trans = textareaElem.innerText;        
                        
                        if (translatedText != "No suggestions") {
                            previewNewText = textareaElem.innerText;
                            let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                            // PSS we need to check for missing periods en blanks before replacing verbs 
                            //console.debug("before check_start:",translatedText)
                            result = await check_start_end(translatedText, previewNewText, recWordCount, repl_verb, original, replaced, countrows);
                            replaced = result.replaced;
                            repl_array = result.repl_array;
                            if (replaced) {
                                preview = document.querySelector("#preview-" + newrowId + " span.translation-text");
                                if (preview == null) {
                                    preview = document.querySelector("#preview-" + row + " span.translation-text");
                                }
                                mypreview.classList.replace("status-current", "status-waiting");
                                mypreview.classList.add("wptf-translated");
                                repl_verb = result.repl_verb;
                                recWordCount += result.countReplaced;
                                previewNewText = result.previewNewText
                                if (preview != null) {
                                    preview.innerHTML = result.previewNewText
                                    textareaElem.innerText = result.previewNewText;
                                }
                                else {
                                    console.debug("preview is null!:",row, newrowId, typeof preview)
                                }

                                // PSS this needs to be improved
                                //let repl = []
                                //let rec = '.,.'
                                //repl.push(rec.split(","))
                                //rec = ' , '
                                // repl.push(rec.split(","))
                                preview = document.querySelector("#preview-" + newrowId + " span.translation-text");
                                if (preview == null) {
                                    preview = document.querySelector("#preview-" + row + " span.translation-text");
                                }

                                await markElements(preview, repl_array, original, spellcheckIgnore, repl_array, translatedText);
                                // 09-09-2022 PSS fix for issue #244
                                if (currec != null) {
                                    var current = currec.querySelector("span.panel-header__bubble");
                                    var prevstate = current.innerText;
                                    current.innerText = "transFill";
                                    //####
                                }
                               
                                // Only update the style if verbs are replaced!!
                                let wordCount = recWordCount;
                                let percent = 10;
                                let toolTip = "";
                                result = { wordCount, percent, toolTip };
                                old_status = document.querySelector("#preview-" + row);
                                // textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status, showDiff) {
                                updateStyle(textareaElem, result, "", 'True', false, false, row, e, showHistory, true, translatedText, repl_array, prev_trans,old_status,false)
                            }

                            // Need to replace the existing html before replacing the verbs! issue #124
                            // previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                            // let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                            result = await replElements(translatedText, previewNewText, replaceVerb, repl_verb, "", original, countrows);
                            previewNewText = result.previewNewText;
                            translatedText = result.translatedText;
                            // countreplaced += result.countreplaced;
                            replaced = result.replaced;
                            orgText = result.orgText;

                            // PSS 22-07-2021 fix for the preview text is not updated #109
                            preview = document.querySelector("#preview-" + newrowId + " td.translation");
                            if (preview == null) {
                                preview = document.querySelector("#preview-" + myrow + " td.translation");
                            }
                            if (replaced) {
                                if (currec != null) {
                                    var current = currec.querySelector("span.panel-header__bubble");
                                    var prevstate = current.innerText;
                                    current.innerText = "transFill";
                                }
                                mypreview.classList.replace("status-current", "status-waiting");
                                mypreview.classList.add("wptf-translated");
                                repl_verb = result.repl_verb;
                                repl_array = result.repl_array
                                recWordCount += result.countreplaced;
                                textareaElem.innerText = translatedText;
                                textareaElem.value = translatedText;
                                let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
                                let row = rowfound.split("-")[1];
                                let myrow = row;
                                let newrow = rowfound.split("-")[2];
                                if (newrow != "undefined") {
                                    newrowId = row.concat("-", newrow);
                                    row = newrowId;
                                }
                                // PSS we need to remove the current span, as the mark function adds one again
                                // PSS fix for issue #157
                                let span = document.querySelector("#preview-" + newrowId + " td.translation span.translation-text");
                                if (span == null) {
                                    span = document.querySelector("#preview-" + myrow + " td.translation span.translation-text");
                                }
                                if (span != null) {
                                    span.remove();
                                }
                                // Enhancement issue #123
                                var myspan1 = document.createElement("span");
                                myspan1.className = "translation-text";
                                preview = document.querySelector("#preview-" + newrowId + " td.translation");
                                if (preview == null) {
                                    preview = document.querySelector("#preview-" + myrow + " td.translation");
                                }
                                // if there is no preview for the plural, we do not need to populate it
                                if (preview != null) {
                                    preview.appendChild(myspan1);
                                    myspan1.appendChild(document.createTextNode(previewNewText));
                                    // PSS populate the preview before marking
                                    preview.innerText = DOMPurify.sanitize(previewNewText);
                                    // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                                    await markElements(preview, repl_verb, orgText, spellcheckIgnore, repl_array, prev_trans);
                                }
                            }

                        }
                        else {
                            replaced = false;
                        }
                        let plural_line = "";
                    }
                    else {
                        // plural line 1
                        replaced = false;
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        previewElem = document.querySelector(`#preview-${row} .translation.foreign-text`)
                        let my_li = previewElem.getElementsByTagName("li")
                        previewElem1 = my_li[0].querySelector("span.translation-text")
                        previewElem2 = my_li[1].querySelector("span.translation-text")
                        previewNewText = previewElem1.innerText;
                        translatedText = previewElem1.innerText;
                        if (translatedText != "No suggestions") {
                            result = await check_start_end(translatedText, previewNewText, recWordCount, repl_verb, original, replaced, countrows);
                            replaced = result.replaced;
                            repl_array = result.repl_array;
                            if (replaced) {
                                recWordCount += result.countReplaced;
                                repl_verb = result.repl_verb;
                                previewElem1.innerHTML = result.previewNewText
                                previewElem1.innerText = result.previewNewText
                                previewElem1.value = result.previewNewText
                                // we have updatet the text of the first plural, so we need to update the var
                                previewNewText = result.previewNewText
                                let g = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                                // if current translation we need to split the rownumber
                                let newrowId = row.split("-")[0];
                                textareaElem1 = g.querySelector("textarea#translation_" + newrowId + "_0");
                                let editor_text = result.previeNewText.replace("S")
                                textareaElem1.innerText = result.previewNewText;
                                textareaElem1.value = result.previewNewText;
                                // PSS this needs to be improved
                                let repl = []
                                let rec = '.,.'
                                repl.push(rec.split(","))
                                //rec = ' , '
                                // repl.push(rec.split(","))

                                await markElements(previewElem1, repl_array, orgText, spellcheckIgnore, repl_array, translatedText);
                                // 09-09-2022 PSS fix for issue #244
                                if (currec != null) {
                                    var current = currec.querySelector("span.panel-header__bubble");
                                    var prevstate = current.innerText;
                                    current.innerText = "transFill";
                                }
                                // Only update the style if verbs are replaced!!
                                let wordCount = recWordCount;
                                let percent = 10;
                                let toolTip = "";
                                result = { wordCount, percent, toolTip };
                                old_status = document.querySelector("#preview-" + row);
                                updateStyle(textareaElem, result, "", 'True', false, false, row, e, showHistory, true, translatedText, repl_array, prev_trans, old_status, false);
                            }

                            result = await replElements(translatedText, previewNewText, replaceVerb, repl_verb, "", original, countrows);
                            replaced = result.replaced;
                            orgText = result.orgText;
                            if (replaced) {
                                mypreview.classList.replace("status-current", "status-waiting");
                                mypreview.classList.add("wptf-translated");
                                recWordCount += result.countreplaced;
                                repl_verb += result.repl_verb
                                previewElem1.innerHTML = result.previewNewText
                                previewElem1.innerText = result.previewNewText
                                previewElem1.value = result.previewNewText
                                previewNewText = result.previewNewText;
                                let g = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                                // if current translation we need to split the rownumber
                                let newrowId = row.split("-")[0];
                                textareaElem1 = g.querySelector("textarea#translation_" + newrowId + "_0");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = previewNewText;
                                // Highlight all keywords found in the page, so loop through the replacement array
                                // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                                await markElements(previewElem1, repl_array, orgText, spellcheckIgnore, repl_array, translatedText);
                            }
                        }
                        // here is plural 2
                        previewNewText = previewElem2.innerText;
                        translatedText = previewElem2.innerText;
                        if (translatedText != "No suggestions") {
                            result = await check_start_end(translatedText, previewNewText, recWordCount, repl_verb, original, replaced, countrows);
                            replaced = result.replaced;
                            repl_array = result.repl_array;
                            if (replaced) {
                                mypreview.classList.replace("status-current", "status-waiting");
                                mypreview.classList.add("wptf-translated");
                                recWordCount += result.countReplaced;
                                repl_verb = result.repl_verb;
                                previewElem2.innerHTML = result.previewNewText
                                previewElem2.innerText = result.previewNewText
                                previewElem2.value = result.previewNewText
                                // we have updatet the text of the first plural, so we need to update the var
                                previewNewText = result.previewNewText
                                let g = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                                // if current translation we need to split the rownumber
                                let newrowId = row.split("-")[0];
                                textareaElem1 = g.querySelector("textarea#translation_" + newrowId + "_1");
                                textareaElem1.innerText = result.previewNewText;
                                textareaElem1.value = result.previewNewText;
                                // PSS this needs to be improved
                                let repl = []
                                let rec = '.,.'
                                repl.push(rec.split(","))
                                //rec = ' , '
                                // repl.push(rec.split(","))
                                // await markElements(previewElem, repl_array, orgText, spellcheckIgnore, repl_array, translatedText);
                                // 09-09-2022 PSS fix for issue #244
                                if (currec != null) {
                                    var current = currec.querySelector("span.panel-header__bubble");
                                    var prevstate = current.innerText;
                                    current.innerText = "transFill";
                                }
                                // Only update the style if verbs are replaced!!
                                let wordCount = recWordCount;
                                let percent = 10;
                                let toolTip = "";
                                result = { wordCount, percent, toolTip };
                                old_status = document.querySelector("#preview-" + row);
                                updateStyle(textareaElem, result, "", 'True', false, false, row, e, showHistory, true, translatedText, repl_array, prev_trans, old_status, false);
                                // updateStyle(textareaElem, result, "", 'True', false, false, row,e,showHistory,true,orginal,repl_array,prev_trans);
                            }
                            result = await replElements(translatedText, previewNewText, replaceVerb, repl_verb, "", original, countrows);
                            replaced = result.replaced;
                            orgText = result.orgText;
                            if (replaced) {
                                recWordCount += result.countreplaced;
                                repl_verb = result.repl_verb
                                previewElem2.innerHTML = result.previewNewText
                                previewElem2.innerText = result.previewNewText
                                previewElem2.value = result.previewNewText
                                previewNewText = result.previewNewText;
                                let g = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                                // if current translation we need to split the rownumber
                                let newrowId = row.split("-")[0];
                                textareaElem1 = g.querySelector("textarea#translation_" + newrowId + "_1");
                                textareaElem1.innerText = translatedText;
                                textareaElem1.value = previewNewText;
                                // Highlight all keywords found in the page, so loop through the replacement array
                                // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                                await markElements(previewElem2, repl_array, orgText, spellcheckIgnore, repl_array, translatedText);
                            }
                        }
                    }
                    if (replaced) {
                        // Only update the style if verbs are replaced!!
                        let wordCount = recWordCount;
                        let percent = 10;
                        let toolTip = "";
                        result = { wordCount, percent, toolTip };
                        old_status = document.querySelector("#preview-" + newrowId);
                        //console.debug("checkpage:",old_status)
                        updateStyle(textareaElem, result, "", 'True', false, false, row, e, showHistory, true, translatedText, repl_array, prev_trans, old_status, false);
                    }
                }
                if (toTranslate == false) {
                    showName = true;
                }
                else {
                    showName = false;
                }
                if (showName == true) {
                    let originalElem = document.querySelector("#preview-" + row + " .original");
                    showNameLabel(originalElem)
                }
                // }, timeout, countrows, tableRecords, countreplaced, repl_verb);
                //timeout += 100;

                //console.debug("rows done:", countrows, original)
                if (countrows == tableRecords) {
                    messageBox("info", "Replace verbs done " + recWordCount + " replaced words/text<br>" + repl_verb);
                    // Translation replacement completed
                    let checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
                    checkButton.classList.remove("started");
                    //checkButton.className += " translated";
                    checkButton.innerText = "Checked";
                    checkButton.className += " ready";
                    progressbar = document.querySelector(".indeterminate-progress-bar");
                    progressbar.style.display = "none";
                }
            }
            else { messageBox("error", "You do not have translations to check!");}
        }
    }
    else {
        messageBox("error", "Your postreplace verbs are not populated add at least on line!");
    }
}

async function reviewTrans() {
    if (apikeyOpenAI != "") {
        if (translatedText != "") {
            //console.debug("openkey ", apikeyOpenAI)
            result = await AIreview(original, destlang, e, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, false, locale, false, true, translatedText, preview);
           // console.debug("Result:", result)
        }
    }
}
function needsMarking(markverb, spellcheckIgnore) {
   // console.debug("ignorelist1:", spellcheckIgnore)
    var ignore = ["WooCommerce", "Yoast","strong","a href","href"];
    
    if ((ignore.find(element => element == markverb)) == undefined) {
        return true
    }
    else {
        return false
    }
}


async function markElements(preview, replaceVerb, orgText, spellcheckIgnore, repl_array, translatedText) {
    // Highlight all keywords found in the page, so loop through the replacement array
    //console.debug("replaceverbs array:",repl_array)
    var arr = [];
    // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
    if (typeof spellcheckIgnore != 'undefined' && spellcheckIgnore.length != 0) {
        spellcheckIgnore = spellcheckIgnore.split('\n');
    }
    else {
        spellcheckIgnore = [];
    }
    if (typeof repl_array != 'undefined') {
        //  console.debug("we are in markelements:",repl_array)
    }
    // 27-07-2023 PSS we need to escape the double quotes otherwise replacing crashes
    nwText = orgText.toString().replace(/"/g, '\\"')
    let debug = false;
    if (debug == true) {
        console.debug("old text:", translatedText)
        console.debug("new text:", orgText)
        console.debug("nwText:", nwText);
        console.debug("preview:", preview);
    }

    if (typeof repl_array != "undefined") {
        if (typeof nwText != 'undefined') {
            for (let i = 0; i < repl_array.length; i++) {
                // Check if we need to mark the verb
                // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                if (spellcheckIgnore.length == 0) {
                    //console.debug("we are in no spellcheckIgnore", repl_array[i][0])
                    if (nwText.includes(repl_array[i][0])) {
                        //console.debug("newText includes:", repl_array[i][0], "two:" + repl_array[i][1])
                        high = repl_array[i][1];
                        if (typeof high != 'undefined') {
                            if (high != " ") {
                                // 09-08-2023 PSS removed the backslash from the regex, otherwise it is not marked
                                high = high.replace(/[&\#,+()$~%'":*<>{}]/g, '')
                                high = high.trim();
                                //console.debug("high:",high)
                            }
                            // push the verb into the array
                            // but do not push single brackets !
                            if (high != '[' && high != ']') {
                                arr.push(high);
                                // console.debug("array:", arr)
                            }
                        }
                    }
                }
                else {
                    if (typeof spellcheckIgnore != 'undefined' && typeof (spellcheckIgnore.find(element => element == replaceVerb[i][0])) == 'undefined') {
                        // console.debug("We are with spellcheckignore")
                        if (nwText.includes(repl_array[i][0])) {
                            // console.debug("highlight:", replaceVerb[i][1])
                            high = repl_array[i][1];
                            high = high.replace(/[&\#,+()$~%'":*<>{}]/g, '')
                            high = high.trim();
                            if (high != "") {
                                // push the verb into the array
                                // but do not push single brackets !
                                if (high != '[' && high != ']') {
                                    arr.push(high);
                                }
                            }
                        }
                    }
                }

                // PSS we found everything to mark, so mark it issue #157
                if (arr.length > 0) {
                    //console.debug("arr:",arr)
                    highlight(preview, arr);
                }
            }

        }
        else {
         //   console.debug("newTextin inmark:", newText)
         //   console.debug("translatedText inmark:", translatedText)


        }
    }
    else {
        console.debug("no org")
    }
}

async function markElements_previous(preview, replaceVerb, orgText, spellcheckIgnore, repl_array, translatedText) {
    // Highlight all keywords found in the page, so loop through the replacement array
    //console.debug("replaceverbs array:",repl_array)
    var arr = [];
    var debug = false;
    
    // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
    if (typeof spellcheckIgnore != 'undefined' && spellcheckIgnore.length != 0) {
        spellcheckIgnore = spellcheckIgnore.split('\n');
    }
    else {
        spellcheckIgnore = [];
    }
    if (typeof repl_array != 'undefined') {
        //  console.debug("we are in markelements:",repl_array)
    }
    // 27-07-2023 PSS we need to escape the double quotes otherwise replacing crashes
    nwText = orgText.toString().replace(/"/g, '\\"')
    if (debug == true) {
        console.debug("old text:", translatedText)
        console.debug("new text:", orgText)
        console.debug("nwText:", nwText);
        console.debug("preview:", preview);
        console.debug("repl_array:", repl_array);
    }

    if (typeof repl_array != "undefined") {
        if (typeof nwText != 'undefined') {
            for (let i = 0; i < repl_array.length; i++) {
                // Check if we need to mark the verb
                // 16-04-2023 fix for issue #293 marking of replaced words did not work anymore
                if (spellcheckIgnore.length == 0) {
                    //console.debug("we are in no spellcheckIgnore", repl_array[i][0])
                    if (nwText.includes(repl_array[i][0])) {
                        //console.debug("newText includes:", repl_array[i][0], "two:" + repl_array[i][1])
                        high = repl_array[i][0];
                        if (typeof high != 'undefined') {
                            if (high != " ") {
                                // 09-08-2023 PSS removed the backslash from the regex, otherwise it is not marked
                                high = high.replace(/[&\#,+()$~%'":*<>{}]/g, '')
                                high = high.trim();
                                //console.debug("high:",high)
                            }
                            // push the verb into the array
                            // but do not push single brackets !
                            if (high != '[' && high != ']') {
                                arr.push(high);
                                // console.debug("array:", arr)
                            }
                        }
                    }
                }
                else {
                    if (typeof spellcheckIgnore != 'undefined' && typeof (spellcheckIgnore.find(element => element == replaceVerb[i][0])) == 'undefined') {
                        // console.debug("We are with spellcheckignore")
                        if (nwText.includes(repl_array[i][0])) {
                            // console.debug("highlight:", replaceVerb[i][1])
                            high = repl_array[i][0];
                            high = high.replace(/[&\#,+()$~%'":*<>{}]/g, '')
                            high = high.trim();
                            if (high != "") {
                                // push the verb into the array
                                // but do not push single brackets !
                                if (high != '[' && high != ']') {
                                    arr.push(high);
                                }
                            }
                        }
                    }
                }

                // PSS we found everything to mark, so mark it issue #157
                //console.debug("array:",arr)
                if (arr.length > 0) {
                    //console.debug("arr:",arr)
                    highlight(preview, arr);
                }
            }

        }
        else {
         //   console.debug("newTextin inmark:", newText)
        //    console.debug("translatedText inmark:", translatedText)
        }
    }
    else {
        console.debug("no org")
    }
}

function replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced, original, countrows) {
    repl_array=[]
    var replaced = false;
    var orgText =translatedText
    for (let i = 0; i < replaceVerb.length; i++) {
        // PSS solution for issue #291
        replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
        if (translatedText.includes(replaceVerb[i][0])) {  
            // Enhencement issue #123
            // fix for replacing verbs in url issue #290 check if the string does contain an URL
            if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                previewNewText = previewNewText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                repl_verb += countrows + " : " + replaceVerb[i][0] + "->" + replaceVerb[i][1] + "<br>";
                repl_array.push(replaceVerb[i]);
                countreplaced++;
                replaced = true;
            }
        }
    }
    if (i == 2) {
        replaced = false
    }
    //console.debug("repl_array:",repl_array)
    return { replaced, previewNewText, translatedText, countreplaced, orgText ,repl_verb,repl_array};
}

function check_start_end(translatedText, previewNewText, counter, repl_verb, original, replaced, myrow) {
    repl_array = [];
    var mark;
    let debug = false;

    if (debug == true) {
        console.debug("value1:", translatedText)
        console.debug("value2:", previewNewText)
        console.debug("value3:", "countreplaced: ", counter)
        console.debug("value4:" + "repl_verb: ", repl_verb)
        console.debug("value5:" + "original: ", original)
        console.debug("value6:", replaced)
        console.debug("values7:", myrow)
    }
    countReplaced = Number(counter)
    //if (original.endsWith("\n") != true) {
    //    if (translatedText.endsWith("\n") == true) {
    //        translatedText = translatedText.substring(0, translatedText.length - 1);
    //        countReplaced++;
    //        replaced = true;
    //    }
   // }
    if (previewNewText != "No suggestions") {
        if (original.startsWith(" ")) {
            // console.debug("Original starts with blanc!"+ original);
            if (!previewNewText.startsWith(" ")) {
                //  console.debug("Preview does not start with blanc!", previewNewText);
                previewNewText = " " + previewNewText;
                translatedText = " " + translatedText;
                replaced = true;
                repl_verb += myrow + " :blanc before added" + "<br>";
                countReplaced++;
            }
        }

        if (original.endsWith(" ")) {
            // console.debug("Original end with blanc!" + original);
            // console.debug("Preview:",previewNewText);
            if (!previewNewText.endsWith(" ")) {
                //  console.debug("Preview does not end with blanc!", previewNewText);
                previewNewText = previewNewText + " ";
                translatedText = translatedText + " ";
                repl_verb += myrow + ": blanc after added" + "<br>";
                countReplaced++;
                replaced = true;
            }
        }

        if (previewNewText.startsWith(" ")) {
            if (!original.startsWith(" ")) {
                // console.debug("Original does not start with blanc!", '"' + original + '"');
                previewNewText = previewNewText.substring(1, previewNewText.length);
                translatedText = translatedText.substring(1, translatedText.length);
                replaced = true;
                repl_verb += myrow + ": blanc before removed" + "<br>";
                countReplaced++;
                //countreplaced++;
            }
        }

        if (previewNewText.endsWith(" ")) {
            if (!original.endsWith(" ")) {
                // console.debug("Original does not end with blanc!", '"' + original + '"');
                previewNewText = (previewNewText.substring(0, previewNewText.length - 1));
                translatedText = translatedText.substring(0, translatedText.length - 1);
                repl_verb += myrow + ": blanc after removed" + "<br>";
                //  console.debug("repl_verb:", repl_verb)
                countReplaced++;
                replaced = true;
            }
        }
        // 29-07-2023 PSS we need to check if the original does not end with three dots otherwise one period will be added or removed
        if (!original.endsWith('\u2026') && !original.endsWith('\u002e\u002e\u002e')) {
            if (original.endsWith(".")) {
                if (!previewNewText.endsWith(".")) {
                    previewNewText = previewNewText + "."
                    translatedText = translatedText + ".";
                    repl_verb += myrow + " '.' " + "->" + "added" + "<br>";
                    let verb = myrow + " '.' " + "->" + "added" + "<br>";
                    mark = "."
                    repl_array.push([mark, mark])
                    countReplaced++;
                    replaced = true;
                }
            }
        }
        // 29-07-2023 PSS we need to check if the original does not end with three dots otherwise one period will be added or removed
        if (!original.endsWith('\u2026') && !original.endsWith('\u002e\u002e\u002e')) {
            if (previewNewText.endsWith(".")) {
                if (!original.endsWith(".")) {
                    previewNewText = previewNewText.substring(0, previewNewText.length - 1);
                    translatedText = translatedText.substring(0, translatedText.length - 1);
                    repl_verb += myrow + " '.' " + "->" + "removed" + "<br>";
                    countReplaced++;
                    replaced = true;
                }
            }
        }
        if (original.endsWith(":")) {
            if (!previewNewText.endsWith(":")) {
                previewNewText = previewNewText + ":";
                translatedText = translatedText + ":";
                // repl_verb += myrow + ": ':' after added" + "<br>";
                let verb = myrow + ": ':' after added" + "<br>";
                repl_verb += myrow + ": " + '->' + "':' after added" + "<br>"
                mark = ":"
                repl_array.push([mark, mark])
                countReplaced++;
                replaced = true;
            }
        }
        if (!original.endsWith(":")) {
            if (previewNewText.endsWith(":")) {
                previewNewText = (previewNewText.substring(0, previewNewText.length - 1));
                translatedText = translatedText.substring(0, translatedText.length - 1);
                let verb = myrow + ": " + '->' + "':' after removed" + "<br>"
                // repl_verb.push(verb);
                repl_verb += myrow + ": " + '->' + "':' after removed" + "<br>"
                countReplaced++;
                replaced = true;
            }
        }
        if (original.endsWith("!")) {
            if (!previewNewText.endsWith("!")) {
                previewNewText = previewNewText + "!";
                translatedText = translatedText + "!";
                repl_verb += myrow + ": '!' after added" + "<br>";
                mark = "!"
                repl_array.push([mark, mark])
                countReplaced++;
                replaced = true;
            }
        }
        if (!original.endsWith("!")) {
            if (previewNewText.endsWith("!")) {
                previewNewText = (previewNewText.substring(0, previewNewText.length - 1));
                translatedText = translatedText.substring(0, translatedText.length - 1);
               // let mark = "!"
               // repl_array.push([mark, mark])
                //repl_verb += myrow + ": " + '->' + "'!' after removed" + "<br>"
                //mark = "!"
               // repl_array.push([mark, mark])
                countReplaced++;
                replaced = true;
            }
        }
        if (original.endsWith("?")) {
            if (!previewNewText.endsWith("?")) {
                previewNewText = previewNewText + "?";
                translatedText = translatedText + "?";
                // repl_verb += myrow + ": ':' after added" + "<br>";
                let verb = myrow + ": '?' after added" + "<br>";
                repl_verb += myrow + ": " + '->' + "'?' after added" + "<br>"
                mark = "?"
                repl_array.push([mark,mark])
                countReplaced++;
                replaced = true;
            }
        }
        if (!original.endsWith("?")) {
            if (previewNewText.endsWith("?")) {
                previewNewText = (previewNewText.substring(0, previewNewText.length - 1));
                translatedText = translatedText.substring(0, translatedText.length - 1);
                let verb = myrow + ": " + '->' + "'?' after removed" + "<br>"
                // repl_verb.push(verb);
                repl_verb += myrow + ": " + '->' + "'?' after removed" + "<br>"
                let question_mark = '?'
                // PSS we cannot mark a removed character
                countReplaced++;
                replaced = true;
            }
        }
        // Make translation to start with same case (upper/lower) as the original.
        if (isStartsWithUpperCase(original)) {
            if (!isStartsWithUpperCase(translatedText)) {
                translatedText = translatedText[0].toUpperCase() + translatedText.slice(1);
                previewNewText = translatedText[0].toUpperCase() + translatedText.slice(1);
                repl_verb += myrow + ": " + '->' + "set first char to uppercase" + "<br>"
                countReplaced++;
                replaced = true;
            }
        }
        else {
            if (isStartsWithUpperCase(translatedText)) {
                translatedText = translatedText[0].toLowerCase() + translatedText.slice(1);
                previewNewText = translatedText[0].toLowerCase() + translatedText.slice(1);
                repl_verb += myrow + ": " + '->' + "set first char to lowercase" + "<br>"
                countReplaced++;
                replaced = true;
            }
        }
    }
   // console.debug("After improvements:", translatedText, previewNewText + " countreplaced: " + countReplaced, repl_verb, replaced)
    if (previewNewText == null) {
        previewNewText = translatedText
    }
    return { translatedText, previewNewText, countReplaced, repl_verb, replaced ,repl_array}
}
async function populateWithLocal(apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree) {
    //console.time("translation")
    var translate;
    var transtype = "";
    var plural_line = "";
    var plural_present = "";
    var record = "";
    var row = "";
    var preview = "";
    var pretrans = 'notFound';
    var counter=0;
    //destlang = "nl"
    parrotActive = 'true';
    locale = checkLocale();
    setPostTranslationReplace(postTranslationReplace, formal);  
    setPreTranslationReplace(preTranslationReplace);
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.local-trans-button");
    let GlotPressBulkButton = document.getElementById("bulk-actions-toolbar-bottom")
    translateButton.innerText = "Translate";
    //console.debug("Button classname:", translateButton.className);
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (translateButton.className == "local-trans-button") {
        translateButton.className += " started";
    }
    else {
        translateButton.classList.remove("local-trans-button", "started", "translated");
        translateButton.classList.remove("local-trans-button", "restarted", "translated");
        translateButton.className = "local-trans-button restarted";
    }

    for (let record of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        transtype = "single";
        // 16-08-2021 PSS fixed retranslation issue #118
        let rowfound = record.parentElement.parentElement.parentElement.parentElement.id;
        row = rowfound.split("-")[1];
        let newrow = rowfound.split("-")[2];
        if (typeof newrow != "undefined") {
            newrowId = row.concat("-", newrow);
            row = newrowId;
        } else {
            rowfound = record.querySelector(`div.translation-wrapper textarea`).id;
            row = rowfound.split("_")[1];
        }
        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);

        // We need to determine the current state of the record
        if (currec != null) {
            var current = currec.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
        }

        let original = record.querySelector("span.original-raw").innerText;

        // 14-08-2021 PSS we need to put the status back of the label after translating
        let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
        if (transname != null) {
            transname.className = "trans_name_div";
            transname.innerText = "URL, name of theme or plugin or author!";
            // In case of a plugin/theme name we need to set the button to blue
            let curbut = document.querySelector(`#preview-${row} .priority .tf-save-button`);
            curbut.style.backgroundColor = "#0085ba";
            curbut.innerText = "Save";
            curbut.title = "Save the string";
            transtype = "single";
        }

        // If in the original field "Singular is present we have a plural translation
        pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
        if (pluralpresent != null) {
            original = pluralpresent.innerText;
            transtype = "plural";
            plural_line = "1";
        } else {
            transtype = "single";
            plural_line = "0";
        }

        // PSS 09-03-2021 added check to see if we need to translate
        //Needs to be put into a function, because now it is unnessary double code
        toTranslate = true;

        // Check if the comment is present, if not then if will block the request for the details name etc.
        let element = record.querySelector(".source-details__comment");
        if (element != null) {
            let comment = record.querySelector(".source-details__comment p").innerText;
            comment = comment.replace(/(\r\n|\n|\r)/gm, "");
            toTranslate = checkComments(comment.trim());
        }

        // Do we need to translate ??
        if (toTranslate) {
            pretrans = await findTransline(original, destlang);
            if (pretrans != 'notFound') {
                // Pretranslation found!
                counter++;
                let translatedText = pretrans;
                // if formal then we need to replace def translation
                translatedText = await postProcessTranslation(original, translatedText, replaceVerb, "", "", convertToLower, "", locale);
                let textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = "";
                textareaElem.value = "";
                // 23-08-2022 PSS added fix for issue #236
                // The below vars are not need here, so set them to a default value
                let countreplaced = 0;
                let repl_verb = [];
                let countrows = 0;
                let replaced = false;
                let preview = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                let previewNewText = translatedText;
               
                // console.debug("nieuw:", "'"+ previewNewText+ "'");
                result = await check_start_end(translatedText, previewNewText, countreplaced, repl_verb, original, replaced, countrows);
                //replaced = result.replaced;
                textareaElem.innerText = result.translatedText;
                textareaElem.value = result.translatedText;
                translatedText = result.translatedText;
                //console.debug("na:", "'"+ translatedText+"'");
                // textareaElem.innerText = translatedText;
                // textareaElem.value = translatedText;
                if (typeof current != "undefined") {
                    current.innerText = "transFill";
                    current.value = "transFill";
                }
                // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                //select = next_editor.getElementsByClassName("meta");
                var status = select.querySelector("dt").nextElementSibling;
                status.innerText = "transFill";
                status.value = "transFill";
                let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                if (currec != null) {
                    var current = currec.querySelector("span.panel-header__bubble");
                }
                validateEntry(destlang, textareaElem, "", "", row, locale, record,false);
               // validateEntry(destlang, textareaElem, "", "", row);
                
                // PSS 10-05-2021 added populating the preview field issue #68
                // Fetch the first field Singular
                let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(1) span.translation-text");
                if (previewElem != null) {
                    // previewElem.innerText = translatedText;
                } else {
                    //console.debug("it seems to be a single as li is not found");
                    let preview = document.querySelector("#preview-" + row + " td.translation");
                    let spanmissing = preview.querySelector(" span.missing");
                    if (spanmissing != null) {
                        if (plural_line == "1") {
                            spanmissing.remove();
                        }
                        if (transtype != "single") {                                 
                            ul = document.createElement("ul");
                            preview.appendChild(ul);
                            var li1 = document.createElement("li");
                            li1.style.cssText = "text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;";
                            ul.appendChild(li1);
                            var small = document.createElement("small");
                            li1.appendChild(small);
                            small.appendChild(document.createTextNode("Singular:"));
                            var br = document.createElement("br");
                            li1.appendChild(br);
                            var myspan1 = document.createElement("span");
                            myspan1.className = "translation-text";
                            li1.appendChild(myspan1);
                            myspan1.appendChild(document.createTextNode(translatedText));

                            // Also create the second li
                            var li2 = document.createElement("li");
                            //li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                            ul.appendChild(li2);
                            var small = document.createElement("small");
                            li2.appendChild(small);
                            small.appendChild(document.createTextNode("Plural:"));
                            var br = document.createElement("br");
                            li2.appendChild(br);
                            var myspan2 = document.createElement("span");
                            myspan2.className = "translation-text";
                            li2.appendChild(myspan2);
                            myspan2.appendChild(document.createTextNode("empty"));

                        } else {
                            //console.debug("jey it is a single!!");
                            // console.debug("newtext:","'"+translatedText+"'")
                            preview.innerText = translatedText;
                            current.innerText = "transFill";
                            current.value = "transFill";
                            var element1 = document.createElement("div");
                            element1.setAttribute("class", "trans_local_div");
                            element1.setAttribute("id", "trans_local_div");
                            element1.appendChild(document.createTextNode("Local"));
                            preview.appendChild(element1);
                            
                            // we need to set the checkbox as marked
                            preview = document.querySelector(`#preview-${row}`);
                            if (is_pte) {
                                rowchecked = preview.querySelector(".checkbox input");
                            }
                            else {
                                rowchecked = preview.querySelector(".myCheckBox input");
                            }
                            if (rowchecked != null) {
                                if (!rowchecked.checked) {
                                    rowchecked.checked = true;
                                }
                            }
                        }
                    } else {
                        // if it is as single with local then we need also update the preview
                       // console.debug("single:", "'" + translatedText + "'");
                        preview.innerText = translatedText;
                        current.innerText = "transFill";
                        current.value = "transFill";
                        var element1 = document.createElement("div");
                        element1.setAttribute("class", "trans_local_div");
                        element1.setAttribute("id", "trans_local_div");
                        element1.appendChild(document.createTextNode("Local"));
                        preview.appendChild(element1);
                        // we need to set the checkbox as marked
                        preview = document.querySelector(`#preview-${row}`);
                        if (is_pte) {
                            rowchecked = preview.querySelector(".checkbox input");
                        }
                        else {
                            rowchecked = preview.querySelector(".myCheckBox input");
                        }
                        if (rowchecked != null) {
                            if (!rowchecked.checked) {
                                rowchecked.checked = true;
                            }
                        }
                    }
                }

                if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                    document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = "visible";
                }

            } else {
                // console.debug("pretrans not found single!");
               // preview = document.querySelector(`#preview-${row}`);
               // if (preview != null) {
               //     preview.style.display = "";
               // }
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
                        console.debug("plural pretrans not found!");
                    }
                    else {
                        // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
                        // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
                        let translatedText = pretrans;
                        // Plural second line
                        let rowId = row.split("-")[0];
                        if (current.innerText == "current") {
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // the code below is to populate the Russion and Ukrain plurals
                            textareaElem2 = record.querySelector("textarea#translation_" + rowId + "_2");
                            if (textareaElem2 != null) {
                                plural = plural + "_02"
                                let pretrans = await findTransline(plural, destlang);
                                console.debug("res:",pretrans)
                                translatedText = pretrans
                                textareaElem2.innerText = translatedText;
                                textareaElem2.value = translatedText;
                            }

                            textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
                            console.debug("elem3:",textareaElem3)
                            if (textareaElem3 != null) {
                                plural = plural + "_03"
                                let pretrans = await findTransline(plural, destlang);
                                translatedText = pretrans
                                textareaElem3.innerText = translatedText;
                                textareaElem3.value = translatedText;
                            }
                            // Populate the second line in preview Plural
                            if (prevstate != "current") {
                                let preview = document.querySelector("#preview-" + rowId + " td.translation");
                                if (preview != null) {
                                    preview.innerText = translatedText;
                                    preview.value = translatedText;
                                    var element1 = document.createElement("div");
                                    element1.setAttribute("class", "trans_local_div");
                                    element1.setAttribute("id", "trans_local_div");
                                    element1.appendChild(document.createTextNode("Local"));
                                    preview.appendChild(element1);
                                }
                            }
                        } else {
                            // 30-10-2021 PSS added a fix for issue #154
                            // If the span missing is present it needs to be removed and the ul added otherwise the second line cannot be populated
                            check_span_missing(row, plural_line);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;

                            textareaElem2 = record.querySelector("textarea#translation_" + rowId + "_2");
                            //console.debug("elem2:", textareaElem2)
                            if (textareaElem2 != null) {
                                plural = plural + "_02"
                                let pretrans = await findTransline(plural, destlang);
                                console.debug("res:", pretrans)
                                translatedText = pretrans
                                textareaElem2.innerText = translatedText;
                                textareaElem2.value = translatedText;
                            }
                            let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(2) .translation-text");
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                                var element1 = document.createElement("div");
                                element1.setAttribute("class", "trans_local_div");
                                element1.setAttribute("id", "trans_local_div");
                                element1.appendChild(document.createTextNode("Local"));
                                my_previewElem = document.querySelector("#preview-" + row + " .translation li:nth-of-type(2)");
                                my_previewElem.appendChild(element1);
                            }
                            current.innerText = "transFill";
                            current.value = "transFill";
                        }
                        validateEntry(destlang, textareaElem1, "", "", row, locale, record,false);
                       // validateEntry(destlang, textareaElem1, "", "", row);
                    }
                }
            }
        } else {
            // This is when urls/plugin/theme names are present or local translation is present
            //console.debug("name or local:",original)
            counter++;
            let translatedText = original;
            let textareaElem = record.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            let preview = document.querySelector("#preview-" + row + " td.translation");
            if (preview != null) {
                preview.innerText = translatedText;
                preview.value = translatedText;
                pretrans = "FoundName";
                // We need to alter the status otherwise the save button does not work
                current.innerText = "transFill";
                current.value = "transFill";
                //10-05-2022 PSS added poulation of status
                select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                var status = select.querySelector("dt").nextElementSibling;
                status.innerText = "transFill";
                status.value = "transFill";
                nameDiff = false;
                if (toTranslate == false) {
                    showName = true;
                }
                else {
                    showName = false;
                }
                if (showName == true) {
                    let originalElem = document.querySelector("#preview-" + row + " .original");
                    showNameLabel(originalElem)
                }
                validateEntry(destlang, textareaElem, "", "", row, locale, record,false);
               // validateEntry(destlang, textareaElem, "", "", row);
            }
        }

        //14-09-2021 PSS changed the class to meet GlotDict behavior
        var currentClass = document.querySelector(`#editor-${row}`);
        var preview = document.querySelector(`#preview-${row}`);
        if (pretrans != 'notFound') {
            //currentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            currentClass.classList.add("wptf-translated");
            currentClass.classList.replace("no-translations", "has-translations");
            currentClass.classList.replace("untranslated", "status-waiting");
            //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            preview.classList.replace("no-translations", "has-translations");
            preview.classList.replace("untranslated", "status-waiting");
            preview.classList.replace("status-fuzzy", "status-waiting");
            preview.classList.add("wptf-translated");
            // 12-03-2022 PSS changed the background if record was set to fuzzy and new translation is set
            //preview.style.backgroundColor = "#ffe399";
            rowchecked = preview.querySelector("th input");
            if (rowchecked == null) {
                rowchecked = preview.querySelector("td input");
            }
            if (!rowchecked.checked) {
                rowchecked.checked = true;
            }
        }
        else {
            // We need to adept the class to hide the untranslated lines
            // Hiding the row is done through CSS tr.preview.status-hidden
           
            preview.classList.replace("untranslated", "status-hidden");
        }
    }
    // Translation completed  
    translateButton = document.querySelector(".wptfNavBarCont a.local-trans-button");
    translateButton.className += " translated";
    translateButton.innerText = "Translated";
    parrotActive = 'false';
    toastbox("info", "We have found: " + counter, "2500", "local records");
    if (GlotPressBulkButton != null) {
        if (counter > 0) {
            let button = GlotPressBulkButton.getElementsByClassName("button")
            button[0].disabled = true;
        }
    }
   
    //messageBox("info", "We have found:" + counter + " local records");

    //console.timeEnd("translation");
}



let lastExecution = 0;
const throttleDuration = 20; // Throttle duration in milliseconds

const throttleFunction = (preview) => {
    const currentTime = Date.now();
    editoropen = preview.querySelector("td.actions .edit");
    if (currentTime - lastExecution >= throttleDuration) {
        lastExecution = currentTime;
        if (typeof editoropen !== "undefined" && editoropen !== null) {
            editoropen.click();
            return Promise.resolve("Open");
        } else {
            return Promise.reject("Closed");
        }
    }
};

// Call the throttleFunction when needed
function openEditor(preview) {
    throttleFunction(preview).then(result => {
        //console.debug("Editor open!")
    }).catch(error => {
        console.debug(error);
    });
}


// Part of the solution issue #204
function old_openEditor(preview) {
    var timeout = 0;
    return new Promise((resolve, reject) => {
       
        editoropen = preview.querySelector("td.actions .edit");
        //console.debug("Editoropen:",editoropen)
        setTimeout(() => {
            if (typeof editoropen != null) {
                //console.debug("editor is open");
                editoropen.click()
                resolve("Open");
            } else {
                reject("Closed");
            }
        }, 500);
        
    });
}
// Part of the solution issue #204
async function fetchsuggestions(row) {
    setTimeout(async function() {
        myTM = await document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content .suggestions-wrapper`);
        return myTM;
    }, 800);
}

// Part of the solution issue #204
        
function fetchli(result, editor, row, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal,spellIgnore,locale,TMtreshold) {
    var res;
    //var myres;
    var ulfound;
    var lires;
    var newres;
    var liscore;
    var APIScore;
    var liSuggestion;
    var TMswitch;
    var TMswitch = localStorage.getItem('switchTM')
    var textFound = "No suggestions";
    var original;
    var DeepLres;
    var OpenAIres;
    var treshold = TMtreshold;
    // We need to prepare the replacement list
    setPostTranslationReplace(postTranslationReplace, formal);
    return new Promise((resolve, reject) => {
        //res = elementReady(`#editor-${row} .suggestions__translation-memory.initialized`);
        //console.debug("resli:", res, editor)
        //const myres = editor.querySelector(`#editor-${row} .suggestions__translation-memory.initialized`);
        setTimeout(async function () {
            original = editor.querySelector(`#editor-${row} div.editor-panel__left`);
            original = original.querySelector("span.original-raw").innerText;
            if (TMswitch == 'false') {
              newres = editor.querySelector(`#editor-${row} .suggestions__translation-memory.initialized .suggestions-list`);
              if (newres !== null) {
                
                  APIScore = editor.querySelector(`div.translation-suggestion.with-tooltip.openai`)
                  if (APIScore != null) {
                      APIScore = "OpenAI"
                  }
                  else {
                      APIScore = editor.querySelector(`div.translation-suggestion.with-tooltip.deepl`)
                      if (APIScore != null) {
                          APIScore = "DeepL"
                      }
                      else {
                          APIScore = "None"
                      }
                  }
                // Get the li list from the suggestions
                lires = newres.getElementsByTagName("li");
                //console.debug("li found:", lires);
                if (lires[0] != null) {
                    liscore = lires[0].querySelector(`span.translation-suggestion__score`);
                   // console.debug("liscore:",liscore)
                    if (liscore != null) {
                        liscore = liscore.innerText;
                        liscore = Number(liscore.substring(0, liscore.length - 1))
                        if (liscore == 100) {
                            liSuggestion = lires[0].querySelector(`span.translation-suggestion__translation`);
                            textFound = liSuggestion.innerHTML;
                            textFoundSplit = textFound.split("<span")[0]
                            //console.debug("suggestion >90:", textFoundSplit)
                            if (textFoundSplit != null) {
                                textFound = textFoundSplit;
                            }
                            else {
                                textFound = liSuggestion.innerText;
                            }
                        }
                        else if (liscore >= treshold && liscore < 100) {
                            liSuggestion = lires[0].querySelector(`span.translation-suggestion__translation`);
                            // We need to fetch Text otherwise characters get converted!!
                            // GlotPress can indicate differences between the original
                            // So we need to remove the indication
                            textFound = liSuggestion.innerHTML;
                            textFoundSplit = textFound.split("<span")[0]
                            //console.debug("suggestion >90:",textFoundSplit)
                            if (textFoundSplit != null) {
                                textFound = textFoundSplit;
                            }
                            else {
                                textFound = liSuggestion.innerText;
                            }

                        }

                        else if (APIScore == "OpenAI") {
                            OpenAIres = editor.querySelector(`#editor-${row} div.translation-suggestion.with-tooltip.openai`);
                            if (OpenAIres != null) {
                                liSuggestion = OpenAIres.querySelector(`span.translation-suggestion__translation`);
                                textFound = liSuggestion.innerText
                            }
                            else {
                               // console.debug("OpenAIres == null!")
                                textFound = "No suggestions";
                            }
                        }
                        else if (APIScore == "DeepL") {
                            DeepLres = editor.querySelector(`div.translation-suggestion.with-tooltip.deepl`);
                            if (DeepLres != null) {
                                liSuggestion = DeepLres.querySelector(`span.translation-suggestion__translation`);
                                textFound = liSuggestion.innerText
                            }
                            else {
                              //  console.debug("DeepLres == null!")
                                textFound = "No suggestions";
                                //resolve(textFound);
                            }
                        }
                        else if (APIScore != 'OpenAI' && APIScore != "Deepl" && liscore <treshold) {
                            //console.debug("There are no suggestions!")
                            textFound = "No suggestions";
                        }
                    }
                    // We do have no suggestions!
                    else {
                        if (APIScore == "OpenAI") {
                            OpenAIres = editor.querySelector(`#editor-${row} div.translation-suggestion.with-tooltip.openai`);
                            if (OpenAIres != null) {
                                liSuggestion = OpenAIres.querySelector(`span.translation-suggestion__translation`);
                                textFound = liSuggestion.innerText
                            }
                            else {
                               // console.debug("OpenAIres == null!")
                                textFound = "No suggestions";
                            }
                        }
                        else if (APIScore == "DeepL") {
                            DeepLres = editor.querySelector(`div.translation-suggestion.with-tooltip.deepl`);
                            if (DeepLres != null) {
                                liSuggestion = DeepLres.querySelector(`span.translation-suggestion__translation`);
                                textFound = liSuggestion.innerText
                            }
                            else {
                               // console.debug("DeepLres == null!")
                                textFound = "No suggestions";
                                //resolve(textFound);
                            }
                        }
                    }
                    //sometimes we have a second <span> within the text, we need to drop thatOpenAI
                    //console.debug("li result:", lires[0].querySelector(`span.translation-suggestion__translation`);
                    // PSS made a fix for issue #300
                    
                    //textFound = textFound.split("<span")[0]
                    textFound = unEscape(textFound)
                   // console.debug("before postprocess:"," '"+original+"' ",textFound,spellIgnore)
                    // We need to convert to lower if that is setconveert
                   // console.debug("convert in fetchli:",convertToLower)
                    if (convertToLower == true) {
                        textFound = convert_lower(textFound, spellIgnore)
                    }
                    else {
                        textFound = check_hyphen(textFound, spellIgnore);
                    }
                    //textFound = await postProcessTranslation(original, textFound, replaceVerb, "", "", convertToLower, spellIgnore,locale)
                    if (textFound == "") {
                       // console.debug("liSuggestion present but no result from postProcessTranslation!")
                        textFound = "No suggestions";
                        resolve(textFound);
                    }
                    resolve(textFound);
                }
                else {
                    textFound ="No suggestions"
                    resolve(textFound);
                  }
              }
              else {
                  textFound = "No suggestions"
                  resolve(textFound);
                   }
            } else {
                newres = editor.querySelector(`#editor-${row} .suggestions__other-languages.initialized .suggestions-list`);
                if (newres !== null) {
                    // Get the li list from the foreighn suggestions
                    lires = newres.getElementsByTagName("li");
                    liSuggestion = lires[0].querySelector(`span.translation-suggestion__translation`);
                    // We need to fetch Text otherwise characters get converted!!
                    textFound = liSuggestion.innerHTML
                    textFound = textFound.split("<span")[0]
                    textFound = unEscape(textFound)
                    if (textFound == "") {
                        textFound = "No suggestions";
                        resolve(textFound);
                    }
                    else {
                        // We need to convert to lower if that is setconveert
                        if (convertToLower == true) {
                            textFound = convert_lower(textFound, spellIgnore)
                        }
                        else {
                            textFound = check_hyphen(textFound, spellIgnore);
                        }
                        resolve(textFound);
                    }
                }
                else {
                    textFound = "No suggestions"
                    resolve(textFound);
                }
            }
        }, TMwait);
    });
}


// Part of the solution issue #204
async function populateWithTM(apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, TMwait, postTranslationReplace, preTranslationReplace, convertToLower,spellCheckIgnore,TMtreshold) {
    var timeout = 0;
    var editoropen;
    var editor;
    var preview;
    var res;
    var counter = 0;
    var row;
    var textareaElem;
    locale = checkLocale();
    // We need to populate the posttranslate array
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    let GlotPressBulkButton = document.getElementById("bulk-actions-toolbar-bottom")
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
        translateButton.innerText = "Translate";
        // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
        if (translateButton.className == "tm-trans-button") {
            translateButton.className += " started";
        }
        else {
            translateButton.classList.remove("tm-trans-button", "started", "translated");
            translateButton.classList.remove("tm-trans-button", "restarted", "translated");
            translateButton.className = "tm-trans-button restarted";
    }
    // for some reason if "preview" is used for selection we get one record to much with fuzzies, so select editor instead
    myrecCount = document.querySelectorAll("tr.editor")
    //myrecCount = document.getElementsByClassName("editor")
    //console.debug("record count:",myrecCount.length)
    for (let record of myrecCount) {
        transtype = "single";  
        row = record.getAttribute("row");
        // we need to store current preview and editor for later usage
        preview = document.querySelector(`#preview-${row}`);
        editor = document.querySelector(`#editor-${row}`);
        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
        // We need to determine the current state of the record
        if (currec != null) {
            var current = currec.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
        }
        let original = editor.querySelector("span.original-raw").innerText;
        //console.debug("original:", editor, original)
        // 14-08-2021 PSS we need to put the status back of the label after translating
        let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
        if (transname != null) {
            transname.className = "trans_name_div";
            transname.innerText = "URL, name of theme or plugin or author!";
            // In case of a plugin/theme name we need to set the button to blue
            let curbut = document.querySelector(`#preview-${row} .priority .tf-save-button`);
            curbut.style.backgroundColor = "#0085ba";
            curbut.innerText = "Save";
            curbut.title = "Save the string";
            transtype = "single";
        }
        // If in the original field "Singular is present we have a plural translation
        pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
        //console.debug("pluralpresent:",pluralpresent)
        if (pluralpresent != null) {
            // currently we do not process plural within TM, as it will only give one result
            original = pluralpresent.innerText;
            transtype = "plural";
            plural_line = "1";
        }
        else {
            transtype = "single";
            plural_line = "0";
        }
        if (transtype == "single") {
            // PSS 09-03-2021 added check to see if we need to translate
            //Needs to be put into a function, because now it is unnessary double code
            toTranslate = true;
            // Check if the comment is present, if not then if will block the request for the details name etc.
            let element = record.querySelector(".source-details__comment");
            if (element != null) {
                let comment = record.querySelector(".source-details__comment p").innerText;
                comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                toTranslate = checkComments(comment.trim());
            }
            if (toTranslate) {
                editoropen = await openEditor(preview);
                result = await waitForElm(".suggestions__translation-memory.initialized .suggestions-list").then(res => {
                    return new Promise((resolve, reject) => {
                        myTM = fetchsuggestions(row);
                        if (typeof myTM != 'undefined') {
                            setTimeout(() => {
                                //glotpress_close.click();
                                resolve(myTM);
                            }, 800);
                        }
                        else {
                            setTimeout(() => {
                                resolve("No suggestions");
                                // glotpress_close.click();
                            }, 500);
                        }
                    });
                });
                textareaElem = editor.querySelector("textarea.foreign-text");
                //console.debug("textareaElem populate TM:",textareaElem)
                if (result != "No suggestions") {
                     myresult = await fetchli(result, editor, row, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore,locale,TMtreshold).then(resli => {
                         if (typeof resli != null) {
                            // myres = getTM(resli, row, editor, destlang, original, replaceVerb, transtype, convertToLower, spellCheckIgnore, locale);
                            myres = getTM(resli, row, editor, destlang, original, replaceVerb, transtype, convertToLower, spellCheckIgnore, locale,current);     
                            
                             //console.debug("after fetchli:",textareaElem)
                           // if (is_pte) {
                             //   rowchecked = preview.querySelector("th input");
                          //  }
                           // else {
                           //     rowchecked = preview.querySelector("td input");
                           //  }
                            // console.debug("rowchecked:",rowchecked,resli,result)
                            //if (rowchecked != null) {
                              //  if (!rowchecked.checked) {
                                   // if (resli == "No suggestions") {
                                     //   rowchecked.checked = false;
                                  // }
                                   // else {
                                    //    rowchecked.checked = true;
                                        counter++;
                                    //}
                               // }
                            //}
                         }
                         else {
                             console.debug("notfound");
                        }

                    }).catch((error) => {
                        console.error("Error in fetching li:", error);
                    });
                }
                else {
                    console.debug("No suggestions");
                    textareaElem.innerText = "No suggestions"
                    if (is_pte) {
                        rowchecked = preview.querySelector("th input");
                    }
                    else {
                        rowchecked = preview.querySelector("td input");
                    }
                    console.debug("rowchecked:", rowchecked, resli, result)
                    if (rowchecked != null) {
                        if (!rowchecked.checked) {
                            if (resli == "No suggestions") {
                                rowchecked.checked = false;
                            }
                            else {
                               // rowchecked.checked = true;
                                counter++;
                            }
                        }
                    }
                }
            }
            else {
                let translatedText = original;
                let textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                textareaElem.innerHTML = translatedText;
                textareaElem.value = translatedText;
                let preview = document.querySelector("#preview-" + row + " td.translation");
                if (preview != null) {
                    preview.innerText = translatedText;
                    preview.value = translatedText;
                    pretrans = "FoundName";
                    // We need to alter the status otherwise the save button does not work
                    current.innerText = "transFill";
                    current.value = "transFill";
                    //10-05-2022 PSS added poulation of status
                    select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                    var status = select.querySelector("dt").nextElementSibling;
                    status.innerText = "transFill";
                    status.value = "transFill";
                    // we need to set the checkbox as marked
                  //  preview = document.querySelector(`#preview-${row}`);
                    if (is_pte) {
                        rowchecked = preview.querySelector(".checkbox input");
                    }
                    else {
                       rowchecked = preview.querySelector(".myCheckBox input");
                    }
                    if (rowchecked != null) {
                        if (result != "No suggestions") {
                            //rowchecked.checked = true;
                            counter++;
                        }
                        else {rowchecked.checked =false}
                    }
                    if (result != "No suggestions") {
                        result = validateEntry(destlang, textareaElem, "", "", row, locale, record,false);
                        mark_as_translated(row)
                    }
                }
            }
        }
        else {
            console.debug('Found plural!');
        }   
    }
    // Translation completed  
    translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
    translateButton.className += " translated";
    translateButton.innerText = "Translated";
    //let Buttons = editor.querySelector(".panel-header-actions")
   // let closeButton = Buttons.querySelectorAll("button")
    // PSS we need to hide the last editor
    editor.style.display = "";
    // PSS setting the value to "" solves the problem of closing the last preview
    preview.style.display = "";
    toastbox("info", "We have found: " + counter, "2500", "TM records");
    if (GlotPressBulkButton != null) {
        if (counter > 0) {
            let button = GlotPressBulkButton.getElementsByClassName("button")
            button[0].disabled = true;
        }
    }

}

async function mark_as_translated(row){
    //14-09-2021 PSS changed the class to meet GlotDict behavior
    let currentClass = document.querySelector(`#editor-${row}`);
    let prevcurrentClass = document.querySelector(`#preview-${row}`);

    currentClass.classList.replace("no-translations", "has-translations");
    currentClass.classList.replace("untranslated", "status-waiting");
    currentClass.classList.add("wptf-translated");

    //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
    prevcurrentClass.classList.replace("no-translations", "has-translations");
    prevcurrentClass.classList.replace("untranslated", "status-waiting");
    prevcurrentClass.classList.replace("status-fuzzy", "status-waiting");
    prevcurrentClass.classList.add("wptf-translated");
    // 12-03-2022 PSS changed the background if record was set to fuzzy and new translation is set
    prevcurrentClass.style.backgroundColor = "#ffe399";
}

async function translatePage(apikey, apikeyDeepl, apikeyMicrosoft, apikeyOpenAI, OpenAIPrompt, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, completedCallback, OpenAISelect, openAIWait, OpenAItemp, spellCheckIgnore, deeplGlossary, OpenAITone) {
    //console.time("translation")
    var translate;
    var transtype = "";
    var plural_line = "";
    var plural_present = "";
    var record = "";
    var row = "";
    var newrow;
    var rowfound = "";
    var preview = "";
    var pretrans;
    var timeout = 0;
    var mytimeout = 1000;
    var vartime = 500;
    var stop = false;
    var editor = false;
    var counter = 0;
    var myrecCount = 0;
    var previewClass;

    //24-07-2023 PSS corrected an error causing DeepL, Google, and Microsoft to translate very slow
    if (transsel == 'OpenAI') {
        if (OpenAISelect != 'gpt-4') {
            vartime = 800;
        }
        else {
            vartime = openAIWait;
        }
    }
    locale = checkLocale();
    // We need to fetch the setting for mocking

    if (typeof (Storage) !== "undefined") {
        interCept = localStorage.getItem("interXHR");
    }
    else {
        interCept = false;
        //console.debug("Cannot read localstorage, set intercept to false");
    }

    // Check if the value exists and is either "true" or "false"
    if (interCept === null || (interCept !== "true" && interCept !== "false")) {
        // If the value is not present or not a valid boolean value, set it to false
        interCept = false;
        localStorage.setItem("interXHR", interCept);
    }

    sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });
8
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
    translateButton.innerText = "Translate";
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

    // 15-05-2021 PSS added fix for issue #73
    // 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
    if (typeof postTranslationReplace != "undefined" && postTranslationReplace.length != 0) {
        if (typeof preTranslationReplace != "undefined" && preTranslationReplace.length != 0) {
            // PSS 21-07-2022 Currently when using formal, the translation is still default #225
            setPostTranslationReplace(postTranslationReplace,formal);
            setPreTranslationReplace(preTranslationReplace);
            myrecCount = document.querySelectorAll("tr.editor")   
            for (let record of myrecCount) { 
               // setTimeout(async function () {
                    counter++;
                    transtype = "single";
                    // 16-08-2021 PSS fixed retranslation issue #118
                    //rowfound =record.id
                    //rowfound = await record.parentElement.parentElement.parentElement.parentElement.id;
                    //console.debug("from preview:", record)
                    
                   // row = rowfound.split("-")[1];
                    let myrow = record.getAttribute("row");
                    let newrow = rowfound.split("-")[1];
                    if (typeof newrow != "undefined") {
                        newrowId = row.concat("-", newrow);
                        row = newrowId;
                    }
                    else {
                        row = myrow
                    }
                   // let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                    let currec = record.querySelector("div.editor-panel__left div.panel-header");
                    // We need to determine the current state of the record
                    if (currec != null) {
                        var current = await currec.querySelector("span.panel-header__bubble");
                        var prevstate = current.innerText;
                    }  
                    let original = record.querySelector("div.editor-panel__left div.panel-content span.original-raw").innerText;
                    // 14-08-2021 PSS we need to put the status back of the label after translating

                    let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
                    //console.debug("transname:",transname)
                    if (transname != null) {
                        transname.className = "trans_name_div";
                        transname.innerText = "URL, name of theme or plugin or author!";
                        // In case of a plugin/theme name we need to set the button to blue
                        let curbut = document.querySelector(`#preview-${row} .priority .tf-save-button`);
                       // console.debug("currbut:",curbut)
                        curbut.style.backgroundColor = "#0085ba";
                        curbut.innerText = "Save";
                        curbut.title = "Save the string";
                        transtype = "single";
                    }
                    // If in the original field "Singular is present we have a plural translation
                    

                    pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
                    //console.debug(" plural present:",pluralpresent)
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
                    toTranslate = true;
                    // Check if the comment is present, if not then if will block the request for the details name etc.
                    let element = record.querySelector(".source-details__comment");
                    if (element != null) {
                        let comment = record.querySelector(".source-details__comment p").innerText;
                        comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                        toTranslate = checkComments(comment.trim());
                    }
                    // Do we need to translate as we did not find a comment??
                    if (toTranslate) {
                        pretrans = await findTransline(original, destlang);
                        // 07-05-2021 PSS added pretranslate in pages
                        if (pretrans == "notFound") {
                            // 20-06-2021 PSS fixed that translation stopped when the page already is completely translated issue #85
                            if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                                document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = "hide";
                            }
                            if (transsel == "google") {
                                result = await googleTranslate(original, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                                if (errorstate == "Error 400") {
                                    messageBox("error", "API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!");
                                    //alert("API key not valid. Please pass a valid API key. \r\nPlease check your licence in the options!!!");
                                    stop = true;
                                    // break;
                                }
                                else {
                                    if (errorstate != "OK") {
                                        messageBox("error", "There has been some uncatched error: " + errorstate);
                                        //alert("There has been some uncatched error: " + errorstate);
                                        stop = true;
                                        // break;
                                    }
                                }
                            }
                            else if (transsel == "deepl") {
                                // console.debug("before translate:",original,row)
                                result = await deepLTranslate(original, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary);
                                if (result == "Error 403") {
                                    messageBox("error", "Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!");
                                    //alert("Error in translation received status 403, authorisation refused.\r\nPlease check your licence in the options!!!");
                                    stop = true;
                                    // break;
                                }
                                else if (result == "Error 400") {
                                    messageBox("error", "Error in translation received status 400 with readyState == 3<br>Language: " + destlang + " not supported!");
                                    //alert("Error in translation received status 400 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                                    stop = true;
                                    // break;
                                }
                                else if (result == "Error 456") {
                                    messageBox("error", "Error 456 Quota exceeded. The character limit has been reached");
                                    stop = true;
                                    //break;
                                }
                                else {
                                    //console.debug("errorstate:",errorstate)
                                    if (errorstate != "OK") {
                                       // messageBox("error", "There has been some uncatched error: " + errorstate);
                                        //alert("There has been some uncatched error: " + errorstate);
                                        stop = true;
                                        console.debug("we break!!")
                                        //break;
                                    }
                                }
                            }
                            else if (transsel == "microsoft") {
                                result = await microsoftTranslate(original, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                                if (result == "Error 401") {
                                    messageBox("error", "Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!");
                                    //alert("Error in translation received status 401, authorisation refused.\r\nPlease check your licence in the options!!!");
                                    stop = true;
                                    //  break;
                                }
                                else if (result == "Error 403") {
                                    messageBox("error", "Error in translation received status 403<br>Language: " + destlang + " not supported!");
                                    //alert("Error in translation received status 403  \r\nLanguage: " + language + " not supported!");
                                    stop = true;
                                    //  break;
                                }
                                else {
                                    if (errorstate != "OK") {
                                        messageBox("error", "There has been some uncatched error: " + errorstate);
                                        //alert("There has been some uncatched error: " + errorstate);
                                        stop = true;
                                        //  break;
                                    }
                                }
                            }
                            else if (transsel == "OpenAI") {
                                let result = await AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone);
                                if (errorstate == "Error 401") {
                                    messageBox("error", "Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid.");
                                    // alert("Error in translation received status 401 \r\nThe request is not authorized because credentials are missing or invalid.");
                                    stop = true;
                                    // break;
                                }
                                else if (result == "Error 403") {
                                    // messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                                    //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                                    stop = true;
                                    // break;
                                }
                                else if (result == "Error 429") {
                                    // messageBox("error", "Error in translation received status 429 :" + errorstate);
                                    //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                                    stop = true;
                                    // break
                                }
                                else {
                                    //console.debug("errorstate:",errorstate)
                                    if (errorstate != "OK") {
                                        messageBox("error", "There has been some uncatched error: " + errorstate);
                                        stop = 'true';
                                        // break;
                                        //alert("There has been some uncatched error: " + errorstate);
                                    }
                                }
                            }
                        } else {
                            // Pretranslation found!
                            let translatedText = pretrans;
                            // check if the returned translation does have the same start/ending as the original
                            if (translatedText != "No suggestions") {
                                result = await check_start_end(translatedText, "", 0, "", original, "", 0);
                            }
                            let textareaElem = record.querySelector("textarea.foreign-text");
                            textareaElem.innerText = translatedText;
                            textareaElem.value = translatedText;
                            if (typeof current != "undefined") {
                                current.innerText = "transFill";
                                current.value = "transFill";
                            }
                            // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                            select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
                            //select = next_editor.getElementsByClassName("meta");
                            var status = select.querySelector("dt").nextElementSibling;
                            status.innerText = "transFill";
                            status.value = "transFill";
                            let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                            if (currec != null) {
                                var current = currec.querySelector("span.panel-header__bubble");
                            }
                            // console.debug("before validate:", destlang, textareaElem, "org: ",original,"locale: ", locale)
                            // if it is a local translation we still need to set the quality of the translation!!
                            await validateEntry(destlang, textareaElem, "", "", row, locale, record,false);
                            // PSS 10-05-2021 added populating the preview field issue #68
                            // Fetch the first field Singular
                            let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(1) span.translation-text");
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            } else {
                                //console.debug("we are in the wrong preview:", row)
                                var preview = document.querySelector("#preview-" + row + " td.translation");
                                let spanmissing = preview.querySelector(" span.missing");
                                if (spanmissing != null) {
                                    if (plural_line == "1") {
                                        spanmissing.remove();
                                    }
                                    if (transtype != "single") {
                                        ul = document.createElement("ul");
                                        preview.appendChild(ul);
                                        var li1 = document.createElement("li");
                                        li1.style.cssText = "text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;";
                                        ul.appendChild(li1);
                                        var small = document.createElement("small");
                                        li1.appendChild(small);
                                        small.appendChild(document.createTextNode("Singular:"));
                                        var br = document.createElement("br");
                                        li1.appendChild(br);
                                        var myspan1 = document.createElement("span");
                                        myspan1.className = "translation-text";
                                        li1.appendChild(myspan1);
                                        myspan1.appendChild(document.createTextNode(translatedText));

                                        // Also create the second li
                                        var li2 = document.createElement("li");
                                        //li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                        ul.appendChild(li2);
                                        var small = document.createElement("small");
                                        li2.appendChild(small);
                                        small.appendChild(document.createTextNode("Plural:"));
                                        var br = document.createElement("br");
                                        li2.appendChild(br);
                                        var myspan2 = document.createElement("span");
                                        myspan2.className = "translation-text";
                                        li2.appendChild(myspan2);
                                        myspan2.appendChild(document.createTextNode("empty"));

                                    } else {
                                        // console.debug("this is the one!!!!")
                                        // console.debug("prev:",preview)
                                        let spanmissing = preview.querySelector(" span.missing");
                                        if (spanmissing != null) {
                                            // console.debug("removing span");
                                            spanmissing.remove();
                                        }

                                        var myspan1 = document.createElement("span");
                                        myspan1.className = "translation-text";
                                        myspan1.appendChild(document.createTextNode(""));
                                        preview.appendChild(myspan1);
                                        myspan1.innerText = translatedText;
                                        current.innerText = "transFill";
                                        current.value = "transFill";

                                        let localpresent = preview.querySelector("div.trans_local_div:nth-of-type(1)");
                                        // 17-02-2034 PSS do not add the label twice
                                        if (localpresent == null) {
                                            let element1 = document.createElement("div");
                                            element1.setAttribute("class", "trans_local_div");
                                            element1.setAttribute("id", "trans_local_div");
                                            element1.appendChild(document.createTextNode("Local"));
                                            preview.appendChild(element1);
                                        }
                                        preview = document.querySelector(`#preview-${row}`);
                                        if (translatedText != "No suggestions" && translatedText != "No suggestions due to overload openAI!!") {
                                            rowchecked = preview.querySelector("td input");
                                            if (rowchecked == null) {
                                                rowchecked = preview.querySelector("th input");
                                            }
                                            if (rowchecked != null) {
                                                if (!rowchecked.checked) {
                                                    rowchecked.checked = true;
                                                }
                                            }
                                        }
                                        await mark_as_translated(row);
                                    }
                                } else {
                                    // if it is as single with local then we need also update the preview
                                    let spanmissing = preview.querySelector(" span.missing");
                                    if (spanmissing != null) {
                                        // console.debug("removing span");
                                        spanmissing.remove();
                                    }
                                    let textareaElem = preview.querySelector("span.translation-text");
                                    // console.debug("textareaElem", textareaElem)
                                    // PSS 30-07-2022 fixed error when record is already present with span
                                    if (typeof textareaElem == null) {
                                        var myspan1 = document.createElement("span");
                                        myspan1.className = "translation-text";
                                        textareaELem.appendChild(myspan1);
                                        myspan1.appendChild(document.createTextNode("empty"));
                                        myspan1.innerText = translatedText;
                                        myspan1.value = translatedText;
                                    }
                                    else {
                                        textareaElem.innerText = translatedText;
                                    }
                                    current.innerText = "transFill";
                                    current.value = "transFill";
                                    let localpresent = preview.querySelector("div.trans_local_div:nth-of-type(1)");
                                    // 17-02-2034 PSS do not add the label twice
                                    if (localpresent == null) {
                                        let element1 = document.createElement("div");
                                        element1.setAttribute("class", "trans_local_div");
                                        element1.setAttribute("id", "trans_local_div");
                                        element1.appendChild(document.createTextNode("Local"));
                                        preview.appendChild(element1);
                                    }
                                    // we need to set the checkbox as marked
                                    preview = document.querySelector(`#preview-${row}`);
                                    if (is_pte) {
                                        rowchecked = preview.querySelector(".checkbox input");
                                    }
                                    else {
                                        rowchecked = preview.querySelector(".myCheckBox input");
                                    }
                                    if (translatedText != "No suggestions" && translatedText != "No suggestions due to overload openAI!!") {
                                        if (rowchecked != null) {
                                            if (!rowchecked.checked) {
                                                rowchecked.checked = true;
                                            }
                                        }
                                    }
                                }
                                // we need to set the editor record to translated
                                currentClass = record;
                                currentClass.classList.replace("no-translations", "has-translations");
                                currentClass.classList.replace("untranslated", "status-waiting");
                                currentClass.classList.replace("status-fuzzy", "status-waiting");
                                currentClass.classList.add("wptf-translated");
                                previewClass = preview;
                                previewClass.classList.replace("no-translations", "has-translations");
                                previewClass.classList.replace("untranslated", "status-waiting");
                                previewClass.classList.replace("status-fuzzy", "status-waiting");
                                previewClass.classList.add("wptf-translated");
                            }
                            let localButton = document.getElementById("translate-" + row + "-translocal-entry-local-button");
                            if (localButton != null) {
                                localButton.style.visibility = "visible";
                            }
                        }
                        // 10-04-2021 PSS added translation of plural into translatePage
                        let e = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                        if (e != null) {
                            checkplural = e.querySelector(`#editor-${row} .source-string__plural span.original`);
                            // console.debug("we are in plural:",checkplural.innerText)
                            if (checkplural != null) {
                                transtype = "plural";
                                plural_line = "2";
                                let plural = checkplural.innerText;
                                // console.debug("Plural: ", plural_line, plural)
                                let pretrans = await findTransline(plural, destlang);
                                if (pretrans == "notFound") {
                                    if (transsel == "google") {
                                        result = await googleTranslate(plural, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, editor, spellCheckIgnore);
                                        if (errorstate == "Error 400") {
                                            messageBox("error", "API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!");
                                            //alert("API key not valid. Please pass a valid API key. \r\nPlease check your licence in the options!!!");
                                            // break;
                                        }
                                        else {
                                            if (errorstate != "OK") {
                                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                                //alert("There has been some uncatched error: " + errorstate);
                                                // break;
                                            }
                                        }
                                    }
                                    else if (transsel == "deepl") {
                                        // 22-05-2022 PSS fixed issue #211, the original var was used instead of plural
                                        result = deepLTranslate(plural, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary);
                                        if (result == "Error 403") {
                                            messageBox("error", "Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!");
                                            //alert("Error in translation received status 403, authorisation refused.\r\nPlease check your licence in the options!!!");
                                            //  break;
                                        }
                                        else if (result == "Error 400") {
                                            messageBox("error", "Error in translation received status 400 with readyState == 3<br>Language: " + destlang + " not supported!");
                                            //alert("Error in translation received status 400 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                                            // break;
                                        }
                                        else if (result == "Error 456") {
                                            messageBox("error", "Error 456 Quota exceeded. The character limit has been reached");
                                            // break;
                                        }
                                        else {
                                            if (errorstate != "OK") {
                                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                                //alert("There has been some uncatched error: " + errorstate);
                                                // break;
                                            }
                                        }
                                    }
                                    else if (transsel == "microsoft") {
                                        result = await microsoftTranslate(plural, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                                        if (result == "Error 401") {
                                            messageBox("error", "Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!");
                                            //alert("Error in translation received status 401, authorisation refused.\r\nPlease check your licence in the options!!!");
                                            //break;
                                        }
                                        else if (result == "Error 403") {
                                            messageBox("error", "Error in translation received status 403<br>Language: " + destlang + " not supported!");
                                            //alert("Error in translation received status 403  \r\nLanguage: " + language + " not supported!");
                                            // break;
                                        }
                                        else {
                                            if (errorstate != "OK") {
                                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                                //alert("There has been some uncatched error: " + errorstate);
                                                // break;
                                            }
                                        }
                                    }
                                    else if (transsel == "OpenAI") {
                                        result = await AITranslate(plural, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone);

                                        if (result == "Error 401") {
                                            messageBox("error", "Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid.");
                                            // alert("Error in translation received status 401 \r\nThe request is not authorized because credentials are missing or invalid.");
                                            // break;
                                            stop = true;
                                        }
                                        else if (result == "Error 403") {
                                            messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                                            //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                                        }
                                        else if (result == "Error 429") {
                                            //messageBox("error", "Error in translation received status 429 :" + errorstate);
                                            //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                                            stop = true;
                                        }
                                        else {
                                            if (errorstate != "OK") {
                                                stop = true;
                                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                                // break;
                                                //alert("There has been some uncatched error: " + errorstate);
                                            }
                                        }
                                    }
                                }
                                else {
                                    //console.debug("we are in plural")
                                    // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
                                    // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
                                    let translatedText = pretrans;
                                    //console.debug("pretrans:",translatedText)
                                    let rowId = row.split("-")[0];
                                    //console.debug("rowId:", rowId)
                                    if (current.innerText == "current") {
                                        //console.debug(" plural has current:",rowId)
                                        textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                                        textareaElem1.innerText = translatedText;
                                        textareaElem1.value = translatedText;
                                        // the code below is to populate the Russion and Ukrain plurals
                                        textareaElem2 = record.querySelector("textarea#translation_" + rowId + "_2");
                                        if (textareaElem2 != null) {
                                            plural = plural + "_02"
                                            let pretrans = await findTransline(plural, destlang);
                                            console.debug("res:", pretrans)
                                            translatedText = pretrans
                                            textareaElem2.innerText = translatedText;
                                            textareaElem2.value = translatedText;
                                        }

                                        textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
                                        console.debug("elem3:", textareaElem3)
                                        if (textareaElem3 != null) {
                                            plural = plural + "_03"
                                            let pretrans = await findTransline(plural, destlang);
                                            console.debug("res:", pretrans)
                                            translatedText = pretrans
                                            textareaElem3.innerText = translatedText;
                                            textareaElem3.value = translatedText;
                                        }

                                        // Populate the second line in preview Plural
                                        if (prevstate != "current") {
                                            let preview = document.querySelector("#preview-" + rowId + " td.translation");
                                            if (preview != null) {
                                                preview.innerText = translatedText;
                                                preview.value = translatedText;
                                                var element1 = document.createElement("div");
                                                element1.setAttribute("class", "trans_local_div");
                                                element1.setAttribute("id", "trans_local_div");
                                                element1.appendChild(document.createTextNode("Local"));
                                                preview.appendChild(element1);
                                            }
                                        }
                                    }
                                    else {
                                        // 30-10-2021 PSS added a fix for issue #154
                                        // If the span missing is present it needs to be removed and the ul added otherwise the second line cannot be populated
                                        check_span_missing(row, plural_line);
                                        //console.debug("after span missing:",current.innerText)
                                        // let rowId = row.split("-")[0];
                                        //console.debug("translated plural row:",row,rowId)
                                        textareaElem1 = document.querySelector("textarea#translation_" + rowId + "_1");
                                        textareaElem1.innerText = translatedText;
                                        textareaElem1.value = translatedText;
                                        // the code below is to populate the Russion and Ukrain plurals
                                        textareaElem2 = record.querySelector("textarea#translation_" + rowId + "_2");
                                        if (textareaElem2 != null) {
                                            plural = plural + "_02"
                                            let pretrans = await findTransline(plural, destlang);
                                            if (pretrans != null) {
                                                console.debug("res:", pretrans)
                                                translatedText = pretrans
                                                textareaElem2.innerText = translatedText;
                                                textareaElem2.value = translatedText;
                                            }
                                        }

                                        textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
                                        console.debug("elem3:", textareaElem3)
                                        if (textareaElem3 != null) {
                                            plural = plural + "_03"
                                            let pretrans = await findTransline(plural, destlang);
                                            if (pretrans != null) {
                                                console.debug("res:", pretrans)
                                                translatedText = pretrans
                                                textareaElem3.innerText = translatedText;
                                                textareaElem3.value = translatedText;
                                            }
                                        }

                                        let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(2) .translation-text");
                                        //console.debug("previewElem 3052:",previewElem)
                                        if (previewElem != null) {
                                            previewElem.innerText = translatedText;
                                            previewElem.value = translatedText;
                                            var element1 = document.createElement("div");
                                            element1.setAttribute("class", "trans_local_div");
                                            element1.setAttribute("id", "trans_local_div");
                                            element1.appendChild(document.createTextNode("Local"));
                                            previewElem.appendChild(element1);
                                        }
                                        // current.innerText = "transFill";
                                        // current.value = "transFill";
                                    }
                                }
                                //let rowId = row.split("-")[0];
                                preview = document.querySelector(`#preview-${row}`);
                                // console.debug("preview after plural:",preview)
                                if (translatedText != "No suggestions" && translatedText != "No suggestions due to overload openAI!!") {
                                    rowchecked = preview.querySelector("th input");
                                    if (rowchecked == null) {
                                        rowchecked = preview.querySelector("th input");
                                    }
                                    if (rowchecked == null) {
                                        rowchecked = preview.querySelector("td input");
                                    }
                                    if (rowchecked != null) {
                                        if (!rowchecked.checked) {
                                            rowchecked.checked = true;
                                        }
                                    }
                                }
                                previewClass = preview;
                                previewClass.classList.replace("no-translations", "has-translations");
                                previewClass.classList.replace("untranslated", "status-waiting");
                                previewClass.classList.replace("status-fuzzy", "status-waiting");
                                previewClass.classList.add("wptf-translated");
                            }
                        }
                    } else {
                        // This is when urls/plugin/theme names are present or local translation is present
                        let translatedText = original;
                        let preview = document.querySelector("#preview-" + row + " td.translation");
                        if (preview == null) {
                            preview = document.querySelector("#preview-" + myrow + " td.translation");
                        }
                        let spanmissing = preview.querySelector(" span.missing");
                        if (spanmissing != null) {
                            spanmissing.remove();
                        }
                        var myspan1 = document.createElement("span");
                        myspan1.className = "translation-text";
                        myspan1.appendChild(document.createTextNode(""));
                        preview.appendChild(myspan1);
                        myspan1.innerText = translatedText;
                        let textareaElem = record.querySelector("textarea.foreign-text");

                        // let preview = document.querySelector("#preview-" + row + " td.translation");
                        if (textareaElem != null) {
                            textareaElem.innerText = translatedText;
                            textareaElem.value = translatedText
                            // preview.innerText = translatedText;
                            // preview.value = translatedText;
                            // We need to alter the status otherwise the save button does not work
                            current.innerText = "transFill";
                            current.value = "transFill";

                        }
                        if (toTranslate == false) {
                            nameDiff = false;
                            showName = true;
                        }
                        else {
                            showName = false;
                        }
                        if (showName == true) {
                            let originalElem = document.querySelector("#preview-" + row + " .original");
                            showNameLabel(originalElem)
                        }
                        preview = document.querySelector(`#preview-${row}`);
                        // we need to set the button to "save"
                        let curbut = preview.querySelector(`.tf-save-button`);
                        //console.debug("currbut:", curbut)
                        if (curbut != null) { 
                           curbut.style.backgroundColor = "#0085ba";
                           curbut.innerText = "Save";
                           curbut.title = "Save the string";
                        }
                        rowchecked = preview.querySelector("td input");
                        if (rowchecked == null) {
                            rowchecked = preview.querySelector("th input");
                        }
                        if (translatedText != "No suggestions" && translatedText != "No suggestions due to overload openAI!!") {
                            if (rowchecked != null) {
                                if (!rowchecked.checked) {
                                    rowchecked.checked = true;
                                }
                            }
                        }                       
                        await mark_as_translated(row)              
                       // await validateEntry(destlang, textareaElem, "", "", row);
                    }
                    // single translation completed
                    if (completedCallback) {
                        let textareaElem = record.querySelector("textarea.foreign-text");
                        completedCallback(original, textareaElem.innerText);
                    }
                    if (counter == myrecCount.length) {
                        // Translation completed we need to stop spinning the translate button
                        let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
                        translateButton.className += " translated";
                        translateButton.innerText = "Translated"; 
                    }  
               // }, timeout);
               // timeout += vartime;  
                if (stop == true){
                    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
                    translateButton.className += " translated";
                    translateButton.innerText = "Translated"; 
                    messageBox("error", "End There has been some uncatched error: " + errorstate);
                    break;
                }
            }
        } else {
            messageBox("error", "Your pretranslate replace verbs are not populated add at least on line!");
            // 07-07-2021 Fix for issue #98
            translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " after_error";
        }
    } else {
        messageBox("error", "Your postreplace verbs are not populated add at least on line!");
        // 07-07-2021 Fix for issue #98
        translateButton = document.querySelector(".paging a.translation-filler-button");
        translateButton.className += " after_error";
         }
   // console.timeEnd("translation");
}

function check_span_missing(row,plural_line) {
    let preview = document.querySelector("#preview-" + row + " td.translation");
    let spanmissing = preview.querySelector(" span.missing");
    if (spanmissing != null) {
        //if (plural_line == "1") {
            // only remove when it is present and first plural line
            spanmissing.remove();
        //}
        ul = document.createElement("ul");
        preview.appendChild(ul);
        var li1 = document.createElement("li");
        li1.style.cssText = "text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;";
        ul.appendChild(li1);
        var small = document.createElement("small");
        li1.appendChild(small);
        small.appendChild(document.createTextNode("Singular:"));
        var br = document.createElement("br");
        li1.appendChild(br);
        var myspan1 = document.createElement("span");
        myspan1.className = "translation-text";
        li1.appendChild(myspan1);
        myspan1.appendChild(document.createTextNode("empty"));
        // Also create the second li
        var li2 = document.createElement("li");
        ul.appendChild(li2);
        var small = document.createElement("small");
        li2.appendChild(small);
        small.appendChild(document.createTextNode("Plural:"));
        var br = document.createElement("br");
        li2.appendChild(br);
        var myspan2 = document.createElement("span");
        myspan2.className = "translation-text";
        li2.appendChild(myspan2);
        myspan2.appendChild(document.createTextNode("empty"));
    }
}

async function checkEntry(rowId, postTranslationReplace, formal, convertToLower, completedCallback, spellCheckIgnore) {
    var translatedText;
    var formal = checkFormal(false);
    var editor;
    var plural;
    setPostTranslationReplace(postTranslationReplace, formal);
    editor = await document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`)
    let original = editor.querySelector("span.original-raw").innerText;
    let text = editor.querySelector("textarea.foreign-text").value;
    // posprocess the translation
    translatedText = postProcessTranslation(original, text, replaceVerb, text, "checkEntry", convertToLower, spellCheckIgnore, locale);
    textareaElem = editor.querySelector("textarea.foreign-text");
    textareaElem.innerText = translatedText;       
    textareaElem.value = translatedText;
    textareaElem.style.height = "auto";
    textareaElem.style.height = textareaElem.scrollHeight + "px";
    // We need to get the original of the plural
    plural = await editor.querySelector(`#editor-${rowId} .source-string__plural span.original-raw`);
    if (plural != null) {
        original = plural.innerText;
        if (original != null) {
            let newrowId = rowId.split("-")[0];
            textareaElem1 = editor.querySelector("textarea#translation_" + newrowId + "_1");
            let pluralText = textareaElem1.value;
            translatedText = postProcessTranslation(original, pluralText, replaceVerb, text, "checkEntry", convertToLower, spellCheckIgnore, locale);
            textareaElem1.value = translatedText
        }
    }
}

async function setLowerCase(rowId,spellCheckIgnore) {
    var translatedText;
    var editor;
    editor = await document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`)
    let original = editor.querySelector("span.original-raw").innerText;
    let text = editor.querySelector("textarea.foreign-text").value;
    // posprocess the translation
    textareaElem = editor.querySelector("textarea.foreign-text");
    if (text !=""){
       translatedText = convert_lower(text, spellCheckIgnore);
       textareaElem.innerText = translatedText;       
       textareaElem.value = translatedText;
       textareaElem.style.height = "auto";
       textareaElem.style.height = textareaElem.scrollHeight + "px";
       // We need to get the original of the plural
       plural = await editor.querySelector(`#editor-${rowId} .source-string__plural span.original-raw`);
       if (plural != null) {
          original = plural.innerText;
          if (original != null) {
              let newrowId = rowId.split("-")[0];
              textareaElem1 = editor.querySelector("textarea#translation_" + newrowId + "_1");
              let pluralText = textareaElem1.value;
              translatedText = convert_lower(text, spellCheckIgnore);
              textareaElem1.value = translatedText
          }
       }
    }
}


async function translateEntry(rowId, apikey, apikeyDeepl, apikeyMicrosoft, apikeyOpenAI, OpenAIPrompt, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, completedCallback, OpenAISelect, OpenAItemp, spellCheckIgnore, deeplGlossary,OpenAITone) {
    var translateButton;
    var result;
    locale = checkLocale();
    currWindow = window.self;
    if (typeof (Storage) !== "undefined") {
        interCept = localStorage.getItem("interXHR");
    }
    else {
        interCept = false;
        //console.debug("Cannot read localstorage, set intercept to false");
    }
    // Check if the value exists and is either "true" or "false"
    if (interCept === null || (interCept !== "true" && interCept !== "false")) {
        // If the value is not present or not a valid boolean value, set it to false
        interCept = false;
        localStorage.setItem("interXHR", interCept);
    }
    //console.debug("in translateentry:", interCept)
    sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept });

    translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`); 
    if (translateButton == null) {
        // original is already translated
        translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
    }
    // if row is already translated we need to remove the classes
    if (translateButton.className == "translation-entry-my-button") {
           // console.debug("it is not started")
            translateButton.className += " started";
    }
    else {
            translateButton.classList.remove("translation-entry-my-button", "started", "translated");
            translateButton.classList.remove("translation-entry-my-button", "restarted", "translated");
            translateButton.className = "translation-entry-my-button restarted";
            translateButton.innerText = "Translate"
    }
    
    //16 - 06 - 2021 PSS fixed this function to prevent double buttons issue #74
    // 07-07-2021 PSS need to determine if current record
    let g = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = g.querySelector("span.panel-header__bubble");
    var transtype = "";
    var plural_line = "";
    var checkplural = "";
    // To check if a plural is present we need to select the plural line!!
    var checkplural = document.querySelector(`#editor-${rowId} .source-string__plural span.original`);
    if (checkplural == null) {
        transtype = "single";
    }
    else {
        transtype = "plural";
        plural_line = "1";
    }
    detail_preview = document.querySelector(`#preview-${rowId}`);
    detail_glossary = detail_preview.querySelector(`.glossary-word`)
    if (detail_glossary != null) {
        detail_glossary = true
    }
    else {
        detail_glossary = false
    }
    // console.debug("detail row textarea:", myrec)
   // if (myrec != null) {
        // mytextarea = myrec.getElementsByClassName('foreign-text autosize')[0];
   // mytextarea = document.querySelector(`#editor-${rowId} .textareas`)
    textarea = g.getElementsByClassName('foreign-text autosize')
         //console.debug("detail row textarea:", mytextarea)  
        //console.debug("start mutationsserver:",StartObserver)
        //if (StartObserver) {
           // if (detail_glossary) {
               // start_editor_mutation_server(textarea, "Details")
           // }
            // PSS only within the editor we want to copy the original to clipboard is parameter is set

       // }
   // }

    // 15-05-2021 PSS added fix for issue #73
    if (postTranslationReplace.length != 0) {
        if (preTranslationReplace != 0) {
            // PSS 21-07-2022 Currently when using formal, the translation is still default #225
            setPostTranslationReplace(postTranslationReplace, formal);
            setPreTranslationReplace(preTranslationReplace);
            let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
            let original = e.querySelector("span.original-raw").innerText;
            // PSS 09-03-2021 added check to see if we need to translate
            let toTranslate = true;
            // Check if the comment is present, if not then it will block the request for the details name etc.   
            let element = e.querySelector(".source-details__comment");
            if (element != null) {
                // Fetch the comment with name
                let comment = e.querySelector("#editor-" + rowId + " .source-details__comment p").innerText;
                toTranslate = checkComments(comment.trim());
            }
            let textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = "";
            textareaElem.value = "";
            if (toTranslate) {
                // console.debug("we need to translate");
                let pretrans = await findTransline(original, destlang);
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        result = await googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                        if (errorstate == "Error 400") {
                            messageBox("error", "API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!");
                           // alert("API key not valid. Please pass a valid API key. \r\nPlease check your licence in the options!!!");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                //alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "deepl") {
                        result = await deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary);
                        console.debug("result:",result)
                        if (result == 'Error 403') {
                            messageBox("error", "Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!");
                        }
                        else if (result == 'Error 404') {
                            messageBox("error", "Error in translation received status 404 The requested resource could not be found.<br>Or the glossary provided is not present<br>" + deeplGlossary);
                            translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
                            // if row is already translated the rowId has different format, so we need to search with this different format
                            if (translateButton == null) {
                                translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
                            }
                            translateButton.className += " translated_error";
                            translateButton.innerText = "Error";
                        }
                        else if (result == "Error 400") {
                            messageBox("error", "Error in translation received status 400 with readyState == 3<br>Language: " + destlang + " not supported!");
                        }
                        else if (errorstate == "Error 456") {
                            messageBox("error", "Error 456 Quota exceeded. The character limit has been reached");
                        }
                        else {
                            if (errorstate != "OK" && errorstate !=false) {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                               // alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "microsoft") {
                        result = await microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                        if (result == "Error 401") {
                            messageBox("error", "Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid.");
                           // alert("Error in translation received status 401 \r\nThe request is not authorized because credentials are missing or invalid.");
                        }
                        else if (result == "Error 403") {
                            messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                            //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                //alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "OpenAI") {
                        let editor = true;
                        result = await AITranslate(original, destlang, e, apikeyOpenAI, OpenAIPrompt, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, editor, "1", OpenAISelect, OpenAItemp, spellCheckIgnore,OpenAITone);
                        if (result == "Error 401") {
                            messageBox("error", "Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid.");
                            // alert("Error in translation received status 401 \r\nThe request is not authorized because credentials are missing or invalid.");
                        }
                        else if (result == "Error 403") {
                            messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                            //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                //alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = "hide";
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
                    // if row is already translated the rowId has different format, so we need to search with this different format
                    if (translateButton == null) {
                        translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
                    }
                    translateButton.className += " translated";
                    translateButton.innerText = "Translated";
                   // console.debug("translatedText:",translatedText)
                }
                else {
                    let translatedText = pretrans;
                    // check if the returned translation does have the same start/ending as the original
                    if (translatedText != "No suggestions") {
                        result = await check_start_end(translatedText, "", 0, "", original, "", 0);
                    }
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    current.innerText = "transFill";
                    current.value = "transFill";
                   
                   
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = "visible";
                    // Translation completed
                    translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
                    // if row is already translated the rowId has different format, so we need to search with this different format
                    if (translateButton == null) {
                        translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
                    }
                    translateButton.className += " translated";
                    translateButton.innerText = "Translated";
                }
            }
            else {
                // no translation needed
                let translatedText = original;
                let textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                textareaElem.value = translatedText;
                current.innerText = "transFill";
                current.value = "transFill";

               // await validateEntry(destlang, textareaElem, "", "", rowId);
                // Translation completed
                translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
                // if row is already translated the rowId has different format, so we need to search with this different format
                if (translateButton == null) {
                    translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
                }
                translateButton.className += " translated";
                translateButton.innerText = "Translated";
            }
            let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
            let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original-raw`);
            if (checkplural != null) {
                let plural = checkplural.innerText;
                var transtype = "plural";
                let pretrans = await findTransline(plural, destlang);
                plural_line = "2";
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        result = googleTranslate(plural, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                        if (errorstate == "Error 400") {
                            messageBox("error", "API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "deepl") {
                       // console.debug("language:",destlang)
                        result = await deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary);
                        if (result == "Error 403") {
                            messageBox("error", "Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!");
                        }
                        else if (result == 'Error 404') {
                            messageBox("error", "Error in translation received status 404 The requested resource could not be found.");
                        }
                        else if (result == "Error 400") {
                            messageBox("error", "Error in translation received status 400 with readyState == 3<br>Language: " + destlang + " not supported!");
                        }
                        else if (result == "Error 456") {
                            messageBox("error", "Error 456 Quota exceeded. The character limit has been reached");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "microsoft") {
                        result = await microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                        if (result == "Error 401") {
                            messageBox("error", "Error in translation received status 401000<br>The request is not authorized because credentials are missing or invalid.");
                            //alert("Error in translation received status 401000, The request is not authorized because credentials are missing or invalid.");
                        }
                        else if (result == "Error 403") {
                            messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                           // alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                               // alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "OpenAI") {
                        let editor = true;
                        result = await AITranslate(plural, destlang, e, apikeyOpenAI, OpenAIPrompt, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, DeeplFree, editor, "1", OpenAISelect, OpenAItemp, spellCheckIgnore,OpenAITone);
                        if (result == "Error 401") {
                            messageBox("error", "Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid.");
                            // alert("Error in translation received status 401 \r\nThe request is not authorized because credentials are missing or invalid.");
                        }
                        else if (result == "Error 403") {
                            messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                            //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                //alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                }
                else {
                    let translatedText = pretrans;
                    // 21-06-2021 PSS fixed not populating plural issue #86
                    // 07-07-2021 PSS fixed problem with populating when status is current
                    if (current != "null") {
                        let row = rowId.split("-")[0];
                        textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                       // await validateEntry(destlang, textareaElem1, "", "", rowId);
                    }
                    else {
                        textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                        //await validateEntry(destlang, textareaElem1, "", "", rowId);
                        document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = "visible";
                    }
                }
            }
            else {
                //console.debug("checkplural null");
            }
            
            // Translation completed
            // we need to validate the results from local as well, to remove the glossary markings if present
            result = await validateEntry(destlang, textareaElem, "", false, rowId, locale, e, false);
            let myleftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`)
            remove_all_gloss(myleftPanel)
            mark_glossary(myleftPanel, "", textareaElem.textContent, rowId, false)

           // translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            // if row is already translated the rowId has different format, so we need to search with this different format
           // if (translateButton == null) {
                translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
          //  }
           // translateButton.className += " translated";
           // translateButton.innerText = "Translated";
            //validateEntry(destlang, textareaElem, "", "", rowId);

            if (completedCallback) {
                let textareaElem = e.querySelector("textarea.foreign-text");
                let translatedText = textareaElem.value;
                completedCallback(original, translatedText);
            }
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

async function saveLocal() {
    // 04-08-2022 PSS Bulksave does not save all records and "dismiss message" is not dismissed #228
    var counter = 0;
    var timeout = 0;
    var timout = 1000;
    vartime = 1000;
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    //console.debug("saveLocal started",is_pte)
    for (let preview of document.querySelectorAll("tr.preview.status-waiting")) {
    //document.querySelectorAll("tr.preview.status-waiting").forEach((preview) => {
        setTimeout(async function (stop) {
       
        if(is_pte) {
                checkset = preview.querySelector(".checkbox input");
            }
        else {
                checkset = preview.querySelector(".myCheckBox input");
            }
        let rowfound = preview.id;
        row = rowfound.split("-")[1];
        let newrow = rowfound.split("-")[2];
        if (typeof newrow != "undefined") {
            newrowId = row.concat("-", newrow);
            row = newrowId;
        }
        // If a translation alreay has been saved, there is no checkbox available
        if (checkset != null) {
            //nextpreview = preview.nextElementSibling.nextElementSibling;
            if (checkset.checked) {
                counter++;         
                    //toastbox("info", "Saving suggestion: " + (i + 1), "600", "Saving", myWindow);
                let editor = preview.nextElementSibling;
                //console.debug("editor:",editor)
                    // 06-07-2023 PSS changed to not open the editor anymore
                    //preview.querySelector("td.actions .edit").click();
                if (editor != null) {
                        let rowfound = editor.id;
                        let editorRow = rowfound.split("-")[1];
                        // 27-09-2022 PSS added a fix for issue #246 do not show saved previews
                        // 11-02-2023 PSS added fix for issue #280 bulksave if waiting suggestions does not work
                        if (rowfound.split("-")[2] != null) {
                            editorRow = rowfound.split("-")[1] + "-" + rowfound.split("-")[2];
                        }
                        // if the record is a waiting we need to select the approve button issue #268
                        let current = document.querySelector(`#editor-${editorRow} span.panel-header__bubble`);
                        if (current.innerText == 'waiting' || current.innerText == 'transFill') {
                            //console.debug("we have a waiting")
                            // 06-07-2023 PSS changed to not open the editor anymore
                            let bulk_save = preview.querySelector(".tf-save-button");
                            bulk_save.click();          
                            // else we need to select the save button
                            // editor.querySelector(".translation-actions__save").click();
                            // PSS confirm the message for dismissal
                            waitForMyElement('.gp-js-message', 1000)
                                .then(element => {
                                   // console.log('Element found:', element);
                                   // element.click();
                                            // Do something with the element
                                            let nothidden = document.querySelector(`#editor-${editorRow}`);
                                            if (nothidden != null) {
                                               // console.debug("found not hidden")
                                                nothidden.classList.add("wptf-saved");
                                                nothidden.classList.remove("untranslated")
                                                //nothidden.classList.add("translated")
                                                nothidden.classList.remove("no-translations")
                                                nothidden.classList.add("has-translations")
                                                nothidden.classList.add("status-waiting")
                                                preview.classList.remove("wptf-translated")
                                                current.innerText = "Waiting"
                                            }
                                })
                                .catch(error => {
                                    console.error('Error:', error.message);
                                });
                        }
                    }
            } else {
                if (preview != null) {
                    if (is_pte) {
                       rowchecked = preview.querySelector(".checkbox input");
                    }
                    else {
                        rowchecked = preview.querySelector(".myCheckBox input");
                    }
                    if (rowchecked != null) {
                        if (rowchecked.checked) {
                            rowchecked.checked = false;
                        }
                    }
                }
            }
        }
        else {
            console.debug("No checkbox available");
            }
        }, timeout, stop);
        timeout += vartime;
    }
    return counter;
}

// Function to walk through the HTML table
function walkThroughTable(selector, interval) {
    var timeout = 1000;
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
               // console.log('Element found:', element);
                clearInterval(checkInterval);
                resolve(element);
            }
            // Walk through the HTML table here
            const tableRows = document.querySelectorAll('tr.preview.status-waiting');
            tableRows.forEach(preview => {
                // Do something with each row of the table
                setTimeout(() => { 
                    let editor = preview.nextElementSibling;
                    if (editor != null) {
                      //  console.log("editor:", editor);
                        if (editor != null) {
                            let rowfound = editor.id;
                            let editorRow = rowfound.split("-")[1];
                            // 27-09-2022 PSS added a fix for issue #246 do not show saved previews
                            // 11-02-2023 PSS added fix for issue #280 bulksave if waiting suggestions does not work
                            if (rowfound.split("-")[2] != null) {
                                editorRow = rowfound.split("-")[1] + "-" + rowfound.split("-")[2];
                            }
                            let current = document.querySelector(`#editor-${editorRow} span.panel-header__bubble`);
                            if (current.innerText == 'waiting' || current.innerText == 'transFill') {
                                //console.debug("we have a waiting")
                                // 06-07-2023 PSS changed to not open the editor anymore
                                let bulk_save = preview.querySelector(".tf-save-button");
                                bulk_save.click();
                                waitForMyElement('.gp-js-message', 300)
                            }
                        }
                    }
                }, timeout);
                timeout += 1000;
            });
        }, interval);
        resolve("Ready")
    });
}

function saveLocal_1() {
// Usage example: Walk through the HTML table while waiting for an element with id "specificElement" every 500 milliseconds
    walkThroughTable('.gp-js-message', 100)
    .then(element => {
        console.debug("Done!!")
        // Do something with the found element
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


// Function to perform an action on each record in the HTML table
function processTableRecords(selector, action, interval) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    return new Promise((resolve, reject) => {
        const tableRows = document.querySelectorAll(selector);
        //console.debug("tableRows:",tableRows)
        let currentIndex = 0;
        // Function to process the next record
        function processNextRecord() {
            if (currentIndex < tableRows.length) {
               // console.debug("currindex:", currentIndex)
               // console.debug("currRow:", tableRows[currentIndex])
                const currentRow = tableRows[currentIndex];
                    action(currentRow)
                        .then(() => {
                            // Move to the next record after the action is completed
                            //currentIndex++;
                            setTimeout(processNextRecord, interval);
                            currentIndex++;
                        })
                        .catch(error => {
                            reject(error);
                    });
              
            } else {
                // All records processed
                resolve();
            }
        }
        // Start processing the first record
        processNextRecord();
    });
}

function saveLocal_2(bulk_timer) {
    // Usage example: Process each row in the HTML table with class "myTable", perform an action, and wait 1000 milliseconds between records
   // console.debug("bulk save started")
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var preview;
    var time_out = 1;
    var checkset;
    var checkcount = 0;
    var counter = 0;
    var line_read = 0
    var editor;
    var original;
    var dismiss;
    StartObserver =false
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    var myheader = document.querySelector('#wpadminbar');
    var progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar == null) {
        myheader.insertAdjacentHTML('beforebegin', template);
    }
    else {
        progressbar.style.display = 'block';
    }
    
    processTableRecords('.wptf-translated', async function (preview) {
        //console.debug("preview:",preview,preview.classList)
        // we only need to read the translated lines by wptf
        if (preview.classList.contains("wptf-translated")) {
            // Perform your action on the current row here 
            checkset = preview.querySelector('input[type="checkbox"]')
            //console.debug("checkset:", checkset)
            if (checkset != null && checkset.checked == true) {
                // 13-06-2024 PSS we only count the read lines when the checkbox is ticket
                line_read++
                editor = preview.nextElementSibling;
                if (editor != null) {
                    let rowfound = editor.id;
                    let editorRow = rowfound.split("-")[1];
                    // 27-09-2022 PSS added a fix for issue #246 do not show saved previews
                    // 11-02-2023 PSS added fix for issue #280 bulksave if waiting suggestions does not work
                    if (rowfound.split("-")[2] != null) {
                        editorRow = rowfound.split("-")[1] + "-" + rowfound.split("-")[2];
                    }
                    let current = editor.querySelector('span.panel-header__bubble');
                    if (current.innerText == 'waiting' || current.innerText == 'transFill' && checkset.checked == true) {
                        let preview = document.querySelector(`#preview-${editorRow}`);
                        let editor = preview.nextElementSibling;
                        original = editor.querySelector("span.original-raw").innerText;
                        let glotpress_suggest = editor.querySelector(".translation-actions__save");
                        // PSS do not set style to none!!! it will then skip records
                        editor.style.display = "";
                        glotpress_suggest.classList.remove("disabled")
                        //glotpress_suggest.click();
                        new Promise(resolve => setTimeout(async () => {
                            preview.querySelector("td.actions .edit").click();
                            try {
                                glotpress_suggest.click();                     
                                new Promise(resolve => setTimeout(async () => {
                                    // we need to wait for saving the record        
                                    // waitForMyElement(`#gp-js-message`, 500)
                                    await waitForMyElement(`.gp-js-message-dismiss`, 1500).then((dismiss) => {
                                        // console.debug("dismiss message:", dismiss)
                                        if (dismiss != "Time-out reached") {
                                            dismiss = document.querySelector(`.gp-js-message-dismiss`)
                                            if (dismiss != null) {
                                                dismiss.click()
                                            }
                                            counter++
                                        }
                                        else {
                                            //console.debug("Timeout in waiting for message")
                                            original = editor.querySelector("span.original-raw").innerText;
                                            toastbox("info", "Skipping:" + original, "800", "Timeout in saving");
                                            // Sometimes the previewline is not hidden but saved, so we need to hide it
                                            preview = document.querySelector(`#preview-${editorRow}`);
                                            if (preview != null) {
                                                if (preview.style.display != " none") {
                                                    if (preview.classList.contains("wptf-translated")) {
                                                        // preview.style.display = "none"
                                                         preview.classList.replace("status-waiting", "status-hidden");
                                                    }
                                                }
                                            }
                                        }
                                    });
                                    if (is_pte) {
                                        current.innerText = "current"
                                    }
                                    else {
                                        current.innerText = "waiting"
                                    }
                                    resolve("ready")
                                    // PSS we need to give GlotPress time to removed the "saved" message
                                }), 20000).then(() => {
                                    // Sometimes the previewline is not hidden but saved, so we need to hide it
                                    preview = document.querySelector(`#preview-${editorRow}`);
                                    if (preview != null) {
                                        if (preview.style.display != " none") {
                                            if (preview.classList.contains("wptf-translated")) {
                                                  //preview.style.display = ""
                                                  preview.classList.replace("status-waiting", "status-hidden");
                                            }
                                        }
                                    }
                                    //glotpress_close.click()
                                    //checkset.checked = false;
                                    resolve("ready")
                                });
                            } catch (error) {
                                console.log(`Error: ${error.message}`);
                            }
                            //await glotpress_suggest.click();
                           
                        }), bulk_timer);
                    }
                    else {
                        //console.debug("checkbox present but not set or not in waiting mode")
                        let original = editor.querySelector("span.original-raw").innerText;
                        if (original != null) {
                            toastbox("info", "Skipping:" + original, "700", "Skipping record:");
                        }
                        else {
                          //  toastbox("info", "Record maybe already saved or not selected", "900", "Skipping record:");
                        }
                    }
                }
                else {
                    toastbox("info", "Editor not open", "900", "Record not saved:" + original);
                   // console.debug("Editor not open!!")
                }
            }
            else {
               // console.debug("unchecked count:", checkcount)
               // toastbox("info", "Record maybe already saved or not selected", "900", "Skipping record");
                //console.debug("No checkset found!")
            }
            
            //close_toast()
        }
        else {
           // console.log("ClassList of preview:",preview.classList)
        }
    }, bulk_timer)
        .then(() => {
            progressbar = document.querySelector(".indeterminate-progress-bar");
            if (progressbar != null) {
                progressbar.style.display = "none";
                StartObserver = true;
                messageBox("info", "We have read:" + line_read + " records and saved:" + counter);
               // console.log('All records processed    
            }
            else {console.debug("no progressbar!")}
        })
        .catch(error => {
            console.error('Error:', error);
        });
    
}
async function bulkSave(noDiff,bulk_timer) {
     //event.preventDefault();
     var counter = 0;
     var checkboxCounter = 0;
     var row;
     var myWindow;
     var nextpreview;
     var myinterCept = false;

     var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    currWindow = window.self;
    //interCept = localStorage.getItem('interXHR')
    // Check if the value exists and is either "true" or "false"
    //if (interCept === null || (interCept !== "true" && interCept !== "false")) {
        // If the value is not present or not a valid boolean value, set it to false
      //  interCept = "false"
      //  localStorage.setItem("interXHR", interCept);
    //}

   // sendMessageToInjectedScript({ action: 'updateInterceptRequests', interceptRequests: interCept, transProcess: 'bulksave' });

     // PSS 17-07-2022 added anhancement to set the checkboxes automatically issue#222
     if (is_pte) {
         document.querySelectorAll('.checkbox input').forEach(function (elem) {
             if (elem.checked == true) {
                 checkboxCounter++;
             }
         });
     }
     else {
         document.querySelectorAll('.myCheckBox input').forEach(function (elem) {
             if (elem.checked == true) {
                 checkboxCounter++;
             }
         });
     }
     if (checkboxCounter == 0) {
         cuteAlert({
             type: "question",
             title: "Bulk save",
             message: "There are no records selected, <br>are you sure you want to select all records?",
             confirmText: "Confirm",
             cancelText: "Cancel",
             myWindow: currWindow
         }).then(async (e) => {
             if (e == ("confirm")) {
                 //When performing bulk save the difference is shown in Meta #269
                 //value = false;
                 //chrome.storage.local.set({ toonDiff: value }).then((result) => {
                   //  console.log("Value toonDiff is set to false");
                 //});
                 setmyCheckBox(event);
                 let value = noDiff;
                 await setToonDiff({ toonDiff: value });
                 counter = saveLocal_2(bulk_timer);
                 //When performing bulk save the difference is shown in Meta #269
                 //value = true;
                 //chrome.storage.local.set({ toonDiff: value }).then((result) => {
                 //    console.log("Value toonDiff is set to true");
                // });
             } else {
                 messageBox("info", "Bulk save cancelled");
             }
         })
     } else {
         //When performing bulk save the difference is shown in Meta #269
         let value = noDiff;
         // console.debug("value:",value)
         await setToonDiff({ toonDiff: value });
        // counter = saveLocal();
         //counter = saveLocal_1();
         counter = saveLocal_2(bulk_timer);
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

// Function to wait for an element to be shown on the page
function waitForMyElement(selector, timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        // Function to check if the element is visible
        function checkElement() {
            const element = document.querySelector(selector);
            if (element) {
                //console.debug("Found in:",element)
                // Element found, resolve the promise
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                // Timeout reached, reject the promise
                resolve("Time-out reached")
                //reject(new Error(`Timeout (${timeout} ms) exceeded while waiting for element with selector "${selector}"`));
            } else {
                // Element not found, check again after a short delay
                setTimeout(checkElement, 150); // Check again after 150 milliseconds
            }
        }

        // Initial check
        checkElement();
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
       // console.log("Search result:",window[`__${selector}`]);
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
    var el;
    var timeout = 100;
    var findsel;
    return new Promise((resolve, reject) => {
        //console.debug("within elementReady",selector)
            // PSS issue #203 improvement
        setTimeout(() => {
            el = document.querySelector(selector);
            //console.debug("el:",el)
        }, timeout);
        //console.debug("eltype:", typeof el);
        if (typeof el !=null && typeof el !='undefined') {
            resolve(el);
      
        }
        else {
            new MutationObserver((mutationRecords, observer) => {
                // Query for elements matching the specified selector
               // console.debug("new elementReady", selector);
                findsel = document.querySelectorAll(selector);
                //console.debug("findsel:", findsel.length,findsel);
                if (findsel.length != "0") {
                    Array.from(document.querySelectorAll(selector)).forEach((element) => {
                        resolve(selector);
                        //console.debug("resolved:",selector)
                        //Once we have resolved we don't need the observer anymore.
                        observer.disconnect();
                    });
                }
                else {
                    resolve("No suggestions");
                    }
            })
                .observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
        }
    });
}

async function waitForElm(selector, newWind) {
    var mydoc;
    //console.debug("Selector:", selector,typeof newWind);
    if (typeof newWind == 'undefined') {
       //console.debug("No window supplied")
        newWind = window;
    }
   
    return new Promise(resolve => {
        if (newWind.document.querySelector(selector)) {
            //console.debug("Selector found");
            return resolve(newWind.document.querySelector(selector));
        }
        const observer = new MutationObserver(mutations => {
            if (newWind.document.querySelector(selector)) {
                //console.debug("In observer found");
                resolve(newWind.document.querySelector(selector));
                observer.disconnect();
            }
            else {
                //console.debug("Selector not found");
                resolve("No suggestions")
            }
        });

        observer.observe(newWind.document.body, {
            childList: true,
            subtree: true
        });
    });
}

/**
 ** function copied from stackoverflow created by eclanrs
 /**
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
    //console.debug("keywords:",keywords)
    keywords.sort((a, b) => b.length - a.length);
    //console.debug("is ? in keywords:", keywords[0].includes('?'))
    Array.from(elem.childNodes).forEach(child => {
        if (!keywords[0].includes('?')) {
            const keywordRegex = RegExp(keywords.join('|'), flags)
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
        }
        else {
            const frag = document.createDocumentFragment();
            let lastIdx = 0;
            keywordRegex = keywords.join('|')
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
            if (child.parentNode != null) {
                child.parentNode.replaceChild(frag, child);
            }
        }
    });
}


// This function processes the result of the fetch
async function processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current) {
    var result;
    var myRowId = rowId;
    var previousCurrent = current
    let debug = false
    var preview;
    var td_preview;
    if (debug == true) {
        console.debug("translatedText:", translatedText)
        console.debug("record:", record)
        console.debug("rowId:", myRowId)
        console.debug("transtype:", transtype)
        console.debug("plural_line:", plural_line)
        console.debug("current:", current)
    }
    if (transtype == "single") {
        //console.debug("processTransl:",record)
        textareaElem = await record.querySelector("textarea.foreign-text");
        textareaElem.innerText = translatedText;
        textareaElem.innerHTML = translatedText;
        textareaElem1 = textareaElem
        // PSS 29-03-2021 Added populating the value of the property to retranslate            
        textareaElem.value = translatedText;
        //PSS 25-03-2021 Fixed problem with description box issue #13
        textareaElem.style.height = "auto";
        textareaElem.style.height = textareaElem.scrollHeight + "px";
      
        if (current.innerText != "waiting" && current.innerText != "fuzzy") {
            preview = await record.previousElementSibling
        }
        else {
            preview = await document.querySelector("#preview-" + myRowId)
        }
        current.innerText = "transFill";
        current.value = "transFill";
       // console.debug("in process:",preview)
        if (preview != null) {
            td_preview = preview.querySelector("td.translation");
        }
        else {
             console.debug("problem with preview:", preview, myRowId)
        }
       
        // if we are in a single editor without preview, then no need to set the preview text
        if (td_preview != null) {
            td_preview.innerText = translatedText;
            td_preview.innerValue = translatedText;
        }
        myRowId = record.getAttribute("row");
        if (myRowId == null) {
            myRowId =rowId
        }
        // PSS this needs improvement
        let process_current = document.querySelector(`#editor-${myRowId} span.panel-header__bubble`);
        if (typeof process_current != 'undefined') {
            process_current.innerText = "transFill"
        }
       // preview = document.querySelector(`#preview-${myRowId}`);
        //console.debug("my preview:",preview)
        let prevcurrentClass = preview;
        //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
        //console.debug("previouscurrentClass:", typeof prevcurrentClass)
        //console.debug("current:",typeof current)
        prevcurrentClass.classList.replace("no-translations", "has-translations");
        if (translatedText != "No suggestions") {
            prevcurrentClass.classList.replace("untranslated", "status-waiting");
            prevcurrentClass.classList.replace("status-fuzzy", "status-waiting");
            prevcurrentClass.classList.add("wptf-translated");
        }
        else {
            prevcurrentClass.classList.replace("untranslated", "status-nosuggestions");
        }
        let leftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`)
        result = await validateEntry(language, textareaElem, "", false, myRowId, locale, record, false);
        //console.debug("translateEntry:",result)
      //  if (result.toolTip.length != 0) {
         //trans mark_glossary(leftPanel, result.toolTip, translatedText, rowId)
      //  }
       // if (result.newText != "") {
        //    let editorElem = document.querySelector("#editor-" + myRowId + " .original");
            //let editorElem = document.querySelector("#editor-" + rowId + " .original");
           // mark_original(editorElem, result.newText)
            //console.debug("We are in editor!:",editorElem)
            //19-02-2023 PSS we do not add the marker twice, but update it if present
        //    let markerpresent = editorElem.querySelector("span.mark-explanation");
       //     if (markerpresent == null) {
         //       let markdiv = document.createElement("div");
         //       markdiv.setAttribute("class", "marker");
          //      let markspan1 = document.createElement("span");
           //     let markspan2 = document.createElement("span");
           //     markspan1.setAttribute("class", "mark-devider");
            //    markspan1.style.color = "blue";
            //    markspan2.setAttribute("class", "mark-explanation");
            //    markdiv.appendChild(markspan1);
             //   markdiv.appendChild(markspan2);
            //   editorElem.appendChild(markdiv);
            //    markspan1.innerHTML = "----- Missing glossary verbs are marked -----<br>"
               // markspan2.innerHTML = result.newText;
           // }
           //else {
            //    if (markerpresent != null) {
                   // markerpresent.innerHTML = result.newText;
             //   }
              //  else { console.debug("markerpresent not found")}
             //  }
       
       // }
    }
    else {
        // PSS 09-04-2021 added populating plural text
        // PSS 09-07-2021 additional fix for issue #102 plural not updated
        //console.debug("current innertext", current.innerText)
        if (current != "null" && current.innerText == "current" && current.innerText == "waiting") {
            plural_row = myRowId.split("-")[0];
            //console.debug('rowId plural:', row)
            textareaElem1 = f.querySelector("textarea#translation_" + plural_row + "_0");
        }
        else {
            //check_span_missing(rowId, plural_line);
            let newrow = myRowId.split("-")[1];
            if (typeof newrow == "undefined") {
                if (transtype != "single") {
                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(1) .translation-text");
                    //console.debug('not single:',rowId,plural_line)
                    if (previewElem == null) {
                        check_span_missing(myRowId, plural_line);
                    }
                }
                if (plural_line == 1) {
                    //populate plural line if not already translated, so we can take original rowId
                    textareaElem1 = document.querySelector("textarea#translation_" + myRowId + "_0");
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    //PSS 25-03-2021 Fixed problem with description box issue #13
                    textareaElem1.style.height = 'auto';
                    textareaElem1.style.height = textareaElem1.scrollHeight + 'px';
                    // Select the first li
                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(1) .translation-text");
                    if (previewElem != null) {
                        previewElem.innerText = translatedText;
                    }
                }
                if (plural_line == 2) {
                    textareaElem1 = document.querySelector("textarea#translation_" + myRowId + "_1");
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    // Select the second li
                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(2) .translation-text");
                    if (previewElem != null) {
                        previewElem.innerText = translatedText;
                    }
                    // the below code is for Russion plural handling
                    textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                    if (textareaElem2 != null) {
                        textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                        textareaElem2.innerText = translatedText;
                        textareaElem2.value = translatedText;
                    }
                    textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                    if (textareaElem3 != null) {
                        textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                        textareaElem3.innerText = translatedText;
                        textareaElem3.value = translatedText;
                    }
                }
                result = await validateEntry(language, textareaElem1, "", "", myRowId, locale, record,true);
            }
            else {
                //console.debug("myRowId:",myRowId,record)
                plural_row = myRowId.split("-")[0];
                if (plural_line == 1) {
                    //populate first line of plural line if already translated
                   // console.debug("record:", record)
                    let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                    //console.debug("f:",f)
                    textareaElem1 = f.querySelector("textarea#translation_" + plural_row + "_0");
                    //console.debug("textareaElem1:",textareaElem1)
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    // the below code is for Russion plural handling
                    textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                    if (textareaElem2 != null) {
                        textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                        textareaElem2.innerText = translatedText;
                        textareaElem2.value = translatedText;
                    }
                    textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                    if (textareaElem3 != null) {
                        textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                        textareaElem3.innerText = translatedText;
                        textareaElem3.value = translatedText;
                    }

                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(1) .translation-text");
                    if (previewElem != null) {
                        previewElem.innerText = translatedText;
                    }
                }
                else {
                    //populate plural line if  already translated
                    let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                    textareaElem1 = f.querySelector("textarea#translation_" + plural_row + "_1");
                    // console.debug('newrow = not undefined!', row + "_1");
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    // the below code is for Russion plural handling
                    textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                    if (textareaElem2 != null) {
                        textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                        textareaElem2.innerText = translatedText;
                        textareaElem2.value = translatedText;
                    }
                    textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                    if (textareaElem3 != null) {
                        textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                        textareaElem3.innerText = translatedText;
                        textareaElem3.value = translatedText;
                    }

                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(2) .translation-text");
                    if (previewElem != null) {
                        previewElem.innerText = translatedText;
                    }
                }
            }
        }
    }
    
    current = current.innerText;
    // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
    if (previousCurrent == "untranslated" || current == "TransFill" || current == "Waiting" ) {
        select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
    }
    else {
        select = record.parentElement
    }
    
    // if the record if opened again we need to check if the status is selected properly
    var status = select.querySelector("dt");
    if (status != null) {
        status = status.nextElementSibling
    }
    else {
        select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`)
        status = select.querySelector("dt");
    }
    
    status.innerText = "transFill";
    // Translation completed
    translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
    // if row is already translated the rowId has different format, so we need to search with this different format
    if (translateButton == null) {
        translateButton = document.querySelector(`#translate-${myRowId}--translation-entry-my-button`);
    }
    if (translateButton != null) {
        translateButton.classList.remove("started", "translated");
        translateButton.classList.remove("restarted", "translated");    
        translateButton.className += " translated";
        translateButton.innerText = "Translated";
    }
    //14-09-2021 PSS changed the class to meet GlotDict behavior
    let currentClass = record;
    //let currentClass = document.querySelector(`#editor-${myRowId}`);
    //console.debug("preview:",typeof preview,preview)
    if (translatedText != "No suggestions") {
        currentClass.classList.replace("no-translations", "has-translations");
        currentClass.classList.replace("untranslated", "status-waiting");
        currentClass.classList.replace("status-fuzzy", "status-waiting");
        currentClass.classList.add("wptf-translated");
    }
    preview = document.querySelector(`#preview-${rowId}`);
    //console.debug("my preview:",preview)
    //let prevcurrentClass = document.querySelector(`#preview-${myRowId}`);
    let prevcurrentClass = preview;
    //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
    //console.debug("previouscurrentClass:", typeof prevcurrentClass)
    //console.debug("current:",typeof current)
    if (translatedText != "No suggestions") {
        prevcurrentClass.classList.replace("no-translations", "has-translations");
        prevcurrentClass.classList.replace("untranslated", "status-waiting");
        prevcurrentClass.classList.replace("status-fuzzy", "status-waiting");
        prevcurrentClass.classList.add("wptf-translated");
    }
    else {
        prevcurrentClass.classList.replace("untranslated", "status-nosuggestions");
    }
    // 12-03-2022 PSS changed the background if record was set to fuzzy and new translation is set
    //prevcurrentClass.style.backgroundColor = "#ffe399";
   // preview = document.querySelector("#preview-" + myRowId)
    // if we do not have a preview, then it is not necessary to mark the quality
    if (preview != null && preview !='undefined') {
       // await validateEntry(language, textareaElem1, "", "", myRowId, locale, record)
       //preview.scrollIntoView({ block: "end" });
    }
    // The line below is necessary to update the save button on the left in the panel
    previousCurrent.innerText = "transFill";
    previousCurrent.value = "transFill";
    return "OK";
}

// PSS 04-03-2021 Completely rewritten the processPlaceholderSpace function, because wrong replacements were made when removing blanks
function processPlaceholderSpaces(originalPreProcessed, translatedText) {
    if (originalPreProcessed == "") {
        //console.debug("preprocessed empty");
    }
    
    var placedictorg = {};
    var placedicttrans = {};
    var found = 0;
    var counter = 0;
    while (counter < 20) {
        // PSS 03-03-2021 find if the placeholder is present and at which position
        found = originalPreProcessed.search("[" + counter + "]");
        // console.debug("processPlaceholderSpaces found start:", found, " ", "[" + counter + "]");
        if (found == -1) {
            break;
        }
        // PSS if at beginning of the line we cannot have a blank before
        if (found == 1) {
            part = originalPreProcessed.substring(found - 1, found + 3);
            placedictorg[counter] = part;
        }
        else if (found == (originalPreProcessed.length) - 3) {
            // PSS if at end of line it is possible that no blank is behind
            // console.debug("found at end of line!!", found);
            part = originalPreProcessed.substring(found - 2, found + 2);
            placedictorg[counter] = part;
        }
        else {
            // PSS we are in the middle
            part = originalPreProcessed.substring(found - 2, found + 3);
            placedictorg[counter] = part;
        }
        //console.debug("processPlaceholderSpaces at matching in original line:", '"' + part + '"');
        counter++;
    }
    var lengteorg = Object.keys(placedictorg).length;
    if (lengteorg > 0) {
        counter = 0;
        while (counter < 20) {
            found = translatedText.search("[" + counter + "]");
            //console.debug("processPlaceholderSpaces found in translatedText start:", found, " ", "[" + counter + "]");
            if (found == -1) {
                break;
            }
            // PSS if at beginning of the line we cannot have a blank before       
            if (found == 1) {
                part = translatedText.substring(found - 1, found + 3);
                placedicttrans[counter] = part;
            }
            else if (found == (translatedText.length) - 3) {
                // PSS if at end of line it is possible that no blank is behind
                //console.debug("found at end of line!!", found);
                // 24-03-2021 find typo was placedictorg instead of placedicttrans
                part = translatedText.substring(found - 2, found + 2);
                //console.debug('found string at end of line:',part);
                placedicttrans[counter] = part;
            }
            else {
                // PSS we are in the middle	
                part = translatedText.substring(found - 2, found + 3);
                placedicttrans[counter] = part;
            }
            //console.debug("processPlaceholderSpaces at matching in translated line:", '"' + part + '"');
            counter++;
        }
        counter = 0;
        // PSS here we loop through the found placeholders to check if a blank is not present or to much
        while (counter < (Object.keys(placedicttrans).length)) {
            orgval = placedictorg[counter];
            let transval = placedicttrans[counter];
            if (placedictorg[counter] == placedicttrans[counter]) {
                //console.debug('processPlaceholderSpaces values are equal!');
            }
            else {
                // console.debug('processPlaceholderSpaces values are not equal!:', '"' + placedictorg[counter] + '"', " " + '"' + placedicttrans[counter] + '"');
                // console.debug('orgval', '"' + orgval + '"');
                if (typeof orgval != "undefined") {
                    if (orgval.startsWith(" ")) {
                        // console.debug("processPlaceholderSpaces in org blank before!!!");
                        if (!(transval.startsWith(" "))) {
                            // 24-03-2021 PSS found another problem when the placeholder is at the start of the line
                            found = translatedText.search("[" + counter + "]");
                            // console.debug('processPlaceholderSpaces found at :', found);
                            if (found != 1) {
                                // console.debug("processPlaceholderSpaces in trans no blank before!!!");
                                repl = transval.substr(0, 1) + " " + transval.substr(1,);
                                translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            }
                        }
                    }
                    else {
                        transval = placedicttrans[counter];
                        repl = transval.substr(1,);
                        // console.debug("processPlaceholderSpaces no blank before in org!");
                        if (transval.startsWith(" ")) {
                            //  console.debug("processPlaceholderSpaces apparently blank in front in trans!!!");
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            // console.debug("processPlaceholderSpaces blank in front removed in trans", translatedText);
                        }
                    }
                    if (!(orgval.endsWith(" "))) {
                        //console.debug("processPlaceholderSpaces apparently in org no blank behind!!!");
                        // console.debug('processPlaceholderSpaces values are not equal!:', '"' + orgval + '"', " ", '"' + transval + '"');
                        if (transval.endsWith(" ")) {
                            // console.debug("processPlaceholderSpaces in trans blank behind!!!");
                            //console.debug('processPlaceholderSpaces values are not equal!:', orgval, transval);
                            // 11-03 PSS changed this to prevent removing the blank if the translated is not at the end of the line
                            // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                            found = translatedText.search("[" + counter + "]");
                            //23-03-2021 PSS added another improvement to the end of the line 
                            foundorg = originalPreProcessed.search("[" + counter + "]");
                            //  console.debug('found at:', found);
                            if (found != (originalPreProcessed.length) - 2) {
                                //if (foundorg===found){
                                repl = transval.substring(0, transval.length - 1);
                                translatedText = translatedText.replaceAt(translatedText, transval, repl);
                                //  console.debug("processPlaceholderSpaces blank in behind removed in trans", translatedText);
                                //}
                            }
                            else {
                                repl = transval.substring(0, transval.length) + " ";
                                translatedText = translatedText.replaceAt(translatedText, transval, repl);
                            }
                        }
                    }
                }
                else {
                    if (!(transval.endsWith(" "))) {
                        // console.debug("processPlaceholderSpaces no blank behind!!!");
                        // 11-03-2021 PSS changed this to prevent removing a blank when at end of line in trans
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        //  console.debug("found at:", found);
                        //  console.debug("length of line:", translatedText.length);
                        if (found != (translatedText.length) - 2) {
                            // console.debug("found at end of line:", found);
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
        //console.debug("processPlaceholderBlank no placeholders found",translatedText);
        return translatedText;
    }
    return translatedText;
}

async function bulkSaveToLocal() {
    //event.preventDefault();
    var counter = 0;
    var checkboxCounter = 0;
    var checkset
    var row;
    var myWindow;
    var nextpreview;
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    //console.debug("Am I PTE?",is_pte)
    currWindow = window.self;
    var recordsFound = false
    document.querySelectorAll("tr.preview").forEach((preview) => {
        if (is_pte) {
            checkset = preview.querySelector(".checkbox input");
        }
        else {
            checkset = preview.querySelector(".myCheckBox input");
        }
        if (checkset != null) {
            //Only waiting and current are allowed to store
            if (preview.classList.contains("status-current") || preview.classList.contains("status-waiting"))
                recordsFound = true
                if (checkset.checked == true) {
                    checkboxCounter++;
                }
        }
    });
    if (checkboxCounter == 0) {
        if (recordsFound == true) {
            cuteAlert({
                type: "question",
                title: "Bulk save to local",
                message: "There are no records selected, <br>are you sure you want to select all records?",
                confirmText: "Confirm",
                cancelText: "Cancel",
                myWindow: currWindow
            }).then(async (e) => {
                if (e == ("confirm")) {
                    setmyCheckBox(event);
                    counter = saveToLocal();
                    cuteAlert({
                        type: "info",
                        title: "Bulk save to local",
                        message: "All records are selected and processed: " + RecCount,
                        confirmText: "Confirm",
                        cancelText: "Cancel",
                        myWindow: currWindow
                    })
                }
                else {
                    messageBox("info", "Bulk save cancelled");
                }
                
         })
    }
    } else {
        counter = saveToLocal();
        cuteAlert({
            type: "info",
            title: "Bulk save to local",
            message: "Records are processed: " + RecCount,
            confirmText: "Confirm",
            cancelText: "Cancel",
            myWindow: currWindow
        })
    }
}

async function saveToLocal() {
    var counter = 0;
    var row;
    RecCount = 0;
    document.querySelectorAll("tr.preview").forEach((preview) => {
        if (is_pte) {
            checkset = preview.querySelector(".checkbox input");
        }
        else {
            checkset = preview.querySelector(".myCheckBox input");
        }
        if (typeof checkset != 'undefined') {
            if (checkset != null){ 
                if (checkset.checked) {
                    //console.debug("checkbox set:", checkset.checked)
                    if (preview.classList.contains("status-current") || preview.classList.contains("status-waiting")) {
                       let rowfound = preview.id;
                       row = rowfound.split("-")[1];
                       let newrow = rowfound.split("-")[2];
                       if (typeof newrow != "undefined") {
                          newrowId = row.concat("-", newrow);
                          row = newrowId;
                       }
                       counter++;
                       // do not show message = false
                       addTransline(row, false)
                    }
                }
            }
        }
    });
    RecCount= counter
    return counter;
}