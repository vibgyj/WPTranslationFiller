/****************************************************
 * GROQ BATCH TRANSLATE PAGE
 * - Parallel preprocessing + glossary pruning
 * - Header-aware rate limit backoff with model fallback chain
 * - Conversation-based JSON correction retry
 * - Robust multi-candidate JSON parser
 * - Pretranslated singles + plurals handled locally (no Groq call)
 * - Local label added to pretranslated rows
 * - Adaptive inter-batch delay based on 429 pressure
 * - Per-item glossary embedded in JSON payload (not a shared block)
 ****************************************************/

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/****************************************************
 * TEMPLATE ENGINE
 * applyPromptBase  — fill static placeholders once before the loop
 * applyPromptBatch — fill dynamic placeholder per batch
 * applyPromptTemplate — fill all placeholders at once (legacy)
 *
 * NOTE: {{glossary}} is intentionally left empty in applyPromptBatch.
 * Glossary terms are now embedded per-item as a "g" field in the
 * JSON payload, so the model knows exactly which terms apply to
 * which string. The {{glossary}} placeholder is kept in the
 * signature for backwards compatibility with existing prompt
 * templates, but callers should update their prompts to use:
 *
 *   "Each item may include a 'g' field with glossary terms in
 *    'source -> target' format. Apply those terms when translating
 *    that specific item only. Do not include 'g' in your output."
 ****************************************************/
function applyPromptTemplate(prompt, vars) {
    return prompt
        .replace(/\{\{toLanguage\}\}/g, vars.toLanguage ?? "")
        .replace(/\{\{tone\}\}/g, vars.tone ?? "")
        .replace(/\{\{text\}\}/g, vars.text ?? "")
        .replace(/\{\{glossary\}\}/g, vars.glossary ?? "");
}

function applyPromptBase(prompt, toLanguage, tone) {
    return prompt
        .replace(/\{\{toLanguage\}\}/g, toLanguage ?? "")
        .replace(/\{\{tone\}\}/g, tone ?? "");
}

function applyPromptBatch(basePrompt, text, glossary) {
    return basePrompt
        .replace(/\{\{text\}\}/g, text ?? "")
        .replace(/\{\{glossary\}\}/g, glossary ?? "");
}

/****************************************************
 * GROQ CALL
 * Accepts a messages array so correction retries
 * can include conversation history.
 ****************************************************/
async function callGroq(messages, apikey, model, temp) {
    const startTime = performance.now();
    const data = {
        model: String(model),
        messages,
        temperature: Number(temp ?? 0),
        top_p: 1,
        apiKey: apikey
    };
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "groq", data }, res => {
            console.debug("GROQ RESPONSE TIME:", (performance.now() - startTime).toFixed(2), "ms");
            resolve(res);
        });
    });
}

/****************************************************
 * GROQ MODEL FALLBACK CHAIN
 *
 * Free tier limits (Mar 2026):
 * llama-3.3-70b-versatile      30 RPM  1,000 RPD  12,000 TPM
 * llama-3.1-8b-instant         30 RPM 14,400 RPD   6,000 TPM
 * meta-llama/llama-4-scout...  30 RPM  1,000 RPD  30,000 TPM
 * moonshotai/kimi-k2-instruct  60 RPM  1,000 RPD  10,000 TPM
 * qwen/qwen3-32b               60 RPM  1,000 RPD   6,000 TPM
 *
 * On each 429, advance one step through the chain.
 ****************************************************/
if (typeof GROQ_FALLBACK_CHAIN === "undefined") {
    var GROQ_FALLBACK_CHAIN = [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.1-8b-instant",
        "moonshotai/kimi-k2-instruct",
        "llama-3.3-70b-versatile"
    ];
}

/****************************************************
 * GROQ CALL WITH RETRY + HEADER-AWARE BACKOFF
 *
 * Wait time priority:
 *   1. x-ratelimit-reset headers from background script
 *   2. "try again in Xs" in the error body
 *   3. Safe defaults: TPM→15s, RPM→62s
 ****************************************************/
