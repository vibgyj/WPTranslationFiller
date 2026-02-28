var DebugMode = true
var no_period = false
var Rearrange_Sentences = false

describe("Google translation - postProcessTranslation", function () {
    it("should replace placeholders in translation 1", function () {
        const result = postProcessTranslation(
            "%1$s some &quot; random%d text %l",          // original
            "[0] some [1] random[2] text [3]",         // translatedText
            [],                                          // replaceVerb
            "[0] some [1] random[2] text [3]",          // originalPreProcessed
            "google",                                    // translator
            false,                                       // convertToLower
            "WordPress\nGoogle",                      // spellCheckIgnore
            "nl"                                         // locale
        );

        expect(result).toEqual("%1$s some &quot; random%d text %l");
    });


    it("should replace placeholders in translation 2 (%d test)", function () {
    const result = postProcessTranslation(
    "%1$s some &quot; random%d text %l",      // original
    "[0] some [1] random[2] text [3]",      // translatedText (gebruik {} in plaats van [])
    [],                                      // replaceVerb
    "[0] some [1] random[2] text [3]",      // originalPreProcessed
    "google",
    false,
    "WordPress\nGoogle",
    "nl"
    );
     console.debug("postProcessTranslation result:", result);
    expect(result).toEqual("%1$s some &quot; random%d text %l");
    });
	
    it("should replace placeholders in translation 3", function () {
    const result = postProcessTranslation(
        "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s.", // original
        "Save your API Key you have received by email or you can get it on your [0]Imagify account page [1].",  // translatedText
        [],                                                                                                      // replaceVerb
        "Save your API Key you have received by email or you can get it on your [0]Imagify account page[1].",  // originalPreProcessed
        "google",                                                                                                // translator
        false,                                                                                                   // convertToLower
        "WordPress\nGoogle",                                                                                                    // spellCheckIgnore
        "nl"                                                                                                     // locale
    );
     
    expect(result).toEqual(
        "Save your API Key you have received by email or you can get it on your %1$sImagify account page%2$s."
    );
    });

    it("should replace placeholders in translation complex 1", function () {
    const result = postProcessTranslation(
        "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?",  // original
        "No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2] bulk optimization [3] directly?",     // translatedText
        [],                                                                                                                                     // replaceVerb
        "No files yet. Do you want to [0]scan your selected folders[1] for new files or launch a [2]bulk optimization[3] directly?",     // originalPreProcessed
        "google",                                                                                                                             // translator
        false,                                                                                                                                // convertToLower
        "WordPress\nGoogle",                                                                                                                                      // spellCheckIgnore
        "nl"                                                                                                                                     // locale
    );

    expect(result).toEqual(
        "No files yet. Do you want to %1$sscan your selected folders%3$s for new files or launch a %2$sbulk optimization%3$s directly?"
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
        "google",                  // translator
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
        "google",                  // translator
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
});