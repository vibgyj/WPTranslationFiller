/****************************************************
 * KOBOLDCPP BATCH TRANSLATE PAGE
 * Version: 2026-07-29.1
 *
 * Local counterpart of translatePageGroq. Because KoboldCPP runs
 * locally with a SINGLE model on ONE GPU, all of the Groq online
 * machinery is removed:
 *   - no fallback chain / model rotation
 *   - no per-model cooldowns or 429 handling
 *   - no rate-limit headers / proactive pacing
 *   - no inter-batch delay (the GPU serialises requests anyway)
 *   - no live model-list check / dead-model blacklist
 *
 * What is kept from the Groq version (engine-agnostic logic):
 *   - Row scan + classification (plural / pretranslated / name / URL / single)
 *   - Immediate queue for locally-resolved rows (no model call)
 *   - Token-aware batch building (count + char budget)
 *   - Per-item glossary pruning, embedded as a "g" field per item
 *   - Robust multi-candidate JSON parser (parseKobold)
 *   - JSON-format correction retry (a local 8B can emit malformed JSON)
 *   - enforceGlossary post-processing (belt and suspenders)
 *   - Retry sweep for items the model omitted
 *
 * KoboldCPP specifics:
 *   - Call goes through chrome.runtime.sendMessage({action:"koboldCpp"})
 *     exactly like the single-line getTransKobold, so it reuses the
 *     same background proxy and OpenAI-compatible endpoint.
 *   - Reasoning is disabled via chat_template_kwargs.enable_thinking=false
 *     in the body (the switch you confirmed working). The parser also
 *     strips <think> blocks as a safety net in case it ever leaks.
 *
 * NOTE ON THE PROMPT: this uses the BATCH prompt (JSON i/t/g -> tr),
 * NOT the single-line prompt. Pass your batch prompt template as
 * OpenAIPrompt. Start from your working Groq batch prompt; you may
 * need to tighten it for the local 8B, which follows instructions
 * less strictly than the Groq models.
 ****************************************************/

if (typeof KOBOLD_BATCH_TRANSLATE_VERSION === "undefined") {
    var KOBOLD_BATCH_TRANSLATE_VERSION = "2026-07-29.1";
}

if (typeof koboldDelay === "undefined") {
    function koboldDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/****************************************************
 * PROMPT COMMENTS
 * Lines that START with [[COMMENT]] are notes for you (e.g. which
 * model/API the prompt is for). They are stripped before the prompt
 * is sent to the model, so they never influence the translation.
 * The marker only counts at the start of a line, so [[COMMENT]]
 * appearing mid-text is left untouched.
 ****************************************************/
if (typeof stripPromptComments === "undefined") {
    function stripPromptComments(prompt) {
        if (!prompt) return prompt;
        return prompt.replace(/^[ \t]*\[\[COMMENT\]\].*(?:\r?\n|$)/gm, "");
    }
}

/****************************************************
 * TEMPLATE ENGINE (mirrors the Groq helpers)
 * applyPromptBaseKobold  — fill static placeholders once before the loop
 * applyPromptBatchKobold — fill dynamic placeholders per batch
 *
 * {{text}}     -> the JSON array of items for this batch
 * {{glossary}} -> merged glossary (optional; per-item "g" also carries it)
 ****************************************************/
function applyPromptBaseKobold(prompt, toLanguage, tone) {
    return prompt
        .replace(/\{\{toLanguage\}\}/g, toLanguage ?? "")
        .replace(/\{\{tone\}\}/g, tone ?? "");
}

function applyPromptBatchKobold(basePrompt, text, glossary) {
    return basePrompt
        .replace(/\{\{text\}\}/g, text ?? "")
        .replace(/\{\{OpenAiGloss\}\}/g, glossary ?? "")
        .replace(/\{\{glossary\}\}/g, glossary ?? "");
}

/****************************************************
 * KOBOLDCPP CALL
 * Accepts a messages array so JSON-correction retries can include
 * conversation history. Reasoning is disabled via
 * chat_template_kwargs.enable_thinking=false — the switch confirmed
 * working for Qwen3-8B on this setup.
 *
 * Returns the same shape the background proxy already returns for
 * the single-line path, i.e. { result: <raw string>, error?: ... }.
 ****************************************************/
async function callKobold(messages, koboldUrl, temp, maxTokens) {
    const data = {
        model: "koboldcpp",
        messages,
        max_tokens: maxTokens,
        temperature: Number(temp ?? 0),
        frequency_penalty: 0,
        presence_penalty: 0,
        repeat_penalty: 1.1,
        top_k: typeof Top_k !== "undefined" ? Number(Top_k) : 0,
        chat_template_kwargs: { enable_thinking: false },
        baseUrl: koboldUrl || "http://localhost:5001",
    };

    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "koboldCpp", data }, res => {
            if (chrome.runtime.lastError) {
                resolve({ error: { status: 0, message: chrome.runtime.lastError.message } });
                return;
            }
            resolve(res);
        });
    });
}

