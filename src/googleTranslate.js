// This array is used to replace wrong words in translation
// PSS version 12-05-2021
let replaceVerb = [];
// This array is used to replace verbs before translation
// It is also used to force google to translate informal
// This is done by replacing the formal word for a informal word
let replacePreVerb = [];
// 06-05-2021 PSS These vars can probably removed after testen
var result="";
var res = "";


function setPreTranslationReplace(preTranslationReplace) {
    replacePreVerb = [];
    if (preTranslationReplace != undefined){
       let lines = preTranslationReplace.split('\n');
       lines.forEach(function (item) {
        // Handle blank lines
        if (item != "") {
            replacePreVerb.push(item.split(','));
          }
       });
    }
}

function setPostTranslationReplace(postTranslationReplace) {
    replaceVerb = [];
    if (postTranslationReplace != undefined){
       let lines = postTranslationReplace.split('\n');
       lines.forEach(function (item) {
         // Handle blank lines
         if (item != "") {
            replaceVerb.push(item.split(','));
           }
        });
    }
}
// 18-03-2021 PSS added pretranslate function so we can use a API to find existing records locally
// 18-04-2021 PSS now the function retrieves the data from the local database if present
async function pretranslate(original) {
    console.debug('pretranslate with:', original);
    var translated = "";
    
    res = await listRec(original).then(function(v){
        console.debug('answ:',v);
        translated=v;
    }).catch (function (err) {
        console.debug('Error retrieving pretrans',err.message);
    });
    console.log('resultaat translate:',translated);
    if (typeof  translated == 'undefined'){
        translated = 'notFound';
       }
    else if (typeof translated == 'object') {
        translated = 'notFound';  
    }
    else if (translated == ''){
		translated = 'notFound';
	}
	else 
		{
        console.debug('pretranslate line found:',translated);
        //translated = res;   
    }
    return translated;
}

function checkComments(comment) {
    // PSS 09-03-2021 added check to see if we need to translate
    //console.debug('checkComment started comment', comment);
    let toTranslate = false;
    switch (comment) {
        case 'Plugin Name of the plugin/theme':
            toTranslate = false;
            break;
        case 'Plugin name.':
            toTranslate = false;
            break;
        case 'Plugin Name of the plugin':
            toTranslate = false;
            break;
        case 'Author of the plugin':
            toTranslate = false;
            break;
        case 'Plugin Name of the plugin Author of the plugin':
            toTranslate = false;
            break;
        case 'Plugin URI of the plugin':
            toTranslate = false;
            break;
        case 'Author URI of the plugin':
            toTranslate = false;
            break;
        case 'Theme Name of the theme':
            toTranslate = false;
            break;
        case 'Theme Name of the plugin/theme':
            toTranslate = false;
            break;
        case 'Author of the theme':
            toTranslate = false;
            break;
        case 'Theme URI of the theme':
            toTranslate = false;
            break;
        case 'Author URI of the theme':
            toTranslate = false;
            break;
        default:
            toTranslate = true;
    }
    //console.debug('before googletranslate do we need to translate:', toTranslate);
    return toTranslate;
}
// 23-03-2021 PSS added function to check for wrong verbs
function checkPage(postTranslationReplace) {
    setPostTranslationReplace(postTranslationReplace);
    //console.debug("CheckPage:", postTranslationReplace.length);
    // 15-05-2021 PSS added fix for issue #73add
    if (postTranslationReplace.length != 0 && postTranslationReplace != "undefined") {
        //setPreTranslationReplace(preTranslationReplace);
        let countreplaced = 0;
        var translatedText;
        for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            let original = e.querySelector("span.original-raw").innerText;
            
            // Fetch the translations
            let element = e.querySelector('.source-details__comment');
            let textareaElem = e.querySelector("textarea.foreign-text");
            translatedText = textareaElem.innerText;
            //console.debug('Translated text to check:',translatedText);
            let replaced = false;
            // replverb contains the verbs to replace
            for (let i = 0; i < replaceVerb.length; i++) {
                if (translatedText.includes(replaceVerb[i][0])) {
                    //console.debug('Word in line found',replaceVerb[i][0]);
                    translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
                    countreplaced++;
                    replaced = true;
                }
            }
            textareaElem.innerText = translatedText;
            textareaElem.value = translatedText;
            // PSS 22-07-2021 fix for the preview text is not updated #109
            let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
            let row = rowfound.split('-')[1];
            let newrow = rowfound.split('-')[2];
            if (newrow != 'undefined') {
                newrowId = row.concat("-", newrow);
                row = newrowId;
            }
            let preview = document.querySelector('#preview-' + newrowId + ' td.translation');
            preview.innerText = translatedText;
           
            if (replaced) {
                let wordCount = countreplaced;
                let percent = 10;
                let toolTip = '';
                result = { wordCount, percent, toolTip };
                //console.debug('googletranslate row:', rowfound);
                updateStyle(textareaElem, result, "", true, false, false, row);
            }
            replaced = false;

        }

        //var myForm = document.getElementById('translation-actions');
        //myForm.submit();
        alert('Replace verbs done ' + countreplaced + ' replaced');
        // Translation replacement completed
        let checkButton = document.querySelector(".paging a.check_translation-button");
        checkButton.className += " ready";
    }
    else {
        alert("Your postreplacement verbs is empty!!");
        }
}

