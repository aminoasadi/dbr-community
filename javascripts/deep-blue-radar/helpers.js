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
  routeName,
  runEnhancers,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  throttle,
  timeAgo,
};
