// Injected script
function checkLocale() {
    // 30-11-2022 PSS If the stats button is used within a project then the locale is not determined properly #261
    const localeString = window.location.href;
    let local = localeString.split("/");
    //console.debug("length locale:",local.length,local)
    if (local.length == 8) {
        locale = local[4];
    }
    else if (local.length == 9) {
        // if we are not within the tanslation table, the locale is at a different position
        if (local.includes("locale")) {
            locale = local[4];
            //console.debug("we found 4")
        }
        else {
            locale = local[6];
        }
    }
    else if (local.length == 10) {
        if (local.includes("import-translations")) {
            locale = local[6];
        }
        else {
            locale = local[7];
        }
    }
    else if (local.length == 11) {
        if (local.includes("import-translations")) {
            locale = local[7];
        }
        else {
            locale = local[8];
        }
    }
    else {
        locale = "en-gb";
    }
    return locale;
}

function adjustLayoutScreen() {
    // Retrieve value from chrome local storage
    chrome.storage.local.get(['WPTFscreenWidth'], function (result) {
        // Access the stored value
        var myScreenWidth;
        myScreenWidth = result.WPTFscreenWidth;
        var screenWidth = window.innerWidth;
        //console.debug("screenWidth:", screenWidth)
        var gpContentElement = document.querySelector('.gp-content');
        //console.debug("found setting:",myScreenWidth)
        // Perform actions based on the stored value
        if (myScreenWidth === null) {
            // set the deafault value
            if (screenWidth == 1455) {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }
            else {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }

        } else if (typeof myScreenWidth == 'undefined') {
            if (screenWidth == 1455) {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }
            else {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }

        }
        else {
            // Generate the new max-width style based on the stored value
            // Apply the new max-width style with !important
            myScreenWidth = myScreenWidth + "%"
            if (gpContentElement != null) {
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
            }
        }
    });
}

// Function to intercept XMLHttpRequests
function interceptXHR(xhr) {
    // Intercept the open method to store the URL
    // Flag to track whether requests should be intercepted
    //var interceptRequests = JSON.parse(localStorage.getItem('interXHR')) || true; // Retrieve value from localStorage
    var interceptRequests = localStorage.getItem('interXHR') // Retrieve value from localStorage
    var originalOpen = xhr.open;
    xhr.open = function (method, url) {
        // Store the URL for later use
        xhr._interceptedURL = url;
        // Call the original open method
        return originalOpen.apply(xhr, arguments);
    };
    // Intercept the send method to handle the response
    var originalSend = xhr.send;
    xhr.send = function () {
        let mydata = "<p class=\"translation-suggestion__translation\">API call blocked.</p>"
        if ((interceptRequests == 'true' && xhr._interceptedURL.includes('get-tm-openai')) || (interceptRequests == 'true' && xhr._interceptedURL.includes('get-tm-deepl') || (interceptRequests == 'true' && xhr._interceptedURL.includes('get-translation-helpers')))) {
            // Instead of sending the request, provide a mocked response immediately
            var mockedResponse = {
                success: true,
                data: mydata
            };
            // Set responseText property to simulate the response
            Object.defineProperty(xhr, 'responseText', { value: JSON.stringify(mockedResponse), writable: true });
            // Trigger the onload event to simulate the response
            if (typeof xhr.onload === 'function') {
                xhr.onload();
            }
            // Prevent the original request from being sent by overriding the send method
            xhr.send = function () {
                //console.debug("we are intercepting")
            };
            return; // Exit early without calling the original send method
        }
        // Call the original send method for non-intercepted requests
        try {
            return originalSend.apply(xhr, arguments);

         } catch (error) {
        console.log(`Error: ${error.message}`);
         }
        //return originalSend.apply(xhr, arguments);
        originalSend.onerror = function () {
            console.error('Request failed due to a network error.');
        };
    };
}

// Function to toggle interception based on the flag value
function toggleInterception(shouldIntercept,transProcess) {
    interceptRequests = shouldIntercept;
    translationProcess = transProcess;
}

// Add a listener to handle messages from the content script
window.addEventListener('message', function (event) {
    //console.debug("injected:",event)
    // Check if the event is from a trusted source
    if (event.source === window && event.data.action === 'updateInterceptRequests') {
        // Update interception based on the message data
        toggleInterception(event.data.interceptRequests, event.data.transProcess);
    }
    else {
        if (MessageEvent.action === 'translate') {
            translateText(message.text, message.targetLang)
                .then(translatedText => {
                    //console.debug("translated in inject:",translatedText)
                    sendResponse({ translatedText: translatedText });
                })
                .catch(error => {
                    sendResponse({ translatedText: 'Error: ' + error });
                });

            return true; // Keep the message channel open for async response
        }
    }
});

// Intercept XMLHttpRequests globally
(function () {
    // Store the original XMLHttpRequest object
    var OriginalXHR = window.XMLHttpRequest;
    // Override the XMLHttpRequest constructor to intercept requests
    window.XMLHttpRequest = function () {
        // Create a new instance of the original XMLHttpRequest
        var xhr = new OriginalXHR();
        // Intercept this instance of XMLHttpRequest
        interceptXHR(xhr);
        // Return the modified XHR object
        return xhr;
    };
})();

