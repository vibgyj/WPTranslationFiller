describe("Google translation - preProcessOriginal", function () {

    // beforeEach(function() {
    //   player = new Player();
    //   song = new Song();
    // });

    it("should replace placeholders in original %s", function () {
        expect(preProcessOriginal("some random text %1$s")).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %99$s")).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %s")).toEqual("some random text [0]");
        expect(preProcessOriginal("%s some random text")).toEqual("[0] some random text");
        expect(preProcessOriginal("some random %s text")).toEqual("some random [0] text");
    });

    it("should replace placeholders in original %d", function () {
        expect(preProcessOriginal("some random text %1$d")).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %99$d")).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %d")).toEqual("some random text [0]");
        expect(preProcessOriginal("%d some random text")).toEqual("[0] some random text");
        expect(preProcessOriginal("some random %d text")).toEqual("some random [0] text");
    });

    it("should replace placeholders in original %l", function () {
        expect(preProcessOriginal("some random text %1$l")).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %99$l")).toEqual("some random text [0]");
        expect(preProcessOriginal("some random text %l")).toEqual("some random text [0]");
        expect(preProcessOriginal("%l some random text")).toEqual("[0] some random text");
        expect(preProcessOriginal("some random %l text")).toEqual("some random [0] text");
    });

    it("should replace placeholders in original mixed", function () {
        expect(preProcessOriginal("%1$s some &quot; random%d text %l")).toEqual("[0] some [1] random[2] text [3]");
    });

    it("should replace placeholders in original html encoding", function () {
        expect(preProcessOriginal("some random &#8220; text")).toEqual("some random [0] text");
        expect(preProcessOriginal("some random &lt; text")).toEqual("some random [0] text");
        expect(preProcessOriginal("some random &lambda; text")).toEqual("some random [0] text");
    });
});