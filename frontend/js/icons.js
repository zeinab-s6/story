(function () {
  "use strict";

  var STROKE =
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  var PATHS = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/>',
    book: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 1 4 17.5v-11z"/><path d="M8 4v16"/>',
    plus: '<path d="M12 8v8M8 12h8"/>',
    mic: '<path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    history:
      '<path d="M12 8v5l3 2"/><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/>',
    logout:
      '<path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/>',
    star: '<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M8 5v14l11-7-11-7z"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>',
    download: '<path d="M12 3v10M7 13l5 5 5-5"/><path d="M5 21h14"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
  };

  function svg(name) {
    var paths = PATHS[name];
    if (!paths) return "";
    return "<svg viewBox=\"0 0 24 24\" " + STROKE + ">" + paths + "</svg>";
  }

  function render(name, extraClass) {
    var cls = "app-icon" + (extraClass ? " " + extraClass : "");
    return '<span class="' + cls + '" aria-hidden="true">' + svg(name) + "</span>";
  }

  function setPlayIcon(el, playing) {
    if (!el) return;
    el.innerHTML = svg(playing ? "pause" : "play");
    el.classList.add("app-icon", "app-icon--play");
  }

  function injectAll(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      var name = el.getAttribute("data-icon");
      if (!PATHS[name]) return;
      el.innerHTML = svg(name);
      if (!el.classList.contains("app-icon")) el.classList.add("app-icon");
    });
  }

  window.StorytellingIcons = {
    svg: svg,
    render: render,
    setPlayIcon: setPlayIcon,
    injectAll: injectAll,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      injectAll();
    });
  } else {
    injectAll();
  }
})();
