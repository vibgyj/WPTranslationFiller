let button = document.getElementById('save');
button.addEventListener('click', function () {
    let key = document.getElementById('google_api_key').value;
    console.log(key);
    chrome.storage.sync.set({ apikey: key });
});
