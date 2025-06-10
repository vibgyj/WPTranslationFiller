// This script handles all necessary functions to mark a glossary word

// Create glossArray from span elements
function createGlossArray(spanElements) {
    const glossArray = [];
    let glossIndexCounter = 0;

    for (const span of spanElements) {
        const dataTranslations = span.getAttribute('data-translations');
        if (!dataTranslations) continue;

        try {
            const parsedEntries = JSON.parse(dataTranslations);
            const allVariants = [];

            for (const entry of parsedEntries) {
                if (entry.translation) {
                    const unescaped = entry.translation.replace(/\\\//g, '/');
                    const splitVariants = unescaped
                        .split('/')
                        .map(t => t.trim().toLowerCase())
                        .filter(Boolean);
                    allVariants.push(...splitVariants);
                }
            }

            if (allVariants.length > 0) {
                glossArray.push({
                    word: allVariants,
                    originalWord: span.textContent.trim().toLowerCase(),  // <-- store original English word here
                    glossIndex: glossIndexCounter++
                });
            }
        } catch (e) {
            console.warn('Invalid JSON in data-translations:', dataTranslations, e);
        }
    }

    return glossArray;
}

function getPluralFormsForLocale(locale, word) {
    const pluralForms = new Set();

    if (locale === 'nl' || locale === 'nl-be') {
        const lowerWord = word.toLowerCase();

        // Basic Dutch suffixes
        pluralForms.add(lowerWord + 'en');
        pluralForms.add(lowerWord + 's');

        // Handle vowel doubling cases like "attribuut" -> "attributen"
        const longVowelEndings = ['aat', 'oot', 'uut', 'eet', 'iet'];
        for (const ending of longVowelEndings) {
            if (lowerWord.endsWith(ending)) {
                const stem = lowerWord.slice(0, -3); // remove the full long vowel suffix
              //  console.debug("stem:",stem)
                const plural = stem + ending[0] + 'ten'; // e.g., "attribuut" → "attrib" + "u" + "ten" = "attributen"
              //  console.debug("plural:",plural)
                pluralForms.add(plural);
            }
        }

        // Handle '-ing' nouns
        if (lowerWord.endsWith('ing')) {
            pluralForms.add(lowerWord + 'en');
            pluralForms.add(lowerWord.slice(0, -3) + 'ingen');
        }

        // Handle stems ending in -en
        if (lowerWord.endsWith('en')) {
            const stem = lowerWord.slice(0, -2);
            pluralForms.add(stem + 'ing');
            pluralForms.add(stem + 'ingen');
        }

        // Special case for words ending in 'ie'
        if (lowerWord.endsWith('ie')) {
            pluralForms.add(lowerWord + 's'); // strategie -> strategies
            pluralForms.add(lowerWord.slice(0, -2) + 'ieën'); // strategie -> strategieën
        }
    }

    if (locale === 'de') {
        const germanSuffixes = ['e', 'en', 'n', 'er', 's'];
        for (const suffix of germanSuffixes) {
            pluralForms.add(word + suffix);
        }
    }

    if (locale === 'ru') {
        const russianSuffixes = ['ы', 'и', 'а', 'я'];
        for (const suffix of russianSuffixes) {
            pluralForms.add(word + suffix);
        }
    }

    return Array.from(pluralForms);
}

function matchesWithLocalePrefix(locale, variant, translationWord) {
    if (locale === 'nl' || locale === 'nl-be') {
        const prefixes = ['ge', 'her', 'ver', 'be', 'ont'];
        return prefixes.some(prefix =>
            translationWord === prefix + variant
        );
    }

    // Placeholder for future locale logic
    return false;
}


function getInflectedFormsForLocale(locale, word) {
    const forms = new Set();

    if (locale === 'nl' || locale === 'nl-be') {
        // Noun pluralizations
        const commonSuffixes = ['en', 's', 'eren'];
        for (const suffix of commonSuffixes) {
            forms.add(word + suffix);
        }

        if (word.endsWith('en')) {
            const stem = word.slice(0, -2);
            forms.add(stem + 'ing');
            forms.add(stem + 'ingen');
        }

        if (word.endsWith('ing')) {
            forms.add(word + 'en');
            forms.add(word.slice(0, -3) + 'ingen');
        }

        // Adjective inflections (e.g., beschikbaar → beschikbare)
        if (word.endsWith('baar')) {
            forms.add(word + 'e'); // beschikbaar → beschikbare
            const root = word.slice(0, -3); // remove 'aar'
            forms.add(root + 'are');        // beschikbaar → beschikbare
        }
        if (word.endsWith("uut")) {
            const root = word.slice(0, -3); // remove 'uut'
            forms.add(root + 'uten'); 
           // console.debug("in second:",forms)
        }
    }

    if (locale === 'de') {
        const germanSuffixes = ['e', 'en', 'n', 'er', 's'];
        for (const suffix of germanSuffixes) {
            forms.add(word + suffix);
        }
    }

    if (locale === 'ru') {
        const russianSuffixes = ['ы', 'и', 'а', 'я'];
        for (const suffix of russianSuffixes) {
            forms.add(word + suffix);
        }
    }

    return Array.from(forms);
}

function matchesWithLocaleVerbSystem(locale, base, word) {
    if (locale === 'nl' || locale === 'nl-be') {
        const prefixes = ['ge', 'her', 'ver', 'be', 'ont'];
        return prefixes.some(prefix =>
            word === `${prefix}${base}` ||
            word === `${prefix}${base}d` ||
            word === `${prefix}${base}t` ||
            word === `${prefix}${base}en`
        );
    }

    return false;
}

function findAllMissingWords(translationText, glossWords, locale = 'nl') {
    //console.debug("glossWords:", glossWords);
    const translation = translationText.toLowerCase();
    const wordsInTranslation = translation.split(/\W+/);

    const matchPool = {}; // key: stringified word array, value: total matches
    const entriesByKey = {}; // key: stringified word array, value: array of entries
    const missingTranslations = [];

    // Extended domain list including localized TLDs
    const knownTLDs = [
        'com', 'nl', 'be', 'de', 'fr', 'es', 'it', 'eu', 'uk', 'us',
        'net', 'org', 'co', 'biz', 'info', 'io', 'gov', 'edu'
    ];
    const tldPattern = knownTLDs.join('|');

    const urlLikeSegments = (translation.match(new RegExp(`\\b[\\w.-]+\\.(${tldPattern})(\\/\\S*)?\\b`, 'gi')) || []).map(s => s.toLowerCase());

    function isWordInUrl(word) {
        return urlLikeSegments.some(segment => segment.includes(word));
    }

    // First pass: accumulate total matches per word group
    glossWords.forEach((entry) => {
        const wordKey = JSON.stringify(entry.word);

        if (!entriesByKey[wordKey]) entriesByKey[wordKey] = [];
        entriesByKey[wordKey].push(entry);

        if (matchPool[wordKey] !== undefined) return; // already processed

        let matchCount = 0;
        for (const variant of entry.word) {
            const lowerVariant = variant.toLowerCase();
            const isShort = lowerVariant.length <= 2;

            const specialCaseCartMatched = entry.originalWord === 'cart' && translation.includes('winkelwagen');

            const lowerOriginal = entry.originalWord?.toLowerCase();
            const originalAppearsUntranslated = lowerOriginal &&
                translation.includes(lowerOriginal) &&
                !entry.word.some(tw => tw.toLowerCase() === lowerOriginal) &&
                !isWordInUrl(lowerOriginal); // ✅ exclude if it's part of a domain

            const shortMatches = wordsInTranslation.filter(w => w === lowerVariant).length;

            // ✅ Plural and adjective forms (locale-aware)
            const inflectedForms = getInflectedFormsForLocale(locale, lowerVariant);
            const inflectedMatches = wordsInTranslation.filter(w => inflectedForms.includes(w)).length;

            const combinedMatches = (!originalAppearsUntranslated && !isShort)
                ? (translation.match(new RegExp(`\\b\\w*${lowerVariant}\\w*\\b`, 'g')) || []).length
                : 0;

            const totalMatches = shortMatches + inflectedMatches + combinedMatches +
                (specialCaseCartMatched ? 1 : 0);

            matchCount += totalMatches;

            // console.debug(`[DEBUG] Variant "${variant}": short=${shortMatches}, inflected=${inflectedMatches}, combined=${combinedMatches}, total=${totalMatches}`);
        }

        matchPool[wordKey] = matchCount;
    });

    // Second pass: check each group of same word entries
    for (const wordKey in entriesByKey) {
        const entries = entriesByKey[wordKey];
        const expectedCount = entries.length;
        const foundMatches = matchPool[wordKey] || 0;
        const missingCount = expectedCount - foundMatches;

        if (missingCount > 0) {
            const originalWordFoundUntranslated = entries.some(entry => {
                if (!entry.originalWord) return false;
                const lowerOriginal = entry.originalWord.toLowerCase();
                const originalIsTranslation = entry.word.some(tw => tw.toLowerCase() === lowerOriginal);
                return translation.includes(lowerOriginal) && !originalIsTranslation && !isWordInUrl(lowerOriginal);
            });

            if (!originalWordFoundUntranslated) {
                entries.forEach((entry) => {
                    missingTranslations.push({
                        glossIndex: glossWords.indexOf(entry),
                        word: entry.word,
                        missingCount
                    });
                });
            } else {
                entries.forEach((entry) => {
                    const lowerOriginal = entry.originalWord?.toLowerCase();
                    const originalIsTranslation = entry.word.some(tw => tw.toLowerCase() === lowerOriginal);

                    if (lowerOriginal && translation.includes(lowerOriginal) && !originalIsTranslation && !isWordInUrl(lowerOriginal)) {
                        missingTranslations.push({
                            glossIndex: glossWords.indexOf(entry),
                            word: entry.word,
                            missingCount
                        });
                    }
                });
            }
        }
    }

    if (missingTranslations.length > 0) {
        //console.debug("[DEBUG] Missing glossary entries:", missingTranslations);
    }

    return missingTranslations;
}


async function remove_all_gloss(myleftPanel, preview, isPlural,rowId) {
    console.debug("remove_all_glossary:",myleftPanel, isPlural,rowId)
    //console.debug(" preview",preview)
    var spansArray
    if (typeof myleftPanel != 'undefined') {
        //console.debug("isPlural:",isPlural)
        singlepresent = myleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
        console.debug("singlepresent:", singlepresent)
        
        spansSingular = singlepresent.getElementsByClassName("glossary-word")


        if (isPlural) {
            console.debug("we remove a plural")
            pluralpresent = myleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
            console.debug("pluralpresent:",pluralpresent,isPlural)
            spansPlural = pluralpresent.getElementsByClassName("glossary-word")
            spansArray = Array.from(spansPlural)
        }
        else {
            //console.debug("we remove a single")
            spansArray = Array.from(spansSingular)
        }

        // console.debug("remove_all length:",spansArray.length)
        for (let i = 0; i < spansArray.length; i++) {
            // console.debug("spans:",spansArray[i])
            spansArray[i].classList.remove('highlight');
            // spansArray[i].style.color = 'black'; 
            // spansArray[glossIndex].style.textDecorationColor = 'black'; 
        }

    }
    else {
        console.debug("myleftPanel = undefined")
    }
    console.debug("preview:",preview)
    if (preview != 'undefined' && preview !="") {
        //console.debug("now we are going to remove preview markings")
        spansSingular = preview.getElementsByClassName("glossary-word")
        // console.debug("spansSingular:", spansSingular)
        //console.debug("preview:",preview)
        pluralpresent = preview.querySelector(".original li:nth-of-type(1) .original-text");
        //console.debug("pluralpresent:",pluralpresent)
        if (isPlural == true) {
            //console.debug("we remove a plural")
            spansPlural = pluralpresent.getElementsByClassName("glossary-word")
            spansArray = Array.from(spansPlural)
        }
        else {
            //console.debug("we remove a single")
            spansArray = Array.from(spansSingular)
        }

        // console.debug("remove_all length:",spansArray.length)
        for (let i = 0; i < spansArray.length; i++) {
            // console.debug("spans:",spansArray[i])
            spansArray[i].classList.remove('highlight');
            // spansArray[i].style.color = 'black'; 
            // spansArray[glossIndex].style.textDecorationColor = 'black'; 
        }
    }
}

async function mark_glossary(myleftPanel, toolTip, translation, rowId, isPlural) {
    var preview = getPreview(rowId)
   // const expectedWords = [
   //     { glossIndex: 0, word: ['uw'] },
    //    { glossIndex: 1, word: ['site'] },
    //    { glossIndex: 2, word: ['u'] },
   //     { glossIndex: 3, word: ['toevoegen', 'toevoegen'] },
    //    { glossIndex: 4, word: ['uw'] }
   // ];
   // console.debug("expectedWords:", expectedWords)
    //  translation = "je site template is succesvol geïmporteerd en alles is klaar voor gebruik. Het is tijd om persoonlijke accenten toe te voegen en uw eigen magische stofje te strooien.";

    // console.debug(findAllMissingWords(translation, expectedWords));
    //console.debug("mark_glossary:",translation)

   // console.debug("prefix:", matchesWithLocalePrefix('nl', 'site', 'website')); // false
   // console.debug("prefix:", matchesWithLocalePrefix('nl', 'site', 'besite'));  // true
   // console.debug("prefix:", matchesWithLocalePrefix('nl', 'site', 'site'));    // false, prefix does not apply here

    var missingTranslations = [];
    var dutchText = ""
    let locale = checkLocale() || 'en-gb'
    if (translation != "") {
        if (DefGlossary == true) {
            myglossary = glossary;
        } else {
            myglossary = glossary1;
        }
        newGloss = createNewGlossArray(myglossary);
        //console.debug("glossary:", newGloss)
        let markleftPanel = myleftPanel;
        if (markleftPanel != null) {
            singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
            //console.debug("singlepresent:", singlepresent)
            original = singlepresent.querySelector('.original-raw').innerText
            //console.debug("original raw:", original)
            singularText = singlepresent.getElementsByClassName('original')[0];
            if (isPlural == true) {
                pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
                pluralText = pluralpresent.getElementsByClassName('original')[0];
                // console.debug("pluralText:",pluralText)
                if (pluralpresent != null) {
                    spansPlural = pluralpresent.getElementsByClassName("glossary-word");
                }
            }
            if (singlepresent != null) {
                spansSingular = singlepresent.getElementsByClassName("glossary-word");
            }

            if (isPlural == true) {
                spans = spansPlural;
            } else {
                spans = spansSingular;
            }

            if (spans.length > 0) {
                let spansArray = Array.from(spans);
                for (let spancnt = 1; spancnt < spansArray.length; spancnt++) {
                    spansArray[spancnt].setAttribute('gloss-index', spancnt);
                }
                //console.debug("spansarray:", spansArray)
                let glossWords = createGlossArray(spansArray, newGloss);
                dutchText = translation;

                if (isPlural == false) {
                   // await remove_all_gloss(markleftPanel, preview ,false,rowId);
                    missingTranslations = [];
                    //console.debug("original in mark_glossary:", original)
                    //console.debug("translation in mark_glossary:", dutchText)
                    //console.debug("glossWords:", glossWords)
                    missingTranslations = await findAllMissingWords(dutchText, glossWords, locale)
                    //missingTranslations = await findMissingTranslations(glossWords, original, dutchText, newGloss,locale);
                   // console.debug("missingtranslations:", missingTranslations, missingTranslations.length)
                    if (missingTranslations.length > 0) {
                        //console.debug("we found missing")
                        missingTranslations.forEach(({ word, glossIndex }) => {
                           // console.debug("word/index:", word, glossIndex)
                            spansArray[glossIndex].classList.add('highlight');
                        });
                    }
                   // let englishText = "Can be useful if you want to skip certain number of posts. Leave as 0 if you do not want to use it."
                   //PSS the below function should remove correct translated glossary words
                  //  filterMissingGlossarySpans(original, dutchText, glossWords);
                }

                if (isPlural == true) {
                    //await remove_all_gloss(markleftPanel, preview, true,rowId);
                    missingTranslations = [];
                    missingranslations = await findAllMissingWords(dutchText, glossWords, locale)
                    // missingTranslations = await findMissingTranslations(glossWords, original, dutchText, newGloss, locale);

                    if (missingTranslations.length > 0) {
                        missingTranslations.forEach(({ word, glossIndex }) => {
                            spansArray[glossIndex].classList.add('highlight');
                        });
                    }
                }
            }
        }
    } else {
        // console.debug("We do not have a translation!!!");
    }
}


//# mark missing glossary words in original from preview 
async function mark_preview(preview, toolTip, translation, rowId, isPlural) {
    var glossWords
    var dutchText
    var spansArray = []
    var markleftPanel =""
    var missingTranslations = [];
    let locale = checkLocale() || 'en-gb'
    let FoundURL = isOnlyURL(translation);
    if (DefGlossary == true) {
        myglossary = glossary;
    } else {
        myglossary = glossary1;
    }
    newGloss = createNewGlossArray(myglossary);
    //console.debug("in mark original:", FoundURL)
    // We do not want to mark text in an URL
    if (!FoundURL) {
        if (translation != "") {
            // we need to have the leftPanel from preview to mark it
            markleftPanel = await document.querySelector(`#preview-${rowId} .original-text`)
            if (DefGlossary == true) {
                myglossary = glossary
            }
            else {
                myglossary = glossary1
            }
            //newGloss = createNewGlossArray(myglossary)

            
            //console.debug("leftpanel:",markleftPanel,rowId)
            if (markleftPanel != null) {
                
                singlepresent = markleftPanel.innerText;
                singularText = markleftPanel.innerText;
                // we do not need to collect info for plural if it is not a plural
                if (isPlural == true) {
                    //await remove_all_gloss(markleftPanel, preview, true, rowId);
                    pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
                    pluralText = pluralpresent.getElementsByClassName('original')[0]
                    if (pluralpresent != null) {
                        spansPlural = pluralpresent.getElementsByClassName("glossary-word")
                    }
                }
                else {
                   // await remove_all_gloss(markleftPanel, preview, false, rowId);
                }
                if (singlepresent != null) {
                    spansSingular = markleftPanel.getElementsByClassName("glossary-word")
                }

                if (isPlural == true) {
                    spans = spansPlural
                }
                else {
                    spans = spansSingular
                }
            
                if (spans.length > 0) {
                    //console.debug("houston we have a glossary")
                    wordCount = spans.length
                    spansArray = Array.from(spans)
                    for (spancnt = 1; spancnt < (spansArray.length); spancnt++) {
                        spansArray[spancnt].setAttribute('gloss-index', spancnt);
                    }
                    glossWords = createGlossArray(spansArray, newGloss)
                    //console.debug("glossWords:",glossWords,singularText,isPlural)
                    dutchText = translation
                    if (isPlural == false) {
                        missingTranslations = await findAllMissingWords(dutchText, glossWords, locale)
                        if (missingTranslations.length > 0) {
                            document.addEventListener("mouseover", (event) => {
                                const tooltip = document.querySelector(".ui-tooltip");

                                if (tooltip) {
                                    tooltip.style.display = "block"; // Ensure it appears first
                                    setTimeout(() => {
                                        if (!tooltip.matches(":hover")) {
                                            tooltip.style.display = "none"; // Hide only if not hovered
                                        }
                                    }, 2000); // Adjust timing as needed
                                }
                            });

                           // console.debug("spansArray:",spansArray)
                            missingTranslations.forEach(({ word, glossIndex }) => {
                                //console.debug("preview:",preview)
                                //console.debug("classList:", spansArray[glossIndex].classList)
                                //console.debug('Span content:', spansArray[glossIndex]?.textContent);
                                //console.debug(getComputedStyle(spansArray[glossIndex]), spansArray[glossIndex]?.textContent);
                                spansArray[glossIndex].classList.add('highlight');
                                //console.debug('classList after add:', spansArray[glossIndex].classList.value);
                            });
                            // To make it easy to report all records with missing keywords, we set the boolean in the first row
                            rawPreview = document.querySelector(`#preview-${rowId}`)
                            if (is_pte) {
                                rowchecked = rawPreview.querySelector(".checkbox input");
                            }
                            else {
                                rowchecked = rawPreview.querySelector(".myCheckBox input");
                            }
                            if (is_pte) {
                                if (rowchecked != null) {
                                    if (!rowchecked.checked) {
                                        rowchecked.checked = true;
                                    }
                                }
                            }
                            
                        }
                    }

                    else {
                        //await remove_all_gloss(markleftPanel, preview, true)
                        //missingTranslations = [];
                        // Run the function
                        missingTranslations = await findAllMissingWords(dutchText, glossWords, locale)
                        //console.debug(missingTranslations)
                        if (missingTranslations.length > 0) {
                            //console.debug("missing:",missingTranslations)
                            missingTranslations.forEach(({ word, glossIndex }) => {
                                //onsole.debug(`Missing translation for word: "${word}" with gloss-index: ${glossIndex}`);
                                //nsole.debug("span with missing translation:",spansArray[glossIndex])
                                spansArray[glossIndex].classList.add('highlight')
                            });
                        }
                    }
                }
            }
        }
        else {
            //console.debug("We do not have a translation!!!")
        }
    }
    


}

function filterMissingGlossarySpans(englishText, dutchText, glossWords, locale = 'nl') {
    var debug = false;
    const lowerDutch = dutchText.toLowerCase();
    const matchedIndices = new Set();
    if (debug == true) {
        console.debug("englishText:", englishText)
        console.debug("dutchText:", dutchText)
    }
    glossWords.forEach((entry, i) => {
        for (const variant of entry.word) {
            const variantLower = variant.toLowerCase();
            const isShort = variantLower.length <= 2;

            const pluralForms = getPluralFormsForLocale(locale, variantLower);
            const hasPluralMatch = pluralForms.some(pf => lowerDutch.includes(pf));
            const hasExactMatch = lowerDutch.split(/\W+/).includes(variantLower);
            const hasPrefixMatch = matchesWithLocalePrefix(locale, variantLower, lowerDutch);
            const combinedMatch = (!isShort && lowerDutch.match(new RegExp(`\\b\\w*${variantLower}\\w*\\b`, 'g')) || []).length > 0;

            const originalWordAppearsUntranslated = entry.originalWord &&
                new RegExp(`\\b${entry.originalWord.toLowerCase()}\\b`).test(lowerDutch) &&
                !entry.word.some(w => w.toLowerCase() === entry.originalWord.toLowerCase());

            if ((hasExactMatch || hasPluralMatch || hasPrefixMatch || combinedMatch) && !originalWordAppearsUntranslated) {
                matchedIndices.add(entry.glossIndex);
                break;
            }
        }
    });

    console.debug('[DEBUG] Matched glossary indices:', [...matchedIndices]);

    // Remove highlights for matched glossary entries
    document.querySelectorAll('.glossary-word.highlight').forEach(span => {
        const glossIndex = parseInt(span.getAttribute('gloss-index'), 10);
        if (matchedIndices.has(glossIndex)) {
            span.classList.remove('highlight');
        }
    });
}
