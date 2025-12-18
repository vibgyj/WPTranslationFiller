/**
 * AI Glossary Database Module
 *
 * Stores glossary entries with full metadata for AI translation models:
 * - source: English/source language word
 * - translation: Target language translation
 * - partOfSpeech: noun, verb, adverb, expression, etc.
 * - comment: Additional instructions/notes for translators
 * - locale: Target language code (e.g., 'es', 'nl', 'de')
 */

const AI_GLOSSARY_DB_NAME = 'AI-Glossary';
const AI_GLOSSARY_DB_VERSION = 1;
const AI_GLOSSARY_STORE_NAME = 'glossary';

let aiGlossaryDb = null;

// Initialize the AI Glossary database
async function initAIGlossaryDB() {
    return new Promise((resolve, reject) => {
        if (aiGlossaryDb) {
            resolve(aiGlossaryDb);
            return;
        }

        const request = indexedDB.open(AI_GLOSSARY_DB_NAME, AI_GLOSSARY_DB_VERSION);

        request.onerror = (event) => {
            console.error("AI Glossary DB error:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            aiGlossaryDb = event.target.result;
            console.debug("AI Glossary DB opened successfully");
            resolve(aiGlossaryDb);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create the glossary object store if it doesn't exist
            if (!db.objectStoreNames.contains(AI_GLOSSARY_STORE_NAME)) {
                const store = db.createObjectStore(AI_GLOSSARY_STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });

                // Create indexes for efficient querying
                store.createIndex('source', 'source', { unique: false });
                store.createIndex('sourceLower', 'sourceLower', { unique: false });
                store.createIndex('locale', 'locale', { unique: false });
                store.createIndex('sourceLocale', ['sourceLower', 'locale'], { unique: false });
                store.createIndex('partOfSpeech', 'partOfSpeech', { unique: false });

                console.debug("AI Glossary store created with indexes");
            }
        };
    });
}

// Parse CSV with proper handling of quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // Push the last field
    result.push(current.trim());

    return result;
}

// Clear all entries for a specific locale
async function clearAIGlossaryForLocale(locale) {
    const db = await initAIGlossaryDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);
        const index = store.index('locale');
        const request = index.openCursor(IDBKeyRange.only(locale.toLowerCase()));

        let deleteCount = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                deleteCount++;
                cursor.continue();
            }
        };

        transaction.oncomplete = () => {
            console.debug(`Cleared ${deleteCount} entries for locale: ${locale}`);
            resolve(deleteCount);
        };

        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Import glossary from CSV content
async function importAIGlossaryFromCSV(csvContent, locale) {
    const db = await initAIGlossaryDB();
    const lines = csvContent.split('\n');

    // Clear existing entries for this locale first
    await clearAIGlossaryForLocale(locale);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);

        let importCount = 0;
        let errorCount = 0;

        // Skip header row, process data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const fields = parseCSVLine(line);

                // Expected format: source, translation, partOfSpeech, comment
                if (fields.length >= 2 && fields[0] && fields[1]) {
                    const entry = {
                        source: fields[0].replace(/^"|"$/g, '').trim(),
                        sourceLower: fields[0].replace(/^"|"$/g, '').trim().toLowerCase(),
                        translation: fields[1].replace(/^"|"$/g, '').trim(),
                        partOfSpeech: fields[2] ? fields[2].replace(/^"|"$/g, '').trim() : '',
                        comment: fields[3] ? fields[3].replace(/^"|"$/g, '').trim() : '',
                        locale: locale.toLowerCase()
                    };

                    store.add(entry);
                    importCount++;
                }
            } catch (err) {
                console.debug(`Error parsing line ${i}: ${err.message}`);
                errorCount++;
            }
        }

        transaction.oncomplete = () => {
            console.debug(`AI Glossary import complete: ${importCount} entries, ${errorCount} errors`);
            resolve({ imported: importCount, errors: errorCount });
        };

        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Get glossary entries that match words in the source text
