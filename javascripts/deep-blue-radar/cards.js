import { ensureObserver } from "./animations";
import {
  TYPES,
  avatar,
  el,
  escapeHtml,
  num,
  queryAll,
  registerEnhancer,
  renderIcon,
  safeLocalStorageGet,
  safeLocalStorageSet,
  timeAgo,
} from "./helpers";

function hideDisabledEmailNotice(scope = document) {
  queryAll(".alert, .alert-info, .alert-error, .alert-warning, .global-notice, .admin-notice", scope)
    .filter((node) =>
      /All outgoing email has been globally disabled by an administrator/i.test(
        node.textContent || ""
      )
    )
    .forEach((node) => node.remove());
}

function replaceWelcomeBackTitle(scope = document) {
  queryAll("h1, h2, .welcome-banner, .welcome-banner *", scope)
    .filter((node) => /^Welcome back,/i.test((node.textContent || "").trim()))
    .forEach((node) => {
      node.textContent = "welcome to house of technocrats";
    });
}

function setupCards() {
  registerEnhancer("cards.notices", () => {
    hideDisabledEmailNotice();
    replaceWelcomeBackTitle();
    ensureObserver("cards.notices", document.body, () => {
      hideDisabledEmailNotice();
      replaceWelcomeBackTitle();
    }, {
      childList: true,
      subtree: true,
    });
  });
}

function buildFeedPostCard(context, topic, users) {
  const type = context.postType(topic);
  const category = context.catById(topic.category_id);
  const poster =
    (topic.posters || []).find((item) => /Original Poster|original/i.test(item.description || "")) ||
    (topic.posters || [])[0];
  const user = poster ? users[poster.user_id] : null;

  return el(
    "a",
    {
      class: "bm-post",
      href: `/t/${topic.slug}/${topic.id}`,
      "data-post-type": type,
      style: `--bm-type-color:${TYPES[type].color};--bm-space-color:#${
        (category && category.color) || "1f3d6b"
      }`,
    },
    [
      el("img", {
        class: "bm-post__avatar",
        src: avatar(user && user.avatar_template, 48),
        alt: "",
      }),
      el("div", { class: "bm-post__body" }, [
        el("span", {
          class: "bm-post__title",
          html: `<span class="bm-type bm-type--${type}">${TYPES[type].label}</span>${escapeHtml(
            topic.title
          )}`,
        }),
        el("div", { class: "bm-post__meta" }, [
          category ? el("span", { class: "bm-post__space", text: category.name }) : null,
          el("span", { class: "bm-post__dot", text: "·" }),
          el("span", {
            class: "bm-post__num",
            html: `<b>${user ? escapeHtml(user.username) : "—"}</b>`,
          }),
          el("span", { class: "bm-post__dot", text: "·" }),
          el("span", {
            class: "bm-post__num",
            text: timeAgo(topic.created_at || topic.bumped_at),
          }),
        ].filter(Boolean)),
      ]),
      el("div", { class: "bm-post__stats" }, [
        el("div", {
          class: "bm-post__stat",
          html: `<b>${num(topic.posts_count ? topic.posts_count - 1 : 0)}</b><span>Replies</span>`,
        }),
        el("div", {
          class: "bm-post__stat",
          html: `<b>${num(topic.like_count)}</b><span>Likes</span>`,
        }),
        el("div", {
          class: "bm-post__stat",
          html: `<b>${num(topic.views)}</b><span>Views</span>`,
        }),
      ]),
    ]
  );
}

async function buildLeaderboard(context, mount) {
  const id = context.cfg.leaderboard_id || 1;
  const card = el("div", { class: "bm-leaderboard" }, [
    el("div", { class: "bm-leaderboard__head" }, [
      el("h3", { text: "Engagement Leaderboard" }),
      el("a", { href: "/leaderboard", text: "View all →" }),
    ]),
    el("div", { class: "bm-lb-rows", html: '<div class="bm-skeleton">Loading…</div>' }),
    el("div", {
      class: "bm-leaderboard__foot",
      text: "Points for posts, likes given & received, solutions and visits.",
    }),
  ]);

  mount.append(card);

  try {
    const response = await fetch(
      `/leaderboard/${id}.json?user_limit=${parseInt(context.cfg.leaderboard_count || 6, 10)}`,
      { headers: { Accept: "application/json" } }
    );
    const json = await response.json();
    const rows = card.querySelector(".bm-lb-rows");

    rows.innerHTML = "";
    (json.users || []).forEach((user) => {
      rows.append(
        el("a", { class: "bm-lb-row", href: `/u/${user.username}`, "data-rank": user.position }, [
          el("span", { class: "bm-lb-rank", text: user.position }),
          el("img", {
            class: "bm-lb-avatar",
            src: avatar(user.avatar_template, 48),
            alt: "",
          }),
          el("span", {
            class: "bm-lb-name",
            html: `${escapeHtml(user.name || user.username)}<small>@${escapeHtml(
              user.username
            )}</small>`,
          }),
          el("span", {
            class: "bm-lb-score",
            html: `${num(user.total_score)}<span>pts</span>`,
          }),
        ])
      );
    });

    if (!(json.users || []).length) {
      rows.innerHTML = '<div class="bm-skeleton">No scores yet.</div>';
    }
  } catch (error) {
    card.querySelector(".bm-lb-rows").innerHTML =
      '<div class="bm-skeleton">Leaderboard unavailable.</div>';
  }
}

