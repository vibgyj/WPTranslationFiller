async function load_glossary(glossary, apikeyDeepl, DeeplFree, language) {
    var gloss = await prepare_glossary(glossary, language)
    gloss = JSON.stringify(gloss)
    let formal = false
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const url = deeplServer + "/v2/glossaries"
    
    let response = await fetch(url, {
        method: "POST",
        accept: "*/*",
        Encoding: "gzip, deflate, br",
        body: gloss,
        headers: {
             'Content-Type' : 'application/json',
             'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
        
    }).then(async response => {      
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        //console.debug("response:", response, response.text,isJson);
            //const isJson = response.headers.get('content-type')
        data = isJson && await response.json();
        console.debug("data:",data)
           //check for error response
         if (response.ok) {
             let result = data.glossary_id
             if (typeof result != 'undefined') {
                 currWindow = window.self;
                 // console.debug("houston we have a result:", result)
                 if (data.message != "Wrong host") {
                     cuteAlert({
                         type: "question",
                         title: "Glossary Id",
                         message: "Do you want to store the glossary ID?<br>" + data.glossary_id,
                         confirmText: "Confirm",
                         cancelText: "Cancel",
                         myWindow: currWindow
                     }).then(async (e) => {
                         if (e == ("confirm")) {
                             let glossId = data.glossary_id
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
                                 messageBox("info", "Glossary ID: <br>" + glossId + "<br>saved ");
                             }

                         } else {
                             messageBox("info", "Glossary ID: <br>" + data.glossary_id + "<br>not saved ");
                         }
                         return Promise.resolve("OK");
                     })
                 }
                 else {
                     messageBox("warning", "Wrong host!");
                     return Promise.resolve("NOK");
                    }
                }
                else {
                 messageBox("warning","There is an error retrieving the glossary ID" + data.message)
                 }
            }
         else {
             messageBox("info","We did not get a result of the request")
                     console.debug("result:",response)
              return Promise.resolve("OK");
           }
        })
       .catch(error => {
           if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                //console.debug("glossary value is not supported")
                errorstate = "Error 400";
            }
            if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                //     alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
         //   else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
        //        errorstate = "Error 456";
        //    }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //alert("Error message: " + error[1]);
                console.debug("Error:", error)
                errorstate = "Error " + error[1];
            }
        });
}

