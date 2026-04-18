import React from "react";

import MetricCard from "./MetricCard.jsx";
import PageTabs from "./PageTabs.jsx";

function formatHeroMetric(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value <= 1) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
}

export default function HeroHeader({
  t,
  language,
  setLanguage,
  currentPage,
  onPageChange,
  loadingSim,
  loadingExp,
  onRunSimulation,
  onRunExperiments,
  metricCards = []
}) {
  const heroMetrics = metricCards.slice(0, 4);
  const frontendHost =
    typeof window !== "undefined" && window.location?.host
      ? window.location.host
      : "127.0.0.1:5173";

  return (
    <header className="hero-header card">
      <div className="hero-copy">
        <p className="hero-kicker">{t("hero.kicker")}</p>
        <h1>{t("header.title")}</h1>
        <p className="hero-subtitle">{t("header.subtitle")}</p>
        <p className="hero-endpoints">
          {t("header.endpoints", {
            frontend: frontendHost,
            backend: "127.0.0.1:8000"
          })}
        </p>
      </div>

      <div className="hero-control-cluster">
        <div className="hero-topbar">
          <PageTabs t={t} currentPage={currentPage} onChange={onPageChange} />

          <div className="lang-switch card-lite">
            <button
              className={`btn language-tab ${language === "zh" ? "active" : ""}`}
              onClick={() => setLanguage("zh")}
            >
              {t("lang.zh")}
            </button>
            <button
              className={`btn language-tab ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              {t("lang.en")}
            </button>
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn primary" onClick={onRunSimulation} disabled={loadingSim}>
            {loadingSim ? t("action.running") : t("action.runSimulation")}
          </button>
          <button className="btn" onClick={onRunExperiments} disabled={loadingExp}>
            {loadingExp ? t("action.running") : t("action.runExperiments")}
          </button>
        </div>

        {heroMetrics.length > 0 ? (
          <div className="hero-metrics">
            {heroMetrics.map(([label, value], idx) => (
              <MetricCard
                key={`${label}-${idx}`}
                label={label}
                value={formatHeroMetric(value)}
                tone={idx === 0 ? "accent" : "default"}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="hero-note card-lite">{t("hero.metricHint")}</div>
        )}
      </div>
    </header>
  );
}
