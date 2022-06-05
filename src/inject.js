(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.FakeXMLHttpRequest = factory());
}(this, (function () {
    'use strict';

    /**
     * Minimal Event interface implementation
     *
     * Original implementation by Sven Fuchs: https://gist.github.com/995028
     * Modifications and tests by Christian Johansen.
     *
     * @author Sven Fuchs (svenfuchs@artweb-design.de)
     * @author Christian Johansen (christian@cjohansen.no)
     * @license BSD
     *
     * Copyright (c) 2011 Sven Fuchs, Christian Johansen
     */

    var _Event = function Event(type, bubbles, cancelable, target) {
        this.type = type;
        this.bubbles = bubbles;
        this.cancelable = cancelable;
        this.target = target;
    };

    _Event.prototype = {
        stopPropagation: function () { },
        preventDefault: function () {
            this.defaultPrevented = true;
        }
    };

    /*
      Used to set the statusText property of an xhr object
    */
    var httpStatusCodes = {
        100: "Continue",
        101: "Switching Protocols",
        200: "OK",
        201: "Created",
        202: "Accepted",
        203: "Non-Authoritative Information",
        204: "No Content",
        205: "Reset Content",
        206: "Partial Content",
        300: "Multiple Choice",
        301: "Moved Permanently",
        302: "Found",
        303: "See Other",
        304: "Not Modified",
        305: "Use Proxy",
        307: "Temporary Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        402: "Payment Required",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        407: "Proxy Authentication Required",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        412: "Precondition Failed",
        413: "Request Entity Too Large",
        414: "Request-URI Too Long",
        415: "Unsupported Media Type",
        416: "Requested Range Not Satisfiable",
        417: "Expectation Failed",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported"
    };


    /*
      Cross-browser XML parsing. Used to turn
      XML responses into Document objects
      Borrowed from JSpec
    */
    function parseXML(text) {
        var xmlDoc;

        if (typeof DOMParser != "undefined") {
            var parser = new DOMParser();
            xmlDoc = parser.parseFromString(text, "text/xml");
        } else {
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(text);
        }

        return xmlDoc;
    }

    /*
      Without mocking, the native XMLHttpRequest object will throw
      an error when attempting to set these headers. We match this behavior.
    */
    var unsafeHeaders = {
        "Accept-Charset": true,
        "Accept-Encoding": true,
        "Connection": true,
        "Content-Length": true,
        "Cookie": true,
        "Cookie2": true,
        "Content-Transfer-Encoding": true,
        "Date": true,
        "Expect": true,
        "Host": true,
        "Keep-Alive": true,
        "Referer": true,
        "TE": true,
        "Trailer": true,
        "Transfer-Encoding": true,
        "Upgrade": true,
        "User-Agent": true,
        "Via": true
    };

    /*
      Adds an "event" onto the fake xhr object
      that just calls the same-named method. This is
      in case a library adds callbacks for these events.
    */
    function _addEventListener(eventName, xhr) {
        xhr.addEventListener(eventName, function (event) {
            var listener = xhr["on" + eventName];

            if (listener && typeof listener == "function") {
                listener.call(event.target, event);
            }
        });
    }

    function EventedObject() {
        this._eventListeners = {};
        var events = ["loadstart", "progress", "load", "abort", "loadend"];
        for (var i = events.length - 1; i >= 0; i--) {
            _addEventListener(events[i], this);
        }
    }
    EventedObject.prototype = {
        /*
          Duplicates the behavior of native XMLHttpRequest's addEventListener function
        */
        addEventListener: function addEventListener(event, listener) {
            this._eventListeners[event] = this._eventListeners[event] || [];
            this._eventListeners[event].push(listener);
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's removeEventListener function
        */
        removeEventListener: function removeEventListener(event, listener) {
            var listeners = this._eventListeners[event] || [];

            for (var i = 0, l = listeners.length; i < l; ++i) {
                if (listeners[i] == listener) {
                    return listeners.splice(i, 1);
                }
            }
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
        */
        dispatchEvent: function dispatchEvent(event) {
            var type = event.type;
            var listeners = this._eventListeners[type] || [];

            for (var i = 0; i < listeners.length; i++) {
                if (typeof listeners[i] == "function") {
                    listeners[i].call(this, event);
                } else {
                    listeners[i].handleEvent(event);
                }
            }

            return !!event.defaultPrevented;
        },

        /*
          Triggers an `onprogress` event with the given parameters.
        */
        _progress: function _progress(lengthComputable, loaded, total) {
            var event = new _Event('progress');
            event.target = this;
            event.lengthComputable = lengthComputable;
            event.loaded = loaded;
            event.total = total;
            this.dispatchEvent(event);
        }
    };

    /*
      Constructor for a fake window.XMLHttpRequest
    */
    function FakeXMLHttpRequest() {
        EventedObject.call(this);
        this.readyState = FakeXMLHttpRequest.UNSENT;
        this.requestHeaders = {};
        this.requestBody = null;
        this.status = 0;
        this.statusText = "";
        this.upload = new EventedObject();
        this.onabort = null;
        this.onerror = null;
        this.onload = null;
        this.onloadend = null;
        this.onloadstart = null;
        this.onprogress = null;
        this.onreadystatechange = null;
        this.ontimeout = null;
    }

    FakeXMLHttpRequest.prototype = new EventedObject();

    // These status codes are available on the native XMLHttpRequest
    // object, so we match that here in case a library is relying on them.
    FakeXMLHttpRequest.UNSENT = 0;
    FakeXMLHttpRequest.OPENED = 1;
    FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
    FakeXMLHttpRequest.LOADING = 3;
    FakeXMLHttpRequest.DONE = 4;

    var FakeXMLHttpRequestProto = {
        UNSENT: 0,
        OPENED: 1,
        HEADERS_RECEIVED: 2,
        LOADING: 3,
        DONE: 4,
        async: true,
        withCredentials: false,

        /*
          Duplicates the behavior of native XMLHttpRequest's open function
        */
        open: function open(method, url, async, username, password) {
            this.method = method;
            this.url = url;
            this.async = typeof async == "boolean" ? async : true;
            this.username = username;
            this.password = password;
            this.responseText = null;
            this.response = this.responseText;
            this.responseXML = null;
            this.responseURL = url;
            this.requestHeaders = {};
            this.sendFlag = false;
            this._readyStateChange(FakeXMLHttpRequest.OPENED);
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
        */
        setRequestHeader: function setRequestHeader(header, value) {
            verifyState(this);

            if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
                throw new Error("Refused to set unsafe header \"" + header + "\"");
            }

            if (this.requestHeaders[header]) {
                this.requestHeaders[header] += "," + value;
            } else {
                this.requestHeaders[header] = value;
            }
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's send function
        */
        send: function send(data) {
            verifyState(this);

            if (!/^(get|head)$/i.test(this.method)) {
                var hasContentTypeHeader = false;

                Object.keys(this.requestHeaders).forEach(function (key) {
                    if (key.toLowerCase() === 'content-type') {
                        hasContentTypeHeader = true;
                    }
                });

                if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
                    this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
                }

                this.requestBody = data;
            }

            this.errorFlag = false;
            this.sendFlag = this.async;
            this._readyStateChange(FakeXMLHttpRequest.OPENED);

            if (typeof this.onSend == "function") {
                this.onSend(this);
            }

            this.dispatchEvent(new _Event("loadstart", false, false, this));
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's abort function
        */
        abort: function abort() {
            this.aborted = true;
            this.responseText = null;
            this.response = this.responseText;
            this.errorFlag = true;
            this.requestHeaders = {};

            this.dispatchEvent(new _Event("abort", false, false, this));

            if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
                this._readyStateChange(FakeXMLHttpRequest.UNSENT);
                this.sendFlag = false;
            }

            if (typeof this.onerror === "function") {
                this.onerror();
            }
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
        */
        getResponseHeader: function getResponseHeader(header) {
            if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                return null;
            }

            if (/^Set-Cookie2?$/i.test(header)) {
                return null;
            }

            header = header.toLowerCase();

            for (var h in this.responseHeaders) {
                if (h.toLowerCase() == header) {
                    return this.responseHeaders[h];
                }
            }

            return null;
        },

        /*
          Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
        */
        getAllResponseHeaders: function getAllResponseHeaders() {
            if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                return "";
            }

            var headers = "";

            for (var header in this.responseHeaders) {
                if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
                    headers += header + ": " + this.responseHeaders[header] + "\r\n";
                }
            }

            return headers;
        },

        /*
         Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
         */
        overrideMimeType: function overrideMimeType(mimeType) {
            if (typeof mimeType === "string") {
                this.forceMimeType = mimeType.toLowerCase();
            }
        },


        /*
          Places a FakeXMLHttpRequest object into the passed
          state.
        */
        _readyStateChange: function _readyStateChange(state) {
            this.readyState = state;

            if (typeof this.onreadystatechange == "function") {
                this.onreadystatechange(new _Event("readystatechange"));
            }

            this.dispatchEvent(new _Event("readystatechange"));

            if (this.readyState == FakeXMLHttpRequest.DONE) {
                this.dispatchEvent(new _Event("load", false, false, this));
            }
            if (this.readyState == FakeXMLHttpRequest.UNSENT || this.readyState == FakeXMLHttpRequest.DONE) {
                this.dispatchEvent(new _Event("loadend", false, false, this));
            }
        },


        /*
          Sets the FakeXMLHttpRequest object's response headers and
          places the object into readyState 2
        */
        _setResponseHeaders: function _setResponseHeaders(headers) {
            this.responseHeaders = {};

            for (var header in headers) {
                if (headers.hasOwnProperty(header)) {
                    this.responseHeaders[header] = headers[header];
                }
            }

            if (this.forceMimeType) {
                this.responseHeaders['Content-Type'] = this.forceMimeType;
            }

            if (this.async) {
                this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
            } else {
                this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
            }
        },

        /*
          Sets the FakeXMLHttpRequest object's response body and
          if body text is XML, sets responseXML to parsed document
          object
        */
        _setResponseBody: function _setResponseBody(body) {
            verifyRequestSent(this);
            verifyHeadersReceived(this);
            verifyResponseBodyType(body);

            var chunkSize = this.chunkSize || 10;
            var index = 0;
            this.responseText = "";
            this.response = this.responseText;

            do {
                if (this.async) {
                    this._readyStateChange(FakeXMLHttpRequest.LOADING);
                }

                this.responseText += body.substring(index, index + chunkSize);
                this.response = this.responseText;
                index += chunkSize;
            } while (index < body.length);

            var type = this.getResponseHeader("Content-Type");

            if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
                try {
                    this.responseXML = parseXML(this.responseText);
                } catch (e) {
                    // Unable to parse XML - no biggie
                }
            }

            if (this.async) {
                this._readyStateChange(FakeXMLHttpRequest.DONE);
            } else {
                this.readyState = FakeXMLHttpRequest.DONE;
            }
        },

        /*
          Forces a response on to the FakeXMLHttpRequest object.
          This is the public API for faking responses. This function
          takes a number status, headers object, and string body:
          ```
          xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")
          ```
        */
        respond: function respond(status, headers, body) {
            Object.defineProperty(this, "responseText", { writable: true });
            console.debug('in respond body:', body);
            this._setResponseHeaders(headers || {});
            this.status = typeof status == "number" ? status : 200;
            this.statusText = httpStatusCodes[this.status];  
            this._setResponseBody(body || "");
        }
    };

    for (var property in FakeXMLHttpRequestProto) {
        FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
    }

    function verifyState(xhr) {
        if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
            throw new Error("INVALID_STATE_ERR");
        }

        if (xhr.sendFlag) {
            throw new Error("INVALID_STATE_ERR");
        }
    }


    function verifyRequestSent(xhr) {
        if (xhr.readyState == FakeXMLHttpRequest.DONE) {
            throw new Error("Request done");
        }
    }

    function verifyHeadersReceived(xhr) {
        if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
            throw new Error("No headers received");
        }
    }

    function verifyResponseBodyType(body) {
        if (typeof body != "string") {
            var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                body + ", which is not a string.");
            error.name = "InvalidBodyException";
            throw error;
        }
    }
    
    return FakeXMLHttpRequest;

})));



