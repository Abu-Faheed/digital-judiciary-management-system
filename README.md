# Blockchain-Based Digital Judiciary Management System (BDMS)

### عدالتی نظامِ انصاف — پشاور ڈویژن (بلاک چین ٹیکنالوجی)

> **Final Year Project (FYP) — Bachelor of Science in Software Engineering**  
> **Institution**: Islamia College University Peshawar (ICP), Khyber Pakhtunkhwa (KP), Pakistan  
> **Judicial Jurisdiction**: District & Sessions Courts Peshawar & Peshawar High Court (PHC)  
> **Tech Stack**: Solidity (^0.8.24), Foundry (Forge/Anvil), Node.js, Express.js, IPFS (Pinata SDK), React (Vite), ethers.js (v6).

---

## 1. Executive Summary & Problem in Pakistani Courts

In Pakistani courts (District Courts Peshawar, Peshawar High Court, and subordinate judiciary), legal proceedings rely heavily on paper records, manual file maintenance by Court Readers (_Moharrir / Ahlmad_), and physical evidence storage (_Malkhana_). This system suffers from chronic challenges:

- **Missing & Altered Case Records (مسل کا غائب ہونا یا تبدیلی)**: Physical case files (_Misal_) or order sheets (_Hukamnama_) can be tampered with or delayed through corruption and manual handling.
- **Evidence Tampering in Malkhana (ثبوتوں میں خرد برد)**: Forensic reports, police challans (under Section 173 CrPC), and property registry records (_Inteqal_) are vulnerable to unauthorized modification or substitution.
- **Unwarranted Adjournments (غیر ضروری تاریخ پیشی)**: Delays occur due to a lack of transparent, verifiable tracking of trial proceedings.

### The Blockchain & Cryptographic Solution

This project implements a decentralized, zero-trust legal records framework:

1. **Immutable Smart Contract Ledger**: Every court action (filing by Moharrir, evidence submission by Advocates, hearing bench notes by the Sessions Judge, and final decree pronouncement) is permanently anchored to the blockchain.
2. **Dual-Layer Storage Architecture**: Heavy documents (PDFs, challans, forensic scans, audio recordings) are stored off-chain on the InterPlanetary File System (IPFS), while their unique **256-bit SHA-256 cryptographic digests ("Digital Mohar")** are stored on-chain.
3. **Pakistani Role-Based Access Control (RBAC)**: Enforced via OpenZeppelin's `AccessControl`, strictly segregating duties between Court Readers (_Ahlmad_), Presiding Judges (_Fazil Adalat_), Advocates (_Wakeel_), and Citizens (_Aam Shehri_).
4. **Permanent Case Sealing (محفوظ و فیصلہ شدہ)**: Once a verdict (_Faisla_) is pronounced, the smart contract transitions the case to `DISPOSED`, freezing the record against any post-trial evidence injection.

---

## 2. Pakistani Court System Mapping & Role Matrix

| Role in System           | Pakistani Court Title                              | Cryptographic Role Identifier              | Authorized Court Functions                                                              |
| :----------------------- | :------------------------------------------------- | :----------------------------------------- | :-------------------------------------------------------------------------------------- |
| **Registrar General**    | Registrar, Peshawar High Court                     | `DEFAULT_ADMIN_ROLE` (`0x00...`)           | Role certification, officer credentialing, system oversight                             |
| **Court Reader / Clerk** | Ahlmad / Moharrir (اہلمد / محرر)                   | `CLERK_ROLE` (`keccak256("CLERK_ROLE")`)   | Case docket intake (`fileNewCase`), fee & wakalatnama verification                      |
| **Presiding Magistrate** | Sessions Judge / Senior Civil Judge (فاضل جج صاحب) | `JUDGE_ROLE` (`keccak256("JUDGE_ROLE")`)   | Order sheet logging (`recordCourtHearing`), verdict delivery (`pronouncementOfVerdict`) |
| **Licensed Counsel**     | Advocate High Court / Wakeel (وکیل)                | `LAWYER_ROLE` (`keccak256("LAWYER_ROLE")`) | Evidence admission (`appendEvidence`) for Mudai (Petitioner) & Mudda Alaih (Defense)    |
| **Public Citizen**       | Aam Shehri / Public Observer (عام شہری)            | No role required (Public)                  | Read-only verification of court dockets and live document tamper audit                  |

---

## 3. Case Lifecycle in Pakistani Procedural Law

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       FILED / DAAKHIL (درخواست دائر)                     │
   │  Case docketed by Moharrir; verified Judge and Advocates assigned      │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼ [recordCourtHearing executed by Judge]
   ┌────────────────────────────────────────────────────────────────────────┐
   │                  UNDER_TRIAL / ZAIR-E-SAMAAT (زیر سماعت عدالت)          │
   │  Tareekh-e-Pesh scheduled; evidence (Saboot) admitted by Advocates     │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼ [Final arguments concluded / Behs Mukammal]
   ┌────────────────────────────────────────────────────────────────────────┐
   │               AWAITING_VERDICT / BEHS MUKAMMAL (بحث مکمل - برائے فیصلہ) │
   │  Bench deliberation; ready for final judgment                          │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼ [pronouncementOfVerdict executed by Judge]
   ┌────────────────────────────────────────────────────────────────────────┐
   │                  DISPOSED / FAISLA SHUDA (فیصلہ شدہ - ریکارڈ محفوظ)     │
   │  Case sealed permanently; zero further evidence or edits permitted     │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Monorepo Project Structure

