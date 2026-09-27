import { ensureObserver } from "./animations";
import {
  createThemeContext,
  el,
  isFeedRoute,
  isHomeRoute,
  isInviteRoute,
  isLoginRoute,
  isSignupRoute,
  num,
  query,
  registerEnhancer,
  removeAll,
  safeLocalStorageGet,
  safeLocalStorageSet,
  TYPES,
} from "./helpers";
import {
  attachFeedViewToggle,
  buildFeedPostCard,
  buildLeaderboard,
  buildLinksCard,
  buildProfileCard,
} from "./cards";

let feedRail = null;
let feedRailHost = null;

function typeFromRow(context, row) {
  const tagElements = row.querySelectorAll(".discourse-tag, [data-tag-name]");
  const tags = [...tagElements].map((element) =>
    (element.getAttribute("data-tag-name") || element.textContent || "").toLowerCase().trim()
  );
  const categoryElement = row.querySelector(
    ".badge-category[data-category-id], .badge-category__wrapper [data-category-id]"
  );
  const categoryId = categoryElement
    ? parseInt(categoryElement.getAttribute("data-category-id"), 10)
    : null;
  const solved = row.querySelector(
    ".topic-statuses .solved, .topic-status.solved, .has-accepted-answer"
  );

  return context.postType({
    tags,
    category_id: categoryId,
    has_accepted_answer: !!solved,
  });
}

function labelForType(type) {
  return (TYPES[type] && TYPES[type].label) || TYPES.discussion.label;
}

function decorateRows(context, scope = document) {
  scope
    .querySelectorAll("tr.topic-list-item, .latest-topic-list-item")
    .forEach((row) => {
      try {
        const type = typeFromRow(context, row) || "discussion";
        row.setAttribute("data-post-type", type);
        row.querySelectorAll("a.title, .title").forEach((title) => {
          title.setAttribute("data-post-type-label", labelForType(type));
        });
      } catch (error) {}
    });
}

function watchList(context) {
  const body = query(".topic-list-body, .latest-topic-list");
  ensureObserver("topic-list.rows", body, () => decorateRows(context), {
    childList: true,
    subtree: true,
  });
}

