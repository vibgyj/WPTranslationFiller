// Mock XHR requests with custom responses based on URL pattern
function activateMocking() {
    console.debug("mocking starting")
    var requests = [];

    // Override XMLHttpRequest
    function MockXHR() {
        this.readyState = 0;
        this.status = null;
        this.responseText = null;
        this.onreadystatechange = null;
        this.onload = null;
    }

    MockXHR.prototype.open = function (method, url) {
        this.method = method;
        this.url = url;
        this.readyState = 1;
    };

    MockXHR.prototype.send = function (data) {
        var request = { method: this.method, url: this.url, data: data };
        console.debug("we send a response if url is ok:",this.url)
        // Push the request to the array if it matches the specified pattern
        if (this.url.match("/-get-tm-openai-suggestions/")) {
            requests.push(request);
            console.debug("we have pushed a match")
            // Set custom response based on URL pattern
            this.readyState = 4;
            this.status = 200;
            this.responseText = JSON.stringify({"success": true, "data": "<p class=\"no-suggestions\">No suggestions.<\/p>" });

            // Trigger the onreadystatechange event if defined
            if (typeof this.onreadystatechange === 'function') {
                console.debug("readystate changed")
                this.onreadystatechange();
            }
        }

        // Simulate asynchronous behavior
        var self = this;
        setTimeout(function () {
            // Trigger onload if defined
            if (typeof self.onload === 'function') {
                self.onload();
            }
        }, 0);
    };

    // Replace global XMLHttpRequest with MockXHR
    window.XMLHttpRequest = MockXHR;

    // Expose a function to get requests
    window.getMockedRequests = function () {
        console.debug("returned request:",requests)
        return requests;
    };
}

