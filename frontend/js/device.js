(function () {
  "use strict";

  var STORAGE_KEY = "storytelling_device_id";

  function getNativeBridge() {
    if (window.LalaByeAndroid && typeof window.LalaByeAndroid === "object") {
      return window.LalaByeAndroid;
    }
    return null;
  }

  function isAndroidApp() {
    return !!getNativeBridge();
  }

  function getNativeAndroidId() {
    var bridge = getNativeBridge();
    if (!bridge || typeof bridge.getAndroidId !== "function") {
      return null;
    }
    try {
      var value = bridge.getAndroidId();
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    } catch (_err) {
      /* never log native device identifiers */
    }
    return null;
  }

  function getNativeDeviceName() {
    var bridge = getNativeBridge();
    if (!bridge || typeof bridge.getDeviceName !== "function") {
      return null;
    }
    try {
      var value = bridge.getDeviceName();
      if (typeof value === "string" && value.trim()) {
        return value.trim().slice(0, 120);
      }
    } catch (_err) {
      /* ignore */
    }
    return null;
  }

  function createFallbackDeviceId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return "dev_" + window.crypto.randomUUID();
    }
    return "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 12);
  }

  function getFallbackDeviceId() {
    try {
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing && existing.trim()) {
        return existing.trim();
      }
      var created = createFallbackDeviceId();
      localStorage.setItem(STORAGE_KEY, created);
      return created;
    } catch (_err) {
      return createFallbackDeviceId();
    }
  }

  function getDeviceIdentity() {
    return {
      deviceId: getFallbackDeviceId(),
      androidId: getNativeAndroidId(),
      deviceName: getNativeDeviceName(),
    };
  }

  function assertAndroidIdentityReady() {
    if (!isAndroidApp()) {
      return { ok: true };
    }
    if (getNativeAndroidId()) {
      return { ok: true };
    }
    return {
      ok: false,
      error: "شناسه دستگاه اندروید در دسترس نیست. لطفاً اپ را ببندید و دوباره باز کنید.",
    };
  }

  window.LalaByeDevice = {
    getDeviceIdentity: getDeviceIdentity,
    getFallbackDeviceId: getFallbackDeviceId,
    isAndroidApp: isAndroidApp,
    assertAndroidIdentityReady: assertAndroidIdentityReady,
  };
})();
