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
   // console.debug('checkComment started comment', comment);
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
    var replaced = false;
    if (postTranslationReplace.length != 0 && postTranslationReplace != "undefined") {
        //setPreTranslationReplace(preTranslationReplace);
        let countreplaced = 0;
        var translatedText;
        var repl_verb = "";
        for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            let original = e.querySelector("span.original-raw").innerText;
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
            // 30-08-2021 PSS fix for issue # 125
            let precomment = e.querySelector('.source-details__comment p');
            if (precomment != null) {
                comment = precomment.innerText;
                comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                toTranslate = checkComments(comment.trim());
            }
            else {
                toTranslate = true;
            }
            if (toTranslate) {
                // Check if it is a plural
                let pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) small`);
                //console.debug("TranslatePage plural present:", pluralpresent, row);
                if (pluralpresent != null) {
                    transtype = "plural";
                }
                else {
                    transtype = "single";
                }
                // Fetch the translations
                let element = e.querySelector('.source-details__comment');
                let textareaElem = e.querySelector("textarea.foreign-text");
                translatedText = textareaElem.innerText;
                // Enhencement issue #123
                previewNewText = textareaElem.innerText;
                // Need to replace the existing html before replacing the verbs! issue #124
                previewNewText = previewNewText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                //console.debug('Translated text to check:',translatedText);
                replaced = false;
                // replverb contains the verbs to replace

                for (let i = 0; i < replaceVerb.length; i++) {
                    if (translatedText.includes(replaceVerb[i][0])) {
                        let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                        if (currec != null) {
                            var current = currec.querySelector('span.panel-header__bubble');
                            var prevstate = current.innerText;
                            //console.debug("Previous state:", prevstate);
                            current.innerText = "transFill";
                        }

                        // Enhencement issue #123
                        previewNewText = previewNewText.replaceAll(replaceVerb[i][0], '<mark>' + replaceVerb[i][1] + '</mark>');
                        translatedText = translatedText.replaceAll(replaceVerb[i][0], replaceVerb[i][1]);

                        repl_verb += replaceVerb[i][0] + "->" + replaceVerb[i][1] + "\n";
                        countreplaced++;
                        replaced = true;
                    }
                }
                // PSS 22-07-2021 fix for the preview text is not updated #109
                if (replaced) {
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    if (transtype == "single") {
                        let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
                        let row = rowfound.split('-')[1];
                        let newrow = rowfound.split('-')[2];
                        if (newrow != 'undefined') {
                            newrowId = row.concat("-", newrow);
                            row = newrowId;
                        }
                        let preview = document.querySelector('#preview-' + newrowId + ' td.translation');
                        // Enhencement issue #123
                        preview.innerHTML = previewNewText;
                    }
                    let wordCount = countreplaced;
                    let percent = 10;
                    let toolTip = '';
                    result = { wordCount, percent, toolTip };
                    //console.debug('googletranslate row:', rowfound);
                    updateStyle(textareaElem, result, "", true, false, false, row);
                }

            }
        }
        //var myForm = document.getElementById('translation-actions');
        //myForm.submit();
        alert('Replace verbs done ' + countreplaced + ' replaced' + ' words\n' + repl_verb);
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
    var transtype = "";
    var plural_line = "";
    var plural_present = "";
    var record = "";
    var row = "";
    var preview = "";
    // 15-05-2021 PSS added fix for issue #73
    // 16 - 06 - 2021 PSS fixed this function checkbuttonClick to prevent double buttons issue #74
    if (typeof postTranslationReplace != 'undefined' && postTranslationReplace.length != 0) {
        if (typeof preTranslationReplace != 'undefined' && preTranslationReplace.length != 0) {
            setPostTranslationReplace(postTranslationReplace);
            setPreTranslationReplace(preTranslationReplace);
            for (let record of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
            
                transtype = "single";
               // console.debug('translatePage line:', record);
                // 16-08-2021 PSS fixed retranslation issue #118
                let rowfound = record.parentElement.parentElement.parentElement.parentElement.id;
                row = rowfound.split('-')[1];
                let newrow = rowfound.split('-')[2];
                if (typeof newrow != 'undefined') {
                    newrowId = row.concat("-", newrow);
                    row = newrowId;
                }
                else {
                    rowfound = record.querySelector(`div.translation-wrapper textarea`).id;
                    row = rowfound.split('_')[1];
                }
                let original = record.querySelector("span.original-raw").innerText;
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
                pluralpresent = document.querySelector(`#preview-${row} .original li:nth-of-type(1) .original-text`);
                if (pluralpresent != null) {
                    original = pluralpresent.innerText;
                    transtype = "plural";
                    plural_line = "1";              
                 }
                else {
                    transtype = "single";
                    plural_line = "0";
                 }
                // PSS 09-03-2021 added check to see if we need to translate
                //Needs to be put into a function, because now it is unnessary double code
                let toTranslate = true;
                // Check if the comment is present, if not then if will block the request for the details name etc.
                let element = record.querySelector('.source-details__comment');
                if (element != null) {
                    let comment = record.querySelector('.source-details__comment p').innerText;
                    comment = comment.replace(/(\r\n|\n|\r)/gm, "");
                    toTranslate = checkComments(comment.trim());
                    let currec = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-header`);
                    if (currec != null) {
                        var current = currec.querySelector('span.panel-header__bubble');
                        var prevstate = current.innerText;                      
                    }
                }
                // Do we need to translate ??
                if (toTranslate) {
                    let pretrans = await findTransline(original, destlang);
                   // console.debug("Pretrans found:", row,pretrans);
                    // 07-05-2021 PSS added pretranslate in pages
                    
                    if (pretrans == "notFound") {
                       // console.debug("before first translate transtype value:", transtype);
                        // 20-06-2021 PSS fixed that translation stopped when the page already is completely translated issue #85
                        if (document.getElementById("translate-" + row + "-translocal-entry-local-button") != null) {
                            document.getElementById("translate-" + row + "-translocal-entry-local-button").style.visibility = 'hide';
                        }
                        if (transsel == "google") {
                            googleTranslate(original, destlang, record, apikey, replacePreVerb, row, transtype, plural_line);
                        }
                        else if (transsel == "deepl") {
                            translatedText = deepLTranslate(original, destlang, record, apikeyDeepl, replacePreVerb, row, transtype, plural_line);
                        }
                        else if (transsel == "microsoft") {
                            microsoftTranslate(original, destlang, record, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line);
                        }
                    }
                    else {
                        // Pretranslation found!
                        let translatedText = pretrans;
                        let textareaElem = record.querySelector("textarea.foreign-text");
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
                        //console.debug("Single record:", previewElem);
                        if (previewElem != null) {
                           // console.debug('Text preview:', previewElem.innerText);
                            previewElem.innerText = translatedText;
                        }
                        else {
                            let preview = document.querySelector('#preview-' + row + ' td.translation');
                            let spanmissing = preview.querySelector(" span.missing");
                            if (spanmissing != null) {
                                if (plural_line == '1') {
                                    spanmissing.remove();
                                }
                                if (transtype != "single") {
                                    ul = document.createElement('ul');
                                    preview.appendChild(ul);
                                    var li1 = document.createElement('li');
                                    li1.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                    ul.appendChild(li1);
                                    var small = document.createElement('small');
                                    li1.appendChild(small);
                                    small.appendChild(document.createTextNode("Singular:"));
                                    var br = document.createElement('br');
                                    li1.appendChild(br);
                                    var myspan1 = document.createElement('span');
                                    myspan1.className = "translation-text";
                                    li1.appendChild(myspan1);
                                    myspan1.appendChild(document.createTextNode(translatedText));
                                    
                                    // Also create the second li
                                    var li2 = document.createElement('li');
                                    //li2.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                    ul.appendChild(li2);
                                    var small = document.createElement('small');
                                    li2.appendChild(small);
                                    small.appendChild(document.createTextNode("Plural:"));
                                    var br = document.createElement('br');
                                    li2.appendChild(br);
                                    var myspan2 = document.createElement('span');
                                    myspan2.className = "translation-text";
                                    li2.appendChild(myspan2);
                                    myspan2.appendChild(document.createTextNode("empty"));
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
                    let e = document.querySelector(`#editor-${row} div.editor-panel__left div.panel-content`);
                    if (e != null) {
                        checkplural = e.querySelector(`#editor-${row} .source-string__plural span.original`);
                        //console.debug("checkplural after single:",checkplural);
                        if (checkplural != null) {
                            transtype = "plural";
                            plural_line = "2";
                            let plural = checkplural.innerText;
                            let pretrans = await findTransline(plural, destlang);
                            if (pretrans == "notFound") {
                                if (transsel == "google") {
                                    translatedText = googleTranslate(plural, destlang, e, apikey, replacePreVerb, row, transtype, plural_line);
                                }
                                else if (transsel == "deepl") {
                                    translatedText = deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, row, transtype, plural_line);
                                }
                                else if (transsel == "microsoft") {
                                    microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, row, transtype, plural_line);
                                }
                            }
                            else {
                                
                                // 21-06-2021 PSS fixed issue #86 no lookup was done for plurals
                                // 17-08-2021 PSS additional fix #118 when translation is already present we only need the first part of the rowId
                                let translatedText = pretrans;
                                // Plural second line
                                if (current.innerText == 'current') {
                                    let rowId = row.split('-')[0];
                                    textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");                                  
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
                                    textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
                                    let previewElem = document.querySelector('#preview-' + row + ' li:nth-of-type(2) span.translation-text');
                                    textareaElem1.innerText = translatedText;
                                    textareaElem1.value = translatedText;
                                    previewElem.innerText = translatedText;
                                    current.innerText = 'transFill';
                                    current.value = 'transFill';
                                }
                                validateEntry(destlang, textareaElem1,"","",row);
                            }
                        }
                    }
                }
                else {
                    // This is when urls/plugin/theme names are present
                    let translatedText = original;
                    let textareaElem = record.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    let preview = document.querySelector('#preview-' + row + ' td.translation');
                    if (preview != null) {
                        preview.innerText = translatedText;
                        preview.value = translatedText;
                        // We need to alter the status otherwise the save button does not work
                        current.innerText = 'transFill';
                        current.value = 'transFill';
                       // console.debug('translatePage No need to translate copy the original', original);
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
    translateButton.className += " started";
    //16 - 06 - 2021 PSS fixed this function to prevent double buttons issue #74
    // 07-07-2021 PSS need to determine if current record
    let g = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-header`);
    var current = g.querySelector('span.panel-header__bubble');
    //console.debug('status plural:', current.innerText);
    //console.debug('plural rowId:', rowId);
    var transtype = "";
    var plural_line = "";
    checkplural = document.querySelector(`#editor-${rowId} .source-string__singular span.original`);
    if (typeof checkplural == null) {
        transtype = "single";
    }
    else {
        transtype = "plural";
        plural_line = "1";
    }
    
    var translatedText = "";
    // 15-05-2021 PSS added fix for issue #73
    if (postTranslationReplace.length != 0) {
        if (preTranslationReplace != 0) {
           setPostTranslationReplace(postTranslationReplace);
           setPreTranslationReplace(preTranslationReplace);
          let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
          let original = e.querySelector("span.original-raw").innerText;
          // PSS 09-03-2021 added check to see if we need to translate
          let toTranslate = true;
          // Check if the comment is present, if not then it will block the request for the details name etc.   
          let element = e.querySelector('.source-details__comment');
          //console.debug('checkComment started element', element);
          if (element != null) {
             // Fetch the comment with name
            let comment = e.querySelector('#editor-' + rowId + ' .source-details__comment p').innerText;
              toTranslate = checkComments(comment.trim());
           }
          if (toTranslate) {
              let pretrans = await findTransline(original,destlang);
              if (pretrans == "notFound") {
                  if (transsel == "google") {
                      googleTranslate(original, destlang, e, apikey, replacePreVerb, rowId, transtype, plural_line);
                  }
                  else if (transsel == "deepl") {
                      deepLTranslate(original, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line);
                  }
                  else if (transsel == "microsoft") {
                      microsoftTranslate(original, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line);
                  }
                  document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'hide';
                  let textareaElem = e.querySelector("textarea.foreign-text");
              }
              else {
                    //console.debug('Pretranslated:', rowId,pretrans);
                    let translatedText = pretrans;
                    let textareaElem = e.querySelector("textarea.foreign-text");
                    textareaElem.innerText = translatedText;
                    textareaElem.value = translatedText;
                    //let zoeken = "translate-" + rowId + '"-translocal-entry-local-button';  
                    document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';  
                }
           }
          else {
               // no translation needed
               //console.debug('No need to translate copy the original', original);
               let translatedText = original;
               let textareaElem = e.querySelector("textarea.foreign-text");
               textareaElem.innerText = translatedText;
               textareaElem.value = translatedText;
               current.innerText = 'transFill';
               current.value = 'transFill';
               
               }
          let f = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
          let checkplural = f.querySelector(`#editor-${rowId} .source-string__plural span.original`);
          //console.debug('checkplural started element source-string_plural', checkplural);
          if (checkplural != null) {
              let plural = checkplural.innerText;
             var transtype = "plural";
             let pretrans = await findTransline(plural, destlang);
             //console.debug('pretranslate result plural:', pretrans);
             // console.debug('checkplural content element', plural);
              plural_line = "2";
              if (pretrans == "notFound") {
                  if (transsel == "google") {
                      translatedText = googleTranslate(plural, destlang, e, apikey, replacePreVerb, rowId, transtype,plural_line);
                  }
                  else if (transsel == "deepl") {
                      translatedText = deepLTranslate(plural, destlang, e, apikeyDeepl, replacePreVerb, rowId, transtype, plural_line);
                  }
                  else if (transsel == "microsoft") {
                      translatedText = microsoftTranslate(plural, destlang, e, apikeyMicrosoft, replacePreVerb, rowId, transtype, plural_line);
                  }
              }
              else {
                  let translatedText = pretrans;
                 // console.debug('translatedEntry plural:', translatedText);
                  // 21-06-2021 PSS fixed not populating plural issue #86
                 
                  // 07-07-2021 PSS fixed problem with populating when status is current
                  if (current != 'null') {
                      let row = rowId.split('-')[0];
                     // console.debug('rowId plural:',row)
                      textareaElem1 = f.querySelector("textarea#translation_" + row + "_1");
                      textareaElem1.innerText = translatedText;
                      textareaElem1.value = translatedText;
                    //  console.debug('existing plural text:', translatedText);
                  }
                  else {
                      textareaElem1 = f.querySelector("textarea#translation_" + rowId + "_1");
                     // console.debug("translateEntry plural:", textareaElem1);
                      textareaElem1.innerText = translatedText;
                     // console.debug("plural newtext:", textareaElem1.innerText);
                      textareaElem1.value = translatedText;
                      document.getElementById("translate-" + rowId + "-translocal-entry-local-button").style.visibility = 'visible';
                     // console.debug("translatedEntry plural finished");
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


function googleTranslate(original, destlang, e, apikey, preverbs,rowId, transtype, plural_line) {
    let originalPreProcessed = preProcessOriginal(original, preverbs,'google');

    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(originalPreProcessed);
    if (myArray == null) {
        var trntype = "text";
    }
    else {
        var trntype = "html";
    }

    let requestBody = {
        "q": originalPreProcessed,
        "source": "en",
        "target": destlang,
        "format": trntype
    };
    translatedText=sendAPIRequest(e, destlang, apikey, requestBody, original, originalPreProcessed,rowId,transtype,plural_line);
}


function sendAPIRequest(record, language, apikey, requestBody, original, originalPreProcessed,rowId,transtype,plural_line) {
    //console.debug('sendAPIRequest original_line Google:', originalPreProcessed);
    var row = "";
    var translatedText = "";
    var ul = "";
    var current = "";
    var prevstate = "";
    var pluralpresent = "";
    current = document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
    prevstate = current.innerText;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let responseObj = JSON.parse(this.responseText);
            let translatedText = responseObj.data.translations[0].translatedText;
            //console.debug('sendAPIRequest result before postProces:', translatedText);
            translatedText = postProcessTranslation(original, translatedText, replaceVerb, originalPreProcessed, "google");
            //console.debug('sendAPIRequest translatedText after postProces:', translatedText);
            //console.debug('sendAPIRequest transtype:', transtype);
            if (transtype == "single") {
               //console.debug("sendAPIRequest single:");
                textareaElem = record.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                current.innerText = 'transFill';
                current.value = 'transFill';
                let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                //console.debug("is pure single:", preview.innerText);
                preview.innerText = translatedText;
                validateEntry(language, textareaElem, "", "", rowId);
            }
            else {
                // PSS 09-04-2021 added populating plural text
                // PSS 09-07-2021 additional fix for issue #102 plural not updated
                if (current != 'null' && current == 'current' && current == 'waiting') {
                    row = rowId.split('-')[0];
                    //console.debug('rowId plural:', row)
                    textareaElem1 = f.querySelector("textarea#translation_" + row + "_0");
                    //textareaElem1.innerText = translatedText;
                    //textareaElem1.value = translatedText;
                    //console.debug('existing plural text:', translatedText);
                }
                else {
                    //console.debug("Google plural_line in plural:", plural_line, rowId, translatedText);
                    let newrow = rowId.split('-')[1];
                    if (typeof newrow == 'undefined') {
                        //console.debug('newrow = undefined!');
                        //console.debug('plural_line:', plural_line);
                        let preview = document.querySelector('#preview-' + rowId + ' td.translation');
                        let spanmissing = preview.querySelector(" span.missing");
                        if (spanmissing != null) {
                            spanmissing.remove();
                        }
                        if (transtype != "single") {
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            if (previewElem == null) {
                                ul = document.createElement('ul');
                                preview.appendChild(ul);
                                var li1 = document.createElement('li');
                                li1.style.cssText = 'text-align: -webkit-match-parent; padding-bottom: .2em; border-bottom: 1px dotted #72777c;';
                                ul.appendChild(li1);
                                var small = document.createElement('small');
                                li1.appendChild(small);
                                small.appendChild(document.createTextNode("Singular:"));
                                var br = document.createElement('br');
                                li1.appendChild(br);
                                var myspan1 = document.createElement('span');
                                myspan1.className = "translation-text";
                                li1.appendChild(myspan1);
                                myspan1.appendChild(document.createTextNode("empty"));
                                // Also create the second li
                                var li2 = document.createElement('li');
                                ul.appendChild(li2);
                                var small = document.createElement('small');
                                li2.appendChild(small);
                                small.appendChild(document.createTextNode("Plural:"));
                                var br = document.createElement('br');
                                li2.appendChild(br);
                                var myspan2 = document.createElement('span');
                                myspan2.className = "translation-text";
                                li2.appendChild(myspan2);
                                myspan2.appendChild(document.createTextNode("empty"));
                            }
                        }
                        if (plural_line == 1) {
                            //populate plural line if not already translated, so we can take original rowId!
                            //console.debug("singular updatet:", translatedText);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_0");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // Select the first li
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        if (plural_line == 2) {
                            //if (typeof translatedText != undefined) {
                            //console.debug("plural updatet:", translatedText);
                            textareaElem1 = record.querySelector("textarea#translation_" + rowId + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            // Select the second li
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) .translation-text');
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                    }
                    else {
                        //console.debug('newrow = not undefined!', newrow);
                        let row = rowId.split('-')[0];
                        if (plural_line == 1) {
                            //populate singular line if already translated
                            textareaElem1 = record.querySelector("textarea#translation_" + row + "_0");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(1) .translation-text');
                            //console.debug("Existing record plural_line 1:", translatedText);
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                        else {
                            //populate plural line if  already translated
                            textareaElem1 = record.querySelector("textarea#translation_" + row + "_1");
                            //console.debug('newrow = not undefined!', row + "_1");
                            textareaElem1.innerText = translatedText;
                            textareaElem1.value = translatedText;
                            let previewElem = document.querySelector('#preview-' + rowId + ' li:nth-of-type(2) .translation-text');
                            if (previewElem != null) {
                                previewElem.innerText = translatedText;
                            }
                        }
                    }
                }
                // The line below is necessary to update the save button on the left in the panel
                current.innerText = 'transFill';
                current.value = 'transFill';
                validateEntry(language, textareaElem1, "", "", rowId);
                //console.debug("Validate entry textareaElem1")
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
    //console.debug("replaceAt:", '"' + word + '"');
    //console.debug("replaceAt:", '"' + newWord + '"');
    if (word[0] === word[0].toUpperCase()) {
        newWord = newWord[0].toUpperCase() + newWord.slice(1);
    }
   // console.debug("replaceAt:", str.replace(word, newWord));
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
            //console.debug('Applied lower case: ', translatedText);
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


