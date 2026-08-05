/****************************************************
 * OPENAI / CEREBRAS BATCH TRANSLATE PAGE
 * Version: 2026-08-04.1
 *
 * Mirrors translatePageGroq() — same page walk, same immediate/local
 * queue, same plural handling, same token-aware batching, same
 * {"i","t","g","c"} -> {"results":[{"i","tr"}]} JSON contract, same
 * tolerant parser + retry sweep, and the same per-row write-back via
 * postProcessTranslation() + processTransl().
 *
 * DIFFERENCES vs Groq (deliberate):
 *   - No fallback chain / per-model cooldown / live-model list /
 *     dead-model blacklist. OpenAI & Cerebras use ONE selected model,
 *     so callGroqWithRetry's model rotation is replaced by a simple
 *     bounded retry (429 / 5xx / channel error) with backoff.
 *   - Request params are built by the shared buildRequestParams()
 *     helper (below), which ALSO powers the single-line getTransOpenAI.
 *     That helper owns the GPT-5 param map, the Cerebras reasoning map,
 *     and the Cerebras 400-guard strip — one definition, both callers.
 *   - Transport is the existing background message keyed by `translator`
 *     ("OpenAI" or "cerebras"), exactly like the single-line function.
 *
 * DEPENDS ON (already in the codebase, shared with translatePageGroq):
 *   delay, normalizeId, enforceGlossary, makeBubbleCache,
 *   applyPromptBase, applyPromptBatch, parseGroq,
 *   preProcessOriginal, pruneGlossary, estimateMaxTokens,
 *   postProcessTranslation, processTransl, determineType,
 *   findTransline, checkLocale, stripPromptComments,
 *   messageBox, __, showTranslationSpinner, hideTranslationSpinner,
 *   setPreTranslationReplace, setPostTranslationReplace
 * Globals: replaceVerb, replacePreVerb, locale, Top_p, DebugMode
 *
 * IMPORTANT: buildRequestParams() must load BEFORE both this file and
 * the single-line getTransOpenAI file (or live in a shared util both
 * include). It is defined here.
 ****************************************************/

if (typeof OPENAI_TRANSLATE_VERSION === "undefined") {
    var OPENAI_TRANSLATE_VERSION = "2026-08-04.1";
}

// Session 429 counter — snapshot before/after each batch to detect
// whether THIS batch was rate-limited (drives the adaptive delay).
if (typeof OPENAI_RATE_TRACKER === "undefined") {
    var OPENAI_RATE_TRACKER = { hits429: 0 };
}

/****************************************************
 * NOTE: buildRequestParams() now lives in functions.js (loaded before
 * this file and before the single-line getTransOpenAI), so the GPT-5
 * map, the Cerebras reasoning map, and the 400-guard strip are defined
 * once and shared by both the single-line and batch translators.
 ****************************************************/

/****************************************************
 * API CALL  (OpenAI / Cerebras)
 * Sends via the existing background message keyed by `translator`
 * ("OpenAI" or "cerebras"). Same transport as the single-line fn.
 ****************************************************/
async function callOpenAI(messages, auth, mymodel, temp, translator, maxTokens) {
    const dataNew = buildRequestParams(mymodel, translator, messages, maxTokens, auth, { OpenAItemp: temp });
    const startTime = performance.now();
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: translator, data: dataNew }, res => {
            if (chrome.runtime.lastError) {
                resolve({ error: { status: 0, message: chrome.runtime.lastError.message, type: "channel_error" } });
                return;
            }
            if (toBoolean(DebugMode)) {
                console.debug("[" + translator + "] response time:",
                    (performance.now() - startTime).toFixed(2), "ms");
            }
            resolve(res);
        });
    });
}

/****************************************************
 * API CALL WITH RETRY  (no model rotation)
 * Retries transient failures — 429, 5xx, and channel errors —
 * with exponential backoff. Hard errors (400/401/403/404) return
 * immediately so the caller can surface them.
 ****************************************************/
async function callOpenAIWithRetry(messages, auth, mymodel, temp, translator, maxTokens, maxRetries = 5) {
    let lastResponse = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await callOpenAI(messages, auth, mymodel, temp, translator, maxTokens);
        lastResponse = response;

        if (response && !response.error) return response;

        // Normalize status from structured object OR legacy string
        let status = NaN;
        if (response?.error && typeof response.error === 'object') {
            status = Number(response.error.status);
        } else {
            const m = String(response?.error ?? "").match(/\((\d+)\)/);
            status = m ? Number(m[1]) : NaN;
        }
        const isChannel = response?.error?.type === "channel_error";
        const isTransient = status === 429 || status >= 500 || isChannel;

        if (!isTransient || attempt >= maxRetries) return response;

        if (status === 429) OPENAI_RATE_TRACKER.hits429++;

        const base = status === 429 ? 5000 : 3000;
        const waitMs = Math.min(base * Math.pow(2, attempt), 60000) + Math.random() * 1000;

        hideTranslationSpinner();
        showTranslationSpinner(__(
            (status === 429 ? "Rate limited" : "Server error") +
            " — retrying in " + Math.ceil(waitMs / 1000) + "s"
        ));
        console.warn("[" + translator + "] " + (status || "channel") +
            " — retrying in " + Math.ceil(waitMs / 1000) + "s (attempt " +
            (attempt + 2) + "/" + (maxRetries + 1) + ")");
        await delay(waitMs);
    }

    return lastResponse ?? { error: { status: 429, message: "Max retries exceeded" } };
}

