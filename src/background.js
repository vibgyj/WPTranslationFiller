// background.js
console.debug("background loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.debug("request;",request)
    if (request.action === "load_deepl_glossary") {
        // console.debug(request.isFree)
        //   console.debug(request.apiKey)
        //   console.debug(request.glossaryData)
        let deeplServer = request.isFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
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
        fetch("https://api-free.deepl.com/v2/glossaries", {
            method: "GET",
            headers: {
                "Authorization": `DeepL-Auth-Key ${request.apiKey}`, // Replace with your actual API key
                "Content-Type": "application/json"
            }
        })
            .then(response => {
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
        let deeplServer = request.isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
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
         //console.debug("Received translation request", request.body);

        // Destructure DeepL endpoint + control params
        //console.debug("requestbody:", request.body)
        let { DeeplURL, DeepLFreePar, ...deeplParams } = request.body;
    
        // ✅ Build request body with only allowed DeepL params
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

});
