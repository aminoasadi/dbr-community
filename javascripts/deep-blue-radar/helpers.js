const TYPES = {
  pattern: { label: "Pattern", color: "#2c5f7c" },
  event: { label: "Event", color: "#3a7a8c" },
  poll: { label: "Poll", color: "#c8a24b" },
  question: { label: "Question", color: "#2563a8" },
  article: { label: "Article", color: "#0e1b33" },
  request: { label: "Request", color: "#1f3d6b" },
  showcase: { label: "Showcase", color: "#5a4a9a" },
  announcement: { label: "Announcement", color: "#b0402c" },
  discussion: { label: "Discussion", color: "#5b6a86" },
};

const PATTERN_COLLECTION_SLUG = "continuity-radar";
const contextCache = new WeakMap();
const enhancers = new Map();
const ICONS = {
  "arrow-right":
    '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  "arrow-left":
    '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  "arrow-down":
    '<path d="M12 5v14"/><path d="m18 13-6 6-6-6"/>',
  play:
    '<path d="m8 6 10 6-10 6z"/>',
  pause:
    '<path d="M9 6v12"/><path d="M15 6v12"/>',
  user:
    '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 20a8 8 0 0 1 16 0"/>',
  chart:
    '<path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/>',
  eye:
    '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
  heart:
    '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/>',
  shield:
    '<path d="M12 3 5 6v6c0 4.97 3.06 7.86 7 9 3.94-1.14 7-4.03 7-9V6l-7-3Z"/>',
  flash:
    '<path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z"/>',
};

function getSettings() {
  return (typeof settings !== "undefined" && settings) || {};
}

function routeName(router) {
  return (router && router.currentRouteName) || "";
}

function getCategories(site) {
  return (site && site.categories) || [];
}

function logError(scope, error) {
  // eslint-disable-next-line no-console
  console.warn(`[bettermode] ${scope} error`, error);
}

function el(tag, attrs = {}, kids = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) {
      continue;
    }

    if (key === "class") {
      node.className = value;
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "style") {
      node.setAttribute("style", value);
    } else {
      node.setAttribute(key, value);
    }
  }

  (Array.isArray(kids) ? kids : [kids]).forEach((child) => {
    if (child) {
      node.append(child);
    }
  });

  return node;
}

function avatar(template, size = 48) {
  if (!template) {
    return "/images/avatar.png";
  }

  return template.replace("{size}", String(size));
}

function num(value) {
  const number = Number(value || 0);

  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  }

  return String(number);
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );
}

function timeAgo(iso) {
  if (!iso) {
    return "";
  }

  const delta = (Date.now() - new Date(iso).getTime()) / 1000;

  if (delta < 3600) {
    return `${Math.max(1, Math.round(delta / 60))}m`;
  }

  if (delta < 86400) {
    return `${Math.round(delta / 3600)}h`;
  }

  if (delta < 2592000) {
    return `${Math.round(delta / 86400)}d`;
  }

  return `${Math.round(delta / 2592000)}mo`;
}

function debounce(fn, wait = 0) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function throttle(fn, wait = 0) {
  let lastRun = 0;
  let trailingTimer = null;

  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastRun);

    if (remaining <= 0) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
      lastRun = now;
      fn(...args);
      return;
    }

    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        lastRun = Date.now();
        trailingTimer = null;
        fn(...args);
      }, remaining);
    }
  };
}

function query(selector, scope = document) {
  return scope.querySelector(selector);
}

function queryAll(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

function removeAll(selector, scope = document) {
  queryAll(selector, scope).forEach((node) => node.remove());
}

function toggleClass(target, className, condition) {
  if (!target) {
    return;
  }

  target.classList.toggle(className, !!condition);
}

function cleanupInjected(scope = document, selector = ".bm-injected, .dbr-injected") {
  removeAll(selector, scope);
}

function applyChamfer(target, size = "default") {
  if (!target) {
    return target;
  }

  const map = {
    xs: "chamfer-xs",
    sm: "chamfer-sm",
    lg: "chamfer-lg",
    default: "chamfer",
  };

  target.classList.add(map[size] || map.default);
  return target;
}

function renderIcon(name, options = {}) {
  const markup = ICONS[name];

  if (!markup) {
    return null;
  }

  const icon = el(
    "svg",
    {
      class: options.class || "als-icon",
      viewBox: "0 0 24 24",
      "aria-hidden": options.label ? null : "true",
      role: options.label ? "img" : null,
    },
    []
  );
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.75");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.innerHTML = markup;

  if (options.label) {
    icon.setAttribute("aria-label", options.label);
  }

  return icon;
}

function safeLocalStorageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {}
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {}
}

