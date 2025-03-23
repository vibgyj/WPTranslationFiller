function loadMyGlossary(apiKey, DeeplFree, gloss) {
    //console.debug("we start loading", apiKey, DeeplFree, gloss)
    chrome.runtime.sendMessage({
        action: "load_deepl_glossary",
        apiKey: apiKey,
        isFree: DeeplFree,
        glossaryData: gloss,
    }, (response) => {
        //console.debug("Received response:", response); // Debugging step

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
                        message: "Do you want to store the glossary ID?<br>" + result,
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
                                messageBox("info", "Glossary ID: <br>" + glossId + "<br>saved ");
                            }

                        } else {
                            messageBox("info", "Glossary ID: <br>" + result + "<br>not saved ");
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
                else if (error.status == "403") {
                    messageBox("info", "Authorization error<br>" + response.error + "<br> Check your licence")
                }
                else if (error.status == '404') {
                    messageBox("info", "The page could not be found" + response.error)
                }
                else if (error.status == '429') {
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
                    messageBox("info", "We did not get a result of the request<br>" + response.error)
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


async function oldload_glossary(glossary, apikeyDeepl, DeeplFree, language) {
    var gloss = await prepare_glossary(glossary, language)
    gloss = JSON.stringify(gloss)
    let formal = false
    //let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";

    let deeplServer = DeeplFree == true ? "https://cors-anywhere.herokuapp.com/https://api-free.deepl.com" : "https://cors-anywhere.herokuapp.com/https://api.deepl.com";
    const url = deeplServer + "/v2/glossaries"
    //console.debug("key:",apikeyDeepl)
    let response = await fetch(url, {
        method: "POST",
        accept: "*/*",
        Encoding: "gzip, deflate, br",
        body: gloss,
        headers: {
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'X-Requested-With': 'XMLHttpRequest',
             'Content-Type' : 'application/json',
             'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
        
    }).then(async response => {      
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        //console.debug("response:", response, response.text,isJson);
            //const isJson = response.headers.get('content-type')
        data = isJson && await response.json();
        //console.debug("data:",data,response.ok)
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
                 messageBox("warning","There is an error retrieving the glossary ID " + data.message +"<br>"+data.detail)
                 }
         }
         else {
              messageBox("info","We did not get a result of the request<br>",response)
              console.debug("result:",response)
              return Promise.reject(response);
          }
        })
        .catch(error => {
           //console.debug("error:",error)
           if (error.status == "400") {
                //alert("Error 400 Authorization failed. Please supply a valid auth_key parameter.")
                console.debug("glossary value is not supported error 400")
                errorstate = "Error 400";
           }
           if (error.status == "401") {
               //alert("Error 400 Authorization failed. Please supply a valid auth_key parameter.")
               console.debug("Error 401 unautorised")
               errorstate = "Error 401";
           }
            if (error.status == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                console.debug("Error 403 Authorization failed")
                errorstate = "Error 403";
            }
            else if (error.status == '404') {
                //     alert("Error 404 The requested resource could not be found.")
                console.debug("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error.status == '429') {
                console.debug("Error 429 to many requests")
                errorstate = "Error 429";
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
            else if (error.status == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
                console.debug("Error 456 Quota exceeded. The character limit has been reached")
                errorstate = "Error 456";
            }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                //console.debug("Typerror:", error)
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
                messageBox("error", "Error: We did not get an answer from Deepl<br>Check your internet connection");
            }
            else {
                //alert("Error message: " + error[1]);
                messageBox("info", "We did not get a proper result of the request<br>" + error.status + "  "+ error.statusText)
                console.debug("Error:", error)
                errorstate = "Error 401";
            }
        });
}


async function show_glossary(apikeyDeepl, DeeplFree, language) {
    currWindow = window.self;
    chrome.runtime.sendMessage({
        action: "fetch_deepl_glossaries",
        apiKey: apikeyDeepl
    }, (response) => {
       //console.log("Received response:", response); // Debugging step

        if (response && response.success) {
           // console.log("DeepL Glossaries:", response.glossaries);
            var glossaryId =  response.glossaries.glossaries
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
    })
}

async function oldshow_glossary(apikeyDeepl, DeeplFree, language) {
   // console.debug("We are showing")
    //let res = no_cors('https://api-free.deepl.com')
   // console.debug("no_cors res:",res)
    let formal = false
    var currWindow = window.self;
   // let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";

    let deeplServer = DeeplFree == true ? "https://cors-anywhere.herokuapp.com/https://api-free.deepl.com" : "https://cors-anywhere.herokuapp.com/https://api.deepl.com";
    url = deeplServer + "/v2/glossaries/"
    const req = new Request(url, {
        method: "GET",
        headers: {
            'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
    });
    var url = deeplServer + "/v2/glossaries"
    let response = await fetch(url, {
        method: "Get",
        headers: {
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
            'Authorization': 'DeepL-Auth-Key ' + apikeyDeepl
        }
    })
        .then(async response => {
       // console.debug("responseurl:", response.url)
       // console.debug("responsejson:", response.json)
        const isJson = response.headers.get('content-type')?.includes('application/json; charset=utf-8');
        //const isJson = response.headers.get('content-type')
        var data = isJson && await response.json();
        //console.debug("response:", response, response.text,data);
        //check for error response
        if (response.ok && typeof data != "undefined") {
            var glossaryId = data.glossaries
           // var currWindow = window.self;
           // console.debug("all the glossaries:", glossaryId)
            if (typeof glossaryId != 'undefined' && glossaryId.length != 0) {
                var gloss = ""
                for (let i = 0, len = glossaryId.length, text = ""; i < len; i++) {
                    gloss += glossaryId[i].glossary_id + "<br>";
                    //console.debug("text:", gloss)
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
                        //console.debug("No glossaries found!!")
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
                //messageBox("info", "We did not get a result of the request")
               // console.debug("result:", response)
            cuteAlert({
                type: "question",
                title: "No response",
                message: "We did not get a response from DeepL!"+"<br>"+ "This could be due to Cors error <br>Do you want deactivate Cors?" +"<br>"+ "if deactivate selected then use Previous to go back",
                confirmText: "Confirm",
                cancelText: "Cancel",
                myWindow: currWindow
            }).then(async (e) => {
                if (e == ("confirm")) {
                    messageBox("info", "Click on the button in the new window! <br>");
                    await no_cors()
                } else {
                    messageBox("info", "Cors not deactivated");
                }
            })
                return Promise.resolve("OK");
            }
      })
        .catch(error => {
            console.debug("error:",error,error[2])
            if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                //          console.debug("glossary value is not supported")
                errorstate = "Error 400";
            }
            if (error[2] == "403") {
                alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                errorstate = "Error 403";
            }
            else if (error[2] == '404') {
                //     alert("Error 404 The requested resource could not be found.")
                errorstate = "Error 404";
            }
            else if (error[2] == 429) {
                errorstate = "Error 429";
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
            else if (error[2] == '456') {
            //alert("Error 456 Quota exceeded. The character limit has been reached")
                   errorstate = "Error 456";
                }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
            else if (error == 'TypeError: Failed to fetch') {
                //console.debug("Typerror:",error)
                errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
                messageBox("error", "Error: We did not get an answer from Deepl<br>Check your internet connection");
            }
            else {
                //alert("Error message: " + error[1]);
                console.debug("Error:", error)
                errorstate = "Error " + error[1];
                messageBox("error", "Error: ",error);
            }
        });
}

async function delete_all_glossary(apikeyDeepl, DeeplFree) {
    var myKey=apikeyDeepl
    currWindow = window.self;
    chrome.runtime.sendMessage({
        action: "fetch_deepl_glossaries",
        apiKey: apikeyDeepl
    }, (response) => {
        if (response && response.success) {
            var glossaryId = response.glossaries.glossaries
            //console.debug("all the glossaries:", glossaryId,glossaryId.length)
            if (typeof glossaryId != 'undefined' && glossaryId.length != 0) {
                var gloss = ""
                for (let i = 0, len = glossaryId.length, text = ""; i < len; i++) {
                    deleteGlossary(myKey, DeeplFree, glossaryId[i].glossary_id)
                }
            }
        }
        // We need to set the status back
        localStorage.setItem('deeplGlossary', "");
        let loadGlossButton = document.querySelector(`.paging .LoadGloss-button-green`);
        if (loadGlossButton != null) {
            loadGlossButton.classList.remove("LoadGloss-button-green");
            loadGlossButton.classList.add("LoadGloss-button-red");
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
            console.error("Error deleting glossary:", response ? response.error : "No response received");
        }
    });
}

async function delete_glossary(apikeyDeepl, DeeplFree, language, glossary_id) {
    deleteGlossary(apikeyDeepl, true, glossary_id);
}

async function olddelete_glossary(apikeyDeepl, DeeplFree, language, glossary_id) {
   // console.debug("We are deleting:",glossary_id)
    //console.debug(apikeyDeepl, DeeplFree, language, glossary_id)

    let formal = false
    //let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";

    let deeplServer = DeeplFree == true ? "https://cors-anywhere.herokuapp.com/https://api-free.deepl.com" : "https://cors-anywhere.herokuapp.com/https://api.deepl.com";
    const url = deeplServer + "/v2/glossaries/" + glossary_id
    //console.debug("url:", url)
    let response = await fetch(url, {
        method: "DELETE",
        headers: {
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'X-Requested-With': 'XMLHttpRequest',
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
            //console.debug("glossarie deleted:", glossary_id)
            messageBox("info", "Glossary ID: <br>" + glossary_id + "<br>deleted ");
            return Promise.resolve("OK");
        }
        else {
            console.debug("wrong response:",response)
        }
    })
        .catch(error => {
           // console.debug("error:",error)
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

function toUtf8(text) {
    return new TextDecoder("utf-8").decode(new TextEncoder().encode(text))

}

async function prepare_glossary(glossary, language) {
    // this function builds the string to be sent to deepL
    // glosObj is the string object to combine all necessary parts of the request
    //console.debug("glossary,language:"glossary,language)
    var glossObj = {};
    glossObj["name"] = 'WPTF glossary';
    glossObj["source_lang"] = "EN";
    glossObj["target_lang"] = language.toUpperCase();
    var gloss="";
    var glossentry;
    for (let i = 0, len = glossary.length; i < len; i++) {
        if (i < len - 1) {
            if (!glossary[i].endsWith(" ")) {
                glossentry = toUtf8(glossary[i] + '\n')
            }
            else {
                console.debug("glossary ends with blank:", glossary[i])
                glossentry = glossary[i].trim() + '\n';
                glossentry = toUtf8(glossentry)
            }
        }
        else {
            glossentry = glossary[i].trim() + '\n';
            glossentry = toUtf8(glossentry)
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

function no_cors(deepl) {
    var url = 'https://cors-anywhere.herokuapp.com';
    window.location.href = 'https://cors-anywhere.herokuapp.com';
};