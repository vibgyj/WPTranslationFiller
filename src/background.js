// background.js
console.debug("background loaded")
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.debug("got message:",message)
    if (message.action === "interceptRequest") {
        // Modify the response
        const modifiedResponse = "No results";

        // Send the modified response back to the content script
        sendResponse({ modifiedResponse: modifiedResponse });
    }
});