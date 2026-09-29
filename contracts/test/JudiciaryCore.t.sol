// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JudiciaryCore} from "../src/JudiciaryCore.sol";

/**
 * @title JudiciaryCoreTest - Comprehensive Quality & Security Test Suite
 * @author BS Software Engineering Final Year Project
 * @notice Validates role-based access control (RBAC), docket lifecycle state transitions,
 * tamper-proofing guarantees, and integrity verification.
 */
contract JudiciaryCoreTest is Test {
    JudiciaryCore public judiciary;

    // Simulated actor accounts mapped to traditional court personnel
    address public registrarAdmin;
    address public courtClerk;
    address public presidingJudge;
    address public secondaryJudge;
    address public plaintiffCounsel;
    address public defenseCounsel;
    address public unauthorizedCitizen;

    // Test hashes representing cryptographic SHA-256 fingerprints of documents
    bytes32 public constant SAMPLE_EVIDENCE_HASH_1 =
        keccak256("EVIDENCE_DOCUMENT_P1");
    bytes32 public constant SAMPLE_EVIDENCE_HASH_2 =
        keccak256("EVIDENCE_DOCUMENT_D1");
    bytes32 public constant SAMPLE_VERDICT_HASH =
        keccak256("FINAL_VERDICT_JUDGMENT");
    bytes32 public constant TAMPERED_HASH =
        keccak256("MALICIOUSLY_ALTERED_FILE");

    string public constant SAMPLE_IPFS_CID_1 =
        "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    string public constant SAMPLE_IPFS_CID_2 =
        "QmZTMGGtTXaMTNtk7DaYT2zff54ztg4EUt56G3P4145N1e";
    string public constant SAMPLE_VERDICT_CID =
        "QmPK1s3p5nmvi6635Q5qhubz27LN85C2PudHNBgJBLrxu6";

    function setUp() public {
        registrarAdmin = makeAddr("RegistrarAdmin");
        courtClerk = makeAddr("CourtClerk");
        presidingJudge = makeAddr("PresidingJudge");
        secondaryJudge = makeAddr("SecondaryJudge");
        plaintiffCounsel = makeAddr("PlaintiffCounsel");
        defenseCounsel = makeAddr("DefenseCounsel");
        unauthorizedCitizen = makeAddr("UnauthorizedCitizen");

        // Deploy smart contract with registrarAdmin as root administrator
        vm.prank(registrarAdmin);
        judiciary = new JudiciaryCore(registrarAdmin);

        // Configure certified roles using the administrator identity
        vm.startPrank(registrarAdmin);
        judiciary.grantRole(judiciary.CLERK_ROLE(), courtClerk);
        judiciary.grantRole(judiciary.JUDGE_ROLE(), presidingJudge);
        judiciary.grantRole(judiciary.JUDGE_ROLE(), secondaryJudge);
        judiciary.grantRole(judiciary.LAWYER_ROLE(), plaintiffCounsel);
        judiciary.grantRole(judiciary.LAWYER_ROLE(), defenseCounsel);
        vm.stopPrank();
    }

    // =========================================================================
    // 1. INITIALIZATION & RBAC TESTS
    // =========================================================================

    function test_InitialRoles() public view {
        assertTrue(
            judiciary.hasRole(judiciary.DEFAULT_ADMIN_ROLE(), registrarAdmin)
        );
        assertTrue(judiciary.hasRole(judiciary.CLERK_ROLE(), registrarAdmin));
        assertTrue(judiciary.hasRole(judiciary.CLERK_ROLE(), courtClerk));
        assertTrue(judiciary.hasRole(judiciary.JUDGE_ROLE(), presidingJudge));
        assertTrue(
            judiciary.hasRole(judiciary.LAWYER_ROLE(), plaintiffCounsel)
        );
        assertTrue(judiciary.hasRole(judiciary.LAWYER_ROLE(), defenseCounsel));
        assertFalse(
            judiciary.hasRole(judiciary.LAWYER_ROLE(), unauthorizedCitizen)
        );
    }

    function test_ConstructorRevertsOnZeroAddress() public {
        vm.expectRevert(JudiciaryCore.InvalidZeroAddress.selector);
        new JudiciaryCore(address(0));
    }

    // =========================================================================
    // 2. CASE FILING TESTS
    // =========================================================================

    function test_FileNewCase_Success() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "State of Tech vs. Cyber Corp",
            "Commercial Fraud",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        assertEq(caseId, 1);
        assertEq(judiciary.totalRegisteredCases(), 1);

        JudiciaryCore.CaseRecord memory c = judiciary.getCase(caseId);
        assertEq(c.title, "State of Tech vs. Cyber Corp");
        assertEq(c.caseType, "Commercial Fraud");
        assertEq(c.assignedJudge, presidingJudge);
        assertEq(c.plaintiffLawyer, plaintiffCounsel);
        assertEq(c.defendantLawyer, defenseCounsel);
        assertEq(uint8(c.status), uint8(JudiciaryCore.CaseStatus.FILED));
    }

    function test_FileNewCase_Revert_UnauthorizedFiler() public {
        // Only accounts with CLERK_ROLE may file cases
        vm.prank(unauthorizedCitizen);
        vm.expectRevert();
        judiciary.fileNewCase(
            "Unauthorized Filing",
            "Civil",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );
    }

    function test_FileNewCase_Revert_InvalidRoleAssignments() public {
        vm.startPrank(courtClerk);

        // Fails if judge does not have JUDGE_ROLE
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.InvalidRoleAssignment.selector,
                unauthorizedCitizen,
                judiciary.JUDGE_ROLE()
            )
        );
        judiciary.fileNewCase(
            "Test Case",
            "Civil",
            unauthorizedCitizen,
            plaintiffCounsel,
            defenseCounsel
        );

        // Fails if plaintiff counsel lacks LAWYER_ROLE
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.InvalidRoleAssignment.selector,
                unauthorizedCitizen,
                judiciary.LAWYER_ROLE()
            )
        );
        judiciary.fileNewCase(
            "Test Case",
            "Civil",
            presidingJudge,
            unauthorizedCitizen,
            defenseCounsel
        );

        // Fails if defense counsel lacks LAWYER_ROLE
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.InvalidRoleAssignment.selector,
                unauthorizedCitizen,
                judiciary.LAWYER_ROLE()
            )
        );
        judiciary.fileNewCase(
            "Test Case",
            "Civil",
            presidingJudge,
            plaintiffCounsel,
            unauthorizedCitizen
        );

        vm.stopPrank();
    }

    // =========================================================================
    // 3. EVIDENCE SUBMISSION & AUDITING TESTS
    // =========================================================================

    function test_AppendEvidence_ByPlaintiffAndDefense() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "Acme vs. Stark Industries",
            "Patent Dispute",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        // Plaintiff counsel submits technical blueprints
        vm.prank(plaintiffCounsel);
        judiciary.appendEvidence(
            caseId,
            SAMPLE_IPFS_CID_1,
            SAMPLE_EVIDENCE_HASH_1,
            "Original Patent Schematic (PDF)"
        );

        // Defense counsel submits rebuttal affidavit
        vm.prank(defenseCounsel);
        judiciary.appendEvidence(
            caseId,
            SAMPLE_IPFS_CID_2,
            SAMPLE_EVIDENCE_HASH_2,
            "Prior Art Publication (PDF)"
        );

        JudiciaryCore.Evidence[] memory evidences = judiciary
            .fetchEvidenceLedger(caseId);
        assertEq(evidences.length, 2);
        assertEq(evidences[0].ipfsCID, SAMPLE_IPFS_CID_1);
        assertEq(evidences[0].documentHash, SAMPLE_EVIDENCE_HASH_1);
        assertEq(evidences[0].submittedBy, plaintiffCounsel);

        assertEq(evidences[1].ipfsCID, SAMPLE_IPFS_CID_2);
        assertEq(evidences[1].documentHash, SAMPLE_EVIDENCE_HASH_2);
        assertEq(evidences[1].submittedBy, defenseCounsel);
    }

    function test_AppendEvidence_Revert_UnauthorizedLitigant() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "State vs. Smith",
            "Criminal",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        // An unrelated citizen or third-party cannot insert evidence
        vm.prank(unauthorizedCitizen);
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.UnauthorizedLitigant.selector,
                unauthorizedCitizen,
                caseId
            )
        );
        judiciary.appendEvidence(
            caseId,
            SAMPLE_IPFS_CID_1,
            SAMPLE_EVIDENCE_HASH_1,
            "Illegal Submission"
        );
    }

    // =========================================================================
    // 4. COURT HEARING CHRONOLOGY TESTS
    // =========================================================================

    function test_RecordCourtHearing_AdvancesStateToUnderTrial() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "Republic vs. Syndicate",
            "Racketeering",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        uint256 hearingTime = block.timestamp + 3 days;

        // Presiding Judge schedules and logs the preliminary hearing
        vm.prank(presidingJudge);
        judiciary.recordCourtHearing(
            caseId,
            hearingTime,
            "QmPreliminaryHearingTranscriptCID"
        );

        JudiciaryCore.HearingRecord[] memory hearings = judiciary
            .fetchHearingChronology(caseId);
        assertEq(hearings.length, 1);
        assertEq(hearings[0].hearingDate, hearingTime);
        assertEq(hearings[0].recordedBy, presidingJudge);

        // Verify state automatically transitioned from FILED to UNDER_TRIAL
        JudiciaryCore.CaseRecord memory c = judiciary.getCase(caseId);
        assertEq(uint8(c.status), uint8(JudiciaryCore.CaseStatus.UNDER_TRIAL));
    }

    function test_RecordCourtHearing_Revert_WrongJudge() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "Republic vs. Syndicate",
            "Racketeering",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        // A judge not assigned to this case cannot interfere with proceedings
        vm.prank(secondaryJudge);
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.UnauthorizedJudge.selector,
                secondaryJudge,
                caseId
            )
        );
        judiciary.recordCourtHearing(caseId, block.timestamp + 1 days, "CID");
    }

    // =========================================================================
    // 5. VERDICT PRONOUNCEMENT & IMMUTABLE SEALING
    // =========================================================================

    function test_PronounceVerdict_AndSealCase() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "Maritime Port vs. Freight Ltd",
            "Admiralty Dispute",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        // Judge conducts hearing
        vm.prank(presidingJudge);
        judiciary.recordCourtHearing(
            caseId,
            block.timestamp,
            "HearingNotesCID"
        );

        // Evidence submitted
        vm.prank(plaintiffCounsel);
        judiciary.appendEvidence(
            caseId,
            SAMPLE_IPFS_CID_1,
            SAMPLE_EVIDENCE_HASH_1,
            "Bill of Lading"
        );

        // Judge pronounces final binding judgment
        vm.prank(presidingJudge);
        judiciary.pronouncementOfVerdict(
            caseId,
            SAMPLE_VERDICT_CID,
            SAMPLE_VERDICT_HASH,
            "Judgment entered in favor of Plaintiff. Restitution ordered in full."
        );

        JudiciaryCore.CaseRecord memory c = judiciary.getCase(caseId);
        assertEq(uint8(c.status), uint8(JudiciaryCore.CaseStatus.DISPOSED));
        assertEq(c.verdict.verdictCID, SAMPLE_VERDICT_CID);
        assertEq(c.verdict.verdictHash, SAMPLE_VERDICT_HASH);
        assertEq(c.verdict.presidingJudge, presidingJudge);
        assertEq(
            c.verdict.summary,
            "Judgment entered in favor of Plaintiff. Restitution ordered in full."
        );

        // CRITICAL TAMPER-PROOFING TEST:
        // Any attempt to submit new evidence after disposal MUST fail
        vm.prank(plaintiffCounsel);
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.CaseAlreadyDisposed.selector,
                caseId
            )
        );
        judiciary.appendEvidence(
            caseId,
            SAMPLE_IPFS_CID_2,
            SAMPLE_EVIDENCE_HASH_2,
            "Tainted Late Evidence"
        );

        // Any attempt to schedule hearings after disposal MUST fail
        vm.prank(presidingJudge);
        vm.expectRevert(
            abi.encodeWithSelector(
                JudiciaryCore.CaseAlreadyDisposed.selector,
                caseId
            )
        );
        judiciary.recordCourtHearing(
            caseId,
            block.timestamp + 5 days,
            "IllegalHearingCID"
        );
    }

    // =========================================================================
    // 6. CRYPTOGRAPHIC INTEGRITY VERIFICATION (Evaluator Demo Test)
    // =========================================================================

    function test_VerifyDocumentHash_TamperDetection() public {
        vm.prank(courtClerk);
        uint256 caseId = judiciary.fileNewCase(
            "State vs. Financial Systems",
            "Securities Fraud",
            presidingJudge,
            plaintiffCounsel,
            defenseCounsel
        );

        vm.prank(plaintiffCounsel);
        judiciary.appendEvidence(
            caseId,
            SAMPLE_IPFS_CID_1,
            SAMPLE_EVIDENCE_HASH_1,
            "Certified Audit Log"
        );

        vm.prank(presidingJudge);
        judiciary.pronouncementOfVerdict(
            caseId,
            SAMPLE_VERDICT_CID,
            SAMPLE_VERDICT_HASH,
            "Defendant convicted on all counts."
        );

        // Test 1: Authentic Evidence Hash Verification
        (
            bool foundEv,
            string memory typeEv,
            uint256 timeEv,
            address submitterEv
        ) = judiciary.verifyDocumentHash(caseId, SAMPLE_EVIDENCE_HASH_1);
        assertTrue(foundEv);
        assertEq(typeEv, "EVIDENCE");
        assertEq(submitterEv, plaintiffCounsel);
        assertTrue(timeEv > 0);

        // Test 2: Authentic Verdict Hash Verification
        (
            bool foundVd,
            string memory typeVd,
            uint256 timeVd,
            address submitterVd
        ) = judiciary.verifyDocumentHash(caseId, SAMPLE_VERDICT_HASH);
        assertTrue(foundVd);
        assertEq(typeVd, "VERDICT");
        assertEq(submitterVd, presidingJudge);
        assertTrue(timeVd > 0);

        // Test 3: Tampered Document Hash (Single bit altered off-chain)
        (bool foundTampered, string memory typeTampered, , ) = judiciary
            .verifyDocumentHash(caseId, TAMPERED_HASH);
        assertFalse(foundTampered);
        assertEq(typeTampered, "NONE");
    }
}
