describe("Google translation - processPlaceholderSpaces", function () {
  it("should correct space around placeholders", function () {
    expect(
      processPlaceholderSpaces(
        "some text %shere%d",
        "emos txet %s ereh %d"))
      .toEqual("emos txet %sereh%d");

    expect(
      processPlaceholderSpaces(
        "some text here %1$s",
        "emos txet ereh %1$s "))
      .toEqual("emos txet ereh %1$s");

    expect(
      processPlaceholderSpaces(
        "%1$d some text here",
        " %1$d emos txet ereh"))
      .toEqual("%1$d emos txet ereh");
  });

  it("should correct space around html encodings", function () {
    expect(
      processPlaceholderSpaces(
        "some text &#8220;here&#8221;",
        "emos txet &#8220; ereh &#8221;"))
      .toEqual("emos txet &#8220;ereh&#8221;");

    expect(
      processPlaceholderSpaces(
        "some text here &quote;",
        "emos txet ereh &quote; "))
      .toEqual("emos txet ereh &quote;");

    expect(
      processPlaceholderSpaces(
        "&quote; some text here",
        " &quote; emos txet ereh"))
      .toEqual("&quote; emos txet ereh");
  });
});
