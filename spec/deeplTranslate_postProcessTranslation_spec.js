var DebugMode = true
var no_period = false
var Rearrange_Sentences = false
var translator = "deepl"
describe("DeepL translation - postProcessTranslation", function () {
    it("should replace placeholders in translation 1", function () {
        const result = postProcessTranslation(
            "%1$s some &quot; random%d text %l",          // original
            '<x id="var0"/> some <x id="var1"/> random<x id="var2"/> text <x id="var3"/>',         // translatedText
            [],                                          // replaceVerb
            '<x id="var0"/> some <x id="var1"/> random<x id="var2"/> text <x id="var3"/>',          // originalPreProcessed
            translator,                                    // translator
            false,                                       // convertToLower
            "WordPress\nGoogle",                      // spellCheckIgnore
            "nl"                                         // locale
        );

        expect(result).toEqual("%1$s some &quot; random%d text %l");
    });


    it("should replace placeholders in translation 2 (%d test)", function () {
    const result = postProcessTranslation(
    "%1$s some &quot; random%d text %l",      // original
    '<x id="var0"/> some <x id="var1"/> random<x id="var2"/> text <x id="var3"/>',      // translatedText (gebruik {} in plaats van [])
    [],                                      // replaceVerb
    '<x id="var0"/> some <x id="var1"/> random<x id="var2"/> text <x id="var3"/>',      // originalPreProcessed
    translator,
    false,
    "WordPress\nGoogle",
    "nl"
    );
     console.debug("postProcessTranslation result:", result);
    expect(result).toEqual("%1$s some &quot; random%d text %l");
    });
	
  it("should replace placeholders in translation 3", function () {
    const result = postProcessTranslation(
        "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.",
        'Save your API Key you have received by email or you can get it on your <x id="var0"/>Imagify account page<x id="var1"/>.',
        [],
        'Save your API Key you have received by email or you can get it on your <x id="var0"/>Imagify account page<x id="var1"/>.',
        translator,
        false,
        "WordPress\nGoogle",
        "nl"
    );

    const expected = "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.";

    if (result !== expected) {
        console.debug("Test failed!");
        console.debug("Expected string:", expected);
        console.debug("Received string:", result);
    }

    expect(result).toEqual(expected);
});

    it("should replace placeholders in translation complex 1 blank after the placeholder", function () {
    const original = "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?";
    const translatedText = 'No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/>directly?';
    const originalPreProcessed = 'No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/> directly?';
    
    const result = postProcessTranslation(
        original,
        translatedText,
        [],                // replaceVerb
        originalPreProcessed,
        translator,
        false,             // convertToLower
        "WordPress\nGoogle",
        "nl"
    );

    const expected = "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?";

    // --- DEBUG: character-level diff ---
    console.log("Character differences between expected and result:");
    for (let i = 0; i < Math.max(result.length, expected.length); i++) {
        const r = result[i] || '';
        const e = expected[i] || '';
        if (r !== e) {
            console.log(`Index ${i}: expected "${e}" vs result "${r}"`);
        }
    }

    expect(result).toEqual(expected);
});

    it("should replace placeholders in translation complex 2 blank before the placeholder", function () {
    const result = postProcessTranslation(
        "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?",  // original
        'Nog geen bestanden. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization <x id="var3"/> directly?',     // translatedText
        [],                                                                                                                                     // replaceVerb
        'No files yet. Do you want to <x id="var0"/>scan your selected folders<x id="var1"/> for new files or launch a <x id="var2"/>bulk optimization<x id="var3"/> directly?',    // originalPreProcessed
        translator,                                                                                                                             // translator
        false,                                                                                                                                // convertToLower
        "WordPress\nGoogle",                                                                                                                                      // spellCheckIgnore
        "nl"                                                                                                                                     // locale
    );

    expect(result).toEqual(
        "Nog geen bestanden. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?"
    );
    });
    it("should replace placeholders in verbs", function () {
    let verbs = [
        ["random", "modnar"],
        ["here", "ereh"]
    ];

    const result = postProcessTranslation(
        "some random text here",   // original
        "some random txet here",   // translatedText
        verbs,                     // replaceVerb
        "some random txet here",   // originalPreProcessed
        translator,                  // translator
        false,                     // convertToLower
        "WordPress\nGoogle",   // spellCheckIgnore (minimaal 2 waarden)
        "nl"                       // locale
    );

    expect(result).toEqual("some modnar txet ereh");
    });


   it("should replace verbs", function () {
    let verbs = [
        ["random", "modnar"],
        ["here", "ereh"]
    ];

    const result = postProcessTranslation(
        "some random text here",   // original
        "some random txet here",   // translatedText
        verbs,                     // replaceVerb
        "some random txet here",   // originalPreProcessed
        translator,                  // translator
        false,                     // convertToLower
        "WordPress\nGoogle",       // spellCheckIgnore
        "nl"                       // locale
    );

    expect(result).toEqual("some modnar txet ereh");
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
});// JavaScript source code
