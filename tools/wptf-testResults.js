document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("testResults", (data) => {
    if (data && data.testResults) {
      document.documentElement.innerHTML = data.testResults;
      console.log("Test results loaded.");
    } else {
        document.body.replaceChildren();
        const h1 = document.createElement("h1");
        h1.textContent = "No test results found.";
        document.body.appendChild(h1);
      console.warn("No test results in storage.");
    }
  });
});