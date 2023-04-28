/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */


async function AITranslate(original, destlang, record, apikeyOpenAI, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree) {
    // First we have to preprocess the original to remove unwanted chars
    var originalPreProcessed = preProcessOriginal(original, preverbs, "deepl");
    let result = await getTransAI(original, destlang, record, apikeyOpenAI, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree);
    return errorstate;
}


async function getTransAI(original, language, record, apikeyOpenAI, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, DeeplFree) {
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
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    //console.debug("Original:", originalPreProcessed)
    language = language.toUpperCase();
    // 17-02-2023 PSS fixed issue #284 by removing the / at the end of "https:ap.deepl.com
  //  let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
   // if (language == "RO") {
   //     link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
   // }
  //  else {
  //      if (!formal) {
   //         link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
  //      }
  //      else {
  //          link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&tag_handling=xml&ignore_tags=x&formality=more&split_sentences=nonewlines"
   //     }
  //  }
    //console.debug("deepl link:",link)
    //  const url = 'https://api.openai.com/v1/edits';

    //   data = `{
    // "model": "text-davinci-edit-001",
    // "input": "This is my first attempt",
    // "instruction": "I want you to act as an English Translator. I want you to use the model "text-davinci-001". I want you to translate the text into standard Informal tone Dutch while respecting casing within every sentence. Provide a clear and accurate translation, considering context. If the English text does not start with a capital or the second position has no capital, then the translated result should also not start with a capital. I want you to transform all words within the text to lowercase, except for Brand names, the first word in a sentence, and if the word contains more than one uppercase letter. Example "Page Title Position" should be translated as "Pagina titelpositie". You should use placeholders like "%1$s", "%2$s", "%s", "%d" in their appropriate places in the translation. You should translate "your" as "je", "website" as "site", "Plugin" as "Plugin", "addon" as "add-on", "Addon" as "Add-on", "logboeken" as "logs", "foutenlogboek" as "foutlog" in every sentence I provide. I want you to transform "Add new" into "Nieuwe toevoegen", "please check" into "controleer", "Howdy" into "Hallo". I want you to transform sentences like this "Please test it." into "Test het." I want you to transform "Please download" into "Download". I want you to remove the following keywords "alstublieft" and "alsjeblieft" from the Dutch translation.",
    //  "temperature": 0.7,
    //  "top_p": 1
    //}`;

    //  const response = await fetch(url, {
    //      method: 'POST',
    //      headers: {
    //          'Content-Type': 'application/json',
    //          'Authorization': 'Bearer $OPENAI_API_KEY',
    //     },
    //     body: data,
    //  })

    //  const text = await response.text()

    //   console.debug("response:",response.status)
    //   if (response.status == "401") {
    //   alert("Error 401 Authorization failed. Please supply a valid auth_key parameter.")
    //    console.debug("errormessage",response.text)
    //      errorstate = "Error 401";
    //       console.log(text);
    //  }

    var url = "https://api.openai.com/v1/engines/text-davinci-edit-001/edits";

    var xhr = new XMLHttpRequest();
    var prompt = "I want you to translate from English to Dutch.";

    xhr.open("POST", url);

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer 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");

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 0) {
            console.log("status:",xhr.status);
            console.log("antwoord:", xhr.responseText);
            open_ai_response = xhr.responseText;
            console.debug("result:", open_ai_response.split(","))
            let jasonResult = JSON.parse(open_ai_response)
            console.debug("json:", jasonResult, jasonResult.choices[0].text)
            let text = jasonResult.choices[0].text
            console.debug("test:", text)
           // if (typeof text != "undefined") {
            translatedText = postProcessTranslation(original, text, replaceVerb, originalPreProcessed, "deepl", convertToLower);
            processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
          //  }
            return text;
        }
    };
    //console.debug('pre:', originalPreProcessed)
    var data = `{
     "input": "${originalPreProcessed}",
    "instruction": "Translate into Dutch",
    "temperature": 0.7
  }`;

    xhr.send(data);




   // const response = fetch(link)
   //     .then(async response => {
    //        const isJson = response.headers.get('content-type')?.includes('application/json');
    //        data = isJson && await response.json();
            //console.debug("Response:", data.message);
            // check for error response
     //       if (!response.ok) {
                // get error message from body or default to response status
                //console.debug("data:", data, response.status)
     //           if (typeof data != "undefined") {
                  //  error = [data, error, response.status];
     //           }
     //           else {
     //               let message = 'Noresponse';
     //               data = "noData";
      //              error = [data, message, response.status];
     //           }
      //          return Promise.reject(error);
       //     }
       //     else {
                //We do have a result so process it
                //console.debug('result:', data.translations[0].text);
      //          translatedText = data.translations[0].text;
               // console.debug("deepl original: ", original, "'", "translatedText: ", translatedText, "'")

          //      translatedText = await postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl", convertToLower);
                //console.debug("deepl original: ", original, "'", "translatedText: ", translatedText, "'")
           //      processTransl(original, translatedText, language, record, rowId, transtype, plural_line, locale, convertToLower, current);
           //    }
        //})
       // .catch(error => {
        //    if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
         //       errorstate = "Error 403";
         //   }
         //   else if (error[2] == '404') {
        //        alert("Error 404 The requested resource could not be found.")
          //      errorstate = "Error 404";
         //   }
         //   else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
          //      errorstate = "Error 456";
         //   }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
         //   else if (error == 'TypeError: Failed to fetch') {
          //      errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
         //  }
          //  else {
                //alert("Error message: " + error[1]);
          //      console.debug("Error:",error)
          //      errorstate = "Error " + error[1];
           // }
       // });
    //console.debug("endres:", response)
    //return text;
    //return response;
}