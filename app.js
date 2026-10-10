/* ES5 for older TV browsers. Audio, controls and snow initialize independently. */
(function () {
  "use strict";

  function createSnow() {
    var snow = document.getElementById("snow");
    var style = document.documentElement.style;
    var flakeCount = 40;
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

  function setupControls() {
    var panel = document.getElementById("music-panel");
    var music = document.getElementById("background-music");
    var play = document.getElementById("music-toggle");
    var previous = document.getElementById("music-previous");
    var next = document.getElementById("music-next");
    var fullscreen = document.getElementById("fullscreen-toggle");
    var idleTimer = null;
    var controlsHidden = false;
    var keyboardMode = false;
    var wakeKey = 0;
    var navigationKey = 0;
    var trackHandler = null;
    var buttons = [previous, play, next, fullscreen];
    var i;

    function isPlaybackTarget(target) {
      return target === play || target === previous || target === next || target === document.body;
    }

    function isControlTarget(target) {
      return isPlaybackTarget(target) || target === fullscreen;
    }

    function canHide() {
      return (!music.paused && music.readyState >= 3 && play.getAttribute("aria-pressed") === "true") ||
        fullscreen.getAttribute("aria-pressed") === "true";
    }

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
      if (canHide()) {
        idleTimer = window.setTimeout(function () {
          idleTimer = null;
          if (canHide()) {
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

    function focusPlayback() {
      if (!play.disabled) { play.focus(); }
      else if (!fullscreen.disabled) { fullscreen.focus(); }
    }

    document.addEventListener("keydown", function (event) {
      var wasHidden = controlsHidden;
      var code = event.keyCode || event.which;
      var target = document.activeElement;
      if (event.altKey || event.ctrlKey || event.metaKey) { return; }
      keyboardMode = true;
      showControls();
      /* First activation wakes the controls; it must not pause or exit fullscreen. */
      if ((wasHidden && (code === 13 || code === 32) && isControlTarget(target)) ||
          (wakeKey && wakeKey === code)) {
        wakeKey = code;
        event.preventDefault();
        if (isPlaybackTarget(target)) { focusPlayback(); }
        return;
      }
      if (!isControlTarget(target)) { return; }
      if (code === 37 || code === 38 || code === 39 || code === 40 || code === 70) {
        event.preventDefault();
        if (navigationKey === code) { return; }
        navigationKey = code;
        if (code === 70) {
          if (!fullscreen.disabled) { fullscreen.click(); }
        } else if (code === 38 || code === 40) {
          if (isPlaybackTarget(target)) {
            if (!fullscreen.disabled) { fullscreen.focus(); }
          } else { focusPlayback(); }
        } else if (isPlaybackTarget(target)) {
          if (trackHandler && !play.disabled) {
            play.focus();
            trackHandler(code === 37 ? -1 : 1);
          }
        }
      } else if ((code === 13 || code === 32) && target === document.body) {
        event.preventDefault();
        focusPlayback();
        if (document.activeElement !== document.body) { document.activeElement.click(); }
      }
    }, true);
    document.addEventListener("keyup", function (event) {
      var code = event.keyCode || event.which;
      if (navigationKey === code) { navigationKey = 0; }
      if (wakeKey && wakeKey === code) {
        event.preventDefault();
        wakeKey = 0;
      }
    }, true);
    window.addEventListener("blur", function () { wakeKey = 0; navigationKey = 0; }, false);
    document.addEventListener("mousemove", pointerActivity, true);
    document.addEventListener("mousedown", pointerActivity, true);
    document.addEventListener("touchstart", pointerActivity, true);
    document.addEventListener("displaycontrolschange", function () {
      showControls();
      if (play.disabled && document.activeElement === document.body) { focusPlayback(); }
    }, false);
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener("focus", showControls, false);
    }
    return {
      refresh: showControls,
      focus: focusPlayback,
      setTrackHandler: function (handler) { trackHandler = handler; }
    };
  }

  function setupMusic(controls) {
    var music = document.getElementById("background-music");
    var button = document.getElementById("music-toggle");
    var previous = document.getElementById("music-previous");
    var next = document.getElementById("music-next");
    var trackLabel = document.getElementById("music-track");
    var credit = document.getElementById("music-credit-track");
    var status = document.getElementById("music-status");
    var tracks = [
      {
        title: "Wish Background", mood: "やさしいベルと合奏", file: "wish-background",
        url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100391"
      },
      {
        title: "Deck the Halls A", mood: "やわらかなクリスマス・ピアノ", file: "deck-the-halls-a",
        url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100263"
      },
      {
        title: "It Came Upon a Midnight Clear", mood: "静かな夜のピアノと室内楽", file: "it-came-upon-a-midnight-clear",
        url: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100191"
      }
    ];
    var trackIndex = 0;
    var wanted = false;
    var attempt = 0;
    var sourcePrepared = false;

    function supports(type) {
      var result;
      try { result = music.canPlayType && music.canPlayType(type); }
      catch (error) { return false; }
      return !!result && result !== "no";
    }

    function setState(playing, message) {
      button.setAttribute("aria-pressed", playing ? "true" : "false");
      button.textContent = playing ? "Pause music" : "Play music";
      status.textContent = message;
      controls.refresh();
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
    }

    function source() {
      return "./assets/tv/" + tracks[trackIndex].file + ".mp3";
    }

    function prepareSource() {
      /* Ignore callbacks from the source that load() is about to abort. */
      wanted = false;
      attempt += 1;
      sourcePrepared = false;
      music.pause();
      updateTrack();
      try {
        music.src = source();
        music.load();
        sourcePrepared = true;
      } catch (error) {
        failed("音楽を読み込めませんでした。もう一度お試しください");
        return false;
      }
      return true;
    }

    function switchSource(resume) {
      if (!prepareSource()) { return; }
      if (resume) { startMusic(); }
      else { setState(false, ""); }
    }

    function playbackFailed(error) {
      var code = music.error && music.error.code;
      if (error && error.name === "NotAllowedError") {
        failed("音楽の再生を許可するため、もう一度、再生を押してください");
      } else if (code === 2) {
        failed("音楽を読み込めませんでした。通信を確認して、もう一度お試しください");
      } else {
        failed("音楽を再生できませんでした。もう一度、再生を押してください");
      }
    }

    function startMusic() {
      var result, currentAttempt;
      /* Give the first play the same explicit setup as a track change. */
      if ((!sourcePrepared || music.error) && !prepareSource()) { return; }
      wanted = true;
      attempt += 1;
      currentAttempt = attempt;
      setState(true, "音楽を準備しています…");
      try {
        /* Keep play() in the user gesture. Older TVs may return undefined. */
        result = music.play();
        if (result && typeof result.then === "function") {
          result.then(function () {}, function (error) {
            if (currentAttempt === attempt && wanted) { playbackFailed(error); }
          });
        }
      } catch (error) {
        if (currentAttempt === attempt && wanted) { playbackFailed(error); }
      }
    }

    function changeTrack(direction) {
      var resume = wanted;
      trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
      switchSource(resume);
    }

    if (!supports("audio/mpeg")) {
      status.textContent = "このブラウザーでは音楽を再生できません";
      return;
    }
    /* Reduced levels are baked into the files, including on TVs that ignore volume. */
    try { music.volume = 1; } catch (error) { /* Use the TV's volume control. */ }
    button.disabled = false;
    previous.disabled = false;
    next.disabled = false;
    music.src = source();
    updateTrack();
    setState(false, "");
    controls.setTrackHandler(changeTrack);

    previous.addEventListener("click", function () { changeTrack(-1); }, false);
    next.addEventListener("click", function () { changeTrack(1); }, false);
    button.addEventListener("click", function () {
      if (wanted) {
        wanted = false;
        attempt += 1;
        music.pause();
        setState(false, "");
      } else {
        startMusic();
      }
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
      /* A previous pause/load event must not cancel playback of the next source. */
      if (wanted && music.paused) {
        wanted = false;
        attempt += 1;
        setState(false, "");
      }
    }, false);
    music.addEventListener("error", function () {
      if (music.error) { playbackFailed(null); }
    }, false);
  }

  var controls = setupControls();
  setupMusic(controls);
  controls.focus();
  createSnow();
}());
