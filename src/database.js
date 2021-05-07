res=initStoragePersistence();
console.debug('Is database persistent:',res);


async function initDb() {
    var isDbCreated = await jsstoreCon.initDb(getDbSchema());
    if (isDbCreated) {
        console.log('db created');
    }
    else {
        console.log('db opened');
    }
}

function getDbSchema() {
    var table = {
        name: 'Translation',
        columns: {
			 id: {
                primaryKey: true,
                autoIncrement: true
            },
            source: {
				primaryKey: true,
                notNull: true,
                dataType: 'string'
            },
            translation: {
                dataType: 'string',
                default: 'male'
            },
            country: {
                notNull: true,
                dataType: 'string'
            }
        }
    }

    var db = {
        name: 'My-Trans',
        tables: [table]
    }
    return db;
}
async function addTransDb(source,translation,country) {
	console.debug('Add record:',source,translation,country);
	//found = findTransline(source);
	//console.debug('Result after find:',found);
	count = await countTransline(source);
	console.debug('Result after count:',count);
	if (count =='0') {
        var transl = {source,translation,country};
        try {
           var noOfDataInserted = await jsstoreCon.insert({
            into: 'Translation',
            values: [transl]
           });
		   console.debug('Result insert:',noOfDataInserted);
        if (noOfDataInserted === 1) {
			alert("Record added");
        }
		else if (noOfDataInserted != 1){
			alert("Record not added!!");
		}
    } catch (ex) {
        alert(ex.message);
       }
	}
	else{
		res = updateTransDb(source,translation,country);
		console.debug('Record present so update it',res);
		alert("Record updated!!");
	}
}

async function updateTransDb(orig,trans,cntry) {
    var transl = {orig,trans,cntry};
    try {
        var noOfDataUpdated = await jsstoreCon.update({
            in: 'Translation',
            set: {
                translation: transl.trans,
                country: transl.cntry             
            },
            where: {
                source: transl.orig
            }
        });
        console.log(`data updated ${noOfDataUpdated}`);
        
    } catch (ex) {
        alert(ex.message);
    }
}

async function countTransline(orig){
console.debug("count started");
const results = await jsstoreCon.count({
    from: "Translation",
    where: {
        source: orig      
    }
})
console.debug("count amount:",results);
return results;
}

async function findTransline(orig){
	var trans = 'notFound';
	console.debug("Find line started:",orig);
	const results = await jsstoreCon.select({
    from: "Translation",
    where: {
        source: orig      
    }
}).then((value) => {
  if (value !=""){	
     console.log('value',value[0]['translation']);
     trans= convPromise(value);
    }
	else {
		trans= convPromise('notFound');
		console.debug('findTransline:no value found');
	} 
  });
console.debug('trans:',trans);
return trans;
}

async function convPromise(trans){
	res= trans[0]['translation'];
	console.debug('convert promise:',res);
	if (typeof res== 'undefined'){
		console.debug('convPromise found undefined');
		res='notFound';
	}
	return res;
}

async function addTransline(rowId){
    console.debug("Add translation line to database",rowId);
    // 07-05-2021 PSS added language read from config to store in database
    chrome.storage.sync.get(['destlang'], function (data) {
    language = data.destlang;
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    var orig = e.querySelector("span.original-raw").innerText;
    let textareaElem = e.querySelector("textarea.foreign-text");
    var addTrans = textareaElem.value;
    if (addTrans === ""){
        alert("No translation to store!");
    }
    else {
         console.debug('Translated text to add to database:',addTrans);
         console.debug('Original text to add to database:',orig);
         console.debug("addTransline Language:",language);
		     addTransDb(orig,addTrans,language);
      }
    });
    return;
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
      console.debug("Not possible to persist storage");
      break;
    case "persisted":
      console.debug("Successfully persisted storage silently");
      break;
    case "prompt":
      console.debug("Not persisted, but we may prompt user when we want to.");
      break;
  }
}