async function openDeepLDatabase(dbDeepL) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("DeeplGloss", 1);

        request.onupgradeneeded = function (event) {
            const dbDeepL = event.target.result;
            if (!dbDeepL.objectStoreNames.contains("glossary")) {
                const store = dbDeepL.createObjectStore("glossary", { keyPath: "id", autoIncrement: true });
                store.createIndex("locale_original", ["locale", "original"], { unique: true });
            }
        };

        request.onsuccess = function (event) {
            //console.debug("Database opened successfully");
            resolve(event.target.result); // Return the database reference
        };

        request.onerror = function (event) {
            console.error("Error opening database:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Function to list all records
function listAllRecords(locale,myDelete,myRecordDeleted) {
    openDeepLDatabase().then(dbDeepL => {
        const transaction = dbDeepL.transaction("glossary", "readonly");
        const store = transaction.objectStore("glossary");
        const index = store.index("locale_original"); // Compound index

        const records = [];
        const range = IDBKeyRange.bound([locale], [locale, "\uffff"]); // Query locale-specific entries

        index.openCursor(range).onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                records.push(cursor.value);
                cursor.continue(); // Continue fetching
            } else {
                // **Sort by "original" as locale is already filtered**
                records.sort((a, b) => a.original.localeCompare(b.original));
                displayRecords(records, myDelete, myRecordDeleted);
            }
        };
    });
}

function displayRecords(records, myDelete, myRecordDeleted) {
    const tableBody = document.getElementById("recordsTableBody");
    tableBody.innerHTML = "";
    let deleteText =myDelete; 
    
    records.forEach((record) => {
        const row = document.createElement("tr");

        // Add the record data to the row
        row.innerHTML = `
            <td>${record.locale}</td>
            <td>${record.original}</td>
            <td>${record.translation}</td>
            <td><button class="delete-btn">${deleteText}</button></td>
        `;

        // Add event listener for the delete button
        const deleteButton = row.querySelector(".delete-btn");

        // Explicitly pass locale and original values from record
        deleteButton.addEventListener("click", function () {
            // Log the values when button is clicked to verify correct values
            //console.debug("Deleting record with locale:", record.locale, "and original:", record.original);
            deleteRecord(record.locale, record.original, deleteText, myRecordDeleted); // Pass record values to deleteRecord
        });

        // Append the row to the table body
        tableBody.appendChild(row);
    });
}

function saveTranslation(locale, original,deleteText,message) {
    const newTranslation = document.getElementById("editTranslation").value.trim();

    if (!newTranslation) {
        alert("Translation cannot be empty!");
        return;
    }
    
    openDeepLDatabase().then(dbDeepL => {
        const transaction = dbDeepL.transaction("glossary", "readwrite");
        const store = transaction.objectStore("glossary");
        const index = store.index("locale_original");
        const keyRange = IDBKeyRange.only([locale, original]);
        const request = index.openCursor(keyRange);

        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                const updatedRecord = cursor.value;
                updatedRecord.translation = newTranslation.trim();
                cursor.update(updatedRecord);

                // Update the UI
                const translationCell = document.getElementById("editTranslation").parentNode;
                translationCell.innerHTML = newTranslation;

                // Restore the delete button
                const saveCell = translationCell.nextElementSibling;
                saveCell.innerHTML = `<button class="delete-btn" onclick="deleteRecord('${locale}', '${original}', '${deleteText}')">${deleteText})</button>`;
                alert(message);
            }
        };

        request.onerror = function (event) {
            console.error("Error updating translation:", event.target.error);
        };
    });
}

function deleteRecord(locale, original,myDelete,myRecordDeleted) {
    //console.log("Deleting record with locale:", locale, "and original:", original);
    openDeepLDatabase().then(dbDeepL => {
        const transaction = dbDeepL.transaction("glossary", "readwrite");
        const store = transaction.objectStore("glossary");

        const index = store.index("locale_original"); // Assuming compound index on locale and original

        // Create a key range based on locale and original
        const keyRange = IDBKeyRange.only([locale, original]);

        const request = index.openCursor(keyRange);
        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete(); // Delete the entry
                console.debug("Record deleted",myDelete,myRecordDeleted);
                alert(myRecordDeleted + original)
                listAllRecords(locale,myDelete,myRecordDeleted);
            }
        };
        request.onerror = function (event) {
            console.error("Error during deletion", event.target.error);
        };
    });
}
function closeModalClicked() {
    document.getElementById("DeepLmodal").style.display = "none";
   // console.debug("we closed the modal")
}
function startSearch(knopText, deleteText, myRecordDeleted, recordNotFound, message) {
    const locale = document.getElementById("searchLocale").value.trim();
    const original = document.getElementById("searchOriginal").value.trim();

    if (locale && original) {
        searchRecord(locale, original, knopText, deleteText, myRecordDeleted, recordNotFound, message);
    } else {
        alert(__("Please enter both Locale and Original text!"));
    }
}
function parseCSV(content) {
    return content.split("\n").map(line => {
        const [original, translation] = line.split(",").map(item => item.trim());
        return original && translation ? { original, translation } : null;
    }).filter(entry => entry);
}

