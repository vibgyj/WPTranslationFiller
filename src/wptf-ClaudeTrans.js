// Call Claude via background script
async function callClaude(data) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "ClaudeAI", data }, response => {
            if (!response) {
                resolve({ success: false, error: "No response from background script" });
            } else {
                resolve(response);
            }
        });
    });
}


class ClaudeTranslator {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.model = options.model || 'claude-sonnet-4-5-20250929';
        this.apiVersion = '2023-06-01';
    }

    buildSystemPrompt(glossary = {}, formal = false, destinationLanguage = 'Dutch') {
        const glossaryEntries = Object.entries(glossary)
            .map(([key, value]) => `"${key}": "${value}"`)
            .join(', ');

        const formalityNote = formal
            ? 'Use formal tone (u/uw instead of je/jouw)'
            : 'Use informal tone (je/jouw instead of u/uw)';

        return `**Translation Task: English to ${destinationLanguage}**
You are a professional translator specializing in English to ${destinationLanguage}, while following these strict requirements:
${formalityNote}

Glossary: ${glossaryEntries || '(No custom glossary provided)'}

Grammar and Style Requirements:
Follow all standard Dutch grammar rules (de/het articles, word order, verb conjugations, etc.)
Maintain natural, idiomatic Dutch language
Use appropriate formal or informal tone based on context
Use the Dutch grammar rules for capitalisation

Date and Time Formatting:
Convert dates to Dutch format: DD-MM-YYYY
Use Dutch month and day names
Use 24-hour time format

Formatting Requirements:
Preserve HTML
Do NOT translate Branch names
Do NOT add hyphens
Preserve whitespace
Remove underscores from URLs
Preserve uppercase formatting

What to Translate:
Only translate text content between HTML tags
Translate alt text, title attributes, and other user-facing text
Convert dates/times to Dutch format
Always use glossary terms

What NOT to Translate:
HTML tags/attributes (except values)
Branch names
Words within URLs
Code snippets
Variable names
Sentences completely in Latin

Return only the translated text without comments or explanations.`;
    }

    async translate(text, options = {}) {
        const {
            glossary = {},
            formal = false,
            destinationLanguage = 'Dutch',
            systemPrompt = null,
            max_tokens = 1024
        } = options;

        // Merge external glossary into prompt
        let finalSystemPrompt;
        if (systemPrompt) {
            const glossaryEntries = Object.entries(glossary)
                .map(([k, v]) => `"${k}": "${v}"`)
                .join(', ');

            finalSystemPrompt = systemPrompt + (glossaryEntries ? `\n\nExternal Glossary: ${glossaryEntries}` : '');
        } else {
            finalSystemPrompt = this.buildSystemPrompt(glossary, formal, destinationLanguage);
        }

        //console.debug("=== Final prompt sent to Claude ===\n", finalSystemPrompt);

        const dataToSend = {
            apiKey: this.apiKey,
            apiVersion: this.apiVersion,
            model: this.model,
            text,
            systemPrompt: finalSystemPrompt,
            max_tokens
        };

        const result = await callClaude(dataToSend);

        if (!result || result.error) {
            return { success: false, error: result?.error || "Unknown error" };
        }

        return {
            success: true,
            translation: result.translation,
            usage: result.usage
        };
    }
}


// Line-by-line translation
async function translateLineByLine(
    apiKey,
    originals,
    myglossary,
    language,
    record,
    rowId,
    transtype,
    plural_line,
    locale,
    convertToLower,
    current,
    editor,
    ClaudePrompt
) {
    const results = [];
    const translator = new ClaudeTranslator(apiKey, {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024
    });
   
    let Glossary = myglossary.replaceAll("->", ":")  
     // console.debug("gloss:",Glossary)
                        //myGlossary = `{${myGlossary}}`;
     let glossary = JSON.parse(`{${Glossary}}`);
     
   //  console.debug("transgloss:",glossary)
    for (let i = 0; i < originals.length; i++) {
        const original = originals[i];
        const originalText = typeof original === "string" ? original : original.text;

        const result = await translator.translate(originalText, {
            glossary: glossary,
            formal: false,
            destinationLanguage: 'Dutch',
            systemPrompt: ClaudePrompt,   // ✅ include your prompt
            max_tokens: 1024
        });

        if (result.success) {
            results.push({
                id: original.id,
                original: originalText,
                translation: result.translation,
                success: true
            });

            await processTransl(
                original,
                result.translation,
                language,
                record,
                rowId,
                transtype,
                plural_line,
                locale,
                convertToLower,
                current
            );
        } else {
            const errMsg = result.error || "Unknown error";
            console.error(`Translation error for ID ${original.id}: ${errMsg}`);
            results.push({
                id: original.id,
                original: originalText,
                error: errMsg,
                success: false
            });
        }
    }

    return results;
}
