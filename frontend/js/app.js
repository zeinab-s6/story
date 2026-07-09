(function () {
  "use strict";

  // To test without backend, you can temporarily enable mockFrontendMode = true.
  const mockFrontendMode = false;

  const VOICE_TAGLINE_FALLBACK = "صدای مورد نظر را از بخش کتابخانه صدا انتخاب کنید.";

  const STORAGE_KEYS = {
    sessionId: "storytelling_session_id",
    lastStory: "storytelling_last_story",
    history: "storytelling_history",
    childName: "storytelling_child_name",
    legacyOwner: "storytelling_legacy_owner_user_id",
  };

  const USER_SCOPED_STORAGE_NAMES = ["sessionId", "lastStory", "history", "childName"];

  const GOAL_LABELS = {
    sleep: "خوابیدن",
    food: "غذا خوردن",
    cleanup: "جمع کردن اسباب‌بازی",
    calm: "آرام شدن",
    waiting: "سرگرمی هنگام انتظار",
    "screen-free": "کمتر کردن موبایل",
    brushing: "مسواک",
    bath: "حمام",
    dressing: "لباس پوشیدن",
  };

  const MOOD_LABELS = {
    calm: "آرام",
    angry: "عصبانی",
    restless: "بی‌قرار",
    sleepy: "خواب‌آلود",
    bored: "بی‌حوصله",
    sad: "ناراحت",
    excited: "هیجان‌زده",
  };

  const PROVIDER_LABELS = {
    mock: "تست محلی",
    openai: "هوش مصنوعی",
    liara: "لیارا",
    elevenlabs: "ElevenLabs",
  };

  const GOAL_CHIPS = [
    { key: "sleep", label: "خواب" },
    { key: "food", label: "غذا" },
    { key: "calm", label: "آرامش" },
    { key: "waiting", label: "انتظار" },
    { key: "screen-free", label: "موبایل کمتر" },
    { key: "brushing", label: "مسواک" },
  ];

  const OPENAI_VOICES = [
    { id: "nova", nameFa: "نوا", nameEn: "Nova", backendVoice: "nova", tags: ["ملایم", "قبل خواب"], description: "صدای گرم و آرام — مناسب قصه شب.", avatarHue: 340 },
    { id: "shimmer", nameFa: "شیمر", nameEn: "Shimmer", backendVoice: "shimmer", tags: ["نرم", "مهربان"], description: "لحن نرم و دوستانه برای کودک.", avatarHue: 270 },
    { id: "coral", nameFa: "مرجان", nameEn: "Coral", backendVoice: "coral", tags: ["روشن", "شاد"], description: "انرژی ملایم و شاد.", avatarHue: 28 },
    { id: "alloy", nameFa: "آلوی", nameEn: "Alloy", backendVoice: "alloy", tags: ["خنثی", "واضح"], description: "صدای متعادل و واضح.", avatarHue: 200 },
  ];

  const VOICES = [
    { id: "bahar", nameFa: "بهار", nameEn: "Bahar", backendVoice: "bahar", tags: ["قصه", "قبل خواب", "ملایم"], description: "صدای گرم و طبیعی — مناسب روایت قصه.", avatarHue: 340 },
    { id: "afra", nameFa: "افرا", nameEn: "Afra", backendVoice: "afra", tags: ["آرام", "واضح", "روایت"], description: "راوی آرام و واضح برای روایت قصه.", avatarHue: 200 },
    { id: "sara", nameFa: "سارا", nameEn: "Sara", backendVoice: "sara", tags: ["نرم", "احساسی", "مهربان"], description: "صدای نرم و مهربان.", avatarHue: 270 },
    { id: "dara", nameFa: "دارا", nameEn: "Dara", backendVoice: "dara", tags: ["گرم", "مطمئن", "قصه"], description: "صدای گرم و مطمئن.", avatarHue: 28 },
    { id: "garsha", nameFa: "گرشا", nameEn: "Garsha", backendVoice: "garsha", tags: ["شاد", "بازیگوش", "کمدی"], description: "مناسب قصه‌های شاد و بازیگوش.", avatarHue: 45 },
    { id: "poneh", nameFa: "پونه", nameEn: "Poneh", backendVoice: "poneh", tags: ["جوان", "ماجراجویی", "پرانرژی"], description: "صدای شاد و پرانرژی.", avatarHue: 160 },
  ];

  const LEGACY_VOICE_MAP = {
    "warm-father": "dara",
    "soft-mother": "bahar",
    "funny-uncle": "garsha",
    "calm-narrator": "afra",
    "magical-storyteller": "sara",
    "young-hero": "poneh",
    "sleepy-bedtime": "bahar",
    "cartoon-character": "garsha",
  };

  const PRESETS = {
    calm: { speed: 0.85, pitch: 0.9, emotion: 0.4, clarity: 0.9, label: "آرام" },
    dramatic: { speed: 1.0, pitch: 1.05, emotion: 0.75, clarity: 1.0, label: "نمایشی" },
    playful: { speed: 1.15, pitch: 1.2, emotion: 0.85, clarity: 0.95, label: "بازیگوش" },
    bedtime: { speed: 0.75, pitch: 0.85, emotion: 0.35, clarity: 0.88, label: "قبل خواب" },
  };

  const state = {
    selectedVoiceId: "nova",
    selectedPreset: "calm",
    storyResult: null,
    storyId: null,
    provider: null,
    audioResult: null,
    audioFullUrl: null,
    audioVoiceId: null,
    isGeneratingStory: false,
    isGeneratingAudio: false,
    isDownloading: false,
    isPlaying: false,
    playbackVoiceId: null,
    loadingVoiceId: null,
    waveformAnimating: false,
    voiceMode: null,
    sliders: { speed: 0.85, pitch: 0.9, emotion: 0.4, clarity: 0.9 },
    advanced: { pauseBetweenSentences: 0.5, emphasisLevel: 0.6, backgroundAmbience: false, autoNormalize: true },
    history: [],
  };

  let mobileTab = "home";
  let audioElement = null;
  let storyAudioBlobUrl = null;
  let audioHydrationToken = 0;
  let backgroundAmbienceElement = null;
  let createProgressTimer = null;
  let createHintTimer = null;
  let createProgressValue = 0;
  let storyGenerationAbort = null;
  let storyCreateScrollObserver = null;
  let homeTimelineSeeking = false;
  let homeTimelineBound = false;
  let storyRestorePromise = null;

  var CREATE_LOADING_HINTS = [
    "لطفاً چند لحظه صبر کنید...",
    "قصه متناسب با سن و علایق کودک نوشته می‌شود...",
    "تقریباً آماده است...",
  ];

  var CREATE_AUDIO_LOADING_HINTS = [
    "در حال ساخت صدای قصه با راوی انتخابی...",
    "صدای قصه در حال آماده‌سازی است...",
    "چند لحظه دیگر قصه و صدا در خانه نمایش داده می‌شوند...",
  ];

  var BACKGROUND_AMBIENCE_URL = "images/audio/source.mp3";
  var BACKGROUND_AMBIENCE_VOLUME = 0.14;

  function isMobileLayout() {
    return document.body.classList.contains("app-shell");
  }

  function setMobileTab(tab) {
    mobileTab = tab || "home";
    if (mobileTab === "stories") mobileTab = "home";
    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-tab", mobileTab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    $$(".bottom-nav__item[data-mobile-tab]").forEach(function (item) {
      item.classList.toggle("bottom-nav__item--active", item.dataset.mobileTab === mobileTab);
    });
    setupStoryCreateScrollReveal();
  }

  function updateStoryCreateButtonVisibility() {
    var createActions = document.querySelector(".story-create-actions");
    var voiceSection = $("#story-voice-section");
    if (!createActions) return;

    var shouldShow = false;
    if (isMobileLayout() && mobileTab === "story" && voiceSection) {
      var rect = voiceSection.getBoundingClientRect();
      var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-nav-h")) || 62;
      var ctaLine = window.innerHeight - navH - 72;
      shouldShow = rect.bottom <= ctaLine;
    }

    createActions.classList.toggle("story-create-actions--visible", shouldShow);
  }

  function onStoryCreateScroll() {
    updateStoryCreateButtonVisibility();
  }

  function setupStoryCreateScrollReveal() {
    if (storyCreateScrollObserver) {
      storyCreateScrollObserver.disconnect();
      storyCreateScrollObserver = null;
    }
    window.removeEventListener("scroll", onStoryCreateScroll);

    var createActions = document.querySelector(".story-create-actions");
    if (createActions) createActions.classList.remove("story-create-actions--visible");

    if (!isMobileLayout() || mobileTab !== "story") return;

    updateStoryCreateButtonVisibility();
    window.addEventListener("scroll", onStoryCreateScroll, { passive: true });

    if (typeof IntersectionObserver === "undefined") return;

    var voiceSection = $("#story-voice-section");
    if (!voiceSection) return;

    storyCreateScrollObserver = new IntersectionObserver(
      function () { updateStoryCreateButtonVisibility(); },
      { root: null, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    storyCreateScrollObserver.observe(voiceSection);
  }

  function setStoryCreateLoading(active) {
    var btn = $("#btn-create-story");
    var loading = $("#story-create-loading");
    if (btn) btn.hidden = !!active;
    if (loading) loading.hidden = true;
    setCreateModal(!!active);
  }

  function setCreateModal(active) {
    var modal = $("#create-modal");
    if (!modal) return;
    modal.hidden = !active;
    modal.setAttribute("aria-hidden", active ? "false" : "true");
    document.body.classList.toggle("create-modal-open", !!active);
  }

  function setCreateModalPhase(phase) {
    var storyStep = $("#create-step-story");
    var audioStep = $("#create-step-audio");
    if (storyStep) {
      storyStep.classList.toggle("create-modal__step--active", phase === "story");
      storyStep.classList.toggle("create-modal__step--done", phase === "audio" || phase === "done");
    }
    if (audioStep) {
      audioStep.classList.toggle("create-modal__step--active", phase === "audio");
      audioStep.classList.toggle("create-modal__step--done", phase === "done");
    }
    var title = $("#create-modal-title");
    if (title) {
      if (phase === "audio") title.textContent = "در حال ساخت صدای قصه";
      else if (phase === "done") title.textContent = "قصه و صدا آماده‌اند!";
      else title.textContent = "در حال ساخت قصه";
    }
  }

  function updateCreateProgressUI(value) {
    var rounded = Math.round(value);
    ["#story-create-progress-bar", "#create-modal-progress-bar"].forEach(function (sel) {
      var bar = $(sel);
      if (bar) bar.style.width = rounded + "%";
    });
    ["#story-create-progress-pct", "#create-modal-progress-pct"].forEach(function (sel) {
      var pct = $(sel);
      if (pct) pct.textContent = rounded.toLocaleString("fa-IR") + "٪";
    });
    ["#story-create-progress", "#create-modal-progress"].forEach(function (sel) {
      var progress = $(sel);
      if (progress) progress.setAttribute("aria-valuenow", String(rounded));
    });
  }

  function setCreateHint(text) {
    var hintEl = $("#story-create-loading-hint");
    var modalHint = $("#create-modal-hint");
    if (hintEl) hintEl.textContent = text;
    if (modalHint) modalHint.textContent = text;
  }

  function startCreateProgress() {
    stopCreateProgress();
    setCreateModalPhase("story");
    createProgressValue = 0;
    updateCreateProgressUI(0);
    var hintIndex = 0;
    setCreateHint(CREATE_LOADING_HINTS[0]);
    createHintTimer = setInterval(function () {
      hintIndex = (hintIndex + 1) % CREATE_LOADING_HINTS.length;
      setCreateHint(CREATE_LOADING_HINTS[hintIndex]);
    }, 3200);
    createProgressTimer = setInterval(function () {
      if (createProgressValue >= 48) return;
      var step = createProgressValue < 25 ? 2.5 : createProgressValue < 40 ? 1.2 : 0.6;
      createProgressValue = Math.min(48, createProgressValue + step);
      updateCreateProgressUI(createProgressValue);
    }, 450);
  }

  function completeCreateProgress() {
    stopCreateProgress();
    updateCreateProgressUI(50);
  }

  function stopCreateProgress() {
    if (createProgressTimer) {
      clearInterval(createProgressTimer);
      createProgressTimer = null;
    }
    if (createHintTimer) {
      clearInterval(createHintTimer);
      createHintTimer = null;
    }
  }

  function delayWithSignal(ms, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      var timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener("abort", function () {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }
    });
  }

  function cancelStoryGeneration() {
    if (!state.isGeneratingStory || !storyGenerationAbort) return;
    storyGenerationAbort.abort();
  }

  function updateHomeStoryCta() {
    var cta = $("#btn-home-go-story");
    var footer = $("#home-footer");
    var hidden = !!state.storyResult;
    if (cta) cta.hidden = hidden;
    if (footer) footer.hidden = hidden;
    updateHomePlayCard();
  }

  function shouldShowHomePlayCard() {
    return !!state.storyResult;
  }

  function updateHomePlayCard() {
    var card = $("#home-play-card");
    var titleEl = $("#home-play-title");
    var metaEl = $("#home-play-meta");
    var playBtn = $("#btn-home-play");
    var playIcon = $("#home-play-icon");
    if (!card) return;

    var show = shouldShowHomePlayCard();
    card.hidden = !show;
    if (!show) {
      if (playBtn) playBtn.classList.remove("home-play-card__play--playing");
      resetHomePlayTimeline();
      return;
    }

    var voice = getSelectedVoice();
    var s = state.storyResult;
    if (titleEl) titleEl.textContent = s.title || "قصه آماده است";
    if (metaEl) {
      metaEl.textContent = (s.durationMinutes || "—") + " دقیقه · صدای " + voice.nameFa;
    }
    if (playBtn) {
      playBtn.disabled = state.isGeneratingAudio;
      playBtn.classList.toggle("home-play-card__play--playing", state.isPlaying);
      playBtn.setAttribute("aria-label", state.isPlaying ? "توقف قصه" : "پخش قصه");
    }
    if (playIcon && window.StorytellingIcons) {
      window.StorytellingIcons.setPlayIcon(playIcon, state.isPlaying);
    }
    updateHomePlayTimeline();
  }

  function formatAudioTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "۰:۰۰";
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins.toLocaleString("fa-IR") + ":" + secs.toLocaleString("fa-IR", { minimumIntegerDigits: 2 });
  }

  function getStoryAudioDuration() {
    if (audioElement && Number.isFinite(audioElement.duration) && audioElement.duration > 0) {
      return audioElement.duration;
    }
    if (state.storyResult && state.storyResult.durationMinutes) {
      return Number(state.storyResult.durationMinutes) * 60;
    }
    return 0;
  }

  function updateHomePlayTimeline() {
    var seek = $("#home-play-seek");
    var currentEl = $("#home-play-time-current");
    var durationEl = $("#home-play-time-duration");
    if (!seek || !currentEl || !durationEl) return;

    var duration = getStoryAudioDuration();
    var current = audioElement && Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;

    durationEl.textContent = duration > 0 ? formatAudioTime(duration) : "۰:۰۰";
    currentEl.textContent = formatAudioTime(current);

    if (!homeTimelineSeeking) {
      var progress = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
      var value = Math.round((current / (duration || 1)) * 1000);
      seek.value = String(Math.min(1000, Math.max(0, value)));
      seek.setAttribute("aria-valuenow", seek.value);
      seek.style.setProperty("--seek-progress", progress + "%");
    }
  }

  function resetHomePlayTimeline() {
    homeTimelineSeeking = false;
    var seek = $("#home-play-seek");
    if (seek) {
      seek.value = "0";
      seek.setAttribute("aria-valuenow", "0");
      seek.style.setProperty("--seek-progress", "0%");
    }
    updateHomePlayTimeline();
  }

  function seekHomePlayTimeline() {
    var seek = $("#home-play-seek");
    if (!seek || !state.audioFullUrl) return;

    var duration = getStoryAudioDuration();
    if (!duration) return;

    var nextTime = (Number(seek.value) / 1000) * duration;
    var previewTime = Math.min(duration, Math.max(0, nextTime));
    var currentEl = $("#home-play-time-current");
    if (currentEl) currentEl.textContent = formatAudioTime(previewTime);
    seek.style.setProperty("--seek-progress", ((previewTime / duration) * 100) + "%");

    if (!audioElement || !audioElement.src) {
      hydrateStoryAudioPlayer().then(function (ready) {
        if (!ready || !audioElement) return;
        audioElement.currentTime = previewTime;
        updateHomePlayTimeline();
      });
      return;
    }

    audioElement.currentTime = previewTime;
    updateHomePlayTimeline();
  }

  function bindHomePlayTimelineControls() {
    if (homeTimelineBound) return;
    homeTimelineBound = true;

    var seek = $("#home-play-seek");
    if (!seek) return;

    seek.addEventListener("pointerdown", function () {
      homeTimelineSeeking = true;
    });
    seek.addEventListener("pointerup", function () {
      homeTimelineSeeking = false;
      seekHomePlayTimeline();
    });
    seek.addEventListener("input", function () {
      homeTimelineSeeking = true;
      seekHomePlayTimeline();
    });
    seek.addEventListener("change", function () {
      homeTimelineSeeking = false;
      seekHomePlayTimeline();
    });
  }

  function bindStoryAudioTimelineEvents(el) {
    if (!el || el.dataset.homeTimelineBound === "1") return;
    el.dataset.homeTimelineBound = "1";
    ["timeupdate", "loadedmetadata", "durationchange", "pause", "ended", "seeked"].forEach(function (evt) {
      el.addEventListener(evt, updateHomePlayTimeline);
    });
  }

  function getStorySourceLabel() {
    return "قصه‌ای با صدای انتخابی شما.";
  }

  function getStoryDisplayAge(story) {
    if (!story) return "—";
    if (Number.isFinite(story.age) || story.age === 0) {
      return story.age.toLocaleString("fa-IR");
    }
    var ageEl = $("#age");
    if (ageEl && ageEl.value !== "") {
      return Number(ageEl.value).toLocaleString("fa-IR");
    }
    return "—";
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function getVoiceSampleUrl() {
    return "assets/voice-sample.wav";
  }

  function useApiPlayback() {
    return true;
  }

  function shouldUseClientBackgroundAmbience() {
    return !!state.advanced.backgroundAmbience
      && !(state.audioResult && state.audioResult.backgroundAmbienceApplied);
  }

  function getVoicePlaybackOptions() {
    return {
      backgroundAmbience: shouldUseClientBackgroundAmbience(),
      backgroundAmbienceApplied: !!(state.audioResult && state.audioResult.backgroundAmbienceApplied),
    };
  }

  function stopNativeBackgroundAmbience() {
    if (backgroundAmbienceElement) {
      backgroundAmbienceElement.pause();
      backgroundAmbienceElement.currentTime = 0;
    }
  }

  function startNativeBackgroundAmbience() {
    if (!shouldUseClientBackgroundAmbience()) {
      stopNativeBackgroundAmbience();
      return;
    }
    if (!backgroundAmbienceElement) {
      backgroundAmbienceElement = new Audio(BACKGROUND_AMBIENCE_URL);
      backgroundAmbienceElement.loop = true;
      backgroundAmbienceElement.preload = "auto";
      backgroundAmbienceElement.volume = BACKGROUND_AMBIENCE_VOLUME;
    }
    backgroundAmbienceElement.play().catch(function () { /* autoplay blocked */ });
  }

  function syncNativeBackgroundAmbience(playing) {
    if (playing) startNativeBackgroundAmbience();
    else stopNativeBackgroundAmbience();
  }

  function syncStoryTextFromPreview() {
    var preview = $("#story-preview");
    if (preview && state.storyResult) {
      state.storyResult.storyText = preview.value || state.storyResult.storyText || "";
    }
  }

  function buildNarrationText() {
    if (!state.storyResult) return "";
    syncStoryTextFromPreview();
    var s = state.storyResult;
    return [s.parentIntro, s.storyText, s.calmingAction, s.followUpQuestion]
      .filter(function (part) { return typeof part === "string" && part.trim(); })
      .join("\n\n");
  }

  function invalidateStoryAudioIfNeeded(nextVoiceId) {
    if (state.audioFullUrl && state.audioVoiceId && nextVoiceId !== state.audioVoiceId) {
      state.audioFullUrl = null;
      state.audioResult = null;
      state.audioVoiceId = null;
      renderAudioPlayer();
      updatePrimaryButton();
    }
  }

  function playGeneratedStoryAudio() {
    ensureStoryAudioUrl();
    if (!state.audioFullUrl) return Promise.resolve(false);
    if (useApiPlayback()) {
      return ensureStoryAudioReady({ reportError: true }).then(function (ready) {
        if (!ready || !audioElement) return false;
        return audioElement.play()
          .then(function () {
            syncNativeBackgroundAmbience(true);
            syncPlayingState(true);
            return true;
          })
          .catch(function () {
            syncNativeBackgroundAmbience(false);
            syncPlayingState(false);
            showToast("برای پخش، دکمه پلی پلیر را بزن.", "info");
            return false;
          });
      });
    }
    return playWithVoiceSettings(getPlaybackUrl());
  }

  function isStoryAudioUrl(url) {
    return typeof url === "string" && url.indexOf("/api/stories/") !== -1 && url.indexOf("/audio/") !== -1;
  }

  function revokeStoryAudioBlobUrl() {
    if (storyAudioBlobUrl) {
      URL.revokeObjectURL(storyAudioBlobUrl);
      storyAudioBlobUrl = null;
    }
  }

  function getVoiceTagline() {
    if (state.voiceMode && state.voiceMode.voiceTagline) {
      return state.voiceMode.voiceTagline;
    }
    return VOICE_TAGLINE_FALLBACK;
  }

  function setVoiceLoadingLabel(el) {
    if (el) el.textContent = getVoiceTagline();
  }

  function syncVoiceTaglines() {
    setVoiceLoadingLabel($("#voice-lib-subtitle"));
    setVoiceLoadingLabel($("#voice-settings-subtitle"));
    setVoiceLoadingLabel($("#voice-mode-status"));
  }

  function getAuthFetchHeaders() {
    var headers = {};
    var token = window.StorytellingAuth && window.StorytellingAuth.getToken && window.StorytellingAuth.getToken();
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function fetchStoryAudioBlob(url) {
    var response;
    try {
      response = await fetch(url, { headers: getAuthFetchHeaders() });
    } catch (err) {
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("story audio network error", {
          url: url,
          status: null,
          body: null,
          error: err,
        });
      }
      throw err;
    }
    if (!response.ok) {
      var errBody = null;
      try {
        errBody = await response.clone().text();
      } catch (e) { /* ignore */ }
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("story audio HTTP error", {
          url: url,
          status: response.status,
          body: errBody,
          error: null,
        });
      }
      throw new Error("دریافت فایل صوتی ناموفق بود.");
    }
    return response.blob();
  }

  function waitForAudioReady(element) {
    return new Promise(function (resolve, reject) {
      if (element.readyState >= 1) {
        resolve();
        return;
      }
      function onReady() {
        cleanup();
        resolve();
      }
      function onError() {
        cleanup();
        reject(new Error("فایل صوتی قابل پخش نیست."));
      }
      function cleanup() {
        element.removeEventListener("loadedmetadata", onReady);
        element.removeEventListener("error", onError);
      }
      element.addEventListener("loadedmetadata", onReady);
      element.addEventListener("error", onError);
    });
  }

  async function hydrateStoryAudioPlayer(options) {
    options = options || {};
    ensureStoryAudioUrl();
    if (!useApiPlayback() || !state.audioFullUrl) return false;

    var wrap = $("#audio-player-wrap");
    var label = $("#audio-player-status");
    var token = ++audioHydrationToken;

    try {
      if (label) setVoiceLoadingLabel(label);

      var blob = await fetchStoryAudioBlob(state.audioFullUrl);
      if (token !== audioHydrationToken) return false;

      revokeStoryAudioBlobUrl();
      storyAudioBlobUrl = URL.createObjectURL(blob);

      var element = ensureStoryAudioElement();
      if (!element) return false;

      element.src = storyAudioBlobUrl;
      element.load();
      await waitForAudioReady(element);
      if (token !== audioHydrationToken) return false;

      if (label) {
        label.textContent = "فایل صوتی آماده است — می‌توانی آفلاین گوش بدهی یا ذخیره کنی.";
      }
      updateDownloadControls();
      updateHomePlayTimeline();
      return true;
    } catch (e) {
      if (token !== audioHydrationToken) return false;
      var failedStoryId = Number(state.storyId);
      revokeStoryAudioBlobUrl();
      if (audioElement) {
        audioElement.removeAttribute("src");
        audioElement.load();
      }
      if (options.allowServerRefresh !== false && Number.isFinite(failedStoryId) && failedStoryId > 0) {
        var refreshed = await refreshStoryAudioFromServer(failedStoryId);
        if (refreshed && token === audioHydrationToken) {
          return hydrateStoryAudioPlayer({
            allowServerRefresh: false,
            reportError: options.reportError === true,
          });
        }
      }
      if (options.allowServerRefresh !== false) {
        var synced = await syncStoryAudioFromServer({ forceRefresh: true });
        if (synced && token === audioHydrationToken) {
          return hydrateStoryAudioPlayer({
            allowServerRefresh: false,
            reportError: options.reportError === true,
          });
        }
      }
      state.audioFullUrl = null;
      state.audioResult = null;
      if (options.reportError) {
        showError(formatApiError(e, "دریافت فایل صوتی ناموفق بود."));
      }
      updatePrimaryButton();
      updateDownloadControls();
      updateHomePlayCard();
      updateCenterCardState();
      return false;
    }
  }

  function renderAudioPlayerShell() {
    var wrap = $("#audio-player-wrap");
    if (!wrap) return;
    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="audio-player-card">' +
        '<p class="audio-player-card__title">فایل صوتی قصه</p>' +
        '<div class="audio-download-bar">' +
          '<span class="audio-download-bar__label" id="audio-player-status">' + getVoiceTagline() + '</span>' +
          '<button type="button" class="btn btn--sm" id="btn-download-inline" aria-label="دانلود فایل صوتی">' +
            'دانلود صدا' +
          '</button>' +
        '</div>' +
      '</div>';
    ensureStoryAudioElement();
    var inlineDownload = $("#btn-download-inline");
    if (inlineDownload) inlineDownload.addEventListener("click", handleDownload);
  }

  function bindStoryAudioPlaybackEvents() {
    var element = $("#story-audio");
    if (!element || element.dataset.playbackBound === "1") return;
    element.dataset.playbackBound = "1";
    element.addEventListener("play", function () {
      syncNativeBackgroundAmbience(true);
      syncPlayingState(true);
    });
    element.addEventListener("pause", function () {
      syncNativeBackgroundAmbience(false);
      syncPlayingState(false);
    });
    element.addEventListener("ended", function () {
      syncNativeBackgroundAmbience(false);
      syncPlayingState(false);
    });
    bindStoryAudioTimelineEvents(element);
  }

  function getPlaybackUrl() {
    if (useApiPlayback()) {
      var url = ensureStoryAudioUrl();
      if (url) return url;
    }
    return getVoiceSampleUrl();
  }

  function ensureStoryAudioUrl() {
    if (state.audioFullUrl) return state.audioFullUrl;
    var candidate = state.audioResult && state.audioResult.audioUrl;
    if (!candidate) return null;
    var resolved = resolveStoryAudioUrl(candidate);
    if (!resolved && window.StorytellingAPI) {
      resolved = window.StorytellingAPI.buildFullAudioUrl(candidate);
    }
    if (resolved) state.audioFullUrl = resolved;
    return state.audioFullUrl || null;
  }

  function hasStoryAudioAvailable() {
    return !!(state.storyResult && ensureStoryAudioUrl());
  }

  function ensureStoryAudioElement() {
    if (audioElement && document.body.contains(audioElement)) return audioElement;
    audioElement = $("#story-audio");
    if (!audioElement) {
      renderAudioPlayerShell();
      audioElement = $("#story-audio");
    }
    if (audioElement && !audioElement.dataset.homeTimelineBound) {
      bindStoryAudioTimelineEvents(audioElement);
    }
    return audioElement;
  }

  function isStoryOwnedByCurrentUser(storyId) {
    if (storyId == null || !state.history.length) return false;
    return state.history.some(function (item) {
      return Number(item.storyId) === Number(storyId);
    });
  }

  function hasUserStoryData() {
    try {
      var rawLast = readUserStorage("lastStory");
      if (rawLast) {
        var last = JSON.parse(rawLast);
        if (last && last.storyId && isStoryOwnedByCurrentUser(last.storyId)) return true;
      }
      if (state.history && state.history.length) return true;
    } catch (e) { /* ignore corrupt data */ }
    return false;
  }

  async function syncStoryAudioFromServer(options) {
    options = options || {};
    if (mockFrontendMode || !window.StorytellingAPI) return false;

    var canRestoreFromServer = hasUserStoryData();
    var storyId = Number(state.storyId);

    if ((!state.storyResult || !state.storyId) && canRestoreFromServer) {
      await restoreLastStoryFromServer();
      storyId = Number(state.storyId);
    }

    if ((!Number.isFinite(storyId) || storyId <= 0) && canRestoreFromServer) {
      await restoreLastStoryFromServer();
      storyId = Number(state.storyId);
    }
    if (!Number.isFinite(storyId) || storyId <= 0) return false;

    var loaded = await refreshStoryAudioFromServer(storyId);
    if (!loaded) {
      state.audioFullUrl = null;
      state.audioResult = null;
      if (canRestoreFromServer) {
        await restoreLastStoryFromServer();
        storyId = Number(state.storyId);
        if (Number.isFinite(storyId) && storyId > 0) {
          loaded = await refreshStoryAudioFromServer(storyId);
        }
      } else if (state.storyResult && Number.isFinite(storyId) && storyId > 0) {
        loaded = await refreshStoryAudioFromServer(storyId);
      }
    }

    ensureStoryAudioUrl();
    return !!state.audioFullUrl;
  }

  async function ensureStoryAudioReady(options) {
    options = options || {};
    var synced = await syncStoryAudioFromServer();
    if (!synced || !state.audioFullUrl) return false;

    var element = ensureStoryAudioElement();
    if (!element) return false;

    var needsHydration = !storyAudioBlobUrl
      || !element.src
      || (options.forceRefresh === true);
    if (needsHydration) {
      var hydrated = await hydrateStoryAudioPlayer({ reportError: options.reportError === true });
      if (!hydrated) return false;
      element = ensureStoryAudioElement();
    }

    return !!(element && element.src);
  }

  function formatApiError(err, fallback) {
    if (err && err.data) {
      if (err.data.error) return err.data.error;
      if (err.data.hint) return err.data.hint;
    }
    return (err && err.message) || fallback;
  }

  function getAudioDownloadFilename() {
    var ext = "mp3";
    if (state.audioResult && state.audioResult.format) {
      ext = state.audioResult.format;
    } else if (state.audioFullUrl && state.audioFullUrl.indexOf(".wav") !== -1) {
      ext = "wav";
    }
    var voice = getSelectedVoice();
    var slug = voice.id || "voice";
    return "lalaBye-" + (state.storyId || "sample") + "-" + slug + "." + ext;
  }

  function updateDownloadControls() {
    var canUseAudio = hasStoryAudioAvailable() || !!state.storyId;
    var disabled = !canUseAudio || state.isGeneratingAudio || state.isDownloading;
    var footerBtn = $("#btn-download");
    var homeBtn = $("#btn-home-download");
    var inlineBtn = $("#btn-download-inline");
    var regenBtn = $("#btn-regenerate-audio");
    if (footerBtn) {
      footerBtn.hidden = !canUseAudio;
      footerBtn.disabled = disabled;
      footerBtn.textContent = state.isDownloading ? "در حال دانلود..." : "دانلود MP3";
    }
    if (homeBtn) {
      homeBtn.disabled = disabled;
      homeBtn.setAttribute("aria-busy", state.isDownloading ? "true" : "false");
      homeBtn.setAttribute(
        "aria-label",
        state.isDownloading ? "در حال آماده‌سازی دانلود" : "دانلود فایل صوتی برای استفاده آفلاین"
      );
    }
    if (inlineBtn) {
      inlineBtn.disabled = disabled;
      inlineBtn.textContent = state.isDownloading ? "در حال دانلود..." : "دانلود صدا";
    }
    if (regenBtn) {
      regenBtn.hidden = !state.storyResult;
      regenBtn.disabled = state.isGeneratingAudio;
    }
  }

  function scheduleRevokeObjectUrl(url) {
    setTimeout(function () {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        /* ignore */
      }
    }, 60000);
  }

  async function getStoryAudioBlobForDownload() {
    if (storyAudioBlobUrl) {
      var cached = await fetch(storyAudioBlobUrl);
      return cached.blob();
    }
    var url = getPlaybackUrl();
    if (!url) return null;
    var fetchUrl = url.indexOf("?") === -1 ? url + "?download=1" : url + "&download=1";
    return fetchStoryAudioBlob(fetchUrl);
  }

  async function triggerFileDownload(blob, filename) {
    var ext = filename.split(".").pop() || "mp3";
    var mime = blob.type || (ext === "wav" ? "audio/wav" : "audio/mpeg");
    var fileBlob = blob.type ? blob : new Blob([blob], { type: mime });

    if (typeof File !== "undefined" && navigator.share) {
      try {
        var shareFile = new File([fileBlob], filename, { type: mime });
        if (!navigator.canShare || navigator.canShare({ files: [shareFile] })) {
          await navigator.share({ files: [shareFile], title: filename });
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    var blobUrl = URL.createObjectURL(fileBlob);
    var a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    scheduleRevokeObjectUrl(blobUrl);
  }

  function getVoiceById(voiceId) {
    return getVoices().find(function (v) { return v.id === voiceId; }) || null;
  }

  function updateVoiceCardPlayButtons() {
    var container = $("#voice-library");
    if (!container) return;
    container.querySelectorAll(".voice-card").forEach(function (card) {
      var voiceId = card.dataset.voiceId;
      var btn = card.querySelector(".voice-card__play");
      var iconEl = btn && btn.querySelector(".voice-card__play-icon");
      if (!btn || !iconEl) return;

      var voice = getVoiceById(voiceId);
      var voiceName = voice ? voice.nameFa : "صدا";
      var isLoading = state.loadingVoiceId === voiceId || (state.isGeneratingAudio && state.playbackVoiceId === voiceId);
      var isPlaying = state.isPlaying && state.playbackVoiceId === voiceId;

      btn.classList.toggle("voice-card__play--loading", isLoading);
      btn.classList.toggle("voice-card__play--playing", isPlaying && !isLoading);
      btn.disabled = isLoading;

      if (isLoading) {
        btn.setAttribute("aria-label", "در حال آماده‌سازی صدای " + voiceName);
        iconEl.innerHTML = "";
        iconEl.removeAttribute("data-icon");
      } else if (isPlaying) {
        btn.setAttribute("aria-label", "توقف صدای " + voiceName);
        if (window.StorytellingIcons) window.StorytellingIcons.setPlayIcon(iconEl, true);
      } else {
        btn.setAttribute("aria-label", "پخش صدای " + voiceName);
        if (window.StorytellingIcons) window.StorytellingIcons.setPlayIcon(iconEl, false);
      }
    });
  }

  function syncPlayingState(playing) {
    state.isPlaying = !!playing;
    updatePrimaryButton();
    updateVoiceCardPlayButtons();
    updateHomePlayCard();
  }

  function playWithVoiceSettings(url) {
    if (!window.VoicePlayer) {
      showError("پخش‌کننده صدا در دسترس نیست.");
      return Promise.resolve(false);
    }
    return window.VoicePlayer.toggle(url, state.sliders, getVoicePlaybackOptions())
      .then(function (playing) {
        syncPlayingState(playing);
        return playing;
      })
      .catch(function (e) {
        syncPlayingState(false);
        showError(e.message || "پخش صدا ناموفق بود.");
        return false;
      });
  }

  function stopVoicePlayback() {
    if (window.VoicePlayer) window.VoicePlayer.stop();
    if (audioElement) audioElement.pause();
    stopNativeBackgroundAmbience();
    syncPlayingState(false);
  }

  function toggleVoiceCardPlayback(voice) {
    if (state.isPlaying && state.playbackVoiceId === voice.id) {
      stopVoicePlayback();
      return Promise.resolve(false);
    }
    if (state.loadingVoiceId === voice.id || state.isGeneratingAudio) {
      return Promise.resolve(false);
    }
    if (state.isPlaying) {
      stopVoicePlayback();
    }
    invalidateStoryAudioIfNeeded(voice.id);
    state.selectedVoiceId = voice.id;
    state.playbackVoiceId = voice.id;
    updateSummaries();
    state.loadingVoiceId = voice.id;
    updateVoiceCardPlayButtons();
    return playVoicePreview(voice).finally(function () {
      state.loadingVoiceId = null;
      updateVoiceCardPlayButtons();
    });
  }

  function playVoicePreview(voice) {
    var selected = voice || getSelectedVoice();
    state.playbackVoiceId = selected.id;
    if (!useApiPlayback()) {
      return playWithVoiceSettings(getVoiceSampleUrl());
    }
    if (state.storyResult && state.storyId) {
      if (state.audioFullUrl && state.audioVoiceId === selected.id) {
        return playGeneratedStoryAudio();
      }
      return handleGenerateAudio({ autoPlay: true, voice: selected });
    }
    var previewText = buildNarrationText();
    return window.StorytellingAPI.previewVoice(
      selected.backendVoice,
      "wav",
      previewText || undefined,
      { backgroundAmbience: !!state.advanced.backgroundAmbience },
    )
      .then(function (result) {
        if (!result.success || !result.audio || !result.audio.audioUrl) {
          throw new Error("پخش صدا از سرور دریافت نشد.");
        }
        var url = window.StorytellingAPI.buildFullAudioUrl(result.audio.audioUrl);
        var previewOptions = {
          backgroundAmbience: !!state.advanced.backgroundAmbience && !result.audio.backgroundAmbienceApplied,
          backgroundAmbienceApplied: !!result.audio.backgroundAmbienceApplied,
        };
        if (!window.VoicePlayer) {
          showError("پخش‌کننده صدا در دسترس نیست.");
          return false;
        }
        return window.VoicePlayer.toggle(url, state.sliders, previewOptions)
          .then(function (playing) {
            syncPlayingState(playing);
            return playing;
          });
      })
      .catch(function (e) {
        showError(formatApiError(e, "پخش صدا ناموفق بود."));
        return false;
      });
  }

  function getCurrentUserId() {
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    return user && user.id != null ? String(user.id) : null;
  }

  function getUserStorageKey(name) {
    var userId = getCurrentUserId();
    if (!userId) return STORAGE_KEYS[name];
    return STORAGE_KEYS[name] + "_user_" + userId;
  }

  function getOwnerScopedStorageKey(name, ownerUserId) {
    return STORAGE_KEYS[name] + "_user_" + ownerUserId;
  }

  function repairCrossUserStorageLeak() {
    var userId = getCurrentUserId();
    if (!userId) return false;

    var owner = localStorage.getItem(STORAGE_KEYS.legacyOwner);
    if (!owner || owner === userId) return false;

    var leaked = false;
    USER_SCOPED_STORAGE_NAMES.forEach(function (name) {
      var scopedKey = getUserStorageKey(name);
      var scoped = localStorage.getItem(scopedKey);
      if (!scoped) return;

      var ownerScoped = localStorage.getItem(getOwnerScopedStorageKey(name, owner));
      var legacy = localStorage.getItem(STORAGE_KEYS[name]);
      if ((ownerScoped && scoped === ownerScoped) || (legacy && scoped === legacy)) {
        localStorage.removeItem(scopedKey);
        leaked = true;
      }
    });
    return leaked;
  }

  function findLegacyOwnerFromScopedData(name) {
    var legacy = localStorage.getItem(STORAGE_KEYS[name]);
    if (!legacy) return null;
    var prefix = STORAGE_KEYS[name] + "_user_";
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf(prefix) !== 0) continue;
      if (localStorage.getItem(key) === legacy) {
        return key.slice(prefix.length);
      }
    }
    return null;
  }

  function migrateLegacyStorageIfOwned(name) {
    if (!getCurrentUserId()) return;
    var scopedKey = getUserStorageKey(name);
    if (localStorage.getItem(scopedKey)) return;

    var userId = getCurrentUserId();
    var owner = localStorage.getItem(STORAGE_KEYS.legacyOwner);
    if (!owner) {
      owner = findLegacyOwnerFromScopedData(name);
      if (owner) localStorage.setItem(STORAGE_KEYS.legacyOwner, owner);
    }
    if (owner && owner !== userId) return;

    var legacy = localStorage.getItem(STORAGE_KEYS[name]);
    if (!legacy) return;

    localStorage.setItem(scopedKey, legacy);
    if (!localStorage.getItem(STORAGE_KEYS.legacyOwner)) {
      localStorage.setItem(STORAGE_KEYS.legacyOwner, userId);
    }
  }

  function finalizeLegacyMigration() {
    var userId = getCurrentUserId();
    if (!userId) return;
    if (localStorage.getItem(STORAGE_KEYS.legacyOwner) !== userId) return;

    USER_SCOPED_STORAGE_NAMES.forEach(function (name) {
      var scopedKey = getUserStorageKey(name);
      if (localStorage.getItem(scopedKey)) {
        localStorage.removeItem(STORAGE_KEYS[name]);
      }
    });
  }

  function prepareUserScopedStorage() {
    if (!getCurrentUserId()) return false;
    var leaked = repairCrossUserStorageLeak();
    USER_SCOPED_STORAGE_NAMES.forEach(migrateLegacyStorageIfOwned);
    finalizeLegacyMigration();
    return leaked;
  }

  function readUserStorage(name) {
    return localStorage.getItem(getUserStorageKey(name));
  }

  function writeUserStorage(name, value) {
    if (value == null) localStorage.removeItem(getUserStorageKey(name));
    else localStorage.setItem(getUserStorageKey(name), value);
  }

  function normalizeStoryAudioUrlForStorage(url) {
    if (!url || !isStoryAudioUrl(url)) return null;
    var idx = url.indexOf("/api/stories/");
    return idx !== -1 ? url.slice(idx) : url;
  }

  function resolveStoryAudioUrl(url) {
    var normalized = normalizeStoryAudioUrlForStorage(url) || url;
    if (!isStoryAudioUrl(normalized)) return null;
    return window.StorytellingAPI
      ? window.StorytellingAPI.buildFullAudioUrl(normalized)
      : normalized;
  }

  function findVoiceIdByBackendVoice(backendVoice) {
    if (!backendVoice) return null;
    var allVoices = OPENAI_VOICES.concat(VOICES);
    var found = allVoices.find(function (voice) {
      return voice.backendVoice === backendVoice || voice.id === backendVoice;
    });
    return found ? found.id : null;
  }

  function getSessionId() {
    var scopedKey = getUserStorageKey("sessionId");
    var id = localStorage.getItem(scopedKey);
    if (!id) {
      var suffix = getCurrentUserId() ? ("user" + getCurrentUserId() + "_") : "";
      id = "session_" + suffix + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(scopedKey, id);
    }
    return id;
  }

  function getVoices() {
    if (state.voiceMode && state.voiceMode.ttsProvider === "ivira") {
      return VOICES;
    }
    if (state.voiceMode && state.voiceMode.ttsProvider === "openai") {
      return OPENAI_VOICES;
    }
    return OPENAI_VOICES;
  }

  function getSelectedVoice() {
    var voices = getVoices();
    var found = voices.find(function (v) { return v.id === state.selectedVoiceId; });
    if (found) return found;
    var legacyId = LEGACY_VOICE_MAP[state.selectedVoiceId];
    if (legacyId) {
      found = voices.find(function (v) { return v.id === legacyId; });
      if (found) return found;
    }
    return voices[0];
  }

  function formatPersianDate(iso) {
    try {
      return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch (e) {
      return iso || "";
    }
  }

  function showToast(message, type) {
    /* toast notifications disabled */
  }

  function showError(message) {
    showToast(message, "error");
    var errorEl = $("#form-error");
    if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
  }

  function clearError() {
    var errorEl = $("#form-error");
    if (errorEl) { errorEl.textContent = ""; errorEl.hidden = true; }
  }

  function getFormData() {
    return {
      childName: ($("#childName") && $("#childName").value || "").trim(),
      age: Number($("#age") && $("#age").value),
      interest: ($("#interest") && $("#interest").value || "").trim(),
      goal: $("#goal") && $("#goal").value || "",
      mood: $("#mood") && $("#mood").value || "",
      durationMinutes: Number($("#durationMinutes") && $("#durationMinutes").value),
      extraContext: ($("#extraContext") && $("#extraContext").value || "").trim(),
      sessionId: getSessionId(),
    };
  }

  function validateForm() {
    var data = getFormData();
    if (!Number.isFinite(data.age) && data.age !== 0) return "سن کودک را انتخاب کن.";
    if (!data.interest) return "علاقه کودک را وارد کن.";
    if (!data.goal) return "هدف قصه را انتخاب کن.";
    if (!data.mood) return "حال کودک را انتخاب کن.";
    if (!data.durationMinutes) return "مدت زمان قصه را انتخاب کن.";
    return null;
  }

  function estimateReadingMinutes(text) {
    if (!text) return 0;
    return Math.max(1, Math.round(text.trim().split(/\s+/).length / 80));
  }

  function loadSavedChildName() {
    try {
      var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
      if (user && user.childName) return user.childName;
      return readUserStorage("childName") || "";
    } catch (e) {
      return "";
    }
  }

  function saveChildName(name, syncServer) {
    var trimmed = (name || "").trim();
    writeUserStorage("childName", trimmed || null);

    if (syncServer && window.StorytellingAPI && window.StorytellingAuth && window.StorytellingAuth.isLoggedIn()) {
      window.StorytellingAPI.updateChildProfile({ childName: trimmed || "" })
        .then(function (result) {
          if (result && result.user) window.StorytellingAuth.updateUser(result.user);
        })
        .catch(function () { /* offline — local only */ });
    }
  }

  function getEffectiveChildName() {
    var fromForm = ($("#childName") && $("#childName").value || "").trim();
    if (fromForm) return fromForm;
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (user && user.childName) return user.childName;
    return loadSavedChildName();
  }

  function applyChildNameToForm(name) {
    var childNameInput = $("#childName");
    if (childNameInput && name) childNameInput.value = name;
    saveChildName(name, false);
  }

  function syncChildDisplay() {
    var name = getEffectiveChildName();
    var nameEl = $("#mobile-profile-name");
    var tagline = $("#mobile-profile-child-label");
    if (nameEl) nameEl.textContent = name || "کودک";
    if (!tagline) return;
    tagline.textContent = name
      ? "یک قصه برای " + name
      : "مدیریت قصه‌ها و حساب کاربری";
  }

  function updateHero(story) {
    var titleEl = $("#hero-title");
    var subEl = $("#hero-subtitle");
    if (!titleEl) return;

    if (story && story.title) {
      titleEl.textContent = story.title;
      if (subEl) subEl.textContent = story.parentIntro || "حالا می‌توانی قصه را بخوانی یا با صدا پخش کنی.";
      var hero = $("#story-hero");
      if (hero) hero.classList.add("story-hero--has-story");
    } else {
      titleEl.textContent = "روزت را به قصه تبدیل کن.";
      if (subEl) subEl.textContent = "وقتی قصه ای برای گفتن نداری با لالابای برای کوچولوت یک قصه تازه بساز.";
      var heroEl = $("#story-hero");
      if (heroEl) heroEl.classList.remove("story-hero--has-story");
    }
  }

  function updateSummaries() {
    var data = getFormData();
    var voice = getSelectedVoice();
    var goalLabel = GOAL_LABELS[data.goal] || "—";
    var duration = data.durationMinutes ? data.durationMinutes + " دقیقه" : "—";
    var el;
    el = $("#summary-goal"); if (el) el.textContent = goalLabel;
    el = $("#summary-voice"); if (el) el.textContent = voice.nameFa;
    el = $("#summary-duration"); if (el) el.textContent = duration;
    el = $("#player-duration"); if (el) el.textContent = duration;
    el = $("#player-voice-name"); if (el) el.textContent = voice.nameFa;
    el = $("#story-voice-name"); if (el) el.textContent = voice.nameFa;
  }

  function updateCenterCardState() {
    var centerCard = document.querySelector(".panel--center .center-card");
    if (!centerCard) return;
    centerCard.classList.toggle("center-card--has-story", !!state.storyResult);
    centerCard.classList.toggle("center-card--has-audio", shouldShowHomePlayCard());
  }

  function startCreateAudioProgress() {
    stopCreateProgress();
    setCreateModalPhase("audio");
    createProgressValue = 52;
    updateCreateProgressUI(createProgressValue);
    var hintIndex = 0;
    setCreateHint(CREATE_AUDIO_LOADING_HINTS[0]);
    createHintTimer = setInterval(function () {
      hintIndex = (hintIndex + 1) % CREATE_AUDIO_LOADING_HINTS.length;
      setCreateHint(CREATE_AUDIO_LOADING_HINTS[hintIndex]);
    }, 3200);
    createProgressTimer = setInterval(function () {
      if (createProgressValue >= 96) return;
      createProgressValue = Math.min(96, createProgressValue + 0.45);
      updateCreateProgressUI(createProgressValue);
    }, 500);
  }

  function updateCharCount() {
    var preview = $("#story-preview");
    var countEl = $("#char-count");
    var readEl = $("#read-duration");
    if (!preview || !countEl) return;
    var text = preview.value || "";
    countEl.textContent = text.length.toLocaleString("fa-IR") + " کاراکتر";
    if (readEl) readEl.textContent = estimateReadingMinutes(text) + " دقیقه تخمینی";
  }

  function setWaveformState(active) {
    state.waveformAnimating = active;
    var wf = $("#waveform");
    if (wf) wf.classList.toggle("waveform--active", active);
    if (wf) wf.classList.toggle("waveform--loading", state.isGeneratingStory || state.isGeneratingAudio);
  }

  function updatePrimaryButton() {
    var btn = $("#btn-primary-action");
    var label = $("#btn-primary-label");
    if (!btn || !label) return;
    btn.disabled = state.isGeneratingStory || state.isGeneratingAudio;
    if (state.isGeneratingStory) {
      label.textContent = "در حال ساخت قصه...";
      btn.classList.add("btn--loading");
      setWaveformState(true);
      return;
    }
    if (state.isGeneratingAudio) {
      label.textContent = useApiPlayback() ? "در حال ساخت فایل صوتی..." : "در حال آماده‌سازی نمونه...";
      btn.classList.add("btn--loading");
      setWaveformState(true);
      return;
    }
    btn.classList.remove("btn--loading");
    if (!state.storyResult) {
      label.textContent = "ساخت قصه";
    } else if (!state.audioFullUrl) {
      label.textContent = useApiPlayback() ? "خواندن قصه با صدا" : "آماده‌سازی نمونه صدا";
    } else if (state.isPlaying) {
      label.textContent = "توقف";
    } else {
      label.textContent = useApiPlayback() ? "پخش" : "پخش نمونه";
    }
    setWaveformState(state.isPlaying);
    updateVoiceCardPlayButtons();
  }

  function renderGoalChips() {
    var container = $("#goal-chips");
    if (!container) return;
    container.innerHTML = "";
    GOAL_CHIPS.forEach(function (chip) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = chip.label;
      btn.dataset.goal = chip.key;
      var goalSelect = $("#goal");
      if (goalSelect && goalSelect.value === chip.key) btn.classList.add("chip--active");
      btn.addEventListener("click", function () {
        if (goalSelect) goalSelect.value = chip.key;
        $$("#goal-chips .chip").forEach(function (c) { c.classList.remove("chip--active"); });
        btn.classList.add("chip--active");
        updateSummaries();
      });
      container.appendChild(btn);
    });
  }

  function renderVoiceCards(filter) {
    var container = $("#voice-library");
    if (!container) return;
    var query = (filter || "").trim().toLowerCase();
    container.innerHTML = "";
    getVoices().filter(function (v) {
      if (!query) return true;
      var hay = (v.nameFa + " " + v.nameEn + " " + v.tags.join(" ") + " " + v.description).toLowerCase();
      return hay.indexOf(query) !== -1;
    }).forEach(function (voice) {
      var card = document.createElement("article");
      card.className = "voice-card" + (state.selectedVoiceId === voice.id ? " voice-card--selected" : "");
      card.dataset.voiceId = voice.id;
      card.innerHTML =
        '<div class="voice-card__avatar" style="--avatar-hue:' + voice.avatarHue + '">' +
          '<span aria-hidden="true">' + voice.nameFa.charAt(0) + '</span>' +
        '</div>' +
        '<div class="voice-card__body">' +
          '<div class="voice-card__header">' +
            '<h4 class="voice-card__name">' + voice.nameFa + '</h4>' +
            '<span class="voice-card__en">' + voice.nameEn + '</span>' +
          '</div>' +
          '<div class="voice-card__tags">' + voice.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join("") + '</div>' +
          '<p class="voice-card__desc">' + voice.description + '</p>' +
        '</div>' +
        '<button type="button" class="voice-card__play btn btn--ghost btn--icon btn--sm" aria-label="پخش صدای ' + voice.nameFa + '">' +
          '<span class="voice-card__play-icon app-icon app-icon--sm" data-icon="play"></span>' +
        '</button>';
      card.addEventListener("click", function (e) {
        if (e.target.closest(".voice-card__play")) return;
        invalidateStoryAudioIfNeeded(voice.id);
        state.selectedVoiceId = voice.id;
        renderVoiceCards($("#voice-search") && $("#voice-search").value);
        updateSummaries();
      });
      var playBtn = card.querySelector(".voice-card__play");
      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleVoiceCardPlayback(voice);
      });
      container.appendChild(card);
    });
    if (window.StorytellingIcons) window.StorytellingIcons.injectAll(container);
    updateVoiceCardPlayButtons();
  }

  function renderStoryCard() {
    var emptyEl = $("#center-empty");
    var resultEl = $("#story-result");
    var preview = $("#story-preview");
    if (!resultEl) return;

    if (!state.storyResult) {
      if (emptyEl) emptyEl.hidden = false;
      resultEl.hidden = true;
      if (preview) preview.value = "";
      updateHero(null);
      updateCharCount();
      updateHomeStoryCta();
      updateCenterCardState();
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    resultEl.hidden = false;
    var s = state.storyResult;

    $("#story-title").textContent = s.title || "بدون عنوان";
    $("#story-parent-intro").textContent = s.parentIntro || "—";
    $("#story-text").textContent = s.storyText || "";
    $("#story-calming").textContent = s.calmingAction || "—";
    $("#story-question").textContent = s.followUpQuestion || "—";

    var interactionsEl = $("#story-interactions");
    var interactionsSection = $("#story-interactions-section");
    var interactionPoints = (s.interactionPoints || []).filter(function (point) {
      return typeof point === "string" && point.trim();
    });
    if (interactionsEl) {
      interactionsEl.innerHTML = "";
      interactionPoints.forEach(function (point) {
        var li = document.createElement("li");
        li.textContent = point;
        interactionsEl.appendChild(li);
      });
    }
    if (interactionsSection) {
      interactionsSection.hidden = interactionPoints.length === 0;
    }

    $("#meta-story-id").textContent = state.storyId ? "#" + state.storyId : "—";
    $("#meta-duration").textContent = (s.durationMinutes || "—") + " دقیقه";
    $("#meta-age").textContent = getStoryDisplayAge(s);
    $("#meta-provider").textContent = getStorySourceLabel();

    if (preview) {
      preview.value = s.storyText || "";
      updateCharCount();
    }

    updateHero(s);
    updateHomeStoryCta();
    updateCenterCardState();
    updateHomePlayCard();
  }

  function renderAudioPlayer() {
    ensureStoryAudioUrl();
    var wrap = $("#audio-player-wrap");
    if (!wrap) return;
    if (!hasStoryAudioAvailable()) {
      wrap.hidden = true;
      if (!state.storyId) {
        wrap.innerHTML = "";
        audioElement = null;
        revokeStoryAudioBlobUrl();
      }
      resetHomePlayTimeline();
      updateDownloadControls();
      updateCenterCardState();
      updateHomePlayCard();
      return;
    }
    if (useApiPlayback()) {
      if (!audioElement || !wrap.querySelector("#story-audio")) {
        renderAudioPlayerShell();
      }
      updateCenterCardState();
      updateDownloadControls();
      updateHomePlayCard();
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="sample-audio-player">' +
        '<p class="sample-audio-player__label">' + getVoiceTagline() + '</p>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="btn-inline-play">پخش نمونه</button>' +
      '</div>';
    audioElement = null;
    revokeStoryAudioBlobUrl();
    var inlinePlay = $("#btn-inline-play");
    if (inlinePlay) {
      inlinePlay.addEventListener("click", function () {
        playWithVoiceSettings(getPlaybackUrl());
      });
    }
    updateDownloadControls();
    updateCenterCardState();
    updateHomePlayCard();
  }

  function renderSliders() {
    Object.keys(state.sliders).forEach(function (key) {
      var input = $("#slider-" + key);
      var val = $("#val-" + key);
      if (input) input.value = state.sliders[key];
      if (val) val.textContent = Number(state.sliders[key]).toFixed(2);
    });
    Object.keys(state.advanced).forEach(function (key) {
      var input = $("#adv-" + key);
      if (!input) return;
      if (input.type === "checkbox") input.checked = !!state.advanced[key];
      else input.value = state.advanced[key];
    });
    $$(".preset-btn").forEach(function (btn) {
      btn.classList.toggle("preset-btn--active", btn.dataset.preset === state.selectedPreset);
    });
  }

  function renderVoiceMode() {
    syncVoiceTaglines();
  }

  function saveLastStory() {
    if (!state.storyResult || !state.storyId) return;
    var voice = getSelectedVoice();
    var payload = {
      storyId: state.storyId,
      provider: state.provider,
      story: state.storyResult,
      voiceId: voice.id,
      voiceName: voice.nameFa,
      audioUrl: normalizeStoryAudioUrlForStorage(state.audioFullUrl),
      audioResult: state.audioResult || null,
      savedAt: new Date().toISOString(),
    };
    writeUserStorage("lastStory", JSON.stringify(payload));
  }

  function applyPersistedStoryState(data) {
    if (!data || !data.storyId || !data.story) return false;

    state.storyId = Number(data.storyId) || data.storyId;
    state.provider = data.provider || null;
    state.storyResult = data.story;
    state.selectedVoiceId = data.voiceId || state.selectedVoiceId;
    state.audioResult = data.audioResult || null;
    state.audioVoiceId = data.voiceId || null;
    var storedAudioPath = data.audioUrl || (data.audioResult && data.audioResult.audioUrl);
    storedAudioPath = normalizeStoryAudioUrlForStorage(storedAudioPath) || storedAudioPath;
    state.audioFullUrl = resolveStoryAudioUrl(storedAudioPath);
    if (!state.audioFullUrl && storedAudioPath && window.StorytellingAPI) {
      state.audioFullUrl = window.StorytellingAPI.buildFullAudioUrl(storedAudioPath);
    }
    ensureStoryAudioUrl();

    renderStoryCard();
    renderAudioPlayer();
    renderVoiceCards($("#voice-search") && $("#voice-search").value);
    updateSummaries();
    updateHomeStoryCta();
    updateCenterCardState();
    updatePrimaryButton();
    updateDownloadControls();
    updateHomePlayCard();
    return true;
  }

  function applyStoryAudioFromServer(audio) {
    if (!audio || !audio.audioUrl || !window.StorytellingAPI) return false;
    var voiceIdFromAudio = findVoiceIdByBackendVoice(audio.voice);
    state.audioFullUrl = window.StorytellingAPI.buildFullAudioUrl(audio.audioUrl);
    state.audioResult = audio;
    state.audioVoiceId = voiceIdFromAudio || state.audioVoiceId;
    if (voiceIdFromAudio) state.selectedVoiceId = voiceIdFromAudio;
    return true;
  }

  function syncHistoryAudioUrl(storyId, audioUrl) {
    if (!storyId || !audioUrl || !state.history.length) return;
    var changed = false;
    state.history.forEach(function (item) {
      if (item.storyId === storyId && item.audioUrl !== audioUrl) {
        item.audioUrl = audioUrl;
        changed = true;
      }
    });
    if (changed) {
      writeUserStorage("history", JSON.stringify(state.history));
      renderHistory();
    }
  }

  async function refreshStoryAudioFromServer(storyId) {
    storyId = Number(storyId);
    if (!Number.isFinite(storyId) || storyId <= 0 || mockFrontendMode || !window.StorytellingAPI) return false;
    try {
      var audioResult = await window.StorytellingAPI.getStoryAudioList(storyId);
      if (!audioResult.success || !audioResult.audio || !audioResult.audio.length) {
        return false;
      }
      if (!applyStoryAudioFromServer(audioResult.audio[0])) return false;
      saveLastStory();
      syncHistoryAudioUrl(storyId, normalizeStoryAudioUrlForStorage(state.audioFullUrl));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadLastStory() {
    try {
      var raw = readUserStorage("lastStory");
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || !data.storyId || !data.story) {
        writeUserStorage("lastStory", null);
        return;
      }
      if (!isStoryOwnedByCurrentUser(data.storyId)) {
        writeUserStorage("lastStory", null);
        return;
      }
      applyPersistedStoryState(data);
    } catch (e) {
      writeUserStorage("lastStory", null);
    }
  }

  async function restorePersistedStoryAudio() {
    if (!state.storyResult || !state.storyId) return false;

    if (!state.audioFullUrl) {
      var loaded = await refreshStoryAudioFromServer(state.storyId);
      if (!loaded) return false;
    }

    saveLastStory();
    renderStoryCard();
    renderAudioPlayer();
    if (state.audioFullUrl) await hydrateStoryAudioPlayer();
    renderVoiceCards($("#voice-search") && $("#voice-search").value);
    updateSummaries();
    updateHomeStoryCta();
    updateCenterCardState();
    updatePrimaryButton();
    updateDownloadControls();
    updateHomePlayCard();
    return !!(state.storyResult && state.audioFullUrl);
  }

  async function restoreLastStoryFromServer() {
    if (mockFrontendMode || !window.StorytellingAPI || !getCurrentUserId()) return false;

    try {
      var stories = await fetchUserStoriesFromServer(5);
      if (!stories.length) {
        return restorePersistedStoryAudio();
      }

      var latest = stories[0];
      var targetStoryId = Number(state.storyId) || Number(latest.id);

      if (!state.storyResult || Number(state.storyId) !== Number(latest.id)) {
        state.storyId = latest.id;
        state.provider = latest.provider;
        state.storyResult = latest.story;
        if (Number.isFinite(latest.age) || latest.age === 0) {
          state.storyResult.age = latest.age;
        }
        targetStoryId = Number(latest.id);
      }

      if (!state.audioFullUrl && latest.latestAudio) {
        applyStoryAudioFromServer(latest.latestAudio);
      }

      if (!state.audioFullUrl) {
        var audioResult = await window.StorytellingAPI.getStoryAudioList(targetStoryId);
        if (audioResult.success && audioResult.audio && audioResult.audio.length) {
          applyStoryAudioFromServer(audioResult.audio[0]);
        }
      }

      if (!state.audioFullUrl && targetStoryId !== Number(latest.id)) {
        var latestAudioResult = await window.StorytellingAPI.getStoryAudioList(Number(latest.id));
        if (latestAudioResult.success && latestAudioResult.audio && latestAudioResult.audio.length) {
          state.storyId = latest.id;
          state.provider = latest.provider;
          state.storyResult = latest.story;
          applyStoryAudioFromServer(latestAudioResult.audio[0]);
        }
      }

      if (!state.storyResult) return false;

      saveLastStory();
      renderStoryCard();
      renderAudioPlayer();
      if (state.audioFullUrl) await hydrateStoryAudioPlayer();
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
      updateSummaries();
      updateHomeStoryCta();
      updateCenterCardState();
      updatePrimaryButton();
      updateDownloadControls();
      updateHomePlayCard();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function restoreHomeStoryForAccount() {
    if (state.storyResult && state.storyId) {
      return true;
    }

    loadLastStory();
    if (state.storyResult && state.storyId) {
      if (!state.audioFullUrl) {
        await refreshStoryAudioFromServer(state.storyId);
      }
      return true;
    }

    if (state.history.length) {
      restoreHistoryItem(state.history[0], { silent: true });
      if (state.storyId && !state.audioFullUrl) {
        await refreshStoryAudioFromServer(state.storyId);
      }
      return !!state.storyResult;
    }

    return restoreLastStoryFromServer();
  }

  async function restoreUserStoryState() {
    if (storyRestorePromise) return storyRestorePromise;

    storyRestorePromise = (async function () {
      clearError();
      if (!state.storyResult) {
        await restoreHomeStoryForAccount();
      }
      await syncStoryAudioFromServer();

      if (state.audioFullUrl) {
        await hydrateStoryAudioPlayer();
      }

      renderStoryCard();
      if (!state.storyResult) updateHero(null);
      updatePrimaryButton();
      updateDownloadControls();
      updateHomeStoryCta();
      updateCenterCardState();
      updateHomePlayCard();
    })().finally(function () {
      storyRestorePromise = null;
    });

    return storyRestorePromise;
  }

  function storyRecordToHistoryItem(record) {
    if (!record || !record.id || !record.story) return null;

    var voiceId = null;
    var audioUrl = null;
    if (record.latestAudio) {
      voiceId = findVoiceIdByBackendVoice(record.latestAudio.voice);
      audioUrl = normalizeStoryAudioUrlForStorage(record.latestAudio.audioUrl) || record.latestAudio.audioUrl;
    }

    var voice = null;
    if (voiceId) {
      voice = getVoices().find(function (v) { return v.id === voiceId; });
    }

    return {
      storyId: record.id,
      provider: record.provider,
      story: record.story,
      title: record.story.title,
      voiceId: voiceId,
      voiceName: voice ? voice.nameFa : null,
      durationMinutes: record.story.durationMinutes || record.durationMinutes,
      audioUrl: audioUrl,
      savedAt: record.createdAt || new Date().toISOString(),
      formSnapshot: {
        childName: record.childName || "",
        age: record.age,
        interest: record.interest || "",
        goal: record.goal || "",
        mood: record.mood || "",
        durationMinutes: record.durationMinutes,
        extraContext: record.extraContext || "",
      },
    };
  }

  async function fetchUserStoriesFromServer(limit) {
    if (mockFrontendMode || !window.StorytellingAPI || !getCurrentUserId()) return [];

    try {
      var mine = await window.StorytellingAPI.getMyStories(limit || 30, getSessionId());
      if (mine.success && mine.stories) {
        return mine.stories;
      }
    } catch (e) { /* ignore */ }

    return [];
  }

  async function syncHistoryFromServer() {
    if (!getCurrentUserId()) {
      state.history = [];
      renderHistory();
      return false;
    }

    var stories = [];
    var fetchFailed = false;

    if (!mockFrontendMode && window.StorytellingAPI) {
      try {
        var mine = await window.StorytellingAPI.getMyStories(30, getSessionId());
        if (mine.success && mine.stories) {
          stories = mine.stories;
        }
      } catch (e) {
        fetchFailed = true;
      }
    }

    if (fetchFailed) {
      try {
        var raw = readUserStorage("history");
        state.history = raw ? JSON.parse(raw) : [];
      } catch (e) {
        state.history = [];
      }
      renderHistory();
      return state.history.length > 0;
    }

    state.history = stories
      .map(storyRecordToHistoryItem)
      .filter(Boolean)
      .slice(0, 30);

    writeUserStorage("history", JSON.stringify(state.history));

    if (!state.history.length) {
      writeUserStorage("lastStory", null);
      if (state.storyResult) resetStoryDisplayToEmpty();
    }

    renderHistory();
    return state.history.length > 0;
  }

  function addToHistory(item) {
    state.history.unshift(item);
    if (state.history.length > 30) state.history = state.history.slice(0, 30);
    writeUserStorage("history", JSON.stringify(state.history));
    renderHistory();
  }

  function loadHistory() {
    try {
      var raw = readUserStorage("history");
      state.history = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.history = [];
    }
    renderHistory();
  }

  function createHistoryCard(item, options) {
    options = options || {};
    var card = document.createElement("article");
    card.className = "history-card";
    card.innerHTML =
      '<div class="history-card__main">' +
        '<h4>' + (item.title || "قصه بدون عنوان") + '</h4>' +
        '<p class="history-card__meta">' +
          (item.durationMinutes || "—") + ' دقیقه · ' + getStorySourceLabel() +
        '</p>' +
        '<time class="history-card__date">' + formatPersianDate(item.savedAt) + '</time>' +
      '</div>' +
      '<div class="history-card__actions">' +
        ((item.audioUrl || !useApiPlayback()) ? '<button type="button" class="btn btn--ghost btn--icon btn--sm history-play" aria-label="پخش">' + (window.StorytellingIcons ? window.StorytellingIcons.render("play", "app-icon--sm") : "") + '</button>' : '') +
        '<button type="button" class="btn btn--secondary btn--sm history-restore">بازیابی</button>' +
      '</div>';
    var playBtn = card.querySelector(".history-play");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        stopVoicePlayback();
        if (audioElement) audioElement.pause();
        state.audioFullUrl = resolveStoryAudioUrl(item.audioUrl);
        renderAudioPlayer();
        if (state.audioFullUrl) {
          hydrateStoryAudioPlayer().then(function (ready) {
          if (!ready && state.storyId) return;
          playGeneratedStoryAudio();
        });
        } else {
          playWithVoiceSettings(getVoiceSampleUrl());
        }
        if (options.closeDrawer) closeHistoryDrawer();
      });
    }
    card.querySelector(".history-restore").addEventListener("click", function () {
      restoreHistoryItem(item);
      if (options.closeDrawer) closeHistoryDrawer();
    });
    return card;
  }

  function renderStoriesPanel() {
    var list = $("#stories-list");
    var empty = $("#stories-empty");
    var clearBtn = $("#btn-clear-stories");
    if (!list) return;
    list.innerHTML = "";
    if (!state.history.length) {
      if (empty) empty.hidden = false;
      if (clearBtn) clearBtn.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (clearBtn) clearBtn.hidden = false;
    state.history.forEach(function (item) {
      list.appendChild(createHistoryCard(item));
    });
    if (window.StorytellingIcons) window.StorytellingIcons.injectAll(list);
  }

  function renderHistory() {
    var list = $("#history-list");
    var empty = $("#history-empty");
    if (!list) return;
    list.innerHTML = "";
    if (!state.history.length) {
      if (empty) empty.hidden = false;
      renderStoriesPanel();
      return;
    }
    if (empty) empty.hidden = true;
    state.history.forEach(function (item) {
      list.appendChild(createHistoryCard(item, { closeDrawer: true }));
    });
    if (window.StorytellingIcons) window.StorytellingIcons.injectAll(list);
    renderStoriesPanel();
  }

  function restoreHistoryItem(item, options) {
    options = options || {};
    state.storyId = item.storyId;
    state.provider = item.provider;
    state.storyResult = item.story;
    state.selectedVoiceId = item.voiceId || state.selectedVoiceId;
    state.audioFullUrl = resolveStoryAudioUrl(
      normalizeStoryAudioUrlForStorage(item.audioUrl) || item.audioUrl
    );
    state.audioVoiceId = item.voiceId || null;

    if (item.formSnapshot) {
      var fs = item.formSnapshot;
      if (fs.childName) applyChildNameToForm(fs.childName);
      ["interest", "extraContext", "age", "goal", "mood", "durationMinutes"].forEach(function (key) {
        var el = $("#" + key);
        if (el && fs[key] !== undefined && fs[key] !== null && fs[key] !== "") {
          el.value = String(fs[key]);
        }
      });
      if (Number.isFinite(fs.age) || fs.age === 0) {
        state.storyResult.age = fs.age;
      }
      renderGoalChips();
    }

    renderStoryCard();
    renderAudioPlayer();
    saveLastStory();
    if (state.audioFullUrl) {
      hydrateStoryAudioPlayer();
    } else if (state.storyId) {
      refreshStoryAudioFromServer(state.storyId).then(function (refreshed) {
        if (refreshed) {
          saveLastStory();
          return hydrateStoryAudioPlayer();
        }
        return false;
      }).then(function () {
        updateDownloadControls();
        updateHomePlayCard();
      });
    }
    renderVoiceCards($("#voice-search") && $("#voice-search").value);
    updateSummaries();
    updatePrimaryButton();
    syncChildDisplay();
    updateHomeStoryCta();
    updateDownloadControls();
    if (!options.silent) {
      showToast("قصه بازیابی شد.", "success");
    }
  }

  function clearActiveStory() {
    stopVoicePlayback();
    state.storyId = null;
    state.provider = null;
    state.storyResult = null;
    state.audioResult = null;
    state.audioFullUrl = null;
    state.audioVoiceId = null;
    writeUserStorage("lastStory", null);
  }

  function clearHistory() {
    state.history = [];
    writeUserStorage("history", null);
    clearActiveStory();
    closeHistoryDrawer();
    window.location.reload();
  }

  function openHistoryDrawer() {
    var drawer = $("#history-drawer");
    var overlay = $("#drawer-overlay");
    if (drawer) { drawer.classList.add("drawer--open"); drawer.setAttribute("aria-hidden", "false"); }
    if (overlay) { overlay.classList.add("overlay--visible"); overlay.setAttribute("aria-hidden", "false"); }
    document.body.classList.add("drawer-open");
  }

  function closeHistoryDrawer() {
    var drawer = $("#history-drawer");
    var overlay = $("#drawer-overlay");
    if (drawer) { drawer.classList.remove("drawer--open"); drawer.setAttribute("aria-hidden", "true"); }
    if (overlay) { overlay.classList.remove("overlay--visible"); overlay.setAttribute("aria-hidden", "true"); }
    document.body.classList.remove("drawer-open");
  }

  function scrollToSettings() {
    var panel = $("#settings-panel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getMockStory(data) {
    var name = data.childName || "کودک";
    return {
      success: true,
      storyId: Date.now(),
      provider: "mock",
      story: {
        title: "ماجرای آرام " + name,
        age: data.age,
        goal: data.goal,
        durationMinutes: data.durationMinutes,
        parentEffort: "low",
        parentIntro: name + " عزیز، بیا با هم یک قصه کوتاه بشنویم.",
        storyText: "روزی روزگاری " + name + " که " + data.interest + " را خیلی دوست داشت، تصمیم گرفت آرام‌تر شود. با هر نفس عمیق، ستاره‌های کوچک در آسمان می‌درخشیدند و قلبش گرم‌تر شد.",
        interactionPoints: ["با هم نفس عمیق بکشیم.", "ستاره‌های انگشت را بشمار."],
        calmingAction: "سه نفس آهسته و آرام.",
        followUpQuestion: "امشب کدام ستاره را دوست داشتی؟",
      },
    };
  }

  async function handleGenerateStory() {
    clearError();
    var err = validateForm();
    if (err) {
      showError(err);
      return;
    }
    var data = getFormData();
    state.isGeneratingStory = true;
    updatePrimaryButton();
    setStoryCreateLoading(true);
    var createActions = document.querySelector(".story-create-actions");
    if (createActions && isMobileLayout()) {
      createActions.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    storyGenerationAbort = new AbortController();
    var signal = storyGenerationAbort.signal;
    startCreateProgress();

    try {
      var result;
      if (mockFrontendMode) {
        await delayWithSignal(800, signal);
        result = getMockStory(data);
      } else {
        result = await window.StorytellingAPI.generateStory(data, { signal: signal });
      }
      if (signal.aborted) return;
      if (!result.success) throw new Error(result.error || "ساخت قصه ناموفق بود.");
      state.storyId = result.storyId;
      state.provider = result.provider;
      state.storyResult = result.story;
      state.storyResult.age = data.age;
      state.audioResult = null;
      state.audioFullUrl = null;
      renderStoryCard();
      renderAudioPlayer();
      saveLastStory();
      var voice = getSelectedVoice();
      addToHistory({
        storyId: state.storyId,
        provider: state.provider,
        story: state.storyResult,
        title: state.storyResult.title,
        voiceId: voice.id,
        voiceName: voice.nameFa,
        durationMinutes: state.storyResult.durationMinutes,
        audioUrl: null,
        savedAt: new Date().toISOString(),
        formSnapshot: getFormData(),
      });
      completeCreateProgress();
      startCreateAudioProgress();
      var audioReady = await handleGenerateAudio({ autoPlay: false, suppressToast: true });
      stopCreateProgress();
      setCreateModalPhase("done");
      updateCreateProgressUI(100);
      setCreateHint(audioReady ? "قصه و صدا آماده‌اند!" : "قصه ساخته شد. صدا در خانه قابل تلاش مجدد است.");
      await delayWithSignal(600, signal);
      if (signal.aborted) return;
      setStoryCreateLoading(false);
      if (isMobileLayout()) setMobileTab("home");
      updateCenterCardState();
      updateHomePlayCard();
      if (audioReady) {
        showToast("قصه و صدا در صفحه خانه آماده‌اند.", "success");
      } else {
        showToast("قصه ساخته شد. می‌توانی از بخش صدا دوباره تلاش کنی.", "info");
      }
    } catch (e) {
      if (e.name === "AbortError") {
        stopCreateProgress();
        setStoryCreateLoading(false);
        showToast("ساخت قصه متوقف شد.", "info");
        return;
      }
      var msg = "ساخت قصه ناموفق بود. لطفاً دوباره تلاش کن.";
      if (e.message === "Failed to fetch" || e.name === "TypeError") {
        msg = "اتصال به سرور برقرار نشد. مطمئن شو بک‌اند روی آدرس درست اجرا شده است.";
      } else if (e.message) {
        msg = e.message;
      }
      showError(msg);
    } finally {
      storyGenerationAbort = null;
      state.isGeneratingStory = false;
      stopCreateProgress();
      if (state.isGeneratingStory === false) {
        setStoryCreateLoading(false);
      }
      updatePrimaryButton();
    }
  }

  // Future standalone TTS endpoint example:
  // POST /api/tts/generate
  async function generateVoiceFromAPI(text, voice, settings) {
    var url = `${window.API_BASE_URL}/api/tts/generate`;
    var response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, voice: voice, settings: settings }),
      });
    } catch (err) {
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("tts generate network error", {
          url: url,
          status: null,
          body: null,
          error: err,
        });
      }
      throw err;
    }
    if (!response.ok) {
      var errBody = null;
      try {
        errBody = await response.clone().json();
      } catch (e) {
        try { errBody = await response.clone().text(); } catch (e2) { /* ignore */ }
      }
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("tts generate HTTP error", {
          url: url,
          status: response.status,
          body: errBody,
          error: null,
        });
      }
    }
    return response.json();
  }

  function buildAudioPayload(voiceOverride) {
    var voice = voiceOverride || getSelectedVoice();
    return {
      voice: voice.backendVoice,
      format: "wav",
      narrationText: buildNarrationText(),
      backgroundAmbience: !!state.advanced.backgroundAmbience,
    };
  }

  async function handleGenerateAudio(options) {
    options = options || {};
    if (!state.storyId) { showError("ابتدا قصه را بساز."); return false; }

    var narrationText = buildNarrationText();
    if (!narrationText.trim()) {
      showError("متن قصه برای خواندن با صدا خالی است.");
      return false;
    }

    if (!useApiPlayback()) {
      state.isGeneratingAudio = true;
      updatePrimaryButton();
      setVoiceLoadingLabel($("#audio-player-status"));
      try {
        await new Promise(function (r) { setTimeout(r, 400); });
        state.audioFullUrl = getVoiceSampleUrl();
        state.audioSourceType = "sample";
        state.audioResult = { audioUrl: state.audioFullUrl, format: "wav", voice: getSelectedVoice().backendVoice };
        state.audioVoiceId = getSelectedVoice().id;
        renderAudioPlayer();
        saveLastStory();
        if (state.history.length && state.history[0].storyId === state.storyId) {
          state.history[0].audioUrl = normalizeStoryAudioUrlForStorage(state.audioFullUrl);
          writeUserStorage("history", JSON.stringify(state.history));
          renderHistory();
        }
        if (!options.suppressToast) {
          showToast("نمونه صدا آماده است — اسلایدرها را تغییر بده و پخش کن.", "success");
        }
        if (options.autoPlay) {
          await playGeneratedStoryAudio();
        }
        return true;
      } finally {
        state.isGeneratingAudio = false;
        ensureStoryAudioUrl();
        updatePrimaryButton();
        updateDownloadControls();
        updateCenterCardState();
        updateHomePlayCard();
      }
    }

    state.isGeneratingAudio = true;
    updatePrimaryButton();
    setVoiceLoadingLabel($("#audio-player-status"));
    try {
      var payload = buildAudioPayload(options.voice);
      var result;
      if (mockFrontendMode) {
        await new Promise(function (r) { setTimeout(r, 1000); });
        result = {
          success: true,
          audio: { id: 1, storyId: state.storyId, voice: payload.voice, format: "wav", audioUrl: "" },
        };
      } else {
        result = await window.StorytellingAPI.generateStoryAudio(state.storyId, payload);
      }
      if (!result.success) throw new Error(result.error || "ساخت صوت ناموفق بود.");
      state.audioResult = result.audio;
      state.audioVoiceId = (options.voice || getSelectedVoice()).id;
      if (!result.audio || !result.audio.audioUrl) {
        throw new Error("آدرس فایل صوتی از سرور دریافت نشد.");
      }
      state.audioFullUrl = window.StorytellingAPI.buildFullAudioUrl(result.audio.audioUrl);
      ensureStoryAudioUrl();
      renderAudioPlayer();
      saveLastStory();
      if (state.history.length && state.history[0].storyId === state.storyId) {
        state.history[0].audioUrl = normalizeStoryAudioUrlForStorage(state.audioFullUrl);
        writeUserStorage("history", JSON.stringify(state.history));
        renderHistory();
      }
      updateCenterCardState();
      updateHomePlayCard();
      var ready = await hydrateStoryAudioPlayer();
      updateCenterCardState();
      updateHomePlayCard();
      if (!ready && state.audioFullUrl) return true;
      if (!options.suppressToast) {
        showToast("فایل صوتی آماده است!", "success");
      }
      if (options.autoPlay) {
        await playGeneratedStoryAudio();
      }
      return true;
    } catch (e) {
      showError(formatApiError(e, "ساخت فایل صوتی ناموفق بود، اما قصه همچنان قابل استفاده است."));
      return false;
    } finally {
      state.isGeneratingAudio = false;
      ensureStoryAudioUrl();
      updatePrimaryButton();
      updateDownloadControls();
      updateCenterCardState();
      updateHomePlayCard();
    }
  }

  async function togglePlayPause() {
    if (useApiPlayback()) {
      var ready = await ensureStoryAudioReady({ reportError: true, forceRefresh: true });
      if (!ready) {
        showError("فایل صوتی هنوز آماده نیست. چند لحظه صبر کن و دوباره بزن.");
        updateHomePlayCard();
        return;
      }
      var element = ensureStoryAudioElement();
      if (!element) return;
      if (state.isPlaying) {
        element.pause();
        syncNativeBackgroundAmbience(false);
        syncPlayingState(false);
      } else {
        element.play().catch(function () {
          syncNativeBackgroundAmbience(false);
          showToast("برای پخش، دکمه پلی پلیر را بزن.", "info");
        });
      }
      updateHomePlayCard();
      return;
    }

    if (!state.storyResult) return;
    if (!state.audioFullUrl) {
      handleGenerateAudio().then(function () {
        if (state.audioFullUrl) playWithVoiceSettings(getPlaybackUrl());
      });
      return;
    }
    playWithVoiceSettings(getPlaybackUrl());
  }

  function handlePrimaryAction() {
    if (state.isGeneratingStory || state.isGeneratingAudio) return;
    if (!state.storyResult) {
      handleGenerateStory();
    } else if (!state.audioFullUrl) {
      handleGenerateAudio({ autoPlay: true });
    } else {
      togglePlayPause();
    }
  }

  async function handleDownload() {
    if (state.isDownloading) return;

    var ready = await ensureStoryAudioReady();
    if (!ready) {
      showToast("هنوز فایل صوتی آماده نیست. چند لحظه صبر کن و دوباره بزن.", "info");
      return;
    }

    var filename = getAudioDownloadFilename();
    state.isDownloading = true;
    updateDownloadControls();

    try {
      var blob = await getStoryAudioBlobForDownload();
      if (!blob && state.storyId) {
        var refreshed = await refreshStoryAudioFromServer(state.storyId);
        if (refreshed) {
          await hydrateStoryAudioPlayer({ allowServerRefresh: false });
          blob = await getStoryAudioBlobForDownload();
        }
      }
      if (!blob) {
        showToast("هنوز فایل صوتی آماده نیست.", "info");
        return;
      }
      await triggerFileDownload(blob, filename);
      showToast("دانلود «" + filename + "» شروع شد.", "success");
    } catch (e) {
      if (state.storyId) {
        try {
          var recovered = await refreshStoryAudioFromServer(state.storyId);
          if (recovered) {
            var retryBlob = await getStoryAudioBlobForDownload();
            if (retryBlob) {
              await triggerFileDownload(retryBlob, filename);
              showToast("دانلود «" + filename + "» شروع شد.", "success");
              return;
            }
          }
        } catch (retryErr) {
          /* fall through */
        }
      }
      showToast(formatApiError(e, "دانلود فایل صوتی ناموفق بود."), "error");
    } finally {
      state.isDownloading = false;
      updateDownloadControls();
      updateHomePlayCard();
      updateCenterCardState();
    }
  }

  async function fetchVoiceMode() {
    try {
      state.voiceMode = await window.StorytellingAPI.getVoiceMode();
      if (state.voiceMode && state.voiceMode.ttsProvider === "ivira") {
        var defaultVoice = state.voiceMode.defaultVoice;
        if (defaultVoice && VOICES.some(function (v) { return v.id === defaultVoice; })) {
          state.selectedVoiceId = defaultVoice;
        }
      }
      if (state.voiceMode && state.voiceMode.ttsProvider === "openai") {
        var openaiDefault = state.voiceMode.defaultVoice || "nova";
        if (OPENAI_VOICES.some(function (v) { return v.id === openaiDefault; })) {
          state.selectedVoiceId = openaiDefault;
        } else {
          state.selectedVoiceId = "nova";
        }
      }
      renderVoiceMode();
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
      updateSummaries();
    } catch (e) {
      state.voiceMode = null;
      renderVoiceMode();
    }
  }

  function syncProfileAvatarPicker() {
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (!user || !user.childGender) return;
    var input = document.querySelector('input[name="profileChildGender"][value="' + user.childGender + '"]');
    if (input) input.checked = true;
  }

  function bindProfileAvatarChange() {
    $$('input[name="profileChildGender"]').forEach(function (input) {
      input.addEventListener("change", async function () {
        if (!input.checked || !window.StorytellingAPI) return;
        var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
        if (user && user.childGender === input.value) return;

        try {
          var result = await window.StorytellingAPI.updateChildProfile({ childGender: input.value });
          if (result.user) {
            window.StorytellingAuth.updateUser(result.user);
            window.StorytellingAuth.renderUserAvatar();
            syncChildDisplay();
            showToast("آواتار فرزند به‌روز شد.", "success");
          }
        } catch (e) {
          syncProfileAvatarPicker();
          showToast("تغییر آواتار ناموفق بود.", "error");
        }
      });
    });
  }

  function bindEvents() {
    var voiceSearch = $("#voice-search");
    if (voiceSearch) {
      voiceSearch.addEventListener("input", function () { renderVoiceCards(voiceSearch.value); });
    }

    ["age", "goal", "mood", "durationMinutes", "interest", "childName"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("change", function () {
        updateSummaries();
        if (id === "childName") {
          saveChildName(el.value, false);
          syncChildDisplay();
        }
      });
      if (el) el.addEventListener("input", function () {
        updateSummaries();
        if (id === "childName") {
          saveChildName(el.value, false);
          syncChildDisplay();
        }
      });
      if (el && id === "childName") {
        el.addEventListener("blur", function () {
          saveChildName(el.value, true);
        });
      }
    });

    var preview = $("#story-preview");
    if (preview) preview.addEventListener("input", updateCharCount);

    Object.keys(state.sliders).forEach(function (key) {
      var input = $("#slider-" + key);
      if (!input) return;
      input.addEventListener("input", function () {
        state.sliders[key] = Number(input.value);
        state.selectedPreset = "";
        var val = $("#val-" + key);
        if (val) val.textContent = Number(input.value).toFixed(2);
        $$(".preset-btn").forEach(function (b) { b.classList.remove("preset-btn--active"); });
        if (window.VoicePlayer) window.VoicePlayer.updateSettings(state.sliders);
      });
    });

    $$(".preset-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var preset = PRESETS[btn.dataset.preset];
        if (!preset) return;
        state.selectedPreset = btn.dataset.preset;
        state.sliders.speed = preset.speed;
        state.sliders.pitch = preset.pitch;
        state.sliders.emotion = preset.emotion;
        state.sliders.clarity = preset.clarity;
        renderSliders();
        if (window.VoicePlayer) window.VoicePlayer.updateSettings(state.sliders);
      });
    });

    var advToggle = $("#advanced-toggle");
    var advBody = $("#advanced-body");
    if (advToggle && advBody) {
      advToggle.addEventListener("click", function () {
        var open = advBody.hidden;
        advBody.hidden = !open;
        advToggle.setAttribute("aria-expanded", String(open));
      });
    }

    Object.keys(state.advanced).forEach(function (key) {
      var input = $("#adv-" + key);
      if (!input) return;
      input.addEventListener("change", function () {
        state.advanced[key] = input.type === "checkbox" ? input.checked : Number(input.value);
        if (key === "backgroundAmbience" && state.audioFullUrl) {
          stopVoicePlayback();
          state.audioFullUrl = null;
          state.audioResult = null;
          renderAudioPlayer();
          updatePrimaryButton();
        }
      });
    });

    $("#btn-history") && $("#btn-history").addEventListener("click", openHistoryDrawer);
    $("#btn-settings") && $("#btn-settings").addEventListener("click", scrollToSettings);
    $("#drawer-close") && $("#drawer-close").addEventListener("click", closeHistoryDrawer);
    $("#drawer-overlay") && $("#drawer-overlay").addEventListener("click", closeHistoryDrawer);
    $("#btn-clear-history") && $("#btn-clear-history").addEventListener("click", clearHistory);
    $("#btn-clear-stories") && $("#btn-clear-stories").addEventListener("click", clearHistory);

    $("#btn-primary-action") && $("#btn-primary-action").addEventListener("click", handlePrimaryAction);
    $("#btn-regenerate-audio") && $("#btn-regenerate-audio").addEventListener("click", function () {
      state.audioFullUrl = null;
      state.audioResult = null;
      state.audioVoiceId = null;
      renderAudioPlayer();
      handleGenerateAudio({ autoPlay: true });
    });
    $("#btn-download") && $("#btn-download").addEventListener("click", handleDownload);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeHistoryDrawer();
    });

    $$(".bottom-nav__item[data-mobile-tab]").forEach(function (item) {
      item.addEventListener("click", function () {
        setMobileTab(item.dataset.mobileTab);
      });
    });

    $$("[data-mobile-tab-link]").forEach(function (item) {
      item.addEventListener("click", function () {
        setMobileTab(item.dataset.mobileTabLink);
      });
    });

    $("#btn-home-go-story") && $("#btn-home-go-story").addEventListener("click", function () {
      setMobileTab("story");
    });

    $("#btn-create-story") && $("#btn-create-story").addEventListener("click", handleGenerateStory);

    $("#btn-story-change-voice") && $("#btn-story-change-voice").addEventListener("click", function () {
      setMobileTab("voice");
    });

    $("#btn-cancel-story") && $("#btn-cancel-story").addEventListener("click", cancelStoryGeneration);
    $("#btn-cancel-create-modal") && $("#btn-cancel-create-modal").addEventListener("click", cancelStoryGeneration);

    $("#btn-home-play") && $("#btn-home-play").addEventListener("click", function () {
      if (!shouldShowHomePlayCard()) return;
      togglePlayPause().catch(function () {
        updateHomePlayCard();
      });
    });

    bindHomePlayTimelineControls();

    $("#btn-home-download") && $("#btn-home-download").addEventListener("click", handleDownload);

    $("#btn-header-history") && $("#btn-header-history").addEventListener("click", openHistoryDrawer);
    $("#mobile-btn-history") && $("#mobile-btn-history").addEventListener("click", openHistoryDrawer);
    $("#mobile-btn-logout") && $("#mobile-btn-logout").addEventListener("click", function () {
      if (window.StorytellingAuth) window.StorytellingAuth.logout();
    });

    window.addEventListener("resize", function () {
      if (isMobileLayout()) {
        document.body.setAttribute("data-mobile-tab", mobileTab);
      }
      setupStoryCreateScrollReveal();
    });

    bindProfileAvatarChange();
  }

  function syncUserFromServer() {
    if (!window.StorytellingAPI || !window.StorytellingAuth) return;
    window.StorytellingAPI.getMe()
      .then(function (result) {
        if (result && result.user) {
          window.StorytellingAuth.updateUser(result.user);
          window.StorytellingAuth.renderUserAvatar();
          if (result.user.childName) applyChildNameToForm(result.user.childName);
          syncChildDisplay();
          syncProfileAvatarPicker();
          syncHistoryFromServer().then(function () {
            restoreHomeStoryForAccount().then(function () {
              if (!state.storyResult) updateHero(null);
              restoreUserStoryState();
            });
          });
        }
      })
      .catch(function () {
        /* offline or expired — local session still used */
      });
  }

  function resetStoryDisplayToEmpty() {
    stopVoicePlayback();
    revokeStoryAudioBlobUrl();
    state.storyId = null;
    state.provider = null;
    state.storyResult = null;
    state.audioResult = null;
    state.audioFullUrl = null;
    state.audioVoiceId = null;
    state.history = [];

    var resultEl = $("#story-result");
    if (resultEl) resultEl.hidden = true;
    var preview = $("#story-preview");
    if (preview) preview.value = "";
    var audioWrap = $("#audio-player-wrap");
    if (audioWrap) audioWrap.hidden = true;

    updateHero(null);
    updateCenterCardState();
    updateHomePlayCard();
    updateHomeStoryCta();
    updatePrimaryButton();
    updateDownloadControls();
    renderHistory();
  }

  async function init() {
    var hadLeakedStorage = prepareUserScopedStorage();
    getSessionId();
    if (hadLeakedStorage) resetStoryDisplayToEmpty();
    var savedChildName = loadSavedChildName();
    applyChildNameToForm(savedChildName);

    window.__lalaByeSyncChildDisplay = syncChildDisplay;

    if (window.VoicePlayer) {
      window.VoicePlayer.setOnStateChange(syncPlayingState);
    }
    if (window.StorytellingAuth) {
      window.StorytellingAuth.renderUserAvatar();
      window.StorytellingAuth.bindProfileMenu();
      syncChildDisplay();
      syncProfileAvatarPicker();
      syncUserFromServer();
    }
    renderGoalChips();
    renderVoiceCards();
    renderSliders();
    await syncHistoryFromServer();
    await restoreHomeStoryForAccount();
    await restoreUserStoryState();
    if (!state.storyResult) updateHero(null);
    updateSummaries();
    updateCharCount();
    updatePrimaryButton();
    updateDownloadControls();
    updateHomeStoryCta();
    if (window.StorytellingIcons) window.StorytellingIcons.injectAll(document);
    bindEvents();
    bindStoryAudioPlaybackEvents();
    syncVoiceTaglines();
    fetchVoiceMode();
    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-tab", mobileTab);
    }
    setupStoryCreateScrollReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
