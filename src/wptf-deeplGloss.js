function loadMyGlossary(apiKey, DeeplFree, gloss) {
     // console.debug("we start loading", apiKey, DeeplFree, gloss)
    //console.debug("DeeplFree:",DeeplFree)
    chrome.runtime.sendMessage({
        action: "load_deepl_glossary",
        apiKey: apiKey,
        glossaryData: gloss,
        isFree: DeeplFree
    }, (response) => {
        //console.debug("Received response:", response); // Debugging step
        //console.debug("response:",response)
        if (response && response.success) {
            //console.debug("Glossary uploaded:", response.glossaries);
            let result = response.glossaries.glossary_id
            //console.debug("received id:",response.glossaries.glossary_id)
            if (typeof result != 'undefined') {
                currWindow = window.self;
                // console.debug("houston we have a result:", result)
                if (response.message != "Wrong host") {
                    cuteAlert({
                        type: "question",
                        title: "Glossary Id",
                        message: __("Do you want to store the glossary ID?<br>") + result,
                        confirmText: "Confirm",
                        cancelText: "Cancel",
                        myWindow: currWindow
                    }).then(async (e) => {
                        if (e == ("confirm")) {
                            let glossId = result
                            await localStorage.setItem('deeplGlossary', glossId);
                            let is_stored = await localStorage.getItem('deeplGlossary')
                            if (is_stored == null) {
                                messageBox('warning', 'The glossary ID is not stored<br>Check your privacy settings!')
                            }
                            else {
                                let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-red`);
                                //console.debug("load:", loadGlossButton)
                                if (loadGlossButton != null) {
                                    loadGlossButton.classList.remove("LoadGloss-button-red");
                                    loadGlossButton.classList.add("LoadGloss-button-green");
                                }
                                messageBox("info", "Glossary ID: <br>" + glossId + __("<br>saved "));
                            }

                        } else {
                            messageBox("info", "Glossary ID: <br>" + result + __("<br>not saved "));
                        }
                        return "OK";
                    })
                }
                else {
                    messageBox("warning", "Wrong host!");
                    // return "NOK"
                }
            }
            else {
                messageBox("warning", "There is an error retrieving the glossary ID " + response.message + "<br>" + response.detail)
            }

        }
        else {
            if (typeof response != "undefined") {
                if (response.error == "HTTP error! Status: 400") {
                    messageBox("info", "We did not get a result of the request<br>" + response.error + "<br> Check your glossary contents")
                }
                else if (response.error == "HTTP error! Status: 401") {
                    messageBox("info", "We did not get a result of the request<br>" + response.error + "<br> Check your licence")
                }
                else if (response.status == "403") {
                    messageBox("info", "Authorization error<br>" + response.error + "<br> Check your licence")
                }
                else if (response.error.status == '404') {
                    messageBox("info", "The page could not be found" + response.error)
                }
                else if (response.status == '429') {
                    messageBox("error", "Error: We did perform to many requests to the CORS server");
                    cuteAlert({
                        type: "question",
                        title: "Error 429 to manay requests",
                        message: "We have performed to many requests, it is necessary to refresh the window<br>Do you want to refresh?",
                        confirmText: "Confirm",
                        cancelText: "Cancel",
                        myWindow: currWindow
                    }).then(async (e) => {
                        if (e == ("confirm")) {
                            location.reload()
                        }
                    });
                }
                else {
                    //console.debug("status:", response.status) 
                    if (response.error.includes('456')) {
                        messageBox("info", "Quota exceeded<br>The character limit has been reached<br>Or you need to delete the current glossary first!" + response.error)
                    }
                    else {
                        messageBox("info", "We did get a result of the request<br>" + response.error)
                    }
                    console.debug("result:", response)
                }
                
            }
            else {
                messageBox("info", "We did not get a result of the request<br>" + "response is undefined!")
            }
        }
    }) 
}


async function load_glossary(glossary, apikeyDeepl, DeeplFree, language) {
    currWindow = window.self;
    //console.debug("glosss:",glossary)
    var gloss = await prepare_glossary(glossary, language)
    gloss = JSON.stringify(gloss)
    await loadMyGlossary(apikeyDeepl, DeeplFree, gloss);
}

async function show_glossary(apikeyDeepl, DeeplFree, language) {
    console.debug("show_glossary:",DeeplFree)
    currWindow = window.self;
    chrome.runtime.sendMessage({
        action: "fetch_deepl_glossaries",
        apiKey: apikeyDeepl,
        isFree: DeeplFree
    }, (response) => {
       //console.log("Received response:", response); // Debugging step

        if (response && response.success) {
            // console.log("DeepL Glossaries:", response.glossaries);
            var glossaryId = response.glossaries.glossaries
            // var currWindow = window.self;
            //console.debug("all the glossaries:", glossaryId,glossaryId.length)
            if (typeof glossaryId != 'undefined' && glossaryId.length != 0) {
                var gloss = ""
                for (let i = 0, len = glossaryId.length, text = ""; i < len; i++) {
                    gloss += glossaryId[i].glossary_id + "<br>";
                }
                let lastId = glossaryId[glossaryId.length - 1]
                //console.debug("last:",lastId.glossary_id)
                cuteAlert({
                    type: "question",
                    title: "Glossary Id",
                    message: "Glossaries found <br>" + gloss + "<br>Do you want to store this glossary ID?<br>" + lastId.glossary_id,
                    confirmText: "Confirm",
                    cancelText: "Cancel",
                    myWindow: currWindow
                }).then(async (e) => {
                    if (e == ("confirm")) {
                        localStorage.setItem('deeplGlossary', lastId.glossary_id);
                        // We need to check if we have a glossary ID if button is red we need to alter it
                        let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-red`);
                        // console.debug("load:", loadGlossButton)
                        if (loadGlossButton != null) {
                            loadGlossButton.classList.remove("LoadGloss-button-red");
                            loadGlossButton.classList.add("LoadGloss-button-green");
                        }
                        messageBox("info", "Glossary ID: <br>" + lastId.glossary_id + "<br>saved ");
                    } else {
                        messageBox("info", "Glossary ID: <br>" + lastId.glossary_id + "<br>not saved ");
                    }
                    return response
                }).then(data => {
                    //       //console.debug("before delete:", data, data.glossaries)
                    var glossaryId = response.glossaries.glossaries
                    if (glossaryId != 'undefined') {
                        //console.debug("glossaries not undefined")
                        //let lastElement = arry[arry.length - 1];
                        // console.debug("last:", glossaryId[0])
                        var to_delete = glossaryId[0].glossary_id
                        cuteAlert({
                            type: "question",
                            title: "Glossary Id",
                            message: "Do you want to delete this glossary ID?<br>" + to_delete,
                            confirmText: "Confirm",
                            cancelText: "Cancel",
                            myWindow: currWindow
                        }).then(async (e) => {
                            if (e == ("confirm")) {
                                await delete_glossary(apikeyDeepl, DeeplFree, language, to_delete)
                                is_stored = await localStorage.getItem('deeplGlossary')
                                if (is_stored == to_delete) {
                                    await localStorage.setItem('deeplGlossary', "");
                                    let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-green`);
                                    if (loadGlossButton != null) {
                                        loadGlossButton.classList.remove("LoadGloss-button-green");
                                        loadGlossButton.classList.add("LoadGloss-button-red");
                                    }
                                }
                                cuteAlert({
                                    type: "question",
                                    title: "Glossary Id",
                                    message: "Glossary ID below is deleted<br> " + to_delete + "<br>It is necessary to refresh the window<br>Do you want to refresh?",
                                    confirmText: "Confirm",
                                    cancelText: "Cancel",
                                    myWindow: currWindow
                                }).then(async (e) => {
                                    if (e == ("confirm")) {
                                        location.reload()
                                    }
                                });
                            } else {
                                messageBox("info", "Glossary ID: <br>" + to_delete + "<br>not deleted ");
                            }
                        })
                    }
                })
            }
            else {
                messageBox("warning", "No glossaries found!!");
                localStorage.setItem('deeplGlossary', "");
                let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-green`);
                if (loadGlossButton != null) {
                    loadGlossButton.classList.remove("LoadGloss-button-green");
                    loadGlossButton.classList.add("LoadGloss-button-red");
                }
            }

        }
        else {
            console.error("DeepL error:", response);
            if (response.status == 401) {
                messageBox("info", "We did get a result of the request<br>Wong key" + "<br>" + response.error.message + "<br>" + response.status)
            }
        }
    })
}

async function delete_all_glossary(apikeyDeepl,isFree) {
    var myKey = apikeyDeepl
    let DeeplFree = isFree === true || isFree === "true"; // handle boolean or string
    console.debug("delete_all_glossary:",DeeplFree)
    currWindow = window.self;
    chrome.runtime.sendMessage({
        action: "fetch_deepl_glossaries",
        apiKey: apikeyDeepl,
        isFree: DeeplFree
        
    }, (response) => {
        if (response.success) {
            if (response && response.success) {
                var glossaryId = response.glossaries.glossaries
                //console.debug("all the glossaries:", glossaryId,glossaryId.length)
                if (typeof glossaryId != 'undefined' && glossaryId.length != 0) {
                    var gloss = ""
                    for (let i = 0, len = glossaryId.length, text = ""; i < len; i++) {
                        deleteGlossary(myKey, DeeplFree, glossaryId[i].glossary_id)
                    }
                }

                // We need to set the status back
                localStorage.setItem('deeplGlossary', "");
                let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-green`);
                if (loadGlossButton != null) {
                    loadGlossButton.classList.remove("LoadGloss-button-green");
                    loadGlossButton.classList.add("LoadGloss-button-red");
                }
                messageBox("info", "All glossaries deleted!");
            }

        }
        else {
            console.debug("DeepL error:", response.error.message);
            messageBox("error", "We did get a result of the request<br>Wong key" + "<br>" + response.error.message + "<br>" + response.status)
            }
    })
}
function deleteGlossary(apiKey, isFree, glossaryId) {
    chrome.runtime.sendMessage({
        action: "delete_deepl_glossary",
        apiKey: apiKey,
        isFree: isFree,
        glossary_id: glossaryId
    }, (response) => {
        if (response && response.success) {
            console.log(response.message);
        } else {
             messageBox("error", "We did get a result of the request<br>Key does not exist" + "<br>" + response.error.message + "<br>" + response.status)

            console.debug("Error deleting glossary:", response ? response.error : "No response received");
        }
    });
}

async function delete_glossary(apikeyDeepl, DeeplFree, language, glossary_id) {
    deleteGlossary(apikeyDeepl, true, glossary_id);
}


function toUtf8(text) {
    return new TextDecoder("utf-8").decode(new TextEncoder().encode(text))

}

async function prepare_glossary(glossary, language) {
    //console.debug("CP1 input:", Array.isArray(glossary), glossary?.length,
               //   JSON.stringify(glossary?.slice?.(0, 3)));

    const seen = new Set();
    const lines = [];

    for (const raw of glossary) {
        if (typeof raw !== 'string') continue;

        const entry = raw.replace(/\r/g, '');
        const commaPos = entry.indexOf(',');
        if (commaPos === -1) {
            console.debug("skipping entry without comma:", raw);
            continue;
        }

        const source = entry.slice(0, commaPos).trim();
        const target = entry.slice(commaPos + 1).trim();

        if (!source || !target) {
            console.debug("skipping empty source/target:", raw);
            continue;
        }
        if (seen.has(source)) {
            console.debug("skipping duplicate source:", source);
            continue;
        }
        seen.add(source);
        lines.push(`${source},${target}`);
    }

    const glossObj = {
        name: 'WPTF glossary',
        dictionaries: [{
            source_lang: 'en',
            target_lang: language.split(/[-_]/)[0].toLowerCase(),
            entries: lines.join('\n'),
            entries_format: 'csv'
        }]
    };

   // console.debug("CP2 output:", lines.length, "lines, first:",
      //            JSON.stringify(lines.slice(0, 2)));
    return glossObj;
}

function no_cors(deepl) {
    var url = 'https://cors-anywhere.herokuapp.com';
    window.location.href = 'https://cors-anywhere.herokuapp.com';
};