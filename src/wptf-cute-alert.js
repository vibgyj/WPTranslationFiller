// Alert box design by Igor Ferrão de Souza: https://www.linkedin.com/in/igor-ferr%C3%A3o-de-souza-4122407b/
// Helper: tekst met <br>-behoud als nodes (geen HTML-parsing)
function appendWithBreaks(el, str) {
    const doc = el.ownerDocument;
    String(str ?? '').split(/<br\s*\/?>/i).forEach((part, i) => {
        if (i > 0) el.appendChild(doc.createElement('br'));
        el.appendChild(doc.createTextNode(part));
    });
}
const cuteAlert = ({
    type,
    title,
    message,
    img = "/img",
    buttonText = 'OK',
    confirmText = 'OK',
    vibrate = [],
    playSound = "error-alert.flac",
    cancelText = 'Cancel',
    closeStyle,
    myWindow = ""
}) => {
    return new Promise(resolve => {
        const existingAlert = document.querySelector('.alert-wrapper');

        if (existingAlert) {
            existingAlert.remove();
        }
        var body;
        if (typeof myWindow != 'string') {
            body = myWindow.document.getElementById("container");
            if (body == null) {
                // fix for #177 message no longer shown due to change of template on WordPress.org
                //body = document.getElementById("wordpress-org");
                body = document.getElementsByClassName("gp-content")[0];
            }
        }
        else {
            const body = document.querySelector('body');
        }
        const scripts = document.getElementsByTagName("script");
        let src = "";

        for (let script of scripts) {
            if (script.src.includes("cute-alert.js")) {
                src = script.src.substring(0, script.src.lastIndexOf('/'));
            }
        }
        if (src === "") {
            // 13-08-2021 Modified the code below to be able to use it in manifest
            src = chrome.runtime.getURL('/');
            src = src.substring(0, src.lastIndexOf('/'));
        }

      
      

        if (vibrate.length > 0) {
            navigator.vibrate(vibrate);
        }

        if (playSound !== null && type === "error") {
            if (Notification.permission !== "denied") {
                //   console.debug('permission:', Notification.permission)
                Notification.requestPermission((permission) => {
                    if (permission === "granted") {
                        //console.debug('granted:', permission)
                        let sound = new Audio(src + playSound);
                        const promise = sound.play();
                        //console.debug("sound:",promise)
                        if (promise !== undefined) {
                            promise.then(() => {
                                //console.debug("sound is played!")
                                sound = new Audio(src + playSound);
                                sound.muted = true;
                               // sound.play();
                            }).catch(error => {
                                // Autoplay was prevented.
                                console.debug("sound is not allowed!!")
                            });
                        }
                        else {
                            console.debug("promise undefined")
                        }
                    };
                });
            }
            
        }

      
        // Wrapper + frame
        const alertWrapper = myWindow.document.createElement('div');
        alertWrapper.className = 'alert-wrapper';

        const alertFrame = myWindow.document.createElement('div');
        alertFrame.className = 'alert-frame';

        // Header
        const alertHeader = myWindow.document.createElement('div');
        if (img !== '') alertHeader.className = 'alert-header ' + type + '-bg';

        const alertClose = myWindow.document.createElement('span');
        alertClose.className = 'alert-close ' + (closeStyle === 'circle' ? 'alert-close-circle' : 'alert-close-default');
        alertClose.textContent = 'X';
        alertHeader.appendChild(alertClose);

        if (img !== '') {
            const image = myWindow.document.createElement('img');
            image.className = 'alert-img';
            image.src = src + img + '/' + type + '.svg';
            alertHeader.appendChild(image);
        }

        // Body
        const alertBody = myWindow.document.createElement('div');
        alertBody.className = 'alert-body';

        const titleSpan = myWindow.document.createElement('span');
        titleSpan.className = 'alert-title';
        appendWithBreaks(titleSpan, title);

        const messageSpan = myWindow.document.createElement('span');
        messageSpan.className = 'alert-message';
        appendWithBreaks(messageSpan, message);

        alertBody.append(titleSpan, messageSpan);

        // Knoppen als nodes
        if (type === 'question') {
            const btnWrap = myWindow.document.createElement('div');
            btnWrap.className = 'question-buttons';

            const confirmButton = myWindow.document.createElement('button');
            confirmButton.className = 'confirm-button ' + type + '-bg ' + type + '-btn';
            confirmButton.textContent = confirmText;

            const cancelButton = myWindow.document.createElement('button');
            cancelButton.className = 'cancel-button error-bg error-btn';
            cancelButton.textContent = cancelText;

            btnWrap.append(confirmButton, cancelButton);
            alertBody.appendChild(btnWrap);

            confirmButton.addEventListener('click', () => {
                alertWrapper.remove();
                resolve('confirm');
            });
            cancelButton.addEventListener('click', () => {
                alertWrapper.remove();
                resolve('cancel');
            });
        } else {
            const alertButton = myWindow.document.createElement('button');
            alertButton.className = 'alert-button ' + type + '-bg ' + type + '-btn';
            alertButton.textContent = buttonText;
            alertBody.appendChild(alertButton);

            alertButton.addEventListener('click', () => {
                alertWrapper.remove();
                resolve('ok');
            });
        }

        // Samenvoegen + invoegen (= insertAdjacentHTML('afterend', ...))
        alertFrame.append(alertHeader, alertBody);
        alertWrapper.appendChild(alertFrame);
        body.after(alertWrapper);

        // Close-knop
        alertClose.addEventListener('click', () => {
            alertWrapper.remove();
            resolve('close');
        });
        
       

        /*     alertWrapper.addEventListener('click', () => {
              alertWrapper.remove();
              resolve();
            }); */

        alertFrame.addEventListener('click', e => {
            e.stopPropagation();
        });
    });
};

