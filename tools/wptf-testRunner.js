const testReplaceVerbs = [
  ["You","Je","U"],
  ["you","je","u"],
  ["Your","Je","Uw"],
  ["your","je","uw"],
  ["You've","Je","U"],
  ["you've","je","u"],
  ["You're","Je","U"],
  ["you're","je","u"],
  ["You’re","Je","U"],
  ["you’re","je","u"],
  ["You'd","Je","U"],
  ["you'd","je","u"],
  ["You'll","Je","U"],
  ["you'll","je","u"],
  ["You’ll","Je","U"],
  ["you’ll","je","u"],
  ["yours", "jou", "u"],
  ["Please", "alstublieft"]

];

function replaceFormalVerbInTranslation(english, dutch, testReplaceVerbs, debug = false) {
  
   const markerBase = "__REPLACE_";
let markerIndex = 0;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Your original sentence splitter regex including " – " with spaces around dash
const sentenceSplitRegex = /(.*?)([.?!,;:](?:\s+|\r\n|\r|\n)|\s–\s|\r\n|\r|\n|$)/gs;

// Initial splitting
let engMatches = [...english.matchAll(sentenceSplitRegex)].filter(m => m[1].trim() || m[2].trim());
let dutMatches = [...dutch.matchAll(sentenceSplitRegex)].filter(m => m[1].trim() || m[2].trim());

let engSentences = engMatches.map(m => m[1] + m[2]);
let dutSentences = dutMatches.map(m => m[1] + m[2]);

if (debug) {
    console.log("English split:", engSentences);
    console.log("Dutch split:", dutSentences);
}

// Check if sentence counts differ, try removing commas from English to match
if (engSentences.length !== dutSentences.length) {
    let engCommaCount = (english.match(/,/g) || []).length;
    const dutCommaCount = (dutch.match(/,/g) || []).length;

    let adjustedEnglish = english;
    let adjustedEngMatches = engMatches;
    let adjustedEngSentences = engSentences;

    while (adjustedEngSentences.length !== dutSentences.length && engCommaCount > dutCommaCount) {
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
        console.log("Adjusted English split:", engSentences);
        console.log("Adjusted English text:", english);
    }
}

// Continue with Step 1 using engSentences and dutSentences arrays


    const updatedSentences = [];
    const markerReplacements = [];

    const validReplacements = testReplaceVerbs.filter(entry => Array.isArray(entry) && entry.length === 3);

    // === Step 1: Pronoun replacement (per English match, preserves mapping) ===
    for (let i = 0; i < dutSentences.length; i++) {
        const eng = engSentences[i] || "";
        let dut = dutSentences[i] || "";

        const words = eng.trim().split(/\s+/);
        const firstWord = words[0] || "";
        const rest = words.slice(1).map(w => w.toLowerCase());
        const normalizedEnglish = [firstWord, ...rest];

        if (debug) {
            console.log(`\n--- Sentence ${i + 1} ---`);
            console.log("English words (normalized):", normalizedEnglish);
            console.log("Dutch before replacement:", dut);
        }

        let replacementsThisSentence = [];

        // Process in English word order
        normalizedEnglish.forEach((word) => {
            const matchEntry = validReplacements.find(([en]) => en === word);
            if (!matchEntry) return;

            const [, informal, formal] = matchEntry;

            if (debug) {
                console.log(`Match found for "${word}" → looking for Dutch informal "${informal}" → will replace with "${formal}"`);
            }

            // FIX: Step 1 regex uses only 'i', no 'g'
            let matchRegex = new RegExp(`\\b${escapeRegex(informal)}([.,!?:]?)(\\s|$)`, 'i');
            if (matchRegex.test(dut)) {
                dut = dut.replace(matchRegex, (match, punct, space) => {
                    if (debug) {
                        console.log("Matched informal:", match);
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
                    console.log(`No occurrence of "${informal}" found in Dutch sentence for "${word}"`);
                }
            }
        });

        if (debug) {
            console.log("Dutch after marker insertion:", dut);
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
    const politeEntry =testReplaceVerbs.find(entry =>
        Array.isArray(entry) && entry.length === 2 && /please/i.test(entry[0])
    );

    if (politeEntry) {
        if (engSentences.length !== dutSentences.length) {
            if (debug) console.log("Skipping polite word insertion because sentence counts differ.");
        } else {
            const politeEnglish = politeEntry[0];
            const politeTarget = politeEntry[1];

            const finalEngSentences = engSentences;
            const finalDutchSentences = [...finalResult.matchAll(sentenceSplitRegex)]
                .filter(m => m[1].trim() || m[2].trim())
                .map(m => m[1] + m[2]);

            for (let i = 0; i < finalEngSentences.length; i++) {
                if (new RegExp(`\\b${escapeRegex(politeEnglish)}\\b`, 'i').test(finalEngSentences[i])) {
                    let sentence = finalDutchSentences[i];

                    // Skip if polite word already exists
                    if (new RegExp(`\\b${escapeRegex(politeTarget)}\\b`, 'i').test(sentence)) continue;

                    // HTML-safe insertion: find first real text word
                    const htmlTagPattern = /^(\s*<[^>]+>\s*)+/; // leading HTML tags
                    const match = sentence.match(htmlTagPattern);

                    let insertPos = match ? match[0].length : 0;

                    // Find the first space after the first real word
                    const firstSpaceIndex = sentence.indexOf(" ", insertPos);
                    if (firstSpaceIndex > -1) {
                        sentence =
                            sentence.slice(0, firstSpaceIndex) +
                            " " + politeTarget +
                            sentence.slice(firstSpaceIndex);
                    }

                    finalDutchSentences[i] = sentence;
                    if (debug) console.log(`Inserted "${politeTarget}" in sentence ${i + 1}:`, sentence);
                }
            }

            finalResult = finalDutchSentences.join("");
        }
    } else {
        if (debug) console.log("No polite word mapping found in replaceVerbs, skipping polite insertion.");
    }

    if (debug) {
        console.log("\n=== FINAL RESULT ===");
        console.log(finalResult);
    }

    return finalResult;
}


// === Load tests from external JSON file ===

function loadTestsFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      //console.log("Raw file text loaded:", JSON.stringify(text));
      try {
        const tests = JSON.parse(text);
        //console.log("Parsed JSON:", tests);
        showTestResults(tests);
      } catch (err) {
        console.error("JSON parse error:", err);
        alert('Invalid JSON format in test file.');
      }
    };
    reader.readAsText(file, "UTF-8");
  });

  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}


