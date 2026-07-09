(function () {
  "use strict";

  var TOKEN_KEY = "authToken";
  var USER_KEY = "currentUser";
  var ACTIVE_USER_KEY = "storytelling_active_user_id";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user && user.id != null) {
      localStorage.setItem(ACTIVE_USER_KEY, String(user.id));
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return false;
    }
    return true;
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      if (hasChildProfile()) {
        window.location.href = "/home";
      } else {
        window.location.href = "/onboarding";
      }
    }
  }

  function getInitials(name) {
    if (!name) return "؟";
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  function updateUser(user) {
    if (!user) return;
    saveSession(getToken(), Object.assign({}, getUser() || {}, user));
  }

  function hasChildProfile() {
    var user = getUser();
    return !!(user && user.childGender);
  }

  function requireChildProfile() {
    if (!hasChildProfile()) {
      window.location.href = "/onboarding";
      return false;
    }
    return true;
  }

  function getChildGenderLabel(gender) {
    if (gender === "boy") return "پسر";
    if (gender === "girl") return "دختر";
    return "";
  }

  function renderChildAvatar() {
    var user = getUser();

    var mobileChildWrap = document.getElementById("mobile-profile-child");
    var mobileChildImg = document.getElementById("mobile-child-avatar-img");
    var mobileChildLabel = document.getElementById("mobile-profile-child-label");
    if (mobileChildWrap && mobileChildImg) {
      if (user && user.childAvatarUrl) {
        mobileChildWrap.hidden = false;
        mobileChildImg.src = user.childAvatarUrl;
        mobileChildImg.alt = "آواتار فرزند";
        if (mobileChildLabel) {
          mobileChildLabel.textContent = user.childName
            ? "یک قصه برای " + user.childName
            : "مدیریت قصه‌ها و حساب کاربری";
        }
      } else {
        mobileChildWrap.hidden = true;
      }
    }
  }

  function renderUserAvatar() {
    var user = getUser();
    var mobileName = document.getElementById("mobile-profile-name");

    if (!user) {
      renderChildAvatar();
      return;
    }

    if (mobileName && user.childName) mobileName.textContent = user.childName;
    renderChildAvatar();
    if (window.__lalaByeSyncChildDisplay) window.__lalaByeSyncChildDisplay();
  }

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  function bindProfileMenu() {
    var btn = document.getElementById("user-avatar-btn");
    var menu = document.getElementById("profile-menu");
    var logoutBtn = document.getElementById("btn-logout");

    if (btn && menu) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      document.addEventListener("click", function () {
        menu.hidden = true;
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        logout();
      });
    }
  }

  window.StorytellingAuth = {
    getToken,
    getUser,
    saveSession,
    clearSession,
    updateUser,
    isLoggedIn,
    requireAuth,
    requireChildProfile,
    hasChildProfile,
    getChildGenderLabel,
    redirectIfLoggedIn,
    getInitials,
    renderUserAvatar,
    renderChildAvatar,
    logout,
    bindProfileMenu,
  };
})();
