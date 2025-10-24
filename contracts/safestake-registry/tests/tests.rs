//! tests for SafeStake Registry contract with age verification
//! 
//! I tried to use real Ed25519 cryptography with deterministic keys for reproducibility.

use concordium_smart_contract_testing::*;
use safestake_registry::*;

use concordium_std::{PublicKeyEd25519, SignatureEd25519};

// ed25519-dalek for signature generation
use ed25519_dalek::{SigningKey, Signer as DalekSigner};

// Test accounts
const ALICE: AccountAddress = AccountAddress([1u8; 32]);
const BOB: AccountAddress = AccountAddress([2u8; 32]);
const CHARLIE: AccountAddress = AccountAddress([3u8; 32]);
const ALICE_ADDR: Address = Address::Account(ALICE);
const BOB_ADDR: Address = Address::Account(BOB);

// Initial balances
const ACC_INITIAL_BALANCE: Amount = Amount::from_ccd(10_000);

// A signer with one set of keys
const SIGNER: Signer = Signer::with_one_key();

// ============================================================================
// CRYPTOGRAPHIC HELPER FUNCTIONS
// ============================================================================

// Generate a deterministic Ed25519 keypair for testing
// This uses a simple seed for reproducibility in tests
fn generate_test_keypair(seed: u8) -> (PublicKeyEd25519, SigningKey) {
    // Create a 32-byte seed (deterministic for testing)
    let mut seed_bytes = [0u8; 32];
    seed_bytes[0] = seed;
    
    // Generate signing key from seed
    let signing_key = SigningKey::from_bytes(&seed_bytes);
    
    // Get the verifying (public) key
    let verifying_key = signing_key.verifying_key();
    
    // Convert to Concordium types
    let public_key = PublicKeyEd25519(verifying_key.to_bytes());
    
    (public_key, signing_key)
}

// Sign an account address with a signing key
// This simulates what the backend verifier does after verifying age proof
fn sign_account_address(signing_key: &SigningKey, account: AccountAddress) -> SignatureEd25519 {
    // Sign the account address bytes
    let message = account.as_ref();
    let signature = signing_key.sign(message);
    
    // Convert to Concordium type
    SignatureEd25519(signature.to_bytes())
}

// Struct to hold test verifier credentials
struct TestVerifier {
    public_key: PublicKeyEd25519,
    signing_key: SigningKey,
}

impl TestVerifier {
    // Create a new test verifier with a specific seed
    fn new_with_seed(seed: u8) -> Self {
        let (public_key, signing_key) = generate_test_keypair(seed);
        Self { public_key, signing_key }
    }
    
    // Create a new test verifier with default seed
    fn new() -> Self {
        Self::new_with_seed(1)
    }
    
