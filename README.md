# SafeStake - Responsible Gambling Protocol

SafeStake is a cross-platform responsible gambling protocol built on Concordium blockchain, designed to make regulatory compliance and responsible gambling easy to implement for gambling platforms.

## Overview

SafeStake enables gambling operators to verify user age and compliance requirements through zero-knowledge proofs while maintaining user privacy. The protocol enforces betting limits and provides a unified compliance framework across multiple gambling platforms.

### Key Features

- Zero-knowledge age verification without exposing personal data
- Cross-platform betting limit enforcement
- Smart contract-based transaction registry
- Protocol-Level Token (PLT) support for real money gambling
- Easy-to-integrate operator SDK

### Live testnet demos 

- https://safestake-sportsbook.netlify.app/
- https://safestake-casino.netlify.app/
- https://safestake-dashboard.netlify.app/
- stuff like transaction history is just simulated on the websites , betting ,setting limits, self exclusion and all that works and is enforces cross platform 

contract module on testet :
- https://testnet.ccdscan.io/nodes?dcount=1&dentity=module&dmoduleReference=58013adf8f775a51652096910919eb5980ea3bea25d9a612aad724baa95a7c41


## Architecture

SafeStake consists of four main components working together:

1. **Smart Contracts**: Rust-based Concordium smart contracts that store verified signatures and track transactions
2. **Backend Verifier**: Node.js service that verifies ZK proofs and signs verified accounts
3. **Operator SDK**: TypeScript SDK for gambling platforms to integrate SafeStake
4. **Demo Applications**: Reference implementations showing real-world usage

## Repository Structure

### `/contracts`

Concordium smart contracts written in Rust with signature verification capabilities.

**Key Contract**: `safestake-registry`

- Stores verifier public keys
- Validates account signatures from backend verifier
- Records gambling transactions
- Tracks user betting limits across platforms

### `/backend-verifier`

Express.js backend service that acts as the trusted verifier.

**Endpoints**:

```typescript
POST / api / verify - and - sign;
// Verify age proof and sign account address
// Body: { accountAddress: string, proof: VerifiablePresentation }
// Returns: { signature: string, accountAddress: string, timestamp: number }

GET / api / public - key;
// Returns the verifier's public key for smart contract storage

GET / health;
// Health check endpoint
```

**Responsibilities**:

- Verify zero-knowledge proofs using Concordium's hosted verifiers
- Sign verified account addresses using Ed25519
- Provide public key for on-chain verification

### `/sdk`

Operator SDK (npm package) for easy SafeStake integration.

**Features**:

- Registration flow with ZK proof verification
- Transaction recording
- Eligibility checking
- Betting limit enforcement
- PLT transfer support
- Browser and Node.js environments

**Installation**:

```bash
npm install @safestake/operator-sdk
```

### `/demo`

Three demonstration applications showing SafeStake in action:

**1. safestake-casino**

- Dice game implementation
- Real-time betting with PLT transfers
- Shows single-game gambling integration

**2. safestake-sportsbook**

- Sports betting interface
- Parlay betting support
- Multi-event bet tracking
- Demonstrates complex gambling scenarios

**3. safestake-dashboard**

- User-facing dashboard
- Registration and verification flow
- Betting history across all platforms
- Cross-platform limit monitoring

## Getting Started

### Prerequisites

- Rust 1.73+ with wasm32 target (should not be newer than 1.85.1)
- Cargo Concordium
- Node.js 18+
- Concordium Browser Wallet

### Setup for Testnet

#### 1. Deploy Smart Contract

```bash
cd contracts/safestake-registry
cargo concordium build
concordium-client module deploy where_this_file_is.wasm.v1 \
  --sender <YOUR_ACCOUNT> \
  --grpc-port 20000 \
  --grpc-ip grpc.testnet.concordium.com
```

Initialize the contract with the verifier's public key:

