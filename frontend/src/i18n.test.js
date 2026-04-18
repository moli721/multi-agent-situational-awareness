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
  assert.equal(translate("en", "header.title"), "Multi-Agent Situational Awareness");
  assert.equal(
    translate("en", "header.endpoints", { frontend: "5173", backend: "8000" }),
    "Frontend: 5173; Backend API: 8000."
  );
});

test("translate exposes new command stage copy", () => {
  assert.equal(translate("en", "hero.kicker"), "MAS Research Console");
  assert.equal(translate("en", "stage.kicker"), "Simulation Stage");
  assert.equal(translate("en", "deck.title"), "Experiment Deck");
  assert.equal(translate("en", "insight.liveTitle"), "Live Insights");
  assert.equal(translate("en", "timeline.kicker"), "Timeline Strip");
  assert.equal(translate("en", "controlRail.kicker"), "Control Rail");
});
