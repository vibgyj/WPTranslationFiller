async function load_glossary(glossary, apikeyDeepl, DeeplFree, language) {
    console.debug("We are loading", glossary)
    //data = data.split(",")

    mydata = {
        "name": "My Glossary",
        "source_lang": "en",
        "target_lang": "nl",
        "source_lang": "en",
        "target_lang": "nl",
        "entries": "websites,sites\n",
        "entries_format": "csv"
    }

    data = {
        'text': 'Hello World',
    }
    console.debug("data:", mydata)
    let formal = false
    //  let deeplServer = DeeplFree == true ? "https://api-free.deepl.com" : "https://api.deepl.com";
    // if (language == "RO") {
    //     link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=0&tag_handling=xml&ignore_tags=x&formality=default&split_sentences=nonewlines"
    // }
    //  else {
    //     if (!formal) {
    //         link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&tag_handling=xml&ignore_tags=x&formality=less&split_sentences=nonewlines&glossary_id=WP-Glossary"
    //     }
    //     else {
    //        link = deeplServer + "/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&tag_handling=xml&ignore_tags=x&formality=more&split_sentences=nonewlines"
    //    }
    // }
    apikeyDeepl = 'eb6783df-3b98-3f24-4748-7aa2bd2ea91e'
    deeplServer = 'https://api.deepl.com/v2/glossaries'
   // deeplServer = 'https://api.deepl.com/v2/glossary-language-pairs'

    var mylink = deeplServer
    console.debug("deepl link:", mylink)

    const response = fetch('https://api.deepl.com/v2/glossaries', {
        method: "POST",
        headers: {
            'Accept': "*/*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Origin": "*",
            'Authorization': 'DeepL-Auth-Key eb6783df-3b98-3f24-4748-7aa2bd2ea91e'
        },
       

        

       // method: "GET",
      //  credentials: 'include',
      ////  headers: {
         //   'Authorization': 'DeepL-Auth-Key eb6783df-3b98-3f24-4748-7aa2bd2ea91e'
            //'Authorization': 'Basic ' + btoa(this.state.deviceSettings.userName + ":" + this.state.deviceSettings.password),
      //  }
    })  .then(response => {
          //  const isJson = response.headers.get('content-type')?.includes('application/json');
          //  data = isJson && response.json();
   
           console.debug("response:", response, response.ok);
           //check for error response
           if (response.ok) {
                console.debug("houston we have a result:", response)
                return Promise.resolve("OK");
            }
            else {
                //      response.WriteHeader(http.StatusOK)
                //We do have a result so process it
                     console.debug("result:",response)
                return Promise.resolve("NOK");
           }
        })
        .catch(error => {
           if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
                console.debug("glossary value is not supported")
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


   // const response = fetch(mylink, {
    //    method: 'POST',
   //     mode: 'no-cors',
   //     headers: {
    //        "Authentication": "DeepL-Auth-Key eb6783df-3b98-3f24-4748-7aa2bd2ea91e",
   //         'Access-Control-Allow-Origin': '*',
    //        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    //        'Access-Control-Allow-Headers': 'Content-Type',
    //        "content-type": "text/html"
     //   },
        
    //    })  
    //    .then(response => {
            //const isJson = response.headers.get('content-type')?.includes('application/json');
            // data = isJson && response.json();
    //
     //       console.debug("response:", response, response.ok);
      //      // check for error response
     //       if (response.ok) {
        //        console.debug("houston we have a result:", response)
       //         return Promise.resolve("OK");
       //     }
       //     else {
                //      response.WriteHeader(http.StatusOK)
                //We do have a result so process it
                //     console.debug("result:",data)
              //  return Promise.resolve("NOK");
         //   }
      //  })
      //  .catch(error => {
            //if (error[2] == "400") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
           //     console.debug("glossary value is not supported")
           //     errorstate = "Error 400";
          //  }
           // if (error[2] == "403") {
                //alert("Error 403 Authorization failed. Please supply a valid auth_key parameter.")
           //     errorstate = "Error 403";
           // }
           // else if (error[2] == '404') {
                //     alert("Error 404 The requested resource could not be found.")
            //    errorstate = "Error 404";
          //  }
           // else if (error[2] == '456') {
                //alert("Error 456 Quota exceeded. The character limit has been reached")
           //     errorstate = "Error 456";
          //  }
            // 08-09-2022 PSS improved response when no reaction comes from DeepL issue #243
         //   else if (error == 'TypeError: Failed to fetch') {
         //       errorstate = '<br>We did not get an answer from Deepl<br>Check your internet connection';
        //    }
        //    else {
                //alert("Error message: " + error[1]);
         //       console.debug("Error:", error)
         //       errorstate = "Error " + error[1];
         //   }
       // });
    messageBox("info", "Upload glossary to DeepL ready");

}