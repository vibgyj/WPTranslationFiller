# WordPress Translation Filler (Extended) - Google Chrome/Firefox Extension/Edge

Automatically populates translations on translate.wordpress.org via APIs and validates accuracy against the local glossary.

This extension helps with translation of originals on translate.wordpress.org and has the following features:
1. Fetch translations using APIs like DeepL, OpenAI, Google and Microsoft.
2. Indicate translation accuracy based on uploaded locale glossary.
3. Provide convenient Approve/Reject button based on translation accuracy.
4. Integrate Languagetool LT to run spellchecks on your translations.
5. Replace strings pre/post translation and convert words to lowercase.
6. Prevent altering brandnames to lowercase, by adding the brands into the field "SpellCheck Ignore words".
7. Words within this table are also not marked when using "LT spellchecker".
8. Words within this table will also not get a "hyphen" added within the translation
9. Improved behavior when GlotDict is also active: [GlotDict](https://github.com/Mte90/GlotDict) Google Chrome/Firefox extension.

For full documentation visit the [Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki).
If any bugs/problems are found, [please add an issue](https://github.com/vibgyj/WPTranslationFiller/issues/new).

# Installation

## Method 1 (recommended)
1. Download the [Google Chrome extension](https://chromewebstore.google.com/detail/wordpress-translation-fil/fpmjcgmhkbgdkggnkbamibglcpiijhim) or [Firefox add-on](https://addons.mozilla.org/nl/firefox/addon/wp-translation-filler-extended/) from their respective stores. You can also download the [original (non-extended) extension](https://chrome.google.com/webstore/detail/wordpress-translation-fil/jpkhdloebckgcnealfnkpkafpmhkmphj)
2. WordPress Translation Filler Extended will be installed, after which you need to activate and configure it.
3. Open the options page from within the Extensions or add-ons menu and set the [parameters as shown in the Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki/2.-Parameters)

## Method 2 (Chrome only)
1. Create the ZIP using the dropdown "Code", and download it (https://github.com/vibgyj/WPTranslationFiller)
2. Move the downloaded ZIP to a installation folder.
3. Extract the ZIP.
2. Open Google Chrome extensions and enable **Developer mode**.
3. Use the **Load unpacked** button and point to the extracted folder "\src\manifest".
4. WordPress Translation Filler will be installed,after which you need to activate and configure it.
5. Open the options page from within the Extensions or add-ons menu and set the [parameters as shown in the Wiki](https://github.com/vibgyj/WPTranslationFiller/wiki/2.-Parameters)

# After installation
1. After the installation and activation, you will get new buttons within the project.
2. The "Translate" button above the list translates the whole page selected.
3. The "Translate" button within the editor, only translates the selected record.
4. The "Check" button is used to check if the translated page is using glossary verbs.
5. For other functionality check the Wiki pages.

# Git versioning
1. git tag v1.4.1
2. git Extended tag 2.7.4
2. git push --tags
