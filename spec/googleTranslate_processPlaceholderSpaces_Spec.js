describe("Google translation - processPlaceholderSpaces", function () {
  it("should correct space around placeholders", function () {
    expect(
      processPlaceholderSpaces(
        "some text %shere%d",
        "emos txet [1] ereh [2]"))
      .toEqual("emos txet [1]ereh[2]");

    expect(
      processPlaceholderSpaces(
        "some text here %1$s",
        "emos txet ereh [1] "))
      .toEqual("emos txet ereh [1]");

    expect(
      processPlaceholderSpaces(
        "%1$d some text here",
        " [1] emos txet ereh"))
      .toEqual("[1] emos txet ereh");
  });

  it("should correct space around html encodings", function () {
    expect(
      processPlaceholderSpaces(
        "some text &#8220;here&#8221;",
        "emos txet [1] ereh [2]"))
      .toEqual("emos txet [1]ereh[2]");

    expect(
      processPlaceholderSpaces(
        "some text here &quote;",
        "emos txet ereh [1] "))
      .toEqual("emos txet ereh [1]");

    expect(
      processPlaceholderSpaces(
        "&quote; some text here",
        " [1] emos txet ereh"))
      .toEqual("[1] emos txet ereh");
  });
});
