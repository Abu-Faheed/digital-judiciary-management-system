import React from "react";
import { ShieldCheck, Scale, Award, UserCheck, GraduationCap } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

/**
 * @component Header
 * @description National Judicial Portal Header for the Islamic Republic of Pakistan.
 * Covers Supreme Court of Pakistan, High Courts, and District & Sessions Courts.
 * Features institutional credentials, digital officer signature, and interactive tooltips.
 */
export default function Header({
  account,
  officerRole,
  networkName,
  onRoleSwitch,
  simulatedRole,
  isWalletConnected,
  onConnectWallet
}) {
  return (
    <header className="court-header">
      {/* Research & Development Institutional Attribution */}
      <div className="icp-banner">
        <GraduationCap size={15} />
        <span>Islamia College University Peshawar (ICP) — Final Year Project (BS Software Engineering)</span>
      </div>

      <div className="court-header-top">
        <div className="brand-section">
          <div className="court-crest">
            <Scale size={32} />
          </div>
          <div className="brand-titles">
            <h1>
              <span>National Digital Judiciary Management System</span>
              <span className="brand-urdu-tag">قومی عدالتی نظامِ انصاف — اسلامی جمہوریہ پاکستان</span>
            </h1>
            <p>
              Supreme Court of Pakistan, High Courts & District Courts — Tamper-Proof Cryptographic Case Ledger
            </p>
          </div>
        </div>

        <div className="header-status-group">
          <span className="badge badge-network">
            <ShieldCheck size={15} />
            {networkName || "Pakistan National Judicial Node (Local Anvil)"}
            <InfoTooltip
              title="National Judicial Node"
              procedure="In Pakistan's national judicial network, courts are interconnected across federal and provincial jurisdictions."
              blockchain="The Ethereum blockchain acts as the immutable shared consensus layer. Every district and high court node maintains an identical synchronized ledger."
            />
          </span>

          <span className="badge badge-role">
            <Award size={15} />
            Court Officer: {officerRole}
            <InfoTooltip
              title="Verified Judicial Role (عہدہ عدالت)"
              procedure="Under the Civil Courts Ordinance and Criminal Procedure Code, different court personnel have strict statutory powers (e.g. Moharrir dockets, Judge decrees)."
              blockchain="OpenZeppelin's on-chain AccessControl validates that the connected cryptographic key holds the required role (CLERK_ROLE, JUDGE_ROLE, LAWYER_ROLE). Unauthorized actors cannot call privileged methods."
            />
          </span>
        </div>
      </div>

      <div className="officer-card">
        <div className="officer-id">
          <UserCheck size={18} />
          <span>Officer Digital Signature (شناختی چابی):</span>
          <code>{account ? `${account.substring(0, 10)}...${account.substring(account.length - 8)}` : "Not Connected"}</code>
          <InfoTooltip
            title="Cryptographic Digital Signature (ڈیجیٹل شناختی مہر)"
            procedure="In conventional Pakistani courts, officials sign physically on green paper files, which can be forged or impersonated."
            blockchain="This is the officer's 256-bit public Ethereum address. Every transaction is digitally signed with their private key, guaranteeing non-repudiation and legal authenticity."
          />
        </div>

        <div className="role-switcher-container">
          <label htmlFor="roleSwitcher" className="role-switcher-label">
            Active Court Officer Persona (عہدہ):
          </label>
          <select
            id="roleSwitcher"
            className="role-select"
            value={simulatedRole}
            onChange={(e) => onRoleSwitch(e.target.value)}
            title="Switch court officer persona to test different permissions"
          >
            <option value="CLERK">Ahlmad / Moharrir (Court Reader / Clerk)</option>
            <option value="JUDGE">Sessions Judge / Senior Civil Judge (Fazil Adalat)</option>
            <option value="PLAINTIFF_LAWYER">Advocate High Court / Supreme Court (Wakeel Mudai)</option>
            <option value="DEFENSE_LAWYER">Advocate High Court / Supreme Court (Wakeel Mudda Alaih)</option>
            <option value="ADMIN">Registrar General (National Judicial Automation / Admin)</option>
            <option value="PUBLIC">Aam Shehri / Public Citizen (Verify Record)</option>
          </select>
          <InfoTooltip
            title="Evaluator Persona Switcher (انتخاب عہدہ برائے ٹیسٹنگ)"
            procedure="Allows external examiners and supervisors to test the judicial system under any officer's role without having to configure multiple MetaMask accounts."
            blockchain="Switches the active signing wallet to the corresponding pre-funded Anvil private key, allowing immediate execution of role-restricted smart contract functions."
          />

          {!isWalletConnected && (
            <button
              onClick={onConnectWallet}
              className="btn btn-secondary"
              style={{ padding: "0.45rem 0.95rem", fontSize: "0.8rem" }}
              title="Connect Web3 Wallet (MetaMask)"
            >
              Connect MetaMask
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