async function translatePage(apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace) {
    // 19-06-2021 PSS added animated button for translation at translatePage
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    translateButton.className += " started";
    var transtype = "single";
    // 15-05-2021 PSS added fix for issue #73
    // 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
    if (typeof postTranslationReplace != 'undefined' && postTranslationReplace.length != 0) {
        if (typeof preTranslationReplace != 'undefined' && preTranslationReplace.length != 0) {
            setPostTranslationReplace(postTranslationReplace);
            setPreTranslationReplace(preTranslationReplace);

            //console.debug("Deepl:" + apikeyDeepl + "Transsel:" + transsel);
            for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
                
               
                //console.debug('translatePage content:', e);
                // 16-08-2021 PSS fixed retranslation issue #118
                let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
                let row = rowfound.split('-')[1];
                let newrow = rowfound.split('-')[2];
                if (typeof newrow != 'undefined') {
                    newrowId = row.concat("-", newrow);
                    row = newrowId;
                }
                else {
                    rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
                    let row = rowfound.split('_')[1];
                }
                let original = e.querySelector("span.original-raw").innerText;
                // 14-08-2021 PSS we need to put the status back of the label after translating
                let transname = document.querySelector(`#preview-${row} .original div.trans_name_div_true`);
                if (transname != null) {
                    transname.className = "trans_name_div";
                    transname.innerText = 'URL, name of theme or plugin or author!';
                    current = document.querySelector(`#preview-${row} .priority button.save-button`);
                    current.innerText = "Save";
                    transtype = "single";
                }
                // If in the original field "Singular is present we have a plural translation
                let pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) small`);
                console.debug("TranslatePage plural present:", pluralpresent, row);
                if (pluralpresent != null) {
                    transtype = "plural";
                }
                else {
                    transtype = "single";
                }
                // PSS 09-03-2021 added check to see if we need to translate
                //Needs to be put into a function, because now it is unnessary double code
                let toTranslate = true;
                // Check if the comment is present, if not then if will block the request for the details name etc.
                let element = e.querySelector('.source-details__comment');
                if (element != null) {
                    let comment = e.querySelector('.source-details__comment p').innerText;
                    toTranslate = checkComments(comment.trim());
                    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                    if (currec != null) {
                        var current = currec.querySelector('span.panel-header__bubble');
                        var prevstate = current.innerText;
                        //console.debug("Previous state:", prevstate);                        
                    }
                }
                // Do we need to translate ??
                if (toTranslate) {
                    let pretrans = await findTransline(original, destlang);
                    console.debug("Pretrans found:", row,pretrans);
                    // 07-05-2021 PSS added pretranslate in pages
                    if (pretrans == "notFound") {                  
                        // 20-06-2021 PSS fixed that translation stopped when the page already is completely translated issue #85
                        if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                            document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = 'hide';
                        }
                        if (transsel == "google") {
                            plural_line = "1";
                            googleTranslate(original, destlang, e, apikey, replacePreVerb, row, transtype, plural_line);
                           // console.debug("translatePage google translation:",original);
                        }
                        else if (transsel == "deepl") {
                            //console.debug('translatePage apikey:', apikeyDeepl);
                            deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, row, transtype);
                            //console.debug("translatePage deepl translation:",original);
                        }
                        else if (transsel == "microsoft") {
                            microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, row, transtype);
                           // console.debug('translatedEntry microsoft translation:', original);
                        }
                    }
                    else {
                        // Pretranslation found!
                        //console.debug('Pretranslated:', pretrans);
                        let translatedText = pretrans;
                        let textareaElem = e.querySelector("textarea.foreign-text");
                       // console.debug('textareaElem:',textareaElem);
                        
                        textareaElem.innerText = translatedText;
                        textareaElem.value = translatedText;
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        if (currec != null) {
                            var current = currec.querySelector('span.panel-header__bubble');     
                        }
                        validateEntry(destlang, textareaElem, "", "", row);
                        // PSS 10-05-2021 added populating the preview field issue #68
                        // Fetch the first field Singular
                        let previewElem = document.querySelector('#preview-' + row + ' li:nth-of-type(1) span.translation-text');
                       // console.debug("Single record:", previewElem);
                        if (previewElem != null) {
                            // console.debug('Text preview:', previewElem.innerText);
                            previewElem.innerText = translatedText;
                        }
                        else {
                            let preview = document.querySelector('#preview-' + row + ' td.translation');
                            let spanmissing = preview.querySelector(" span.missing");
                            //console.debug('spanmissing:', spanmissing);

                            if (spanmissing != null) {
                                spanmissing.remove();
                                if (transtype != "single") {
                                    var ul = document.createElement('ul');
                                    preview.appendChild(ul);
                                    var li = document.createElement('li');
                                    li.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                    ul.appendChild(li);
                                    var small = document.createElement('small');
                                    li.appendChild(small);
                                    small.appendChild(document.createTextNode("Singular:"));
                                    var br = document.createElement('br');
                                    li.appendChild(br);
                                    var myspan = document.createElement('span');
                                    li.appendChild(myspan);
                                    //preview.innerText = translatedText;
                                    myspan.appendChild(document.createTextNode(translatedText));
                                }
                                else {
                                    //console.debug("is pure single");
                                    preview.innerText = translatedText;
                                    current.innerText = 'transFill';
                                    current.value = 'transFill';
                                }
                            }
                            else {
                                // if it is as single with local then we need also update the preview
                                //console.debug("is pure single no span missing");
                                preview.innerText = translatedText;
                                current.innerText = 'transFill';
                                current.value = 'transFill';
                            }
                        }
                        if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                            document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = 'visible';
                        }
                    }
                    // 10-04-2021 PSS added translation of plural into translatePage

                    let f = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                    if (f != null) {
                        checkplural = f.querySelector(`#editor-${row} .source-string__plural span.original`);        
                        if (checkplural != null) {
                            transtype = "plural";
                            let plural = checkplural.innerText;
                            //console.debug("translatePage checkplural:", plural);
                            let pretrans = await findTransline(plural, destlang);
                            //console.debug('translatePage pretranslate result:', pretrans);
                            if (pretrans == "notFound") {
                                
                                if (transsel == "google") {
                                    plural_line = "2";
                                    translatedText = googleTranslate(plural, destlang, f, apikey, replacePreVerb, row, transtype, plural_line);
                                    //console.debug('translatePage checkplural google:', translatedText);
                                }
                                else if (transsel == "deepl") {
                                    deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, row, transtype);
                                   // console.debug('translatePage checkplural deepl:', translatedText);
                                }
                                else if (transsel == "microsoft") {
                                    microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, row, transtype);
                                   // console.debug('translatePage checkplural microsoft:', translatedText);
                                }

                            }
                            else {
                                
                                // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
                                // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
                                let translatedText = pretrans;
                                // Plural second line
                                console.debug("current in plural:", current.innerText);
                                if (current.innerText == 'current') {
                                   //current.innerText = 'transFill';
                                   // current.value = 'transFill';
                                    let rowId = row.split('-')[0];
                                    textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");                                  
                                    textareaElem1.innerText = translatedText;
                                    textareaElem1.value = translatedText;
                                    // Populate the second line in preview Plural
                                    if (prevstate != 'current') {
                                        let preview = document.querySelector('#preview-' + row + ' td.translation');
                                        if (preview != null) {
                                            preview.innerText = translatedText;
                                            preview.value = translatedText;
                                            
                                        }
                                    }

                                }
                                else {
                                    // console.debug('translatedpage plural:', translatedText);
                                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                                    let previewElem = document.querySelector('#preview-' + row + ' li:nth-of-type(2) span.translation-text');
                                    textareaElem1.innerText = translatedText;
                                    textareaElem1.value = translatedText;

                                    // When it is a pretranslated string with a new record the preview textfield needs to be populated
                                    let preview1 = document.querySelector('#preview-' + row + ' td.translation');
                                    var ul1 = document.createElement('ul');
                                    preview1.appendChild(ul1);
                                    var li2 = document.createElement('li');
                                    ul1.appendChild(li2);
                                    li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: 0; border-bottom: none';
                                    var small = document.createElement('small');
                                    li2.appendChild(small);
                                    small.appendChild(document.createTextNode("Plural:"));
                                    var br = document.createElement('br');
                                    li2.appendChild(br);
                                    var span = document.createElement('span');
                                    span.className = "translation-text";
                                    li2.appendChild(span);
                                    span.appendChild(document.createTextNode(translatedText));
                                    // These values need to be set to be able to save the plurals
                                    current.innerText = 'transFill';
                                    current.value = 'transFill';
                                }
                                
                                validateEntry(destlang, textareaElem1,"","",row);
                              //  console.debug("translatedEntry plural finished");
                            }

                        }
                    }
                }
                else {
                    // This is when urls/plugin/theme names are present
                    let translatedText = original;
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    let preview = document.querySelector('#preview-' + row + ' td.translation');
                    if (preview != null) {
                        preview.innerText = translatedText;
                        preview.value = translatedText;
                        // We need to alter the status otherwise the save button does not work
                        current.innerText = 'transFill';
                        current.value = 'transFill';
                        console.debug('translatePage No need to translate copy the original', original);
                    }
                }
            }

            // Translation completed
            let translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " translated";
     }
     else {
            alert("Your pretranslate replace verbs are not populated add at least on line!!");
            // 07-07-2021 Fix for issue #98
            translateButton = document.querySelector(".paging a.translation-filler-button");
            translateButton.className += " after_error";
            }
    }
    else {
        alert("Your postreplace verbs are not populated add at least on line!!");
        // 07-07-2021 Fix for issue #98
        translateButton = document.querySelector(".paging a.translation-filler-button");
        translateButton.className += " after_error";
    }
}


