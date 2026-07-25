/****************************************************
 * CLAUDE BULK TRANSLATE PAGE
 * Modelled on translatePageGroq — same row scanning,
 * same immediate/batch split, same post-processing.
 * Only the API call and response parsing differ.
 ****************************************************/

/****************************************************
 * TEMPLATE ENGINE  (shared with Groq convention)
 ****************************************************/
function applyClaudePromptBase(prompt, toLanguage, tone) {
    // Support both {{toLanguage}} and ${destinationLanguage} placeholder styles
    return prompt
        .replace(/\{\{toLanguage\}\}/g,       toLanguage ?? "")
        .replace(/\$\{destinationLanguage\}/g, toLanguage ?? "")
        .replace(/\{\{tone\}\}/g,             tone ?? "");
}

function applyClaudePromptBatch(basePrompt, text, glossary) {
    return basePrompt
        .replace(/\{\{text\}\}/g,     text    ?? "")
        .replace(/\{\{glossary\}\}/g, glossary ?? "");
}

/****************************************************
 * SPELLCHECK HELPER
 * spellCheckIgnore can arrive as a string, array, or
 * undefined — normalise to string for postProcess
 ****************************************************/
function normalizeSpellCheckIgnore(val) {
    if (typeof val === 'string') return val;
    if (Array.isArray(val))      return val.join(',');
    return '';
}

/****************************************************
 * CLAUDE API CALL
 ****************************************************/
async function callClaude(data) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "ClaudeAI", data }, response => {
            resolve(response ?? { success: false, error: "No response from background script" });
        });
    });
}

/****************************************************
 * CLAUDE CALL WITH RETRY + BACKOFF
 ****************************************************/
async function callClaudeWithRetry(promptText, apiKey, model, temp, maxRetries = 3) {
    let attempt = 0;
    //console.debug("model", model);
    const NO_TEMPERATURE_MODELS = new Set([
        'claude-opus-4-8',
        'claude-opus-4-7',
        'claude-sonnet-5',
        'claude-fable-5'
            ]);
    while (true) {
        const result = await callClaude({
           apiKey,
           apiVersion:   '2023-06-01',
           model,
           systemPrompt: promptText,
           text:         '.',
           max_tokens:   4096,
          ...(!NO_TEMPERATURE_MODELS.has(model) && { temperature: parseFloat(temp) || 0.0 }),
        });

        if (result.success) return result;

        const retryable = result.errorType === 'rate_limit_error'
                       || result.errorType === 'overloaded_error';

        if (!retryable || attempt >= maxRetries) return result;

        const waitMs = (attempt + 1) * 2000;
        let remaining = Math.ceil(waitMs / 1000);

        console.warn(`[Claude] ${result.errorType} — waiting ${remaining}s before attempt ${attempt + 2}/${maxRetries + 1}`);

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
 * Same multi-candidate strategy as Groq parser.
 * Expects: {"results":[{"i":"rowId","tr":"translation"}]}
 ****************************************************/
function parseClaude(result) {
    try {
        let text = result.translation ?? '';
        if (!text) return null;

        //console.debug('[Claude] Raw response:\n', text);

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
            console.warn('[Claude] No JSON candidates in response:', text);
            return null;
        }

        candidates.sort((a, b) => b.length - a.length);

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
                    console.warn('[Claude] Repetition loop detected — rejecting response');
                    return null;
                }

                //console.debug('[Claude] Parsed response:', parsed);
                return parsed.results;

            } catch { /* try next candidate */ }
        }

        console.warn('[Claude] No valid results in any candidate');
        return null;

    } catch (err) {
        console.error('[Claude] Parse error:', err);
        return null;
    }
}

/****************************************************
 * HELPERS
 ****************************************************/
function normalizeClaudeId(id) {
    return String(id).replace(/\s/g, '');
}

function makeClaudeBubbleCache() {
    const cache = new Map();
    return rowId => {
        if (!cache.has(rowId)) {
            cache.set(rowId, document.querySelector('#editor-' + rowId + ' span.panel-header__bubble'));
        }
        return cache.get(rowId);
    };
}