async function callGroqWithRetry(messages, apikey, model, temp, maxRetries = 5) {
    let attempt = 0;
    let activeModel = model;
    const fallbackSequence = [model, ...GROQ_FALLBACK_CHAIN.filter(m => m !== model)];
    let fallbackIndex = 0;

    function parseResetDuration(str) {
        if (!str) return null;
        const m = String(str).match(/(?:(\d+)m\s*)?([\d.]+)s/);
        if (!m) return null;
        return ((parseFloat(m[1] || 0) * 60) + parseFloat(m[2])) * 1000;
    }

    while (true) {
        const response = await callGroq(messages, apikey, activeModel, temp);

        if (response && !response.error) return response;

        const status = response?.error?.status ?? response?.error?.statusCode;
        const isTransient = status === 429 || status >= 500;

        if (!isTransient || attempt >= maxRetries) return response;

        const errMsg = String(response?.error?.message ?? "").toLowerCase();
        const limitType = errMsg.includes("tokens") ? "TPM" : "RPM";

        let waitMs = null;

        const rl = response?.rateLimit;
        if (rl) {
            const headerReset = limitType === "TPM"
                ? parseResetDuration(rl.resetTokens)
                : parseResetDuration(rl.resetRequests);
            if (headerReset !== null) waitMs = headerReset + 1000;
        }

        if (waitMs === null) {
            const bodyMatch = errMsg.match(/(?:try again in|retry after)\s*([\d.]+)\s*s/);
            if (bodyMatch) waitMs = (parseFloat(bodyMatch[1]) + 1) * 1000;
        }

        if (waitMs === null) {
            waitMs = limitType === "TPM" ? 15000 : 62000;
        }

        fallbackIndex = Math.min(fallbackIndex + 1, fallbackSequence.length - 1);
        activeModel = fallbackSequence[fallbackIndex];
        if (activeModel !== model) {
            console.warn("[Groq] Switching to fallback " + fallbackIndex +
                "/" + (fallbackSequence.length - 1) + ": " + activeModel);
        }

        let remaining = Math.ceil(waitMs / 1000);
        const fallbackNote = activeModel !== model ? " \u2192 " + activeModel : "";

        console.warn("[Groq] 429 (" + limitType + ") — waiting " + remaining +
            "s before attempt " + (attempt + 2) + "/" + (maxRetries + 1) +
            " | model: " + activeModel);

        function updateSpinner(sec) {
            hideTranslationSpinner();
            showTranslationSpinner(__("Rate limited — retrying in " + sec + "s" + fallbackNote));
        }

        updateSpinner(remaining);
        const ticker = setInterval(() => {
            remaining--;
            if (remaining > 0) updateSpinner(remaining);
        }, 1000);

        await delay(waitMs);
        clearInterval(ticker);
        attempt++;
    }
}

/****************************************************
 * PARSER
 * 1. Strip <think> blocks
 * 2. Strip markdown fences
 * 3. Collect all top-level {...} candidates
 * 4. Return the largest candidate that has a valid
 *    results array with i + tr keys on every item
 ****************************************************/
function parseGroq(result) {
    try {
        let text = result?.result?.choices?.[0]?.message?.content;
        if (!text) return null;

        //console.debug("GROQ RAW RESPONSE:\n", text);

        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        text = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

        // Fix extra closing braces the model sometimes adds before ]} or ]}
        // e.g. ...value"}}]} → ...value"}]}
        text = text.replace(/\}\}\]/g, "}]").replace(/\}\}\]\}/g, "}]}");

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
            console.warn("[Groq] No JSON candidates found in response:", text);
            return null;
        }

        // Two-pass evaluation last-to-first:
        // Pass 1: prefer proper {results:[...]} objects over bare arrays
        // Pass 2: accept bare arrays as fallback
        candidates.reverse();

        function tryParseCandidate(candidate, requireResultsKey) {
            try {
                const parsed = JSON.parse(candidate);
                if (requireResultsKey && !parsed.results) return null;
                const normalised = Array.isArray(parsed) ? { results: parsed } : parsed;
                if (!Array.isArray(normalised.results) || normalised.results.length === 0) return null;
                const results = normalised.results;
                for (const r of results) {
                    if (!("i"  in r) && "id"          in r) r.i  = r.id;
                    if (!("tr" in r) && "t"            in r) r.tr = r.t;
                    if (!("tr" in r) && "translation"  in r) r.tr = r.translation;
                }
                const badItem = results.find(r => !("i" in r) || !("tr" in r));
                if (badItem) return null;
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
                    console.warn("[Groq] Repetition loop detected — rejecting response");
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

        console.warn("[Groq] No valid results in any candidate");
        return null;

    } catch (err) {
        console.error("[Groq] Parse error:", err);
        return null;
    }
}

/****************************************************
 * HELPERS
 ****************************************************/
function normalizeId(id) {
    return String(id).replace(/\s/g, "");
}

function makeBubbleCache() {
    const cache = new Map();
    return rowId => {
        if (!cache.has(rowId)) {
            cache.set(rowId, document.querySelector("#editor-" + rowId + " span.panel-header__bubble"));
        }
        return cache.get(rowId);
    };
}