```
bdms/
├── contracts/                        # Foundry Smart Contract Suite
│   ├── foundry.toml                  # Solidity 0.8.24 optimizer & remappings
│   ├── src/
│   │   └── JudiciaryCore.sol         # Core smart contract with RBAC & state machine
│   ├── test/
│   │   └── JudiciaryCore.t.sol       # 11 unit & tamper-detection tests
│   └── script/
│       └── DeployJudiciary.s.sol     # Deployment script with Peshawar Court seed data
├── server/                           # Express.js Backend Middleware
│   ├── package.json
│   ├── .env.example
│   ├── .env
│   ├── services/
│   │   └── pinataService.js          # SHA-256 calculation & Pinata IPFS pinning
│   └── index.js                      # Evidence upload & live blockchain verification APIs
├── client/                           # React (Vite) Web Portal (100% Full-Width)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── index.css                 # Full-width responsive Pakistani institutional theme
│       ├── contractAbi.js            # Contract ABI & role hash constants
│       ├── App.jsx                   # Web3 state & role simulation manager
│       └── components/
│           ├── Header.jsx            # National credentials badge & persona switcher
│           ├── RegisteredCasesList.jsx # Fahrist-e-Muqaddamat (Daily Cause List & Case Registry)
│           ├── CaseTimeline.jsx      # Chronological order sheet & live tamper audit tool
│           ├── CaseRegistration.jsx  # Dakhil-e-Muqaddama (Moharrir case intake)
│           ├── EvidenceUploader.jsx  # Saboot & Dastawaiz (Advocate evidence admission)
│           ├── HearingScheduler.jsx  # Tareekh-e-Pesh & Order Sheet (Judge session log)
│           ├── VerdictPronouncement.jsx # Faisla-e-Adalat & Degree (Final verdict sealing)
│           ├── RoleManagement.jsx    # Intizam-e-Asnad (Registrar General on-chain RBAC portal)
│           └── InfoTooltip.jsx       # Interactive procedural & cryptographic guide tooltips
└── README.md
```

---

## 5. How to Run the Project (Step-by-Step)

### Step 1: Run Smart Contract Unit Tests

Verify all 11 security and access control tests:

```bash
forge test -vv
```

_Expected: 11 tests passed; 0 failed._

---

### Step 2: Start Local Ethereum Node (Terminal 1)

Spin up a local Anvil node with 10 pre-funded test accounts:

```bash
anvil
```

_Listens on `http://127.0.0.1:8545`._

---

### Step 3: Deploy Smart Contract to Local Node (Terminal 2)

In a second terminal window (from `/home/abu-faheed/bdms`):

```bash
forge script contracts/script/DeployJudiciary.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

This deploys the contract to `0x5FbDB2315678afecb367f032d93F642f64180aa3`, grants all demo roles to Peshawar Court actors, and creates pilot **Docket #1** (_Peshawar Development Authority vs. Khyber Logistics Corporation_).

---

### Step 4: Launch Backend Middleware (Terminal 3)

```bash
cd /home/abu-faheed/bdms/server
npm start
```

_Backend runs on `http://localhost:5000`._  
_(Note: Pinata cloud keys can be added to `server/.env`. If left empty, it runs in local offline deterministic IPFS fallback mode)._

---

### Step 5: Launch Frontend Web Portal (Terminal 4)

```bash
cd /home/abu-faheed/bdms/client
npm run dev
```

Open your browser and navigate to:  
👉 **`http://localhost:3000`**

---

## 6. Thesis Defense & Supervisor Presentation Walkthrough (Islamia College Peshawar)

Follow this structured demonstration script during your FYP defense:

### Step 1: Institutional Authority & Officer Credentialing (Header)

1. Point to the header: Highlight the **Islamia College University Peshawar (ICP)** banner and the **Peshawar High Court & District Courts** division.
2. Explain to the external examiner: _“In Pakistan’s conventional judiciary, anyone could claim authority without instant verification. Here, every action requires a cryptographic digital signature verified against OpenZeppelin's on-chain AccessControl.”_
3. Use the **Active Court Officer Persona** dropdown to demonstrate role switching between _Ahlmad (Clerk)_, _Sessions Judge_, _Wakeel Mudai_, _Wakeel Mudda Alaih_, and _Aam Shehri_.

### Step 2: Dakhil-e-Muqaddama / Case Filing (Clerk Portal)

