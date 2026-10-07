import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";


const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));


test("Chinese and English interface dictionaries have matching keys", async () => {
  const source = await readFile(join(ROOT, "webapp", "i18n.js"), "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const { zh, en } = context.window.CAREER_I18N;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
});


test("every static interface translation key exists in both languages", async () => {
  const [html, source] = await Promise.all([
    readFile(join(ROOT, "webapp", "index.html"), "utf8"),
    readFile(join(ROOT, "webapp", "i18n.js"), "utf8"),
  ]);
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const keys = [...html.matchAll(/data-i18n(?:-html|-placeholder|-aria-label|-content)?="([^"]+)"/g)]
    .map(match => match[1]);
  for (const key of keys) {
    assert.ok(key in context.window.CAREER_I18N.zh, `missing Chinese translation: ${key}`);
    assert.ok(key in context.window.CAREER_I18N.en, `missing English translation: ${key}`);
  }
});
