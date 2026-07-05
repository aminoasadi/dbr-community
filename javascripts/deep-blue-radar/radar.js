import {
  el,
  renderIcon,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from "./helpers";

const DEFAULT_VERBS = [
  { verb: "JOIN", line: "Request access. Stand with the technocrats." },
  { verb: "READ", line: "Read the continuity patterns." },
  { verb: "VERIFY", line: "Confirm the facts. Separate signal from noise." },
  { verb: "REPORT", line: "Help us discover continuity patterns." },
  { verb: "MAKE", line: "Make your own blue radar." },
];

function setupRadar() {}

function getAuthCopy(cfg, mode) {
  const subhead =
    cfg.dbr_subhead ||
    "We keep the bank's ICT infrastructure and services in the blue — operational, observed, in control. Help us hold the line.";

  if (mode === "signup") {
    return {
      headline: cfg.dbr_signup_headline || "Become a technocrat.",
      kicker: cfg.dbr_signup_kicker || "REQUEST RADAR ACCESS",
      subhead: cfg.dbr_signup_subhead || subhead,
    };
  }

  if (mode === "invite") {
    return {
      headline: cfg.dbr_invite_headline || "Join the Technocrats Community.",
      kicker: cfg.dbr_invite_kicker || "ACCEPT YOUR INVITATION",
      subhead: cfg.dbr_invite_subhead || subhead,
    };
  }

  return {
    headline: cfg.dbr_headline || "Join the Technocrats Community.",
    kicker: cfg.dbr_kicker || "ENTER THE RADAR ROOM",
    subhead,
  };
}

function getRadarVerbs(cfg) {
  if (!cfg.dbr_verbs) {
    return DEFAULT_VERBS;
  }

  try {
    const parsed = JSON.parse(cfg.dbr_verbs);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
  } catch (error) {}

  return DEFAULT_VERBS;
}

function audioDisabled() {
  return safeLocalStorageGet("dbr-audio-off", "0") === "1";
}

function ensureAudio(cfg) {
  let audio = document.getElementById("dbr-audio");

  if (!audio && cfg.dbr_audio_url) {
    audio = document.createElement("audio");
    audio.id = "dbr-audio";
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.45;
    audio.src = cfg.dbr_audio_url;
    audio.addEventListener("play", syncAudioButtons);
    audio.addEventListener("pause", syncAudioButtons);
    document.body.appendChild(audio);
  }

  return audio;
}

function syncAudioButtons() {
  const audio = document.getElementById("dbr-audio");
  const playing = !!audio && !audio.paused;

  document.querySelectorAll(".dbr-radar__audio").forEach((button) => {
    button.innerHTML = "";
    button.append(
      renderIcon(playing ? "pause" : "play", {
        class: "als-icon dbr-audio-ico",
        label: playing ? "Pause signal" : "Play signal",
      }),
      el("span", { text: playing ? "Pause signal" : "Play signal" })
    );
    button.setAttribute("aria-pressed", playing ? "true" : "false");
  });
}

function buildAudioButton(cfg) {
  const button = el("button", {
    class: "dbr-radar__audio",
    type: "button",
    "aria-label": "Toggle background audio",
  });

  button.addEventListener("click", () => {
    const audio = ensureAudio(cfg);

    if (!audio) {
      return;
    }

    if (audio.paused) {
      safeLocalStorageRemove("dbr-audio-off");
      audio.play().catch(() => {});
    } else {
      safeLocalStorageSet("dbr-audio-off", "1");
      audio.pause();
    }

    syncAudioButtons();
  });

  return button;
}

function initRadarAudio(cfg) {
  if (!cfg.dbr_audio_url || cfg.dbr_audio_enabled === false || audioDisabled()) {
    return;
  }

  const audio = ensureAudio(cfg);

  if (!audio) {
    return;
  }

  audio.play().then(syncAudioButtons).catch(() => {
    const start = () => {
      document.removeEventListener("pointerdown", start);
      document.removeEventListener("keydown", start);

      if (!audioDisabled() && document.body.classList.contains("dbr-auth")) {
        const nextAudio = ensureAudio(cfg);
        if (nextAudio) {
          nextAudio.play().then(syncAudioButtons).catch(() => {});
        }
      }
    };

    document.addEventListener("pointerdown", start, { once: true });
    document.addEventListener("keydown", start, { once: true });
  });
}

function stopRadarAudio() {
  const audio = document.getElementById("dbr-audio");

  if (audio) {
    audio.pause();
    audio.remove();
  }

  delete document.body.dataset.dbrAudio;
}

function buildRadar(copy, cfg) {
  const overlay = el("div", { class: "dbr-radar__overlay" }, [
    el("div", {
      class: "dbr-eyebrow",
      text: cfg.dbr_eyebrow || "DEEP BLUE RADAR · SEASON BRIEF",
    }),
    el("h2", { class: "dbr-headline", text: copy.headline }),
    el("p", { class: "dbr-sub", text: copy.subhead }),
    el("div", { class: "dbr-kicker", text: copy.kicker }),
  ]);
  const scope = el("div", { class: "dbr-radar__scope" }, [
    el("div", { class: "dbr-radar__disc" }, [el("div", { class: "dbr-radar__sweep" })]),
    overlay,
  ]);
  const radar = el("div", { class: "dbr-radar bm-injected dbr-injected" }, [scope]);

  if (cfg.dbr_audio_enabled !== false && cfg.dbr_audio_url) {
    radar.appendChild(buildAudioButton(cfg));
  }

  return radar;
}

export {
  buildRadar,
  getAuthCopy,
  getRadarVerbs,
  initRadarAudio,
  setupRadar,
  stopRadarAudio,
  syncAudioButtons,
};