    fn sign_account(&self, account: AccountAddress) -> SignatureEd25519 {
        sign_account_address(&self.signing_key, account)
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn initialize_with_verifier(verifier: &TestVerifier) -> (Chain, ContractInitSuccess) {
    let mut chain = Chain::new();
    
    chain.create_account(Account::new(ALICE, ACC_INITIAL_BALANCE));
    chain.create_account(Account::new(BOB, ACC_INITIAL_BALANCE));
    chain.create_account(Account::new(CHARLIE, ACC_INITIAL_BALANCE));
    
    let module = module_load_v1("./concordium-out/module.wasm.v1")
        .expect("Module exists at path");
    let deployment = chain
        .module_deploy_v1(SIGNER, ALICE, module)
        .expect("Deploy valid module");
    
    // Initialize with verifier's public key
    let init_params = InitParams {
        verifier_key: verifier.public_key,
    };
    
    let init = chain
        .contract_init(
            SIGNER,
            ALICE,
            Energy::from(10_000),
            InitContractPayload {
                amount: Amount::zero(),
                mod_ref: deployment.module_reference,
                init_name: OwnedContractName::new_unchecked(
                    "init_safestake_registry".to_string()
                ),
                param: OwnedParameter::from_serial(&init_params)
                    .expect("Serialize init params"),
            },
        )
        .expect("Initializing contract");
    
    (chain, init)
}

fn register_user_with_age_verification(
    chain: &mut Chain,
    init: &ContractInitSuccess,
    account: AccountAddress,
    addr: Address,
    verifier: &TestVerifier,
) {
    // Backend verifies age proof and signs the account
    let signature = verifier.sign_account(account);
    
    let params = RegisterUserParams {
        account,
        signature,
    };
    
    chain
        .contract_update(
            SIGNER,
            account,
            addr,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.register_user".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect("Register user should succeed");
}

fn set_limits(
    chain: &mut Chain,
    init: &ContractInitSuccess,
    account: AccountAddress,
    addr: Address,
    daily: u64,
    monthly: u64,
) {
    let params = SetLimitsParams {
        daily_limit: Amount::from_micro_ccd(daily),
        monthly_limit: Amount::from_micro_ccd(monthly),
    };
    
    chain
        .contract_update(
            SIGNER,
            account,
            addr,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.set_limits".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect("Set limits should succeed");
}

fn check_eligibility(
    chain: &Chain,
    init: &ContractInitSuccess,
    user_account: AccountAddress,
    proposed_amount: u64,
) -> EligibilityStatus {
    let params = CheckEligibilityParams {
        user_account,
        proposed_amount: Amount::from_micro_ccd(proposed_amount),
    };
    
    let invoke = chain
        .contract_invoke(
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.check_eligibility".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect("Invoke should succeed");
    
    invoke
        .parse_return_value()
        .expect("Should return EligibilityStatus")
}

fn record_transaction(
    chain: &mut Chain,
    init: &ContractInitSuccess,
    user_account: AccountAddress,
    amount: u64,
    platform_id: &str,
) {
    let params = RecordTransactionParams {
        user_account,
        amount: Amount::from_micro_ccd(amount),
        platform_id: platform_id.to_string(),
    };
    
    chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.record_transaction".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect("Record transaction should succeed");
}

// ============================================================================
// TESTS - INITIALIZATION
// ============================================================================

// Test 1: Initialize contract successfully with verifier key
#[test]
fn test_init() {
    let verifier = TestVerifier::new();
    let (chain, init) = initialize_with_verifier(&verifier);
    
    assert_eq!(
        chain.contract_balance(init.contract_address),
        Some(Amount::zero()),
        "Contract should start with zero balance"
    );
}

// ============================================================================
// TESTS - AGE VERIFICATION & REGISTRATION WITH REAL SIGNATURES
// ============================================================================

// Test 2: Register user with valid signature from correct verifier
#[test]
fn test_register_user_with_valid_signature() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Register ALICE with valid signature
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    
    // Verify by checking eligibility (should not be NotRegistered)
    let status = check_eligibility(&chain, &init, ALICE, 100_000_000);
    assert_ne!(status, EligibilityStatus::NotRegistered);
}

// Test 3: Register user with invalid signature (wrong verifier)
#[test]
fn test_register_user_with_wrong_verifier_signature() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Create a DIFFERENT verifier with different seed (wrong signing key)
    let wrong_verifier = TestVerifier::new_with_seed(2);
    
    // Try to register with signature from wrong verifier
    let wrong_signature = wrong_verifier.sign_account(ALICE);
    
    let params = RegisterUserParams {
        account: ALICE,
        signature: wrong_signature,
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.register_user".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail with wrong verifier signature");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::InvalidSignature);
}

// Test 4: Register user with all-zero signature (obviously invalid)
#[test]
fn test_register_user_with_invalid_signature() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    let invalid_signature = SignatureEd25519([0u8; 64]);
    
    let params = RegisterUserParams {
        account: ALICE,
        signature: invalid_signature,
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.register_user".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail with invalid signature");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::InvalidSignature);
}

