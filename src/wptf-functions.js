
/**
 * Applies a flat glossary mapping to a string.
 * Matches exact words (case-insensitive) and replaces them.
 *
 * @param {string} text - de input string
 * @param {Object} glossary - format: { "Website": "site", "appearance": "weergave", ... }
 * @returns {string} - string met glossary toegepast
 */
function applyGlossaryMap(text, glossaryText) {
  if (typeof text !== "string") text = "";
    if (!glossaryText || typeof glossaryText !== "string") return text;

    // Parse glossary lines
    const glossary = {};
    const lines = glossaryText.split(/\r?\n/);
    for (const line of lines) {
        // Match "key": "value"
        const match = line.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
        if (match) {
            const key = match[1];
            const value = match[2];
            glossary[key] = value;
        }
    }

    // Nu kan je dezelfde replace logic gebruiken
    let result = text;

    const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);

    for (const key of keys) {
        const value = glossary[key];
        if (!value) continue;

        // Exact word match, case-insensitive
        const regex = new RegExp(`\\b${escapeRegexKey(key)}\\b`, "gi");
        result = result.replace(regex, value);
    }

    return result;
}

/**
 * Escapes regex special characters in glossary keys
 */
function escapeRegexKey(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}



/**
 * Escapes regex metacharacters in glossary keys
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAt(text, searchValue, replacementValue) {
    if (!text || !searchValue) return text;

    const index = text.indexOf(searchValue);
    if (index === -1) return text;

    return (
        text.slice(0, index) +
        replacementValue +
        text.slice(index + searchValue.length)
    );
}
function removeTrailingNewline(text) {
    return text.replace(/\n+$/, "");
}
function convertGlossaryListToWordsFormat(glossaryString) {
  let id = 1;
  const lines = glossaryString.split(',').map(line => line.trim());

  const words = lines
    .map(line => {
      const match = line.match(/"(.+?)"\s*->\s*"(.+?)"/);
      if (!match) return null;
      const [, source, target] = match;

      // Handmatig JSON string maken met exacte volgorde
      return `{
  "word_id": "${id++}",
  "word_specification": "${source}",
  "meanings": ["${target}"]
}`;
    })
    .filter(Boolean);

  // Plaats alle woorden in "words" array
  return `{ "words": [\n${words.join(',\n')}\n] }`;
}

function normalizeExtraNewlines(originalText, translatedText) {
    // 1️⃣ Bepaal maximale opeenvolgende newlines in de originele tekst
    const matches = originalText.match(/\n+/g) || [];
    const maxNewlines = Math.max(0, ...matches.map(m => m.length)); // 0 is toegestaan

    // 2️⃣ Collapse teveel newlines in de vertaling
    const limitRegex = new RegExp(`\\n{${maxNewlines + 1},}`, "g");
    translatedText = translatedText.replace(limitRegex, "\n".repeat(maxNewlines));

    // 3️⃣ Verwijder eventuele trailing punt + alle trailing newlines
    translatedText = translatedText.replace(/[.]\n*$/s, "");
    translatedText = translatedText.replace(/\n+$/s, ""); // verwijder alles achteraan

    return translatedText;
}


// check centences for all caps words
function enforceAllCaps(source, translated) {
    const sourceWords = source.split(/\s+/);

    const allCapsWords = Array.from(new Set(
        sourceWords.filter(w => /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(w))
    ));

    // 1. Extract and mask URLs
    const urls = [];
    let masked = translated.replace(
        /\b(?:https?:\/\/|www\.)[^\s]+/gi,
        url => {
            urls.push(url);
            return `__URL_${urls.length - 1}__`;
        }
    );

    // 2. Enforce ALL CAPS outside URLs only
    allCapsWords.forEach(word => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        masked = masked.replace(re, m => m.toUpperCase());
    });

    // 3. Restore URLs
    let result = masked.replace(/__URL_(\d+)__/g, (_, i) => urls[i]);

    return result;
}

function convertGlossaryForOllama(input) {
    if (!input) return '';

    return input
        .split(',')                          // split by comma
        .map(pair => pair.trim())             // remove leading/trailing spaces
        .filter(pair => pair.length > 0)      // remove empty entries
        .map(pair => pair.replace(/['"]/g, '')) // remove all quotes
        .sort((a, b) => a.localeCompare(b))   // sort alphabetically A-Z
        .join('\n');                          // join into lines
}
/**
 * Convert a string glossary in 'key -> value' format into an array of pairs
 * Example input:
 *   "appearance -> weergave, array -> array, backend -> back-end"
 * Output:
 *   [
 *     ["appearance", "weergave"],
 *     ["array", "array"],
 *     ["backend", "back-end"]
 *   ]
 */
function convertArrowGlossaryToArray(glossaryString) {
    if (!glossaryString) return [];

    const result = [];

    // split on comma first
    const entries = glossaryString.split(/\s*,\s*/);

    for (const entry of entries) {
        // split on '->'
        const parts = entry.split(/\s*->\s*/);
        if (parts.length === 2) {
            // trim en verwijder eventuele aanhalingstekens
            const key = parts[0].trim().replace(/^"|"$/g, '');
            const value = parts[1].trim().replace(/^"|"$/g, '');
            if (key) result.push([key, value]);
        }
    }

    return result;
}



 function applyOpenAiGlossary(text, Gloss) {
    //console.debug("Applying glossary:", Gloss); 
    if (!text || !Gloss) return text;
    let result = text;
    const applyPair = ([source, target]) => {
        if (!source || !target) return;
        if (source.toLowerCase() === target.toLowerCase()) return; // skip if same

        const regex = new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi");
        result = result.replace(regex, (match) => {
            // alleen vervangen als match niet gelijk is aan target
            if (match.toLowerCase() === target.toLowerCase()) return match;
            return target;
        });
    };

    if (Array.isArray(Gloss)) {
        for (const pair of Gloss) {
            if (!Array.isArray(pair) || pair.length < 2) continue;
            applyPair(pair);
        }
    } else if (typeof Gloss === "object") {
        for (const [source, target] of Object.entries(Gloss)) {
            applyPair([source, target]);
        }
    }
    return result;
}


function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const toBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
    }
    if (typeof value === "number") return value === 1;
    return false;
};

// function to introduce a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
/**
 * Convert comma-separated glossary to Ollama-friendly line format (sorted A-Z)
 * Example input: 
 *   `"appearance" -> "weergave", "array" -> "array", "backend" -> "back-end",`
 * Output:
 *   `'appearance' -> 'weergave'
 *    'array' -> 'array'
 *    'backend' -> 'back-end'`
 */
function convertGlossaryForOllamaMerged(input) {
    if (!input) return '';

    return input
        .split(/\r?\n|,/)                 // split on newlines or commas
        .map(line => line.trim())          // trim spaces
        .filter(line => line.length > 0)   // skip empty lines
        .map(line => {
            // Convert from -> to if needed
            if (line.includes('->')) {
                let [from, to] = line.split('->').map(p => p.trim());
                // Only add quotes if not already present
                if (!/^".*"$/.test(from)) from = `"${from}"`;
                if (!/^".*"$/.test(to)) to = `"${to}"`;
                return `${from}: ${to}`;
            }
            // If already in "key": "value" format, just remove trailing comma
            return line.replace(/,$/, '');
        })
        .filter(line => line.length > 0)
        .join('\n');                       // join as separate lines
}


/**
 * Convert comma-separated glossary to Ollama-friendly line format (sorted A-Z)
 * Each line starts with "- "
 */
function convertGlossaryForOllama(input) {
    if (!input) return '';

    return input
        .split(',')                       // split op komma
        .map(pair => pair.trim())          // verwijder spaties
        .filter(pair => pair.length > 0)   // verwijder lege entries
        .map(pair => pair.replace(/,$/, '')) // verwijder trailing comma als die er nog is
        .join('\n');                       // plak samen per regel
}


function convertGlossaryToQuoted(glossaryText) {
    return glossaryText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && line.includes('->'))
        .map(line => {
            const [from, to] = line.split('->').map(p => p.trim());
            // Zet om naar JSON-stijl: "key": "value"
            return `"${from}": "${to}"`;
        })
        .join(',\n'); // komma en nieuwe regel zodat het als JSON object kan worden geplakt
}