/****************************************************
 * MAIN
 ****************************************************/
async function translatePageOpenAI(
    apikeyOpenAI,
    OpenAIPrompt,
    translator,
    destlang,
    preTranslationReplace,
    postTranslationReplace,
    formal,
    convertToLower,
    OpenAISelect,
    OpenAItemp,
    spellCheckIgnore,
    OpenAITone,
    openAiGloss,
    URL,
    openaiBatchSize = 10
) {
    console.info("[" + translator + "] translatePageOpenAI version " + OPENAI_TRANSLATE_VERSION);

    // Only OpenAI / Cerebras are handled by this transport
    const supported = ['OpenAI', 'cerebras'];
    if (!supported.includes(translator)) {
        console.error("Unknown translator:", translator);
        messageBox("error", "Unknown translator: " + translator);
        return "NOK";
    }

    const mymodel = String(OpenAISelect || "").toLowerCase();
    if (!mymodel || mymodel === 'undefined') {
        messageBox("error", "You did not set the model!<br> Please check your options");
        return "NOK";
    }

    // Endpoint + auth (Cerebras uses the passed-in URL, OpenAI is fixed)
    const myURL = (translator === 'cerebras') ? URL : 'https://api.openai.com/v1/chat/completions';
    const auth = { apiKey: apikeyOpenAI, URL: myURL };

    // Preprocessing mode tag — kept as "groq" to match the proven
    // single-line getTransOpenAI behaviour (preProcessOriginal branches
    // on this; "groq" is what the single-line path uses).
    const PREPROCESS_MODE = "groq";

    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    const getBubble = makeBubbleCache();

    const rows = document.querySelectorAll(
        "tr.editor div.editor-panel__left div.panel-content"
    );

    const batchQueue = [];
    const immediateQueue = [];

    /****************************************************
     * SCAN — classify every row (plural check first)
     ****************************************************/
    function stripPluralLabel(text) {
        const lines = (text || "").split("\n");
        return lines.length > 1 ? lines.slice(1).join("\n").trim() : (text || "").trim();
    }

    for (const e of rows) {
        const rowfound = e.closest("tr.editor")?.id;
        if (!rowfound) continue;

        const match = rowfound.match(/^editor-(\d+(?:-\d+)*)$/);
        const rowId = match?.[1];
        if (!rowId) continue;

        const original = e.querySelector("span.original-raw")?.innerText;
        if (!original) continue;

        // Optional per-item translation context from the "context bubble".
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
     * LOCAL LABEL
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
     * IMMEDIATE — process local rows without an API call
     ****************************************************/
    for (const item of immediateQueue) {

        // Pretranslated plural
        if (item.pluralForms) {
            for (let fi = 0; fi < item.pluralForms.length; fi++) {
                const form = item.pluralForms[fi];
                const preprocessed = await preProcessOriginal(form.original, replacePreVerb, PREPROCESS_MODE);
                const finalText = await postProcessTranslation(
                    form.original, form.translation, replaceVerb,
                    preprocessed, translator, convertToLower, spellCheckIgnore, locale
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

        // Pretranslated single
        if (!item.render) {
            const preprocessed = await preProcessOriginal(item.original, replacePreVerb, PREPROCESS_MODE);
            const finalText = await postProcessTranslation(
                item.original, item.translation, replaceVerb,
                preprocessed, translator, convertToLower, spellCheckIgnore, locale
            );
            await processTransl(
                item.original, finalText, destlang, item.record,
                item.id, "single", "", locale, convertToLower, getBubble(item.id)
            );
            addLocalLabel(item.id);
            continue;
        }

        // name / URL
        const preprocessed = await preProcessOriginal(item.original, replacePreVerb, PREPROCESS_MODE);
        const finalText = await postProcessTranslation(
            item.original, item.translation, replaceVerb,
            preprocessed, translator, convertToLower, spellCheckIgnore, locale
        );
        await processTransl(
            item.original, finalText, destlang, item.record,
            item.id, "single", "", locale, convertToLower, getBubble(item.id)
        );
    }

    /****************************************************
     * BATCH — translate via OpenAI / Cerebras
     ****************************************************/
    const batchSize = Number(openaiBatchSize) || 10;
    const maxParseRetries = 2;
    let consecutiveRateLimits = 0;

    // Send merged glossary via {{glossary}} AND per-item "g" (same as
    // Groq). Set false to rely on the per-item "g" field only.
    const USE_MERGED_GLOSSARY = true;

    // Base pause between batches when no 429 was hit (plus jitter).
    const INTER_BATCH_DELAY_MS = 1200;

    // Rough payload budget per request in characters (~1 token / 3.5 chars).
    const MAX_BATCH_CHARS = 6000;

    const LOCALE_TO_LANGUAGE = {
        af: "Afrikaans", ar: "Arabic", bg: "Bulgarian", bn: "Bengali",
        cs: "Czech", da: "Danish", de: "German", el: "Greek", es: "Spanish",
        et: "Estonian", fa: "Persian", fi: "Finnish", fr: "French",
        he: "Hebrew", hi: "Hindi", hr: "Croatian", hu: "Hungarian",
        hy: "Armenian", id: "Indonesian", it: "Italian", ja: "Japanese",
        ka: "Georgian", ko: "Korean", lt: "Lithuanian", lv: "Latvian",
        mk: "Macedonian", ms: "Malay", nl: "Dutch", no: "Norwegian",
        pl: "Polish", pt: "Portuguese", ro: "Romanian", ru: "Russian",
        sk: "Slovak", sl: "Slovenian", sq: "Albanian", sr: "Serbian",
        sv: "Swedish", th: "Thai", tr: "Turkish", uk: "Ukrainian",
        ur: "Urdu", vi: "Vietnamese", zh: "Chinese"
    };
    const resolvedLanguage = LOCALE_TO_LANGUAGE[destlang] ?? destlang;

    // Strip [[COMMENT]] lines, then fill static placeholders once.
    if (typeof stripPromptComments === "function") {
        OpenAIPrompt = stripPromptComments(OpenAIPrompt);
    }
    const basePrompt = applyPromptBase(OpenAIPrompt, resolvedLanguage, OpenAITone);

    /****************************************************
     * TOKEN-AWARE BATCH BUILDING
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
                    preProcessOriginal(item.original, replacePreVerb, PREPROCESS_MODE),
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

        // Attach pruned glossary + preprocessed back onto batch items
        // for the enforcement step and the retry sweep.
        for (const group of batch) {
            for (const item of group.items) {
                const en = enrichedItems.find(x => x.id === item.id && x.line === item.line);
                if (en) {
                    item.glossary = en.glossary;
                    item.preprocessed = en.preprocessed;
                }
            }
        }

        // Merge per-item glossaries for the {{glossary}} placeholder
        const mergedGlossary = !USE_MERGED_GLOSSARY ? "" : (() => {
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

        // Build payload with per-item "g" glossary and optional "c" context
        const promptItems = enrichedItems.map(({ id, preprocessed, glossary, context }) => ({
            i: id,
            t: preprocessed || "",
            ...(glossary ? { g: glossary } : {}),
            ...(context ? { c: context } : {})
        }));

        const userPrompt = applyPromptBatch(basePrompt, JSON.stringify(promptItems), mergedGlossary);
        const messages = [{ role: "user", content: userPrompt }];

        // Output budget: proportional to payload, with headroom. Reasoning
        // models (gpt-oss, GPT-5 family) also spend this budget on thinking,
        // so keep it generous or the JSON gets truncated. Tunable.
        const maxTokens = Math.max(1024, estimateMaxTokens(JSON.stringify(promptItems)) * 2);

        let parsed = null;
        const hits429Before = OPENAI_RATE_TRACKER.hits429;

        for (let attempt = 0; attempt <= maxParseRetries; attempt++) {
            if (attempt > 0) {
                showTranslationSpinner(__(
                    "Model returned prose — correction attempt " + attempt + "/" + maxParseRetries + "…"
                ));
            }

            const response = await callOpenAIWithRetry(
                messages, auth, mymodel, OpenAItemp, translator, maxTokens
            );

            if (!response || response.error) {
                hideTranslationSpinner();
                const progressbar = document.querySelector(".indeterminate-progress-bar");
                if (progressbar) progressbar.style.display = "none";
                const errText = typeof response?.error === 'object'
                    ? JSON.stringify(response.error, null, 2)
                    : String(response?.error ?? "unknown");
                alert(translator + " error:\n\n" + errText);
                return "STOPPED";
            }

            const rawContent = response?.result?.choices?.[0]?.message?.content ?? "";
            parsed = parseGroq(response);   // generic {"results":[{i,tr}]} parser, strips <think>

            if (parsed) {
                hideTranslationSpinner();
                break;
            }

            if (attempt < maxParseRetries) {
                messages.push({ role: "assistant", content: rawContent });
                messages.push({
                    role: "user",
                    content: "Your previous response used wrong output keys. " +
                        "Return ONLY a JSON object in this exact format: " +
                        "{\"results\":[{\"i\":\"<echo input i unchanged>\",\"tr\":\"<translation>\"}]} " +
                        "The translation key MUST be 'tr', NOT 't'. " +
                        "Do NOT include the 'g' or 'c' fields in your output — they are input-only. " +
                        "No prose, no markdown, no headers, no notes. " +
                        "Tone: " + OpenAITone + ". Target language: " + resolvedLanguage + "."
                });
                await delay(1200);
            }
        }

        const wasRateLimited = OPENAI_RATE_TRACKER.hits429 > hits429Before;
        consecutiveRateLimits = wasRateLimited ? consecutiveRateLimits + 1 : 0;

        if (!parsed) {
            hideTranslationSpinner();
            console.error("[" + translator + "] All attempts failed for batch " +
                (bi + 1) + "/" + batches.length + " — queueing items for retry sweep.");
            for (const group of batch) {
                for (const item of group.items) {
                    missedItems.push({ group, item });
                }
            }
            continue;
        }

        // Write results — match by id, use position for plural lines
        for (const group of batch) {
            for (const item of group.items) {
                const allForId = parsed.filter(r => normalizeId(r.i ?? "") === normalizeId(item.id));
                const lineIndex = Number(item.line ?? 1) - 1;
                const res = allForId[lineIndex] ?? allForId[0] ?? null;

                if (!res) {
                    console.warn("[" + translator + "] No match for id=" + item.id +
                        " line=" + item.line + " — queued for retry sweep");
                    missedItems.push({ group, item });
                    continue;
                }

                let translation = enforceGlossary(res.tr, item.glossary);
                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, translator, convertToLower, spellCheckIgnore, locale
                );

                await processTransl(
                    item.original, finalText, destlang,
                    group.record, group.id, group.type,
                    String(item.line), locale, convertToLower, getBubble(group.id)
                );
            }
        }

        // Adaptive inter-batch delay based on 429 pressure
        const isLastBatch = bi === batches.length - 1;
        if (!isLastBatch) {
            const interBatchDelay = consecutiveRateLimits >= 2 ? 30000
                : consecutiveRateLimits === 1 ? 15000
                : INTER_BATCH_DELAY_MS + Math.random() * 2000;
            hideTranslationSpinner();
            await delay(interBatchDelay);
        }
    }

    /****************************************************
     * RETRY SWEEP — re-request items the model omitted
     ****************************************************/
    if (missedItems.length) {
        console.warn("[" + translator + "] Retry sweep for " + missedItems.length + " untranslated item(s)");
        showTranslationSpinner(__("Retrying " + missedItems.length + " missed line(s)…"));

        const RETRY_CHUNK = 5;
        for (let start = 0; start < missedItems.length; start += RETRY_CHUNK) {
            const chunk = missedItems.slice(start, start + RETRY_CHUNK);

            const retryPayload = chunk.map(({ item }) => ({
                i: item.id,
                t: item.preprocessed || item.original || "",
                ...(item.glossary ? { g: item.glossary } : {}),
                ...(item.context ? { c: item.context } : {})
            }));
            const retryPrompt = applyPromptBatch(basePrompt, JSON.stringify(retryPayload), "");
            const retryMaxTokens = Math.max(1024, estimateMaxTokens(JSON.stringify(retryPayload)) * 2);

            const resp = await callOpenAIWithRetry(
                [{ role: "user", content: retryPrompt }],
                auth, mymodel, OpenAItemp, translator, retryMaxTokens
            );
            const parsedRetry = (resp && !resp.error) ? parseGroq(resp) : null;

            for (const { group, item } of chunk) {
                const matches = parsedRetry
                    ? parsedRetry.filter(r => normalizeId(r.i ?? "") === normalizeId(item.id))
                    : [];
                const lineIndex = Number(item.line ?? 1) - 1;
                const res = matches[lineIndex] ?? matches[0] ?? null;

                let translation = res?.tr ?? "No suggestions";
                if (!res) {
                    console.warn("[" + translator + "] Retry sweep still no result for id=" +
                        item.id + " line=" + item.line);
                } else {
                    translation = enforceGlossary(translation, item.glossary);
                }

                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, translator, convertToLower, spellCheckIgnore, locale
                );

                await processTransl(
                    item.original, finalText, destlang,
                    group.record, group.id, group.type,
                    String(item.line), locale, convertToLower, getBubble(group.id)
                );
            }

            if (start + RETRY_CHUNK < missedItems.length) {
                await delay(2000);
            }
        }
        hideTranslationSpinner();
    }

    hideTranslationSpinner();

    const progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar) progressbar.style.display = "none";
    messageBox("info", __("Translation is ready"));
    return "OK";
}// JavaScript source code
