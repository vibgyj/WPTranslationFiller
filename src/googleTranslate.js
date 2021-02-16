
function translatePage(apikey, destlang) {
    console.log("translatePage called.", apikey, destlang);

    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;

        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var responseObj = JSON.parse(this.responseText);
                var translatedText = processTranslation(responseObj.data.translations[0].translatedText);

                var textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = translatedText;
                validateEntry(textareaElem);
            }
        };
        xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
        xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

        requestBody = JSON.stringify({
            "q": original,
            "source": "en",
            "target": destlang,
            "format": "text" // todo: Can we use html here? But html encoding is lost if html option used.
        });
        xhttp.send(requestBody);
    }

    alert("Translation completed.");
}

function processTranslation(translatedText) {
    translatedText = translatedText.replaceAll("% s %%", "%s%%");
    
    translatedText = translatedText.replaceAll("% s", "%s");
    translatedText = translatedText.replaceAll("% d", "%d");

    var i;
    for (i = 1; i <= 10; i++) {
        translatedText = translatedText.replaceAll(`% ${i} $ s`, `%${i}$s`);
    }

    for (i = 1; i <= 10; i++) {
        translatedText = translatedText.replaceAll(`% ${i} $ d`, `%${i}$d`);
    }

    translatedText = translatedText.replaceAll("& # ", "&#");

    return translatedText;
}