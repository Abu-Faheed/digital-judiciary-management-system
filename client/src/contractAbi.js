/**
 * @file contractAbi.js
 * @description Smart Contract ABI & Role Definitions for JudiciaryCore.
 * Pakistani Judiciary System Framework (District & Sessions Courts / Peshawar High Court).
 */

export const JUDICIARY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const ROLE_HASHES = {
  DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
  CLERK_ROLE: "0x98161f52c1e6c06a32cb5e72904664a3836a94a28f86985a9ee4385a4fb3cf4f", // keccak256("CLERK_ROLE") - Ahlmad / Moharrir
  JUDGE_ROLE: "0x74268e3efab37c35e5d36e2f69a53164a66a1e9411dd7c42735d45d9e54dca83", // keccak256("JUDGE_ROLE") - Sessions Judge / Magistrate
  LAWYER_ROLE: "0x0cfec80587d60cc07b46d7fa02f664a7fd7b9b2df9a572a159ea4342273e8e21"  // keccak256("LAWYER_ROLE") - Advocate High Court
};

/**
 * Status mapping matching Pakistan Court procedural stages:
 * 0: FILED / DAAKHIL (درخواست دائر)
 * 1: UNDER TRIAL / ZAIR-E-SAMAAT (زیر سماعت عدالت)
 * 2: AWAITING VERDICT / BEHS MUKAMMAL (بحث مکمل - برائے فیصلہ)
 * 3: DISPOSED / FAISLA SHUDA (فیصلہ شدہ - ریکارڈ محفوظ)
 */
export const CASE_STATUS_MAP = {
  0: "FILED",
  1: "UNDER_TRIAL",
  2: "AWAITING_VERDICT",
  3: "DISPOSED"
};

export const CASE_STATUS_LABELS_PK = {
  FILED: "FILED (درخواست دائر - موصولہ برائے سماعت)",
  UNDER_TRIAL: "UNDER TRIAL / ZAIR-E-SAMAAT (زیر سماعت عدالت)",
  AWAITING_VERDICT: "AWAITING VERDICT / BEHS MUKAMMAL (بحث مکمل - برائے فیصلہ)",
  DISPOSED: "DISPOSED / FAISLA SHUDA (فیصلہ شدہ - ریکارڈ محفوظ)"
};

export const JUDICIARY_CORE_ABI = [
  // Core Judicial Management
  "function fileNewCase(string calldata title, string calldata caseType, address assignedJudge, address plaintiffLawyer, address defendantLawyer) external returns (uint256)",
  "function appendEvidence(uint256 caseId, string calldata ipfsCID, bytes32 documentHash, string calldata description) external",
  "function recordCourtHearing(uint256 caseId, uint256 hearingDate, string calldata courtNotesCID) external",
  "function updateCaseStatus(uint256 caseId, uint8 newStatus) external",
  "function pronouncementOfVerdict(uint256 caseId, string calldata verdictCID, bytes32 verdictHash, string calldata summary) external",

  // Query & Audit Functions
  "function getCase(uint256 caseId) external view returns (tuple(uint256 caseId, string title, string caseType, address assignedJudge, address plaintiffLawyer, address defendantLawyer, uint8 status, uint256 createdAt, uint256 updatedAt, tuple(string verdictCID, bytes32 verdictHash, address presidingJudge, uint256 timestamp, string summary) verdict))",
  "function fetchEvidenceLedger(uint256 caseId) external view returns (tuple(string ipfsCID, bytes32 documentHash, string description, address submittedBy, uint256 timestamp)[])",
  "function fetchHearingChronology(uint256 caseId) external view returns (tuple(uint256 hearingDate, string courtNotesCID, address recordedBy, uint256 timestamp)[])",
  "function totalRegisteredCases() external view returns (uint256)",
  "function verifyDocumentHash(uint256 caseId, bytes32 targetHash) external view returns (bool isAuthentic, string memory documentType, uint256 recordedTimestamp, address certifiedBy)",

  // AccessControl Interface
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",

  // Events
  "event CaseFiled(uint256 indexed caseId, string title, string caseType, address indexed assignedJudge, address indexed plaintiffLawyer, address defendantLawyer, uint256 timestamp)",
  "event EvidenceLogged(uint256 indexed caseId, uint256 indexed evidenceIndex, string ipfsCID, bytes32 documentHash, address indexed submittedBy, uint256 timestamp)",
  "event HearingLogged(uint256 indexed caseId, uint256 indexed hearingIndex, uint256 hearingDate, string courtNotesCID, address indexed recordedBy, uint256 timestamp)",
  "event CaseStatusUpdated(uint256 indexed caseId, uint8 oldStatus, uint8 newStatus, uint256 timestamp)",
  "event VerdictPronounced(uint256 indexed caseId, string verdictCID, bytes32 verdictHash, address indexed presidingJudge, uint256 timestamp)"
];
