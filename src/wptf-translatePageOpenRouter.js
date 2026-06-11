/****************************************************
 * OPENROUTER BULK TRANSLATE PAGE
 * Exact mirror of translatePageClaude —
 * same row scanning, same immediate/batch split,
 * same correction-retry loop, same post-processing.
 * Only the API call and payload building differ.
 ****************************************************/

/****************************************************
 * TEMPLATE ENGINE  (shared with Claude/Groq convention)
 ****************************************************/
function applyORPromptBase(prompt, toLanguage, tone) {
    return prompt
        .replace(/\{\{toLanguage\}\}/g,       toLanguage ?? "")
        .replace(/\$\{destinationLanguage\}/g, toLanguage ?? "")
        .replace(/\{\{tone\}\}/g,             tone ?? "");
}

function applyORPromptBatch(basePrompt, text, glossary) {
    return basePrompt
        .replace(/\{\{text\}\}/g,     text     ?? "")
        .replace(/\{\{glossary\}\}/g, glossary ?? "");
}

/****************************************************
 * SPELLCHECK HELPER
 ****************************************************/
function normalizeORSpellCheckIgnore(val) {
    if (typeof val === 'string') return val;
    if (Array.isArray(val))      return val.join(',');
    return '';
}

/****************************************************
 * LOCALE → LANGUAGE NAME  (from getopenRouter)
 ****************************************************/
function orResolveLanguage(destlang) {
    const map = {
        nl: 'Dutch', de: 'German', fr: 'French',
        uk: 'Ukrainian', es: 'Spanish', id: 'Indonesian',
        it: 'Italian', pt: 'Portuguese', ru: 'Russian',
    };
    return map[destlang] ?? destlang;
}

/****************************************************
 * TONE RESOLVER  (mirrors getopenRouter exactly)
 ****************************************************/
function orResolveTone(OpenAITone, destlang) {
    if (OpenAITone === 'formal') {
        if (destlang === 'nl') return OpenAITone + " and use 'u' instead of 'je'";
        if (destlang === 'de') return OpenAITone + " and use 'Sie' instead of 'du'";
        if (destlang === 'fr') return OpenAITone + " use 'vous' instead of 'tu'";
    }
    return OpenAITone;
}

/****************************************************
 * FALLBACK MAP  (verbatim from getopenRouter)
 ****************************************************/
var OR_BULK_FALLBACK_MAP = {
    // OpenAI GPT models
    "gpt-oss-20b":                              ["openai/gpt-5.4-nano", "openai/gpt-4o-mini"],
    "gpt-5":                                    ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
    "gpt-5-mini":                               ["openai/gpt-4o-mini", "google/gemini-flash-1.5"],
    "gpt-5-nano":                               ["openai/gpt-4o-mini"],
    "gpt-5.1":                                  ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
    "gpt-5.1-mini":                             ["openai/gpt-4o-mini"],
    "gpt-5.1-nano":                             ["openai/gpt-4o-mini"],
    "gpt-5.4":                                  ["openai/gpt-4o"],
    "gpt-5.3-chat-latest":                      ["openai/gpt-4o", "anthropic/claude-3-opus"],
    // Google Gemini models
    "google/gemini-2.5-flash-lite-preview-09-2025": ["google/gemini-2.5-flash", "openai/gpt-4o-mini"],
    "google/gemini-2.5-flash":                  ["google/gemini-2.5-flash-lite-preview-09-2025", "openai/gpt-4o-mini"],
    // Meta Llama models
    "meta-llama/llama-3.3-70b-instruct":        ["google/gemini-2.5-flash-lite-preview-09-2025", "openai/gpt-4o-mini"],
    // OpenAI via OpenRouter
    "openai/gpt-4o-mini":                       ["google/gemini-2.5-flash-lite-preview-09-2025", "meta-llama/llama-3.3-70b-instruct"],
    "openai/gpt-4o":                            ["openai/gpt-4o-mini", "google/gemini-2.5-flash"],
};

