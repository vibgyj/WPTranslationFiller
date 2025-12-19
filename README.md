# WordPress Translation Filler (Extended) - Google Chrome/Firefox Extension/Edge

Automatically fill translations on translate.wordpress.org using API's and indicate the accuracy of translation according to locale glossary.

This extension helps with translation of originals on translate.wordpress.org and has the following features:
1. Fetch translations using API's like DeepL, OpenAI, Google and Microsoft.
2. Indicate translation accuracy based on uploaded locale glossary.
3. Provide convenient Approve/Reject button based on translation accuracy.
4. Integrate Languagetool LT to run spellchecks on your translations.
5. Replace strings pre/post translation and convert words to lowercase.
6. Prevent altering brandnames to lowercase, by adding the brands into the field "SpellCheck Ignore words".
7. Words within this table are also not marked when using "LT spellchecker".
8. Words within this table will also not get a "hyphen" added within the translation
9. Improved behavior when GlotDict is also active: [GlotDict](https://github.com/Mte90/GlotDict) Google Chrome/Firefox extension.
10. Support for OpenAI-compatible APIs (Ollama, vLLM, OpenRouter, etc.) via configurable base URL.

# OpenAI-Compatible API Providers

The extension supports any OpenAI-compatible API by allowing you to configure a custom base URL. This enables you to use local LLM providers like Ollama or alternative cloud providers like OpenRouter.

## Configuration

In the options page, set the **OpenAI Base URL** field to your provider's API endpoint:

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenAI (default) | `https://api.openai.com/v1` | Standard OpenAI API |
| Ollama | `http://localhost:11434/v1` | Local LLM server |
| vLLM | `http://localhost:8000/v1` | High-performance local inference |
| OpenRouter | `https://openrouter.ai/api/v1` | Multi-provider gateway |

## Fetching Available Models

After setting your base URL and API key, click the **Fetch Models** button next to the model dropdown. This will query the API's `/models` endpoint and populate the dropdown with all available models from your provider. This is especially useful for:
- Seeing which models are available on your Ollama instance
- Discovering available models on OpenRouter
- Ensuring you select a valid model name

## Using Ollama

1. Install [Ollama](https://ollama.ai/) on your machine
2. Pull a model: `ollama pull llama3.2` (or any model you prefer)
3. In the extension options:
   - Set **OpenAI Base URL** to `http://localhost:11434/v1`
   - Set **OpenAI API Key** to `ollama` (or any non-empty value)
   - In the **Select a model for OpenAI** dropdown, manually select a model or use the model name from Ollama (e.g., `llama3.2`)

## Using OpenRouter

1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. In the extension options:
   - Set **OpenAI Base URL** to `https://openrouter.ai/api/v1`
   - Set **OpenAI API Key** to your OpenRouter API key
   - Select the desired model (use OpenRouter model names like `anthropic/claude-3-haiku`)

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