async function translateEntry(rowId, apikey, apikeyDeepl, apikeyMicrosoft, transsel, destlang, postTranslationReplace, preTranslationReplace) {
    //console.debug('translateEntry started!');
    let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
    //console.debug('translateButton entry:', translateButton);
    translateButton.className += " started";
    //16 - 06 - 2021 PSS fixed this function to prevent double buttons issue #74
    // 07-07-2021 PSS need to determine if current record
    let g = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = g.querySelector('span.panel-header__bubble');
    //console.debug('status plural:', current.innerText);
    //console.debug('plural rowId:', rowId);
    var transtype = "single";
    var plural_line = "1";
    // 15-05-2021 PSS added fix for issue #73
    if (postTranslationReplace.length != 0) {
        if (preTranslationReplace != 0) {
           setPostTranslationReplace(postTranslationReplace);
           setPreTranslationReplace(preTranslationReplace);
           //console.debug("Microsoft:" , apikeyMicrosoft , "Transsel:" , transsel,"RowId:",rowId);

          let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
          //console.debug('after document querySelector:', e);
          let original = e.querySelector("span.original-raw").innerText;
          // PSS 09-03-2021 added check to see if we need to translate
          let toTranslate = true;
          // Check if the comment is present, if not then it will block the request for the details name etc.   
          let element = e.querySelector('.source-details__comment');
          console.debug('checkComment started element', element);
          if (element != null) {
             // Fetch the comment with name
            let comment = e.querySelector('#editor-' + rowId + ' .source-details__comment p').innerText;
              toTranslate = checkComments(comment.trim());
           }
          if (toTranslate) {
              let pretrans = await findTransline(original,destlang);
              //let pretrans = await pretranslate(original);
              console.debug('pretranslate result:',pretrans);
              if (pretrans == "notFound") {
                 //transtype = 'single';
                  if (transsel == "google") {

                     googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype,plural_line);
                  }
                  else if (transsel == "deepl") {
                      deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype);
                      console.debug('translatedEntry deepl translation:', translatedText);
                  }
                  else if (transsel == "microsoft") {
                     microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype);
                     console.debug('translatedEntry microsoft translation:', translatedText);
                  }
                  document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'hide';
              }
              else {
                    console.debug('Pretranslated:', rowId,pretrans);
                    //document.getElementById('translate-' + rowId).checked = true;
                    //document.getElementById('translate-' + rowId).disabled = true;
                          
                    let translatedText = pretrans;
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    //validateEntry(language, textareaElem);
                 

                    let zoeken = "translate-" + rowId + '"-translocal-entry-local-button';  
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
                  
                    }
          }
          else {
               let translatedText = original;
               let textareaElem = e.querySelector("textarea.foreign-text");
               textareaElem.innerText = translatedText;
               textareaElem.value = translatedText;
               current.innerText = 'transFill';
               current.value = 'transFill';
               console.debug('No need to translate copy the original', original);
               }
          let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
          let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original`);
          console.debug('checkplural started element', checkplural);
          if (checkplural != null) {
              let plural = checkplural.innerText;
              console.debug('existing text plural:', plural);
             var transtype = "plural";
             let pretrans = await findTransline(plural, destlang);
             //let pretrans = await pretranslate(original);
             console.debug('pretranslate result plural:', pretrans);
              console.debug('checkplural content element', plural);
              plural_line = "2";
              if (pretrans == "notFound") {
                  if (transsel == "google") {
                      translatedText = googleTranslate(plural, destlang, f, apikey, replacePreVerb, rowId, transtype,plural_line);
                  }
                  else if (transsel == "deepl") {
                      translatedText = deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype);
                      console.debug('translatedEntry deepl translation:', translatedText);
                  }
                  else if (transsel == "microsoft") {
                      translatedText = microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype);
                      console.debug('translatedEntry microsoft translation:', translatedText);
                  }
              }
              else {
                  let translatedText = pretrans;
                  console.debug('translatedEntry plural:', translatedText);
                  // 21-06-2021 PSS fixed not populating plural issue #86
                 
                  // 07-07-2021 PSS fixed problem with populating when status is current
                  if (current != 'null') {
                      let row = rowId.split('-')[0];
                      console.debug('rowId plural:',row)
                      textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                      textareaElem1.innerText = translatedText;
                      textareaElem1.value = translatedText;
                      console.debug('existing plural text:', translatedText);
                  }
                  else {
                      textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                      console.debug("translateEntry plural:", textareaElem1);
                      textareaElem1.innerText = translatedText;
                      console.debug("plural newtext:", textareaElem1.innerText);
                      textareaElem1.value = translatedText;
                      document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
                      console.debug("translatedEntry plural finished");


                  }
              }
        }
        else {
               console.debug('checkplural null');
           }
       
           // Translation completed
           let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            translateButton.className += " translated";
            
        }
        else {
            alert("Your pretranslate replace verbs are not populated add at least on line!!");
            let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
            translateButton.className += " translated_error";
        }
    }
    else {
        alert("Your postreplace verbs are not populated add at least on line!!");
        let translateButton = document.querySelector(`#translate-${rowId}-translation-entry-my-button`);
        translateButton.className += " translated_error";
    }
}

