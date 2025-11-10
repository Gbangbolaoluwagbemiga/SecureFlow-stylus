//! View functions for SecureFlow

extern crate alloc;
use alloc::{string::String, vec::Vec};

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::types::{Milestone, Application};

// Note: All public functions moved to public.rs
// This file kept for reference but #[public] removed
impl SecureFlow {
    // Basic view functions
    pub fn next_escrow_id(&self) -> Result<U256> {
        Ok(self.next_escrow_id.get())
    }

    pub fn owner(&self) -> Result<Address> {
        Ok(self.owner.get())
    }

    pub fn paused(&self) -> Result<bool> {
        Ok(self.paused.get())
    }

    pub fn platform_fee_bp(&self) -> Result<U256> {
        Ok(self.platform_fee_bp.get())
    }

    pub fn fee_collector(&self) -> Result<Address> {
        Ok(self.fee_collector.get())
    }

    pub fn job_creation_paused(&self) -> Result<bool> {
        Ok(self.job_creation_paused.get())
    }

    pub fn authorized_arbiters(&self, arbiter: Address) -> Result<bool> {
        Ok(self.authorized_arbiters.get(arbiter))
    }

    pub fn whitelisted_tokens(&self, token: Address) -> Result<bool> {
        Ok(self.whitelisted_tokens.get(token))
    }

    pub fn reputation(&self, user: Address) -> Result<U256> {
        Ok(self.reputation.get(user))
    }

    pub fn completed_escrows(&self, user: Address) -> Result<U256> {
        Ok(self.completed_escrows.get(user))
    }

    pub fn escrowed_amount(&self, token: Address) -> Result<U256> {
        Ok(self.escrowed_amount.get(token))
    }

    pub fn total_fees_by_token(&self, token: Address) -> Result<U256> {
        Ok(self.total_fees_by_token.get(token))
    }

    pub fn has_applied(&self, escrow_id: U256, user: Address) -> Result<bool> {
        Ok(self.has_applied.get(escrow_id).get(user))
    }

    pub fn is_arbiter_for_escrow(&self, escrow_id: U256, arbiter: Address) -> Result<bool> {
        Ok(self.is_arbiter_for_escrow_internal(escrow_id, arbiter))
    }

    // Complex view functions
    pub fn get_escrow_summary(&self, escrow_id: U256) -> Result<(Address, Address, Vec<Address>, u8, U256, U256, U256, Address, U256, bool, U256, U256, bool, String, String)> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        let remaining = escrow.total_amount.get() - escrow.paid_amount.get();
        Ok((
            escrow.depositor.get(),
            escrow.beneficiary.get(),
            escrow.arbiters.get(),
            escrow.required_confirmations.get(),
            escrow.status.get().into(),
            escrow.total_amount.get(),
            escrow.paid_amount.get(),
            remaining,
            escrow.token.get(),
            escrow.deadline.get(),
            escrow.work_started.get(),
            escrow.created_at.get(),
            escrow.milestone_count.get(),
            escrow.is_open_job.get(),
            escrow.project_title.get(),
            escrow.project_description.get(),
        ))
    }

    pub fn get_milestones(&self, escrow_id: U256) -> Result<Vec<Milestone>> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        let count = escrow.milestone_count.get();
        let mut milestones = Vec::new();
        for i in 0..count.as_limbs()[0] {
            milestones.push(self.milestones.get(escrow_id).get(U256::from(i)));
        }
        Ok(milestones)
    }

    pub fn get_user_escrows(&self, user: Address) -> Result<Vec<U256>> {
        Ok(self.user_escrows.get(user))
    }

    pub fn get_applications_page(
        &self,
        escrow_id: U256,
        offset: U256,
        limit: U256,
    ) -> Result<Vec<Application>> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if limit == U256::ZERO || limit > self.max_applications.get() {
            return Err(Error::InvalidAmount("Invalid limit".to_string()).into());
        }

        let applications = self.escrow_applications.get(escrow_id);
        let offset_usize = offset.as_limbs()[0] as usize;
        if offset_usize > applications.len() {
            return Err(Error::InvalidAmount("Offset out of bounds".to_string()).into());
        }

        let end = (offset_usize + limit.as_limbs()[0] as usize).min(applications.len());
        let mut result = Vec::new();
        for i in offset_usize..end {
            result.push(applications.get(i));
        }
        Ok(result)
    }

    pub fn get_application_count(&self, escrow_id: U256) -> Result<U256> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }
        Ok(U256::from(self.escrow_applications.get(escrow_id).len()))
    }

    pub fn has_user_applied(&self, escrow_id: U256, user: Address) -> Result<bool> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }
        Ok(self.has_applied.get(escrow_id).get(user))
    }

    pub fn get_reputation(&self, user: Address) -> Result<U256> {
        Ok(self.reputation.get(user))
    }

    pub fn get_completed_escrows(&self, user: Address) -> Result<U256> {
        Ok(self.completed_escrows.get(user))
    }

    pub fn get_withdrawable_fees(&self, token: Address) -> Result<U256> {
        Ok(self.total_fees_by_token.get(token))
    }
}

