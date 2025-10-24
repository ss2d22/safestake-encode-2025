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
