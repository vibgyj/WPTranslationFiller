# WordPress Translation Filler (Extended) - Google Chrome/Firefox Extension

Automatically fill WordPress translations from API's and indicate the accuracy of translation according to locale glossary.

This extension helps with Wordpress Translation and has the following features:
1. Fetch translations from API's like DeepL, OpenAI, Google and Microsoft.
2. Indicate translation accuracy based on uploaded locale glossary.
3. Provide convenient Approve/Reject button based on translation accuracy.
4. Integrate with Languagetool to run spellchecks on your translations.
5. Replace strings pre/post translation and convert words to lowercase.
6. Integrate with the [GlotDict](https://github.com/Mte90/GlotDict) Google Chrome/Firefox extension.

For full documentation visit the [Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki)
If any bugs/problems are found, [please add an issue](https://github.com/vibgyj/WPTranslationFiller/issues/new).

# Installation

## Method 1 (recommended)
1. Download the [Google Chrome extension](https://chromewebstore.google.com/detail/wordpress-translation-fil/fpmjcgmhkbgdkggnkbamibglcpiijhim) or [Firefox add-on](https://addons.mozilla.org/nl/firefox/addon/wp-translation-filler-extended/) from their respective stores. You can also download the [original (non-extended) extension](https://chrome.google.com/webstore/detail/wordpress-translation-fil/jpkhdloebckgcnealfnkpkafpmhkmphj)
2. WordPress Translation Filler Extended will be installed and can be activated.
3. Open the options page from within the Extensions or add-ons menu and set the [parameters as shown in the Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki/2.-Parameters)

## Method 2 (not regulary updated)
1. Get the **chrome-extension.zip** (and extract to a folder) or **firefox-addon.zip** from [releases](https://github.com/vibgyj/WPTranslationFiller/releases).
2. Open Google Chrome extensions and enable **Developer mode** or open Firefox add-ons.
3. For **Google Chrome**, use the **Load unpacked** button and point to the extracted folder. For **Firefox**, click on the cog-icon in the top-right and click **Install Add-on From File…**
4. WordPress Translation Filler will be installed and can be activated.
5. Open the options page from within the Extensions or add-ons menu and set the [parameters as shown in the Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki/2.-Parameters)

## Method 3 (Chrome only)
1. Download the [**src** folder](https://download-directory.github.io/?url=https%3A%2F%2Fgithub.com%2Fvibgyj%2FWPTranslationFiller%2Ftree%2Fmaster%2Fsrc)
2. Open Google Chrome extensions and enable **Developer mode**.
3. Use the **Load unpacked** button and point to the extracted folder.
4. WordPress Translation Filler will be installed and can be activated.
5. Open the options page from within the Extensions or add-ons menu and set the [parameters as shown in the Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki/2.-Parameters)

# After installation
1. After the installation and activation, you will get new buttons within the project.
2. The "Translate" button above the list translates the whole page selected.
3. The "Translate" button within the editor, only translates the selected record.
4. The "Check" button is used to check if the translated page is using glossary verbs.

# Git versioning
1. git tag v1.4.1
2. git push --tags
