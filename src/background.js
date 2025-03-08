// background.js
console.debug("background loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "load_deepl_glossary") {
        //console.debug(request.isFree)
       // console.debug(request.apiKey)
        //console.debug(request.glossaryData)
        let deeplServer = request.isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
        let url = `${deeplServer}/v2/glossaries`;

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
});


