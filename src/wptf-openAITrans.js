/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */

async function AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor) {
    // First we have to preprocess the original to remove unwanted chars
    var originalPreProcessed = preProcessOriginal(original, preverbs, "OpenAI");
    //errorstate = "NOK"
    var result = await getTransAI(original, destlang, record, apikeyOpenAI, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor);
    //console.debug("OpenAI errorstate:",errorstate,result)
    return errorstate;
}


function getTransAI(original, language, record, apikeyOpenAI, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor) {
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
    console.debug("origpre:", originalPreProcessed)
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    language = language.toUpperCase();
    
    var prompt = OpenAIPrompt;
   
   // var prompt = 'I want you to translate from English to strickt Informal tone Dutch while respecting casing within every sentence. I want you to provide a clear and accurate translation without suggestions. I do not want you to add hyphen. I want you to use HTML in their appropiate places. I do not want you to use completion in HTML. If the English text does not start with a capital or the second position has no capital, then the translated result should also not start with a capital. I want you to transform all words within the text to lowercase, except for Brand names, start of the sentence and all other sentences, and if the word contains more then one uppercase letter. Example "Page Title Position" should be translated as "Pagina titelpositie". You should use placeholders like "%1$s", "%2$s", "%s", "%d" in their appropriate places in the translation. You should translate "your" as "je", "website" as "site", "Plugin" as "Plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. I want you to transform "Add new" into "Nieuwe toevoegen", "please check" into "controleer", "Howdy" into "Hallo". I want you to transform sentences like this "Please test it." into "Test het." I want you to transform "Please download" into "Download". I want you to remove the following keywords "alstublieft" and "alsjeblieft" from the Dutch translation.'
    //var prompt = 'Act as a Dutch language translator. I want you to transform all words within the sentence to lowercase also for English words except brandnames like "Google". I want you to use placeholders like "%1$s", "%2$s", "%3$s", "%4$s", "%5$s", "%s", "%d", "xx", "<x>?</>" in their appropriate places in the translation. Do not add hyphens into Dutch translation. Remove the words "Please", "Sorry" from the English text. I will provide sentences that needs to be translated into Dutch which can contain HTML. You should keep the HTML in their appropriate places. Your role is to provide a clear and concise translation that accurately conveys the meaning of the original text, tailored to the intended Dutch speaking audience and spelling corrector. Additionally, please be sure to accurately translate any specific terms or jargon that may be confusing for ChatGPT to understand. Finally, please evaluate the quality of the translation based on its accuracy, readability, and relevance of the original text. I do not want you to add Evaluation of the text. Do not justify your answers. Do not report Accuracy. Do not report conveys. I do not want you to translate the following words, "Toggle", "toggle". You should translate "your" as "je", "website" as "site", "Website" as "Site", "Select" as "Selecteer", "Plugin" as "Plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. Do not use the following words "alstublieft" and "alsjeblieft" in the translation.'
    //var prompt = 'I want you to translate from English to Assertive tone Dutch while respecting casing within every sentence. I want you to provide a clear and accurate translation without suggestions. I do not want you to use hyphens in the text. I want you to use HTML in their appropiate places. I do not want you to use completion in HTML. If the English text does not start with a capital or the second position has no capital, then the translated result should also not start with a capital. I want you to transform all words within the translation after the start of sentence to lowercase. You should use placeholders like "%1$s", "%2$s", "%s", "%d" in their appropriate places in the translation. You should translate "your" as "je", "website" as "site", "Plugin" as "plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. I want you to transform "Add new" into "Nieuwe toevoegen", "please check" into "controleer", "Howdy" into "Hallo". I want you to transform sentences like this "Please test it." into "Test het." I want you to transform "Please download" into "Download". I want you to remove the following keywords "alstublieft" and "alsjeblieft" from the Dutch translation.'
    //var prompt = encodeURIComponent(prompt);
    originalPreProcessed = "'" + originalPreProcessed + "'" + "\n"
    var message = [{ 'role': 'system', 'content': prompt }, { 'role': 'assistant', 'content': originalPreProcessed }];
    let mymodel = "gpt-3.5-turbo"
    var data1 = {
        messages : message,
        model: mymodel,
        max_tokens: 1000,
        n:1,
        temperature: 0.2,
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
                console.debug("data:", data, response.status)
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
                //console.debug('result:', data);
                open_ai_response = data.choices[0];
                if (typeof open_ai_response.message.content != 'undefined') {
                    let text = open_ai_response.message.content;
                    //console.debug("text:", text)
                    //text = text.trim('\n');
                    translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                    processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
                    return Promise.resolve(errorstate)
                }
                else {
                    text = "No text received"
                    translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "OpenAI", convertToLower);
                    processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
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
                    messageBox("error", "The model: " + mymodel +" is currently overloaded with other requests")
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