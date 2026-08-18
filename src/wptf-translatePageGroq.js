/****************************************************
 * GROQ BATCH TRANSLATE PAGE
 * Version: 2026-07-30.1
 *
 * Changelog:
 * 2026-07-30.1  Added [[COMMENT]] prompt-comment stripping
 *               (stripPromptComments helper + guard, [[COMMENT]]
 *               marker only at line start) and per-item translation
 *               context: the "context bubble" is read in the scan
 *               phase, attached to single items, threaded through
 *               enrichedItems, the batch payload ("c" field) and the
 *               retry sweep. Matches the KoboldCPP batch conventions.
 * 2026-07-19.4  User-selected model always has first priority and
 *               returns automatically ("homing") when its cooldown
 *               expires; sticky model demoted to preferred fallback.
 * 2026-07-19.3  Retry sweep: items omitted from the model's JSON
 *               (and fully failed batches) are re-requested in
 *               small chunks at the end instead of immediately
 *               writing "No suggestions"; shared enforceGlossary
 *               helper.
 * 2026-07-19.2  Handle chrome.runtime.lastError in sendMessage
 *               callbacks (fixes "message port closed" noise when
 *               the groqModels background handler is missing).
 * 2026-07-19.1  Merged: version marker + runtime version log;
 *               live model-list filtering of fallback chain;
 *               runtime dead-model blacklist (decommissioned
 *               models no longer abort the run); restored await
 *               on postProcessTranslation/processTransl in the
 *               batch write loop; guarded Top_p reference.
 *
 * Features:
 * - Parallel preprocessing + glossary pruning
 * - Per-model cooldown tracking: a 429 on one model no longer
 *   blocks the others — we hop to a free model immediately
 * - Sticky fallback: once a model works, later batches start there
 * - Proactive pacing from x-ratelimit-remaining headers
 * - Live model-list check: obsolete models dropped from the chain
 * - Dead-model blacklist: decommissioned models skipped at runtime
 * - Token-aware batch sizing (count + char budget)
 * - Conversation-based JSON correction retry
 * - Robust multi-candidate JSON parser
 * - Pretranslated singles + plurals handled locally (no Groq call)
 * - Local label added to pretranslated rows
 * - Adaptive inter-batch delay based on 429 pressure
 * - Per-item glossary embedded in JSON payload (not a shared block)
 * - [[COMMENT]] prompt-comment stripping
 * - Per-item translation context ("c" field from the context bubble)
 ****************************************************/

if (typeof GROQ_TRANSLATE_VERSION === "undefined") {
    var GROQ_TRANSLATE_VERSION = "2026-07-30.1";
}

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
 *
 * For reasoning models (Gemma reasoning variants, Qwen 3.x)
 * we send reasoning_effort: "none" to disable thinking —
 * otherwise they burn TPM budget on <think> tokens and slow
 * everything down. IMPORTANT: Groq returns a 400 error if this
 * parameter is sent to a model that doesn't support it, so it
 * is only added when the model name matches the pattern below.
 ****************************************************/
if (typeof GROQ_DISABLE_REASONING_PATTERN === "undefined") {
    var GROQ_DISABLE_REASONING_PATTERN = /gemma|qwen/i;
}

async function callGroq(messages, apikey, model, temp) {
    const startTime = performance.now();
    const data = {
        model: String(model),
        messages,
        temperature: Number(temp ?? 0),
        top_p: typeof Top_p !== "undefined" ? Number(Top_p) : 1,
        apiKey: apikey
    };
    if (GROQ_DISABLE_REASONING_PATTERN.test(String(model))) {
        data.reasoning_effort = "none";
    }
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "groq", data }, res => {
            if (chrome.runtime.lastError) {
                resolve({ error: { status: 0, message: chrome.runtime.lastError.message } });
                return;
            }
            //console.debug("GROQ RESPONSE TIME:", (performance.now() - startTime).toFixed(2), "ms");
            resolve(res);
        });
    });
}

