/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor,counter) {
    // First we have to preprocess the original to remove unwanted chars
    var originalPreProcessed = preProcessOriginal(original, preverbs, "OpenAI");
    //errorstate = "NOK"
    var result = await getTransAI(original, destlang, record, apikeyOpenAI, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter);
    //console.debug("OpenAI errorstate:",errorstate,result)
    return errorstate;
}

async function AIreview(original, destlang, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor,translatedText,preview) {
    // First we have to preprocess the original to remove unwanted chars
    //var originalPreProcessed = preProcessOriginal(original, preverbs, "OpenAI");
    var originalPreProcessed = original;
    //errorstate = "NOK"
    if (apikeyOpenAI != "") {
        var result = await reviewTransAI(original, destlang, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, translatedText, preview);
    }
    else {

        errorstate = "No apikey provided!"
    }
        //console.debug("OpenAI errorstate:",errorstate,result)
    return errorstate;
}

function getTransAI(original, language, record, apikeyOpenAI, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter) {
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
    var link;
    var timeout = 1000;
    var lang = window.navigator.language;
    //console.debug("taal:",lang)
    //console.debug("origpre:", originalPreProcessed)
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    language = language.toUpperCase();
   
    if (counter == 1 || typeof counter == 'undefined') {
       myprompt = OpenAIPrompt +'\n';
    }
    else {
        myprompt = "Translate into " + lang + "according previously given instructions: ";
       //myprompt = "Vertaal naar Nederlands volgens eerder opgegeven instructies: ";
    }
    
   // var prompt = 'I want you to translate from English to strickt Informal tone Dutch while respecting casing within every sentence. I want you to provide a clear and accurate translation without suggestions. I do not want you to add hyphen. I want you to use HTML in their appropiate places. I do not want you to use completion in HTML. If the English text does not start with a capital or the second position has no capital, then the translated result should also not start with a capital. I want you to transform all words within the text to lowercase, except for Brand names, start of the sentence and all other sentences, and if the word contains more then one uppercase letter. Example "Page Title Position" should be translated as "Pagina titelpositie". You should use placeholders like "%1$s", "%2$s", "%s", "%d" in their appropriate places in the translation. You should translate "your" as "je", "website" as "site", "Plugin" as "Plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. I want you to transform "Add new" into "Nieuwe toevoegen", "please check" into "controleer", "Howdy" into "Hallo". I want you to transform sentences like this "Please test it." into "Test het." I want you to transform "Please download" into "Download". I want you to remove the following keywords "alstublieft" and "alsjeblieft" from the Dutch translation.'
   // prompt = 'Act as a Dutch language translator. I want you to transform all words within the sentence to lowercase also for English words except brandnames like "Google". I want you to use placeholders like "%1$s", "%2$s", "%3$s", "%4$s", "%5$s", "%s", "%d", "xx", "<x>?</>" in their appropriate places in the translation. Do not add hyphens into Dutch translation. Remove the words "Please", "Sorry" from the English text. I will provide sentences that needs to be translated into Dutch which can contain HTML. You should keep the HTML in their appropriate places. Your role is to provide a clear and concise translation that accurately conveys the meaning of the original text, tailored to the intended Dutch speaking audience and spelling corrector. Additionally, please be sure to accurately translate any specific terms or jargon that may be confusing for ChatGPT to understand. Finally, please evaluate the quality of the translation based on its accuracy, readability, and relevance of the original text. I do not want you to add Evaluation of the text. Do not justify your answers. Do not report Accuracy. Do not report conveys. I do not want you to translate the following words, "Toggle", "toggle". You should translate "your" as "je", "website" as "site", "Website" as "Site", "Select" as "Selecteer", "Plugin" as "Plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. Do not use the following words "alstublieft" and "alsjeblieft" in the translation.'
    //var prompt = 'I want you to translate from English to Assertive tone Dutch while respecting casing within every sentence. I want you to provide a clear and accurate translation without suggestions. I do not want you to use hyphens in the text. I want you to use HTML in their appropiate places. I do not want you to use completion in HTML. If the English text does not start with a capital or the second position has no capital, then the translated result should also not start with a capital. I want you to transform all words within the translation after the start of sentence to lowercase. You should use placeholders like "%1$s", "%2$s", "%s", "%d" in their appropriate places in the translation. You should translate "your" as "je", "website" as "site", "Plugin" as "plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. I want you to transform "Add new" into "Nieuwe toevoegen", "please check" into "controleer", "Howdy" into "Hallo". I want you to transform sentences like this "Please test it." into "Test het." I want you to transform "Please download" into "Download". I want you to remove the following keywords "alstublieft" and "alsjeblieft" from the Dutch translation.'
    //var prompt = encodeURIComponent(prompt);
    console.debug("counter:", counter, myprompt)
    
    originalPreProcessed = '"' + originalPreProcessed + '"';
    console.debug("pre:", originalPreProcessed);
    var message = [{ 'role': 'system', 'content': myprompt }, { 'role': 'user', 'content': originalPreProcessed }];
    let mymodel = 'gpt-3.5-turbo-16k';
    var data1 = {
        messages : message,
        model: mymodel,
        max_tokens: 1500,
        n:1,
        temperature: 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
    }

    var mydata = {
        "model": "text-davinci-003",
        "prompt": "${prompt}",
        "temperature": 0,
        "max_tokens": 1000,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    var newdata = {
        "model": "text-davinci-edit-001",
        "input": originalPreProcessed,
        "instruction": prompt,
        "temperature": 0,
        "top_p": 1
    }
    var data = {
     "model" : "text-davinci-003",
     "prompt" : "Translate into Dutch\n\n${originalPreProcessed}",
    "temperature": 0,
    "top_p": 1
    }
    
   // var url = "https://api.openai.com/v1/engines/text-davinci-edit-001/edits";
   // var link = "https://api.openai.com/v1/chat/completions";
    var link = "https://api.openai.com/v1/chat/completions";
    //var url = "https://api.openai.com/v1/edits";

    //console.debug("link:",link)
    const response = fetch(link, {
        body: JSON.stringify(data1),
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: "Bearer " + apikeyOpenAI,
        },
    })
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("Response:", data);
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status
                //console.debug("data:", data, response.status)
                if (typeof data != "undefined") {
                    errorstate = "NOK"
                    error = [data, error, response.status,errorstate];
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    errorstate="NOK"
                    error = [data, message, response.status,errorstate];
                }
                return Promise.reject(error);
            }
            else {
                errorstate = "OK";
                //We do have a result so process it
               // console.debug('result:', data);
                open_ai_response = data.choices[0];
                if (typeof open_ai_response.message.content != 'undefined') {
                    let text = open_ai_response.message.content;
                    console.debug("text:", text)
                    //text = text.trim('\n');
                    translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                    processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                    return Promise.resolve(errorstate)
                }
                else {
                    text = "No suggestions"
                    translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                    processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                    errorstate = "NOK";
                }
                return Promise.resolve(errorstate)
            }
        })
        .catch(error => {
            if (error[2] == "400") {
                errorstate = "Error 400";
                if (editor) {
                    messageBox("error", "Error 400:" + error[0].error.message)
                }
            }
            else if (error[2] == "401") {
                errorstate = "Error 401";
                if (editor) {
                    messageBox("error", "Error 401 Authorization failed.Please supply a valid auth_key parameter.")
                }
            }
            else if (error[2] == '404') {
                alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error[2] == '429') {
                if (editor) {
                    messageBox("error", "The model: " + mymodel + " is currently overloaded with other requests")
                }
                else {
                    text = "No suggestions due to overload OpenAI!!"
                    translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                    processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                    errorstate = "OK"
                }
                errorstate = "Error 429" + error[0].error.message;
            }
            else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456";
            }
            else {
                if (editor) {
                    messageBox("error", "Some uncatched error has been found." + error[0])
                }
                if (typeof error != "undefined") {
                    errorstate = error[0].error.message
                }
                else {
                    errorstate = "OK"
                }
            }
            
           // console.debug("return of errorstate:", errorstate)
            return errorstate;
        }).then(err => {
            //console.debug("in then:", err);
            if (typeof err != "undefined") {
                let errorstate = err; return errorstate
            }
            else {
                console.debug("found err:",err)
            }

        })
    
}

