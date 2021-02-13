let translate = document.getElementById('translate');

translate.onclick = function (element) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.executeScript({
            file: 'googleTranslate.js'
        });
        chrome.tabs.executeScript({
            file: 'action.js'
        });
    });
};