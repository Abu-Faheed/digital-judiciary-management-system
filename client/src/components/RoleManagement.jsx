import React, { useState } from "react";
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Search,
  CheckCircle,
  AlertCircle,
  Award,
  Key
} from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import { ROLE_HASHES } from "../contractAbi";

/**
 * @component RoleManagement
 * @description Role-Based Access Control (RBAC) & Credentialing Portal.
 * Restricted to Registrar General (DEFAULT_ADMIN_ROLE) of the High Court / Supreme Court.
 * 
 * Pakistani Legal Framework Context:
 * In Pakistani courts, judicial powers and advocate licenses are strictly regulated:
 * - High Court Rules & Orders prescribe who may act as Court Reader / Moharrir.
 * - The Provincial Judicial Service Commission / High Court appoints Sessions Judges.
 * - Provincial Bar Councils (e.g. KP Bar Council, Punjab Bar Council) license Advocates.
 * 
 * In this smart contract:
 * OpenZeppelin's AccessControl guarantees that only certified addresses can call
 * clerical, judicial, or legal functions. This portal enables live on-chain role management.
 */
export default function RoleManagement({
  contract,
  account,
  demoAccounts,
  onNavigateToTab,
  onRoleSwitch
}) {
  // Address Inspector State
  const [inspectAddress, setInspectAddress] = useState("");
  const [inspectResult, setInspectResult] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Grant Role State
  const [grantAddress, setGrantAddress] = useState("");
  const [grantRoleKey, setGrantRoleKey] = useState("JUDGE_ROLE");
  const [isGranting, setIsGranting] = useState(false);

  // Revoke Role State
  const [revokeAddress, setRevokeAddress] = useState("");
  const [revokeRoleKey, setRevokeRoleKey] = useState("LAWYER_ROLE");
  const [isRevoking, setIsRevoking] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null);

  /**
   * Queries the live smart contract to check which roles an address holds.
   */
  const handleInspectRoles = async (e) => {
    e.preventDefault();
    if (!contract || !inspectAddress.trim()) return;

    setIsInspecting(true);
    setInspectResult(null);
    setStatusMessage(null);

    try {
      const target = inspectAddress.trim();
      const isAdmin = await contract.hasRole(ROLE_HASHES.DEFAULT_ADMIN_ROLE, target);
      const isJudge = await contract.hasRole(ROLE_HASHES.JUDGE_ROLE, target);
      const isClerk = await contract.hasRole(ROLE_HASHES.CLERK_ROLE, target);
      const isLawyer = await contract.hasRole(ROLE_HASHES.LAWYER_ROLE, target);

      setInspectResult({
        address: target,
        isAdmin,
        isJudge,
        isClerk,
        isLawyer
      });
    } catch (err) {
      console.error("Inspect error:", err);
      setStatusMessage({
        type: "error",
        text: `Inspection Failed: ${err.message}`
      });
    } finally {
      setIsInspecting(false);
    }
  };

  /**
   * Executes grantRole on the smart contract.
   */
  const handleGrantRole = async (e) => {
    e.preventDefault();
    if (!contract || !grantAddress.trim()) return;

    setIsGranting(true);
    setStatusMessage(null);

    try {
      const target = grantAddress.trim();
      const roleHash = ROLE_HASHES[grantRoleKey];

      const tx = await contract.grantRole(roleHash, target);
      setStatusMessage({
        type: "info",
        text: "Broadcasting role certification to the court blockchain ledger..."
      });

      const receipt = await tx.wait();
      setStatusMessage({
        type: "success",
        text: `Role ${grantRoleKey} successfully granted to ${target.substring(0, 10)}...! (اسناد عدالت کامیابی سے جاری ہو گئی)`,
        txHash: receipt.hash
      });

      // Clear
      setGrantAddress("");
    } catch (err) {
      console.error("Grant role error:", err);
      let errorMsg = err?.reason || err?.message || "Transaction failed";
      if (errorMsg.includes("AccessControl")) {
        errorMsg = "Reverted: Only the root Registrar General (DEFAULT_ADMIN_ROLE) can grant judicial credentials.";
      }
      setStatusMessage({
        type: "error",
        text: `Grant Revert: ${errorMsg}`
      });
    } finally {
      setIsGranting(false);
    }
  };

  /**
   * Executes revokeRole on the smart contract.
   */
  const handleRevokeRole = async (e) => {
    e.preventDefault();
    if (!contract || !revokeAddress.trim()) return;

    setIsRevoking(true);
    setStatusMessage(null);

    try {
      const target = revokeAddress.trim();
      const roleHash = ROLE_HASHES[revokeRoleKey];

      const tx = await contract.revokeRole(roleHash, target);
      setStatusMessage({
        type: "info",
        text: "Broadcasting credential revocation to the court blockchain ledger..."
      });

      const receipt = await tx.wait();
      setStatusMessage({
        type: "success",
        text: `Role ${revokeRoleKey} officially revoked from ${target.substring(0, 10)}...! (اسناد عدالت منسوخ کر دی گئیں)`,
        txHash: receipt.hash
      });

      setRevokeAddress("");
    } catch (err) {
      console.error("Revoke role error:", err);
      let errorMsg = err?.reason || err?.message || "Transaction failed";
      if (errorMsg.includes("AccessControl")) {
        errorMsg = "Reverted: Only the root Registrar General (DEFAULT_ADMIN_ROLE) can revoke credentials.";
      }
      setStatusMessage({
        type: "error",
        text: `Revocation Revert: ${errorMsg}`
      });
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div>
      {/* Overview Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Key size={26} color="var(--pk-emerald)" />
            <span>Role-Based Access Control (RBAC) & Credentialing Portal (انتظامِ اسناد و اختیارات)</span>
            <InfoTooltip
              title="Judicial RBAC Management"
              procedure="Under High Court rules, the Registrar General certifies judicial magistrates, bar council advocates, and court clerks."
              blockchain="Powered by OpenZeppelin AccessControl. Solves corrupt impersonation by checking on-chain whether an address holds CLERK_ROLE, JUDGE_ROLE, or LAWYER_ROLE before executing state transitions."
            />
          </h2>
          <p className="card-description">
            Inspect on-chain credentials, grant official roles to newly appointed judges and lawyers, or revoke credentials upon retirement/de-barment.
          </p>
        </div>

        {/* Certified Officer Roster Table */}
        <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--pk-obsidian)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Award size={18} color="var(--pk-gold)" />
          <span>Certified Court Officer Roster (فہرست مجاز عدالتی افسران)</span>
        </h3>

        <div style={{ overflowX: "auto", marginBottom: "1.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-card-subtle)", borderBottom: "2px solid var(--border-light)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>Designated Officer Persona</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>Certified Ethereum Address</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>On-Chain Certified Role</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>Authorized Powers & Scope</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 800, textAlign: "center" }}>Direct Workflow Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>Court Clerk / Moharrir</td>
                <td style={{ padding: "0.85rem 1rem" }}><code>0x70997970C51812dc3A010C7d01b50e0d17dc79C8</code></td>
                <td style={{ padding: "0.85rem 1rem" }}><span className="badge badge-network">CLERK_ROLE</span></td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>Files new legal dockets (Dakhil-e-Daftar) and assigns verified judges & counsels.</td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                    onClick={() => {
                      if (onRoleSwitch) onRoleSwitch("CLERK");
                      if (onNavigateToTab) onNavigateToTab("REGISTER");
                    }}
                    title="Switch to Moharrir identity and open Case Filing office"
                  >
                    Switch & File Case
                  </button>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>Sessions Judge / Magistrate</td>
                <td style={{ padding: "0.85rem 1rem" }}><code>0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</code></td>
                <td style={{ padding: "0.85rem 1rem" }}><span className="badge badge-role">JUDGE_ROLE</span></td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>Conducts hearings, logs order sheets, delivers final verdicts, and permanently seals cases.</td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                    onClick={() => {
                      if (onRoleSwitch) onRoleSwitch("JUDGE");
                      if (onNavigateToTab) onNavigateToTab("HEARING");
                    }}
                    title="Switch to Judge identity and open Bench Order Sheet"
                  >
                    Switch & Bench
                  </button>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>Advocate (Wakeel Mudai)</td>
                <td style={{ padding: "0.85rem 1rem" }}><code>0x90F79bf6EB2c4f870365E785982E1f101E93b906</code></td>
                <td style={{ padding: "0.85rem 1rem" }}><span className="badge badge-role">LAWYER_ROLE</span></td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>Submits documentary evidence, forensic exhibits, and petitions on behalf of Complainant.</td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                    onClick={() => {
                      if (onRoleSwitch) onRoleSwitch("PLAINTIFF_LAWYER");
                      if (onNavigateToTab) onNavigateToTab("EVIDENCE");
                    }}
                    title="Switch to Advocate identity and submit exhibits"
                  >
                    Switch & Evidence
                  </button>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>Advocate (Wakeel Mudda Alaih)</td>
                <td style={{ padding: "0.85rem 1rem" }}><code>0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65</code></td>
                <td style={{ padding: "0.85rem 1rem" }}><span className="badge badge-role">LAWYER_ROLE</span></td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>Submits rebuttal affidavits, counter-claims, and documentary evidence for Respondent.</td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                    onClick={() => {
                      if (onRoleSwitch) onRoleSwitch("DEFENSE_LAWYER");
                      if (onNavigateToTab) onNavigateToTab("EVIDENCE");
                    }}
                    title="Switch to Defense Counsel identity"
                  >
                    Switch & Evidence
                  </button>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>Registrar General (Root Admin)</td>
                <td style={{ padding: "0.85rem 1rem" }}><code>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</code></td>
                <td style={{ padding: "0.85rem 1rem" }}><span className="badge badge-network">DEFAULT_ADMIN_ROLE</span></td>
                <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>Supervises all judicial roles; grants and revokes credentials across Pakistan court branches.</td>
                <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-gold"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                    onClick={() => {
                      if (onRoleSwitch) onRoleSwitch("ADMIN");
                    }}
                    title="Switch to Root Registrar General identity"
                  >
                    Switch to Admin
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Verify Roles + Grant/Revoke Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.75rem" }}>
        {/* Tool 1: Inspect Any Address */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>
            <Search size={20} color="var(--pk-emerald)" />
            <span>Verify Any Address Credentials (تصدیق اسناد)</span>
            <InfoTooltip
              title="Verify Credentials"
              procedure="Allows the Registrar or Litigants to check whether an individual is an enrolled advocate or authorized judge."
              blockchain="Calls hasRole() on-chain for all 4 roles simultaneously via the smart contract view functions."
            />
          </h3>
          <p className="card-description" style={{ marginBottom: "1.25rem" }}>
            Query the live blockchain to inspect which certified court roles an Ethereum address currently holds.
          </p>

          <form onSubmit={handleInspectRoles}>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label" htmlFor="inspectInput">
                <span>Ethereum Address to Inspect</span>
                <span className="form-label-urdu">(پتہ برائے تصدیق)</span>
              </label>
              <input
                id="inspectInput"
                type="text"
                className="form-input mono"
                placeholder="0x..."
                value={inspectAddress}
                onChange={(e) => setInspectAddress(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isInspecting || !inspectAddress.trim()}
              style={{ width: "100%" }}
            >
              <Search size={16} />
              {isInspecting ? "Inspecting On-Chain..." : "Verify Credentials on Blockchain"}
            </button>
          </form>

          {inspectResult && (
            <div style={{ marginTop: "1.25rem", padding: "1.25rem", background: "var(--bg-card-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--pk-obsidian)", marginBottom: "0.5rem" }}>
                Credentials for <code>{inspectResult.address.substring(0, 14)}...</code>:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.825rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Registrar General (DEFAULT_ADMIN_ROLE):</span>
                  <strong>{inspectResult.isAdmin ? "✅ ACTIVE" : "❌ No"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Sessions Judge / Magistrate (JUDGE_ROLE):</span>
                  <strong>{inspectResult.isJudge ? "✅ CERTIFIED" : "❌ No"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Court Reader / Moharrir (CLERK_ROLE):</span>
                  <strong>{inspectResult.isClerk ? "✅ AUTHORIZED" : "❌ No"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Advocate High Court (LAWYER_ROLE):</span>
                  <strong>{inspectResult.isLawyer ? "✅ LICENSED" : "❌ No"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tool 2: Grant / Certify Role */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>
            <UserPlus size={20} color="var(--pk-emerald)" />
            <span>Certify Court Officer (تفویض و منظوری اسناد)</span>
            <InfoTooltip
              title="Grant Role"
              procedure="Equivalent to issuing an official Gazette notification or Bar Council enrollment certificate."
              blockchain="Executes grantRole() on the smart contract. Requires DEFAULT_ADMIN_ROLE authority."
            />
          </h3>
          <p className="card-description" style={{ marginBottom: "1.25rem" }}>
            Restricted to Registrar General. Certify a new Sessions Judge, Court Clerk, or Advocate on-chain.
          </p>

          <form onSubmit={handleGrantRole}>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label" htmlFor="grantAddressInput">
                <span>Officer Address</span>
                <span className="form-label-urdu">(پتہ برائے منظوری)</span>
              </label>
              <input
                id="grantAddressInput"
                type="text"
                className="form-input mono"
                placeholder="0x..."
                value={grantAddress}
                onChange={(e) => setGrantAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="form-label" htmlFor="grantRoleSelect">
                <span>Select Judicial Role</span>
                <span className="form-label-urdu">(عہدہ)</span>
              </label>
              <select
                id="grantRoleSelect"
                className="form-select"
                value={grantRoleKey}
                onChange={(e) => setGrantRoleKey(e.target.value)}
              >
                <option value="JUDGE_ROLE">Sessions Judge / Magistrate (JUDGE_ROLE)</option>
                <option value="CLERK_ROLE">Ahlmad / Moharrir (CLERK_ROLE)</option>
                <option value="LAWYER_ROLE">Advocate High Court (LAWYER_ROLE)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGranting || !grantAddress.trim()}
              style={{ width: "100%" }}
            >
              <UserPlus size={16} />
              {isGranting ? "Certifying on Blockchain..." : "Grant Official Role on Blockchain"}
            </button>
          </form>
        </div>

        {/* Tool 3: Revoke Role */}
        <div className="card">
          <h3 className="card-title" style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>
            <UserX size={20} color="#b91c1c" />
            <span>Revoke Credentials (تنسیخ اسناد و معطلی)</span>
            <InfoTooltip
              title="Revoke Role"
              procedure="Used upon judicial retirement, transfer, or Bar Council disciplinary cancellation of license."
              blockchain="Executes revokeRole() on-chain, immediately stripping the address of privileged calling powers."
            />
          </h3>
          <p className="card-description" style={{ marginBottom: "1.25rem" }}>
            Restricted to Registrar General. Strips an address of clerical, judicial, or legal powers.
          </p>

          <form onSubmit={handleRevokeRole}>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label" htmlFor="revokeAddressInput">
                <span>Officer Address</span>
                <span className="form-label-urdu">(پتہ برائے تنسیخ)</span>
              </label>
              <input
                id="revokeAddressInput"
                type="text"
                className="form-input mono"
                placeholder="0x..."
                value={revokeAddress}
                onChange={(e) => setRevokeAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="form-label" htmlFor="revokeRoleSelect">
                <span>Select Role to Revoke</span>
                <span className="form-label-urdu">(منسوخ شدہ عہدہ)</span>
              </label>
              <select
                id="revokeRoleSelect"
                className="form-select"
                value={revokeRoleKey}
                onChange={(e) => setRevokeRoleKey(e.target.value)}
              >
                <option value="LAWYER_ROLE">Advocate High Court (LAWYER_ROLE)</option>
                <option value="JUDGE_ROLE">Sessions Judge / Magistrate (JUDGE_ROLE)</option>
                <option value="CLERK_ROLE">Ahlmad / Moharrir (CLERK_ROLE)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ width: "100%", color: "#b91c1c", borderColor: "#fca5a5" }}
              disabled={isRevoking || !revokeAddress.trim()}
            >
              <UserX size={16} />
              {isRevoking ? "Revoking on Blockchain..." : "Revoke Credentials on Blockchain"}
            </button>
          </form>
        </div>
      </div>

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
        </div>
      )}
    </div>
  );
}
