import React, { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Clock,
  Gavel,
  Scale,
  Calendar,
  UploadCloud,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  User,
  Shield,
  PlusCircle,
  Hash,
  CheckCircle2
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import { CASE_STATUS_LABELS_PK } from "../contractAbi";

/**
 * @component RegisteredCasesList
 * @description National Master Court Registry & Daily Cause List (فہرستِ مقدّمات و کاز لسٹ).
 * Fully interactive with clickable cards, instant workflow transitions, and live court statistics.
 */
export default function RegisteredCasesList({
  cases = [],
  onSelectCase,
  onNavigateToTab
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("GRID"); // 'GRID' or 'TABLE'

  // Filter cases based on search term and selected status
  const filteredCases = cases.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(q) ||
      c.caseId.toString().includes(q) ||
      c.caseType.toLowerCase().includes(q) ||
      (c.assignedJudge && c.assignedJudge.toLowerCase().includes(q)) ||
      (c.plaintiffLawyer && c.plaintiffLawyer.toLowerCase().includes(q)) ||
      (c.defendantLawyer && c.defendantLawyer.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // High-level court statistics
  const totalCount = cases.length;
  const underTrialCount = cases.filter((c) => c.status === "UNDER_TRIAL").length;
  const filedCount = cases.filter((c) => c.status === "FILED").length;
  const disposedCount = cases.filter((c) => c.status === "DISPOSED").length;

  /**
   * Dispatches case selection and navigates to the target workflow tab safely.
   */
  const handleAction = (e, caseId, targetTab) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    onSelectCase(caseId);
    if (onNavigateToTab) {
      onNavigateToTab(targetTab);
    }
  };

  const getCategoryClass = (type = "") => {
    const t = type.toUpperCase();
    if (t.includes("CRIM")) return "category-criminal";
    if (t.includes("CONST")) return "category-const";
    if (t.includes("FAM")) return "category-family";
    return "category-civil";
  };

  return (
    <div className="cause-list-container">
      {/* Interactive Clickable Metrics Row */}
      <div className="metrics-grid">
        {/* Metric 1: Total Cases */}
        <div
          className={`metric-card ${statusFilter === "ALL" ? "active" : ""}`}
          onClick={() => setStatusFilter("ALL")}
          title="Click to view all registered dockets across Pakistan"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("ALL");
          }}
        >
          <div className="metric-header">
            <span className="metric-label">All Dockets (کل مقدمات)</span>
            <Scale size={24} className="metric-icon total" />
          </div>
          <div className="metric-value">{totalCount}</div>
          <div className="metric-subtext">Click to filter all cases</div>
        </div>

        {/* Metric 2: Newly Filed */}
        <div
          className={`metric-card ${statusFilter === "FILED" ? "active" : ""}`}
          onClick={() => setStatusFilter("FILED")}
          title="Click to filter newly instituted cases awaiting initial hearing"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("FILED");
          }}
        >
          <div className="metric-header">
            <span className="metric-label">Newly Filed (درخواست دائر)</span>
            <FileText size={24} className="metric-icon filed" />
          </div>
          <div className="metric-value">{filedCount}</div>
          <div className="metric-subtext">Awaiting initial court session</div>
        </div>

        {/* Metric 3: Under Active Trial */}
        <div
          className={`metric-card ${statusFilter === "UNDER_TRIAL" ? "active" : ""}`}
          onClick={() => setStatusFilter("UNDER_TRIAL")}
          title="Click to filter cases currently undergoing active trial hearings"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("UNDER_TRIAL");
          }}
        >
          <div className="metric-header">
            <span className="metric-label">Under Trial (زیر سماعت)</span>
            <Clock size={24} className="metric-icon trial" />
          </div>
          <div className="metric-value">{underTrialCount}</div>
          <div className="metric-subtext">Active hearings & evidence</div>
        </div>

        {/* Metric 4: Disposed & Sealed */}
        <div
          className={`metric-card ${statusFilter === "DISPOSED" ? "active" : ""}`}
          onClick={() => setStatusFilter("DISPOSED")}
          title="Click to filter resolved cases sealed with final binding judgment"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("DISPOSED");
          }}
        >
          <div className="metric-header">
            <span className="metric-label">Disposed (فیصلہ شدہ)</span>
            <Gavel size={24} className="metric-icon disposed" />
          </div>
          <div className="metric-value">{disposedCount}</div>
          <div className="metric-subtext">Sealed permanent record</div>
        </div>
      </div>

      {/* Main Cause List Section */}
      <div className="card cause-list-card">
        {/* Controls Toolbar */}
        <div className="cause-list-toolbar">
          <div className="cause-list-title-box">
            <div className="cause-list-title-header">
              <h2 className="card-title">
                <FileText size={24} color="var(--pk-emerald)" />
                <span>National Daily Cause List (کاز لسٹ و جملہ مقدمات)</span>
                <InfoTooltip
                  title="Daily Cause List & Master Registry"
                  whatItDoes="Allows judicial personnel, attorneys, and citizens to search, filter, and open every court docket registered on the blockchain."
                  procedure="Under High Court Rules and the Civil Courts Ordinance, the Daily Cause List schedules the roster of matters fixed for trial."
                  blockchain="Queried directly from the immutable totalRegisteredCases() counter. Zero risk of missing dockets or secretly altered records."
                />
              </h2>
              <button
                type="button"
                className="btn btn-primary file-new-case-btn"
                onClick={() => onNavigateToTab && onNavigateToTab("REGISTER")}
                title="Open Case Filing Office (Ahlmad Portal)"
              >
                <PlusCircle size={15} />
                <span>File New Docket (نئی درخواست)</span>
              </button>
            </div>
            <p className="card-description">
              Click anywhere on a card to inspect its full order sheet & evidence vault, or use the quick buttons for direct judicial actions.
            </p>
          </div>

          <div className="cause-list-actions-box">
            {/* Search Input */}
            <div className="search-box-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search Title, Misal #, Judge, or Category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                title="Search dockets by title, docket number, legal category, or address"
              />
            </div>

            {/* Status Dropdown */}
            <div className="filter-select-wrapper">
              <Filter size={16} color="#64748b" />
              <select
                className="form-select filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                title="Filter court dockets by procedural stage"
              >
                <option value="ALL">All Statuses (تمام نوعیت)</option>
                <option value="FILED">FILED (درخواست دائر)</option>
                <option value="UNDER_TRIAL">UNDER TRIAL (زیر سماعت)</option>
                <option value="AWAITING_VERDICT">AWAITING VERDICT (برائے فیصلہ)</option>
                <option value="DISPOSED">DISPOSED (فیصلہ شدہ)</option>
              </select>
            </div>

            {/* Grid vs Table View Mode Switcher */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`toggle-btn ${viewMode === "GRID" ? "active" : ""}`}
                onClick={() => setViewMode("GRID")}
                title="Cards Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`toggle-btn ${viewMode === "TABLE" ? "active" : ""}`}
                onClick={() => setViewMode("TABLE")}
                title="Tabular List View"
                aria-label="Table View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body: Grid vs Table */}
        {filteredCases.length === 0 ? (
          <div className="empty-cases-state">
            <FileText size={48} className="empty-icon" />
            <h4>No Court Dockets Match Your Criteria</h4>
            <p>
              {searchTerm || statusFilter !== "ALL"
                ? "Try clearing your search query or status filter to see other registered cases."
                : "No dockets have been registered yet. Use the Dakhil-e-Daftar tab to file a new case."}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
              onClick={() => onNavigateToTab && onNavigateToTab("REGISTER")}
            >
              <PlusCircle size={15} /> File First Court Docket
            </button>
          </div>
        ) : viewMode === "GRID" ? (
          /* ULTRA-MODERN CLICKABLE CASE CARDS GRID */
          <div className="cases-cards-grid">
            {filteredCases.map((c) => (
              <div
                key={c.caseId}
                className="case-card-item modern-clickable-card"
                onClick={(e) => handleAction(e, c.caseId, "TIMELINE")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleAction(e, c.caseId, "TIMELINE");
                  }
                }}
                title="Click anywhere to inspect complete order sheet, hearings, and evidence for this docket"
              >
                {/* Top Ambient Glow Strip */}
                <div className="case-card-accent-bar" />

                {/* Card Top: Misal #, Category & Status */}
                <div className="case-card-top">
                  <div className="case-docket-group">
                    <span className="case-docket-badge">
                      <Hash size={12} />
                      MISAL #{c.caseId}
                    </span>
                    <span className={`case-category-tag ${getCategoryClass(c.caseType)}`}>
                      {c.caseType}
                    </span>
                  </div>

                  <span className={`status-badge ${c.status}`}>
                    <span className="status-indicator-dot" />
                    {CASE_STATUS_LABELS_PK[c.status] || c.status}
                  </span>
                </div>

                {/* Case Caption / Title */}
                <h3 className="case-card-title" title={c.title}>
                  {c.title}
                </h3>

                {/* Personnel Details */}
                <div className="case-card-officers">
                  <div className="officer-line">
                    <Gavel size={14} className="officer-icon judge" />
                    <span className="officer-role-name">Fazil Adalat (Judge):</span>
                    <code>
                      {c.assignedJudge
                        ? `${c.assignedJudge.substring(0, 8)}...${c.assignedJudge.substring(c.assignedJudge.length - 4)}`
                        : "Unassigned"}
                    </code>
                  </div>

                  <div className="officer-line">
                    <User size={14} className="officer-icon petitioner" />
                    <span className="officer-role-name">Wakeel Mudai:</span>
                    <code>
                      {c.plaintiffLawyer
                        ? `${c.plaintiffLawyer.substring(0, 8)}...`
                        : "State / None"}
                    </code>
                  </div>

                  <div className="officer-line">
                    <Shield size={14} className="officer-icon defense" />
                    <span className="officer-role-name">Wakeel Mudda Alaih:</span>
                    <code>
                      {c.defendantLawyer
                        ? `${c.defendantLawyer.substring(0, 8)}...`
                        : "State / None"}
                    </code>
                  </div>
                </div>

                {/* Card Footer: Filing Date, Hint, & Quick Actions */}
                <div className="case-card-footer">
                  <div className="case-footer-meta">
                    <span className="case-filing-date">
                      Filed: {new Date(Number(c.createdAt) * 1000).toLocaleDateString()}
                    </span>
                    <span className="view-dossier-hint">
                      View Order Sheet <ArrowRight size={12} />
                    </span>
                  </div>

                  <div className="case-quick-actions" onClick={(e) => e.stopPropagation()}>
                    {/* Action 1: Add Evidence */}
                    {c.status !== "DISPOSED" && (
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={(e) => handleAction(e, c.caseId, "EVIDENCE")}
                        title="Submit new evidence exhibit for this case (Saboot)"
                      >
                        <UploadCloud size={13} />
                        Evidence
                      </button>
                    )}

                    {/* Action 2: Schedule Hearing */}
                    {c.status !== "DISPOSED" && (
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={(e) => handleAction(e, c.caseId, "HEARING")}
                        title="Schedule hearing and log bench minutes for this case (Peshi)"
                      >
                        <Calendar size={13} />
                        Hearing
                      </button>
                    )}

                    {/* Action 3: Final Verdict */}
                    {c.status !== "DISPOSED" && (
                      <button
                        type="button"
                        className="quick-action-btn verdict"
                        onClick={(e) => handleAction(e, c.caseId, "VERDICT")}
                        title="Pronounce final judgment and seal this case (Faisla)"
                      >
                        <Gavel size={13} />
                        Verdict
                      </button>
                    )}

                    {/* Action 4: View Order Sheet */}
                    <button
                      type="button"
                      className="quick-action-btn primary"
                      onClick={(e) => handleAction(e, c.caseId, "TIMELINE")}
                      title="View complete chronological order sheet & cryptographic proof trail"
                    >
                      <Eye size={13} />
                      Dossier
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TABULAR LIST VIEW */
          <div className="cause-list-table-wrapper">
            <table className="cause-list-table">
              <thead>
                <tr>
                  <th>Misal #</th>
                  <th>Case Caption / Title</th>
                  <th>Legal Category</th>
                  <th>Presiding Magistrate</th>
                  <th>Status (حیثیت)</th>
                  <th>Filing Date</th>
                  <th style={{ textAlign: "center" }}>Quick Judicial Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr
                    key={c.caseId}
                    className="clickable-table-row"
                    onClick={(e) => handleAction(e, c.caseId, "TIMELINE")}
                    title="Click row to open complete case order sheet"
                  >
                    <td className="row-case-id">
                      <span className="table-misal-badge">#{c.caseId}</span>
                    </td>
                    <td className="row-case-title">{c.title}</td>
                    <td className="row-case-type">
                      <span className={`case-category-tag ${getCategoryClass(c.caseType)}`}>
                        {c.caseType}
                      </span>
                    </td>
                    <td>
                      <code>
                        {c.assignedJudge ? `${c.assignedJudge.substring(0, 8)}...` : "None"}
                      </code>
                    </td>
                    <td>
                      <span className={`status-badge ${c.status}`}>
                        {CASE_STATUS_LABELS_PK[c.status] || c.status}
                      </span>
                    </td>
                    <td className="row-date">
                      {new Date(Number(c.createdAt) * 1000).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="quick-action-btn primary"
                          onClick={(e) => handleAction(e, c.caseId, "TIMELINE")}
                          title="Open Order Sheet"
                        >
                          <Eye size={12} /> Dossier
                        </button>
                        {c.status !== "DISPOSED" && (
                          <>
                            <button
                              type="button"
                              className="quick-action-btn"
                              onClick={(e) => handleAction(e, c.caseId, "EVIDENCE")}
                              title="Add Evidence"
                            >
                              <UploadCloud size={12} />
                            </button>
                            <button
                              type="button"
                              className="quick-action-btn"
                              onClick={(e) => handleAction(e, c.caseId, "HEARING")}
                              title="Schedule Hearing"
                            >
                              <Calendar size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
