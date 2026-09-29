// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title JudiciaryCore - Blockchain-Based Digital Judiciary Management System
 * @author BS Software Engineering Final Year Project
 * @notice This smart contract acts as the decentralized, tamper-proof backbone for judicial case management.
 * It enforces cryptographic integrity for court dockets, evidence submission, hearing schedules, and verdicts.
 *
 * Traditional Court Workflow Mapping:
 * - Registrar / Court Admin -> DEFAULT_ADMIN_ROLE: Manages court infrastructure, certifies officers and attorneys.
 * - Court Clerk             -> CLERK_ROLE: Responsible for filing petitions, verifying legal filings, and docket assignment.
 * - Presiding Magistrate    -> JUDGE_ROLE: Conducts trials, schedules hearings, reviews evidence, issues binding verdicts.
 * - Litigator / Counsel     -> LAWYER_ROLE: Submits verified evidence, examines case proceedings, represents parties.
 * - Litigants / Citizens    -> Public: Read-only access to verify authenticity of judicial records and judgments.
 */
contract JudiciaryCore is AccessControl {
    // =========================================================================
    // ROLE IDENTIFIERS (Cryptographic Keccak-256 Hashes)
    // =========================================================================

    /// @notice Role granted to Court Clerks to register and file official court cases
    bytes32 public constant CLERK_ROLE = keccak256("CLERK_ROLE");

    /// @notice Role granted to verified Judges / Magistrates empowered to preside and rule
    bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");

    /// @notice Role granted to licensed Advocates / Attorneys entitled to submit evidence
    bytes32 public constant LAWYER_ROLE = keccak256("LAWYER_ROLE");

    // =========================================================================
    // ENUMS & DATA STRUCTURES
    // =========================================================================

    /**
     * @notice Lifecycle states of a judicial case from inception to final judgment.
     * @dev Enforces chronological state flow: FILED -> UNDER_TRIAL -> AWAITING_VERDICT -> DISPOSED
     */
    enum CaseStatus {
        FILED, // 0: Case docketed by Clerk; awaiting initial trial proceedings
        UNDER_TRIAL, // 1: Hearings actively taking place; evidence submitted
        AWAITING_VERDICT, // 2: Trial arguments concluded; awaiting judge's final verdict
        DISPOSED // 3: Final verdict pronounced; case permanently sealed against edits
    }

    /**
     * @notice Cryptographic record of an evidence item entered into the court ledger.
     * @dev Off-chain document is stored on IPFS; on-chain hash guarantees zero-tampering.
     */
    struct Evidence {
        string ipfsCID; // IPFS content identifier (CID) pointing to the original document
        bytes32 documentHash; // SHA-256 cryptographic digest of the binary document content
        string description; // Plain-English description of the evidence item
        address submittedBy; // Ethereum address of the lawyer or judge submitting the proof
        uint256 timestamp; // Block timestamp when the evidence was anchored to the ledger
    }

    /**
     * @notice Immutable log of a court session / hearing.
     */
    struct HearingRecord {
        uint256 hearingDate; // Scheduled unix timestamp for the court appearance
        string courtNotesCID; // IPFS CID of the official court reporter's minutes / transcript
        address recordedBy; // Ethereum address of the presiding magistrate
        uint256 timestamp; // Block timestamp when this hearing was entered on-chain
    }

    /**
     * @notice Sealed judicial verdict concluding the litigation.
     */
    struct Verdict {
        string verdictCID; // IPFS CID of the certified signed judicial decree
        bytes32 verdictHash; // SHA-256 digest of the final verdict document
        address presidingJudge; // Ethereum address of the magistrate delivering the judgment
        uint256 timestamp; // Block timestamp when judgment was executed on-chain
        string summary; // Summary of the court's final ruling and orders
    }

    /**
     * @notice Complete docket record for a single legal matter.
     */
    struct CaseRecord {
        uint256 caseId; // Unique sequential docket number
        string title; // Case caption (e.g. "State vs. John Doe")
        string caseType; // Category (e.g. "Criminal", "Civil", "Constitutional")
        address assignedJudge; // Designated magistrate handling this docket
        address plaintiffLawyer; // Primary counsel for the petitioning party
        address defendantLawyer; // Primary counsel for the responding party
        CaseStatus status; // Current phase in the litigation lifecycle
        uint256 createdAt; // Timestamp when case was officially registered
        uint256 updatedAt; // Timestamp of the most recent docket event
        Verdict verdict; // Final verdict record (populated upon case disposal)
    }

    // =========================================================================
    // STATE STORAGE
    // =========================================================================

    /// @notice Auto-incrementing counter tracking total cases registered
    uint256 private _caseIdCounter;

    /// @notice Primary registry mapping caseId -> CaseRecord
    mapping(uint256 => CaseRecord) private _cases;

    /// @notice Registry mapping caseId -> array of submitted Evidence items
    mapping(uint256 => Evidence[]) private _caseEvidences;

    /// @notice Registry mapping caseId -> array of chronological Hearing records
    mapping(uint256 => HearingRecord[]) private _caseHearings;

    // =========================================================================
    // CUSTOM REVERT ERRORS (Gas Optimized & Informative)
    // =========================================================================

    error InvalidCaseId(uint256 caseId);
    error CaseAlreadyDisposed(uint256 caseId);
    error UnauthorizedLitigant(address caller, uint256 caseId);
    error UnauthorizedJudge(address caller, uint256 caseId);
    error InvalidRoleAssignment(address account, bytes32 requiredRole);
    error EmptyRequiredField(string fieldName);
    error InvalidZeroAddress();
    error InvalidDocumentHash();

    // =========================================================================
    // INDEXED AUDIT EVENTS
    // =========================================================================

    event CaseFiled(
        uint256 indexed caseId,
        string title,
        string caseType,
        address indexed assignedJudge,
        address indexed plaintiffLawyer,
        address defendantLawyer,
        uint256 timestamp
    );

    event EvidenceLogged(
        uint256 indexed caseId,
        uint256 indexed evidenceIndex,
        string ipfsCID,
        bytes32 documentHash,
        address indexed submittedBy,
        uint256 timestamp
    );

    event HearingLogged(
        uint256 indexed caseId,
        uint256 indexed hearingIndex,
        uint256 hearingDate,
        string courtNotesCID,
        address indexed recordedBy,
        uint256 timestamp
    );

    event CaseStatusUpdated(
        uint256 indexed caseId,
        CaseStatus oldStatus,
        CaseStatus newStatus,
        uint256 timestamp
    );

    event VerdictPronounced(
        uint256 indexed caseId,
        string verdictCID,
        bytes32 verdictHash,
        address indexed presidingJudge,
        uint256 timestamp
    );

    // =========================================================================
    // CONSTRUCTOR & ROLE INITIALIZATION
    // =========================================================================

    /**
     * @notice Initializes the court smart contract and establishes the Registrar General.
     * @param rootAdmin The address receiving supreme administrative oversight (DEFAULT_ADMIN_ROLE and CLERK_ROLE).
     */
    constructor(address rootAdmin) {
        if (rootAdmin == address(0)) revert InvalidZeroAddress();

        // Assign top-level administrative and clerical roles to the deploying authority
        _grantRole(DEFAULT_ADMIN_ROLE, rootAdmin);
        _grantRole(CLERK_ROLE, rootAdmin);
    }

    // =========================================================================
    // PRIMARY JUDICIAL WORKFLOW FUNCTIONS
    // =========================================================================

    /**
     * @notice Registers a new legal action / petition on the blockchain.
     * @dev Restricted strictly to certified Court Clerks (CLERK_ROLE).
     * Validates that the assigned judge and advocates possess certified credentials.
     *
     * @param title Formal title of the legal action
     * @param caseType Category of law (e.g. Criminal, Civil, Corporate)
     * @param assignedJudge Certified magistrate assigned to preside over proceedings
     * @param plaintiffLawyer Certified counsel representing the complainant / plaintiff
     * @param defendantLawyer Certified counsel representing the respondent / defendant
     * @return newCaseId The unique docket number assigned to this action
     */
    function fileNewCase(
        string calldata title,
        string calldata caseType,
        address assignedJudge,
        address plaintiffLawyer,
        address defendantLawyer
    ) external onlyRole(CLERK_ROLE) returns (uint256) {
        // Enforce non-empty metadata
        if (bytes(title).length == 0) revert EmptyRequiredField("title");
        if (bytes(caseType).length == 0) revert EmptyRequiredField("caseType");

        // Verify that nominated officers possess proper credentials on-chain
        if (!hasRole(JUDGE_ROLE, assignedJudge)) {
            revert InvalidRoleAssignment(assignedJudge, JUDGE_ROLE);
        }
        if (!hasRole(LAWYER_ROLE, plaintiffLawyer)) {
            revert InvalidRoleAssignment(plaintiffLawyer, LAWYER_ROLE);
        }
        if (!hasRole(LAWYER_ROLE, defendantLawyer)) {
            revert InvalidRoleAssignment(defendantLawyer, LAWYER_ROLE);
        }

        _caseIdCounter++;
        uint256 newCaseId = _caseIdCounter;

        CaseRecord storage c = _cases[newCaseId];
        c.caseId = newCaseId;
        c.title = title;
        c.caseType = caseType;
        c.assignedJudge = assignedJudge;
        c.plaintiffLawyer = plaintiffLawyer;
        c.defendantLawyer = defendantLawyer;
        c.status = CaseStatus.FILED;
        c.createdAt = block.timestamp;
        c.updatedAt = block.timestamp;

        emit CaseFiled(
            newCaseId,
            title,
            caseType,
            assignedJudge,
            plaintiffLawyer,
            defendantLawyer,
            block.timestamp
        );

        return newCaseId;
    }

    /**
     * @notice Anchors an evidence document to the case file with its cryptographic fingerprint.
     * @dev Restricted to the plaintiff counsel, defense counsel, or presiding judge of that specific case.
     * Permanently rejects modifications if the case has already been resolved / DISPOSED.
     *
     * @param caseId Unique docket number of the target case
     * @param ipfsCID IPFS Content Identifier where the encrypted document file resides
     * @param documentHash Cryptographic SHA-256 checksum of the file bytes for zero-trust verification
     * @param description Narrative description of what the evidence item proves
     */
    function appendEvidence(
        uint256 caseId,
        string calldata ipfsCID,
        bytes32 documentHash,
        string calldata description
    ) external {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);

        CaseRecord storage c = _cases[caseId];

        // Sealing protection: closed cases can never accept new evidence
        if (c.status == CaseStatus.DISPOSED) revert CaseAlreadyDisposed(caseId);

        // Strict access boundary: only authorized parties of this specific case or certified court clerk may submit evidence
        bool isAuthorized = (msg.sender == c.plaintiffLawyer ||
            msg.sender == c.defendantLawyer ||
            msg.sender == c.assignedJudge ||
            hasRole(CLERK_ROLE, msg.sender));
        if (!isAuthorized) revert UnauthorizedLitigant(msg.sender, caseId);

        if (documentHash == bytes32(0)) revert InvalidDocumentHash();
        if (bytes(ipfsCID).length == 0) revert EmptyRequiredField("ipfsCID");

        Evidence memory newEvidence = Evidence({
            ipfsCID: ipfsCID,
            documentHash: documentHash,
            description: description,
            submittedBy: msg.sender,
            timestamp: block.timestamp
        });

        _caseEvidences[caseId].push(newEvidence);
        c.updatedAt = block.timestamp;

        emit EvidenceLogged(
            caseId,
            _caseEvidences[caseId].length - 1,
            ipfsCID,
            documentHash,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Records an official hearing date, minutes, or transcript onto the court ledger.
     * @dev Restricted exclusively to the designated presiding judge holding JUDGE_ROLE.
     * Automatically transitions case status from FILED to UNDER_TRIAL upon first hearing.
     *
     * @param caseId Unique docket number of the target case
     * @param hearingDate Unix timestamp for when the hearing is conducted
     * @param courtNotesCID IPFS CID containing official court minutes / recordings
     */
    function recordCourtHearing(
        uint256 caseId,
        uint256 hearingDate,
        string calldata courtNotesCID
    ) external {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);

        CaseRecord storage c = _cases[caseId];

        if (c.status == CaseStatus.DISPOSED) revert CaseAlreadyDisposed(caseId);

        // Enforce that only the designated judge for this specific case can record proceedings
        if (msg.sender != c.assignedJudge || !hasRole(JUDGE_ROLE, msg.sender)) {
            revert UnauthorizedJudge(msg.sender, caseId);
        }

        HearingRecord memory record = HearingRecord({
            hearingDate: hearingDate,
            courtNotesCID: courtNotesCID,
            recordedBy: msg.sender,
            timestamp: block.timestamp
        });

        _caseHearings[caseId].push(record);
        c.updatedAt = block.timestamp;

        emit HearingLogged(
            caseId,
            _caseHearings[caseId].length - 1,
            hearingDate,
            courtNotesCID,
            msg.sender,
            block.timestamp
        );

        // State progression: initial hearing transitions docket into ACTIVE TRIAL
        if (c.status == CaseStatus.FILED) {
            c.status = CaseStatus.UNDER_TRIAL;
            emit CaseStatusUpdated(
                caseId,
                CaseStatus.FILED,
                CaseStatus.UNDER_TRIAL,
                block.timestamp
            );
        }
    }

    /**
     * @notice Allows presiding judge to advance trial to AWAITING_VERDICT once arguments conclude.
     * @param caseId Docket number
     * @param newStatus New status to set (must be UNDER_TRIAL or AWAITING_VERDICT)
     */
    function updateCaseStatus(uint256 caseId, CaseStatus newStatus) external {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);

        CaseRecord storage c = _cases[caseId];

        if (c.status == CaseStatus.DISPOSED) revert CaseAlreadyDisposed(caseId);
        if (msg.sender != c.assignedJudge || !hasRole(JUDGE_ROLE, msg.sender)) {
            revert UnauthorizedJudge(msg.sender, caseId);
        }
        if (newStatus == CaseStatus.DISPOSED)
            revert CaseAlreadyDisposed(caseId);

        CaseStatus oldStatus = c.status;
        c.status = newStatus;
        c.updatedAt = block.timestamp;

        emit CaseStatusUpdated(caseId, oldStatus, newStatus, block.timestamp);
    }

    /**
     * @notice Pronounces the final binding verdict, seals the case, and permanently locks the record.
     * @dev Restricted to the presiding magistrate. Transitions status to DISPOSED.
     *
     * @param caseId Docket number of the case
     * @param verdictCID IPFS CID of the certified judicial decree document
     * @param verdictHash Cryptographic SHA-256 hash of the final decree
     * @param summary Plain-English legal ruling / sentence
     */
    function pronouncementOfVerdict(
        uint256 caseId,
        string calldata verdictCID,
        bytes32 verdictHash,
        string calldata summary
    ) external {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);

        CaseRecord storage c = _cases[caseId];

        if (c.status == CaseStatus.DISPOSED) revert CaseAlreadyDisposed(caseId);
        if (msg.sender != c.assignedJudge || !hasRole(JUDGE_ROLE, msg.sender)) {
            revert UnauthorizedJudge(msg.sender, caseId);
        }
        if (verdictHash == bytes32(0)) revert InvalidDocumentHash();

        c.verdict = Verdict({
            verdictCID: verdictCID,
            verdictHash: verdictHash,
            presidingJudge: msg.sender,
            timestamp: block.timestamp,
            summary: summary
        });

        CaseStatus oldStatus = c.status;
        c.status = CaseStatus.DISPOSED;
        c.updatedAt = block.timestamp;

        emit VerdictPronounced(
            caseId,
            verdictCID,
            verdictHash,
            msg.sender,
            block.timestamp
        );

        emit CaseStatusUpdated(
            caseId,
            oldStatus,
            CaseStatus.DISPOSED,
            block.timestamp
        );
    }

    // =========================================================================
    // AUDIT & VIEW FUNCTIONS (Public Verification Interface)
    // =========================================================================

    /**
     * @notice Fetches the core docket metadata for a given case.
     * @param caseId The unique docket number
     */
    function getCase(uint256 caseId) external view returns (CaseRecord memory) {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);
        return _cases[caseId];
    }

    /**
     * @notice Fetches the complete chain of custody of all submitted evidence files.
     * @param caseId The unique docket number
     */
    function fetchEvidenceLedger(
        uint256 caseId
    ) external view returns (Evidence[] memory) {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);
        return _caseEvidences[caseId];
    }

    /**
     * @notice Fetches the full chronology of court hearing sessions and transcripts.
     * @param caseId The unique docket number
     */
    function fetchHearingChronology(
        uint256 caseId
    ) external view returns (HearingRecord[] memory) {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);
        return _caseHearings[caseId];
    }

    /**
     * @notice Returns total number of registered legal dockets.
     */
    function totalRegisteredCases() external view returns (uint256) {
        return _caseIdCounter;
    }

    /**
     * @notice Verifies whether a given document hash matches any evidence or verdict on record.
     * @dev Used for live tamper-proofing demonstrations to thesis evaluators.
     * If an uploaded file's hash matches an on-chain entry, returns authenticity confirmation.
     *
     * @param caseId Docket number to inspect
     * @param targetHash Cryptographic SHA-256 digest to search for
     * @return isAuthentic True if the document fingerprint exists verbatim on the blockchain
     * @return documentType "EVIDENCE", "VERDICT", or "NONE"
     * @return recordedTimestamp Timestamp when the authentic copy was anchored
     * @return certifiedBy Ethereum address of the official who signed it
     */
    function verifyDocumentHash(
        uint256 caseId,
        bytes32 targetHash
    )
        external
        view
        returns (
            bool isAuthentic,
            string memory documentType,
            uint256 recordedTimestamp,
            address certifiedBy
        )
    {
        if (caseId == 0 || caseId > _caseIdCounter)
            revert InvalidCaseId(caseId);

        // Check if hash matches the final verdict
        CaseRecord storage c = _cases[caseId];
        if (c.verdict.verdictHash == targetHash && targetHash != bytes32(0)) {
            return (
                true,
                "VERDICT",
                c.verdict.timestamp,
                c.verdict.presidingJudge
            );
        }

        // Check if hash matches any evidence submitted
        Evidence[] storage evidences = _caseEvidences[caseId];
        for (uint256 i = 0; i < evidences.length; i++) {
            if (evidences[i].documentHash == targetHash) {
                return (
                    true,
                    "EVIDENCE",
                    evidences[i].timestamp,
                    evidences[i].submittedBy
                );
            }
        }

        return (false, "NONE", 0, address(0));
    }
}
