describe("Google translation - processPlaceholderSpaces", function () {
  it("should remove additional space around placeholders", function () {
    expect(
      processPlaceholderSpaces(
        "some text [0]here[1]",
        "emos txet [0] ereh [1]"))
      .toEqual("emos txet [0]ereh[1]");

    expect(
      processPlaceholderSpaces(
        "[0]product_title[1] is not available until [2]direct_date[3]",
        "[0] product_title [1] is not available until [2] direct_date [3]"))
      .toEqual("[0]product_title[1] is not available until [2]direct_date[3]");

    expect(
      processPlaceholderSpaces(
        "[0]Edit[1] this [2] template or [3]create[4] a new one",
        "[0] Tide [1] siht [2] etalpmet ro [3] etaerc [4] a wen eno"))
      .toEqual("[0]Tide[1] siht [2] etalpmet ro [3]etaerc[4] a wen eno");

    expect(
      processPlaceholderSpaces(
        "[0]Create[1] a new [2] template",
        "[0] Etaerc [1] a wen [2] etalpmet"))
      .toEqual("[0]Etaerc[1] a wen [2] etalpmet");

    expect(
      processPlaceholderSpaces(
        "[0] some text here",
        "[0] some text here"))
      .toEqual("[0] some text here");

    expect(
      processPlaceholderSpaces(
        "some text [0]here[1]",
        "some text [0] here [1]"))
      .toEqual("some text [0]here[1]");

    expect(
      processPlaceholderSpaces(
        "some text[0] here[1]",
        "some text [0] here [1]"))
      .toEqual("some text[0] here[1]");
  });

  it("should add removed space around placeholders", function () {
    expect(
      processPlaceholderSpaces(
        "some text here [0]",
        "some text here[0]"))
      .toEqual("some text here [0]");

    expect(
      processPlaceholderSpaces(
        "[0] cow [1] mytext here",
        "[0]cow [1] mytext here"))
      .toEqual("[0] cow [1] mytext here");
  });

  it("should add/remove space around placeholders", function () {
    // This one below shifts the {0} because a blank was added before and removed one behind {1} 
    expect(
      processPlaceholderSpaces(
        "some text[0] here [1]",
        "some text [0] here[1]"))
      .toEqual("some text[0] here [1]");
    // This is one is to show that a blank at the line is added if it is missing in the translation 
    expect(
        processPlaceholderSpaces(
          "Add Products to [0] Category",
          "Producten toevoegen aan categorie [0]"))
        .toEqual("Producten toevoegen aan categorie [0]");
  });
});