/****************************************************
 * PARSER  (parseKobold)
 * Based on parseGroq. The background proxy for the single-line path
 * returns result.result as the raw assistant string, so this parser
 * accepts EITHER:
 *   - a raw string (KoboldCPP proxy shape), or
 *   - a full OpenAI-style object choices[0].message.content
 * and then:
 *   1. Strips <think> blocks (safety net; reasoning is off already)
 *   2. Strips markdown fences
 *   3. Collects all top-level {...} candidates
 *   4. Returns the largest candidate with a valid results array
 *      where every item has i + tr keys (after key normalisation)
 ****************************************************/
function parseKobold(result) {
    try {
        let text = null;

        // KoboldCPP single-line proxy returns the raw string in result.result
        if (typeof result === "string") {
            text = result;
        } else if (typeof result?.result === "string") {
            text = result.result;
        } else {
            // Fall back to the OpenAI-style shape just in case
            text = result?.result?.choices?.[0]?.message?.content
                ?? result?.choices?.[0]?.message?.content
                ?? null;
        }

        if (!text) return null;

        // 1. strip reasoning (safety net)
        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        // 2. strip markdown fences
        text = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        // Fix extra closing braces the model sometimes adds before ]}
        text = text.replace(/\}\}\]/g, "}]").replace(/\}\}\]\}/g, "}]}");

        // 3. collect top-level {...} candidates
        const candidates = [];
        for (let i = 0; i < text.length; i++) {
            if (text[i] !== "{") continue;
            let depth = 0, end = -1;
            for (let j = i; j < text.length; j++) {
                if (text[j] === "{") depth++;
                else if (text[j] === "}") depth--;
                if (depth === 0) { end = j; break; }
            }
            if (end !== -1) {
                candidates.push(text.substring(i, end + 1));
                i = end;
            }
        }

        if (candidates.length === 0) {
            console.warn("[Kobold] No JSON candidates found in response:", text);
            return null;
        }

        // last-to-first: a well-formed object usually comes last
        candidates.reverse();

        function tryParseCandidate(candidate, requireResultsKey) {
            try {
                const parsed = JSON.parse(candidate);
                if (requireResultsKey && !parsed.results) return null;
                const normalised = Array.isArray(parsed) ? { results: parsed } : parsed;
                if (!Array.isArray(normalised.results) || normalised.results.length === 0) return null;
                const results = normalised.results;
                for (const r of results) {
                    if (!("i"  in r) && "id"           in r) r.i  = r.id;
                    if (!("tr" in r) && "t"            in r) r.tr = r.t;
                    if (!("tr" in r) && "translation"  in r) r.tr = r.translation;
                }
                const badItem = results.find(r => !("i" in r) || !("tr" in r));
                if (badItem) return null;
                // reject runaway repetition loops
                const hasLoop = results.some(r => {
                    const tokens = String(r.tr ?? "").split(/[\s,]+/).filter(Boolean);
                    if (tokens.length < 10) return false;
                    let maxRun = 1, run = 1;
                    for (let i = 1; i < tokens.length; i++) {
                        run = tokens[i] === tokens[i - 1] ? run + 1 : 1;
                        if (run > maxRun) maxRun = run;
                    }
                    return maxRun >= 8;
                });
                if (hasLoop) {
                    console.warn("[Kobold] Repetition loop detected — rejecting response");
                    return null;
                }
                return results;
            } catch { return null; }
        }

        let results = null;
        // Pass 1: proper {results:[...]} objects only
        for (const candidate of candidates) {
            results = tryParseCandidate(candidate, true);
            if (results) break;
        }
        // Pass 2: accept bare arrays too
        if (!results) {
            for (const candidate of candidates) {
                results = tryParseCandidate(candidate, false);
                if (results) break;
            }
        }
        if (results) return results;

        console.warn("[Kobold] No valid results in any candidate");
        return null;

    } catch (err) {
        console.error("[Kobold] Parse error:", err);
        return null;
    }
}