function moveDutchVerbToEndWithCase(translated, glossary) {
    console.debug("glossary:", glossary);
    const words = translated.split(/\s+/).filter(Boolean);
    if (words.length < 2) return translated;

    const firstWord = words[0];

    // Maak array van tweede waarden van de glossary
    const glossaryValues = Object.values(glossary).map(v => v.trim());
    const glossaryValuesLower = glossaryValues.map(v => v.trim().replace(/^"|"$/g, '').toLowerCase());

    console.log("First word:", firstWord);
    console.log("Glossary values:", glossaryValues);
    console.log("Glossary values lowercased (quotes removed):", glossaryValuesLower);

    // Zoek index van eerste woord (case-insensitive)
    const matchIndex = glossaryValuesLower.indexOf(firstWord.toLowerCase());
    if (matchIndex !== -1) {
        console.log("Match found in glossary at index:", matchIndex, "value:", glossaryValues[matchIndex]);

        // Verwijder eerste woord
        words.shift();

        // Zet eerste woord van resterende woorden naar hoofdletter
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);

        return words.join(' ');
    } else {
        console.log("No match found in glossary for:", firstWord);
    }

    return translated;
}






function showTranslationSpinner(text = "Translating…") {
    if (document.getElementById("wpft-translation-spinner")) return;

    const spinner = document.createElement("div");
    spinner.id = "wpft-translation-spinner";
    spinner.innerHTML = `
        <div class="wpft-spinner-box">
            <div class="wpft-spinner"></div>
            <div class="wpft-spinner-text">${text}</div>
        </div>
    `;

    document.body.appendChild(spinner);
}

function hideTranslationSpinner() {
    const spinner = document.getElementById("wpft-translation-spinner");
    if (spinner) spinner.remove();
}

function estimateTokens(text) {
                const extraBuffer = 200; // safety buffer for full response
                const estimated = Math.ceil(text.length / 4) + extraBuffer; // 1 token ≈ 4 chars
                return Math.max(estimated, 200); // minimum 500 tokens
            }
// Helper function to check if a word is inside <button> tags or URLs
//# This function checks if a text contains an URL
/**
 * Returns true if `searchword` occurs inside any href/src/class attribute or any raw URL
 * inside the provided HTML/text `translated`.
 */