```bash
concordium-client contract init <MODULE_HASH> \
  --contract safestake-registry \
  --parameter-json init-params.json \
  --sender <YOUR_ACCOUNT> \
  --energy 10000
```

#### 2. Start Backend Verifier

```bash
cd backend-verifier
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The verifier will run on `http://localhost:3001`

#### 3. Configure SDK in Demo Apps

Update the configuration in each demo app:

```typescript
// config.ts
export const CONTRACT_INDEX = <YOUR_CONTRACT_INDEX>;
export const CONTRACT_SUBINDEX = 0n;
export const NODE_ADDRESS = "grpc.testnet.concordium.com";
export const NODE_PORT = 20000;
export const VERIFIER_BACKEND_URL = "http://localhost:3001";
```

#### 4. Run Demo Applications

```bash
# Casino Demo
cd demo/safestake-casino
npm install
npm run dev

# Sportsbook Demo
cd demo/safestake-sportsbook
npm install
npm run dev

# Dashboard Demo
cd demo/safestake-dashboard
npm install
npm run dev
```

## User Flow

1. **Registration**

   - User generates ZK proof of age (18+) using Concordium wallet
   - Proof sent to backend verifier
   - Verifier validates proof and signs account address
   - Signature stored on-chain via smart contract

2. **Placing Bets**

   - User places bet on any SafeStake-integrated platform
   - SDK checks betting limits across all platforms
   - If eligible, executes PLT transfer to platform
   - Transaction recorded in smart contract registry

3. **Cross-Platform Enforcement**
   - All bets tracked in single on-chain registry
   - Limits enforced globally across all platforms
   - Users can view complete betting history

## Technology Stack

- **Blockchain**: Concordium Testnet
- **Smart Contracts**: Rust, Concordium SDK
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React, TypeScript, Vite
- **SDK**: TypeScript, Concordium Web SDK
- **Cryptography**: Ed25519 signatures, ZK proofs

## Development

### Running Tests

```bash
# Smart Contract Tests
cd contracts/safestake-registry
cargo concordium test

# Backend Tests
cd backend-verifier
npm test

# SDK Tests
cd sdk
npm test
```

### Building for Production

```bash
# Smart Contracts
cd contracts/safestake-registry
cargo concordium build

# Backend
cd backend-verifier
npm run build

# SDK
cd sdk
npm run build

# Demo Apps
cd demo/<app-name>
npm run build
```

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For questions or support, please open an issue on GitHub.

## Acknowledgments

Built for Encode x Concordium Hackathon 2025

---

**Note**: This is a hackathon prototype. Do not use in production without proper security audits and compliance review.

## Project structure

