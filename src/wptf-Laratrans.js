/*
 * Algemene instructie die wordt toegepast wanneer er GEEN context
 * is meegegeven. Pas de tekst aan naar wat voor jouw strings past.
 */
const GENERAL_CONTEXT_INSTRUCTION =
    'Never treat the input as a title or heading. Do not apply ' +
    'title case or capitalize words that would not be capitalized ' +
    'in a normal sentence. Use standard target-language capitalization ' +
    'rules: capitalize only the first word and words that are always ' +
    'capitalized in the target language (proper nouns, and terms with ' +
    'existing internal capitals like WooCommerce or PHP). Do not add ' +
    'quotation marks or guillemets around any term, including UI element, ' +
    'widget, page, button, or feature names, even when conventional in the ' +
    'target language. Include quotation marks only if present in the source. ' +
    'Preserve HTML tags and placeholders exactly.';
function resolveContextRule(context, OpenAIPrompt) {

    const ctx = String(context || '').trim();

    /*
     * Context aanwezig -> regels evalueren, eerste match wint.
     */
    if (ctx) {

        for (const rule of CONTEXT_RULES) {
            if (rule.test(ctx)) {
                return rule.resolve(ctx);
            }
        }

        /*
         * Context aanwezig maar geen regel matcht:
         * gewoon vertalen zonder extra instructie.
         */
        return { action: 'translate as normal instruction', instruction: '' };
    }

    /*
     * GEEN context -> algemene instructie toepassen.
     */
    return {
        action: 'translate',
        //instruction: GENERAL_CONTEXT_INSTRUCTION
         instruction: OpenAIPrompt
    };
}

