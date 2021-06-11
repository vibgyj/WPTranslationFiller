console.log('Content script...');
// PSS added jsStore to be able to store and retrieve default translations
var jsstoreCon = new JsStore.Connection();
var db =getDbSchema() ;
var isDbCreated = jsstoreCon.initDb(db);

if (!isDbCreated){
console.debug('Database is not created, so we create one', isDbCreated);
}
else{
	console.debug("Database is present");
}
console.debug("jsStore opened:",jsstoreCon);
//09-05-2021 PSS added fileselector for silent selection of file
var fileSelector = document.createElement('input');
fileSelector.setAttribute('type', 'file');

// PSS added this one to be able to see if the Details button is clicked
// 16-06-2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
const el = document.getElementById("translations");
if (el != null){
  el.addEventListener("click", checkbuttonClick);
}
//Add translate button - start
var translateButton = document.createElement("a");
translateButton.href = "#";
translateButton.className = "translation-filler-button";
translateButton.onclick = translatePageClicked;
translateButton.innerText = "Translate";
var divPaging = document.querySelector("div.paging");
// 1-05-2021 PSS fix for issue #75 do not show the buttons on project page
var divProjects = document.querySelector('div.projects');
if (divPaging != null && divProjects  == null){
   divPaging.insertBefore(translateButton, divPaging.childNodes[0]);
}
//23-03-2021 PSS added a new button on first page
var checkButton = document.createElement("a");
checkButton.href = "#";
checkButton.className = "check_translation-button";
checkButton.onclick = checkPageClicked;
checkButton.innerText = "CheckPage";
var divPaging = document.querySelector("div.paging");
var divProjects = document.querySelector('div.projects');
if (divPaging != null && divProjects == null){
   divPaging.insertBefore(checkButton, divPaging.childNodes[0]);
}
//07-05-2021 PSS added a new button on first page
var exportButton = document.createElement("a");
exportButton.href = "#";
exportButton.className = "export_translation-button";
exportButton.onclick = exportPageClicked;
exportButton.innerText = "Export";
var divPaging = document.querySelector("div.paging");
var divProjects = document.querySelector('div.projects');
if (divPaging != null && divProjects == null){
   divPaging.insertBefore(exportButton, divPaging.childNodes[0]);
}


//07-05-2021 PSS added a new button on first page
var importButton = document.createElement("a");
importButton.href = "#";
importButton.id = "ImportDb";
//importButton.type = "file";
//importButton.style="display: none";
importButton.className = "import_translation-button";
importButton.onclick = importPageClicked;
importButton.innerText = "Import";
var divPaging = document.querySelector("div.paging");
var divProjects = document.querySelector('div.projects');
if (divPaging != null && divProjects == null){
   divPaging.insertBefore(importButton, divPaging.childNodes[0]);
}


function translatePageClicked(event) {
    event.preventDefault();
    console.log("Translate clicked!");
    chrome.storage.sync
        .get(
            ['apikey', 'apikeyDeepl' , 'apikeyMicrosoft', 'transsel', 'destlang', 'postTranslationReplace', 'preTranslationReplace'],
            function (data) {
                console.debug('Parameters read:', data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang);
                if (typeof data.apikey != 'undefined' && data.transsel == 'google' || typeof data.apikeyDeepl != 'undefined' && data.transsel == "deepl" || typeof data.apikeyMicrosoft != 'undefined' && data.transsel == "microsoft") {
                    console.debug("apikey present");
                    if (data.destlang != 'undefined') {
                        if (data.transsel != 'undefined') {

                            translatePage(data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace);
                        }
                        else {
                            alert("You need to set the translator API");
                        }
                    }
                    else {
                        console.debug("parameter destlang:", data.destlang);
                        alert("You need to set the parameter for Destination language");
                    }
                }
                else {
                        alert("No apikey set!" +"google:" +data.apikey+" transsel "+data.transsel + "Deepl:"+ data.apikeyDeepl + " transsel:"+data.transsel);
                    }
            });
}

// Add translation button - end

