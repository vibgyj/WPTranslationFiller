let apikeyTextbox = document.getElementById('google_api_key');
let destLangTextbox = document.getElementById('destination_lang');

chrome.storage.sync.get(['apikey', 'destlang'], function (data) {
    apikeyTextbox.value = data.apikey;
    destLangTextbox.value = data.destlang;
});

let button = document.getElementById('save');
button.addEventListener('click', function () {
    let apikey = apikeyTextbox.value;
    let destlang = destLangTextbox.value;

    chrome.storage.sync.set({ apikey: apikey, destlang: destlang });
});
