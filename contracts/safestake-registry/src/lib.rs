//! #  SafeStake Registry - Responsible Gambling Protocol with Age Verification
//! 
//! This contract aims to implement
//! Users must prove they are 18+ via ZK proofs verified by a backend, which then
//! signs their account address. The contract verifies this signature on-chain. 
//! 
#![cfg_attr(not(feature = "std"), no_std)]

use concordium_std::*;
use core::fmt::Debug;

// This should act as user's unique identifier (32 byte hash)
type IdentityHash = [u8; 32];

// Represents a user's compliance data for responsible gambling
#[derive(Serial, DeserialWithState)]
#[concordium(state_parameter = "S")]
pub struct UserCompliance<S = StateApi> {
    // Hash of user's identity (will be derived from AccountAddress)
    pub identity_hash: IdentityHash,
    // Maximum CCD allowed to spend per day (in microCCD) (will be changed to a stablecoin if i have time later on)
    //TODO: update contract to use stablecoin instead of CCD
    pub daily_limit: Amount,
    // Maximum CCD allowed to spend per month (in microCCD)  
    //TODO: update contract to use stablecoin instead of CCD
    pub monthly_limit: Amount,
    // Amount spent today (resets daily)
    pub daily_spent: Amount,
    // Amount spent this month (resets monthly)
    pub monthly_spent: Amount,
    // Timestamp of last daily reset
    pub last_reset_day: Timestamp,
    // Timestamp of last monthly reset
    pub last_reset_month: Timestamp,
    // cooldown period (user is excluded until this time)
    pub cooldown_until: Option<Timestamp>,
    // Set of platform IDs where user has gambled
    pub platforms_used: StateSet<String, S>,
    // Age verification status
    pub age_verified: bool,
}

// state of the contract
#[derive(Serial, DeserialWithState)]
#[concordium(state_parameter = "S")]
pub struct State<S = StateApi> {
    // Registry mapping identity hashes to user compliance data
    registry: StateMap<IdentityHash, UserCompliance<S>, S>,
    // Set of users who have self-excluded
    excluded_users: StateSet<IdentityHash, S>,
    // Backend verifier's public key for signature verification
    verifier_key: PublicKeyEd25519,
}

// Custom errors 
#[derive(Debug, PartialEq, Eq, Reject, Serialize, SchemaType)]
pub enum ContractError {
    // Failed to parse the input parameter
    #[from(ParseError)]
    ParseParams,
    // User not found in registry
    UserNotRegistered,
    // User has exceeded their daily spending limit
    DailyLimitExceeded,
    // User has exceeded their monthly spending limit
    MonthlyLimitExceeded,
    // User is currently self-excluded
    SelfExcluded,
    // User is in cooldown period
    OnCooldown,
    // Invalid limit values (daily > monthly)
    InvalidLimits,
    // Age verification signature is invalid
    InvalidSignature,
    // User has not completed age verification
    AgeNotVerified,
}

 // Eligibility status for placing bets
#[derive(Serialize, SchemaType, Debug, PartialEq, Eq)]
pub enum EligibilityStatus {
    // User is eligible to place the bet
    Eligible,
    // User would exceed daily limit
    DailyLimitReached,
    // User would exceed monthly limit
    MonthlyLimitReached,
    // User is self-excluded
    SelfExcluded,
    // User is on cooldown
    OnCooldown,
    // User not registered
    NotRegistered,
    // User has not verified their age
    AgeNotVerified,
}

// Parameter for initializing the contract with verifier's public key
#[derive(Serialize, SchemaType)]
pub struct InitParams {
    // Public key of the backend verifier (for signature verification)
    pub verifier_key: PublicKeyEd25519,
}

// Parameter for self-exclusion
#[derive(Serialize, SchemaType)]
pub struct SelfExcludeParams {
    // Duration in days
    pub duration_days: u32,
}

// Parameter for registering a new user with age verification
#[derive(Serialize, SchemaType)]
pub struct RegisterUserParams {
    // Account address of user to register
    pub account: AccountAddress,
    // Signature from backend verifier (proves age verification passed)
    pub signature: SignatureEd25519,
}

// Parameter for setting spending limits
#[derive(Serialize, SchemaType)]
pub struct SetLimitsParams {
    // Daily spending limit in microCCD
    //TODO: update contract to use stablecoin instead of CCD
    pub daily_limit: Amount,
    // Monthly spending limit in microCCD
    //TODO: update contract to use stablecoin instead of CCD
    pub monthly_limit: Amount,
}

// Parameter for recording a transaction
#[derive(Serialize, SchemaType)]
pub struct RecordTransactionParams {
    // User's account address
    pub user_account: AccountAddress,
    // Amount of the bet in microCCD
    pub amount: Amount,
    // Platform identifier
    pub platform_id: String,
}