function checkPageClicked(event) {
    event.preventDefault();
    console.log("Checkpage clicked!");
    chrome.storage.sync
        .get(
            ['apikey', 'destlang', 'postTranslationReplace', 'preTranslationReplace'],
            function (data) {
                checkPage(data.postTranslationReplace);
            });
}

function exportPageClicked(event) {
    event.preventDefault();
    console.log("Exportpage clicked!");
    res= dbExport();
    
}
// 08-05-2021 PSS added import of records into local database
async function importPageClicked(event) { 
    
    fileSelector.click();
    fileSelector.addEventListener('change', (event) => {   
       fileList = event.target.files;
       console.debug("filelist:",fileList);
       const file = fileList[0];
       var obj_csv = {
       size:0,
       dataFile:[]
          };
        
        console.debug("File extension:",file.type);
        console.log("Importpage clicked!", fileList[0].name);
        // 09-05-2021 PSS added check for proper import type
        if (file.type == "application/vnd.ms-excel"){ 
           if (fileList[0]) {
              let reader = new FileReader();
              reader.readAsBinaryString(fileList[0]);
              reader.onload = function (e) {
              console.log("functions started:",e);
              obj_csv.size = e.total;
              obj_csv.dataFile = e.target.result;
              //console.log(obj_csv.dataFile)
              //File is imported so process it
              parseDataBase(obj_csv.dataFile); 
              let importButton = document.querySelector(".paging a.import_translation-button");
              importButton.className += " ready";
              alert('Import ready');          
           }
        }
       
    }
    else {
        // File is wrong type so do not process it
        alert("File is not csv!!");
    }
    }); 
   
}
    
async function parseDataBase(data) {
    alert("Import is started wait for the result");
    let csvData = [];
    let lbreak = data.split("\n");
    let counter= 0;
    // To make sure we can manipulate the data store it into an array
    lbreak.forEach(res => {
        csvData.push(res.split(","));
        ++counter;
        //console.debug("counter:",counter);
    });
    if (counter >0){
        //console.debug('data:',csvData);
        var arrayLength = csvData.length;
         for (var i = 0; i < arrayLength; i++) {
        if (i > 1){
            // Store it into the database
            //Prevent adding empty line
            if (csvData[i][0] != ''){
               res= await addTransDb(csvData[i][0],csvData[i][1],csvData[i][2]);
               console.debug('parseDataBase:',res);
            }
        }
      }
        alert('Import ready records imported:' + i);
    }
}
let glossary = [];
chrome.storage.sync.get(['glossary', 'glossaryA', 'glossaryB', 'glossaryC'
    , 'glossaryD', 'glossaryE', 'glossaryF', 'glossaryG', 'glossaryH', 'glossaryI'
    , 'glossaryJ', 'glossaryK', 'glossaryL', 'glossaryM', 'glossaryN', 'glossaryO'
    , 'glossaryP', 'glossaryQ', 'glossaryR', 'glossaryS', 'glossaryT', 'glossaryU'
    , 'glossaryV', 'glossaryW', 'glossaryX', 'glossaryY', 'glossaryZ', 'destlang'],
    function (data) {
        loadSet(glossary, data.glossary);
        loadSet(glossary, data.glossaryA);
        loadSet(glossary, data.glossaryB);
        loadSet(glossary, data.glossaryC);
        loadSet(glossary, data.glossaryD);
        loadSet(glossary, data.glossaryE);
        loadSet(glossary, data.glossaryF);
        loadSet(glossary, data.glossaryG);
        loadSet(glossary, data.glossaryH);
        loadSet(glossary, data.glossaryI);
        loadSet(glossary, data.glossaryJ);
        loadSet(glossary, data.glossaryK);
        loadSet(glossary, data.glossaryL);
        loadSet(glossary, data.glossaryM);
        loadSet(glossary, data.glossaryN);
        loadSet(glossary, data.glossaryO);
        loadSet(glossary, data.glossaryP);
        loadSet(glossary, data.glossaryQ);
        loadSet(glossary, data.glossaryR);
        loadSet(glossary, data.glossaryS);
        loadSet(glossary, data.glossaryT);
        loadSet(glossary, data.glossaryU);
        loadSet(glossary, data.glossaryV);
        loadSet(glossary, data.glossaryW);
        loadSet(glossary, data.glossaryX);
        loadSet(glossary, data.glossaryY);
        loadSet(glossary, data.glossaryZ);
        if (typeof data.glossary == 'undefined') {
            alert("Your glossary is not loaded because no file is loaded!!");
        }
        glossary.sort(function (a, b) {
            // to sory by descending order
            return b.key.length - a.key.length;
            
        });
        //console.log(glossary);
        addTranslateButtons();
        if (glossary.length > 0) {
            validatePage(data.destlang);
        }
        checkbuttonClick();
    });