1. Switch persona to **Ahlmad / Moharrir (Court Reader)**.
2. Click the **Dakhil-e-Daftar** tab.
3. Click **Auto-Fill Peshawar Court Docket (مثال برائے معائنہ)**.
4. Show that the nominated Judge and Advocates possess verified addresses on-chain.
5. Click **Register & Anchor Docket On-Chain (درج رجسٹر عدالت)**.
6. The smart contract validates on-chain credentials and emits `CaseFiled`, assigning a new Misal / Docket number.

### Step 3: Saboot & Dastawaiz Admission (Counsel Portal)

1. Switch persona to **Advocate High Court (Wakeel Mudai)**.
2. Navigate to **Saboot & Dastawaiz**.
3. Select your newly created case.
4. Upload any court exhibit (e.g. PDF of Police FIR, Bank Statement, or Property Inteqal).
5. Click **1. Compute Cryptographic Fingerprint & Upload to IPFS**.
   - Show the examiner the **256-bit SHA-256 digest** and IPFS CID.
6. Click **2. Commit Proof Permanently to Court Smart Contract**.
   - The evidence hash is permanently sealed into the blockchain ledger.

### Step 4: Tareekh-e-Pesh & Order Sheet (Judge Portal)

1. Switch persona to **Sessions Judge / Senior Civil Judge (Fazil Adalat)**.
2. Navigate to **Tareekh-e-Pesh**.
3. Enter official bench minutes in the order sheet.
4. Click **Log Hearing on Court Ledger (اندراج روئیداد سماعت)**.
5. The status automatically advances to **`UNDER_TRIAL / ZAIR-E-SAMAAT (زیر سماعت عدالت)`**.

### Step 5: Faisla-e-Adalat & Permanent Sealing (Judge Portal)

1. Navigate to **Faisla-e-Adalat**.
2. Enter the operative judgment decree summary (e.g., _"Suit decreed in favor of Plaintiff..."_).
3. Click **Deliver Verdict & Seal Docket Permanently (صادِر حتمی فیصلہ و سیل)**.
4. The case transitions to **`DISPOSED (فیصلہ شدہ - ریکارڈ محفوظ)`**.
5. **Key Defense Demonstration**: Try submitting new evidence to this case. The smart contract reverts with `CaseAlreadyDisposed()`, proving mathematically that no party can inject late evidence after trial conclusion.

### Step 6: THE WINNING DEMO — Live Document Tamper Audit Tool

1. Switch persona to **Aam Shehri / Public Citizen** and open **Roodad-e-Muqaddama (Timeline & Proofs)**.
2. Scroll to the **Dastawaiz Ki Tasdeeq (Live Cryptographic Tamper-Proofing Audit Tool)**.
3. **Test 1 (Authentic File)**:
   - Select the exact document you uploaded in Step 3.
   - Click **Audit Document Integrity**.
   - 🟢 **Result**: Green banner confirming **`AUTHENTIC COURT RECORD CONFIRMED (مصدقہ اصلی عدالتی دستاویز)`**.
4. **Test 2 (Tampered File)**:
   - Open the file on your laptop, modify **a single Urdu or English character**, and save it.
   - Upload the modified file and click **Audit Document Integrity**.
   - 🔴 **Result**: Instant red alert: **`TAMPER DETECTION ALERT / UNREGISTERED FILE (خبردار: دستاویز میں ردوبدل یا جعلی اندراج پایا گیا)`**.
5. _Explain to the committee: “This proves the SHA-256 avalanche effect. A corrupt actor altering even a single byte fails on-chain mathematical verification completely.”_

---

## 7. Anticipated Examiner Questions & Model Answers

**Q1: Why not store the entire PDF document on the Ethereum blockchain?**  
_Answer_: Storing large binary files (10MB–50MB) on-chain is cost-prohibitive (millions of gas) and causes state bloat. Instead, we use an off-chain/on-chain hybrid architecture: the heavy document resides on IPFS, while its unique 32-byte SHA-256 hash is anchored on-chain. This provides identical mathematical security with minimal gas cost.

**Q2: What happens if someone replaces the file on the IPFS server?**  
_Answer_: IPFS is content-addressable. Changing the file changes its Content Identifier (CID). Furthermore, our smart contract stores the raw file's SHA-256 hash. Any modified file produces a different hash and is instantly flagged as counterfeit by the `verifyDocumentHash()` contract function.

**Q3: How does this prevent unauthorized judges or clerks from filing cases?**  
_Answer_: We utilize OpenZeppelin's `AccessControl`. Functions like `fileNewCase()` are restricted strictly to addresses possessing `CLERK_ROLE`. Furthermore, the assigned judge and advocates must possess certified `JUDGE_ROLE` and `LAWYER_ROLE` on-chain, or the transaction reverts.

---

## 8. Academic Submission & Accreditation

Submitted in partial fulfillment of the requirements for the degree of:  
**Bachelor of Science in Software Engineering**  
**Islamia College University Peshawar (ICP)**, Khyber Pakhtunkhwa, Pakistan.
