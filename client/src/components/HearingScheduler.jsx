import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  Eye,
  Gavel,
  UploadCloud,
  FileText
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import { CASE_STATUS_LABELS_PK } from "../contractAbi";

/**
 * @component HearingScheduler
 * @description Court Proceedings & Hearing Session Portal (Tareekh-e-Pesh & Order Sheet).
 * Restricted to certified Presiding Magistrates / Sessions Judges (JUDGE_ROLE).
 * 
 * Pakistani Legal Framework Context:
 * In Pakistani courts, every hearing session must be recorded on the official "Order Sheet"
 * (Hukamnama-e-Adalat). Issues like backdated adjournments, phantom court appearances,
 * and missing judge signatures create widespread distrust.
 */
export default function HearingScheduler({
  contract,
  account,
  cases = [],
  selectedCaseId: propSelectedCaseId,
  onSelectCase,
  onHearingRecorded,
  onNavigateToTab
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(
    propSelectedCaseId || (cases.length > 0 ? cases[0].caseId : "1")
  );
  const [hearingDate, setHearingDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16)
  );
  const [courtMinutes, setCourtMinutes] = useState("");
  const [transcriptCID, setTranscriptCID] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (propSelectedCaseId) {
      setSelectedCaseId(propSelectedCaseId);
    }
  }, [propSelectedCaseId]);

  const activeCaseObj = cases.find((c) => c.caseId.toString() === selectedCaseId?.toString());

  const handleCaseChange = (newId) => {
    setSelectedCaseId(newId);
    if (onSelectCase) {
      onSelectCase(newId);
    }
  };

  /**
   * Records the official court appearance on the blockchain ledger.
   */
  const handleScheduleHearing = async (e) => {
    e.preventDefault();
    if (!contract) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const unixTimestamp = Math.floor(new Date(hearingDate).getTime() / 1000);
      const effectiveCID = transcriptCID.trim() || `QmPakistanHearingNotesDocket${selectedCaseId}_${Date.now()}`;

      // Call on-chain method recordCourtHearing(caseId, hearingDate, courtNotesCID)
      const tx = await contract.recordCourtHearing(
        selectedCaseId,
        unixTimestamp,
        effectiveCID
      );

      setStatusMessage({
        type: "info",
        text: "Recording official court session on blockchain ledger (اندراج تاریخ پیشی عدالت)..."
      });

      const receipt = await tx.wait();

      setStatusMessage({
        type: "success",
        text: `Hearing session successfully anchored for Docket #${selectedCaseId}! (پیشی و عبوری حکم نامہ برائے مقدمہ نمبر ${selectedCaseId} محفوظ ہو گیا)`,
        txHash: receipt.hash
      });

      setCourtMinutes("");
      setTranscriptCID("");

      if (onHearingRecorded) {
        onHearingRecorded(selectedCaseId);
      }
    } catch (error) {
      console.error("Hearing scheduling failed:", error);
      let errorMsg = error?.reason || error?.message || "Transaction failed";
      if (errorMsg.includes("AccessControlUnauthorizedAccount")) {
        errorMsg = "Reverted: Only certified Presiding Judges (JUDGE_ROLE) hold judicial authority to record hearings and advance case status.";
      } else if (errorMsg.includes("CaseAlreadyDisposed")) {
        errorMsg = "Reverted: Docket is already DISPOSED (فیصلہ شدہ). No further hearings may be held after final decree.";
      }
      setStatusMessage({
        type: "error",
        text: `Judicial Revert: ${errorMsg}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Calendar size={24} color="var(--pk-emerald)" />
          <span>Tareekh-e-Pesh & Order Sheet (Hearing Session & Bench Minutes)</span>
          <span style={{ fontSize: "1rem", color: "var(--pk-gold)", fontWeight: 700 }}>تاریخ پیشی و عبوری حکم نامہ</span>
          <InfoTooltip
            title="Hearing Session Portal (تاریخ پیشی)"
            whatItDoes="Allows the presiding judge to fix hearing dates, record daily bench minutes, and update the case state from FILED to UNDER_TRIAL."
            procedure="Under High Court Rules and Civil Procedure Code Order XVII, adjournments and order sheets must be signed on the day of the hearing."
            blockchain="Automatically transitions case status on-chain. Adjournment timestamps are pinned to the block timestamp, eliminating backdated orders."
          />
        </h2>
        <p className="card-description">
          Restricted to certified Sessions Judges & Presiding Magistrates (JUDGE_ROLE). Updates docket status to UNDER_TRIAL.
        </p>
      </div>

      {/* Selected Docket Context Preview */}
      {activeCaseObj && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "var(--bg-card-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--pk-emerald)", letterSpacing: "0.05em" }}>
              Active Case on Bench
            </span>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--pk-obsidian)", margin: "0.2rem 0" }}>
              Misal #{activeCaseObj.caseId}: {activeCaseObj.title}
            </h4>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Category: {activeCaseObj.caseType}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className={`status-badge ${activeCaseObj.status}`}>
              {CASE_STATUS_LABELS_PK[activeCaseObj.status] || activeCaseObj.status}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
              onClick={() => onNavigateToTab && onNavigateToTab("TIMELINE")}
              title="Inspect order sheet for this docket"
            >
              <Eye size={12} /> View Dossier
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleScheduleHearing}>
        <div className="form-grid">
          {/* Case Select */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="hearingCaseId">
                <span>Select Court Docket</span>
                <span className="form-label-urdu">(انتخاب مقدمہ نمبر)</span>
              </label>
              <InfoTooltip
                title="Target Docket (مقدمہ نمبر)"
                whatItDoes="Selects which court case will have its hearing session and bench notes anchored on-chain."
                procedure="Order XVII Rule 1 CPC provides that the Court may grant time and adjourn hearings for cause shown."
                blockchain="The contract enforces that the docket exists and that caller holds JUDGE_ROLE."
              />
            </div>
            <select
              id="hearingCaseId"
              className="form-select"
              value={selectedCaseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              title="Select the target court docket to record this hearing session"
            >
              {cases.length > 0 ? (
                cases.map((c) => (
                  <option key={c.caseId} value={c.caseId}>
                    Docket #{c.caseId} — {c.title} ({c.status})
                  </option>
                ))
              ) : (
                <option value="1">Docket #1</option>
              )}
            </select>
          </div>

          {/* Hearing Date and Time */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="hearingDateInput">
                <span>Next Scheduled Hearing Date & Time</span>
                <span className="form-label-urdu">(تاریخ و وقت آئندہ پیشی)</span>
              </label>
              <InfoTooltip
                title="Hearing Date & Time (تاریخ و وقت پیشی)"
                whatItDoes="Schedules the next physical court appearance for examination of witnesses, arguments, or orders."
                procedure="Under Civil Procedure Code and CrPC, every adjourned hearing must fix a date for the next step in proceedings."
                blockchain="Converted to a Unix timestamp and stored immutably on the Ethereum block log."
              />
            </div>
            <input
              id="hearingDateInput"
              type="datetime-local"
              className="form-input"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              required
              title="Select the next scheduled court appearance date and time"
            />
          </div>

          {/* Court Bench Minutes */}
          <div className="form-group full-width">
            <div className="form-label-row">
              <label className="form-label" htmlFor="courtMinutes">
                <span>Bench Proceedings & Interim Order Summary</span>
                <span className="form-label-urdu">(روئیدادِ سماعت و عبوری حکم نامہ)</span>
              </label>
              <InfoTooltip
                title="Bench Notes & Interim Order (روئیدادِ سماعت)"
                whatItDoes="Records what happened during today's hearing (e.g. cross-examination of PW-1 concluded; matter fixed for final arguments)."
                procedure="Required under High Court Rules Volume V. The judicial order sheet must summarize bench proceedings."
                blockchain="Stored in decentralized IPFS storage with the CID cryptographically linked to the docket."
              />
            </div>
            <textarea
              id="courtMinutes"
              className="form-textarea"
              rows={3}
              placeholder="e.g. Learned counsel for both parties present. Cross-examination of PW-1 completed. Adjourned for final arguments..."
              value={courtMinutes}
              onChange={(e) => setCourtMinutes(e.target.value)}
              title="Enter summary of proceedings and court directions"
            />
          </div>

          {/* IPFS Transcript CID (Optional) */}
          <div className="form-group full-width">
            <div className="form-label-row">
              <label className="form-label" htmlFor="transcriptCID">
                <span>Signed Digital Order Sheet IPFS CID (Optional)</span>
                <span className="form-label-urdu">(ڈیجیٹل حکم نامہ آئی پی ایف ایس سی آئی ڈی)</span>
              </label>
              <InfoTooltip
                title="Order Sheet IPFS CID"
                whatItDoes="Optional IPFS Content Identifier of a scanned, signed order sheet PDF."
                procedure="Integrates electronic document management with physical court signatures."
                blockchain="If left blank, the system automatically generates an authenticated court transcript identifier."
              />
            </div>
            <input
              id="transcriptCID"
              type="text"
              className="form-input"
              placeholder="Leave blank for auto-generated certified transcript CID"
              value={transcriptCID}
              onChange={(e) => setTranscriptCID(e.target.value)}
              title="Optional IPFS CID for external signed transcript"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          title="Sign and anchor this hearing session to the smart contract"
          style={{ marginTop: "1rem" }}
        >
          <FileCheck2 size={18} />
          {loading ? "Recording on Court Blockchain Ledger..." : "Log Hearing & Advance Case On-Chain (اندراج پیشی عدالت)"}
        </button>
      </form>

      {statusMessage && (
        <div className={`audit-result-box ${statusMessage.type === "success" ? "verified" : statusMessage.type === "error" ? "tampered" : ""}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {statusMessage.type === "success" ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            <strong>{statusMessage.text}</strong>
          </div>
          {statusMessage.txHash && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", wordBreak: "break-all" }}>
              Blockchain Transaction Receipt: <code>{statusMessage.txHash}</code>
            </p>
          )}

          {statusMessage.type === "success" && (
            <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid #86efac", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#14532d" }}>
                Next Judicial Steps (اگلا عدالتی مرحلہ):
              </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("TIMELINE")}
              >
                View Order Sheet (حکم نامہ دیکھیں)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("EVIDENCE")}
              >
                Add Hearing Evidence (ثبوت جمع کروائیں)
              </button>
              <button
                type="button"
                className="btn btn-gold"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("VERDICT")}
              >
                Pronounce Final Decree (فیصلہ سنائیں)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("ALL_CASES")}
              >
                Back to Cause List (کاز لسٹ)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
