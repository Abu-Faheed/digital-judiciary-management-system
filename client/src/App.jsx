import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import {
  FolderPlus,
  UploadCloud,
  Calendar,
  Gavel,
  History,
  AlertCircle,
  ListFilter,
  Key
} from "lucide-react";

import Header from "./components/Header";
import CaseRegistration from "./components/CaseRegistration";
import EvidenceUploader from "./components/EvidenceUploader";
import HearingScheduler from "./components/HearingScheduler";
import VerdictPronouncement from "./components/VerdictPronouncement";
import CaseTimeline from "./components/CaseTimeline";
import RegisteredCasesList from "./components/RegisteredCasesList";
import RoleManagement from "./components/RoleManagement";

import {
  JUDICIARY_CONTRACT_ADDRESS,
  JUDICIARY_CORE_ABI,
  ROLE_HASHES,
  CASE_STATUS_MAP,
  CASE_STATUS_LABELS_PK
} from "./contractAbi";

const DEMO_ACCOUNTS = {
  CLERK: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    roleName: "Ahlmad / Moharrir (Court Reader / Filing Officer)"
  },
  JUDGE: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    roleName: "Sessions Judge / Senior Civil Judge (Fazil Adalat)"
  },
  PLAINTIFF_LAWYER: {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    roleName: "Advocate High Court / Supreme Court (Wakeel Mudai)"
  },
  DEFENSE_LAWYER: {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b100287e903fe89c53722573f02b5e7742cad46ab632973",
    roleName: "Advocate High Court / Supreme Court (Wakeel Mudda Alaih)"
  },
  ADMIN: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    roleName: "Registrar General (National Judicial Automation / Admin)"
  },
  PUBLIC: {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey: "0x8b3a350cf4d3f0d16e40d3e961c235426b603173ecbce8e379264b4a850da188",
    roleName: "Aam Shehri / Public Citizen (Verify Record)"
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState("ALL_CASES");

  // Web3 Connection State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const contractRef = useRef(null);

  const [activeAccount, setActiveAccount] = useState(DEMO_ACCOUNTS.CLERK.address);
  const [activeRoleName, setActiveRoleName] = useState(DEMO_ACCOUNTS.CLERK.roleName);
  const [simulatedRole, setSimulatedRole] = useState("CLERK");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [networkName, setNetworkName] = useState("Pakistan National Court Node (Local Anvil)");

  // Judicial Case State
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("1");
  const [selectedCaseDetails, setSelectedCaseDetails] = useState(null);
  const [selectedCaseEvidences, setSelectedCaseEvidences] = useState([]);
  const [selectedCaseHearings, setSelectedCaseHearings] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  /**
   * Fetches full timeline, evidence ledger, and hearing sessions for a specific docket.
   */
  const loadCaseDetails = async (caseId, explicitContract) => {
    const target = explicitContract || contractRef.current;
    if (!target || !caseId) return;

    setIsLoadingDetails(true);
    try {
      const c = await target.getCase(caseId);
      const evidences = await target.fetchEvidenceLedger(caseId);
      const hearings = await target.fetchHearingChronology(caseId);

      setSelectedCaseDetails({
        caseId: c.caseId.toString(),
        title: c.title,
        caseType: c.caseType,
        assignedJudge: c.assignedJudge,
        plaintiffLawyer: c.plaintiffLawyer,
        defendantLawyer: c.defendantLawyer,
        status: CASE_STATUS_MAP[c.status] || "FILED",
        createdAt: c.createdAt.toString(),
        updatedAt: c.updatedAt.toString(),
        verdict: {
          verdictCID: c.verdict.verdictCID,
          verdictHash: c.verdict.verdictHash,
          presidingJudge: c.verdict.presidingJudge,
          timestamp: Number(c.verdict.timestamp),
          summary: c.verdict.summary
        }
      });

      setSelectedCaseEvidences(
        evidences.map((ev) => ({
          ipfsCID: ev.ipfsCID,
          documentHash: ev.documentHash,
          description: ev.description,
          submittedBy: ev.submittedBy,
          timestamp: ev.timestamp.toString()
        }))
      );

      setSelectedCaseHearings(
        hearings.map((h) => ({
          hearingDate: h.hearingDate.toString(),
          courtNotesCID: h.courtNotesCID,
          recordedBy: h.recordedBy,
          timestamp: h.timestamp.toString()
        }))
      );
    } catch (err) {
      console.warn(`Could not load details for case #${caseId}:`, err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  /**
   * Fetches all registered court dockets from the blockchain.
   */
  const loadAllCases = async (explicitContract) => {
    const target = explicitContract || contractRef.current;
    if (!target) return;

    try {
      const totalBN = await target.totalRegisteredCases();
      const total = Number(totalBN);
      const caseList = [];

      for (let i = 1; i <= total; i++) {
        try {
          const c = await target.getCase(i);
          caseList.push({
            caseId: c.caseId.toString(),
            title: c.title,
            caseType: c.caseType,
            assignedJudge: c.assignedJudge,
            plaintiffLawyer: c.plaintiffLawyer,
            defendantLawyer: c.defendantLawyer,
            status: CASE_STATUS_MAP[c.status] || "FILED",
            createdAt: c.createdAt.toString(),
            updatedAt: c.updatedAt.toString()
          });
        } catch (caseErr) {
          console.warn(`Could not fetch case #${i}:`, caseErr);
        }
      }

      setCases(caseList);

      if (caseList.length > 0 && (!selectedCaseId || selectedCaseId === "1")) {
        setSelectedCaseId(caseList[0].caseId);
      }
    } catch (err) {
      console.warn("Failed to fetch cases:", err);
    }
  };

  /**
   * Initializes or switches the persona signer.
   */
  const setupWeb3Signer = async (roleKey = "CLERK") => {
    try {
      const rpcUrl = "http://127.0.0.1:8545";
      const jsonRpcProvider = new ethers.JsonRpcProvider(rpcUrl);

      // Verify connection to RPC
      await jsonRpcProvider.getBlockNumber();

      const persona = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.CLERK;
      const roleSigner = new ethers.Wallet(persona.privateKey, jsonRpcProvider);

      const judiciaryInstance = new ethers.Contract(
        JUDICIARY_CONTRACT_ADDRESS,
        JUDICIARY_CORE_ABI,
        roleSigner
      );

      contractRef.current = judiciaryInstance;
      setProvider(jsonRpcProvider);
      setSigner(roleSigner);
      setContract(judiciaryInstance);
      setActiveAccount(persona.address);
      setActiveRoleName(persona.roleName);
      setSimulatedRole(roleKey);
      setNetworkName("Pakistan National Court Node (Chain ID: 31337)");
      setErrorMessage(null);

      return judiciaryInstance;
    } catch (err) {
      console.warn("Could not connect to local Anvil node:", err.message);
      setErrorMessage(
        "Could not connect to local Ethereum node at http://127.0.0.1:8545. Please ensure Anvil is running ('anvil')."
      );
      return null;
    }
  };

  // ONE-TIME initialization on mount
  useEffect(() => {
    setupWeb3Signer("CLERK").then((instance) => {
      if (instance) {
        loadAllCases(instance);
        loadCaseDetails("1", instance);
      }
    });
  }, []);

  // Loads case details ONLY when selectedCaseId changes
  useEffect(() => {
    if (selectedCaseId && contractRef.current) {
      loadCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId]);

  const handleRoleSwitch = (roleKey) => {
    setIsWalletConnected(false);
    setupWeb3Signer(roleKey).then((instance) => {
      if (instance) {
        loadAllCases(instance);
        if (selectedCaseId) {
          loadCaseDetails(selectedCaseId, instance);
        }
      }
    });
  };

  const handleConnectMetaMask = async () => {
    if (window.ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        const browserSigner = await browserProvider.getSigner();
        const userAddress = await browserSigner.getAddress();

        const judiciaryInstance = new ethers.Contract(
          JUDICIARY_CONTRACT_ADDRESS,
          JUDICIARY_CORE_ABI,
          browserSigner
        );

        contractRef.current = judiciaryInstance;
        setProvider(browserProvider);
        setSigner(browserSigner);
        setContract(judiciaryInstance);
        setActiveAccount(userAddress);
        setIsWalletConnected(true);

        let detectedRole = "Aam Shehri / Public Citizen (Observer)";
        const isJudge = await judiciaryInstance.hasRole(ROLE_HASHES.JUDGE_ROLE, userAddress);
        const isClerk = await judiciaryInstance.hasRole(ROLE_HASHES.CLERK_ROLE, userAddress);
        const isLawyer = await judiciaryInstance.hasRole(ROLE_HASHES.LAWYER_ROLE, userAddress);
        const isAdmin = await judiciaryInstance.hasRole(ROLE_HASHES.DEFAULT_ADMIN_ROLE, userAddress);

        if (isAdmin) detectedRole = "Registrar General (Supreme / High Court)";
        else if (isJudge) detectedRole = "Sessions Judge / Fazil Adalat";
        else if (isClerk) detectedRole = "Ahlmad / Moharrir (Court Reader)";
        else if (isLawyer) detectedRole = "Advocate High Court / Supreme Court";

        setActiveRoleName(detectedRole);
        setNetworkName("MetaMask Web3 Provider");
      } catch (err) {
        console.error("MetaMask connection failed:", err);
      }
    } else {
      alert("MetaMask extension not found in your browser. Using simulated Pakistani Court officer identities.");
    }
  };

  return (
    <div className="app-container">
      {/* Full-Width Institutional Pakistani Court Header */}
      <Header
        account={activeAccount}
        officerRole={activeRoleName}
        networkName={networkName}
        onRoleSwitch={handleRoleSwitch}
        simulatedRole={simulatedRole}
        isWalletConnected={isWalletConnected}
        onConnectWallet={handleConnectMetaMask}
      />

      {/* Connectivity Alert if Anvil is offline */}
      {errorMessage && (
        <div style={{ background: "#fef2f2", border: "1px solid #f87171", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.75rem", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertCircle size={24} />
          <span style={{ fontWeight: 700 }}>{errorMessage}</span>
        </div>
      )}

      {/* Persistent Active Docket Context Quick-Bar */}
      {selectedCaseDetails && (
        <div className="active-docket-bar">
          <div className="active-docket-info">
            <span className="active-docket-pill">ACTIVE COURT DOCKET</span>
            <span className="active-docket-misal">MISAL #{selectedCaseDetails.caseId}</span>
            <strong className="active-docket-title" title={selectedCaseDetails.title}>
              {selectedCaseDetails.title}
            </strong>
            <span className={`status-badge ${selectedCaseDetails.status}`}>
              {CASE_STATUS_LABELS_PK[selectedCaseDetails.status] || selectedCaseDetails.status}
            </span>
          </div>

          <div className="active-docket-shortcuts">
            <button
              type="button"
              className={`docket-shortcut-btn ${activeTab === "TIMELINE" ? "active" : ""}`}
              onClick={() => setActiveTab("TIMELINE")}
              title="Open complete Order Sheet and proofs for this docket"
            >
              <History size={13} /> Dossier (رُوئیداد)
            </button>

            {selectedCaseDetails.status !== "DISPOSED" && (
              <>
                <button
                  type="button"
                  className={`docket-shortcut-btn ${activeTab === "EVIDENCE" ? "active" : ""}`}
                  onClick={() => setActiveTab("EVIDENCE")}
                  title="Upload evidence exhibit for this docket"
                >
                  <UploadCloud size={13} /> Add Evidence (ثبوت)
                </button>
                <button
                  type="button"
                  className={`docket-shortcut-btn ${activeTab === "HEARING" ? "active" : ""}`}
                  onClick={() => setActiveTab("HEARING")}
                  title="Schedule hearing session & order sheet notes"
                >
                  <Calendar size={13} /> Peshi (پیشی)
                </button>
                <button
                  type="button"
                  className={`docket-shortcut-btn verdict ${activeTab === "VERDICT" ? "active" : ""}`}
                  onClick={() => setActiveTab("VERDICT")}
                  title="Pronounce final judgment and seal docket"
                >
                  <Gavel size={13} /> Deliver Verdict (فیصلہ)
                </button>
              </>
            )}

            <button
              type="button"
              className="docket-shortcut-btn secondary"
              onClick={() => setActiveTab("ALL_CASES")}
              title="Browse all cases or switch to another docket"
            >
              Switch Docket (کاز لسٹ)
            </button>
          </div>
        </div>
      )}

      {/* Pakistani Judicial Workflow Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "ALL_CASES" ? "active" : ""}`}
          onClick={() => setActiveTab("ALL_CASES")}
          title="Browse all registered cases across Pakistan with live metrics and search"
        >
          <ListFilter size={18} />
          Fahrist-e-Muqaddamat (All Cases / Cause List)
        </button>

        <button
          className={`tab-btn ${activeTab === "TIMELINE" ? "active" : ""}`}
          onClick={() => setActiveTab("TIMELINE")}
          title="Inspect complete chronological order sheet and live tamper audit tool"
        >
          <History size={18} />
          Roodad-e-Muqaddama (Timeline & Proofs)
        </button>

        <button
          className={`tab-btn ${activeTab === "REGISTER" ? "active" : ""}`}
          onClick={() => setActiveTab("REGISTER")}
          title="File and register new court dockets (Clerk Portal)"
        >
          <FolderPlus size={18} />
          Dakhil-e-Daftar (Case Registry - Moharrir)
        </button>

        <button
          className={`tab-btn ${activeTab === "EVIDENCE" ? "active" : ""}`}
          onClick={() => setActiveTab("EVIDENCE")}
          title="Upload and anchor cryptographic evidence documents (Advocate Portal)"
        >
          <UploadCloud size={18} />
          Saboot & Dastawaiz (Add Evidence - Counsel)
        </button>

        <button
          className={`tab-btn ${activeTab === "HEARING" ? "active" : ""}`}
          onClick={() => setActiveTab("HEARING")}
          title="Conduct hearings and log bench minutes (Judge Portal)"
        >
          <Calendar size={18} />
          Tareekh-e-Pesh (Order Sheet - Judge)
        </button>

        <button
          className={`tab-btn ${activeTab === "VERDICT" ? "active" : ""}`}
          onClick={() => setActiveTab("VERDICT")}
          title="Pronounce final decree and seal case permanently (Judge Portal)"
        >
          <Gavel size={18} />
          Faisla-e-Adalat (Pronounce Verdict - Judge)
        </button>

        <button
          className={`tab-btn ${activeTab === "ROLES" ? "active" : ""}`}
          onClick={() => setActiveTab("ROLES")}
          title="Manage and certify judicial roles on-chain (Registrar General Portal)"
        >
          <Key size={18} />
          Intizam-e-Asnad (Manage Roles / RBAC - Registrar)
        </button>
      </nav>

      {/* Main Full-Width Content View */}
      <main>
        {activeTab === "ALL_CASES" && (
          <RegisteredCasesList
            cases={cases}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              loadCaseDetails(id);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "TIMELINE" && (
          <CaseTimeline
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              loadCaseDetails(id);
            }}
            caseDetails={selectedCaseDetails}
            evidences={selectedCaseEvidences}
            hearings={selectedCaseHearings}
            isLoadingDetails={isLoadingDetails}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "REGISTER" && (
          <CaseRegistration
            contract={contractRef.current || contract}
            account={activeAccount}
            demoAccounts={{
              judge: DEMO_ACCOUNTS.JUDGE.address,
              plaintiff: DEMO_ACCOUNTS.PLAINTIFF_LAWYER.address,
              defense: DEMO_ACCOUNTS.DEFENSE_LAWYER.address
            }}
            onCaseCreated={(newCaseId) => {
              loadAllCases();
              if (newCaseId && newCaseId !== "Confirmed") {
                setSelectedCaseId(newCaseId);
                loadCaseDetails(newCaseId);
              }
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "EVIDENCE" && (
          <EvidenceUploader
            contract={contractRef.current || contract}
            account={activeAccount}
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              loadCaseDetails(id);
            }}
            onEvidenceAdded={(caseId) => {
              setSelectedCaseId(caseId);
              loadCaseDetails(caseId);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "HEARING" && (
          <HearingScheduler
            contract={contractRef.current || contract}
            account={activeAccount}
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              loadCaseDetails(id);
            }}
            onHearingRecorded={(caseId) => {
              setSelectedCaseId(caseId);
              loadCaseDetails(caseId);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "VERDICT" && (
          <VerdictPronouncement
            contract={contractRef.current || contract}
            account={activeAccount}
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              loadCaseDetails(id);
            }}
            onVerdictPronounced={(caseId) => {
              setSelectedCaseId(caseId);
              loadCaseDetails(caseId);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "ROLES" && (
          <RoleManagement
            contract={contractRef.current || contract}
            account={activeAccount}
            demoAccounts={DEMO_ACCOUNTS}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onRoleSwitch={handleRoleSwitch}
          />
        )}
      </main>
    </div>
  );
}
