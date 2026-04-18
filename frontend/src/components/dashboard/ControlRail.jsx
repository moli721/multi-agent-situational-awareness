import React from "react";

export default function ControlRail({
  t,
  config,
  runs,
  history,
  safeFrameIndex,
  strategyOptions,
  strategyLabel,
  fieldGroups,
  showVision,
  showTrails,
  showLabels,
  trailLength,
  onUpdateField,
  onUpdateSelectField,
  onRunsChange,
  onShowVisionChange,
  onShowTrailsChange,
  onShowLabelsChange,
  onTrailLengthChange,
  onFrameIndexChange
}) {
  return (
    <aside className="control-rail card">
      <div className="rail-heading">
        <p className="section-shell-label">{t("controlRail.kicker")}</p>
        <h2>{t("sidebar.configuration")}</h2>
      </div>

      <label className="check-line">
        <span>{t("sidebar.enableCommunication")}</span>
        <input
          type="checkbox"
          checked={config.enable_communication}
          onChange={(e) => onUpdateField("enable_communication", e.target.checked, true)}
        />
      </label>

      <label className="field">
        <span>{t("sidebar.decisionStrategy")}</span>
        <select
          value={config.decision_strategy}
          onChange={(e) => onUpdateSelectField("decision_strategy", e.target.value)}
        >
          {strategyOptions.map((value) => (
            <option key={value} value={value}>
              {strategyLabel(value)}
            </option>
          ))}
        </select>
      </label>

      {fieldGroups.map((group) => (
        <section key={group.titleKey} className="group">
          <h3>{t(group.titleKey)}</h3>
          {group.fields.map(([key, type, min, max, step]) => (
            <label key={key} className="field">
              <span>{t(`field.${key}`)}</span>
              <input
                type={type}
                min={min}
                max={max}
                step={step}
                value={config[key]}
                onChange={(e) => onUpdateField(key, e.target.value)}
              />
            </label>
          ))}
        </section>
      ))}

      <section className="group">
        <h3>{t("sidebar.experiment")}</h3>
        <label className="field">
          <span>{t("sidebar.monteCarloRuns")}</span>
          <input
            type="number"
            min={3}
            max={120}
            step={1}
            value={runs}
            onChange={(e) => onRunsChange(Number(e.target.value))}
          />
        </label>
      </section>

      <section className="group">
        <h3>{t("sidebar.mapLayers")}</h3>
        <label className="check-line">
          <span>{t("sidebar.showVision")}</span>
          <input
            type="checkbox"
            checked={showVision}
            onChange={(e) => onShowVisionChange(e.target.checked)}
          />
        </label>
        <label className="check-line">
          <span>{t("sidebar.showTrails")}</span>
          <input
            type="checkbox"
            checked={showTrails}
            onChange={(e) => onShowTrailsChange(e.target.checked)}
          />
        </label>
        <label className="check-line">
          <span>{t("sidebar.showLabels")}</span>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => onShowLabelsChange(e.target.checked)}
          />
        </label>
        <label className="field">
          <span>{t("sidebar.trailLength")}</span>
          <input
            type="number"
            min={4}
            max={500}
            step={1}
            value={trailLength}
            onChange={(e) => onTrailLengthChange(Number(e.target.value))}
          />
        </label>
        {history.length > 0 ? (
          <label className="field">
            <span>{t("sidebar.frame")}</span>
            <input
              type="number"
              min={0}
              max={Math.max(0, history.length - 1)}
              step={1}
              value={safeFrameIndex}
              onChange={(e) => onFrameIndexChange(Number(e.target.value))}
            />
          </label>
        ) : null}
      </section>
    </aside>
  );
}
