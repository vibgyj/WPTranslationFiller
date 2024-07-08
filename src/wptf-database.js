res = initStoragePersistence();

async function openDB(db) {
   // console.debug("NewDB open started");
    const request = indexedDB.open("My-Trans")
    
    request.onupgradeneeded = await function () {
        // The database did not previously exist, so create object stores and indexes.
        const mydb = request.result;
        const transl = mydb.createObjectStore("Translation", {
            keyPath: "id", autoincrement: true });
        const sourceIndex = transl.createIndex("source", "source", { unique: false, enableSearch: true });
        //With improved indexDB it was no longer possible to update an existing translation #274
        // added the below index
        const countryIndex = transl.createIndex("country", "country", { unique: false, enableSearch: true });
        const sourceCntry = transl.createIndex("sourceCountry", ["source", "country"], { unique: false, enableSearch: true });
        
        // Populate with initial data.
        transl.put({source: "Activate", translation: "Activeren", country: "nl", id: 0,});
    };

    request.onsuccess = function (db) {
        
        myDb = request.result;
        console.debug("database opened",myDb);
        
        db = getDbSchema();
        var isDbCreated = jsstoreCon.initDb(db);

        if (!isDbCreated) {
            console.debug("Database is not created, so we create one", isDbCreated);
        }
        else {
            console.debug("Database is present:",db);
        }
        // check if the index is present, if not create it
        checkIndex(db);

    };
    request.onerror = function (event) {
        console.debug("Error at opening DB!",event);
    };
}

function createAndOpenModal() {
    //console.debug("locale:",locale)
    // Create the modal elements
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.classList.add('modal');
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    const modalHeader = document.createElement("H4");
    modalHeader.innerText = "Maintenance of local database"
    modalHeader.classList.add('modal-header');
    const closeButton = document.createElement('span');
    closeButton.classList.add('close');
    closeButton.textContent = "x";
    modalContent.appendChild(closeButton);

    const OriginalDiv = document.createElement('div');
    OriginalDiv.classList.add('modal-original');
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.id = 'modal-inputOriginal';
    inputField.placeholder = "Enter original text"
    OriginalDiv.appendChild(inputField);
    const modalTd = document.createElement('td');
    modalTd.classList.add('modal-td');
   
    const TranslationDiv = document.createElement('div');
    TranslationDiv.classList.add('modal-translation');
    const inputFieldTrans = document.createElement('input');
    inputFieldTrans.type = 'text';
    inputFieldTrans.id = 'modal-inputTranslation';
    inputFieldTrans.placeholder = "Enter translation text when translating"
    TranslationDiv.appendChild(inputFieldTrans)

    const retrieveButton = document.createElement('button');
    retrieveButton.id = 'retrieveDataBtn';
    retrieveButton.textContent = 'Search original';

    const clearButton = document.createElement('button');
    clearButton.id = 'clearDataBtn';
    clearButton.textContent = 'Clear';

    const deleteButton = document.createElement('button');
    deleteButton.id = 'deleteDataBtn';
    deleteButton.textContent = 'Delete';

    const saveButton = document.createElement('button');
    saveButton.id = 'saveDataBtn';
    saveButton.textContent = 'Save';
    const outputDiv = document.createElement('div');
    outputDiv.id = 'output';
    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(OriginalDiv)
    modalContent.appendChild(TranslationDiv)
    modalContent.appendChild(modalTd);
    modalContent.appendChild(retrieveButton);
    modalContent.appendChild(saveButton);
    modalContent.appendChild(deleteButton);
    modalContent.appendChild(clearButton);
    modalContent.appendChild(outputDiv);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    inputField.focus()
    // Event listener to close modal
    closeButton.addEventListener('click', function () {
        modal.style.display = 'none';
    });
    // Event listener to clear data
    clearButton.addEventListener('click', async function (event) {         
        // clear fields in modal
        inputField.value = "";
        inputFieldTrans.value = "";
        outputDiv.textContent = "";
    });

    retrieveButton.addEventListener('click', async function (event) {
        //console.debug("event:",event)
        // Retrieve data from indexedDB based on input
        const input = inputField.value;
        // Call a function to retrieve data from indexedDB
        const dataFromIndexedDB = await retrieveDataFromIndexedDB(input);
        console.debug("returned:", dataFromIndexedDB)
        // Display data in the modal
        if (dataFromIndexedDB == "notFound") {
            outputDiv.textContent = "Original not found!"
        }
        else {
            outputDiv.textContent = dataFromIndexedDB;
        }
    });

    saveButton.addEventListener('click', async function (event) {
       // console.debug("event:", event)
        // Save data to indexedDB based on input
        const input1 = inputField.value;
        if (input1 == "") {
            outputDiv.textContent = "Please enter a value for original!"
        }
        else if (inputFieldTrans.value == "") {

            outputDiv.textContent = "Please enter a value for translation!"
        }
        if (input1 != "" && inputFieldTrans.value != "") {
            let res = await addTransDb(input1, inputFieldTrans.value, locale)
            outputDiv.textContent = res
        }
        
    });

    deleteButton.addEventListener('click', async function (event) {
        //console.debug("event:", event)
        // Save data to indexedDB based on input
        const input1 = inputField.value;
        if (input1 == "") {
            outputDiv.textContent = "Please enter a value for original!"
        }

        if (input1 != "") {
            let result = await findTransline(input1, locale)
            if (result == 'notFound') {
                outputDiv.textContent = "Record not found!"
            }
            else {
                
                let result = await deleteTransDb(input1,locale)
                console.debug("result of delete:", result)
                outputDiv.textContent = result
            }
        }

    });
    // Display the modal
    modal.style.display = 'block';
}