function isInsideButtonOrUrl(translatedText, searchWord) {
    // Match <button> tags and URLs
    const buttonRegex = /<button[^>]*>[\s\S]*?<\/button>/gi;
    const codeRegex = /<code[^>]*>[\s\S]*?<\/code>/gi;
    const urlRegex = /\b((https?|ftp|file):\/\/|(www|ftp)\.)[-a-z0-9+&@#\/%?=~_|!:,.;]*[a-z0-9+&@#\/%=~_|]/ig;

    // Check if the word is inside a <button> tag
    const buttonMatches = translatedText.match(buttonRegex);
    if (buttonMatches) {
        for (const match of buttonMatches) {
            if (match.toLowerCase().includes(searchWord.toLowerCase())) {
                return true;  // Found word inside <button>
            }
        }
    }
    // Check if the word is inside a <code> tag
    const codeMatches = translatedText.match(codeRegex);
    if (codeMatches) {
        for (const match of codeMatches) {
            if (match.toLowerCase().includes(searchWord.toLowerCase())) {
                return true;  // Found word inside <code>
            }
        }
    }

    // Check if the word is inside a URL
    const urlMatches = translatedText.match(urlRegex);
    if (urlMatches) {
        for (const match of urlMatches) {
            if (match.toLowerCase().includes(searchWord.toLowerCase())) {
                return true;  // Found word inside URL
            }
        }
    }

    return false;  // Word is not inside button or URL
}

function CheckUrl(translated, searchword) {
    if (!translated || !searchword) return false;

    const lowerWord = searchword.toLowerCase();
    const lowerText = translated.toLowerCase();

    // Match URLs, href/src, class attributes, span, and exclude <button> tags
    const urlRegex = /\b((https?|ftp|file):\/\/|(www|ftp)\.)[-a-z0-9+&@#\/%?=~_|!:,.;]*[a-z0-9+&@#\/%=~_|]|<a[^>]*>|class="[^"]*"|<span[^>]*>|<button[^>]*>/ig;
    const mymatches = lowerText.match(urlRegex);

    if (!mymatches) return false;

    for (const match of mymatches) {
        // Skip if the match is a <button> tag
        if (match.toLowerCase().includes('<button')) {
            continue;
        }

        // Only normalize dashes/underscores in the URL part for detection, **do not modify the original text**
        const normalized = match.replace(/[-_]/g, ' ');  
        if (normalized.includes(lowerWord)) {
            return true;
        }
    }

    return false;
}


function estimateMaxTokens(text) {
    const extraBuffer = 300; // safety buffer for full response
    const estimated = Math.ceil(text.length / 4) + extraBuffer; // 1 token ≈ 4 chars
   //console.debug("In function estimateMaxTokens - estimated tokens:", estimated)
    return Math.max(estimated, 300); // minimum 200 to
}

function escapeRegExpForPronouns(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function enableInterceptSuggestions() {
    localStorage.setItem('interSuggestions', 'true');
}

function disableInterceptSuggestions() {
    localStorage.setItem('interSuggestions', 'false');
}

function insertAlstublieftIfPlease(original, dutch) {
    // Split into sentences (keeping punctuation)
    const engSentences = original.split(/(?<=[.?!])\s+/);
    const dutchSentences = dutch.split(/(?<=[.?!])\s+/);

    for (let i = 0; i < engSentences.length; i++) {
        if (/please/i.test(engSentences[i])) {
            let words = dutchSentences[i].split(/\s+/);

            if (words.length >= 1 && !/\balstublieft\b/i.test(dutchSentences[i])) {
                // Insert AFTER the first word (index 0)
                words.splice(1, 0, "alstublieft");
                dutchSentences[i] = words.join(" ");
            }
        }
    }
    return dutchSentences.join(" ");
}


function replaceVerbInTranslation(english, dutch, replaceVerbs, debug = true) {
    const markerBase = "__REPLACE_";
    let markerIndex = 0;

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Sentence splitter (keeps punctuation + newlines)
    const sentenceSplitRegex = /(.*?)([.?!,;:](?:\s+|\r\n|\r|\n)|\s–\s|\r\n|\r|\n|$)/gs;

    // Initial splitting
    let engMatches = [...english.matchAll(sentenceSplitRegex)].filter(m => m[1].trim() || m[2].trim());
    let dutMatches = [...dutch.matchAll(sentenceSplitRegex)].filter(m => m[1].trim() || m[2].trim());

    let engSentences = engMatches.map(m => m[1] + m[2]);
    let dutchSentences = dutMatches.map(m => m[1] + m[2]);

    if (debug) {
        console.debug("English split:", engSentences);
        console.debug("Dutch split:", dutchSentences);
    }

    // --- NEW STEP: Adjust English commas if sentence counts differ ---
    if (engSentences.length !== dutchSentences.length) {
        let engCommaCount = (english.match(/,/g) || []).length;
        const dutCommaCount = (dutch.match(/,/g) || []).length;

        let adjustedEnglish = english;
        let adjustedEngMatches = engMatches;
        let adjustedEngSentences = engSentences;

        while (adjustedEngSentences.length !== dutchSentences.length && engCommaCount > dutCommaCount) {
            // Remove the first comma in the string (replace only the first)
            adjustedEnglish = adjustedEnglish.replace(',', '');

            // Re-split adjusted English text
            adjustedEngMatches = [...adjustedEnglish.matchAll(sentenceSplitRegex)].filter(m => m[1].trim() || m[2].trim());
            adjustedEngSentences = adjustedEngMatches.map(m => m[1] + m[2]);

            let newEngCommaCount = (adjustedEnglish.match(/,/g) || []).length;

            if (newEngCommaCount === engCommaCount) break; // No comma removed, avoid infinite loop
            engCommaCount = newEngCommaCount;
        }

        engSentences = adjustedEngSentences;
        english = adjustedEnglish;

        if (debug) {
            console.debug("Adjusted English split:", engSentences);
            console.debug("Adjusted English text:", english);
        }
    }
    // --- End of new comma adjustment step ---

    const updatedSentences = [];
    const markerReplacements = [];

    // Keep only valid 3-item entries, then normalize (trim) each part to avoid stray-space bugs.
    const validReplacements = replaceVerbs
      .filter(entry => Array.isArray(entry) && entry.length === 3)
      .map(([en, inf, form]) => [typeof en === 'string' ? en.trim() : en, typeof inf === 'string' ? inf.trim() : inf, typeof form === 'string' ? form.trim() : form]);

    // === Step 1: Pronoun replacement (per English match, preserves mapping) ===
    for (let i = 0; i < dutchSentences.length; i++) {
        const eng = engSentences[i] || "";
        let dut = dutchSentences[i] || "";

        const words = eng.trim().split(/\s+/);
        const firstWord = words[0] || "";
        const rest = words.slice(1).map(w => w.toLowerCase());
        const normalizedEnglish = [firstWord, ...rest];

        if (debug) {
            console.debug(`\n--- Sentence ${i + 1} ---`);
            console.debug("English words (normalized):", normalizedEnglish);
            console.debug("Dutch before replacement:", dut);
        }

        let replacementsThisSentence = [];

        // Process in English word order
        normalizedEnglish.forEach((word) => {
            // Match against trimmed english mapping key
            const matchEntry = validReplacements.find(([en]) => typeof en === 'string' && en === word);
            if (!matchEntry) return;

            const [, informal, formal] = matchEntry;

            if (debug) {
                console.debug(`Match found for "${word}" → looking for Dutch informal "${informal}" → will replace with "${formal}"`);
            }

            // Use trimmed informal in regex (case-insensitive), no global flag here (replace first occurrence per English match)
            let matchRegex = new RegExp(`\\b${escapeRegex(informal)}([.,!?:]?)(\\s|$)`, 'i');
            if (matchRegex.test(dut)) {
                dut = dut.replace(matchRegex, (match, punct, space) => {
                    if (debug) {
                        console.debug("Matched informal:", match);
                    }

                    const marker = `${markerBase}${markerIndex}_0__`;

                    // Extract matched informal portion (case-insensitive)
                    const informalFound = match.match(new RegExp(`^${escapeRegex(informal)}`, 'i'))[0];

                    // Check if first letter is uppercase
                    const isCapitalized = informalFound[0] === informalFound[0].toUpperCase();

                    // Capitalize formal replacement if needed
                    const replacementFinal = isCapitalized
                        ? formal.charAt(0).toUpperCase() + formal.slice(1)
                        : formal;

                    replacementsThisSentence.push({ marker, replacement: replacementFinal + (punct || '') });
                    markerIndex++;

                    return marker + (space || '');
                });
            } else {
                if (debug) {
                    console.debug(`No occurrence of "${informal}" found in Dutch sentence for "${word}"`);
                }
            }
        });

        if (debug) {
            console.debug("Dutch after marker insertion:", dut);
        }

        markerReplacements.push(...replacementsThisSentence);
        updatedSentences.push(dut);
    }

    // === Step 2: Apply all marker replacements ===
    let finalResult = updatedSentences.join("");
    markerReplacements.forEach(({ marker, replacement }) => {
        finalResult = finalResult.replace(marker, replacement);
    });

    // === Step 3: Final cleanup of any remaining informal forms ===
    const foundEnglishPronouns = new Set(
        engSentences.join(" ").toLowerCase().match(/\b(you|your|yours)\b/g) || []
    );

    validReplacements.forEach(([en, informal, formal]) => {
        if (!foundEnglishPronouns.has(en.toLowerCase())) return; // skip if not in original English
        let matchRegex = new RegExp(`\\b${escapeRegex(informal)}([.,!?:]?)(\\s|$)`, 'gi');
        finalResult = finalResult.replace(matchRegex, (match, punct, space, offset) => {
            const before = finalResult.slice(0, offset);
            const isSentenceStart = /^\s*$/.test(before) || /[.?!]\s*$/.test(before);
            const replacementFinal = isSentenceStart
                ? formal.charAt(0).toUpperCase() + formal.slice(1)
                : formal.toLowerCase();
            return replacementFinal + (punct || '') + (space || '');
        });
    });

    // === Step 3b: Extra pass to replace any leftover informal pronouns in Dutch unconditionally ===
    const leftoverInformals = validReplacements.map(([, informal]) => informal).join("|");
    const leftoverRegex = new RegExp(`\\b(${leftoverInformals})\\b([.,!?:]?)(\\s|$)`, "gi");

    finalResult = finalResult.replace(leftoverRegex, (match, informal, punct, space, offset) => {
        // Find formal replacement for this informal pronoun
        const replacementPair = validReplacements.find(([ , inf]) => inf.toLowerCase() === informal.toLowerCase());
        if (!replacementPair) return match; // safety check

        const formal = replacementPair[2];
        const before = finalResult.slice(0, offset);
        const isSentenceStart = /^\s*$/.test(before) || /[.?!]\s*$/.test(before);
        const replacementFinal = isSentenceStart
            ? formal.charAt(0).toUpperCase() + formal.slice(1)
            : formal.toLowerCase();

        return replacementFinal + (punct || '') + (space || '');
    });

    // === Step 4: International polite word insertion (HTML-safe) ===
    const politeEntry = replaceVerbs.find(entry =>
        Array.isArray(entry) && entry.length === 2 && /please/i.test(entry[0])
    );

    if (politeEntry) {
        if (engSentences.length !== dutchSentences.length) {
            if (debug) console.debug("Skipping polite word insertion because sentence counts differ.");
        } else {
            const politeEnglish = politeEntry[0].trim();
            const politeTarget = politeEntry[1].trim();

            const finalEngSentences = engSentences;
            const finalDutchSentences = [...finalResult.matchAll(sentenceSplitRegex)]
                .filter(m => m[1].trim() || m[2].trim())
                .map(m => m[1] + m[2]);

            for (let i = 0; i < finalEngSentences.length; i++) {
                if (new RegExp(`\\b${escapeRegex(politeEnglish)}\\b`, 'i').test(finalEngSentences[i])) {
                    let sentence = finalDutchSentences[i];

                    // Skip if polite word already exists
                    if (new RegExp(`\\b${escapeRegex(politeTarget)}\\b`, 'i').test(sentence)) continue;

                    // Preserve any leading HTML tags
                    const htmlTagPattern = /^(\s*<[^>]+>\s*)+/;
                    const match = sentence.match(htmlTagPattern);
                    const insertPos = match ? match[0].length : 0;

                    // Work only on the text part (after HTML tags)
                    const leadingTags = sentence.slice(0, insertPos);
                    const textPart = sentence.slice(insertPos).trim();

                    // Split into words
                    const words = textPart.split(/\s+/);

                    if (words.length > 0) {
                        let insertAfterIndex = 0; // default: after first word

                        // If the second word is "het" (case-insensitive), insert after that instead
                        if (words.length > 1 && words[1].toLowerCase() === "het") {
                            insertAfterIndex = 1;
                        }

                        // Insert polite word
                        words.splice(insertAfterIndex + 1, 0, politeTarget);

                        // Rebuild sentence
                        sentence = leadingTags + words.join(" ");
                    }

                    finalDutchSentences[i] = sentence;
                    if (debug) console.debug(`Inserted "${politeTarget}" in sentence ${i + 1}:`, sentence);
                }
            }

            finalResult = finalDutchSentences.join("");
        }
    } else {
        if (debug) console.debug("No polite word mapping found in replaceVerbs, skipping polite insertion.");
    }

    if (debug) {
        console.debug("\n=== FINAL RESULT ===");
        console.debug(finalResult);
    }

    return finalResult;
}



function preparePlaceholdersForTranslation(input, replaceVerbs) {
  const placeholderTagMap = {};
  let output = input;

  output = output.replace(/<x id="([^_]+)_(\d+)">(.+?)<\/x>/g, (match, baseWord, indexStr, innerText) => {
    const index = Number(indexStr);
    const isUpper = /^[A-Z]/.test(innerText);
    const token = (isUpper ? "X_" : "x_") + index;
    placeholderTagMap[token] = baseWord;
    return `<x id="${baseWord}_${index}">${token}</x>`;
  });

  return { cleanedText: output, placeholderTagMap };
}

function replaceOneByOne(text, from, to, maxCount) {
    if (!to || maxCount <= 0) return { text, count: 0 };

    const pattern = new RegExp(`\\b${from}\\b`);
    let count = 0;

    const newText = text.replace(pattern, (match) => {
        if (count < maxCount) {
            count++;
            return to;
        }
        return match;
    });

    return { text: newText, count };
}
function convertToNumber(text) {
    const num = Number(text);
    return (!isNaN(num) && text !== null && text !== '') ? num : 0;
}

function buildTooltipFromGlossaryArray(missingEntries) {
    const words = missingEntries.map(entry => entry.word[0]); // get first word from each entry
    return words.join(', ');
}

function whoCalledMe() {
    const err = new Error();
    const stackLines = err.stack.split('\n');

    // stackLines[0] is "Error"
    // stackLines[1] is this function (whoCalledMe)
    // stackLines[2] is the caller
    const callerLine = stackLines[2] || '';
    console.log("Caller line:", callerLine);

    const match = callerLine.match(/at (\w+)/);
    return match ? match[1] : 'unknown';
}
function setupTooltipHandler() {
    document.addEventListener("mouseover", (event) => {
        const tooltip = document.querySelector(".ui-tooltip");

        // Only act if hovering over an element that has a tooltip
        if (event.target.closest(".has-tooltip") && tooltip) {
            tooltip.style.display = "block";
            setTimeout(() => {
                if (!tooltip.matches(":hover") && !event.target.matches(":hover") && !event.target.closest(".dropdown")) {
                    tooltip.style.display = "none";
                }
            }, 2000);
        }
    });

    document.addEventListener("mouseout", (event) => {
        const tooltip = document.querySelector(".ui-tooltip");

        // Only act if the mouse left a tooltip-related element and not a dropdown
        if (tooltip && !event.relatedTarget?.closest(".ui-tooltip") && !event.relatedTarget?.closest(".has-tooltip") && !event.relatedTarget?.closest(".dropdown")) {
            tooltip.style.display = "none";
            tooltip.style.position = "";
            tooltip.style.background = "transparent";
            tooltip.style.border = "none";
            tooltip.style.boxShadow = "none";
            tooltip.style.left = "";
            tooltip.style.top = "";
            tooltip.innerHTML = "";

            if (tooltip.parentElement) {
                tooltip.parentElement.style.position = "";
            }

            tooltip.remove();
        }
    });
}

function oldcountOccurrences(text, term) {
    // Handle contractions and count occurrences correctly
    const pattern = new RegExp(`(?:\\b|')${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(pattern);

    // Debugging output
    console.debug(`Searching for term: "${term}", found ${matches ? matches.length : 0} occurrences in text: "${text}"`);

    return (matches || []).length;
}



// This function shows the amount of records present in the local translation table
function Show_RecCount() {
    let count_locale = checkLocale();
    DispCount = document.createElement("a");
    DispCount.href = "#";
    DispCount.className = "DispCount-button";
    countTable(count_locale).then(count => {
        var divPaging = document.querySelector("div.paging");
        if (divPaging != null) {
            DispCount.innerText = count
            if (count == 1) {
                DispCount.style.background = 'yellow'
            }
            divPaging.insertBefore(DispCount, divPaging.childNodes[0]);

        }
    });
}

function getGlotDictStat() {
        var scripts = document.getElementsByTagName('script');
        //console.debug("scripts:", scripts)
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src');
            if (src && src.includes('glotdict.js')) {
                //console.debug("we found glotdict")
                return true;
            }
        }
        return false;
}

function check_untranslated() {
    var preview_list;
    // select all untranslated, if they are not present we can go on
    preview_list = document.querySelectorAll("tr.preview.no-translations");
    if (preview_list.length > 0) {
        return true;
    }
    else {
        return false;
    }
}
 
function findFirstBlankAfter(text, startPosition) {
    // this function finds the first word after the semi colon
    for (let i = startPosition; i < text.length; i++) {
        if (text[i] === ' ' || text[i] === '.' || text[i] === '"') {
            switch (text[i]) {
                case ".":
                    //console.debug("found period")
                    i = i - 1
                case '"':
                    i = i - 1
            }
            return i; // Found a blank, ".", or '"' character, return its position
        }
    }
    return -1; // Blank not found after startPosition
}

function unEscape(htmlStr) {
    // function is a fix for issue #300 remove those chars from innerHTML result
    htmlStr = htmlStr.replace(/&lt;/g, "<");
    htmlStr = htmlStr.replace(/&gt;/g, ">");
    htmlStr = htmlStr.replace(/&quot;/g, "\"");
    htmlStr = htmlStr.replace(/&#39;/g, "\'");
    htmlStr = htmlStr.replace(/&amp;/g, "&");
    return htmlStr;
}


function checkDiscussion() {
    // This function checks if we are on the discussion table
    const locString = window.location.href;
    if (locString.includes("discussions")) {
        return true;
    }
    else {
        return false;
    }
}

function findArrayLine(allrows, original, transtype, plural_line) {
    // this function searches for the translation of an original within the loaded array
    var myorg;
    var res = 'notFound';
    var trans = " ";
    var result;
    //console.debug("transtype: ", transtype,original,plural_line)
    if (transtype === "single") {
        myorg = "msgid " + '"' + original + '"';
    }
    if (transtype === "plural" && plural_line == 1) {
        myorg = "msgid " + '"' + original + '"';
    }
    if (transtype === "plural" && plural_line == 2) {
        myorg = "msgid_plural " + '"' + original + '"';
    }
    //console.debug("in findArray orginal: ",original,myorg)

    result = allrows.indexOf(myorg);
    // console.debug("Did we find: ",myorg+" ",result)
    //console.debug("found:", result)
    if (transtype == "single") {
        if (result != -1) {
            trans = allrows.find((el, idx) => typeof el === "string" && idx === result + 1);
            //console.debug("Translation:", trans)
            res = trans.replace("msgstr ", "");
            res = res.slice(1, -1);
        }
        else {
            res = 'notFound';
        }
    }
    //console.debug("transtype = plural and plural_line =1:", result)
    if (transtype == "plural" && plural_line == 1) {
        // console.debug("transtype = plural and plural_line =1:",result)
        if (result != -1) {
            trans = allrows.find((el, idx) => typeof el === "string" && idx === result + 2);
            if (trans != -1) {
                res = trans.replace("msgstr[0] ", "");
                res = res.slice(1, -1);
                // console.debug("first line of plural: ", res);
            }
            else {
                res = "notFound";
            }
        }
        else {
            res = 'notFound';
        }
    }
    if (transtype == "plural" && plural_line == 2) {
        if (result != -1) {
            trans = allrows.find((el, idx) => typeof el === "string" && idx === result + 2);
            if (trans != -1) {
                res = trans.replace("msgstr[1] ", "");
                res = res.slice(1, -1);
                //console.debug("second line of plural:", res);
            }
            else {
                res = "notFound";
            }
        }
        else {
            res = 'notFound';
        }
    }

    return res;
}


function addtoClipBoardClicked(event) {
    // This function copies the original to the clipboard
    if (event != undefined) {
        event.preventDefault();
        copyToClipBoard(detailRow);
    }
}

function copyToClipBoard(detailRow) {
    let e = document.querySelector(`#editor-${detailRow} div.editor-panel__left div.panel-content`);
    if (e != null) {
        var content = e.querySelector("span.original-raw").innerText;
        if (content != null) {
            navigator.clipboard.writeText(content);
            toastbox("info", "Copy original to clipboard<br>" + content, "2500", "Copy");
        }
        else {
            toastbox("error", "No text found to copy", "1200", "Error");
        }
    }
    else {
        toastbox("error", "No text found to copy", "1200", "Error");
    }
}

function addCheckBox() {
    var BulkButton;
    // 18-10-2022 Fix for issue #253 table header wrong within tab discussions
    var discussion = checkDiscussion();
    if (!discussion) {
        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
        // if the translator is a PTE than we do not need to add the extra checkboxes
        if (!is_pte) {
            tablehead = document.getElementById("translations");
            BulkButton = document.createElement("button");
            BulkButton.id = "tf-bulk-button";
            BulkButton.className = "tf-bulk-button";
            BulkButton.onclick = startBulkSave;
            BulkButton.innerText = "Start";

            if (tablehead != null) {
                hoofd = tablehead.rows[0];
                var y = hoofd.insertCell(0);

                y.outerHTML = "<th class= 'thCheckBox' display:'table-cell'>Bulk</th>";
                var blkButton = document.querySelector("th.thCheckBox");
                //console.debug("bulk:", blkButton)
                // if (blkButton == null) {
                if (typeof blkButton != null) {
                    blkButton.appendChild(BulkButton);
                }
                //}
                for (let e of document.querySelectorAll("tr.preview")) {
                    //let mycheckBox = e.querySelector("td input");
                    //console.debug("mycheckbox:", mycheckBox)
                    var x = e.insertCell(0);
                    x.className = "myCheckBox";
                }
            }
        }
    }
}

function setmyCheckBox(event) {
    var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
    // if the translator is a PTE than we do not need to add the extra checkboxes
    if (!is_pte) {
        //document.getElementsByClassName("myCheckBox").checked = true;
        document.querySelectorAll("tr.preview").forEach((preview, i) => {
            // if (!is_pte) {
            rowchecked = preview.querySelector("td input");
            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    prevtext = preview.querySelector("td.translation").innerText;
                    // Do not tick the box if preview contaings "No suggestions" issue #221
                    // Do not tick the box if preview has no translatione.g. "Double-click to add" issue #223
                    if (prevtext.search("No suggestions") == -1 && prevtext.search("Double-click to add") == -1) {
                        preview.querySelector("td input").checked = true;
                    }
                }
                else {
                    prevtext = preview.querySelector("td.translation").innerText;
                    if (prevtext.search("No suggestions") == -1 && prevtext.search("Double-click to add") == -1) {
                        preview.querySelector("td input").checked = false;
                    }
                }
            }
            // }
        });
    }
    else {
        document.querySelectorAll("tr.preview").forEach((preview, i) => {
            // if (!is_pte) {
            rowchecked = preview.querySelector("th input");
            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    prevtext = preview.querySelector("td.translation").innerText;
                    // Do not tick the box if preview contaings "No suggestions" issue #221
                    // Do not tick the box if preview has no translatione.g. "Double-click to add" issue #223
                    if (prevtext.search("No suggestions") == -1 && prevtext.search("Double-click to add") == -1) {
                        preview.querySelector("th input").checked = true;
                    }
                }
            }
            // }
        });
    }

}

