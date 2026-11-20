(function () {
  "use strict";

  const themeKey = "nitj-erp-theme";
  const themes = ["system", "light", "dark"];
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  let preference = "system";
  let storage;
  let select;

  function applyTheme(value) {
    preference = themes.includes(value) ? value : "system";
    const theme = preference === "system" ? (systemDark.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.nitjTheme = theme;
    if (select) select.value = preference;
  }

  function addSelector() {
    const label = document.createElement("label");
    label.className = "nitj-theme-switch";
    label.textContent = "Theme";
    select = document.createElement("select");
    for (const theme of themes) {
      select.add(new Option(theme[0].toUpperCase() + theme.slice(1), theme));
    }
    select.value = preference;
    select.addEventListener("change", () => {
      applyTheme(select.value);
      try {
        storage?.setItem(themeKey, preference);
      } catch {
        // The selection still applies to this page when storage is unavailable.
      }
    });
    label.append(select);

    const nav = document.querySelector(".navbar ul.navbar-nav.navbar-right")
      ?? document.querySelector(".navbar ul.navbar-nav");
    if (nav) {
      const item = document.createElement("li");
      item.append(label);
      nav.append(item);
      return;
    }

    const loginCard = document.querySelector(".login-card");
    const loginForm = loginCard?.querySelector("form");
    if (loginForm) loginForm.before(label);
    else if (loginCard) loginCard.append(label);
    else document.body.prepend(label);
  }

  function restoreTheme() {
    try {
      applyTheme(storage ? storage.getItem(themeKey) : preference);
    } catch {
      applyTheme(preference);
    }
  }

  function start() {
    try {
      storage = localStorage;
    } catch {
      // System and per-page selection work when the browser blocks storage.
    }
    restoreTheme();
    systemDark.addEventListener("change", () => applyTheme(preference));
    window.addEventListener("storage", (event) => {
      if (event.storageArea === storage && (event.key === themeKey || event.key === null)) {
        applyTheme(event.newValue);
      }
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) restoreTheme();
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", addSelector, { once: true });
    } else {
      addSelector();
    }
  }

  if (document.documentElement) {
    start();
  } else {
    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      observer.disconnect();
      start();
    });
    observer.observe(document, { childList: true });
  }
})();
