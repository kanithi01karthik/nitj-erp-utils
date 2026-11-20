import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const script = readFileSync(new URL("../packages/content/darkmode.js", import.meta.url), "utf8");

function startTheme(getItem, matches = true) {
  const documentElement = { dataset: {} };
  const preferences = new EventTarget();
  const window = new EventTarget();
  const storage = { getItem };
  preferences.matches = matches;
  runInNewContext(script, {
    document: { documentElement, readyState: "loading", addEventListener() {} },
    localStorage: storage,
    matchMedia: () => preferences,
    window,
  });
  return {
    theme: () => documentElement.dataset.nitjTheme,
    systemChangesTo(matches) {
      preferences.matches = matches;
      preferences.dispatchEvent(new Event("change"));
    },
    storageChangesTo(newValue, key = "nitj-erp-theme", storageArea = storage) {
      window.dispatchEvent(Object.assign(new Event("storage"), { key, newValue, storageArea }));
    },
  };
}

test("applies a saved theme before the UI mounts and updates across tabs", () => {
  const page = startTheme((key) => {
    assert.equal(key, "nitj-erp-theme");
    return "light";
  });
  assert.equal(page.theme(), "light");
  page.storageChangesTo("dark", "nitj-att-calendar-view");
  page.storageChangesTo("dark", "nitj-erp-theme", {});
  assert.equal(page.theme(), "light");
  page.storageChangesTo("dark");
  assert.equal(page.theme(), "dark");
  page.systemChangesTo(false);
  assert.equal(page.theme(), "dark");
  page.storageChangesTo(null, null);
  assert.equal(page.theme(), "light");
  page.systemChangesTo(true);
  assert.equal(page.theme(), "dark");
});

test("defaults to System when storage is empty, invalid, or unavailable", () => {
  for (const getItem of [() => null, () => "sepia", () => { throw new Error("Storage is blocked"); }]) {
    const page = startTheme(getItem, false);
    assert.equal(page.theme(), "light");
    page.systemChangesTo(true);
    assert.equal(page.theme(), "dark");
  }
});