async function importDeepLCSV(myDelete, myRecordDeleted) {
    // 09-05-2021 PSS added file selector for silent selection of file
    var fileSelector = document.createElement("input");
    fileSelector.setAttribute("type", "file");
    fileSelector.setAttribute("accept", "csv");
    fileSelector.addEventListener("change", handleFileImport);
    fileSelector.click();
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        let mylocale = checkLocale() || 'en';
        mylocale = mylocale.toUpperCase();

        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            const records = parseCSV(content);

            // Strip blanks and convert to UTF-8 for each record
            const processedRecords = records.map(({ original, translation }) => {
                return {
                    original: (original || '').trim(),        // Strip leading/trailing blanks
                    translation: (translation || '').trim()   // Strip leading/trailing blanks
                };
            });

            openDeepLDatabase().then(dbDeepL => {
                const transaction = dbDeepL.transaction("glossary", "readwrite");
                const store = transaction.objectStore("glossary");
                const index = store.index("locale_original");

                processedRecords.forEach(({ original, translation }) => {
                    const keyRange = IDBKeyRange.only([mylocale, original]);

                    const request = index.get(keyRange);
                    request.onsuccess = function (event) {
                        const existingRecord = event.target.result;
                        if (existingRecord) {
                            existingRecord.translation = translation;
                            store.put(existingRecord);
                        } else {
                            store.add({ locale: mylocale, original, translation });
                        }
                    };
                });

                transaction.oncomplete = function () {
                    let importReady = "Import completed successfully!"
                    alert(importReady);
                    listAllRecords(mylocale,myDelete, myRecordDeleted); // Refresh table
                };
            });
        };

        reader.readAsText(file);
    }
}

async function exportDeepLCSV(DownloadPath) {
    //console.debug("Export started:", DownloadPath)
    const db = await openDeepLDatabase();
    const transaction = db.transaction("glossary", "readonly");
    const store = transaction.objectStore("glossary");
    const request = store.getAll();
    let download = "wptf-glossary.csv"
    //console.debug("Download path:", DownloadPath)
        request.onsuccess = () => {
            const records = request.result;
            const csvContent = records.map(r => `${r.original},${r.translation}`).join("\n");
            const blob = new Blob([csvContent], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = download
            a.click();
            URL.revokeObjectURL(a.href);
    };
}


function searchRecord(locale, original, saveText, deleteText, myRecordDeleted, recordNotFound, message) {
    console.debug("deleteText:", deleteText)
    console.debug("not found:", recordNotFound)
    const tableBody = document.getElementById("recordsTableBody");
    const rows = tableBody.getElementsByTagName("tr");
    let found = false;

    for (let row of rows) {
        const localeCell = row.cells[0].textContent.trim();
        const originalCell = row.cells[1].textContent.trim();

        if (localeCell === locale && originalCell === original) {
            // Highlight the found row
            row.style.backgroundColor = "yellow";
            row.scrollIntoView({ behavior: "smooth", block: "center" });

            // Get translation cell
            const translationCell = row.cells[2];
            const currentTranslation = translationCell.textContent.trim();

            // Replace translation with an editable input field
            translationCell.innerHTML = `<input type="text" value="${currentTranslation}" id="editTranslation">`;

            // Add save button in 4th column
            const saveCell = row.cells[3];
            saveCell.innerHTML = `<button onclick="saveTranslation('${locale}', '${original}', '${deleteText}','${message}')">${saveText}</button>
                                  <button onclick="deleteRecord('${locale}', '${original}', '${deleteText}', '${myRecordDeleted}')">${deleteText}</button>`;


            found = true;
            break;
        }
    }

    if (!found) {
        alert(recordNotFound);
    }
}

function loadGlossaryFromDB(apiKey, DeeplFree,language) {
    // Ensure gloss is properly initialized as an array
    let gloss = [];

    openDeepLDatabase().then(dbDeepL => {
        const transaction = dbDeepL.transaction("glossary", "readonly");
        const store = transaction.objectStore("glossary");

        const request = store.getAll(); // Get all records

        request.onsuccess = function (event) {
            const records = event.target.result || []; // Ensure we have a valid array

            // Convert records into "original,translation" format
            records.forEach(record => {
                if (record.locale === language.toUpperCase() && record.original && record.translation) { // Filter by locale
                    gloss.push(`${record.original},${record.translation}`);
                }
            });

            gloss = prepare_glossary(gloss, language).then(mygloss => {
            gloss = JSON.stringify(mygloss)
                // Call the function with the formatted glossary data
            //console.debug("gloss:",gloss)
            loadMyGlossary(apiKey, DeeplFree, gloss);
            })   
        };

        request.onerror = function (event) {
            console.error("Error fetching glossary:", event.target.error);
        };
    }).catch(error => {
        console.error("Error opening database:", error);
    });
}

