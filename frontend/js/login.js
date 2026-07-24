(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var phoneInput = document.getElementById("login-phone");
  var otpInput = document.getElementById("login-otp");
  var otpGroup = document.getElementById("otp-group");
  var otpHint = document.getElementById("login-otp-hint");
  var btnSendOtp = document.getElementById("btn-send-otp");
  var btnLogin = document.getElementById("btn-login");
  var otpRequested = false;
  var cooldownTimer = null;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (btn === btnLogin) {
      btn.disabled = loading || !otpRequested;
    } else if (btn === btnSendOtp && cooldownTimer && !loading) {
      btn.disabled = true;
    } else {
      btn.disabled = loading;
    }
    btn.classList.toggle("btn--loading", loading);
  }

  function normalizePhone(value) {
    var digits = String(value || "").replace(/\D/g, "");
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

  function revealOtpStep(hintText) {
    otpRequested = true;
    if (otpGroup) otpGroup.hidden = false;
    if (btnLogin) btnLogin.disabled = false;
    if (otpHint) {
      otpHint.hidden = !hintText;
      otpHint.textContent = hintText || "";
    }
    if (otpInput) {
      otpInput.focus();
    }
  }

  function startCooldown(seconds) {
    if (!btnSendOtp) return;
    var remaining = seconds || 60;
    btnSendOtp.disabled = true;
    var original = "ارسال مجدد کد";
    function tick() {
      if (remaining <= 0) {
        btnSendOtp.disabled = false;
        btnSendOtp.textContent = original;
        return;
      }
      btnSendOtp.textContent = "ارسال مجدد (" + remaining + ")";
      remaining -= 1;
      cooldownTimer = setTimeout(tick, 1000);
    }
    if (cooldownTimer) clearTimeout(cooldownTimer);
    tick();
  }

  async function handleSendOtp() {
    showError("");
    var phone = normalizePhone(phoneInput && phoneInput.value);
    if (!isValidPhone(phone)) {
      showError("شماره موبایل را درست وارد کن. مثال: ۰۹۱۲۳۴۵۶۷۸۹");
      return;
    }
    if (phoneInput) phoneInput.value = phone;
    if (!ensureAndroidReady()) return;

    setLoading(btnSendOtp, true);
    try {
      var result = await window.StorytellingAPI.requestOtp(phone);
      var hint = result && result.debugHint ? result.debugHint : "کد به شماره شما ارسال شد.";
      revealOtpStep(hint);
      startCooldown(result && result.expiresInSec ? Math.min(60, result.expiresInSec) : 60);
      if (btnSendOtp) btnSendOtp.textContent = "ارسال مجدد کد";
    } catch (err) {
      showError(resolveAuthError(err, "ارسال کد ناموفق بود."));
    } finally {
      setLoading(btnSendOtp, false);
      if (otpRequested && btnSendOtp && !cooldownTimer) {
        btnSendOtp.disabled = false;
      }
    }
  }

  if (btnSendOtp) {
    btnSendOtp.addEventListener("click", handleSendOtp);
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showError("");
      var phone = normalizePhone(phoneInput && phoneInput.value);
      var code = (otpInput && otpInput.value || "").trim();

      if (!isValidPhone(phone)) {
        showError("شماره موبایل را درست وارد کن.");
        return;
      }
      if (!otpRequested) {
        showError("ابتدا کد تأیید را درخواست کن.");
        return;
      }
      if (!/^\d{4,8}$/.test(code)) {
        showError("کد تأیید پیامک را وارد کن.");
        return;
      }
      if (!ensureAndroidReady()) return;

      setLoading(btnLogin, true);
      try {
        var result = await window.StorytellingAPI.verifyOtp(phone, code);
        try {
          window.StorytellingAuth.saveSession(result.token, result.user);
        } catch (sessionErr) {
          showError(sessionErr.message || "ذخیره ورود در دستگاه ممکن نیست.");
          return;
        }
        redirectAfterAuth(result.user);
      } catch (err) {
        showError(resolveAuthError(err, "ورود ناموفق بود."));
      } finally {
        setLoading(btnLogin, false);
      }
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
