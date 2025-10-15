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

async function AITranslate(original, destlang, record, apikeyOpenAI, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    var timeout = 50;
    errorstate = "OK";
    
    // Preprocess original
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");
    
    // Wait the timeout delay if needed
    await delay(timeout);
    
    // Await the translation call
    var result = await getTransAI(original, destlang, record, apikeyOpenAI, OpenAIPrompt, originalPreProcessed, rowId, transtype, plural_line, formal, locale, convertToLower, is_editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss);
    
    // You can handle errorstate or result here if needed
    return result;
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


async function getTransAI(
  original, language, record, apikeyOpenAI, OpenAIPrompt,
  originalPreProcessed, rowId, transtype, plural_line, formal,
  locale, convertToLower, editor, counter, OpenAISelect,
  OpenAItemp, spellCheckIgnore, OpenAITone, openAiGloss
) {
  var show_debug = true
  let translatedText = "";
  let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    let prevstate = current ? current.innerText : "";
  const maxTokens = estimateMaxTokens(originalPreProcessed);
  let destlang = language;
    language = language.toUpperCase();
    var messages;

  let tempPrompt = OpenAIPrompt + '\n'
    let myprompt = "";

  // Handle tone and language in prompt
  if (OpenAITone === 'formal') {
    if (destlang === 'nl') {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone + " and use 'u' instead of 'je'");
    } else if (destlang === 'de') {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone + " and use 'Sie' instead of 'du'");
    } else if (destlang === 'fr') {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone + " use 'vous' instead of 'tu'");
    } else {
      myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone);
    }
  } else {
    myprompt = tempPrompt.replaceAll("{{tone}}", OpenAITone);
  }

  // Replace glossary and language names
  myprompt = myprompt.replaceAll("{{OpenAiGloss}}", openAiGloss);

  if (destlang === 'nl') myprompt = myprompt.replaceAll("{{toLanguage}}", 'Dutch');
  else if (destlang === 'de') myprompt = myprompt.replaceAll("{{toLanguage}}", 'German');
  else if (destlang === 'fr') myprompt = myprompt.replaceAll("{{toLanguage}}", 'French');
  else myprompt = myprompt.replaceAll("{{toLanguage}}", destlang);

  if (!originalPreProcessed) {
    originalPreProcessed = "No result of {originalPreprocessed} for original it was empty!";
  }
  originalPreProcessed = `"${originalPreProcessed}"`;
  //console.debug("originalPreProcessed:",originalPreProcessed)
  messages = [
    { role: 'system', content: myprompt },
    { role: 'user', content: `translate this: ${originalPreProcessed}` }
  ];

  if (OpenAISelect === 'undefined' || !OpenAISelect) {
    messageBox("error", "You did not set the OpenAI model!<br> Please check your options");
    return "NOK";
  }
 // reasoning={"effort": "minimal"}
  const mymodel = OpenAISelect.toLowerCase();
  let dataNew = {};

  if (mymodel === "gpt-5" || mymodel === "gpt-5-mini" || mymodel === "gpt-5-nano") {
    dataNew = {
      model: mymodel,
      messages,
      max_completion_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      reasoning_effort: 'minimal',
      verbosity: 'low',
      apiKey: apikeyOpenAI,
    };
  }
  else {
    dataNew = {
      model: mymodel, 
      messages,
      max_tokens: 1000,
      n: 1,
      temperature: OpenAItemp,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: 0.5,
     apiKey: apikeyOpenAI,

    };
  }
  
  const start = Date.now()
   try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "OpenAI", data: dataNew }, // send only the data
                (res) => resolve(res)
            );
        });

       if (!result) {
        console.debug("OpenAI proxy returned undefined");
        return "NOK";
    }

       if (result.error) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
           if (show_debug) console.debug(`[${new Date().toISOString()}] "OpenAI proxy error:" ${duration}s`, result.error);
            // Example of result.error: "Request failed (401): <some text>"
    const match = result.error.match(/Request failed \((\d+)\)/);
           const statusCode = match ? match[1] : "unknown";
    console.debug("editor:",editor)
           if (editor) {
               messageBox(
                   "warning",
                   `Request failed with status ${statusCode}. Please check your license!`
               );
           }

    return `Request failed with status ${statusCode}. Please check your license!`;
    }

    if (show_debug) console.debug("OpenAI proxy response (raw):", result.result);

   const data = result.result; // raw proxy response
   let text = data?.choices?.[0]?.message?.content?.trim() ?? "";
   if (text === '""' || text === "") {
       text = "No suggestions";
   }

    // Post-processing after successful result
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (show_debug) console.debug(`[${new Date().toISOString()}] text received ${duration}s`, text);

    const translatedText = await postProcessTranslation(
        original,
        text,
        replaceVerb,
        originalPreProcessed,
        "OpenAI",
        convertToLower,
        spellCheckIgnore,
        locale
    );

    if (show_debug) console.debug(`[${new Date().toISOString()}] text processed by postProcessTranslation`);

    await processTransl(
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

    if (show_debug) console.debug(`[${new Date().toISOString()}] text processed by processTransl`);

    const durationSec = ((Date.now() - start) / 1000).toFixed(2);
    if (show_debug) console.debug(`[${new Date().toISOString()}] All processed in ${durationSec} sec`);

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
    var timeout = 100;
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
    //toastbox("info", "OpenAI review is started wait for the result!!", "3000", "Review");
    var myheader = document.querySelector('header');
    
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;

    progressbar = document.querySelector(".indeterminate-progress-bar");
    //console.debug("progressbar:", progressbar)
    if (progressbar == null) {
        myheader.insertAdjacentHTML('beforebegin', template);
        // progressbar = document.querySelector(".indeterminate-progress-bar");
        // progressbar.style.display = 'block;';
    }
    else {
        progressbar.style.display = 'block';
    }
    // We need to know the amount of rows to show the finished message at the end of the process
    var table = document.getElementById("translations");
    var tr = table.rows;
    //var tbodyRowCount = table.tBodies[0].rows.length;
    var tableRecords = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content").length;
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        countrows++;
        setTimeout(async function (timeout, countrows) {
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
        }
        
        }, timeout);
        timeout += 1000;
        if (countrows == tableRecords) {
            // Translation replacement completed
            checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
            checkButton.classList.remove("started");
            checkButton.className += " translated";
            checkButton.innerText = "Checked";
            checkButton.className += " ready";  
            setTimeout(() => {
                close_toast();
                toastbox("info", "OpenAI review ready wait till all records are flagged!", "2000", "OpenAI review");
                progressbar = document.querySelector(".indeterminate-progress-bar");
                progressbar.style.display = "none";
            }, 200);
            
        }
    }
    return errorstate
}

function estimateMaxTokens(inputText) {
  // Rough estimate: ~4 characters ≈ 1 token in English/Dutch
  const inputTokens = Math.ceil(inputText.length / 4);

  // Translation output is usually a bit longer → use 1.5x multiplier
  const estimatedOutput = Math.ceil(inputTokens * 1.5);

  // Add a small safety margin
  return estimatedOutput + 20;
}

