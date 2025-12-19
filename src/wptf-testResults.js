document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("testResults", (data) => {
    if (data && data.testResults) {
      document.documentElement.innerHTML = data.testResults;
      console.log("Test results loaded.");
    } else {
      document.body.innerHTML = "<h1>No test results found.</h1>";
      console.warn("No test results in storage.");
    }
  });
});
