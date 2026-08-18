/**
 * This file includes all functions for translating with the Microsoft API
 * It depends on commonTranslate for additional translation functions
 */

var textareaElem = "";
var preview = "";
var translatedText = "";
var trntype = "";
async function microsoftTranslate(original, destlang, e, apikeyMicrosoft, preverbs, rowId, transtype, plural_line, locale, convertToLower, spellCheckIgnore,openAIGloss) {
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "microsoft");
    //console.debug("microsoftTranslate result of preProcessOriginal:", originalPreProcessed);
    //var myRe = |(\</?([a-zA-Z]+[1-6]?)(\s[^>]*)?(\s?/)?\>|)/gm;
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        trntype = "plain";
    }
    else {
        trntype = "html";
    }
    let result = await getTransMicrosoft(e, destlang, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line, locale, convertToLower, spellCheckIgnore,openAIGloss);
    return errorstate;
}

async function getTransMicrosoft(record, language, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line, locale, convertToLower, spellCheckIgnore, openAIGloss) {
    var row = "";
    var translatedText = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var responseObj = "";
    var textareaElem = "";
    var select = "";
    var textareaElem1 = "";
    var previewElem = "";
    var preview = "";
    var status = "";
    var error;
    var data;
    var message;
    var link;

    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;

    // GLOSSARY — per line
    const prunedGlossary = pruneGlossary(openAIGloss, originalPreProcessed, record) || "";
    const compactGloss = prunedGlossary.replace(/\n+/g, "|");

   // console.debug("prunedGlossary:", prunedGlossary, "compactGloss:", compactGloss);

    /*
     * Microsoft Dynamic Dictionary
     *
     * compactGloss:
     *
     * "item" -> "item", "deleted" -> "verwijderd"
     *
     * wordt intern:
     *
     * <mstrans:dictionary translation="item">item</mstrans:dictionary>
     * <mstrans:dictionary translation="verwijderd">deleted</mstrans:dictionary>
     */

    var microsoftText = originalPreProcessed;

    if (compactGloss) {

        var glossaryEntries = [];
        var glossaryMap = {};
        var glossaryRegex = /"([^"]*)"\s*->\s*"([^"]*)"/g;
        var match;

        /*
         * Extract all glossary entries.
         */
        while ((match = glossaryRegex.exec(compactGloss)) !== null) {

            var source = match[1];
            var translation = match[2];

            if (!source) {
                continue;
            }

            /*
             * If the same source occurs more than once,
             * keep the LAST occurrence.
             *
             * Example:
             *
             * "site" -> "site"
             * "site" -> "locatie"
             *
             * becomes:
             *
             * "site" -> "locatie"
             */
            if (!Object.prototype.hasOwnProperty.call(glossaryMap, source)) {
               glossaryMap[source] = translation;
            }
        }

        /*
         * Convert the map back to an array.
         */
        Object.keys(glossaryMap).forEach(function (source) {

            glossaryEntries.push({
                source: source,
                translation: glossaryMap[source]
            });

        });

        /*
         * Longest glossary terms first.
         *
         * This is important when both:
         *
         * "item"
         *
         * and:
         *
         * "media item"
         *
         * exist.
         */
        glossaryEntries.sort(function (a, b) {
            return b.source.length - a.source.length;
        });

        // console.debug("Microsoft glossary entries:", glossaryEntries);

        if (glossaryEntries.length > 0) {

            /*
             * Escape XML characters.
             */
            function escapeXml(value) {
                return String(value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;");
            }

            /*
             * Escape regular-expression characters.
             */
            function escapeRegex(value) {
                return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }

            /*
             * Create ONE regex containing all glossary terms.
             *
             * This is important:
             *
             * We must not perform one replacement and then
             * process the generated <mstrans:dictionary> tags
             * again.
             */
            var glossaryPattern = glossaryEntries
                .map(function (entry) {
                    return escapeRegex(entry.source);
                })
                .join("|");

            var glossaryMatchRegex = new RegExp(glossaryPattern, "g");

            /*
             * Replace a glossary match.
             */
            function replaceMicrosoftGlossary(match) {

                var entry = glossaryEntries.find(function (item) {
                    return item.source === match;
                });

                if (!entry) {
                    return match;
                }

                return '<mstrans:dictionary translation="' +
                    escapeXml(entry.translation) +
                    '">' +
                    escapeXml(entry.source) +
                    '</mstrans:dictionary>';
            }

            /*
             * HTML:
             *
             * Existing HTML tags are left untouched.
             * Only text between tags is processed.
             */
            if (trntype === "html") {

                var parts = microsoftText.split(/(<[^>]*>)/g);

                for (var i = 0; i < parts.length; i++) {

                    /*
                     * This part is an existing HTML tag.
                     * Do not process it.
                     */
                    if (/^<[^>]*>$/.test(parts[i])) {
                        continue;
                    }

                    /*
                     * This is normal text.
                     */
                    parts[i] = parts[i].replace(
                        glossaryMatchRegex,
                        replaceMicrosoftGlossary
                    );
                }

                microsoftText = parts.join("");
            }

            /*
             * Plain text:
             */
            else {

                microsoftText = microsoftText.replace(
                    glossaryMatchRegex,
                    replaceMicrosoftGlossary
                );
            }
        }
    }

    // console.debug("Microsoft text sent to API:", microsoftText);

    let requestBody = [
        {
            "text": microsoftText,
        }
    ];

    const myHeaders = new Headers({
        "Content-Type": "application/json; charset=UTF-8",
        "Ocp-Apim-Subscription-Key": apikeyMicrosoft,
    });

    myBody = JSON.stringify(requestBody);

    link = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&textType=" + trntype + "&from=en&to=" + language;

    const response = fetch(link, {
        method: 'POST',
        headers: myHeaders,
        body: myBody
    })
        .then(async response => {

            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();

            // check for error response
            if (!response.ok) {

                if (typeof data != "undefined") {
                    error = [data, error, response.status];
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    error = [data, message, response.status];
                }

                return Promise.reject(error);
            }
            else {

                // We do have a result so process it
                translatedText = data[0].translations[0].text;

               // console.debug("Microsoft translated text:", translatedText);

                translatedText = postProcessTranslation(
                    original,
                    translatedText,
                    replaceVerb,
                    originalPreProcessed,
                    "deepl",
                    convertToLower,
                    spellCheckIgnore,
                    locale
                );

                if (GLOBAL_GLOSSARY) {
                    translatedText = applyOpenAiGlossary(
                        translatedText,
                        GLOBAL_GLOSSARY
                    );
                }

                processTransl(
                    original,
                    translatedText,
                    language,
                    record,
                    rowId,
                    transtype,
                    plural_line,
                    locale,
                    convertToLower,
                    current
                );

                return Promise.resolve("OK");
            }
        })
        .catch(error => {

            if (error[2] == '401') {
                //alert("Error in translation received status 401, Credentials are not valid!");
                errorstate = "Error 401";
            }
            else if (error[2] == "400") {
                //alert("Error in translation received status 400, One of the request inputs is not valid!");
                errorstate = "Error 400";
            }
            else if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                //alert("Error 404 The requested resource could not be found")
                errorstate = "Error 404";
            }
            else {
                //alert("Error message: " + error);
                errorstate = "Error" + error;
            }
        });

    return response;
}