async function reviewTransAI(original, language, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor,translatedText,preview) {
    var row = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    var responseObj = "";
    var textareaElem = "";
    var select = "";
    var textareaElem1 = "";
    var previewElem = "";
    //var preview = "";
    var status = "";
    var error;
    var data;
    var link;
    var timeout = 1000;
    //console.debug("origpre:", originalPreProcessed)
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    language = language.toUpperCase();
    // $openai_query.= 'For the english text  "'.$original_singular. '", is "'.$translation. '" a correct translation in '.$gp_locale -> english_name. '?';
    //console.debug("Review prompt:", reviewPrompt)
    var prompt = reviewPrompt.replace('placeholder_original', original)
    prompt = prompt.replace('placeholder_translated',translatedText)
    //var prompt = 'I want you to act as a translation reviewer for the provided English text: "' + original + '", translated into Dutch text: "' + translatedText + '". Please check if all words are completely translated, review the interpunctuation to match the English text, and ensure that placeholders are accurately preserved. Please maintain HTML in their respective places. Please answer with "Yes" or "No".'
    //  var prompt = 'I want you to act as translation improver. I do not want you to explain improvements. Give the answer in English. For the English text  "' + original + '", is "' + translatedText + '\" the correct translation in "Dutch"?';
    // console.debug("prompt:", prompt)
    //var prompt = encodeURIComponent(prompt);
    originalPreProcessed = "'" + originalPreProcessed + "'" + "\n"
    var message = [{ 'role': 'user', 'content': prompt }];
    let mymodel = "gpt-3.5-turbo"
    var data1 = {
        messages: message,
        model: mymodel,
        max_tokens: 1000,
        n: 1,
        temperature: 0,
        frequency_penalty: 0,
        presence_penalty: 0,
    }

    var mydata = {
        "model": "text-davinci-003",
        "prompt": "${prompt}",
        "temperature": 0,
        "max_tokens": 1000,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    var newdata = {
        "model": "text-davinci-edit-001",
        "input": originalPreProcessed,
        "instruction": prompt,
        "temperature": 0,
        "top_p": 1
    }
    var data = {
        "model": "text-davinci-003",
        "prompt": "Translate into Dutch\n\n${originalPreProcessed}",
        "temperature": 0,
        "top_p": 1
    }

    // var url = "https://api.openai.com/v1/engines/text-davinci-edit-001/edits";
    // var link = "https://api.openai.com/v1/chat/completions";
    var link = "https://api.openai.com/v1/chat/completions";
    //var url = "https://api.openai.com/v1/edits";

    //console.debug("link:",link)
    const response = fetch(link, {
        body: JSON.stringify(data1),
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: "Bearer " + apikeyOpenAI,
        },
    })
        .then(async response => {
            const isJson = response.headers.get('content-type')?.includes('application/json');
            data = isJson && await response.json();
            //console.debug("Response:", data);
            // check for error response
            if (!response.ok) {
                // get error message from body or default to response status
                console.debug("data:", data, response.status)
                if (typeof data != "undefined") {
                    errorstate = "NOK"
                    error = [data, error, response.status, errorstate];
                }
                else {
                    let message = 'Noresponse';
                    data = "noData";
                    errorstate = "NOK"
                    error = [data, message, response.status, errorstate];
                }
                return Promise.reject(error);
            }
            else {
                errorstate = "OK";
                //We do have a result so process it
                //console.debug('result:', data);
                open_ai_response = data.choices[0];
                if (typeof open_ai_response.message.content != 'undefined') {
                    let text = open_ai_response.message.content;
                    //console.debug("text:", text,original,translatedText);
                    if (text.indexOf("Yes") != -1) {
                        //preview.style.background = 'green';
                        preview.innerHTML = '\u{2705}' + " " + preview.innerHTML
                    }
                    else {
                        preview.innerHTML = '\u{26A0}' + " "+ preview.innerHTML
                        //review.style.background = 'red';
                    }
                    //preview.style.color = 'white';

                    //text = text.trim('\n');
                   // translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                    //processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                    return Promise.resolve(errorstate)
                }
                else {
                    text = "No text received"
                    console.debug("No text received!")
                    //translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                   // processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                    errorstate = "NOK";
                }
                return Promise.resolve(errorstate)
            }
        })
        .catch(error => {
            //console.debug("error3:",error[0])
            if (error[2] == "400") {
                errorstate = "Error 400";
                if (editor) {
                    messageBox("error", "Error 400:" + error[0].error.message)
                }
            }
            else if (error[2] == "401") {
                errorstate = "Error 401";
                if (editor) {
                    messageBox("error", "Error 401 Authorization failed.Please supply a valid auth_key parameter.")
                }
            }
            else if (error[2] == '404') {
                alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error[2] == '429') {
                if (editor) {
                    messageBox("error", "The model: " + mymodel + " is currently overloaded with other requests")
                }
                errorstate = "Error 429" + error[0].error.message;
            }
            else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456";
            }
            else {
                if (editor) {
                    messageBox("error", "Some uncatched error has been found." + error[0])
                }
                if (error != "undefined") {
                    if (error[0] != 'undefined') {
                        errorstate = error[0].error.message

                    }
                    else {
                        console.debug("error[0] is undefined! ", error)
                        errorstate = "NOK";
                    }
                }
                else {
                    errorstate = "OK";
                }
            }

            // console.debug("return of errorstate:", errorstate)
            return errorstate;
        }).then(err => {
            //console.debug("in then:", err);
            if (typeof err != "undefined") {
                let errorstate = err; return errorstate
            }
            else {
                console.debug("found err:", err)
            }

        })

}