function buildLinksCard(mount) {
  const links = [
    ["Latest posts", "/latest"],
    ["Top this week", "/top?period=weekly"],
    ["All categories", "/categories"],
    ["Leaderboard", "/leaderboard"],
  ];

  mount.append(
    el("div", { class: "bm-railcard" }, [
      el("h3", { text: "Quick links" }),
      el(
        "ul",
        {},
        links.map(([text, href]) =>
          el("li", {}, el("a", { href }, [renderIcon("arrow-right"), el("span", { text })]))
        )
      ),
    ])
  );
}

async function buildProfileCard(context, mount) {
  let currentUser = null;

  try {
    currentUser = context.api.getCurrentUser && context.api.getCurrentUser();
  } catch (error) {}

  if (!currentUser) {
    mount.append(
      el("div", { class: "bm-railcard bm-profilecard bm-profilecard--anon" }, [
        el("h3", { text: "Technocrats Community" }),
        el("p", {
          class: "bm-profile-cta",
          text: "Join to rate patterns, post, and climb the leaderboard.",
        }),
        el("a", { class: "bm-profile-join", href: "/signup", text: "Join" }),
        el("a", { class: "bm-profile-login", href: "/login", text: "Log in" }),
      ])
    );
    return;
  }

  const card = el("div", { class: "bm-railcard bm-profilecard" }, [
    el("a", { class: "bm-profile-head", href: `/u/${currentUser.username}` }, [
      el("img", {
        class: "bm-profile-avatar",
        src: avatar(currentUser.avatar_template, 96),
        alt: "",
      }),
      el("div", { class: "bm-profile-id" }, [
        el("div", { class: "bm-profile-name", text: currentUser.name || currentUser.username }),
        el("div", { class: "bm-profile-handle", text: `@${currentUser.username}` }),
      ]),
    ]),
    el("div", { class: "bm-profile-stats" }),
  ]);

  mount.append(card);

  try {
    const json = await (
      await fetch(`/u/${currentUser.username}/summary.json`, {
        headers: { Accept: "application/json" },
      })
    ).json();
    const summary = (json && json.user_summary) || {};
    const stats = [
      [summary.post_count || 0, "Posts"],
      [summary.likes_received || 0, "Likes"],
      [summary.days_visited || 0, "Days"],
    ];
    const wrap = card.querySelector(".bm-profile-stats");

    stats.forEach(([value, label]) => {
      wrap.append(
        el("div", { class: "bm-profile-stat", html: `<b>${num(value)}</b><span>${label}</span>` })
      );
    });
  } catch (error) {}
}

function attachFeedViewToggle(mount, feed) {
  const apply = (mode) => {
    feed.classList.toggle("is-grid", mode === "grid");
    head.querySelectorAll(".bm-viewtoggle button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });
    safeLocalStorageSet("bm-feed-view", mode);
  };

  const makeButton = (mode, label) => {
    const button = el("button", { type: "button", text: label });
    button.dataset.mode = mode;
    button.addEventListener("click", () => apply(mode));
    return button;
  };

  const head = mount.querySelector(".bm-section-head");
  const toggle = el("div", { class: "bm-viewtoggle" }, [
    makeButton("list", "List"),
    makeButton("grid", "Grid"),
  ]);

  head.append(toggle);
  apply(safeLocalStorageGet("bm-feed-view", "list"));
}

export {
  attachFeedViewToggle,
  buildFeedPostCard,
  buildLeaderboard,
  buildLinksCard,
  buildProfileCard,
  setupCards,
};
