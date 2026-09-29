/**
 * @file pinataService.js
 * @description Decentralized IPFS Storage Service with SHA-256 Cryptographic Digest Generation.
 * 
 * Pedagogical Architecture Context:
 * In a blockchain-based judiciary system, storing full legal dossiers (PDFs, high-resolution crime scene photos,
 * audio recordings of court proceedings) directly on the Ethereum virtual machine (on-chain) is cost-prohibitive
 * and causes blockchain bloat. 
 * 
 * Instead, the system uses an off-chain/on-chain hybrid architecture:
 * 1. The heavy document is stored off-chain on the InterPlanetary File System (IPFS) via Pinata.
 * 2. A cryptographic SHA-256 checksum ("digital fingerprint") is calculated from the raw file bytes.
 * 3. The SHA-256 hash and the IPFS CID (Content Identifier) are anchored onto the smart contract.
 * 
 * If a bad actor modifies even a single comma or pixel in the off-chain file, its SHA-256 hash completely changes,
 * failing the on-chain verification check instantly.
 */

import crypto from "crypto";
import { Readable } from "stream";
import pinataSDK from "@pinata/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for local fallback storage when running offline / without Pinata keys
const LOCAL_STORAGE_DIR = path.join(__dirname, "../uploads/ipfs");
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

/**
 * Calculates a standard 0x-prefixed 32-byte SHA-256 cryptographic digest of a buffer.
 * @param {Buffer} buffer - Raw file bytes
 * @returns {string} 0x-prefixed 64-character hexadecimal SHA-256 hash (bytes32 compatible)
 */
export function computeDocumentHash(buffer) {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return `0x${hash}`;
}

/**
 * Encodes a buffer to Base58 (Bitcoin alphabet), matching standard IPFS CIDv0 format.
 */
function toBase58(buffer) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    digits.push(0);
  }
  return digits
    .reverse()
    .map((digit) => ALPHABET[digit])
    .join("");
}

/**
 * Generates a standard deterministic IPFS CIDv0 (Qm...) from file bytes.
 * CIDv0 is a multihash: 0x12 (sha2-256), 0x20 (32 bytes length), followed by 32-byte sha256.
 */
export function computeDeterministicCID(buffer) {
  const sha256 = crypto.createHash("sha256").update(buffer).digest();
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha256]);
  return toBase58(multihash);
}

/**
 * Instantiates the Pinata SDK using either PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET.
 * @returns {pinataSDK | null}
 */
export function getPinataClient() {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (jwt && jwt.trim() !== "" && !jwt.includes("your_pinata")) {
    return new pinataSDK({ pinataJWTKey: jwt.trim() });
  }

  if (apiKey && apiSecret && apiKey.trim() !== "" && !apiKey.includes("your_pinata")) {
    return new pinataSDK(apiKey.trim(), apiSecret.trim());
  }

  return null;
}

/**
 * Tests authentication against the Pinata API.
 * @returns {Promise<{ authenticated: boolean, message: string }>}
 */
export async function authenticatePinata() {
  const pinata = getPinataClient();
  if (!pinata) {
    return {
      authenticated: false,
      message: "No Pinata credentials configured in server/.env. Using local IPFS fallback."
    };
  }

  try {
    const auth = await pinata.testAuthentication();
    return {
      authenticated: true,
      message: auth.message || "Pinata authenticated successfully."
    };
  } catch (err) {
    return {
      authenticated: false,
      message: `Pinata authentication failed: ${err.message}`
    };
  }
}

/**
 * Pins a file to IPFS using Pinata SDK, or falls back to local content-addressable storage
 * if Pinata keys are not provided.
 * 
 * @param {Buffer} fileBuffer - Raw binary content of the court document/evidence
 * @param {string} originalName - Original file name (e.g. "Forensic_Report.pdf")
 * @param {object} metadata - Case context (caseId, role, description)
 * @returns {Promise<{ ipfsCID: string, documentHash: string, gatewayURL: string, mode: string }>}
 */
export async function pinFileToIPFS(fileBuffer, originalName, metadata = {}) {
  // 1. Calculate deterministic 32-byte SHA-256 hash for on-chain anchoring
  const documentHash = computeDocumentHash(fileBuffer);
  const gatewayBase = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

  const pinata = getPinataClient();

  if (pinata) {
    try {
      await pinata.testAuthentication();

      // Convert buffer to readable stream for Pinata SDK
      const stream = Readable.from(fileBuffer);
      const options = {
        pinataMetadata: {
          name: `BDMS-Case${metadata.caseId || "0"}-${originalName}`,
          keyvalues: {
            caseId: String(metadata.caseId || "N/A"),
            submittedRole: String(metadata.role || "Litigant"),
            sha256: documentHash,
            timestamp: new Date().toISOString()
          }
        },
        pinataOptions: {
          cidVersion: 0
        }
      };

      const result = await pinata.pinFileToIPFS(stream, options);
      const ipfsCID = result.IpfsHash;
      const gatewayURL = `${gatewayBase.replace(/\/$/, "")}/${ipfsCID}`;

      return {
        ipfsCID,
        documentHash,
        gatewayURL,
        mode: "pinata-cloud"
      };
    } catch (pinataError) {
      console.warn("Pinata API upload encountered an issue, falling back to local IPFS storage:", pinataError.message);
    }
  }

  // 2. Offline / Local Evaluation Mode Fallback:
  // Deterministically compute genuine standard IPFS CIDv0 (Qm...) and persist locally
  const ipfsCID = computeDeterministicCID(fileBuffer);
  const localFilePath = path.join(LOCAL_STORAGE_DIR, ipfsCID);
  fs.writeFileSync(localFilePath, fileBuffer);

  const serverPort = process.env.PORT || 5000;
  const localGatewayURL = `http://localhost:${serverPort}/ipfs/${ipfsCID}`;

  return {
    ipfsCID,
    documentHash,
    gatewayURL: localGatewayURL,
    mode: "local-ipfs-fallback"
  };
}