function loadSet(x, set) {
    glossary = glossary.concat(set);
}

function addTranslateButtons() {
    //16 - 06 - 2021 PSS fixed this function addTranslateButtons to prevent double buttons issue #74
    for (let e of document.querySelectorAll("tr.editor")) {
        let rowId = e.getAttribute('row');
        let panelHeaderActions = e.querySelector('#editor-' + rowId + ' .panel-header .panel-header-actions');
        // Add translate button
        let translateButton = document.createElement("my-button");
        //console.debug('addTranslateButtons rowId:',rowId);
        importButton.href = "#";
        translateButton.id = `translate-${rowId}-translation-entry-my-button`;
        translateButton.className = "translation-entry-my-button";
        translateButton.onclick = translateEntryClicked;
        translateButton.innerText = "Translate";
        translateButton.style.cursor = "pointer";
        panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);

        // Add addtranslate button
        let addTranslateButton = document.createElement("my-button");
        console.debug('addTranslateButtons rowId:', rowId);
        importButton.href = "#";
        addTranslateButton.id = `translate-${rowId}-addtranslation-entry-my-button`;
        addTranslateButton.className = "addtranslation-entry-my-button";
        addTranslateButton.onclick = addtranslateEntryClicked;
        addTranslateButton.innerText = "Add Translation";
        addTranslateButton.style.cursor = "pointer";
        panelHeaderActions.insertBefore(addTranslateButton, panelHeaderActions.childNodes[0]);

        let TranslocalButton = document.createElement("local-button");
        TranslocalButton.id = `translate-${rowId}-translocal-entry-local-button`;
        TranslocalButton.className = "translocal-entry-local-button";
        TranslocalButton.innerText = "Local";
        TranslocalButton.style.visibility = 'hidden';
        panelHeaderActions.insertBefore(TranslocalButton, panelHeaderActions.childNodes[0]);
    }
}


function addtranslateEntryClicked(event){
    if (event != undefined){ 
        event.preventDefault();
       console.debug("add translation clicked");
       console.log("addtranslateEntry clicked!", event);
       let rowId = event.target.id.split('-')[1];
       console.log("addtranslate Entry clicked rowId", rowId);
       let myrowId = event.target.id.split('-')[2];
       //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
       // So that needs to be added to the base rowId to find it
       if (myrowId !== undefined && myrowId !="addtranslation") {
        newrowId = rowId.concat("-", myrowId);
        rowId = newrowId;
        console.debug('Line already translated new rowId:'+ rowId);
       
       }
       addTransline(rowId); 
    }   
}
// 04-04-2021 PSS issue #24 added this function to fix the problem with no "translate button in single"
// 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
function checkbuttonClick(event){
   if (event != undefined){ 
      //event.preventDefault(); caused a problem within the single page enttry  
      let action = event.target.textContent ;
      //console.debug('action',action);
      if (action == 'Details'){
         let rowId = event.target.parentElement.parentElement.getAttribute('row');
          let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
         console.debug('Translatebutton:',translateButton);
         if (translateButton == null){
            let panelHeaderActions = document.querySelector('#editor-' + rowId + ' .panel-header .panel-header-actions');
            let translateButton = document.createElement("my-button");
            translateButton.id = `translate-${rowId}-translation-entry-my-button`;
            translateButton.className = "translation-entry-my-button";
            translateButton.onclick = translateEntryClicked;
            translateButton.innerText = "Translate";
            panelHeaderActions.insertBefore(translateButton, panelHeaderActions.childNodes[0]);
            // Add addtranslate button
            let addTranslateButton = document.createElement("my-button");
            console.debug('addTranslateButtons rowId:', rowId);
            addTranslateButton.id = `translate-${rowId}-addtranslation-entry-my-button`;
            addTranslateButton.className = "addtranslation-entry-my-button";
            addTranslateButton.onclick = addtranslateEntryClicked;
            addTranslateButton.innerText = "Add Translation";
            panelHeaderActions.insertBefore(addTranslateButton, panelHeaderActions.childNodes[0]);

            let TranslocalButton = document.createElement("local-button");
            TranslocalButton.id = `translate-${rowId}-translocal-entry-local-button`;
            TranslocalButton.className = "translocal-entry-local-button";
            TranslocalButton.innerText = "Local";
            TranslocalButton.style.visibility = 'hidden';
            panelHeaderActions.insertBefore(TranslocalButton, panelHeaderActions.childNodes[0]);
            }
        }   
    }
}

