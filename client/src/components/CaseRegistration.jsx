import React, { useState } from "react";
import {
  FolderPlus,
  CheckCircle,
  AlertCircle,
  Sparkles,
  UploadCloud,
  FileText,
  FileCheck2,
  X,
  Eye,
  Calendar,
  ListFilter
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";

/**
 * @component CaseRegistration
 * @description Case Docket Registration Portal (Dakhil-e-Muqaddama).
 * Restricted to certified Court Readers / Moharrir (CLERK_ROLE).
 * 
 * Features:
 * 1. Case Caption, Legal Category, and Court Roster addresses.
 * 2. Dedicated Case Description & Plaint Summary textarea.
 * 3. Integrated Initial Evidence Uploading Field to attach plaint exhibits/FIRs/deeds right at filing.
 */
export default function CaseRegistration({
  contract,
  account,
  onCaseCreated,
  demoAccounts,
  onNavigateToTab
}) {
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("Faujdari (Criminal / PPC)");
  const [caseDescription, setCaseDescription] = useState("");
  const [assignedJudge, setAssignedJudge] = useState(demoAccounts?.judge || "");
  const [plaintiffLawyer, setPlaintiffLawyer] = useState(demoAccounts?.plaintiff || "");
  const [defendantLawyer, setDefendantLawyer] = useState(demoAccounts?.defense || "");

  // Initial Evidence Attachment State
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  /**
   * Pre-fills realistic court dockets across Pakistani federal and provincial jurisdictions.
   */
  const handleLoadSampleNationalCase = () => {
    const sampleCases = [
      {
        title: "Peshawar Development Authority (PDA) vs. Khyber Modern Logistics Ltd",
        type: "Commercial & Public Procurement Contract",
        desc: "The Petitioner (Peshawar Development Authority) institutes this suit against Respondent contractor for willful breach of Clause 14 of Public Procurement Agreement regarding Hayatabad-Ring Road interchange. Petitioner seeks specific performance and recovery of liquidated damages amounting to Rs. 45,000,000/- with commercial markup."
      },
      {
        title: "The State through FIA Cybercrime vs. Tariq Mehmood & Others",
        type: "FIA Cybercrime & Electronic Transactions",
        desc: "State prosecution submits Challan under Section 173 CrPC pursuant to FIR No. 128/2026 registered at FIA Cyber Crime Reporting Centre Peshawar. Allegations involve electronic banking unauthorized fund transfers, spoofing, and identity theft under Sections 13, 14, and 16 of Prevention of Electronic Crimes Act (PECA 2016) read with Section 420/468/471 PPC."
      },
      {
        title: "Malik Ghulam Rasul vs. Provincial Land Revenue Authority (Lahore)",
        type: "Diwani & Jaidad (Civil & Property Dispute)",
        desc: "Suit for declaration, permanent injunction, and cancellation of forged Mutation (Inteqal No. 4410) regarding agricultural land situated in Mouza Shahdara. Plaintiff contends that ancestral property was unlawfully transferred through fictitious power of attorney without lawful consideration."
      },
      {
        title: "Federation of Pakistan vs. Indus Freight & Marine Logistics (Karachi)",
        type: "Commercial & Public Procurement Contract",
        desc: "Dispute arising from custom clearance demurrage and maritime container transit under Karachi Port Trust regulations. The petitioner seeks attachment of bonded warehouse inventory and payment of outstanding statutory tariffs."
      },
      {
        title: "Mst. Shazia Bibi vs. Muhammad Kamran (Family Court Quetta)",
        type: "Family & Virasat (Succession)",
        desc: "Suit for recovery of maintenance allowance under Section 9 of Family Courts Act 1964 and recovery of dowry articles (Jahaz Samaan) alongside prompt dower (Mehr Mu'ajjal) amounting to Rs. 1,500,000/-."
      }
    ];

    const picked = sampleCases[Math.floor(Math.random() * sampleCases.length)];
    setTitle(`${picked.title} — Misal #${Math.floor(100 + Math.random() * 900)}/2026`);
    setCaseType(picked.type);
    setCaseDescription(picked.desc);
    setEvidenceDescription(`Initial Plaint Exhibit: Relied Documents for ${picked.title.substring(0, 30)}...`);

    if (demoAccounts) {
      setAssignedJudge(demoAccounts.judge);
      setPlaintiffLawyer(demoAccounts.plaintiff);
      setDefendantLawyer(demoAccounts.defense);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEvidenceFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setEvidenceFile(null);
    setEvidenceDescription("");
  };

  /**
   * Submits the official case filing transaction to the blockchain,
   * and optionally hashes and attaches initial evidence to Pinata/IPFS and smart contract.
   */
  const handleFileCase = async (e) => {
    e.preventDefault();
    if (!contract) {
      setStatusMessage({
        type: "error",
        text: "Smart contract not connected. Please ensure Anvil blockchain node is running."
      });
      return;
    }

    setLoading(true);
    setStatusMessage({
      type: "info",
      text: "Broadcasting case registration (Dakhil-e-Daftar) to court blockchain ledger..."
    });

    try {
      // Step 1: Register Case Docket on Ethereum
      const tx = await contract.fileNewCase(
        title,
        caseType,
        assignedJudge,
        plaintiffLawyer,
        defendantLawyer
      );

      const receipt = await tx.wait();

      let registeredId = "1";
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === "CaseFiled") {
              registeredId = parsed.args.caseId.toString();
              break;
            }
          } catch (err) {
            // Ignore non-matching logs
          }
        }
      }

      let attachedEvidenceInfo = null;

      // Step 2: If an initial evidence file was attached, upload & anchor it
      if (evidenceFile) {
        setStatusMessage({
          type: "info",
          text: `Case #${registeredId} created. Now fingerprinting and pinning initial evidence exhibit to Pinata IPFS...`
        });

        const formData = new FormData();
        formData.append("file", evidenceFile);
        formData.append("caseId", registeredId);
        formData.append("description", evidenceDescription || `Initial Plaint Annexure for Case #${registeredId}`);

        const uploadRes = await fetch("/api/evidence/upload", {
          method: "POST",
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to pin initial evidence file to IPFS");
        }

        // Anchor initial exhibit to smart contract
        setStatusMessage({
          type: "info",
          text: `Evidence pinned to IPFS (CID: ${uploadData.ipfsCID.substring(0, 14)}...). Anchoring SHA-256 fingerprint on-chain...`
        });

        const evidenceTx = await contract.appendEvidence(
          registeredId,
          uploadData.ipfsCID,
          uploadData.documentHash,
          evidenceDescription || `Initial Plaint Exhibit: ${evidenceFile.name}`
        );

        const evidenceReceipt = await evidenceTx.wait();
        attachedEvidenceInfo = {
          fileName: evidenceFile.name,
          ipfsCID: uploadData.ipfsCID,
          documentHash: uploadData.documentHash,
          txHash: evidenceReceipt.hash
        };
      }

      setStatusMessage({
        type: "success",
        text: `Docket #${registeredId} officially registered! (مقدمہ نمبر ${registeredId} درج رجسٹر عدالت ہو گیا)`,
        caseId: registeredId,
        txHash: receipt.hash,
        attachedEvidence: attachedEvidenceInfo
      });

      // Clear Form Fields
      setTitle("");
      setCaseDescription("");
      setEvidenceFile(null);
      setEvidenceDescription("");

      if (onCaseCreated) {
        onCaseCreated(registeredId);
      }
    } catch (error) {
      console.error("Case registration failed:", error);
      let errorMsg = error?.reason || error?.message || "Transaction failed";
      if (errorMsg.includes("InvalidRoleAssignment")) {
        errorMsg = "Reverted: One or more nominated court officers do not hold certified Bar Council / Judicial credentials on-chain.";
      }
      setStatusMessage({
        type: "error",
        text: `Filing Revert: ${errorMsg}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 className="card-title">
              <FolderPlus size={24} color="var(--pk-emerald)" />
              <span>Dakhil-e-Muqaddama (Case Filing & Docket Registration)</span>
              <span style={{ fontSize: "1rem", color: "var(--pk-gold)", fontWeight: 700 }}>داخلہ مقدمہ برائے سماعت</span>
              <InfoTooltip
                title="Case Registration (داخلہ مقدمہ)"
                whatItDoes="Creates a new immutable court docket on the blockchain and admits initial pleadings and evidentiary annexures."
                procedure="Order IV Rule 1 CPC stipulates that every suit shall be instituted by presenting a plaint to the Court or such officer as it appoints."
                blockchain="Assigns an unalterable sequential caseId counter and checks on-chain roles for the nominated judge and counsels."
              />
            </h2>
            <p className="card-description">
              Restricted to Court Readers / Moharrir (CLERK_ROLE). Creates a permanent case docket on the national judicial ledger with optional initial evidence exhibits.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadSampleNationalCase}
            title="Auto-fill realistic case across Pakistani courts (Peshawar, Lahore, Karachi, Islamabad, Quetta)"
          >
            <Sparkles size={16} />
            Auto-Fill Sample Pakistani Court Docket (مثال برائے معائنہ)
          </button>
        </div>
      </div>

      <form onSubmit={handleFileCase}>
        <div className="form-grid">
          {/* Case Title */}
          <div className="form-group full-width">
            <div className="form-label-row">
              <label className="form-label" htmlFor="caseTitle">
                <span>Case Caption / Title</span>
                <span className="form-label-urdu">(عنوان مقدمہ: مدعی بنام مدعا علیہ)</span>
              </label>
              <InfoTooltip
                title="Case Caption / Title (عنوان مقدمہ)"
                whatItDoes="Specifies the formal legal title of the suit or criminal case."
                procedure="High Court Rules require that petitions must name the petitioner and respondent with full particulars."
                blockchain="Stored permanently on-chain in the CaseRecord struct."
              />
            </div>
            <input
              id="caseTitle"
              type="text"
              className="form-input"
              placeholder="e.g. Peshawar Development Authority vs. Khyber Modern Logistics Ltd"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              title="Enter full title of the case including Petitioner and Respondent names"
              required
            />
          </div>

          {/* Legal Category */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="caseType">
                <span>Legal Category</span>
                <span className="form-label-urdu">(نوعیت مقدمہ)</span>
              </label>
              <InfoTooltip
                title="Legal Category (نوعیت مقدمہ)"
                whatItDoes="Classifies the procedural domain of the dispute."
                procedure="Determines whether the suit proceeds under CrPC, CPC, Family Courts Act, or High Court Writ jurisdiction."
                blockchain="Enables categorical indexing and instant filtering across all registry nodes."
              />
            </div>
            <select
              id="caseType"
              className="form-select"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              title="Select the legal classification of this court docket"
              required
            >
              <option value="Faujdari (Criminal / PPC)">Faujdari (Criminal / Pakistan Penal Code - PPC)</option>
              <option value="Diwani & Jaidad (Civil & Property Dispute)">Diwani & Jaidad (Civil, Land & Property Ownership)</option>
              <option value="Commercial & Public Procurement Contract">Commercial Contract & Public Procurement</option>
              <option value="FIA Cybercrime & Electronic Transactions">FIA Cybercrime, Electronic Banking & Fraud</option>
              <option value="Constitutional Petition (Writ - Article 199)">Constitutional Writ Petition (High Court Jurisdiction)</option>
              <option value="Family & Virasat (Succession)">Family Court, Succession & Inheritance (Virasat)</option>
            </select>
          </div>

          {/* Presiding Judge */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="assignedJudge">
                <span>Presiding Magistrate (Judge Address)</span>
                <span className="form-label-urdu">(فاضل جج صاحب / سیشن عدالت)</span>
              </label>
              <InfoTooltip
                title="Presiding Magistrate (فاضل جج صاحب)"
                whatItDoes="Assigns the judicial officer authorized to conduct hearings and pronounce decree."
                procedure="Under Civil Courts Ordinance 1962, the District Judge assigns distribution of judicial business."
                blockchain="The smart contract validates hasRole(JUDGE_ROLE, assignedJudge) on-chain."
              />
            </div>
            <input
              id="assignedJudge"
              type="text"
              className="form-input mono"
              placeholder="0x..."
              value={assignedJudge}
              onChange={(e) => setAssignedJudge(e.target.value)}
              title="Ethereum public address of the verified presiding judicial magistrate"
              required
            />
          </div>

          {/* Plaintiff Lawyer */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="plaintiffLawyer">
                <span>Wakeel Mudai (Petitioner Counsel Address)</span>
                <span className="form-label-urdu">(وکیل مدعی)</span>
              </label>
              <InfoTooltip
                title="Wakeel Mudai (وکیل مدعی)"
                whatItDoes="Records the primary advocate representing the complainant or petitioner."
                procedure="Order III CPC regulates recognized agents and pleaders holding certified Wakalatnama."
                blockchain="The contract validates hasRole(LAWYER_ROLE, plaintiffLawyer) on-chain."
              />
            </div>
            <input
              id="plaintiffLawyer"
              type="text"
              className="form-input mono"
              placeholder="0x..."
              value={plaintiffLawyer}
              onChange={(e) => setPlaintiffLawyer(e.target.value)}
              title="Ethereum address of licensed advocate representing the plaintiff/petitioner"
              required
            />
          </div>

          {/* Defendant Lawyer */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="defendantLawyer">
                <span>Wakeel Mudda Alaih (Defense Counsel Address)</span>
                <span className="form-label-urdu">(وکیل مدعا علیہ)</span>
              </label>
              <InfoTooltip
                title="Wakeel Mudda Alaih (وکیل مدعا علیہ)"
                whatItDoes="Records the defense counsel authorized to file written statements and submit rebuttal exhibits."
                procedure="Legal Practitioners & Bar Councils Act 1973 regulates certified advocates."
                blockchain="Checked via hasRole(LAWYER_ROLE, defendantLawyer) on-chain."
              />
            </div>
            <input
              id="defendantLawyer"
              type="text"
              className="form-input mono"
              placeholder="0x..."
              value={defendantLawyer}
              onChange={(e) => setDefendantLawyer(e.target.value)}
              title="Ethereum address of licensed advocate representing the defendant/respondent"
              required
            />
          </div>

          {/* Case Description Textarea */}
          <div className="form-group full-width">
            <div className="form-label-row">
              <label className="form-label" htmlFor="caseDescription">
                <span>Case Description & Plaint Summary</span>
                <span className="form-label-urdu">(تفصیلِ دعویٰ و بیانِ مقدمہ)</span>
              </label>
              <InfoTooltip
                title="Case Description (تفصیلِ دعویٰ)"
                whatItDoes="Narrative summary of the suit, factual allegations, cause of action, and specific remedies prayed for."
                procedure="Order VII Rule 1 CPC provides that the plaint shall contain concise statement of circumstances and relief claimed."
                blockchain="Stored in court case documentation and permanently linked to the docket record."
              />
            </div>
            <textarea
              id="caseDescription"
              className="form-textarea"
              rows={4}
              placeholder="Enter comprehensive facts of the plaint: date of cause of action, allegations, disputed amount or property details, and relief claimed by the petitioner..."
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              title="Enter full factual details of the petition or criminal challan"
            />
          </div>

          {/* Initial Evidence Upload Field */}
          <div className="form-group full-width initial-evidence-container">
            <div className="form-label-row">
              <label className="form-label" htmlFor="initialEvidenceUpload">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <UploadCloud size={16} color="var(--pk-emerald)" />
                  Initial Documentary Evidence / Plaint Annexure (Optional)
                </span>
                <span className="form-label-urdu">(ابتدائی دستاویزی ثبوت و مثل ضمیمہ - اختیاری)</span>
              </label>
              <InfoTooltip
                title="Initial Evidence Exhibit (ابتدائی ثبوت)"
                whatItDoes="Allows the filing clerk or counsel to attach initial supporting documents (FIR scan, police challan, property deed, CNIC, contract) at the moment of filing."
                procedure="Order VII Rule 14 CPC requires the plaintiff to produce the document upon which he sues at the time of presenting the plaint."
                blockchain="The middleware hashes the attached document with SHA-256 and pins it to Pinata IPFS. Upon case creation, it immediately anchors the exhibit onto the smart contract."
              />
            </div>

            <div className="evidence-upload-dropzone">
              <input
                id="initialEvidenceUpload"
                type="file"
                className="form-input"
                onChange={handleFileChange}
                title="Attach initial documentary evidence file"
              />

              {evidenceFile && (
                <div className="attached-file-preview">
                  <div className="file-info-chip">
                    <FileCheck2 size={16} color="var(--pk-emerald)" />
                    <span className="file-name">{evidenceFile.name}</span>
                    <span className="file-size">({(evidenceFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={handleRemoveFile}
                      title="Remove attached file"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    style={{ marginTop: "0.6rem" }}
                    placeholder="Exhibit Title (e.g. Registered Sale Deed No. 402, FIR Copy 128/2026, Forensic Inspection Report...)"
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    title="Enter formal title for this attached exhibit"
                  />
                </div>
              )}
            </div>
            <span className="form-helper-text">
              Supported formats: PDF, DOCX, Scanned Images (JPEG/PNG). Files are cryptographically hashed and pinned to Pinata IPFS.
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !title}
          title="Broadcast case registration to the immutable court blockchain"
          style={{ marginTop: "1.25rem" }}
        >
          <FolderPlus size={18} />
          {loading
            ? "Anchoring Docket & Evidence on National Court Ledger..."
            : evidenceFile
            ? "Register Docket & Anchor Initial Evidence (درج مقدمہ مع ثبوت)"
            : "Register & Anchor Docket On-Chain (درج رجسٹر عدالت)"}
        </button>
      </form>

      {/* Success / Status Message Card */}
      {statusMessage && (
        <div className={`audit-result-box ${statusMessage.type === "success" ? "verified" : statusMessage.type === "error" ? "tampered" : ""}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {statusMessage.type === "success" ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            <strong>{statusMessage.text}</strong>
          </div>

          {statusMessage.txHash && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", wordBreak: "break-all" }}>
              Case Docket Transaction Receipt: <code>{statusMessage.txHash}</code>
            </p>
          )}

          {/* Attached Evidence Confirmation Badge */}
          {statusMessage.attachedEvidence && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "rgba(5, 150, 105, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(5, 150, 105, 0.25)" }}>
              <div style={{ fontWeight: 800, color: "var(--pk-emerald)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle size={15} /> Attached Initial Evidence Anchored On-Chain!
              </div>
              <div style={{ fontSize: "0.8rem", marginTop: "0.25rem", color: "var(--text-main)" }}>
                <div><strong>File:</strong> {statusMessage.attachedEvidence.fileName}</div>
                <div><strong>SHA-256 Hash:</strong> <code>{statusMessage.attachedEvidence.documentHash}</code></div>
                <div><strong>Pinata IPFS CID:</strong> <code>{statusMessage.attachedEvidence.ipfsCID}</code></div>
              </div>
            </div>
          )}

          {statusMessage.type === "success" && statusMessage.caseId && (
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
                <Eye size={13} /> View Docket & Timeline (رُوئیداد دیکھیں)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("HEARING")}
              >
                <Calendar size={13} /> Schedule Hearing (تاریخ پیشی رکھیں)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}
                onClick={() => onNavigateToTab && onNavigateToTab("ALL_CASES")}
              >
                <ListFilter size={13} /> Return to Cause List (کاز لسٹ)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
