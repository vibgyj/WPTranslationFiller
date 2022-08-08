res=initStoragePersistence();

//async function initDb() {
 ///   var isDbCreated = await jsstoreCon.initDb(getDbSchema());
  //  if (isDbCreated) {
   //     console.log('db created');
   // }
   // else {
    //    console.log('db opened');
   // }
//}

// Part of the solution issue #204
async function getTM(myLi, row, record, destlang, original, replaceVerb, transtype) {
    var timeout = 0;
    var timer = 0;
    var preview;
    var result = "";
    var translatedText;
    convertToLower = false;

    translatedText = myLi;
    //console.debug("myLI:", myLi, translatedText)
    if (translatedText != 'No suggestions') {
        translatedText = postProcessTranslation(original, translatedText, replaceVerb, "", "deepl", false);
    }

    let textareaElem = record.querySelector("textarea.foreign-text");
    textareaElem.innerText = translatedText;
    textareaElem.value = translatedText;
    if (typeof current != "undefined") {
        current.innerText = "transFill";
        current.value = "transFill";
    }
    // 23-09-2021 PSS if the status is not changed then sometimes the record comes back into the translation list issue #145
    select = document.querySelector(`#editor-${row} div.editor-panel__right div.panel-content`);
    //select = next_editor.getElementsByClassName("meta");
    var status = select.querySelector("dt").nextElementSibling;
    status.innerText = "transFill";
    status.value = "transFill";
    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
    if (currec != null) {
       var current = currec.querySelector("span.panel-header__bubble");
    }
   
    // PSS 10-05-2021 added populating the preview field issue #68
    // Fetch the first field Singular
    let previewElem = document.querySelector("#preview-" + row + " li:nth-of-type(1) span.translation-text");
    if (previewElem != null) {
       // we found a plural obviously, we do not fetch TM for that
       if (preview != null) {
           preview.style.display = "none";
       }
    }
    else {
         let preview = document.querySelector("#preview-" + row + " td.translation");
         let spanmissing = preview.querySelector(" span.missing");
         if (spanmissing != null) {
             preview.innerText = translatedText;
             if (translatedText != 'No suggestions') {
                 current.innerText = "transFill";
                 current.value = "transFill";
                 status.value = "untranslated";
             }
             var element1 = document.createElement("div");
             element1.setAttribute("class", "trans_local_div");
             element1.setAttribute("id", "trans_local_div");
             element1.appendChild(document.createTextNode("TM"));
             preview.appendChild(element1);

            // we need to set the checkbox as marked
            rowchecked = preview.querySelector("td input");
            if (rowchecked != null) {
                if (!rowchecked.checked) {
                    if (transtype == 'single') {
                       //console.debug("single:", transtype)
                       rowchecked.checked = true;
                    }
                    else {
                        //console.debug("plural:", transtype)
                        //console.debug("TM not found plural!");
                        if (preview != null) {
                            preview.style.display = "none";
                        }
                    }
                }
             }
             // 04-08-2022 PSS translation with TM does not set the status of the record to status - waiting #229
             // we need to change the state of the record
             var previewClass = document.querySelector(`#preview-${row}`);
             previewClass.classList.replace("no-translations", "has-translations");
             previewClass.classList.replace("untranslated", "status-waiting");
             previewClass.classList.add("wptf-translated");
         }
         else {
             // if it is as single with local then we need also update the preview
             preview.innerText = translatedText;
             current.innerText = "transFill";
             current.value = "transFill";
             var element1 = document.createElement("div");
             element1.setAttribute("class", "trans_local_div");
             element1.setAttribute("id", "trans_local_div");
             element1.appendChild(document.createTextNode("TM"));
             preview.appendChild(element1);
             
             // we need to set the checkbox as marked
             preview = document.querySelector(`#preview-${row}`);
             rowchecked = preview.querySelector("td input");
             if (rowchecked != null) {
                if (!rowchecked.checked) {
                   rowchecked.checked = true;
                }
             }
             // 04-08-2022 PSS translation with TM does not set the status of the record to status - waiting #229
             // we need to change the state of the record 
             preview.classList.replace("no-translations", "has-translations");
             preview.classList.replace("untranslated", "status-waiting");
             preview.classList.add("wptf-translated");
         }
    }
    if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
        document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = "visible";
    }
    else {
        // console.debug("TM not found single!");
        // console.debug("preview:", preview);
        if (preview != null) {
            preview.style.display = "none";
            rowchecked = preview.querySelector("td input");
            if (rowchecked != null) {
                //if (!rowchecked.checked) {
                rowchecked.checked = false;
                //  }
            }
        }
    }
    //console.debug("Before return validate:",translatedText)
     if (translatedText != 'No suggestions') {
        validateEntry(destlang, textareaElem, "", "", row,"");
    }
    return myLi;
}