((data) => {
    const hostedLocally = ['localhost', '127.0.0.1'].indexOf(location.host.split(':')[0].toLowerCase()) !== -1;
    const { window } = data;
    const originalXMLHttpRequest = window.XMLHttpRequest;
    const originalOpen = originalXMLHttpRequest.prototype.open;

    let parrotActive;
    let parrotMockDefinitions = [];

    originalXMLHttpRequest.prototype.open = function () {
        this.setMethod(arguments[0]);
        try {
            return originalOpen.apply(this, arguments);
        } catch (e) {
        }
    };

    originalXMLHttpRequest.prototype.setMethod = function (method) {
        this.method = method;
    };

    window.addEventListener('message', (evt) => {
        if (evt.data.sender === 'commontranslate') {
            parrotActive = !!evt.data.parrotActive;
            parrotMockDefinitions = [...evt.data.parrotMockDefinitions];

            if (parrotActive && !hostedLocally) {
                console.debug("fake called!!")
                window.XMLHttpRequest = instrumentedXMLHttpRequest;
            } else {
                console.debug("original called!")
                window.XMLHttpRequest = originalXMLHttpRequest;
            }
        }
    });

    const instrumentedXMLHttpRequest = function () {
        const original = new originalXMLHttpRequest();
       //var original = new FakeXMLHttpRequest();
        
        //original.respond(200, { 'Content-Type': 'application/json' }, { "success": true, "data": "No suggestieeeees." });
       // return original.onreadystatechange();
        var instrumented = this;
        var myresponseText = original.responseText;
        var myresponse = original.response;
        var mystatusText = original.statusText;
        var myStatus = original.status;
        var myreadyState = original.readyState;
        var myoriginal = original;
        //this.readyState = orginal.readyState;
        console.debug("original readyState:", original.readyState,myreadyState,original.responseText);
        original.onreadystatechange = function () {
            //original.readyState = 4;
            function removePrefix(responseInfo) {
                const newResponseInfo = { ...responseInfo };
                if (responseInfo?.response?.substr(0, 5) === ")]}',") {
                    newResponseInfo.hasJsonPrefix = true;
                    newResponseInfo.response = responseInfo.response.substr(5);
                }
                return newResponseInfo;
            }

            function parse(responseInfo) {
                newResponseInfo = { ...responseInfo };
                try {
                    newResponseInfo.response = JSON.parse(responseInfo.response);
                    newResponseInfo.type = 'JSON';
                } catch (e) {
                    newResponseInfo.type = 'TEXT';
                }
                return newResponseInfo;
            }

            function transform(responseInfo, transformer) {
                newResponseInfo = { ...responseInfo };
                newResponseInfo.response = transformer(responseInfo.response);
                return newResponseInfo;
            }

            function stringify(responseInfo) {
                newResponseInfo = { ...responseInfo };
                if (responseInfo.type === 'JSON') {
                    newResponseInfo.response = JSON.stringify(responseInfo.response);
                }
                return newResponseInfo;
            }

            function addPrefix(responseInfo) {
                newResponseInfo = { ...responseInfo };
                if (responseInfo.hasJsonPrefix) {
                    newResponseInfo.response = ")]}'," + responseInfo.response;
                }
                return newResponseInfo;
            }

            function getParrotMockDefinitions(xhr) {
                if (xhr.responseURL && parrotMockDefinitions.length) {
                    return parrotMockDefinitions.filter((parrotMockDefinition) => {
                        const regExp = new RegExp(parrotMockDefinition.pattern);
                        return parrotMockDefinition.active && parrotMockDefinition.method.toLowerCase() === xhr.method.toLowerCase() && regExp.test(xhr.responseURL);
                    });
                }

                return undefined;
            }
            console.debug("readystate:",this.readyState,instrumented.readyState,original.readyState,myreadyState,myresponseText)
            if (instrumented.readyState === 4) {
                // Gets an array of mocks to be used for this URL
                const parrotMockDefinitions = parrotActive && getParrotMockDefinitions(this);
                if (parrotMockDefinitions?.length) {
                    //window.postMessage({
                      //  sender: 'Parrot',
                      //  mocks: parrotMockDefinitions?.length,
                      //  resource: this.responseURL
                   // }, location.origin);

                    // Now iterate over all available mock definitions to build the final mock data composition
                    const compositeMockData = {
                        status: original.status,
                        response: original.response,
                        responseText: original.responseText,
                        delay: undefined,
                    };
                    parrotMockDefinitions.forEach((parrotMockDefinition) => {
                        if (parrotMockDefinition.type === 'TRANSFORM') {
                            const transformer = new Function('return ' + parrotMockDefinition.response)();
                            const transformedResponse = addPrefix(stringify(transform(parse(removePrefix({
                                response: compositeMockData.response,
                                type: '',
                                hasJsonPrefix: false
                            })), transformer))).response;
                            compositeMockData.response = transformedResponse;
                            compositeMockData.responseText = transformedResponse;
                        } else {
                            compositeMockData.response = parrotMockDefinition.response;
                            compositeMockData.responseText = parrotMockDefinition.response;
                        }

                        compositeMockData.status = parrotMockDefinition.status;
                        compositeMockData.delay = parrotMockDefinition.delay;
                    });

                    console.log(compositeMockData.response);

                    instrumented.statusText = original.statusText;
                    instrumented.status = compositeMockData.status * 1;
                    instrumented.response = compositeMockData.response;
                    instrumented.responseText = compositeMockData.response;

                    setTimeout(() => {
                        if (instrumented.onreadystatechange) {
                            console.debug("in return 1:", instrumented.onreadystatechange)
                            return instrumented.onreadystatechange();
                        }

                    }, (compositeMockData.delay || 0) * 1);
                } else {
                    console.debug("mock leeg", myresponseText,myresponse,mystatusText,myStatus);
                    instrumented.statusText = myresponseText;
                    instrumented.status = myStatus * 1;
                    instrumented.response = myresponse;
                    //instrumented.statusText = original.responseText;
                  //  instrumented.status = original.status * 1;
                   // instrumented.response = original.response;

                    if (instrumented.responseType === '' || instrumented.responseType === 'text') {
                        instrumented.responseText = original.responseText;
                    }
                    console.debug("before return", original.onreadystatechange,myoriginal.onreadystatechange)
                    if (instrumented.onreadystatechange) {
                        console.debug("in return2", instrumented.onreadystatechange)
                        return instrumented.onreadystatechange();
                    }
                }
            }
            else {
                
                console.debug("no readyState!!")
            }
            
        };

        ['readyState', 'responseXML', 'responseURL', 'upload'].forEach((item) => {
            Object.defineProperty(instrumented, item, {
                get: function () {
                    try {
                        return original[item];
                    } catch (e) {
                    }
                }
            });
        });

        ['responseType', 'method', 'ontimeout', 'timeout', 'withCredentials', 'onload', 'onerror', 'onprogress'].forEach((item) => {
            Object.defineProperty(instrumented, item, {
                get: function () {
                    try {
                        return original[item];
                    } catch (e) {
                    }
                },
                set: function (val) {
                    try {
                        original[item] = val;
                    } catch (e) {
                    }
                }
            });
        });

        ['addEventListener', 'open', 'send', 'abort', 'getAllResponseHeaders', 'getResponseHeader', 'overrideMimeType', 'setRequestHeader', 'setMethod'].forEach((item) => {
            Object.defineProperty(instrumented, item, {
                
                value: function () {
                    console.debug("before return:",original[item],arguments)
                    try {
                        return original[item].apply(original, arguments);
                    } catch (e) {
                    }
                }
            });
        });
    };

    if (!hostedLocally) {
        window.XMLHttpRequest = instrumentedXMLHttpRequest;
    }
})({ window });
