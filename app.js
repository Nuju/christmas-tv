/* ES5 syntax for older TV browsers. No dependencies, timers or network calls. */
(function () {
  "use strict";

  var snow = document.getElementById("snow");
  var style = document.documentElement.style;
  var fragment;
  var flake;
  var size;
  var duration;
  var i;

  if (!snow || !("animationName" in style || "webkitAnimationName" in style)) {
    return;
  }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  fragment = document.createDocumentFragment();

  for (i = 0; i < 32; i += 1) {
    flake = document.createElement("span");
    flake.className = "snowflake";
    size = 2 + Math.random() * 4;
    duration = 24 + Math.random() * 22;

    flake.style.left = (i * 100 / 32 + Math.random() * 2).toFixed(2) + "%";
    flake.style.width = size.toFixed(1) + "px";
    flake.style.height = size.toFixed(1) + "px";
    flake.style.opacity = (0.18 + Math.random() * 0.38).toFixed(2);
    flake.style.webkitAnimationDuration = duration.toFixed(2) + "s";
    flake.style.animationDuration = duration.toFixed(2) + "s";
    /* Negative delays make snowfall visible immediately after opening. */
    flake.style.webkitAnimationDelay = (-Math.random() * duration).toFixed(2) + "s";
    flake.style.animationDelay = flake.style.webkitAnimationDelay;
    fragment.appendChild(flake);
  }

  snow.appendChild(fragment);
}());
