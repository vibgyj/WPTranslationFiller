
function translatePage(apikey, destlang) {
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
}

function processTranslation(translatedText) {
    translatedText = translatedText.replaceAll("% s", "%s");
    translatedText = translatedText.replaceAll("% d", "%d");
    translatedText = translatedText.replaceAll("% 1 $ s", "%1$s");
    translatedText = translatedText.replaceAll("% 2 $ s", "%2$s");
    translatedText = translatedText.replaceAll("% 1 $ d", "%1$d");
    translatedText = translatedText.replaceAll("% 2 $ d", "%2$d");

    translatedText = translatedText.replaceAll("& # ", "&#");

    return translatedText;
}