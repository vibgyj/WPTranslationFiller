// background.js
//console.debug("background loaded")
function encodeBase64(text) {
    // Convert UTF-8 string to Base64 (no deprecated APIs)
    return btoa(
        String.fromCharCode(...new TextEncoder().encode(text))
    );
}
function decodeBase64(encoded) {
    // Convert Base64 back to UTF-8 string (no deprecated APIs)
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    //console.debug("Received message:", request);
    if (request.action === "CheckModelLMs") {

       const model = request.model;

       // start async werk in microtask
        (async () => {
            try {
                // call je bestaande async functie
                const found = await isLMStudioModelLoaded(model);
                console.debug(`Model check for ${model}:`, found);

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

                    // 3.x models use thinkingLevel (not thinkingBudget). Pro models don't
                    // accept "minimal" (floor is "low"); Flash-tier models do accept "minimal".
                    const isV3 = /^gemini-3\./.test(model) || model === "gemini-flash-latest";
                    const isPro = /pro/.test(model);

                    let URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                    const generationConfig = { maxOutputTokens: max_tokens };
                    if (isV3) {
                        generationConfig.thinkingConfig = { thinkingLevel: isPro ? "low" : "minimal" };
                    } else {
                        generationConfig.temperature = 0.0;
                        if (Top_p !== undefined) generationConfig.topP = Top_p;
                        if (Top_k !== undefined) generationConfig.topK = Top_k;
                    }

                    const res = await fetch(URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            contents: [
                                { role: "user", parts: [{ text: prompt }] }
                            ],
                            generationConfig
                        }),
                        keepalive: true,
                        priority: 'high'
                    });

                    let data;
                    try {
                        data = await res.json();
                    } catch (parseErr) {
                        throw new Error(`Failed to parse Gemini response (HTTP ${res.status})`);
                    }

                    if (!res.ok) {
                        let errorMessage = `Gemini request failed (HTTP ${res.status})`;

                        if (data?.error?.message) {
                            errorMessage += `: ${data.error.message}`;
                        }

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
        }, 0);

        return true;
    }
    else if (request.action === "alibaba") {
        (async () => {
            const start = Date.now();
            const dataToSend = request.data;
            const apiKey = dataToSend.apiKey;
           // const baseUrl = dataToSend.baseUrl
            //    || "https://ws-jfu0174yr92bwsnt.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";
            // Default to Singapore (intl) — the region you can actually register for + test on.
           const baseUrl = dataToSend.baseUrl
               || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

            delete dataToSend.apiKey;
            delete dataToSend.baseUrl;

            // Surface hangs instead of failing silently.
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);

            let resp;
            try {
               
                resp = await fetch(`${baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apiKey
                    },
                    body: JSON.stringify(dataToSend),
                    signal: controller.signal
                });
            } catch (err) {
                clearTimeout(timeout);
                // No HTTP response at all. This is where a "no status" failure lands.
                const reason = err.name === "AbortError"
                    ? "request timed out (no response within 60s)"
                    : `network/permission error: ${err.message}`;
                //console.error("alibaba fetch threw (no response):", err);
                sendResponse({ error: `Alibaba request failed — ${reason}. Check host_permissions for ${baseUrl}` });
                return;
            }
            clearTimeout(timeout);

            // We got a response object — now the status is meaningful.
            //console.debug("alibaba status:", resp.status, "type:", resp.type, "ok:", resp.ok);

            if (!resp.ok) {
                let msg = "";
                try { msg = await resp.text(); } catch (_) { msg = "(no body)"; }
                const hint = resp.status === 0
                    ? " (status 0 — response blocked before a real status; host_permissions issue)"
                    : "";
                sendResponse({ error: `Alibaba request failed (${resp.status})${hint}: ${msg}` });
                return;
            }

            try {
                const data = await resp.json();
                //console.debug("alibaba response:", data);

                const duration = ((Date.now() - start) / 1000).toFixed(2);
                console.debug("alibaba response time:", duration + "s");

            // Geef de hele chat-completion terug — de foreground doet zelf de extractie,
            // net als bij de andere providers.
            sendResponse({ result: data });
            } catch (err) {
                console.error("alibaba: failed to parse body:", err);
                sendResponse({ error: `Alibaba response parse error: ${err.message}` });
            }
        })();

        return true;
}
    else if (request.action == "Lara") {
        setTimeout(async () => {
            (async () => {
                try {
                    const {
                        accessKeyId,
                        accessKeySecret,
                        text,
                        sourceLang,
                        targetLang,
                        instructions,
                        glossaries,
                        adaptTo,
                        content_type,
                        multiline,
                        noTrace,
                        style,
                        reasoning
                    } = request.data;

                    if (!accessKeyId) {
                        throw new Error("Lara Access Key ID is missing");
                    }

                    if (!accessKeySecret) {
                        throw new Error("Lara Access Key Secret is missing");
                    }

                    if (text === undefined || text === null) {
                        throw new Error("Lara text is missing");
                    }

                    if (!targetLang) {
                        throw new Error("Lara target language is missing");
                    }

                    /*
                     * ---------------------------------------------------------
                     * Lara authentication
                     * ---------------------------------------------------------
                     */

                    const authBody = {
                        id: accessKeyId
                    };

                    const authBodyString = JSON.stringify(authBody);

                    // Lara SDK:
                    // SHA-256 -> first 16 bytes -> Base64
                    const hashBuffer = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(authBodyString)
                    );

                    const first16 = hashBuffer.slice(0, 16);

                    const contentMD5 = btoa(
                        String.fromCharCode(
                            ...new Uint8Array(first16)
                        )
                    );

                    const authDate = new Date().toUTCString();

                    const authChallenge =
                        "POST\n" +
                        "/v2/auth\n" +
                        contentMD5 + "\n" +
                        "application/json\n" +
                        authDate;

                    const hmacKey = await crypto.subtle.importKey(
                        "raw",
                        new TextEncoder().encode(accessKeySecret),
                        {
                            name: "HMAC",
                            hash: "SHA-256"
                        },
                        false,
                        ["sign"]
                    );

                    const signatureBuffer = await crypto.subtle.sign(
                        "HMAC",
                        hmacKey,
                        new TextEncoder().encode(authChallenge)
                    );

                    const signature = btoa(
                        String.fromCharCode(
                            ...new Uint8Array(signatureBuffer)
                        )
                    );

                    /*
                     * ---------------------------------------------------------
                     * Get Lara access token
                     * ---------------------------------------------------------
                     */

                    const authResponse = await fetch(
                        "https://api.laratranslate.com/v2/auth",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Lara-Date": authDate,
                                "Content-MD5": contentMD5,
                                "Authorization": `Lara:${signature}`
                            },
                            body: authBodyString,
                            keepalive: true,
                            priority: "high"
                        }
                    );

                    let authData;

                    try {
                        authData = await authResponse.json();
                    } catch (parseErr) {
                        throw new Error(
                            `Failed to parse Lara authentication response (HTTP ${authResponse.status})`
                        );
                    }

                    if (!authResponse.ok) {
                        console.debug("Lara auth error response:", authData);
                        let errorMessage =
                            `Lara authentication failed (HTTP ${authResponse.status})`;

                        if (authData?.message) {
                            errorMessage += `: ${authData.message}`;
                        }

                        if (authData?.error?.message) {
                            errorMessage += `: ${authData.error.message}`;
                        }

                        throw new Error(errorMessage);
                    }

                    const token = authData?.token;

                    if (!token) {
                        throw new Error(
                            "Lara authentication returned no access token"
                        );
                    }

                    /*
                     * ---------------------------------------------------------
                     * Translation request
                     * ---------------------------------------------------------
                     */

                    const translationBody = {
                        q: text,
                        source: sourceLang || null,
                        target: targetLang
                    };

                    if (instructions?.length) {
                        translationBody.instructions = instructions;
                    }

                    if (glossaries?.length) {
                        translationBody.glossaries = glossaries;
                    }

                    if (adaptTo?.length) {
                        translationBody.adapt_to = adaptTo;
                    }

                    if (content_type) {
                         translationBody.content_type = content_type;
                    }

                    if (multiline !== undefined) {
                        translationBody.multiline = multiline;
                    }

                    if (noTrace !== undefined) {
                        translationBody.no_trace = noTrace;
                    }

                    if (style) {
                        translationBody.style = style;
                    }

                    if (reasoning !== undefined) {
                        translationBody.reasoning = reasoning;
                    }

                    const translationResponse = await fetch(
                        "https://api.laratranslate.com/v2/translate",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`,
                                "X-Lara-Date": new Date().toUTCString()
                            },
                            body: JSON.stringify(translationBody),
                            keepalive: true,
                            priority: "high"
                        }
                    );

                    let translationData;

                    try {
                        translationData = await translationResponse.json();
                    } catch (parseErr) {

                        // Keep the raw response available for debugging.
                        let rawText = "";

                        try {
                            rawText = await translationResponse.text();
                        } catch (_) {
                            // Ignore secondary parsing error.
                        }

                        throw new Error(
                            `Failed to parse Lara translation response (HTTP ${translationResponse.status})` +
                            (rawText ? `: ${rawText.substring(0, 500)}` : "")
                        );
                    }

                    if (!translationResponse.ok) {
                        let errorMessage =
                            `Lara request failed (HTTP ${translationResponse.status})`;

                        if (translationData?.message) {
                            errorMessage += `: ${translationData.message}`;
                        }

                        if (translationData?.error?.message) {
                            errorMessage += `: ${translationData.error.message}`;
                        }

                        throw new Error(errorMessage);
                    }

                    /*
                     * Lara TextResult:
                     *
                     * {
                     *     contentType,
                     *     sourceLanguage,
                     *     translation
                     * }
                     *
                     * translation is either a string or an array,
                     * depending on q.
                     */

                    const translation = translationData?.translation;

                    if (
                        translation === undefined ||
                        translation === null
                    ) {
                        throw new Error(
                            "Lara returned no translation content"
                        );
                    }
                    console.debug("Lara translation result:", translation);
                    sendResponse({
                        success: true,
                        translation: translation,
                        sourceLanguage:
                            translationData?.sourceLanguage || sourceLang,
                        content_type:
                            translationData?.content_type || content_type || "text"
                    });

                } catch (err) {

                    console.error("Lara error:", err);

                    sendResponse({
                        success: false,
                        error: err?.message || "Unknown Lara error"
                    });
                }
            })();
        }, 0);

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
            "enable_beta_languages",
            "model_type"
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
                    console.debug("✅ DeepL response:", json);
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
    else if (request.action == "NLPCloud") {
        (async () => {
            try {
                const dataToSend = { ...request.data };
                const apiKey = dataToSend.apiKey;
                const originalText = dataToSend.text;
                const target = dataToSend.target;
                const source = "eng_Latn";
                let top_p = dataToSend.top_p || 1.0;
                let top_k = dataToSend.top_k || 50;
                let temparature = dataToSend.temparature || 0.0;
                // 1. Split zinnen + separators (layout behouden)
                const sentenceRegex = /([^\n.!?]+[.!?]?)([\s\n\t]*)/g;
                const parts = [];
                let match;

                while ((match = sentenceRegex.exec(originalText)) !== null) {
                    const sentence = match[1].trimEnd();
                    const separator = match[2] || "";

                    if (sentence.length === 0) continue;

                    parts.push({ sentence, separator });
                }

                let finalText = "";

                // 2. Per zin vertalen
                for (const { sentence, separator } of parts) {
                    const resp = await fetch(
                        "https://api.nlpcloud.io/v1/nllb-200-3-3b/translation",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": "Bearer " + apiKey
                            },
                            body: JSON.stringify({
                                text: sentence,
                                source,
                                target, 
                                top_p,
                                top_k,
                                temparature

                            })
                        }
                    );

                    if (!resp.ok) {
                        const msg = await resp.text();
                        sendResponse({ error: `Request failed (${resp.status}): ${msg}` });
                        return;
                    }

                    const data = await resp.json();
                    const translatedText = data.translation_text || "";

                    // 3. Quotes cleanup 
                    const cleaned = cleanTranslation(translatedText);

                    finalText += cleaned + separator;
                }

                sendResponse({ result: finalText });

            } catch (err) {
                sendResponse({ error: err.toString() });
            }
        })();

        return true; // keep sendResponse alive
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
                const myURL = dataToSend.URL
                delete dataToSend.apiKey;               // remove it from the body.
                delete dataToSend.URL;
               // console.debug("URL:", myURL) 
                const resp = await fetch(myURL, {
               // const resp = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apiKey
                    },
                    body: JSON.stringify(dataToSend)
                });
                console.debug("response status:", resp)
                if (!resp.ok) {
                    const raw = await resp.text();

                    // Try to parse OpenAI's structured error; fall back to raw text
                    let parsed = null;
                    try { parsed = JSON.parse(raw); } catch { /* not JSON */ }

                    const apiError = parsed?.error;
                    const errorInfo = {
                        status: resp.status,
                        message: apiError?.message || raw || resp.statusText,
                        type: apiError?.type || null,
                        param: apiError?.param || null,
                        code: apiError?.code || null,
                    };

                    console.error("OpenAI request failed:", errorInfo);
                    sendResponse({ error: errorInfo });
                     return;
                }
                //console.debug("response status:", resp) 
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

    else if (request.action === "cerebras") {
        (async () => {
            try {
                const dataToSend = { ...request.data }; // copy newData
                const apiKey = dataToSend.apiKey;       // extract the key
                const myURL = dataToSend.URL
                delete dataToSend.apiKey;               // remove it from the body.
                delete dataToSend.URL;
                console.debug("DataToSend:", dataToSend)
                const resp = await fetch(myURL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apiKey
                    },
                    body: JSON.stringify(dataToSend)
                });
                console.debug("response status:", resp)
                if (!resp.ok) {
                    const raw = await resp.text();

                    // Try to parse OpenAI's structured error; fall back to raw text
                    let parsed = null;
                    try { parsed = JSON.parse(raw); } catch { /* not JSON */ }

                    const apiError = parsed?.error;
                    const errorInfo = {
                        status: resp.status,
                        message: apiError?.message || raw || resp.statusText,
                        type: apiError?.type || null,
                        param: apiError?.param || null,
                        code: apiError?.code || null,
                    };

                    console.error("Cerebras request failed:", errorInfo);
                    sendResponse({ error: errorInfo });
                    return;
                }
                //console.debug("response status:", resp) 
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
    else if (request.action === "Kimi") {
        (async () => {
            try {
                const dataToSend = { ...request.data };
                const apiKey = dataToSend.apiKey;
                delete dataToSend.apiKey;              // never send the key in the body

                console.debug("Kimi request:", dataToSend);

                const resp = await fetch("https://api.moonshot.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apiKey
                    },
                    body: JSON.stringify(dataToSend)
                });

                console.debug("moonshot:", resp.status, resp.statusText,
                    "retry-after:", resp.headers.get("retry-after"));

                if (!resp.ok) {
                    const raw = await resp.text();
                    let parsed = null;
                    try { parsed = JSON.parse(raw); } catch { /* not JSON */ }

                    const type = parsed?.error?.type ?? null;
                    const detail = parsed?.error?.message ?? raw.slice(0, 500);

                    let state, hint;
                    switch (resp.status) {
                        case 400:
                            state = "bad_request";
                            hint = "Moonshot rejected the request body: " + detail;
                            break;
                        case 401:
                            state = "auth";
                            hint = "API key rejected — check for stray whitespace when pasting.";
                            break;
                        case 404:
                            state = "bad_model";
                            hint = "Model '" + dataToSend.model + "' is not available on this account.";
                            break;
                        case 429:
                            if (type === "exceeded_current_quota_error") {
                                state = "no_credit";
                                hint = "No balance on the Moonshot account. A minimum $1 top-up is "
                                    + "required before any key works. Retrying will not help.";
                            } else {
                                state = "rate_limited";
                                hint = "Rate limited or server busy — back off and retry.";
                            }
                            break;
                        default:
                            state = resp.status >= 500 ? "server_error" : "unknown";
                            hint = "Upstream problem: " + detail;
                    }

                    console.warn("moonshot error:", { state, status: resp.status, type, detail });
                    sendResponse({ error: hint, state, status: resp.status, type, detail });
                    return;
                }

                const json = await resp.json();
                const choice = json.choices?.[0];
                const content = choice?.message?.content ?? "";
                const reasoning = choice?.message?.reasoning_content ?? "";

                console.debug("moonshot ok:", {
                    finish: choice?.finish_reason,
                    usage: json.usage,
                    contentChars: content.length,
                    reasoningChars: reasoning.length,
                    preview: content.slice(0, 120)
                });

                // No usable content — surface WHY instead of returning an empty result
                // that the caller would silently skip (=> translated=0 with no reason).
                if (!content) {
                    const why = choice?.finish_reason === "length"
                        ? "hit max_tokens (" + dataToSend.max_tokens + ") before emitting content"
                        + (reasoning.length ? " — all budget went to reasoning; thinking is still ON" : "")
                        : "model returned empty content";
                    console.warn("moonshot empty content:", why);
                    sendResponse({ error: "Kimi returned no content — " + why, state: "empty_content", status: 200 });
                    return;
                }

                if (choice?.finish_reason === "length") {
                    console.warn("truncated: hit max_tokens =", dataToSend.max_tokens);
                }

                sendResponse({ result: json });

            } catch (err) {
                console.warn("moonshot fetch failed:", err.stack ?? err);
                sendResponse({ error: err.message ?? String(err), state: "network" });
            }
        })();

        return true; // keep sendResponse alive for async
    }
    else if (request.action === "groqModels") {
    const handleGroqModels = async () => {
        try {
            const resp = await fetch(
                "https://api.groq.com/openai/v1/models",
                {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + request.data.apiKey
                    }
                }
            );

            if (!resp.ok) {
                const errorText = await resp.text();
                console.debug("Groq models error response:", errorText);
                sendResponse({
                    ok: false,
                    error: {
                        status: resp.status,
                        message: errorText
                    }
                });
                return;
            }

            sendResponse({
                ok: true,
                result: await resp.json()
            });

        } catch (err) {
            console.debug("Groq models fetch error:", err);
            sendResponse({
                ok: false,
                error: {
                    message: err.toString()
                }
            });
        }
    };
    handleGroqModels();
    return true;
}
   else if (request.action === "groq") {
    //console.trace("GROQ ORIGIN TRACE");
    //console.log("GROQ ACTION PAYLOAD:", request);
    const handleGroq = async () => {
        try {
            const dataToSend = { ...request.data };
            const apiKey = dataToSend.apiKey;
            delete dataToSend.apiKey;

            const resp = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apiKey
                    },
                    body: JSON.stringify(dataToSend)
                }
            );

           //console.debug("response status:", resp);

            // Forward rate-limit headers so the content script can
            // use the exact reset times instead of guessing.
            const rateLimitHeaders = {
                limitRequests:      resp.headers.get("x-ratelimit-limit-requests"),
                limitTokens:        resp.headers.get("x-ratelimit-limit-tokens"),
                remainingRequests:  resp.headers.get("x-ratelimit-remaining-requests"),
                remainingTokens:    resp.headers.get("x-ratelimit-remaining-tokens"),
                resetRequests:      resp.headers.get("x-ratelimit-reset-requests"),
                resetTokens:        resp.headers.get("x-ratelimit-reset-tokens")
            };

           // console.debug("rate-limit headers:", rateLimitHeaders);

            const contentType = resp.headers.get("content-type") || "";

            if (!resp.ok) {
                const errorText = await resp.text();
                console.debug("Groq error response:", errorText);
                sendResponse({
                    ok: false,
                    rateLimit: rateLimitHeaders,
                    error: {
                        status: resp.status,
                        message: errorText
                    }
                });
                return;
            }

            let data = contentType.includes("application/json")
                ? await resp.json()
                : await resp.text();

          //  console.debug("data:", data);
            sendResponse({
                ok: true,
                rateLimit: rateLimitHeaders,
                result: data
            });

        } catch (err) {
            console.debug("Groq fetch error:", err);
            sendResponse({
                ok: false,
                error: {
                    message: err.toString()
                }
            });
        }
    };
    handleGroq();
    return true;
}
    else if (request.action === "openRouter") { // OpenRouter translation
    (async () => {
        try {
            const start = Date.now();

            const dataToSend = { ...request.data };  // ✅ clone zodat apiKey intact blijft voor volgende rijen
            const apiKey = dataToSend.apiKey;

            // remove sensitive field before sending
            delete dataToSend.apiKey;
          //  console.debug("openRouter request payload:", dataToSend)
            const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey,
                    "HTTP-Referer": "http:localhost",
                    "X-Title": "WP Translation Filler Extended"
                },
                body: JSON.stringify(dataToSend)
            });

            if (!resp.ok) {
                const msg = await resp.text();
                sendResponse({ error: `Request failed (${resp.status}): ${msg}` });
                return;
            }

            const contentType = resp.headers.get("content-type") || "";
            let data;

            if (contentType.includes("application/json")) {
                data = await resp.json();
            } else {
                data = await resp.text();
            }

            // 🔥 extract ONLY what you actually need (major performance win)
            const result =
              data?.choices?.[0]?.message?.content ??
              "";
            const modelUsed = data?.model ?? "unknown";  // ✅ welk model daadwerkelijk gebruikt is

           // console.debug("result:", result)
           // console.debug("model used:", modelUsed)  // ✅ log het model

            sendResponse({ result, modelUsed });  // ✅ stuur het mee terug


        } catch (err) {
            sendResponse({ error: err.toString() });
        }
    })();

    return true;
}
    else if (request.action === "ollama_translate") {
       // Ollama translation
    //-console.debug("Ollama translation request received:");
    
    (async () => {
        try {
            var start = Date.now()
            var {
                text,
                model,
                systemPrompt,
                max_tokens,
                temperature,
                apiKey,
                useLocal,
                repeat_penalty,
                do_not_complete,
                Top_p,
                Top_k,
            } = request.data;
            //console.debug("model:", model);
           // console.debug("prompt:", systemPrompt); 
            let myTop_p = parseInt(Top_p)
            let myTop_k = parseInt(Top_k) 
            if (!text) return sendResponse({ success: false, error: "Text is missing" });
            if (!model) return sendResponse({ success: false, error: "Model is missing" });
            if (!systemPrompt) return sendResponse({ success: false, error: "System prompt is missing" });
            //console.debug("original:",text)
            const myLocal = toBoolean(useLocal);
             
            // === Local translation path ===
            if (toBoolean(myLocal)) {
               const myTime = 12000000; // in ms
              let messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: text }
];

var bodyToSend = {
    model: model,
    messages: messages,
    stream: false,
    think: false,
    options: { temperature: temperature, repeat_penalty: repeat_penalty, do_not_complete: do_not_complete, top_p: myTop_p, top_k: myTop_k, keep_alive: myTime }
};
                //options: {temperature: temperature, repeat_penalty: repeat_penalty, do_not_complete: 1,  }
                try {
                    const result = await callLocalWithRetry(bodyToSend, 3, 10000); // 3 retries, 15s timeout
                  //  console.debug("Local Ollama result:", result.translation);
                    const translated = result.translation
                     const duration = ((Date.now() - start) / 1000).toFixed(2);
                           let show_debug = true
                           if (show_debug) console.debug("Ollama proxy response (raw):", result.translation," ",duration);
                     // 3. Quotes cleanup 
                    let translatedText = cleanTranslation(translated);
                    translatedText = translatedText
    .replace(/^[#*\s]*(vertaling|translation|output|result)[:#*\s]*/i, '')
    .replace(/`/g, '');  // ← no trim, only backticks removed
                    //console.debug("translatedText:",translatedText)
                    sendResponse({
                        success: true,
                        translation: translatedText
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

            //console.debug("Sending chat request to Ollama online:", bodyToSend);

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

          //  console.debug("HTTP status:", resp.status);
          //  console.debug("Raw response text:", rawText);
          //  console.debug("Parsed JSON:", data);

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

          //  console.debug("Processed translation:", data.message.content);

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


    else if (request.action === "koboldCpp") {
    (async () => {
        try {
            const start = Date.now();
            //console.debug("We start translating with kobolCpp")
            const dataToSend = request.data;
            const baseUrl = dataToSend.baseUrl || "http://localhost:5001";
            delete dataToSend.baseUrl;
            //console.debug("KoboldCPP payload:", JSON.stringify(dataToSend));
            const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dataToSend)
            });
            //console.debug("KoboldCPP response status:", resp);
            if (!resp.ok) {
                const msg = await resp.text();
              //  console.debug("KoboldCPP error response:", resp);
                errorstate= 'NOK'
                sendResponse({ error: `KoboldCPP request failed (${resp.status}): ${msg}` });
                return;
            }

            const data = await resp.json();
            console.debug("data:",data)
            const result = data?.choices?.[0]?.message?.content ?? "";
           // console.debug("Result kobol:",result)
            const duration = ((Date.now() - start) / 1000).toFixed(2);
           // console.debug("KoboldCPP response time:", duration + "s");

            sendResponse({ result });

        } catch (err) {
            console.debug("KoboldCPP fetch error:", err);
            console.debug("KoboldCPP error stack:", err.stack);
            sendResponse({ error: err.toString() });
        }
    })();
    return true;
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
                Top_k,
                LMStudioWait
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
                   do_not_complete,
                   chat_template_kwargs: {
                    enable_thinking: false
                    }
                };
                
                    console.log("VERZONDEN BODY:", JSON.stringify(body, null, 2));
                
              
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
                        LMStudioWait, // timeout per retry in ms
                        3      // max retries
                    );

                    // Lees de body precies één keer
                    const json = await res.json();
                   // if (toBoolean(DebugMode)) {
                        console.log("RUWE LM Studio output:", JSON.stringify(json, null, 2));
                   // }

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
                temperature  // No default here — handled conditionally below
            } = request.data || {};
            
            if (!apiKey) {
                sendResponse({ success: false, error: "API key is missing" });
                return;
            }
            if (!model || !text || !systemPrompt || !max_tokens) {
                sendResponse({ success: false, error: "Required field missing (model/text/systemPrompt/max_tokens)" });
                return;
            }

            const NO_TEMPERATURE_MODELS = new Set([
                'claude-opus-4-8',
                'claude-opus-4-7',
                'claude-sonnet-5',
                'claude-fable-5'
            ]);
            const supportsTemperature = !NO_TEMPERATURE_MODELS.has(model);
            
            // Claude requires top-level `system`, messages only user content
            const bodyToSend = {
                model,
                system: systemPrompt,
                messages: [
                    { role: "user", content: text }
                ],
                max_tokens,
                ...(supportsTemperature && { temperature: temperature ?? 0.3 }),
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
            
            if (!resp.ok) {
                try {
                    const json = JSON.parse(respText);

                    let errorMessage;
                    if (json.error?.message) {
                        const errorType = json.error.type || "unknown_error";
                        errorMessage = `[${errorType}] ${json.error.message}`;
                    } else {
                        errorMessage = JSON.stringify(json);
                    }

                    sendResponse({
                        success: false,
                        error: errorMessage,
                        errorType: json.error?.type || null,
                        requestId: json.request_id || null,
                        status: resp.status
                    });

                } catch {
                    sendResponse({
                        success: false,
                        error: respText || `HTTP ${resp.status}`,
                        errorType: null,
                        requestId: null,
                        status: resp.status
                    });
                }
                return;
            }
            
            let respData;
            try {
                respData = JSON.parse(respText);
            } catch (e) {
                sendResponse({ success: false, error: "Cannot parse JSON from Claude", raw: respText });
                return;
            }
            
            if (!respData?.content || !Array.isArray(respData.content) || respData.content.length === 0) {
                sendResponse({ success: false, error: "No content returned from Claude", raw: respData });
                return;
            }
            
            const translation = respData.content.map(c => c?.text || "").filter(Boolean).join("\n");
            const usage = respData?.usage || null;
            
            sendResponse({ success: true, translation, usage });
        } catch (err) {
            sendResponse({ success: false, error: err?.message || String(err) });
        }
    })();
    return true;
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
                let data ="";
                try {
                    data = await res.json();
                    console.debug("Google Translate processed response:", data);
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
               // console.debug("Google Translate processed translation:", tr.translatedText);
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
            //console.debug("Lingvanex raw response:", respText);

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
                   // console.debug("target:", trans_url)
                   //  console.debug("source:", source_lang);
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
    if (request.action === "getWPGlossaryTest") {

        console.log("Received WPGlossary test request");

        chrome.tabs.query(
            {
                url: [
                    "https://translate.wordpress.org/*",
                    "http://localhost/*"
                ]
            },
            function (tabs) {

                console.log("Matching WPTF tabs:", tabs);

                if (tabs.length === 0) {
                    sendResponse({
                        success: false,
                        error: "No WPTF tab found"
                    });
                    return;
                }

                const tab = tabs[0];

               // console.log(
                 //   "Sending WPGlossary request to tab:",
                //    tab.id,
                 //   tab.url
               // );

                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        action: "getWPGlossaryTest"
                    },
                    function (response) {

                        if (chrome.runtime.lastError) {

                            console.error(
                                "Error sending WPGlossary request to content:",
                                chrome.runtime.lastError.message
                            );

                            sendResponse({
                                success: false,
                                error: chrome.runtime.lastError.message
                            });

                            return;
                        }

                        console.log(
                            "Response from contentScript:",
                            response
                        );

                        sendResponse(response);
                    }
                );
            }
        );

        return true;
    }

    if (request.action === "importDefaultGlossary") {

       // console.log(
       //     "Received default glossary import:",
       //     request.records ? request.records.length : 0,
        //    "records"
       // );

        const records = request.records;

        if (!Array.isArray(records) || records.length === 0) {

            sendResponse({
                success: false,
                error: "No glossary records received"
            });

            return true;
        }

        chrome.tabs.query(
            {
                url: [
                    "https://translate.wordpress.org/*",
                    "http://localhost/*"
                ]
            },
            function (tabs) {

                if (chrome.runtime.lastError) {

                    sendResponse({
                        success: false,
                        error: chrome.runtime.lastError.message
                    });

                    return;
                }

              //  console.log(
               //     "Matching WPTF tabs:",
                //    tabs
               // );

                if (!tabs || tabs.length === 0) {

                    sendResponse({
                        success: false,
                        error: "No WPTF tab found"
                    });

                    return;
                }

                const tab = tabs[0];

            //    console.log(
              //      "Sending default glossary to tab:",
               //     tab.id,
                //    tab.url
              //  );

                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        action: "importDefaultGlossaryToDB",
                        dbName: request.dbName,
                        records: records
                    },
                    function (response) {

                        if (chrome.runtime.lastError) {

                            console.error(
                                "Error sending default glossary to content:",
                                chrome.runtime.lastError.message
                            );

                            sendResponse({
                                success: false,
                                error: chrome.runtime.lastError.message
                            });

                            return;
                        }

                      //  console.log(
                       //     "Response from contentScript:",
                       //     response
                       // );

                        sendResponse(
                            response || {
                                success: false,
                                error: "Content script returned no response"
                            }
                        );
                    }
                );
            }
        );

    return true;
}
    if (request.action === "getWPGlossaryTest") {

        getWPGlossaryTestRecords()
            .then(function (records) {

                console.log("Background WPGlossary records:", records);

                sendResponse({
                    success: true,
                    records: records
                });
            })
            .catch(function (error) {

                console.error(
                    "Error reading WPGlossary in background:",
                    error
                );

                sendResponse({
                    success: false,
                    error: error.message
                });
            });

    return true;
}
    if (request.action === "load_deepl_glossary") {
        let isFree = request.isFree === true || request.isFree === "true"; // handle boolean or string

        // Path B: v3 for BOTH account types — isFree only decides the domain
        let apiHost = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
        let url = `${apiHost}/v3/glossaries`;
       // console.debug("Url:", url);

        // Normalize glossaryData: accept a JSON string or an object,
        // and convert v2 shape (flat source_lang/target_lang/entries) to v3 shape
        let glossObj = typeof request.glossaryData === "string"
            ? JSON.parse(request.glossaryData)
            : request.glossaryData;

        if (!glossObj.dictionaries) {
            // old v2 shape -> wrap into a v3 dictionary
            glossObj = {
                name: glossObj.name || 'WPTF glossary',
                dictionaries: [{
                    source_lang: (glossObj.source_lang || 'en').toLowerCase(),
                    target_lang: (glossObj.target_lang || '').toLowerCase(),
                    entries: glossObj.entries || '',
                    entries_format: glossObj.entries_format || 'csv'
                }]
            };
        }

        let body = JSON.stringify(glossObj);
       // console.debug("CP3 request body:", body.slice(0, 300));

        fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `DeepL-Auth-Key ${request.apiKey}`
            },
            body: body
        })
            .then(async response => {
                if (!response.ok) {
                    // DeepL puts the reason in the response body, even on errors
                    let detail = '';
                    try {
                        const errBody = await response.json();
                        detail = errBody.message || JSON.stringify(errBody);
                    } catch {
                        detail = await response.text().catch(() => '');
                    }
                    throw new Error(`HTTP ${response.status}: ${detail}`);
                }
                return response.json();
            })
            .then(data => {
                const count = data.dictionaries?.[0]?.entry_count ?? 0;
               // console.debug("CP4 glossary created:", data.glossary_id, "entries:", count);
                sendResponse({ success: true, glossaries: data, glossary_id: data.glossary_id, entry_count: count });
            })
            .catch(error => {
                console.error("Error uploading glossary:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keeps sendResponse alive for async operations
    }
    else if (request.action === "fetch_deepl_glossaries") {
   // console.debug("we have a request to show the glossary:", request.isFree);

    const isFree = request.isFree === true || request.isFree === "true";
    let deeplServer = isFree ? "https://api-free.deepl.com/v2/glossaries" : "https://api.deepl.com/v3/glossaries";


  //  console.debug("We fetch glossaries");
   // console.debug("isFree:", request.isFree);
   // console.debug("key:", request.apiKey);
  //  console.debug("deeplServer:", deeplServer);

    fetch(deeplServer, {
        method: "GET",
        headers: {
            "Authorization": `DeepL-Auth-Key ${request.apiKey}`,
            "Content-Type": "application/json"
        }
    })
        .then(async response => {
          //  console.debug("raw response:", response);

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
      //  console.debug("isFree:",isFree)
        let deeplServer = isFree ? "https://api-free.deepl.com/v2/glossaries" : "https://api.deepl.com/v3/glossaries";
      //  console.debug("We delete glossary with id:", request.glossary_id)
      // console.debug("deeplserver:",deeplServer)
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
      //  console.debug("We started getGlossary")
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
    else if (request.action === 'fetchFavorites') {
    (async () => {
        try {
            const res  = await fetch(request.url, { credentials: 'include' });
            const html = await res.text();
            sendResponse({ success: true, html });
        } catch (err) {
            sendResponse({ success: false, error: err.message });
        }
    })();
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


          //  console.debug("Sending request body:", body);
          //  console.debug("url:", url)
          //  console.debug("key:",apiKey)
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
        console.debug("Removing keys from local storage:", keys);
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
               // console.debug(`Extension updated from ${details.previousVersion} → ${currentVersion}`);
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

async function callLocalOllama(bodyToSend) {
    const LOCAL_CHAT_URL = "http://127.0.0.1:11434/api/chat";
    try {
      //  console.debug("Sending chat request to local Ollama:", bodyToSend);
        const resp = await fetch(LOCAL_CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyToSend)
        });

        // Read the body ONCE as text first
        const rawText = await resp.text();

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseErr) {
            return {
                success: false,
                error: `Invalid JSON response (HTTP ${resp.status})`,
                raw: rawText
            };
        }

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
        console.debug("Error calling local Ollama:", err);
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
        return json.data.some(m => m.id === modelName);
    } catch (e) {
        console.log('[check] fetch faalde:', e.name, e.message);
        return false;
    }
}

async function fetchWithTimeoutAndRetry(
    url,
    options,
    timeoutPerRetryMs = 30000,
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

/// === Globale status voor warm model ===
let modelWarm = false;
let warmUpPromise = null;

// =====================
// Helper: local call met timeout + abort support
// =====================
async function callLocalWithTimeout(body, timeoutMs = 12000) {
    if (!body?.model) {
        throw new Error("callLocalWithTimeout: body.model is required");
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const result = await callLocalOllama(body, { signal, keep_alive: timeoutMs });
        console.debug("callLocalWithTimeout result:", result);
        return result;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Local Ollama timeout after ${timeoutMs} ms`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// =====================
// Helper: retry loop
// =====================
async function callLocalWithRetry(body, maxRetries = 3, timeoutMs = 12000) {
    if (!body?.model) {
        throw new Error("callLocalWithRetry: body.model is required");
    }

    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.debug(`Local Ollama attempt ${i + 1} of ${maxRetries}`);
            const result = await callLocalWithTimeout(body, timeoutMs);

            if (result?.success) return result;
            lastError = new Error(result?.error || "Unknown local Ollama error");
        } catch (err) {
            lastError = err;
            console.debug(`Attempt ${i + 1} failed: ${err.message}`);
        }
    }

    throw lastError;
}

// =====================
// Warm-up helper
// =====================
async function warmUpModel(body, keepAliveMs = 60000) {
    if (!body?.model) {
        console.warn("warmUpModel: body.model is required");
        return;
    }

    if (modelWarm) return warmUpPromise; // al bezig of klaar

    warmUpPromise = (async () => {
        try {
            console.debug(`Warming up Ollama model "${body.model}"...`);
            const warmBody = { ...body, prompt: "warm-up" };
            await callLocalOllama(warmBody, { keep_alive: keepAliveMs });
            modelWarm = true;
            console.debug(`Model "${body.model}" is warm and ready.`);
        } catch (err) {
            console.warn("Warm-up failed:", err.message);
        }
    })();

    return warmUpPromise;
}

// =====================
// Periodiek model warm houden
// =====================
function startKeepAliveInterval(body, intervalMs = 30000) {
    if (!body?.model) {
        console.warn("startKeepAliveInterval: body.model is required");
        return;
    }

    setInterval(() => {
        if (!modelWarm) return;

        const keepAliveBody = { ...body, prompt: "keep-alive" };

        callLocalOllama(keepAliveBody, { keep_alive: intervalMs + 5000 })
            .catch(() => {}); // fouten negeren
    }, intervalMs);
}

// === Voor gebruik in app ===
//(async () => {
//    await warmUpModel(60000);        // eerste warming-up
//    startKeepAliveInterval(30000);   // periodiek warm houden
//})();
function cleanTranslation(str) {
 if (!str) return "";

    str = str.trim();

    // 1. Verwijder quotes aan begin van string
    while (str.startsWith('"') || str.startsWith("'")) {
        str = str.slice(1).trim();
    }

    // 2. Verwijder quotes vlak voor het laatste teken als dat een punt, vraagteken of uitroepteken is
    const lastChar = str.slice(-1);
    if ([".", "!", "?"].includes(lastChar)) {
        if (str[str.length - 2] === '"' || str[str.length - 2] === "'") {
            str = str.slice(0, -2) + lastChar;
        }
    } else {
        // verwijder quotes aan het einde als er geen punt is
        while (str.endsWith('"') || str.endsWith("'")) {
            str = str.slice(0, -1).trim();
        }
    }

    // 3. Los eventuele escaped quotes binnenin op
    str = str.replace(/\\"/g, '"').replace(/\\'/g, "'");

    return str;
}
function splitSentencesWithSeparators(text) {
    const regex = /([^\n.!?]+[.!?]?)([\s\n\t]*)/g;

    const parts = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const sentence = match[1].trimEnd();
        const separator = match[2] || "";

        if (sentence.length === 0) continue;

        parts.push({ sentence, separator });
    }

    return parts;
}
async function getWPGlossaryTestRecords() {
    return await new Promise((resolve, reject) => {

        const request = indexedDB.open("WPGlossary", 1);

        request.onerror = function (event) {
            reject(event.target.error);
        };

        request.onsuccess = function (event) {
            const db = event.target.result;

            try {
                const transaction = db.transaction("glossary", "readonly");
                const store = transaction.objectStore("glossary");

                const request = store.getAll();

                request.onsuccess = function () {
                    resolve(request.result);
                };

                request.onerror = function (event) {
                    reject(event.target.error);
                };

                transaction.oncomplete = function () {
                    db.close();
                };

            } catch (error) {
                db.close();
                reject(error);
            }
        };
    });
}