// Parameter for checking eligibility
#[derive(Serialize, SchemaType)]
pub struct CheckEligibilityParams {
    // User's account address
    pub user_account: AccountAddress,
    // Proposed bet amount in microCCD
    pub proposed_amount: Amount,
}

// Initialize the contract with verifier's public key.
#[init(contract = "safestake_registry", parameter = "InitParams")]
fn init(ctx: &InitContext, state_builder: &mut StateBuilder) -> InitResult<State> {
    let params: InitParams = ctx.parameter_cursor().get()?;
    
    Ok(State {
        registry: state_builder.new_map(),
        excluded_users: state_builder.new_set(),
        verifier_key: params.verifier_key,
    })

// Register a new user with age verification
// The backend verifier must have verified the user's age proof off-chain
// and signed the user's account address. This function verifies that signature
#[receive(
    contract = "safestake_registry",
    name = "register_user",
    parameter = "RegisterUserParams",
    error = "ContractError",
    crypto_primitives,
    mutable
)]
fn register_user(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
    crypto_primitives: &impl HasCryptoPrimitives,
) -> Result<(), ContractError> {
    let params: RegisterUserParams = ctx.parameter_cursor().get()?;
    
    // Verify the signature from the backend verifier
    // The message signed is the user's account address (32 bytes)
    let message = params.account.as_ref();
    
    // Use crypto_primitives to verify Ed25519 signature
    let is_valid = crypto_primitives.verify_ed25519_signature(
        host.state().verifier_key,
        params.signature,
        message,
    );
    
    if !is_valid {
        return Err(ContractError::InvalidSignature);
    }
    
    // Signature is valid! User has proven they're 18+
    let identity_hash = hash_account(params.account);
    let current_time = ctx.metadata().slot_time();
    
    let user_compliance = UserCompliance {
        identity_hash,
        daily_limit: Amount::zero(),
        monthly_limit: Amount::zero(),
        daily_spent: Amount::zero(),
        monthly_spent: Amount::zero(),
        last_reset_day: current_time,
        last_reset_month: current_time,
        cooldown_until: None,
        platforms_used: host.state_builder().new_set(),
        age_verified: true,  // Mark as age-verified
    };
    
    let _ = host.state_mut().registry.insert(identity_hash, user_compliance);
    Ok(())
}

// Set spending limits for the calling user
#[receive(
    contract = "safestake_registry",
    name = "set_limits",
    parameter = "SetLimitsParams",
    error = "ContractError",
    mutable
)]
fn set_limits(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> Result<(), ContractError> {
    let params: SetLimitsParams = ctx.parameter_cursor().get()?;
    
    // Validate limits
    if params.daily_limit > params.monthly_limit {
        return Err(ContractError::InvalidLimits);
    }
    
    let sender = ctx.sender();
    let sender_hash = match sender {
        Address::Account(acc) => hash_account(acc),
        Address::Contract(_) => return Err(ContractError::ParseParams),
    };
    
    let current_time = ctx.metadata().slot_time();
    
    // Check if user exists
    let user_exists = host.state().registry.get(&sender_hash).is_some();
    
    if !user_exists {
        // Create new user (without age verification)
        let new_user = UserCompliance {
            identity_hash: sender_hash,
            daily_limit: params.daily_limit,
            monthly_limit: params.monthly_limit,
            daily_spent: Amount::zero(),
            monthly_spent: Amount::zero(),
            last_reset_day: current_time,
            last_reset_month: current_time,
            cooldown_until: None,
            platforms_used: host.state_builder().new_set(),
            age_verified: false,  // NOT age-verified yet
        };
       let _ = host.state_mut().registry.insert(sender_hash, new_user);
    } else {
        // Update existing user
        let mut user = host.state_mut().registry.get_mut(&sender_hash).unwrap();
        user.daily_limit = params.daily_limit;
        user.monthly_limit = params.monthly_limit;
    }
    
    Ok(())
}

// Self-exclude from all gambling platforms for a specified duration
#[receive(
    contract = "safestake_registry",
    name = "self_exclude",
    parameter = "SelfExcludeParams",
    error = "ContractError",
    mutable
)]
fn self_exclude(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> Result<(), ContractError> {
    let params: SelfExcludeParams = ctx.parameter_cursor().get()?;
    
    let sender = ctx.sender();
    let sender_hash = match sender {
        Address::Account(acc) => hash_account(acc),
        Address::Contract(_) => return Err(ContractError::ParseParams),
    };
    
    host.state_mut().excluded_users.insert(sender_hash);
    
    let current_time = ctx.metadata().slot_time();
    let duration_millis = params.duration_days as u64 * 24 * 60 * 60 * 1000;
    let cooldown_until = current_time.checked_add(Duration::from_millis(duration_millis))
        .ok_or(ContractError::ParseParams)?;
    
    if let Some(mut user) = host.state_mut().registry.get_mut(&sender_hash) {
        user.cooldown_until = Some(cooldown_until);
    }
    
    Ok(())
}
