describe("General translation - rearrange sentences", function () {

    // ---------------------------------------------------------------------------
    // Shared test configuration — reset before every test so no state leaks
    // ---------------------------------------------------------------------------
    let locale;

    beforeEach(function () {
        locale = "nl";
    });

    // ---------------------------------------------------------------------------
    // Helper: wraps fixUILabelSmart with the shared defaults
    // ---------------------------------------------------------------------------
    function callFixUILabelSmart(translated, overrides) {
        const opts = Object.assign({ locale }, overrides);
        return fixUILabelSmart(translated, opts.locale);
    }

    // ---------------------------------------------------------------------------
    // Disable / Enable
    // ---------------------------------------------------------------------------
    describe("Disable / Enable verb rearrangement", function () {

        it("should rearrange 'Schakel...uit' (disable) to infinitive form", function () {
            const translated = "Schakel deze optie uit als je deze <br/>strings wil vertalen met behulp van de vertaalplugin van derden.";
            const expected   = "Deze optie uitschakelen als je deze <br/>strings wil vertalen met behulp van de vertaalplugin van derden.";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

        it("should rearrange 'Schakel...in' (enable) to infinitive form", function () {
            const translated = "Schakel deze optie in als je plugin tabellen, rollen, bestanden en instellingen wil verwijderen<br>wanneer je de plugin van de plugins pagina verwijdert";
            const expected   = "Deze optie inschakelen als je plugin tabellen, rollen, bestanden en instellingen wil verwijderen<br>wanneer je de plugin van de plugins pagina verwijdert";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

    });

    // ---------------------------------------------------------------------------
    // Select verb rearrangement
    // ---------------------------------------------------------------------------
    describe("Select verb rearrangement", function () {

        it("should rearrange 'Selecteer deze optie' with a long clause", function () {
            const translated = "Selecteer deze optie als je de omslagafbeelding van je Facebookpagina wil verbergen wanneer deze wordt getoond in de pop-up.";
            const expected   = "Deze optie selecteren als je de omslagafbeelding van je Facebookpagina wil verbergen wanneer deze wordt getoond in de pop-up.";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

        it("should rearrange 'Selecteer deze optie' with a short clause", function () {
            const translated = "Selecteer deze optie als je meldingen wilt ontvangen.";
            const expected   = "Deze optie selecteren als je meldingen wilt ontvangen.";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

        it("should rearrange bare 'Selecteer <noun>' (no clause)", function () {
            const translated = "Selecteer auteur";
            const expected   = "Auteur selecteren";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

        it("should rearrange 'Selecteer <article> <noun>' with a clause", function () {
            const translated = "Selecteer het juiste bestand als je verder wil gaan.";
            const expected   = "Het juiste bestand selecteren als je verder wil gaan.";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

    });

    // ---------------------------------------------------------------------------
    // Change / Wijzig verb rearrangement
    // ---------------------------------------------------------------------------
    describe("Change verb rearrangement", function () {

        it("should rearrange 'Wijzig <noun phrase>' to infinitive form", function () {
            const translated = "Wijzig kleur van site titel";
            const expected   = "Kleur van site titel wijzigen";

            expect(callFixUILabelSmart(translated)).toEqual(expected);
        });

    });

});
