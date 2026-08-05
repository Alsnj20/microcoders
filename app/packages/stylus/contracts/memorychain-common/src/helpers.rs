//! Helper functions shared across contracts.

use alloy_primitives::{Address, FixedBytes, Uint};
use stylus_sdk::prelude::*;

/// Generates a unique ID using keccak256(owner, timestamp, nonce).
pub fn generate_id(
    vm: &dyn Host,
    owner: Address,
    nonce: Uint<256, 4>,
) -> FixedBytes<32> {
    use tiny_keccak::{Hasher, Keccak};

    let mut hasher = Keccak::v256();
    let timestamp = vm.block_timestamp();

    let mut input = [0u8; 60];
    input[..20].copy_from_slice(owner.as_slice());
    input[20..28].copy_from_slice(&timestamp.to_be_bytes());
    input[28..60].copy_from_slice(&nonce.to_be_bytes::<32>());

    hasher.update(&input);

    let mut output = [0u8; 32];
    hasher.finalize(&mut output);

    FixedBytes::from(output)
}
