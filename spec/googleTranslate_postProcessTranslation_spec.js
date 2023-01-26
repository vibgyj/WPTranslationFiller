describe("Google translation - postProcessTranslation", function () {
    it("should replace placeholders in translation 1", function () {
        expect(
            postProcessTranslation(
                "%1$s some &quot; random%d text %l",
                "[0] emos [1] modnar [2] txet [3]", [], '[0] emos [1] modnar[2] txet [3]'))
            .toEqual("%1$s emos &quot; modnar%d txet %l");
    });

    it("should replace placeholders in translation 2", function () {
        expect(
            postProcessTranslation(
                "%1$s some &quot; random%d text %l",
                "[0] some [1] random [2] text [3]", [], '[0] some [1] random[2] text [3]'))
            .toEqual("%1$s some &quot; random%d text %l");
    });
    it("should replace placeholders in translation 3", function () {
        expect(
            postProcessTranslation(
                "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.",
                "Save your API Key you have received by email or you can get it on your [0]Imagify account page [1].", [], 'Save your API Key you have received by email or you can get it on your [0]Imagify account page[1].'))
            .toEqual("Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.");
    });
    it("should replace placeholders at start in translation 4", function () {
        expect(
            postProcessTranslation(
                "%1$d files deleted, but we encountered the following errors with other files: %2$s",
                "[0]files deleted, but we encountered the following errors with other files: [1]", [], '[0] files deleted, but we encountered the following errors with other files: [1]'))
            .toEqual("%1$d files deleted, but we encountered the following errors with other files: %2$s");
    });


    it("should replace placeholders in translation complex 1", function () {
        expect(
            postProcessTranslation(
                "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?",
                "No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2] bulk optimization [3] directly?", [], 'No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2]bulk optimization[3] directly?'))
            .toEqual("No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?");
    });

    it("should replace placeholders in translation complex 2", function () {
        expect(
            postProcessTranslation(
                "%1$s some &quot; random%d text %l",
                "[0] emos [1] modnar[2] txet [3]", [], '[0] emos [1] modnar[2] txet [3]'))
            .toEqual("%1$s emos &quot; modnar%d txet %l");
    });


    it("should replace placeholders in verbs", function () {
        let verbs = [
            ["random", "modnar"],
            ["here", "ereh"]
        ]
        expect(
            postProcessTranslation(
                "some random text here",
                "some random txet here", verbs, 'some random txet here'))
            .toEqual("some modnar txet ereh");
    });

    it("should fix upper case based on original", function () {
        expect(
            postProcessTranslation(
                "Some random text",
                "emos modnar txet", [], 'Some random text'))
            .toEqual("Emos modnar txet");
    });

    it("should fix lower case based on original", function () {
        expect(
            postProcessTranslation(
                "some random text",
                "Emos modnar txet", [], 'Emos modnar txet'))
            .toEqual("emos modnar txet");
    });

    it("should not fix upper/lower case for non latin litteral languages", function () {
        expect(
            postProcessTranslation(
                "Some random text",
                "சில குறிப்பில்லா எழுத்துக்கள்", [], "சில குறிப்பில்லா எழுத்துக்கள்"))
            .toEqual("சில குறிப்பில்லா எழுத்துக்கள்");
    });
});