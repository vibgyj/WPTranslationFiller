chrome.storage.sync.get(['apikey', 'destlang'], function (data) {
    translatePage(data.apikey, data.destlang);
});