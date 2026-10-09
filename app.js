/* ES5 for older TV browsers. Music and snow initialize independently. */
(function () {
  "use strict";

  function createSnow() {
    var snow = document.getElementById("snow");
    var style = document.documentElement.style;
    var flakeCount = 100;
    var fragment, flake, size, duration, delay, i;
    if (!snow || !("animationName" in style || "webkitAnimationName" in style)) { return; }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
    fragment = document.createDocumentFragment();
    for (i = 0; i < flakeCount; i += 1) {
      flake = document.createElement("span");
      flake.className = "snowflake" + (i % 5 === 0 ? " golden" : "");
      size = 4 + Math.random() * 4;
      duration = 28 + Math.random() * 22;
      delay = (-Math.random() * duration).toFixed(2) + "s";
      flake.style.left = (i * 100 / flakeCount + Math.random() * 2).toFixed(2) + "%";
      flake.style.width = size.toFixed(1) + "px";
      flake.style.height = size.toFixed(1) + "px";
      flake.style.opacity = (0.28 + Math.random() * 0.35).toFixed(2);
      flake.style.webkitAnimationDuration = duration.toFixed(2) + "s";
      flake.style.animationDuration = duration.toFixed(2) + "s";
      flake.style.webkitAnimationDelay = delay;
      flake.style.animationDelay = delay;
      fragment.appendChild(flake);
    }
    snow.appendChild(fragment);
  }

  function setupMusic() {
    var music = document.getElementById("background-music");
    var panel = document.getElementById("music-panel");
    var button = document.getElementById("music-toggle");
    var previous = document.getElementById("music-previous");
    var next = document.getElementById("music-next");
    var trackLabel = document.getElementById("music-track");
    var credit = document.getElementById("music-credit-track");
    var status = document.getElementById("music-status");
    var tracks = [
      {
        title: "Wish Background",
        mood: "やさしいベルと合奏",
        volume: 0.35,
        src: "./assets/wish-background.mp3",
        url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100391"
      },
      {
        title: "Deck the Halls A",
        mood: "やわらかなクリスマス・ピアノ",
        volume: 0.5,
        src: "./assets/deck-the-halls-a.mp3",
        url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100263"
      },
      {
        title: "It Came Upon a Midnight Clear",
        mood: "静かな夜のピアノと室内楽",
        volume: 0.75,
        src: "./assets/it-came-upon-a-midnight-clear.mp3",
        url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100191"
      }
    ];
    var trackIndex = 0;
    var wanted = false;
    var attempt = 0;
    var idleTimer = null;
    var controlsHidden = false;
    var keyboardMode = false;
    var canHideControls = false;
    var wakeKey = 0;
    var trackKey = 0;

    function updateControls() {
      panel.className = "music-panel" +
        (keyboardMode ? " keyboard-controls" : "") +
        (controlsHidden ? " music-idle" : "");
    }

    function showControls() {
      if (idleTimer !== null) { window.clearTimeout(idleTimer); }
      idleTimer = null;
      controlsHidden = false;
      updateControls();
      if (canHideControls && wanted && !music.paused) {
        idleTimer = window.setTimeout(function () {
          idleTimer = null;
          if (canHideControls && wanted && !music.paused) {
            controlsHidden = true;
            updateControls();
          }
        }, 8000);
      }
    }

    function pointerActivity() {
      keyboardMode = false;
      showControls();
    }

    function setState(playing, message) {
      button.setAttribute("aria-pressed", playing ? "true" : "false");
      button.textContent = playing ? "Pause music" : "Play music";
      status.textContent = message;
      canHideControls = playing && !message;
      showControls();
    }

    function failed(message) {
      wanted = false;
      attempt += 1;
      music.pause();
      setState(false, message);
    }

    function updateTrack() {
      var track = tracks[trackIndex];
      trackLabel.textContent = (trackIndex + 1) + " / " + tracks.length + "　" + track.mood;
      credit.textContent = track.title + " — Kevin MacLeod";
      credit.href = track.url;
      /* The original recordings have different levels; leave the files unedited. */
      music.volume = track.volume;
    }

    function startMusic() {
      var result, currentAttempt;
      wanted = true;
      attempt += 1;
      currentAttempt = attempt;
      setState(true, "音楽を準備しています…");
      try {
        if (music.error) { music.load(); }
        /* Keep play() inside the user gesture, also when changing tracks. */
        result = music.play();
        /* Older browsers return undefined instead of a Promise. */
        if (result && typeof result.then === "function") {
          result.then(function () {}, function () {
            if (currentAttempt === attempt && wanted) {
              failed("再生できませんでした。もう一度、決定ボタンを押してください");
            }
          });
        }
      } catch (error) {
        failed("このブラウザでは音楽を開始できませんでした");
      }
    }

    function changeTrack(direction) {
      var resume = wanted;
      /* Invalidate old play() callbacks before aborting the previous source. */
      wanted = false;
      attempt += 1;
      music.pause();
      trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
      updateTrack();
      try {
        music.src = tracks[trackIndex].src;
        music.load();
      } catch (error) {
        failed("曲を切り替えられませんでした。もう一度お試しください");
        return;
      }
      if (resume) { startMusic(); }
      else { setState(false, ""); }
    }

    function isPlaybackTarget(target) {
      return target === button || target === previous || target === next || target === document.body;
    }

    if (!music || !panel || !button || !previous || !next || !trackLabel || !credit || !status) { return; }
    if (!music.canPlayType || !music.canPlayType("audio/mpeg")) {
      status.textContent = "このブラウザでは音楽を再生できません";
      return;
    }

    button.disabled = false;
    previous.disabled = false;
    next.disabled = false;
    updateTrack();
    status.textContent = "";

    /* Show help for actual keyboard/remote use, not programmatic initial focus. */
    document.addEventListener("keydown", function (event) {
      var wasHidden = controlsHidden;
      var code = event.keyCode || event.which;
      keyboardMode = true;
      showControls();
      /* The first Enter/Space only wakes hidden controls, including skip buttons. */
      if ((wasHidden && (code === 13 || code === 32) &&
          isPlaybackTarget(document.activeElement)) ||
          (wakeKey && wakeKey === code)) {
        wakeKey = code;
        event.preventDefault();
        button.focus();
        return;
      }
      /* Do not capture arrows while the credit links or other content have focus. */
      if ((code === 37 || code === 39) && !event.altKey && !event.ctrlKey && !event.metaKey &&
          isPlaybackTarget(document.activeElement)) {
        event.preventDefault();
        if (trackKey === code) { return; }
        trackKey = code;
        button.focus();
        changeTrack(code === 37 ? -1 : 1);
      }
    }, true);
    document.addEventListener("keyup", function (event) {
      var code = event.keyCode || event.which;
      if (trackKey === code) { trackKey = 0; }
      if (wakeKey && wakeKey === code) {
        event.preventDefault();
        wakeKey = 0;
      }
    }, true);
    window.addEventListener("blur", function () { wakeKey = 0; trackKey = 0; }, false);
    document.addEventListener("mousemove", pointerActivity, true);
    document.addEventListener("mousedown", pointerActivity, true);
    document.addEventListener("touchstart", pointerActivity, true);
    button.addEventListener("focus", showControls, false);
    previous.addEventListener("focus", showControls, false);
    next.addEventListener("focus", showControls, false);
    previous.addEventListener("click", function () { changeTrack(-1); }, false);
    next.addEventListener("click", function () { changeTrack(1); }, false);

    button.addEventListener("click", function () {
      if (wanted) {
        wanted = false;
        attempt += 1;
        music.pause();
        setState(false, "");
        return;
      }
      startMusic();
    }, false);

    music.addEventListener("playing", function () {
      if (!wanted) { music.pause(); return; }
      if (music.paused || music.readyState < 3) { return; }
      setState(true, "");
    }, false);
    music.addEventListener("waiting", function () {
      if (wanted && !music.paused && music.readyState < 3) {
        setState(true, "音楽を読み込んでいます…");
      }
    }, false);
    music.addEventListener("pause", function () {
      /* pause/load may queue an event that arrives after the new play() call. */
      if (wanted && music.paused) {
        wanted = false;
        attempt += 1;
        setState(false, "");
      }
    }, false);
    music.addEventListener("error", function () {
      if (music.error) {
        failed("音楽を読み込めませんでした。通信を確認して、もう一度お試しください");
      }
    }, false);

    /* Start on play/pause; the TV remote's left/right keys select a track. */
    button.focus();
  }

  createSnow();
  setupMusic();
}());