function translateEntryClicked(event) {
    event.preventDefault();
    console.log("Translate Entry clicked!", event);
    let rowId = event.target.id.split('-')[1];
    //console.log("Translate Entry clicked rowId", rowId);
    let myrowId = event.target.id.split('-')[2];
    //PSS 08-03-2021 if a line has been translated it gets a extra number behind the original rowId
    // So that needs to be added to the base rowId to find it
    //console.log("translateEntryClicked myrowId:", myrowId);
    if (typeof myrowId != 'undefined' && myrowId != 'translation') {
        newrowId = rowId.concat("-", myrowId);
        rowId = newrowId;
        console.debug('Line already translated new rowId:',rowId);
    }
    chrome.storage.sync
        .get(['apikey', 'apikeyDeepl','apikeyMicrosoft','transsel','destlang', 'postTranslationReplace', 'preTranslationReplace'], function (data) {
            translateEntry(rowId, data.apikey, data.apikeyDeepl, data.apikeyMicrosoft, data.transsel, data.destlang, data.postTranslationReplace, data.preTranslationReplace);
        });
    console.debug('after translateEntry');
}

function validatePage(language) {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        let textareaElem = e.querySelector("textarea.foreign-text");
        textareaElem.addEventListener('input', function (e) {
            validateEntry(language, e.target);
        });
        let translation = textareaElem.innerText;

        var result = validate(language, original, translation);
        console.log(result);

        updateStyle(textareaElem, result);
    }
}

function updateStyle(textareaElem, result) {
    let rowId = textareaElem.parentElement.parentElement.parentElement
        .parentElement.parentElement.parentElement.parentElement.getAttribute('row');
    let priorityElem = document.querySelector('#preview-' + rowId + ' .priority');
    updateElementStyle(priorityElem, result,'False');
    let headerElem = document.querySelector(`#editor-${rowId} .panel-header`);
    updateElementStyle(headerElem, result,'False');
    let OldTrans = fetchOld(priorityElem,result,'https://translate.wordpress.org/projects/wp-plugins/awesome-support/dev/nl/default/?filters%5Bstatus%5D=either&filters%5Boriginal_id%5D='+rowId+'&sort%5Bby%5D=translation_date_added&sort%5Bhow%5D=asc');
    
}

function validateEntry(language, textareaElem) {
    let translation = textareaElem.value;
    let original = textareaElem.parentElement.parentElement.parentElement
        .querySelector("span.original-raw").innerText;

    let result = validate(language, original, translation);
    console.log(result);

    updateStyle(textareaElem, result);
}

