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
        this.model = options.model || 'claude-haiku-4-5-20251001';
        this.apiVersion = '2023-06-01';
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    // Helper to sleep/wait
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Build the base prompt with glossary and formal/informal tone
    buildSystemPrompt(glossary = {}, formal = false, destinationLanguage = 'Dutch') {
        const glossaryEntries = Object.entries(glossary)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ');

        const tone = formal ? 'u/uw' : 'je/jij';

        return `You are a translation machine. Your ONLY job is to translate text from English to ${destinationLanguage}.

**Rules:**
1. Use ${tone} (${formal ? 'formal' : 'informal'} tone)
2. Glossary: ${glossaryEntries || 'none'}
3. Follow ${destinationLanguage} grammar (word order, conjugations, capitalization)
4. Keep HTML tags unchanged
5. Remove __ (underscores) from text
6. Preserve CAPS exactly
7. Preserve singular/plural exactly (Section → Sectie, NOT Secties)
8. Don't translate: URLs, Branch names, variables (%1$s, {var}, etc.), Latin text
9. Dates: DD-MM-YYYY with ${destinationLanguage} month/day names, 24-hour time

**OUTPUT RULES - ABSOLUTE:**
- ALWAYS translate whatever text is provided, no matter how short or simple
- NEVER refuse to translate
- NEVER ask for context
- NEVER provide explanations or comments
- NEVER add characters not in the original (#, *, -, quotes, etc.)
- DO NOT change singular to plural or vice versa
- Output ONLY the translation, nothing else

Examples:
"Add content" → Inhoud toevoegen
"Section" → Sectie
"Sections" → Secties
"Background Type" → Achtergrond Type
"Highlight Section" → Sectie markeren`;
    }

    // Helper to apply external prompt and replace ${destinationLanguage} placeholders
    applyCustomPrompt(basePrompt, userPrompt, destinationLanguage) {
        if (!userPrompt || typeof userPrompt !== "string") return basePrompt;

        const placeholderRegex = /\$\{\s*destinationLanguage\s*\}|\$destinationLanguage/gi;
        const processedUserPrompt = userPrompt.replace(placeholderRegex, destinationLanguage);
        const safeBasePrompt = basePrompt.replace(placeholderRegex, destinationLanguage);

        return safeBasePrompt + "\n\n**Additional Instructions:**\n" + processedUserPrompt;
    }

    async translate(text, options = {}, attempt = 1) {
        const {
            glossary = {},
            formal = false,
            destinationLanguage = 'Dutch',
            systemPrompt = null,
            max_tokens = 1024,
            temperature = 0.3
        } = options;

        // Build base prompt
        const basePrompt = this.buildSystemPrompt(glossary, formal, destinationLanguage);
        // Combine with external prompt if provided, replacing ${destinationLanguage}
        const finalSystemPrompt = this.applyCustomPrompt(basePrompt, systemPrompt, destinationLanguage);

        //console.debug("=== Final prompt sent to Claude ===\n", finalSystemPrompt);

        const dataToSend = {
            apiKey: this.apiKey,
            apiVersion: this.apiVersion,
            model: this.model,
            text,
            systemPrompt: finalSystemPrompt,
            max_tokens,
            temperature
        };

        const result = await callClaude(dataToSend);

        // Handle rate limiting / overloaded errors with retry
        if (result.error && result.error.includes("Overloaded") && attempt < this.maxRetries) {
            const delay = this.retryDelay * attempt; // Exponential backoff
            console.warn(`API Overloaded, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})...`);
            await this.sleep(delay);
            return this.translate(text, options, attempt + 1);
        }

        if (!result || result.error) {
            return { success: false, error: result?.error || "Unknown error" };
        }

        // Clean any unwanted formatting Claude might add
        let translation = result.translation;
        if (translation) {
            translation = translation
                .replace(/^#{1,6}\s+/gm, '')                    // Remove headers
                .replace(/^[\*\-\+]\s+/gm, '')                  // Remove bullets
                .replace(/^>\s*/gm, '')                         // Remove blockquotes
                .replace(/^(Translation|Output|Result):\s*/i, '') // Remove prefixes
                .replace(/^["'](.+)["']$/s, '$1')              // Remove wrapping quotes
                .trim();
        }

        return {
            success: true,
            translation,
            usage: result.usage
        };
    }
}

// Line-by-line translation
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
    ClaudePrompt,
    OpenAITone,
    preverbs,
    spellCheckIgnore,
    convertToLower,
    locale,
    OpenAiTemp
) {
    const results = [];
    const show_debug = true;
    const translator = new ClaudeTranslator(apiKey, {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        maxRetries: 3,      // Retry up to 3 times on overload
        retryDelay: 500    // Start with 1 second, then 2s, then 3s
    });

    // Convert glossary string to object
    let Glossary = myglossary.replaceAll("->", ":");  
    let glossary = JSON.parse(`{${Glossary}}`);

    // Map destination language code to full name
    let language;
    switch (destlang) {
        case 'nl': language = 'Dutch'; break;
        case 'fr': language = 'French'; break;
        case 'nl-be': language = 'Belgian Dutch'; break;
        case 'de': language = 'German'; break;
        case 'ru': language = 'Russian'; break;
        case 'uk': language = 'Ukrainian'; break;
        case 'ja': language = 'Japanese'; break;
        case 'es-ES': language = 'Spanish'; break;
        default: language = 'Dutch'; break;
    }

    let myFormal = (OpenAITone == "informal") ? false : true;

    // Ensure temperature is a valid number
    const temp = typeof OpenAiTemp === 'number' ? OpenAiTemp : 0.0;

    for (let i = 0; i < originals.length; i++) {
        const original = originals[i];
        let originalText = typeof original === "string" ? original : original.text;

        // Preprocess original
        let originalPreProcessed = await preProcessOriginal(originalText, preverbs, "OpenAI");
        originalText = originalPreProcessed;
        const start = Date.now();
        console.debug("Using temperature:", temp);

        const result = await translator.translate(originalText, {
            glossary: glossary,
            formal: myFormal,
            destinationLanguage: language,
            systemPrompt: ClaudePrompt,   // Appends and replaces ${destinationLanguage}
            max_tokens: 1024,
            temperature: temp
        });

        if (result.success) {
            const duration = ((Date.now() - start) / 1000).toFixed(2);
            if (show_debug) console.debug("Claude proxy response (raw):", result.translation," ",duration);
            results.push({
                id: original.id,
                original: originalText,
                translation: result.translation,
                success: true
            });

            let myTranslatedText = await postProcessTranslation(
                original,
                result.translation,
                replaceVerb,
                originalPreProcessed,
                "OpenAI",
                convertToLower,
                spellCheckIgnore,
                locale
            );

            await processTransl(
                original,
                myTranslatedText,
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

        // Add delay between requests to avoid rate limiting (except last item)
        if (i < originals.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
    }

    return results;
}
