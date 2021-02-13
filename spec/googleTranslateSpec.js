describe("Google translation", function() {
  // var player;
  // var song;

  // beforeEach(function() {
  //   player = new Player();
  //   song = new Song();
  // });

  it("should replace placeholders", function() {
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

  it("should replace all placeholders", function() {
    expect(processTranslation("% s % s")).toEqual("%s %s");
    expect(processTranslation("% d % d")).toEqual("%d %d");

    expect(processTranslation("% s %%")).toEqual("%s%%");

    var i;
    for (i = 1; i <= 10; i++) {
      expect(processTranslation(`% ${i} $ s % ${i} $ s`)).toEqual(`%${i}$s %${i}$s`);
    }

    for (i = 1; i<= 10; i++) {
      expect(processTranslation(`% ${i} $ d % ${i} $ d`)).toEqual(`%${i}$d %${i}$d`);
    }
  });

  it("should replace html encoding", function() {
    expect(processTranslation("& # 8220")).toEqual("&#8220");
  });  

  it("should replace all html encoding", function() {
    expect(processTranslation("& # 8220Test& # 8221")).toEqual("&#8220Test&#8221");
  });   

  // describe("when song has been paused", function() {
  //   beforeEach(function() {
  //     player.play(song);
  //     player.pause();
  //   });

  //   it("should indicate that the song is currently paused", function() {
  //     expect(player.isPlaying).toBeFalsy();

  //     // demonstrates use of 'not' with a custom matcher
  //     expect(player).not.toBePlaying(song);
  //   });

  //   it("should be possible to resume", function() {
  //     player.resume();
  //     expect(player.isPlaying).toBeTruthy();
  //     expect(player.currentlyPlayingSong).toEqual(song);
  //   });
  // });

  // // demonstrates use of spies to intercept and test method calls
  // it("tells the current song if the user has made it a favorite", function() {
  //   spyOn(song, 'persistFavoriteStatus');

  //   player.play(song);
  //   player.makeFavorite();

  //   expect(song.persistFavoriteStatus).toHaveBeenCalledWith(true);
  // });

  // //demonstrates use of expected exceptions
  // describe("#resume", function() {
  //   it("should throw an exception if song is already playing", function() {
  //     player.play(song);

  //     expect(function() {
  //       player.resume();
  //     }).toThrowError("song is already playing");
  //   });
  // });
});