/****************************************************
 * MAIN
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
    openAiGloss,
    groqBatchSize = 10
) {
    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    const getBubble = makeBubbleCache();

    const rows = document.querySelectorAll(
        "tr.editor div.editor-panel__left div.panel-content"
    );

    const batchQueue = [];
    const immediateQueue = [];

    /****************************************************
     * SCAN — classify every row
     * Order matters:
     *   1. Plural check first (pretranslated plurals must
     *      not be swallowed by the pretranslated check)
     *   2. determineType for non-plural rows
     ****************************************************/

    // Remove the "Singular:\n" / "Plural:\n" label WordPress
    // prepends to plural original text in the preview panel.
    function stripPluralLabel(text) {
        const lines = (text || "").split("\n");
        return lines.length > 1 ? lines.slice(1).join("\n").trim() : text.trim();
    }

    for (const e of rows) {
        const rowfound = e.closest("tr.editor")?.id;
        if (!rowfound) continue;

        const match = rowfound.match(/^editor-(\d+)$/);
        const rowId = match?.[1];
        if (!rowId) continue;

        const original = e.querySelector("span.original-raw")?.innerText;
        if (!original) continue;

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
            items: [{ id: rowId, line: 1, original }]
        });
    }

    /****************************************************
     * LOCAL LABEL
     * Adds the "Local" marker to the preview translation cell.
     * For plurals, uses a MutationObserver to wait until
     * processTransl has finished rebuilding the DOM before
     * inserting — otherwise it gets wiped.
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
     * IMMEDIATE — process local rows without Groq
     ****************************************************/
    for (const item of immediateQueue) {

        // Pretranslated plural
        if (item.pluralForms) {
            for (let fi = 0; fi < item.pluralForms.length; fi++) {
                const form = item.pluralForms[fi];
                const preprocessed = await preProcessOriginal(form.original, replacePreVerb, "groq");
                const finalText = await postProcessTranslation(
                    form.original, form.translation, replaceVerb,
                    preprocessed, "groq", convertToLower, spellCheckIgnore, locale
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
            const preprocessed = await preProcessOriginal(item.original, replacePreVerb, "groq");
            const finalText = await postProcessTranslation(
                item.original, item.translation, replaceVerb,
                preprocessed, "groq", convertToLower, spellCheckIgnore, locale
            );
            await processTransl(
                item.original, finalText, destlang, item.record,
                item.id, "single", "", locale, convertToLower, getBubble(item.id)
            );
            addLocalLabel(item.id);
            continue;
        }

        // name / URL
        const preprocessed = await preProcessOriginal(item.original, replacePreVerb, "groq");
        const finalText = await postProcessTranslation(
            item.original, item.translation, replaceVerb,
            preprocessed, "groq", convertToLower, spellCheckIgnore, locale
        );
        await processTransl(
            item.original, finalText, destlang, item.record,
            item.id, "single", "", locale, convertToLower, getBubble(item.id)
        );
    }

    /****************************************************
     * BATCH — translate via Groq
     ****************************************************/
    const batchSize = Number(groqBatchSize) || 10;
    const maxParseRetries = 2;
    let consecutiveRateLimits = 0;

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

    // Fill static placeholders once — language and tone never change between batches
    const basePrompt = applyPromptBase(OpenAIPrompt, resolvedLanguage, OpenAITone);

    for (let i = 0; i < batchQueue.length; i += batchSize) {
        const batch = batchQueue.slice(i, i + batchSize);
        const allItems = batch.flatMap(b => b.items);

        /****************************************************
         * PREPROCESS + GLOSSARY PRUNING (parallel per item)
         *
         * Each item gets its own pruned glossary. This is passed
         * in TWO places:
         *   1. {{glossary}} in the prompt — merged across all items,
         *      visible in the ### Glossary section
         *   2. "g" field per item in the JSON payload — so the model
         *      knows exactly which terms apply to each specific string
         ****************************************************/
        const enrichedItems = await Promise.all(
            allItems.map(async item => {
                const [preprocessed, prunedGlossary] = await Promise.all([
                    preProcessOriginal(item.original, replacePreVerb, "groq"),
                    pruneGlossary(openAiGloss, item.original, null)
                ]);
                return {
                    id: item.id, line: item.line,
                    text: item.original, preprocessed,
                    glossary: prunedGlossary || ""
                };
            })
        );

        // Merge all per-item glossaries for the {{glossary}} prompt placeholder
        const mergedGlossary = (() => {
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

        // Build payload with per-item "g" field for precision
        const promptItems = enrichedItems.map(({ id, preprocessed, glossary }) => ({
            i: id,
            t: preprocessed || "",
            ...(glossary ? { g: glossary } : {})
        }));

        // Pass merged glossary into {{glossary}} AND per-item g field into payload
        const systemPrompt = applyPromptBatch(basePrompt, JSON.stringify(promptItems), mergedGlossary);

        const messages = [{ role: "user", content: systemPrompt }];
        let parsed = null;

        for (let attempt = 0; attempt <= maxParseRetries; attempt++) {

            if (attempt > 0) {
                showTranslationSpinner(__(
                    "Model returned prose — correction attempt " + attempt + "/" + maxParseRetries + "…"
                ));
            }

            const response = await callGroqWithRetry(messages, apikeygroq, groqSelect, OpenAItemp);

            if (!response || response.error) {
                hideTranslationSpinner();
                const progressbar = document.querySelector(".indeterminate-progress-bar");
                if (progressbar) progressbar.style.display = "none";
                alert("Groq error:\n\n" + JSON.stringify(response?.error, null, 2));
                return "STOPPED";
            }

            if (response.ok) {
                consecutiveRateLimits = 0;
            } else if ((response?.error?.status ?? response?.error?.statusCode) === 429) {
                consecutiveRateLimits++;
            }

            const rawContent = response?.result?.choices?.[0]?.message?.content ?? "";
            parsed = parseGroq(response);

            if (parsed) {
                hideTranslationSpinner();
                break;
            }

            console.warn("[Groq] Attempt " + (attempt + 1) + " returned no valid JSON.\n" +
                "--- RAW RESPONSE ---\n" + rawContent + "\n--- END ---");

            if (attempt < maxParseRetries) {
                messages.push({ role: "assistant", content: rawContent });
                messages.push({
                    role: "user",
                    content: "Your previous response used wrong output keys. " +
                        "Return ONLY a JSON object in this exact format: " +
                        "{\"results\":[{\"i\":\"<echo input i unchanged>\",\"tr\":\"<translation>\"}]} " +
                        "The translation key MUST be 'tr', NOT 't'. " +
                        "Do NOT include the 'g' field in your output — it is input-only. " +
                        "No prose, no markdown, no headers, no notes. " +
                        "Tone: " + OpenAITone + ". Target language: " + resolvedLanguage + "."
                });
                await delay(1500);
            }
        }

        if (!parsed) {
            hideTranslationSpinner();
            console.error("[Groq] All attempts failed for batch at index " + i + ". Skipping.");
            continue;
        }

        // Write results — match by id, use position for plurals
        for (const group of batch) {
            for (const item of group.items) {
                const allForId = parsed.filter(r => normalizeId(r.i ?? "") === normalizeId(item.id));
                const lineIndex = Number(item.line ?? 1) - 1;
                const res = allForId[lineIndex] ?? allForId[0] ?? null;

                if (!res) {
                    console.warn("[Groq] No match for id=" + item.id + " line=" + item.line +
                        " | returned: " + parsed.map(r => r.i).join(", "));
                }

                let translation = res?.tr ?? "No suggestions";
                //console.debug("WRITING ROW id=" + group.id + " line=" + item.line + " translation=" + translation);

                // Post-process: enforce glossary in JS after model response
                if (item.glossary) {
                    for (const line of String(item.glossary).split(/,\s*|\n/)) {
                        const m = line.match(/"(.+?)"\s*->\s*"(.+?)"/);
                        if (!m) continue;
                        const source = m[1];
                        const target = m[2];
                        if (source.toLowerCase() === target.toLowerCase()) continue;
                        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\$&");
                        translation = translation.replace(
                            new RegExp("\b" + escaped + "\b", "gi"), target
                        );
                    }
                }

                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, "groq", convertToLower, spellCheckIgnore, locale
                );

                await processTransl(
                    item.original, finalText, destlang,
                    group.record, group.id, group.type,
                    String(item.line), locale, convertToLower, getBubble(group.id)
                );
            }
        }

        // Adaptive inter-batch delay based on 429 pressure
        const isLastBatch = i + batchSize >= batchQueue.length;
        if (!isLastBatch) {
            const interBatchDelay = consecutiveRateLimits >= 2 ? 35000
                : consecutiveRateLimits === 1 ? 20000
                : 5000 + Math.random() * 2000;
            hideTranslationSpinner();
            await delay(interBatchDelay);
        }
    }

    hideTranslationSpinner();

    // Hide the progress bar started by the calling code
    const progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar) progressbar.style.display = "none";

    return "OK";
}