function mergeClaudeGlossaries(enrichedItems) {
    //console.debug('[Claude] Merging glossaries from items:', enrichedItems)
    for (const item of enrichedItems) {
    //console.debug('[Claude] raw glossary item:', JSON.stringify(item.glossary));
}
    const seen = new Map();
    for (const item of enrichedItems) {
        if (!item.glossary) continue;
        const lines = String(item.glossary).split('\n').flatMap(line => line.split(','));
        for (const line of lines) {
            const match = line.match(/"([^"]+)"\s*->\s*"([^"]+)"/);
            if (!match) continue;
            //console.debug(`[Claude] raw match:`, JSON.stringify(match[1]), '->', JSON.stringify(match[2]));
            if (!match) continue;
            const source = match[1];
            const target = match[2];
            if (source && target && !seen.has(source)) seen.set(source, target);
        }
    }
    return Array.from(seen.entries()).map(([s, t]) => `"${s}" -> "${t}"`).join('\n');
}



/****************************************************
 * MAIN
 ****************************************************/
async function translatePageClaude(
    apiKey,
    OpenAIPrompt,
    claudeModel,
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
    claudeBatchSize = 20
) {
    setPostTranslationReplace(postTranslationReplace, formal);
    setPreTranslationReplace(preTranslationReplace);

    const getBubble      = makeClaudeBubbleCache();
    const spellIgnoreStr = normalizeSpellCheckIgnore(spellCheckIgnore);

    const rows = document.querySelectorAll(
        'tr.editor div.editor-panel__left div.panel-content'
    );

    const batchQueue     = [];
    const immediateQueue = [];

    /****************************************************
     * STRIP PLURAL LABEL
     ****************************************************/
    function stripPluralLabel(text) {
        const lines = (text || '').split('\n');
        return lines.length > 1 ? lines.slice(1).join('\n').trim() : text.trim();
    }

    /****************************************************
     * SCAN — classify every row  (identical to Groq)
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
            const form1 = stripPluralLabel(plural1?.innerText);
            const form2 = stripPluralLabel(plural2?.innerText);
            const rowLocale = checkLocale();
            const tr1 = await findTransline(form1, rowLocale);
            const tr2 = await findTransline(form2, rowLocale);

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
     * LOCAL LABEL  (identical to Groq)
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
                const spans   = td.querySelectorAll('span.translation-text');
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
     * IMMEDIATE — process local rows without Claude
     ****************************************************/
    for (const item of immediateQueue) {

        // Pretranslated plural
        if (item.pluralForms) {
            for (let fi = 0; fi < item.pluralForms.length; fi++) {
                const form = item.pluralForms[fi];
                const preprocessed = await preProcessOriginal(form.original, replacePreVerb, 'claude');
                const finalText = await postProcessTranslation(
                    form.original, form.translation, replaceVerb,
                    preprocessed, 'claude', convertToLower, spellIgnoreStr, locale
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
            const preprocessed = await preProcessOriginal(item.original, replacePreVerb, 'claude');
            const finalText = await postProcessTranslation(
                item.original, item.translation, replaceVerb,
                preprocessed, 'claude', convertToLower, spellIgnoreStr, locale
            );
            await processTransl(
                item.original, finalText, destlang, item.record,
                item.id, 'single', '', locale, convertToLower, getBubble(item.id)
            );
            addLocalLabel(item.id);
            continue;
        }

        // name / URL
        const preprocessed = await preProcessOriginal(item.original, replacePreVerb, 'claude');
        const finalText = await postProcessTranslation(
            item.original, item.translation, replaceVerb,
            preprocessed, 'claude', convertToLower, spellIgnoreStr, locale
        );
        await processTransl(
            item.original, finalText, destlang, item.record,
            item.id, 'single', '', locale, convertToLower, getBubble(item.id)
        );
    }

    /****************************************************
     * BATCH — translate via Claude
     ****************************************************/
    const batchSize       = Number(claudeBatchSize) || 10;
    const maxParseRetries = 2;
    const resolvedLanguage = (typeof LOCALE_TO_LANGUAGE !== 'undefined' ? LOCALE_TO_LANGUAGE[destlang] : null) ?? destlang;

    // Fill static placeholders once — language and tone never change between batches
    const basePrompt = applyClaudePromptBase(OpenAIPrompt, resolvedLanguage, OpenAITone);

    for (let i = 0; i < batchQueue.length; i += batchSize) {
        const batch    = batchQueue.slice(i, i + batchSize);
        const allItems = batch.flatMap(b => b.items);

        // Preprocess first, then prune glossary against preprocessed text
        const enrichedItems = await Promise.all(
            allItems.map(async item => {
                const preprocessed   = await preProcessOriginal(item.original, replacePreVerb, 'claude');
                const prunedGlossary = await pruneGlossary(openAiGloss, preprocessed, null);
                return {
                    id: item.id, line: item.line,
                    text: item.original, preprocessed,
                    glossary: prunedGlossary || ''
                };
            })
        );

        const combinedGlossary = mergeClaudeGlossaries(enrichedItems);
        //console.debug('[Claude] combinedGlossary:', combinedGlossary);

        const promptItems = enrichedItems.map(({ id, text }) => ({ i: id, t: text }));
        const batchPrompt = applyClaudePromptBatch(
            basePrompt,
            JSON.stringify(promptItems),
            combinedGlossary
        );

        let parsed = null;

        // Correction-retry loop
        let correctionPrompt = batchPrompt;
        for (let attempt = 0; attempt <= maxParseRetries; attempt++) {

            if (attempt > 0) {
                showTranslationSpinner(__(
                    'Model returned prose — correction attempt ' + attempt + '/' + maxParseRetries + '…'
                ));
                correctionPrompt = batchPrompt +
                    '\n\nYour previous response used wrong output keys. ' +
                    'Return ONLY a JSON object in this exact format: ' +
                    '{"results":[{"i":"<echo input i unchanged>","tr":"<translation>"}]} ' +
                    'The translation key MUST be "tr", NOT "t". ' +
                    'No prose, no markdown, no headers, no notes. ' +
                    'Tone: ' + OpenAITone + '. Target language: ' + resolvedLanguage + '.';
                await new Promise(r => setTimeout(r, 1500));
            }

            //console.debug('[Claude] batchPrompt:', correctionPrompt);
            const response = await callClaudeWithRetry(
                correctionPrompt, apiKey, claudeModel, OpenAItemp
            );
            //console.debug('[Claude] RAW response:', response.translation);
            if (!response.success) {
                hideTranslationSpinner();
                const progressbar = document.querySelector('.indeterminate-progress-bar');
                if (progressbar) progressbar.style.display = 'none';
                alert('Claude error:\n\n' + JSON.stringify(response.error, null, 2));
                return 'STOPPED';
            }

            parsed = parseClaude(response);
            //console.debug('[Claude] Parsed response:', parsed);
            if (parsed) {
                hideTranslationSpinner();
                break;
            }

            console.warn('[Claude] Attempt ' + (attempt + 1) + ' returned no valid JSON.\n' +
                '--- RAW ---\n' + (response.translation ?? '') + '\n--- END ---');
        }

        if (!parsed) {
            hideTranslationSpinner();
            console.error('[Claude] All attempts failed for batch at index ' + i + '. Skipping.');
            continue;
        }

        // Write results — match by id, use position for plurals
        for (const group of batch) {
            for (const item of group.items) {
                const allForId  = parsed.filter(r => normalizeClaudeId(r.i ?? '') === normalizeClaudeId(item.id));
                const lineIndex = Number(item.line ?? 1) - 1;
                const res       = allForId[lineIndex] ?? allForId[0] ?? null;

                if (!res) {
                    console.warn('[Claude] No match for id=' + item.id + ' line=' + item.line +
                        ' | returned: ' + parsed.map(r => r.i).join(', '));
                }

                const translation = res?.tr ?? 'No suggestions';
                //console.debug('WRITING ROW id=' + group.id + ' line=' + item.line + ' translation=' + translation);

                const finalText = await postProcessTranslation(
                    item.original, translation, replaceVerb,
                    item.original, 'claude', convertToLower, spellIgnoreStr, locale
                );
                //console.debug('FINAL TEXT for row ' + group.id + ' line ' + item.line + ':', finalText);
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