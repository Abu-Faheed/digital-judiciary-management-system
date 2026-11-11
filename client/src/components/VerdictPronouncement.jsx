import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Gavel,
  Lock,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  FileText,
  Eye,
  FileCheck2,
  Scale
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import { CASE_STATUS_LABELS_PK } from "../contractAbi";

/**
 * @component VerdictPronouncement
 * @description Judicial Decree & Final Verdict Portal (Faisla-e-Adalat & Degree).
 * Restricted to the designated Presiding Magistrate / Sessions Judge (JUDGE_ROLE).
 * 
 * Pakistani Legal Framework Context:
 * In Pakistani courts, after final arguments (Behs-e-Mukammal), the judge pronounces the judgment
 * (Faisla / Degree). In paper-based courts, convicted parties or corrupt actors may attempt to
 * alter operative paragraphs, replace decree pages, or forge signatures.
 */
export default function VerdictPronouncement({
  contract,
  account,
  cases = [],
  selectedCaseId: propSelectedCaseId,
  onSelectCase,
  onVerdictPronounced,
  onNavigateToTab
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(
    propSelectedCaseId || (cases.length > 0 ? cases[0].caseId : "1")
  );
  const [summary, setSummary] = useState("");
  const [verdictFile, setVerdictFile] = useState(null);
  const [verdictCID, setVerdictCID] = useState("");
  const [verdictHash, setVerdictHash] = useState("");

  const [isHashing, setIsHashing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (propSelectedCaseId) {
      setSelectedCaseId(propSelectedCaseId);
    }
  }, [propSelectedCaseId]);

  const activeCaseObj = cases.find((c) => c.caseId.toString() === selectedCaseId?.toString());
  const isAlreadyDisposed = activeCaseObj?.status === "DISPOSED";

  const handleCaseChange = (newId) => {
    setSelectedCaseId(newId);
    if (onSelectCase) {
      onSelectCase(newId);
    }
  };

  /**
   * Uploads and fingerprints the official signed judgment PDF.
   */
  const handleVerdictFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVerdictFile(file);
      setIsHashing(true);
      setStatusMessage(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", selectedCaseId);
        formData.append("description", `Final Judicial Decree for Misal #${selectedCaseId}`);

        const response = await fetch("/api/evidence/upload", {
          method: "POST",
          body: formData
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to process judgment PDF");
        }

        setVerdictCID(data.ipfsCID);
        setVerdictHash(data.documentHash);
        setStatusMessage({
          type: "info",
          text: `Decree PDF fingerprinted! SHA-256: ${data.documentHash.substring(0, 18)}... Ready for judicial sealing.`
        });
      } catch (err) {
        console.error("Verdict upload error:", err);
        setStatusMessage({
          type: "error",
          text: `Fingerprint Error: ${err.message}`
        });
      } finally {
        setIsHashing(false);
      }
    }
  };

  /**
   * Delivers final verdict on the blockchain, moving status permanently to DISPOSED.
   */
  const handleDeliverVerdict = async (e) => {
    e.preventDefault();
    if (!contract || !summary) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const effectiveCID = verdictCID.trim() || `QmPakistanFinalVerdictDocket${selectedCaseId}_${Date.now()}`;
      let effectiveHash = verdictHash.trim();
      if (!effectiveHash || effectiveHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        // Fallback: Compute standard SHA-256 digest from the judgment text summary
        effectiveHash = ethers.sha256(ethers.toUtf8Bytes(summary));
      }

      // Execute on-chain pronouncementOfVerdict(caseId, verdictCID, verdictHash, summary)
      const tx = await contract.pronouncementOfVerdict(
        selectedCaseId,
        effectiveCID,
        effectiveHash,
        summary
      );

      setStatusMessage({
        type: "info",
        text: "Sealing final judgment on the court blockchain ledger (صادر حتمی فیصلہ و ڈگری)..."
      });

      const receipt = await tx.wait();

      setStatusMessage({
        type: "success",
        text: `Final decree pronounced & Case #${selectedCaseId} permanently sealed! (حتمی فیصلہ عدالت صادر و ڈگری جاری برائے مقدمہ نمبر ${selectedCaseId})`,
        txHash: receipt.hash
      });

      setSummary("");
      setVerdictFile(null);
      setVerdictCID("");
      setVerdictHash("");

      if (onVerdictPronounced) {
        onVerdictPronounced(selectedCaseId);
      }
    } catch (error) {
      console.error("Verdict delivery failed:", error);
      let errorMsg = error?.reason || error?.message || "Transaction failed";
      if (errorMsg.includes("CaseAlreadyDisposed")) {
        errorMsg = "Reverted: This case is already DISPOSED (فیصلہ شدہ). Pakistani court laws strictly prohibit altering final judgments.";
      } else if (errorMsg.includes("UnauthorizedJudge")) {
        errorMsg = "Reverted: Only the designated Presiding Magistrate assigned to this docket may pronounce the final decree.";
      } else if (errorMsg.includes("AccessControlUnauthorizedAccount")) {
        errorMsg = "Reverted: Caller does not hold JUDGE_ROLE credentials on-chain.";
      }
      setStatusMessage({
        type: "error",
        text: `Court Revert: ${errorMsg}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Gavel size={24} color="var(--pk-gold)" />
          <span>Faisla-e-Adalat (Final Judgment & Decree Sealing)</span>
          <span style={{ fontSize: "1rem", color: "var(--pk-gold)", fontWeight: 700 }}>صادِر حتمی فیصلہ و ڈگری عدالت</span>
          <InfoTooltip
            title="Final Verdict & Decree (حتمی فیصلہ)"
            whatItDoes="Allows the presiding judge to write the final operative order, upload the signed decree PDF, and permanently seal the docket as DISPOSED."
            procedure="Governed by Code of Civil Procedure Order XX (Judgment and Decree) and Section 367 CrPC (Language and Contents of Judgment)."
            blockchain="Irreversibly locks the state to DISPOSED. No further evidence or hearings can ever be added under the smart contract's state machine."
          />
        </h2>
        <p className="card-description">
          Restricted to the designated Presiding Magistrate (JUDGE_ROLE). Immutably transitions the docket state to DISPOSED and seals all order sheets.
        </p>
      </div>

      {/* Selected Docket Context Preview */}
      {activeCaseObj && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: isAlreadyDisposed ? "var(--status-disposed-bg)" : "var(--bg-card-subtle)", borderRadius: "var(--radius-md)", border: `1px solid ${isAlreadyDisposed ? "var(--status-disposed)" : "var(--border-light)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: isAlreadyDisposed ? "var(--status-disposed)" : "var(--pk-gold)", letterSpacing: "0.05em" }}>
              {isAlreadyDisposed ? "Sealed Judicial Record" : "Active Docket for Judgment"}
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

      {/* Disposed Alert Banner */}
      {isAlreadyDisposed && (
        <div style={{ background: "#ecfdf5", border: "1.5px solid #059669", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", color: "#064e3b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={22} color="#059669" />
            <strong style={{ fontSize: "1rem" }}>
              Case #{selectedCaseId} is Officially DISPOSED & Sealed (فیصلہ شدہ و سیلڈ)
            </strong>
          </div>
          <p style={{ marginTop: "0.4rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Under the doctrine of <em>Res Judicata</em> (Section 11 CPC) and Pakistani judicial practice, once a final judgment and decree have been pronounced and sealed on the blockchain ledger, no further evidence, hearings, or amendments may be admitted.
          </p>
          <div style={{ marginTop: "0.85rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateToTab && onNavigateToTab("TIMELINE")}
            >
              <Eye size={13} /> View Certified Final Decree in Case Dossier
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleDeliverVerdict}>
        <div className="form-grid">
          {/* Case Select */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="verdictCaseId">
                <span>Select Court Docket for Judgment</span>
                <span className="form-label-urdu">(انتخاب مقدمہ برائے فیصلہ)</span>
              </label>
              <InfoTooltip
                title="Target Docket (مقدمہ نمبر)"
                whatItDoes="Selects the court case that has reached the stage of final decree."
                procedure="Order XX CPC requires that judgment shall be pronounced in open Court."
                blockchain="The contract enforces that the docket exists, caller is the assigned judge, and status is not DISPOSED."
              />
            </div>
            <select
              id="verdictCaseId"
              className="form-select"
              value={selectedCaseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              title="Select the target court docket to deliver the final verdict"
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

          {/* Verdict Summary */}
          <div className="form-group full-width">
            <div className="form-label-row">
              <label className="form-label" htmlFor="verdictSummary">
                <span>Operative Paragraph & Judicial Decree Summary</span>
                <span className="form-label-urdu">(خلاصہ فیصلہ و ڈگری عدالت)</span>
              </label>
              <InfoTooltip
                title="Decree Summary (خلاصہ فیصلہ)"
                whatItDoes="The binding conclusion of the court, specifying whether the suit is decreed, dismissed, or accused is acquitted/convicted."
                procedure="Order XX Rule 6 CPC provides that the decree shall agree with the judgment and specify clearly the relief granted."
                blockchain="Stored directly in the smart contract's Verdict struct, permanently publicly verifiable."
              />
            </div>
            <textarea
              id="verdictSummary"
              className="form-textarea"
              rows={4}
              placeholder="e.g. Suit for specific performance is hereby decreed in favor of the plaintiff with costs. The respondent is directed to execute the sale deed within 30 days..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              disabled={isAlreadyDisposed}
              title="Enter operative judicial order and decree terms"
            />
          </div>

          {/* Signed PDF File */}
          <div className="form-group full-width">
            <div className="form-label-row">
              <label className="form-label" htmlFor="verdictFileInput">
                <span>Upload Signed Final Judgment & Decree PDF</span>
                <span className="form-label-urdu">(فائل دستخط شدہ حتمی فیصلہ)</span>
              </label>
              <InfoTooltip
                title="Signed Judgment Document (دستخط شدہ فیصلہ)"
                whatItDoes="Uploads the complete signed and sealed judicial decision PDF."
                procedure="High Court rules require that every judgment must be signed and dated by the presiding judge."
                blockchain="The system computes the SHA-256 fingerprint of the complete PDF. The fingerprint is anchored on-chain."
              />
            </div>
            <input
              id="verdictFileInput"
              type="file"
              className="form-input"
              accept=".pdf,.doc,.docx"
              onChange={handleVerdictFileChange}
              disabled={isAlreadyDisposed}
              title="Upload signed judgment PDF for cryptographic fingerprinting"
            />
            {isHashing && <span style={{ fontSize: "0.8rem", color: "var(--pk-gold)" }}>Computing SHA-256 fingerprint...</span>}
          </div>
        </div>

        {/* Cryptographic Details Card */}
        {(verdictCID || verdictHash) && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--pk-gold-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--pk-gold-border)", fontSize: "0.85rem" }}>
            <div style={{ fontWeight: 700, color: "var(--pk-gold)", marginBottom: "0.25rem" }}>
              Cryptographic Decree Fingerprint (دستخط شدہ ڈیجیٹل مہر):
            </div>
            {verdictCID && <div><span className="meta-label">IPFS CID:</span> <code>{verdictCID}</code></div>}
            {verdictHash && <div><span className="meta-label">SHA-256:</span> <code>{verdictHash}</code></div>}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-gold"
          disabled={loading || !summary || isAlreadyDisposed}
          style={{ marginTop: "1.25rem" }}
          title="Deliver final decree and seal docket permanently on the smart contract"
        >
          <Lock size={18} />
          {loading ? "Sealing Case On-Chain..." : "Deliver Verdict & Seal Docket Permanently (صادِر حتمی فیصلہ و سیل)"}
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
                Inspect Sealed Decree in Order Sheet (محفوظ فیصلہ دیکھیں)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("ALL_CASES")}
              >
                Return to Cause List (کاز لسٹ پر واپس جائیں)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
