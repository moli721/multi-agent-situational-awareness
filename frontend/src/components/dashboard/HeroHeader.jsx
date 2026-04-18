import React from "react";

import MetricCard from "./MetricCard.jsx";

function formatHeroMetric(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value <= 1) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
}

export default function HeroHeader({
  t,
  language,
  setLanguage,
  loadingSim,
  loadingExp,
  onRunSimulation,
  onRunExperiments,
  metricCards = []
}) {
  const heroMetrics = metricCards.slice(0, 4);

  return (
    <header className="hero-header card">
      <div className="hero-copy">
        <p className="hero-kicker">{t("hero.kicker")}</p>
        <h1>{t("header.title")}</h1>
        <p className="hero-subtitle">{t("header.subtitle")}</p>
        <p className="hero-endpoints">
          {t("header.endpoints", {
            frontend: "127.0.0.1:5173",
            backend: "127.0.0.1:8000"
          })}
        </p>
      </div>

      <div className="hero-control-cluster">
        <div className="hero-actions">
          <div className="lang-switch card-lite">
            <button
              className={`btn btn-sm ${language === "zh" ? "active" : ""}`}
              onClick={() => setLanguage("zh")}
            >
              {t("lang.zh")}
            </button>
            <button
              className={`btn btn-sm ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              {t("lang.en")}
            </button>
          </div>
          <button className="btn primary" onClick={onRunSimulation} disabled={loadingSim}>
            {loadingSim ? t("action.running") : t("action.runSimulation")}
          </button>
          <button className="btn" onClick={onRunExperiments} disabled={loadingExp}>
            {loadingExp ? t("action.running") : t("action.runExperiments")}
          </button>
        </div>

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
      </div>
    </header>
  );
}