```
├── stuff-to-do.md
├── .gitignore
├── README.md
├── plan.md
│
├── backend-verifier/
│   ├── .env.example
│   ├── README.md
│   ├── babel.config.js
│   ├── jest.config.js
│   ├── package-lock.json
│   ├── package.json
│   ├── src/
│   │   ├── config.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── tests/
│   │   ├── fixtures/
│   │   │   ├── data.ts
│   │   │   └── mock-data.ts
│   │   ├── integration.test.ts
│   │   └── unit.test.ts
│   ├── tsconfig.build.json
│   └── tsconfig.json
│
├── contracts/
│   └── safestake-registry/
│       ├── .vscode/
│       │   └── settings.json
│       ├── Cargo.toml
│       ├── concordium-out/
│       │   └── module.wasm.v1
│       ├── deploy-scripts/
│       │   ├── Cargo.toml
│       │   ├── README.md
│       │   └── src/
│       │       ├── deployer.rs
│       │       └── main.rs
│       ├── src/
│       │   └── lib.rs
│       └── tests/
│           └── tests.rs
│
├── demo/
│   ├── safestake-casino/
│   │   ├── .gitignore
│   │   ├── .npmrc
│   │   ├── README.md
│   │   ├── components.json
│   │   ├── eslint.config.js
│   │   ├── index.html
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── public/
│   │   │   └── vite.svg
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── assets/
│   │   │   │   └── react.svg
│   │   │   ├── components/
│   │   │   │   ├── AgeVerification.tsx
│   │   │   │   ├── CasinoGame.tsx
│   │   │   │   ├── WalletConnection.tsx
│   │   │   │   └── ui/
│   │   │   │       ├── avatar.tsx
│   │   │   │       ├── badge.tsx
│   │   │   │       ├── button.tsx
│   │   │   │       ├── card.tsx
│   │   │   │       ├── dialog.tsx
│   │   │   │       ├── input.tsx
│   │   │   │       ├── label.tsx
│   │   │   │       ├── progress.tsx
│   │   │   │       ├── separator.tsx
│   │   │   │       └── tabs.tsx
│   │   │   ├── config.ts
│   │   │   ├── index.css
│   │   │   ├── lib/utils.ts
│   │   │   └── main.tsx
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   └── vite.config.ts
│   │
│   ├── safestake-dashboard/
│   │   ├── .gitignore
│   │   ├── .npmrc
│   │   ├── README.md
│   │   ├── components.json
│   │   ├── eslint.config.js
│   │   ├── index.html
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── public/
│   │   │   └── vite.svg
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── assets/
│   │   │   │   └── react.svg
│   │   │   ├── components/
│   │   │   │   ├── AccountSettings.tsx
│   │   │   │   ├── DashboardOverview.tsx
│   │   │   │   ├── TransactionHistory.tsx
│   │   │   │   └── ui/
│   │   │   │       ├── alert.tsx
│   │   │   │       ├── avatar.tsx
│   │   │   │       ├── badge.tsx
│   │   │   │       ├── button.tsx
│   │   │   │       ├── card.tsx
│   │   │   │       ├── dialog.tsx
│   │   │   │       ├── input.tsx
│   │   │   │       ├── label.tsx
│   │   │   │       ├── progress.tsx
│   │   │   │       ├── scroll-area.tsx
│   │   │   │       ├── select.tsx
│   │   │   │       ├── separator.tsx
│   │   │   │       ├── switch.tsx
│   │   │   │       └── tabs.tsx
│   │   │   ├── config.ts
│   │   │   ├── index.css
│   │   │   ├── lib/utils.ts
│   │   │   └── main.tsx
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   └── vite.config.ts
│   │
│   └── safestake-sportsbook/
│       ├── .gitignore
│       ├── .npmrc
│       ├── README.md
│       ├── components.json
│       ├── eslint.config.js
│       ├── index.html
│       ├── package-lock.json
│       ├── package.json
│       ├── public/
│       │   └── vite.svg
│       ├── src/
│       │   ├── App.css
│       │   ├── App.tsx
│       │   ├── assets/
│       │   │   └── react.svg
│       │   ├── components/
│       │   │   ├── BetSlip.tsx
│       │   │   ├── MatchDisplay.tsx
│       │   │   ├── UserProfile.tsx
│       │   │   └── ui/
│       │   │       ├── alert.tsx
│       │   │       ├── badge.tsx
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── input.tsx
│       │   │       ├── label.tsx
│       │   │       ├── progress.tsx
│       │   │       ├── scroll-area.tsx
│       │   │       ├── separator.tsx
│       │   │       └── tabs.tsx
│       │   ├── config.ts
│       │   ├── index.css
│       │   ├── lib/utils.ts
│       │   └── main.tsx
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
│
└── sdk/
    ├── .env.example
    ├── examples/
    │   └── quick-test.js
    ├── jest.config.js
    ├── package-lock.json
    ├── package.json
    ├── src/
    │   ├── SafeStakeSDK.ts
    │   ├── VerifierClient.ts
    │   ├── index.browser.ts
    │   ├── index.ts
    │   ├── safeStakeSDK.browser.ts
    │   └── types.ts
    ├── test/
    │   └── SafeStakeSDK.test.ts
    └── tsconfig.json
```
