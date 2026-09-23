document.addEventListener("DOMContentLoaded", () => {
  console.log("Loading test results from storage...");
  
  chrome.storage.local.get("testResults", (data) => {
    console.log("Retrieved from storage:", data);

    const results = data.testResults;
    if (!results) {
      document.getElementById("results").innerHTML = "<p>No test results found.</p>";
      return;
    }

    const styleTag = document.createElement("style");
    styleTag.textContent = results.styles || "";
    document.head.appendChild(styleTag);

    document.getElementById("results").innerHTML = `
      ${results.resultsHtml}
      ${results.summary}
    `;
  });
});
