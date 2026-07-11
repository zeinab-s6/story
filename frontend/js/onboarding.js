(function () {
  "use strict";

  var AVATARS = {
    boy: "images/boy.jpg",
    girl: "images/girl.jpg",
  };

  var LABELS = {
    boy: "آواتار انتخاب شد",
    girl: "آواتار انتخاب شد",
  };

  var form = document.getElementById("onboarding-form");
  var errorEl = document.getElementById("onboarding-error");
  var submitBtn = document.getElementById("onboarding-submit");
  var submitHint = document.getElementById("onboarding-submit-hint");
  var previewImg = document.getElementById("onboarding-avatar-preview");
  var previewLabel = document.getElementById("onboarding-preview-label");
  var parentNameEl = document.getElementById("onboarding-parent-name");
  var childNameInput = document.getElementById("onboarding-child-name");

  var BRAND_SUBMIT_LABEL =
    'ورود به <span class="brand-name"><span class="brand-name__lala">lala</span><span class="brand-name__bye">Bye</span></span>';

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function redirectToLogin() {
    window.location.replace("/login");
  }

  function hasValidLocalSession() {
    return !!(window.StorytellingAuth && window.StorytellingAuth.hasValidSession());
  }

  function getSelectedGenderInput() {
    return form && form.querySelector('input[name="childGender"]:checked');
  }

  function syncGenderCardVisuals() {
    if (!form) return;
    form.querySelectorAll(".gender-card").forEach(function (card) {
      var input = card.querySelector('input[name="childGender"]');
      card.classList.toggle("gender-card--selected", !!(input && input.checked));
    });
  }

  function updateSubmitState() {
    var selected = getSelectedGenderInput();
    if (submitBtn) submitBtn.disabled = !selected;
    if (submitHint) submitHint.hidden = !!selected;
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading || !getSelectedGenderInput();
    submitBtn.classList.toggle("btn--loading", loading);
    if (submitHint) submitHint.hidden = loading || !!getSelectedGenderInput();
    if (loading) {
      submitBtn.textContent = "در حال ذخیره...";
      return;
    }
    submitBtn.innerHTML = BRAND_SUBMIT_LABEL;
    updateSubmitState();
  }

  function getPreviewLabel(gender) {
    var name = childNameInput && childNameInput.value.trim();
    if (name) return name;
    return LABELS[gender] || "یک گزینه را انتخاب کن";
  }

  function selectGender(value) {
    if (!form || !value) return;
    var input = form.querySelector('input[name="childGender"][value="' + value + '"]');
    if (!input) return;
    input.checked = true;
    showError("");
    syncGenderCardVisuals();
    updatePreview(value);
  }

  function updatePreview(gender) {
    if (!gender || !AVATARS[gender]) return;
    if (previewImg) previewImg.src = AVATARS[gender];
    if (previewLabel) previewLabel.textContent = getPreviewLabel(gender);
    updateSubmitState();
  }

  function initParentName() {
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (parentNameEl && user && user.displayName) {
      parentNameEl.textContent = user.displayName;
    }
  }

  function bindGenderCards() {
    if (!form) return;
    var lastPickAt = 0;
    form.querySelectorAll(".gender-card").forEach(function (card) {
      function onPick() {
        var now = Date.now();
        if (now - lastPickAt < 300) return;
        lastPickAt = now;
        var input = card.querySelector('input[name="childGender"]');
        if (!input) return;
        selectGender(input.value);
      }
      card.addEventListener("click", onPick);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      });
    });

    form.querySelectorAll('input[name="childGender"]').forEach(function (input) {
      input.addEventListener("change", function () {
        selectGender(input.value);
      });
    });
  }

  if (childNameInput) {
    childNameInput.addEventListener("input", function () {
      var selected = getSelectedGenderInput();
      if (selected) updatePreview(selected.value);
      else if (previewLabel) {
        var name = childNameInput.value.trim();
        previewLabel.textContent = name || "یک گزینه را انتخاب کن";
      }
    });
  }

  if (form) {
    bindGenderCards();

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showError("");

      if (!hasValidLocalSession()) {
        redirectToLogin();
        return;
      }

      var selected = getSelectedGenderInput();
      if (!selected) {
        showError("لطفاً جنسیت فرزند را انتخاب کن.");
        if (submitHint) submitHint.hidden = false;
        return;
      }

      var payload = { childGender: selected.value };
      var childName = childNameInput && childNameInput.value.trim();
      if (childName) payload.childName = childName;

      setLoading(true);
      try {
        var result = await window.StorytellingAPI.updateChildProfile(payload);
        if (result.user) {
          window.StorytellingAuth.updateUser(result.user);
          if (childName) {
            try { localStorage.setItem("storytelling_child_name", childName); } catch (err) { /* ignore */ }
          }
        }
        window.location.replace("/home");
      } catch (err) {
        if (err.status === 401) {
          redirectToLogin();
          return;
        }
        var msg = "ذخیره اطلاعات ناموفق بود.";
        if (err.message === "Failed to fetch") {
          msg = "اتصال به سرور برقرار نشد.";
        } else if (err.message) {
          msg = err.message;
        }
        showError(msg);
      } finally {
        setLoading(false);
      }
    });
  }

  if (!hasValidLocalSession()) {
    redirectToLogin();
  } else {
    initParentName();
    syncGenderCardVisuals();
    updateSubmitState();
  }
})();
