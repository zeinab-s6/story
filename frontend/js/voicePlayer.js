(function () {
  "use strict";

  var audioContext = null;
  var sourceNode = null;
  var gainNode = null;
  var lowpassNode = null;
  var highShelfNode = null;
  var bufferCache = {};
  var playingUrl = null;
  var isPlaying = false;
  var onStateChange = null;
  var backgroundSourceNode = null;
  var backgroundGainNode = null;
  var unlockKeepaliveOsc = null;
  var unlockKeepaliveGain = null;

  var BACKGROUND_AUDIO_URL = "images/audio/source.mp3";
  var BACKGROUND_AUDIO_VOLUME = 0.14;

  function getContext() {
    if (!audioContext) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
    }
    return audioContext;
  }

  /**
   * Must be called synchronously inside a user gesture (click/tap)
   * before any await/network work, so autoplay policy unlocks Web Audio.
   * Starts a silent oscillator so the context stays running across long TTS waits.
   */
  function unlock() {
    var ctx = getContext();
    if (!ctx) return Promise.resolve(false);

    function startKeepalive() {
      if (unlockKeepaliveOsc) return;
      try {
        unlockKeepaliveOsc = ctx.createOscillator();
        unlockKeepaliveGain = ctx.createGain();
        unlockKeepaliveGain.gain.value = 0.0001;
        unlockKeepaliveOsc.frequency.value = 440;
        unlockKeepaliveOsc.connect(unlockKeepaliveGain);
        unlockKeepaliveGain.connect(ctx.destination);
        unlockKeepaliveOsc.start(0);
      } catch (e) {
        unlockKeepaliveOsc = null;
        unlockKeepaliveGain = null;
      }
    }

    startKeepalive();

    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      return ctx.resume().then(function () {
        startKeepalive();
        return ctx.state === "running";
      }).catch(function () {
        return false;
      });
    }
    return Promise.resolve(ctx.state === "running");
  }

  function settingsToParams(settings) {
    var speed = settings.speed != null ? settings.speed : 0.85;
    var pitch = settings.pitch != null ? settings.pitch : 0.9;
    var emotion = settings.emotion != null ? settings.emotion : 0.4;
    var clarity = settings.clarity != null ? settings.clarity : 0.9;

    return {
      playbackRate: speed,
      detune: (pitch - 1) * 900,
      lowpassFrequency: 12000 - emotion * 5500,
      highShelfGain: (clarity - 0.75) * 14,
      gain: 0.55 + clarity * 0.35,
    };
  }

  function applyParams(params) {
    if (!sourceNode) return;
    if (sourceNode.playbackRate) sourceNode.playbackRate.value = params.playbackRate;
    if (sourceNode.detune) sourceNode.detune.value = params.detune;
    if (lowpassNode) lowpassNode.frequency.value = params.lowpassFrequency;
    if (highShelfNode) highShelfNode.gain.value = params.highShelfGain;
    if (gainNode) gainNode.gain.value = params.gain;
  }

  function buildChain(ctx, settings) {
    var params = settingsToParams(settings);
    sourceNode = ctx.createBufferSource();
    lowpassNode = ctx.createBiquadFilter();
    highShelfNode = ctx.createBiquadFilter();
    gainNode = ctx.createGain();

    lowpassNode.type = "lowpass";
    lowpassNode.frequency.value = params.lowpassFrequency;
    lowpassNode.Q.value = 0.7;

    highShelfNode.type = "highshelf";
    highShelfNode.frequency.value = 3200;
    highShelfNode.gain.value = params.highShelfGain;

    gainNode.gain.value = params.gain;

    sourceNode.connect(lowpassNode);
    lowpassNode.connect(highShelfNode);
    highShelfNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    applyParams(params);
  }

  function notifyState() {
    if (typeof onStateChange === "function") onStateChange(isPlaying);
  }

  function stopBackgroundAmbience() {
    if (backgroundSourceNode) {
      try {
        backgroundSourceNode.onended = null;
        backgroundSourceNode.stop(0);
      } catch (e) {
        /* already stopped */
      }
      backgroundSourceNode.disconnect();
      backgroundSourceNode = null;
    }
    if (backgroundGainNode) {
      backgroundGainNode.disconnect();
      backgroundGainNode = null;
    }
  }

  function startBackgroundAmbience(ctx) {
    stopBackgroundAmbience();
    return loadBuffer(BACKGROUND_AUDIO_URL)
      .then(function (buffer) {
        backgroundSourceNode = ctx.createBufferSource();
        backgroundGainNode = ctx.createGain();
        backgroundSourceNode.buffer = buffer;
        backgroundSourceNode.loop = true;
        backgroundGainNode.gain.value = BACKGROUND_AUDIO_VOLUME;
        backgroundSourceNode.connect(backgroundGainNode);
        backgroundGainNode.connect(ctx.destination);
        backgroundSourceNode.start(0);
      })
      .catch(function (err) {
        // Ambience is optional; missing assets must not block narrator/story play.
        console.warn("[VoicePlayer] background ambience skipped", err);
      });
  }

  function wantsClientBackgroundAmbience(options) {
    return !!(options && options.backgroundAmbience && !options.backgroundAmbienceApplied);
  }

  function stopInternal() {
    stopBackgroundAmbience();
    if (sourceNode) {
      try {
        sourceNode.onended = null;
        sourceNode.stop(0);
      } catch (e) {
        /* already stopped */
      }
      sourceNode.disconnect();
      sourceNode = null;
    }
    isPlaying = false;
    playingUrl = null;
    notifyState();
  }

  function authFetchHeaders() {
    var headers = {};
    var token = window.StorytellingAuth && window.StorytellingAuth.getToken && window.StorytellingAuth.getToken();
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function loadBuffer(url) {
    if (bufferCache[url]) return Promise.resolve(bufferCache[url]);
    return fetch(url, { headers: authFetchHeaders() })
      .then(function (res) {
        if (!res.ok) {
          console.error("[StorytellingAPI] voice buffer HTTP error", {
            url: url,
            status: res.status,
            body: null,
            error: null,
          });
          throw new Error("بارگذاری فایل صوتی ناموفق بود.");
        }
        return res.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        var ctx = getContext();
        if (!ctx) throw new Error("مرورگر از پخش صدا پشتیبانی نمی‌کند.");
        return ctx.decodeAudioData(arrayBuffer);
      })
      .then(function (buffer) {
        bufferCache[url] = buffer;
        return buffer;
      })
      .catch(function (err) {
        if (err && err.message === "بارگذاری فایل صوتی ناموفق بود.") {
          throw err;
        }
        console.error("[StorytellingAPI] voice buffer network error", {
          url: url,
          status: null,
          body: null,
          error: err,
        });
        throw err;
      });
  }

  function ensureContextRunning(ctx) {
    if (ctx.state === "running") return Promise.resolve(ctx);
    return ctx.resume().then(function () {
      if (ctx.state !== "running") {
        var err = new Error("مرورگر پخش را مسدود کرد. دوباره روی پلی بزن.");
        err.name = "NotAllowedError";
        throw err;
      }
      return ctx;
    });
  }

  function play(url, settings, options) {
    var ctx = getContext();
    if (!ctx) return Promise.reject(new Error("مرورگر از پخش صدا پشتیبانی نمی‌کند."));

    stopInternal();

    return loadBuffer(url).then(function (buffer) {
      return ensureContextRunning(ctx).then(function () { return buffer; });
    }).then(function (buffer) {
      var ambiencePromise = wantsClientBackgroundAmbience(options)
        ? startBackgroundAmbience(ctx)
        : Promise.resolve();

      return ambiencePromise.then(function () {
        return ensureContextRunning(ctx).then(function () {
          buildChain(ctx, settings || {});
          sourceNode.buffer = buffer;
          sourceNode.loop = false;
          sourceNode.onended = function () {
            stopBackgroundAmbience();
            isPlaying = false;
            playingUrl = null;
            notifyState();
          };
          sourceNode.start(0);
          isPlaying = true;
          playingUrl = url;
          notifyState();
        });
      });
    });
  }

  function toggle(url, settings, options) {
    if (isPlaying && playingUrl === url) {
      stopInternal();
      return Promise.resolve(false);
    }
    return play(url, settings, options).then(function () { return true; });
  }

  function updateSettings(settings) {
    if (!isPlaying) return;
    applyParams(settingsToParams(settings || {}));
  }

  function setOnStateChange(callback) {
    onStateChange = callback;
  }

  window.VoicePlayer = {
    play: play,
    toggle: toggle,
    stop: stopInternal,
    unlock: unlock,
    updateSettings: updateSettings,
    setOnStateChange: setOnStateChange,
    isPlaying: function () { return isPlaying; },
    getPlayingUrl: function () { return playingUrl; },
  };
})();
