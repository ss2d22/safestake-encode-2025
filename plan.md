```
┌──────────────────────────────────────────────────────────────────────┐
│                        SAFESTAKE PROTOCOL                            │
│                      (With Age Verification)                         │
└──────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │      USER +     │
                           │      WALLET     │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌─────────────────┐  ┌──────────┐  ┌─────────────────┐
         │     DiceStake   │  │          │  │     RoulettePro │
         │     Casino      │  │Dashboard │  │     Casino      │
         │   (React App)   │  │(React App)  │   (React App)   │
         └────────┬────────┘  └─────┬────┘  └────────┬────────┘
                  │                 │                 │
                  └─────────────────┼─────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │      OPERATOR SDK            │
                     │   (TypeScript Library)       │
                     │                              │
                     │  • registerUser(signature)   │
                     │  • verifyAge()               │
                     │  • checkEligibility()        │
                     │  • recordTransaction()       │
                     │  • setLimits()               │
                     └──────┬──────────────┬────────┘
                            │              │
                ┌───────────┘              └───────────┐
                │                                      │
                ▼                                      ▼
    ┌─────────────────────┐              ┌─────────────────────┐
    │     BACKEND         │              │      MONITORING     │
    │  VERIFIER           │              │  SERVICE            │
    │  (Node.js)          │              │  (Node.js)          │
    │                     │              │                     │
    │ • Generate Challenge│              │ • Watch     txns    │
    │ • Verify ZK Proofs  │              │ • Real-time alerts  │
    │ • Sign Accounts     │              │ • WebSocket server  │
    └──────────┬──────────┘              └──────────┬──────────┘
               │                                    │
               └────────────────┬───────────────────┘
                                │
                                ▼
                 ┌──────────────────────────────────┐
                 │   ⛓️ SMART CONTRACT              │
                 │   (Rust - Concordium)            │
                 │                                  │
                 │ • verifier_key (public key)      │
                 │ • register_user(signature)       │
                 │ • check_eligibility()            │
                 │ • record_transaction()           │
                 │ • set_limits()                   │
                 │ • self_exclude()                 │
                 │                                  │
                 │ STATE:                           │
                 │ • age_verified: bool             │
                 │ • daily_limit, monthly_limit     │
                 │ • daily_spent, monthly_spent     │
                 │ • platforms_used                 │
                 │ • cooldown_until                 │
                 └──────────────┬───────────────────┘
                                │
                                ▼
                 ┌──────────────────────────────────┐
                 │   🔗 CONCORDIUM BLOCKCHAIN       │
                 │   (Testnet / Mainnet)            │
                 │                                  │
                 │ • Contract State Storage         │
                 │ • PLT Transaction History        │
                 │ • Cross-Platform Registry        │
                 └──────────────────────────────────┘

```

═══════════════════════════════════════════════════════════════════════

                     AGE VERIFICATION FLOW

    User → Wallet → Casino → SDK → Backend Verifier
                                        ↓
                                   Verify ZK Proof ✓
                                        ↓
                                   Sign Account
                                        ↓
    User ← Wallet ← Casino ← SDK ← Signature
                                        ↓
                            Smart Contract
                                        ↓
                            Verify Signature ✓
                                        ↓
                        Store age_verified = true

═══════════════════════════════════════════════════════════════════════