const CONTEXT_RULES = [
    {
        test: ctx => /color\s*name/i.test(ctx),
        resolve: () => ({ action: 'passthrough' })
    }
];
async function translateWithLara(
    original,
    destlang,
    record,
    replacePreVerb,
    rowId,
    transtype,
    plural_line,
    formal,
    locale,
    convertToLower,
    spellCheckIgnore,
    is_editor,
    laraAccessKeyId,
    laraAccessKeySecret,
    OpenAIPrompt,
    openAiGloss,
    laraContext = "",
    laraInstructions = [],
    laraGlossaries = [],
    laraAdaptTo = []
) {
    //console.debug("translateWithLara() called with:", original,laraAccessKeyId,laraAccessKeySecret)
    console.debug("context:", laraContext);
    //console.debug("Prompt:", OpenAIPrompt);

    /*
     * Single:
     *     original = "Hello world"
     *
     * Batch:
     *     original = ["Hello world", "Good morning"]
     */

    const isBatch = Array.isArray(original);
    const contextRule = resolveContextRule(laraContext, OpenAIPrompt);

    /*
     * Passthrough: context zegt "niet vertalen".
     * Origineel verbatim wegschrijven, geen Lara-call.
     * (Single-line pad; batch laten we voorlopig buiten beschouwing.)
     */
    if (!isBatch && contextRule.action === 'passthrough') {

        await processTransl(
            original,
            original,          // verbatim
            destlang,
            record,
            rowId,
            transtype,
            plural_line,
            locale,
            convertToLower,
            "untranslated"
        );

        return { success: true, translation: original };
    }
    /*
     * Pre-processing
     *
     * Voor batch moet iedere regel afzonderlijk door
     * preProcessOriginal().
     */

    let originalPreProcessed;

    if (isBatch) {
        originalPreProcessed = [];

        for (const text of original) {
            let processed = await preProcessOriginal(
                text,
                replacePreVerb,
                "lara"
            );

           
            originalPreProcessed.push(processed);
        }

    } else {

        originalPreProcessed = await preProcessOriginal(
            original,
            replacePreVerb,
            "lara"
        );

    }

    /*
     * Lara ondersteunt een array voor q.
     *
     * We laten de glossary voorlopig buiten Lara.
     * Jouw bestaande glossary/pre/post-processing blijft
     * daardoor hetzelfde principe volgen als bij de andere
     * providers.
     */
    /*
     * GLOSSARY
     *
     * Prune per regel tegen de ORIGINELE tekst (niet preprocessed —
     * preProcessOriginal() kan bronwoorden vervangen, waardoor
     * pruneGlossary() niets matcht). Daarna samenvoegen via
     * mergeLaraGlossaries() en als instructie meesturen, precies
     * zoals callLaraBatch() dat doet.
     */

    let combinedGlossary = '';

    if (openAiGloss) {

        const glossarySources = isBatch ? original : [original];

        const enrichedForGlossary = [];

        for (const text of glossarySources) {

            const pruned = await pruneGlossary(
                openAiGloss,
                text,
                null
            );

            enrichedForGlossary.push({
                glossary: pruned || ''
            });
        }

        combinedGlossary = mergeLaraGlossaries(enrichedForGlossary);
    }

    //console.debug("combinedGlossary (translateWithLara):", combinedGlossary);

    /*
     * Instructies: begin met wat de caller aanlevert en voeg
     * de glossary-instructie toe wanneer er termen zijn.
     */

    const finalInstructions =
        Array.isArray(laraInstructions) ? [...laraInstructions] : [];

    // Context-instructie eerst …
    if (contextRule.instruction) {
        finalInstructions.push(contextRule.instruction);
    }

    // … glossary daarna, zodat die overrulet.
    if (combinedGlossary) {
        finalInstructions.push(
            `Use the following glossary strictly and consistently. ` +
            `These glossary translations override other translation choices:\n` +
            combinedGlossary
        );
    }
    //console.debug("laraGlossaries:", laraGlossaries);
    console.debug("originalPreProcessed:", originalPreProcessed);
    return new Promise((resolve) => {

        chrome.runtime.sendMessage(
            {
                action: "Lara",
                data: {
                    accessKeyId: laraAccessKeyId,
                    accessKeySecret: laraAccessKeySecret,

                    text: originalPreProcessed,

                    sourceLang: "en",
                    targetLang: destlang,

                    instructions: finalInstructions,
                    glossaries: laraGlossaries,
                    adaptTo: laraAdaptTo,

                    content_type: "text/html",
                    multiline: isBatch,

                    // Geen opslag/training van de request.
                    noTrace: true,

                    // Lara Base/standaardstijl.
                    style: "faithful",

                    reasoning: false
                }
            },
            (response) => {

                if (chrome.runtime.lastError) {

                    const errMsg =
                        chrome.runtime.lastError.message ||
                        "Unknown background.js error";

                    console.debug("Lara error:", errMsg);

                    if (toBoolean(is_editor)) {
                        messageBox(
                            "error",
                            "Lara error: " + errMsg
                        );

                        resolve({
                            success: false,
                            error: errMsg
                        });
                    } else {
                        resolve("NOK");
                    }

                    return;
                }

                if (!response) {

                    const errMsg =
                        "No response from background.js";

                    console.debug(errMsg);

                    if (toBoolean(is_editor)) {
                        messageBox(
                            "error",
                            "Lara error: " + errMsg
                        );

                        resolve({
                            success: false,
                            error: errMsg
                        });
                    } else {
                        resolve("NOK");
                    }

                    return;
                }

                if (!response.success) {

                    console.debug(
                        "Lara Error:",
                        response.error
                    );

                    if (toBoolean(is_editor)) {
                        messageBox(
                            "error",
                            "Lara error: " + response.error
                        );

                        resolve(response);
                    } else {
                        resolve("NOK");
                    }

                    return;
                }

                /*
                 * Lara geeft bij single:
                 *
                 *     translation: "translated text"
                 *
                 * en bij batch:
                 *
                 *     translation: [
                 *         "translation 1",
                 *         "translation 2"
                 *     ]
                 */

                const translated = response.translation;

                /*
                 * Single translation
                 */

                if (!isBatch) {
                    //console.debug("Single translation:", translated); 
                    const finalText = postProcessTranslation(
                        original,
                        translated,
                        replaceVerb,
                        originalPreProcessed,
                        "lara",
                        convertToLower,
                        spellCheckIgnore,
                        locale
                    );

                    processTransl(
                        original,
                        finalText,
                        destlang,
                        record,
                        rowId,
                        transtype,
                        plural_line,
                        locale,
                        convertToLower,
                        "untranslated"
                    );

                    resolve({
                        ...response,
                        translation: finalText
                    });

                    return;
                }

                /*
                 * Batch translation
                 *
                 * Iedere oorspronkelijke regel wordt gekoppeld
                 * aan dezelfde index in de Lara-response.
                 */

                if (!Array.isArray(translated)) {
                    const errMsg =
                        "Lara returned a single translation for a batch request";

                    console.debug(errMsg);

                    resolve({
                        success: false,
                        error: errMsg
                    });

                    return;
                }

                if (translated.length !== original.length) {
                    const errMsg =
                        `Lara returned ${translated.length} translations for ${original.length} input lines`;

                    console.debug(errMsg);

                    resolve({
                        success: false,
                        error: errMsg
                    });

                    return;
                }

                const finalTranslations = [];

                for (let i = 0; i < original.length; i++) {

                    const finalText = postProcessTranslation(
                        original[i],
                        translated[i],
                        replaceVerb,
                        originalPreProcessed[i],
                        "lara",
                        convertToLower,
                        spellCheckIgnore,
                        locale
                    );

                    finalTranslations.push(finalText);

                    /*
                     * processTransl() alleen uitvoeren wanneer
                     * de caller hiervoor daadwerkelijk een record
                     * heeft aangeleverd.
                     */

                    if (record && rowId !== undefined) {
                        processTransl(
                            original[i],
                            finalText,
                            destlang,
                            record,
                            rowId,
                            transtype,
                            plural_line,
                            locale,
                            convertToLower,
                            "untranslated"
                        );
                    }
                }

                resolve({
                    ...response,
                    translation: finalTranslations
                });
            }
        );
    });
}// JavaScript source code
/********************************************************************
 * LARA BULK TRANSLATE PAGE
 *
 * Zelfde row scanning / immediate / batch principe als OpenRouter.
 *
 * Lara:
 * - q kan een array zijn
 * - één API-call per batch
 * - geen JSON-parser nodig
 * - geen prompt nodig
 * - glossary wordt per item gepruned en daarna per batch samengevoegd
 *
 * Vereist:
 * - lara_accessKeyId
 * - lara_accessKeySecret
 * - preProcessOriginal()
 * - pruneGlossary()
 * - postProcessTranslation()
 * - processTransl()
 * - determineType()
 * - findTransline()
 * - checkLocale()
 ********************************************************************/


