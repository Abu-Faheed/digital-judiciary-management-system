import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Hash,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  Calendar,
  Eye,
  ArrowRight
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import { CASE_STATUS_LABELS_PK } from "../contractAbi";

/**
 * @component EvidenceUploader
 * @description Saboot & Dastawaiz Record Portal.
 * Restricted to licensed Advocates (LAWYER_ROLE) or Presiding Judges (JUDGE_ROLE).
 * 
 * Pakistani Legal Framework Context:
 * In Pakistani courts, documentary evidence (Section 74 Qanun-e-Shahadat Order 1984),
 * Police Challans under Section 173 CrPC, Chemical Examiner Reports, and Property Deeds (Inteqal)
 * are stored in physical paper files or Malkhana rooms, making them susceptible to theft,
 * missing pages, or bribery-induced substitution.
 */
export default function EvidenceUploader({
  contract,
  account,
  cases = [],
  selectedCaseId: propSelectedCaseId,
  onSelectCase,
  onEvidenceAdded,
  onNavigateToTab
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(
    propSelectedCaseId || (cases.length > 0 ? cases[0].caseId : "1")
  );
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);

  const [isUploadingIPFS, setIsUploadingIPFS] = useState(false);
  const [ipfsResult, setIpfsResult] = useState(null);

  const [isAnchoringOnChain, setIsAnchoringOnChain] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Sync when propSelectedCaseId changes from anywhere in the app
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setIpfsResult(null);
      setStatusMessage(null);
    }
  };

  /**
   * Stage 1: Computes SHA-256 cryptographic digest and pins file to IPFS.
   */
  const handleUploadAndHash = async () => {
    if (!file) return;

    setIsUploadingIPFS(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", selectedCaseId);
      formData.append("description", description);

      const response = await fetch("/api/evidence/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process document");
      }

      setIpfsResult(data);
      setStatusMessage({
        type: "info",
        text: `Dastawaiz fingerprinted! SHA-256: ${data.documentHash.substring(0, 18)}... Ready to anchor to court ledger.`
      });
    } catch (error) {
      console.error("IPFS Upload Error:", error);
      setStatusMessage({
        type: "error",
        text: `Storage Service Error: ${error.message}`
      });
    } finally {
      setIsUploadingIPFS(false);
    }
  };

  /**
   * Stage 2: Executes smart contract method `appendEvidence(...)` to seal the proof on-chain.
   */
  const handleCommitToBlockchain = async () => {
    if (!contract || !ipfsResult) return;

    setIsAnchoringOnChain(true);
    setStatusMessage(null);

    try {
      const tx = await contract.appendEvidence(
        selectedCaseId,
        ipfsResult.ipfsCID,
        ipfsResult.documentHash,
        description || file.name
      );

      setStatusMessage({
        type: "info",
        text: "Anchoring proof to court smart contract (محفوظ اندراج ثبوت)..."
      });

      const receipt = await tx.wait();

      setStatusMessage({
        type: "success",
        text: `Saboot & Dastawaiz successfully admitted into Docket #${selectedCaseId}! (ثبوت و دستاویز برائے مقدمہ نمبر ${selectedCaseId} بحق ریکارڈ عدالت محفوظ کر لیا گیا)`,
        txHash: receipt.hash
      });

      setFile(null);
      setDescription("");
      setIpfsResult(null);

      if (onEvidenceAdded) {
        onEvidenceAdded(selectedCaseId);
      }
    } catch (error) {
      console.error("Blockchain anchoring error:", error);
      let errorMsg = error?.reason || error?.message || "Transaction failed";
      if (errorMsg.includes("UnauthorizedLitigant")) {
        errorMsg = "Reverted: Only designated Advocates (Wakeel Mudai / Wakeel Mudda Alaih) or the Presiding Judge may submit evidence.";
      } else if (errorMsg.includes("CaseAlreadyDisposed")) {
        errorMsg = "Reverted: Case is DISPOSED (فیصلہ شدہ). Pakistani court laws strictly prohibit post-verdict evidence submission.";
      }
      setStatusMessage({
        type: "error",
        text: `Court Revert: ${errorMsg}`
      });
    } finally {
      setIsAnchoringOnChain(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <UploadCloud size={24} color="var(--pk-emerald)" />
          <span>Saboot & Dastawaiz (Evidence Admission & Cryptographic Hashing)</span>
          <span style={{ fontSize: "1rem", color: "var(--pk-gold)", fontWeight: 700 }}>ادخال ثبوت و دستاویزی شہادت</span>
          <InfoTooltip
            title="Evidence Vault & Malkhana Automation"
            whatItDoes="Allows authorized advocates or presiding judges to submit documentary evidence, forensic reports, or deeds directly to the case file."
            procedure="Governed by Qanun-e-Shahadat Order 1984 (Art 74 & 164) and CrPC Section 173 for police challans."
            blockchain="Generates an irreversible SHA-256 hash. Even if a corrupt actor changes a single comma, the hash will fail verification instantly."
          />
        </h2>
        <p className="card-description">
          Restricted to authorized Advocates & Presiding Judges. Anchors SHA-256 fingerprint on-chain with decentralized IPFS storage.
        </p>
      </div>

      {/* Selected Docket Context Preview */}
      {activeCaseObj && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "var(--bg-card-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--pk-emerald)", letterSpacing: "0.05em" }}>
              Selected Court Docket
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

      <div className="form-grid">
        {/* Docket Select */}
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="evidenceCaseId">
              <span>Select Target Docket</span>
              <span className="form-label-urdu">(انتخاب مقدمہ نمبر)</span>
            </label>
            <InfoTooltip
              title="Target Docket (مقدمہ نمبر)"
              whatItDoes="Designates which court case file the uploaded document will be legally appended to."
              procedure="Under Civil Procedure Code Order XIII, all documentary evidence must be formally submitted and assigned an exhibit number."
              blockchain="The smart contract validates that the selected caseId exists and its status is not DISPOSED."
            />
          </div>
          <select
            id="evidenceCaseId"
            className="form-select"
            value={selectedCaseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            title="Select the target court docket to link this evidence item"
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

        {/* Evidence Description */}
        <div className="form-group full-width">
          <div className="form-label-row">
            <label className="form-label" htmlFor="evidenceDesc">
              <span>Document Description & Court Exhibit Label</span>
              <span className="form-label-urdu">(تفصیل دستاویز و نمبری نمائش)</span>
            </label>
            <InfoTooltip
              title="Exhibit Description (تفصیل دستاویز)"
              whatItDoes="Provides a formal legal title for the exhibit, such as 'FIR No. 124/2024', 'FSL Forensic Ballistics Report', or 'Sale Deed (Inteqal)'."
              procedure="Article 164 of Qanun-e-Shahadat Order 1984 permits modern electronic and forensic documentary records to be admitted in evidence."
              blockchain="The description is stored permanently on-chain in the case's evidence struct alongside the author's cryptographic signature."
            />
          </div>
          <input
            id="evidenceDesc"
            type="text"
            className="form-input"
            placeholder="e.g. Police Challan u/s 173 CrPC, Forensic Lab Report, Registered Sale Deed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            title="Enter a clear judicial description of the exhibit"
          />
        </div>

        {/* File Input */}
        <div className="form-group full-width">
          <div className="form-label-row">
            <label className="form-label" htmlFor="evidenceFileInput">
              <span>Select Physical or Digital Evidence File</span>
              <span className="form-label-urdu">(انتخاب فائل ثبوت)</span>
            </label>
            <InfoTooltip
              title="Evidence File Upload (دستاویزی ثبوت)"
              whatItDoes="Selects any legal document (PDF, scanned challan, photo, CCTV clip, forensic report) from your computer."
              procedure="Section 74 Qanun-e-Shahadat classifies official public and judicial documents as primary evidence."
              blockchain="The middleware runs an asynchronous SHA-256 algorithm on the file. Only the cryptographic hash goes to Ethereum; the file is pinned to IPFS."
            />
          </div>
          <input
            id="evidenceFileInput"
            type="file"
            className="form-input"
            onChange={handleFileChange}
            title="Select document or media file to compute cryptographic hash"
          />
        </div>
      </div>

      {/* Action 1: Upload to IPFS & Hash */}
      <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleUploadAndHash}
          disabled={!file || isUploadingIPFS}
          title="Compute SHA-256 digest and upload to decentralized IPFS storage"
        >
          <Hash size={16} />
          {isUploadingIPFS ? "Computing SHA-256 & Pinning to IPFS..." : "1. Fingerprint & Pin to IPFS (فائل کی تصدیق کریں)"}
        </button>
      </div>

      {/* IPFS Result Display */}
      {ipfsResult && (
        <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "var(--court-cyan-soft)", borderRadius: "var(--radius-md)", border: "1px solid #bae6fd" }}>
          <h4 style={{ color: "var(--court-cyan)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={18} />
            <span>Off-Chain Cryptographic Digest Ready (فنگر پرنٹ تیار ہے)</span>
            <InfoTooltip
              title="Off-Chain Cryptographic Digest"
              whatItDoes="Confirms that the document was successfully processed by the server, hashed with SHA-256, and pinned to IPFS."
              procedure="Satisfies the strict chain of custody requirements in Pakistani Criminal Courts."
              blockchain="The 64-character hex string acts as a tamper-evident digital seal. Any file modification alters this hash completely."
            />
          </h4>
          <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div>
              <span className="meta-label">IPFS CID:</span> <code>{ipfsResult.ipfsCID}</code>
            </div>
            <div>
              <span className="meta-label">SHA-256 Hash:</span> <code>{ipfsResult.documentHash}</code>
            </div>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCommitToBlockchain}
              disabled={isAnchoringOnChain}
              title="Record this exhibit permanently on the smart contract"
            >
              <ShieldCheck size={18} />
              {isAnchoringOnChain ? "Writing to Smart Contract..." : "2. Anchor Permanently On-Chain (بحق ریکارڈ عدالت محفوظ کریں)"}
            </button>
          </div>
        </div>
      )}

      {/* Status Message and Next Steps */}
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
                Next Judicial Steps (اگلا عدالتی اقدام):
              </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("TIMELINE")}
              >
                Inspect in Order Sheet (روئیداد میں دیکھیں)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("HEARING")}
              >
                Schedule Hearing (تاریخ پیشی رکھیں)
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