function isLoginRoute(router) {
  return document.body.classList.contains("login-page") || routeName(router) === "login";
}

function isSignupRoute(router) {
  return (
    document.body.classList.contains("signup-page") ||
    /signup|create-account/.test(routeName(router)) ||
    !!query(".signup-fullpage, .create-account")
  );
}

function isInviteRoute(router) {
  return (
    document.body.classList.contains("invite-page") ||
    /invites\.show/.test(routeName(router)) ||
    !!query(".invites-show")
  );
}

function isHomeRoute(router) {
  return (
    document.body.classList.contains("navigation-categories") ||
    routeName(router) === "discovery.categories"
  );
}

function isFeedRoute(router) {
  return routeName(router) === "discovery.latest";
}

function createThemeContext(api) {
  if (contextCache.has(api)) {
    return contextCache.get(api);
  }

  const site = api.container.lookup("service:site");
  const router = api.container.lookup("service:router");

  const context = {
    api,
    cfg: getSettings(),
    site,
    router,
    catById(id) {
      try {
        return getCategories(site).find((category) => category.id === id) || null;
      } catch (error) {
        return null;
      }
    },
    isPatternCat(category) {
      if (!category) {
        return false;
      }

      if (category.slug === PATTERN_COLLECTION_SLUG) {
        return true;
      }

      if (category.parent_category_id) {
        const parent = getCategories(site).find(
          (candidate) => candidate.id === category.parent_category_id
        );
        return !!parent && parent.slug === PATTERN_COLLECTION_SLUG;
      }

      return false;
    },
    postType(topic) {
      const tags = (topic.tags || []).map((tag) =>
        (
          typeof tag === "string" ? tag : (tag && (tag.name || tag.slug)) || ""
        ).toLowerCase()
      );
      const category = this.catById(topic.category_id);
      const slug = category ? category.slug : "";
      const hasTag = (tag) => tags.includes(tag);

      if (hasTag("pattern") || this.isPatternCat(category)) {
        return "pattern";
      }
      if (hasTag("event") || slug === "events") {
        return "event";
      }
      if (hasTag("poll")) {
        return "poll";
      }
      if (
        topic.has_accepted_answer ||
        hasTag("question") ||
        slug === "help" ||
        slug === "bugs"
      ) {
        return "question";
      }
      if (hasTag("article") || hasTag("guide") || slug === "guides") {
        return "article";
      }
      if (hasTag("feature-request") || slug === "feature-requests") {
        return "request";
      }
      if (hasTag("showcase") || slug === "showcase") {
        return "showcase";
      }
      if (hasTag("announcement") || slug === "announcements") {
        return "announcement";
      }
      return "discussion";
    },
  };

  contextCache.set(api, context);
  return context;
}

function registerEnhancer(name, enhancer) {
  enhancers.set(name, enhancer);
}

function runEnhancers() {
  enhancers.forEach((enhancer, name) => {
    try {
      enhancer();
    } catch (error) {
      logError(name, error);
    }
  });
}

export {
  PATTERN_COLLECTION_SLUG,
  TYPES,
  avatar,
  createThemeContext,
  debounce,
  el,
  escapeHtml,
  cleanupInjected,
  applyChamfer,
  isFeedRoute,
  isHomeRoute,
  isInviteRoute,
  isLoginRoute,
  isSignupRoute,
  logError,
  num,
  query,
  queryAll,
  registerEnhancer,
  removeAll,
  renderIcon,
  routeName,
  runEnhancers,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  toggleClass,
  throttle,
  timeAgo,
};
