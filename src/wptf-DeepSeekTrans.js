/**
 * Vertaal tekst met DeepSeek API
 * @param {string} originalText - De originele tekst die vertaald moet worden
 * @param {string} targetLocale - Doeltaal, bijvoorbeeld 'nl' voor Nederlands, 'en' voor Engels
 * @returns {Promise<string>} - Vertaalde tekst
 */

async function translateWithDeepSeek(original, language, record, apikeyDeepSeek, OpenAIPrompt, preverbs, rowId, transtype, plural_line, formal, locale, convertToLower, editor, counter, OpenAISelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
    var show_debug = true
    let translatedText = "";
    let current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    let prevstate = current ? current.innerText : "";
    var originalPreProcessed = await preProcessOriginal(original, preverbs, "OpenAI");
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
   
    let dataNew = {};

    mymodel = "deepseek-chat"

    if (mymodel === "gpt-5" || mymodel === "gpt-5-mini" || mymodel === "gpt-5-nano") {
        dataNew = {
            model: mymodel,
            messages,
            max_completion_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            reasoning_effort: 'minimal',
            verbosity: 'low'
        };
    }
    else {
       dataNew = {
       model: mymodel,     // e.g. "deepseek-chat"
       messages,
       max_tokens: maxTokens,
       temperature: OpenAItemp,
       top_p: 0.5,
       stream: false       // ensure non-streaming
};

const link = "https://api.deepseek.com/v1/chat/completions";

try {
    const start = Date.now();
    if (show_debug) console.debug(`[${new Date().toISOString()}] Sending request to DeepSeek with model ${mymodel}`);

    const response = await fetch(link, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Authorization": "Bearer " + apikeyDeepSeek,
        },
        body: JSON.stringify(dataNew),
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP error ${response.status}`;
        if (editor) messageBox("error", `DeepSeek API Error: ${errorMsg}`);
        if (show_debug) console.error("DeepSeek API error:", errorMsg);
        return "NOK";
    }

    const choice = data.choices?.[0];
    if (choice?.message?.content) {
        let text = choice.message.content.trim();
        if (text === '""' || text === "") {
            text = original + " No translation received";
        }

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        if (show_debug) console.debug(`[${new Date().toISOString()}] text received in ${duration}s`);

        translatedText = await postProcessTranslation(
            original,
            text,
            replaceVerb,
            originalPreProcessed,
            "DeepSeek",        // tag for debugging
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

        if (show_debug) {
            const durationSec = ((Date.now() - start) / 1000).toFixed(2);
            console.debug(`[${new Date().toISOString()}] All processed in ${durationSec}s`);
        }

        return "OK";
    } else {
        if (show_debug) console.warn("DeepSeek API response missing expected content");
        return "NOK";
    }
} catch (error) {
    if (editor) messageBox("error", "DeepSeek API fetch error: " + error.message);
    if (show_debug) console.error("DeepSeek fetch error:", error);
    return "NOK";
}

    }
}
