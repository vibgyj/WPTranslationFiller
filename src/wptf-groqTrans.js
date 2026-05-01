/****************************************************
 * START / END BATCH FLAGS
 ****************************************************/
function startTranslationBatch() {
    localStorage.setItem('openai_prompt_sent', 'false');
}

function endTranslationBatch() {
    localStorage.removeItem('openai_prompt_sent');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/****************************************************
 * NORMALIZE (alleen voor glossary matching)
 ****************************************************/
function normalizeGlossaryText(str) {
    return (str || "")
        .toLowerCase()
        .replace(/&amp;/g, "&")
        .replace(/[^a-z0-9\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/****************************************************
 * PRUNE GLOSSARY
 ****************************************************/
function pruneGlossary(openAiGloss, originalPreProcessed, original) {

    const isArrayFormat = Array.isArray(openAiGloss);
    let entries = [];

    if (isArrayFormat) {
        entries = openAiGloss.map(([k, v]) => ({
            source: String(k).toLowerCase(),
            target: String(v)
        }));
    } else {
        entries = (openAiGloss || "")
            .split(/,\s*/)
            .map(e => {
                const parts = e.split(/->|=|:/);
                return {
                    source: (parts[0] || "").replace(/["']/g, "").trim().toLowerCase(),
                    target: (parts[1] || "").replace(/["']/g, "").trim()
                };
            })
            .filter(e => e.source && e.target);
    }

    const text = (originalPreProcessed || "").toLowerCase();
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchesText = (key) => new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i').test(text);

    const result = [];
    const matchedKeys = new Set();

    for (const entry of entries) {
        if (matchesText(entry.source)) {
            result.push(entry);
            matchedKeys.add(entry.source);
        }
    }

    // Fallback DOM (optioneel)
    if (original) {
        const container =
            original?.getElementsByClassName?.("source-string__singular")?.[0]
            || new DOMParser().parseFromString(original || "", "text/html");

        const nodes = container?.querySelectorAll?.(".glossary-word") || [];

        nodes.forEach(node => {
            const key = node.textContent.trim().toLowerCase();
            const raw = node.getAttribute("data-translations");
            if (!raw) return;
            try {
                const data = JSON.parse(raw.replace(/&quot;/g, '"'));
                const translation = data?.[0]?.translation;
                if (translation && !matchedKeys.has(key) && matchesText(key)) {
                    result.push({ source: key, target: translation });
                }
            } catch (e) {}
        });
    }

    return result.map(e => `"${e.source}" -> "${e.target}"`).join("\n");
}

/****************************************************
 * LOCALE → LANGUAGE NAME
 ****************************************************/
const LOCALE_TO_LANGUAGE = {
    af: "Afrikaans",   ar: "Arabic",      bg: "Bulgarian",
    bn: "Bengali",     cs: "Czech",        da: "Danish",
    de: "German",      el: "Greek",        es: "Spanish",
    et: "Estonian",    fa: "Persian",      fi: "Finnish",
    fr: "French",      he: "Hebrew",       hi: "Hindi",
    hr: "Croatian",    hu: "Hungarian",    hy: "Armenian",
    id: "Indonesian",  it: "Italian",      ja: "Japanese",
    ka: "Georgian",    ko: "Korean",       lt: "Lithuanian",
    lv: "Latvian",     mk: "Macedonian",   ms: "Malay",
    nl: "Dutch",       no: "Norwegian",    pl: "Polish",
    pt: "Portuguese",  ro: "Romanian",     ru: "Russian",
    sk: "Slovak",      sl: "Slovenian",    sq: "Albanian",
    sr: "Serbian",     sv: "Swedish",      th: "Thai",
    tr: "Turkish",     uk: "Ukrainian",    ur: "Urdu",
    vi: "Vietnamese",  zh: "Chinese"
};

/****************************************************
 * CORE TRANSLATION
 ****************************************************/
async function getTransgroq(
    original,
    language,
    record,
    apikeygroq,
    OpenAIPrompt,
    originalPreProcessed,
    rowId,
    transtype,
    plural_line,
    formal,
    locale,
    convertToLower,
    editor,
    counter,
    groqSelect,
    OpenAItemp,
    spellCheckIgnore,
    OpenAITone,
    is_editor,
    openAiGloss
) {
    const resolvedLanguage = LOCALE_TO_LANGUAGE[language] ?? language;

    /****************************************************
     * PRUNED GLOSSARY
     ****************************************************/
    const prunedGlossary = pruneGlossary(openAiGloss, originalPreProcessed, null) || "";

    /****************************************************
     * BUILD PROMPT
     * Uses compact format: i = rowId, t = text to translate
     * Expected response:   i = rowId, tr = translation
     ****************************************************/
    const promptItems = JSON.stringify([{ i: rowId, t: originalPreProcessed }]);

    const prompt = OpenAIPrompt
        .replace(/\{\{toLanguage\}\}/g, resolvedLanguage)
        .replace(/\{\{tone\}\}/g,       OpenAITone ?? "")
        .replace(/\{\{text\}\}/g,       promptItems)
        .replace(/\{\{glossary\}\}/g,   prunedGlossary);

    const data = {
        model: groqSelect,
        messages: [{ role: "user", content: prompt }],
        temperature: OpenAItemp,
        top_p: 1,
        apiKey: apikeygroq
    };

    /****************************************************
     * CALL MODEL
     ****************************************************/
    const result = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "groq", data }, res => resolve(res));
    });

    if (!result || result.error) {
        const code = extractGroqErrorCode(result?.error);
        if (code == 429) {
            messageBox("error", "You have exceeded your rate limit!<br>");
        } else {
            messageBox("error", "There has been some uncatched error<br>" + result?.error);
        }
        return "NOK";
    }

    /****************************************************
     * PARSE RESPONSE
     * Accepts both "tr" (correct) and "t" (model used
     * input key by mistake) as the translation key.
     ****************************************************/
    let raw = result?.result?.choices?.[0]?.message?.content ?? "";

    try {
        raw = raw
            .replace(/<think>[\s\S]*?<\/think>/g, "")
            .replace(/```json\s*/gi, "")
            .replace(/```/g, "")
            .trim();

        // Robustly parse the response — the model sometimes:
        // 1. Adds an extra closing brace e.g. ...value"}}]} instead of ...value"}]}
        // 2. Double-escapes quotes in XML attributes e.g. <x id=\\"var\\"/>
        // Strategy: try direct parse, then progressively fix known issues.
        let json = null;
        const candidates = [
            raw,
            raw.replace(/\}\}\]/g, "}]"),           // fix extra closing brace before ]
            raw.replace(/\}\}\]\}/g, "}]}"),         // fix extra closing brace at end
        ];

        for (const candidate of candidates) {
            try {
                json = JSON.parse(candidate);
                break;
            } catch(e) {}
        }

        // Last resort: scan all } positions from end to find valid JSON
        if (!json) {
            const start = raw.indexOf("{");
            if (start !== -1) {
                for (let end = raw.length - 1; end >= start; end--) {
                    if (raw[end] !== "}") continue;
                    try {
                        json = JSON.parse(raw.substring(start, end + 1));
                        break;
                    } catch(e) {}
                }
            }
        }

        if (!json) {
            console.error("[Groq] Parse failed after all fixes:", raw);
            return "NOK";
        }

        if (!Array.isArray(json.results)) {
            console.error("[Groq] No results array in response:", raw);
            return "NOK";
        }

        // Remap "t" → "tr" if model used the input key by mistake
        for (const r of json.results) {
            if (!("tr" in r) && "t" in r) r.tr = r.t;
        }

        const item = json.results.find(r => String(r.i) === String(rowId));

        if (!item) {
            console.error("[Groq] No matching id:", rowId, json.results);
            return "NOK";
        }

        const finalText = await postProcessTranslation(
            original,
            item.tr,
            replaceVerb,
            originalPreProcessed,
            "groq",
            convertToLower,
            spellCheckIgnore,
            locale
        );

        await processTransl(
            original,
            finalText,
            language,
            record,
            rowId,
            transtype,
            plural_line,
            locale,
            convertToLower,
            editor
        );

        return "OK";

    } catch (err) {
        console.error("[Groq] Parse error:", err, raw);
        return "NOK";
    }
}

