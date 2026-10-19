// Apenas preferências visuais. Não lê chats, cookies, tokens ou mensagens.
(() => {
  const STYLE_ID = "wwc-visual-preferences";
  const defaults = { theme: "original", density: "comfortable", fontScale: "normal" };
  function apply(settings) {
    const s = { ...defaults, ...(settings || {}) };
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    const parts = [];
    if (s.theme === "slate") {
      parts.push("html #app { filter: saturate(.80) !important; }");
    }
    if (s.theme === "soft") {
      parts.push("html #app { filter: saturate(.88) contrast(.96) !important; }");
    }
    if (s.fontScale === "large") {
      parts.push("html #app { font-size: 105% !important; }");
    }
    if (s.density === "compact") {
      parts.push('html #pane-side [role="row"] { min-height: 48px !important; }');
    }
    style.textContent = parts.join("\n");
  }
  chrome.storage.local.get({ settings: defaults }).then(({ settings }) => apply(settings))
    .catch(() => apply(defaults));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings) apply(changes.settings.newValue);
  });
})();