function deselectCheckBox() {
    const is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;

    // Loop through all preview rows
    document.querySelectorAll("tr.preview").forEach((preview) => {
        let rowchecked = null;

        if (is_pte) {
            // PTE users: checkbox inside .checkbox td
            rowchecked = preview.querySelector(".checkbox input[type='checkbox']");
        } else {
            // Non-PTE users: checkbox inside .myCheckBox td
            rowchecked = preview.querySelector(".myCheckBox input[type='checkbox']");
        }

        // Uncheck if it exists and is checked
        if (rowchecked && rowchecked.checked) {
            rowchecked.checked = false;
        }
    });
}


async function validateOld(showDiff) {
    var counter = 0;
    var vartime = 20000;
    var timeout = 0;
    var row;
    var rowfound;
    var newrow
    var startTime;
    var records = {};
    var textareaElem;
   // console.debug("we are checking for old strings");
   
    const template = `
    <div class="indeterminate-progress-bar">
        <div class="indeterminate-progress-bar__progress"></div>
    </div>
    `;
    var myheader = document.querySelector('header');
    // setPostTranslationReplace(postTranslationReplace, formal);
    records = await document.querySelectorAll("tr.preview")
    // we do not want to show the progress bar outside of the project table list
    //console.debug("lengte:",records.length,typeof records.length)
    if ((records.length) > 1) {
        let progressbar = document.querySelector(".indeterminate-progress-bar");
        if (progressbar == null) {
            myheader.insertAdjacentHTML('afterend', template);
        }
        else {
            progressbar.style.display = 'block';
        }
        
        // 12 - 06 - 2021 PSS added project to url so the proper project is used for finding old translations
        let f = document.getElementsByClassName("breadcrumb");

        if (f[0] != null) {
            if (typeof f[0].firstChild != 'undefined') {
                let url = f[0].firstChild.baseURI;
                newurl = url.split("?")[0];
            }
            else {
                let url = ""
                newurl = ""
            }
        }
        else {
            let url = ""
            newurl = ""
        }
        // console.debug("newurl:", newurl)
        let single = "False";
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const processRecordWithDelay = async (record, delay,processed) => {
            try {
                const startTime = Date.now(); // Record the start time
                // Simulate processing the record
                let myrow = record.getAttribute("row");
                row = myrow
                rowId = row
                //   }
                let originalElem = record.querySelector(".original");
                counter++;
                current = document.querySelector("#editor-" + row + " div.editor-panel__left div.panel-header span.panel-header__bubble");
                textareaElem = record.querySelector(".translation.foreign-text");
                // console.debug("current:", current.innerText)
                let showName = false;
                //let showDiff = true;
                if (textareaElem != null) {
                    let prev_trans = textareaElem.innerText;
                    //console.debug("translation:", prev_trans)
                    // we need to set default values, otherwise errors will popup
                    let currcount = 0;
                    let wordCount=0;
                    let foundCount = 0;
                    let percent =100
                    let toolTip="";
                    let newText=""
                    let result = { wordCount, foundCount, percent, toolTip, newText }

                    checkElem = record.querySelector(".priority");
                    if (current.innerText != 'untranslated' && current.innerText != null) {
                        await fetchOld(checkElem, result, newurl + "?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D=" + row + "&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc", single, originalElem, row, rowId, showName, current.innerText, prev_trans, currcount, showDiff);
                    }
                }
                else {console.debug("we could not fetch the text of the record, probably de to 429 error")}
                const endTime = Date.now(); // Record the end time
                const timeDifference = endTime - startTime; // Calculate the time difference
                //console.log('Time taken for processing this record:', timeDifference, 'milliseconds');
                //console.debug("record!:",record)
                return record; // Return the processed record (if needed)
            } catch (error) {
                console.error('Error processing record:', error.message);
                throw error;
            }
        };

        const delayBetweenProcessing = 100; // Delay between processing each record in milliseconds

        const processRecordsSequentially = async () => {
            try {
                for (let i = 0; i < records.length; i++) {
                    await processRecordWithDelay(records[i], delayBetweenProcessing);
                    if (i < records.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delayBetweenProcessing)) 
                    }
                    else {
                        if ((records.length) > 1) {
                            let check=__("Check old is ready")
                            toastbox("info", check, "2500", "Checked");
                          //  let check=__("Check old is ready")
                          //      messageBox("info", check)
                            }
                    // checking old records done
                        progressbar = document.querySelector(".indeterminate-progress-bar");
                        let progressbarStyle = document.querySelector(".indeterminate-progress-bar__progress");

                        progressbarStyle.style.animation = 'none'
                        progressbar.style.display = "none";            
                        }
                }
            } catch (error) {
                console.error('Error processing records:', error.message);
            }
        };

        processRecordsSequentially();
    }
}

