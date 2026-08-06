//! CreditManager Contract
//!
//! Manages Memory Credits (MC) — the internal consumption unit
//! that funds AI processing.
//!
//! Supports dual network mode:
//! - Testnet: faucet mode (free credits)
//! - Mainnet: ETH payment mode ( forwards to treasury)

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, Uint, U256};
use memorychain_common::{
    errors::{CommonError, CreditError},
    events::*,
};
use stylus_sdk::{call::transfer::transfer_eth, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct CreditManager {
        // ── Credit accounts ────────────────────────────
        mapping(address => CreditAccount) accounts;

        // ── Operation fees (in MC) ─────────────────────
        FeeConfig fees;

        // ── Pricing configuration ──────────────────────
        PricingConfig pricing;

        // ── Access control ─────────────────────────────
        address admin;
        mapping(address => bool) authorized_consumers;
    }

    pub struct CreditAccount {
        uint64 balance;
        uint64 purchased;
        uint64 spent;
    }

    pub struct FeeConfig {
        uint16 register_user;    // default: 0 (free)
        uint16 create_memory;    // default: 1 MC
        uint16 update_memory;    // default: 1 MC
        uint16 create_agent;     // default: 5 MC
        uint16 update_agent;     // default: 2 MC
        uint16 execute_agent;    // default: 2 MC
        uint16 link_memory;      // default: 1 MC
    }

    pub struct PricingConfig {
        bool is_testnet;           // true = faucet, false = ETH payments
        address treasury;          // Wallet receiving ETH payments
        uint256 price_per_credit;  // Wei per MC (0.0001 ETH = 10^14)
        uint256 min_purchase;      // Minimum MC per purchase
        uint256 max_purchase;      // Maximum MC per purchase
    }
}

// ── Operation type constants ────────────────────────────────────────────────
pub const OP_REGISTER_USER: u8 = 0;
pub const OP_CREATE_MEMORY: u8 = 1;
pub const OP_UPDATE_MEMORY: u8 = 2;
pub const OP_CREATE_AGENT: u8 = 3;
pub const OP_UPDATE_AGENT: u8 = 4;
pub const OP_EXECUTE_AGENT: u8 = 5;
pub const OP_LINK_MEMORY: u8 = 6;

// ── Default values ──────────────────────────────────────────────────────────
pub const DEFAULT_CREATE_MEMORY_FEE: u16 = 1;
pub const DEFAULT_UPDATE_MEMORY_FEE: u16 = 1;
pub const DEFAULT_CREATE_AGENT_FEE: u16 = 5;
pub const DEFAULT_UPDATE_AGENT_FEE: u16 = 2;
pub const DEFAULT_EXECUTE_AGENT_FEE: u16 = 2;
pub const DEFAULT_LINK_MEMORY_FEE: u16 = 1;
pub const DEFAULT_REGISTER_USER_FEE: u16 = 0;

pub const DEFAULT_PRICE_PER_CREDIT: u64 = 1_000_000_000_000; // 0.000001 ETH (10^12 wei)
pub const DEFAULT_MIN_PURCHASE: u64 = 1;
pub const DEFAULT_MAX_PURCHASE: u64 = 1000;