/****************************************************
 * GROQ MODEL FALLBACK CHAIN + RATE-LIMIT STATE
 *
 * Free tier limits (Mar 2026):
 * llama-3.3-70b-versatile      30 RPM  1,000 RPD  12,000 TPM
 * llama-3.1-8b-instant         30 RPM 14,400 RPD   6,000 TPM
 * meta-llama/llama-4-scout...  30 RPM  1,000 RPD  30,000 TPM
 * moonshotai/kimi-k2-instruct  60 RPM  1,000 RPD  10,000 TPM
 * qwen/qwen3-32b               60 RPM  1,000 RPD   6,000 TPM
 *
 * Groq rate limits are PER MODEL, so when one model hits 429 we
 * record a cooldown timestamp for that model only and immediately
 * try the next model in the chain instead of sleeping.
 ****************************************************/
if (typeof GROQ_FALLBACK_CHAIN === "undefined") {
    var GROQ_FALLBACK_CHAIN = [
        "qwen/qwen3.6-27b",
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b"
    ];
}

// model name -> epoch ms until which the model is rate-limited
if (typeof GROQ_MODEL_COOLDOWNS === "undefined") {
    var GROQ_MODEL_COOLDOWNS = {};
}

// Models confirmed dead at runtime (decommissioned / not found).
// Once a model lands here it is never tried again this session.
if (typeof GROQ_DEAD_MODELS === "undefined") {
    var GROQ_DEAD_MODELS = new Set();
}

// The fallback chain actually in use. Populated from the live model
// list at the start of a run; falls back to GROQ_FALLBACK_CHAIN.
if (typeof GROQ_ACTIVE_CHAIN === "undefined") {
    var GROQ_ACTIVE_CHAIN = null;
}

// Session-wide rate-limit tracker.
// hits429      : total 429s seen (outer loop reads the delta per batch)
// activeModel  : last model that answered successfully — later batches
//                start here instead of re-hitting the limited default
if (typeof GROQ_RATE_TRACKER === "undefined") {
    var GROQ_RATE_TRACKER = { hits429: 0, activeModel: null };
}

/****************************************************
 * LIVE MODEL LIST
 * Fetches the currently available models from Groq (via the
 * background script) and filters the hardcoded fallback chain
 * against it, so decommissioned models are dropped before we
 * ever try them. If the fetch fails, the hardcoded chain is
 * used unchanged — the runtime dead-model detection in
 * callGroqWithRetry still catches obsolete models in that case.
 ****************************************************/
async function fetchGroqModelIds(apikey) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(
            { action: "groqModels", data: { apiKey: apikey } },
            res => {
                // Reading lastError marks it as handled — otherwise Chrome
                // logs "Unchecked runtime.lastError" when the background
                // has no handler for this action (or forgot `return true`).
                if (chrome.runtime.lastError) {
                    console.warn("[Groq] groqModels message failed: " +
                        chrome.runtime.lastError.message);
                    resolve(null);
                    return;
                }
                const ids = res?.result?.data?.map(m => m.id);
                resolve(Array.isArray(ids) && ids.length ? ids : null);
            }
        );
    });
}

async function resolveGroqFallbackChain(apikey) {
    const live = await fetchGroqModelIds(apikey);
    if (!live) {
        console.warn("[Groq] Could not fetch live model list — using hardcoded fallback chain");
        return GROQ_FALLBACK_CHAIN;
    }
    const liveSet = new Set(live);
    const filtered = GROQ_FALLBACK_CHAIN.filter(m => liveSet.has(m));
    const dropped = GROQ_FALLBACK_CHAIN.filter(m => !liveSet.has(m));
    if (dropped.length) {
        console.warn("[Groq] Dropping obsolete models from fallback chain: " + dropped.join(", "));
    }
    if (!filtered.length) {
        console.warn("[Groq] No hardcoded fallback models exist anymore — chain needs updating! " +
            "Available models: " + live.join(", "));
        return GROQ_FALLBACK_CHAIN;
    }
    return filtered;
}

