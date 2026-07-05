import { createThemeContext, registerEnhancer } from "./helpers";

function applyBranding(context) {
  try {
    const root = document.documentElement;
    root.dataset.mode = "dark";

    if (context.cfg.brand_wordmark) {
      root.style.setProperty("--bm-wordmark", JSON.stringify(context.cfg.brand_wordmark));
    }

    if (context.cfg.brand_tagline) {
      root.style.setProperty("--bm-tagline", JSON.stringify(context.cfg.brand_tagline));
    }
  } catch (error) {}
}

function setupHeader(api) {
  const context = createThemeContext(api);
  registerEnhancer("header", () => applyBranding(context));
}

export { setupHeader };