// Test 5: Register user with signature for different account
#[test]
fn test_register_user_with_mismatched_signature() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Sign BOB's account but try to register ALICE
    let bob_signature = verifier.sign_account(BOB);
    
    let params = RegisterUserParams {
        account: ALICE,  // Different account!
        signature: bob_signature,
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.register_user".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail - signature is for different account");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::InvalidSignature);
}

// Test 6: Register multiple users with valid signatures
#[test]
fn test_register_multiple_users() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Register ALICE
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    
    // Register BOB
    register_user_with_age_verification(&mut chain, &init, BOB, BOB_ADDR, &verifier);
    
    // Both should be registered
    let alice_status = check_eligibility(&chain, &init, ALICE, 100_000_000);
    let bob_status = check_eligibility(&chain, &init, BOB, 100_000_000);
    
    assert_ne!(alice_status, EligibilityStatus::NotRegistered);
    assert_ne!(bob_status, EligibilityStatus::NotRegistered);
}

// ============================================================================
// TESTS - COMPLETE FLOWS WITH AGE VERIFICATION
// ============================================================================

// Test 7: Complete flow - Register, Set Limits, Check Eligibility
#[test]
fn test_complete_flow_register_limits_eligibility() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Step 1: Register user with age verification
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    
    // Step 2: Set spending limits
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Step 3: Check eligibility - should be eligible now
    let status = check_eligibility(&chain, &init, ALICE, 500_000_000);
    assert_eq!(status, EligibilityStatus::Eligible);
}

// Test 8: Complete flow - Register, Set Limits, Record Transaction
#[test]
fn test_complete_flow_with_transaction() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Step 1: Register with age verification
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    
    // Step 2: Set limits
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Step 3: Check eligibility before transaction
    let status_before = check_eligibility(&chain, &init, ALICE, 500_000_000);
    assert_eq!(status_before, EligibilityStatus::Eligible);
    
    // Step 4: Record transaction
    record_transaction(&mut chain, &init, ALICE, 500_000_000, "platform_1");
    
    // Step 5: Check eligibility after transaction
    let status_after = check_eligibility(&chain, &init, ALICE, 500_000_000);
    assert_eq!(status_after, EligibilityStatus::Eligible);
}

// Test 9: User exceeds daily limit
#[test]
fn test_exceed_daily_limit() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Register and set limits (1 CCD daily, 5 CCD monthly)
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Record transaction for 0.6 CCD
    record_transaction(&mut chain, &init, ALICE, 600_000_000, "platform_1");
    
    // Try to record another 0.5 CCD (would exceed 1 CCD daily limit)
    let params = RecordTransactionParams {
        user_account: ALICE,
        amount: Amount::from_micro_ccd(500_000_000),
        platform_id: "platform_1".to_string(),
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.record_transaction".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail - daily limit exceeded");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::DailyLimitExceeded);
}

// Test 10: Check eligibility shows daily limit reached
#[test]
fn test_eligibility_daily_limit_reached() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Register and set limits
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Record transaction
    record_transaction(&mut chain, &init, ALICE, 600_000_000, "platform_1");
    
    // Check eligibility for amount that would exceed limit
    let status = check_eligibility(&chain, &init, ALICE, 500_000_000);
    assert_eq!(status, EligibilityStatus::DailyLimitReached);
}

// Test 11: User without age verification cannot record transactions
#[test]
fn test_no_age_verification_blocks_transactions() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Set limits WITHOUT age verification
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Try to record transaction
    let params = RecordTransactionParams {
        user_account: ALICE,
        amount: Amount::from_micro_ccd(500_000_000),
        platform_id: "platform_1".to_string(),
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.record_transaction".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail - age not verified");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::AgeNotVerified);
}

// Test 12: User without age verification shows in eligibility check
#[test]
fn test_eligibility_without_age_verification() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Set limits without age verification
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Check eligibility
    let status = check_eligibility(&chain, &init, ALICE, 500_000_000);
    assert_eq!(status, EligibilityStatus::AgeNotVerified);
}

