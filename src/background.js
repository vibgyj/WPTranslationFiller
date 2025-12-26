// background.js
console.debug("background loaded")
function encodeBase64(text) {
    // Convert UTF-8 string to base64
    return btoa(unescape(encodeURIComponent(text)));
}
function decodeBase64(encoded) {
    // Convert base64 back to UTF-8 string
    return decodeURIComponent(escape(atob(encoded)));
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.debug("request;", request)
    if (request.action === "load_deepl_glossary") {
        console.debug(request.isFree)
        //   console.debug(request.apiKey)
        //console.debug(request.glossaryData)
        let isFree = request.isFree === true || request.isFree === "true"; // handle boolean or string
        let deeplServer = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
        console.debug("deeplServer in upload:",deeplServer)
        //let deeplServer = request.isFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
        let url = `${deeplServer}/v2/glossaries`;
        // console.debug("Url:",url)
        let response = fetch(url, {
            method: "POST",
            accept: "*/*",
            Encoding: "gzip, deflate, br",
            body: request.glossaryData,
            headers: {
                'Access-Control-Allow-Headers': 'X-Requested-With',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
                'Authorization': `DeepL-Auth-Key ${request.apiKey}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json(); // DeepL API usually returns JSON
            })
            .then(data => {
                console.log("Glossary uploaded successfully:", data);
                sendResponse({ success: true, glossaries: data });

            })
            .catch(error => {
                console.error("Error uploading glossary:", error);
                sendResponse({ success: false, error: error.message });
            })
        return true; // Keeps sendResponse alive for async operations
    }
    else if (request.action === "fetch_deepl_glossaries") {
        console.debug("we have a request to show the glossary:", request.isFree)
        let isFree = request.isFree === true || request.isFree === "true"; // handle boolean or string
        let deeplServer = isFree ? "https://api-free.deepl.com/v2/glossaries" : "https://api.deepl.com/v2/glossaries";
        console.debug("We fetch glossaries")
        console.debug("isFree:",request.isFree)
        console.debug("key:", request.apiKey)
        console.debug("deeplServer:",deeplServer)
        fetch(deeplServer, {
            method: "GET",
            headers: {
                "Authorization": `DeepL-Auth-Key ${request.apiKey}`, // Replace with your actual API key
                "Content-Type": "application/json"
            }
        })
            .then(response => {
                console.debug("response:",response)
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("DeepL Response:", data); // Debugging step
                sendResponse({ success: true, glossaries: data });
            })
            .catch(error => {
                console.error("Fetch Error:", error); // Debugging step
                sendResponse({ success: false, error: error.message });
            });

        return true; //  Keeps sendResponse alive for async fetch()
    }
    else if (request.action === "delete_deepl_glossary") {
        let isFree = request.isFree === true || request.isFree === "true"; // handle boolean or string
        console.debug("isFree:",isFree)
        let deeplServer = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
        // let deeplServer = request.isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
       console.debug("deeplserver:",deeplServer)
        let url = `${deeplServer}/v2/glossaries/${request.glossary_id}`;

        fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": `DeepL-Auth-Key ${request.apiKey}`,
                "Content-Type": "application/json"
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text(); // DELETE request usually returns empty response
            })
            .then(() => {
                //console.log(`Glossary ${request.glossary_id} deleted successfully`);
                sendResponse({ success: true, message: `Glossary ${request.glossary_id} deleted` });
            })
            .catch(error => {
                console.error("Error deleting glossary:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keeps sendResponse alive for async operations
    }
    else if (request.action === 'getGlossary') {
        console.debug("We started getGlossary")
        // Get all glossary records
        const transaction = DeepLdb.transaction(['glossary'], 'readonly');
        const store = transaction.objectStore('glossary');
        const index = store.index('localeOriginal');
        const requestData = index.getAll(); // Retrieve all records from the index

        requestData.onsuccess = (event) => {
            sendResponse(event.target.result); // Send the records back to the content script
        };

        requestData.onerror = (event) => {
            console.error('Error retrieving data:', event);
            sendResponse([]); // Send an empty array if there’s an error
        };

        return true; // Indicate asynchronous response
    }

    else if (request.action === 'addGlossaryRecord') {
        const record = request.record;
        const result = addRecordToDB(record); // Replace this with your actual function to add the record
        sendResponse({ success: result });  // Send a response back
        // Return true to indicate asynchronous response
        return true;
    }
    else if (request.action === "translate") {
        console.debug("Received translation request", request.body);

        // Destructure DeepL endpoint + control params
        //console.debug("requestbody:", request.body)
        let { DeeplURL, DeepLFreePar, ...deeplParams } = request.body;

        // ✅ Build request body with only allowed DeepL params
        //console.debug("request:",request)
        const allowedKeys = [
            "auth_key",
            "text",
            "source_lang",
            "target_lang",
            "formality",
            "preserve_formatting",
            "tag_handling",
            "ignore_tags",
            "split_sentences",
            "outline_detection",
            "context",
            "glossary_id"
        ];

        const formData = new URLSearchParams();
        for (const key of allowedKeys) {
            const value = deeplParams[key];
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    for (const entry of value) {
                        formData.append(key, entry);
                    }
                } else {
                    formData.append(key, value);
                }
            }
        }

        //console.debug("✅ Final URL:", DeeplURL);
        //console.debug("✅ Final body:", formData.toString());

        fetch(DeeplURL, {
            method: "POST",
            headers: {
                "Authorization": "DeepL-Auth-Key " + deeplParams.auth_key,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        })
            .then(async (response) => {
                const raw = await response.text();

                if (!response.ok) {
                    console.error("❌ DeepL error", response.status, raw);
                    sendResponse({ error: `HTTP ${response.status}: ${raw}` });
                    return;
                }

                try {
                    const json = JSON.parse(raw);
                    // console.debug("✅ DeepL response:", json);
                    sendResponse(json);
                } catch (err) {
                    console.error("❌ JSON parse error", err);
                    sendResponse({ error: "Invalid JSON response" });
                }
            })
            .catch((err) => {
                console.error("❌ Fetch error", err);
                sendResponse({ error: err.message });
            });

        return true;
    }

    if (request.action === "OpenAI") {
        (async () => {
            try {
                const dataToSend = { ...request.data }; // copy newData
                const apiKey = dataToSend.apiKey;       // extract the key
                delete dataToSend.apiKey;               // remove it from the body

                const resp = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apiKey
                    },
                    body: JSON.stringify(dataToSend)
                });
                if (!resp.ok) {
                    // Return error message instead of raw response
                    const msg = await resp.text();
                    sendResponse({ error: `Request failed (${resp.status}): ${msg}` });
                    return;
                }

                let data;
                const contentType = resp.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                    data = await resp.json();
                } else {
                    data = await resp.text();
                }

                sendResponse({ result: data });
            } catch (err) {
                sendResponse({ error: err.toString() });
            }
        })();

        return true; // keep sendResponse alive for async
    }

    // In your background script (service worker or background.js)

      // Ollama translation
 if (request.action === "ollama_translate") {
    console.debug("Ollama translation request received");

    (async () => {
        try {
            const {
                text,
                model,
                systemPrompt,
                max_tokens,
                temperature,
                apiKey,
                useLocal,
                repeat_penalty
            } = request.data;
            
            if (!text) return sendResponse({ success: false, error: "Text is missing" });
            if (!model) return sendResponse({ success: false, error: "Model is missing" });
            if (!systemPrompt) return sendResponse({ success: false, error: "System prompt is missing" });

            const myLocal = toBoolean(useLocal);

            // === Helper: local call with timeout ===
            async function callLocalWithTimeout(body, timeoutMs) {
                return Promise.race([
                    callLocalOllama(body),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Local Ollama timeout after ${timeoutMs} ms`)), timeoutMs)
                    )
                ]);
            }

            // === Helper: retry loop ===
            async function callLocalWithRetry(body, maxRetries = 3, timeoutMs = 12000) {
                let lastError = null;
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        console.debug(`Local Ollama attempt ${i + 1} of ${maxRetries}`);
                        const result = await callLocalWithTimeout(body, timeoutMs);
                        if (result.success) return result;
                        lastError = new Error(result.error || "Unknown local Ollama error");
                    } catch (err) {
                        lastError = err;
                        console.warn(`Attempt ${i + 1} failed: ${err.message}`);
                    }
                }
                throw lastError;
            }

            // === Local translation path ===
            if (myLocal) {
               // console.debug("prompt:", systemPrompt)
               
                let message = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `translate ${text}` }
                ];
                
                var bodyToSend = {
                    messages: message,
                    model: model,
                    stream: false,
                    options: { temperature: temperature, repeat_penalty: repeat_penalty }
                };

                try {
                    const result = await callLocalWithRetry(bodyToSend, 3, 12000); // 3 retries, 15s timeout
                    console.debug("Local Ollama result:", result.translation);
                    
                    sendResponse({
                        success: true,
                        translation: result.translation
                    });
                } catch (err) {
                    sendResponse({
                        success: false,
                        error: err?.message || String(err)
                    });
                }

                return;
            }

            // === Online translation path ===
            if (!apiKey) {
                return sendResponse({ success: false, error: "Ollama API key missing for online translation" });
            }

            let message = [
                { role: "system", content: systemPrompt },
                { role: "user", content: `translate this: ${text}` }
            ];

            var bodyToSend = {
                messages: message,
                model: model,
                stream: false,
                options: { temperature: temperature }
            };

            console.debug("Sending chat request to Ollama online:", bodyToSend);

            const resp = await fetch("https://ollama.com/api/chat", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(bodyToSend)
            });

            // 🔑 READ BODY ONCE AS TEXT
            let rawText = "";
            try {
                rawText = await resp.text();
            } catch (e) {
                // ignore
            }

            const isJson =
                rawText &&
                resp.headers.get("content-type")?.includes("application/json");

            let data = null;
            if (isJson) {
                try {
                    data = JSON.parse(rawText);
                } catch (e) {
                    // leave data null
                }
            }

            console.debug("HTTP status:", resp.status);
            console.debug("Raw response text:", rawText);
            console.debug("Parsed JSON:", data);

            // 🚨 HANDLE HTTP ERRORS FIRST
            if (!resp.ok) {
                return sendResponse({
                    success: false,
                    error: data?.error || rawText || `HTTP ${resp.status} (Ollama request failed)`,
                    status: resp.status,
                    raw: data || rawText
                });
            }

            // ✅ SUCCESS PATH
            if (!data?.message?.content) {
                return sendResponse({
                    success: false,
                    error: "No content returned from Ollama",
                    raw: data
                });
            }

            console.debug("Processed translation:", data.message.content);

            sendResponse({
                success: true,
                translation: data.message.content,
                usage: data.usage || null
            });

        } catch (err) {
            sendResponse({ success: false, error: err?.message || String(err) });
        }
    })();

    return true; // keep response channel open
}


    if (request.action == "ClaudeAI") {
    (async () => {
        try {
            // expecting { apiKey, apiVersion, model, text, systemPrompt, max_tokens, temperature }
            const { 
                apiKey, 
                apiVersion = "2023-06-01", 
                model, 
                text, 
                systemPrompt, 
                max_tokens,
                temperature = 0.3  // Default to 0.3 if not provided
            } = request.data || {};
            
            if (!apiKey) {
                sendResponse({ success: false, error: "API key is missing" });
                return;
            }
            if (!model || !text || !systemPrompt || !max_tokens) {
                sendResponse({ success: false, error: "Required field missing (model/text/systemPrompt/max_tokens)" });
                return;
            }
            
            // Claude requires top-level `system`, messages only user content
            const bodyToSend = {
                model,
                system: systemPrompt,
                messages: [
                    { role: "user", content: text }
                ],
                max_tokens,
                temperature  // Add temperature parameter
            };
            
            const resp = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": apiVersion,
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify(bodyToSend)
            });
            
            const respText = await resp.text().catch(() => '');
            // debug raw response if you need
            console.debug("Claude raw response:", respText);
            
            if (!resp.ok) {
                // try to parse structured error, otherwise return text
                try {
                    const json = JSON.parse(respText);
                    sendResponse({ success: false, error: json.error?.message || JSON.stringify(json) });
                } catch {
                    sendResponse({ success: false, error: respText || `HTTP ${resp.status}` });
                }
                return;
            }
            
            // parse JSON
            let respData;
            try {
                respData = JSON.parse(respText);
                // 1️⃣ Normalize quotes: curly → straight
           // translation = respText
           //     .replace(/[“”„»«]/g, '"')  // double quotes
            //    .replace(/[‘’‚‛]/g, "'");  // single quotes

            // 2️⃣ Preserve literal backslashes before quotes
            //    Replace any " that were output without backslash with \"
            //    This keeps code/PO file examples intact
            //    translation = translation.replace(/(?<!\\)"/g, '\\"');
            //respText=translation
            } catch (e) {
                sendResponse({ success: false, error: "Cannot parse JSON from Claude", raw: respText });
                return;
            }
            
            // extract content text (handles multiple content items if needed)
            if (!respData?.content || !Array.isArray(respData.content) || respData.content.length === 0) {
                sendResponse({ success: false, error: "No content returned from Claude", raw: respData });
                return;
            }
            
            // join text blocks (usually one)
            const translation = respData.content.map(c => c?.text || "").filter(Boolean).join("\n");
            
            // optionally surface usage if available
            const usage = respData?.usage || null;
            
            sendResponse({ success: true, translation, usage });
        } catch (err) {
            sendResponse({ success: false, error: err?.message || String(err) });
        }
    })();
    return true; // keep response channel open
}

    else if (request.action === "translateio") {
        
            // Extract values safely
            const { text, source_lang, target_lang, apiKey, trans_url } = request.body || {};
       
            (async () => {
                try {
                    console.debug("target:", trans_url)
                     console.debug("source:", source_lang);
                    const data = await doTranslate(
                        text || "Hello. How may I help you?",
                        source_lang || "en-us",
                        target_lang || "nl-nl",
                        apiKey || "noKey",
                        trans_url || "No url",

                    );

                    // Look for translation in multiple possible API response fields
                    const translated =
                        data?.translatedText ??
                        data?.translations?.[0]?.targetContent ??
                        data?.responseObjects?.[0]?.targetContent ??
                        data?.translation ??
                        null;

                    if (!translated) {
                        sendResponse({
                            success: false,
                            error: "No translation found in API response",
                            raw: data
                        });
                    } else {
                        sendResponse({
                            success: true,
                            translation: translated
                        });
                    }
                } catch (err) {
                    sendResponse({ success: false, error: err.message });
                }
            })();

            // keep the channel open
            return true;
        };

        async function doTranslate(text, sourceLocale, targetLocale,apiKey, trans_url) {
           
            const url = trans_url
            const body = {
                rnResponseProjectId: null,
                sourceContent: text,
                sourceLocale,
                targetLocale,
                contentTypeName: "api",
                translationType: "machine",
                textType: "html",
                evaluateQuality: "true"
            };


            console.debug("Sending request body:", body);
            console.debug("url:", url)
            console.debug("key:",apiKey)
            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey
                },
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                const errText = await resp.text().catch(() => "");
                console.error("Raw response:", errText);
                throw new Error(`API error ${resp.status}: ${errText}`);
            }

            return resp.json();
        }
    })

