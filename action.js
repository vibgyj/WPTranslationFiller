chrome.storage.sync.get('apikey', function (data) {
    let key = data.apikey;
    translate(key);
});

function translate(key) {
    for (let e of document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")) {
        let original = e.querySelector("span.original-raw").innerText;

        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var responseObj = JSON.parse(this.responseText);
                console.log(responseObj);
                e.querySelector("textarea.foreign-text").innerText = responseObj.data.translations[0].translatedText;
            }
        };
        xhttp.open("POST", "https://translation.googleapis.com/language/translate/v2?key=" + key, true);
        xhttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

        requestBody = JSON.stringify({
            "q": original,
            "source": "en",
            "target": "ta",
            "format": "text"
        });
        xhttp.send(requestBody);
    }
}