function deepLTranslate(original, destlang, e, apikeyDeepl, preverbs, rowId, transtype) {
    let originalPreProcessed = preProcessOriginal(original, preverbs, 'deepl');
    //console.debug('deeplTranslate result of preProcessOriginal:', originalPreProcessed);
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "text";
    }
    else {
        var trntype = "html";
    }
   
    //console.debug("deepLTranslate format type", trntype);
    translatedText = sendAPIRequestDeepl(e, destlang, apikeyDeepl, original, originalPreProcessed, rowId, transtype); 

   // console.debug('result deepl:', translatedText);
    //translatedText = original;
    //textareaElem = e.querySelector("textarea.foreign-text");
    //textareaElem.innerText = translatedText;
}

function microsoftTranslate(original, destlang, e, apikeyMicrosoft, preverbs, rowId, transtype) {
    let originalPreProcessed = preProcessOriginal(original, preverbs, 'microsoft');
    console.debug('microsoftTranslate result of preProcessOriginal:', originalPreProcessed);
    //var myRe = |(\</?([a-zA-Z]+[1-6]?)(\s[^>]*)?(\s?/)?\>|)/gm;
    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "plain";
    }
    else {
        var trntype = "html";
    }

    console.debug("microsoft Translate format type", trntype);
    translatedText = sendAPIRequestMicrosoft(e, destlang, apikeyMicrosoft, original, originalPreProcessed, rowId, transtype,trntype);

    console.debug('result Microsoft:', translatedText);
    //translatedText = original;
    //textareaElem = e.querySelector("textarea.foreign-text");
    //textareaElem.innerText = translatedText;  
}
function googleTranslate(original, destlang, e, apikey, preverbs,rowId,transtype,plural_line) {
    let originalPreProcessed = preProcessOriginal(original, preverbs,'google');

    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "text";
    }
    else {
        var trntype = "html";
    }
    console.debug("format type", trntype);

    let requestBody = {
        "q": originalPreProcessed,
        "source": "en",
        "target": destlang,
        "format": trntype
    };
    console.debug("request body", requestBody);
    //sendAPIRequest(e, destlang, apikey, requestBody, original);
    translatedText=sendAPIRequest(e, destlang, apikey, requestBody, original, originalPreProcessed,rowId,transtype,plural_line);
    console.debug('after sendAPIRequest:',translatedText,transtype,plural_line);
}

function sendAPIRequestDeepl(e, language, apikeyDeepl, original, originalPreProcessed, rowId, transtype) {
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    //console.debug("h in deepl request:", h);
    if (h != null) {
        var current = h.querySelector('span.panel-header__bubble');
    }

   // console.debug("sendAPIRequestDeepl status:", current,rowId);
   // console.debug('sendAPIreQuest original_line Deepl:', originalPreProcessed);
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        
        //console.debug("Deepl translation:", this.response);
        responseObj = this.response;
        
       // console.debug("Deepl ready state:", this.readyState);
        if (this.readyState == 4) {
            //responseObj = xhttp.response;
            responseObj = this.response;
           // alert(responseObj.translations[0].text);
            //console.debug("responsOj:", reponseObj);
            translatedText = responseObj.translations[0].text;
            //console.debug("inside:", translatedText);
            //let responseObj = JSON.parse(this.translations);
            //let translatedText = responseObj.data.translations[0].translatedText;
            //console.debug('sendAPIRequest result before postProces:', translatedText);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed,"deepl");
            //console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            if (transtype == "single") {
                textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                // PSS 13-04-2021 added populating the preview field issue #64
                //console.debug('Text preview:', previewElem, rowId);
                let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                if (preview != null) {
                    preview.innerText = translatedText;
                }
                // PSS 29-03-2021 Added populating the value of the property to retranslate            
                textareaElem.value = translatedText;
                if (typeof current != 'undefined') {
                    //current.innerText = 'transFill';
                    //current.value = 'transFill';
                }
               
                //PSS 25-03-2021 Fixed problem with description box issue #13
                textareaElem.style.height = 'auto';
                textareaElem.style.height = textareaElem.scrollHeight + 'px';
                // PSS 13-04-2021 removed the line below as it clears the content if you edit after use of translate button
                // textareaElem.style.overflow = 'auto' ;
            }
            else {
                // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != 'null' && current == 'current' && current =='waiting') {
                    let row = rowId.split('-')[0];
                    console.debug('rowId plural:', row)
                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    if (current == 'untranslated') {
                        current.innerText = 'transFill';
                        current.value = 'transFill';
                    }
                   // console.debug('existing plural text:', translatedText);
                }
                else {
                   // console.debug('Row plural:', rowId);
                    textareaElem1 = e.querySelector("textarea#translation_" + rowId + "_1");
                    textareaElem1.innerText = translatedText;
                    console.debug("plural newtext:", textareaElem1.innerText);
                    textareaElem1.value = translatedText;
                    if (current == 'untranslated') {
                        current.innerText = 'transFill';
                        current.value = 'transFill';
                    }
                    //let g = document.querySelector('td.translation');
                    let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                    //console.debug("current preview:", preview.innerText);
                    // 21-06-2021 PSS added a dotted line into the preview cell if plural is present #88
                    var separator1 = document.createElement('div');
                    separator1.setAttribute('id', 'translator_sep1');
                    separator1.style.cssText = 'width:100%; display:block; height:1px; border-bottom: 1px dotted grey;';
                    separator1.appendChild(document.createTextNode(""));
                    preview.appendChild(separator1);
                    var element1 = document.createElement('div');
                    element1.setAttribute('id', 'translator_div1');
                    //element1.style.cssText = 'padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey';
                    element1.appendChild(document.createTextNode("\n" + translatedText));
                    preview.appendChild(element1);
                }
            }
            validateEntry(language, textareaElem,"","",rowId);

        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            if (this.readyState == 3 && this.status == 400) {
                alert("Error in translation received status 400 with readyState == 3, probably language not supported.\n\nClick on OK until all records are processed!!!");
            }
      //      console.debug("issue with licence:", this.status);
            if (this.readyState == 4 && this.status == 400) {
               alert("Error in translation received status 400, maybe a license problem.\n\nClick on OK until all records are processed!!!");
            }
            else if (this.readyState == 2 && this.status == 403) {
                alert("Error in translation received status 403, authorisation refused.\n\nClick on OK until all records are processed!!!");
            }
            
            else {
                // 18-06-2021 PSS fixed an alert at the wrong time issue #83
                // console.debug("Status received:", this.status,this.readyState);
               // alert("Error in translation receive code:", this.status);
                }
       }
    };
    
    
    //let xhttp = new XMLHttpRequest();
    language = language.toUpperCase();
    //console.debug("Target_lang:", language);
    xhttp.open('POST', "https://api.deepl.com/v2/translate?auth_key=" + apikeyDeepl + "&text=" + originalPreProcessed + "&source_lang=EN" + "&target_lang=" + language + "&preserve_formatting=1&split_sentences=1&tag_handling=xml&ignore_tags=x&formality=less&split_sentences=nonewlines");
    xhttp.responseType = 'json';
    xhttp.send();
   
    xhttp.onload = function () {
       let responseObj = xhttp.response;
    };

}