// PSS -------------------------------------------------------------------------------
function stripQuotes(str) {
    return str.replace(/^["']|["']$/g, '');
}
function oldmatchesWithDutchVerbPrefix(baseWord, tokens, locale = 'nl') {
    const localePrefixes = {
        'nl': ['ge', 'her', 'ver', 'be', 'ont', 'op'],
        'nl-be': ['ge', 'her', 'ver', 'be', 'ont', 'op']
    };

    const prefixes = localePrefixes[locale] || [];

    return tokens.some(token => {
        for (const prefix of prefixes) {
            if (
                token.startsWith(prefix) &&
                token.endsWith(baseWord) &&
                token.length > baseWord.length + 1
            ) {
                return true;
            }
        }
        return false;
    });
}
function normalizeText(text) {
    return (typeof text === 'string' ? text : '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/<[^>]*>/g, '')         // Remove HTML tags
        .replace(/%[\d\$]*[a-z]/gi, '')  // Remove placeholder tokens like %s, %1$s
        .replace(/[^\w\s]/g, ' ')        // Replace non-word chars with space
        .replace(/\s+/g, ' ')            // Collapse spaces
        .trim();
}

function oldnormalizeText(text) {
    return (typeof text === 'string' ? text : '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/<[^>]*>/g, '')   // Remove HTML tags
        .replace(/%[\d\$]*[a-z]/gi, '')  // Remove placeholder tokens like %s, %1$s
        .replace(/[^\w\s]/g, ' ') // Replace non-word chars with space
        .replace(/\s+/g, ' ')     // Collapse spaces
        .trim();
}



//------------------------------------------------------------------------------

async function wrongmark_glossary(myleftPanel, toolTip, translation, rowId, isPlural) {
    // If already processing, exit early
    var dutchText=""
    if (isProcessing) return;

    isProcessing = true;  // Set the flag to indicate processing is in progress

    try {
        var missingTranslations = [];
        if (translation != "") {
            if (DefGlossary == true) {
                myglossary = glossary;
            } else {
                myglossary = glossary1;
            }
            newGloss = createNewGlossArray(myglossary);

            let markleftPanel = myleftPanel;
            if (markleftPanel != null) {
                singlepresent = markleftPanel.querySelector(`.editor-panel__left .source-string__singular`);
                singularText = singlepresent.getElementsByClassName('original')[0];
                if (isPlural == true) {
                    pluralpresent = markleftPanel.querySelector(`.editor-panel__left .source-string__plural`);
                    pluralText = pluralpresent.getElementsByClassName('original')[0];
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
                    let glossWords = createGlossArray(spansArray, newGloss);
                    dutchText = translation;

                    if (isPlural == false) {
                       // await remove_all_gloss(markleftPanel, false);
                        missingTranslations = [];
                        missingTranslations = await findAllMissingWords(dutchText, glossWords, locale)
                        //missingTranslations = await findMissingTranslations(glossWords, original, dutchText, newGloss, "nl");

                        if (missingTranslations.length > 0) {
                            missingTranslations.forEach(({ word, glossIndex }) => {
                                spansArray[glossIndex].classList.add('highlight');
                            });
                       // } else {
                        //    await remove_all_gloss(markleftPanel, false);
                        }
                    }

                    if (isPlural == true) {
                        //await remove_all_gloss(markleftPanel, true);
                        missingTranslations = [];
                        missingTranslations = await findMissingTranslations(glossWords, original, dutchText, newGloss, "nl");

                        if (missingTranslations.length > 0) {
                            missingTranslations.forEach(({ word, glossIndex }) => {
                                spansArray[glossIndex].classList.add('highlight');
                            });
                      //  } else {
                      //      await remove_all_gloss(markleftPanel, true);
                        }
                    }
                }
            }
        } else {
            console.debug("We do not have a translation!!!");
        }
    } finally {
        isProcessing = false;  // Reset the flag to allow future executions
    }
}


async function validatePage(language, showHistory, locale, showDiff, DefGlossary) {
    // This function checks the quality of the current translations
    // added timer to slow down the proces of fetching data
    // without it we get 429 errors when fetching old records
    var translation;
    var prev_trans;
    var rowcount = 0;
    var checkbox;
    var my_line_counter;
    var myGlotDictStat;
    var newurl;
    var old_status;
    var formal = checkFormal(false);
    var myglossary = ""
    //console.debug("Is formal:",formal)
    if (formal == true) {
        //console.debug("we have formal")
        DefGlossary == true
        myglossary = glossary1
    }
    else {
        DefGlossary == false
        myglossary = glossary
    }
    //console.debug("validatePage glossary:",myglossary)
    // html code for counter in checkbox
    const line_counter = `
    <div class="line-counter">
        <span class="text-line-counter"></span>
    </div>
    `;

    // 12-06-2021 PSS added project to url so the proper project is used for finding old translations
    let f = document.getElementsByClassName("breadcrumb");
    //console.debug("breadcrumb:",f)
    if (f[0] != null) {
        if (typeof f[0].firstChild != 'undefined') {
            let url = f[0].firstChild.baseURI;
            newurl = url.split("?")[0];
        }
        else {
            let url = ""
            newurl = ""
        }
    }
    else {
        let url = ""
        newurl = ""
    }
    var divProjects = document.querySelector("div.projects");
    // We need to set the priority column only to visible if we are in the project 
    // PSS divProjects can be present but trhead is empty if it is not a project
    var tr = document.getElementById("translations");
    // 18-10-2022 Fix for issue #253 table header wrong within tab discussions
    //console.debug("Trows:",tr)
    var discussion = checkDiscussion();
    if (!discussion) {
        if (tr != null) {
            trhead = tr.tHead.children[0]
            // 26-06-2021 PSS set  the visibillity of the Priority column back to open
            trprio = trhead.children[1];
            trprio.style.display = "table-cell";
            trprio.innerHTML = "Qual";
            var all_col = document.getElementsByClassName("priority");
            for (var i = 0; i < all_col.length; i++) {
                all_col[i].style.display = "table-cell";
            }
        }
    }
    // await set_glotdict_style().then(function (myGlotDictStat) {
    //console.debug("glotdict:", myGlotDictStat)
    // Use the retrieved data here or export it as needed
    // increase the timeout if buttons from GlotDict are not shown
    // this set when the checkbox show GlotDict is set
    // var increaseWith = 0
    // var timeout = 0;
    // if (myGlotDictStat) {
    //  timeout = 100;
    // increaseWith = 50
    // }
    myGlotDictStat = await set_glotdict_style();

    // 2. Determine timeout based on result
    let timeout = 0;
    if (myGlotDictStat) {
        timeout = 1000; // or 50, 200, etc.
    }
    else {
        timeout = 0
    }

    // 3. Wait for that timeout
    await sleep(timeout);

    // 4. Now run your loop


    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        // setTimeout(async function() {
        rowcount++
        let original = e.querySelector("span.original-raw").innerText;
        let textareaElem = e.querySelector("textarea.foreign-text");
        let rowId = textareaElem.parentElement.parentElement.parentElement
            .parentElement.parentElement.parentElement.parentElement.getAttribute("row");

        // we need to fetch the status of the record to pass on
        let preview = document.querySelector("#preview-" + rowId)
        old_status = document.querySelector("#preview-" + rowId);
        /// checkbox = old_status.querySelector('input[type="checkbox"]'
        if (old_status != null) {
            checkbox = old_status.getElementsByClassName("checkbox")
            glossary_word = old_status.getElementsByClassName("glossary-word")
        }
        if (checkbox[0] != null) {
            my_line_counter = checkbox[0].querySelector("div.line-counter")
            // mark lines with glossary word into checkbox
            if (glossary_word.length != 0) {
                checkbox[0].style.background = "LightSteelBlue"
                checkbox[0].title = "Has glossary word"
            }
            // add counter to checkbox, but do not add it twice      
            if (my_line_counter == null) {
                checkbox[0].insertAdjacentHTML('afterbegin', line_counter);
                let this_line_counter = checkbox[0].querySelector("span.text-line-counter")
                this_line_counter.innerText = rowcount
            }

        }
        else {
            // if not a PTE it must be put in a different checkbox
            //console.debug("we are not a PTE")
            if (old_status != null) {
                let mycheckbox = old_status.getElementsByClassName("myCheckBox")
                mycheckbox[0].insertAdjacentHTML('afterbegin', line_counter);
                let this_line_counter = mycheckbox[0].querySelector("span.text-line-counter")
                this_line_counter.innerText = rowcount
                if (glossary_word.length != 0) {
                    mycheckbox[0].style.background = "LightSteelBlue"
                    mycheckbox[0].title = "Has glossary word"
                }
            }
            // mycheckbox[0].textContent = rowcount
        }
        let element = e.querySelector(".source-details__comment");
        let toTranslate = false;
        let showName = false;
        if (element != null) {
            // Fetch the comment with name
            let comment = e.querySelector("#editor-" + rowId + " .source-details__comment p").innerText;
            if (comment != null) {
                toTranslate = checkComments(comment.trim());
            }
            else {
                toTranslate = true;
            }
        }
        else {
            toTranslate = true;
        }
        if (toTranslate == false) {
            showName = true;
        }
        else {
            showName = false;
        }
        if (textareaElem.innerText != "") {
            translation = textareaElem.innerText;
            // console.debug("we do have a innerText")
        }
        else {
            translation = textareaElem.textContent
        }
        //console.debug("showname:",showName)
        if (showName == true) {
            // We need to check if the translation is exactly the same as the original
            nameDiff = isExactlyEqual(original, translation)
            if (nameDiff == true) {
                // we are equal
                nameDiff = false;
            }
            else {
                nameDiff = true
            }
        }
        else {
            // it is not a name, so we do not show the label
            nameDiff = false;
        }
        //console.debug("ValidatePage nameDiff:", nameDiff+" "+rowId)
        // console.debug("ValidatePage showName:",showName)
        var result = validate(language, original, translation, locale, false, rowId, false, DefGlossary);
        // console.debug("validate in validatepage line 853:",original,result)
        let record = e.previousSibling.previousSibling.previousSibling
        // this is the start of validation, so no prev_trans is present      
        prev_trans = translation
        // PSS this is the one with orange
        updateStyle(textareaElem, result, newurl, showHistory, showName, nameDiff, rowId, record, false, false, translation, [], prev_trans, old_status, showDiff);
        mark_preview(preview, result.toolTip, textareaElem.textContent, rowId, false)
        //}, waiting);
        if (rowcount == 1) {
            //console.debug(" we are starting observer")
            // console.debug("e:",e)
            mytextarea = e.getElementsByClassName('foreign-text')

            // 30-06-2021 PSS set fetch status from local storage
            chrome.storage.local.set({ "noOldTrans": "False" }, function () {
                // Notify that we saved.
                // alert("Settings saved");
            });
        }
    }
}

function countWordsinTable() {
    var counter = 0;
    var wordCount = 0;
    var pluralpresent;
    var original;
    // toastbox("info", "Counting started", "1000", "Counting");
    for (let record of document.querySelectorAll("tr.preview")) {
        counter++;
        pluralpresent = record.querySelector(`.translation.foreign-text li:nth-of-type(1) span.translation-text`);
        if (pluralpresent != null) {
            wordCount = wordCount + countWords(pluralpresent.innerText);
            pluralpresent = record.querySelector(`.translation.foreign-text li:nth-of-type(2) span.translation-text`).innerText;
            wordCount = wordCount + countWords(pluralpresent);
        }
        else {
           // console.debug('record:', record)
            myClassList = record.classList
           // console.debug("classlist:",myClassList)
            if (myClassList.contains('status-current') || myClassList.contains('untranslated')) {
                original = record.querySelector("span.original-text");
                //console.debug("original:", original)
                if (original != null) {
                    wordCount = wordCount + countWords(original.innerText);
                }
            }
            //else {console.debug("not found!") }
        }
    }
    // console.debug("records counted:", counter, wordCount);
    messageBox("info", "Records counted: " + counter+ " Words counted:" + wordCount);
}

async function set_glotdict_style() {
    // this function sets the color of the box for glossary words present within a single line
    return new Promise(function (resolve) {
        let myTimeout = 100;
        setTimeout(() => {
            chrome.storage.local.get(["glotDictGlos"],
                function (data) {
                    let myGlotDictStat = getGlotDictStat()
                    //console.debug("is GlotDict active:", myGlotDictStat)
                    if (myGlotDictStat) {
                        var is_pte = document.querySelector("#bulk-actions-toolbar-top") !== null;
                        //if (showGlosLine==true) {
                        // 09-09-2021 PSS added fix for issue #137 if GlotDict active showing the bar on the left side of the prio column
                        showGlosLine = data.glotDictGlos;
                        //console.debug("showGlosLine", showGlosLine)
                        // Do not show the GlotDict
                        if (showGlosLine == 'false') {
                            //console.debug("showGlosLine:", showGlosLine)
                          //  console.debug("pte:", is_pte)
                            if (is_pte) {
                                //console.debug("We are PTE")
                                const style = document.createElement("style");
                                style.innerHTML = `
                              table.translations tr.preview.has-glotdict .original::before {
                              display: none !important;
                            }
                            `;
                                document.head.appendChild(style);
                            }
                            else {
                                const style = document.createElement("style");
                                style.innerHTML = `
                             table.translations tr.preview.has-glotdict .original::before {
                              display: none !important;
                        }
                        `;
                                document.head.appendChild(style);
                            }
                        }
                        else {
                            // show GlotDoct is active
                            //console.debug("are we PTE:", is_pte)
                            if (is_pte) {
                                //console.debug("we are showing the GlotDict")
                                const style = document.createElement("style");
                                style.innerHTML = `
                               table.translations tr.preview.has-glotdict .original::before {
                               width: 3px !important;
                               position: inline !important;
                               margin-left: -14px !important;
                               top: calc(-0.5em + 17px) !important;
                               height:100% !important;
                              /**display: none !important;*/
                            }
                            `;
                                document.head.appendChild(style);
                            }
                            else {
                                const style = document.createElement("style");
                                style.innerHTML = `
                              tr.preview.has-glotdict .original::before {
                              width: 3px !important;
                              height 100% !important;
                              position: inline !important;
                              top: calc(-0.5em + 17px) !important;
                              margin-left: -14px !important;
                    }
                      `;
                                document.head.appendChild(style);
                            }
                        }
                        resolve(myGlotDictStat)
                    }
                    else {
                        resolve(myGlotDictStat)
                    }
                });
        }, myTimeout);
    });
}


function getToastContainer() {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "99999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.pointerEvents = "none"; // clicks pass through
        document.body.appendChild(container);
    }
    return container;
}
async function toastbox(type = "info", title = "", duration = 2000, message = "") {
    const container = getToastContainer();

    const toast = document.createElement("div");
    toast.style.background = type === "error" ? "#f56260" : "#88cef7"; // red for error, green otherwise
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.marginTop = "5px";
    toast.style.borderRadius = "5px";
    toast.style.minWidth = "200px";
    toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    toast.style.pointerEvents = "auto"; // allow hover if needed
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";

    toast.innerHTML = `<strong>${title}</strong> ${message}`;
    container.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    // Auto-remove after duration
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => container.removeChild(toast), 300);
    }, duration);
}