//* - Automatically backs up storage on extension update
// * - Restores from backup if storage is empty
// * - Safe: does not overwrite existing user data
// */

/**
 * Robust chrome.storage.local wrapper
 * - Automatically backs up storage on extension update (only if version changes)
 * - Restores from backup if storage is empty
 * - Safe: does not overwrite existing user data
 */

const StorageWrapper = (() => {
    const BACKUP_KEY = "__backup__";

    /** Backup all storage under BACKUP_KEY */
    function backupStorage() {
        chrome.storage.local.get(null, (allData) => {
            console.log("Backing up local storage:", allData);
            chrome.storage.local.set({ [BACKUP_KEY]: allData });
        });
    }

    /** Restore storage from backup if main storage is empty */
    function restoreIfEmpty() {
        chrome.storage.local.get(null, (currentData) => {
            const keys = Object.keys(currentData).filter(k => k !== BACKUP_KEY);
            if (keys.length === 0 && currentData[BACKUP_KEY]) {
                console.log("Restoring local storage from backup");
                chrome.storage.local.set(currentData[BACKUP_KEY], () => {
                    chrome.storage.local.remove(BACKUP_KEY, () => {
                        console.log("Backup removed after restore");
                    });
                });
            }
        });
    }

    /** Normal get wrapper */
    function get(keys, callback) {
        chrome.storage.local.get(keys, callback);
    }

    /** Normal set wrapper */
    function set(items, callback) {
        chrome.storage.local.set(items, callback);
    }

    /** Normal remove wrapper */
    function remove(keys, callback) {
        chrome.storage.local.remove(keys, callback);
    }

    /** Initialize wrapper: setup update detection + restore check */
    function init() {
        // Restore immediately on startup if storage is empty
        restoreIfEmpty();

        // Backup on extension update, only if version actually changed
        chrome.runtime.onInstalled.addListener((details) => {
            const currentVersion = chrome.runtime.getManifest().version;
            if (details.reason === "update" && details.previousVersion !== currentVersion) {
                console.log(`Extension updated from ${details.previousVersion} → ${currentVersion}`);
                backupStorage();
            }
        });
    }

    return {
        init,
        get,
        set,
        remove,
        backupStorage,
        restoreIfEmpty
    };
})();

// Initialize wrapper
StorageWrapper.init();

/**
 * Call local Ollama instance for translation
 * @param {Object} bodyToSend - The chat body including model, messages, temperature, etc.
 * @returns {Promise<Object>} - Object containing translation in message.content or error
 */
async function callLocalOllama(bodyToSend) {
    try {
        const LOCAL_CHAT_URL = "http://127.0.0.1:11434/api/chat";
        
        const resp = await fetch(LOCAL_CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyToSend)
        });
        
        const data = await resp.json();
        
        if (!resp.ok) {
            return {
                success: false,
                error: data?.error || `HTTP ${resp.status}`,
                raw: data
            };
        }
        
        if (!data.message?.content) {
            return {
                success: false,
                error: "No content returned from Ollama",
                raw: data
            };
        }
        
        return {
            success: true,
            translation: data.message.content,
            raw: data
        };
        
    } catch (err) {
        return {
            success: false,
            error: err?.message || String(err)
        };
    }
}
const toBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
    }
    if (typeof value === "number") return value === 1;
    return false;
};