async function startreviewOpenAI(apikeyOpenAI,destlang,OpenAIPrompt,reviewPrompt) {
    
    var replaced = false;
    var row;
    var newrowId;
    var myrow;
    var transtype;
    var toTranslate;
    var found_verbs;
    const countfound = 0
    var myresult;
    var timeout = 700;
    var replaced = false;
    var translatedText = "";
    var repl_verb = [];
    var end_table;
    var countrows = 0;
    var result;
    var countreplaced = 0;
    var checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
    var progressbar;
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
    toastbox("info", "OpenAI review is started wait for the result!!", "8000", "Review");
    var myheader = document.querySelector('header');
    
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;

    myheader.insertAdjacentHTML('beforebegin', template);
    // We need to know the amount of rows to show the finished message at the end of the process
    var table = document.getElementById("translations");
    var tr = table.rows;
    var tbodyRowCount = table.tBodies[0].rows.length;
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        setTimeout(async function () {
        end_table = false;
        found_verbs = [];
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
        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header span.panel-header__bubble`);
        // We only need to process the actual lines not the untranslated
        if (currec.innerText == "transFill" || currec.innerText == "current" || currec.innerText == "waiting") {
            countrows++;
            //  setTimeout(async function (timeout, errorstate, countrows) {
            let spanmissing = document.querySelector(`#preview-${row} span.missing`);
            // If the page does not contain translations, we do not need to handle them
            //console.debug("spanmissing:",spanmissing)
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

                    if (transtype == "single") {
                        // Fetch the translations
                        let element = e.querySelector(".source-details__comment");
                        let textareaElem = e.querySelector("textarea.foreign-text");
                        translatedText = textareaElem.innerHTML;
                        // Enhencement issue #123
                       // previewNewText = textareaElem.innerText;
                        var preview = document.querySelector("#preview-" + row + " td.translation");
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        plural_line=""
                        if (apikeyOpenAI != "") {
                            if (translatedText != "") {
                                result = await AIreview(original, destlang, e, apikeyOpenAI, OpenAIPrompt,reviewPrompt, replacePreVerb, row, transtype, plural_line, false, locale, false, true, translatedText, preview);
                                //console.debug("Result:", result)
                            }
                        }  
                        errorstate = result;
                    }
                    else {
                        let previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(1) span.translation-text");
                        previewNewText = previewElem.innerText;
                        translatedText = previewElem.innerText;
                        //console.debug("plural1 found:",previewElem,translatedText);
                        currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                       
                        // plural line 2
                        previewElem = document.querySelector("#preview-" + row + " .translation.foreign-text li:nth-of-type(2) span.translation-text");
                        //console.debug("plural2:", previewNewText, translatedText);  
                    }
                }
            }
            // tbodyRowCount includes also the editor rows, so we need to devide by "2"
            // console.debug("rows:", countrows, tbodyRowCount, tbodyRowCount / 2)
            if (countrows == (tbodyRowCount / 2) - 1) {
                // Translation replacement completed
                checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
                checkButton.classList.remove("started");
                checkButton.className += " translated";
                checkButton.innerText = "Checked";
                checkButton.className += " ready";
                progressbar = document.querySelector(".indeterminate-progress-bar");
                progressbar.style.display = "none";
                //close_toast();
                messageBox("info", "Check OpenAI review done ");
            }
        }
        else {
            //  console.debug("We have no more records")
            messageBox("info", "Check review done ");
            checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
            checkButton.classList.remove("started");
            checkButton.className += " translated";
            checkButton.innerText = "Checked";
            checkButton.className += " ready";
            //break;

            }
        }, timeout);
        timeout += 700;
    }
    return errorstate
}