async function getRelevantAIGlossaryTerms(sourceText, locale) {
    const db = await initAIGlossaryDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);
        const index = store.index('locale');
        const request = index.getAll(IDBKeyRange.only(locale.toLowerCase()));

        request.onsuccess = (event) => {
            const allEntries = event.target.result;
            const sourceTextLower = sourceText.toLowerCase();
            const relevantTerms = [];

            for (const entry of allEntries) {
                // Check if the glossary term appears in the source text
                if (sourceTextLower.includes(entry.sourceLower)) {
                    relevantTerms.push(entry);
                }
            }

            console.debug(`AI Glossary: Found ${relevantTerms.length} relevant terms for locale ${locale}`);
            resolve(relevantTerms);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Format glossary terms for AI prompt
function formatGlossaryForAI(terms) {
    if (!terms || terms.length === 0) {
        return '';
    }

    const formatted = terms.map(term => {
        let entry = `"${term.source}" -> "${term.translation}"`;

        if (term.partOfSpeech) {
            entry += ` (${term.partOfSpeech})`;
        }

        if (term.comment) {
            entry += ` [Note: ${term.comment}]`;
        }

        return entry;
    });

    return formatted.join('\n');
}

// Get formatted glossary string for AI translation
async function getFormattedAIGlossary(sourceText, locale) {
    try {
        const terms = await getRelevantAIGlossaryTerms(sourceText, locale);
        return formatGlossaryForAI(terms);
    } catch (err) {
        console.error("Error getting AI glossary:", err);
        return '';
    }
}

// Get all glossary entries for a locale (for display/export)
async function getAllAIGlossaryEntries(locale) {
    const db = await initAIGlossaryDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);
        const index = store.index('locale');
        const request = index.getAll(IDBKeyRange.only(locale.toLowerCase()));

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Get glossary entry count for a locale
async function getAIGlossaryCount(locale) {
    const db = await initAIGlossaryDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);
        const index = store.index('locale');
        const request = index.count(IDBKeyRange.only(locale.toLowerCase()));

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Export glossary to CSV format
async function exportAIGlossaryToCSV(locale) {
    const entries = await getAllAIGlossaryEntries(locale);

    // CSV header
    let csv = 'source,translation,part_of_speech,comment\n';

    for (const entry of entries) {
        // Escape fields that contain commas or quotes
        const source = entry.source.includes(',') || entry.source.includes('"')
            ? `"${entry.source.replace(/"/g, '""')}"`
            : entry.source;
        const translation = entry.translation.includes(',') || entry.translation.includes('"')
            ? `"${entry.translation.replace(/"/g, '""')}"`
            : entry.translation;
        const pos = entry.partOfSpeech || '';
        const comment = entry.comment
            ? (entry.comment.includes(',') || entry.comment.includes('"')
                ? `"${entry.comment.replace(/"/g, '""')}"`
                : entry.comment)
            : '';

        csv += `${source},${translation},${pos},${comment}\n`;
    }

    return csv;
}

// Add a single glossary entry
async function addAIGlossaryEntry(source, translation, partOfSpeech, comment, locale) {
    const db = await initAIGlossaryDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);

        const entry = {
            source: source.trim(),
            sourceLower: source.trim().toLowerCase(),
            translation: translation.trim(),
            partOfSpeech: partOfSpeech ? partOfSpeech.trim() : '',
            comment: comment ? comment.trim() : '',
            locale: locale.toLowerCase()
        };

        const request = store.add(entry);

        request.onsuccess = () => {
            resolve(entry);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Delete a glossary entry by ID
async function deleteAIGlossaryEntry(id) {
    const db = await initAIGlossaryDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AI_GLOSSARY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AI_GLOSSARY_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve(true);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Initialize database on load
initAIGlossaryDB().catch(err => {
    console.error("Failed to initialize AI Glossary DB:", err);
});
