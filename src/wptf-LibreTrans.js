// Librertrans
// Voorbeeld gebruik:
async function transLibre(original, destlang, record, OpenAIPrompt, replacePreVerb, rowId, transtype, plural_line, formal, locale, convertToLower,  OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss) {
 
    
    let convertedGlossary = convertGlossaryForOllamaMerged(openAiGloss)
    let originalPreProcessed = await preProcessOriginal(original, replaceVerb, "LibreTrans");
    originalPreProcessed = applyGlossaryMap(originalPreProcessed, convertedGlossary)
    translated = await translateLibre(originalPreProcessed,"en", destlang)
    translatedText = translated
    //console.debug("Vertaling:", translated);
    if (translated != null) {
        translatedText = normalizeExtraNewlines(originalPreProcessed, translatedText)
        let convertedGlossary = GLOBAL_GLOSSARY;
        if (convertedGlossary) {
            translatedText = applyOpenAiGlossary(
                translatedText,
                convertedGlossary
            );
        }
        // console.debug("LMStudio Translated Text:", translatedText);
        let myTranslatedText = postProcessTranslation(
            original,
            translatedText,
            replaceVerb,
            originalPreProcessed,
            "LMstudio",
            convertToLower,
            spellCheckIgnore,
            destlang
        );

        let current = "untranslated"
        processTransl(
            original,
            myTranslatedText,
            destlang,
            record,
            rowId,
            transtype,
            plural_line,
            locale,
            convertToLower,
            current
        );
    }
    else {
        console.debug("We did not get a translation")
    }
    return translated
}

async function translateLibre(text, source = "en", target = "nl") {
    try {
        const response = await fetch("http://localhost:5000/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: text,
                source: source,
                target: target,
                format: "text"
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.translatedText;
    } catch (err) {
         messageBox("error", __("We failed to fetch the translation!</br> Check if your local server is running"));
        console.debug("Translation failed:", err);
        return null;
    }
}