function getDbSchema() {
    var table = {
        name: "Translation",
        columns: {
            id: {
                autoIncrement: true,
                primaryKey: true
            },
            source: {
                dataType: "string",
                notNull: true,
                primaryKey: true
            },
            translation: {
                dataType: "string",
                default: "translation"
            },
            country: {
                dataType: "string",
                notNull: true
            }
        }
    };

    var db = {
        name: "My-Trans",
        tables: [table]
    }
    return db;
}

async function addTransDb(orig, trans, cntry) {
    var transl = { source: orig, translation: trans, country: cntry };
    var myWindow = window.self;
    // 05-06-2021 PSS fixed a problem with wrong var names
    count = await countTransline(orig,cntry);
    if (count == "0") {
        reslt = "Inserted";
        try {
           var noOfDataInserted = await jsstoreCon.insert({
            into: "Translation",
            values: [transl]
           });
        if (noOfDataInserted == 1) {
          reslt ="Inserted";
        }
        else if (noOfDataInserted != 1) {
            messageBox("error", "Record not added!!");
            reslt="Record not added";
        }
        } catch (ex) {
            messageBox("error", "Error: " + ex.message);
       }
    }
    else{
        res =updateTransDb(orig,trans,cntry);
        reslt="updated";
    }
  return reslt;
}

async function updateTransDb(orig,trans,cntry) {
    var transl = {orig,trans,cntry};
    try {
        var noOfDataUpdated = await jsstoreCon.update({
            in: "Translation",
            set: {
                country: transl.cntry,
                translation: transl.trans
            },
            where: {
                country: transl.cntry,
                source: transl.orig
            }
        });
    } catch (ex) {
        messageBox("error", "Error: " + ex.message + "record: " + orig);
    }
}

async function countTransline(orig,cntry){
const results = await jsstoreCon.count({
    from: "Translation",
    where: {
        country: cntry,
        source: orig
    }
})
return results;
}

async function findTransline(orig,cntry){
    var trans = "notFound";
    const results = await jsstoreCon.select({
    from: "Translation",
        where: {
        country: cntry,
        source: orig
    }
}).then((value) => {
    if (value !=""){
     trans= convPromise(value);
    }
    else {
        trans= "notFound";
    }
  });
return trans;
}

async function convPromise(trans){
    res= trans[0]["translation"];
    if (typeof res== "undefined"){
       res="notFound";
    }
    return res;
}

