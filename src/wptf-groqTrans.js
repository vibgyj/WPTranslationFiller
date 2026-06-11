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
     * Embedded as a "g" field directly in the JSON item,
     * matching the batch approach. The {{glossary}}
     * placeholder in the prompt is left empty — the model
     * reads glossary terms from the per-item "g" field only.
     * "g" is omitted entirely when there are no matches,
     * keeping the payload compact.
     ****************************************************/
    const prunedGlossary = pruneGlossary(openAiGloss, originalPreProcessed, null) || "";

    /****************************************************
     * BUILD PROMPT
     * Uses compact format: i = rowId, t = text to translate
     *                       g = glossary terms (omitted if empty)
     * Expected response:   i = rowId, tr = translation
     *
     * The pruned glossary is passed in TWO places:
     *   1. {{glossary}} in the prompt — visible to the model
     *      in the ### Glossary section as explicit term list
     *   2. "g" field per item in the JSON payload — so the
     *      model knows exactly which terms apply to this string
     ****************************************************/
    const payloadItem = { i: rowId, t: originalPreProcessed };
    if (prunedGlossary) payloadItem.g = prunedGlossary;

    // Send a neutral dummy item alongside the real one.
    // The model applies glossary terms more reliably when it sees
    // multiple items — a single item gets treated as a standalone
    // title/heading and triggers different (less compliant) behaviour.
    const dummyItem = { i: "0", t: "OK" };
    const promptItems = JSON.stringify([payloadItem, dummyItem]);

    const prompt = OpenAIPrompt
        .replace(/\{\{toLanguage\}\}/g, resolvedLanguage)
        .replace(/\{\{tone\}\}/g,       OpenAITone ?? "")
        .replace(/\{\{text\}\}/g,       promptItems)
        .replace(/\{\{glossary\}\}/g,   prunedGlossary); // glossary in prompt AND in g field

    console.debug("[Groq single] rowId:", rowId);
    console.debug("[Groq single] prunedGlossary:", prunedGlossary || "(empty)");
    console.debug("[Groq single] promptItems:", promptItems);
    console.debug("[Groq single] full prompt sent to model:\n", prompt);

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
    console.debug("[Groq single] raw model response:\n", raw);

    try {
        raw = raw
            .replace(/<think>[\s\S]*?<\/think>/g, "")
            .replace(/```json\s*/gi, "")
            .replace(/```/g, "")
            .trim();

        // Apply same structural fixes as batch parser before scanning
        raw = raw.replace(/\}\}\]/g, "}]").replace(/\}\}\]\}/g, "}]}");

        // Collect ALL top-level { } and [ ] blocks, then evaluate from last to first.
        // Scanning last-to-first means the model's final self-corrected answer wins
        // over any reasoning noise or early draft responses earlier in the output.
        const candidates = [];
        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (ch !== "{" && ch !== "[") continue;
            const close = ch === "{" ? "}" : "]";
            let depth = 0, end = -1;
            for (let j = i; j < raw.length; j++) {
                if (raw[j] === ch) depth++;
                else if (raw[j] === close) depth--;
                if (depth === 0) { end = j; break; }
            }
            if (end !== -1) {
                candidates.push(raw.substring(i, end + 1));
                i = end;
            }
        }

        // Two-pass evaluation:
        // Pass 1: prefer candidates that are proper {results:[...]} objects (last to first)
        // Pass 2: fall back to bare arrays normalised to {results:[...]} (last to first)
        // This ensures the model's final structured answer beats any intermediate
        // bare arrays embedded in reasoning text earlier in the response.
        candidates.reverse();

        function tryCancel(candidate, requireResultsKey) {
            try {
                const parsed = JSON.parse(candidate);
                if (requireResultsKey && !parsed.results) return null;
                const normalised = Array.isArray(parsed) ? { results: parsed } : parsed;
                if (!Array.isArray(normalised.results) || normalised.results.length === 0) return null;
                for (const r of normalised.results) {
                    if (!("i"  in r) && "id"         in r) r.i  = r.id;
                    if (!("tr" in r) && "t"           in r) r.tr = r.t;
                    if (!("tr" in r) && "translation" in r) r.tr = r.translation;
                }
                const badItem = normalised.results.find(r => !("i" in r) || !("tr" in r));
                if (badItem) return null;
                return normalised;
            } catch(e) { return null; }
        }

        let json = null;
        // Pass 1: proper {results:[...]} objects only
        for (const candidate of candidates) {
            json = tryCancel(candidate, true);
            if (json) break;
        }
        // Pass 2: accept bare arrays too
        if (!json) {
            for (const candidate of candidates) {
                json = tryCancel(candidate, false);
                if (json) break;
            }
        }

        if (!json) {
            console.error("[Groq] Parse failed after all candidates:", raw);
            return "NOK";
        }

        const item = json.results.find(r => String(r.i) === String(rowId));

        if (!item) {
            console.error("[Groq] No matching id:", rowId, json.results);
            return "NOK";
        }

        // Post-process: enforce glossary in JS after model response.
        // The model sometimes ignores glossary terms — applying them here guarantees correctness.
        if (prunedGlossary) {
            for (const line of prunedGlossary.split(/,\s*|\n/)) {
                const m = line.match(/"(.+?)"\s*->\s*"(.+?)"/);
                if (!m) continue;
                const source = m[1];
                const target = m[2];
                if (source.toLowerCase() === target.toLowerCase()) continue; // DO NOT TRANSLATE
                const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                item.tr = item.tr.replace(new RegExp("\\b" + escaped + "\\b", "gi"), target);
            }
            console.debug("[Groq single] After glossary enforcement:", item.tr);
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