/****************************************************
 * PAYLOAD BUILDER  (mirrors getopenRouter branching)
 ****************************************************/
function orBuildPayload(model, messages, apikeyOpenRouter, OpenAItemp) {
    const mymodel  = model.toLowerCase();
    const _maxTok  = typeof max_Tokens !== 'undefined' ? max_Tokens : 2048;
    const _topP    = typeof Top_p      !== 'undefined' ? Number(Top_p) : 1;
    const _topK    = typeof Top_k      !== 'undefined' ? Number(Top_k) : 0;

    let dataNew = {};

    if (["gpt-5", "gpt-5-mini", "gpt-5-nano"].includes(mymodel)) {
        dataNew = {
            model: mymodel, messages,
            max_completion_tokens: _maxTok,
            top_p: _topP, top_k: _topK,
            frequency_penalty: 0, presence_penalty: 0,
            reasoning_effort: 'minimal', verbosity: 'low',
            apiKey: apikeyOpenRouter,
            prompt_cache_key: 'WPTF translation', guardrails: false,
        };
    } else if (["gpt-5.1", "gpt-5.1-mini", "gpt-5.1-nano", "gpt-5.4"].includes(mymodel)) {
        dataNew = {
            model: mymodel, messages,
            max_completion_tokens: _maxTok,
            top_p: _topP,
            frequency_penalty: 0, presence_penalty: 0,
            reasoning_effort: 'none', verbosity: 'low',
            apiKey: apikeyOpenRouter,
            prompt_cache_key: 'WPTF translation', guardrails: false,
        };
    } else if (mymodel === "gpt-5.3-chat-latest") {
        dataNew = {
            model: mymodel, messages,
            max_completion_tokens: _maxTok,
            top_p: _topP,
            frequency_penalty: 0, presence_penalty: 0,
            reasoning_effort: 'medium', verbosity: 'low',
            apiKey: apikeyOpenRouter,
            prompt_cache_key: 'WPTF translation', guardrails: false,
        };
    } else {
        dataNew = {
            model: mymodel, messages,
            n: 1, temperature: OpenAItemp,
            frequency_penalty: 0, presence_penalty: 0,
            top_p: _topP,
            apiKey: apikeyOpenRouter,
        };
    }

    const fallbacks = OR_BULK_FALLBACK_MAP[mymodel];
    if (fallbacks) dataNew.models = [mymodel, ...fallbacks];

    return dataNew;
}

/****************************************************
 * OPENROUTER API CALL  (via chrome background)
 ****************************************************/
async function callOpenRouter(dataNew) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(
            { action: "openRouter", data: { ...dataNew } },
            response => resolve(response ?? { error: "No response from background script" })
        );
    });
}

/****************************************************
 * OPENROUTER CALL WITH RETRY + BACKOFF
 * Mirrors callClaudeWithRetry — handles 429 / 500
 ****************************************************/
async function callORWithRetry(messages, apikeyOpenRouter, model, OpenAItemp, maxRetries = 3) {
    let attempt = 0;

    while (true) {
        const dataNew = orBuildPayload(model, messages, apikeyOpenRouter, OpenAItemp);
        const result  = await callOpenRouter(dataNew);

        // Success — no error field means the call worked
        if (!result.error) return result;

        // Extract status code from "Request failed (429): ..."
        const match      = (result.error || '').match(/Request failed \((\d+)\)/);
        const statusCode = match ? Number(match[1]) : 0;
        const retryable  = statusCode === 429 || statusCode === 500;

        if (!retryable || attempt >= maxRetries) return result;

        const waitMs  = (attempt + 1) * 2000;
        let remaining = Math.ceil(waitMs / 1000);

        console.warn(`[OR Bulk] ${statusCode} — waiting ${remaining}s before attempt ${attempt + 2}/${maxRetries + 1}`);

        function updateSpinner(sec) {
            hideTranslationSpinner();
            showTranslationSpinner(__("Rate limited — retrying in " + sec + "s"));
        }

        updateSpinner(remaining);
        const ticker = setInterval(() => {
            remaining--;
            if (remaining > 0) updateSpinner(remaining);
        }, 1000);

        await new Promise(r => setTimeout(r, waitMs));
        clearInterval(ticker);
        attempt++;
    }
}

