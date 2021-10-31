// Alert box design by Igor Ferrão de Souza: https://www.linkedin.com/in/igor-ferr%C3%A3o-de-souza-4122407b/
// 13-08-2021 PSS added myWindow as parameter, to be able to show it on blank screen
function cuteAlert({
  type,
  title,
  message,
  buttonText = "OK",
  confirmText = "OK",
  cancelText = "Cancel",
  myWindow = "",
  closeStyle
}) {
    return new Promise((resolve) => {
        //console.debug("window:", myWindow);
        var body;
        setInterval(() => { }, 5000);
        if (typeof myWindow != 'string') {
            body = myWindow.document.getElementById("container");
            //console.debug("body:", body);
            if (body == null) {
                body = document.getElementById("wordpress-org");
                //console.debug("document:", document);
            }
        }
        else {
           // console.debug("myWindow not defined!");
            body = document.getElementById('wordpress-org');
            //const body = document.getElementsByClassName("logged-in");
        }
        //const body = myWindow.document.getElementsByTagName("body");
        //console.debug("bodyresult:", body);
        const scripts = document.getElementsByTagName("script");
        let currScript = "";
        let src = "";
        for (let script of scripts) {
          if (script.src.includes("cute-alert.js")) {
              currScript = script;
              let src = currScript.src;
              src = src.substring(0, src.lastIndexOf("/"));
            }
        }
        // 07-09-2021 PSS added extra check to prevent empty src and missing "/"
        if (src === "") {
            // 13-08-2021 Modified the code below to be able to use it in manifest
            // 31-10-2021 Old call was deprecated, so altered it to current command
            src = chrome.runtime.getURL('/');
        }
    let closeStyleTemplate = "alert-close";
    if (closeStyle == "circle") {
      closeStyleTemplate = "alert-close-circle";
    }

    let btnTemplate = `
    <button class="alert-button ${type}-bg ${type}-btn">${buttonText}</button>
    `;
    if (type === "question") {
      btnTemplate = `
      <div class="question-buttons">
        <button class="confirm-button ${type}-bg ${type}-btn">${confirmText}</button>
        <button class="cancel-button error-bg error-btn">${cancelText}</button>
      </div>
      `;
    }

    const template = `
    <div class="alert-wrapper">
      <div class="alert-frame">
        <div class="alert-header ${type}-bg">
          <span class="${closeStyleTemplate}">X</span>
          <img class="alert-img" src="${src}img/${type}.svg" />
          
        </div>
        <div class="alert-body">
          <span class="alert-title">${title}</span>
          <span class="alert-message">${message}</span>
          ${btnTemplate}
        </div>
      </div>
    </div>
    `;

        body.insertAdjacentHTML("beforeend", DOMPurify.sanitize(template));

    const alertWrapper = myWindow.document.querySelector(".alert-wrapper");
    const alertFrame = myWindow.document.querySelector(".alert-frame");
    const alertClose = myWindow.document.querySelector(`.${closeStyleTemplate}`);

    if (type === "question") {
      const confirmButton = myWindow.document.querySelector(".confirm-button");
      const cancelButton = myWindow.document.querySelector(".cancel-button");

      confirmButton.addEventListener("click", () => {
        alertWrapper.remove();
        resolve("confirm");
      });

      cancelButton.addEventListener("click", () => {
        alertWrapper.remove();
        resolve();
      });
    } else {
      const alertButton = myWindow.document.querySelector(".alert-button");

      alertButton.addEventListener("click", () => {
        alertWrapper.remove();
        resolve();
      });
    }

    alertClose.addEventListener("click", () => {
      alertWrapper.remove();
      resolve();
    });

    alertWrapper.addEventListener("click", () => {
      alertWrapper.remove();
      resolve();
    });

    alertFrame.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });
}
// 13-08-2011 PSS added myWindow as parameter
function cuteToast({ type, message, timer = 5000, myWindow="" }) {
  return new Promise((resolve) => {
    
    //const body = myWindow.document.querySelector("body");
      if (typeof myWindow != 'string') {
          body = myWindow.document.getElementById("container");
          //console.debug("body:", body);
          if (body == null) {
              body = document.getElementById("wordpress-org");
              //console.debug("document:", document);
          }
      }
      else {
          // console.debug("myWindow not defined!");
          body = document.getElementById('wordpress-org');
          //const body = document.getElementsByClassName("logged-in");
      }
      if (document.querySelector(".toast-container")) {
          document.querySelector(".toast-container").remove();
      }
    const scripts = document.getElementsByTagName("script");
    let currScript = "";
    let src = "";
      for (let script of scripts) {
          if (script.src.includes("cute-alert.js")) {
              currScript = script;
              let src = currScript.src;
              src = src.substring(0, src.lastIndexOf("/"));
          }
      }
      // 07-09-2021 PSS added extra check to prevent empty src and missing "/"
      if (src === "") {
          // 13-08-2021 Modified the code below to be able to use it in manifest
          // 31-10-2021 Old call was deprecated, so altered it to current command
          src = chrome.runtime.getURL('/');
      }
      const template = `
    
    <div class="toast-container ${type}-bg">
      <div>
        <div class="toast-frame">
          <img class="toast-img" src="${src}img/${type}.svg" />
          <span class="toast-message">${message}</span>
          <div class="toast-close">X</div>
        </div>
        <div class="toast-timer ${type}-timer" style="animation: timer ${timer}ms linear;"/>
      </div>
    </div>
    </p>
    `;
      
      body.insertAdjacentHTML("afterend", DOMPurify.sanitize(template));

    const toastContainer = myWindow.document.querySelector(".toast-container");

    setTimeout(() => {
      toastContainer.remove();
      resolve();
    }, timer);

    const toastClose = myWindow.document.querySelector(".toast-close");

    toastClose.addEventListener("click", () => {
      toastContainer.remove();
      resolve();
    });
  });
}
