/****************************************************
 * GROQ BATCH TRANSLATE PAGE (STABLE FULL VERSION - FIXED GLOSSARY)
 ****************************************************/

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/****************************************************
 * TEMPLATE ENGINE
 ****************************************************/
function applyPromptTemplate(prompt, vars) {
    return prompt
        .replace(/\{\{toLanguage\}\}/g, vars.toLanguage ?? "")
        .replace(/\{\{tone\}\}/g, vars.tone ?? "")
        .replace(/\{\{text\}\}/g, vars.text ?? "")
        .replace(/\{\{glossary\}\}/g, vars.glossary ?? "");
}

/****************************************************
 * PRUNED GLOSSARY (FIXED - MULTI WORD SAFE VERSION)
 ****************************************************/
function buildPrunedGlossary(openAiGloss, batchText) {

    if (!openAiGloss) return "";

    const text = (batchText || "").toLowerCase();

    const escapeRegExp = (str) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const normalize = (s) =>
        (s || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    return openAiGloss
        .split('\n')
        .map(e => e.trim())
        .filter(Boolean)
        .map(entry => {

            const match = entry.match(/"(.+?)"\s*->\s*"(.+?)"/);
            if (!match) return null;

            const sourceRaw = match[1];
            const target = match[2];

            const source = normalize(sourceRaw);
            if (!source) return null;

            const regex = new RegExp(
                `\\b${escapeRegExp(source)}\\b`,
                "i"
            );

            if (!regex.test(text)) return null;

            return `"${sourceRaw}" -> "${target}"`;
        })
        .filter(Boolean)
        .join("\n");
}

/****************************************************
 * GROQ CALL
 ****************************************************/
async function callGroq(prompt, apikey, model, temp) {

    const data = {
        model: String(model),
        messages: [{ role: "user", content: prompt }],
        temperature: Number(temp ?? 0),
        top_p: 1,
        apiKey: apikey
    };

    return new Promise(resolve => {
        chrome.runtime.sendMessage(
            { action: "groq", data },
            res => resolve(res?.result)
        );
    });
}

/****************************************************
 * GROQ PARSER
 ****************************************************/
function parseGroq(result) {
    try {
        let text = result?.choices?.[0]?.message?.content;
        if (!text) return [];

        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");

        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        }

        const parsed = JSON.parse(text);
        return parsed.results || [];

    } catch (err) {
        console.error("Groq parse error:", err);
        return [];
    }
}

/****************************************************
 * BUBBLE HELPER
 ****************************************************/
function getCurrentBubble(rowId) {
    return document.querySelector(
        `#editor-${rowId} span.panel-header__bubble`
    );
}

/****************************************************
 * MAIN ENTRY
 ****************************************************/
async function translatePageGroq(
    apikeygroq,
    OpenAIPrompt,
    transsel,
    destlang,
    preTranslationReplace,
    postTranslationReplace,
    formal,
    convertToLower,
    groqSelect,
    OpenAItemp,
    spellCheckIgnore,
    OpenAITone,
    openAiGloss
) {

    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    const rows = document.querySelectorAll(
        "tr.editor div.editor-panel__left div.panel-content"
    );

    const batchQueue = [];
    const immediateQueue = [];

    /**********************************************
     * 1. SCAN + TYPE DETECTION
     **********************************************/
    for (let e of rows) {

        const rowfound = e.closest("tr.editor")?.id;
        if (!rowfound) continue;

        const match = rowfound.match(/^editor-(\d+(?:-\d+)?)$/);
        const rowId = match ? match[1] : null;
        if (!rowId) continue;

        const original = e.querySelector("span.original-raw")?.innerText;
        if (!original) continue;

        const [myType, myTranslated] = await determineType(rowId, e);

        const baseItem = {
            id: rowId,
            record: e,
            original,
            translation: null,
            type: myType
        };

        if (myType === "name") {
            immediateQueue.push({ ...baseItem, translation: original, isName: true });
            continue;
        }

        if (myType === "pretranslated") {
            immediateQueue.push({ ...baseItem, translation: myTranslated, isLocal: true });
            continue;
        }

        if (myType === "URL") {
            immediateQueue.push({ ...baseItem, translation: original });
            continue;
        }

        batchQueue.push({
            ...baseItem,
            preprocessed: original
        });
    }

    /**********************************************
     * 2. IMMEDIATE PROCESSING
     **********************************************/
    for (const item of immediateQueue) {

        await processTransl(
            item.original,
            item.translation ?? item.original,
            destlang,
            item.record,
            item.id,
            "single",
            "",
            null,
            convertToLower,
            getCurrentBubble(item.id)
        );
    }

    /**********************************************
     * 3. BATCH SPLIT
     **********************************************/
    const batchSize = 15;
    const batches = [];

    for (let i = 0; i < batchQueue.length; i += batchSize) {
        batches.push(batchQueue.slice(i, i + batchSize));
    }

    /**********************************************
     * 4. BATCH PROCESSING
     **********************************************/
    for (const batch of batches) {

        const inputText = batch.map(i => `
ID: ${i.id}
TEXT: ${i.preprocessed}
`).join("\n");

        const prunedGlossaryRaw = pruneGlossary(
    openAiGloss,
    inputText,
    null
);

const prunedGlossary =
    prunedGlossaryRaw && prunedGlossaryRaw.length > 0
        ? prunedGlossaryRaw
        : "";

        const promptWithGlossary = applyPromptTemplate(OpenAIPrompt, {
            toLanguage: destlang,
            tone: OpenAITone,
            text: inputText,
            glossary: prunedGlossary
        });

        const response = await callGroq(
            promptWithGlossary,
            apikeygroq,
            groqSelect,
            OpenAItemp
        );

        const parsed = parseGroq(response);

        for (const item of parsed) {

            const originalItem = batch.find(b => String(b.id) === String(item.id));
            if (!originalItem) continue;

            const finalText = await postProcessTranslation(
                originalItem.original,
                item.translation,
                replaceVerb,
                originalItem.preprocessed,
                "groq",
                convertToLower,
                spellCheckIgnore,
                null
            );

            await processTransl(
                originalItem.original,
                finalText,
                destlang,
                originalItem.record,
                originalItem.id,
                "single",
                "",
                null,
                convertToLower,
                getCurrentBubble(originalItem.id)
            );
        }
    }

    return "OK";
}