/**
 * @file index.js
 * @description Express.js Backend Middleware for Blockchain-Based Digital Judiciary Management System.
 * Handles file uploads, cryptographic SHA-256 calculation, IPFS pinning, and smart contract verification.
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { pinFileToIPFS, computeDocumentHash, authenticatePinata } from "./services/pinataService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Minimal ABI required for server-side verification and case querying
const JUDICIARY_CORE_ABI = [
  "function totalRegisteredCases() external view returns (uint256)",
  "function getCase(uint256 caseId) external view returns (tuple(uint256 caseId, string title, string caseType, address assignedJudge, address plaintiffLawyer, address defendantLawyer, uint8 status, uint256 createdAt, uint256 updatedAt, tuple(string verdictCID, bytes32 verdictHash, address presidingJudge, uint256 timestamp, string summary) verdict))",
  "function verifyDocumentHash(uint256 caseId, bytes32 targetHash) external view returns (bool isAuthentic, string memory documentType, uint256 recordedTimestamp, address certifiedBy)",
  "function fetchEvidenceLedger(uint256 caseId) external view returns (tuple(string ipfsCID, bytes32 documentHash, string description, address submittedBy, uint256 timestamp)[])"
];

// Configure Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// In-memory Multer upload config (max 50MB for court documents, affidavits, and media)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// =========================================================================
// PUBLIC & LOCAL IPFS GATEWAY ENDPOINTS
// =========================================================================

const LOCAL_STORAGE_DIR = path.join(__dirname, "uploads/ipfs");
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

/**
 * Serves IPFS documents pinned in local offline storage mode.
 */
app.get("/ipfs/:cid", (req, res) => {
  const { cid } = req.params;
  const filePath = path.join(LOCAL_STORAGE_DIR, cid);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", `inline; filename="${cid}"`);
    return res.sendFile(filePath);
  }

  // If not in local fallback folder, redirect to Pinata IPFS Gateway
  const gateway = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  return res.redirect(`${gateway.replace(/\/$/, "")}/${cid}`);
});

// =========================================================================
// API ENDPOINTS
// =========================================================================

/**
 * @route GET /api/health
 * @desc System healthcheck and network connectivity status
 */
app.get("/api/health", async (req, res) => {
  let isNodeAlive = false;
  let blockNumber = 0;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    blockNumber = await provider.getBlockNumber();
    isNodeAlive = true;
  } catch (err) {
    isNodeAlive = false;
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    system: "Blockchain-Based Digital Judiciary Management System",
    contractAddress: CONTRACT_ADDRESS,
    rpcUrl: RPC_URL,
    blockchainConnected: isNodeAlive,
    latestBlock: blockNumber,
    pinataConfigured: Boolean(
      (process.env.PINATA_JWT && !process.env.PINATA_JWT.includes("your_pinata")) ||
      (process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET && !process.env.PINATA_API_KEY.includes("your_pinata"))
    )
  });
});

/**
 * @route GET /api/pinata/status
 * @desc Tests and returns live Pinata IPFS cloud authentication status
 */
app.get("/api/pinata/status", async (req, res) => {
  const result = await authenticatePinata();
  const mode = result.authenticated ? "pinata-cloud" : "local-ipfs-fallback";
  res.json({
    ...result,
    mode,
    gateway: process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/"
  });
});

/**
 * @route POST /api/evidence/upload
 * @desc Accepts an evidence document, calculates its SHA-256 fingerprint, and pins to IPFS.
 */
app.post("/api/evidence/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing required file upload." });
    }

    const { caseId, role, description } = req.body;

    // Pin file to IPFS and obtain 32-byte cryptographic SHA-256 digest
    const pinResult = await pinFileToIPFS(req.file.buffer, req.file.originalname, {
      caseId,
      role: role || "Litigant",
      description: description || ""
    });

    res.json({
      success: true,
      message: "File successfully hashed and pinned to decentralized storage.",
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ipfsCID: pinResult.ipfsCID,
      documentHash: pinResult.documentHash, // 0x-prefixed SHA-256 hash
      gatewayURL: pinResult.gatewayURL,
      storageMode: pinResult.mode
    });
  } catch (error) {
    console.error("Error in /api/evidence/upload:", error);
    res.status(500).json({
      error: "Failed to process and pin document",
      details: error.message
    });
  }
});

/**
 * @route POST /api/evidence/verify-integrity
 * @desc Evaluator Audit Endpoint: Recomputes the SHA-256 hash of an uploaded file and queries
 * the live smart contract to verify if this exact document exists on the immutable ledger.
 */
app.post("/api/evidence/verify-integrity", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing required file to verify." });
    }

    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: "Target caseId is required for verification." });
    }

    // 1. Calculate local cryptographic SHA-256 hash from uploaded bytes
    const computedHash = computeDocumentHash(req.file.buffer);

    // 2. Query the live smart contract on Ethereum / Anvil
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, JUDICIARY_CORE_ABI, provider);

    const [isAuthentic, documentType, recordedTimestamp, certifiedBy] = await contract.verifyDocumentHash(
      caseId,
      computedHash
    );

    if (isAuthentic) {
      return res.json({
        verified: true,
        status: "AUTHENTIC_PROOF_VERIFIED",
        message: "Match Confirmed: The cryptographic fingerprint of this document matches the immutable court ledger verbatim.",
        caseId: Number(caseId),
        documentHash: computedHash,
        documentType: documentType, // "EVIDENCE" or "VERDICT"
        recordedTimestamp: Number(recordedTimestamp),
        recordedDate: new Date(Number(recordedTimestamp) * 1000).toLocaleString(),
        certifiedBy: certifiedBy
      });
    } else {
      return res.json({
        verified: false,
        status: "TAMPER_DETECTED_OR_UNREGISTERED",
        message: "INTEGRITY ALERT: The cryptographic hash of this file does NOT match any official evidence or verdict recorded on-chain for this case. This document has either been modified or was never admitted to court.",
        caseId: Number(caseId),
        calculatedHash: computedHash
      });
    }
  } catch (error) {
    console.error("Error in /api/evidence/verify-integrity:", error);
    res.status(500).json({
      error: "Verification failed against blockchain ledger",
      details: error.message
    });
  }
});

// Start Express HTTP Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Judiciary Backend Service is running on port ${PORT}`);
  console.log(`Blockchain RPC Target: ${RPC_URL}`);
  console.log(`JudiciaryCore Smart Contract: ${CONTRACT_ADDRESS}`);
  console.log(`=======================================================`);
});
