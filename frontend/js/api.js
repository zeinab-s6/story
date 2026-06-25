(function () {
  "use strict";

  function getBaseUrl() {
    return (window.API_BASE_URL || "").replace(/\/$/, "");
  }

  function apiUrl(path) {
    return `${getBaseUrl()}${path.startsWith("/") ? path : "/" + path}`;
  }

  function logFetchFailure(context, details) {
    console.error("[StorytellingAPI] " + context, {
      url: details.url,
      status: details.status != null ? details.status : undefined,
      body: details.body != null ? details.body : undefined,
      error: details.error || undefined,
    });
  }

  function authHeaders() {
    var token = window.StorytellingAuth?.getToken?.();
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function request(url, options) {
    var response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders(),
          ...(options?.headers || {}),
        },
      });
    } catch (err) {
      logFetchFailure("network error", { url: url, status: null, body: null, error: err });
      throw err;
    }

    var data = null;
    var contentType = response.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        var text = await response.text();
        data = { success: response.ok, error: text || "خطای ناشناخته" };
      }
    } catch (parseErr) {
      logFetchFailure("response parse error", {
        url: url,
        status: response.status,
        body: null,
        error: parseErr,
      });
      throw parseErr;
    }

    if (!response.ok) {
      logFetchFailure("HTTP error", {
        url: url,
        status: response.status,
        body: data,
        error: null,
      });
      var error = new Error(data?.error || data?.hint || "درخواست ناموفق بود.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function buildFullAudioUrl(audioUrl) {
    if (!audioUrl) return "";
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
      return audioUrl;
    }
    var base = getBaseUrl();
    var path = audioUrl.startsWith("/") ? audioUrl : "/" + audioUrl;
    return base + path;
  }

  async function login(email, password) {
    return request(apiUrl("/api/auth/login"), {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
    });
  }

  async function register(email, password, displayName) {
    return request(apiUrl("/api/auth/register"), {
      method: "POST",
      body: JSON.stringify({ email: email, password: password, displayName: displayName }),
    });
  }

  async function getMe() {
    return request(apiUrl("/api/auth/me"), { method: "GET" });
  }

  async function updateChildProfile(payload) {
    return request(apiUrl("/api/auth/child-profile"), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async function generateStory(payload) {
    return request(apiUrl("/api/stories/generate"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function generateStoryAudio(storyId, payload) {
    return request(apiUrl("/api/stories/" + storyId + "/audio"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function getVoiceMode() {
    return request(apiUrl("/api/voices/mode"), { method: "GET" });
  }

  async function previewVoice(voice, format, text, options) {
    var body = { voice: voice, format: format || "wav" };
    if (text) body.text = text;
    if (options && options.backgroundAmbience) body.backgroundAmbience = true;
    return request(apiUrl("/api/voices/preview"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  window.StorytellingAPI = {
    getBaseUrl,
    apiUrl,
    logFetchFailure,
    buildFullAudioUrl,
    login,
    register,
    getMe,
    updateChildProfile,
    generateStory,
    generateStoryAudio,
    getVoiceMode,
    previewVoice,
  };
})();
