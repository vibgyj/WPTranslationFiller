describe("Google translation - preProcessOriginal", function () {
    it("should replace placeholders in original %s", function () {
        expect(preProcessOriginal("some random text %1$s", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %99$s", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %s", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("%s some random text", false)).toEqual("[0] some random text");
        expect(preProcessOriginal("some random %s text", false)).toEqual("some random [0] text");
        expect(preProcessOriginal("some random text %1s", false)).toEqual("some random text [0]");
    });

    it("should replace placeholders in original %d", function () {
        expect(preProcessOriginal("some random text %1$d", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %99$d", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %d", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("%d some random text", false)).toEqual("[0] some random text");
        expect(preProcessOriginal("some random %d text", false)).toEqual("some random [0] text");
        expect(preProcessOriginal("some random text %1d", false)).toEqual("some random text [0]");
    });

    it("should replace placeholders in original %l", function () {
        expect(preProcessOriginal("some random text %1$l", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %99$l", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %l", false)).toEqual("some random text [0]");
        expect(preProcessOriginal("%l some random text", false)).toEqual("[0] some random text");
        expect(preProcessOriginal("some random %l text", false)).toEqual("some random [0] text");
        expect(preProcessOriginal("some random text %1l", false)).toEqual("some random text [0]");
    });

    it("should replace placeholders in original mixed", function () {
        expect(preProcessOriginal("%1$s some &quot; random%d text %l", false)).toEqual("[0] some [1] random[2] text [3]");
        expect(preProcessOriginal("some random (%1$s) text (PHP %2$s) that failes", false)).toEqual("some random ([0]) text (PHP [1]) that failes");
        expect(preProcessOriginal("some %1$s random %2$s text %3$s to %4$s be %5$s in %6$s good %7$s order %8$s", false)).toEqual("some [0] random [1] text [2] to [3] be [4] in [5] good [6] order [7]");
        expect(preProcessOriginal("some %1$srandom%1$s text %1$sto%1$s be %1$sin%1$s good %1$sorder%1$s", false)).toEqual("some [0]random[1] text [2]to[3] be [4]in[5] good [6]order[7]");

    });

    it("should replace placeholders in original html encoding", function () {
        expect(preProcessOriginal("some random &#8220; text", false)).toEqual("some random [0] text");
        expect(preProcessOriginal("some random &lt; text", false)).toEqual("some random [0] text");
        expect(preProcessOriginal("some random &lambda; text", false)).toEqual("some random [0] text");
    });
});