/****************************************************
 * HELPERS (local copies, prefixed to avoid clashing with the
 * Groq file if both are loaded in the same page)
 ****************************************************/
function normalizeIdKobold(id) {
    return String(id).replace(/\s/g, "");
}

// Enforce "source" -> "target" glossary terms after the model
// response (belt and suspenders — the local 8B sometimes ignores
// a term even when it is present in the "g" field).
function enforceGlossaryKobold(translation, glossaryStr) {
    if (!glossaryStr) return translation;
    for (const line of String(glossaryStr).split(/,\s*|\n/)) {
        const m = line.match(/"(.+?)"\s*->\s*"(.+?)"/);
        if (!m) continue;
        const source = m[1];
        const target = m[2];
        if (source.toLowerCase() === target.toLowerCase()) continue;
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        translation = translation.replace(
            new RegExp("\\b" + escaped + "\\b", "gi"), target
        );
    }
    return translation;
}

function makeBubbleCacheKobold() {
    const cache = new Map();
    return rowId => {
        if (!cache.has(rowId)) {
            cache.set(rowId, document.querySelector("#editor-" + rowId + " span.panel-header__bubble"));
        }
        return cache.get(rowId);
    };
}

/****************************************************
 * MAIN — translatePageKobold
 *
 * Signature mirrors translatePageGroq but without the apikey and
 * model-select arguments (not needed locally). koboldUrl replaces
 * the Groq endpoint; koboldBatchSize defaults to 5 (a local 8B is
 * less reliable with large JSON structures than the Groq models).
 ****************************************************/
