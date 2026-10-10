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
    var format = document.getElementById("audio-format-toggle");
    var idleTimer = null;
    var controlsHidden = false;
    var keyboardMode = false;
    var wakeKey = 0;
    var navigationKey = 0;
    var trackHandler = null;
    var buttons = [previous, play, next, fullscreen, format];
    var i;

    function isPlaybackTarget(target) {
      return target === play || target === previous || target === next || target === document.body;
    }

    function isControlTarget(target) {
      return isPlaybackTarget(target) || target === fullscreen || target === format;
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
            else if (!format.disabled) { format.focus(); }
          } else { focusPlayback(); }
        } else if (isPlaybackTarget(target)) {
          if (trackHandler && !play.disabled) {
            play.focus();
            trackHandler(code === 37 ? -1 : 1);
          }
        } else if (target === fullscreen && !format.disabled) { format.focus(); }
        else if (!fullscreen.disabled) { fullscreen.focus(); }
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
    var formatButton = document.getElementById("audio-format-toggle");
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
    var formats = [];
    var formatIndex = 0;
    var trackIndex = 0;
    var wanted = false;
    var attempt = 0;
    var fallbackTried = false;
    var pendingSeek = null;
    var savedFormat, i;

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
      formatButton.textContent = "音声：" + formats[formatIndex].label;
      formatButton.setAttribute("aria-label", "音声形式：" + formats[formatIndex].label +
        (formats.length > 1 ? "。決定で切り替え" : ""));
    }

    function source() {
      return "./assets/tv/" + tracks[trackIndex].file + "." + formats[formatIndex].extension;
    }

    function restorePosition() {
      var position;
      if (!pendingSeek || music.readyState < 1 || music.currentSrc !== music.src) { return; }
      position = pendingSeek;
      pendingSeek = null;
      if (isFinite(music.duration)) { position = Math.min(position, Math.max(0, music.duration - 0.1)); }
      try { music.currentTime = position; } catch (error) { /* Some TVs cannot seek yet. */ }
    }

    function switchSource(resume, position) {
      /* Ignore callbacks from the source that load() is about to abort. */
      wanted = false;
      attempt += 1;
      music.pause();
      pendingSeek = position > 0 ? position : null;
      updateTrack();
      try {
        music.src = source();
        music.load();
      } catch (error) {
        failed("音楽を切り替えられませんでした。もう一度お試しください");
        return;
      }
      if (resume) { startMusic(); }
      else { setState(false, ""); }
    }

    function playbackFailed(error) {
      var code = music.error && music.error.code;
      var resume = wanted;
      var position = music.currentTime;
      /* Audible noise does not raise an error. The format button remains available. */
      if ((code === 3 || code === 4 || (error && error.name === "NotSupportedError")) &&
          !fallbackTried && formats.length > 1) {
        fallbackTried = true;
        formatIndex = (formatIndex + 1) % formats.length;
        switchSource(resume, position);
        return;
      }
      if (error && error.name === "NotAllowedError") {
        failed("音楽の再生を許可するため、もう一度、再生を押してください");
      } else if (code === 2) {
        failed("音楽を読み込めませんでした。通信を確認して、もう一度お試しください");
      } else {
        failed("音楽を再生できませんでした。再生を押すか、音声形式を切り替えてください");
      }
    }

    function startMusic() {
      var result, currentAttempt;
      wanted = true;
      attempt += 1;
      currentAttempt = attempt;
      setState(true, "音楽を準備しています…");
      try {
        if (music.error) { music.load(); }
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
      fallbackTried = false;
      switchSource(resume, 0);
    }

    if (supports('audio/mp4; codecs="mp4a.40.2"') || supports("audio/mp4") || supports("audio/x-m4a")) {
      formats.push({id: "aac", label: "AAC", extension: "m4a"});
    }
    if (supports("audio/mpeg")) { formats.push({id: "mp3", label: "MP3", extension: "mp3"}); }
    if (!formats.length) {
      status.textContent = "このブラウザーでは音楽を再生できません";
      return;
    }
    try { savedFormat = window.localStorage.getItem("christmas-tv-audio-format-v1"); }
    catch (error) { /* Storage is optional on TV browsers. */ }
    for (i = 0; i < formats.length; i += 1) {
      if (formats[i].id === savedFormat) { formatIndex = i; }
    }
    /* Matching, reduced levels are baked into both files, including on TVs that ignore volume. */
    try { music.volume = 1; } catch (error) { /* Use the TV's volume control. */ }
    button.disabled = false;
    previous.disabled = false;
    next.disabled = false;
    formatButton.disabled = formats.length < 2;
    music.src = source();
    updateTrack();
    setState(false, "");
    controls.setTrackHandler(changeTrack);

    previous.addEventListener("click", function () { changeTrack(-1); }, false);
    next.addEventListener("click", function () { changeTrack(1); }, false);
    formatButton.addEventListener("click", function () {
      var resume = wanted;
      var position = music.currentTime;
      formatIndex = (formatIndex + 1) % formats.length;
      fallbackTried = false;
      try { window.localStorage.setItem("christmas-tv-audio-format-v1", formats[formatIndex].id); }
      catch (error) { /* Playback also works without storage. */ }
      switchSource(resume, position);
    }, false);
    button.addEventListener("click", function () {
      if (wanted) {
        wanted = false;
        attempt += 1;
        music.pause();
        setState(false, "");
      } else {
        fallbackTried = false;
        startMusic();
      }
    }, false);
    music.addEventListener("loadedmetadata", restorePosition, false);
    music.addEventListener("playing", function () {
      if (!wanted) { music.pause(); return; }
      if (music.paused || music.readyState < 3) { return; }
      restorePosition();
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