/********************************************************************
 * LARA LANGUAGE RESOLVER
 ********************************************************************/

function laraResolveLanguage(destlang) {
    const map = {
        nl: 'Dutch',
        de: 'German',
        fr: 'French',
        uk: 'Ukrainian',
        es: 'Spanish',
        id: 'Indonesian',
        it: 'Italian',
        pt: 'Portuguese',
        ru: 'Russian'
    };

    return map[destlang] ?? destlang;
}


/********************************************************************
 * MERGE PRUNED GLOSSARIES
 *
 * Elke regel wordt eerst afzonderlijk door pruneGlossary() gehaald.
 * Daarna worden alleen unieke source -> target combinaties behouden.
 ********************************************************************/

function mergeLaraGlossaries(enrichedItems) {

    const seen = new Map();

    /*
     * pruneGlossary() levert entries op als:
     *
     *     "source" -> "target", "source2" -> "target2"
     *
     * dus komma-gescheiden MÉT quotes, niet newline-gescheiden.
     * Daarom matchen we alle "..." -> "..." paren direct met een
     * globale regex i.p.v. te splitsen op '\n'. Zo blijven spaties
     * binnen de quotes behouden (betekenisvol bij ontbrekende
     * vertalingen) en werkt het ongeacht het scheidingsteken.
     */

    const pairRe = /"([^"]*)"\s*\*?->\*?\s*"([^"]*)"/g;

    for (const item of enrichedItems) {

        if (!item.glossary) continue;

        const glossaryStr = String(item.glossary);

        pairRe.lastIndex = 0;

        let match;

        while ((match = pairRe.exec(glossaryStr)) !== null) {

            const source = match[1];   // spaties NIET trimmen
            const target = match[2];

            // Alleen leegheids-check; interne/rand-spaties blijven behouden
            if (!source.trim() || !target.trim()) continue;

            if (!seen.has(source)) {
                seen.set(source, target);
            }
        }
    }

    return Array.from(seen.entries())
        .map(([source, target]) => `"${source}" -> "${target}"`)
        .join('\n');
}

/********************************************************************
 * LARA API CALL
 *
 * translateWithLara() kan single én batch verwerken.
 ********************************************************************/

async function callLaraBatch(
    texts,
    accessKeyId,
    accessKeySecret,
    sourceLang,
    targetLang,
    glossary
) {

    const instructions = [];

    /*
     * Glossary alleen toevoegen wanneer er daadwerkelijk
     * relevante termen voor deze batch zijn.
     */

    if (glossary) {

        instructions.push(
            `Use the following glossary strictly and consistently. ` +
            `These glossary translations override other translation choices:\n` +
            glossary
        );
    }

    return new Promise(resolve => {

        chrome.runtime.sendMessage(
            {
                action: "Lara",

                data: {
                    accessKeyId,
                    accessKeySecret,

                    /*
                     * String voor single,
                     * array voor batch.
                     */
                    text: texts,

                    sourceLang: sourceLang || "en",
                    targetLang,

                    instructions,

                    /*
                     * Lara ontvangt HTML omdat jouw strings
                     * HTML/placeholders kunnen bevatten.
                     */
                    contentType: "text/html",

                    /*
                     * Belangrijk voor arrays.
                     */
                    multiline: Array.isArray(texts),

                    noTrace: true,

                    style: "faithful",

                    reasoning: false
                }
            },

            response => {

                if (chrome.runtime.lastError) {

                    resolve({
                        success: false,
                        error:
                            chrome.runtime.lastError.message ||
                            "Lara background error"
                    });

                    return;
                }

                if (!response) {

                    resolve({
                        success: false,
                        error: "No response from background script"
                    });

                    return;
                }

                resolve(response);
            }
        );
    });
}


/********************************************************************
 * MAIN ENTRY POINT
 ********************************************************************/

async function translatePageLara(
    laraAccessKeyId,
    laraAccessKeySecret,
    destlang,
    preTranslationReplace,
    postTranslationReplace,
    formal,
    convertToLower,
    is_editor,
    spellCheckIgnore,
    openAiGloss,
    laraBatchSize = 10
) {

    console.debug("glossary:", openAiGloss);
    setPostTranslationReplace(
        postTranslationReplace,
        formal
    );

    setPreTranslationReplace(
        preTranslationReplace
    );


    /****************************************************************
     * KEY VALIDATION
     ****************************************************************/

    if (!laraAccessKeyId || !laraAccessKeySecret) {

        messageBox(
            "error",
            "You did not set the Lara Access Key ID and Access Key Secret! Please check your options"
        );

        return 'NOK';
    }


    /****************************************************************
     * BUBBLE CACHE
     ****************************************************************/

    function makeLaraBubbleCache() {

        const cache = new Map();

        return rowId => {

            if (!cache.has(rowId)) {

                cache.set(
                    rowId,
                    document.querySelector(
                        '#editor-' +
                        rowId +
                        ' span.panel-header__bubble'
                    )
                );
            }

            return cache.get(rowId);
        };
    }

    const getBubble = makeLaraBubbleCache();


    /****************************************************************
     * ROW SCANNING
     ****************************************************************/

    const rows = document.querySelectorAll(
        'tr.editor div.editor-panel__left div.panel-content'
    );


    const batchQueue = [];
    const immediateQueue = [];


    /****************************************************************
     * STRIP PLURAL LABEL
     ****************************************************************/

    function stripPluralLabel(text) {

        const lines = (text || '').split('\n');

        return lines.length > 1
            ? lines.slice(1).join('\n').trim()
            : text.trim();
    }


    /****************************************************************
     * SCAN ALL ROWS
     ****************************************************************/

    for (const e of rows) {

        const rowfound =
            e.closest('tr.editor')?.id;

        if (!rowfound) continue;


        const match =
            rowfound.match(/^editor-(\d+(?:-\d+)?)$/);

        const rowId = match?.[1];
        console.debug("Processing rowId:", rowId);
        if (!rowId) continue;


        const original =
            e.querySelector('span.original-raw')?.innerText;

        if (!original) continue;


        /************************************************************
         * PLURAL
         ************************************************************/

        const preview =
            document.querySelector('#preview-' + rowId);

        const pluralList =
            preview?.querySelector('.original ul.ul-plural');

        if (pluralList) {

            const plural1 =
                pluralList.querySelector('li:nth-of-type(1)');

            const plural2 =
                pluralList.querySelector('li:nth-of-type(2)');

            if (!plural1 || !plural2) {
                continue;
            }

            const form1 =
                stripPluralLabel(plural1.innerText);

            const form2 =
                stripPluralLabel(plural2.innerText);

            const rowLocale = checkLocale();

            const tr1 =
                await findTransline(form1, rowLocale);

            const tr2 =
                await findTransline(form2, rowLocale);

            if (
                tr1 !== 'notFound' &&
                tr2 !== 'notFound'
            ) {

                immediateQueue.push({
                    id: rowId,
                    record: e,
                    original,
                    translation: tr1,
                    render: false,

                    pluralForms: [
                        {
                            original: form1,
                            translation: tr1,
                            line: 1
                        },
                        {
                            original: form2,
                            translation: tr2,
                            line: 2
                        }
                    ]
                });

            } else {

                batchQueue.push({
                    id: rowId,
                    type: 'plural',
                    record: e,

                    items: [
                        {
                            id: rowId,
                            line: 1,
                            original: form1
                        },
                        {
                            id: rowId,
                            line: 2,
                            original: form2
                        }
                    ]
                });
            }

    continue;
}


        /************************************************************
         * DETERMINE TYPE
         ************************************************************/

        const [myType, myTranslated] =
            await determineType(
                rowId,
                e
            );


        /************************************************************
         * NAME / URL
         ************************************************************/

        if (
            myType === 'name' ||
            myType === 'URL'
        ) {

            immediateQueue.push({

                id: rowId,
                record: e,
                original,

                translation: original,

                render: true

            });

            continue;
        }


        /************************************************************
         * PRETRANSLATED
         ************************************************************/

        if (myType === 'pretranslated') {

            immediateQueue.push({

                id: rowId,
                record: e,
                original,

                translation: myTranslated,

                render: false

            });

            continue;
        }


        /************************************************************
         * NORMAL TRANSLATION
         ************************************************************/

        batchQueue.push({

            id: rowId,
            type: 'single',
            record: e,

            items: [

                {
                    id: rowId,
                    line: 1,
                    original
                }

            ]

        });
    }


    /****************************************************************
     * LOCAL LABEL
     ****************************************************************/

    function addLocalLabel(
        rowId,
        expectedForms
    ) {

        const td =
            document.querySelector(
                '#preview-' +
                rowId +
                ' td.translation'
            );

        if (!td) return;


        function insertLabel() {

            if (
                td.querySelector(
                    '.trans_local_div'
                )
            ) {
                return;
            }


            const div =
                document.createElement('div');

            div.setAttribute(
                'class',
                'trans_local_div'
            );

            div.setAttribute(
                'id',
                'trans_local_div'
            );


            div.appendChild(
                document.createTextNode(
                    __('Local')
                )
            );


            const ul =
                td.querySelector(
                    'ul.ul-plural'
                );


            if (ul) {

                ul.insertAdjacentElement(
                    'afterend',
                    div
                );

            } else {

                td.appendChild(div);
            }
        }


        if (
            expectedForms &&
            expectedForms > 1
        ) {

            const observer =
                new MutationObserver(() => {

                    const spans =
                        td.querySelectorAll(
                            'span.translation-text'
                        );


                    const allFilled =
                        spans.length >= expectedForms &&
                        [...spans].every(
                            s =>
                                s.innerHTML.trim() !== '' &&
                                s.innerHTML.trim() !== 'empty'
                        );


                    if (allFilled) {

                        observer.disconnect();

                        insertLabel();
                    }
                });


            observer.observe(
                td,
                {
                    childList: true,
                    subtree: true,
                    characterData: true
                }
            );


            setTimeout(() => {

                observer.disconnect();

                insertLabel();

            }, 2000);

        } else {

            insertLabel();
        }
    }


    /****************************************************************
     * IMMEDIATE QUEUE
     *
     * Exact hetzelfde principe als OpenRouter.
     ****************************************************************/

    for (const item of immediateQueue) {


        /************************************************************
         * PRETRANSLATED PLURAL
         ************************************************************/

        if (item.pluralForms) {

            for (
                let fi = 0;
                fi < item.pluralForms.length;
                fi++
            ) {

                const form =
                    item.pluralForms[fi];


                const preprocessed =
                    await preProcessOriginal(
                        form.original,
                        preTranslationReplace,
                        'lara'
                    );


                const finalText =
                    await postProcessTranslation(
                        form.original,
                        form.translation,
                        replaceVerb,
                        preprocessed,
                        'lara',
                        convertToLower,
                        spellCheckIgnore,
                        locale
                    );


                await processTransl(
                    form.original,
                    finalText,
                    destlang,
                    item.record,
                    item.id,
                    'plural',
                    String(form.line),
                    locale,
                    convertToLower,
                    getBubble(item.id)
                );


                if (
                    fi ===
                    item.pluralForms.length - 1
                ) {

                    addLocalLabel(
                        item.id,
                        item.pluralForms.length
                    );
                }
            }

            continue;
        }


        /************************************************************
         * PRETRANSLATED SINGLE
         ************************************************************/

        if (!item.render) {
            
            console.debug('[Lara Bulk] item.original length:', item.original?.length);
            console.debug('[Lara Bulk] item.original:', item.original);
            console.debug('[Lara Bulk] preTranslationReplace:', preTranslationReplace);
            console.debug('[Lara Bulk] preTranslationReplace type:', typeof preTranslationReplace);
            const preprocessed =
                await preProcessOriginal(
                    item.original,
                    preTranslationReplace,
                    'lara'
                );


            const finalText =
                await postProcessTranslation(
                    item.original,
                    item.translation,
                    replaceVerb,
                    preprocessed,
                    'lara',
                    convertToLower,
                    spellCheckIgnore,
                    locale
                );


            await processTransl(
                item.original,
                finalText,
                destlang,
                item.record,
                item.id,
                'single',
                '',
                locale,
                convertToLower,
                getBubble(item.id)
            );


            addLocalLabel(item.id);

            continue;
        }


        /************************************************************
         * NAME / URL
         ************************************************************/

        const preprocessed =
            await preProcessOriginal(
                item.original,
                preTranslationReplace,
                'lara'
            );


        const finalText =
            await postProcessTranslation(
                item.original,
                item.translation,
                replaceVerb,
                preprocessed,
                'lara',
                convertToLower,
                spellCheckIgnore,
                locale
            );


        await processTransl(
            item.original,
            finalText,
            destlang,
            item.record,
            item.id,
            'single',
            '',
            locale,
            convertToLower,
            getBubble(item.id)
        );
    }


    /****************************************************************
     * BATCH TRANSLATION
     ****************************************************************/

    const batchSize =
        Number(laraBatchSize) || 10;


    const resolvedLanguage =
        laraResolveLanguage(destlang);


    for (
        let i = 0;
        i < batchQueue.length;
        i += batchSize
    ) {

        const batch =
            batchQueue.slice(
                i,
                i + batchSize
            );


        /*
         * Eén array met alle items.
         *
         * Pluralen leveren twee items.
         */

        const allItems =
            batch.flatMap(
                b => b.items
            );


        /************************************************************
         * PREPROCESS + PRUNE GLOSSARY PER ITEM
         ************************************************************/

        const enrichedItems = await Promise.all(
            allItems.map(async item => {

                const preprocessed = await preProcessOriginal(
                    item.original,
                    preTranslationReplace,
                    'lara'
                );

                /*
                 * BELANGRIJK: prune tegen item.original, NIET tegen
                 * preprocessed. preProcessOriginal() kan bronwoorden
                 * vervangen door placeholders / HTML, waardoor de
                 * glossary-termen niet meer in de tekst voorkomen en
                 * pruneGlossary() niets matcht (lege glossary).
                 * Groq/Cerebras prunen ook tegen de originele tekst.
                 */
                const prunedGlossary = await pruneGlossary(
                    openAiGloss,
                    item.original,
                    null
                );

                return {
                    id: item.id,
                    line: item.line,
                    original: item.original,
                    preprocessed,
                    glossary: prunedGlossary || ''
                };
    })
);

        /************************************************************
         * MERGE GLOSSARY FOR THIS BATCH
         ************************************************************/

        const combinedGlossary =
            mergeLaraGlossaries(
                enrichedItems
            );


        /************************************************************
         * BUILD Q ARRAY
         *
         * We sturen alleen de daadwerkelijke tekst.
         *
         * De oorspronkelijke volgorde blijft behouden.
         ************************************************************/

        const texts =
            enrichedItems.map(
                item =>
                    item.preprocessed
            );


        /************************************************************
         * LARA REQUEST
         ************************************************************/

        showTranslationSpinner(
            __(
                'Translating batch ' +
                (
                    Math.floor(i / batchSize) + 1
                ) +
                '…'
            )
        );


        const result =
            await callLaraBatch(
                texts,

                laraAccessKeyId,
                laraAccessKeySecret,

                "en",
                destlang,

                combinedGlossary
            );


        /************************************************************
         * ERROR
         ************************************************************/

        if (
            !result ||
            !result.success
        ) {

            hideTranslationSpinner();

            const error =
                result?.error ||
                "Unknown Lara error";


            console.error(
                '[Lara Bulk] Error:',
                error
            );


            messageBox(
                "warning",
                "Lara error:<br>" + error
            );


            return 'STOPPED';
        }


        /************************************************************
         * NORMALIZE TRANSLATION RESULT
         ************************************************************/

        const translations =
            result.translation;


        if (
            !Array.isArray(translations)
        ) {

            hideTranslationSpinner();

            console.error(
                '[Lara Bulk] Lara did not return an array:',
                translations
            );


            messageBox(
                "warning",
                "Lara returned an invalid batch response."
            );


            return 'STOPPED';
        }


        /************************************************************
         * VERIFY RESULT COUNT
         ************************************************************/

        if (
            translations.length !==
            enrichedItems.length
        ) {

            hideTranslationSpinner();

            console.error(
                '[Lara Bulk] Translation count mismatch:',
                {
                    expected:
                        enrichedItems.length,

                    received:
                        translations.length
                }
            );


            messageBox(
                "warning",
                __(
                    "Lara returned an incorrect number of translations."
                )
            );


            return 'STOPPED';
        }


        /************************************************************
         * WRITE RESULTS
         *
         * Lara behoudt de array-volgorde.
         *
         * Daarom hoeven we geen ID-parser zoals bij OpenRouter
         * te gebruiken.
         ************************************************************/

        for (
            let n = 0;
            n < batch.length;
            n++
        ) {

            const group =
                batch[n];


            for (
                let x = 0;
                x < group.items.length;
                x++
            ) {

                const item =
                    group.items[x];


                /*
                 * enrichedItems heeft exact dezelfde volgorde
                 * als group.items.
                 *
                 * Zoek daarom op object/index.
                 */

                const globalIndex =
                    batch
                        .slice(0, n)
                        .reduce(
                            (count, g) =>
                                count + g.items.length,
                            0
                        ) + x;


                const translation =
                    translations[globalIndex];


                if (
                    translation === undefined ||
                    translation === null
                ) {

                    console.warn(
                        '[Lara Bulk] No translation for:',
                        item.id,
                        item.line
                    );

                    continue;
                }


                /****************************************************
                 * POST PROCESS
                 ****************************************************/

                const enriched =
                    enrichedItems[globalIndex];


                const finalText =
                    await postProcessTranslation(
                        item.original,
                        translation,
                        replaceVerb,
                        enriched.preprocessed,
                        'lara',
                        convertToLower,
                        spellCheckIgnore,
                        locale
                    );


                /****************************************************
                 * WRITE TO GLOTPRESS
                 ****************************************************/

                await processTransl(
                    item.original,
                    finalText,
                    destlang,
                    group.record,
                    group.id,
                    group.type,
                    String(item.line),
                    locale,
                    convertToLower,
                    getBubble(group.id)
                );
            }


            /********************************************************
             * LOCAL LABEL
             ********************************************************/

            addLocalLabel(
                group.id,
                group.items.length
            );
        }


        /************************************************************
         * INTER-BATCH PAUSE
         *
         * Lara heeft geen OpenRouter-achtige retry nodig.
         * Een korte pauze voorkomt echter dat we direct
         * meerdere requests achter elkaar afvuren.
         ********************************************************/

        const isLastBatch =
            i + batchSize >= batchQueue.length;


        if (!isLastBatch) {

            hideTranslationSpinner();

            await new Promise(
                resolve =>
                    setTimeout(resolve, 1000)
            );
        }
    }


    /****************************************************************
     * FINISHED
     ****************************************************************/

    hideTranslationSpinner();


    const progressbar =
        document.querySelector(
            '.indeterminate-progress-bar'
        );


    if (progressbar) {
        progressbar.style.display = 'none';
    }


    messageBox(
        "info",
        __("Translation is ready")
    );


    return 'OK';
}


