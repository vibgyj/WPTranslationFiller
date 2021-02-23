describe("Google translation", function () {

  // beforeEach(function() {
  //   player = new Player();
  //   song = new Song();
  // });

  it("should replace placeholders", function () {
    expect(processTranslation("% s")).toEqual("%s");
    expect(processTranslation("% d")).toEqual("%d");

    var i;
    for (i = 1; i <= 10; i++) {
      expect(processTranslation(`% ${i} $ s`)).toEqual(`%${i}$s`);
    }

    for (i = 1; i <= 10; i++) {
      expect(processTranslation(`% ${i} $ d`)).toEqual(`%${i}$d`);
    }
  });

  it("should replace all placeholders", function () {
    expect(processTranslation("% s % s")).toEqual("%s %s");
    expect(processTranslation("% d % d")).toEqual("%d %d");

    expect(processTranslation("% s %%")).toEqual("%s%%");

    var i;
    for (i = 1; i <= 10; i++) {
      expect(processTranslation(`% ${i} $ s % ${i} $ s`)).toEqual(`%${i}$s %${i}$s`);
    }

    for (i = 1; i <= 10; i++) {
      expect(processTranslation(`% ${i} $ d % ${i} $ d`)).toEqual(`%${i}$d %${i}$d`);
    }
  });

  it("should replace html encoding", function () {
    expect(processTranslation("& # 8220")).toEqual("&#8220");
  });

  it("should replace all html encoding", function () {
    expect(processTranslation("& # 8220Test& # 8221")).toEqual("&#8220Test&#8221");
  });
});