function addViewToggle() {
  const controls =
    query(".list-controls .nav.nav-pills")?.parentElement || query(".navigation-container");

  if (!controls || controls.querySelector(".bm-viewtoggle")) {
    return;
  }

  if (!query(".topic-list")) {
    return;
  }

  const apply = (mode) => {
    const main = query("#main-outlet");

    if (!main) {
      return;
    }

    main.classList.toggle("bm-grid", mode === "grid");
    controls.querySelectorAll(".bm-viewtoggle button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });
    safeLocalStorageSet("bm-view", mode);
  };

  const makeButton = (mode, label) => {
    const button = el("button", { type: "button", text: label });
    button.dataset.mode = mode;
    button.addEventListener("click", () => apply(mode));
    return button;
  };

  controls.append(
    el("div", { class: "bm-viewtoggle" }, [
      makeButton("list", "List"),
      makeButton("grid", "Grid"),
    ])
  );

  apply(safeLocalStorageGet("bm-view", "list"));
}

function clearHome() {
  removeAll(".bm-injected");
  document.body.classList.remove("bm-home");
}

async function fillHeroStats(context, hero) {
  const wrap = hero.querySelector(".bm-hero__stats");
  const spaces = ((context.site.categories || []).filter((category) => category.parent_category_id))
    .length;
  let members = 0;
  let topics = 0;
  let posts = 0;

  try {
    const json = await (
      await fetch("/about.json", { headers: { Accept: "application/json" } })
    ).json();
    const stats = (json && json.about && json.about.stats) || {};
    topics = stats.topics_count || 0;
    posts = stats.posts_count || 0;
    members = stats.users_count || 0;
  } catch (error) {}

  try {
    const json = await (
      await fetch("/directory_items.json?period=all&order=likes_received", {
        headers: { Accept: "application/json" },
      })
    ).json();
    members =
      (json.meta && json.meta.total_rows_directory_items) ||
      (json.directory_items || []).length ||
      members;
  } catch (error) {}

  const stats = [
    [num(spaces), "Spaces"],
    [num(members), "Members"],
    [num(topics), "Topics"],
    [num(posts), "Posts"],
  ];

  wrap.innerHTML = "";
  stats.forEach(([big, label]) => {
    wrap.append(
      el("div", {
        class: "bm-hero__stat",
        html: `<b>${big}</b><span>${label}</span>`,
      })
    );
  });
}

async function buildFeed(context, mount) {
  mount.append(
    el("div", { class: "bm-section-head" }, [
      el("h2", { text: "Recent Posts" }),
      el("span", { class: "bm-section-meta bm-feed-meta", text: "" }),
    ])
  );

  const feed = el("div", { class: "bm-feed" });
  const list = el("div", {
    class: "bm-feed__list",
    html: '<div class="bm-skeleton">Loading posts…</div>',
  });

  feed.append(list);
  mount.append(feed);
  attachFeedViewToggle(mount, feed);

  try {
    const response = await fetch("/latest.json?order=created", {
      headers: { Accept: "application/json" },
    });
    const json = await response.json();
    const topics = (json.topic_list && json.topic_list.topics) || [];
    const users = {};

    (json.users || []).forEach((user) => {
      users[user.id] = user;
    });

    list.innerHTML = "";

    const visible = topics
      .filter((topic) => !topic.pinned_globally || true)
      .slice(0, parseInt(context.cfg.recent_feed_count || 8, 10));

    mount.querySelector(".bm-feed-meta").textContent = `${topics.length} latest`;

    visible.forEach((topic) => {
      list.append(buildFeedPostCard(context, topic, users));
    });
  } catch (error) {
    list.innerHTML = '<div class="bm-skeleton">Could not load posts.</div>';
  }
}

function buildHome(context) {
  const main = query("#main-outlet");

  if (!main) {
    return;
  }

  const host = main.querySelector(".list-container") || main;
  document.body.classList.add("bm-home");

  if (context.cfg.show_hero !== false && !host.querySelector(":scope > .bm-hero")) {
    const hero = el("section", { class: "bm-hero bm-injected" }, [
      el("div", {
        class: "bm-hero__eyebrow",
        text: context.cfg.hero_eyebrow || "House of Technocrats · Technocrats Community",
      }),
      el("h1", {
        class: "bm-hero__title",
        text: context.cfg.hero_title || "Where the conversation is well-made.",
      }),
      el("p", {
        class: "bm-hero__sub",
        text:
          context.cfg.hero_subtitle ||
          "Browse Collections and Spaces, follow posts by type, and climb the engagement leaderboard.",
      }),
      el("div", { class: "bm-hero__stats" }),
    ]);

    host.insertBefore(hero, host.firstChild);
    fillHeroStats(context, hero);
  }

  if (!host.querySelector(".bm-cat-head")) {
    const head = el("div", { class: "bm-section-head bm-cat-head bm-injected" }, [
      el("h2", { text: "Collections & Spaces" }),
      el("span", { class: "bm-section-meta", text: "Browse by topic" }),
    ]);
    const hero = host.querySelector(":scope > .bm-hero");

    if (hero) {
      hero.after(head);
    } else {
      host.insertBefore(head, host.firstChild);
    }
  }

  if (!host.querySelector(":scope > .bm-home__grid")) {
    const grid = el("div", { class: "bm-home__grid bm-injected" });
    const column = el("div", { class: "bm-home__main" });
    const rail = el("aside", { class: "bm-rail" });

    grid.append(column, rail);
    host.appendChild(grid);

    if (context.cfg.show_recent_feed !== false) {
      buildFeed(context, column);
    }
    if (context.cfg.show_leaderboard !== false) {
      buildLeaderboard(context, rail);
    }
    buildLinksCard(rail);
  }
}

function ensureFeedRail(context) {
  const listArea = query("#list-area");

  if (!listArea) {
    return;
  }

  if (!feedRail) {
    feedRail = el("aside", { class: "bm-feedrail bm-injected" });
    buildProfileCard(context, feedRail);
    if (context.cfg.show_leaderboard !== false) {
      buildLeaderboard(context, feedRail);
    }
  }

  if (feedRail.parentElement !== listArea) {
    listArea.appendChild(feedRail);
  }

  if (feedRailHost !== listArea) {
    feedRailHost = listArea;
    ensureObserver(
      "topic-list.feedrail",
      listArea,
      () => {
        if (
          document.body.classList.contains("bm-feedhome") &&
          feedRail &&
          feedRail.parentElement !== listArea &&
          listArea.isConnected
        ) {
          listArea.appendChild(feedRail);
        }
      },
      { childList: true }
    );
  }
}

function buildFeedHome(context) {
  document.body.classList.add("bm-feedhome");
  const main = query("#main-outlet");

  if (main) {
    main.classList.add("bm-grid");
  }

  ensureFeedRail(context);
}

function clearFeedHome() {
  if (feedRail && feedRail.parentElement) {
    feedRail.parentElement.removeChild(feedRail);
  }

  document.body.classList.remove("bm-feedhome");

  const main = query("#main-outlet");
  if (main) {
    main.classList.remove("bm-grid");
  }
}

function applyTopicListEnhancements(context) {
  if (
    isLoginRoute(context.router) ||
    isSignupRoute(context.router) ||
    isInviteRoute(context.router)
  ) {
    return;
  }

  const feed = isFeedRoute(context.router);

  if (feed) {
    buildFeedHome(context);
  } else {
    clearFeedHome();
  }

  if (isHomeRoute(context.router)) {
    buildHome(context);
  } else {
    clearHome();
  }

  decorateRows(context);

  if (!feed) {
    addViewToggle();
  }

  watchList(context);
}

function setupTopicList(api) {
  const context = createThemeContext(api);
  registerEnhancer("topic-list", () => applyTopicListEnhancements(context));
}

export { setupTopicList };
