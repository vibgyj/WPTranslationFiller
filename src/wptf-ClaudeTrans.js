// Line-by-line translation
// Uses the same prompt template, pruneGlossary, and JSON parsing as translatePageClaude
// Line-by-line translation
// Uses the same prompt template, pruneGlossary, and JSON parsing as translatePageClaude
async function translateLineByLine(
    apiKey,
    originals,
    myglossary,
    destlang,
    record,
    rowId,
    transtype,
    plural_line,
    locale,
    convertToLower,
    current,
    editor,
    ClaudePrompt,       // {{toLanguage}} {{tone}} {{text}} {{glossary}} template
    OpenAITone,
    preverbs,
    spellCheckIgnore,
    _convertToLower,    // duplicate — ignored
    _locale,            // duplicate — ignored
    OpenAiTemp,
    Model
) {
    const results      = [];
    const spellIgnoreStr = normalizeSpellCheckIgnore(spellCheckIgnore);

    // Map destination language code to full name — reuse shared map if available
    const resolvedLanguage = (typeof LOCALE_TO_LANGUAGE !== 'undefined' ? LOCALE_TO_LANGUAGE[destlang] : null) ?? destlang;

    const temp = parseFloat(OpenAiTemp) || 0.0;

    // Fill static placeholders once
    const basePrompt = applyClaudePromptBase(ClaudePrompt, resolvedLanguage, OpenAITone);
    //console.debug('[Claude Single] Base prompt:', basePrompt)
    for (let i = 0; i < originals.length; i++) {
        const original    = originals[i];
        const originalText = typeof original === 'string' ? original : original.text;

        // Pre-process
        const preprocessed = await preProcessOriginal(originalText, preverbs, 'claude');

        // Prune glossary against preprocessed text
        const prunedGlossary = await pruneGlossary(myglossary, preprocessed, null) || '';

        // Build prompt — single item wrapped in array to match bulk JSON format
        const promptItems = JSON.stringify([{ i: rowId, t: preprocessed }]);
        const fullPrompt  = applyClaudePromptBatch(basePrompt, promptItems, prunedGlossary);

        const start = Date.now();

        // Call Claude with retry
        const response = await callClaudeWithRetry(fullPrompt, apiKey, Model, temp);

        if (!response.success) {
            console.error('[Claude Single] API error:', response.error);
            results.push({ id: original.id, original: originalText, error: response.error, success: false });
            continue;
        }

        // Parse — same parser as bulk
        const parsed = parseClaude(response);

        if (!parsed || !parsed.length) {
            console.warn('[Claude Single] Parse failed for rowId:', rowId, response.translation);
            results.push({ id: original.id, original: originalText, error: 'Parse failed', success: false });
            continue;
        }

        const translation = parsed[0]?.tr ?? '';
        const duration    = ((Date.now() - start) / 1000).toFixed(2);

        // Post-process and write
        const finalText = await postProcessTranslation(
            original,
            translation,
            replaceVerb,
            preprocessed,
            'claude',
            convertToLower,
            spellIgnoreStr,
            locale
        );

        await processTransl(
            original,
            finalText,
            resolvedLanguage,
            record,
            rowId,
            transtype,
            plural_line,
            locale,
            convertToLower,
            current
        );

        results.push({ id: original.id, original: originalText, translation, success: true });

        // Small delay between items to avoid rate limiting
        if (i < originals.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
}