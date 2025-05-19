// background.js
console.debug("background loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        //console.debug("We did get post", request.body);
        // Convert the object to URL-encoded string
        const urlEncodedBody = new URLSearchParams({
            auth_key: request.body.auth_key,
            text: request.body.text.join(''),  // Join the array into a single string
            source_lang: request.body.source_lang,
            target_lang: request.body.target_lang,
            formality: request.body.formality,
            preserve_formatting: request.body.preserve_formatting,
            tag_handling: request.body.tag_handling,
            ignore_tags: request.body.ignore_tags,
            split_sentences: request.body.split_sentences,
            outline_detection: request.body.outline_detection,
            context: request.body.context,
            glossary_id: request.body.glossary_id
        }).toString();  // Convert to query string
        let url = request.body.DeeplURL
       // let url = request.body.DeeplFreePar == true ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
       
        // Now, make the API request
        fetch(url, {
            method: "POST",
            headers: {
                "Authorization": "DeepL-Auth-Key "+request.body.auth_key,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: urlEncodedBody  // Use the URL-encoded string
        })
            .then(response => {
                if (!response.ok) {
                    // Handle non-JSON errors (e.g., invalid API key, quota exceeded)
                    return response.text().then(text => {
                        console.error("DeepL API Error:", response.status, text);
                        sendResponse({ error: `HTTP ${response.status}: ${text}` });
                    });
                }
                return response.json(); // Parse JSON only if response is OK
            })
            .then(data => {
                if (data) sendResponse(data);
            })
            .catch(error => {
                console.error("Fetch error:", error);
                sendResponse({ error: error.message });
            });

        return true; // Keep the message channel open
    }
});
