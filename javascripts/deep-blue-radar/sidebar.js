import { ensureObserver } from "./animations";
import { query, registerEnhancer } from "./helpers";

function setText(link, text) {
  const target = link && link.querySelector(".sidebar-section-link-content-text");

  if (target && target.textContent.trim() !== text) {
    target.textContent = text;
  }
}

function cleanSidebar() {
  const home = query(
    '.sidebar-section[data-section-name="community"] .sidebar-section-link[data-link-name="everything"]'
  );

  if (home) {
    setText(home, "House Home");
    if (home.getAttribute("href") !== "/") {
      home.setAttribute("href", "/");
    }
  }

  setText(
    query(
      '.sidebar-section[data-section-name="community"] .sidebar-section-link[data-link-name="upcoming-events"]'
    ),
    "Events"
  );

  const categoryHeader = query(
    '.sidebar-section[data-section-name="categories"] .sidebar-section-header-text'
  );

  if (categoryHeader && categoryHeader.textContent.trim() !== "Collections & Spaces") {
    categoryHeader.textContent = "Collections & Spaces";
  }

  const community = query('.sidebar-section[data-section-name="community"]');

  if (community) {
    community
      .querySelectorAll(".sidebar-section-link-wrapper, button, a, summary")
      .forEach((element) => {
        if (/^more$/i.test((element.textContent || "").trim())) {
          const wrapper = element.closest(".sidebar-section-link-wrapper") || element;
          wrapper.style.display = "none";
        }
      });
  }
}

function watchSidebar() {
  const wrap = query(".sidebar-wrapper, #d-sidebar");
  ensureObserver("sidebar", wrap, () => cleanSidebar(), {
    childList: true,
    subtree: true,
  });
}

function setupSidebar(api) {
  registerEnhancer("sidebar", () => {
    cleanSidebar();
    watchSidebar();
  });
}

export { setupSidebar };
