describe("General translation - rearrange sentences", function () {

    it("should rearrange imperative sentence to infinitive form", function () {

        const original = "Disable this option if you want to translate these<br/>strings using the third party translation plugin.";
        const translated = "Schakel deze optie uit als je deze <br/>strings wil vertalen met behulp van de vertaalplugin van derden.";
        const locale = "nl";

        // Roep de echte functie aan
        const result = fixUILabelSmart(translated, locale);

        // Log het resultaat voor debugging
        console.log("fixUILabelSmart result:", result);

        const expected = "Deze optie uitschakelen als je deze <br/>strings wil vertalen met behulp van de vertaalplugin van derden.";

        // Toon karakter-voor-karakter verschil als test faalt
        if (result !== expected) {
            logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
    });

    it("should handle enable/disable correctly with plugin deletion text", function () {
        const original = "Enable this option if you want to delete plugin tables, roles, files and settings<br>when deleting the plugin from plugins page";
        const translated = "Schakel deze optie in als je plugin tabellen, rollen, bestanden en instellingen wil verwijderen<br>wanneer je de plugin van de plugins pagina verwijdert";
        const expected = "Deze optie inschakelen als je plugin tabellen, rollen, bestanden en instellingen wil verwijderen<br>wanneer je de plugin van de plugins pagina verwijdert";

        const result = fixUILabelSmart(translated);
        if (result !== expected) {
          logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
    });

    it("should handle Select correctly text 1", function () {
        const original = "Select this option if you want to hide the cover photo of your Facebook page when it is displayed in the popup.";
        const translated = "Selecteer deze optie als je de omslagafbeelding van je Facebookpagina wil verbergen wanneer deze wordt getoond in de pop-up.";
        const expected = "Deze optie selecteren als je de omslagafbeelding van je Facebookpagina wil verbergen wanneer deze wordt getoond in de pop-up.";

        const result = fixUILabelSmart(translated);
        if (result !== expected) {
          logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
    });
     it("should handle Select correctly text 2", function () {
        const original = "Select this option if you want to receive notifications";
        const translated = "Selecteer deze optie als je meldingen wilt ontvangen.";
        const expected = "Deze optie selecteren als je meldingen wilt ontvangen.";

        const result = fixUILabelSmart(translated);
        if (result !== expected) {
          logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
    });

     it("should handle Select correctly text 3", function () {
        const original = "Select Author";
        const translated = "Selecteer auteur";
        const expected = "Auteur selecteren";

        const result = fixUILabelSmart(translated);
        if (result !== expected) {
          logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
     });

    it("should handle Select correctly text 4", function () {
        const original = "Select the correct file if you want to continue.";
        const translated = "Selecteer het juiste bestand als je verder wil gaan.";
        const expected = "Het juiste bestand selecteren als je verder wil gaan.";

        const result = fixUILabelSmart(translated);
        if (result !== expected) {
          logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
    });

     it("should handle Change correctly", function () {
        const original = "Change site title color";
        const translated = "Wijzig kleur van site titel";
        const expected = "Kleur van site titel wijzigen";

        const result = fixUILabelSmart(translated);
        if (result !== expected) {
          logStringDiff(expected, result);
        }

        expect(result).toEqual(expected);
    });
});