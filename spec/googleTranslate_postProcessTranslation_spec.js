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
});