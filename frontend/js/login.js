(function () {
  "use strict";

  var phoneForm = document.getElementById("otp-phone-form");
  var codeForm = document.getElementById("otp-code-form");
  var phoneInput = document.getElementById("login-phone");
  var otpInput = document.getElementById("login-otp");
  var errorEl = document.getElementById("login-error");
  var sentHint = document.getElementById("otp-sent-hint");
  var btnRequest = document.getElementById("btn-request-otp");
  var btnVerify = document.getElementById("btn-verify-otp");
  var btnResend = document.getElementById("btn-resend-otp");
  var btnChangePhone = document.getElementById("btn-change-phone");
  var googleWrap = document.getElementById("login-google-wrap");
  var googleBtnHost = document.getElementById("google-signin-button");
  var loginDivider = document.getElementById("login-divider");

  var pendingPhone = "";
  var resendTimer = null;
  var resendSecondsLeft = 0;
  var googleClientId = null;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("btn--loading", loading);
  }

  function toEnglishDigits(value) {
    return String(value || "")
      .replace(/[۰-۹]/g, function (d) {
        return String(d.charCodeAt(0) - 1728);
      })
      .replace(/[٠-٩]/g, function (d) {
        return String(d.charCodeAt(0) - 1632);
      });
  }

  function normalizePhoneInput(value) {
    var digits = toEnglishDigits(value).replace(/\D/g, "");
    if (digits.indexOf("98") === 0 && digits.length === 12) {
      digits = "0" + digits.slice(2);
    }
    if (digits.indexOf("9") === 0 && digits.length === 10) {
      digits = "0" + digits;
    }
    return digits;
  }

  function isValidPhone(phone) {
    return /^09\d{9}$/.test(phone);
  }

  function formatPhoneDisplay(phone) {
    if (!phone || phone.length < 11) return phone;
    return phone.slice(0, 4) + "***" + phone.slice(-4);
  }

  function showPhoneStep() {
    if (phoneForm) phoneForm.hidden = false;
    if (codeForm) codeForm.hidden = true;
    pendingPhone = "";
    if (otpInput) otpInput.value = "";
    showError("");
    clearResendTimer();
    updateResendButton();
    if (googleWrap && googleClientId) googleWrap.hidden = false;
    if (loginDivider && googleClientId) loginDivider.hidden = false;
  }

  function showCodeStep(phone) {
    pendingPhone = phone;
    if (phoneForm) phoneForm.hidden = true;
    if (codeForm) codeForm.hidden = false;
    if (googleWrap) googleWrap.hidden = true;
    if (loginDivider) loginDivider.hidden = true;
    if (sentHint) {
      sentHint.textContent = "کد تأیید به شماره " + formatPhoneDisplay(phone) + " ارسال شد.";
    }
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
    startResendCooldown();
  }

  function clearResendTimer() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    resendSecondsLeft = 0;
  }

  function updateResendButton() {
    if (!btnResend) return;
    if (resendSecondsLeft > 0) {
      btnResend.disabled = true;
      btnResend.textContent = "ارسال دوباره (" + resendSecondsLeft + ")";
    } else {
      btnResend.disabled = false;
      btnResend.textContent = "ارسال دوباره کد";
    }
  }

  function startResendCooldown() {
    clearResendTimer();
    resendSecondsLeft = 60;
    updateResendButton();
    resendTimer = setInterval(function () {
      resendSecondsLeft -= 1;
      if (resendSecondsLeft <= 0) {
        clearResendTimer();
      }
      updateResendButton();
    }, 1000);
  }

  function redirectAfterAuth(user) {
    if (user && user.childGender) {
      window.location.replace("/home");
    } else {
      window.location.replace("/onboarding");
    }
  }

  function resolveAuthError(err, fallback) {
    if (err && err.code === "DEVICE_ACCOUNT_BOUND" && err.message) {
      return err.message;
    }
    if (err && err.message === "Failed to fetch") {
      return "اتصال به سرور برقرار نشد. بک‌اند را اجرا کن.";
    }
    if (err && err.data && err.data.error) {
      return err.data.error;
    }
    if (err && err.message) {
      return err.message;
    }
    return fallback;
  }

  function ensureAndroidReady() {
    var check = window.LalaByeDevice && window.LalaByeDevice.assertAndroidIdentityReady
      ? window.LalaByeDevice.assertAndroidIdentityReady()
      : { ok: true };
    if (!check.ok) {
      showError(check.error);
      return false;
    }
    return true;
  }

  async function sendOtp(phone, triggerBtn) {
    showError("");
    if (!isValidPhone(phone)) {
      showError("شماره موبایل معتبر نیست. مثال: ۰۹۱۲۳۴۵۶۷۸۹");
      return false;
    }
    if (!window.StorytellingAPI || !window.StorytellingAPI.requestOtp) {
      showError("سرویس ورود در دسترس نیست.");
      return false;
    }

    setLoading(triggerBtn, true);
    try {
      var result = await window.StorytellingAPI.requestOtp(phone);
      if (result && result.debugHint) {
        showError(result.debugHint);
      }
      showCodeStep(result.phone || phone);
      return true;
    } catch (err) {
      showError(resolveAuthError(err, "ارسال کد ناموفق بود."));
      return false;
    } finally {
      setLoading(triggerBtn, false);
    }
  }

  async function verifyOtp(phone, code, triggerBtn) {
    showError("");
    var normalizedCode = toEnglishDigits(code).replace(/\D/g, "");
    if (!/^\d{4,8}$/.test(normalizedCode)) {
      showError("کد تأیید را درست وارد کن.");
      return;
    }
    if (!ensureAndroidReady()) return;

    setLoading(triggerBtn, true);
    try {
      var result = await window.StorytellingAPI.verifyOtp(phone, normalizedCode);
      try {
        window.StorytellingAuth.saveSession(result.token, result.user);
      } catch (sessionErr) {
        showError(sessionErr.message || "ذخیره ورود در دستگاه ممکن نیست.");
        return;
      }
      redirectAfterAuth(result.user);
    } catch (err) {
      showError(resolveAuthError(err, "تأیید کد ناموفق بود."));
    } finally {
      setLoading(triggerBtn, false);
    }
  }

  async function handleGoogleCredential(response) {
    showError("");
    if (!response || !response.credential) {
      showError("ورود با گوگل ناموفق بود.");
      return;
    }
    if (!ensureAndroidReady()) return;

    try {
      var result = await window.StorytellingAPI.loginWithGoogle(response.credential);
      try {
        window.StorytellingAuth.saveSession(result.token, result.user);
      } catch (sessionErr) {
        showError(sessionErr.message || "ذخیره ورود در دستگاه ممکن نیست.");
        return;
      }
      redirectAfterAuth(result.user);
    } catch (err) {
      showError(resolveAuthError(err, "ورود با گوگل ناموفق بود."));
    }
  }

  function renderGoogleButton(clientId) {
    if (!clientId || !googleBtnHost || !googleWrap) return;

    function init() {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        return false;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        ux_mode: "popup",
        auto_select: false,
      });
      googleBtnHost.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnHost, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: Math.min(320, googleBtnHost.clientWidth || 280),
        locale: "fa",
      });
      googleWrap.hidden = false;
      if (loginDivider) loginDivider.hidden = false;
      return true;
    }

    if (init()) return;

    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (init() || tries > 40) {
        clearInterval(timer);
        if (tries > 40 && googleWrap) {
          googleWrap.hidden = true;
          if (loginDivider) loginDivider.hidden = true;
        }
      }
    }, 150);
  }

  async function loadAuthConfig() {
    if (!window.StorytellingAPI || !window.StorytellingAPI.getAuthConfig) return;
    try {
      var config = await window.StorytellingAPI.getAuthConfig();
      googleClientId = config && config.googleClientId ? config.googleClientId : null;
      if (googleClientId) {
        renderGoogleButton(googleClientId);
      }
    } catch (err) {
      console.warn("[login] auth config unavailable", err);
    }
  }

  if (phoneForm) {
    phoneForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = normalizePhoneInput(phoneInput && phoneInput.value);
      if (phoneInput) phoneInput.value = phone;
      sendOtp(phone, btnRequest);
    });
  }

  if (codeForm) {
    codeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      verifyOtp(pendingPhone, otpInput && otpInput.value, btnVerify);
    });
  }

  if (btnResend) {
    btnResend.addEventListener("click", function () {
      if (resendSecondsLeft > 0 || !pendingPhone) return;
      sendOtp(pendingPhone, btnResend);
    });
  }

  if (btnChangePhone) {
    btnChangePhone.addEventListener("click", function () {
      showPhoneStep();
      if (phoneInput) phoneInput.focus();
    });
  }

  function applyLoginBackground() {
    var imageUrl = "images/login-background.jpg";
    var img = document.getElementById("login-bg-img");
    if (img) {
      img.src = imageUrl;
      return;
    }

    var bgEl = document.getElementById("login-bg");
    if (!bgEl) return;
    bgEl.style.backgroundImage = 'url("' + imageUrl + '")';
    bgEl.style.backgroundSize = "cover";
    bgEl.style.backgroundPosition = "center";
    bgEl.style.backgroundRepeat = "no-repeat";
  }

  applyLoginBackground();
  loadAuthConfig();
})();
