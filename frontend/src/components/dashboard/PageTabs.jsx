import React from "react";

const PAGES = ["simulation", "analysis"];

export default function PageTabs({ t, currentPage, onChange }) {
  return (
    <div className="page-tabs card-lite" role="tablist" aria-label={t("page.navigation")}>
      {PAGES.map((page) => (
        <button
          key={page}
          type="button"
          role="tab"
          aria-selected={currentPage === page}
          className={`btn btn-sm page-tab ${currentPage === page ? "active" : ""}`}
          onClick={() => onChange(page)}
        >
          {t(`page.${page}`)}
        </button>
      ))}
    </div>
  );
}
