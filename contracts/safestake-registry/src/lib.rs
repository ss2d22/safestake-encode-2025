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