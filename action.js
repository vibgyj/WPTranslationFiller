chrome.storage.sync.get(['apikey', 'destlang'], function (data) {
    translate(data.apikey, data.destlang);
});

function translate(apikey, destlang) {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;

        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var responseObj = JSON.parse(this.responseText);
                var textareaElem = e.querySelector("textarea.foreign-text");
                textareaElem.innerText = responseObj.data.translations[0].translatedText;
                validateEntry(textareaElem);
            }
        };
        xhttp.open("POST", `https://translation.googleapis.com/language/translate/v2?key=${apikey}`, true);
        xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

        requestBody = JSON.stringify({
            "q": original,
            "source": "en",
            "target": destlang,
            "format": "text"
        });
        xhttp.send(requestBody);
    }
}