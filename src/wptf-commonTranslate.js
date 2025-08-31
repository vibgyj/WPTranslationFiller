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
//let youPlaceholderMap = {}; // Will store mapping like { __YOU_0__: "you", __YOUR_0__: "your" }
const placeholderTagMap = {};  
let originalReplaceCounter = 0;
let placeholderMap = {}

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


function setPostTranslationReplace(postTranslationReplace, formal) {
    // PSS 21-07-2022 Currently when using formal, the translation is still default #225
    replaceVerb = [];
    if (postTranslationReplace != undefined) {
        let lines = postTranslationReplace.split("\n");
        lines.forEach(function (item) {
            // Handle blank lines
            if (item != "") {
                if (formal) {
                    item = item.replace(/^##form:/, '')
                }
                else {
                    item = item.replace(/^##def:/, '')
                }
                if (item.startsWith("##") == false) {
                    replaceVerb.push(item.split(","));
                }
            }
        });
    }
}
                       //new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&#x\d{1,4};|&\w{2,6};|%\w*%| # /gi);
const placeHolderRegex = new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&#x\d{1,4};|&\w{2,6};|%\w*%/gi);
const linkRegex = /(https?|ftp|file):\/\/[^\s]+/gi;
// the below regex did not work for links
//const linkRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]<a[^>]*>|<span[^>]*>)/ig;
// the below regex is to prevent DeepL to crash or make no sence of the translation
const markupRegex = new RegExp(/<span[^>]*>|<a[^>]*>|&#[0-9]+;|&[a-z]+;|<ul>|<li>/g);
//const specialChar = new RegExp(/ # | #|\#|\t|\r\n|\r|\n|&#->/ig);
const specialChar = /<[^>]+>|&#[0-9]+;|&[a-z]+;|\r\n|\r|\n|\t|\#|#/gi;
const GoogleRegex = /%(\d{1,2})?\$?[sdl]/gi;


async function preProcessOriginal(original, preverbs, translator) {
    var index = 0;
    
    // We need to replace special chars before translating
    const charmatches = original.matchAll(specialChar);
    if (charmatches != null) {
        index = 1;
        for (const charmatch of charmatches) {
            //  console.debug("charmatch:", charmatch)
            original = original.replace(charmatch, `{special_var${index}}`);
            index++;
        }
    }
    // prereplverb contains the verbs to replace before translation
    for (let i = 0; i < preverbs.length; i++) {
        if (!CheckUrl(original, preverbs[i][0])) {
            // We need to remove the word provided
            if (preverbs[i][0].startsWith("#remove")) {
                original = removeWord(original, preverbs[i][1])
                //console.debug("original after:",original)
            }
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
        original = replacePlaceholdersBeforeTranslation(original);
    }
    else if (translator == "deepl") {

        // Deepl does remove crlf so we need to replace them before sending them to the API
        //original = original.replaceAll('\r', "mylinefeed");
      //  original = original.replace(/(.!?\r\n|\n|\r)/gm, "<x>mylinefeed</x>");
        // Deepl does remove tabs so we need to replace them before sending them to the API
        //let regex = (/&(nbsp|amp|quot|lt|gt);/g);
      //  original = original.replaceAll(/(\t)/gm, "<x>mytb</x>");
        // original = original.replace(/(.!?\r\n|\n|\r)/gm, " [xxx] ");
        // The above replacements are put into the specialchar regex for all api's
      // 1) Define your regex for all the placeholders you care about:
     // Match placeholders (like %1$s, &#123;, %placeholder%, etc.)
     const placeholderRegex = /%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&#x\d{1,4};|&\w{2,6};|%\w*%/gi;

      // Store placeholder mappings for post-replacement

     index = 0;
     placeholderMap = {};
     // Replace each match with a unique token and store original
     const matches = [...original.matchAll(placeholderRegex)];
     for (const match of matches) {
       const token = `<x id="var${index}"/>`;
       original = original.replace(match[0], token);
       placeholderMap[token] = match[0]; // keep mapping to restore later

        index++;
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
       // console.debug("matches:",matches.length)
        if (matches !== null) {
            let index = 1;
            for (const match of matches) {
                const regex = new RegExp(match, "gi"); // Create a global and case-insensitive regex
                original = original.replace(regex, `{var ${index}}`);
                original = original.replace('.{', '. {');
                index++;
            }
        }
        //console.debug("Original:",original)
        // 06-07-2023 PSS fix for issue #301 translation by OpenAI of text within the link
        const linkmatches = original.match(linkRegex);
        if (linkmatches != null) {
            index = 1;
            for (const linkmatch of linkmatches) {
                original = original.replace(linkmatch, `{linkvar ${index}}`);
                //original = original.replace('.{', '. {');
                index++;
            }
        }
       
    }
    return original;
}

function startsWithCapital(word) {
    return /[A-Z]/.test(word.charAt(0))
}


function replaceWord(str, target, replacement) {
   
    if (typeof replacement != 'undefined') {
        // Escape special characters in the target word to prevent regex issues
        const escapedTarget = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

        // Adjusted regex to match even when the target has no spaces around it
        const regex = new RegExp(`\\b${escapedTarget}\\b|${escapedTarget}`, 'g');

        // Replace occurrences with the replacement word

        if (replacement.length != 0) {
            return str.replace(regex, replacement);
        }
        else {
            return str
        }
    }
    else {
        return str
    }
}
//# this function processes the translation after it has been received
function postProcessTranslation (original, translatedText, replaceVerb, originalPreProcessed, translator, convertToLower, spellCheckIgnore, locale) {
    var pos;
    var index = 0;
    var foundIgnore;
     var formal = checkFormal(false);
    let debug = false;
    if (debug == true) {
        console.debug("original: ", original);
        console.debug("translatedText :", translatedText);
        console.debug("replaceVerb :", replaceVerb);
        console.debug("originalPreProcessed :", originalPreProcessed);
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
        translatedText = restorePlaceholdersAfterTranslation(translatedText,original)
    }
    else if (translator == "deepl") {
        //console.debug("placeholdemap:",placeholderMap)
        for (const token in placeholderMap) {
           // console.debug("token:",token)
            const originalValue = placeholderMap[token];

            // Make token safe for regex use
            const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Replace all occurrences in translatedText
            translatedText = translatedText.replace(new RegExp(escapedToken, 'g'), originalValue);
        }

        // We need to replace & and ; before sending the string to DeepL, because DeepL does not hanle them but crashes
        const markupmatches = original.match(markupRegex);
        index = 1;
        if (markupmatches != null) {
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
                translatedText = translatedText.replace(`{Special_var${index}}`, charmatch);
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
        // OpenAI adds sometimes a "'" due to the placeholder at te beginning of the line like '<x>1</x>'
        // So we need to remove the "'"
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
        //console.debug("translated:", translatedText)
        //console.debug("Original:",original)
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
        if (translatedText.startsWith("'") == true && translatedText.endsWith('"') == true) {
            if (original.startsWith("'") != true && original.endsWith('"') != true)
                translatedText = translatedText.substring(1, translatedText.length)
            translatedText = translatedText.substring(0, translatedText.length - 1)
        }
    }
    //If convert to lower is not true, we need to check if there are hyphens present which do not belong there (word is in ignore list)
    // removing the hyphens is also done in lower_case function, so this needs improvement in future
    translatedText = check_hyphen(translatedText, spellCheckIgnore);
    //console.debug("aftercheck_hyphen:",translatedText)
    // check if there is a blank after the tag 
    pos = translatedText.indexOf("</a>");
    found = translatedText.substring(pos, pos + 5);
    if (found.substr(found.length - 1) != " ") {
        if (found.substr(found.length - 1) != "." && found.substr(found.length - 1) != "<" && found.length == 5) {
            translatedText = translatedText.replace("</a>", "</a> ");
        }
    }
    // check if there is a blank between end tag ">" and "." as Google ads that automatically
    // fix for issue #254
    pos = translatedText.indexOf("> .");
    if (pos != -1) {
        translatedText = translatedText.replace("> .", ">");
    }

 
    // for short sentences sometimes the Capital is not removed starting from the first one, so correct that if param is set
     //console.debug("befor convert to lower:", translatedText)
    if (convertToLower == true) {
        translatedText = convert_lower(translatedText, spellCheckIgnore);
        // if the uppercase verbs are set to lower we need to reprocess the sentences otherwise you need to add uppercase variants as well!!
        for (let i = 0; i < replaceVerb.length; i++) {
            // 30-12-2021 PSS need to improve this, because Deepl does not accept '#' so for now allow to replace it
            if (replaceVerb[i][1] != '#' && replaceVerb[i][1] != '&') {
                // PSS solution for issue #291
                replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
                //console.debug(CheckUrl(translatedText, replaceVerb[i][0]))
                if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                    translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                }
            }
            else {
                // PSS solution for issue #291
                replaceVerb[i][0] = replaceVerb[i][0].replaceAll("&#44;", ",")
               // console.debug(CheckUrl(translatedText, replaceVerb[i][0]))
                if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                    translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                }
            }
        }
    }
    else {
       
        // we need to check if the word from the sentence is present in the ignorelist with capital, and the word does not have a capital
        // console.debug("ConvertoLower !=true we need to check the ignore list if the word is in the list")
        //console.debug("checkurl:",translatedText)
        for (let i = 0; i < replaceVerb.length; i++) {
            //console.debug("not convertTolower:",translatedText,replaceVerb[i][0])
            
            if (isWordInUrl(replaceVerb[i][0], translatedText) != true) {
                //console.debug("check url false")
                if (!CheckUrl(translatedText, replaceVerb[i][0])) {
                    translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                   // console.debug("we are replacing 439:", replaceVerb[i][1])
                    translatedText = correctSentence(translatedText, spellCheckIgnore);
                }
                else {
                    // console.debug("we do not replacing 437:", replaceVerb[i][1])
                }
            }
            else {
                //console.debug("the word is in url:",replaceVerb[i][0])
            }
        }
       // console.debug("checkurl:",translatedText)
    }
  
    // check if a sentence has ": " and check if next letter is uppercase
    // maybe more locales need to be added here, but for now only Dutch speaking locales have this grammar rule
    if (locale == "nl" || locale == "nl-be") {
        pos = translatedText.indexOf(": ");
        let positionOfFirstBlank = findFirstBlankAfter(translatedText, pos + 2);
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
    // put special chars back
    const charmatches = original.matchAll(specialChar);
    if (charmatches != null) {
        index = 1;
        for (const charmatch of charmatches) {
            //console.debug("char:", charmatch)
            translatedText = translatedText.replace(`{special_var${index}}`, charmatch);
            translatedText = translatedText.replace(`{Special_var${index}}`, charmatch);
            index++;
        }
    }
    //console.debug("after post: ",translatedText)
    return translatedText;
}

function removeWord(sentence, searchWord) {
    var formal = checkFormal(false);
    var modifiedSentence = sentence;

    if (formal === false) {
        const escapedSearchWord = searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(^|\\s)${escapedSearchWord},?\\s*`, 'gi');

        modifiedSentence = sentence.replace(regex, (match, p1) => {
            return p1 === ' ' ? ' ' : '';
        });
    } else {
        const targetWord = searchWord.toLowerCase();
        if (targetWord !== "please") {
            const regex = new RegExp(`${searchWord},\\s*`, 'gi');
            modifiedSentence = sentence.replace(regex, '');
        }
    }

    // Ensure proper capitalization for words starting new sentences
    modifiedSentence = modifiedSentence.replace(/([.!?])\s+([a-z])/g, (match, p1, p2) => {
        return p1 + ' ' + p2.toUpperCase();
    });

    // Capitalize the first word in the modified sentence if it starts with a lowercase letter
    modifiedSentence = modifiedSentence.replace(/^([a-z])/, (match, p1) => p1.toUpperCase());

    return modifiedSentence;
}
// # We do not want to replace anything if it is a URL
function correctSentence(translatedText, ignoreList) {
    // Check if text is only URL (your existing function)
    let myURL = isOnlyURL(translatedText);
    if (myURL) {
        return translatedText;  // Return early if only URL
    }

    if (!ignoreList || typeof ignoreList !== "string") {
        ignoreList = "";
    }

    // Convert ignore list into an array and map for fast case-insensitive lookup
    let ignoreArray = ignoreList.split(/\r?\n/).map(word => word.trim()).filter(word => word);
    let ignoreMap = new Map();
    ignoreArray.forEach(word => ignoreMap.set(word.toLowerCase(), word));

    // Split text into text parts and tags
    let tagRegex = /<[^>]*>/g;
    let textParts = translatedText.split(tagRegex);
    let tags = translatedText.match(tagRegex) || [];

    let correctedParts = [];

    textParts.forEach((part, idx) => {
        // Split text part by word boundaries preserving punctuation
        let words = part.split(/\b/);

        let correctedWords = words.map((word, index) => {
            let lowerWord = word.toLowerCase();
            let inUrl = isWordInUrl(lowerWord, translatedText); // ✅ Check only once

            // Capitalize if previous word ends with ? or !, and word not in ignore list or URL
            if (index > 0 && /[?!]/.test(words[index - 1])) {
                if (!inUrl && !ignoreMap.has(lowerWord)) {
                    word = word.charAt(0).toUpperCase() + word.slice(1);
                }
            }

            // Replace with ignoreMap value if it exists and is not inside a URL
            if (ignoreMap.has(lowerWord) && !inUrl) {
                return ignoreMap.get(lowerWord);
            }

            return word;
        });

        correctedParts.push(correctedWords.join(''));

        // Reinsert HTML tag if present at this position
        if (idx < tags.length) {
            correctedParts.push(tags[idx]);
        }
    });

    // Join all corrected parts (text + tags) and return
    return correctedParts.join('');
}


// Helper function to detect URLs
function isOnlyURL(text) {
    return /^(https?|ftp|file):\/\/[^\s<>"]+$/.test(text);
}
function wrong_correctSentence(translatedText, ignoreList) {
    // Function to check if a word is a URL
    function isOnlyURL(text) {
        return /https?:\/\/[^\s]+/.test(text);
    }

    // Split sentence into words, but temporarily preserve URLs by replacing them with a placeholder
    let urlPlaceholders = [];
    let processedText = translatedText.replace(/https?:\/\/[^\s]+/g, (url) => {
        const placeholder = `{{url${urlPlaceholders.length}}}`;
        urlPlaceholders.push(url);
        return placeholder;
    });

    // Ensure ignore list is always an array, even if undefined or invalid
    if (!ignoreList || typeof ignoreList !== "string") {
        ignoreList = "";
    }

    // Convert ignore list into an array, handling different line endings
    let ignoreArray = ignoreList.split(/\r?\n/).map(word => word.trim()).filter(word => word);

    // Convert ignore list to a map for fast lookup (case-insensitive)
    let ignoreMap = new Map();
    ignoreArray.forEach(word => ignoreMap.set(word.toLowerCase(), word));

    // Split sentence into words (preserving punctuation)
    let words = processedText.split(/\b/);

    // Process each word
    let correctedWords = words.map((word, index) => {
        let lowerWord = word.toLowerCase();

        // If it's a URL placeholder, just return the URL from the placeholder array
        if (word.startsWith("{{url")) {
            const urlIndex = word.match(/\d+/)[0]; // Extract the index from the placeholder
            return urlPlaceholders[urlIndex];
        }

        // Skip word if it's part of the ignore list
        if (ignoreMap.has(lowerWord)) {
            return ignoreMap.get(lowerWord);
        }

        // Check for words after "?" or "!" to capitalize them
        if (index > 0 && /[?!]/.test(words[index - 1])) {
            // Capitalize if it's not in the ignore list
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }

        return word;
    });

    // Reconstruct the sentence with URLs restored
    let finalSentence = correctedWords.join('');

    // Now replace any remaining URL placeholders with the actual URLs
    urlPlaceholders.forEach((url, index) => {
        finalSentence = finalSentence.replace(`{{url${index}}}`, url);
    });

    return finalSentence;
}



function old_correctSentence(translatedText, ignoreList) {
    // Ensure ignoreList is always an array, even if undefined or invalid
    let myURL = isOnlyURL(translatedText)
    //console.debug("myURL:",myURL)
    if (!myURL) {
        if (!ignoreList || typeof ignoreList !== "string") {
            ignoreList = "";
        }

        // Convert ignore list into an array, handling different line endings
        let ignoreArray = ignoreList.split(/\r?\n/).map(word => word.trim()).filter(word => word);

        // Convert ignore list to a map for fast lookup (case-insensitive)
        let ignoreMap = new Map();
        ignoreArray.forEach(word => ignoreMap.set(word.toLowerCase(), word));

        // Split sentence into words (preserving punctuation)
        let words = translatedText.split(/\b/);

        // Process each word
        let correctedWords = words.map(word => {
            let lowerWord = word.toLowerCase();
            // console.debug("translated after :", translatedText, ignoreMap.has(lowerWord) ? ignoreMap.get(lowerWord) : word)
            return ignoreMap.has(lowerWord) ? ignoreMap.get(lowerWord) : word;
        });

        // Reconstruct and return the corrected sentence
        return correctedWords.join('');
    }
    else {
        return translatedText
    }
}


function check_hyphen(translatedText, spellCheckIgnore) {
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
                    // is a word constains "',s" we need to remove it, otherwise the result is wrong example API's
                    if (checkword.endsWith("'s")) {
                        checkword = checkword.replace("'s", "")
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
                        // we could improve it by converting it to uppercase if the word found is lowercase, but in ignoren it is with uppercase
                       // console.debug("we do not convert:",word)
                        if (startsWithCapital(word)) {
                            capsArray.push(word)
                        }
                        else {
                            capsArray.push(word[0].toUpperCase() + word.slice(1));
                        }
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
            if (!mySentences[i][0].startsWith(" ")) {
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
//# This function checks if a text contains an URL
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
   // console.debug("CheckComments comment:",comment)
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
    //console.debug("Check comments before return:",toTranslate)
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
    setPostTranslationReplace(dataFormal, formal);
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
                    result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced, original, countrows);
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
                        markElements(preview, replaceVerb, orgText, spellcheckIgnore, repl_array);
                    }
                }
                else {
                    // plural line 1
                    let previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(1) span.translation-text");
                    previewNewText = previewElem.innerText;
                    translatedText = previewElem.innerText;
                    // console.debug("plural1 found:",previewElem,translatedText);
                    result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced, original, countrows);
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
                        markElements(previewElem, replaceVerb, orgText, spellcheckIgnore, repl_verb);
                    }
                    // plural line 2
                    previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(2) span.translation-text");
                    // console.debug("plural2:", previewNewText, translatedText);
                    if (previewElem != null) {
                        previewNewText = previewElem.innerText;
                        translatedText = previewElem.innerText;
                        //  console.debug("plural2:", previewNewText, translatedText);
                        result = replElements(translatedText, previewNewText, replaceVerb, repl_verb, countreplaced, original, countrows);
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
                                markElements(previewElem, replaceVerb, orgText, spellcheckIgnore, repl_verb);
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
                    updateStyle(textareaElem, result, "", true, false, false, row, '', false, false, '', [], '', '', false);
                }
            }
        }
        let repldone = __("Replace verbs done: ")
        let replaced = __(" replaced words<br>")
        messageBox("info", repldone + countreplaced + replaced + repl_verb);
        // Translation replacement completed
        let checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
        checkButton.className += " ready";
    }
    else {
        messageBox("error", __("Your postreplace verbs are not populated add at least on line!"));
    }
}

async function checkPage(postTranslationReplace, formal, destlang, apikeyOpenAI, OpenAIPrompt, spellcheckIgnore, showHistory) {
    //console.debug("checkpage started")
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
    var checkboxCounter=0
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
        myheader.insertAdjacentHTML('afterend', template);
        progressbar = document.querySelector(".indeterminate-progress-bar");
        if (progressbar.style != null) {
            progressbar.style.display = 'block';
        }
    }
    else {
        progressbar.style.display = 'block';
    }
    if (is_pte) {
        document.querySelectorAll('.checkbox input').forEach(function (elem) {
           // console.debug("checkbox:",elem)
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
    
      //  console.debug("we are checking")
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
            if (typeof checkButton != null) {
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
                //console.debug("e:",e)
                countrows++;
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
                mypreview = document.querySelector("#preview-" + newrowId);
                if (mypreview == null) {
                    mypreview = document.querySelector("#preview-" + row);
                }
                //console.debug("preview:",mypreview.classList.contains("no-translations"))
                // If the page does not contain translations, we do not need to handle them, if the span is not present, then it means there are translations
                if (!mypreview.classList.contains('no-translations')) {
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
                        
                        if (transtype == "single") {
                            // Fetch the translations
                            let preview = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                            // let element = e.querySelector(".source-details__comment");
                            let textareaElem = e.querySelector("textarea.foreign-text");
                            //console.debug("textareaELem:",textareaElem)
                            translatedText = textareaElem.innerText;
                            //console.debug("translatedText:",translatedText)
                            prev_trans = textareaElem.innerText;

                            if (translatedText != "No suggestions" && translatedText != "") {
                                previewNewText = textareaElem.innerText;
                                let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                                // PSS we need to check for missing periods en blanks before replacing verbs 
                                //console.debug("before check_start:",translatedText)
                                result = await check_start_end(translatedText, previewNewText, recWordCount, repl_verb, original, replaced, countrows);
                                //console.debug("result:",result)
                                replaced = result.replaced;
                                repl_array = result.repl_array;
                                translatedText = textareaElem.innerText;
                                if (replaced) {
                                    mypreview.classList.replace("status-current", "status-waiting");
                                    mypreview.classList.add("wptf-translated");
                                    repl_verb = result.repl_verb;
                                    recWordCount += result.countReplaced;
                                    previewNewText = result.previewNewText
                                    if (preview != null) {
                                        preview.innerHTML = result.previewNewText
                                        textareaElem.innerText = result.previewNewText;
                                    }

                                    await markElements(preview, repl_array, original, spellcheckIgnore, repl_array, translatedText);
                                    
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
                                    // textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, myHistory, my_checkpage, currstring, repl_array, prev_trans, old_status, showDiff) {
                                    updateStyle(textareaElem, result, "", 'True', false, false, row, e, showHistory, true, translatedText, repl_array, prev_trans, old_status, false)
                                }

                                // Need to replace the existing html before replacing the verbs! issue #124
                                // previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                                // let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                                result = await replElements(translatedText, previewNewText, replaceVerb, repl_verb, "", original, countrows);
                                //console.debug("result 1387:",result)
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
                                //console.debug("replaced:",replaced)
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
                                   // let editor_text = result.previewNewText.replace("S")
                                    textareaElem1.innerText = result.previewNewText;
                                    textareaElem1.value = result.previewNewText;
                                    // PSS this needs to be improved
                                    let repl = []
                                    let rec = '.,.'
                                    repl.push(rec.split(","))
                                    //rec = ' , '
                                    // repl.push(rec.split(","))
                                    //console.debug("translatedText:",translatedText,repl_array)
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
                            // console.debug("checkpage nameDiff:",nameDiff)
                           let showName = false 
                            updateStyle(textareaElem, result, "", 'True', showName, nameDiff, row, e, showHistory, true, translatedText, repl_array, prev_trans, old_status, false);
                        }
                    }
                    if (toTranslate == false) {
                        showName = true;
                        nameDiff =false
                    }
                    else {
                        showName = false;
                    }
                    if (showName == true) {
                        let originalElem = document.querySelector("#preview-" + row + " .original");
                        nameDiff = isExactlyEqual(translatedText, originalElem.innerText)
                        showNameLabel(originalElem,row,nameDiff)
                    }

                    //console.debug("rows done:", countrows, tableRecords, countrows == tableRecords,original)
                    if (countrows == tableRecords) {
                        let repldone = __("Replace verbs done: ")
                        let repltext = __(" replaced words<br>")
                        //toastbox("info", __("Replace verbs done:") + recWordCount + __("l replaced words<br>" +repl_verb, "3500"));
                        messageBox("info", repldone + recWordCount + repltext + repl_verb);
                        // Translation replacement completed
                        let checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button"); 
                        checkButton.innerText = "Checked";     
                        checkButton.className = "check_translation-button ready";
                        progressbar = document.querySelector(".indeterminate-progress-bar");
                        progressbar.style.display = "none";
                    }
                }
                else {
                    
                    //console.debug("rows done:", countrows, tableRecords, countrows == tableRecords, original)
                    //continue
                    //console.debug("we have a record within the table that is not translated")
                    if (countrows == tableRecords) {
                        let repldone = __("Replace verbs done: ")
                        let repltext = __(" replaced words<br>")
                        //toastbox("info", __("Replace verbs done:") + recWordCount + __("l replaced words<br>" +repl_verb, "3500"));

                        messageBox("info", repldone + recWordCount + repltext + repl_verb);
                        // Translation replacement completed
                        let checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
                        checkButton.innerText = "Checked";
                        checkButton.className = "check_translation-button ready";
                        progressbar = document.querySelector(".indeterminate-progress-bar");
                        progressbar.style.display = "none";
                    }
                }
            }
        }
        else {
            messageBox("error", __("Your postreplace verbs are not populated add at least on line!"));
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
    var ignore = ["WooCommerce", "Yoast", "strong", "a href", "href"];

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
    repl_array = []
    var replaced = false;
    var orgText = translatedText
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
    return { replaced, previewNewText, translatedText, countreplaced, orgText, repl_verb, repl_array };
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
           // console.debug("preview:","[",previewNewText,"]")
            if (!original.endsWith(" ")) {
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
                if (!translatedText.endsWith(':')) {
                    translatedText = translatedText + ":";
                }
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
                if (translatedText.endsWith(":")) {
                    translatedText = translatedText.substring(0, translatedText.length - 1);
                }
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
                repl_array.push([mark, mark])
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
     if (translatedText.endsWith(" .")) {
                    translatedText = translatedText.replace(' .','.');
                }
    // console.debug("After improvements:", translatedText, previewNewText + " countreplaced: " + countReplaced, repl_verb, replaced)
    if (previewNewText == null) {
        previewNewText = translatedText
    }
    return { translatedText, previewNewText, countReplaced, repl_verb, replaced, repl_array }
}

async function populateWithLocal(apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree,apikeyOpenAI, OpenAIPrompt, OpenAISelect, OpenAITone, OpenAItemp) {
    
    //console.time("translation")
    var translate;
    var transtype = "";
    var plural_line = "";
    var plural_present = "";
    var record = "";
    var row = "";
    var preview;
    var pretrans = 'notFound';
    var counter = 0;
    var rowchecked;
    var plural_single_text;
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var mytransType
    var editor
    var editorElement
    var current
    var myCurr
    
    //destlang = "nl"
    parrotActive = 'true';
    locale = checkLocale();
    //console.debug("replaceVerbs:",postTranslationReplace)
    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);
    //console.debug("replaceVerbs:", replaceVerb)
    //console.debug("formal:",formal)
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.local-trans-button");
    let GlotPressBulkButton = document.getElementById("bulk-actions-toolbar-bottom")
    translateButton.innerText = __("Translating");
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
    myrecCount = document.querySelectorAll("tr.editor")
    tableRecords = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content").length;
    for (let record of myrecCount) {
    //for (let record of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
      //  console.debug("Populatewithlocal record:", record)
        
        transtype = "single";
        myCurr = record.querySelector("div.editor-panel__left div.panel-header");
        mytransType = "none"
        if (myCurr != null) {
            current = await myCurr.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
        }
        // 16-08-2021 PSS fixed retranslation issue #118
        //console.debug("record:",record)
        let rowfound  = record.getAttribute("row");
        //console.debug("rowfound:", rowfound,current.innerText)
        if (current.innerText != "waiting" && current.innerText != "current" && current.innerText != "fuzzy") {
            //row = rowfound.split("-")[1];
           // let newrow = rowfound.split("-")[2];
           // if (typeof newrow != "undefined") {
           //     newrowId = row.concat("-", newrow);
           //     row = newrowId;
           // } else {
           //     rowfound = record.querySelector(`div.translation-wrapper textarea`).id;
            //    row = rowfound.split("_")[1];
            // }
           row = rowfound
        }
        else {
            row = rowfound
           // console.debug("after current:",row)
        }
       // console.debug("Row in populateWithLocal:",row)
        editor = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
        editorElement = editor.querySelector(".foreign-text")
        preview = document.querySelector("#preview-" + row + " td.translation");
        rawPreview = document.querySelector(`#preview-${row}`)
        
        const [type, myTranslated] = await determineType(row, record);

       // console.debug("transtype:", type,myCurr)
        let original = record.querySelector("div.editor-panel__left div.panel-content span.original-raw").innerText;
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
        switch (type) {

            case 'name':
                counter++;
                // console.debug('Handling a name type...', original);
                // We need to determine the current state of the record
                if (myCurr != null) {
                    var current = await myCurr.querySelector("span.panel-header__bubble");
                    var prevstate = current.innerText;
                }
                //console.debug("in name current:",current)
                translatedText = original;
                //console.debug("we have a local",original,row)
                if (typeof preview == 'undefined') {
                    preview = document.querySelector("#preview-" + row + " td.translation");
                }
                spanmissing = preview.querySelector(" span.missing");
                if (spanmissing != null) {
                    spanmissing.remove();
                }

                plural_line = 0
                transtype = 'single'
                // We need to determine the current state of the record
                if (myCurr != null) {
                    var current = await myCurr.querySelector("span.panel-header__bubble");
                    //var prevstate = current.innerText;
                }
                //    console.debug("before process:",current)           
                await processTransl(original, translatedText, locale, record, row, transtype, plural_line, locale, false, current)

                //  mark_as_translated(row, current, true, preview);
                // We need to nameDiff to false otherwise the label will be red
                let originalElem = document.querySelector("#preview-" + row + " .original");
                let currentTrans = document.querySelector("#preview-" + row + " td.translation.foreign-text");
                let originalTrans = originalElem
                nameDiff = isExactlyEqual(currentTrans, originalElem.innerText)
                //nameDiff = false
                showNameLabel(originalElem,row,nameDiff)
                // We need to set the checkbox here, as processTransl thinks we are in editor
                if (is_pte) {
                    rowchecked = rawPreview.querySelector(".checkbox input");
                }
                else {
                    rowchecked = rawPreview.querySelector(".myCheckBox input");
                }

                if (rowchecked != null) {
                    if (!rowchecked.checked) {
                        rowchecked.checked = true;
                    }
                }
                break;

            case 'pretranslated':
               // console.debug("we have a pretranslated:", original)
               // console.debug("translatedText:", translatedText.length)
                
                   counter++;
                   preview = document.querySelector(`#preview-${row}`);
                   if (preview != null) {
                    spanmissing = preview.querySelector(" span.missing");
                       if (spanmissing != null) {
                          spanmissing.remove();
                        }
                   }
                     // if a plural is present within the pretrans we need to deal with it
                     pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
                     //console.debug("after pluralpresent:", pluralpresent)
                   
                    if (pluralpresent != null) {
                        plural_line = "1"
                        transtype = "plural";
                        // console.debug("We do have a plural with pretranslated")
                        await check_span_missing(row, plural_line);
                        // myURl = rawPreview.getElementsByClassName("url_plural")
                        textareaElem = document.querySelector(`#preview-${row} .translation li:nth-of-type(1)`);
                        plural = pluralpresent.innerText
                        // console.debug("current:",current)
                       
                        openAiGloss = []
                        deeplGlossary = []
                        spellCheckIgnore = ""

                        await handle_plural(plural, destlang, record, apikey, apikeyDeepl, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss, transsel, deeplGlossary, current, editor)
                        editorElem = editor.querySelector("textarea.foreign-text");
                        // console.debug("pretranslated before validate:")
                        select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                        //select = next_editor.getElementsByClassName("meta");
                        //console.debug("select 4224:",select)
                        var status = select.querySelector("dd");
                        //console.debug("status:", status,status.value,status.innerText)
                        await validateEntry(destlang, editorElement, false, false, row, locale, record, false, DefGlossary);
                   
                    }
                    else {
                    transtype = "single"
                    // We need to set the preview here as processTransl does not populate it, as it thinks it is in editor
                    // we have no plural, so the translation can be written directly into the previw
                    rawPreview = document.querySelector(`#preview-${row}`)
                    textareaElem = rawPreview.getElementsByClassName("translation foreign-text");
                    let previewNewText = myTranslated;
                   
                    // check if the returned translation does have the same start/ending as the original
                    if (myTranslated != "No suggestions") {
                        translatedText = check_start_end(myTranslated, previewNewText, 0, "", original, "", 0).translatedText
                    }
                    else {
                        translatedText = "No suggestions"
                    }

                    spellCheckIgnore = ""
                    
                    // We need to replace non formal with formal verbs if populating formal with local records
                    if (formal) {
                        mytranslatedText = await replaceVerbInTranslation(original, translatedText, replaceVerb)
                    }
                    else {
                        mytranslatedText = translatedText
                    }
                    textareaElem[0].innerText = mytranslatedText
                    textareaElem[0].value = mytranslatedText
                    let myTranslate = await  postProcessTranslation(original, mytranslatedText, replaceVerb, mytranslatedText, "checkEntry", convertToLower, spellCheckIgnore, locale);
                    await processTransl(original, myTranslate, locale, record, row, transtype, plural_line, locale, false, current)
                    editorElem = editor.querySelector("textarea.foreign-text");

                    // Here we add the "local" text into the preview
                    // We need to add it here, as processTranslate thinks it is in the editor
                    var element1 = document.createElement("div");
                    element1.setAttribute("class", "trans_local_div");
                    element1.setAttribute("id", "trans_local_div");
                    element1.appendChild(document.createTextNode(__("Local")));
                    textareaElem[0].appendChild(element1);
                    //preview = document.querySelector(`#preview-${row}`)

                }
                mark_as_translated(row, current, true, rawPreview);
                if (is_pte) {
                    rowchecked = rawPreview.querySelector(".checkbox input");
                }
                else {
                    rowchecked = rawPreview.querySelector(".myCheckBox input");
                }

                if (rowchecked != null) {
                    if (!rowchecked.checked) {
                        rowchecked.checked = true;
                    }
                }

                break;
            case 'URL':
                counter++;
                //console.debug('Handling a URL type...',type);
                translatedText = original;
                //console.debug("we have a local",original,row)
                if (typeof preview == 'undefined') {
                    preview = document.querySelector("#preview-" + row + " td.translation");
                }
                spanmissing = preview.querySelector(" span.missing");
                if (spanmissing != null) {
                    spanmissing.remove();
                }

                // We need to determine the current state of the record
                if (myCurr != null) {
                    var current = await myCurr.querySelector("span.panel-header__bubble");
                    var prevstate = current.innerText;
                }
                plural_line = 0
                transtype = 'single'
                await processTransl(original, translatedText, locale, record, row, transtype, plural_line, locale, false, current)
                // console.debug("We mark row:",row,rawPreview)
                mark_as_translated(row, current, true, rawPreview);
                break;
            
            case 'plural':
                //counter++;
                // console.log('Handling a plural type...');
                // preview = document.querySelector(`#preview-${row}`);
                spanmissing = preview.querySelector(" span.missing");
                if (spanmissing != null) {
                    spanmissing.remove();
                }
                pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
                if (pluralpresent != null) {
                    // original = pluralpresent.innerText;
                    plural = pluralpresent.innerText
                    transtype = "plural";
                    plural_line = "1";
                }
                else {
                    transtype = "single";
                    plural_line = "0";
                }
                transtype = "plural"
                //console.debug("we start handling the plural:", plural)
                plural_line = "1"
               // check_span_missing(row, plural_line);
               // await handle_plural(plural, destlang, record, apikey, apikeyDeepl, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss, transsel, deeplGlossary, current, editor)
                editorElem = editor.querySelector("textarea.foreign-text");

              //  await validateEntry(destlang, editorElement, "", false, row, locale, record, false, DefGlossary);
                break;
       
    }

        // We need to determine the current state of the record
        if (myCurr != null) {
            var current = myCurr.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
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

        }
        else {
            // We need to adept the class to hide the untranslated lines
            // Hiding the row is done through CSS tr.preview.status-hidden 
            preview.classList.replace("untranslated", "status-hidden");
        }
    }
    // Translation completed  
    translateButton = document.querySelector(".wptfNavBarCont a.local-trans-button");
    //translateButton.className.remove("started");
    translateButton.classList.remove("started")
    translateButton.className += " translated";
    translateButton.innerText = __("Translated");
    parrotActive = 'false';
    let found = __("We have found: ");
    let locrec = __("local records")
    toastbox("info", __("We have found: ") + counter + __("local records", "3500"));
    if (GlotPressBulkButton != null) {
        if (counter > 0) {
            let button = GlotPressBulkButton.getElementsByClassName("button")
            button[0].disabled = true;
        }
    }

}



const throttleFunction = (preview, lastExecution, throttleDuration) => {
    const currentTime = Date.now();
    editoropen = preview.getElementsByClassName("action edit");
    // console.debug("editoropen:",editoropen)
    if (currentTime - lastExecution >= throttleDuration) {
        lastExecution = currentTime;
        if (typeof editoropen !== "undefined" && editoropen !== null) {
            editoropen[0].click();
            return Promise.resolve("Open");
        } else {
            return Promise.reject("Closed");
        }
    }
};

// Call the throttleFunction when needed
function openEditor(preview) {
    var lastExecution = 0;
    var throttleDuration = 0; // Throttle duration in milliseconds
    throttleFunction(preview, lastExecution, throttleDuration).then(result => {
        //console.debug("Editor open!")
        return "Open"
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
        // setTimeout(() => {
        if (typeof editoropen != null) {
            //console.debug("editor is open");
            editoropen.click()
            resolve("Open");
        } else {
            reject("Closed");
        }
        //  }, 500);

    });
}

// Part of the solution issue #204
async function fetchsuggestions(row) {
    var timeoutID
    setTimeout(async function () {
        myTM = await document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content .suggestions-wrapper`);
        return myTM;
    }, 800);
    clearTimeout(timeoutID)
}

function waitForElements(rowNumber, class1, class2, interval = 500, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        function checkElements() {
            const row = document.querySelector(`tr[id^="editor"][row="${rowNumber}"]`);
            if (!row) {
                if (Date.now() - startTime > timeout) return reject("Timeout: Row not found");
                return setTimeout(checkElements, interval);
            }
            // Find the <ul> element dynamically within the row
            const suggestionsList = row.querySelector("ul.suggestions-list");
            if (!suggestionsList) {
                if (Date.now() - startTime > timeout) return reject("Timeout: Suggestions list not found");
                return setTimeout(checkElements, interval);
            }
            // Find the <li> elements inside the <ul>
            const elements = suggestionsList.querySelectorAll(`li.${class1}, li.${class2}`);
            if (elements.length > 0) {
                resolve(elements);
            } else if (Date.now() - startTime < timeout) {
                setTimeout(checkElements, interval);
            } else {
                reject("Timeout: Elements not found");
            }
        }

        checkElements();
    });
}

function findSuggestionsListIndex(collection) {
    //console.debug("collection:",collection.children)
    if (typeof collection != 'undefined') {
        collection = collection.children
        // console.debug("collection:",collection)
        for (let i = 0; i < collection.length; i++) {
            // console.debug(`Checking index ${i}:`, collection[i].tagName, collection[i].classList); // Debugging line
            if (collection[i].classList.contains("suggestions-list")) {
                //console.debug("we found it :",i)
                //console.debug("list:",collection[i])
                return i; // Return the index when found
            }
        }
    }
    return -1; // Return -1 if not found
}

// Part of the solution issue #204

function fetchli(result, editor, row, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellIgnore, locale, TMtreshold, TMswitch) {
    var res;
    //var myres;
    var ulfound;
    var lires;
    var newres;
    var liscore;
    var APIScore = 'None';
    var liSuggestion;
    var TMswitch = localStorage.getItem('switchTM')
    var textFound = "No suggestions";
    var original;
    var DeepLres;
    var OpenAIres;
    var treshold = TMtreshold;
    // We need to prepare the replacement list
    //console.debug("we are fetching li:",editor,row,result)
    setPostTranslationReplace(postTranslationReplace, formal);
    return new Promise((resolve, reject) => {
        //res = elementReady(`#editor-${row} .suggestions__translation-memory.initialized`);
        //console.debug("resli editor:", editor)
        const myres = document.querySelector(`#editor-${row} .suggestions__translation-memory.initialized`);
        editor = document.querySelector(`#editor-${row}`)
        //console.debug("myres:",myres)
        //setTimeout(async function () {
        original = editor.querySelector(`#editor-${row} div.editor-panel__left`);
        original = original.querySelector("span.original-raw").innerText;

        //result = result.children
        collection = result
        index = findSuggestionsListIndex(collection);
        // console.debug("Index of <suggestions-list>:", index);
        if (index != -1) {
            // console.debug("result in li:",result.children[index])
            newres = result.children[index]
        }
        //nosuggest= result[1].innerText
        //console.debug("nosuggest:",nosuggest)
        //  newres =  myres.getElementsByClassName("suggestions-list");
        if (typeof newres != 'undefined') {
            //console.debug("newres:",newres)
        }
        //console.debug("result:",result)
        //if (newres !== null && newres.length != 0) {
        //if (nosuggest !="No suggestions."){   
        if (typeof newres != 'undefined' && newres.length != 0) {
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
            lires = result
            // console.debug(lires.querySelector('ul.suggestions-list'))
            if (lires != null) {
                liscore = editor.querySelector(`span.translation-suggestion__score`);
                //console.debug("liscore:",liscore)
                if (TMswitch == 'false') {
                    if (liscore != null) {
                        if (TMswitch != 'true') {
                            liscore = liscore.innerText;
                            liscore = Number(liscore.substring(0, liscore.length - 1))
                            //console.debug("liscore:", liscore)
                            //console.debug("lires:", lires)
                            if (liscore == 100) {
                                //liSuggestion = lires[1]
                                //console.debug("liSuggestion:",liSuggestion)
                                liSuggestion = lires.querySelector(`span.translation-suggestion__translation`)
                                //console.debug("lisuggestion:",liSuggestion.innerText)
                                if (liSuggestion != null) {
                                    textFound = liSuggestion.innerHTML;
                                    textFoundSplit = textFound.split("<span")[0]
                                    //console.debug("suggestion >90:", textFoundSplit)
                                }
                                if (textFoundSplit != null) {
                                    textFound = textFoundSplit;
                                }
                                else {
                                    textFound = liSuggestion.innerText;
                                }
                            }
                            else if (liscore >= treshold && liscore < 100) {
                                //liSuggestion = lires[2]
                                liSuggestion = lires.querySelector(`span.translation-suggestion__translation`);
                                // We need to fetch Text otherwise characters get converted!!
                                // GlotPress can indicate differences between the original
                                // So we need to remove the indication
                                if (typeof liSuggestion != 'undefined') {
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
                                else {
                                    textFound = 'No suggestion';
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
                            else if (APIScore != 'OpenAI' && APIScore != "Deepl" && liscore < treshold) {
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
                            else if (APIScore == null) {
                                textFound = "No suggestions"
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
                            resolve({ textFound, APIScore });
                        }
                        resolve({ textFound, APIScore });
                    }
                    else {
                        textFound = "No suggestions"
                        resolve({ textFound, APIScore });
                    }
                }
                else {
                    //console.debug("We have a foreighn")
                    textFound = "Foreighn"
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
                            resolve({ textFound, APIScore });
                        }
                        else {
                            // We need to convert to lower if that is setconveert
                            if (convertToLower == true) {
                                textFound = convert_lower(textFound, spellIgnore)
                            }
                            else {
                                textFound = check_hyphen(textFound, spellIgnore);
                            }
                            resolve({ textFound, APIScore });
                        }
                    }
                    else {
                        textFound = "No suggestions"
                        resolve({ textFound, APIScore });
                    }
                    resolve({ textFound, APIScore})
                }

            }
            else {
                textFound = "No suggestions"
                resolve({ textFound, APIScore });
            }

        }
        else {
            if (TMswitch == "true") {
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
                        resolve({ textFound, APIScore });
                    }
                    else {
                        // We need to convert to lower if that is setconveert
                        if (convertToLower == true) {
                            textFound = convert_lower(textFound, spellIgnore)
                        }
                        else {
                            textFound = check_hyphen(textFound, spellIgnore);
                        }
                        resolve({ textFound, APIScore });
                    }
                }
                else {
                    textFound = "No suggestions"
                    resolve({ textFound, APIScore });
                }
            }
            else {
                textFound = "No suggestions"
                resolve({ textFound, APIScore });
            }
        }

    });
}

function myFunction() {
    console.debug("Before pause");
    debugger;  // This will cause the script to pause here
    console.debug("After pause");
}

function openEditorOnRow(preview, editor) {
    const Openeditor = preview.getElementsByClassName("action edit");
    //console.debug("editor:", editor)
    Openeditor[0].click()
    //console.debug("Editor should be open")
    // Wait for the result from the <ul> element
    waitForMyneElement('suggestions-list', editor).then((result) => {
        // console.debug("we found the list:", result)
        //theResult = result.getElementsByClassName('suggestions-list')
        // Process the result (for example, extracting text from the <ul> list items)
        const processedResult = processResult(result);
        // console.debug("theResult:", processedResult)
        // Update the editor with the processed result
        return processedResult
        // editorContent.textContent = processedResult;
    });
}

//# This function process the result of a translation
async function processResult (result, editor, row, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, locale, TMtreshold, original, destlang, record,current) {
    let myResult = "No suggestions";
    try {
        const resli = await fetchli(result, editor, row, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, locale, TMtreshold);
        if (resli !== null) {
            myResult = await getTM(
                resli.textFound, row, editor, locale, original,
                replaceVerb, transtype, convertToLower, spellCheckIgnore,
                locale, current, resli.APIScore
            );

            if (myResult === "No suggestions") {
                translated = false;
                current.innerText = "untranslated";
                current.value = "untranslated";
            } else {
                let textareaElem = await record.querySelector("textarea.foreign-text");
                textareaElem.innerText = myResult;
                textareaElem.innerHTML = myResult;

                translated = true;
                result = validateEntry(destlang, textareaElem, "", "", row, locale, record, false, DefGlossary)
                mark_as_translated(row, current, translated, preview);
            }
        } else {
            current.innerText = "untranslated";
            current.value = "untranslated";
            translated = false;
            myResult = "No suggestions";
        }

        return myResult;  // Ensure function returns the final result

    } catch (error) {
        console.error("Error in processResult:", error);
        return "Error occurred";
    }
}

function waitForMyneElement(selector, editor, FetchLiDelay = 2000) {
    //console.debug("delay:", FetchLiDelay)
    return new Promise((resolve) => {
        const element = editor.getElementsByClassName(selector);
        //console.debug("element:",element)
        if (typeof element != 'undefined') {
            // Check if the element exists and contains items
            const checkExistence = setInterval(() => {
                if (typeof element[0] != "undefined" && element[0].children.length > 0) {
                    //console.debug("found element",element[0])
                    resolve(element[0]);  // Resolve with the <ul> element
                    clearInterval(checkExistence);  // Stop checking once it's ready

                }
                else {
                    resolve("No suggestions")
                }
            }, FetchLiDelay);  // Check every 500ms for the element to be populated
        }
        else {
            //console.debug("We did not find anything:",element)
            resolve("No suggestions")
        }
    });
}

async function waitForSuggestions(rowNo, TMswitch, timeout = 5000, retryInterval = 500, extraDelay = 1000) {
    //var firstListItems
    //var suggestionList;
    //console.debug(timeout, retryInterval, extraDelay)
   // console.debug("row:",rowNo)
    const startTime = Date.now();
    const row = await document.querySelector(`tr[id="editor-${rowNo}"]`);
   // console.debug("row:",row)
    if (!row) return false; // Row not found
    //console.debug("load")
    const loadingIndicator = await row.querySelector(".suggestions__loading-indicator");

    let timeoutReached = false;

    if (loadingIndicator && document.contains(loadingIndicator)) {
        while (document.contains(loadingIndicator)) {
            if (Date.now() - startTime >= timeout) {
                timeoutReached = true;
                break; // Exit the loop instead of returning
            }
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }

    // Now you can check `timeoutReached` and continue with the next steps
    if (timeoutReached) {
        //console.debug("Timeout reached, but continuing execution...");
    } else {
      //  console.debug("Loading indicator disappeared, proceeding...");
    }

    // Continue execution normally


   // if (loadingIndicator && document.contains(loadingIndicator)) {
    //    while (document.contains(loadingIndicator)) {
      //      if (Date.now() - startTime >= timeout) return false; // Timeout reached
      //      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      //  }
    //}
    //console.debug("after load")
    let NewRow = await document.querySelector(`tr[id="editor-${rowNo}"]`);
    let textFound = await NewRow.querySelector(".translation-suggestion__translation")
    let suggestionList = await NewRow.querySelector("ul.suggestions-list");
    let firstListItems = await suggestionList ? suggestionList.querySelectorAll("li") : [];

    while (Date.now() - startTime < timeout) {
        firstListItems = await suggestionList ? suggestionList.querySelectorAll("li") : [];
        if (firstListItems.length > 0) {
            if (String(TMswitch).toLowerCase() === "false") return true;
            break;
        }
        else {
           // console.debug("we did not find it!!")
            return true
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    if (!TMswitch) return false;

   // console.debug("we check for the next li")
   // console.debug("editor:",NewRow)
    suggestionList = await NewRow.getElementsByClassName("suggestions__other-languages initialized")[0];
    if (typeof suggestionList != "undefined") {
        suggestionList = suggestionList.querySelector("ul.suggestions-list");
        //console.debug("foreighn:", suggestionList)
        initialCount = suggestionList ? suggestionList.querySelectorAll("li").length : 0;
        while (Date.now() - startTime < extraDelay) {
            const newListItems = suggestionList ? suggestionList.querySelectorAll("li") : [];
            // console.debug("Did we find it:",newListItems)
            if (newListItems.length >= initialCount) {
                return true;
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
    return false;
}



async function old_processTM(myrecCount, destlang, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, TMtreshold, GlotPressBulkButton, FetchLiDelay, interCept) {
    var timeout = 0;
    var current;
    var editor;
    var original;
    var preview;
    var res;
    var counter = 0;
    var foundTM = 0
    var row;
    var textareaElem;
    var rowchecked;
    var copyClip
    var translated = false;
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var myheader = document.querySelector('header');
    var TMswitch = localStorage.getItem('switchTM')
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    progressbar = document.querySelector(".indeterminate-progress-bar");
    inprogressbar = document.querySelector(".indeterminate-progress-bar__progress")
    //console.debug("processTM")
    if (progressbar == null) {
        myheader.insertAdjacentHTML('afterend', template);
        // progressbar = document.querySelector(".indeterminate-progress-bar");
        //progressbar.style.display = 'block;';
    }
    else {
        // we need to remove the style of inprogress to see the animation again
        inprogressbar.style = ""
        progressbar.style.display = 'block';
    }
    for (let record of myrecCount) {
        translated = false
        counter++
        transtype = "single";
        plural_line = "0";
        row = record.getAttribute("row");
        // console.debug("in processTM:",row)
        // If in the original field "Singular is present we have a plural translation
        pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
        //console.debug("plural:",pluralpresent)
        if (pluralpresent != null) {
            // currently we do not process plural within TM, as it will only give one result
            // original = pluralpresent.innerText
            transtype = "plural";
            plural_line = "1";
        }
        // we need to store current preview and editor for later usage
        preview = document.querySelector(`#preview-${row}`);
        //console.debug("preview in processTM:",preview)
        editor = document.querySelector(`#editor-${row}`);
        editoropen = preview.querySelector("td.actions .edit");
        editorClose = editor.getElementsByClassName("panel-header-actions__cancel with-tooltip")
        let original = editor.querySelector("span.original-raw").innerText;
        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
        // We need to determine the current state of the record
        if (currec != null) {
            current = currec.querySelector("span.panel-header__bubble");
            var prevstate = current.innerText;
        }

        if (is_pte) {
            rowchecked = preview.querySelector("th input");
        }
        else {
            rowchecked = preview.querySelector("td input");
        }
        pretrans = await findTransline(original, destlang);
        if (pretrans != "notFound" && transtype != "plural") {
            let previewName = preview.querySelector("td.translation");
            if (previewName != null) {
                select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                status = select.querySelector("dd");
                status.innerText = "transFill"
                status.value = "transFill";
                previewName.innerText = pretrans;
                textareaElem = await record.querySelector("textarea.foreign-text");
                textareaElem.innerText = pretrans;
                textareaElem.innerHTML = pretrans;
                textareaElem.value = pretrans;
                translated = true
                let spanmissing = preview.querySelector(" span.missing");
                // We have found a local so we need to mark the preview
                if (spanmissing == null) {
                    var element1 = document.createElement("div");
                    element1.setAttribute("class", "trans_local_div");
                    element1.setAttribute("id", "trans_local_div");
                    element1.appendChild(document.createTextNode(__("Local")));
                    previewName.appendChild(element1);
                }
                mark_as_translated(row, current, translated, preview)
                result = await validateEntry(destlang, textareaElem, "", "", row, locale, record, false,DefGlossary);
                await mark_preview(preview, result.toolTip, pretrans, row, false)
                foundTM++
            }
        }
        else if (transtype == "single") {
            //console.debug("we heve a single:",editor)
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
            if (!toTranslate) {
                if (autoCopyClipBoard) {
                    copyClip = false;
                    autoCopyClipBoard = false;
                }
                //console.debug("Whe have an URL or project name", original)
                // here we add a copy of the original as it is a name!
                let translatedText = original;
                textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                textareaElem.innerHTML = translatedText;
                textareaElem.value = translatedText;
                let previewName = preview.querySelector("td.translation");
                if (previewName != null) {
                    previewName.innerText = translatedText;
                    previewName.value = translatedText;
                    pretrans = "FoundName";

                    //10-05-2022 PSS added poulation of status
                    select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                    var status = select.querySelector("dd");
                    status.innerText = "transFill";
                    status.value = "transFill";
                    if (toTranslate == false) {
                        showName = true;
                    }
                    else {
                        showName = false;
                    }
                    if (showName == true) {
                        let originalElem = document.querySelector("#preview-" + row + " .original");
                        nameDiff = isExactlyEqual(translatedText, originalElem.innerText)
                        showNameLabel(originalElem,row,nameDiff)
                    }
                }
                let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
                if (transname != null) {
                    transname.className = "trans_name_div";
                    transname.innerText = __("URL, name of theme or plugin or author!");
                    // In case of a plugin/theme name we need to set the button to blue
                    translated = true
                    //mark_as_translated(row, current, translated, preview)
                }
                translated = true
                foundTM++
                mark_as_translated(row, current, translated, preview)
                result = validateEntry(destlang, textareaElem, "", "", row, locale, record, false);
                await mark_preview(preview, result.toolTip, textareaElem.textContent, row, false)

            }
            else {
                //console.debug("preview:", preview)
                //We need to fetch the data as we have a single!
                autoCopyClipBoard = false;
                //------------------------
                let Openeditor = await preview.getElementsByClassName("action edit");
                await delay(50)
                Openeditor[0].click()
                await delay(50)
                await waitForSuggestions(row, TMswitch, 800, 500, 2500).then(sugpresent => {
                   // console.debug("suggestionsPresent:", sugpresent, " ", original)
                    return sugpresent
                }).then(async sugpresent => {
                    // Wait for the result from the <ul> elemen
                    if (sugpresent == true) {
                        if (TMswitch == "false") {
                            searchFor = 'suggestions__translation-memory initialized'
                        }
                        else {
                            searchFor = "suggestions__other-languages initialized"
                        }

                        await waitForMyneElement(searchFor, editor, FetchLiDelay).then(res => {
                            return new Promise((resolve, reject) => {
                                //console.debug("We seem to have found a li")
                                resolve(res)
                            }).then(async result => {
                                // Process the result (for example, extracting text from the <ul> list items)
                                // console.debug("Result of element:",result)
                                // console.debug("type:", typeof result)
                                //  console.debug("preview: ", preview)
                                if (typeof result == "object") {
                                    //console.debug("before processing:",result)
                                    processed = await processResult(result, editor, row, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, locale, TMtreshold, original, destlang, record,current)
                                    editor.style.display = ""
                                    preview.style.removeProperty("display");
                                    //console.debug("processed:",processed)
                                    if (processed != "No suggestions") {
                                        textareaElem = await record.querySelector("textarea.foreign-text");
                                        result = await validateEntry(destlang, textareaElem, "", "", row, locale, record, false, DefGlossary);
                                        await mark_preview(preview, result.toolTip, textareaElem.innerText, row, false)
                                       foundTM++
                                    }
                                }
                                else {
                                    // console.debug("No suggestions:", res)
                                    let previewName = preview.querySelector("td.translation");
                                    //console.debug("preview:", previewName)
                                    if (previewName != null) {
                                        previewName.innerText = "No suggestions"
                                        previewName.value = "No suggestions"
                                    }
                                    select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                                    var status = select.querySelector("dd");
                                    status.innerText = "untranslated";
                                    status.value = "untranslated";
                                    //return processedResult
                                }
                            });
                        })
                    }
                    else {
                        // console.debug("No suggestions:", res)
                        let previewName = preview.querySelector("td.translation");
                        //console.debug("preview:", previewName)
                        if (previewName != null) {
                            previewName.innerText = "No suggestions"
                            previewName.value = "No suggestions"
                        }
                        select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                        var status = select.querySelector("dd");
                        status.innerText = "untranslated";

                        status.value = "untranslated";
                        //editor.style.display = ""
                        preview.style.removeProperty("display");
                    }
                });
            }
        }
        else if (transtype != "single") {
            console.debug("We have a plural")
            //mark_as_translated(row, current, translated, preview)
        }

        // We need to put back the Empt button, as it is sometimes no longer present
        checkElem = document.querySelector("#preview-" + row + " .priority");
        res = await addCheckButton(row, checkElem, 3210)

        if (counter == myrecCount.length) {
            // Translation completed  
            translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
            translateButton.classList.remove("started")
            translateButton.className += " translated";
            translateButton.innerText = __("Translated");
            progressbar = document.querySelector(".indeterminate-progress-bar");
            progressbar.style.display = "none";
            toastbox("info", __("We have found: ") + parseInt(foundTM), "3000", " TM records");
            if (counter > 0) {
                if (GlotPressBulkButton != null && typeof GlotPressBulkButton != "undefined") {
                    let button = GlotPressBulkButton.getElementsByClassName("button")
                    button[0].disabled = true;
                }
            }
            // We need to enable autoCopyClipBoard if it was active
            if (copyClip) {
                autoCopyClipBoard = true;
            }
            // This one is closing the last editor!!
            // We need to enable the preview again, as it is set to none at this point
            editor.style.removeProperty("display");
            preview.style.removeProperty("display");
            //editor.style.display = ""

        }
        else if (counter == counter.myrecCount - 1) {
            // No need to clos it here
            // editorClose[0].click()
            //editor.style.display = "none"
        }
        await delay(TMwait)
    }
}

function getFirstCharsUntilPercent(sentence) {
    //console.debug("sentence:",sentence)
    if (typeof sentence != "undefined") {
        const percentIndex = sentence.indexOf('%');
        if (percentIndex !== -1) {
            return sentence.slice(0, percentIndex); // Return everything before the '%'
        }
        else {
            return "0"; // If no '%' found, return the whole sentence
        }
    }
    else {
        return "0"
    }
}

// Function to sort the array of tr elements based on the 'row' attribute
function sortRowsArrayByRowAttribute() {
    // Get all the rows with the class 'editor' (myRecCount)
    const myRecCount = document.querySelectorAll("tr.editor");

    // Convert the NodeList to an array for sorting
    const rowsArray = Array.from(myRecCount);

    // Sort the rows based on the 'row' attribute
    rowsArray.sort((rowA, rowB) => {
        const rowValueA = rowA.getAttribute('row');
        const rowValueB = rowB.getAttribute('row');

        // Convert to numbers (if they are numbers) and compare
        const numA = isNaN(rowValueA) ? rowValueA : Number(rowValueA);
        const numB = isNaN(rowValueB) ? rowValueB : Number(rowValueB);

        // Return the comparison result
        return numA < numB ? -1 : numA > numB ? 1 : 0;
    });

    // Now the rowsArray is sorted, but the DOM remains unchanged
    return rowsArray;
}


async function old_populateWithTM(apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, spellCheckIgnore, TMtreshold, interCept) {
  //  const sortedRows = sortRowsArrayByRowAttribute();
   // myrecCount = sortedRows
    if (transsel == "OpenAI" && interCept == 'false') {
        FetchLiDelay = 1500
    }
    else {
        // setting this to a lower value will cause missing suggestions
        FetchLiDelay = 1000
    }
    locale = checkLocale();
    StartObserver = false;
    setPostTranslationReplace(postTranslationReplace);
    setPreTranslationReplace(preTranslationReplace);
    let GlotPressBulkButton = document.getElementById("bulk-actions-toolbar-bottom")
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
    translateButton.innerText = __("Translate");
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (translateButton.className == "tm-trans-button") {
        translateButton.className += " started";
    }
    else {
        translateButton.classList.remove("tm-trans-button", "started", "translated");
        translateButton.classList.remove("tm-trans-button", "restarted", "translated");
        translateButton.className = "tm-trans-button restarted";
    }
    myrecCount = document.querySelectorAll("tr.editor")
    interCept = localStorage.getItem("interXHR");

    let currWindow = window.self
    if (interCept == 'false') {
        //console.debug("auto translations are fetched")
        cuteAlert({
            type: "question",
            title: __("Auto translate"),
            message: __("Auto translate is on, do you want to continue?"),
            confirmText: "Confirm",
            cancelText: "Cancel",
            myWindow: currWindow
        }).then(async (e) => {
            if (e == "cancel") {
                translateButton = document.querySelector(".wptfNavBarCont a.tm-trans-button");
                translateButton.className += " translated";
                translateButton.innerText = __("Translated");
                messageBox("info", __("TM is stopped!"));
                StartObserver = true
                return
            }
            else {
                processTM(myrecCount, destlang, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, TMtreshold, GlotPressBulkButton, FetchLiDelay, interCept)
            }
        })
    }
    else {
        processTM(myrecCount, destlang, TMwait, postTranslationReplace, preTranslationReplace, convertToLower, formal, spellCheckIgnore, TMtreshold, GlotPressBulkButton, FetchLiDelay, interCept)

    }
}

function submitData(myTextarea) {
    // Get the data from the textarea
    var textData = myTextarea
    //var textData = document.getElementById('myTextarea').value;

    // Create an object with the data you want to send
    var data = {
        text: textData
    };

    // Use Fetch API to send data to a backend
    fetch('https://translate.wordpress.org', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        //.then(response => response.json())
        .then(result => {
            console.log('Success:', result);
            // alert('Data submitted successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            // alert('There was an error submitting the data.');
        });
}


async function mark_as_translated(row, current, translated, preview) {
    // console.debug("preview in mark:",preview)
    let is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    if (is_pte) {
        rowchecked = preview.querySelector("th input");
    }
    else {
        rowchecked = preview.querySelector("td input");
    }
    //console.debug("translated:",translated,row,rowchecked)
    if (translated) {
        rowchecked.checked = true;
    }
    else {
        rowchecked.checked = false
    }
    current.innerText = "transFill";
    current.value = "transFill";
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
    let curbut = prevcurrentClass.querySelector(`.tf-save-button`);
    if (curbut != null) {
        curbut.style.backgroundColor = "#0085ba";
        curbut.innerText = "Save";
        // We should not overwrite the title as it is missing the toolTip data
       // curbut.title = __("Save the string");
    }
    else {
        checkElem = document.querySelector("#preview-" + row + " .priority");
        res = await addCheckButton(row, checkElem, 3924)
        let curbut = prevcurrentClass.querySelector(`.tf-save-button`);
        curbut.style.backgroundColor = "#0085ba";
        curbut.innerText = "Save";
       // curbut.title = __("Save the string");
    }
}

function determineName(row) {
    var name
    let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
   // console.debug("transname")
    name = 'none'
    if (transname != null) {
        name = 'name'
    } 
    return name
}


let urlSeen = false;  // Persisted across function calls

async function determineType(row, record) {
    var myType = "none";
    let toTranslate = true;
    var element = null;
    var pretrans;
    var myTranslated = "";
    var locale = checkLocale();
    var destlang = locale;
    var original = record.querySelector("div.editor-panel__left div.panel-content span.original-raw").innerText;
    // console.debug("determine record:",record)
    //console.debug("original:",original)
    // Check comment
    element = record.querySelector(".source-details__comment");
    if (element != null) {
        let comment = record.querySelector(".source-details__comment p").innerText;
        comment = comment.replace(/(\r\n|\n|\r)/gm, "");
        toTranslate = checkComments(comment.trim());
        if (!toTranslate) {
            myType = "name";
            // console.debug("Skipping due to comment (marked as name):", original);
            myTranslated = comment;
        }

    }
    //console.debug("myType:",myType)

    if (myType == 'none') {
        // let original = record.querySelector("div.editor-panel__left div.panel-content span.original-raw").innerText;
      // console.debug("locale:",destlang)
        pretrans = await findTransline(original, destlang);
        //console.debug("pretrans found:",pretrans)
        if (pretrans != "notFound") {
            myType = "pretranslated";
            myTranslated = pretrans
        }
    }

    // Only check for URL if still undecided
    if (myType == "none") {
        let original = record.querySelector("div.editor-panel__left div.panel-content span.original-raw").innerText;
       // console.debug("URL in original:",original)
        let FoundURL = isOnlyURL(original);
       // console.debug("FoundURL:",FoundURL)
        if (FoundURL) {
            if (!urlSeen) {
                myType = "URL";
                myTranslated = original;
                urlSeen = true;
                //console.debug("URL Detected and marked:", original);
            }
        }

    }
    if (myType == "none") {
        let pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
        if (pluralpresent != null) {
            myType = "plural"
            myTranslated = "Plural"
        }
    }
    //console.debug("mytype before return 1:", myType)
    if (myType == "none") {
        myType = "single"
    }
  // console.debug("myDetermine return:",myType,myTranslated)
    return [myType, myTranslated];
}



async function handleType(row, record, destlang, transsel, apikey, apikeyDeepl, apikeyMicrosoft, apikeyOpenAI, OpenAIPrompt, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, completedCallback, OpenAISelect, openAIWait, OpenAItemp, spellCheckIgnore, deeplGlossary, OpenAITone, DeepLWait, openAiGloss, counter) {
    
    const [type, myTranslated] = await determineType(row, record);
    var translatedText = ""
    let myoriginal = record.querySelector("div.editor-panel__left div.panel-content span.original-raw");
    let original = myoriginal.innerText
    var editor = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
    var editorElem
    var textareaElem;
    var preview = document.querySelector("#preview-" + row + " td.translation");
    var rawPreview = document.querySelector(`#preview-${row}`)
    //console.debug("preview:",preview)
    var previewElem = preview.getElementsByClassName("foreign-text")
   // console.debug("previewEleme1:",previewElem)
    var locale = checkLocale();
    var destlang = locale
    var spanmissing;
    var transtype;
    var plural_line;
    var pluralpresent
    var myURL;
    var transtype
    var myCurr = record.querySelector("div.editor-panel__left div.panel-header");
    if (myCurr != null) {
        var current = await myCurr.querySelector("span.panel-header__bubble");
        var prevstate = current.innerText;
    }
    var debug = false
    if (debug === true) {
        console.debug("HandleType destlang:", destlang)
        console.debug("HandleType preview:", preview)
        console.debug("HAndleType rawPreview:",rawPreview)
        console.debug("HandleType previewElem:", previewElem)
        console.debug("HandleType editor:", editor)
        console.debug("HandleType type:", type)
        console.debug("HandleType transsel:", transsel)
        console.debug("HandleType translatedText:", myTranslated)
    }
    switch (type) {

        case 'name':
            // console.debug('Handling a name type...', original);
            translatedText = original;
            //console.debug("we have a local",original,row)
            if (typeof preview == 'undefined') {
                preview = document.querySelector("#preview-" + row + " td.translation");
            }
            spanmissing = preview.querySelector(" span.missing");
            if (spanmissing != null) {
                spanmissing.remove();
            }

            plural_line = 0
            transtype = 'single'
            // We need to determine the current state of the record
           // if (myCurr != null) {
           //     var current = await myCurr.querySelector("span.panel-header__bubble");
            //    var prevstate = current.innerText;
           // }

            await processTransl(original, translatedText, locale, record, row, transtype, plural_line, locale, false, current)

            //  mark_as_translated(row, current, true, preview);
            // We need to nameDiff to false otherwise the label will be red
            let originalElem = document.querySelector("#preview-" + row + " .original");
            let currentTrans = document.querySelector("#preview-" + row + " td.translation.foreign-text");
            let originalTrans = originalElem
            //console.debug("trans:", currentTrans)
           // console.debug("original:", originalElem.innerText)
            nameDiff= isExactlyEqual(translatedText, originalElem.innerText)
            //nameDiff = false
            showNameLabel(originalElem,row,nameDiff)
            // We need to set the checkbox here, as processTransl thinks we are in editor
            if (is_pte) {
                rowchecked = rawPreview.querySelector(".checkbox input");
            }
            else {
                rowchecked = rawPreview.querySelector(".myCheckBox input");
            }

            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    rowchecked.checked = true;
                }
            }
            break;
       
        case 'pretranslated':
           // console.debug("pretrans 4121:",pretrans)
            // We need to determine the current state of the record
            if (myCurr != null) {
                var current = await myCurr.querySelector("span.panel-header__bubble");
                var prevstate = current.innerText;
            }

            // preview = document.querySelector(`#preview-${row}`);
            spanmissing = preview.querySelector(" span.missing");
            if (spanmissing != null) {
                spanmissing.remove();
            }
            // if a plural is present within the pretrans we need to deal with it
            pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
            //console.debug("after pluralpresent:", pluralpresent)
            if (pluralpresent != null) {
                plural_line = "1"
                transtype = "plural";
               // console.debug("We do have a plural with pretranslated")
                await check_span_missing(row, plural_line);
               // myURl = rawPreview.getElementsByClassName("url_plural")
                textareaElem = document.querySelector(`#preview-${row} .translation li:nth-of-type(1)`); 
                plural = pluralpresent.innerText
                // console.debug("current:",current)
               //console.debug("myTranslated:",myTranslated)
                await handle_plural(plural, destlang, record, apikey, apikeyDeepl, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss, transsel, deeplGlossary, current,editor)
                editorElem = editor.querySelector("textarea.foreign-text");
               // console.debug("pretranslated before validate:")
                select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                //select = next_editor.getElementsByClassName("meta");
                //console.debug("select 4224:",select)
                var status = select.querySelector("dd");
                //console.debug("status:", status,status.value,status.innerText)
                await validateEntry(destlang, editorElem, "", false, row, locale, record, false, DefGlossary);
            }
            
            else {
               transtype = 'single'
                //console.debug("trans:", myTranslated, "orig:", original)
                // We need to set the preview here as processTransl does not populate it, as it thinks it is in editor
                // we have no plural, so the translation can be written directly into the preview
                if (formal) {
                    translated = await replaceVerbInTranslation(original, myTranslated, replaceVerb)
                }
                else {
                   console.debug("single:",myTranslated)
                    translated = myTranslated
                }
                rawPreview = document.querySelector(`#preview-${row}`)
                textareaElem = rawPreview.getElementsByClassName("translation foreign-text");
                textareaElem[0].innerText = translated
                textareaElem[0].value = translated
                textareaElem[0].textContent = translated
                // check if the returned translation does have the same start/ending as the original
                if (translated != "No suggestions") {
                    result = await check_start_end(translated, "", 0, "", original, "", 0);
                }

                record = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                await processTransl(original, translated, locale, record, row, transtype, plural_line, locale, false, current)
                editorElem = editor.querySelector("textarea.foreign-text");
                //await validateEntry(destlang, editorElement, "", false, row, locale, record, false, DefGlossary);

                // Here we add the "local" text into the preview
                // We need to add it here, as processTranslate thinks it is in the editor
                var element1 = document.createElement("div");
                element1.setAttribute("class", "trans_local_div");
                element1.setAttribute("id", "trans_local_div");
                element1.appendChild(document.createTextNode(__("Local")));
                textareaElem[0].appendChild(element1);
                //preview = document.querySelector(`#preview-${row}`)

               
                
            }
           await  mark_as_translated(row, current, true, rawPreview);
            if (is_pte) {
                rowchecked = rawPreview.querySelector(".checkbox input");
            }
            else {
                rowchecked = rawPreview.querySelector(".myCheckBox input");
            }

            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    rowchecked.checked = true;
                }
            }
            
            break;
        case 'URL':
            //console.debug('Handling a URL type...',type);
            translatedText = original;
            //console.debug("we have a local",original,row)
            if (typeof preview == 'undefined') {
                preview = document.querySelector("#preview-" + row + " td.translation");
            }
            spanmissing = preview.querySelector(" span.missing");
            if (spanmissing != null) {
                spanmissing.remove();
            }
                      
            // We need to determine the current state of the record
            if (myCurr != null) {
                var current = await myCurr.querySelector("span.panel-header__bubble");
                var prevstate = current.innerText;
            }
            plural_line = 0
            transtype = 'single'
            await processTransl(original, translatedText, locale, record, row, transtype, plural_line, locale, false, current)
            // console.debug("We mark row:",row,rawPreview)
            await await mark_as_translated(row, current, true, rawPreview);
            break;
        case 'single':
            //console.log('Handling a single type...');
            transtype = 'single'
            plural_line = 0
            if (transsel == "google") {
                //console.debug("before google:",spellCheckIgnore)
                result = await googleTranslate(original, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, editor, spellCheckIgnore, false);
                if (errorstate == "Error 400") {
                    messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
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
                result = await deepLTranslate(original, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, false,DeepLWait);
                if (result == "Error 403") {
                    messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
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
                result = await microsoftTranslate(original, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore, false);
                if (result == "Error 401") {
                    messageBox("error", __("Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!"));
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
                result = await AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss);

                if (result == "Error 401") {
                    messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
            await  mark_as_translated(row, current, true, rawPreview);
            if (is_pte) {
                rowchecked = rawPreview.querySelector(".checkbox input");
            }
            else {
                rowchecked = rawPreview.querySelector(".myCheckBox input");
            }

            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    rowchecked.checked = true;
                }
            } 
            editorElem = editor.querySelector("textarea.foreign-text");
            await validateEntry(destlang, editorElem, "", false, row, locale, record, false, DefGlossary);

            //await mark_preview(preview, result.toolTip, textareaElem[0].textContent, row, false)
            break;
        case 'plural':
            //console.log('Handling a plural type...');
            // preview = document.querySelector(`#preview-${row}`);
            spanmissing = preview.querySelector(" span.missing");
            if (spanmissing != null) {
                spanmissing.remove();
            }
            pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
            if (pluralpresent != null) {
                // original = pluralpresent.innerText;
                plural = pluralpresent.innerText
                transtype = "plural";
                plural_line = "1";
            }
            else {
                transtype = "single";
                plural_line = "0";
            }
            transtype = "plural"
            console.debug("we start handling the plural:", plural)
            plural_line = "1"
            await check_span_missing(row, plural_line);
            //console.debug("pretrans 4351:",pretrans)
            await handle_plural(plural, destlang, record, apikey, apikeyDeepl, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss, transsel, deeplGlossary, current,editor)
            editorElem = editor.querySelector("textarea.foreign-text");

            await validateEntry(destlang, editorElem, "", false, row, locale, record, false, DefGlossary);
            break;

        default:
            console.debug('Unknown type.');
            break;
    }
}

async function handle_plural(plural, destlang, record, apikey, apikeyDeepl, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_Editor, openAiGloss, transsel, deeplGlossary, current,editor) {
    let debug = false
    var myTranslatedText;
    if (debug == true) {
        console.debug("handle_plural plural_line: ", plural_line, plural)
        console.debug("handle_plural current:", current)
        console.debug("we handle_plural ")
     }
    let pretrans = await findTransline(plural, destlang);
    //console.debug("pretrans:",pretrans)
    if (pretrans == "notFound") {
        if (transsel == "google") {
            result = await googleTranslate(plural, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, editor, spellCheckIgnore, false);
            if (errorstate == "Error 400") {
                messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
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
            result = await deepLTranslate(plural, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, false);
            if (result == "Error 403") {
                messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
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
            result = await microsoftTranslate(plural, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore, false);
            if (result == "Error 401") {
                messageBox("error", __("Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!"));
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
            result = await AITranslate(plural, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss);

            if (result == "Error 401") {
                messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
        //console.debug("we are in plural and have a pretranslation")
        // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
        // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
        // this should be set by processtransl
        
        myTranslatedText = pretrans
       // console.debug("pretrans:",myTranslatedText)
        let rowId = row.split("-")[0];
        //console.debug("rowId:", rowId)
       // console.debug("pretranslated current:",current)
        if (current.innerText == "current") {
            //console.debug(" plural has current:",rowId)
            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
            //console.debug("textareaElem1:",textareaElem1)
            textareaElem1.innerText = myTranslatedText;
            textareaElem1.value = myTranslatedText;
            await validateEntry(destlang, textareaElem1, "", false, row, locale, record, false, DefGlossary);
            // the code below is to populate the Russion and Ukrain plurals
            textareaElem2 = record.querySelector("textarea#translation_" + rowId + "_2");
            if (textareaElem2 != null) {
                plural = plural + "_02"
                let pretrans = await findTransline(plural, destlang);
                //console.debug("res:", pretrans)
                myTranslatedText = pretrans
                textareaElem2.innerText = myTranslatedText;
                textareaElem2.value = myTranslatedText;
            }
            
            textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
            //console.debug("elem3:", textareaElem3)
            if (textareaElem3 != null) {
                plural = plural + "_03"
                let pretrans = await findTransline(plural, destlang);
                //console.debug("res:", pretrans)
                myTranslatedText = pretrans
                textareaElem3.innerText = myTranslatedText;
                textareaElem3.value = myTranslatedText;
            }

            // Populate the second line in preview Plural
           // if (prevstate != "current") {
              //  console.debug("we are doing nothing with pretranslate")
                let preview = document.querySelector("#preview-" + rowId + " td.translation");
                if (preview != null) {
                   // preview.innerText = myTranslatedText;
                   // preview.value = myTranslatedText;
                    var element1 = document.createElement("div");
                    element1.setAttribute("class", "trans_local_div");
                    element1.setAttribute("id", "trans_local_div");
                    //PSS
                    element1.appendChild(document.createTextNode(__("Local")));
                    preview.appendChild(element1);
                }
           // }
        }
        else {
            //console.debug("It is not a current so we need to add it")
            // 30-10-2021 PSS added a fix for issue #154
            // console.debug("previewtext 4415:", myTranslatedText)
            textareaElem1 = document.querySelector("textarea#translation_" + rowId + "_0");
            textareaElem1.innerText = myTranslatedText;
            textareaElem1.value = myTranslatedText;
            textareaElem1 = document.querySelector("textarea#translation_" + rowId + "_1");
            textareaElem1.innerText = myTranslatedText;
            textareaElem1.value = myTranslatedText;
            // the code below is to populate the Russion and Ukrain plurals
            textareaElem2 = record.querySelector("textarea#translation_" + rowId + "_2");
            if (textareaElem2 != null) {
                plural = plural + "_02"
                let pretrans = await findTransline(plural, destlang);
                if (pretrans != null) {
                    //console.debug("res:", pretrans)
                    myTranslatedText = pretrans
                    textareaElem2.innerText = myTranslatedText;
                    textareaElem2.value = myTranslatedText;
                }
            }

            textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
            //console.debug("elem3:", textareaElem3)
            if (textareaElem3 != null) {
                plural = plural + "_03"
                let pretrans = await findTransline(plural, destlang);
                if (pretrans != null) {
                    //console.debug("res:", pretrans)
                    myTranslatedText = pretrans
                    textareaElem3.innerText = myTranslatedText;
                    textareaElem3.value = myTranslatedText;
                }
            }

            let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(1) .translation-text");
            //console.debug("previewElem 4549:", previewElem)
           // console.debug("previewtext:", pretrans)
            if (previewElem != null) {
                previewElem.innerText =pretrans;
                previewElem.value = pretrans;
                let myLi = document.querySelector("#preview-" + row + " .translation li:nth-of-type(1)");
                element1 = document.createElement("div");
                element1.setAttribute("class", "trans_local_div");
                element1.setAttribute("id", "trans_local_div");
                //PSS
                element1.appendChild(document.createTextNode(__("Local")));
                myLi.appendChild(element1);
            }
        }
        select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
        //select = next_editor.getElementsByClassName("meta");
        var status = select.querySelector("dd");
        status.innerText = "transFill";
        status.value = "transFill";
        //let translatedText = pretrans;
    }
    // second line
    pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(2) .original-text`);
    //console.debug("now we handle the second line:",pluralpresent)
    if (pluralpresent != null) {
        original = pluralpresent.innerText;
        //console.debug("original in second plural:", original)
        transtype = "plural";
        plural_line = "2";
    }
    

    plural = pluralpresent.innerText;
    //console.debug("Plural second: ", plural_line, plural)
    pretrans = await findTransline(plural, destlang);
    //console.debug("pretrans:",pretrans)
    if (pretrans == "notFound") {
        if (transsel == "google") {
            result = await googleTranslate(plural, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, editor, spellCheckIgnore, false);
            if (errorstate == "Error 400") {
                messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
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
            result = await deepLTranslate(plural, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, false);
            if (result == "Error 403") {
                messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
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
            result = await microsoftTranslate(plural, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore, false);
            if (result == "Error 401") {
                messageBox("error", __("Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!"));
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
            result = await AITranslate(plural, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss);

            if (result == "Error 401") {
                messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
       // console.debug("we are in plural second line pretranslated")
        // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
        // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
        let translatedText = pretrans;
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
                //console.debug("res:", pretrans)
                translatedText = pretrans
                textareaElem2.innerText = translatedText;
                textareaElem2.value = translatedText;
            }

            textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
            //console.debug("elem3:", textareaElem3)
            if (textareaElem3 != null) {
                plural = plural + "_03"
                let pretrans = await findTransline(plural, destlang);
                //console.debug("res:", pretrans)
                translatedText = pretrans
                textareaElem3.innerText = translatedText;
                textareaElem3.value = translatedText;
            }

            // Populate the second line in preview Plural
            //if (prevstate != "current") {
                let preview = document.querySelector("#preview-" + rowId + " td.translation");
                if (preview != null) {
                    preview.innerText = translatedText;
                    preview.value = translatedText;
                    let myLi = document.querySelector("#preview-" + row + " .translation li:nth-of-type(2)");
                    var element1 = document.createElement("div");
                    element1.setAttribute("class", "trans_local_div");
                    element1.setAttribute("id", "trans_local_div");
                    //PSS
                    element1.appendChild(document.createTextNode(__("Local")));
                    myLi.appendChild(element1);
                }
            //}
        }
        else {
            // This is pretrans line to add
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
                    //console.debug("res:", pretrans)
                    translatedText = pretrans
                    textareaElem2.innerText = translatedText;
                    textareaElem2.value = translatedText;
                }
            }

            textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
            //console.debug("elem3:", textareaElem3)
            if (textareaElem3 != null) {
                plural = plural + "_03"
                let pretrans = await findTransline(plural, destlang);
                if (pretrans != null) {
                    //console.debug("res:", pretrans)
                    translatedText = pretrans
                    textareaElem3.innerText = translatedText;
                    textareaElem3.value = translatedText;
                }
            }

            let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(2) .translation-text");
           // console.debug("previewElem 4207:",previewElem)
            if (previewElem != null) {
                previewElem.innerText = translatedText;
                previewElem.value = translatedText;
                var element1 = document.createElement("div");
                let myLi = document.querySelector("#preview-" + row + " .translation li:nth-of-type(2)");
                element1.setAttribute("class", "trans_local_div");
                element1.setAttribute("id", "trans_local_div");
                //PSS
                element1.appendChild(document.createTextNode(__("Local")));
                myLi.appendChild(element1);
            }
        }
    }

    current = await document.querySelector("#editor-" + row + " div.editor-panel__left div.panel-header span.panel-header__bubble");
    //console.debug("current:", current)
    current.innerText = "transFill"
    current.value = "transFill"
    select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
    //select = next_editor.getElementsByClassName("meta");
    //console.debug("select 4224:",select)
    var status = select.querySelector("dd");
    //console.debug("status:",status)
    status.innerText = "transFill";
    status.value = "transFill";
   
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translatePage(apikey, apikeyDeepl, apikeyMicrosoft, apikeyOpenAI, OpenAIPrompt, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, completedCallback, OpenAISelect, openAIWait, OpenAItemp, spellCheckIgnore, deeplGlossary, OpenAITone, DeepLWait, openAiGloss) {
    //console.debug("We started translatePage")
    var translate;
    var transtype = "";
    var plural_line = "";
    var plural_present = "";
    var record = "";
    var row = "";
    var newrow;
    var rowfound = "";
    var preview = "";
    var previewElem;
    var pretrans;
    var timeout = 1000;
    var mytimeout = 1000;
    var vartime = 100;
    var stop = false;
    var editor = false;
    var counter = 0;
    var myrecCount = 0;
    var previewClass;
    var localRow;
    var mytransType = "none"
    var myheader = document.querySelector('header');
    
    //console.debug("transType at start:",mytransType)
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    progressbar = document.querySelector(".indeterminate-progress-bar");
    inprogressbar = document.querySelector(".indeterminate-progress-bar__progress")
    //console.debug("glos:", openAiGloss)
    if (progressbar == null) {
        myheader.insertAdjacentHTML('afterend', template);
        // progressbar = document.querySelector(".indeterminate-progress-bar");
        //progressbar.style.display = 'block;';
    }
    else {
        // we need to remove the style of inprogress to see the animation again
        inprogressbar.style = ""
        progressbar.style.display = 'block';
    }
    //24-07-2023 PSS corrected an error causing DeepL, Google, and Microsoft to translate very slow
    if (transsel == 'OpenAI') {
        vartime = convertToNumber(openAIWait);
    }
    //console.debug("DeepL:",transsel,DeepLWait)
    if (transsel == 'deepl') {
        // console.debug("we have deepl")
        timeout=0
        vartime = convertToNumber(DeepLWait)
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

    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
    translateButton.innerText = __("Translate");
    //console.debug("Button classname:", translateButton.className);
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (translateButton.className == "translation-filler-button") {
        translateButton.className += " started";
    }
    else {
        translateButton.classList.remove("translation-filler-button", "started", "translated");
        translateButton.classList.remove("translation-filler-button", "restarted", "translated");
        translateButton.className = "translation-filler-button restarted";
    }
    if (typeof postTranslationReplace != "undefined" && postTranslationReplace.length != 0) {
        if (typeof preTranslationReplace != "undefined" && preTranslationReplace.length != 0) {
            // PSS 21-07-2022 Currently when using formal, the translation is still default #225
            setPostTranslationReplace(postTranslationReplace, formal);
            setPreTranslationReplace(preTranslationReplace);
            myrecCount = document.querySelectorAll("tr.editor")
            tableRecords = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content").length;
            const translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
            const progressbar = document.querySelector(".indeterminate-progress-bar");

            let counter = 0;
  //const translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
            //const progressbar = document.querySelector(".indeterminate-progress-bar");
  await delay(vartime); // Wait the delay before starting this iteration
  for (const record of myrecCount) {
   
    counter++;
    let mytransType = "none";
    const rowfound = record.id;
    const match = rowfound.match(/^editor-(\d+(?:-\d+)?)$/);
    const row = match ? match[1] : null;

    if (!row) {
      console.warn(`No match found for record id: ${rowfound}`);
      continue;  // Skip to next record
    }

    try {
      mytransType = await handleType(
        row,
        record,
        destlang,
        transsel,
        apikey,
        apikeyDeepl,
        apikeyMicrosoft,
        apikeyOpenAI,
        OpenAIPrompt,
        transsel,
        destlang,
        postTranslationReplace,
        preTranslationReplace,
        formal,
        convertToLower,
        DeeplFree,
        completedCallback,
        OpenAISelect,
        openAIWait,
        OpenAItemp,
        spellCheckIgnore,
        deeplGlossary,
        OpenAITone,
        DeepLWait,
        openAiGloss,
        counter
        );
        //console.debug(`[${new Date().toISOString()}] text processed by handletype`)
    } catch (err) {
      console.error(`Translation failed for row ${row}:`, err);
    }

    // When all rows are translated
    if (counter === myrecCount.length) {
      if (translateButton) {
        translateButton.classList.add("translated");
        translateButton.innerText = __("Translated");
      }

      if (progressbar) {
        progressbar.style.display = "none";
      }
      messageBox("info", __("Translation is ready"));
    }
  }
        }
        else {
            messageBox("error", __("Your pretranslate replace verbs are not populated add at least on line!"));
            // 07-07-2021 Fix for issue #98
            translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " after_error";
        }
    } else {
        messageBox("error", __("Your postreplace verbs are not populated add at least on line!"));
        // 07-07-2021 Fix for issue #98
        translateButton = document.querySelector(".paging a.translation-filler-button");
        translateButton.className += " after_error";
    }
    //console.debug("translatePage ready")
}

async function oldtranslatePage(apikey, apikeyDeepl, apikeyMicrosoft, apikeyOpenAI, OpenAIPrompt, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, completedCallback, OpenAISelect, openAIWait, OpenAItemp, spellCheckIgnore, deeplGlossary, OpenAITone, DeepLWait, openAiGloss) {
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
    var previewElem;
    var pretrans;
    var timeout = 100;
    var mytimeout = 1000;
    var vartime = 500;
    var stop = false;
    var editor = false;
    var counter = 0;
    var myrecCount = 0;
    var previewClass;
    var localRow;
    var myheader = document.querySelector('header');
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    progressbar = document.querySelector(".indeterminate-progress-bar");
    inprogressbar = document.querySelector(".indeterminate-progress-bar__progress")
    //console.debug("glos:", openAiGloss)
    if (progressbar == null) {
        myheader.insertAdjacentHTML('afterend', template);
        // progressbar = document.querySelector(".indeterminate-progress-bar");
        //progressbar.style.display = 'block;';
    }
    else {
        // we need to remove the style of inprogress to see the animation again
        inprogressbar.style = ""
        progressbar.style.display = 'block';
    }
    //24-07-2023 PSS corrected an error causing DeepL, Google, and Microsoft to translate very slow
    if (transsel == 'OpenAI') {
        vartime = openAIWait;
    }
    //console.debug("DeepL:",transsel,DeepLWait)
    if (transsel == 'deepl') {
        vartime = DeepLWait
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
    
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
    translateButton.innerText = __("Translate");
    //console.debug("Button classname:", translateButton.className);
    // 30-10-2021 PSS fixed issue #155 let the button spin again when page is already translated
    if (translateButton.className == "translation-filler-button") {
        translateButton.className += " started";
    }
    else {
        translateButton.classList.remove("translation-filler-button", "started", "translated");
        translateButton.classList.remove("translation-filler-button", "restarted", "translated");
        translateButton.className = "translation-filler-button restarted";
    }

    // 15-05-2021 PSS added fix for issue #73
    // 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
    if (typeof postTranslationReplace != "undefined" && postTranslationReplace.length != 0) {
        if (typeof preTranslationReplace != "undefined" && preTranslationReplace.length != 0) {
            // PSS 21-07-2022 Currently when using formal, the translation is still default #225
            setPostTranslationReplace(postTranslationReplace, formal);
            setPreTranslationReplace(preTranslationReplace);
            myrecCount = document.querySelectorAll("tr.editor")
            tableRecords = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content").length;
            for (let record of myrecCount) {
                //setTimeout(async function () {
                counter++;
                transtype = "single";
                // 16-08-2021 PSS fixed retranslation issue #118
                rowfound = record.id
               // console.debug("rowfound:", rowfound)
                const match = rowfound.match(/^editor-(\d+(?:-\d+)?)$/);

                if (match) {
                    row = match[1];
                   // console.log("Extracted value:", row);
                } else {
                   // console.log("No match found");
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
                if (transname != null) {
                    transname.className = "trans_name_div";
                    transname.innerText = __("URL, name of theme or plugin or author!");
                    // In case of a plugin/theme name we need to set the button to blue
                    let curbut = document.querySelector(`#preview-${row} .priority .tf-save-button`);
                    // console.debug("currbut:",curbut)
                    curbut.style.backgroundColor = "#0085ba";
                    curbut.innerText = "Save";
                    curbut.title = __("Save the string");
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
                    if (pretrans != "notFound") {
                        localRow = row
                    }
                    if (pretrans == "notFound") {
                        // 20-06-2021 PSS fixed that translation stopped when the page already is completely translated issue #85
                        if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                            let transhide = document.getElementById("translate-" + row + "-translocal-entry-local-button");
                            transhide.style.visibility = 'hidden'
                        }
                        if (transsel == "google") {
                            result = await googleTranslate(original, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore, false);
                            if (errorstate == "Error 400") {
                                messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
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
                            //console.debug("row in page before translate:",original,row)
                            result = await deepLTranslate(original, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, false);
                            if (result == "Error 403") {
                                messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
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
                                messageBox("error", __("Error 456 Quota exceeded. The character limit has been reached"));
                                stop = true;
                                //break;
                            }
                            else {
                                //console.debug("errorstate:",errorstate)
                                if (errorstate != "OK") {
                                    // messageBox("error", "There has been some uncatched error: " + errorstate);
                                    //alert("There has been some uncatched error: " + errorstate);
                                    stop = true;
                                   // console.debug("we break!!")
                                    //break;
                                }
                            }
                        }
                        else if (transsel == "microsoft") {
                            result = await microsoftTranslate(original, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore, false);
                            if (result == "Error 401") {
                                messageBox("error", __("Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!"));
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
                            //console.debug("row in page AI:",row)
                            let result = await AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss);
                            if (errorstate == "Error 401") {
                                messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
                       // console.debug("we found a pretranslated!",pretrans,row,localRow)
                        let translatedText = pretrans;
                        // check if the returned translation does have the same start/ending as the original
                        if (translatedText != "No suggestions") {
                            // console.debug("trnans:",translatedText)
                            result = check_start_end(translatedText, "", 0, "", original, "", 0);
                        }
                        let textareaElem = record.querySelector("textarea.foreign-text");
                        textareaElem.innerText = translatedText;
                        textareaElem.value = translatedText;
                        if (typeof current != "undefined") {
                            current.innerText = "transFill";
                            current.value = "transFill";
                        }
                        // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                        select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content .meta`);
                        //select = next_editor.getElementsByClassName("meta");
                        var status = select.querySelector("dd");
                        status.innerText = "transFill";
                        status.value = "transFill";
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        if (currec != null) {
                            var current = currec.querySelector("span.panel-header__bubble");
                        }
                        // console.debug("before validate:", destlang, textareaElem, "org: ",original,"locale: ", locale)
                        // if it is a local translation we still need to set the quality of the translation!!
                        validateEntry(destlang, textareaElem, "", "", row, locale, record, false);
                        // PSS 10-05-2021 added populating the preview field issue #68
                        // Fetch the first field Singular
                        preview = document.querySelector(`#preview-${row}`)
                        //preview = await document.getElementById("preview-" + row)
                        // Here we add the "local" text into the preview
                        var element1 = document.createElement("div");
                        element1.setAttribute("class", "trans_local_div");
                        element1.setAttribute("id", "trans_local_div");
                        element1.appendChild(document.createTextNode(__("Local")));
                        textareaElem.appendChild(element1);
                        
                        if (previewElem != null) {
                            previewElem[0].innerText = translatedText;
                            previewClass = preview;
                            previewClass.classList.replace("no-translations", "has-translations");
                            previewClass.classList.replace("untranslated", "status-waiting");
                            previewClass.classList.replace("status-fuzzy", "status-waiting");
                            previewClass.classList.add("wptf-translated");
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
                                   // var small = document.createElement("small");
                                   // li1.appendChild(small);
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
                                   // var small = document.createElement("small");
                                  //  li2.appendChild(small);
                                    //small.appendChild(document.createTextNode("Plural:"));
                                  //  var br = document.createElement("br");
                                    //li2.appendChild(br);
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
                                        //PSS
                                        element1.appendChild(document.createTextNode(__("Local")));
                                        preview.appendChild(element1);
                                    }
                                    preview = document.querySelector(`#preview-${row}`);
                                    if (translatedText != "No suggestions" && translatedText != "No suggestions due to overload openAI!!") {
                                        translated = true
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
                                    mark_as_translated(row, current, translated, preview);
                                }
                            } else {
                                // console.debug("single")
                                // if it is as single with local then we need also update the preview
                               // console.debug("We have a single with local")
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
                                let localpresent = preview.querySelector(".trans_local_div:nth-of-type(1)");
                                //console.debug("local:",localpresent)
                                // 17-02-2034 PSS do not add the label twice
                                if (localpresent == null) {
                                    let element1 = document.createElement("div");
                                    element1.setAttribute("class", "trans_local_div");
                                    element1.setAttribute("id", "trans_local_div");
                                    //PSS
                                    element1.appendChild(document.createTextNode(__("Local")));
                                    preview.appendChild(element1);
                                }
                                // we need to set the checkbox as marked
                                preview = getPreview(rowId);
                                //preview = document.querySelector(`#preview-${rowId}`);
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
                            // console.debug("class:",currentClass)
                            currentClass.classList.replace("no-translations", "has-translations");
                            currentClass.classList.replace("untranslated", "status-waiting");
                            currentClass.classList.replace("status-fuzzy", "status-waiting");
                            currentClass.classList.add("wptf-translated");
                            //console.debug("preview in local:",preview)
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
                                    result = await googleTranslate(plural, destlang, record, apikey, replacePreVerb, row, transtype, plural_line, locale, convertToLower, editor, spellCheckIgnore, false);
                                    if (errorstate == "Error 400") {
                                        messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
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
                                    result = deepLTranslate(plural, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, false);
                                    if (result == "Error 403") {
                                        messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
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
                                    result = await microsoftTranslate(plural, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line, locale, convertToLower, spellCheckIgnore, false);
                                    if (result == "Error 401") {
                                        messageBox("error", __("Error in translation received status 401, authorisation refused.<br>Please check your licence in the options!!!"));
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
                                    result = await AITranslate(plural, destlang, record, apikeyOpenAI, OpenAIPrompt, replacePreVerb, row, transtype, plural_line, formal, locale, convertToLower, DeeplFree, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, false, openAiGloss);

                                    if (result == "Error 401") {
                                        messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
                                        //console.debug("res:", pretrans)
                                        translatedText = pretrans
                                        textareaElem2.innerText = translatedText;
                                        textareaElem2.value = translatedText;
                                    }

                                    textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
                                    //console.debug("elem3:", textareaElem3)
                                    if (textareaElem3 != null) {
                                        plural = plural + "_03"
                                        let pretrans = await findTransline(plural, destlang);
                                        //console.debug("res:", pretrans)
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
                                            //PSS
                                            element1.appendChild(document.createTextNode(__("Local")));
                                            preview.appendChild(element1);
                                        }
                                    }
                                }
                                else {
                                    // 30-10-2021 PSS added a fix for issue #154
                                    // If the span missing is present it needs to be removed and the ul added otherwise the second line cannot be populated
                                    plural_line="1"
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
                                            //console.debug("res:", pretrans)
                                            translatedText = pretrans
                                            textareaElem2.innerText = translatedText;
                                            textareaElem2.value = translatedText;
                                        }
                                    }

                                    textareaElem3 = record.querySelector("textarea#translation_" + rowId + "_3");
                                    //console.debug("elem3:", textareaElem3)
                                    if (textareaElem3 != null) {
                                        plural = plural + "_03"
                                        let pretrans = await findTransline(plural, destlang);
                                        if (pretrans != null) {
                                            //console.debug("res:", pretrans)
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
                                        //PSS
                                        element1.appendChild(document.createTextNode(__("Local")));
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
                    translated = true
                    let translatedText = original;
                    let preview = document.querySelector("#preview-" + row + " td.translation");
                    //console.debug("we have a local",original,row)
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
                        nameDiff = isExactlyEqual(translatedText, originalElem.innerText)
                        showNameLabel(originalElem,row,nameDiff)
                    }
                    preview = document.querySelector(`#preview-${row}`);
                    // we need to set the button to "save"
                    let curbut = preview.querySelector(`.tf-save-button`);
                    //console.debug("currbut:", curbut)
                    if (curbut != null) {
                        curbut.style.backgroundColor = "#0085ba";
                        curbut.innerText = __("Save");
                        curbut.title = __("Save the string");
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
                    mark_as_translated(row, current, translated, preview)
                    // await validateEntry(destlang, textareaElem, "", "", row);
                }
                // single translation completed
                if (completedCallback) {
                    let textareaElem = record.querySelector("textarea.foreign-text");
                    completedCallback(original, textareaElem.innerText);
                }
                if (counter == tableRecords) {
                    // Translation completed we need to stop spinning the translate button
                    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
                    translateButton.className += " translated";
                    translateButton.innerText = __("Translated");
                    progressbar = document.querySelector(".indeterminate-progress-bar");
                    progressbar.style.display = "none";
                    messageBox("info", __("Translation is ready"));
                }
                // We need to wait a bit before fetching the net record
                await delay(vartime * counter)
                // }, vartime * counter)
                if (stop == true) {
                    let translateButton = document.querySelector(".wptfNavBarCont a.translation-filler-button");
                    translateButton.className += " translated";
                    translateButton.innerText = __("Translated");
                    messageBox("error", "End There has been some uncatched error: " + errorstate);
                    break;
                }
            }
        }
        else {
            messageBox("error", __("Your pretranslate replace verbs are not populated add at least on line!"));
            // 07-07-2021 Fix for issue #98
            translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " after_error";
        }
    } else {
        messageBox("error", __("Your postreplace verbs are not populated add at least on line!"));
        // 07-07-2021 Fix for issue #98
        translateButton = document.querySelector(".paging a.translation-filler-button");
        translateButton.className += " after_error";
    }
    // console.timeEnd("translation");
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
function check_span_missing(row, plural_line) {
    // console.debug("check_span_missing plural_line:",plural_line)
    let preview = document.querySelector("#preview-" + row + " td.translation");
    let spanmissing = preview.querySelector(" span.missing");
    //console.debug("check_span_missing:",spanmissing)
    if (spanmissing != null) {
        //if (plural_line == "1") {
        // only remove when it is present and first plural line
        spanmissing.remove();
        // }

        var ul = document.createElement("ul");
        ul.classList.add('ul-plural');
        preview.appendChild(ul);
        //console.debug("ul found:",ul)
        //ul.className = "ul-plural"
        var li1 = document.createElement("li");
        li1.style.cssText = "text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;";
        ul.appendChild(li1);
        // var small = document.createElement("small");
        //  li1.appendChild(small);
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
        // var small = document.createElement("small");
        // li2.appendChild(small);
        //small.appendChild(document.createTextNode("Plural:"));
        //  var br = document.createElement("br");
        //  li2.appendChild(br);
        var myspan2 = document.createElement("span");
        myspan2.className = "translation-text";
        li2.appendChild(myspan2);
        myspan2.appendChild(document.createTextNode("empty"));
    }
    else  {
    previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(1)");
    //console.debug("previewElem 5388:", previewElem)
    if (previewElem == null) {
        var ul = document.createElement("ul");
        var li1 = document.createElement("li");
        var small = document.createElement("small");
        
        small.appendChild(document.createTextNode("Singular:"));
        li1.appendChild(small);
        var br = document.createElement("br");
        li1.appendChild(br);
        ul.appendChild(li1)
        var myspan1 = document.createElement("span");
        myspan1.className = "translation-text";
        li1.appendChild(myspan1);

        // ul.classList.add('ul-plural');
         var li2 = document.createElement("li");
        var small = document.createElement("small");
        
        small.appendChild(document.createTextNode("Plural:"));
        li2.appendChild(small);
        var br = document.createElement("br");
        li2.appendChild(br);
        ul.appendChild(li2)
        var myspan1 = document.createElement("span");
        myspan1.className = "translation-text";
        li2.appendChild(myspan1);
        preview.appendChild(ul);
    }
    else {

   
    //console.debug("ul found:", ul)
    var li2 = document.createElement("li");
    // PSS 123
    var br = document.createElement("br");
    // li2.appendChild(br);
    var myspan2 = document.createElement("span");
    myspan2.className = "translation-text";
    // li2.appendChild(myspan2);
    previewElem.appendChild(myspan2)
    
    }
 
    }

}

async function checkEntry(rowId, postTranslationReplace, formal, convertToLower, completedCallback, spellCheckIgnore) {
    var translatedText;
    var formal = checkFormal(false);
    var editor;
    var plural;
    var preview;
    var preview_textElem;
    
    setPostTranslationReplace(postTranslationReplace, formal);
    editor = await document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`)

    // We need to populate the corrected preview as well
    preview = getPreview(rowId);
    preview_textElem = preview.getElementsByClassName("translation foreign-text");

    let original = editor.querySelector("span.original-raw").innerText;
    let text = editor.querySelector("textarea.foreign-text").value;
    let checkTranslateButton = await document.querySelector(`#editor-${rowId} .checktranslation-entry-my-button`)
    checkTranslateButton.className = "checktranslation-entry-my-button"
    // posprocess the translation
    translatedText = postProcessTranslation(original, text, replaceVerb, text, "checkEntry", convertToLower, spellCheckIgnore, locale);
    //console.debug("translatedtext:",translatedText)
    textareaElem = editor.querySelector("textarea.foreign-text");
    if (textareaElem != null && typeof textareaElem != "undefined") {
        textareaElem.innerText = translatedText;
        textareaElem.value = translatedText;
        textareaElem.textContent =translatedText
        requestAnimationFrame(() => {
            textareaElem.style.height = "auto";
            textareaElem.style.height = textareaElem.scrollHeight + "px";
        });
        
    }
    preview_textElem[0].innerHTML = translatedText
    preview_textElem[0].innerText = translatedText
    preview_textElem[0].value = translatedText
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
    if (checkTranslateButton != null) {
        checkTranslateButton.className = "checktranslation-entry-my-button ready";
        checkTranslateButton.style.color = 'white';
    }
}

async function setLowerCase(rowId, spellCheckIgnore) {
    var translatedText;
    var editor;
    editor = await document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`)
    let original = editor.querySelector("span.original-raw").innerText;
    let text = editor.querySelector("textarea.foreign-text").value;
    // posprocess the translation
    textareaElem = editor.querySelector("textarea.foreign-text");
    if (text != "") {
        translatedText = convert_lower(text, spellCheckIgnore);
        textareaElem.innerText = translatedText;
        textareaElem.value = translatedText;
        requestAnimationFrame(() => {
            textareaElem.style.height = "auto";
        });
        
        //textareaElem.style.height = textareaElem.scrollHeight + "px";
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


async function translateEntry(rowId, apikey, apikeyDeepl, apikeyMicrosoft, apikeyOpenAI, OpenAIPrompt, transsel, destlang, postTranslationReplace, preTranslationReplace, formal, convertToLower, DeeplFree, completedCallback, OpenAISelect, OpenAItemp, spellCheckIgnore, deeplGlossary, OpenAITone, openAiGloss) {
    var translateButton;
    var result;
    errorstate = "OK"
    var textareaElem;
    locale = checkLocale();
    // addTranslateButtons(rowId);
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
        translateButton.innerText = __("Translate")
    }
    let preview = document.querySelector(`#preview-${rowId} .translation.foreign-text`);
    //16 - 06 - 2021 PSS fixed this function to prevent double buttons issue #74
    // 07-07-2021 PSS need to determine if current record
    let g = document.querySelector(`#editor-${rowId} div.editor-panel__left`);
    //console.debug("g:",g)
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
    detail_preview = getPreview(rowId)
    //detail_preview = document.querySelector(`#preview-${rowId}`);
    detail_glossary = detail_preview.querySelector(`.glossary-word`)
    if (detail_glossary != null) {
        detail_glossary = true
    }
    else {
        detail_glossary = false
    }

    // 15-05-2021 PSS added fix for issue #73

    if (typeof postTranslationReplace != "undefined" && postTranslationReplace.length != 0) {
        if (preTranslationReplace.length != 0) {
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
            textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = "";
            textareaElem.value = "";
            requestAnimationFrame(() => {
                textareaElem.style.height = "auto"
            });
            
            if (toTranslate) {
                // console.debug("we need to translate");
                let pretrans = await findTransline(original, destlang);
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        result = await googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore, deeplGlossary, is_entry);
                        if (errorstate == "Error 400") {
                            messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
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
                        is_entry = true
                        deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary, is_entry)
                        //console.debug("result:",errorstate)
                        // if (result == 'Error 403') {
                        //     messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
                        // }
                        //  else if (result == 'Error 404') {
                        //   messageBox("error", "Error in translation received status 404 The requested resource could not be found.<br>Or the glossary provided is not present<br>" + deeplGlossary);
                        //   translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
                        // if row is already translated the rowId has different format, so we need to search with this different format
                        //   if (translateButton == null) {
                        //       translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
                        //   }
                        //   translateButton.className += " translated_error";
                        //   translateButton.innerText = __("Error");
                        // }
                        // else if (result == "Error 400") {
                        //     messageBox("error", "Error in translation received status 400 with readyState == 3<br>Language: " + destlang + " not supported!");
                        // }
                        // else if (errorstate == "Error 456") {
                        //     messageBox("error", __("Error 456 Quota exceeded. The character limit has been reached"));
                        // }
                        // else {
                        //   if (errorstate != "OK" && errorstate !=false) {
                        //       messageBox("error", "There has been some uncatched error: " + errorstate);
                        // alert("There has been some uncatched error: " + errorstate);
                        //   }
                        //}

                    }
                    else if (transsel == "microsoft") {
                        result = await microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
                        if (result == "Error 401") {
                            messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
                        result = await AITranslate(original, destlang, e, apikeyOpenAI, OpenAIPrompt, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, editor, "1", OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, "editor", openAiGloss);
                        if (result == "Error 401") {
                            messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
                            // alert("Error in translation received status 401 \r\nThe request is not authorized because credentials are missing or invalid.");
                        }
                        else if (result == "Error 403") {
                            messageBox("error", "Error in translation received status 403 with readyState == 3<br>Language: " + destlang + " not supported!");
                            //alert("Error in translation received status 403 with readyState == 3 \r\nLanguage: " + language + " not supported!");
                        }
                        else {
                            // console.debug("errorstate:",errorstate)
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                                //alert("There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    showButton = document.getElementById("translate-" + rowId + "-translocal-entry-local-button")
                    // we need to hide the button if it is visible
                    if (showButton.style.visibility != "hidden") {
                        showButton.style.visibility = "hidden"
                    }
                    // document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = "hide";
                    //   let textareaElem = e.querySelector("textarea.foreign-text");
                    translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
                    // if row is already translated the rowId has different format, so we need to search with this different format
                    if (translateButton == null) {
                        translateButton = document.querySelector(`#translate-${rowId}--translation-entry-my-button`);
                    }
                    translateButton.className += " translated";
                    translateButton.innerText = __("Translated");
                    // console.debug("translatedText:",translatedText)
                }
                else {
                    let translatedText = pretrans;
                   
                      if (formal) {
                         translatedText = await replaceVerbInTranslation(original, translatedText, replaceVerb)
                      }
                    translatedText = await postProcessTranslation(original, translatedText, replaceVerb, "", "", convertToLower, "", locale);

                    // check if the returned translation does have the same start/ending as the original
                    if (translatedText != "No suggestions") {
                        result = await check_start_end(translatedText, "", 0, "", original, "", 0);
                    }
                    //let textareaElem = e.querySelector("textarea.foreign-text");
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
                    translateButton.innerText = __("Translated");
                }
            }
            else {
                // no translation needed
                let translatedText = original;
                //let textareaElem = e.querySelector("textarea.foreign-text");
               
                if (formal) {
                    translatedText = await replaceVerbInTranslation(original, translatedText, replaceVerb)
                }
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
                translateButton.innerText = __("Translated");
            }
            //let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
            let checkplural = document.querySelector(`#editor-${rowId} .source-string__plural span.original-raw`);
            //console.debug("plural 2:",checkplural)
            if (checkplural != null) {
                let original = checkplural.innerText;
                var transtype = "plural";
                let pretrans = await findTransline(original, destlang);
                plural_line = "2";
                if (pretrans == "notFound") {
                    if (transsel == "google") {
                        result = googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore, deeplGlossary, is_entry);
                        if (errorstate == "Error 400") {
                            messageBox("error", __("API key not valid. Please pass a valid API key.<br>Please check your licence in the options!!!"));
                        }
                        else {
                            if (errorstate != "OK") {
                                messageBox("error", "There has been some uncatched error: " + errorstate);
                            }
                        }
                    }
                    else if (transsel == "deepl") {
                        // console.debug("language:",destlang)
                        //console.debug("we translate plural_line:",plural_line)
                        result = await deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree, spellCheckIgnore, deeplGlossary);
                        if (result == "Error 403") {
                            messageBox("error", __("Error in translation received status 403, authorisation refused.<br>Please check your licence in the options!!!"));
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
                        result = await microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore);
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
                        result = await AITranslate(original, destlang, e, apikeyOpenAI, OpenAIPrompt, replacePreVerb, rowId, transtype, plural_line, locale, convertToLower, DeeplFree, editor, "1", OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, "editor", openAiGloss);
                        if (result == "Error 401") {
                            messageBox("error", __("Error in translation received status 401<br>The request is not authorized because credentials are missing or invalid."));
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
                        let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                        textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                        textareaElem2 = f.querySelector("textarea#translation_" + row + "_2");
                        if (textareaElem2 != 'undefined' && textareaElem2 !=null) { 
                            textareaElem2.innerText = translatedText;
                            textareaElem2.value = translatedText;
                        }
                        await validateEntry(destlang, textareaElem1, "", "", rowId, locale, e, false, DefGlossary);
                    }
                    else {
                        let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                        textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                        textareaElem2 = f.querySelector("textarea#translation_" + row + "_2");
                        if (textareaElem2 != 'undefined' && textareaElem2 != null) {
                            textareaElem2.innerText = translatedText;
                            textareaElem2.value = translatedText;
                        }
                        await validateEntry(destlang, textareaElem1, "", "", rowId, locale, e, false, DefGlossary);
                        document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = "visible";
                    }
                }
            }
            else {
                //console.debug("checkplural null");
            }

            // Translation completed
            let myleftPanel = await document.querySelector(`#editor-${rowId} .editor-panel__left`)
            //remove_all_gloss(markleftPanel, false)
            // we need to validate the results from local as well, to remove the glossary markings if present
            result = await validateEntry(destlang, textareaElem, "", false, rowId, locale, e, false, DefGlossary);
           
            //mark_glossary(myleftPanel, "", textareaElem.textContent, rowId, false)

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
            messageBox("error", __("Your pretranslate replace verbs are not populated add at least on line!!"));
            let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            translateButton.className += " translated_error";
        }
    }
    else {
        messageBox("error", __("Your postreplace verbs are not populated add at least on line!"));
        let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
        translateButton.className += " translated_error";
    }
}

async function saveLocal() {
    // 04-08-2022 PSS Bulksave does not save all records and "dismiss message" is not dismissed #228
    var counter = 0;
    var timeout = 0;
    var timout = 1000;
    vartime = 100;
    var MycopyClip;
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    if (autoCopyClipBoard) {
        MycopyClip = true;
    }
    autoCopyClipBoard = false;
    //console.debug("saveLocal started",is_pte)
    for (let preview of document.querySelectorAll("tr.preview.status-waiting")) {

        if (is_pte) {
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
                        waitForMyElement('.gp-js-message', 1000,"5271")
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
        await delay(vartime * counter)
    }
    return counter;
}

// Function to walk through the HTML table
function walkThroughTable(selector, interval) {
    var timeout = 1000;
    var MycopyClip
   // console.debug("we walk through table")
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
                let walkThroughId = setTimeout(() => {
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
                                if (autoCopyClipBoard) {
                                    MycopyClip = true;
                                }
                                autoCopyClipBoard = false;
                                let bulk_save = preview.querySelector(".tf-save-button");
                                bulk_save.click();
                                waitForMyElement('.gp-js-message', 300,"5359")
                            }
                        }
                    }
                }, timeout);
                timeout += 1000;
            });
            clearTimeout(walkThroughId)
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
function processTableRecords(selectorOrElements, action, interval = 0) {
    return new Promise((resolve, reject) => {
        const tableRows = Array.isArray(selectorOrElements)
            ? selectorOrElements
            : Array.from(document.querySelectorAll(selectorOrElements));

        let currentIndex = 0;
        let nextTimoutId;

        function processNextRecord() {
            if (currentIndex < tableRows.length) {
                const currentRow = tableRows[currentIndex];
                action(currentRow)
                    .then(() => {
                        nextTimoutId = setTimeout(processNextRecord, interval);
                        currentIndex++;
                    })
                    .catch(error => {
                        reject(error);
                    });
                clearTimeout(nextTimoutId);
            } else {
                resolve();
            }
        }

        processNextRecord();
    });
}

function hasTwoNumbers(row) {
    const parts = row.replace("editor-", "").split("-");
    return parts.length === 2 && parts.every(part => /^\d+$/.test(part));
}

function waitForFullRowId(firstPart, timeout = 4000) {
    return new Promise((resolve, reject) => {
        let resolved = false;

        const check = () => {
            const match = Array.from(document.querySelectorAll('tr[id^="preview-"]'))
                .find(el => el.id.startsWith(`preview-${firstPart}-`));

            if (match) {
                resolved = true;
                observer.disconnect();
                clearTimeout(timer);
                const fullRowId = match.id.replace("preview-", "");
                resolve(fullRowId);
            }
        };

        const observer = new MutationObserver(check);

        observer.observe(document.body, { childList: true, subtree: true });

        // Check immediately in case it's already there
        check();

        // Timeout fallback to avoid hanging forever
        const timer = setTimeout(() => {
            observer.disconnect();
            if (!resolved) {
                reject(new Error("Full row ID not found within timeout."));
            }
        }, timeout);
    });
}

function hideIncompletePreviewRows() {
    const rows = document.querySelectorAll('tr.status-waiting[id^="preview-"]');

    rows.forEach(row => {
        const id = row.id;
        const match = id.match(/^preview-(\d+)(?:-(\d+))?$/);
        // Hide the row if it doesn't have the second number
        if (match && !match[2]) {
            row.style.display = "none";
            //row.style.removeProperty("display");
           // console.debug("Hiding row with incomplete ID:", id);
        }
    });
}

function hideUntranslatedPreviewRows() {
    const timer = setTimeout(() => {
        const rows = document.querySelectorAll('tr.untranslated[id^="preview-"]');
        rows.forEach(row => {
            const id = row.id;
            const match = id.match(/^preview-(\d+)(?:-(\d+))?$/);
            // Hide the row if it doesn't have the second number
            if (match && !match[2]) {
               row.style.removeProperty("display");
                row.style.display = "none";
                row.style.display = "hidden";
            }
        });
    },100)
}

async function saveLocal_2(bulk_timer) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    var timeout = 2000;
    var counter = 0;
    var line_read = 0;
    var My1copyClip;
    var Edopen;
    let debug = false;
    StartObserver = false;
    enableInterceptSuggestions()
    const perfNow = () => performance.now(); // High resolution timer in ms

    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>`;
    var myheader = document.querySelector('#wpadminbar');
    var progressbar = document.querySelector(".indeterminate-progress-bar");
    if (!progressbar) {
        myheader.insertAdjacentHTML('afterend', template);
    } else {
        progressbar.style.display = 'block';
    }

    const checkedRows = Array.from(document.querySelectorAll('.wptf-translated input[type="checkbox"]:checked'))
        .map(cb => cb.closest('.wptf-translated'))
        .filter(row => row !== null);

    for (const preview of checkedRows) {
        try {
            await processRow(preview);
        } catch (err) {
            console.debug("Row failed, skipping to next:", err.message || err);
        }

        // Wait bulk_timer ms before next row
        if (bulk_timer > 0) {
            if (debug) {
                console.debug(`Waiting ${bulk_timer} ms before next row...`);
            }
            await new Promise(res => setTimeout(res, bulk_timer));
        }
    }

    // Show summary after all rows processed
    timeout += bulk_timer;
    hideIncompletePreviewRows();
    hideUntranslatedPreviewRows();
    disableInterceptSuggestions();
    progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar) {
        progressbar.style.display = "none";
        StartObserver = true;
        let read = __("We have read:");
        let saved = __(" records and saved:");
        messageBox("info", read + line_read + saved + counter);
        if (My1copyClip) autoCopyClipBoard = true;
    } else {
        console.debug("no progressbar!");
    }

    async function processRow(preview) {
        var checkset = preview.querySelector('input[type="checkbox"]');
        if (!checkset || !checkset.checked) return;
        var debug = false
        var myPreviewRow = preview.id;
        var myNewRow = myPreviewRow.split("-")[1];
        var rowfound = myPreviewRow;
        if (rowfound.split("-")[2] != null) {
            myNewRow = rowfound.split("-")[1] + "-" + rowfound.split("-")[2];
        }
        line_read++;

        if (myNewRow.includes("old")) {
            preview.style.removeProperty("display");
            preview.style.display = "hidden";
            return;
        }

        Edopen = document.querySelector(`#editor-${myNewRow}`);
        if (!Edopen || Edopen === "Time-out reached") return;

        let current = Edopen.querySelector('span.panel-header__bubble');
        let original = Edopen.querySelector("span.original-raw")?.innerText || "";

        if ((current.innerText === 'waiting' || current.innerText === 'transFill') && checkset.checked) {
            let glotpress_suggest = Edopen.querySelector(".translation-actions__save");
            glotpress_suggest.classList.remove("disabled");
            if (autoCopyClipBoard) My1copyClip = true;
            autoCopyClipBoard = false;

            let t_start = perfNow();

            try {
                // Step 1: Click edit
                const editButton = preview.querySelector("td.actions a.action.edit");
                if (!editButton) throw new Error("Edit button not found");
                editButton.click();

                // Step 2: Wait for editor to open
                if (debug) {
                    console.debug(`[${new Date().toISOString()}] Waiting for editor...`);
                }
                const editorOpen = await waitForMyElement(`#editor-${myNewRow} .suggestions-wrapper`, 10000, "6688");
                if (!editorOpen) throw new Error("Editor did not open");

                // Step 3: Click suggest
                await glotpress_suggest.click();
                if (debug) {
                    console.debug(`[${new Date().toISOString()}] Waiting for dismiss / success...`);
                }
                // First dismiss (start save message)
                let t_dismiss1_start = perfNow();
                let recordDismiss = await waitForMyElement(`.gp-js-message-dismiss`, 15000, "6698");
                let t_dismiss1_end = perfNow();
                if (debug) {
                    console.debug(`Dismiss1 found in ${(t_dismiss1_end - t_dismiss1_start).toFixed(1)} ms`);
                }
                if (recordDismiss !== "Time-out reached") recordDismiss.click();

                
                // Second dismiss (existing record error) — short timeout instead of 12s
                let t_dismiss2_start = perfNow();
                let recordError = await waitForMyElement(`.gp-js-message-dismiss`, 500, "6709"); // 0.5s max wait
                let t_dismiss2_end = perfNow();
                if (debug) {
                    console.debug(`Dismiss2 found in ${(t_dismiss2_end - t_dismiss2_start).toFixed(1)} ms`);
                }

                if (recordError !== "Time-out reached") {
                    recordError.click();
                    if (debug) {
                        console.debug("We have an existing record");
                    }
                    throw new Error("We have an existing record");
                 }

                // Saved confirmation
                let t_saved_start = perfNow();
                let recordSaved = await waitForMyElement(`.gp-js-success`, 15000, "6523");
                let t_saved_end = perfNow();
                if (debug) {
                    console.debug(`Saved found in ${(t_saved_end - t_saved_start).toFixed(1)} ms`);
                }
                if (recordSaved === "Time-out reached") throw new Error("Record not saved");
                if (debug) {
                    console.debug(`[${new Date().toISOString()}] Saved...`);
                }
                counter++;
                if (debug) {
                    console.debug(`Sequence completed successfully in ${(perfNow() - t_start).toFixed(1)} ms`);
                }

            } catch (err) {
                console.debug("Saving failed: ", err.message);
            }

        } else {
            toastbox("info", "Problem with:" + original, "700", "Check record:");
        }
    }
}


async function bulkSave(noDiff, bulk_timer) {
    //event.preventDefault();
    var counter = 0;
    var checkboxCounter = 0;
    var row;
    var myWindow;
    var nextpreview;
    var myinterCept = false;

    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    currWindow = window.self;
    
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
            message: __("There are no records selected, <br>are you sure you want to select all records?"),
            confirmText: __("Confirm"),
            cancelText: __("Cancel"),
            myWindow: currWindow
        }).then(async (e) => {
            if (e == ("confirm")) {
                //When performing bulk save the difference is shown in Meta #269
                //value = false;
                //chrome.storage.local.set({ toonDiff: value }).then((result) => {
                //  console.log("Value toonDiff is set to false");
                //});
                setmyCheckBox(e);
                let value = noDiff;
                await setToonDiff({ toonDiff: value });
                counter = saveLocal_2(bulk_timer);
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
function waitForMyElement(selector, timeout, line) {
    var waitTimeoutID
    //console.debug("selector:",selector,line)
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        // Function to check if the element is visible
        function checkElement() {
            const element = document.querySelector(selector);
            if (element) {
               // console.debug("Found in:",element)
                // Element found, resolve the promise
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                // Timeout reached, reject the promise
                clearTimeout(waitTimeoutID)
                resolve("Time-out reached")
                //reject(new Error(`Timeout (${timeout} ms) exceeded while waiting for element with selector "${selector}"`));
            } else {
                // Element not found, check again after a short delay
               waitTimeoutID = setTimeout(checkElement, 300); // Check again after 150 milliseconds
            }
        }

        // Initial check
        checkElement();
    });

}

function _waitForElement(selector, delay = 5, tries = 50) {
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
    var eleReadyID;
    return new Promise((resolve, reject) => {
        //console.debug("within elementReady",selector)
        // PSS issue #203 improvement
        setTimeout(() => {
            eleReadyID = document.querySelector(selector);
            //console.debug("el:",el)
        }, timeout);
        clearTimeout(eleReadyID)
        //console.debug("eltype:", typeof el);
        if (typeof el != null && typeof el != 'undefined') {
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


//# This function processes the result of the fetch
async function processTransl (original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current) {
    var result;
    var myRowId = rowId;
    var previousCurrent = current
    let debug = false;
    var preview;
    var select;
    var td_preview;
    var textareaElem;
    var textareaElem1;
    var textareaElem2;
    var textareaElem3;
    var textareaElem4;
    var formal = checkFormal(false);
    if (debug == true) {
        console.debug("processTransl translatedText:", translatedText)
        console.debug("processTransl ends with blank:",translatedText.endsWith(" "))
        console.debug("processTransl record:", record)
        console.debug("processTransl rowId:", myRowId)
        console.debug("processTransl transtype:", transtype)
        if (transtype == 'single') {
            console.debug("processTransl a single line", transtype)
        }
        else {
            console.debug("processTransl plural_line:", plural_line)
        }

    }
    if (formal) {
        mytranslatedText = await replaceVerbInTranslation(original, translatedText, replaceVerb)
    }
    else {
        mytranslatedText = translatedText
    }
    result = check_start_end(mytranslatedText, mytranslatedText, 0, "", original, "", 0);
   // console.debug("result:", result.translatedText.endsWith(" "))
    mytranslatedText = result.translatedText
    //console.debug("processTransl ends with blank after replacce:",mytranslatedText.endsWith(" "))
    //translatedText = restoreCase(original, translatedText);
    if (transtype == "single") {
        let isPlural = false
        //console.debug("processTransl:",record)
        textareaElem = await record.querySelector("textarea.foreign-text");
        textareaElem.innerText = mytranslatedText;
        textareaElem.innerHTML = mytranslatedText;
        textareaElem1 = textareaElem
        // PSS 29-03-2021 Added populating the value of the property to retranslate            
        textareaElem.value = mytranslatedText;
        //PSS 25-03-2021 Fixed problem with description box issue #13
        requestAnimationFrame(() => {
            textareaElem.style.height = "auto"
            textareaElem.style.height = textareaElem.scrollHeight + "px";
        });
        
        // We need to activate the cursor again obviously
        let inputId = `translation_${myRowId}_0`
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.focus();    // Focus the input to show the cursor
        }
        
        if (current.innerText != "waiting" && current.innerText != "fuzzy") {
            preview = await record.previousElementSibling
        }
        else {
            preview = await getPreview(rowId)
            //preview = await document.querySelector("#preview-" + myRowId)
        }
      
        if (typeof preview != "undefined" && preview != null) {
            td_preview = preview.querySelector("td.translation");
        }
        else {
            console.debug("problem with preview:", preview, myRowId)
        }
        
        // if we are in a single editor without preview, then no need to set the preview text
        if (td_preview != null) {
            td_preview.innerText = mytranslatedText;
            td_preview.innerValue = mytranslatedText;
        }
        myRowId = record.getAttribute("row");
        if (myRowId == null) {
            myRowId = rowId
        }
        // PSS this needs improvement
        let process_current = document.querySelector(`#editor-${myRowId} span.panel-header__bubble`);
        if (typeof process_current != 'undefined' && process_current != null) {
            process_current.innerText = "transFill"
            process_current.value = "transFill"

        }
        
        let prevcurrentClass = preview;
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
        result = await validateEntry(language, textareaElem, "", false, myRowId, locale, record, false, DefGlossary);
        
        remove_all_gloss(leftPanel, preview, isPlural, rowId)
        mark_glossary(leftPanel, result.toolTip, mytranslatedText, rowId, false)
        await mark_preview(preview, result.toolTip, mytranslatedText, rowId, false)
        
    }
    else {
        // PSS 09-04-2021 added populating plural text
        // PSS 09-07-2021 additional fix for issue #102 plural not updated
       // console.debug("current innertext", current.innerText)
         console.debug("We have a plural 6738")
        let isPlural = true
        if (current != "null" && current.innerText == "current" && current.innerText == "waiting" && current.innerText == "transFill" && current.innerText == "untranslated") {
            plural_row = myRowId.split("-")[0];
           // console.debug('rowId plural:', row)
            textareaElem1 = record.querySelector("textarea#translation_" + plural_row + "_0");
            //console.debug("processTransl texareaElem:",textareaElem1)
        }
        else {
           // console.debug("we have a problem possibly untranslated")
           // console.debug("we have plural line:",plural_line)
            //check_span_missing(rowId, plural_line);
            let newrow = myRowId.split("-")[1];
            if (typeof newrow == "undefined") {
                if (transtype != "single") {
                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(1) .translation-text");
                   // console.debug('not single:',rowId,plural_line)
                    if (previewElem == null) {
                        check_span_missing(myRowId, plural_line);
                    }
                }
                if (plural_line == 1) {
                   // console.debug("we update first line in plural:",translatedText)
                    //populate plural line if not already translated, so we can take original rowId
                    textareaElem1 = document.querySelector("textarea#translation_" + myRowId + "_0");
                    textareaElem1.innerText = mytranslatedText;
                    textareaElem1.value = mytranslatedText;
                    //PSS 25-03-2021 Fixed problem with description box issue #13
                    requestAnimationFrame(() => {
                        textareaElem1.style.height = "auto"
                    });

                    // textareaElem1.style.height = textareaElem1.scrollHeight + 'px';
                    // Select the first li
                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(1) .translation-text");
                    console.debug("previewElem:",previewElem)
                    if (previewElem != null) {
                       previewElem.innerText = mytranslatedText;
                    }
                    result = await validateEntry(language, textareaElem1, "", "", myRowId, locale, record, true, DefGlossary);
                    if (textareaElem2 != null) {
                        await mark_preview(preview, result.toolTip, textareaElem2.textContent, myRowId, false)
                    }
                    else if (textareaElem3 != null) {
                        await mark_preview(preview, result.toolTip, textareaElem3.textContent, myRowId, false)
                    }
                    else if (textareaElem4 != null) {
                        await mark_preview(preview, result.toolTip, textareaElem4.textContent, myRowId, false)
                    }
                }
                if (plural_line == 2) {
                    textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_1");
                    //console.debug("We have plural_line 2 we are updating the editor:",textareaElem2)
                    textareaElem2.innerText = mytranslatedText;
                    textareaElem2.value = mytranslatedText;
                    //PSS 25-03-2021 Fixed problem with description box issue #13
                    requestAnimationFrame(() => {
                        textareaElem2.style.height = "auto"
                    });

                    // Select the second li within the preview
                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(2) .translation-text");
                    console.debug("preview in line2:",previewElem)
                    //console.debug("we are updating the second line in preview:")
                    if (previewElem != null) {
                        previewElem.innerText = mytranslatedText;
                    }
                    // the below code is for Russion plural handling
                    textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_2");
                    if (textareaElem3 != null) {
                        textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_2");
                        textareaElem3.innerText = mytranslatedText;
                        textareaElem3.value = mytranslatedText;
                    }
                    textareaElem4 = document.querySelector("textarea#translation_" + myRowId + "_3");
                    if (textareaElem4 != null) {
                        textareaElem4 = document.querySelector("textarea#translation_" + myRowId + "_3");
                        textareaElem4.innerText = mytranslatedText;
                        textareaElem4.value = mytranslatedText;
                    }
                    result = await validateEntry(language, textareaElem2, "", "", myRowId, locale, record, true, DefGlossary);
                    if (textareaElem2 != null) {
                        await mark_preview(preview, result.toolTip, textareaElem2.textContent, myRowId, false)
                    }
                    else if (textareaElem3 != null) {
                        await mark_preview(preview, result.toolTip, textareaElem3.textContent, myRowId, false)
                    }
                    else if (textareaElem4 != null) {
                        await mark_preview(preview, result.toolTip, textareaElem4.textContent, myRowId, false)
                    }
                }
               
            }
            else {
               console.debug("myRowId:",myRowId,record)
                plural_row = myRowId.split("-")[0];
                if (plural_line == 1) {
                    //populate first line of plural line if already translated
                    // console.debug("record:", record)
                    let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                    //console.debug("f:",f)
                    textareaElem1 = f.querySelector("textarea#translation_" + plural_row + "_0");
                    //console.debug("textareaElem1:",textareaElem1)
                    textareaElem1.innerText = mytranslatedText;
                    textareaElem1.value = mytranslatedText;
                    // the below code is for Russion plural handling
                    textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                    if (textareaElem2 != null) {
                        textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                        textareaElem2.innerText = mytranslatedText;
                        textareaElem2.value = mytranslatedText;
                    }
                    textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                    if (textareaElem3 != null) {
                        textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                        textareaElem3.innerText = mytranslatedText;
                        textareaElem3.value = mytranslatedText;
                    }

                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(1) .translation-text");
                    console.debug("previewElem 6858:",previewElem)
                    if (previewElem != null) {
                        previewElem.innerText = mytranslatedText;
                    }
                }
                else {
                    //populate plural line if  already translated
                    console.debug("it is plural!!")
                    let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
                    textareaElem1 = f.querySelector("textarea#translation_" + plural_row + "_1");
                    // console.debug('newrow = not undefined!', row + "_1");
                    textareaElem1.innerText = mytranslatedText;
                    textareaElem1.value = mytranslatedText;
                    // the below code is for Russion plural handling
                    textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                    if (textareaElem2 != null) {
                        textareaElem2 = document.querySelector("textarea#translation_" + myRowId + "_2");
                        textareaElem2.innerText = mytranslatedText;
                        textareaElem2.value = mytranslatedText;
                    }
                    textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                    if (textareaElem3 != null) {
                        textareaElem3 = document.querySelector("textarea#translation_" + myRowId + "_3");
                        textareaElem3.innerText = mytranslatedText;
                        textareaElem3.value = mytranslatedText;
                    }

                    previewElem = document.querySelector("#preview-" + myRowId + " li:nth-of-type(2) .translation-text");
                    console.debug("previewElem 6886:",previewElem)
                    if (previewElem != null) {
                        previewElem.innerText = mytranslatedText;
                    }
                }
            }
        }
    }

    current = current.innerText;
    // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
    if (previousCurrent == "untranslated" || current == "TransFill" || current == "Waiting" || current == "untranslated") {
        select = document.querySelector(`#editor-${myRowId} div.editor-panel__right div.panel-content .meta`);
    }
    else {
        select = record.parentElement
    }

    select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content .meta`);
    //console.debug("now it should be set:",select)
    //select = next_editor.getElementsByClassName("meta");
    var status = select.querySelector("dd");
    status.innerText = "transFill";
    status.value = "transFill";

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
        translateButton.innerText = __("Translated");
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
    preview = getPreview(rowId)
    //preview = document.querySelector(`#preview-${rowId}`);
    //console.debug("my preview:",preview)
    //let prevcurrentClass = document.querySelector(`#preview-${myRowId}`);
    let prevcurrentClass = preview;
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
    if (preview != null && preview != 'undefined') {
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
        else {
            console.debug("checkset == null")
        }
    });
    //console.debug("counter:",checkboxCounter)
    if (checkboxCounter == 0) {
        if (recordsFound == true) {
            cuteAlert({
                type: "question",
                title: __("Bulk save to local"),
                message: __("There are no records selected, <br>are you sure you want to select all records?"),
                confirmText: "Confirm",
                cancelText: "Cancel",
                myWindow: currWindow
            }).then(async (e) => {
                if (e == ("confirm")) {
                    setmyCheckBox(e );
                    counter = saveToLocal();
                    cuteAlert({
                        type: "info",
                        title: __("Bulk save to local"),
                        message: __("All records are selected and processed: ") + RecCount,
                        confirmText: "Confirm",
                        cancelText: "Cancel",
                        myWindow: currWindow
                    })
                }
                else {
                    messageBox("info", __("Bulk save cancelled"));
                }

            })
        }
    } else {
        counter = saveToLocal();
        let errMessage = __("Records are processed: ")
        let infoMessage = __("Bulk save to local")
        cuteAlert({
            type: "info",
            title: infoMessage,
            message: errMessage + RecCount,
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
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    document.querySelectorAll("tr.preview").forEach((preview) => {
        if (is_pte) {
            checkset = preview.querySelector(".checkbox input");
        }
        else {
            checkset = preview.querySelector(".myCheckBox input");
        }
        if (typeof checkset != 'undefined') {
            if (checkset != null) {
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
    RecCount = counter
    return counter;
}

async function onCopySuggestionClicked(target,rowId) {
    chrome.storage.local.get(["postTranslationReplace", "convertToLower", "spellCheckIgnore", "ForceFormal"], async function (data) {
        var translatedText = ""
        var textareaElem
        locale = checkLocale();
        var formal = checkFormal(false);
        var editor =""
       
        let convertToLower = data.convertToLower
        let spellCheckIgnore = data.spellCheckIgnore
        // Tiny sleep to make sure the text is copied
        sleep(50)
        let myEditor = document.querySelector(`#${rowId}`)
        editor = myEditor.getElementsByClassName("editor-panel__left")
        textareaElem = editor[0].querySelector("textarea.foreign-text");
        editor = editor[0].querySelector(".panel-content")
        let original = editor.querySelector("span.original-raw").innerText;
        let text = editor.querySelector("textarea.foreign-text").value;
        setPostTranslationReplace(data.postTranslationReplace, formal)
        if (formal) {
            translatedText = await replaceVerbInTranslation(original, text, replaceVerb)
        }
        else {
            translatedText = text
        }
        translatedText = await  postProcessTranslation(original, translatedText, replaceVerb, translatedText, "checkEntry", convertToLower, spellCheckIgnore, locale);
        result = await check_start_end(translatedText, translatedText, 0, "", original, "", 0);
        translatedText = result.translatedText
        if (textareaElem != null && typeof textareaElem != "undefined") {
          textareaElem.innerText = translatedText;
          textareaElem.value = translatedText;
          textareaElem.textContent =translatedText
          requestAnimationFrame(() => {
            textareaElem.style.height = "auto";
            textareaElem.style.height = textareaElem.scrollHeight + "px";
           });
       }
    })
}