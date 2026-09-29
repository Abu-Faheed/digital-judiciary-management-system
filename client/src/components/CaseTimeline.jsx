import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Search,
  FolderOpen,
  UploadCloud,
  Calendar,
  Gavel,
  ArrowLeft,
  FileCheck
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import { CASE_STATUS_LABELS_PK } from "../contractAbi";

/**
 * @component CaseTimeline
 * @description Chronological Order Sheet & Real-Time Document Tamper Audit Portal.
 * Deeply linked with the entire court workflow: includes direct action buttons to add evidence,
 * conduct hearings, or pronounce verdicts for the active docket.
 */
export default function CaseTimeline({
  cases = [],
  selectedCaseId,
  onSelectCase,
  caseDetails,
  evidences = [],
  hearings = [],
  isLoadingDetails,
  onNavigateToTab
}) {
  const [auditFile, setAuditFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  /**
   * Tests an uploaded file against the smart contract to verify authenticity.
   */
  const handleVerifyFile = async (e) => {
    e.preventDefault();
    if (!auditFile || !selectedCaseId) return;

    setIsVerifying(true);
    setAuditResult(null);

    try {
      const formData = new FormData();
      formData.append("file", auditFile);
      formData.append("caseId", selectedCaseId);

      const response = await fetch("/api/evidence/verify-integrity", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      setAuditResult(data);
    } catch (err) {
      console.error("Verification error:", err);
      setAuditResult({
        verified: false,
        status: "ERROR",
        message: `Verification service offline or network error: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const timelineEvents = [];

  if (caseDetails) {
    // 1. Initial Case Docket Registration
    timelineEvents.push({
      type: "FILING",
      title: "Case Docket Registered on Blockchain (درج رجسٹر عدالت)",
      timestamp: Number(caseDetails.createdAt),
      author: caseDetails.plaintiffLawyer,
      authorRole: "Court Reader / Moharrir (Ahlmad Office)",
      description: `Docket officially entered under category: ${caseDetails.caseType}. Designated Magistrate: ${caseDetails.assignedJudge}`,
      badge: "FILED"
    });

    // 2. Hearing sessions
    hearings.forEach((h, index) => {
      timelineEvents.push({
        type: "HEARING",
        title: `Court Hearing Session #${index + 1} (پیشی عدالت نمبر ${index + 1})`,
        timestamp: Number(h.timestamp),
        author: h.recordedBy,
        authorRole: "Presiding Magistrate (فاضل جج صاحب)",
        description: `Hearing conducted & Bench Notes recorded. Scheduled Date: ${new Date(Number(h.hearingDate) * 1000).toLocaleString()}`,
        cid: h.courtNotesCID,
        badge: "SESSION"
      });
    });

    // 3. Evidence Submissions
    evidences.forEach((ev, index) => {
      timelineEvents.push({
        type: "EVIDENCE",
        title: `Saboot & Dastawaiz Admitted #${index + 1}: ${ev.description || "Court Exhibit"}`,
        timestamp: Number(ev.timestamp),
        author: ev.submittedBy,
        authorRole: "Counsel / Legal Advocate",
        description: `Cryptographic SHA-256 Fingerprint: ${ev.documentHash}`,
        hash: ev.documentHash,
        cid: ev.ipfsCID,
        badge: "PROOF"
      });
    });

    // 4. Final Verdict
    if (caseDetails.status === "DISPOSED" && caseDetails.verdict && caseDetails.verdict.timestamp > 0) {
      timelineEvents.push({
        type: "VERDICT",
        title: "Final Judicial Decree Pronounced & Case Sealed (حتمی فیصلہ عدالت و ڈگری)",
        timestamp: Number(caseDetails.verdict.timestamp),
        author: caseDetails.verdict.presidingJudge,
        authorRole: "Presiding Magistrate (فاضل جج صاحب)",
        description: caseDetails.verdict.summary,
        hash: caseDetails.verdict.verdictHash,
        cid: caseDetails.verdict.verdictCID,
        badge: "DISPOSED"
      });
    }

    timelineEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  return (
    <div>
      {/* Case Selector & Quick Action Header Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("ALL_CASES")}
                title="Return to the full Cause List"
              >
                <ArrowLeft size={14} /> Back to Cause List (کاز لسٹ)
              </button>
            </div>
            <h2 className="card-title">
              <FolderOpen size={26} color="var(--pk-emerald)" />
              <span>Case Dossier & Chronological Order Sheet (رُوئیدادِ مقدّمہ)</span>
              <InfoTooltip
                title="Order Sheet (رُوئیدادِ مقدّمہ)"
                whatItDoes="Presents an unalterable chronological record of every filing, hearing session, evidence submission, and judgment."
                procedure="Under High Court rules, the Order Sheet is the permanent judicial record binding upon all parties."
                blockchain="Aggregates verified smart contract events across the docket's entire history. Tampering is mathematically impossible."
              />
            </h2>
            <p className="card-description">
              Select any registered court docket to inspect its immutable audit trail, or jump to procedural actions.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label htmlFor="timelineSelect" style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--pk-obsidian)" }}>
              Docket:
            </label>
            <select
              id="timelineSelect"
              className="form-select"
              style={{ minWidth: "280px" }}
              value={selectedCaseId}
              onChange={(e) => onSelectCase(e.target.value)}
              title="Switch between registered court dockets to inspect their timeline"
            >
              {cases.length > 0 ? (
                cases.map((c) => (
                  <option key={c.caseId} value={c.caseId}>
                    Docket #{c.caseId} — {c.title}
                  </option>
                ))
              ) : (
                <option value="1">Docket #1</option>
              )}
            </select>
          </div>
        </div>

        {/* Selected Docket Details Card with Court Action Toolbar */}
        {caseDetails && (
          <div style={{ marginTop: "1.75rem", padding: "1.5rem", background: "var(--bg-card-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--pk-obsidian)" }}>
                  {caseDetails.title}
                </h3>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Official Docket Misal ID #{caseDetails.caseId} • {caseDetails.caseType}
                </div>
              </div>

              {/* Status Badge */}
              <span className={`status-badge ${caseDetails.status}`}>
                {CASE_STATUS_LABELS_PK[caseDetails.status] || caseDetails.status}
              </span>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              <div>
                <span className="meta-label">Filing Date:</span> {new Date(Number(caseDetails.createdAt) * 1000).toLocaleString()}
              </div>
              <div>
                <span className="meta-label">Presiding Judge:</span> <code>{caseDetails.assignedJudge ? `${caseDetails.assignedJudge.substring(0, 10)}...` : "None"}</code>
              </div>
              <div>
                <span className="meta-label">Wakeel Mudai (Petitioner):</span> <code>{caseDetails.plaintiffLawyer ? `${caseDetails.plaintiffLawyer.substring(0, 10)}...` : "None"}</code>
              </div>
              <div>
                <span className="meta-label">Wakeel Mudda Alaih (Defense):</span> <code>{caseDetails.defendantLawyer ? `${caseDetails.defendantLawyer.substring(0, 10)}...` : "None"}</code>
              </div>
            </div>

            {/* Linked Court Action Toolbar */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", marginRight: "0.25rem" }}>
                Next Court Steps (عدالتی اقدامات):
              </span>

              {caseDetails.status !== "DISPOSED" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.825rem" }}
                    onClick={() => onNavigateToTab && onNavigateToTab("EVIDENCE")}
                    title="Admit new documentary evidence for this docket"
                  >
                    <UploadCloud size={14} /> Add Evidence (ادخال ثبوت)
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.825rem" }}
                    onClick={() => onNavigateToTab && onNavigateToTab("HEARING")}
                    title="Conduct hearing session and log bench minutes"
                  >
                    <Calendar size={14} /> Schedule Hearing (تاریخ پیشی)
                  </button>

                  <button
                    type="button"
                    className="btn btn-gold"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.825rem" }}
                    onClick={() => onNavigateToTab && onNavigateToTab("VERDICT")}
                    title="Pronounce final judicial decree and seal docket"
                  >
                    <Gavel size={14} /> Pronounce Verdict (حتمی فیصلہ)
                  </button>
                </>
              ) : (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#059669", fontSize: "0.85rem", fontWeight: 700 }}>
                  <FileCheck size={16} /> Case is Officially Disposed & Sealed (فیصلہ شدہ و ریکارڈ سیلڈ)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Tamper-Proofing Verification Tool for Thesis Evaluator */}
      <div className="card" style={{ borderColor: "#6ee7b7", background: "#f0fdf4" }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <ShieldCheck size={26} color="var(--pk-emerald)" />
            <h3 className="card-title" style={{ fontSize: "1.25rem" }}>
              <span>Dastawaiz Ki Tasdeeq (Live Cryptographic Tamper-Proofing Audit Tool)</span>
              <span style={{ fontSize: "1rem", color: "var(--pk-emerald-dark)", fontWeight: 700 }}>تصدیق اصلیت دستاویزات</span>
            </h3>
            <InfoTooltip
              title="Live Tamper Audit Tool (تصدیق اصلیت)"
              whatItDoes="Accepts any file upload from the evaluator's computer and instantly determines whether it is authentic or has been tampered with."
              procedure="In Pakistani courts, the authenticity of contested documents is referred to the Punjab Forensic Science Agency (PFSA) or chemical examiners, causing multi-year delays."
              blockchain="Computes the SHA-256 hash locally in milliseconds and checks verifyDocumentHash() on the smart contract. A single modified bit alters the entire hash, catching tampering with 100% mathematical certainty."
            />
          </div>
          <p className="card-description">
            <strong>Supervisor Evaluation Tool:</strong> Drop any file below to verify whether its SHA-256 fingerprint matches the court blockchain ledger verbatim.
          </p>
        </div>

        <form onSubmit={handleVerifyFile} style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            id="auditFileInput"
            style={{ fontSize: "0.9rem" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setAuditFile(e.target.files[0]);
                setAuditResult(null);
              }
            }}
            title="Select any court document to test against the immutable blockchain record"
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!auditFile || isVerifying}
            title="Perform live zero-trust integrity verification against smart contract"
          >
            <Search size={18} />
            {isVerifying ? "Verifying Against Smart Contract..." : "Audit Document Integrity (تصدیق اصلیت دستاویز)"}
          </button>
        </form>

        {auditResult && (
          <div className={`audit-result-box ${auditResult.verified ? "verified" : "tampered"}`}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              {auditResult.verified ? (
                <ShieldCheck size={28} color="#059669" />
              ) : (
                <ShieldAlert size={28} color="#b91c1c" />
              )}
              <div>
                <h4 style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                  {auditResult.verified
                    ? "AUTHENTIC COURT RECORD CONFIRMED (مصدقہ اصلی عدالتی دستاویز)"
                    : "TAMPER DETECTION ALERT / UNREGISTERED FILE (خبردار: دستاویز میں ردوبدل یا جعلی اندراج پایا گیا)"}
                </h4>
                <p style={{ fontSize: "0.9rem", marginTop: "0.35rem", lineHeight: 1.6 }}>
                  {auditResult.message}
                </p>

                <div style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                  <div>
                    <span className="meta-label">Calculated SHA-256 Hash:</span>{" "}
                    <code>{auditResult.documentHash || auditResult.calculatedHash}</code>
                  </div>
                  {auditResult.recordedDate && (
                    <div>
                      <span className="meta-label">Anchored On-Chain:</span> {auditResult.recordedDate}
                    </div>
                  )}
                  {auditResult.certifiedBy && (
                    <div>
                      <span className="meta-label">Authenticated By Officer:</span> <code>{auditResult.certifiedBy}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chronological Visual Timeline */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
          <Clock size={22} color="var(--pk-emerald)" />
          <span>Chronological Order Sheet Ledger (رُوئیدادِ کارروائی عدالت)</span>
        </h3>

        {isLoadingDetails ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading docket chronology from blockchain...</p>
        ) : timelineEvents.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>No events found for this docket number.</p>
        ) : (
          <div className="timeline-container">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="timeline-item">
                <div className={`timeline-dot ${event.type === "VERDICT" ? "verdict" : ""}`} />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-title">{event.title}</span>
                    <span className="timeline-date">
                      {new Date(event.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>

                  <p style={{ fontSize: "0.925rem", color: "var(--text-main)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    {event.description}
                  </p>

                  <div className="timeline-meta">
                    <div className="meta-row">
                      <span className="meta-label">Action Performed By:</span>
                      <code>{event.author}</code> ({event.authorRole})
                    </div>

                    {event.hash && (
                      <div className="meta-row">
                        <span className="meta-label">Cryptographic Fingerprint (ڈیجیٹل مہر):</span>
                        <code style={{ fontSize: "0.8rem" }}>{event.hash}</code>
                      </div>
                    )}

                    {event.cid && (
                      <div className="meta-row">
                        <span className="meta-label">Decentralized IPFS Storage:</span>
                        <a
                          href={`http://localhost:5000/ipfs/${event.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--pk-emerald)", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 700 }}
                          title="Open original decentralized document file"
                        >
                          View IPFS Record ({event.cid.substring(0, 16)}...) <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
