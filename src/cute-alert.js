// Alert box design by Igor Ferrão de Souza: https://www.linkedin.com/in/igor-ferr%C3%A3o-de-souza-4122407b/
// 13-08-2021 PSS added myWindow as parameter, to be able to show it on blank screen
function cuteAlert({
  type,
  title,
  message,
  buttonText = "OK",
  confirmText = "OK",
  cancelText = "Cancel",
  myWindow ="",
  closeStyle,
}) {
    return new Promise((resolve) => {
        console.debug("window:", myWindow);
        setInterval(() => { }, 5000);
        const body = myWindow.document.getElementById("wptf_container");
        //const body = myWindow.document.getElementsByTagName("body");
        console.debug("bodyresult:", body);
        const scripts = myWindow.document.getElementsByTagName("script");
        let currScript = "";
        // 13-08-2021 Modified the code below to be able to use it in manifest
        let src = chrome.extension.getURL('/');
        for (let script of scripts) {
          if (script.src.includes("cute-alert.js")) {
              currScript = script;
              src = currScript.src;
              src = src.substring(0, src.lastIndexOf("/"));
              console.debug("currScript not empty");
            }
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

        console.debug("Body before adding:", body);
    body.insertAdjacentHTML("beforeend", template);

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
function cuteToast({ type, message, timer = 5000, myWindow }) {
  return new Promise((resolve) => {
    if (myWindow.document.querySelector(".toast-container")) {
      myWindow.document.querySelector(".toast-container").remove();
    }
    const body = myWindow.document.querySelector("body");

    const scripts = myWindow.document.getElementsByTagName("script");
    let currScript = "";

    for (let script of scripts) {
      if (script.src.includes("cute-alert.js")) {
        currScript = script;
      }
    }

    let src = currScript.src;

 //   src = src.substring(0, src.lastIndexOf("/"));
      src = "";
    const template = `
    <div class="toast-container ${type}-bg">
      <div>
        <div class="toast-frame">
          <img class="toast-img" src="${src}/img/${type}.svg" />
          <span class="toast-message">${message}</span>
          <div class="toast-close">X</div>
        </div>
        <div class="toast-timer ${type}-timer" style="animation: timer ${timer}ms linear;"/>
      </div>
    </div>
    `;

    body.insertAdjacentHTML("afterend", template);

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
