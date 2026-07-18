(function () {
  "use strict";

  // To test without backend, you can temporarily enable mockFrontendMode = true.
  const mockFrontendMode = false;

  const STORY_AUDIO_FORMAT = "mp3";
  const VOICE_TAGLINE_FALLBACK = "صدای مورد نظر را از بخش کتابخانه صدا انتخاب کنید.";

  const STORAGE_KEYS = {
    sessionId: "storytelling_session_id",
    lastStory: "storytelling_last_story",
    history: "storytelling_history",
    childName: "storytelling_child_name",
    quota: "storytelling_quota",
    legacyOwner: "storytelling_legacy_owner_user_id",
  };

  const USER_SCOPED_STORAGE_NAMES = ["sessionId", "lastStory", "history", "childName", "quota"];

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
    quota: null,
  };

  let mobileTab = "home";
  let prevMobileTab = mobileTab;
  let audioElement = null;
  let storyAudioBlobUrl = null;
  let audioHydrationToken = 0;
  let backgroundAmbienceElement = null;
  let createProgressTimer = null;
  let createHintTimer = null;
  let createProgressValue = 0;
  let storyGenerationAbort = null;
  let activeGenerationStoryId = null;
  let preGenerationStorySnapshot = null;
  let quotaReady = false;
  let storyCreateScrollObserver = null;
  let homeTimelineSeeking = false;
  let homeTimelineBound = false;
  let storyRestorePromise = null;
  let listAudioElement = null;
  let listAudioBlobUrl = null;
  let listPlayingStoryId = null;
  let listAudioLoadingStoryId = null;
  let previewAudioElement = null;
  let previewAudioVoiceId = null;
  let voicePreviewCache = {};
  let voiceSearchDebounceTimer = null;
  let appInitDone = false;
  let toastHideTimer = null;

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
    var nextTab = tab || "home";
    if (nextTab === "stories") nextTab = "home";
    var tabChanged = nextTab !== mobileTab;
    prevMobileTab = mobileTab;
    mobileTab = nextTab;
    if (tabChanged) {
      closeHistoryDrawer();
    }
    if (!state.isGeneratingStory && !state.isGeneratingAudio) {
      resetCreateFlowState();
    }
    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-tab", mobileTab);
      if (tabChanged && window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
    }
    $$(".bottom-nav__item[data-mobile-tab]").forEach(function (item) {
      item.classList.toggle("bottom-nav__item--active", item.dataset.mobileTab === mobileTab);
    });
    if (mobileTab === "voice") {
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
      syncVoiceTaglines();
      var voiceLibrary = $("#voice-library");
      if (voiceLibrary && window.StorytellingIcons) {
        window.StorytellingIcons.injectAll(voiceLibrary);
      }
    }
    if (mobileTab === "profile") {
      refreshQuotaDisplay();
    }
    updateCreateStoryButtonState();
    setupStoryCreateScrollReveal();
  }

  function resetCreateFlowState() {
    state.isGeneratingStory = false;
    state.isGeneratingAudio = false;
    state.isDownloading = false;
    setStoryCreateLoading(false);
    stopCreateProgress();
    dismissBlockingOverlays();
  }

  function dismissBlockingOverlays() {
    var modal = $("#create-modal");
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("create-modal-open", "drawer-open");
    var overlay = $("#drawer-overlay");
    if (overlay) {
      overlay.classList.remove("overlay--visible");
      overlay.setAttribute("aria-hidden", "true");
    }
    var drawer = $("#history-drawer");
    if (drawer) {
      drawer.classList.remove("drawer--open");
      drawer.setAttribute("aria-hidden", "true");
    }
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
    if (loading) loading.hidden = !active;
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

  function setCancelStoryButtonsDisabled(disabled) {
    ["#btn-cancel-story", "#btn-cancel-create-modal"].forEach(function (sel) {
      var btn = $(sel);
      if (btn) btn.disabled = !!disabled;
    });
  }

  function captureStorySnapshot() {
    if (!state.storyId || !state.storyResult) return null;
    return {
      storyId: state.storyId,
      provider: state.provider,
      storyResult: state.storyResult,
      audioResult: state.audioResult,
      audioFullUrl: state.audioFullUrl,
      audioVoiceId: state.audioVoiceId,
    };
  }

  function restoreStorySnapshot(snapshot) {
    if (!snapshot) {
      clearActiveStory();
      return;
    }
    state.storyId = snapshot.storyId;
    state.provider = snapshot.provider;
    state.storyResult = snapshot.storyResult;
    state.audioResult = snapshot.audioResult;
    state.audioFullUrl = snapshot.audioFullUrl;
    state.audioVoiceId = snapshot.audioVoiceId;
    saveLastStory();
    renderStoryCard();
    renderAudioPlayer();
    updateSummaries();
    updateHomeStoryCta();
    updateCenterCardState();
    updatePrimaryButton();
    updateDownloadControls();
    updateHomePlayCard();
  }

  function removeStoryFromHistory(storyId) {
    if (!storyId) return;
    var nextHistory = state.history.filter(function (item) {
      return Number(item.storyId) !== Number(storyId);
    });
    if (nextHistory.length === state.history.length) return;
    state.history = nextHistory;
    writeUserStorage("history", JSON.stringify(state.history));
    renderHistory();
  }

  async function rollbackCancelledGeneration(storyId, previousSnapshot) {
    if (
      storyId
      && !mockFrontendMode
      && window.StorytellingAPI
      && typeof window.StorytellingAPI.cancelStoryGeneration === "function"
    ) {
      try {
        var result = await window.StorytellingAPI.cancelStoryGeneration(storyId, getDevicePayload());
        if (result && result.quota) {
          applyQuotaState(result.quota);
        }
      } catch (_err) {
        /* best effort rollback */
      }
    }

    removeStoryFromHistory(storyId);
    restoreStorySnapshot(previousSnapshot);
    updateCenterCardState();
    updateHomeStoryCta();
    updateHomePlayCard();
  }

  function cancelStoryGeneration() {
    if ((!state.isGeneratingStory && !state.isGeneratingAudio) || !storyGenerationAbort) return;
    setCreateHint("در حال توقف ساخت...");
    setCancelStoryButtonsDisabled(true);
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
    return !!(state.storyResult && ensureStoryAudioUrl());
  }

  function applyStoryPlaybackSettings(element) {
    if (!element) return;
    var speed = Number(state.sliders.speed);
    if (!Number.isFinite(speed) || speed <= 0) speed = 1;
    element.playbackRate = Math.min(1.5, Math.max(0.5, speed));
  }

  function applyPreviewPlaybackSettings(element) {
    if (!element) return;
    var speed = Number(state.sliders.speed);
    if (!Number.isFinite(speed) || speed <= 0) speed = 1;
    element.playbackRate = Math.min(1.5, Math.max(0.5, speed));
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

    var voice = getStoryAudioVoice();
    var s = state.storyResult;
    if (titleEl) titleEl.textContent = s.title || "قصه آماده است";
    if (metaEl) {
      if (!ensureStoryAudioUrl()) {
        metaEl.textContent = "صدا در حال آماده‌سازی است...";
      } else if (!isStoryAudioHydrated()) {
        metaEl.textContent = (s.durationMinutes || "—") + " دقیقه · صدای " + voice.nameFa;
      } else {
        metaEl.textContent = (s.durationMinutes || "—") + " دقیقه · صدای " + voice.nameFa + " · برای آفلاین دانلود کن";
      }
    }
    if (playBtn) {
      playBtn.disabled = state.isGeneratingAudio || !ensureStoryAudioUrl();
      playBtn.classList.toggle("home-play-card__play--playing", state.isPlaying);
      playBtn.setAttribute("aria-label", state.isPlaying ? "توقف قصه" : "پخش قصه");
    }
    if (playIcon && window.StorytellingIcons) {
      window.StorytellingIcons.setPlayIcon(playIcon, state.isPlaying);
    }
    updateHomePlayTimeline();
    updateDownloadControls();
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
      backgroundAmbience: false,
      backgroundAmbienceApplied: false,
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
    return [s.parentIntro, s.storyText]
      .filter(function (part) { return typeof part === "string" && part.trim(); })
      .join("\n\n");
  }

  function invalidateStoryAudioIfNeeded(nextVoiceId) {
    if (state.audioFullUrl && state.audioVoiceId && nextVoiceId !== state.audioVoiceId) {
      state.audioFullUrl = null;
      state.audioResult = null;
      state.audioVoiceId = null;
      clearStoryAudioCache();
      renderAudioPlayer();
      updatePrimaryButton();
      updateHomePlayCard();
    }
  }

  function clearStoryAudioCache() {
    revokeStoryAudioBlobUrl();
    if (audioElement) {
      audioElement.pause();
      audioElement.removeAttribute("src");
      audioElement.load();
    }
    audioHydrationToken += 1;
  }

  function stopPreviewPlayback() {
    if (previewAudioElement) {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
    }
    previewAudioVoiceId = null;
    if (window.VoicePlayer) window.VoicePlayer.stop();
    if (!audioElement || audioElement.paused) {
      state.playbackVoiceId = null;
      syncPlayingState(false);
    }
  }

  function playGeneratedStoryAudio() {
    stopPreviewPlayback();
    stopListAudioPlayback();
    ensureStoryAudioUrl();
    if (!state.audioFullUrl) return Promise.resolve(false);
    if (useApiPlayback()) {
      return ensureStoryAudioReady({ reportError: true }).then(function (ready) {
        if (!ready || !audioElement) return false;
        applyStoryPlaybackSettings(audioElement);
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
      applyStoryPlaybackSettings(element);
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

  function getStoryAudioVoice() {
    if (state.audioVoiceId) {
      var byId = getVoiceById(state.audioVoiceId);
      if (byId) return byId;
    }
    if (state.audioResult && state.audioResult.voice) {
      var mappedId = findVoiceIdByBackendVoice(state.audioResult.voice);
      if (mappedId) {
        var byBackend = getVoiceById(mappedId);
        if (byBackend) return byBackend;
      }
    }
    return getSelectedVoice();
  }

  function isStoryAudioHydrated() {
    var element = audioElement || $("#story-audio");
    return !!(storyAudioBlobUrl && element && element.src);
  }

  function hasStoryAudioAvailable() {
    return !!(state.storyResult && ensureStoryAudioUrl() && isStoryAudioHydrated());
  }

  function hasStoryAudioUrlOnly() {
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

  function hasUserStoryData() {
    try {
      var rawLast = readUserStorage("lastStory");
      if (rawLast) {
        var last = JSON.parse(rawLast);
        if (last && last.storyId) return true;
      }
      if (state.history && state.history.length) return true;
    } catch (e) { /* ignore corrupt data */ }
    return false;
  }

  async function syncStoryAudioFromServer(options) {
    options = options || {};
    if (mockFrontendMode || !window.StorytellingAPI) {
      ensureStoryAudioUrl();
      return !!state.audioFullUrl;
    }

    var storyId = Number(state.storyId);
    if (!Number.isFinite(storyId) || storyId <= 0) {
      ensureStoryAudioUrl();
      return !!state.audioFullUrl;
    }

    var cachedAudioUrl = ensureStoryAudioUrl();
    var loaded = await refreshStoryAudioFromServer(storyId);
    if (!loaded && !cachedAudioUrl && !options.skipRestore && hasUserStoryData()) {
      await restoreLastStoryFromServer();
      storyId = Number(state.storyId);
      if (Number.isFinite(storyId) && storyId > 0) {
        loaded = await refreshStoryAudioFromServer(storyId);
      }
    }

    ensureStoryAudioUrl();
    return !!state.audioFullUrl;
  }

  async function ensureStoryAudioReady(options) {
    options = options || {};
    var synced = await syncStoryAudioFromServer({ skipRestore: true });
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
    var voice = getStoryAudioVoice();
    var slug = voice.id || "voice";
    return "lalaBye-" + (state.storyId || "sample") + "-" + slug + "." + STORY_AUDIO_FORMAT;
  }

  function updateDownloadControls() {
    var canDownload = !!(state.storyResult && (ensureStoryAudioUrl() || state.storyId || state.isPlaying));
    var disabled = !canDownload || state.isGeneratingAudio || state.isDownloading;
    var inlineBtn = $("#btn-download-inline");
    var homeDownloadBtn = $("#btn-home-download");
    var regenBtn = $("#btn-regenerate-audio");
    if (inlineBtn) {
      inlineBtn.disabled = disabled;
      inlineBtn.textContent = state.isDownloading ? "در حال دانلود..." : "دانلود صدا";
    }
    if (homeDownloadBtn) {
      homeDownloadBtn.disabled = disabled;
      homeDownloadBtn.setAttribute(
        "aria-label",
        state.isDownloading ? "در حال دانلود..." : "دانلود برای آفلاین"
      );
      homeDownloadBtn.classList.toggle("home-play-card__download--loading", state.isDownloading);
      homeDownloadBtn.classList.toggle("home-play-card__download--ready", canDownload && !disabled);
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

    var blobUrl = URL.createObjectURL(fileBlob);
    var a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    scheduleRevokeObjectUrl(blobUrl);
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
    if (!playing && !state.loadingVoiceId) {
      state.playbackVoiceId = null;
    }
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
    if (previewAudioElement) {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
    }
    previewAudioVoiceId = null;
    if (window.VoicePlayer) window.VoicePlayer.stop();
    if (audioElement) audioElement.pause();
    stopNativeBackgroundAmbience();
    state.playbackVoiceId = null;
    syncPlayingState(false);
  }

  function ensurePreviewAudioElement() {
    if (previewAudioElement) return previewAudioElement;
    previewAudioElement = new Audio();
    previewAudioElement.preload = "auto";
    previewAudioElement.addEventListener("ended", function () {
      previewAudioVoiceId = null;
      syncPlayingState(false);
    });
    previewAudioElement.addEventListener("pause", function () {
      if (previewAudioElement && previewAudioElement.paused && previewAudioVoiceId != null) {
        previewAudioVoiceId = null;
        syncPlayingState(false);
      }
    });
    return previewAudioElement;
  }

  async function resolveVoicePreviewUrl(voice) {
    var cached = voicePreviewCache[voice.id];
    if (cached && cached.playUrl) return cached.playUrl;

    var result = await window.StorytellingAPI.previewVoice(
      voice.backendVoice,
      "mp3",
      undefined,
      { backgroundAmbience: false }
    );
    if (!result.success || !result.audio || !result.audio.audioUrl) {
      throw new Error("پخش صدا از سرور دریافت نشد.");
    }

    var remoteUrl = window.StorytellingAPI.buildFullAudioUrl(result.audio.audioUrl);
    var blob = await fetchStoryAudioBlob(remoteUrl);
    var playUrl = URL.createObjectURL(blob);
    var existing = voicePreviewCache[voice.id];
    if (existing && existing.playUrl) {
      try { URL.revokeObjectURL(existing.playUrl); } catch (e) { /* ignore */ }
    }
    voicePreviewCache[voice.id] = { playUrl: playUrl, remoteUrl: remoteUrl };
    return playUrl;
  }

  function playVoicePreviewFromCache(voice, playUrl) {
    var el = ensurePreviewAudioElement();
    if (previewAudioVoiceId === voice.id && !el.paused) {
      el.pause();
      previewAudioVoiceId = null;
      syncPlayingState(false);
      return Promise.resolve(false);
    }

    stopListAudioPlayback();
    if (window.VoicePlayer) window.VoicePlayer.stop();
    if (audioElement) audioElement.pause();
    stopNativeBackgroundAmbience();

    previewAudioVoiceId = voice.id;
    state.playbackVoiceId = voice.id;
    el.src = playUrl;
    applyPreviewPlaybackSettings(el);
    return el.play()
      .then(function () {
        syncPlayingState(true);
        return true;
      })
      .catch(function () {
        previewAudioVoiceId = null;
        syncPlayingState(false);
        showToast("برای پخش، دوباره دکمه پلی را بزن.", "info");
        return false;
      });
  }

  function revokeListAudioBlobUrl() {
    if (listAudioBlobUrl) {
      URL.revokeObjectURL(listAudioBlobUrl);
      listAudioBlobUrl = null;
    }
  }

  function ensureListAudioElement() {
    if (listAudioElement && document.body.contains(listAudioElement)) return listAudioElement;
    listAudioElement = document.createElement("audio");
    listAudioElement.preload = "auto";
    listAudioElement.hidden = true;
    listAudioElement.addEventListener("ended", function () {
      listPlayingStoryId = null;
      updateHistoryCardPlayButtons();
    });
    listAudioElement.addEventListener("pause", function () {
      if (listAudioElement && listAudioElement.paused) {
        listPlayingStoryId = null;
        updateHistoryCardPlayButtons();
      }
    });
    document.body.appendChild(listAudioElement);
    return listAudioElement;
  }

  function stopListAudioPlayback() {
    if (listAudioElement) listAudioElement.pause();
    revokeListAudioBlobUrl();
    listPlayingStoryId = null;
    listAudioLoadingStoryId = null;
    updateHistoryCardPlayButtons();
  }

  function getHistoryItemDownloadFilename(item) {
    var voice = getVoiceById(item && item.voiceId);
    var slug = (voice && voice.id) || "voice";
    return "lalaBye-" + ((item && item.storyId) || "story") + "-" + slug + "." + STORY_AUDIO_FORMAT;
  }

  async function resolveHistoryItemAudioUrl(item) {
    if (!item) return null;

    var url = resolveStoryAudioUrl(
      normalizeStoryAudioUrlForStorage(item.audioUrl) || item.audioUrl
    );
    if (url) return url;

    if (!item.storyId || mockFrontendMode || !window.StorytellingAPI) return null;

    try {
      var audioResult = await window.StorytellingAPI.getStoryAudioList(item.storyId);
      if (!audioResult.success || !audioResult.audio || !audioResult.audio.length) {
        return null;
      }
      var audio = audioResult.audio[0];
      var resolved = window.StorytellingAPI.buildFullAudioUrl(audio.audioUrl);
      item.audioUrl = normalizeStoryAudioUrlForStorage(resolved) || audio.audioUrl;
      var voiceId = findVoiceIdByBackendVoice(audio.voice);
      if (voiceId) item.voiceId = voiceId;
      syncHistoryAudioUrl(item.storyId, item.audioUrl);
      return resolved;
    } catch (e) {
      return null;
    }
  }

  function updateHistoryCardPlayButtons() {
    $$(".history-card").forEach(function (card) {
      var storyId = Number(card.dataset.storyId);
      var playBtn = card.querySelector(".history-play");
      var iconEl = playBtn && playBtn.querySelector(".app-icon");
      if (!playBtn) return;

      var isLoading = listAudioLoadingStoryId === storyId;
      var isPlaying = listPlayingStoryId === storyId
        && listAudioElement
        && !listAudioElement.paused;

      playBtn.classList.toggle("history-play--loading", isLoading);
      playBtn.classList.toggle("history-play--playing", isPlaying && !isLoading);
      playBtn.disabled = isLoading;

      if (iconEl && window.StorytellingIcons) {
        window.StorytellingIcons.setPlayIcon(iconEl, isPlaying && !isLoading);
      }
    });
  }

  async function playHistoryItemInline(item, playBtn) {
    if (!item || !item.storyId) {
      showError("اطلاعات این قصه کامل نیست.");
      return false;
    }

    if (listPlayingStoryId === item.storyId && listAudioElement && !listAudioElement.paused) {
      stopListAudioPlayback();
      return true;
    }

    stopListAudioPlayback();
    stopVoicePlayback();

    listAudioLoadingStoryId = item.storyId;
    updateHistoryCardPlayButtons();
    if (playBtn) playBtn.disabled = true;

    try {
      var url = await resolveHistoryItemAudioUrl(item);
      if (!url) {
        showError("فایل صوتی این قصه هنوز آماده نیست.");
        return false;
      }

      if (!useApiPlayback()) {
        var voice = getVoiceById(item.voiceId) || getSelectedVoice();
        state.playbackVoiceId = voice.id;
        return playWithVoiceSettings(url);
      }

      var blob = await fetchStoryAudioBlob(url);
      revokeListAudioBlobUrl();
      listAudioBlobUrl = URL.createObjectURL(blob);

      var element = ensureListAudioElement();
      element.src = listAudioBlobUrl;
      await waitForAudioReady(element);
      await element.play();
      listPlayingStoryId = item.storyId;
      updateHistoryCardPlayButtons();
      return true;
    } catch (e) {
      showError(formatApiError(e, "پخش صدا ناموفق بود."));
      return false;
    } finally {
      listAudioLoadingStoryId = null;
      if (playBtn) playBtn.disabled = false;
      updateHistoryCardPlayButtons();
    }
  }

  async function downloadHistoryItemInline(item, downloadBtn) {
    if (!item || !item.storyId) {
      showError("اطلاعات این قصه کامل نیست.");
      return false;
    }

    if (downloadBtn) downloadBtn.disabled = true;

    try {
      var url = await resolveHistoryItemAudioUrl(item);
      if (!url) {
        showError("فایل صوتی این قصه هنوز آماده نیست.");
        return false;
      }

      var filename = getHistoryItemDownloadFilename(item);
      var fetchUrl = url.indexOf("?") === -1 ? url + "?download=1" : url + "&download=1";
      var blob = await fetchStoryAudioBlob(fetchUrl);
      await triggerFileDownload(blob, filename);
      return true;
    } catch (e) {
      showError(formatApiError(e, "دانلود فایل صوتی ناموفق بود."));
      return false;
    } finally {
      if (downloadBtn) downloadBtn.disabled = false;
    }
  }

  function toggleVoiceCardPlayback(voice) {
    if (state.isPlaying && state.playbackVoiceId === voice.id) {
      stopVoicePlayback();
      return Promise.resolve(false);
    }
    if (state.loadingVoiceId === voice.id || state.isGeneratingAudio) {
      return Promise.resolve(false);
    }
    stopListAudioPlayback();
    if (state.isPlaying) {
      stopVoicePlayback();
    }
    state.loadingVoiceId = voice.id;
    state.playbackVoiceId = voice.id;
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

    if (!window.StorytellingAPI) {
      showError("اتصال به سرور برقرار نیست.");
      return Promise.resolve(false);
    }

    var cached = voicePreviewCache[selected.id];
    if (cached && cached.playUrl) {
      return playVoicePreviewFromCache(selected, cached.playUrl);
    }

    return resolveVoicePreviewUrl(selected)
      .then(function (playUrl) {
        return playVoicePreviewFromCache(selected, playUrl);
      })
      .catch(function (e) {
        syncPlayingState(false);
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

  function getAllVoices() {
    return OPENAI_VOICES.concat(VOICES);
  }

  function getVoiceById(voiceId) {
    if (!voiceId) return null;
    var found = getVoices().find(function (v) { return v.id === voiceId; });
    if (found) return found;
    found = getAllVoices().find(function (v) { return v.id === voiceId; });
    if (found) return found;
    var legacyId = LEGACY_VOICE_MAP[voiceId];
    if (!legacyId) return null;
    return getAllVoices().find(function (v) { return v.id === legacyId; }) || null;
  }

  function getSelectedVoice() {
    var found = getVoiceById(state.selectedVoiceId);
    if (found) return found;
    var voices = getVoices();
    return voices[0] || getAllVoices()[0];
  }

  function formatPersianDate(iso) {
    try {
      return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch (e) {
      return iso || "";
    }
  }

  function showToast(message, type) {
    // Toasts disabled — no overlay notifications.
  }

  function showHomeAudioFeedback(message) {
    var metaEl = $("#home-play-meta");
    if (metaEl && shouldShowHomePlayCard()) {
      metaEl.textContent = message;
      return;
    }
    var heroSub = $("#hero-subtitle");
    if (heroSub && state.storyResult) heroSub.textContent = message;
  }

  function showError(message) {
    // Error toasts/inline feedback disabled — no popup or status messages.
  }

  var STORY_REQUIRED_FIELDS = ["age", "interest", "goal", "mood", "durationMinutes"];

  function clearFormValidationErrors() {
    STORY_REQUIRED_FIELDS.forEach(function (fieldId) {
      var field = $("#" + fieldId);
      if (!field) return;
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      var group = field.closest(".form-group");
      if (group) {
        group.classList.remove("form-group--error");
        var hint = group.querySelector(".field-error");
        if (hint) hint.remove();
      }
    });
  }

  function showFormValidationError(fieldId, message) {
    clearFormValidationErrors();
    var field = $("#" + fieldId);
    if (!field) return;

    var group = field.closest(".form-group");
    if (group) {
      group.classList.add("form-group--error");
      var hint = document.createElement("span");
      hint.className = "field-error";
      hint.id = "field-error-" + fieldId;
      hint.setAttribute("role", "alert");
      hint.textContent = message;
      group.appendChild(hint);
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", hint.id);
      group.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    var errorEl = $("#form-error");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    window.setTimeout(function () {
      try {
        field.focus({ preventScroll: true });
      } catch (_err) {
        field.focus();
      }
    }, 320);
  }

  function clearError() {
    clearFormValidationErrors();
    var errorEl = $("#form-error");
    if (errorEl) { errorEl.textContent = ""; errorEl.hidden = true; }
  }

  function getTehranDayKey(date) {
    date = date || new Date();
    var tehran = new Date(date.getTime() + (3.5 * 60 * 60 * 1000));
    var month = tehran.getUTCMonth() + 1;
    var day = tehran.getUTCDate();
    return tehran.getUTCFullYear() + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function loadPersistedQuota() {
    if (!getCurrentUserId()) return;
    try {
      var raw = readUserStorage("quota");
      if (!raw) return;
      var cached = JSON.parse(raw);
      if (!cached || !cached.quota || cached.dayKey !== getTehranDayKey()) return;
      state.quota = cached.quota;
    } catch (_err) {
      /* ignore invalid cache */
    }
  }

  function persistQuotaSnapshot(quota) {
    if (!getCurrentUserId() || !quota) return;
    writeUserStorage("quota", JSON.stringify({
      dayKey: getTehranDayKey(),
      quota: quota,
      cachedAt: new Date().toISOString(),
    }));
  }

  function applyQuotaState(quota) {
    if (!quota) return;
    state.quota = quota;
    persistQuotaSnapshot(quota);
    renderQuotaUsage();
    updateCreateStoryButtonState();
  }

  function getDevicePayload() {
    if (window.LalaByeDevice && typeof window.LalaByeDevice.getDeviceIdentity === "function") {
      return window.LalaByeDevice.getDeviceIdentity();
    }
    return { deviceId: "dev_web_fallback", androidId: null, deviceName: null };
  }

  function isQuotaBlocked() {
    if (window.StorytellingAuth && window.StorytellingAuth.isLoggedIn() && !quotaReady) {
      return true;
    }
    var quota = state.quota;
    if (!quota) return false;
    return quota.userExceeded === true || quota.deviceExceeded === true;
  }

  function getQuotaBlockedMessage() {
    var quota = state.quota;
    if (quota && quota.deviceExceeded) {
      return "امروز روی این دستگاه حداکثر ۲ داستان ساخته شده است.\nفردا دوباره می‌توانید داستان جدید بسازید.";
    }
    return "استفاده امروزت به اتمام رسید!\nفردا دوباره می‌توانی داستان جدید بسازی.";
  }

  function formatQuotaUsageCount(value) {
    return String(value == null ? 0 : value).replace(/\d/g, function (digit) {
      return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)];
    });
  }

  function renderQuotaUsage() {
    var usageEl = $("#mobile-profile-usage");
    if (!usageEl) return;

    var quota = state.quota;
    var dailyLimit = quota && quota.dailyLimit != null ? quota.dailyLimit : 2;
    var used = quota && quota.userUsedToday != null ? quota.userUsedToday : 0;

    if (used >= dailyLimit) {
      usageEl.textContent = "استفاده امروزت به اتمام رسید!";
      usageEl.classList.add("mobile-profile-hero__usage--exceeded");
      return;
    }

    usageEl.classList.remove("mobile-profile-hero__usage--exceeded");
    usageEl.textContent =
      "استفاده امروز: " +
      formatQuotaUsageCount(used) +
      " از " +
      formatQuotaUsageCount(dailyLimit) +
      " داستان ساخته شده";
  }

  function updateCreateStoryButtonState() {
    var btn = $("#btn-create-story");
    if (!btn) return;
    var blocked = isQuotaBlocked();
    btn.disabled = blocked || state.isGeneratingStory;
    btn.setAttribute("aria-disabled", blocked ? "true" : "false");
  }

  async function refreshQuotaDisplay() {
    if (!window.StorytellingAPI || !window.StorytellingAuth || !window.StorytellingAuth.isLoggedIn()) {
      quotaReady = true;
      return;
    }

    quotaReady = false;
    updateCreateStoryButtonState();

    try {
      var result = await window.StorytellingAPI.getQuota(getDevicePayload());
      if (result && result.quota) {
        applyQuotaState(result.quota);
      }
    } catch (_err) {
      /* keep persisted quota if server is unavailable */
    } finally {
      quotaReady = true;
      renderQuotaUsage();
      updateCreateStoryButtonState();
    }
  }

  function getFormData() {
    var device = getDevicePayload();
    return {
      childName: ($("#childName") && $("#childName").value || "").trim(),
      age: Number($("#age") && $("#age").value),
      interest: ($("#interest") && $("#interest").value || "").trim(),
      goal: $("#goal") && $("#goal").value || "",
      mood: $("#mood") && $("#mood").value || "",
      durationMinutes: Number($("#durationMinutes") && $("#durationMinutes").value),
      extraContext: ($("#extraContext") && $("#extraContext").value || "").trim(),
      sessionId: getSessionId(),
      deviceId: device.deviceId,
      androidId: device.androidId || undefined,
      deviceName: device.deviceName || undefined,
    };
  }

  function validateForm() {
    var data = getFormData();
    if (!Number.isFinite(data.age) && data.age !== 0) {
      return { fieldId: "age", message: "سن کودک را انتخاب کن." };
    }
    if (!data.interest) {
      return { fieldId: "interest", message: "علاقه کودک را وارد کن." };
    }
    if (!data.goal) {
      return { fieldId: "goal", message: "هدف قصه را انتخاب کن." };
    }
    if (!data.mood) {
      return { fieldId: "mood", message: "حال کودک را انتخاب کن." };
    }
    if (!data.durationMinutes) {
      return { fieldId: "durationMinutes", message: "مدت زمان قصه را انتخاب کن." };
    }
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
    if (nameEl) nameEl.textContent = name || "کودک";
    renderQuotaUsage();
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
    centerCard.classList.toggle("center-card--has-audio", !!(state.storyResult && hasStoryAudioUrlOnly()));
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
        container.querySelectorAll(".voice-card").forEach(function (c) {
          c.classList.toggle("voice-card--selected", c.dataset.voiceId === voice.id);
        });
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

    var titleEl = $("#story-title");
    var introEl = $("#story-parent-intro");
    var textEl = $("#story-text");
    if (titleEl) titleEl.textContent = s.title || "بدون عنوان";
    if (introEl) introEl.textContent = s.parentIntro || "—";
    if (textEl) textEl.textContent = s.storyText || "";

    var metaStoryId = $("#meta-story-id");
    var metaDuration = $("#meta-duration");
    var metaAge = $("#meta-age");
    var metaProvider = $("#meta-provider");
    if (metaStoryId) metaStoryId.textContent = state.storyId ? "#" + state.storyId : "—";
    if (metaDuration) metaDuration.textContent = (s.durationMinutes || "—") + " دقیقه";
    if (metaAge) metaAge.textContent = getStoryDisplayAge(s);
    if (metaProvider) metaProvider.textContent = getStorySourceLabel();

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
    if (!hasStoryAudioUrlOnly()) {
      wrap.hidden = true;
      if (!state.storyId) {
        wrap.innerHTML = "";
        audioElement = null;
        clearStoryAudioCache();
      }
      resetHomePlayTimeline();
      updateDownloadControls();
      updateCenterCardState();
      updateHomePlayCard();
      return;
    }
    if (useApiPlayback()) {
      if (!audioElement || !$("#story-audio")) {
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
    if (getCurrentUserId()) {
      loadLastStory();

      if (state.history.length) {
        var latest = state.history[0];
        var shouldPreferHistory = !state.storyResult
          || Number(state.storyId) !== Number(latest.storyId)
          || (!state.audioFullUrl && !!latest.audioUrl);
        if (shouldPreferHistory) {
          await restoreHistoryItem(latest, { silent: true });
        }
      }

      if (state.storyResult && state.storyId) {
        if (!state.audioFullUrl) {
          await refreshStoryAudioFromServer(state.storyId);
        }
        return true;
      }

      return restoreLastStoryFromServer();
    }

    loadLastStory();
    if (state.storyResult && state.storyId) {
      if (!state.audioFullUrl) {
        await refreshStoryAudioFromServer(state.storyId);
      }
      return true;
    }

    if (state.history.length) {
      await restoreHistoryItem(state.history[0], { silent: true });
      return !!state.storyResult;
    }

    return restoreLastStoryFromServer();
  }

  async function restoreUserStoryState() {
    if (storyRestorePromise) return storyRestorePromise;

    storyRestorePromise = (async function () {
      clearError();
      await restoreHomeStoryForAccount();
      await syncStoryAudioFromServer({ skipRestore: true });

      if (getCurrentUserId() && state.storyId && !state.audioFullUrl) {
        await refreshStoryAudioFromServer(state.storyId);
      }

      if (state.audioFullUrl) {
        try {
          await hydrateStoryAudioPlayer();
        } catch (e) {
          /* hydration may fail offline; play/download will retry */
        }
      }

      renderStoryCard();
      if (!state.storyResult) updateHero(null);
      updateSummaries();
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
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

    var voice = voiceId ? getVoiceById(voiceId) : null;

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

  function mergeHistoryItems(serverItems, localItems) {
    var map = {};

    serverItems.forEach(function (item) {
      if (!item || item.storyId == null) return;
      map[Number(item.storyId)] = item;
    });

    localItems.forEach(function (item) {
      if (!item || item.storyId == null) return;
      var id = Number(item.storyId);
      var existing = map[id];
      if (!existing) {
        map[id] = item;
        return;
      }
      if (item.audioUrl && !existing.audioUrl) {
        map[id] = Object.assign({}, existing, {
          audioUrl: item.audioUrl,
          voiceId: item.voiceId || existing.voiceId,
          voiceName: item.voiceName || existing.voiceName,
        });
      }
    });

    return Object.values(map)
      .sort(function (a, b) {
        return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
      })
      .slice(0, 30);
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

    var serverHistory = stories
      .map(storyRecordToHistoryItem)
      .filter(Boolean);

    var localHistory = [];
    try {
      var localRaw = readUserStorage("history");
      localHistory = localRaw ? JSON.parse(localRaw) : [];
      if (!Array.isArray(localHistory)) localHistory = [];
    } catch (e) {
      localHistory = [];
    }

    state.history = mergeHistoryItems(serverHistory, localHistory);

    writeUserStorage("history", JSON.stringify(state.history));

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
    card.dataset.storyId = String(item.storyId || "");
    card.innerHTML =
      '<div class="history-card__main">' +
        '<h4>' + (item.title || "قصه بدون عنوان") + '</h4>' +
        '<p class="history-card__meta">' +
          (item.durationMinutes || "—") + ' دقیقه · ' + getStorySourceLabel() +
        '</p>' +
        '<time class="history-card__date">' + formatPersianDate(item.savedAt) + '</time>' +
      '</div>' +
      '<div class="history-card__actions">' +
        '<button type="button" class="btn btn--primary btn--sm history-restore">بازیابی</button>' +
      '</div>';
    var restoreBtn = card.querySelector(".history-restore");
    restoreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      restoreBtn.disabled = true;
      restoreHistoryItem(item, { autoPlay: true }).then(function (restored) {
        if (!restored) return;
        if (options.closeDrawer) closeHistoryDrawer();
        if (isMobileLayout()) setMobileTab("home");
        var homeCard = $("#home-play-card");
        if (homeCard && !homeCard.hidden) {
          homeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }).finally(function () {
        restoreBtn.disabled = false;
      });
    });
    return card;
  }

  function updateClearHistoryButtons() {
    var hasHistory = state.history.length > 0;
    var clearStories = $("#btn-clear-stories");
    var clearDrawer = $("#btn-clear-history");
    if (clearStories) {
      clearStories.disabled = !hasHistory;
      clearStories.hidden = false;
    }
    if (clearDrawer) {
      clearDrawer.disabled = !hasHistory;
      clearDrawer.hidden = false;
    }
  }

  function renderStoriesPanel() {
    var list = $("#stories-list");
    var empty = $("#stories-empty");
    if (!list) return;
    list.innerHTML = "";
    if (!state.history.length) {
      if (empty) empty.hidden = false;
      updateClearHistoryButtons();
      return;
    }
    if (empty) empty.hidden = true;
    state.history.forEach(function (item) {
      list.appendChild(createHistoryCard(item));
    });
    if (window.StorytellingIcons) window.StorytellingIcons.injectAll(list);
    updateClearHistoryButtons();
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
    updateClearHistoryButtons();
  }

  function resetStoryAudioPlaybackPosition() {
    syncPlayingState(false);
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    resetHomePlayTimeline();
  }

  async function restoreHistoryItem(item, options) {
    options = options || {};
    if (!item || !item.story) {
      showError("اطلاعات این قصه کامل نیست.");
      return false;
    }

    stopListAudioPlayback();
    stopVoicePlayback();
    revokeStoryAudioBlobUrl();
    if (audioElement) {
      audioElement.removeAttribute("src");
      audioElement.load();
    }

    state.storyId = item.storyId;
    state.provider = item.provider;
    state.storyResult = item.story;
    state.selectedVoiceId = item.voiceId || state.selectedVoiceId;
    state.audioFullUrl = resolveStoryAudioUrl(
      normalizeStoryAudioUrlForStorage(item.audioUrl) || item.audioUrl
    );
    state.audioVoiceId = item.voiceId || null;
    state.audioResult = null;

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
      await hydrateStoryAudioPlayer();
    } else if (state.storyId) {
      var refreshed = await refreshStoryAudioFromServer(state.storyId);
      if (refreshed) {
        saveLastStory();
        await hydrateStoryAudioPlayer();
      }
    }

    resetStoryAudioPlaybackPosition();

    renderVoiceCards($("#voice-search") && $("#voice-search").value);
    updateSummaries();
    updatePrimaryButton();
    syncChildDisplay();
    updateHomeStoryCta();
    updateDownloadControls();
    updateCenterCardState();
    updateHomePlayCard();

    if (options.autoPlay) {
      if (state.audioFullUrl) {
        await playGeneratedStoryAudio();
      } else if (!useApiPlayback()) {
        await playWithVoiceSettings(getVoiceSampleUrl());
      }
    }

    if (!options.silent) {
      showToast("قصه بازیابی شد.", "success");
    }
    return true;
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
    if (!state.history.length) return;
    if (!window.confirm("آیا مطمئنی که می‌خواهی همه قصه‌های لیست را پاک کنی؟")) return;

    stopListAudioPlayback();
    state.history = [];
    writeUserStorage("history", null);
    clearActiveStory();
    revokeStoryAudioBlobUrl();
    if (audioElement) {
      audioElement.pause();
      audioElement.removeAttribute("src");
      audioElement.load();
    }
    renderStoryCard();
    renderAudioPlayer();
    renderHistory();
    updateSummaries();
    updatePrimaryButton();
    updateHomeStoryCta();
    updateHomePlayCard();
    updateCenterCardState();
    closeHistoryDrawer();
    showToast("لیست قصه‌ها پاک شد.", "success");
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
      },
    };
  }

  async function handleGenerateStory() {
    clearError();
    var validation = validateForm();
    if (validation) {
      showFormValidationError(validation.fieldId, validation.message);
      return;
    }
    await refreshQuotaDisplay();
    if (isQuotaBlocked()) {
      var quotaMsg = getQuotaBlockedMessage();
      var quotaErrorEl = $("#form-error");
      if (quotaErrorEl) {
        quotaErrorEl.textContent = quotaMsg;
        quotaErrorEl.hidden = false;
      }
      showToast(quotaMsg, "error");
      return;
    }
    var data = getFormData();
    state.isGeneratingStory = true;
    activeGenerationStoryId = null;
    preGenerationStorySnapshot = captureStorySnapshot();
    updatePrimaryButton();
    setStoryCreateLoading(true);
    setCancelStoryButtonsDisabled(false);
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
      if (signal.aborted) {
        await rollbackCancelledGeneration(activeGenerationStoryId, preGenerationStorySnapshot);
        return;
      }
      if (!result.success) throw new Error(result.error || "ساخت قصه ناموفق بود.");
      activeGenerationStoryId = result.storyId;
      if (signal.aborted) {
        await rollbackCancelledGeneration(activeGenerationStoryId, preGenerationStorySnapshot);
        return;
      }
      if (result.quota) applyQuotaState(result.quota);
      else {
        renderQuotaUsage();
        updateCreateStoryButtonState();
      }
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
      var audioReady = await handleGenerateAudio({ autoPlay: false, suppressToast: true, signal: signal });
      if (signal.aborted) {
        await rollbackCancelledGeneration(activeGenerationStoryId, preGenerationStorySnapshot);
        return;
      }
      stopCreateProgress();
      setCreateModalPhase("done");
      updateCreateProgressUI(100);
      setCreateHint(audioReady ? "قصه و صدا آماده‌اند!" : "قصه ساخته شد. صدا در خانه قابل تلاش مجدد است.");
      await delayWithSignal(600, signal);
      if (signal.aborted) {
        await rollbackCancelledGeneration(activeGenerationStoryId, preGenerationStorySnapshot);
        return;
      }
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
        await rollbackCancelledGeneration(activeGenerationStoryId, preGenerationStorySnapshot);
        setCreateHint("ساخت قصه متوقف شد.");
        showToast("ساخت قصه متوقف شد.", "info");
        return;
      }
      var msg = "ساخت قصه ناموفق بود. لطفاً دوباره تلاش کن.";
      if (e.code === "QUOTA_DAILY_EXCEEDED" || e.code === "DEVICE_DAILY_LIMIT_EXCEEDED") {
        msg = e.message || e.data?.error || msg;
        if (e.data && e.data.quota) {
          applyQuotaState(e.data.quota);
        }
      } else if (e.code === "STORY_GENERATION_FAILED") {
        msg = e.message || e.data?.error || msg;
      } else if (e.message === "Failed to fetch" || e.name === "TypeError") {
        msg = "اتصال به سرور برقرار نشد. مطمئن شو بک‌اند روی آدرس درست اجرا شده است.";
      } else if (e.message) {
        msg = e.message;
      }
      showToast(msg, "error");
    } finally {
      storyGenerationAbort = null;
      activeGenerationStoryId = null;
      preGenerationStorySnapshot = null;
      state.isGeneratingStory = false;
      stopCreateProgress();
      setCancelStoryButtonsDisabled(false);
      if (state.isGeneratingStory === false) {
        setStoryCreateLoading(false);
      }
      updatePrimaryButton();
      updateCreateStoryButtonState();
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
      format: STORY_AUDIO_FORMAT,
      narrationText: buildNarrationText(),
      backgroundAmbience: !!state.advanced.backgroundAmbience,
    };
  }

  async function handleGenerateAudio(options) {
    options = options || {};
    var signal = options.signal;
    if (signal && signal.aborted) return false;
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
        await delayWithSignal(400, signal);
        if (signal && signal.aborted) return false;
        state.audioFullUrl = getVoiceSampleUrl();
        state.audioSourceType = "sample";
        state.audioResult = { audioUrl: state.audioFullUrl, format: STORY_AUDIO_FORMAT, voice: getSelectedVoice().backendVoice };
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
      } catch (e) {
        if (e.name === "AbortError") throw e;
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

    state.isGeneratingAudio = true;
    updatePrimaryButton();
    setVoiceLoadingLabel($("#audio-player-status"));
    try {
      var payload = buildAudioPayload(options.voice);
      var result;
      if (mockFrontendMode) {
        await delayWithSignal(1000, signal);
        if (signal && signal.aborted) return false;
        result = {
          success: true,
          audio: { id: 1, storyId: state.storyId, voice: payload.voice, format: STORY_AUDIO_FORMAT, audioUrl: "" },
        };
      } else {
        result = await window.StorytellingAPI.generateStoryAudio(state.storyId, payload, { signal: signal });
      }
      if (signal && signal.aborted) return false;
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
      if (!ready) return false;
      if (!options.suppressToast) {
        showToast("فایل صوتی آماده است!", "success");
      }
      if (options.autoPlay) {
        await playGeneratedStoryAudio();
      }
      return true;
    } catch (e) {
      if (e.name === "AbortError") throw e;
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
      if (!state.storyResult) return;
      if (state.isGeneratingAudio) return;

      if (!ensureStoryAudioUrl()) {
        if (!state.storyId) return;
        var generated = await handleGenerateAudio({ autoPlay: true, suppressToast: true });
        updateHomePlayCard();
        if (!generated) {
          showError("ساخت فایل صوتی ناموفق بود. دوباره تلاش کن.");
        }
        return;
      }

      var element = ensureStoryAudioElement();
      if (!element) return;

      if (state.isPlaying) {
        element.pause();
        syncNativeBackgroundAmbience(false);
        syncPlayingState(false);
        updateHomePlayCard();
        return;
      }

      stopPreviewPlayback();
      stopListAudioPlayback();

      if (!isStoryAudioHydrated()) {
        var ready = await ensureStoryAudioReady({ reportError: true });
        if (!ready) {
          showError("فایل صوتی هنوز آماده نیست. دوباره تلاش کن.");
          updateHomePlayCard();
          return;
        }
        element = ensureStoryAudioElement();
      }

      applyStoryPlaybackSettings(element);
      element.play()
        .then(function () {
          syncNativeBackgroundAmbience(true);
          syncPlayingState(true);
        })
        .catch(function () {
          syncNativeBackgroundAmbience(false);
          syncPlayingState(false);
          showError("پخش صدا ناموفق بود. دوباره تلاش کن.");
        });
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
    if (state.isDownloading || state.isGeneratingAudio) return;
    if (!state.storyResult) {
      showError("ابتدا یک قصه بساز.");
      return;
    }

    var ready = await ensureStoryAudioReady({ reportError: false });
    if (!ready) {
      ready = await handleGenerateAudio({ suppressToast: true });
    }
    if (!ready) {
      showError("هنوز فایل صوتی آماده نیست. چند لحظه صبر کن و دوباره بزن.");
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
        showError("هنوز فایل صوتی آماده نیست.");
        return;
      }
      await triggerFileDownload(blob, filename);
      showHomeAudioFeedback("دانلود «" + filename + "» شروع شد.");
    } catch (e) {
      if (state.storyId) {
        try {
          var recovered = await refreshStoryAudioFromServer(state.storyId);
          if (recovered) {
            var retryBlob = await getStoryAudioBlobForDownload();
            if (retryBlob) {
              await triggerFileDownload(retryBlob, filename);
              showHomeAudioFeedback("دانلود «" + filename + "» شروع شد.");
              return;
            }
          }
        } catch (retryErr) {
          /* fall through */
        }
      }
      showError(formatApiError(e, "دانلود فایل صوتی ناموفق بود."));
    } finally {
      state.isDownloading = false;
      updateDownloadControls();
      updateHomePlayCard();
      updateCenterCardState();
    }
  }

  function getStoredLastStoryVoiceId() {
    try {
      var raw = readUserStorage("lastStory");
      if (!raw) return null;
      var data = JSON.parse(raw);
      return (data && data.voiceId) || null;
    } catch (e) {
      return null;
    }
  }

  async function fetchVoiceMode() {
    try {
      state.voiceMode = await window.StorytellingAPI.getVoiceMode();
      var preservedId = state.audioVoiceId || state.selectedVoiceId || getStoredLastStoryVoiceId();
      var voices = getVoices();
      if (preservedId && voices.some(function (v) { return v.id === preservedId; })) {
        state.selectedVoiceId = preservedId;
      } else if (state.voiceMode && state.voiceMode.ttsProvider === "ivira") {
        var defaultVoice = state.voiceMode.defaultVoice;
        if (defaultVoice && VOICES.some(function (v) { return v.id === defaultVoice; })) {
          state.selectedVoiceId = defaultVoice;
        }
      } else if (state.voiceMode && state.voiceMode.ttsProvider === "openai") {
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
      updateHomePlayCard();
    } catch (e) {
      state.voiceMode = null;
      renderVoiceMode();
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
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
      voiceSearch.addEventListener("input", function () {
        if (voiceSearchDebounceTimer) clearTimeout(voiceSearchDebounceTimer);
        voiceSearchDebounceTimer = setTimeout(function () {
          renderVoiceCards(voiceSearch.value);
        }, 180);
      });
    }

    ["age", "goal", "mood", "durationMinutes", "interest", "childName"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("change", function () {
        if (STORY_REQUIRED_FIELDS.indexOf(id) !== -1) {
          var group = el.closest(".form-group");
          if (group && group.classList.contains("form-group--error")) {
            clearError();
          }
        }
        updateSummaries();
        if (id === "childName") {
          saveChildName(el.value, false);
          syncChildDisplay();
        }
      });
      if (el) el.addEventListener("input", function () {
        if (STORY_REQUIRED_FIELDS.indexOf(id) !== -1) {
          var group = el.closest(".form-group");
          if (group && group.classList.contains("form-group--error")) {
            clearError();
          }
        }
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
        if (audioElement && !audioElement.paused) applyStoryPlaybackSettings(audioElement);
        if (previewAudioElement && !previewAudioElement.paused) applyPreviewPlaybackSettings(previewAudioElement);
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
        if (audioElement && !audioElement.paused) applyStoryPlaybackSettings(audioElement);
        if (previewAudioElement && !previewAudioElement.paused) applyPreviewPlaybackSettings(previewAudioElement);
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
        if (key === "backgroundAmbience") {
          stopNativeBackgroundAmbience();
          if (state.isPlaying && audioElement && !audioElement.paused) {
            syncNativeBackgroundAmbience(true);
          }
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
      togglePlayPause().catch(function (err) {
        showError(formatApiError(err, "پخش صدا ناموفق بود."));
        updateHomePlayCard();
      });
    });

    $("#btn-home-download") && $("#btn-home-download").addEventListener("click", function () {
      if (!state.storyResult) return;
      handleDownload();
    });

    bindHomePlayTimelineControls();

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
          if (result.quota) applyQuotaState(result.quota);
          if (appInitDone) {
            syncHistoryFromServer();
          }
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
    document.body.classList.add("app-init-pending");
    try {
      var hadLeakedStorage = prepareUserScopedStorage();
      loadPersistedQuota();
      if (window.StorytellingAuth && window.StorytellingAuth.isLoggedIn()) {
        quotaReady = !!state.quota;
        if (state.quota) {
          renderQuotaUsage();
          updateCreateStoryButtonState();
        }
      } else {
        quotaReady = true;
      }
      getSessionId();
      if (hadLeakedStorage) {
        resetStoryDisplayToEmpty();
      } else {
        loadLastStory();
      }
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
      renderSliders();
      bindEvents();
      await fetchVoiceMode();
      await refreshQuotaDisplay();
      await syncHistoryFromServer();
      await restoreUserStoryState();
      if (!state.storyResult) updateHero(null);
      updateSummaries();
      updateCharCount();
      updatePrimaryButton();
      updateCreateStoryButtonState();
      updateDownloadControls();
      updateHomeStoryCta();
      if (window.StorytellingIcons) window.StorytellingIcons.injectAll(document);
      bindStoryAudioPlaybackEvents();
      syncVoiceTaglines();
      renderVoiceCards();
      if (isMobileLayout()) {
        document.body.setAttribute("data-mobile-tab", mobileTab);
      }
      setupStoryCreateScrollReveal();
      appInitDone = true;
    } finally {
      document.body.classList.remove("app-init-pending");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