function close_toast() {
  // Close all individual toast messages
  const toasts = document.querySelectorAll('.toast-content');
  toasts.forEach(t => t.remove());

  // Remove the container if empty
  const container = document.querySelector('.toast-container');
  if (container) {
    container.remove();
  }
}


async function messageBox(type, message) {
    currWindow = window.self;
    await cuteAlert({
        type: type,
        title: "Message",
        message: message,
        buttonText: "OK",
        myWindow: currWindow,
        closeStyle: "alert-close",
    });
}
async function messageBox_reload(type, message) {
    currWindow = window.self;
    await cuteAlert({
        type: type,
        title: "Message",
        message: message,
        buttonText: "OK",
        myWindow: currWindow,
        closeStyle: "alert-close",
    });
    window.location.href = window.location.href;
}
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function getPreview(rowId) {
    preview = document.querySelector(`#preview-${rowId}`)
    return preview
}


function exportGlossaryForOpenAi(locale = "NL") {
    const request = indexedDB.open("DeeplGloss", 1);

    request.onupgradeneeded = function (event) {
        const dbDeepL = event.target.result;
        if (!dbDeepL.objectStoreNames.contains("glossary")) {
            const store = dbDeepL.createObjectStore("glossary", { keyPath: "id", autoIncrement: true });
            store.createIndex("locale_original", ["locale", "original"], { unique: true });
        }
    };

    request.onsuccess = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("glossary")) {
            console.warn("Glossary store not found after upgrade.");
            return;
        }

        const transaction = db.transaction(["glossary"], "readonly");
        const store = transaction.objectStore("glossary");
        const glossaryMap = new Map();

        store.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                const { locale: entryLocale, original, translation } = cursor.value;
                if (entryLocale?.toLowerCase() === locale.toLowerCase()) {
                    glossaryMap.set(original, translation);
                }
                cursor.continue();
            } else {
                /* 1️⃣ OpenAiGloss EXACT laten zoals voorheen */
                const openAiGlossString = Array.from(glossaryMap.entries())
                    .map(([k, v]) => `"${k}" -> "${v}"`)
                    .join(", ");

                chrome.storage.local.set({ OpenAiGloss: openAiGlossString });

                /* 2️⃣ Parallel GLOBAL_GLOSSARY vullen (geconverteerd) */
                GLOBAL_GLOSSARY = Array.from(glossaryMap.entries())
                    .map(([k, v]) => [k.trim(), v.trim()])
                    .filter(([k, v]) => k && v);

               // console.debug("GLOBAL_GLOSSARY ready:", GLOBAL_GLOSSARY);
            }
        };
    };

    request.onerror = function (event) {
        console.error("Failed to open IndexedDB:", event);
    };
}


