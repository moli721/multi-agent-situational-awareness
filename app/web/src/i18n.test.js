import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  resolveInitialLanguage,
  translate
} from "./i18n.js";

test("normalizeLanguage keeps only zh or en", () => {
  assert.equal(normalizeLanguage("zh"), "zh");
  assert.equal(normalizeLanguage("en-US"), "en");
  assert.equal(normalizeLanguage("english"), DEFAULT_LANGUAGE);
});

test("resolveInitialLanguage defaults to zh when no saved value exists", () => {
  assert.equal(resolveInitialLanguage(undefined), "zh");
  assert.equal(resolveInitialLanguage(""), "zh");
  assert.equal(resolveInitialLanguage("en"), "en");
});

test("translate resolves keys and interpolates vars", () => {
  assert.equal(translate("zh", "header.title"), "多智能体态势感知平台");
  assert.equal(translate("en", "header.title"), "Multi-Agent Situational Awareness");
  assert.equal(
    translate("zh", "header.endpoints", { frontend: "5173", backend: "8000" }),
    "前端入口：5173；后端 API：8000。"
  );
});
