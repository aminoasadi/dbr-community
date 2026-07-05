import { createThemeContext, queryAll, registerEnhancer } from "./helpers";

function applyComposerShell() {
  queryAll(".composer-popup, .d-editor-container, .composer-controls, .d-editor-button-bar").forEach(
    (node) => {
      node.classList.add("als-composer-shell");
    }
  );
}

function setupComposer(api) {
  createThemeContext(api);
  registerEnhancer("composer", () => applyComposerShell());
}

export { setupComposer };
