//! Escrow creation and management functions

extern crate alloc;
use alloc::{string::String, vec::Vec};

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::types::{EscrowStatus, MilestoneStatus};
use crate::helpers::SecureFlow as SecureFlowHelpers;
use crate::transfers::SecureFlow as SecureFlowTransfers;

// Note: All public functions moved to public.rs
// This file kept for reference but #[public] removed
impl SecureFlow {
    pub fn create_escrow(
        &mut self,
        beneficiary: Address,
        arbiters: Vec<Address>,
        required_confirmations: u8,
        milestone_amounts: Vec<U256>,
        milestone_descriptions: Vec<String>,
        token: Address,
        duration: U256,
        project_title: String,
        project_description: String,
    ) -> Result<U256> {
        self.when_not_paused()?;
        self.when_job_creation_not_paused()?;
        
        if token != Address::ZERO && !self.whitelisted_tokens.get(token) {
            return Err(Error::TokenNotWhitelisted("Token not whitelisted".to_string()).into());
        }

        if arbiters.is_empty() || arbiters.len() > self.max_arbiters.get().as_limbs()[0] as usize {
            return Err(Error::TooManyArbiters("Too many arbiters".to_string()).into());
        }

        if required_confirmations == 0 || required_confirmations as usize > arbiters.len() {
            return Err(Error::InvalidAmount("Invalid confirmations".to_string()).into());
        }

        for arbiter in &arbiters {
            if !self.authorized_arbiters.get(*arbiter) {
                return Err(Error::ArbiterNotAuthorized("Arbiter not authorized".to_string()).into());
            }
        }

        self.create_escrow_internal(
            msg::sender(),
            beneficiary,
            arbiters,
            required_confirmations,
            milestone_amounts,
            milestone_descriptions,
            token,
            duration,
            project_title,
            project_description,
            false,
        )
    }

    pub fn create_escrow_native(
        &mut self,
        beneficiary: Address,
        arbiters: Vec<Address>,
        required_confirmations: u8,
        milestone_amounts: Vec<U256>,
        milestone_descriptions: Vec<String>,
        duration: U256,
        project_title: String,
        project_description: String,
    ) -> Result<U256> {
        self.when_not_paused()?;
        self.when_job_creation_not_paused()?;

        if arbiters.is_empty() || arbiters.len() > self.max_arbiters.get().as_limbs()[0] as usize {
            return Err(Error::TooManyArbiters("Too many arbiters".to_string()).into());
        }

        if required_confirmations == 0 || required_confirmations as usize > arbiters.len() {
            return Err(Error::InvalidAmount("Invalid confirmations".to_string()).into());
        }

        for arbiter in &arbiters {
            if !self.authorized_arbiters.get(*arbiter) {
                return Err(Error::ArbiterNotAuthorized("Arbiter not authorized".to_string()).into());
            }
        }

        self.create_escrow_internal(
            msg::sender(),
            beneficiary,
            arbiters,
            required_confirmations,
            milestone_amounts,
            milestone_descriptions,
            Address::ZERO,
            duration,
            project_title,
            project_description,
            true,
        )
    }

    fn create_escrow_internal(
        &mut self,
        depositor: Address,
        beneficiary: Address,
        arbiters: Vec<Address>,
        required_confirmations: u8,
        milestone_amounts: Vec<U256>,
        milestone_descriptions: Vec<String>,
        token: Address,
        duration: U256,
        project_title: String,
        project_description: String,
        is_native: bool,
    ) -> Result<U256> {
        if beneficiary == depositor {
            return Err(Error::InvalidAmount("Cannot escrow to self".to_string()).into());
        }

        let min_duration = self.min_duration.get();
        let max_duration = self.max_duration.get();
        if duration < min_duration || duration > max_duration {
            return Err(Error::InvalidDuration("Invalid duration".to_string()).into());
        }

        if milestone_amounts.is_empty() || milestone_amounts.len() > self.max_milestones.get().as_limbs()[0] as usize {
            return Err(Error::TooManyMilestones("Too many milestones".to_string()).into());
        }

        if milestone_amounts.len() != milestone_descriptions.len() {
            return Err(Error::InvalidAmount("Mismatched arrays".to_string()).into());
        }

        if project_title.is_empty() {
            return Err(Error::InvalidAmount("Project title required".to_string()).into());
        }

        let is_open_job = beneficiary == Address::ZERO;
        let mut total_amount = U256::ZERO;
        for amount in &milestone_amounts {
            if *amount == U256::ZERO {
                return Err(Error::InvalidAmount("Invalid milestone amount".to_string()).into());
            }
            total_amount += *amount;
        }

        let platform_fee = self.calculate_fee(total_amount);
        let total_with_fee = total_amount + platform_fee;

        if is_native {
            if msg::value() != total_with_fee {
                return Err(Error::InvalidAmount("Incorrect native amount".to_string()).into());
            }
            let current = self.escrowed_amount.get(Address::ZERO);
            self.escrowed_amount.setter(Address::ZERO).set(current + total_amount);
        } else {
            self.transfer_in(token, depositor, total_with_fee)?;
            let current = self.escrowed_amount.get(token);
            self.escrowed_amount.setter(token).set(current + total_amount);
        }

        let escrow_id = self.next_escrow_id.get();
        self.next_escrow_id.set(escrow_id + U256::from(1));
        let deadline = block::timestamp() + duration;

        let mut escrow = self.escrows.setter(escrow_id);
        escrow.depositor.set(depositor);
        escrow.beneficiary.set(beneficiary);
        escrow.arbiters.set(arbiters.clone());
        escrow.required_confirmations.set(required_confirmations);
        escrow.token.set(token);
        escrow.total_amount.set(total_amount);
        escrow.paid_amount.set(U256::ZERO);
        escrow.platform_fee.set(platform_fee);
        escrow.deadline.set(deadline);
        escrow.status.set(EscrowStatus::Pending as u8);
        escrow.work_started.set(false);
        escrow.created_at.set(block::timestamp());
        escrow.milestone_count.set(U256::from(milestone_amounts.len()));
        escrow.is_open_job.set(is_open_job);
        escrow.project_title.set(project_title);
        escrow.project_description.set(project_description);

        // Create milestones
        for (i, (amount, description)) in milestone_amounts.iter().zip(milestone_descriptions.iter()).enumerate() {
            let mut milestone = self.milestones.setter(escrow_id).setter(U256::from(i));
            milestone.amount.set(*amount);
            milestone.description.set(description.clone());
            milestone.status.set(MilestoneStatus::NotStarted as u8);
            milestone.submitted_at.set(U256::ZERO);
            milestone.approved_at.set(U256::ZERO);
            milestone.disputed_at.set(U256::ZERO);
            milestone.disputed_by.set(Address::ZERO);
            milestone.dispute_reason.set(String::new());
        }

        // Add to user escrows
        let mut user_escrows = self.user_escrows.setter(depositor);
        user_escrows.push(escrow_id);
        if !is_open_job {
            let mut user_escrows_beneficiary = self.user_escrows.setter(beneficiary);
            user_escrows_beneficiary.push(escrow_id);
        }

        Ok(escrow_id)
    }
}

