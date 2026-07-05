import { createThemeContext, isFeedRoute, isHomeRoute, query, registerEnhancer, toggleClass } from "./helpers";

function applyTopicPageState(context) {
  toggleClass(
    document.body,
    "als-topic-page",
    !isFeedRoute(context.router) &&
      !isHomeRoute(context.router) &&
      !!query(".topic-post, #topic-title")
  );
}

function setupTopicPage(api) {
  const context = createThemeContext(api);
  registerEnhancer("topic-page", () => applyTopicPageState(context));
}

export { setupTopicPage };
