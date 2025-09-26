async function libretranslate(text, source = "en", target = "nl") {
    const proxy = "https://corsproxy.io/?"; // free CORS proxy
const url = proxy + encodeURIComponent("https://libretranslate.de/translate");
 try {
const response = await fetch(url, {
 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: "text"
        // api_key: "" // optional for public instance
      })
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.translatedText;
  } catch (err) {
    console.error("Translation failed:", err);
    return null;
  }
}

// Example usage:
(async () => {
  const text = "Hello, how are you?";
  const translated = await libretranslate(text);
  console.log("Translated:", translated);
})();
