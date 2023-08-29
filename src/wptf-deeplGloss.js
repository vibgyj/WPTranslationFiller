async function load_glossary(glossary, apikeyDeepl, DeeplFree, language) {
    var gloss = await prepare_glossary(glossary, language)
    gloss = JSON.stringify(gloss)
    let formal = false
    let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const url = deeplServer + "/v2/glossaries"
    let response = await fetch(url, {
        method: "POST",
       // body: JSON.stringify({ "name": "My Glossary", "source_lang": "en", "target_lang": "nl", "entries": "Aria,Gebied\naria,gebied\nHeader,Header\nheader,header\nLayouts,Lay-outs\nlayout,lay-out\nWebsite,Site", "entries_format": "csv" }),
       // body :JSON.stringify({ "name": "My Glossary", "source_lang": "en", "target_lang": "nl", "entries": "Headings,kopteksten\nheadings,kopteksten\nHeading,koptekst\nheading,koptekst\nHeader,header\nheader,header\nLayouts,Lay-outs\nLayout,lay-out\nlayout,lay-out\nWebsites,sites\nwebsites,sites\nWebsite,site\nwebsite,site", "entries_format": "csv" }),
        body: gloss,
        headers: {
             'Content-Type' : 'application/json',
             'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
        
    }).then(async response => {      
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        console.debug("response:", response, response.text,isJson);
            //const isJson = response.headers.get('content-type')
        data = isJson && await response.json();
       // console.debug("data:",data)
           //check for error response
         if (response.ok) {
             let result = data.glossary_id
             currWindow = window.self;
            // console.debug("houston we have a result:", result)
             if (data.message != "Wrong host") {
                 cuteAlert({
                     type: "question",
                     title: "Glossary Id",
                     message: "Do you want to store the glossary ID?<br>"+data.glossary_id,
                     confirmText: "Confirm",
                     cancelText: "Cancel",
                     myWindow: currWindow
                 }).then(async (e) => {
                     if (e == ("confirm")) {
                         let glossId = data.glossary_id
                         localStorage.setItem('deeplGlossary', glossId);
                         messageBox("info", "Glossary ID: <br>" + glossId + "<br>saved ");

                     } else {
                          messageBox("info", "Glossary ID: <br>" + data.glossary_id +"<br>not saved ");
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
    link = deeplServer + "/v2/glossaries?auth_key=" + apikeyDeepl
    const url = deeplServer + "/v2/glossaries"
    let response = await fetch(url, {
        headers: {
            'Authorization': 'DeepL-Auth-Key '+ apikeyDeepl
        }
    }).then(async response => {
        console.debug("responseurl:",response.url)
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        //const isJson = response.headers.get('content-type')
        var data = isJson && await response.json();

        //console.debug("response:", response, response.text);
        //check for error response
        if (response.ok) {
            var glossaryId = data.glossaries
            currWindow = window.self;
            //console.debug("all the glossaries:", glossaryId, glossaryId.length)
            if (glossaryId.length != 0) {
                var gloss = ""
                for (let i = 0, len = glossaryId.length, text = ""; i < len; i++) {
                    gloss += glossaryId[i].glossary_id + "<br>";
                    //console.debug("text:", gloss)
                }
                cuteAlert({
                    type: "question",
                    title: "Glossary Id",
                    message: "Glossaries found <br>" + gloss + "<br>Do you want to store this glossary ID?<br>" + glossaryId[0].glossary_id,
                    confirmText: "Confirm",
                    cancelText: "Cancel",
                    myWindow: currWindow
                }).then(async (e) => {
                    if (e == ("confirm")) {
                        localStorage.setItem('deeplGlossary', glossaryId[0].glossary_id);
                        messageBox("info", "Glossary ID: <br>" + glossaryId[0].glossary_id + "<br>saved ");
                    } else {
                        messageBox("info", "Glossary ID: <br>" + glossaryId[0].glossary_id + "<br>not saved ");
                    }
                    return data
                }).then(data => {
                    //console.debug("before delete:", data, data.glossaries)
                    var glossaryId = data.glossaries
                    if (glossaryId != 'undefined') {
                        //console.debug("glossaries not undefined")
                        if (glossaryId[1] != null) {
                            var to_delete = glossaryId[1].glossary_id
                        }
                        else {
                            to_delete = glossaryId[0].glossary_id
                        }
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
                                messageBox("info", "Glossary ID: <br>" + to_delete + "<br>deleted ");
                            } else {
                                messageBox("info", "Glossary ID: <br>" + to_delete + "<br>not deleted ");
                            }
                        })
                    }
                    else {
                        console.debug("No glossaries found!!")
                    }
                })
            }
            else {
                messageBox("warning", "No glossaries found!!");
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
            console.debug("glossarie deleted:")
            messageBox("info", "Glossary ID: <br>" + glossary_id + "<br>deleted ");
            return Promise.resolve("OK");
        }
        else {
            console.debug("wrong response:",response)
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