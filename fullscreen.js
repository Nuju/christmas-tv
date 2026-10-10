/* Keep display controls independent of audio support in older TV browsers. */
(function () {
  "use strict";

  var button = document.getElementById("fullscreen-toggle");
  var status = document.getElementById("display-status");
  var target = document.documentElement;
  var pendingTarget = null;
  var attempt = 0;
  var timer = null;
  var lastActive = null;
  var lastMessage = null;
  var changeEvents = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
  var errorEvents = ["fullscreenerror", "webkitfullscreenerror", "mozfullscreenerror", "MSFullscreenError"];
  var i;

  if (!button || !status || !target) { return; }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement || document.mozFullScreenElement ||
      document.msFullscreenElement || document.webkitIsFullScreen || document.mozFullScreen);
  }

  function render(message) {
    var active = isFullscreen();
    var changed = active !== lastActive || message !== lastMessage;
    var event;
    button.textContent = active ? "全画面を終了" : "全画面";
    button.setAttribute("aria-pressed", active ? "true" : "false");
    status.textContent = message;
    lastActive = active;
    lastMessage = message;
    if (changed) {
      event = document.createEvent("Event");
      event.initEvent("displaycontrolschange", false, false);
      document.dispatchEvent(event);
    }
  }

  function finish(message) {
    attempt += 1;
    pendingTarget = null;
    if (timer !== null) { window.clearTimeout(timer); }
    timer = null;
    render(message);
  }

  function requestMethod() {
    if (typeof target.requestFullscreen === "function") {
      return { method: target.requestFullscreen, enabled: document.fullscreenEnabled, standard: true };
    }
    if (typeof target.webkitRequestFullscreen === "function") {
      return { method: target.webkitRequestFullscreen, enabled: document.webkitFullscreenEnabled };
    }
    if (typeof target.webkitRequestFullScreen === "function") {
      return { method: target.webkitRequestFullScreen, enabled: document.webkitFullscreenEnabled };
    }
    if (typeof target.mozRequestFullScreen === "function") {
      return { method: target.mozRequestFullScreen, enabled: document.mozFullScreenEnabled };
    }
    if (typeof target.msRequestFullscreen === "function") {
      return { method: target.msRequestFullscreen, enabled: document.msFullscreenEnabled };
    }
    return null;
  }

  function exitMethod() {
    var names = ["exitFullscreen", "webkitExitFullscreen", "webkitCancelFullScreen", "mozCancelFullScreen", "msExitFullscreen"];
    var j;
    for (j = 0; j < names.length; j += 1) {
      if (typeof document[names[j]] === "function") { return document[names[j]]; }
    }
    return null;
  }

  function failureMessage(entering) {
    return entering ?
      "全画面に切り替えられませんでした。もう一度、全画面ボタンを押してください。" :
      "全画面を終了できませんでした。ブラウザ側の全画面解除をお試しください。";
  }

  function fullscreenChanged() {
    if (pendingTarget !== null && isFullscreen() !== pendingTarget) {
      /* A queued event from an earlier switch must not settle the new request. */
      render("全画面表示を切り替えています…");
      return;
    }
    /* Also reflect an exit initiated by the TV or browser. */
    finish("");
  }

  function fullscreenFailed() {
    if (pendingTarget !== null) { finish(failureMessage(pendingTarget)); }
  }

  button.addEventListener("click", function () {
    var entering, request, method, result, currentAttempt;
    if (pendingTarget !== null) { return; }
    entering = !isFullscreen();
    if (entering) {
      request = requestMethod();
      if (!request) {
        render("このブラウザはページからの全画面表示に対応していません。ブラウザに全画面の項目がある場合は、そちらをご利用ください。");
        return;
      }
      if (request.enabled === false) {
        render("このブラウザでは、ページからの全画面表示が許可されていません。");
        return;
      }
      method = request.method;
    } else {
      method = exitMethod();
      if (!method) {
        render(failureMessage(false));
        return;
      }
    }

    attempt += 1;
    currentAttempt = attempt;
    pendingTarget = entering;
    render("全画面表示を切り替えています…");
    /* Legacy methods may return undefined and fail without emitting an event. */
    timer = window.setTimeout(function () {
      if (currentAttempt !== attempt) { return; }
      finish(isFullscreen() === entering ? "" : failureMessage(entering));
    }, 5000);

    try {
      /* Run inside the click/key gesture; do not wait for audio playback. */
      if (entering && request.standard) {
        result = method.call(target, { navigationUI: "hide" });
      } else {
        result = method.call(entering ? target : document);
      }
      if (result && typeof result.then === "function") {
        result.then(function () {
          if (currentAttempt === attempt) {
            finish(isFullscreen() === entering ? "" : failureMessage(entering));
          }
        }, function () {
          if (currentAttempt === attempt) { finish(failureMessage(entering)); }
        });
      }
      if (currentAttempt === attempt && isFullscreen() === entering) { finish(""); }
    } catch (error) {
      if (currentAttempt === attempt) { finish(failureMessage(entering)); }
    }
  }, false);

  for (i = 0; i < changeEvents.length; i += 1) {
    document.addEventListener(changeEvents[i], fullscreenChanged, false);
    document.addEventListener(errorEvents[i], fullscreenFailed, false);
  }

  /* An unsupported browser can still explain the limitation when selected. */
  button.disabled = false;
  render("");
}());
