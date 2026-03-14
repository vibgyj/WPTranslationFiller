 // ---------------------------------------------------------------------------
    // Shared test configuration — reset before every test so no state leaks
    // ---------------------------------------------------------------------------
    beforeEach(function () {
        window.DebugMode            = false;
        window.no_period            = false;
        window.Rearrange_Sentences  = false;
    });

describe("Google translation - processPlaceholderSpaces", function () {

    // ---------------------------------------------------------------------------
    // Helper: wraps processPlaceholderSpaces for brevity
    // ---------------------------------------------------------------------------
    function callProcess(original, translated) {
        return processPlaceholderSpaces(original, translated);
    }

    // ---------------------------------------------------------------------------
    // Removing extra spaces around placeholders
    // ---------------------------------------------------------------------------
    describe("removing extra spaces around placeholders", function () {

        it("should remove space added inside [0]...[1] by translator", function () {
            expect(callProcess(
                "some text [0]here[1]",
                "emos txet [0] ereh [1]"))
                .toEqual("emos txet [0]ereh[1]");
        });

        it("should remove spaces added inside all placeholders across a longer string", function () {
            expect(callProcess(
                "[0]product_title[1] is not available until [2]direct_date[3]",
                "[0] product_title [1] is not available until [2] direct_date [3]"))
                .toEqual("[0]product_title[1] is not available until [2]direct_date[3]");
        });

        it("should remove spaces only around placeholders that are adjacent in original (not around standalone [2])", function () {
            expect(callProcess(
                "[0]Edit[1] this [2] template or [3]create[4] a new one",
                "[0] Tide [1] siht [2] etalpmet ro [3] etaerc [4] a wen eno"))
                .toEqual("[0]Tide[1] siht [2] etalpmet ro [3]etaerc[4] a wen eno");
        });

        it("should remove space after opening placeholder when original has no space", function () {
            expect(callProcess(
                "[0]Create[1] a new [2] template",
                "[0] Etaerc [1] a wen [2] etalpmet"))
                .toEqual("[0]Etaerc[1] a wen [2] etalpmet");
        });

        it("should leave space after standalone opening placeholder untouched", function () {
            expect(callProcess(
                "[0] some text here",
                "[0] some text here"))
                .toEqual("[0] some text here");
        });

        it("should remove space added after [0] and before [1] when original has none", function () {
            expect(callProcess(
                "some text [0]here[1]",
                "some text [0] here [1]"))
                .toEqual("some text [0]here[1]");
        });

        it("should remove space added after [0] when original has no space after it", function () {
            expect(callProcess(
                "some text[0] here[1]",
                "some text [0] here [1]"))
                .toEqual("some text[0] here[1]");
        });

    });

    // ---------------------------------------------------------------------------
    // Restoring missing spaces around placeholders
    // ---------------------------------------------------------------------------
    describe("restoring missing spaces around placeholders", function () {

        it("should restore space before trailing placeholder when translator dropped it", function () {
            expect(callProcess(
                "some text here [0]",
                "some text here[0]"))
                .toEqual("some text here [0]");
        });

        it("should restore space after opening placeholder when translator dropped it", function () {
            expect(callProcess(
                "[0] cow [1] mytext here",
                "[0]cow [1] mytext here"))
                .toEqual("[0] cow [1] mytext here");
        });

    });

    // ---------------------------------------------------------------------------
    // Combined add and remove space corrections
    // ---------------------------------------------------------------------------
    describe("combined add/remove space corrections", function () {

        it("should remove space before [0] and restore space after [1] (shift correction)", function () {
            // Translator added a space before [0] and dropped the space after [1]
            expect(callProcess(
                "some text[0] here [1]",
                "some text [0] here[1]"))
                .toEqual("some text[0] here [1]");
        });

        it("should leave trailing placeholder spacing untouched when position shifted in translation", function () {
            // Translator moved [0] to end of string — spacing at end is preserved as-is
            expect(callProcess(
                "Add Products to [0] Category",
                "Producten toevoegen aan categorie [0]"))
                .toEqual("Producten toevoegen aan categorie [0]");
        });

    });

});
