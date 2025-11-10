//! Admin functions for SecureFlow

extern crate alloc;
use alloc::string::String;

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::helpers::SecureFlow as SecureFlowHelpers;
use crate::transfers::SecureFlow as SecureFlowTransfers;

// Note: All public functions moved to public.rs
// This file kept for reference but #[public] removed
impl SecureFlow {
    pub fn set_platform_fee_bp(&mut self, bp: U256) -> Result<()> {
        self.only_owner()?;
        if bp > self.max_platform_fee_bp.get() {
            return Err(Error::InvalidAmount("Fee too high".to_string()).into());
        }
        self.platform_fee_bp.set(bp);
        Ok(())
    }

    pub fn set_fee_collector(&mut self, collector: Address) -> Result<()> {
        self.only_owner()?;
        if collector == Address::ZERO {
            return Err(Error::InvalidAmount("Invalid collector".to_string()).into());
        }
        self.fee_collector.set(collector);
        Ok(())
    }

    pub fn whitelist_token(&mut self, token: Address) -> Result<()> {
        self.only_owner()?;
        if token == Address::ZERO {
            return Err(Error::InvalidAmount("Invalid token".to_string()).into());
        }
        self.whitelisted_tokens.setter(token).set(true);
        Ok(())
    }

    pub fn blacklist_token(&mut self, token: Address) -> Result<()> {
        self.only_owner()?;
        self.whitelisted_tokens.setter(token).set(false);
        Ok(())
    }

    pub fn authorize_arbiter(&mut self, arbiter: Address) -> Result<()> {
        self.only_owner()?;
        if arbiter == Address::ZERO {
            return Err(Error::InvalidAmount("Invalid arbiter".to_string()).into());
        }
        self.authorized_arbiters.setter(arbiter).set(true);
        Ok(())
    }

    pub fn revoke_arbiter(&mut self, arbiter: Address) -> Result<()> {
        self.only_owner()?;
        self.authorized_arbiters.setter(arbiter).set(false);
        Ok(())
    }

    pub fn pause_job_creation(&mut self) -> Result<()> {
        self.only_owner()?;
        self.job_creation_paused.set(true);
        Ok(())
    }

    pub fn unpause_job_creation(&mut self) -> Result<()> {
        self.only_owner()?;
        self.job_creation_paused.set(false);
        Ok(())
    }

    pub fn pause(&mut self) -> Result<()> {
        self.only_owner()?;
        self.paused.set(true);
        Ok(())
    }

    pub fn unpause(&mut self) -> Result<()> {
        self.only_owner()?;
        self.paused.set(false);
        Ok(())
    }

    pub fn withdraw_fees(&mut self, token: Address) -> Result<()> {
        let sender = msg::sender();
        let fee_collector = self.fee_collector.get();
        let owner = self.owner.get();
        
        if sender != fee_collector && sender != owner {
            return Err(Error::Unauthorized("Not authorized".to_string()).into());
        }

        let amount = self.total_fees_by_token.get(token);
        if amount == U256::ZERO {
            return Err(Error::NothingToRefund("No fees".to_string()).into());
        }

        self.total_fees_by_token.setter(token).set(U256::ZERO);

        let recipient = if sender == owner { owner } else { fee_collector };
        self.transfer_out(token, recipient, amount)?;

        Ok(())
    }

    pub fn emergency_withdraw(&mut self, token: Address, amount: U256) -> Result<()> {
        self.only_owner()?;
        
        if amount == U256::ZERO {
            return Err(Error::InvalidAmount("Invalid amount".to_string()).into());
        }

        if token == Address::ZERO {
            // Native token
            let balance = contract::balance();
            let reserved = self.escrowed_amount.get(Address::ZERO) + self.total_fees_by_token.get(Address::ZERO);
            if balance <= reserved {
                return Err(Error::NothingToRefund("Nothing withdrawable".to_string()).into());
            }
            let available = balance - reserved;
            if amount > available {
                return Err(Error::InvalidAmount("Amount exceeds available".to_string()).into());
            }
            evm::send(self.owner.get(), amount)?;
        } else {
            // ERC20 token - simplified version
            let reserved = self.escrowed_amount.get(token) + self.total_fees_by_token.get(token);
            self.transfer_out(token, self.owner.get(), amount)?;
        }

        Ok(())
    }
}