/****************************************************
 * GROQ CALL WITH RETRY + PER-MODEL COOLDOWNS
 *
 * On 429:
 *   1. Parse the wait time (headers > error body > safe default)
 *   2. Record it as a cooldown for THAT model only
 *   3. Immediately retry on the next model that is not cooling down
 *   4. Only sleep when every model in the chain is cooling down —
 *      and then only until the soonest one frees up
 *
 * On 400/404 model-decommissioned:
 *   - Blacklist that model for the session and continue with the
 *     next model instead of aborting the whole run
 *
 * On success:
 *   - Remember the model (sticky) so the next batch starts there
 *   - If the response headers show the quota is nearly exhausted,
 *     proactively mark a cooldown so we rotate BEFORE the next 429
 ****************************************************/
async function callGroqWithRetry(messages, apikey, model, temp, maxRetries = 8) {

    // The user-selected model ALWAYS has first priority — it is only
    // skipped while its cooldown is active (limit hit or pre-rotation),
    // and automatically becomes first choice again the moment the
    // cooldown expires. The last-working fallback model comes second
    // so that, while the selected model is cooling, we prefer a
    // fallback that is known to work. Dead models are excluded
    // dynamically in pickModel because the set can grow mid-run.
    const chain = GROQ_ACTIVE_CHAIN ?? GROQ_FALLBACK_CHAIN;
    const fallbackSequence = [...new Set([
        model,
        ...(GROQ_RATE_TRACKER.activeModel ? [GROQ_RATE_TRACKER.activeModel] : []),
        ...chain
    ])];

    function parseResetDuration(str) {
        if (!str) return null;
        const m = String(str).match(/(?:(\d+)m\s*)?([\d.]+)s/);
        if (!m) return null;
        return ((parseFloat(m[1] || 0) * 60) + parseFloat(m[2])) * 1000;
    }

    async function waitWithSpinner(waitMs, labelPrefix) {
        let remaining = Math.ceil(waitMs / 1000);
        const update = sec => {
            hideTranslationSpinner();
            showTranslationSpinner(__(labelPrefix + " — retrying in " + sec + "s"));
        };
        update(remaining);
        const ticker = setInterval(() => {
            remaining--;
            if (remaining > 0) update(remaining);
        }, 1000);
        await delay(waitMs);
        clearInterval(ticker);
    }

    function pickModel() {
        const now = Date.now();
        const alive = fallbackSequence.filter(m => !GROQ_DEAD_MODELS.has(m));
        if (!alive.length) return null; // every model is dead — nothing to do

        for (const m of alive) {
            if ((GROQ_MODEL_COOLDOWNS[m] ?? 0) <= now) {
                return { model: m, waitMs: 0 };
            }
        }
        // Every living model is cooling down — find the one that frees up first
        let soonestModel = alive[0];
        let soonestTime = Infinity;
        for (const m of alive) {
            const t = GROQ_MODEL_COOLDOWNS[m] ?? 0;
            if (t < soonestTime) { soonestTime = t; soonestModel = m; }
        }
        return { model: soonestModel, waitMs: Math.max(1000, soonestTime - now + 500) };
    }

    let lastResponse = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {

        const pick = pickModel();
        if (!pick) {
            console.error("[Groq] Every model in the chain is decommissioned or unavailable");
            return lastResponse ?? {
                error: { status: 404, message: "All models in the fallback chain are unavailable" }
            };
        }
        if (pick.waitMs > 0) {
            console.warn("[Groq] All models cooling down — waiting " +
                Math.ceil(pick.waitMs / 1000) + "s for " + pick.model);
            await waitWithSpinner(pick.waitMs, "Rate limited");
        }
        const activeModel = pick.model;
        if (activeModel !== model) {
            console.debug("[Groq] Using fallback model: " + activeModel);
        }

        const response = await callGroq(messages, apikey, activeModel, temp);
        lastResponse = response;

        /* ---------- SUCCESS ---------- */
        if (response && !response.error) {
            // Remember which FALLBACK worked (the selected model is
            // always first in the sequence anyway, so only track
            // alternatives here).
            GROQ_RATE_TRACKER.activeModel = activeModel !== model ? activeModel : null;

            // Proactive rotation: if the quota is nearly gone, mark a
            // cooldown NOW so the next call starts on a fresh model
            // instead of eating a 429 first.
            // (Accepts either property name from the background script.)
            const rl = response.rateLimit ?? response.rateLimitHeaders;
            if (rl) {
                const remReq = Number(rl.remainingRequests);
                const remTok = Number(rl.remainingTokens);
                if (Number.isFinite(remReq) && remReq <= 1) {
                    const ms = parseResetDuration(rl.resetRequests) ?? 60000;
                    GROQ_MODEL_COOLDOWNS[activeModel] = Date.now() + ms + 500;
                    console.debug("[Groq] " + activeModel + " requests nearly exhausted — pre-rotating");
                } else if (Number.isFinite(remTok) && remTok < 1500) {
                    const ms = parseResetDuration(rl.resetTokens) ?? 15000;
                    GROQ_MODEL_COOLDOWNS[activeModel] = Date.now() + ms + 500;
                    console.debug("[Groq] " + activeModel + " tokens nearly exhausted — pre-rotating");
                }
            }
            return response;
        }

        /* ---------- ERROR ---------- */
        const status = response?.error?.status ?? response?.error?.statusCode;
        const errLower = String(response?.error?.message ?? "").toLowerCase();

        // Decommissioned or unknown model → permanently blacklist it
        // for this session and immediately try the next model. Without
        // this, an obsolete model in the chain aborts the whole run.
        const isDeadModel = (status === 400 || status === 404) && (
            errLower.includes("decommissioned") ||
            errLower.includes("model_decommissioned") ||
            errLower.includes("model_not_found") ||
            errLower.includes("does not exist") ||
            errLower.includes("no longer supported")
        );
        if (isDeadModel) {
            GROQ_DEAD_MODELS.add(activeModel);
            if (GROQ_RATE_TRACKER.activeModel === activeModel) {
                GROQ_RATE_TRACKER.activeModel = null;
            }
            console.warn("[Groq] Model " + activeModel +
                " is decommissioned/unavailable — blacklisting and trying next model");
            continue; // does not consume the wait logic below
        }

        const isTransient = status === 429 || status >= 500;
        if (!isTransient || attempt >= maxRetries) return response;

        if (status === 429) {
            GROQ_RATE_TRACKER.hits429++;

            const limitType = errLower.includes("tokens") ? "TPM" : "RPM";

            let waitMs = null;

            const rl = response?.rateLimit ?? response?.rateLimitHeaders;
            if (rl) {
                const headerReset = limitType === "TPM"
                    ? parseResetDuration(rl.resetTokens)
                    : parseResetDuration(rl.resetRequests);
                if (headerReset !== null) waitMs = headerReset + 1000;
            }

            if (waitMs === null) {
                const bodyMatch = errLower.match(/(?:try again in|retry after)\s*([\d.]+)\s*s/);
                if (bodyMatch) waitMs = (parseFloat(bodyMatch[1]) + 1) * 1000;
            }

            if (waitMs === null) {
                waitMs = limitType === "TPM" ? 15000 : 62000;
            }

            // Cool down THIS model only; the next loop iteration will
            // pick a different model and retry almost immediately.
            GROQ_MODEL_COOLDOWNS[activeModel] = Date.now() + waitMs;
            if (GROQ_RATE_TRACKER.activeModel === activeModel) {
                GROQ_RATE_TRACKER.activeModel = null;
            }

            console.warn("[Groq] 429 (" + limitType + ") on " + activeModel +
                " — cooling down " + Math.ceil(waitMs / 1000) +
                "s, switching model (attempt " + (attempt + 2) + "/" + (maxRetries + 1) + ")");

            // Brief visible pause so the user sees the switch happen
            hideTranslationSpinner();
            showTranslationSpinner(__("Rate limited — switching model…"));
            await delay(1500);
        } else {
            console.warn("[Groq] Server error " + status + " — retrying in 3s");
            await waitWithSpinner(3000, "Server error");
        }
    }

    return lastResponse ?? { error: { message: "Max retries exceeded", status: 429 } };
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

// Enforce "source" -> "target" glossary terms on a translation
// string after the model response (belt and suspenders).
function enforceGlossary(translation, glossaryStr) {
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
   // console.info("[Groq] translatePageGroq version " + GROQ_TRANSLATE_VERSION);

    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    const getBubble = makeBubbleCache();

    const rows = document.querySelectorAll(
        "tr.editor div.editor-panel__left div.panel-content"
    );
    //console.debug("[Groq] Found " + rows.length + " rows to process")
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
        //console.debug("[Groq] Scanning row element", e, "found row id=" + rowfound)
        if (!rowfound) continue;

        const match = rowfound.match(/^editor-(\d+(?:-\d+)*)$/);
        const rowId = match?.[1];
        if (!rowId) continue;

        const original = e.querySelector("span.original-raw")?.innerText;
        //console.debug("[Groq] Scanning row id=" + rowId + " original=" + original)
        if (!original) continue;

        // Optional translation context from the "context bubble" field.
        // Safe access: not every row has one. Only single (non-plural)
        // UI strings carry meaningful context; plurals are skipped.
        const mycontext = e.getElementsByClassName("context bubble")[0]?.innerText?.trim() || "";
        //console.debug("context:",mycontext)
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

    // Sends the merged glossary via the {{glossary}} placeholder —
    // required because the current prompt template relies on it.
    // Note: the per-item "g" field carries the same terms, so both
    // are sent; if you ever move the prompt fully to the "g" field,
    // set this to false to save tokens per request.
    const GROQ_USE_MERGED_GLOSSARY = true;

    // Base pause between batches when NO rate limit was hit (plus
    // 0–2s of random jitter). Raise this if you keep hitting TPM
    // 429s: e.g. a ~3,000-token request on a 6,000 TPM model means
    // at most 2 requests per minute → set this to ~25000–30000.
    // After a 429 the delay escalates automatically (20s / 35s).
    const INTER_BATCH_DELAY_MS = 8000;

    // Rough payload budget per request, in characters (~1 token per
    // 3.5 chars). Keeps a single batch of long strings from blowing
    // through the TPM window of the smaller models in one shot.
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

    // Strip [[COMMENT]] note lines, then fill static placeholders once
    // — language and tone never change between batches.
    OpenAIPrompt = stripPromptComments(OpenAIPrompt);
    const basePrompt = applyPromptBase(OpenAIPrompt, resolvedLanguage, OpenAITone);

    // Resolve the fallback chain against Groq's live model list so
    // decommissioned models are dropped before we ever call them.
    if (batchQueue.length > 0) {
        GROQ_ACTIVE_CHAIN = await resolveGroqFallbackChain(apikeygroq);
        console.debug("[Groq] Active fallback chain: " + GROQ_ACTIVE_CHAIN.join(" \u2192 "));
    }

    /****************************************************
     * TOKEN-AWARE BATCH BUILDING
     * A batch closes when it reaches groqBatchSize items OR
     * MAX_BATCH_CHARS of source text — whichever comes first.
     * A plural group is never split across batches.
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
    //console.debug("[Groq] Built " + batches.length + " batches from " +
     //   batchQueue.length + " groups");

    // Items the model omitted from its response — retried in a
    // final sweep instead of immediately writing "No suggestions".
    const missedItems = [];

    for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi];
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
         *
         * The per-item translation context ("c") is carried through
         * from the scan phase alongside preprocessed + glossary.
         ****************************************************/
        //console.debug("glossary:",openAiGloss)
        const enrichedItems = await Promise.all(
            allItems.map(async item => {
                const [preprocessed, prunedGlossary] = await Promise.all([
                    preProcessOriginal(item.original, replacePreVerb, "groq"),
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

        // Attach the pruned glossary + preprocessed text back onto the
        // batch items so the post-processing enforcement step and the
        // missed-item retry sweep can use them. (context is already on
        // the batch item from the scan phase.)
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

        // Merge all per-item glossaries for the {{glossary}} prompt
        // placeholder (only sent when GROQ_USE_MERGED_GLOSSARY is true)
        const mergedGlossary = !GROQ_USE_MERGED_GLOSSARY ? "" : (() => {
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

        const systemPrompt = applyPromptBatch(basePrompt, JSON.stringify(promptItems), mergedGlossary);
        //console.debug("prompt:",systemPrompt)
        const messages = [{ role: "user", content: systemPrompt }];
        let parsed = null;

        // Snapshot 429 count so we can tell whether THIS batch was
        // rate-limited anywhere inside callGroqWithRetry.
        const hits429Before = GROQ_RATE_TRACKER.hits429;

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

            const rawContent = response?.result?.choices?.[0]?.message?.content ?? "";
            parsed = parseGroq(response);

            if (parsed) {
                hideTranslationSpinner();
                break;
            }

            //console.warn("[Groq] Attempt " + (attempt + 1) + " returned no valid JSON.\n" +
             //   "--- RAW RESPONSE ---\n" + rawContent + "\n--- END ---");

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

        // Did this batch hit any 429s (inside the retry wrapper)?
        const wasRateLimited = GROQ_RATE_TRACKER.hits429 > hits429Before;
        consecutiveRateLimits = wasRateLimited ? consecutiveRateLimits + 1 : 0;

        if (!parsed) {
            hideTranslationSpinner();
            console.error("[Groq] All attempts failed for batch " + (bi + 1) +
                "/" + batches.length + " — queueing its items for the retry sweep.");
            for (const group of batch) {
                for (const item of group.items) {
                    missedItems.push({ group, item });
                }
            }
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
                        " — queued for retry sweep | returned: " + parsed.map(r => r.i).join(", "));
                    missedItems.push({ group, item });
                    continue;
                }

                let translation = enforceGlossary(res.tr, item.glossary);
                //console.debug("translatedText:",translation)
                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, "groq", convertToLower, spellCheckIgnore, locale
                );
                //console.debug("finalText:", finalText)

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
            const interBatchDelay = consecutiveRateLimits >= 2 ? 35000
                : consecutiveRateLimits === 1 ? 20000
                : INTER_BATCH_DELAY_MS + Math.random() * 2000;
            hideTranslationSpinner();
            await delay(interBatchDelay);
        }
    }

    /****************************************************
     * RETRY SWEEP — re-request items the model omitted
     * Runs in small chunks (5 items) since tiny payloads are
     * far less likely to be dropped. Anything still missing
     * after this gets "No suggestions" so no row stays empty.
     * Context ("c") is carried through so missed items keep it.
     ****************************************************/
    if (missedItems.length) {
        console.warn("[Groq] Retry sweep for " + missedItems.length + " untranslated item(s)");
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
            const retryPrompt = applyPromptBatch(
                basePrompt, JSON.stringify(retryPayload), ""
            );

            const resp = await callGroqWithRetry(
                [{ role: "user", content: retryPrompt }],
                apikeygroq, groqSelect, OpenAItemp
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
                    console.warn("[Groq] Retry sweep still no result for id=" +
                        item.id + " line=" + item.line);
                } else {
                    translation = enforceGlossary(translation, item.glossary);
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

            if (start + RETRY_CHUNK < missedItems.length) {
                await delay(3000);
            }
        }
        hideTranslationSpinner();
    }

    hideTranslationSpinner();

    // Hide the progress bar started by the calling code
    const progressbar = document.querySelector(".indeterminate-progress-bar");
    if (progressbar) progressbar.style.display = "none";
    messageBox("info", __("Translation is ready"));
    return "OK";
}