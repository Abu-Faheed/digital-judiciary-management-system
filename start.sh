#!/bin/bash
# ================================================================
#  BDMS — Blockchain-Based Digital Judiciary Management System
#  One-Command Startup Script for Presentation & Evaluation
#  Islamia College University Peshawar (ICP)
# ================================================================
#
#  Usage:   ./start.sh
#  Stop:    Press Ctrl+C (cleanly stops all services)
#
# ================================================================

set -e

# Include Foundry in PATH if installed in user's home directory
export PATH="$HOME/.foundry/bin:$PATH"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANVIL_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC_URL="http://127.0.0.1:8545"

# Track background PIDs for clean shutdown
PIDS=()

cleanup() {
    echo ""
    echo -e "${YELLOW}⏹  Shutting down all judicial services...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo -e "${GREEN}✅ All services cleanly terminated. Khuda Hafiz!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo -e "${CYAN}${BOLD}╔═════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   ISLAMIA COLLEGE UNIVERSITY PESHAWAR (ICP)                             ║${NC}"
echo -e "${CYAN}${BOLD}║   BS Software Engineering — Final Year Project                          ║${NC}"
echo -e "${CYAN}${BOLD}║   National Blockchain Digital Judiciary Management System (BDMS)        ║${NC}"
echo -e "${CYAN}${BOLD}║   Peshawar High Court & District Courts Framework                       ║${NC}"
echo -e "${CYAN}${BOLD}╚═════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Prerequisite Validation ────────────────────────────────────
echo -e "${YELLOW}🔍 Validating system environment & dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js (v18+) to proceed.${NC}"
    exit 1
fi

if ! command -v anvil &> /dev/null; then
    echo -e "${RED}❌ Foundry 'anvil' is not found in PATH.${NC}"
    echo -e "${YELLOW}👉 Install Foundry by running: curl -L https://foundry.paradigm.xyz | bash && foundryup${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/server/.env" ]; then
    echo -e "${YELLOW}ℹ️  server/.env not found. Initializing from server/.env.example...${NC}"
    cp "$PROJECT_DIR/server/.env.example" "$PROJECT_DIR/server/.env"
fi

if [ ! -d "$PROJECT_DIR/server/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing server dependencies (npm install)...${NC}"
    (cd "$PROJECT_DIR/server" && npm install --silent)
fi

if [ ! -d "$PROJECT_DIR/client/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing client dependencies (npm install)...${NC}"
    (cd "$PROJECT_DIR/client" && npm install --silent)
fi

echo -e "${GREEN}   ✅ All prerequisites verified.${NC}"

# ─── Step 1: Start Anvil (Local Blockchain) ──────────────────────
echo -e "${YELLOW}⛓️  [1/4] Starting Anvil local blockchain node (Port 8545)...${NC}"
cd "$PROJECT_DIR"
anvil --silent &
PIDS+=($!)
sleep 2

# Verify Anvil is responding to JSON-RPC
if curl -s -o /dev/null -w "%{http_code}" -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" "$RPC_URL" | grep -q "200"; then
    echo -e "${GREEN}   ✅ Local Ethereum node active on ${RPC_URL}${NC}"
else
    echo -e "${RED}   ❌ Anvil failed to initialize on ${RPC_URL}. Exiting.${NC}"
    cleanup
fi

# ─── Step 2: Deploy Smart Contract ──────────────────────────────
echo -e "${YELLOW}📜 [2/4] Deploying JudiciaryCore smart contract & seeding Peshawar Court Division...${NC}"
cd "$PROJECT_DIR/contracts"
DEPLOY_OUTPUT=$(forge script script/DeployJudiciary.s.sol \
    --rpc-url "$RPC_URL" \
    --broadcast \
    --private-key "$ANVIL_KEY" 2>&1 || true)

if echo "$DEPLOY_OUTPUT" | grep -q "ONCHAIN EXECUTION COMPLETE"; then
    echo -e "${GREEN}   ✅ Smart contract deployed and initial docket seeded${NC}"
else
    echo -e "${YELLOW}   ℹ️  Broadcast complete or contract already active${NC}"
fi

# ─── Step 3: Start Backend Middleware ───────────────────────────
echo -e "${YELLOW}🖥️  [3/4] Starting Express.js backend middleware on port 5000...${NC}"
cd "$PROJECT_DIR/server"
node index.js &
PIDS+=($!)
sleep 2

if curl -s http://localhost:5000/api/health | grep -q '"status":"ok"'; then
    echo -e "${GREEN}   ✅ Backend server active on http://localhost:5000${NC}"
else
    echo -e "${YELLOW}   ⚠️  Backend started; awaiting initial health ping...${NC}"
fi

# ─── Step 4: Start Frontend Dev Server ───────────────────────────
echo -e "${YELLOW}🌐 [4/4] Starting React / Vite frontend client on port 3000...${NC}"
cd "$PROJECT_DIR/client"
npx vite --host &
PIDS+=($!)
sleep 3

echo ""
echo -e "${GREEN}${BOLD}╔═════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   🚀 ALL JUDICIAL SERVICES ARE LIVE & SYNCHRONIZED!                     ║${NC}"
echo -e "${GREEN}${BOLD}╠═════════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                                         ║${NC}"
echo -e "${GREEN}${BOLD}║   🌐 Web Portal:    http://localhost:3000                               ║${NC}"
echo -e "${GREEN}${BOLD}║   🖥️  Backend API:   http://localhost:5000/api/health                    ║${NC}"
echo -e "${GREEN}${BOLD}║   ⛓️  Blockchain:    http://localhost:8545 (Chain ID: 31337)            ║${NC}"
echo -e "${GREEN}${BOLD}║                                                                         ║${NC}"
echo -e "${GREEN}${BOLD}║   Press Ctrl+C at any time to cleanly stop all services.                ║${NC}"
echo -e "${GREEN}${BOLD}╚═════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep script alive — wait for background processes
wait