function updateElementStyle(priorityElem, result,oldstring) {
    if (oldstring == 'True') {
        var text = document.createTextNode('⇈');
        priorityElem.style.color = 'darkblue';
        priorityElem.style.fontWeight = "900";
        
        priorityElem.appendChild(text);
        }
    if (result.wordCount == 0) return;
    
    if (result.percent == 100) {
        priorityElem.style.backgroundColor = 'green';
        return;
    }
    else if (result.percent > 66)
        priorityElem.style.backgroundColor = 'yellow';
    else if (result.percent > 33)
        priorityElem.style.backgroundColor = 'orange';
        
    else if (result.percent == 10)
        priorityElem.style.backgroundColor = 'purple';	
		    
    else
        priorityElem.style.backgroundColor = 'red';

    priorityElem.setAttribute('title', result.toolTip);
}

function validate(language, original, translation) {
    let originalWords = original.split(' ');
    let wordCount = 0;
    let foundCount = 0;
    let toolTip = '';
    // 17-05-2021 PSS added check to prevent errors with empty glossary be aware that if the glossary gets more entries the amount needs to be adepted
    if (glossary.length > 27) {
        //PSS 09-03-2021 Added check to prevent calculatiing on a empty translation
        if (translation.length > 0) {
            console.debug('validate check the line started');

            for (let oWord of originalWords) {
                for (let gItem of glossary) {
                    let gItemKey = gItem["key"];
                    let gItemValue = gItem["value"];
                    if (oWord.toLowerCase().startsWith(gItemKey.toLowerCase())) {
                        console.log('Word found:', gItemKey, gItemValue);
                        wordCount++;

                        let isFound = false;
                        for (let gWord of gItemValue) {
                            if (match(language, gWord.toLowerCase(), translation.toLowerCase())) {
                                console.log('+ Translation found:', gWord);
                                isFound = true;
                                break;
                            }
                        }

                        if (isFound) {
                            foundCount++;
                            console.log('- Translation found:', gItemKey, gItemValue);
                        } else {
                            toolTip += `${gItemKey} - ${gItemValue}\n`;
                            console.log('x Translation not found:', gItemKey, gItemValue);
                        }
                        break;
                    }
                }
            }
        }
        else {
            foundCount = 0;
            wordCount = 0;
        }
    }
        // 27-03-2021 PSS added this to prevent devision by zero      
        if (wordCount != 0) {
            percent = foundCount * 100 / wordCount;
        }
        else {
            console.debug('Validate found no wordCount!');
            percent = 0;
        }
        console.log("Percent calculation:", wordCount, foundCount, percent);

        return { wordCount, percent, toolTip };
}


// Language specific matching.
function match(language, gWord, tWord) {
    switch (language) {
        case 'ta':
            return taMatch(gWord, tWord);
        default:
            return tWord.includes(gWord);
    }
}

function taMatch(gWord, tWord) {
    let trimSize = gWord.charCodeAt(gWord.length - 1) == '\u0BCD'.charCodeAt(0)
        ? 2 : 1;
    let glossaryWord = gWord.substring(0, gWord.length - trimSize);
    // கோ
    glossaryWord = glossaryWord.replaceAll("\u0BC7\u0BBE", "\u0BCB");
    // கொ
    glossaryWord = glossaryWord.replaceAll("\u0BC6\u0BBE", "\u0BCA");

    console.log('taMatch:', gWord, glossaryWord, tWord);

    return tWord.includes(glossaryWord);
}

// 11-06-2021 PSS added function to mark that existing translation is present
async function fetchOld(priorityElem,result,url) {
    console.debug("Fetch URL started with :", url);
        fetch(url, {
            headers: new Headers({
                'User-agent': 'Mozilla/4.0 Custom User Agent'
            })
        })
            .then(response => response.text())
            .then(data => {
                //console.log(data);
                var parser = new DOMParser();
                var doc = parser.parseFromString(data, 'text/html');
                //console.log("html:", doc);
                var table = doc.getElementById("translations");
                //console.log("Table count:", table);
                var tbodyRowCount = table.tBodies[0].rows.length;
                console.log("Table count:", tbodyRowCount);
                if (tbodyRowCount > 2) {
                    updateElementStyle(priorityElem, result, 'True');
                }
                
            }).catch(error => console.error(error));
    
        
}
