(function () {
  "use strict";
  if (typeof window.API_BASE_URL === "string" && window.API_BASE_URL.length > 0) return;

  // Production API (Darkube). Railway is no longer available.
  var PRODUCTION_API = "https://lalabye.darkube.ir";

  // Frontend on Vercel talks to Darkube API (CORS allows storytelling-sepia.vercel.app).
  if (location.hostname.endsWith(".vercel.app")) {
    window.API_BASE_URL = PRODUCTION_API;
    return;
  }

  // Darkube / Docker: API and frontend share the same origin — relative /api/* paths.
  window.API_BASE_URL = "";
})();