async function translatePageKobold(
    koboldUrl,
    OpenAIPrompt,            // BATCH prompt (JSON i/t/g -> tr), not the single-line prompt
    transsel,
    destlang,
    preTranslationReplace,
    postTranslationReplace,
    formal,
    convertToLower,
    OpenAItemp,
    spellCheckIgnore,
    OpenAITone,
    openAiGloss,
    koboldBatchSize = 5
) {
    console.info("[Kobold] translatePageKobold version " + KOBOLD_BATCH_TRANSLATE_VERSION);

    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    const getBubble = makeBubbleCacheKobold();

    const rows = document.querySelectorAll(
        "tr.editor div.editor-panel__left div.panel-content"
    );

    const batchQueue = [];
    const immediateQueue = [];

    /****************************************************
     * SCAN — classify every row (identical logic to Groq)
     ****************************************************/
    function stripPluralLabel(text) {
        const lines = (text || "").split("\n");
        return lines.length > 1 ? lines.slice(1).join("\n").trim() : text.trim();
    }

    for (const e of rows) {
        const rowfound = e.closest("tr.editor")?.id;
        if (!rowfound) continue;

        const match = rowfound.match(/^editor-(\d+(?:-\d+)*)$/);
        const rowId = match?.[1];
        if (!rowId) continue;

        const original = e.querySelector("span.original-raw")?.innerText;
        if (!original) continue;

        // Optional translation context from the "context bubble" field.
        // Safe access: not every row has one. Only single (non-plural)
        // UI strings carry meaningful context; plurals are skipped.
        const mycontext = e.getElementsByClassName("context bubble")[0]?.innerText?.trim() || "";

        const plural1 = document.querySelector("#preview-" + rowId + " .original li:nth-of-type(1)");
        const plural2 = document.querySelector("#preview-" + rowId + " .original li:nth-of-type(2)");

        if (plural2) {
            const form1 = stripPluralLabel(plural1?.innerText);
            const form2 = stripPluralLabel(plural2?.innerText);
            const rowLocale = checkLocale();
            const tr1 = await findTransline(form1, rowLocale);
            const tr2 = await findTransline(form2, rowLocale);

            if (tr1 !== "notFound" && tr2 !== "notFound") {
                immediateQueue.push({
                    id: rowId, record: e, original,
                    translation: tr1, render: false,
                    pluralForms: [
                        { original: form1, translation: tr1, line: 1 },
                        { original: form2, translation: tr2, line: 2 }
                    ]
                });
            } else {
                batchQueue.push({
                    id: rowId, type: "plural", record: e,
                    items: [
                        { id: rowId, line: 1, original: form1 },
                        { id: rowId, line: 2, original: form2 }
                    ]
                });
            }
            continue;
        }

        const [myType, myTranslated] = await determineType(rowId, e);

        if (myType === "name" || myType === "URL") {
            immediateQueue.push({ id: rowId, record: e, original, translation: original, render: true });
            continue;
        }

        if (myType === "pretranslated") {
            immediateQueue.push({ id: rowId, record: e, original, translation: myTranslated, render: false });
            continue;
        }

        batchQueue.push({
            id: rowId, type: "single", record: e,
            items: [{ id: rowId, line: 1, original, context: mycontext }]
        });
    }

    /****************************************************
     * LOCAL LABEL (identical to Groq)
     ****************************************************/
    function addLocalLabel(rowId, expectedForms) {
        const td = document.querySelector("#preview-" + rowId + " td.translation");
        if (!td) return;

        function insertLabel() {
            if (td.querySelector(".trans_local_div")) return;
            const div = document.createElement("div");
            div.setAttribute("class", "trans_local_div");
            div.setAttribute("id", "trans_local_div");
            div.appendChild(document.createTextNode(__("Local")));
            const ul = td.querySelector("ul.ul-plural");
            if (ul) {
                ul.insertAdjacentElement("afterend", div);
            } else {
                td.appendChild(div);
            }
        }

        if (expectedForms && expectedForms > 1) {
            const observer = new MutationObserver(() => {
                const spans = td.querySelectorAll("span.translation-text");
                const allFilled = spans.length >= expectedForms &&
                    [...spans].every(s => s.innerHTML.trim() !== "" && s.innerHTML.trim() !== "empty");
                if (allFilled) {
                    observer.disconnect();
                    insertLabel();
                }
            });
            observer.observe(td, { childList: true, subtree: true, characterData: true });
            setTimeout(() => { observer.disconnect(); insertLabel(); }, 2000);
        } else {
            insertLabel();
        }
    }

    /****************************************************
     * IMMEDIATE — process local rows without a model call
     * (identical to Groq, only the engine label passed to the
     *  pre/post processors differs: "KoboldCPP")
     ****************************************************/
    for (const item of immediateQueue) {

        if (item.pluralForms) {
            for (let fi = 0; fi < item.pluralForms.length; fi++) {
                const form = item.pluralForms[fi];
                const preprocessed = await preProcessOriginal(form.original, replacePreVerb, "KoboldCPP");
                const finalText = await postProcessTranslation(
                    form.original, form.translation, replaceVerb,
                    preprocessed, "KoboldCPP", convertToLower, spellCheckIgnore, locale
                );
                await processTransl(
                    form.original, finalText, destlang, item.record,
                    item.id, "plural", String(form.line),
                    locale, convertToLower, getBubble(item.id)
                );
                if (fi === item.pluralForms.length - 1) {
                    addLocalLabel(item.id, item.pluralForms.length);
                }
            }
            continue;
        }

        if (!item.render) {
            const preprocessed = await preProcessOriginal(item.original, replacePreVerb, "KoboldCPP");
            const finalText = await postProcessTranslation(
                item.original, item.translation, replaceVerb,
                preprocessed, "KoboldCPP", convertToLower, spellCheckIgnore, locale
            );
            await processTransl(
                item.original, finalText, destlang, item.record,
                item.id, "single", "", locale, convertToLower, getBubble(item.id)
            );
            addLocalLabel(item.id);
            continue;
        }

        const preprocessed = await preProcessOriginal(item.original, replacePreVerb, "KoboldCPP");
        const finalText = await postProcessTranslation(
            item.original, item.translation, replaceVerb,
            preprocessed, "KoboldCPP", convertToLower, spellCheckIgnore, locale
        );
        await processTransl(
            item.original, finalText, destlang, item.record,
            item.id, "single", "", locale, convertToLower, getBubble(item.id)
        );
    }

    /****************************************************
     * BATCH — translate via KoboldCPP
     ****************************************************/
    const batchSize = Number(koboldBatchSize) || 5;
    const maxParseRetries = 2;

    // Merged glossary is sent via {{OpenAiGloss}}/{{glossary}} in the
    // prompt as well as per-item "g". Keep both for the local 8B,
    // which follows the glossary more reliably with reinforcement.
    const KOBOLD_USE_MERGED_GLOSSARY = true;

    // Rough payload budget per request in characters. The local model
    // has a fixed context (e.g. 4096); keep batches well under it.
    // ~3.5 chars/token, so 3500 chars ≈ 1000 tokens of source text,
    // leaving room for the ~700-token instruction prompt + output.
    const MAX_BATCH_CHARS = 3500;

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
    const resolvedLanguage = LOCALE_TO_LANGUAGE[destlang] ?? destlang;

    // Tone handling: mirror the single-line getTransKobold behaviour
    // (formal adds a per-language politeness hint).
    let toneForPrompt = OpenAITone;
    if (OpenAITone === "formal") {
        if (destlang === "nl") toneForPrompt = OpenAITone + " and use 'u' instead of 'je'";
        else if (destlang === "de") toneForPrompt = OpenAITone + " and use 'Sie' instead of 'du'";
        else if (destlang === "fr") toneForPrompt = OpenAITone + " use 'vous' instead of 'tu'";
    }

    // Strip [[COMMENT]] note lines, then fill static placeholders once
    // — language and tone never change.
    OpenAIPrompt = stripPromptComments(OpenAIPrompt);
    const basePrompt = applyPromptBaseKobold(OpenAIPrompt, resolvedLanguage, toneForPrompt);

    /****************************************************
     * TOKEN-AWARE BATCH BUILDING (identical to Groq)
     * A batch closes at batchSize items OR MAX_BATCH_CHARS,
     * whichever first. A plural group is never split.
     ****************************************************/
    const batches = [];
    {
        let current = [];
        let currentChars = 0;
        for (const group of batchQueue) {
            const groupChars = group.items.reduce(
                (n, it) => n + (it.original?.length ?? 0), 0
            );
            const wouldOverflow = current.length > 0 && (
                current.flatMap(g => g.items).length >= batchSize ||
                currentChars + groupChars > MAX_BATCH_CHARS
            );
            if (wouldOverflow) {
                batches.push(current);
                current = [];
                currentChars = 0;
            }
            current.push(group);
            currentChars += groupChars;
        }
        if (current.length) batches.push(current);
    }

    // Items the model omitted — retried in a final sweep.
    const missedItems = [];

    for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi];
        const allItems = batch.flatMap(b => b.items);

        /****************************************************
         * PREPROCESS + GLOSSARY PRUNING (parallel per item)
         ****************************************************/
        const enrichedItems = await Promise.all(
            allItems.map(async item => {
                const [preprocessed, prunedGlossary] = await Promise.all([
                    preProcessOriginal(item.original, replacePreVerb, "KoboldCPP"),
                    pruneGlossary(openAiGloss, item.original, null)
                ]);
                return {
                    id: item.id, line: item.line,
                    text: item.original, preprocessed,
                    glossary: prunedGlossary || "",
                    context: item.context || ""
                };
            })
        );

        // Attach pruned glossary + preprocessed text back onto the
        // batch items for enforcement + the retry sweep.
        for (const group of batch) {
            for (const item of group.items) {
                const match = enrichedItems.find(en =>
                    en.id === item.id && en.line === item.line);
                if (match) {
                    item.glossary = match.glossary;
                    item.preprocessed = match.preprocessed;
                }
            }
        }

        // Merge per-item glossaries for the prompt placeholder.
        const mergedGlossary = !KOBOLD_USE_MERGED_GLOSSARY ? "" : (() => {
            const seen = new Map();
            for (const item of enrichedItems) {
                if (!item.glossary) continue;
                for (const line of String(item.glossary).split(/,\s*|\n/)) {
                    const m = line.match(/"(.+?)"\s*->\s*"(.+?)"/);
                    if (m && !seen.has(m[1])) seen.set(m[1], m[2]);
                }
            }
            return Array.from(seen.entries()).map(([s, t]) => `"${s}" -> "${t}"`).join("\n");
        })();

        // Build payload with per-item "g" glossary and optional "c" context.
        const promptItems = enrichedItems.map(({ id, preprocessed, glossary, context }) => ({
            i: id,
            t: preprocessed || "",
            ...(glossary ? { g: glossary } : {}),
            ...(context ? { c: context } : {})
        }));

        const fullPrompt = applyPromptBatchKobold(
            basePrompt, JSON.stringify(promptItems), mergedGlossary
        );

        // Single user message, matching the single-line KoboldCPP path.
        const messages = [{ role: "user", content: fullPrompt }];

        // Estimate max_tokens: prompt tokens + room for the JSON output.
        // The output roughly mirrors the input size (translations are
        // similar length to sources) plus JSON overhead, so budget
        // generously but bounded.
        const promptTokens = (typeof estimateMaxTokens === "function")
            ? estimateMaxTokens(fullPrompt)
            : Math.ceil(fullPrompt.length / 3.5);
        const outputTokens = (typeof estimateMaxTokens === "function")
            ? estimateMaxTokens(JSON.stringify(promptItems)) + 200
            : Math.ceil(JSON.stringify(promptItems).length / 3.5) + 200;
        const batchMaxTokens = promptTokens + outputTokens;

        let parsed = null;

        for (let attempt = 0; attempt <= maxParseRetries; attempt++) {

            if (attempt > 0) {
                showTranslationSpinner(__(
                    "Model returned prose — correction attempt " + attempt + "/" + maxParseRetries + "…"
                ));
            }

            const start = Date.now();
            const response = await callKobold(messages, koboldUrl, OpenAItemp, batchMaxTokens);
            const duration = ((Date.now() - start) / 1000).toFixed(2);
            if (typeof DebugMode !== "undefined" && toBoolean(DebugMode)) {
                console.debug("[Kobold] batch " + (bi + 1) + "/" + batches.length +
                    " (" + allItems.length + " items) responded in " + duration + "s");
            }

            if (!response || response.error) {
                hideTranslationSpinner();
                const progressbar = document.querySelector(".indeterminate-progress-bar");
                if (progressbar) progressbar.style.display = "none";
                const msg = response?.error
                    ? (typeof response.error === "string" ? response.error : JSON.stringify(response.error, null, 2))
                    : "KoboldCPP returned no response";
                messageBox("error", "KoboldCPP error:<br>" + msg);
                return "STOPPED";
            }

            // The proxy returns the raw string in result.result (same as
            // single-line). parseKobold accepts that shape directly.
            const rawContent = typeof response.result === "string"
                ? response.result
                : (response?.result?.choices?.[0]?.message?.content ?? "");

            parsed = parseKobold(response);

            if (parsed) {
                hideTranslationSpinner();
                break;
            }

            if (attempt < maxParseRetries) {
                // Conversation-based correction: show the model its own
                // output and demand the strict JSON format.
                messages.push({ role: "assistant", content: rawContent });
                messages.push({
                    role: "user",
                    content: "Your previous response was not valid JSON in the required format. " +
                        "Return ONLY a JSON object exactly like this, nothing else: " +
                        "{\"results\":[{\"i\":\"<echo the input i unchanged>\",\"tr\":\"<the translation>\"}]} " +
                        "The translation key MUST be 'tr'. " +
                        "Do NOT include the 'g' field in your output — it is input-only. " +
                        "No prose, no markdown, no explanations. " +
                        "Tone: " + OpenAITone + ". Target language: " + resolvedLanguage + "."
                });
                await koboldDelay(300);
            }
        }

        if (!parsed) {
            hideTranslationSpinner();
            console.error("[Kobold] All attempts failed for batch " + (bi + 1) +
                "/" + batches.length + " — queueing its items for the retry sweep.");
            for (const group of batch) {
                for (const item of group.items) {
                    missedItems.push({ group, item });
                }
            }
            continue;
        }

        // Write results — match by id, use position for plurals.
        for (const group of batch) {
            for (const item of group.items) {
                const allForId = parsed.filter(r =>
                    normalizeIdKobold(r.i ?? "") === normalizeIdKobold(item.id));
                const lineIndex = Number(item.line ?? 1) - 1;
                const res = allForId[lineIndex] ?? allForId[0] ?? null;

                if (!res) {
                    console.warn("[Kobold] No match for id=" + item.id + " line=" + item.line +
                        " — queued for retry sweep | returned: " + parsed.map(r => r.i).join(", "));
                    missedItems.push({ group, item });
                    continue;
                }

                let translation = enforceGlossaryKobold(res.tr, item.glossary);
                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, "KoboldCPP", convertToLower, spellCheckIgnore, locale
                );

                await processTransl(
                    item.original, finalText, destlang,
                    group.record, group.id, group.type,
                    String(item.line), locale, convertToLower, getBubble(group.id)
                );
            }
        }

        // NOTE: no inter-batch delay — the GPU serialises requests and
        // there are no rate limits locally, so we go straight on.
    }

    /****************************************************
     * RETRY SWEEP — re-request items the model omitted.
     * Small chunks (3) since tiny payloads are far less likely to be
     * dropped by the local 8B. Anything still missing afterwards gets
     * "No suggestions" so no row stays empty.
     ****************************************************/
    if (missedItems.length) {
        console.warn("[Kobold] Retry sweep for " + missedItems.length + " untranslated item(s)");
        showTranslationSpinner(__("Retrying " + missedItems.length + " missed line(s)…"));

        const RETRY_CHUNK = 3;
        for (let start = 0; start < missedItems.length; start += RETRY_CHUNK) {
            const chunk = missedItems.slice(start, start + RETRY_CHUNK);

            const retryPayload = chunk.map(({ item }) => ({
                i: item.id,
                t: item.preprocessed || item.original || "",
                ...(item.glossary ? { g: item.glossary } : {}),
                ...(item.context ? { c: item.context } : {})
            }));
            const retryPrompt = applyPromptBatchKobold(
                basePrompt, JSON.stringify(retryPayload), ""
            );

            const retryTokens = (typeof estimateMaxTokens === "function")
                ? estimateMaxTokens(retryPrompt) + estimateMaxTokens(JSON.stringify(retryPayload)) + 200
                : Math.ceil((retryPrompt.length + JSON.stringify(retryPayload).length) / 3.5) + 200;

            const resp = await callKobold(
                [{ role: "user", content: retryPrompt }],
                koboldUrl, OpenAItemp, retryTokens
            );
            const parsedRetry = (resp && !resp.error) ? parseKobold(resp) : null;

            for (const { group, item } of chunk) {
                const matches = parsedRetry
                    ? parsedRetry.filter(r => normalizeIdKobold(r.i ?? "") === normalizeIdKobold(item.id))
                    : [];
                const lineIndex = Number(item.line ?? 1) - 1;
                const res = matches[lineIndex] ?? matches[0] ?? null;

                let translation = res?.tr ?? "No suggestions";
                if (!res) {
                    console.warn("[Kobold] Retry sweep still no result for id=" +
                        item.id + " line=" + item.line);
                } else {
                    translation = enforceGlossaryKobold(translation, item.glossary);
                }

                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, "KoboldCPP", convertToLower, spellCheckIgnore, locale
                );

                await processTransl(
                    item.original, finalText, destlang,
                    group.record, group.id, group.type,
                    String(item.line), locale, convertToLower, getBubble(group.id)
                );
            }
        }
        hideTranslationSpinner();
    }

    hideTranslationSpinner();

    const progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar) progressbar.style.display = "none";
    messageBox("info", __("Translation is ready"));
    return "OK";
}