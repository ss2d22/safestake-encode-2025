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

/// state of the contract
#[derive(Serial, DeserialWithState)]
#[concordium(state_parameter = "S")]
pub struct State<S = StateApi> {
    /// Registry mapping identity hashes to user compliance data
    registry: StateMap<IdentityHash, UserCompliance<S>, S>,
    /// Set of users who have self-excluded
    excluded_users: StateSet<IdentityHash, S>,
    /// Backend verifier's public key for signature verification
    verifier_key: PublicKeyEd25519,
}