// Function to retrieve data from indexedDB
async function retrieveDataFromIndexedDB(input) {
    // Perform operations to retrieve data from indexedDB based on the input
    // Replace this with your indexedDB retrieval logic
    let result = await findTransline(input, locale)
    return result;
   
       
}

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
async function getTM(myLi, row, record, destlang, original, replaceVerb, transtype, convertToLower, spellIgnore, locale,current) {
    //console.debug("getTM:",spellIgnore)
    var timeout = 0;
    var timer = 0;
    var preview;
    var result = "";
    var translatedText;
    //convertToLower = false;
    //console.debug("myLi:",myLi)
    translatedText = myLi;
    //z("myLI:", myLi, translatedText)
    if (translatedText != 'No suggestions') {                    
        translatedText = await postProcessTranslation(original, translatedText, replaceVerb, "", "", convertToLower, spellIgnore, locale);
    }
    processTransl(original, translatedText, locale, record, row, "single", "0", locale, convertToLower, current);
   // record.style.display = "display: table-row";
  
    let textareaElem = record.querySelector("textarea.foreign-text");
    // PSS 29-03-2021 Added populating the value of the property to retranslate            
    //textareaElem.value = translatedText;
   // textareaElem.innerText = translatedText;
    //PSS 25-03-2021 Fixed problem with description box issue #13
    textareaElem.style.height = "auto";
    textareaElem.style.height = textareaElem.scrollHeight + "px";
    
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
             preview.value = translatedText;
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
             // we need to set the checkbox as marked
            
           
             // 04-08-2022 PSS translation with TM does not set the status of the record to status - waiting #229
             // we need to change the state of the record but only if we found a translation!!
             if (translatedText != 'No suggestions') {
                 var previewClass = document.querySelector(`#preview-${row}`);
                 previewClass.classList.replace("no-translations", "has-translations");
                 previewClass.classList.replace("untranslated", "status-waiting");
                 previewClass.classList.add("wptf-translated");
             }
         }
         else {
             // if it is as single with local then we need also update the preview
             preview.innerText = translatedText;
             preview.value = translatedText;
             current.innerText = "transFill";
             current.value = "transFill";
             var element1 = document.createElement("div");
             element1.setAttribute("class", "trans_local_div");
             element1.setAttribute("id", "trans_local_div");
             element1.appendChild(document.createTextNode("TM"));
             preview.appendChild(element1);
             
             // we need to set the checkbox as marked
             preview = document.querySelector(`#preview-${row}`);
             if (is_pte) {
                 rowchecked = preview.querySelector("th input");
             }
             else {
                 rowchecked = preview.querySelector("td input");
             }
             if (rowchecked != null) {
                 if (!rowchecked.checked) {
                     //if (transtype == 'single') {
                     if (res == "No suggestions") {
                         rowchecked.checked = false;
                     }
                     else {
                         rowchecked.checked = true;
                     }
                 }
             }
             // 04-08-2022 PSS translation with TM does not set the status of the record to status - waiting #229
             // we need to change the state of the record 
             preview.classList.replace("no-translations", "has-translations");
             preview.classList.replace("untranslated", "status-waiting");
             preview.classList.add("wptf-translated");
         }
    }
    let localButton = document.querySelector("#translate-" + row + "-translocal-entry-local-button");
    if (localButton != null) {
        localButton.style.visibility = "visible";
    } else {
         console.debug("TM not found single!");
         console.debug("preview:", preview);
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
    let table = {
        name: "Translation",
        columns: {
            id: {
                autoIncrement: true,
                //primaryKey: true
            },
            source: {
                dataType: "string",
                notNull: true,
                primaryKey: true,
                enableSearch: true

            },
            translation: {
                dataType: "string",
                default: "translation"
            },
            country: {
                dataType: "string",
                notNull: true,
                enableSearch: true
            },
            sourceCountry: {
                keyPath: ['source', 'country'],
                enableSearch: true 
            }
        }
    };

    let dbSchema = {
        name: "My-Trans",
        tables: [table]
    }
    return dbSchema;
}

