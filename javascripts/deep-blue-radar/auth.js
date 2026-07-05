import { registerEnhancer, createThemeContext, el, isInviteRoute, isLoginRoute, isSignupRoute, query, removeAll } from "./helpers";
import {
  buildRadar,
  getAuthCopy,
  getRadarVerbs,
  initRadarAudio,
  stopRadarAudio,
  syncAudioButtons,
} from "./radar";

function authMode(router) {
  if (isSignupRoute(router)) {
    return "signup";
  }

  if (isInviteRoute(router)) {
    return "invite";
  }

  if (isLoginRoute(router)) {
    return "login";
  }

  return null;
}

function clearAuth() {
  removeAll(".dbr-injected");
  document.body.classList.remove("dbr-auth", "dbr-login", "dbr-signup", "dbr-invite");
  delete document.body.dataset.dbrMode;
}

function buildAuth(context, mode) {
  const host = query(".login-fullpage, .signup-fullpage, .invites-show");

  if (!host) {
    return;
  }

  if (document.body.dataset.dbrMode && document.body.dataset.dbrMode !== mode) {
    clearAuth();
  }

  document.body.dataset.dbrMode = mode;
  document.body.classList.add("dbr-auth", `dbr-${mode}`);

  const verbs = getRadarVerbs(context.cfg);
  const copy = getAuthCopy(context.cfg, mode);
  const card = query(".login-body, .signup-body, .create-account-body, .invite-form");

  if (card && !card.id) {
    card.id = "dbr-card";
  }

  const main = query("#main-outlet");

  if (main && !main.querySelector(":scope > .dbr-skip")) {
    main.insertBefore(
      el("a", {
        class: "dbr-skip bm-injected dbr-injected",
        href: `#${card ? card.id : "main-outlet"}`,
        text: "Skip to the form",
      }),
      main.firstChild
    );
  }

  if (main && !main.querySelector(":scope > .dbr-header")) {
    const wordmark = context.cfg.dbr_header_wordmark || "HOUSE OF TECHNOCRATS";
    const header = el("header", {
      class: "dbr-header bm-injected dbr-injected",
      role: "banner",
    }, [
      el("a", { class: "dbr-brand", href: "/", "aria-label": `${wordmark} home` }, [
        el("span", { class: "dbr-wordmark", text: wordmark }),
        el("span", {
          class: "dbr-tagline",
          text: context.cfg.dbr_header_tagline || "DEEP BLUE RADAR",
        }),
      ]),
      el("div", {
        class: "dbr-status",
        text: context.cfg.dbr_status_label || "SYSTEMS IN THE BLUE",
      }),
    ]);
    const skipLink = main.querySelector(":scope > .dbr-skip");
    main.insertBefore(header, skipLink ? skipLink.nextSibling : main.firstChild);
  }

  if (!host.querySelector(":scope > .dbr-radar")) {
    host.appendChild(buildRadar(copy, context.cfg));
  }

  if (!host.querySelector(":scope > .dbr-method")) {
    host.appendChild(
      el("div", { class: "dbr-method bm-injected dbr-injected" }, [
        el("div", {
          class: "dbr-method__label",
          text: context.cfg.dbr_method_label || "THE METHOD",
        }),
        el(
          "ol",
          { class: "dbr-steps" },
          verbs.map((verb, index) =>
            el("li", { class: "dbr-step" }, [
              el("span", {
                class: "dbr-step__idx",
                "aria-hidden": "true",
                text: String(index + 1).padStart(2, "0"),
              }),
              el("span", { class: "dbr-step__verb", text: verb.verb }),
              el("span", { class: "dbr-step__line", text: verb.line }),
            ])
          )
        ),
      ])
    );
  }

  if (!host.querySelector(":scope > .dbr-signoff")) {
    host.appendChild(
      el("div", {
        class: "dbr-signoff bm-injected dbr-injected",
        text: context.cfg.dbr_signoff || "using technocratic culture.",
      })
    );
  }

  if (!host.querySelector(":scope > .dbr-footer")) {
    host.appendChild(
      el("div", { class: "dbr-footer bm-injected dbr-injected" }, [
        el("div", {
          class: "dbr-footer__legend",
          text:
            context.cfg.dbr_footer ||
            "DEEP BLUE RADAR · HOUSE OF TECHNOCRATS · THE TECHNOCRATS COMMUNITY",
        }),
        el("nav", { class: "dbr-footer__links", "aria-label": "Help and legal" }, [
          el("ul", {}, [
            el("li", {}, el("a", { href: "/guidelines", text: "Help" })),
            el("li", {}, el("a", { href: "/privacy", text: "Privacy" })),
          ]),
        ]),
      ])
    );
  }

  const altButtons = query("#login-buttons");
  if (card) {
    card.classList.toggle("dbr-no-alt", !altButtons || altButtons.children.length === 0);
  }

  if (context.cfg.dbr_audio_url && context.cfg.dbr_audio_enabled !== false) {
    if (!document.body.dataset.dbrAudio) {
      document.body.dataset.dbrAudio = "1";
      initRadarAudio(context.cfg);
    }
    syncAudioButtons();
  }
}

function setupAuth(api) {
  const context = createThemeContext(api);

  registerEnhancer("auth", () => {
    const mode = authMode(context.router);

    if (mode) {
      if (context.cfg.dbr_enable !== false) {
        buildAuth(context, mode);
      } else {
        clearAuth();
      }
      return;
    }

    clearAuth();
    stopRadarAudio();
  });
}

export { setupAuth };
