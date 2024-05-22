// Injected script

function adjustLayoutScreen() {
    // Retrieve value from chrome local storage
    
    chrome.storage.local.get(['WPTFscreenWidth'], function (result) {
        // Access the stored value
        var myScreenWidth;
        myScreenWidth = result.WPTFscreenWidth;
        var screenWidth = window.innerWidth;
        //console.debug("screenWidth:",screenWidth)
        var gpContentElement = document.querySelector('.gp-content');
        //console.debug("found setting:",myScreenWidth)
        // Perform actions based on the stored value
        if (myScreenWidth === null) {
            // set the deafault value
            if (screenWidth == 1455) {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }
            else {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }
                
        } else if (typeof myScreenWidth == 'undefined') {
            if (screenWidth == 1455) {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }
            else {
                myScreenWidth = '90%';
                // Apply the new max-width style with !important
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
                chrome.storage.local.set({
                    WPTFscreenWidth: '90'
                });
            }
       
        }
        else {
            // Generate the new max-width style based on the stored value
            // Apply the new max-width style with !important
            myScreenWidth = myScreenWidth + "%"
            if (gpContentElement != null) {
                gpContentElement.style.setProperty('max-width', myScreenWidth, 'important');
            }
        }
    });
}


// Function to intercept XMLHttpRequests
function interceptXHR(xhr) {
    // Intercept the open method to store the URL
    // Flag to track whether requests should be intercepted
    //var interceptRequests = JSON.parse(localStorage.getItem('interXHR')) || true; // Retrieve value from localStorage
    var interceptRequests = localStorage.getItem('interXHR') // Retrieve value from localStorage
    var originalOpen = xhr.open;
    xhr.open = function (method, url) {
        // Store the URL for later use
        xhr._interceptedURL = url;
        // Call the original open method
        return originalOpen.apply(xhr, arguments);
    };
    // Intercept the send method to handle the response
    var originalSend = xhr.send;
    xhr.send = function () {
        let mydata = "<p class=\"translation-suggestion__translation\">API call blocked.</p></br>"
        if ((interceptRequests == 'true' && xhr._interceptedURL.includes('get-tm-openai')) || (interceptRequests == 'true' && xhr._interceptedURL.includes('get-tm-deepl') || (interceptRequests == 'true' && xhr._interceptedURL.includes('get-translation-helpers')))) {
            // Instead of sending the request, provide a mocked response immediately
            var mockedResponse = {
                success: true,
                data: mydata
            };
            // Set responseText property to simulate the response
            Object.defineProperty(xhr, 'responseText', { value: JSON.stringify(mockedResponse), writable: true });
            // Trigger the onload event to simulate the response
            if (typeof xhr.onload === 'function') {
                xhr.onload();
            }
            // Prevent the original request from being sent by overriding the send method
            xhr.send = function () {
                //console.debug("we are intercepting")
            };
            return; // Exit early without calling the original send method
        }
        // Call the original send method for non-intercepted requests
        try {
            return originalSend.apply(xhr, arguments);

         } catch (error) {
        console.log(`Error: ${error.message}`);
         }
        //return originalSend.apply(xhr, arguments);
        originalSend.onerror = function () {
            console.error('Request failed due to a network error.');
        };
    };
}

// Function to toggle interception based on the flag value
function toggleInterception(shouldIntercept,transProcess) {
    interceptRequests = shouldIntercept;
    translationProcess = transProcess;
}

// Add a listener to handle messages from the content script
window.addEventListener('message', function (event) {
    // Check if the event is from a trusted source
    if (event.source === window && event.data.action === 'updateInterceptRequests') {
        // Update interception based on the message data
        toggleInterception(event.data.interceptRequests,event.data.transProcess);
    }
});

// Intercept XMLHttpRequests globally
(function () {
    // Store the original XMLHttpRequest object
    var OriginalXHR = window.XMLHttpRequest;
    // Override the XMLHttpRequest constructor to intercept requests
    window.XMLHttpRequest = function () {
        // Create a new instance of the original XMLHttpRequest
        var xhr = new OriginalXHR();
        // Intercept this instance of XMLHttpRequest
        interceptXHR(xhr);
        // Return the modified XHR object
        return xhr;
    };
})();