/****************************************************
 * PARSER
 * Same multi-candidate strategy as Claude/Groq.
 * Expects: {"results":[{"i":"rowId","tr":"translation"}]}
 ****************************************************/
function parseOR(rawText) {
    try {
        let text = rawText ?? '';
        if (!text) return null;

        text = text
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/```json\s*/gi, '')
            .replace(/```/g, '')
            .trim();

        text = text.replace(/\}\}\]/g, '}]').replace(/\}\}\]\}/g, '}]}');

        // Collect all top-level {...} candidates, largest first
        const candidates = [];
        for (let i = 0; i < text.length; i++) {
            if (text[i] !== '{') continue;
            let depth = 0, end = -1;
            for (let j = i; j < text.length; j++) {
                if (text[j] === '{') depth++;
                else if (text[j] === '}') depth--;
                if (depth === 0) { end = j; break; }
            }
            if (end !== -1) { candidates.push(text.substring(i, end + 1)); i = end; }
        }

        if (!candidates.length) {
            console.warn('[OR Bulk] No JSON candidates in response:', text);
            return null;
        }

        candidates.sort((a, b) => b.length - a.length);

        // Also handle bare array response: [{"i":...,"t":...}, ...]
        try {
            const trimmed = text.trim();
            if (trimmed.startsWith('[')) {
                const arr = JSON.parse(trimmed);
                if (Array.isArray(arr) && arr.length) {
                    for (const r of arr) {
                        if (!('tr' in r) && 't' in r) r.tr = r.t;
                    }
                    if (!arr.find(r => !('i' in r) || !('tr' in r))) {
                        //console.debug('[OR Bulk] Accepted bare array response, remapped t→tr');
                        return arr;
                    }
                }
            }
        } catch { /* not a bare array, continue to candidate scan */ }

        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (!Array.isArray(parsed.results) || !parsed.results.length) continue;

                // Remap "t" → "tr" if model echoed the input key by mistake
                for (const r of parsed.results) {
                    if (!('tr' in r) && 't' in r) r.tr = r.t;
                }

                const badItem = parsed.results.find(r => !('i' in r) || !('tr' in r));
                if (badItem) continue;

                // Repetition loop detection
                const hasLoop = parsed.results.some(r => {
                    const tokens = String(r.tr ?? '').split(/[\s,]+/).filter(Boolean);
                    if (tokens.length < 10) return false;
                    let maxRun = 1, run = 1;
                    for (let i = 1; i < tokens.length; i++) {
                        run = tokens[i] === tokens[i - 1] ? run + 1 : 1;
                        if (run > maxRun) maxRun = run;
                    }
                    return maxRun >= 8;
                });

                if (hasLoop) {
                    console.warn('[OR Bulk] Repetition loop detected — rejecting response');
                    return null;
                }

                return parsed.results;

            } catch { /* try next candidate */ }
        }

        console.warn('[OR Bulk] No valid results in any candidate');
        return null;

    } catch (err) {
        console.error('[OR Bulk] Parse error:', err);
        return null;
    }
}

/****************************************************
 * HELPERS  (mirrors Claude helpers exactly)
 ****************************************************/
function normalizeORId(id) {
    return String(id).replace(/\s/g, '');
}

function makeORBubbleCache() {
    const cache = new Map();
    return rowId => {
        if (!cache.has(rowId)) {
            cache.set(rowId, document.querySelector('#editor-' + rowId + ' span.panel-header__bubble'));
        }
        return cache.get(rowId);
    };
}