// 02-12-2022 PSS added warning if the index is not present issue #262
async function checkIndex(event) {
   // console.debug("Checking index:", event)
    var result;
    var db;
    var request = window.indexedDB.open("My-Trans");

    request.onupgradeneeded = function() {
        var db = request.result;

        var table = getDbSchema().tables[0];
        var objectStore = db.createObjectStore(table.name, {
            keyPath: table.columns.id.keyPath,
            autoIncrement: table.columns.id.autoIncrement
        });

        // create index
        objectStore.createIndex('sourceCountry', table.columns.sourceCountry.keyPath, {
            unique: table.columns.sourceCountry.unique
        });
    };
    request.onerror = function(event) {
        // Do something with request.errorCode!
        console.log("failed opening DB: " + request.errorCode)
        messageBox("error", "The database could not opened, please check if the local database is present");

    };
    request.onsuccess = await function(event, result) {
        var result = true
        // Do something with request.result!

        db = request.result;
        //console.log("opened DB")

        var transaction = db.transaction(["Translation"], "readwrite");
        var objectStore = transaction.objectStore("Translation");
        // console.debug("objectstore:", objectStore.indexNames)
        let indexNames = objectStore.indexNames;
        if (indexNames.contains('sourceCountry')){
            console.debug("index does exist");
        } else {
            //console.debug('index does not exist!');
            messageBox("error", 'Error the index does not exist in your DB!<br>Please make a backup of your database<br>Then follow the steps described in the Wiki to reset your database<br><a href="https://github.com/vibgyj/WPTranslationFiller/wiki/13.-Fix-broken-local-database">https://github.com/vibgyj/WPTranslationFiller/wiki/13.-Fix-broken-local-database</a>');
            result = false;
        }  
    };
}

async function deleteTransDb(orig, cntry){
    var transl = { orig, cntry };
    try {
        var noOfDataDeleted = await jsstoreCon.remove({
            from: 'Translation',
            where: {
                source: orig
            }
        }).then((res,noOfDataDeleted) => {
            console.debug("res:",res)
            if (res == 1) {
                reslt = "Deleted";
            } else if (res != 1) {
                // messageBox("error", "Record not added!!");
                reslt = "Record not deleted";
            }
            console.debug("return value:",reslt)
        })
        return reslt;
    } catch (ex) {
        messageBox("error", "Error: " + ex.message);
    }
}

