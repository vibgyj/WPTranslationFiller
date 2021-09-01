
/**
 * This file includes all functions for translating with the Microsoft API
 * It depends on commonTranslate for additional translation functions
 */

function microsoftTranslate(original, destlang, e, apikeyMicrosoft, preverbs, rowId, transtype, plural_line) {
    let originalPreProcessed = preProcessOriginal(original, preverbs, 'microsoft');
    //console.debug('microsoftTranslate result of preProcessOriginal:', originalPreProcessed);
    //var myRe = |(\</?([a-zA-Z]+[1-6]?)(\s[^>]*)?(\s?/)?\>|)/gm;
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "plain";
    }
    else {
        var trntype = "html";
    }

    translatedText = sendAPIRequestMicrosoft(e, destlang, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line);
}

function sendAPIRequestMicrosoft(record, language, apikeyMicrosoft, original, originalPreProcessed, rowId, trntype, transtype, plural_line) {

    var row = "";
    var translatedText = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        // 24-06-2021 PSS fixed an error in Chrome with type null message
        result = this.response;
        if (result != null) {
            //console.debug("Microsoft translation response:", this.response);
            restrans = this.response;
            let responseObj = this.response.error;
            //console.debug("Response error object:", responseObj);
            if (typeof responseObj != 'undefined') {
                myfault = responseObj.code;
            }
            else {
                var myfault = 0;
            };
        }
        else {
            myfault = 'noResponse';
        }
        //console.debug("Microsoft readyState:", this.readyState);
        if (this.readyState == 4 && myfault == 0) {
            //console.debug('Restrans:', restrans);
            translatedText = restrans[0].translations[0].text;
            // Currently for postProcessTranslation  "deepl" is set, this might need to be changed!!!
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl");
            //console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            if (transtype == "single") {
                // console.debug("sendAPIRequest single:");
                textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                current.innerText = 'transFill';
                current.value = 'transFill';
                let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                // console.debug("is pure single:", preview.innerText);
                preview.innerText = translatedText;
                validateEntry(language, textareaElem, "", "", rowId);
            }
            else {
                //console.debug("sendAPIRequest plural_line:", plural_line);
                // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != 'null' && current == 'current' && current == 'waiting') {
                    row = rowId.split('-')[0];
                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_0");
                    //textareaElem1.innerText = translatedText;
                    //textareaElem1.value = translatedText;
                }
                else {
                    let newrow = rowId.split('-')[1];
                    if (typeof newrow == 'undefined') {
                        // console.debug('newrow = undefined!');
                        // console.debug('plural_line:', plural_line);
                        let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                        let spanmissing = preview.querySelector(" span.missing");
                        if (spanmissing != null) {
                            spanmissing.remove();
                        }
                        if (transtype != "single") {
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            if (previewElem == null) {
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
                        }


                        if (plural_line == 1) {
                            //populate plural line if not already translated, so we can take original rowId!
                            // console.debug("singular updatet:", translatedText);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_0");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // Select the first li
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        if (plural_line == 2) {
                            //if (typeof translatedText != undefined) {
                            //console.debug("plural updatet:", translatedText);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // Select the second li
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) .translation-text');
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                    }
                    else {
                        //console.debug('newrow = not undefined!', newrow);
                        let row = rowId.split('-')[0];
                        if (plural_line == 1) {
                            //populate singular line if already translated
                            textareaElem1 = record.querySelector("textarea#translation_" + row + "_0");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            // console.debug("Existing record plural_line 1:", translatedText);
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        else {
                            //populate plural line if  already translated
                            textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) .translation-text');
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                    }
                }
                // The line below is necessary to update the save button on the left in the panel
                current.innerText = 'transFill';
                current.value = 'transFill';
                validateEntry(language, textareaElem1, "", "", rowId);
                //console.debug("Validate entry textareaElem1")
            }
        }

        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {

            if (this.readyState == 4 && myfault == 400000) {
                alert("Error in translation received status 400000, One of the request inputs is not valid.\n\nClick on OK until all records are processed!!!");
            }

            else if (this.readyState == 4 && myfault == 400036) {
                alert("Error in translation received status 400036, The target language is not valid.\n\nClick on OK until all records are processed!!!");
            }
            else if (this.readyState == 4 && myfault == 400074) {
                alert("Error in translation received status 400074, The body of the request is not valid JSON.\n\nClick on OK until all records are processed!!!");
            }
            else if (this.readyState == 4 && myfault == 403000) {
                alert("Error in translation received status 403, authorisation refused.\n\nClick on OK until all records are processed!!!");
            }
            else if (this.readyState = 4 && myfault == 401000) {
                alert("Error in translation received status 401000, The request is not authorized because credentials are missing or invalid.\n\nClick on OK until all records are processed!!!");
            }
        }
    };


    //let xhttp = new XMLHttpRequest();
    let requestBody = [
        {
            'text': originalPreProcessed
        }
    ];

    //console.debug("apikey:", apikeyMicrosoft, "textType:",transtype);
    language = language.toUpperCase();
    translen = originalPreProcessed.length;
    xhttp.open('POST', "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&textType=" + trntype + "&from=en&to=" + language);
    xhttp.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhttp.setRequestHeader('Ocp-Apim-Subscription-Key', apikeyMicrosoft);
    //xhttp.setRequestHeader('Content-Length', translen);
    xhttp.responseType = 'json';
    xhttp.send(JSON.stringify(requestBody));
}

