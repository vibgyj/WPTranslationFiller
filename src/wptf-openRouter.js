/**
 * This file includes all functions for translating with the openRouter API and uses a promise
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

async function openRouterTranslate(original, destlang, record, apikeyOpenRouter, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenCloudSelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    var timeout = 50;
    errorstate = "OK";
    //console.debug("Starting openRouterTranslate for rowId:", rowId, "original:", original)
    // Preprocess original
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");
    
    // Wait the timeout delay if needed
   // await delay(timeout);
    
    // Await the translation call
    var result = await getopenRouter(original, destlang, record, apikeyOpenRouter, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, is_editor, counter, OpenCloudSelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss);
    
    // You can handle errorstate or result here if needed
    return result;
}

async function getopenRouter(
  original, language, record, apikeyOpenRouter, OpenAIPrompt,
  originalPreProcessed, rowId, transtype, plural_line, formal,
  locale, convertToLower, editor, counter,OpenRouterSelect,
  OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss
) {
  var show_debug = false
  var myTtranslatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    let prevstate = current ? current.innerText : "";
    
  let destlang = language;
    language = language.toUpperCase();
    var messages;

  let tempPrompt = OpenAIPrompt + '\n'
    let myprompt = "";

  // Handle tone and language in prompt
  let basePrompt = tempPrompt;

if (OpenAITone === 'formal') {
  if (destlang === 'nl') {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone + " and use 'u' instead of 'je'");
  } else if (destlang === 'de') {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone + " and use 'Sie' instead of 'du'");
  } else if (destlang === 'fr') {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone + " use 'vous' instead of 'tu'");
  } else {
    basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone);
  }
} else {
  basePrompt = basePrompt.replaceAll("{{tone}}", OpenAITone);
}

basePrompt = basePrompt.replaceAll("{{toLanguage}}",
  destlang === 'nl' ? 'Dutch' :
  destlang === 'de' ? 'German' :
  destlang === 'fr' ? 'French' :
  destlang === 'uk' ? 'Ukrainian' :
  destlang === 'es' ? 'Spanish' :
  destlang === 'id' ? 'Indonesian' :
  destlang === 'it' ? 'Italian' :
  destlang === 'pt' ? 'Portuguese' :
  destlang === 'ru' ? 'Russian' :
  destlang
);

    // compact glossary (IMPORTANT IMPROVEMENT)
    //console.debug("Original glossary:", openAiGloss)
    const filteredGloss = pruneGlossary(openAiGloss, originalPreProcessed,record);
    //console.debug("Filtered glossary (line breaks):", filteredGloss)
const compactGloss = filteredGloss.replace(/\n+/g, "|");
// console.debug("Filtered glossary:", compactGloss)
const content = 
`INSTRUCTIONS:
${basePrompt}
GLOSSARY:
${compactGloss}
SOURCE_TEXT:
${originalPreProcessed}
RULE:
Return only translation.`;

messages = [
  {
    role: "user",
    content
  }
];

  if (OpenRouterSelect === 'undefined' || !OpenRouterSelect) {
    messageBox("error", "You did not set the OpenRouter model!<br> Please check your options");
    return "NOK";
  }
 // reasoning={"effort": "minimal"}
    const mymodel = OpenRouterSelect.toLowerCase();
   if (show_debug) console.debug("Model selected:",mymodel);
    let dataNew = {};
    //mymodel= "openrouter/free"
   // Define fallbacks per primary model (or null for no fallback)
    const fallbackMap = {
  "gpt-oss-20b":         ["openai/gpt-5.4-nano", "openai/gpt-4o-mini"],
  "gpt-5":               ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
  "gpt-5-mini":          ["openai/gpt-4o-mini", "google/gemini-flash-1.5"],
  "gpt-5-nano":          ["openai/gpt-4o-mini"],
  "gpt-5.1":             ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
  "gpt-5.1-mini":        ["openai/gpt-4o-mini"],
  "gpt-5.1-nano":        ["openai/gpt-4o-mini"],
  "gpt-5.4":             ["openai/gpt-4o"],
  "gpt-5.3-chat-latest": ["openai/gpt-4o", "anthropic/claude-3-opus"],
};

if (mymodel === "gpt-5" || mymodel === "gpt-5-mini" || mymodel === "gpt-5-nano") {
    dataNew = {
        model: mymodel,
        messages,
        max_completion_tokens: max_Tokens,
        top_p: Number(Top_p),
        top_k: Number(Top_k),
        frequency_penalty: 0,
        presence_penalty: 0,
        reasoning_effort: 'minimal',
        verbosity: 'low',
        apiKey: apikeyOpenRouter,
        prompt_cache_key: 'WPTF translation',
        guardrails: false,
    };
}
else if (mymodel === "gpt-5.1" || mymodel === "gpt-5.1-mini" || mymodel === "gpt-5.1-nano" || mymodel === "gpt-5.4") {
    dataNew = {
        model: mymodel,
        messages,
        max_completion_tokens: max_Tokens,
        top_p: Number(Top_p),
        frequency_penalty: 0,
        presence_penalty: 0,
        reasoning_effort: 'none',
        verbosity: 'low',
        apiKey: apikeyOpenRouter,
        prompt_cache_key: 'WPTF translation',
        guardrails: false,
    };
}
else if (mymodel === "gpt-5.3-chat-latest") {
    dataNew = {
        model: mymodel,
        messages,
        max_completion_tokens: max_Tokens,
        top_p: Number(Top_p),
        frequency_penalty: 0,
        presence_penalty: 0,
        reasoning_effort: 'medium',
        verbosity: 'low',
        apiKey: apikeyOpenRouter,
        prompt_cache_key: 'WPTF translation',
        guardrails: false,
    };
}
else {
    dataNew = {
        model: mymodel,
        messages,
        n: 1,
        temperature: OpenAItemp,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: Number(Top_p),
        apiKey: apikeyOpenRouter,
        //guardrails: false,
    };
}

// Inject fallback models if defined for this model
const fallbacks = fallbackMap[mymodel];
if (fallbacks) {
    dataNew.models = [mymodel, ...fallbacks];
}
  
    try {
        const start = Date.now()
        //console.debug("We start call at :",start)
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "openRouter", data: { ...dataNew } },  // ✅ clone meesturen

              (res) => {
                  console.debug("openRouter chrome message response:", res);
                  //console.debug("openRouter model used:", res.modelUsed);
                  resolve(res);
              }
            );
        });
       let duration = ((Date.now() - start) / 1000).toFixed(2);
       if (toBoolean(DebugMode)) console.debug("openRouter proxy response (raw):", result.result," ",duration);
       if (!result) {
        console.debug("openRouter proxy returned undefined");
        return "NOK";
    }

       if (result.error) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
           if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] "openRouter proxy error:" ${duration}s`, result.error);
            // Example of result.error: "Request failed (401): <some text>"
           const match = result.error.match(/Request failed \((\d+)\)/);
           const statusCode = match ? match[1] : "unknown";
           //console.debug("Editor:",editor)
           if (statusCode == '400') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode} <br>${result.error}`
                   );
               }
               else {
                   return `Error 400`;
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
            if (statusCode == '404') {
               if (editor) {
                   messageBox(
                       "warning",
                       `Request failed with status ${statusCode}. Please check your license!<br> ${result.error}`
                   );
               }
               else {
                   return `Error 401`;
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
    duration = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug("openRouter proxy response (raw):", result.result," ",duration);

   //const data = result.result; // raw proxy response
       let text = result.result || "";
        
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
        "openRouter",
        convertToLower,
        spellCheckIgnore,
        locale
        );
        
    const duration2 = ((Date.now() - start1) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] myTranslatedText postprocessed ${duration2}s`, myTranslatedText);

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
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] after processTransl ${duration3}s`);
    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    if (toBoolean(DebugMode)) console.debug(`[${new Date().toISOString()}] All processed in ${durationSec} sec`);

    return "OK";

    } catch (err) {
        console.error("Fetch OpenAI failed:", err);
        return null;
    }

    console.debug("result:")
  //  if (!OpenAiResponse.ok) {
      // error object from OpenAI might be in data.error.message
   //   const errorMsg = data?.error?.message || `HTTP error ${response.status}`;
  //    if (editor) messageBox("error", `OpenAI API Error: ${errorMsg}`);
  //    if (show_debug) console.error("OpenAI API error:", errorMsg);
  //    return "NOK";
  //  }

  
 // } catch (error) {
 //   if (editor) messageBox("error", "OpenAI API fetch error: " + error.message);
 //   if (show_debug) console.error("OpenAI fetch error:", error);
 //   return "NOK";
 // }
}



async function reviewopenRouter(original, language, record, apikeyOpenAI, OpenAIPrompt, reviewPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, editor,translatedText,preview) {
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
    originalPreProcessed = "'" + originalPreProcessed + "'" + "|\n"
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
        top_p: 0,
        stop: '|\n',
    }

  //  var mydata = {
   //     "model": "text-davinci-003",
   //     "prompt": "${prompt}",
    //    "temperature": 0,
    //    "max_tokens": 1000,
   //     "top_p": 1,
  //      "frequency_penalty": 0,
  //      "presence_penalty": 0
  //  }
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

    
    var link = "https://api.openrouter.ai/v1/chat/completions";
    

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
                        // We need to remove the existing checkmark if present
                        if (preview.innerHTML.startsWith('\u{2705}')){
                            preview.innerHTML = preview.innerHTML.replace('\u{2705}',"")
                        }
                        preview.innerHTML = '\u{2705}' + " " + preview.innerHTML
                        
                    }
                    else {
                        if (preview.innerHTML.startsWith('\u{26A0}}')) {
                            preview.innerHTML = preview.innerHTML.replace('\u{26A0}', "")
                        }
                        preview.innerHTML = '\u{26A0}' + " "+ preview.innerHTML
                    }
                    return Promise.resolve(errorstate)
                }
                else {
                    text = "No text received"
                    console.debug("No text received!")
                    errorstate = "NOK";
                }
                return Promise.resolve(errorstate)
            }
        })
        .catch(error => {
            //console.debug("error:",error)
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
            else if (error[2] == '503') {
                messageBox("error", "The server cannot handle the request")
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 503";
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
