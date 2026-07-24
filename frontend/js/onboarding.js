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
  var roleInput = document.getElementById("onboarding-parent-role");
  var childNameInput = document.getElementById("onboarding-child-name");

  var SUBMIT_LABEL = "شروع قصه";

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

  function isFormReady() {
    var role = roleInput && roleInput.value.trim();
    var childName = childNameInput && childNameInput.value.trim();
    return !!(role && childName && getSelectedGenderInput());
  }

  function updateSubmitState() {
    var ready = isFormReady();
    if (submitBtn) submitBtn.disabled = !ready;
    if (submitHint) submitHint.hidden = ready;
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading || !isFormReady();
    submitBtn.classList.toggle("btn--loading", loading);
    if (submitHint) submitHint.hidden = loading || isFormReady();
    if (loading) {
      submitBtn.textContent = "در حال ذخیره...";
      return;
    }
    submitBtn.textContent = SUBMIT_LABEL;
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

  function initRoleFromUser() {
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (roleInput && user && user.displayName && user.displayName !== "والد") {
      roleInput.value = user.displayName;
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

  if (roleInput) {
    roleInput.addEventListener("input", updateSubmitState);
  }

  if (childNameInput) {
    childNameInput.addEventListener("input", function () {
      var selected = getSelectedGenderInput();
      if (selected) updatePreview(selected.value);
      else if (previewLabel) {
        var name = childNameInput.value.trim();
        previewLabel.textContent = name || "یک گزینه را انتخاب کن";
      }
      updateSubmitState();
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

      var role = roleInput && roleInput.value.trim();
      var childName = childNameInput && childNameInput.value.trim();
      var selected = getSelectedGenderInput();

      if (!role) {
        showError("نقش خود را در مقابل فرزند بنویس.");
        return;
      }
      if (!childName) {
        showError("نام کودک را وارد کن.");
        return;
      }
      if (!selected) {
        showError("لطفاً جنسیت و آواتار کودک را انتخاب کن.");
        if (submitHint) submitHint.hidden = false;
        return;
      }

      var payload = {
        displayName: role,
        childName: childName,
        childGender: selected.value,
      };

      setLoading(true);
      try {
        var result = await window.StorytellingAPI.updateChildProfile(payload);
        if (result.user) {
          window.StorytellingAuth.updateUser(result.user);
          try { localStorage.setItem("storytelling_child_name", childName); } catch (err) { /* ignore */ }
        }
        try { sessionStorage.setItem("storytelling_initial_tab", "story"); } catch (err) { /* ignore */ }
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
    initRoleFromUser();
    syncGenderCardVisuals();
    updateSubmitState();
  }
})();
