# safestake-encode-2025

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
