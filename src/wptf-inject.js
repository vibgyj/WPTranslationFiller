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
        var instrumented = this;
        var myresponseText = original.responseText;
        var myresponse = original.response;
        var mystatusText = original.statusText;
        var myStatus = original.status;
        var myreadyState = original.readyState;
        var myoriginal = original;
        original.onreadystatechange = function () {

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
            //console.debug("readystate:",this.readyState,instrumented.readyState,original.readyState,myreadyState,myresponseText)
            if (instrumented.readyState === 4) {
                //console.debug("ResponseText:", original.response);
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

                   //console.debug(compositeMockData.response);

                    instrumented.statusText = original.statusText;
                    instrumented.status = compositeMockData.status * 1;
                    instrumented.response = compositeMockData.response;
                    instrumented.responseText = compositeMockData.response;

                    setTimeout(() => {
                        if (instrumented.onreadystatechange) {
                            //console.debug("in return 1:", instrumented.onreadystatechange)
                            return instrumented.onreadystatechange();
                        }

                    }, (compositeMockData.delay || 0) * 1);
                } else {
                    //console.debug("mock leeg", myresponseText,myresponse,mystatusText,myStatus);
                    instrumented.statusText = myresponseText;
                    instrumented.status = myStatus * 1;
                    instrumented.response = myresponse;
                    //instrumented.statusText = original.responseText;
                    //  instrumented.status = original.status * 1;
                    // instrumented.response = original.response;

                    if (instrumented.responseType === '' || instrumented.responseType === 'text') {
                        instrumented.responseText = original.responseText;
                    }
                    // console.debug("before return", original.onreadystatechange,myoriginal.onreadystatechange)
                    if (instrumented.onreadystatechange) {
                        //console.debug("in return2", instrumented.onreadystatechange)
                        return instrumented.onreadystatechange();
                    }
                }
            }
            else {

                //console.debug("no readyState!!")
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
                    // console.debug("before return:",original[item],arguments)
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

function checkLocale() {
    const localeString = window.location.href;
    locale = localeString.split("/");
    if (localeString.includes("wp-plugins")) {
        locale = locale[7]
    }
    else {
        locale = locale[6]
    }
    return locale;
}
