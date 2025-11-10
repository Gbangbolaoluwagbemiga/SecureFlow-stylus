//! Initialization functions for SecureFlow

extern crate alloc;
use alloc::string::String;

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::helpers::SecureFlow as SecureFlowHelpers;

impl SecureFlow {
    // Constructor/Initializer
    pub fn init(
        &mut self,
        monad_token: Address,
        fee_collector: Address,
        platform_fee_bp: U256,
    ) -> Result<()> {
        if fee_collector == Address::ZERO {
            return Err(Error::Unauthorized("Invalid fee collector".to_string()).into());
        }
        if platform_fee_bp > U256::from(1000) {
            return Err(Error::InvalidAmount("Fee too high".to_string()).into());
        }

        // Initialize constants
        self.init_constants();

        self.monad_token.set(monad_token);
        self.fee_collector.set(fee_collector);
        self.platform_fee_bp.set(platform_fee_bp);
        self.owner.set(msg::sender());
        self.next_escrow_id.set(U256::from(1));

        if monad_token != Address::ZERO {
            self.whitelisted_tokens.setter(monad_token).set(true);
        }

        Ok(())
    }
}

