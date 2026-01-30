// background.js
//console.debug("background loaded")
function encodeBase64(text) {
    // Convert UTF-8 string to base64
    return btoa(unescape(encodeURIComponent(text)));
}
function decodeBase64(encoded) {
    // Convert base64 back to UTF-8 string
    return decodeURIComponent(escape(atob(encoded)));
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CheckModelLMs") {

       const model = request.model;

       // start async werk in microtask
        (async () => {
            try {
                // call je bestaande async functie
                const found = await isLMStudioModelLoaded(model);

                // stuur alleen boolean terug
                sendResponse(found);
            } catch (e) {
                console.debug("Fout bij model check:", e);
                sendResponse(false);
            }
        })();
        return true;

    }
    else if (request.action == "Gemini") {
        setTimeout(async () => {
            (async () => {
                try {
                    const { apiKey, text, sourceLang, targetLang, formal, locale, model, prompt, max_tokens, Top_p, Top_k } = request.data;
                    //console.debug("model:", model)
                    //console.debug("max:",max_tokens)
                    let URL = `https://generativelanguage.googleapis.com/v1/models/` + model + `:generateContent?key=${apiKey}`
                    const res = await fetch(URL,

                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            },
                            body: JSON.stringify({
                                contents: [
                                    { role: "user", parts: [{ text: prompt }] }
                                ],
                                generationConfig: {
                                    temperature: 0.0,
                                    topP: Top_p,
                                    topK: Top_k,
                                    maxOutputTokens: max_tokens
                                }
                            }),
                            // Firefox-specifieke optimalisaties:
                            keepalive: true,       // Houd de verbinding open voor hergebruik
                            priority: 'high'      // Experimentele optie voor hogere prioriteit (Firefox)
                        }
                    );

                    let data;
                    try {
                        data = await res.json();
                    } catch (parseErr) {
                        throw new Error(`Failed to parse Gemini response (HTTP ${res.status})`);
                    }

                    // HTTP-fouten expliciet afhandelen
                    if (!res.ok) {
                        let errorMessage = `Gemini request failed (HTTP ${res.status})`;

                        if (data?.error?.message) {
                            errorMessage += `: ${data.error.message}`;
                        }

                        // Extra details indien beschikbaar
                        if (data?.error?.details?.[0]?.fieldViolations?.length) {
                            const violations = data.error.details[0].fieldViolations
                                .map(v => `${v.field}: ${v.description}`)
                                .join("; ");
                            errorMessage += ` (${violations})`;
                        }

                        throw new Error(errorMessage);
                    }

                    const translation =
                        data?.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!translation) {
                        throw new Error("Gemini returned no translation content");
                    }

                    sendResponse({
                        success: true,
                        translation: translation.trim()
                    });

                } catch (err) {
                    console.error("Gemini error:", err);
                    sendResponse({
                        success: false,
                        error: err.message || "Unknown Gemini error"
                    });
                }
            })();
        },0)

    return true;
}
    
   else if (request.action === "DeepL") {
        //console.debug("Received translation request", request.body);

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
            "glossary_id",
            "enable_beta_languages" 
        ];

        const formData = new URLSearchParams();
        for (const key of allowedKeys) {
            let value = deeplParams[key];
            // for Bengali it is necessary to set enable_beta_languages to 1
             if (key === "enable_beta_languages" && (value === undefined || value === null || value === '')) {
                value = '1';
            }
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
    else if (request.action == "Mistral") {
         (async () => {
        try {
            const dataToSend = { ...request.data }; // copy data
            const apiKey = dataToSend.apiKey;       // extract key
            delete dataToSend.apiKey;               // remove from body

            const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                },
                body: JSON.stringify(dataToSend)
            });

            if (!resp.ok) {
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

    return true; // keep sendResponse alive
    }


   else if (request.action === "OpenAI") {
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

    

      // Ollama translation
 else if (request.action === "ollama_translate") {
    console.debug("Ollama translation request received");
    
    (async () => {
        try {
            var {
                text,
                target_lang,
                model,
                systemPrompt,
                max_tokens,
                temperature,
                apiKey,
                useLocal,
                repeat_penalty,
                do_not_complete,
                Top_p,
                Top_k
            } = request.data;
            console.debug("model:", model);
            let myTop_p = parseInt(Top_p)
            let myTop_k = parseInt(Top_k) 
            if (!text) return sendResponse({ success: false, error: "Text is missing" });
            if (!model) return sendResponse({ success: false, error: "Model is missing" });
            if (!systemPrompt) return sendResponse({ success: false, error: "System prompt is missing" });
            console.debug("original:",text)
            const myLocal = toBoolean(useLocal);
            let tone = "informal"
            // === Local translation path ===
            if (myLocal) {
                
                // console.debug("prompt:", systemPrompt)
               // console.debug("text to translate:", text)
               // text = "'" + text + "'";
               let messages = [
                    { role: 'system', content: systemPrompt },
                   { role: 'user', content: 'Translate the provided text without any comment or instruction' },
                   { role: 'user', content: `translate this: ${text}` }
                  ];

                  var bodyToSend = {
                  model: model,
                  messages: messages,
                  stream: false,
                 options: { emperature: temperature, repeat_penalty: repeat_penalty, do_not_complete: 1 ,top_p: myTop_p,  top_k: myTop_k}
                 };
                //options: {temperature: temperature, repeat_penalty: repeat_penalty, do_not_complete: 1,  }
                try {
                    const result = await callLocalWithRetry(bodyToSend, 3, 10000); // 3 retries, 15s timeout
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
                { role: "user", content: `Translate` },
                { role: "user", content: text }
                ];

            var bodyToSend = {
                messages: message,
                model: model,
                stream: false,
                options: { temperature: temperature,repeat_penalty: repeat_penalty, do_not_complete: 1 ,top_p: myTop_p,  top_k: myTop_k}
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

else if (request.action === "LMStudio_translate") {
   // console.debug("LMStudio translation request received");
        setTimeout(async () => {
            const {
                text,
                target_lang,
                model,
                systemPrompt,
                max_tokens,
                temperature,
                apiKey,
                useLocal,
                repeat_penalty,
                do_not_complete,
                Top_p,
                Top_k
            } = request.data;

            (async () => {
                //const mymodel = model || 'gpt-oss-20b';
                // console.debug("mymodel:", mymodel);
                // console.debug("text:", text) 
                let myText = "'" + text + "'";
                
                // let mysystemPrompt = 'Translate the text exactly into Dutch. Do NOT change, move, or remove placeholders like <mytab1>, <mylinefeed2>, etc. Output ONLY the translated text, without explanations or notes.'
                //let mysystemPrompt = systemPrompt
                // console.debug("systemPrompt:", mysystemPrompt)
               //  Bouw de body
               const body = {
                   messages: [
                       {
                          role: "user", content: systemPrompt  // hier gebruik je je eigen variabele prompt
                        }

                   ],
                   temperature: temperature ?? 0,
                    normalization: false,
                    stream: false,
                    top_p: Top_p,
                   top_k: Top_k,
                   repeat_penalty: 1.1,
                   do_not_complete
               };

          //    const body = {
          //       prompt: systemPrompt,   // 👈 VERPLICHT
          //     temperature: temperature ?? 0,
           //    stream: false,
           //     top_p: Top_p,
            //   top_k: Top_k,
            //   repeat_penalty
           //   };

              

                if (max_tokens) body.max_tokens = max_tokens;

                const options = {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                    body: JSON.stringify(body)
                };

                const url = 'http://127.0.0.1:1234/v1/chat/completions';

                try {
                    // fetch met timeout + retries
                    const res = await fetchWithTimeoutAndRetry(
                        url,
                        options,
                        15000, // timeout per retry in ms
                        5      // max retries
                    );

                    // Lees de body precies één keer
                    const json = await res.json();
                    //console.debug("LM Studio JSON response:", json);

                    // Check HTTP status
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status} - ${JSON.stringify(json)}`);
                    }

                    // Check LM Studio error in JSON
                    if (json.error) {
                        throw new Error(`LM Studio error: ${json.error}`);
                    }

                    // Haal assistant-tekst veilig
                     const output = json?.choices?.[0]?.message?.content ?? null;
                    //const output = json?.choices?.[0]?.text ?? null;

                    sendResponse({
                        ok: !!output,
                        text: output
                    });

                } catch (err) {
                    // TECHNISCH LOGGEN
                    if (err.name === 'AbortError') {
                        console.debug('LM Studio request aborted (timeout)');
                    } else {
                        console.debug('LM Studio call error:', err);
                    }

                    // GEBRUIKERSMELDING
                    const userMessage = (err.name === 'AbortError')
                        ? 'The translation took too long and was stopped.'
                        : (err.message || 'Unknown error');

                    sendResponse({
                        ok: false,
                        text: userMessage
                    });
                }
            })();
        },0)

    // Return true om async sendResponse mogelijk te maken
    return true;
}


    else if (request.action == "ClaudeAI") {
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
    else if (request.action === "google_translate") {
    
        (async () => {
            try {
                const payload = request.payload || {};
                const apiKey = payload.apiKey;
                const text = payload.text;
                const targetLang = payload.targetLang;
                const sourceLang = payload.sourceLang || null;

                if (!apiKey || !text || !targetLang) {
                    sendResponse({
                        ok: false,
                        error: {
                            type: "invalid_request",
                            message: "Missing apiKey, text, or targetLang"
                        }
                    });
                    return;
                }

                const body = { q: text, target: targetLang, format: "text" };
                if (sourceLang) body.source = sourceLang;

                const res = await fetch(
                    "https://translation.googleapis.com/language/translate/v2?key=" + apiKey,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    }
                );
                console.debug("Google Translate raw response status:", res); 
               // console.debug("Google data:",await res.json())
                let data;
                try {
                    data = await res.json();
                } catch (parseErr) {
                    sendResponse({
                        ok: false,
                        error: { type: "parse_error", message: "Invalid JSON response" }
                    });
                    return;
                }

                if (!res.ok || !data?.data?.translations?.[0]) {
                    sendResponse({
                        ok: false,
                        error: {
                            type: "google_error",
                            message: data?.error?.message || "Unknown Google Translate error"
                        }
                    });
                    return;
                }

                const tr = data.data.translations[0];
                console.debug("Google Translate processed translation:", tr.translatedText);
                sendResponse({
                    ok: true,
                    result: {
                        text: tr.translatedText,
                        detectedSourceLang: tr.detectedSourceLanguage
                    }
                });

            } catch (err) {
                sendResponse({
                    ok: false,
                    error: {
                        type: "network_error",
                        message: err.message || "Unknown network error"
                    }
                });
            }
        })();

        return true; // important for async response

    }

else if (request.action == "Lingvanex") {
        (async () => {
            
        try {
            const {
                apiKey,
                text,
                sourceLang,
                targetLang,
                translateMode = "html",   // "text" of "html"
                enableTransliteration = false
            } = request.data || {};
            //console.debug("Lingvanex translation request received", targetLang);
            if (!apiKey) {
                sendResponse({ success: false, error: "API key is missing" });
                return;
            }
            if (!text || !targetLang) {
                sendResponse({ success: false, error: "Required field missing (text/targetLang)" });
                return;
            }

            const bodyToSend = {
                platform: "api",
                to: targetLang,
                data: text,
                translateMode,
                enableTransliteration
            };
            if (sourceLang) bodyToSend.from = sourceLang;

            const resp = await fetch("https://api-b2b.backenster.com/b1/api/v3/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": apiKey
                },
                body: JSON.stringify(bodyToSend)
            });

            const respText = await resp.text().catch(() => "");
            console.debug("Lingvanex raw response:", respText);

            let respData;
            try {
                respData = JSON.parse(respText);
            } catch (e) {
                sendResponse({
                    success: false,
                    error: "Cannot parse JSON from Lingvanex",
                    raw: respText
                });
                return;
            }

            // Handle HTTP status errors
            if (resp.status === 400) {
                sendResponse({ success: false, error: "Bad Request – check parameters", raw: respData });
                return;
            }

            if (resp.status === 403) {
                sendResponse({ success: false, error: "Authorization Error – invalid/missing API key", raw: respData });
                return;
            }

            if (resp.status === 500) {
                sendResponse({ success: false, error: "Internal Server Error", raw: respData });
                return;
            }

            // Lingvanex-specific error field
            if (respData.err) {
                sendResponse({
                    success: false,
                    error: respData.err,
                    raw: respData
                });
                return;
            }

            // Success
            sendResponse({
                success: true,
                translation: respData.result || "",
                detectedSourceLang: respData.from || sourceLang || "auto",
                provider: "lingvanex"
            });

        } catch (err) {
            sendResponse({
                success: false,
                error: err?.message || String(err)
            });
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
        if (request.action === "load_deepl_glossary") {
       // console.debug(request.isFree)
        //   console.debug(request.apiKey)
        console.debug(request.glossaryData)
        let isFree = request.isFree === true || request.isFree === "true"; // handle boolean or string
        let deeplServer = isFree ? "https://api-free.deepl.com/v2/glossaries" : "https://api.deepl.com/v3/glossaries";
        //console.debug("deeplServer in upload:",deeplServer)
        let url = `${deeplServer}`;
        console.debug("Url:",url)
        let response = fetch(url, {
            method: "POST",
            accept: "*/*",
            Encoding: "gzip, deflate, br",
            body: request.glossaryData,
            headers: {
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
    console.debug("we have a request to show the glossary:", request.isFree);

    const isFree = request.isFree === true || request.isFree === "true";
    let deeplServer = isFree ? "https://api-free.deepl.com/v2/glossaries" : "https://api.deepl.com/v3/glossaries";


    console.debug("We fetch glossaries");
    console.debug("isFree:", request.isFree);
    console.debug("key:", request.apiKey);
    console.debug("deeplServer:", deeplServer);

    fetch(deeplServer, {
        method: "GET",
        headers: {
            "Authorization": `DeepL-Auth-Key ${request.apiKey}`,
            "Content-Type": "application/json"
        }
    })
        .then(async response => {
            console.debug("raw response:", response);

            const text = await response.text(); // READ BODY HERE

            let body;
            try {
                body = text ? JSON.parse(text) : null;
            } catch {
                body = text;
            }

            if (!response.ok) {
                // Pass through full DeepL error
                throw {
                    status: response.status,
                    body: body
                };
            }

            return body;
        })
        .then(data => {
            console.log("DeepL Response:", data);
            sendResponse({ success: true, glossaries: data });
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            console.error("Fetch Error:", error.body);
            sendResponse({
                success: false,
                status: error.status || null,
                error: error.body || error.message
            });
        });

    return true; // keep sendResponse alive
}

    else if (request.action === "delete_deepl_glossary") {
        let isFree = request.isFree === true || request.isFree === "true"; // handle boolean or string
        console.debug("isFree:",isFree)
        let deeplServer = isFree ? "https://api-free.deepl.com/v2/glossaries" : "https://api.deepl.com/v3/glossaries";
        console.debug("We delete glossary with id:", request.glossary_id)
       console.debug("deeplserver:",deeplServer)
        let url = `${deeplServer}/${request.glossary_id}`;

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

        
    })


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
        console.debug("Local Ollama response:", data); 
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

            /**
 * Stop a local Ollama model session to avoid cached responses
 * @param {string} model - Model name to stop
 * @returns {Promise<Object>} - Result with error or success
 */
async function stopLocalModelSession(model) {
    try {
        const STOP_URL = `http://127.0.0.1:11434/api/stop`;

        const resp = await fetch(STOP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model }) // pass the model you want to stop
        });

        if (!resp.ok) {
            let textResp = await resp.text().catch(() => "");
            return { error: `Cannot stop model session. HTTP ${resp.status}`, raw: textResp };
        }

        return { success: true };
    } catch (err) {
        return { error: err?.message || String(err) };
    }
}

 async function isLMStudioModelLoaded(modelName) {
  try {
    const res = await fetch('http://127.0.0.1:1234/v1/models');
    if (!res.ok) return false;

    const json = await res.json();
    if (!json.data || !Array.isArray(json.data)) return false;

    return json.data.some(m => m.id === modelName);
  } catch (e) {
    return false;
  }
}

async function fetchWithTimeoutAndRetry(
    url,
    options,
    timeoutPerRetryMs = 15000,
    maxRetries = 3
) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            timeoutPerRetryMs
        );
       // console.debug("Attempt:",attempt)
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response; // ✅ succes

        } catch (err) {
            clearTimeout(timeoutId);
            lastError = err;

            if (err.name === 'AbortError') {
                console.debug(
                    `LMStudio timeout on attempt ${attempt}/${maxRetries} (${timeoutPerRetryMs}ms)`
                );
            } else {
                console.debug(
                    `LMStudio fetch error on attempt ${attempt}/${maxRetries}:`,
                    err.message
                );
            }

            // ⛔ geen delay: LM Studio is meestal nog bezig
            // retry betekent nieuwe inference
        }
    }

    throw lastError;
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
               // === Helper: local call with timeout ===
            async function callLocalWithTimeout(body, timeoutMs) {
                return Promise.race([
                    await callLocalOllama(body),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Local Ollama timeout after ${timeoutMs} ms`)), timeoutMs)
                    )
                ]);
            }