function sendAPIRequestMicrosoft(e, language, apikeyMicrosoft, original, originalPreProcessed, rowId, transtype, trntype) {
    // PSS 09-07-2021 additional fix for issue #102 plural not updated
    let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = h.querySelector('span.panel-header__bubble');
   // console.debug("sendAPIRequestMicrosoft status:", current);
    
    //console.debug('plural rowId:', rowId);
    //console.debug('sendAPIreQuest original_line Microsoft:', original); 
    //console.debug("format type", trntype);
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        // 24-06-2021 PSS fixed an error in Chrome with type null message
        result = this.response;
        if (result != null) {
            console.debug("Microsoft translation response:", this.response);
            restrans = this.response;
            let responseObj = this.response.error;
            console.debug("Response error object:", responseObj);
            if (typeof responseObj != 'undefined') {
                myfault = responseObj.code;
                //console.debug("Microsoft myfault:", myfault);
            }
            else {
                var myfault = 0;
                //console.debug("Microsoft myfault:", myfault);
            };
        }
        else {
            myfault = 'noResponse';
        }
        //console.debug("Microsoft readyState:", this.readyState);
        if (this.readyState == 4 && myfault == 0) { 
            //console.debug('Restrans:', restrans);
            translatedText = restrans[0].translations[0].text;
            //console.debug('sendAPIRequest result before postProces:', translatedText);
            // Currently for postProcessTranslation  "deepl" is set, this might need to be changed!!!
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "deepl");
            //console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            if (transtype == "single") {
                textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                // PSS 13-04-2021 added populating the preview field issue #64
                let g = document.querySelector('td.translation');
                let previewElem = g.innerText;
                console.debug('Text preview:', previewElem, rowId);
                let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                preview.innerText = translatedText;
                // PSS 29-03-2021 Added populating the value of the property to retranslate            
                textareaElem.value = translatedText;
                current.innerText = 'transFill';
                current.value = 'transFill';
                //PSS 25-03-2021 Fixed problem with description box issue #13
                textareaElem.style.height = 'auto';
                textareaElem.style.height = textareaElem.scrollHeight + 'px';
                // PSS 13-04-2021 removed the line below as it clears the content if you edit after use of translate button
                // textareaElem.style.overflow = 'auto' ;
            }
            else {
                // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != 'null' && current == 'current' && current == 'waiting') {
                    let row = rowId.split('-')[0];
                    console.debug('rowId plural:', row)
                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    console.debug('existing plural text:', translatedText);
                    //current.innerText = 'transFill';
                    //current.value = 'transFill';
                }
                else {
                    console.debug('Row plural:', rowId);
                    let newrow = rowId.split('-')[1];
                    if (typeof newrow == 'undefined') {
                        let row = rowId.split('-')[0];
                        textareaElem1 = e.querySelector("textarea#translation_" + row + "_1");
                        console.debug('undefined!');
                    }
                    else {
                        let row = rowId.split('-')[0];
                        textareaElem1 = e.querySelector("textarea#translation_" + row + "_1");
                        console.debug('not undefined!',row + "_1");
                    }
                    console.debug("textareaElem1:", textareaElem1);
                    textareaElem1.innerText = translatedText;
                    console.debug("plural newtext:", textareaElem1.innerText);
                    textareaElem1.value = translatedText;
                    //current.innerText = 'transFill';
                    //current.value = 'transFill';
                    let g = document.querySelector('td.translation');
                    let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                    console.debug("current preview:", preview.innerText);
                    var separator1 = document.createElement('div');
                    separator1.setAttribute('id', 'translator_sep1');
                    separator1.style.cssText = 'width:100%; display:block; height:1px; border-bottom: 1px dotted grey;';
                    separator1.appendChild(document.createTextNode(""));
                    preview.appendChild(separator1);
                    var element1 = document.createElement('div');
                    element1.setAttribute('id', 'translator_div1');
                    //element1.style.cssText = 'padding-left:10px; width:100%; display:block; word-break: break-word; background:lightgrey';
                    element1.appendChild(document.createTextNode("\n" + translatedText));
                    preview.appendChild(element1);
                }
            }
            validateEntry(language, textareaElem,"","",rowId);

        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            
            if (this.readyState == 4 && myfault == 400000) {
                alert("Error in translation received status 400000, One of the request inputs is not valid.\n\nClick on OK until all records are processed!!!");
            }
            
             else if (this.readyState == 4 && myfault == 400036) {
                alert("Error in translation received status 400036, The target language is not valid.\n\nClick on OK until all records are processed!!!");
            }
            else if (this.readyState == 4 && myfault == 400074) {
                alert("Error in translation received status 400074, The body of the request is not valid JSON.\n\nClick on OK until all records are processed!!!");
                                }
            else if (this.readyState == 4 && myfault == 403000) {
                alert("Error in translation received status 403, authorisation refused.\n\nClick on OK until all records are processed!!!");
            }
            else if (this.readyState = 4 && myfault == 401000) {
                alert("Error in translation received status 401000, The request is not authorized because credentials are missing or invalid.\n\nClick on OK until all records are processed!!!");
            }
        }
    };


    //let xhttp = new XMLHttpRequest();
    let requestBody = [
        {
         'text': originalPreProcessed
        }
        ];

    console.debug("apikey:", apikeyMicrosoft, "textType:",trntype);
    language = language.toUpperCase();
    translen = originalPreProcessed.length;
    xhttp.open('POST', "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&textType=" + trntype + "&from=en&to=" + language);
    xhttp.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhttp.setRequestHeader('Ocp-Apim-Subscription-Key', apikeyMicrosoft);
    //xhttp.setRequestHeader('Content-Length', translen);
    xhttp.responseType = 'json';
    xhttp.send(JSON.stringify(requestBody));
}