async function addTransDb(orig, trans, cntry) {
    var transl = { source: orig, translation: trans, country: cntry };
    var myWindow = window.self;
    // 05-06-2021 PSS fixed a problem with wrong var names
    count = await findTransline(orig, cntry);
    //console.debug("count:",count)
    if (count == "notFound") {
        reslt = "Inserted";
        try {
            var noOfDataInserted = await jsstoreCon.insert({
                into: "Translation",
                values: [transl]
            });
            if (noOfDataInserted == 1) {
                reslt ="Inserted";
            } else if (noOfDataInserted != 1) {
                messageBox("error", "Record not added!!");
                reslt="Record not added";
            }
        } catch (ex) {
            messageBox("error", "Error: " + ex.message);
       }
    } else {
        res = updateTransDb(orig, trans, cntry);
        reslt = "updated";
    }
    return reslt;
}

async function updateTransDb(orig, trans, cntry) {
    //console.debug("we are updating")
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
        //console.debug("error:",ex)
        messageBox("error", "Error: " + ex.message + "record: " + orig);
    }
}


async function countTable(cntry) {
    const results = jsstoreCon.count({
        from: "Translation",
        where: {
            country: cntry
        }
    })
    return results;
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
    //console.debug("searching:",orig,cntry)
    const results = await jsstoreCon.select({
        from: "Translation",
            where: {
            sourceCountry: [orig,cntry]
        }
    }).then((value) => {
       // console.debug("value of search:",value)
        if (value !=""){
            trans = convPromise(value);
        }
        else {
            trans = "notFound";
        }
    });
    return trans;
}

async function convPromise(trans){
    res = trans[0]["translation"];
    //console.debug("convPromise:",res)
    if (typeof res== "undefined"){
       res="notFound";
    }
    return res;
}

async function addTransline(rowId,showMessage){
    // 07-05-2021 PSS added language read from config to store in database
    var res = "";
    var row = "";
    chrome.storage.local.get(["destlang"], function (data) {
    language = data.destlang;
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    var orig = e.querySelector("span.original-raw").innerText;
    let textareaElem = e.querySelector("textarea.foreign-text");
    var addTrans = textareaElem.value;
    //console.debug("translation:", textareaElem.value)
    if (addTrans === "") {
        messageBox("error", "No translation to store!");
    } else {
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
                textareaElem2 = f.querySelector("textarea#translation_" + row + "_2");
                if (textareaElem2 != null) {
                    addTrans = DOMPurify.sanitize(textareaElem2.value);
                    plural = plural+"_02"
                    res = addTransDb(plural, addTrans, language);
                }
               
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
        if (showMessage == true) {
            messageBox("info", "addTransline record added/updated to database");
        }
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
    let myDate = new Date();
    myDate = `${myDate.getDate()}-${myDate.getMonth() + 1}-${myDate.getFullYear()}`;
    export_file = "export_database_" + myDate + "_" + destlang + ".csv";
    i = 1;
    trans.forEach(function (trans) {
        arrayData[i] = {
            original : trans.source,
            translation : trans.translation,
            country : trans.country
        };
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
    
    //21-11-2022 PSS changed the classname to meet the new navbar position
    let exportButton = document.querySelector("a.export_translation-button");
    exportButton.className += " ready";
    //close_toast();
    messageBox("info", "Export database done amount of records exported: " + i + "<br>Wait until explorer is shown to save the file");  
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
        addTransline(rowId,true);
    }
}
async function resetDB() {
    var DBOpenRequest = window.indexedDB.open("My-Trans");
    DBOpenRequest.onsuccess = function (event) {
        // console.debug("Database initialised");

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
            var DBDeleteRequest1 = window.indexedDB.deleteDatabase("KeyStore");
            DBDeleteRequest.onerror = function (event) {
                console.log("Error deleting database My-Trans.");
            };

            DBDeleteRequest.onsuccess = function (event) {
                console.log("Database My-Trans deleted successfully");

                console.log(event.result); // should be undefined
            };

            DBDeleteRequest1.onerror = function (event) {
                console.log("Error deleting database KeyStore.");
            };

            DBDeleteRequest1.onsuccess = function (event) {
                console.log("Database KeyStore deleted successfully");

                console.log(event.result); // should be undefined
            };
            messageBox("info", "Database deletion done<br> My-Trans and KeyStore<br>Restart the add-on and window!");
        } else {
            messageBox("info", "Database deletion cancelled");

        }
    })
}