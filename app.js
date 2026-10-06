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
    var button = document.getElementById("music-toggle");
    var status = document.getElementById("music-status");
    var wanted = false;
    var attempt = 0;

    function setState(playing, message) {
      button.setAttribute("aria-pressed", playing ? "true" : "false");
      button.textContent = playing ? "Pause music" : "Play music";
      status.textContent = message;
    }

    function failed(message) {
      wanted = false;
      attempt += 1;
      music.pause();
      setState(false, message);
    }

    if (!music || !button || !status) { return; }
    if (!music.canPlayType || !music.canPlayType("audio/mpeg")) {
      status.textContent = "このブラウザでは音楽を再生できません";
      return;
    }

    music.volume = 0.35;
    button.disabled = false;
    status.textContent = "";

    /* Show help for actual keyboard/remote use, not programmatic initial focus. */
    document.addEventListener("keydown", function () {
      button.parentNode.className = "music-panel keyboard-controls";
    }, true);
    document.addEventListener("mousemove", function () {
      button.parentNode.className = "music-panel";
    }, true);
    document.addEventListener("mousedown", function () {
      button.parentNode.className = "music-panel";
    }, true);
    document.addEventListener("touchstart", function () {
      button.parentNode.className = "music-panel";
    }, true);

    button.addEventListener("click", function () {
      var result, currentAttempt;
      if (wanted) {
        wanted = false;
        attempt += 1;
        music.pause();
        setState(false, "");
        return;
      }
      wanted = true;
      attempt += 1;
      currentAttempt = attempt;
      setState(true, "音楽を準備しています…");
      try {
        if (music.error) { music.load(); }
        /* Called directly in the click event, including remote Enter activation. */
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
    }, false);

    music.addEventListener("playing", function () {
      if (!wanted) { music.pause(); return; }
      setState(true, "");
    }, false);
    music.addEventListener("waiting", function () {
      if (wanted) { status.textContent = "音楽を読み込んでいます…"; }
    }, false);
    music.addEventListener("pause", function () {
      if (wanted) {
        wanted = false;
        attempt += 1;
        setState(false, "");
      }
    }, false);
    music.addEventListener("error", function () {
      failed("音楽を読み込めませんでした。通信を確認して、もう一度お試しください");
    }, false);

    /* A single play/pause button is usable with the TV's remote. */
    button.focus();
  }

  createSnow();
  setupMusic();
}());
