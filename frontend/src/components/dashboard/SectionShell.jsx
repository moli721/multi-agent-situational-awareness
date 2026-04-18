import React from "react";

export default function SectionShell({
  label,
  title,
  actions = null,
  className = "",
  bodyClassName = "",
  children
}) {
  return (
    <section className={`section-shell ${className}`.trim()}>
      <div className="section-shell-header">
        <div className="section-shell-copy">
          {label ? <p className="section-shell-label">{label}</p> : null}
          <h3>{title}</h3>
        </div>
        {actions ? <div className="section-shell-actions">{actions}</div> : null}
      </div>
      <div className={`section-shell-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
