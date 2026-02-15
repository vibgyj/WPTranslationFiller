/**
 * This file includes all functions for translating with the deepL API and uses a promise
 * It depends on commonTranslate for additional translation functions
 */
// Call this at the start of your translation batch loop
function startTranslationBatch() {
  localStorage.setItem('openai_prompt_sent', 'false');
}

// Call this at the end of your translation batch loop or when needed
function endTranslationBatch() {
  localStorage.removeItem('openai_prompt_sent');
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function NLPCloudTranslate(original, destlang, record, apikeyNLP, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, MistralSelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    var timeout = 50;
    errorstate = "OK";
    
    // Preprocess original
    //console.debug("preprocess with:",preverbs)
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "NLPCLoud");
    //console.debug("NLPCloud originalPreProcessed:", originalPreProcessed)
    // Wait the timeout delay if needed
   // await delay(timeout);
    //console.debug("select:",MistralSelect)
    // Await the translation call
    var result = await getNLPCloudTrans(original, destlang, record, apikeyNLP, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, MistralSelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss);
    
    // You can handle errorstate or result here if needed
    return result;
}


async function getNLPCloudTrans(
    original, language, record, apikeyNLP, OpenAIPrompt,
    originalPreProcessed, rowId, transtype, plural_line, formal,
    locale, convertToLower, editor, counter, MistralSelect,
    OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss
) {
    
    if (toBoolean(editor)) {
        showTranslationSpinner(__("Fetching translation…"));
    }
    var show_debug = true
    var text = ""
    var targetLang = "";
    var myTtranslatedText = "";
    let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    let prevstate = current ? current.innerText : "";

    let destlang = language;
    language = language.toUpperCase();
    var messages;

   // let tempPrompt = OpenAIPrompt + '\n'
    let myprompt = "";


    if (destlang === 'nl') {
        targetLang = "nld_Latn";
    }
    else if (destlang === 'de') {
        targetLang = "deu_Latn";
    }
    else if (destlang === 'fr') {
        targetLang = "fra_Latn";
    }
    else if (destlang === 'uk') {
        targetLang = "ukr_Cyrl";
    }
    else if (destlang === 'es') {
        targetLang = "spa_Latn";
    }
    else if (destlang === 'it') {
        targetLang = "ita_Latn";
    }
    else if (destlang === 'pt') {
        targetLang = "por_Latn";
    }
    else if (destlang === 'ru') {
        targetLang = "rus_Cyrl";
    }
    else {
       // myprompt = myprompt.replaceAll("{{toLanguage}}", destlang);
    }

  if (!originalPreProcessed) {
    originalPreProcessed = "No result of {originalPreprocessed} for original it was empty!";
  }
  
 // let max_Tokens = estimateMaxTokens(originalPreProcessed);
  //let prompt_tokens = estimateMaxTokens(myprompt);
   // max_Tokens = maxTokens + prompt_tokens

 // messages = [
 //   { role: 'system', content: myprompt },
 //   { role: 'user', content: `translate this: ${originalPreProcessed}` }
 // ];
    
    
    const source = "eng_Latn";
    let dataNew = {};
    // the below set needs to be improved 
    dataNew = {
     // messages,
     // max_tokens: max_Tokens,
      n: 1,
      temperature: OpenAItemp,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: Top_p,
      top_k: Top_k,
      apiKey: apikeyNLP,
      text: originalPreProcessed,
      target: targetLang

    };
   
    try {
        const start = Date.now()
        //console.debug("We start call at :",start)
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "NLPCloud", data: dataNew }, // send only the data
                (res) => resolve(res)
            );
       });
        //console.debug("NLPCloud proxy raw result:", result)
       if (!result) {
          // console.debug("NLPCLoud proxy returned undefined");
         hideTranslationSpinner();
        return "NOK";
    }

       if (result.error) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
           if (show_debug) console.debug(`[${new Date().toISOString()}] "NLPCLoud proxy error:" ${duration}s`, result.error);
            // Example of result.error: "Request failed (401): <some text>"
           const match = result.error.match(/Request failed \((\d+)\)/);
          // console.debug("message:",result.error)
           const statusCode = match ? match[1] : "unknown";
            hideTranslationSpinner();
           //console.debug("Editor:",editor)
            if (statusCode == '400') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode} and text ${result.error} `
                   );
               }
               else {
                   return `Error 401`;
               }
           }
           else if (statusCode == '401') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Please check your license!`
                   );
               }
               else {
                   return `Error 401`;
               }
           }
           else if (statusCode == '403') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Country not supported!`
                   );
               }
               else {
                   return `Request failed with status ${statusCode}. Country not supported!`;
               }
           }
           else if (statusCode == '429') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Rate limit reached!`
                   );
               }
               else {
                   return `Request failed with status ${statusCode}. Rate limit reached!`;
               }
           }
           else if (statusCode == '500') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Server issue!`
                   );
               }
               else {
                   return `Request failed with status ${statusCode}. Server issue!`;
               }
           }
           else {
               return `Request failed with status ${statusCode}. Some undefined error happened!`;
           }
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (show_debug) console.debug("NLPCLoud proxy response (raw):", result.result," ",duration);

        const data = result.result; // raw proxy response
        text = data
       
   if (text === '""' || text === "") {
       text = "No suggestions";
   }

    // Post-processing after successful result
    const start1 = Date.now()
    //console.debug("text received:",text)
    myTranslatedText = await postProcessTranslation(
        original,
        text,
        replaceVerb,
        originalPreProcessed,
        "NLPCLoud",
        convertToLower,
        spellCheckIgnore,
        locale
       );
    const duration2 = ((Date.now() - start1) / 1000).toFixed(2);
    if (show_debug) console.debug(`[${new Date().toISOString()}] myTranslatedText postprocessed ${duration2}s`, myTranslatedText);

    //if (show_debug) console.debug(`[${new Date().toISOString()}] text processed by postProcessTranslation`);
    const start2 = Date.now()
    await processTransl(
        original,
        myTranslatedText,
        language,
        record,
        rowId,
        transtype,
        plural_line,
        locale,
        convertToLower,
        current
    );

     const duration3 = ((Date.now() - start2) / 1000).toFixed(2);
    if (show_debug) console.debug(`[${new Date().toISOString()}] after processTransl ${duration3}s`);
    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    if (show_debug) console.debug(`[${new Date().toISOString()}] All processed in ${durationSec} sec`);
     hideTranslationSpinner();
    return "OK";

    } catch (err) {
        console.error("Fetch NLPCLoud failed:", err);
        return null;
    }
}


// JavaScript source code
