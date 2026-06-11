
async function reviewPage(apikeyOpenAI, destlang, OpenAIPrompt, reviewPrompt, openAiGloss, model, apikeyOpenRouter, translator,OpenRouterModel) {
    var countrows = 0;
    var progressbar;
    //console.debug("data.OpenAISelect:", model);
    //console.debug("Reviewing page with translator:", translator);
    // --- START progress bar setup ---
    const template = `
    <div class="indeterminate-progress-bar">
    <div class="indeterminate-progress-bar__progress"></div>
    </div>`;
    const myheader = document.querySelector('header');
    progressbar = document.querySelector(".indeterminate-progress-bar");
    if (!progressbar) {
        myheader.insertAdjacentHTML('afterend', template);
        progressbar = document.querySelector(".indeterminate-progress-bar");
    }
    if (progressbar) {
        progressbar.style.display = 'block';
        // Remove and re-add the inner progress div to restart the CSS animation
        const oldProgress = progressbar.querySelector('.indeterminate-progress-bar__progress');
        if (oldProgress) oldProgress.remove();
        const newProgress = document.createElement('div');
        newProgress.className = 'indeterminate-progress-bar__progress';
        progressbar.appendChild(newProgress);
    }
    // --- END progress bar setup ---

    var checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
    checkButton.innerText = "Reviewing";
    if (checkButton.className == "check_translation-button") {
        checkButton.className += " started";
    } else {
        checkButton.classList.remove("started", "translated", "restarted");
        checkButton.className = "check_translation-button restarted";
    }

    const rows = document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content");
    const rowArray = Array.from(rows);

    // Helper to process a single row, extracted so it can be called in parallel
    async function processRow(e) {
        let original = e.querySelector("span.original-raw").innerText;

        // Parse row ID (same logic as checkPage)
        let rowfound = e.parentElement.parentElement.parentElement.parentElement.id;
        let row = rowfound.split("-")[1];
        let newrow = rowfound.split("-")[2];
        if (typeof newrow !== "undefined") {
            row = row.concat("-", newrow);
        } else {
            rowfound = e.querySelector(`div.translation-wrapper textarea`).id;
            row = rowfound.split("_")[1];
        }

        // Skip untranslated records
        let mypreview = document.querySelector("#preview-" + row);
        if (!mypreview || mypreview.classList.contains('no-translations')) {
            return;
        }

        // Check comments for translate flag
        let toTranslate = true;
        let precomment = e.querySelector(".source-details__comment p");
        if (precomment !== null) {
            let comment = precomment.innerText.replace(/(\r\n|\n|\r)/gm, "");
            toTranslate = checkComments(comment.trim());
        }
        if (!toTranslate) return;

        // Only review rows that have a translation status
        let currec = document.querySelector(
            `#editor-${row} div.editor-panel__left div.panel-header span.panel-header__bubble`
        );
        if (!currec || (currec.innerText !== "transFill" && currec.innerText !== "current" && currec.innerText !== "waiting")) {
            return;
        }

        // Check singular vs plural
        let pluralpresent = document.querySelector(
            `#preview-${row} .translation.foreign-text li:nth-of-type(1) span.translation-text`
        );
        let transtype = pluralpresent ? "plural" : "single";

        if (transtype === "single") {
            let textareaElem = e.querySelector("textarea.foreign-text");
            let translatedText = textareaElem ? textareaElem.innerHTML : "";
            let preview = document.querySelector("#preview-" + row + " td.translation");

            if (translatedText !== "" && translatedText !== "No suggestions") {
                let result = await AIreview(
                    original, destlang, e, apikeyOpenAI,
                    OpenAIPrompt, reviewPrompt, replacePreVerb,
                    row, transtype, "", false, locale,
                    false, true, translatedText, preview, openAiGloss, model, apikeyOpenRouter, translator, OpenRouterModel
                );
            }
        } else {
            // Plural — review first line only
            let previewElem = document.querySelector(
                `#preview-${row} .translation.foreign-text li:nth-of-type(1) span.translation-text`
            );
            let translatedText = previewElem ? previewElem.innerText : "";
            let preview = document.querySelector("#preview-" + row + " td.translation");

            if (translatedText !== "" && translatedText !== "No suggestions") {
                let result = await AIreview(
                    original, destlang, e, apikeyOpenAI,
                    OpenAIPrompt, reviewPrompt, replacePreVerb,
                    row, "single", "", false, locale,
                    false, true, translatedText, preview, openAiGloss, model, apikeyOpenRouter, translator, OpenRouterModel
                );
            }
        }
    }

    // Process rows in batches of 20
    const batchSize = 10;
    for (let i = 0; i < rowArray.length; i += batchSize) {
        const batch = rowArray.slice(i, i + batchSize);
        await Promise.all(batch.map(e => processRow(e)));
        // Small delay between batches to avoid rate limit errors
        await delay(1000);
    }

    // Done
    checkButton = document.querySelector(".wptfNavBarCont a.check_translation-button");
    checkButton.classList.remove("started", "restarted");
    checkButton.className = "check_translation-button ready";
    checkButton.innerText = "Reviewed";

    document.querySelector(".indeterminate-progress-bar").style.display = "none";

    toastbox("info", "OpenAI review completed!", "2000", "OpenAI review");
}