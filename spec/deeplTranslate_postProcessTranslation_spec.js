describe("DeepL translation - postProcessTranslation", function () {

    // ---------------------------------------------------------------------------
    // Shared test configuration — reset before every test so no state leaks
    // ---------------------------------------------------------------------------
    let translator;

    beforeEach(function () {
        // Reset every mutable global your code depends on
        window.DebugMode         = false;   // disable debug noise during tests
        window.no_period         = false;
        window.Rearrange_Sentences = false;
        translator               = "deepl";
    });

    // ---------------------------------------------------------------------------
    // Helper: builds the default extra args so every call is consistent
    // ---------------------------------------------------------------------------
    function callPostProcess(original, translatedText, replaceVerb, originalPreProcessed, overrides) {
        const defaults = {
            translator:       translator,
            convertToLower:   false,
            spellCheckIgnore: "WordPress\nGoogle",
            locale:           "nl",
        };
        const opts = Object.assign({}, defaults, overrides);

        return postProcessTranslation(
            original,
            translatedText,
            replaceVerb || [],
            originalPreProcessed,
            opts.translator,
            opts.convertToLower,
            opts.spellCheckIgnore,
            opts.locale
        );
    }

    // ---------------------------------------------------------------------------
    // Placeholder replacement
    // ---------------------------------------------------------------------------
    describe("placeholder replacement", function () {

        const MIXED_ORIGINAL          = "%1$s some &quot; random%d text %l";
        const MIXED_PREPROCESSED      = '<x id="var0"/> some <x id="var1"/> random<x id="var2"/> text <x id="var3"/>';

        it("should restore placeholders when translation is unchanged (basic)", function () {
            const result = callPostProcess(MIXED_ORIGINAL, MIXED_PREPROCESSED, [], MIXED_PREPROCESSED);
            expect(result).toEqual(MIXED_ORIGINAL);
        });

        it("should restore placeholders when translation is unchanged (%d variant)", function () {
            const result = callPostProcess(MIXED_ORIGINAL, MIXED_PREPROCESSED, [], MIXED_PREPROCESSED);
            expect(result).toEqual(MIXED_ORIGINAL);
        });

        it("should restore placeholders — anchor tag pattern (%1$s...%2$s)", function () {
            const original          = "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.";
            const preprocessed      = 'Save your API Key you have received by email or you can get it on your <x id="var0"/>Imagify account page<x id="var1"/>.';
            const expected          = original;

            const result = callPostProcess(original, preprocessed, [], preprocessed);
            expect(result).toEqual(expected);
        });

        it("should restore placeholders — space dropped AFTER closing placeholder in translation", function () {
            const original         = "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?";
            const preprocessed     = 'No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/> directly?';
            // Translator dropped the space before "directly"
            const translatedText   = 'No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/>directly?';
            const expected         = original;

            const result = callPostProcess(original, translatedText, [], preprocessed);
            expect(result).toEqual(expected);
        });

        it("should restore placeholders — extra space BEFORE closing placeholder in translation", function () {
            const original         = "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?";
            const preprocessed     = 'No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/> directly?';
            // Translator added extra space before var3
            const translatedText   = 'Nog geen bestanden. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization <x id="var3"/> directly?';
            const expected         = "Nog geen bestanden. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?";

            const result = callPostProcess(original, translatedText, [], preprocessed);
            expect(result).toEqual(expected);
        });

    });

    // ---------------------------------------------------------------------------
    // Verb replacement
    // Note: these two tests look similar but may differ in spacing or edge cases
    // around placeholder boundaries — keep both.
    // ---------------------------------------------------------------------------
    describe("verb replacement", function () {

        const VERBS = [
            ["random", "modnar"],
            ["here",   "ereh"],
        ];

        it("should replace placeholders in verbs", function () {
            const result = callPostProcess(
                "some random text here",
                "some random txet here",
                VERBS,
                "some random txet here"
            );
            expect(result).toEqual("some modnar txet ereh");
        });

        it("should replace verbs", function () {
            const result = callPostProcess(
                "some random text here",
                "some random txet here",
                VERBS,
                "some random txet here"
            );
            expect(result).toEqual("some modnar txet ereh");
        });

    });

    // ---------------------------------------------------------------------------
    // Case correction
    // ---------------------------------------------------------------------------
    describe("case correction", function () {

        it("should capitalise first letter when original starts with uppercase", function () {
            const result = callPostProcess("Some random text", "emos modnar txet", [], "Some random text");
            expect(result).toEqual("Emos modnar txet");
        });

        it("should lowercase first letter when original starts with lowercase", function () {
            const result = callPostProcess("some random text", "Emos modnar txet", [], "Emos modnar txet");
            expect(result).toEqual("emos modnar txet");
        });

        it("should not alter case for non-Latin scripts", function () {
            const tamil  = "சில குறிப்பில்லா எழுத்துக்கள்";
            const result = callPostProcess("Some random text", tamil, [], tamil);
            expect(result).toEqual(tamil);
        });

    });

});