function sendAPIRequest(e, language, apikey, requestBody, original, originalPreProcessed,rowId,transtype,plural_line) {
    console.debug('sendAPIRequest original_line Google:', originalPreProcessed);
    let h = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = h.querySelector('span.panel-header__bubble');
    var prevstate = current.innerText;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let responseObj = JSON.parse(this.responseText);
            let translatedText = responseObj.data.translations[0].translatedText;
            console.debug('sendAPIRequest result before postProces:', translatedText);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "google");
            console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            console.debug('sendAPIRequest transtype:', transtype);
            if (transtype == "single"){
               textareaElem = e.querySelector("textarea.foreign-text");
               textareaElem.innerText = translatedText;
                // Thise ones are for already populated previewlines
                // PSS 13-04-2021 added populating the preview field issue #64
                
                if (prevstate == "current || transFill") {
                    let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) span.translation-text');
                    if (previewElem != null ){
                        previewElem.innerText = translatedText;
                    }
                    else {
                        let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                        console.debug('sentAPIrequest single:');
                        preview.innerText = translatedText;
                    }
                }
                else {
                    // This is the singular preview population
                    let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                    let spanmissing = preview.querySelector(" span.missing");
                    if (spanmissing != null) {
                        if (transtype != "single") {
                            // Remove the text double-click to add and add the details if plural first line
                            spanmissing.remove();
                            var ul = document.createElement('ul');
                            preview.appendChild(ul);
                            var li = document.createElement('li');
                            li.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                            ul.appendChild(li);
                            var small = document.createElement('small');
                            li.appendChild(small);
                            small.appendChild(document.createTextNode("Singular:"));
                            var br = document.createElement('br');
                            li.appendChild(br);
                            var myspan = document.createElement('span');
                            li.appendChild(myspan);
                            myspan.appendChild(document.createTextNode(translatedText));
                        }
                        else {

                           // console.debug("is pure single and transtype is plural", translatedText);
                            preview.innerText = translatedText;
                            console.debug("sentApi current:", current.innerText);
                            current.innerText = 'transFill';
                            current.value = 'transFill';
                        }
                    }
                    else {
                        // this is the pure single when already translated
                        //console.debug("is pure single", translatedText);
                        preview.innerText = translatedText;
                        //console.debug("sentApi current:", current.innerText);
                        current.innerText = 'transFill';
                        current.value = 'transFill';
                    }
                }

               // PSS 29-03-2021 Added populating the value of the property to retranslate            
                textareaElem.value = translatedText;
                //current.innerText = 'transFill';
                //current.value = 'transFill';
               //PSS 25-03-2021 Fixed problem with description box issue #13
               textareaElem.style.height = 'auto';
               textareaElem.style.height = textareaElem.scrollHeight + 'px'; 
               // PSS 13-04-2021 removed the line below as it clears the content if you edit after use of translate button
              // textareaElem.style.overflow = 'auto' ;
            }
            else {
                 // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != 'null' && current == 'current' && current == 'waiting') {
                    let rowId = rowId.split('-')[0];
                    console.debug('rowId plural:', row)
                    textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                    textareaElem1.innerText = translatedText;
                    textareaElem1.value = translatedText;
                    console.debug('existing plural text:', translatedText);
                }
                else {
                    
                    console.debug('Row plural:', rowId);
                    let newrow = rowId.split('-')[1];
                    if (typeof newrow == 'undefined') {
                        let row = rowId.split('-')[0];
                        textareaElem1 = e.querySelector("textarea#translation_" + row + "_1");
                        console.debug('newrow = undefined!');
                        
                       }
                    else {
                        let row = rowId.split('-')[0];
                        textareaElem1 = e.querySelector("textarea#translation_" + row + "_1");
                        console.debug('newrow = not undefined!', row + "_1");
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                    }
                    console.debug("previous state", prevstate);
                    if (plural_line == 1 && prevstate !="") {
                        let row = rowId.split('-')[0];
                        textareaElem1 = e.querySelector("textarea#translation_" + row + "_0")
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                    }
                    if (plural_line == 2) {
                        let row = rowId.split('-')[0];
                        textareaElem1 = e.querySelector("textarea#translation_" + row + "_1")
                        textareaElem1.innerText = translatedText;
                        textareaElem1.value = translatedText;
                    }
                    // These lines below are called when a plural has no pretranslation
                    // We need to make a difference between the first plural line and the second one
                    let preview3 = document.querySelector('#preview-' + rowId + ' td.translation');
                    if (plural_line == 1) {
                        let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) span.translation-text');
                        if (previewElem == null) {
                            var ul = document.createElement('ul');
                            var li = document.createElement('li');
                            li.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                            ul.appendChild(li);
                            var small = document.createElement('small');
                            li.appendChild(small);
                            small.appendChild(document.createTextNode("Singular:"));
                            var br = document.createElement('br');
                            li.appendChild(br);
                            var span = document.createElement('span');
                            span.className = "translation-text";
                            li.appendChild(span);
                            preview3.appendChild(ul);
                            span.appendChild(document.createTextNode(translatedText));
                        }
                    }
                    if (plural_line == 2) {
                        let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) span.translation-text');
                        if (previewElem == null) {
                            var ul = document.createElement('ul');
                            var li = document.createElement('li');
                            li.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: 0; border-bottom: none';
                            ul.appendChild(li);
                            var small = document.createElement('small');
                            li.appendChild(small);
                            small.appendChild(document.createTextNode("Plural:"));
                            var br = document.createElement('br');
                            li.appendChild(br);
                            var span = document.createElement('span');
                            span.className = "translation-text";
                            li.appendChild(span);
                            preview3.appendChild(ul);
                            span.appendChild(document.createTextNode(translatedText));
                        }
                    }
                    // 18-08-2021 PSS changed populating for Plural to li, it is the second line
                    console.debug("prevstate in plural:", prevstate);
                    if (prevstate == "current" || "transFill") {
                        
                        let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) span.translation-text');
                        if (previewElem != null) {
                            previewElem.innerText = translatedText;
                        }
                        else {
                            // plural line is not populated in preview so add it
                            //if a plural translation misses the plural, then the preview is not updated #119

                            let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                            let wpgptlabel = preview.querySelector(" div.wpgpt-warning-labels");
                            if (wpgptlabel != null) {
                                wpgptlabel.remove();
                            }
                            
                            let spanmissing = preview.querySelector(" span.missing");
                            if (spanmissing != null) {
                                spanmissing.remove();
                            }
                            if (current.innerText == "single") {
                                preview.appendChild(document.createTextNode(translatedText));
                            }
                        }
                    }
                    else {
                        if (prevstate == "untranslated") {
                            
                            let preview1 = document.querySelector('#preview-' + rowId + ' td.translation');
                           
                            console.debug('preview untranslated', preview1);
                            var ul1 = document.createElement('ul');
                            preview1.appendChild(ul1);
                            var li2 = document.createElement('li');
                            ul1.appendChild(li2);
                            li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: 0; border-bottom: none';
                            var small = document.createElement('small');
                            li2.appendChild(small);
                            small.appendChild(document.createTextNode("Plural:"));
                            var br = document.createElement('br');
                            li2.appendChild(br);
                            var span = document.createElement('span');
                            span.className = "translation-text";
                            li2.appendChild(span);
                            span.appendChild(document.createTextNode(translatedText));

                        }
                        else {

                            let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                            var ul2 = document.createElement('ul');
                            preview.appendChild(ul);
                            var li2 = document.createElement('li');
                            ul2.appendChild(li2);
                            li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: 0; border-bottom: none';
                            var small = document.createElement('small');
                            li2.appendChild(small);
                            small.appendChild(document.createTextNode("Plural:"));
                            var br = document.createElement('br');
                            li2.appendChild(br);
                            var span = document.createElement('span');
                            span.className = "translation-text";
                            li2.appendChild(span);
                            span.appendChild(document.createTextNode(translatedText));
                        }
                    }
                }
            }
            // The line below is necessary to update the save button on the left in the panel
            current.innerText = 'transFill';
            current.value = 'transFill';
            
            if (typeof textareaElem1 != 'undefined') {
                validateEntry(language, textareaElem1, "", "", rowId);
            }
            else {
                validateEntry(language, textareaElem, "", "", rowId);
            }
            
            
        }
        // PSS 04-03-2021 added check on result to prevent nothing happening when key is wrong
        else {
            if (this.readyState == 4 && this.status == 400) {
                alert("Error in translation received status 400, maybe a license problem\n\nClick on OK until all records are processed!!!");
            }
        }
    };
    xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(JSON.stringify(requestBody));
}

