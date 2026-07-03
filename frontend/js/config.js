(function () {
  "use strict";
  if (typeof window.API_BASE_URL === "string" && window.API_BASE_URL.length > 0) return;
  if (location.hostname.endsWith(".vercel.app")) {
    window.API_BASE_URL = "https://storytelling-production-d009.up.railway.app";
    return;
  }
  // Darkube / Docker: API and frontend share the same origin — relative /api/* paths.
  window.API_BASE_URL = "";
})();
