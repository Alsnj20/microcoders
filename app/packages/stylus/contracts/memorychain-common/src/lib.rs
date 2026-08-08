//! MemoryChain Common Library
//!
//! Shared types, errors, events, and interfaces for all MemoryChain contracts.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

pub mod types;
pub mod errors;
pub mod events;
pub mod interfaces;
pub mod helpers;
pub mod macros;