// PSS 01-30-2021 added this to prevent wrong replacement of searches
String.prototype.replaceAt = function (str, word, newWord) {
    console.debug("replaceAt:", '"' + word + '"');
    console.debug("replaceAt:", '"' + newWord + '"');
    if (word[0] === word[0].toUpperCase()) {
        newWord = newWord[0].toUpperCase() + newWord.slice(1);
    }
    console.debug("replaceAt:", str.replace(word, newWord));
    return str.replace(word, newWord);
};

// Function to check if start of line is capital
function isStartsWithUpperCase(str) {
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

const placeHolderRegex = new RegExp(/%(\d{1,2})?\$?[sdl]{1}|&#\d{1,4};|&\w{2,6};|%\w*%/gi);
function preProcessOriginal(original, preverbs,translator) {
    // prereplverb contains the verbs to replace before translation
    for (let i = 0; i < preverbs.length; i++) {
        original = original.replaceAll(preverbs[i][0], preverbs[i][1]);
    }
    // 15-05-2021 PSS added check for translator
    if (translator == 'google') {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            original = original.replace(match[0], `[${index}]`);

            index++;
        }
        if (index == 0) {
           // console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    else if (translator == 'deepl') {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            original = original.replace(match[0], `<x>${index}</x>`);

            index++;
        }
        if (index == 0) {
           // console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    else if (translator == 'microsoft') {
        // const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        //console.debug("We do nothing");
        //for (const match of matches) {
        //   original = original.replace(match[0], `<x>${index}</x>`);

        //  index++;
        //}
        if (index == 0) {
          //  console.debug("preProcessOriginal no placeholders found index === 0 ");
        }
    }
    //console.debug("After pre-processing:", original);
    return original;
}


function postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, translator) {
    translatedText = processPlaceholderSpaces(originalPreProcessed, translatedText);
    //console.debug("after processPLaceholderSpaces",translatedText);
    // 09-05-2021 PSS fixed issue  #67 a problem where Google adds two blanks within the placeholder
    translatedText = translatedText.replaceAll('  ]', ']');
                                                  
    // This section replaces the placeholders so they become html entities
    if (translator == "google") {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            translatedText = translatedText.replaceAll(`[${index}]`, match[0]);
            index++;
        }
    }
    else if (translator == "deepl") {
        const matches = original.matchAll(placeHolderRegex);
        let index = 0;
        for (const match of matches) {
            translatedText = translatedText.replace(`<x>${index}</x>`, match[0]);
            index++;
        }
        // 21-06-2021 PSS added debug statement to find an issue with replacing placeholders
        //console.debug('Deepl after removing placeholders:', translatedText);
    }
    // replverb contains the verbs to replace
    for (let i = 0; i < replaceVerb.length; i++) {
        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);
    }
    //console.debug("after replace verbs",translatedText);
    // Make translation to start with same case (upper/lower) as the original.
    if (isStartsWithUpperCase(original)) {
        if (!isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toUpperCase() + translatedText.slice(1);
            //console.debug('Applied upper case: ', translatedText);
        }
    }
    else {
        if (isStartsWithUpperCase(translatedText)) {
            translatedText = translatedText[0].toLowerCase() + translatedText.slice(1);
            console.debug('Applied lower case: ', translatedText);
        }
    }
    
return translatedText;
}