// === Display test results ===
function showTestResults(tests) {
  let html = `<html><head><title>Test Results</title>
  <style>
    body { font-family: monospace; white-space: pre-wrap; padding: 1rem; }
    .pass { color: green; }
    .fail { color: red; }
    .test { margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
  </style>
  </head><body><h1>Test Results</h1>`;

  let passCount = 0;
  let failCount = 0;

  for (const [i, test] of tests.entries()) {
    const output = replaceFormalVerbInTranslation(test.english, test.dutch, testReplaceVerbs, false);
    const passed = output === test.expected;
    if (passed) passCount++; else failCount++;

    html += `<div class="test ${passed ? 'pass' : 'fail'}">
      <strong>Test ${i + 1}:</strong> ${passed ? 'PASS' : 'FAIL'}<br>
      <strong>English:</strong> ${test.english}<br>
      <strong>Dutch before:</strong> ${test.dutch}<br>
      <strong>Expected:</strong> ${test.expected}<br>
      <strong>Got:</strong> ${output}<br>
    </div>`;
  }

  html += `<hr><strong>Total Tests:</strong> ${tests.length} | <span class="pass">Passed: ${passCount}</span> | <span class="fail">Failed: ${failCount}</span>`;
  html += `</body></html>`;

  // Save the result HTML to chrome.storage.local, then open the test results page
  chrome.storage.local.set({ testResults: html }, () => {
    console.log("Saved test results to storage.");
    window.open(chrome.runtime.getURL("wptf-testResults.html"));
  });
}


