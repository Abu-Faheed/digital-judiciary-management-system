// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {JudiciaryCore} from "../src/JudiciaryCore.sol";

/**
 * @title DeployJudiciary - Deterministic Deployment & Role Provisioning Script
 * @author Islamia College University Peshawar (ICP) - BS Software Engineering FYP
 * @notice Broadcasts JudiciaryCore deployment and provisions initial roles for Peshawar Court Division.
 */
contract DeployJudiciary is Script {
    function run() external returns (JudiciaryCore judiciary) {
        // Standard Anvil default private key (Account 0) if not specified via environment
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(
                0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
            )
        );

        address deployer = vm.addr(deployerPrivateKey);

        // Pre-defined demo accounts mapped from standard Anvil test accounts for Peshawar Court personnel
        address demoCourtClerk = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Ahlmad / Moharrir (Peshawar Sessions Court)
        address demoPresidingJudge = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Sessions Judge / Fazil Adalat Peshawar
        address demoPlaintiffLawyer = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Advocate High Court (Wakeel Mudai)
        address demoDefenseLawyer = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // Advocate High Court (Wakeel Mudda Alaih)

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the core judiciary smart contract
        judiciary = new JudiciaryCore(deployer);

        // Provision initial credentials for court personnel demonstration
        judiciary.grantRole(judiciary.CLERK_ROLE(), deployer);
        judiciary.grantRole(judiciary.CLERK_ROLE(), demoCourtClerk);
        judiciary.grantRole(judiciary.JUDGE_ROLE(), demoPresidingJudge);
        judiciary.grantRole(judiciary.LAWYER_ROLE(), demoPlaintiffLawyer);
        judiciary.grantRole(judiciary.LAWYER_ROLE(), demoDefenseLawyer);

        // Seed an initial pilot case from Peshawar Court Division so the UI displays live case data immediately
        uint256 sampleCaseId = judiciary.fileNewCase(
            "Peshawar Development Authority (PDA) vs. Khyber Logistics Corporation",
            "Diwani & Jaidad (Commercial Contract / KP Public Procurement)",
            demoPresidingJudge,
            demoPlaintiffLawyer,
            demoDefenseLawyer
        );

        console2.log("=================================================");
        console2.log("Pakistani Digital Judiciary Smart Contract Deployed!");
        console2.log("Affiliation: Islamia College University Peshawar (ICP)");
        console2.log("Contract Address:", address(judiciary));
        console2.log("Registrar General (Peshawar High Court):", deployer);
        console2.log("Ahlmad / Moharrir (Court Reader):", demoCourtClerk);
        console2.log("Sessions Judge / Fazil Adalat:", demoPresidingJudge);
        console2.log(
            "Advocate High Court (Wakeel Mudai):",
            demoPlaintiffLawyer
        );
        console2.log(
            "Advocate High Court (Wakeel Mudda Alaih):",
            demoDefenseLawyer
        );
        console2.log("Pilot Case Misal ID #:", sampleCaseId);
        console2.log("=================================================");

        vm.stopBroadcast();
    }
}
