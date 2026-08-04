(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var phoneInput = document.getElementById("login-phone");
  var otpInput = document.getElementById("login-otp");
  var otpGroup = document.getElementById("otp-group");
  var otpHint = document.getElementById("otp-hint");
  var btnSendOtp = document.getElementById("btn-send-otp");
  var btnVerifyOtp = document.getElementById("btn-verify-otp");
  var btnChangePhone = document.getElementById("btn-change-phone");
  var btnGoogle = document.getElementById("btn-google-signin");

  var pendingPhone = "";
  var googleClientId = "";
  var googleScriptLoading = null;
  var googleTokenClient = null;

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
    if (phoneInput) {
      phoneInput.value = phone;
      phoneInput.readOnly = true;
    }
    if (otpGroup) otpGroup.hidden = false;
    if (btnSendOtp) btnSendOtp.hidden = true;
    if (btnVerifyOtp) btnVerifyOtp.hidden = false;
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
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
  }

  function showPhoneStep() {
    pendingPhone = "";
    if (phoneInput) {
      phoneInput.readOnly = false;
      phoneInput.focus();
    }
    if (otpGroup) otpGroup.hidden = true;
    if (btnSendOtp) btnSendOtp.hidden = false;
    if (btnVerifyOtp) btnVerifyOtp.hidden = true;
    if (btnChangePhone) btnChangePhone.hidden = true;
    if (otpHint) {
      otpHint.hidden = true;
      otpHint.textContent = "";
    }
    if (otpInput) otpInput.value = "";
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
    var phone = normalizePhoneInput(phoneInput && phoneInput.value);
    if (!phone || phone.length < 11) {
      showError("شماره موبایل را وارد کن.");
      return;
    }

    setLoading(btnSendOtp, true);
    try {
      var result = await window.StorytellingAPI.requestOtp(phone);
      var hint = result.debugHint
        ? "حالت تست: کد " + result.debugHint
        : "کد تأیید به شماره " + (result.phone || phone) + " ارسال شد.";
      showOtpStep(result.phone || phone, hint);
    } catch (err) {
      showError(resolveAuthError(err, "ارسال کد ناموفق بود."));
    } finally {
      setLoading(btnSendOtp, false);
    }
  }

  async function verifyOtp() {
    showError("");
    var phone = pendingPhone || normalizePhoneInput(phoneInput && phoneInput.value);
    var code = String((otpInput && otpInput.value) || "").replace(/\D/g, "");

    if (!phone) {
      showError("شماره موبایل را وارد کن.");
      return;
    }
    if (!code || code.length < 4) {
      showError("کد تأیید را وارد کن.");
      return;
    }
    if (!ensureAndroidReady()) return;

    setLoading(btnVerifyOtp, true);
    try {
      var result = await window.StorytellingAPI.verifyOtp(phone, code);
      await saveAndRedirect(result);
    } catch (err) {
      showError(resolveAuthError(err, "ورود ناموفق بود."));
    } finally {
      setLoading(btnVerifyOtp, false);
    }
  }

  function loadGoogleScript() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return Promise.resolve();
    }
    if (googleScriptLoading) return googleScriptLoading;

    googleScriptLoading = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-google-gsi="1"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () {
          reject(new Error("بارگذاری سرویس گوگل ناموفق بود."));
        });
        return;
      }

      var script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = "1";
      script.onload = function () { resolve(); };
      script.onerror = function () {
        googleScriptLoading = null;
        reject(new Error("بارگذاری سرویس گوگل ناموفق بود."));
      };
      document.head.appendChild(script);
    });

    return googleScriptLoading;
  }

  async function ensureGoogleClientId() {
    if (googleClientId) return googleClientId;
    if (typeof window.GOOGLE_CLIENT_ID === "string" && window.GOOGLE_CLIENT_ID) {
      googleClientId = window.GOOGLE_CLIENT_ID;
      return googleClientId;
    }

    var providers = await window.StorytellingAPI.getAuthProviders();
    googleClientId = providers && providers.google && providers.google.clientId
      ? providers.google.clientId
      : "";
    return googleClientId;
  }

  function completeGoogleLogin(accessToken) {
    if (!ensureAndroidReady()) return;
    setLoading(btnGoogle, true);
    showError("");
    window.StorytellingAPI.loginWithGoogleAccessToken(accessToken)
      .then(function (result) {
        return saveAndRedirect(result);
      })
      .catch(function (err) {
        showError(resolveAuthError(err, "ورود با گوگل ناموفق بود."));
      })
      .finally(function () {
        setLoading(btnGoogle, false);
      });
  }

  async function signInWithGoogle() {
    showError("");
    setLoading(btnGoogle, true);

    try {
      var clientId = await ensureGoogleClientId();
      if (!clientId) {
        showError("ورود با گوگل هنوز پیکربندی نشده است. GOOGLE_CLIENT_ID را در سرور تنظیم کن.");
        setLoading(btnGoogle, false);
        return;
      }

      await loadGoogleScript();

      if (!googleTokenClient) {
        googleTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: function (tokenResponse) {
            if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
              showError("ورود با گوگل لغو شد یا ناموفق بود.");
              setLoading(btnGoogle, false);
              return;
            }
            completeGoogleLogin(tokenResponse.access_token);
          },
          error_callback: function () {
            showError("ورود با گوگل لغو شد یا ناموفق بود.");
            setLoading(btnGoogle, false);
          },
        });
      }

      // Opens Google account picker directly — no email/password in our app.
      googleTokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (err) {
      showError(resolveAuthError(err, "ورود با گوگل ناموفق بود."));
      setLoading(btnGoogle, false);
    }
  }

  if (btnSendOtp) {
    btnSendOtp.addEventListener("click", function () {
      sendOtp();
    });
  }

  if (btnChangePhone) {
    btnChangePhone.addEventListener("click", function () {
      showPhoneStep();
    });
  }

  if (btnGoogle) {
    btnGoogle.addEventListener("click", function () {
      signInWithGoogle();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (otpGroup && !otpGroup.hidden) {
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
  ensureGoogleClientId().catch(function () {});
})();
