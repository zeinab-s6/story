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

  var pendingPhone = "";
  var resendTimer = null;
  var resendSecondsLeft = 0;

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
  }

  function showCodeStep(phone) {
    pendingPhone = phone;
    if (phoneForm) phoneForm.hidden = true;
    if (codeForm) codeForm.hidden = false;
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
})();
