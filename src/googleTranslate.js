// This array is used to replace wrong words and put placeholders back
// This array should better be build from a file, but for now it does what it needs to do
// There might be more placeholders needed, and maybe split the array in two, one for verb replacement and one for placeholders
let replaceVerb = [
    ["website", "site"],
    ["plug-in", "plugin"],
    ["Plug-in", "Plugin"],
    ["post", "bericht"],
    ["sjabloon", "template"],
    ["trefwoorden", "keywords"],
    ["schuifregelaar", "slider"],
    ["voltooid", "afgerond"],
    ["Voettekst", "Footer"],
    ["Widget", "widget"]];
let replacePlaceholders = [
    ["[E1]", "&#8220;"],
    ["[E2]", "&#8221;"],
    ["[E3]", "&#8216;"],
    ["[E4]", "&#8217;"],
    ["[E11]", "&ldquo;"],
    ["[E12]", "&rdquo;"],
    ["[E13]", "&quot;"],
    ["[E14]", "("],
    ["[E15]", ")"],
    ["[P1]", "%s"],
    ["[P2]", "%d "],
    ["[P3]", "%s%%"],
    ["[P11]", "%1$s"],
    ["[P12]", "%2$s"],
    ["[P13]", "%3$s"],
    ["[P14]", "%4$s"],
    ["[P15]", "%5$s"],
    ["[P16]", "%6$s"],
    ["[P21]", "%1$d"],
    ["[P22]", "%2$d"],
    ["[P23]", "%3$d"],
    ["[P24]", "%4$d"],
    ["[P25]", "%5$d"],
    ["[P26]", "%6$d"]];

function translatePage(apikey, destlang) {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;
        original = googleTranslate(original, destlang, e, apikey);
    }

    // Translation completed
    let translateButton = document.querySelector(".paging a.translation-filler-button");
    translateButton.className += " translated";
}

function translateEntry(rowId, apikey, destlang) {
    let e = document.querySelector(`#editor-${rowId} div.editor-panel__left div.panel-content`);
    let original = e.querySelector("span.original-raw").innerText;
    googleTranslate(original, destlang, e, apikey);

    // Translation completed
    let translateButton = document.querySelector(`#translate-${rowId}`);
    translateButton.className += " translated";
}

function googleTranslate(original, destlang, e, apikey) {
    original = preProcessOriginal(original, replacePlaceholders);

    var myRe = /(\<\w*)((\s\/\>)|(.*\<\/\w*\>))/gm;
    var myArray = myRe.exec(original);
    // console.log("Contains html.",myArray);

    if (myArray == null) {
        transtype = "text";
    }
    else {
        transtype = "html";
    }
    console.log("format type", transtype);

    let requestBody = JSON.stringify({
        "q": original,
        "source": "en",
        "target": destlang,
        "format": transtype
    });
    console.log("request body", requestBody);

    sendAPIRequest(e, apikey, requestBody);
}

function sendAPIRequest(e, apikey, requestBody) {
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var responseObj = JSON.parse(this.responseText);
            var translatedText = postProcessTranslation(
                responseObj.data.translations[0].translatedText, replaceVerb, replacePlaceholders);

            var textareaElem = e.querySelector("textarea.foreign-text");
            textareaElem.innerText = translatedText;
            validateEntry(textareaElem);
        }
    };
    xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
    xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhttp.send(requestBody);
}

function preProcessOriginal(original, replacePlaceholders) {
    // this function replaces all placeholders before sending to Google to prevent adding blanks
    for (let i = 0; i < replacePlaceholders.length; i++) {
        original = original.replaceAll(replacePlaceholders[i][1], replacePlaceholders[i][0]);
    }

    return original;
}

function postProcessTranslation(translatedText, replverb, replacePlaceholders) {
    // This function replaces the placeholders so they become html entities
    for (let i = 0; i < replverb.length; i++) {
        translatedText = translatedText.replaceAll(replverb[i][0], replverb[i][1]);
    }

    // replverb contains the verbs to replace
    for (let i = 0; i < replacePlaceholders.length; i++) {
        translatedText = translatedText.replaceAll(replacePlaceholders[i][0], replacePlaceholders[i][1]);
    }

    return translatedText;
}