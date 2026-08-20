(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var authInput = document.getElementById("login-input");
  var authLabel = document.getElementById("login-input-label");
  var otpHint = document.getElementById("otp-hint");
  var btnAuth = document.getElementById("btn-auth-action");
  var btnChangePhone = document.getElementById("btn-change-phone");

  var pendingPhone = "";
  var otpStep = false;

  var BTN_SEND_HTML = "ارسال کد";
  var BTN_VERIFY_HTML =
    'ورود به <span class="brand-name"><span class="brand-name__lala">lala</span><span class="brand-name__bye">Bye</span></span>';

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("btn--loading", loading);
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

  function normalizePhoneInput(value) {
    var persian = "۰۱۲۳۴۵۶۷۸۹";
    var arabic = "٠١٢٣٤٥٦٧٨٩";
    var digits = String(value || "").replace(/[۰-۹٠-٩]/g, function (ch) {
      var p = persian.indexOf(ch);
      if (p >= 0) return String(p);
      var a = arabic.indexOf(ch);
      return a >= 0 ? String(a) : ch;
    }).replace(/\D/g, "");

    if (digits.startsWith("98") && digits.length === 12) {
      digits = "0" + digits.slice(2);
    }
    if (digits.startsWith("9") && digits.length === 10) {
      digits = "0" + digits;
    }
    return digits;
  }

  function showOtpStep(phone, hintText) {
    pendingPhone = phone;
    otpStep = true;

    if (authLabel) authLabel.textContent = "کد تأیید";
    if (authInput) {
      authInput.value = "";
      authInput.type = "text";
      authInput.name = "otp";
      authInput.placeholder = "۶ رقم";
      authInput.autocomplete = "one-time-code";
      authInput.maxLength = 6;
      authInput.inputMode = "numeric";
      authInput.setAttribute("pattern", "[0-9]*");
      authInput.focus();
    }

    if (btnAuth) btnAuth.innerHTML = BTN_VERIFY_HTML;
    if (btnChangePhone) btnChangePhone.hidden = false;

    if (otpHint) {
      if (hintText) {
        otpHint.textContent = hintText;
        otpHint.hidden = false;
      } else {
        otpHint.hidden = true;
        otpHint.textContent = "";
      }
    }
  }

  function showPhoneStep() {
    pendingPhone = "";
    otpStep = false;

    if (authLabel) authLabel.textContent = "شماره موبایل";
    if (authInput) {
      authInput.value = "";
      authInput.type = "tel";
      authInput.name = "phone";
      authInput.placeholder = "۰۹۱۲۳۴۵۶۷۸۹";
      authInput.autocomplete = "tel";
      authInput.maxLength = 13;
      authInput.inputMode = "numeric";
      authInput.removeAttribute("pattern");
      authInput.focus();
    }

    if (btnAuth) btnAuth.innerHTML = BTN_SEND_HTML;
    if (btnChangePhone) btnChangePhone.hidden = true;

    if (otpHint) {
      otpHint.hidden = true;
      otpHint.textContent = "";
    }
    showError("");
  }

  async function saveAndRedirect(result) {
    try {
      window.StorytellingAuth.saveSession(result.token, result.user);
    } catch (sessionErr) {
      showError(sessionErr.message || "ذخیره ورود در دستگاه ممکن نیست.");
      return;
    }
    redirectAfterAuth(result.user);
  }

  async function sendOtp() {
    showError("");
    var phone = normalizePhoneInput(authInput && authInput.value);
    if (!phone || phone.length < 11) {
      showError("شماره موبایل را وارد کن.");
      return;
    }

    setLoading(btnAuth, true);
    try {
      var result = await window.StorytellingAPI.requestOtp(phone);
      var hint = "کد تأیید به شماره " + (result.phone || phone) + " ارسال شد.";
      showOtpStep(result.phone || phone, hint);
    } catch (err) {
      showError(resolveAuthError(err, "ارسال کد ناموفق بود."));
    } finally {
      setLoading(btnAuth, false);
    }
  }

  async function verifyOtp() {
    showError("");
    var phone = pendingPhone;
    var code = String((authInput && authInput.value) || "").replace(/\D/g, "");

    if (!phone) {
      showError("شماره موبایل را وارد کن.");
      return;
    }
    if (!code || code.length < 4) {
      showError("کد تأیید را وارد کن.");
      return;
    }
    if (!ensureAndroidReady()) return;

    setLoading(btnAuth, true);
    try {
      var result = await window.StorytellingAPI.verifyOtp(phone, code);
      await saveAndRedirect(result);
    } catch (err) {
      showError(resolveAuthError(err, "ورود ناموفق بود."));
    } finally {
      setLoading(btnAuth, false);
    }
  }

  if (btnChangePhone) {
    btnChangePhone.addEventListener("click", function () {
      showPhoneStep();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (otpStep) {
        verifyOtp();
      } else {
        sendOtp();
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
