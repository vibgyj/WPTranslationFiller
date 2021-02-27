describe("Google translation - postProcessTranslation", function () {
    it("should replace placeholders in translation", function () {
        expect(
            postProcessTranslation(
                "%1$s some &quot; random%d text %l",
                "[0] emos [1] modnar[2] txet [3]", []))
            .toEqual("%1$s emos &quot; modnar%d txet %l");
    });

    it("should replace placeholders in translation complex", function () {
        expect(
            postProcessTranslation(
                "%1$s some &quot; random%d text %l",
                "[0] emos [1] modnar[2] txet [2] [3]", []))
            .toEqual("%1$s emos &quot; modnar%d txet %d %l");
    });

    it("should replace placeholders in verbs", function () {
        let verbs = [
            ["random", "modnar"],
            ["here", "ereh"]
        ]
        expect(
            postProcessTranslation(
                "some random text here",
                "some random txet here", verbs))
            .toEqual("some modnar txet ereh");
    });

    it("should fix upper case based on original", function () {
        expect(
            postProcessTranslation(
                "Some random text",
                "emos modnar txet", []))
            .toEqual("Emos modnar txet");
    });

    it("should fix lower case based on original", function () {
        expect(
            postProcessTranslation(
                "some random text",
                "Emos modnar txet", []))
            .toEqual("emos modnar txet");
    });

    it("should not fix upper/lower case for non latin litteral languages", function () {
        expect(
            postProcessTranslation(
                "Some random text",
                "சில குறிப்பில்லா எழுத்துக்கள்", []))
            .toEqual("சில குறிப்பில்லா எழுத்துக்கள்");
    });
});