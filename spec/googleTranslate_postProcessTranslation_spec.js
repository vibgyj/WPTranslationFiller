describe("Google translation - postProcessTranslation", function () {

    // ---------------------------------------------------------------------------
    // Shared test configuration — reset before every test so no state leaks
    // ---------------------------------------------------------------------------
    let translator;

    beforeEach(function () {
        window.DebugMode            = false;
        window.no_period            = false;
        window.Rearrange_Sentences  = false;
        translator                  = "google";
    });

    // ---------------------------------------------------------------------------
    // Helper: wraps postProcessTranslation with shared defaults
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

        const MIXED_ORIGINAL     = "%1$s some &quot; random%d text %l";
        const MIXED_PREPROCESSED = "[0] some [1] random[2] text [3]";

        it("should restore placeholders when translation is unchanged (basic)", function () {
            const result = callPostProcess(MIXED_ORIGINAL, MIXED_PREPROCESSED, [], MIXED_PREPROCESSED);
            expect(result).toEqual(MIXED_ORIGINAL);
        });

        it("should restore placeholders when translation is unchanged (%d variant)", function () {
            const result = callPostProcess(MIXED_ORIGINAL, MIXED_PREPROCESSED, [], MIXED_PREPROCESSED);
            expect(result).toEqual(MIXED_ORIGINAL);
        });

        it("should restore placeholders — anchor tag pattern (%1$s...%2$s)", function () {
            const original      = "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.";
            const preprocessed  = "Save your API Key you have received by email or you can get it on your [0]Imagify account page[1].";
            // Translator added a space before [1]
            const translatedText = "Save your API Key you have received by email or you can get it on your [0]Imagify account page [1].";
            const expected      = original;

            expect(callPostProcess(original, translatedText, [], preprocessed)).toEqual(expected);
        });

        it("should restore placeholders — extra spaces around placeholders in translation", function () {
            const original       = "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?";
            const preprocessed   = "No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2]bulk optimization[3] directly?";
            // Translator added spaces around [2] and [3]
            const translatedText = "No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2] bulk optimization [3] directly?";
            const expected       = original;

            expect(callPostProcess(original, translatedText, [], preprocessed)).toEqual(expected);
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