const cuteToast = ({ type, message, timer = 2000, vibrate = [], playSound = "/error-alert.flac", img = "/img", title = "", myWindow }) => {
    var body;
    return new Promise(resolve => {
        //console.debug("params:", type, message, timer, vibrate, playSound, img, title, myWindow);
        if (typeof myWindow == 'undefined') {
            body = document.querySelector('body');
        }
        else {
            
            body = myWindow.document.querySelector("#consistency");
        }
        const scripts = document.getElementsByTagName("script");
        let src = "";

        for (let script of scripts) {
            if (script.src.includes('cute-alert.js')) {
                src = script.src.substring(0, script.src.lastIndexOf('/'));
            }
        }
        if (src === "") {
            // 13-08-2021 Modified the code below to be able to use it in manifest
            src = chrome.runtime.getURL('/');
            src = src.substring(0, src.lastIndexOf('/'));
        }
        if (typeof myWindow == "undefined") {
            templateContainer = document.getElementById('toast-container');
        }
        else {
            templateContainer = myWindow.getElementById('toast-container');
        }
        if (!templateContainer) {
            body.insertAdjacentHTML(
                'afterend',
                '<div class="toast-container"></div>',
            );
            if (typeof myWindow == "undefined") {
                templateContainer = document.querySelector('.toast-container');
            }
            else {
                templateContainer = myWindow.document.querySelector('.toast-container');
            }
        }

        const toastId = id();

        // Bouw de toast-content als nodes
        const toastContentEl = myWindow && myWindow.document
            ? myWindow.document.createElement('div')
            : document.createElement('div');
        const doc = toastContentEl.ownerDocument;

        toastContentEl.className = 'toast-content ' + type + '-bg';
        toastContentEl.id = `${toastId}-toast-content`;

        const outer = doc.createElement('div');

        const frame = doc.createElement('div');
        frame.className = 'toast-frame';

        const bodyDiv = doc.createElement('div');
        bodyDiv.className = 'toast-body';

        if (img !== '') {
            const bodyImg = doc.createElement('img');
            bodyImg.className = 'toast-body-img';
            bodyImg.src = src + img + '/' + type + '.svg';
            bodyDiv.appendChild(bodyImg);
        }

        const bodyContent = doc.createElement('div');
        bodyContent.className = 'toast-body-content';

        const titleSpan = doc.createElement('span');
        titleSpan.className = 'toast-title';
        appendWithBreaks(titleSpan, title);      // dezelfde helper als bij het hoofd-alert

        const messageSpan = doc.createElement('span');
        messageSpan.className = 'toast-message';
        appendWithBreaks(messageSpan, message);

        bodyContent.append(titleSpan, messageSpan);

        const closeDiv = doc.createElement('div');
        closeDiv.className = 'toast-close';
        closeDiv.id = `${toastId}-toast-close`;
        closeDiv.textContent = 'X';

        bodyDiv.append(bodyContent, closeDiv);
        frame.appendChild(bodyDiv);
        outer.appendChild(frame);

        // Timer-balk (alleen als er een img is) — nu mét correcte style en gesloten div
        if (img !== '') {
            const timerDiv = doc.createElement('div');
            timerDiv.className = 'toast-timer ' + type + '-timer';
            timerDiv.style.animation = `timer ${timer}ms linear`;
            outer.appendChild(timerDiv);
        }

        toastContentEl.appendChild(outer);

        // Invoegen: vóór de bestaande eerste toast, of in de container
        let toasts;
        if (typeof myWindow == 'undefined') {
            toasts = document.querySelectorAll('.toast-content');
        } else {
            toasts = myWindow.querySelectorAll('.toast-content');
        }

        if (toasts.length) {
            toasts[0].before(toastContentEl);        // = insertAdjacentHTML('beforebegin', ...)
        } else {
            templateContainer.replaceChildren(toastContentEl);   // = innerHTML = ...
        }

        // toastContent-referentie ophalen (id ongewijzigd, dus dit blijft werken)
        if (typeof myWindow == 'undefined') {
            toastContent = document.getElementById(`${toastId}-toast-content`);
        }
       else {
            toastContent = myWindow.getElementsByClassName("toast-content info-bg")[0];
       }

        if (vibrate.length > 0) {
            navigator.vibrate(vibrate);
        }

        if (playSound !== null) {
            let sound = new Audio(src + playSound);
           // sound.play();
        }
        setTimeout(() => {
            toastContent.remove();
            resolve();
        }, timer);
        if (typeof myWindow == 'undefined') {
            toastClose = document.getElementById(`${toastId}-toast-close`);
        }
        else {
            toastClose = myWindow.getElementsByClassName("toast-close")[0];
       }

        toastClose.addEventListener('click', () => {
            toastContent.remove();
            resolve();
        });
    });
};

const id = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
};
// helper: zet een melding met <br> om naar tekstnodes + <br>-elementen (geen HTML-parsing)
function appendMessageWithBreaks(container, text) {
    const parts = String(text ?? '').split(/<br\s*\/?>/i);
    parts.forEach((part, i) => {
        if (i > 0) container.appendChild(document.createElement('br'));
        container.appendChild(document.createTextNode(part));
    });
}