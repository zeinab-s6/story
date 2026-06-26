(function () {
  "use strict";
  if (typeof window.API_BASE_URL === "string" && window.API_BASE_URL.length > 0) return;
  window.API_BASE_URL = location.hostname.endsWith(".vercel.app")
    ? "https://storytelling-production-d009.up.railway.app"
    : "";
})();
