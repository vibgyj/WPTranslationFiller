describe("DeepL translation - preProcessOriginal", function () {

    // ---------------------------------------------------------------------------
    // Shared test configuration — reset before every test so no state leaks
    // ---------------------------------------------------------------------------
    let preverbs;
    let translator;

    beforeEach(function () {
        preverbs   = [];
        translator = "deepl";
    });

    // ---------------------------------------------------------------------------
    // Helper: wraps preProcessOriginal with the shared defaults
    // ---------------------------------------------------------------------------
    async function callPreProcess(input, overrides) {
        const opts = Object.assign({ preverbs, translator }, overrides);
        return await preProcessOriginal(input, opts.preverbs, opts.translator);
    }

    // ---------------------------------------------------------------------------
    // %s placeholders
    // ---------------------------------------------------------------------------
    describe("%s placeholder replacement", function () {

        it("should replace %1$s",  async function () {
            expect(await callPreProcess("some random text %1$s")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace %99$s", async function () {
            expect(await callPreProcess("some random text %99$s")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace bare %s", async function () {
            expect(await callPreProcess("some random text %s")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace %s at the start of the string", async function () {
            expect(await callPreProcess("%s some random text")).toEqual('<x id="var0"/> some random text');
        });

        it("should replace %s in the middle of the string", async function () {
            expect(await callPreProcess("some random %s text")).toEqual('some random <x id="var0"/> text');
        });

        it("should replace %1s (no $ sign)", async function () {
            expect(await callPreProcess("some random text %1s")).toEqual('some random text <x id="var0"/>');
        });

    });

    // ---------------------------------------------------------------------------
    // %d placeholders
    // ---------------------------------------------------------------------------
    describe("%d placeholder replacement", function () {

        it("should replace %1$d", async function () {
            expect(await callPreProcess("some random text %1$d")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace %99$d", async function () {
            expect(await callPreProcess("some random text %99$d")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace bare %d", async function () {
            expect(await callPreProcess("some random text %d")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace %d at the start of the string", async function () {
            expect(await callPreProcess("%d some random text")).toEqual('<x id="var0"/> some random text');
        });

        it("should replace %d in the middle of the string", async function () {
            expect(await callPreProcess("some random %d text")).toEqual('some random <x id="var0"/> text');
        });

        it("should replace %1d (no $ sign)", async function () {
            expect(await callPreProcess("some random text %1d")).toEqual('some random text <x id="var0"/>');
        });

    });

    // ---------------------------------------------------------------------------
    // %l placeholders
    // ---------------------------------------------------------------------------
    describe("%l placeholder replacement", function () {

        it("should replace %1$l", async function () {
            expect(await callPreProcess("some random text %1$l")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace %99$l", async function () {
            expect(await callPreProcess("some random text %99$l")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace bare %l", async function () {
            expect(await callPreProcess("some random text %l")).toEqual('some random text <x id="var0"/>');
        });

        it("should replace %l at the start of the string", async function () {
            expect(await callPreProcess("%l some random text")).toEqual('<x id="var0"/> some random text');
        });

        it("should replace %l in the middle of the string", async function () {
            expect(await callPreProcess("some random %l text")).toEqual('some random <x id="var0"/> text');
        });

        it("should replace %1l (no $ sign)", async function () {
            expect(await callPreProcess("some random text %1l")).toEqual('some random text <x id="var0"/>');
        });

    });

    // ---------------------------------------------------------------------------
    // Mixed placeholders
    // ---------------------------------------------------------------------------
    describe("mixed placeholder replacement", function () {

        it("should handle mixed %s, %d, %l with HTML entity", async function () {
            expect(await callPreProcess("%1$s some &quot; random%d text %l"))
                .toEqual('<x id="var0"/> some <x id="special_var1"/> random<x id="var1"/> text <x id="var2"/>');
        });

        it("should handle placeholders wrapped in parentheses", async function () {
            expect(await callPreProcess("some random (%1$s) text (PHP %2$s) that failes"))
                .toEqual('some random (<x id="var0"/>) text (PHP <x id="var1"/>) that failes');
        });

        it("should handle 8 sequential placeholders", async function () {
            expect(await callPreProcess("some %1$s random %2$s text %3$s to %4$s be %5$s in %6$s good %7$s order %8$s"))
                .toEqual('some <x id="var0"/> random <x id="var1"/> text <x id="var2"/> to <x id="var3"/> be <x id="var4"/> in <x id="var5"/> good <x id="var6"/> order <x id="var7"/>');
        });

        it("should handle repeated %1$s used as both opening and closing tag", async function () {
            expect(await callPreProcess("some %1$srandom%1$s text %1$sto%1$s be %1$sin%1$s good %1$sorder%1$s"))
                .toEqual('some <x id="var0"/>random<x id="var1"/> text <x id="var2"/>to<x id="var3"/> be <x id="var4"/>in<x id="var5"/> good <x id="var6"/>order<x id="var7"/>');
        });

        it("should handle mixed opening/closing placeholders with different indices", async function () {
            expect(await callPreProcess("No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?"))
                .toEqual('No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/> directly?');
        });

    });

    // ---------------------------------------------------------------------------
    // HTML entity encoding
    // ---------------------------------------------------------------------------
    describe("HTML entity replacement", function () {

        it("should replace numeric HTML entity &#8220;", async function () {
            expect(await callPreProcess("some random &#8220; text")).toEqual('some random <x id="special_var1"/> text');
        });

        it("should replace named HTML entity &lt;", async function () {
            expect(await callPreProcess("some random &lt; text")).toEqual('some random <x id="special_var1"/> text');
        });

        it("should replace named HTML entity &lambda;", async function () {
            expect(await callPreProcess("some random &lambda; text")).toEqual('some random <x id="special_var1"/> text');
        });

    });

});