async function show_glossary( apikeyDeepl, DeeplFree, language) {
    console.debug("We are showing")
    let formal = false
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
   // link = deeplServer + "/v2/glossaries?auth_key=" + apikeyDeepl
   // var parrotMockDefinitions = [{
    //    "active": true,
    //    "description": "GET",
    //    "method": "OPTIONS",
    //    "pattern": "/v2/glossaries",
    //    "status": "200",
    //    "type": "JSON",
    //    "response": 'Access-Control-Allow-Origin: *',
    //    "Access-Control-Allow-Methods": 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    //    "Access-Control-Allow-Headers": 'Content-Type, Origin, Accept, Authorization, Content-Length, X-Requested-With',
    //    "delay": "100"
   // }];
  //  window.postMessage({
    //    sender: 'commontranslate',
    //    parrotActive: true,
    //    parrotMockDefinitions
   // }, location.origin);
    // Create a new XMLHttpRequest object
    // Create a new XMLHttpRequest object
  //  var xhr = new XMLHttpRequest();

   
    const req = new Request('https://api.deepl.com/v2/glossaries', {
        headers: {
            method: 'GET',
            'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
    });

    const headers = Object.fromEntries(Array.from(req.headers.entries()));
    // console.debug(" headers:",headers)
  //  myheader = JSON.stringify(headers);
  //  let link = url+ headers
    var url = deeplServer + "/v2/glossaries"
    let response = await fetch(url, { headers })
        .then(async response => {
       // console.debug("responseurl:", response.url)
       // console.debug("responsejson:", response.json)
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        //const isJson = response.headers.get('content-type')
        var data = isJson && await response.json();
        // console.debug("response:", response, response.text);
        //check for error response
        if (response.ok) {
            var glossaryId = data.glossaries
            currWindow = window.self;
           // console.debug("all the glossaries:", glossaryId)
            if (typeof glossaryId != 'undefined' && glossaryId.length != 0) {
                var gloss = ""
                for (let i = 0, len = glossaryId.length, text = ""; i < len; i++) {
                    gloss += glossaryId[i].glossary_id + "<br>";
                    //console.debug("text:", gloss)
                }
                let lastId = glossaryId[glossaryId.length - 1]
                console.debug("last:",lastId.glossary_id)
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
                        console.debug("load:", loadGlossButton)
                        if (loadGlossButton != null) {
                            loadGlossButton.classList.remove("LoadGloss-button-red");
                            loadGlossButton.classList.add("LoadGloss-button-green");
                        }
                        messageBox("info", "Glossary ID: <br>" + lastId.glossary_id + "<br>saved ");
                    } else {
                        messageBox("info", "Glossary ID: <br>" + lastId.glossary_id + "<br>not saved ");
                    }
                   return data
                }).then(data => {
             //       //console.debug("before delete:", data, data.glossaries)
                    var glossaryId = data.glossaries
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
                    else {
                        console.debug("No glossaries found!!")
                        localStorage.setItem('deeplGlossary', "");
                        let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-green`);
                        if (loadGlossButton != null) {
                            loadGlossButton.classList.remove("LoadGloss-button-green");
                            loadGlossButton.classList.add("LoadGloss-button-red");
                        }
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
                messageBox("info", "We did not get a result of the request")
                console.debug("result:", response)
                return Promise.resolve("OK");
            }
      })
      .catch(error => {
            if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                //          console.debug("glossary value is not supported")
                errorstate = "Error 400";
            }
            if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                //     alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
               else if (error[2] == '456') {
            //alert("Error 456 Quota exceeded. The character limit has been reached")
                   errorstate = "Error 456";
                }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //alert("Error message: " + error[1]);
                console.debug("Error:", error)
                errorstate = "Error " + error[1];
            }
        });
}

async function delete_glossary(apikeyDeepl, DeeplFree, language, glossary_id) {
   // console.debug("We are deleting:",glossary_id)
    //console.debug(apikeyDeepl, DeeplFree, language, glossary_id)

    let formal = false
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const url = deeplServer + "/v2/glossaries/" + glossary_id
    console.debug("url:", url)
    let response = await fetch(url, {
        method: "DELETE",
        headers: {
            'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
    }).then(async response => {
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        //const isJson = response.headers.get('content-type')
        data = isJson && await response.json();
        //console.debug("response:", data, response, response.text);
        //check for error response
        if (response.ok) {
            let glossaryId = data
            currWindow = window.self;
            console.debug("glossarie deleted:", glossary_id)
            messageBox("info", "Glossary ID: <br>" + glossary_id + "<br>deleted ");
            return Promise.resolve("OK");
        }
        else {
            console.debug("wrong response:",response)
        }
    })
        .catch(error => {
            console.debug("error:",error)
            if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                //          console.debug("glossary value is not supported")
                errorstate = "Error 400";
            }
            if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                //     alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            //   else if (error[2] == '456') {
            //alert("Error 456 Quota exceeded. The character limit has been reached")
            //        errorstate = "Error 456";
            //    }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
            }
            else {
                //alert("Error message: " + error[1]);
                console.debug("Error:", error)
                errorstate = "Error " + error[1];
            }
        });
}

async function prepare_glossary(glossary, language) {
    // this function builds the string to be sent to deepL
    // glosObj is the string object to combine all necessary parts of the request
    var glossObj = {};
    glossObj["name"] = 'WPTF glossary';
    glossObj["source_lang"] = "en";
    glossObj["target_lang"] = language;
    var gloss="";
    var glossentry;
    for (let i = 0, len = glossary.length; i < len; i++) {
        if (i < len - 1) {
            glossentry = glossary[i] + '\n'
        }
        else {
            glossentry = glossary[i]
        }
        if (typeof glossentry != 'undefined') {
            gloss+= glossentry;
        }
    }
    glossObj["entries"] = gloss;
    glossObj["entries_format"] = 'csv';
    // We are now complete, so return the object
    let new_glossary = glossObj
    return new_glossary
}