async function addTransline(rowId){
    // 07-05-2021 PSS added language read from config to store in database
    var res = "";
    var row = "";
    chrome.storage.sync.get(["destlang"], function (data) {
    language = data.destlang;
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    var orig = e.querySelector("span.original-raw").innerText;
    let textareaElem = e.querySelector("textarea.foreign-text");
    var addTrans = textareaElem.value;
        if (addTrans === "") {
            messageBox("error", "No translation to store!");
    }
    else {
        res = addTransDb(orig, addTrans, language);
        let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
        let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original`);
        // 21-06-2021 PSS fixed the problem with no storing of plurals into the datase issue #87
        if (checkplural != null) {
            let g = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
            var current = g.querySelector("span.panel-header__bubble");
            // 31-10-2021 PSS added sanitizing the values before storing
            let plural = DOMPurify.sanitize(checkplural.innerText);
            // 08-07-2021 PSS fixed a problem where the plural was not stored in the database issue #103
            if (current != null) {
                row = rowId.split("-")[0];
                textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                // 31-10-2021 PSS added sanitizing the values before storing
                addTrans = DOMPurify.sanitize(textareaElem1.value);
                res = addTransDb(plural, addTrans, language);
                //textareaElem1.innerText = translatedText;
                //textareaElem1.value = translatedText;
                //console.debug('existing plural text:', translatedText);
            }
            else {
                textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                // 31-10-2021 PSS added sanitizing the values before storing
                addTrans = DOMPurify.sanitize(textareaElem1.value);
                res = addTransDb(plural, addTrans, language);
                }
            }
            messageBox("info", "addTransline record added/updated to database");
        }
    });
    return;
}

async function dbExport(destlang) {
  var export_file = "";
  var arrayData = [];
  // 09-07-2021 PSS altered the separator issue #104
  var delimiter = "|";
  var arrayHeader = ["original", "translation", "country"];
  var header = arrayHeader.join(delimiter) + "\n";
    var csv = header;
    // 01-02-2022 altered the messagebox into a toast so you do not need to dismiss it issue #181
    toastbox("info", "Export database in progress" + "<br>" + "Wait for saving the file!", "2500", "Saving");
    //messageBox("info", "Export database in progress" + "<br>" + "Wait for saving the file!");
  const trans = await jsstoreCon.select({
    from: "Translation"
  });
    export_file = "export_database_" + destlang + ".csv";
    i = 1;
    trans.forEach(function (trans) {
    arrayData[i] = { original : trans.source, translation : trans.translation, country : trans.country};
    i++;
    });
       arrayData.forEach( obj => {
           var row = [];
           for (key in obj) {
               if (obj.hasOwnProperty(key)) {
                   row.push(obj[key]);
               }
           }
           csv += row.join(delimiter)+"\n";
       });
       // 09-07-2021 The export of the database does convert characters #105
       var csvData = new Blob([csv], { type: "text/csv;charset=utf-8" });
       var csvUrl = URL.createObjectURL(csvData);

       var hiddenElement = document.createElement("a");
       hiddenElement.href = csvUrl;
       hiddenElement.target = "_blank";
       hiddenElement.download = export_file;
       hiddenElement.click();
       let exportButton = document.querySelector(".paging a.export_translation-button");
    exportButton.className += " ready";
    //close_toast();
    messageBox("info", "Export database done amount of records exported: "+i);
      
}

async function tryPersistWithoutPromtingUser() {
  if (!navigator.storage || !navigator.storage.persisted) {
    return "never";
  }
  let persisted = await navigator.storage.persisted();
  if (persisted) {
    return "persisted";
  }
  if (!navigator.permissions || !navigator.permissions.query) {
    return "prompt"; // It MAY be successful to prompt. Don't know.
  }
  const permission = await navigator.permissions.query({
    name: "persistent-storage"
  });
  if (permission.state === "granted") {
    persisted = await navigator.storage.persist();
    if (persisted) {
      return "persisted";
    } else {
      throw new Error("Failed to persist");
    }
  }
  if (permission.state === "prompt") {
    return "prompt";
  }
  return "never";
}

async function initStoragePersistence() {
  const persist = await tryPersistWithoutPromtingUser();
  switch (persist) {
    case "never":
      //console.debug("Not possible to persist storage");
      break;
    case "persisted":
     // console.debug("Successfully persisted storage silently");
      break;
    case "prompt":
     // console.debug("Not persisted, but we may prompt user when we want to.");
      break;
  }
}

// This function copies the current line from the editor into the local database
function addtranslateEntryClicked(event) {
    if (event != undefined) {
        event.preventDefault();
        let rowId = event.target.id.split("-")[1];
        // console.log("addtranslateEntry clicked rowId", rowId);
        let myrowId = event.target.id.split("-")[2];
        //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
        // So that needs to be added to the base rowId to find it
        if (myrowId !== undefined && myrowId != "addtranslation") {
            newrowId = rowId.concat("-", myrowId);
            rowId = newrowId;
        }
        addTransline(rowId);
    }
}
async function resetDB() {
    var DBOpenRequest = window.indexedDB.open("My-Trans");
      DBOpenRequest.onsuccess = function (event) {
        //console.debug("Database initialised");

        // store the result of opening the database in the db variable.
        // This is used a lot below
        dbase = DBOpenRequest.result;

        // Clear all the data form the object store
        clearData();
    };

}

function clearData() {
    // open a read/write db transaction, ready for clearing the data
    event.preventDefault();
    currWindow = window.self;
    cuteAlert({
        type: "question",
        title: "Delete data",
        message: "Are you sure you want to delete<br> the contents of the local database?",
        confirmText: "Confirm",
        cancelText: "Cancel",
        myWindow: currWindow
    }).then((e) => {
        if (e == ("confirm")) {
            var transaction = dbase.transaction(["Translation"], "readwrite");
            // report on the success of the transaction completing, when everything is done
            transaction.oncomplete = function (event) {
                console.debug("Transaction completed.");
            };

            transaction.onerror = function (event) {
                messageBox("error", "Transaction not opened due to error: " + transaction.error);
            };

            // create an object store on the transaction
            var objectStore = transaction.objectStore("Translation");

            // Make a request to clear all the data out of the object store
            var objectStoreRequest = objectStore.clear();

            objectStoreRequest.onsuccess = function (event) {
                // report the success of our request
                // alert("Database reset done");
                messageBox("info", "Database reset done restart add-on!");
            };
        } else {
            messageBox("info", "Database reset cancelled");
           
        }
    })
}

function deleteDB() {
    event.preventDefault();
    currWindow = window.self;


    cuteAlert({
        type: "question",
        title: "Delete database",
        message: "Are you sure you want to delete the local database?",
        confirmText: "Confirm",
        cancelText: "Cancel",
        myWindow: currWindow
    }).then((e) => {
        if (e == ("confirm")) {
            var DBDeleteRequest = window.indexedDB.deleteDatabase("My-Trans");
            var DBDeleteRequest = window.indexedDB.deleteDatabase("KeyStore");
            DBDeleteRequest.onerror = function (event) {
                console.log("Error deleting database My-Trans.");
            };

            DBDeleteRequest.onsuccess = function (event) {
                console.log("Database My-Trans deleted successfully");

                console.log(event.result); // should be undefined
            };

            DBDeleteRequest.onerror = function (event) {
                console.log("Error deleting database KeyStore.");
            };

            DBDeleteRequest.onsuccess = function (event) {
                console.log("Database KeyStore deleted successfully");

                console.log(event.result); // should be undefined
            };
            messageBox("info", "Database deletion done<br> My-Trans and KeyStore<br>Restart the add-on and window!");
        } else {
            messageBox("info", "Database deletion cancelled");

        }
    })
}