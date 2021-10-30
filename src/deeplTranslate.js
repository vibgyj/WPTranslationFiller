/**
 * This file includes all functions for translating with the deepL API
 * It depends on commonTranslate for additional translation functions
 */

function deepLTranslate(original, destlang, record, apikeyDeepl, preverbs, rowId, transtype, plural_line,formal,locale) {
    //console.debug("deepl row: ", rowId, transtype, plural_line, original);
    let originalPreProcessed = preProcessOriginal(original, preverbs, 'deepl');
    //var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    //var myArray = myRe.exec(originalPreProcessed);
    //if (myArray == null) {
    //   var trntype = "text";
    // }
    //else {
    //    var trntype = "html";
    // }
    sendAPIRequestDeepl(original, destlang, record, apikeyDeepl, originalPreProcessed, rowId, transtype, plural_line,formal,locale);
}

function sendAPIRequestDeepl(original, language, record, apikeyDeepl, originalPreProcessed, rowId, transtype, plural_line,formal,locale) {
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
        responseObj = this.response;

        // console.debug("Deepl this ready state:", this.readyState, "this status:",this.status, "Response:",this.response);
        if (this.readyState == 4 && this.status != 400 ) {
            //responseObj = xhttp.response;
            responseObj = this.response;

            translatedText = responseObj.translations[0].text;
            //console.debug("deepl row: ", rowId, transtype, plural_line, original);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl");
            //console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            if (transtype == "single") {
                textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                // PSS 29-03-2021 Added populating the value of the property to retranslate            
                textareaElem.value = translatedText;
                //PSS 25-03-2021 Fixed problem with description box issue #13
                textareaElem.style.height = 'auto';
                textareaElem.style.height = textareaElem.scrollHeight + 'px';
                current.innerText = 'transFill';
                current.value = 'transFill';
                let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                preview.innerText = translatedText;
                validateEntry(language, textareaElem, "", "", rowId,locale);

                // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
                select = document.querySelector(`#editor-${rowId} div.editor-panel__right div.panel-content`);
                //select = next_editor.getElementsByClassName("meta");
                var status = select.querySelector('dt').nextElementSibling;
                //console.debug("bulksave status1:", select, status, rowId);
                status.innerText = 'transFill';
            }
            else {
                //console.debug("DeeplTranslate plural_line:", plural_line);
                // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != 'null' && current == 'current' && current == 'waiting') {
                    row = rowId.split('-')[0];
                    //console.debug('rowId plural:', row)
                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_0");
                    //textareaElem1.innerText = translatedText;
                    //textareaElem1.value = translatedText;
                    //console.debug('existing plural text:', translatedText);
                   }
                else {
                    //console.debug("Deepl plural_line in plural:", plural_line, rowId,translatedText);
                    //console.debug("deepl row: ", rowId, transtype, plural_line, original);
                    //check_span_missing(rowId, plural_line);
                    let newrow = rowId.split('-')[1];
                    if (typeof newrow == 'undefined') {
                        //console.debug('newrow = undefined!');
                        //console.debug('plural_line:', plural_line,newrow);
                        //let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                       // let spanmissing = preview.querySelector(" span.missing");
                       // if (spanmissing != null) {
                           // spanmissing.remove();
                            
                        //}
                        if (transtype != "single") {
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            //console.debug('not single:',rowId,plural_line)
                            
                            if (previewElem == null) {
                                check_span_missing(rowId, plural_line);
                               // check_span_missing(rowId, plural_line);
                                //ul = document.createElement('ul');
                               // preview.appendChild(ul);
                               // var li1 = document.createElement('li');
                               // li1.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                               // ul.appendChild(li1);
                               // var small = document.createElement('small');
                               // li1.appendChild(small);
                              //  small.appendChild(document.createTextNode("Singular:"));
                               // var br = document.createElement('br');
                              //  li1.appendChild(br);
                              //  var myspan1 = document.createElement('span');
                              //  myspan1.className = "translation-text";
                              //  li1.appendChild(myspan1);
                              //  myspan1.appendChild(document.createTextNode("empty"));
                                // Also create the second li
                              //  var li2 = document.createElement('li');
                              //  ul.appendChild(li2);
                               // var small = document.createElement('small');
                               // li2.appendChild(small);
                               // small.appendChild(document.createTextNode("Plural:"));
                               // var br = document.createElement('br');
                               // li2.appendChild(br);
                               // var myspan2 = document.createElement('span');
                               // myspan2.className = "translation-text";
                               // li2.appendChild(myspan2);
                               // myspan2.appendChild(document.createTextNode("empty"));
                            }
                        }

                        if (plural_line == 1) {
                            //populate plural line if not already translated, so we can take original rowId!
                            //console.debug("singular updatet:", translatedText);
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
                            //console.debug("deepl row: ", rowId, transtype, plural_line);
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
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        else {
                            //populate plural line if  already translated
                            textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
                            // console.debug('newrow = not undefined!', row + "_1");
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
               
                validateEntry(language, textareaElem1, "", "", rowId,locale);
            }
            //14-09-2021 PSS changed the class to meet GlotDict behavior
            //var currentClass = document.querySelector(`#editor-${rowId}`);
           // var prevcurrentClass = document.querySelector(`#preview-${rowId}`);
            //currentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
           // currentClass.classList.add("untranslated", "priority-normal", "no-warnings", "has-translations");
            //prevcurrentClass.classList.remove("untranslated", "no-translations", "priority-normal", "no-warnings");
            //prevcurrentClass.classList.add("untranslated", "priority-normal", "no-warnings", "has-translations");
            //console.debug("currentClass:", currentClass);
            //console.debug("currentClass:", prevcurrentClass);
            
        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            if (this.response != null && this.response.message == "\"Value for 'target_lang' not supported.\"") {              
                alert("Error in translation received status 400 with readyState == 3 \r\nLanguage: " + language + " not supported! \r\nClick on OK until all lines are processed");
            }
            else if (this.readyState == 2 && this.status == 403) {
                alert("Error in translation received status 403, authorisation refused.\n\nClick on OK until all records are processed!!!");
            }
            else {
                // 18-06-2021 PSS fixed an alert at the wrong time issue #83
                // console.debug("Status received:", this.status,this.readyState);
                // alert("Error in translation receive code:", this.status);
            }
        }
    };


    //let xhttp = new XMLHttpRequest();
    language = language.toUpperCase();
    //console.debug("Target_lang:", language);
    // 13-10-2021 PSS fix for not translating issue #151
    // 15-10-2021 PSS enhencement for Deepl to go into formal issue #152
    if (language == "RO") {
        xhttp.open('POST', "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&split_sentences=1&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines");
    }
    else {
        if (!formal) {
           // console.debug("not formal");
            xhttp.open('POST', "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&split_sentences=1&tag_handling=xml&ignore_tags=x&formality=less&split_sentences=nonewlines");
        }
        else {
            //console.debug("formal");
            xhttp.open('POST', "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&split_sentences=1&tag_handling=xml&ignore_tags=x&formality=more&split_sentences=nonewlines");

        }
    }
    xhttp.responseType = 'json';
    xhttp.send();

    xhttp.onload = function () {
        let responseObj = xhttp.response;
    };

}