function mergeORGlossaries(enrichedItems) {
    const seen = new Map();
    for (const item of enrichedItems) {
        if (!item.glossary) continue;
        for (const line of String(item.glossary).split('\n')) {
            const match = line.match(/(.+?)\s*->\s*(.+)/);
            if (!match) continue;
            const source = match[1].trim();
            const target = match[2].trim();
            if (source && target && !seen.has(source)) seen.set(source, target);
        }
    }
    return Array.from(seen.entries()).map(([s, t]) => s + ' -> ' + t).join('\n');
}

/****************************************************
 * MAIN ENTRY POINT
 * Call exactly like translatePageClaude() /
 * translatePageGroq() — just swap the function name.
 ****************************************************/
async function translatePageOpenRouter(
    apikeyOpenRouter,
    OpenAIPrompt,
    OpenRouterSelect,
    destlang,
    preTranslationReplace,
    postTranslationReplace,
    formal,
    convertToLower,
    is_editor,
    OpenAItemp,
    spellCheckIgnore,
    OpenAITone,
    openAiGloss,
    openRouterBatchSize = 10
) {
    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    if (!OpenRouterSelect || OpenRouterSelect === 'undefined') {
        messageBox("error", "You did not set the OpenRouter model!<br> Please check your options");
        return 'NOK';
    }

    const getBubble      = makeORBubbleCache();
    const spellIgnoreStr = normalizeORSpellCheckIgnore(spellCheckIgnore);

    const rows = document.querySelectorAll(
        'tr.editor div.editor-panel__left div.panel-content'
    );

    const batchQueue     = [];
    const immediateQueue = [];

    /****************************************************
     * STRIP PLURAL LABEL  (identical to Claude)
     ****************************************************/
    function stripPluralLabel(text) {
        const lines = (text || '').split('\n');
        return lines.length > 1 ? lines.slice(1).join('\n').trim() : text.trim();
    }

    /****************************************************
     * SCAN — classify every row  (identical to Claude)
     ****************************************************/
    for (const e of rows) {
        const rowfound = e.closest('tr.editor')?.id;
        if (!rowfound) continue;

        const match = rowfound.match(/^editor-(\d+(?:-\d+)?)$/);
        const rowId = match?.[1];
        if (!rowId) continue;

        const original = e.querySelector('span.original-raw')?.innerText;
        if (!original) continue;

        const plural1 = document.querySelector('#preview-' + rowId + ' .original li:nth-of-type(1)');
        const plural2 = document.querySelector('#preview-' + rowId + ' .original li:nth-of-type(2)');

        if (plural2) {
            const form1     = stripPluralLabel(plural1?.innerText);
            const form2     = stripPluralLabel(plural2?.innerText);
            const rowLocale = checkLocale();
            const tr1       = await findTransline(form1, rowLocale);
            const tr2       = await findTransline(form2, rowLocale);

            if (tr1 !== 'notFound' && tr2 !== 'notFound') {
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
                    id: rowId, type: 'plural', record: e,
                    items: [
                        { id: rowId, line: 1, original: form1 },
                        { id: rowId, line: 2, original: form2 }
                    ]
                });
            }
            continue;
        }

        const [myType, myTranslated] = await determineType(rowId, e);

        if (myType === 'name' || myType === 'URL') {
            immediateQueue.push({ id: rowId, record: e, original, translation: original, render: true });
            continue;
        }

        if (myType === 'pretranslated') {
            immediateQueue.push({ id: rowId, record: e, original, translation: myTranslated, render: false });
            continue;
        }

        batchQueue.push({
            id: rowId, type: 'single', record: e,
            items: [{ id: rowId, line: 1, original }]
        });
    }

    /****************************************************
     * LOCAL LABEL  (identical to Claude)
     ****************************************************/
    function addLocalLabel(rowId, expectedForms) {
        const td = document.querySelector('#preview-' + rowId + ' td.translation');
        if (!td) return;

        function insertLabel() {
            if (td.querySelector('.trans_local_div')) return;
            const div = document.createElement('div');
            div.setAttribute('class', 'trans_local_div');
            div.setAttribute('id',    'trans_local_div');
            div.appendChild(document.createTextNode(__('Local')));
            const ul = td.querySelector('ul.ul-plural');
            if (ul) ul.insertAdjacentElement('afterend', div);
            else     td.appendChild(div);
        }

        if (expectedForms && expectedForms > 1) {
            const observer = new MutationObserver(() => {
                const spans     = td.querySelectorAll('span.translation-text');
                const allFilled = spans.length >= expectedForms &&
                    [...spans].every(s => s.innerHTML.trim() !== '' && s.innerHTML.trim() !== 'empty');
                if (allFilled) { observer.disconnect(); insertLabel(); }
            });
            observer.observe(td, { childList: true, subtree: true, characterData: true });
            setTimeout(() => { observer.disconnect(); insertLabel(); }, 2000);
        } else {
            insertLabel();
        }
    }

    /****************************************************
     * IMMEDIATE — process local rows without API call
     ****************************************************/
    for (const item of immediateQueue) {

        // Pretranslated plural
        if (item.pluralForms) {
            for (let fi = 0; fi < item.pluralForms.length; fi++) {
                const form         = item.pluralForms[fi];
                const preprocessed = await preProcessOriginal(form.original, replacePreVerb, 'openRouter');
                const finalText    = await postProcessTranslation(
                    form.original, form.translation, replaceVerb,
                    preprocessed, 'openRouter', convertToLower, spellIgnoreStr, locale
                );
                await processTransl(
                    form.original, finalText, destlang, item.record,
                    item.id, 'plural', String(form.line),
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
            const preprocessed = await preProcessOriginal(item.original, replacePreVerb, 'openRouter');
            const finalText    = await postProcessTranslation(
                item.original, item.translation, replaceVerb,
                preprocessed, 'openRouter', convertToLower, spellIgnoreStr, locale
            );
            await processTransl(
                item.original, finalText, destlang, item.record,
                item.id, 'single', '', locale, convertToLower, getBubble(item.id)
            );
            addLocalLabel(item.id);
            continue;
        }

        // name / URL
        const preprocessed = await preProcessOriginal(item.original, replacePreVerb, 'openRouter');
        const finalText    = await postProcessTranslation(
            item.original, item.translation, replaceVerb,
            preprocessed, 'openRouter', convertToLower, spellIgnoreStr, locale
        );
        await processTransl(
            item.original, finalText, destlang, item.record,
            item.id, 'single', '', locale, convertToLower, getBubble(item.id)
        );
    }

    /****************************************************
     * BATCH — translate via OpenRouter
     ****************************************************/
    const batchSize        = Number(openRouterBatchSize) || 10;
    const maxParseRetries  = 2;
    const resolvedLanguage = orResolveLanguage(destlang);
    const resolvedTone     = orResolveTone(OpenAITone, destlang);

    // Fill static placeholders once — language and tone never change between batches
    const basePrompt = applyORPromptBase(OpenAIPrompt, resolvedLanguage, resolvedTone);

    for (let i = 0; i < batchQueue.length; i += batchSize) {
        const batch    = batchQueue.slice(i, i + batchSize);
        const allItems = batch.flatMap(b => b.items);

        // Preprocess + prune glossary per item
        const enrichedItems = await Promise.all(
            allItems.map(async item => {
                const preprocessed   = await preProcessOriginal(item.original, replacePreVerb, 'openRouter');
                const prunedGlossary = await pruneGlossary(openAiGloss, preprocessed, null);
                return {
                    id: item.id, line: item.line,
                    text: item.original, preprocessed,
                    glossary: prunedGlossary || ''
                };
            })
        );

        const combinedGlossary = mergeORGlossaries(enrichedItems);
        //console.debug('[OR Bulk] combinedGlossary:', combinedGlossary);

        const promptItems = enrichedItems.map(({ id, text }) => ({ i: id, t: text }));

        const batchPrompt = applyORPromptBatch(
            basePrompt,
            JSON.stringify(promptItems),
            combinedGlossary
        );

        const messages = [{ role: "user", content: batchPrompt }];

        let parsed = null;

        // Correction-retry loop — identical strategy to Claude
        let correctionMessages = messages;
        for (let attempt = 0; attempt <= maxParseRetries; attempt++) {

            if (attempt > 0) {
                showTranslationSpinner(__(
                    'Model returned prose — correction attempt ' + attempt + '/' + maxParseRetries + '…'
                ));
                const correctionContent = batchPrompt +
                    '\n\nYour previous response used wrong output keys. ' +
                    'Return ONLY a JSON object in this exact format: ' +
                    '{"results":[{"i":"<echo input i unchanged>","tr":"<translation>"}]} ' +
                    'The translation key MUST be "tr", NOT "t". ' +
                    'No prose, no markdown, no headers, no notes. ' +
                    'Tone: ' + OpenAITone + '. Target language: ' + resolvedLanguage + '.';
                correctionMessages = [{ role: "user", content: correctionContent }];
                await new Promise(r => setTimeout(r, 1500));
            }

            //console.debug('[OR Bulk] Sending prompt (attempt ' + (attempt + 1) + ')');
            const result = await callORWithRetry(
                correctionMessages, apikeyOpenRouter, OpenRouterSelect, OpenAItemp
            );

            if (result.error) {
                hideTranslationSpinner();
                const progressbar = document.querySelector('.indeterminate-progress-bar');
                if (progressbar) progressbar.style.display = 'none';

                const match      = (result.error || '').match(/Request failed \((\d+)\)/);
                const statusCode = match ? match[1] : 'unknown';
                messageBox("warning", `OpenRouter error ${statusCode}:<br>${result.error}`);
                return 'STOPPED';
            }

            const rawText = result.result || "";
            //console.debug('[OR Bulk] RAW response:', rawText);

            parsed = parseOR(rawText);

            if (parsed) {
                hideTranslationSpinner();
                break;
            }

            console.warn('[OR Bulk] Attempt ' + (attempt + 1) + ' returned no valid JSON.\n' +
                '--- RAW ---\n' + rawText + '\n--- END ---');
        }

        if (!parsed) {
            hideTranslationSpinner();
            console.error('[OR Bulk] All attempts failed for batch at index ' + i + '. Skipping.');
            continue;
        }

        // Write results — match by id, use position for plurals
        for (const group of batch) {
            for (const item of group.items) {
                const allForId  = parsed.filter(r => normalizeORId(r.i ?? '') === normalizeORId(item.id));
                const lineIndex = Number(item.line ?? 1) - 1;
                const res       = allForId[lineIndex] ?? allForId[0] ?? null;

                if (!res) {
                    console.warn('[OR Bulk] No match for id=' + item.id + ' line=' + item.line +
                        ' | returned: ' + parsed.map(r => r.i).join(', '));
                }

                const translation = res?.tr ?? 'No suggestions';

                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, 'openRouter', convertToLower, spellIgnoreStr, locale
                );

                await processTransl(
                    item.original, finalText, destlang,
                    group.record, group.id, group.type,
                    String(item.line), locale, convertToLower, getBubble(group.id)
                );
            }
        }

        // Inter-batch pause
        const isLastBatch = i + batchSize >= batchQueue.length;
        if (!isLastBatch) {
            hideTranslationSpinner();
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    hideTranslationSpinner();

    const progressbar = document.querySelector('.indeterminate-progress-bar');
    if (progressbar) progressbar.style.display = 'none';
    messageBox("info", __("Translation is ready"));
    return 'OK';
}