//# This function checks if a text contains only an URL
function isOnlyURL(text) {
    // Trim and compare the full match to the text
    const trimmed = text.trim();
    const urlRegex = /^(https?|ftp|file):\/\/[^\s<>"]+$/i;
    return urlRegex.test(trimmed);
}

function isURL(text) {
    // 17-03-2024 PSS improved regex as it did not find an URL within the sentence
    const urlRegex = /(https?|ftp|file):\/\/[^\s<>"]+/gi;
    return urlRegex.test(text.trim());
}

async function isWordInUrl(word,translation) {
       // console.debug("isWordInUrl:", word)
        is_in_URL = wptf_check_for_URL(word, translation)
       // console.debug("is in URL changed:", is_in_URL)
    if (is_in_URL == true) {
           // console.debug("1336 is in url",word)
            return true
        }
    else {
       // console.debug("1336 is in url",word)
            return false
       }

        if (!word || !urlLikeSegments || !Array.isArray(urlLikeSegments)) return false;

        const lowerWord = word.toLowerCase();

        return urlLikeSegments.some(segment => {
            // Strip HTML tags like <code>...</code> if present
            const cleaned = segment.replace(/<[^>]*>/g, '').toLowerCase();
            return cleaned.includes(lowerWord);
        });
    }
function wptf_check_for_URL(word, translation) {
    if (!word || !translation) return false;

    const lowerWord = word.toLowerCase();

    // Step 1: Remove HTML tags (like <code>) to expose inner content
    const textWithoutTags = translation.replace(/<[^>]*>/g, '');

    // Step 2: Match full URLs
    const fullURLRegex = /\b(?:https?|ftp):\/\/[^\s"'<>]+/gi;

    // Step 3: Match common plugin paths (also match plugins or plugin-name)
    const partialPathRegex = /\b(?:[\w./-]*wp-content\/plugins?\/[^\s"'<>]*)/gi;

    const matches = [
        ...(textWithoutTags.match(fullURLRegex) || []),
        ...(textWithoutTags.match(partialPathRegex) || []),
    ];
   
    return matches.some(url => url.toLowerCase().includes(lowerWord));
}




//# this function determines if a text is equal for capitals or text
function isExactlyEqual(text1, text2) {
    return text1 === text2;
}

// Version 2025.05.02b - Fix inner capitalization and URL safety


function restoreCase(original, translated, locale, ignoreList = '', debug = false) {
    if (debug) console.debug("[restoreCase] Original:", original);
    if (!translated || typeof translated !== 'string') return translated;

    let trimmed = translated.trim();
    if (debug) console.debug("[restoreCase] Translated:", translated);
    if (debug) console.debug("[restoreCase] Trimmed:", trimmed);

    const ignoreArray = ignoreList.split(/\r?\n/).map(w => w.trim()).filter(Boolean);
    const ignoreSet = new Set(ignoreArray.map(w => w.toLowerCase()));
    if (debug) console.debug("[restoreCase] Ignore list:", ignoreArray);

    // === Step 1: Protect URLs ===
    const urls = [];
    trimmed = trimmed.replace(/\bhttps?:\/\/[^\s]+/gi, match => {
        urls.push(match);
        return `{{url${urls.length - 1}}}`;
    });

    // === Step 2: Protect placeholders (like %s, [%s], etc.) ===
    const placeholders = [];
    let placeholderIndex = 0;
    trimmed = trimmed.replace(/(\[%?\d*\$?[sd]\])|(%\d*\$?[sd])/gi, match => {
        const token = `__PLACEHOLDER_${placeholderIndex}__`;
        placeholders.push({ token, original: match });
        placeholderIndex++;
        return token;
    });

    // === Step 3: Capitalize sentence starts after ., !, ? ===
    trimmed = trimmed.replace(/(^|[.?!]\s+)([a-zà-ÿ])/g, (match, p1, p2) => {
        return p1 + p2.toUpperCase();
    });

    // === Step 4: Heuristic lowercase if needed ===
    const words = trimmed.split(/\b/);
    let capitalizedCount = 0, totalWords = 0;

    const updatedWords = words.map((word) => {
        if (/^\w{2,}/.test(word) &&
            !ignoreSet.has(word.toLowerCase()) &&
            !/^__PLACEHOLDER_\d+__$/.test(word)) {
            totalWords++;
            if (/^[A-ZÀ-Ý]/.test(word)) capitalizedCount++;
        }
        return word;
    });

    const majorityCapitalized = totalWords > 0 && capitalizedCount > totalWords / 2;

    if (majorityCapitalized) {
        trimmed = words.map((word, idx) => {
            if (
                /^\w{2,}/.test(word) &&
                !ignoreSet.has(word.toLowerCase()) &&
                !/^__PLACEHOLDER_\d+__$/.test(word) &&
                !/^{{url\d+}}$/.test(word)
            ) {
                // Skip if fully uppercase (likely acronym)
                if (/^[A-ZÀ-Ý0-9]{2,}$/.test(word)) return word;

                const prev = words[idx - 1] || '';
                const isAfterPunctuation = /[.?!]\s*$/.test(prev);

                // If locale is nl or nl-be, allow casing after ':' unless it's all-uppercase
                const isAfterColon = /[:：]\s*$/.test(prev);
                if (
                    isAfterColon &&
                    (locale === 'nl' || locale === 'nl-be') &&
                    /^[A-ZÀ-Ý0-9]{2,}$/.test(word)
                ) {
                    return word; // leave all-uppercase alone
                }

                if (!isAfterPunctuation) {
                    if (debug) console.debug("[restoreCase] Lowercasing inner word:", word);
                    return word.charAt(0).toLowerCase() + word.slice(1);
                }
            }
            return word;
        }).join('');
    }

    // === Step 5: Restore placeholders ===
    placeholders.forEach(({ token, original }) => {
        trimmed = trimmed.replace(token, original);
    });

    // === Step 6: Restore URLs ===
    urls.forEach((url, index) => {
        trimmed = trimmed.replace(`{{url${index}}}`, url);
    });

    return trimmed;
}
async function handlePlural1(row,translatedText) {
    console.debug("We handle plural 1:", row, translatedText)
    previewElem = document.querySelector(`#preview-${row} .ul-plural li:nth-of-type(1) .translation-text`);
    console.debug("in plural first line:", previewElem)
    previewElem.innerText = translatedText
}

async function handlePlural2() {
    console.debug("We handle plural 2:", row, translatedText)

}

function replacePlaceholdersBeforeTranslation(text) {
    let counter = 0;
    return text.replace(/%(\d{1,2})?\$?[sdl]/gi, (match) => {
        return `__PH_${counter++}__`;
    });
}

function restorePlaceholdersAfterTranslation(text, originalText) {
    const placeholders = [...originalText.matchAll(/%(\d{1,2})?\$?[sdl]/gi)].map(m => m[0]);
    let counter = 0;
    return text.replace(/__PH_(\d+)__/g, () => {
        return placeholders[counter++] || '';
    });
}