#[public]
impl CreditManager {
    /// Initializes the contract with default fees.
    pub fn initialize(&mut self) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());

            // Default operation fees
            self.fees.register_user.set(Uint::from(DEFAULT_REGISTER_USER_FEE));
            self.fees.create_memory.set(Uint::from(DEFAULT_CREATE_MEMORY_FEE));
            self.fees.update_memory.set(Uint::from(DEFAULT_UPDATE_MEMORY_FEE));
            self.fees.create_agent.set(Uint::from(DEFAULT_CREATE_AGENT_FEE));
            self.fees.update_agent.set(Uint::from(DEFAULT_UPDATE_AGENT_FEE));
            self.fees.execute_agent.set(Uint::from(DEFAULT_EXECUTE_AGENT_FEE));
            self.fees.link_memory.set(Uint::from(DEFAULT_LINK_MEMORY_FEE));

            // Default pricing config
            self.pricing.is_testnet.set(true);
            self.pricing.treasury.set(self.vm().msg_sender());
            self.pricing.price_per_credit.set(Uint::from(DEFAULT_PRICE_PER_CREDIT));
            self.pricing.min_purchase.set(Uint::from(DEFAULT_MIN_PURCHASE));
            self.pricing.max_purchase.set(Uint::from(DEFAULT_MAX_PURCHASE));
        }
    }

    /// Initializes network configuration. Admin only.
    ///
    /// # Arguments
    /// * `is_testnet` - true for testnet (faucet mode), false for mainnet (ETH payments)
    /// * `treasury` - Address to receive ETH payments on mainnet
    /// * `price_per_credit` - Wei per MC credit (use 0 for testnet)
    pub fn initialize_network(
        &mut self,
        is_testnet: bool,
        treasury: Address,
        price_per_credit: U256,
    ) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        let old_treasury = self.pricing.treasury.get();
        let old_price = self.pricing.price_per_credit.get();

        self.pricing.is_testnet.set(is_testnet);
        self.pricing.treasury.set(treasury);
        self.pricing.price_per_credit.set(price_per_credit);

        self.vm().log(TestnetModeUpdated { is_testnet });
        self.vm().log(TreasuryUpdated {
            old_treasury,
            new_treasury: treasury,
        });
        self.vm().log(PricePerCreditUpdated {
            old_price,
            new_price: price_per_credit,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // CREDIT PURCHASE
    // ════════════════════════════════════════════════════════════════════════

    /// Buys credits with ETH payment.
    /// Works on both testnet (Sepolia ETH) and mainnet (real ETH).
    ///
    /// # Arguments
    /// * `amount` - Number of MC credits to purchase
    pub fn buy_credits(&mut self, amount: u64) -> Result<(), String> {
        if amount == 0 {
            return Err(CreditError::ZeroAmount.into());
        }

        let amount_u256 = U256::from(amount);
        let min = self.pricing.min_purchase.get();
        let max = self.pricing.max_purchase.get();

        // Validate purchase limits
        if amount_u256 < min || amount_u256 > max {
            return Err(CreditError::PurchaseOutOfRange {
                min: u64::try_from(min).unwrap_or(1),
                max: u64::try_from(max).unwrap_or(1000),
                requested: amount,
            }.into());
        }

        let caller = self.vm().msg_sender();
        let payment = self.vm().msg_value();
        let price_per_credit = self.pricing.price_per_credit.get();
        let required = price_per_credit * amount_u256;

        // Require ETH payment (works for both testnet and mainnet)
        if payment < required {
            return Err(CreditError::InsufficientPayment {
                required: u64::try_from(required).unwrap_or(u64::MAX),
                provided: u64::try_from(payment).unwrap_or(0),
            }.into());
        }

        // Grant credits
        let current_balance: Uint<64, 1> = self.accounts.getter(caller).balance.get();
        let current_purchased: Uint<64, 1> = self.accounts.getter(caller).purchased.get();
        let amount_uint = Uint::from(amount);

        let mut account = self.accounts.setter(caller);
        account.balance.set(current_balance + amount_uint);
        account.purchased.set(current_purchased + amount_uint);

        // Transfer ETH to treasury
        let treasury = self.pricing.treasury.get();
        transfer_eth(self.vm(), treasury, payment)
            .map_err(|_| String::from("CreditError: ETH transfer to treasury failed"))?;

        let new_balance = u64::try_from(current_balance + amount_uint).unwrap_or(0);
        self.vm().log(CreditsPurchased {
            user: caller,
            amount,
            new_balance,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // CREDIT CONSUMPTION (Cross-contract calls)
    // ════════════════════════════════════════════════════════════════════════

    /// Consumes credits from a user's account.
    /// Only callable by authorized consumer contracts.
    ///
    /// # Arguments
    /// * `user` - Address of the user whose credits to consume
    /// * `amount` - Number of MC credits to consume
    pub fn consume_credits(
        &mut self,
        user: Address,
        amount: u64,
    ) -> Result<bool, String> {
        let caller = self.vm().msg_sender();

        if !self.authorized_consumers.get(caller) {
            return Err(CreditError::UnauthorizedConsumer { caller }.into());
        }

        if amount == 0 {
            return Err(CreditError::ZeroAmount.into());
        }

        let balance: Uint<64, 1> = self.accounts.getter(user).balance.get();
        let amount_uint = Uint::from(amount);

        if balance < amount_uint {
            return Ok(false);
        }

        let spent: Uint<64, 1> = self.accounts.getter(user).spent.get();

        let mut account = self.accounts.setter(user);
        account.balance.set(balance - amount_uint);
        account.spent.set(spent + amount_uint);

        let new_balance = u64::try_from(balance - amount_uint).unwrap_or(0);
        self.vm().log(CreditsConsumed {
            user,
            amount,
            new_balance,
        });

        Ok(true)
    }

    /// Refunds credits to a user's account.
    /// Only callable by admin.
    pub fn refund_credits(
        &mut self,
        user: Address,
        amount: u64,
    ) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(CreditError::UnauthorizedConsumer { caller }.into());
        }

        if amount == 0 {
            return Err(CreditError::ZeroAmount.into());
        }

        let balance: Uint<64, 1> = self.accounts.getter(user).balance.get();
        let spent: Uint<64, 1> = self.accounts.getter(user).spent.get();
        let amount_uint = Uint::from(amount);

        let mut account = self.accounts.setter(user);
        account.balance.set(balance + amount_uint);

        if spent >= amount_uint {
            account.spent.set(spent - amount_uint);
        }

        let new_balance = u64::try_from(balance + amount_uint).unwrap_or(0);
        self.vm().log(CreditsRefunded {
            user,
            amount,
            new_balance,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // FEE MANAGEMENT (Admin)
    // ════════════════════════════════════════════════════════════════════════

    /// Updates fee for a specific operation. Admin only.
    ///
    /// # Arguments
    /// * `operation` - Operation type (OP_CREATE_MEMORY, OP_CREATE_AGENT, etc.)
    /// * `fee` - New fee in MC credits
    pub fn set_fee(&mut self, operation: u8, fee: u16) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        let old_fee = match operation {
            OP_REGISTER_USER => u16::try_from(self.fees.register_user.get()).unwrap_or(0),
            OP_CREATE_MEMORY => u16::try_from(self.fees.create_memory.get()).unwrap_or(0),
            OP_UPDATE_MEMORY => u16::try_from(self.fees.update_memory.get()).unwrap_or(0),
            OP_CREATE_AGENT => u16::try_from(self.fees.create_agent.get()).unwrap_or(0),
            OP_UPDATE_AGENT => u16::try_from(self.fees.update_agent.get()).unwrap_or(0),
            OP_EXECUTE_AGENT => u16::try_from(self.fees.execute_agent.get()).unwrap_or(0),
            OP_LINK_MEMORY => u16::try_from(self.fees.link_memory.get()).unwrap_or(0),
            _ => return Err(CommonError::InvalidInput { reason: "invalid operation type" }.into()),
        };

        match operation {
            OP_REGISTER_USER => self.fees.register_user.set(Uint::from(fee)),
            OP_CREATE_MEMORY => self.fees.create_memory.set(Uint::from(fee)),
            OP_UPDATE_MEMORY => self.fees.update_memory.set(Uint::from(fee)),
            OP_CREATE_AGENT => self.fees.create_agent.set(Uint::from(fee)),
            OP_UPDATE_AGENT => self.fees.update_agent.set(Uint::from(fee)),
            OP_EXECUTE_AGENT => self.fees.execute_agent.set(Uint::from(fee)),
            OP_LINK_MEMORY => self.fees.link_memory.set(Uint::from(fee)),
            _ => unreachable!(),
        }

        self.vm().log(FeeUpdated {
            operation,
            old_fee,
            new_fee: fee,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRICING MANAGEMENT (Admin)
    // ════════════════════════════════════════════════════════════════════════

    /// Updates ETH price per credit. Admin only.
    pub fn set_price_per_credit(&mut self, price_wei: U256) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        let old_price = self.pricing.price_per_credit.get();
        self.pricing.price_per_credit.set(price_wei);

        self.vm().log(PricePerCreditUpdated {
            old_price,
            new_price: price_wei,
        });

        Ok(())
    }

    /// Updates treasury address. Admin only.
    pub fn set_treasury(&mut self, treasury: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        let old_treasury = self.pricing.treasury.get();
        self.pricing.treasury.set(treasury);

        self.vm().log(TreasuryUpdated {
            old_treasury,
            new_treasury: treasury,
        });

        Ok(())
    }

    /// Updates purchase limits. Admin only.
    pub fn set_purchase_limits(&mut self, min: u64, max: u64) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        if min > max {
            return Err(CommonError::InvalidInput { reason: "min cannot exceed max" }.into());
        }

        self.pricing.min_purchase.set(Uint::from(min));
        self.pricing.max_purchase.set(Uint::from(max));

        self.vm().log(PurchaseLimitsUpdated {
            min: U256::from(min),
            max: U256::from(max),
        });

        Ok(())
    }

    /// Toggles testnet mode. Admin only.
    pub fn set_testnet_mode(&mut self, is_testnet: bool) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        self.pricing.is_testnet.set(is_testnet);

        self.vm().log(TestnetModeUpdated { is_testnet });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // AUTHORIZATION (Admin)
    // ════════════════════════════════════════════════════════════════════════

    /// Authorizes a contract to consume credits. Admin only.
    pub fn authorize_consumer(&mut self, consumer: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        self.authorized_consumers.setter(consumer).set(true);

        Ok(())
    }

    /// Revokes authorization from a consumer. Admin only.
    pub fn revoke_consumer(&mut self, consumer: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        self.authorized_consumers.setter(consumer).set(false);

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    /// Returns the credit balance of a user.
    pub fn balance_of(&self, user: Address) -> u64 {
        u64::try_from(self.accounts.getter(user).balance.get()).unwrap_or(0)
    }

    /// Returns the total purchased credits of a user.
    pub fn total_purchased(&self, user: Address) -> u64 {
        u64::try_from(self.accounts.getter(user).purchased.get()).unwrap_or(0)
    }

    /// Returns the total spent credits of a user.
    pub fn total_spent(&self, user: Address) -> u64 {
        u64::try_from(self.accounts.getter(user).spent.get()).unwrap_or(0)
    }

    /// Checks if a user has sufficient credits.
    pub fn has_sufficient_credits(&self, user: Address, amount: u64) -> bool {
        let balance: Uint<64, 1> = self.accounts.getter(user).balance.get();
        balance >= Uint::from(amount)
    }

    /// Returns the fee for a specific operation.
    pub fn get_fee(&self, operation: u8) -> u16 {
        let val: Uint<16, 1> = match operation {
            OP_REGISTER_USER => self.fees.register_user.get(),
            OP_CREATE_MEMORY => self.fees.create_memory.get(),
            OP_UPDATE_MEMORY => self.fees.update_memory.get(),
            OP_CREATE_AGENT => self.fees.create_agent.get(),
            OP_UPDATE_AGENT => self.fees.update_agent.get(),
            OP_EXECUTE_AGENT => self.fees.execute_agent.get(),
            OP_LINK_MEMORY => self.fees.link_memory.get(),
            _ => Uint::ZERO,
        };
        u16::try_from(val).unwrap_or(0)
    }

    /// Returns all configured fees.
    pub fn get_fees(&self) -> (u16, u16, u16, u16, u16, u16, u16) {
        (
            u16::try_from(self.fees.register_user.get()).unwrap_or(0),
            u16::try_from(self.fees.create_memory.get()).unwrap_or(0),
            u16::try_from(self.fees.update_memory.get()).unwrap_or(0),
            u16::try_from(self.fees.create_agent.get()).unwrap_or(0),
            u16::try_from(self.fees.update_agent.get()).unwrap_or(0),
            u16::try_from(self.fees.execute_agent.get()).unwrap_or(0),
            u16::try_from(self.fees.link_memory.get()).unwrap_or(0),
        )
    }

    /// Returns pricing configuration.
    pub fn get_pricing(&self) -> (bool, Address, U256, U256, U256) {
        (
            self.pricing.is_testnet.get(),
            self.pricing.treasury.get(),
            self.pricing.price_per_credit.get(),
            self.pricing.min_purchase.get(),
            self.pricing.max_purchase.get(),
        )
    }

    /// Returns if contract is in testnet mode.
    pub fn is_testnet(&self) -> bool {
        self.pricing.is_testnet.get()
    }

    /// Returns the treasury address.
    pub fn get_treasury(&self) -> Address {
        self.pricing.treasury.get()
    }

    /// Returns the price per credit in wei.
    pub fn get_price_per_credit(&self) -> U256 {
        self.pricing.price_per_credit.get()
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    const DEFAULT_SENDER: Address = Address::new([
        0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD,
        0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF,
    ]);

    fn setup() -> (TestVM, CreditManager) {
        let vm = TestVM::default();
        let mut contract = CreditManager::from(&vm);
        contract.initialize();
        (vm, contract)
    }

    /// Helper: Grants credits directly for testing (bypasses payment).
    /// Only use in tests - not available in production.
    fn mint_credits_for_testing(contract: &mut CreditManager, user: Address, amount: u64) {
        let amount_uint = Uint::from(amount);
        let current_balance: Uint<64, 1> = contract.accounts.getter(user).balance.get();
        let current_purchased: Uint<64, 1> = contract.accounts.getter(user).purchased.get();
        
        let mut account = contract.accounts.setter(user);
        account.balance.set(current_balance + amount_uint);
        account.purchased.set(current_purchased + amount_uint);
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
        assert_eq!(contract.get_fee(OP_CREATE_MEMORY), 1);
        assert_eq!(contract.get_fee(OP_CREATE_AGENT), 5);
        assert!(contract.is_testnet());
    }

    #[test]
    fn test_buy_credits_requires_eth() {
        let (_vm, mut contract) = setup();
        // Without ETH, buy_credits should fail
        assert!(contract.buy_credits(100).is_err());
    }

    #[test]
    fn test_buy_credits_zero_fails() {
        let (_vm, mut contract) = setup();
        assert!(contract.buy_credits(0).is_err());
    }

    #[test]
    fn test_buy_credits_out_of_range_fails() {
        let (_vm, mut contract) = setup();
        // Default max is 1000
        assert!(contract.buy_credits(1001).is_err());
    }

    #[test]
    fn test_mint_credits_for_testing() {
        let (_vm, mut contract) = setup();
        mint_credits_for_testing(&mut contract, DEFAULT_SENDER, 100);
        assert_eq!(contract.balance_of(DEFAULT_SENDER), 100);
        assert_eq!(contract.total_purchased(DEFAULT_SENDER), 100);
    }

    #[test]
    fn test_has_sufficient_credits() {
        let (_vm, mut contract) = setup();
        mint_credits_for_testing(&mut contract, DEFAULT_SENDER, 10);
        assert!(contract.has_sufficient_credits(DEFAULT_SENDER, 10));
        assert!(!contract.has_sufficient_credits(DEFAULT_SENDER, 11));
    }

    #[test]
    fn test_set_fee() {
        let (_vm, mut contract) = setup();
        contract.set_fee(OP_CREATE_MEMORY, 2).unwrap();
        assert_eq!(contract.get_fee(OP_CREATE_MEMORY), 2);
    }

    #[test]
    fn test_set_price_per_credit() {
        let (_vm, mut contract) = setup();
        let new_price = U256::from(2_000_000_000_000u64); // 0.000002 ETH
        contract.set_price_per_credit(new_price).unwrap();
        assert_eq!(contract.get_price_per_credit(), new_price);
    }

    #[test]
    fn test_set_purchase_limits() {
        let (_vm, mut contract) = setup();
        contract.set_purchase_limits(10, 500).unwrap();
        let (_, _, _, min, max) = contract.get_pricing();
        assert_eq!(min, U256::from(10));
        assert_eq!(max, U256::from(500));
    }

    #[test]
    fn test_set_testnet_mode() {
        let (_vm, mut contract) = setup();
        assert!(contract.is_testnet());
        contract.set_testnet_mode(false).unwrap();
        assert!(!contract.is_testnet());
    }
}
