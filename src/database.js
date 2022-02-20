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

async function dbExport() {
  var export_file = "";
  var arrayData = [];
  // 09-07-2021 PSS altered the separator issue #104
  var delimiter = "|";
  var arrayHeader = ["original", "translation", "country"];
  var header = arrayHeader.join(delimiter) + "\n";
    var csv = header;
    // 01-02-2022 altered the messagebox into a toast so you do not need to dismiss it issue #181
    toastbox("info", "Export database in progress" + "<br>" + "Wait for saving the file!", "5000", "Saving");
    //messageBox("info", "Export database in progress" + "<br>" + "Wait for saving the file!");
  const trans = await jsstoreCon.select({
    from: "Translation"
  });
    destlang ="nl";
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