// Test 13: Self-exclusion after age verification
#[test]
fn test_self_exclude_with_age_verification() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    // Register with age verification
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Self-exclude
    let params = SelfExcludeParams {
        duration_days: 30,
    };
    
    chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.self_exclude".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect("Self-exclusion should succeed");
    
    // Check eligibility - should show OnCooldown
    let status = check_eligibility(&chain, &init, ALICE, 100_000_000);
    assert_eq!(status, EligibilityStatus::OnCooldown);
}

// Test 14: Check eligibility for unregistered user
#[test]
fn test_unregistered_user_eligibility() {
    let verifier = TestVerifier::new();
    let (chain, init) = initialize_with_verifier(&verifier);
    
    let status = check_eligibility(&chain, &init, CHARLIE, 1_000_000_000);
    assert_eq!(status, EligibilityStatus::NotRegistered);
}

// Test 15: Cannot record transaction for unregistered user
#[test]
fn test_unregistered_user_cannot_transact() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    let params = RecordTransactionParams {
        user_account: CHARLIE,
        amount: Amount::from_micro_ccd(500_000_000),
        platform_id: "platform_1".to_string(),
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.record_transaction".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail - user not registered");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::UserNotRegistered);
}

// Test 16: Invalid limits rejected
#[test]
fn test_invalid_limits_rejected() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    let params = SetLimitsParams {
        daily_limit: Amount::from_micro_ccd(10_000_000_000),
        monthly_limit: Amount::from_micro_ccd(5_000_000_000),
    };
    
    let result = chain
        .contract_update(
            SIGNER,
            ALICE,
            ALICE_ADDR,
            Energy::from(10_000),
            UpdateContractPayload {
                address: init.contract_address,
                amount: Amount::zero(),
                receive_name: OwnedReceiveName::new_unchecked(
                    "safestake_registry.set_limits".to_string()
                ),
                message: OwnedParameter::from_serial(&params)
                    .expect("Parameter within size bounds"),
            },
        )
        .expect_err("Should fail - invalid limits");
    
    let error: ContractError = result
        .parse_return_value()
        .expect("Should return ContractError");
    assert_eq!(error, ContractError::InvalidLimits);
}

// ============================================================================
// INTEGRATION TEST - COMPLETE USER JOURNEY
// ============================================================================

// Test 17: Complete user journey from registration to gambling
#[test]
fn test_complete_user_journey() {
    let verifier = TestVerifier::new();
    let (mut chain, init) = initialize_with_verifier(&verifier);
    
    println!("\n=== COMPLETE USER JOURNEY TEST ===\n");
    
    // Register with age verification
    println!("✅ Step 1: Register user with age verification");
    register_user_with_age_verification(&mut chain, &init, ALICE, ALICE_ADDR, &verifier);
    
    // Set limits
    println!("✅ Step 2: Set spending limits (1 CCD/day, 5 CCD/month)");
    set_limits(&mut chain, &init, ALICE, ALICE_ADDR, 1_000_000_000, 5_000_000_000);
    
    // Check eligibility
    println!("✅ Step 3: Check eligibility - Eligible");
    let status1 = check_eligibility(&chain, &init, ALICE, 300_000_000);
    assert_eq!(status1, EligibilityStatus::Eligible);
    
    // Place bets
    println!("✅ Step 4: Place bet of 0.3 CCD");
    record_transaction(&mut chain, &init, ALICE, 300_000_000, "platform_a");
    
    println!("✅ Step 5: Place bet of 0.4 CCD (total: 0.7 CCD)");
    record_transaction(&mut chain, &init, ALICE, 400_000_000, "platform_b");
    
    // Check limit enforcement
    println!("✅ Step 6: Check eligibility for 0.5 CCD - DailyLimitReached");
    let status2 = check_eligibility(&chain, &init, ALICE, 500_000_000);
    assert_eq!(status2, EligibilityStatus::DailyLimitReached);
    
    println!("\n=== USER JOURNEY COMPLETE ===");
    println!("✅ All responsible gambling features working!\n");
}