// PSS 04-03-2021 Completely rewritten the processPlaceholderSpace function, because wrong replacements were made when removing blanks
function processPlaceholderSpaces(originalPreProcessed, translatedText) {
    if (originalPreProcessed === "") {
        console.debug('preprocessed empty');
    }
    //console.debug("processPlaceholderSpaces not translated", originalPreProcessed);
    //console.debug("processPlaceholderSpaces translated", translatedText);

    var placedictorg = {};
    var placedicttrans = {};
    var found = 0;
    var counter = 0;
    while (counter < 20) {
        // PSS 03-03-2021 find if the placeholder is present and at which position
        found = originalPreProcessed.search("[" + counter + "]");
       // console.debug('processPlaceholderSpaces found start:', found, " ", '[' + counter + ']');
        if (found === -1) {
            break;
        }
        else {
            // PSS if at beginning of the line we cannot have a blank before
            if (found === 1) {
                part = originalPreProcessed.substring(found - 1, found + 3);
                placedictorg[counter] = part;
            }
            else if (found === (originalPreProcessed.length) - 3) {
                // PSS if at end of line it is possible that no blank is behind
               // console.debug('found at end of line!!', found);
                part = originalPreProcessed.substring(found - 2, found + 2);
                placedictorg[counter] = part;
            }
            else {
                // PSS we are in the middle
                part = originalPreProcessed.substring(found - 2, found + 3);
                placedictorg[counter] = part;
            }
            //console.debug("processPlaceholderSpaces at matching in original line:", '"' + part + '"');
        }
        counter++;
    }
    var lengteorg = Object.keys(placedictorg).length;
    if (lengteorg > 0) {
        counter = 0;
        while (counter < 20) {
            found = translatedText.search("[" + counter + "]");
            //console.debug('processPlaceholderSpaces found in translatedText start:', found, " ", '[' + counter + ']');
            if (found === -1) {
                break;
            }
            else {
                // PSS if at beginning of the line we cannot have a blank before
                if (found === 1) {
                    part = translatedText.substring(found - 1, found + 3);
                    placedicttrans[counter] = part;
                }
                else if (found === (translatedText.length) - 3) {
                    // PSS if at end of line it is possible that no blank is behind
                    //console.debug('found at end of line!!', found);
                    // 24-03-2021 find typo was placedictorg instead of placedicttrans
                    part = translatedText.substring(found - 2, found + 2);
                    //console.debug('found string at end of line:',part);
                    placedicttrans[counter] = part;
                }
                else {
                    // PSS we are in the middle	
                    part = translatedText.substring(found - 2, found + 3);
                    placedicttrans[counter] = part;
                }
                //console.debug("processPlaceholderSpaces at matching in translated line:", '"' + part + '"');
            }
            counter++;
        }
        counter = 0;
        // PSS here we loop through the found placeholders to check if a blank is not present or to much
        while (counter < (Object.keys(placedicttrans).length)) {
           // console.debug("processPlaceholderSpaces found it in original:", counter, '"' + placedictorg[counter] + '"');
           // console.debug("processPlaceholderSpaces found it in original:", originalPreProcessed);
           // console.debug("processPlaceholderSpaces found it in trans:", counter, '"' + placedicttrans[counter] + '"');
           // console.debug("processPlaceholderSpaces found it in trans", translatedText);
            orgval = placedictorg[counter];
            let transval = placedicttrans[counter];
            if (placedictorg[counter] === placedicttrans[counter]) {
                //console.debug('processPlaceholderSpaces values are equal!');
            }
            else {
               // console.debug('processPlaceholderSpaces values are not equal!:', '"' + placedictorg[counter] + '"', " " + '"' + placedicttrans[counter] + '"');
               // console.debug('orgval', '"' + orgval + '"');
                if (orgval.startsWith(" ")) {
                   // console.debug("processPlaceholderSpaces in org blank before!!!");
                    if (!(transval.startsWith(" "))) {
                        // 24-03-2021 PSS found another problem when the placeholder is at the start of the line
                        found = translatedText.search("[" + counter + "]");
                       // console.debug('processPlaceholderSpaces found at :', found);
                        if (found != 1){
                          // console.debug("processPlaceholderSpaces in trans no blank before!!!");
                           repl = transval.substr(0, 1) + " " + transval.substr(1,);
                           translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
                else {
                    transval = placedicttrans[counter];
                    repl = transval.substr(1,);
                   // console.debug("processPlaceholderSpaces no blank before in org!");
                    if (transval.startsWith(" ")) {
                      //  console.debug("processPlaceholderSpaces apparently blank in front in trans!!!");
                        translatedText = translatedText.replaceAt(translatedText, transval, repl);
                       // console.debug("processPlaceholderSpaces blank in front removed in trans", translatedText);
                    }

                }
                if (!(orgval.endsWith(" "))) {
                    //console.debug("processPlaceholderSpaces apparently in org no blank behind!!!");
                   // console.debug('processPlaceholderSpaces values are not equal!:', '"' + orgval + '"', " ", '"' + transval + '"');
                    if (transval.endsWith(" ")) {
                       // console.debug("processPlaceholderSpaces in trans blank behind!!!");
                        //console.debug('processPlaceholderSpaces values are not equal!:', orgval, transval);
                        // 11-03 PSS changed this to prevent removing the blank if the translated is not at the end of the line
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                        //23-03-2021 PSS added another improvement to the end of the line 
                        foundorg= originalPreProcessed.search("[" + counter + "]");
                      //  console.debug('found at:', found);
                        if (found != (originalPreProcessed.length) - 2) {
                            //if (foundorg===found){
                               repl = transval.substring(0, transval.length - 1);
                               translatedText = translatedText.replaceAt(translatedText, transval, repl);
                             //  console.debug("processPlaceholderSpaces blank in behind removed in trans", translatedText);
                            //}
                        }
                        else {
                            repl = transval.substring(0, transval.length) + " ";
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
                else {
                    if (!(transval.endsWith(" "))) {
                       // console.debug("processPlaceholderSpaces no blank behind!!!");
                        // 11-03-2021 PSS changed this to prevent removing a blank when at end of line in trans
                        // 16-03-2021 PSS fixed a problem with the tests because blank at the end was not working properly
                        found = translatedText.search("[" + counter + "]");
                      //  console.debug('found at:', found);
                      //  console.debug("length of line:", translatedText.length);
                        if (found != (translatedText.length) - 2) {
                           // console.debug('found at end of line:', found);
                            repl = transval.substring(0, transval.length - 1) + " " + transval.substring(transval.length - 1,);
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                        else {
                            repl = transval.substring(0, transval.length) + " ";
                            translatedText = translatedText.replaceAt(translatedText, transval, repl);
                        }
                    }
                }
            }
            counter++;
        }
    }
    else {
        //console.debug("processPlaceholderBlank no placeholders found",translatedText);
        return translatedText;
    }
return translatedText;
}


