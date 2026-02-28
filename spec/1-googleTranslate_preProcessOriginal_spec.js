describe("Google translation - preProcessOriginal", function () {
    const preverbs = [];          // geen preverbs nodig voor deze tests
    const translator = "google";  // of deepl, afhankelijk van je testomgeving

    // Helperfuncties
    function logStringDiff(expected, actual) {
        const maxLength = Math.max(expected.length, actual.length);
        let diffLine = "";
        for (let i = 0; i < maxLength; i++) {
            const e = expected[i] || "";
            const a = actual[i] || "";
            diffLine += e === a ? " " : "^"; // markeer verschil met ^
        }
        console.group("String diff");
        console.log("Expected:", expected);
        console.log("Actual:  ", actual);
        console.log("Diff:    ", diffLine);
        console.groupEnd();
    }

    function expectWithDiff(actual, expected) {
        if (actual !== expected) logStringDiff(expected, actual);
        expect(actual).toEqual(expected);
    }

    it("should replace placeholders in original %s", async function () {
        expectWithDiff(await preProcessOriginal("some random text %1$s", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("some random text %99$s", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("some random text %s", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("%s some random text", preverbs, translator), "[0] some random text");
        expectWithDiff(await preProcessOriginal("some random %s text", preverbs, translator), "some random [0] text");
        expectWithDiff(await preProcessOriginal("some random text %1s", preverbs, translator), "some random text [0]");
    });

    it("should replace placeholders in original %d", async function () {
        expectWithDiff(await preProcessOriginal("some random text %1$d", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("some random text %99$d", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("some random text %d", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("%d some random text", preverbs, translator), "[0] some random text");
        expectWithDiff(await preProcessOriginal("some random %d text", preverbs, translator), "some random [0] text");
        expectWithDiff(await preProcessOriginal("some random text %1d", preverbs, translator), "some random text [0]");
    });

    it("should replace placeholders in original %l", async function () {
        expectWithDiff(await preProcessOriginal("some random text %1$l", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("some random text %99$l", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("some random text %l", preverbs, translator), "some random text [0]");
        expectWithDiff(await preProcessOriginal("%l some random text", preverbs, translator), "[0] some random text");
        expectWithDiff(await preProcessOriginal("some random %l text", preverbs, translator), "some random [0] text");
        expectWithDiff(await preProcessOriginal("some random text %1l", preverbs, translator), "some random text [0]");
    });

    it("should replace placeholders in original mixed", async function () {
        expectWithDiff(await preProcessOriginal("%1$s some &quot; random%d text %l", preverbs, translator), "[0] some [1] random[2] text [3]");
        expectWithDiff(await preProcessOriginal("some random (%1$s) text (PHP %2$s) that failes", preverbs, translator), "some random ([0]) text (PHP [1]) that failes");
        expectWithDiff(await preProcessOriginal("some %1$s random %2$s text %3$s to %4$s be %5$s in %6$s good %7$s order %8$s", preverbs, translator), "some [0] random [1] text [2] to [3] be [4] in [5] good [6] order [7]");
        expectWithDiff(await preProcessOriginal("some %1$srandom%1$s text %1$sto%1$s be %1$sin%1$s good %1$sorder%1$s", preverbs, translator), "some [0]random[1] text [2]to[3] be [4]in[5] good [6]order[7]");
        expectWithDiff(await preProcessOriginal("No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?", preverbs, translator), "No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2]bulk optimization[3] directly?");
    });

    it("should replace placeholders in original html encoding", async function () {
        expectWithDiff(await preProcessOriginal("some random &#8220; text", preverbs, translator), "some random [0] text");
        expectWithDiff(await preProcessOriginal("some random &lt; text", preverbs, translator), "some random [0] text");
        expectWithDiff(await preProcessOriginal("some random &lambda; text", preverbs, translator), "some random [0] text");
    });
});