/****************************************************
 * ENTRY WRAPPER
 ****************************************************/
async function groqTranslate(
    original,
    destlang,
    record,
    apikeygroq,
    OpenAIPrompt,
    preverbs,
    rowId,
    transtype,
    plural_line,
    formal,
    locale,
    convertToLower,
    editor,
    counter,
    groqSelect,
    OpenAItemp,
    spellCheckIgnore,
    OpenAITone,
    is_editor,
    openAiGloss
) {
    const originalPreProcessed = await preProcessOriginal(original, preverbs, "groq");

    return await getTransgroq(
        original,
        destlang,
        record,
        apikeygroq,
        OpenAIPrompt,
        originalPreProcessed,
        rowId,
        transtype,
        plural_line,
        formal,
        locale,
        convertToLower,
        editor,
        counter,
        groqSelect,
        OpenAItemp,
        spellCheckIgnore,
        OpenAITone,
        is_editor,
        openAiGloss
    );
}

/****************************************************
 * ERROR CODE EXTRACTOR
 ****************************************************/
function extractGroqErrorCode(err) {
    if (!err) return "unknown_error";
    if (typeof err === "string") return err;
    return (
        err.code ||
        err.error?.code ||
        err.status ||
        err.error?.status ||
        "unknown_error"
    );
}