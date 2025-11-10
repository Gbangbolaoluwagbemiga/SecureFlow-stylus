//! Work lifecycle functions for SecureFlow

extern crate alloc;
use alloc::string::String;

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::types::{EscrowStatus, MilestoneStatus};
use crate::helpers::SecureFlow as SecureFlowHelpers;
use crate::transfers::SecureFlow as SecureFlowTransfers;

// Note: All public functions moved to public.rs
// This file kept for reference but #[public] removed
impl SecureFlow {
    pub fn start_work(&mut self, escrow_id: U256) -> Result<()> {
        self.when_not_paused()?;
        
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.beneficiary.get() {
            return Err(Error::Unauthorized("Not beneficiary".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus("Invalid status".to_string()).into());
        }

        if escrow.work_started.get() {
            return Err(Error::WorkNotStarted("Work already started".to_string()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.work_started.set(true);
        escrow_mut.status.set(EscrowStatus::InProgress as u8);

        let platform_fee = escrow.platform_fee.get();
        if platform_fee > U256::ZERO {
            let token = escrow.token.get();
            let current = self.total_fees_by_token.get(token);
            self.total_fees_by_token.setter(token).set(current + platform_fee);
        }

        Ok(())
    }

    pub fn submit_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        description: String,
    ) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.beneficiary.get() {
            return Err(Error::Unauthorized("Not beneficiary".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus("Invalid status".to_string()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound("Milestone not found".to_string()).into());
        }

        let milestone = self.milestones.get(escrow_id).get(milestone_index);
        if milestone.status.get() != MilestoneStatus::NotStarted as u8 {
            return Err(Error::AlreadySubmitted("Already submitted".to_string()).into());
        }

        let mut milestone_mut = self.milestones.setter(escrow_id).setter(milestone_index);
        milestone_mut.status.set(MilestoneStatus::Submitted as u8);
        milestone_mut.submitted_at.set(block::timestamp());
        if !description.is_empty() {
            milestone_mut.description.set(description);
        }

        Ok(())
    }

    pub fn approve_milestone(&mut self, escrow_id: U256, milestone_index: U256) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus("Invalid status".to_string()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound("Milestone not found".to_string()).into());
        }

        let milestone = self.milestones.get(escrow_id).get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Submitted as u8 {
            return Err(Error::InvalidStatus("Not submitted".to_string()).into());
        }

        let amount = milestone.amount.get();
        let mut milestone_mut = self.milestones.setter(escrow_id).setter(milestone_index);
        milestone_mut.status.set(MilestoneStatus::Approved as u8);
        milestone_mut.approved_at.set(block::timestamp());

        let mut escrow_mut = self.escrows.setter(escrow_id);
        let paid = escrow_mut.paid_amount.get();
        escrow_mut.paid_amount.set(paid + amount);

        let token = escrow.token.get();
        let escrowed = self.escrowed_amount.get(token);
        self.escrowed_amount.setter(token).set(escrowed - amount);

        self.transfer_out(token, escrow.beneficiary.get(), amount)?;

        let min_rep_value = self.min_rep_eligible_escrow_value.get();
        if escrow.total_amount.get() >= min_rep_value {
            let rep_points = self.reputation_per_milestone.get();
            self.update_reputation(escrow.beneficiary.get(), rep_points);
        }

        let total = escrow.total_amount.get();
        let new_paid = paid + amount;
        if new_paid == total {
            escrow_mut.status.set(EscrowStatus::Released as u8);
            if escrow.total_amount.get() >= min_rep_value {
                let rep_points = self.reputation_per_escrow.get();
                self.update_reputation(escrow.beneficiary.get(), rep_points);
                self.update_reputation(escrow.depositor.get(), rep_points);
            }
            let completed_beneficiary = self.completed_escrows.get(escrow.beneficiary.get());
            self.completed_escrows.setter(escrow.beneficiary.get()).set(completed_beneficiary + U256::from(1));
            let completed_depositor = self.completed_escrows.get(escrow.depositor.get());
            self.completed_escrows.setter(escrow.depositor.get()).set(completed_depositor + U256::from(1));
        }

        Ok(())
    }

    pub fn reject_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        reason: String,
    ) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus("Invalid status".to_string()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound("Milestone not found".to_string()).into());
        }

        let milestone = self.milestones.get(escrow_id).get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Submitted as u8 {
            return Err(Error::InvalidStatus("Not submitted".to_string()).into());
        }

        let mut milestone_mut = self.milestones.setter(escrow_id).setter(milestone_index);
        milestone_mut.status.set(MilestoneStatus::Rejected as u8);
        milestone_mut.disputed_at.set(block::timestamp());
        milestone_mut.disputed_by.set(msg::sender());
        milestone_mut.dispute_reason.set(reason);

        Ok(())
    }

    pub fn resubmit_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        description: String,
    ) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.beneficiary.get() {
            return Err(Error::Unauthorized("Not beneficiary".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus("Invalid status".to_string()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound("Milestone not found".to_string()).into());
        }

        let milestone = self.milestones.get(escrow_id).get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Rejected as u8 {
            return Err(Error::InvalidStatus("Not rejected".to_string()).into());
        }

        let mut milestone_mut = self.milestones.setter(escrow_id).setter(milestone_index);
        milestone_mut.status.set(MilestoneStatus::Submitted as u8);
        milestone_mut.submitted_at.set(block::timestamp());
        if !description.is_empty() {
            milestone_mut.description.set(description);
        }

        Ok(())
    }

    pub fn dispute_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        reason: String,
    ) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        let milestone = self.milestones.get(escrow_id).get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Submitted as u8 {
            return Err(Error::InvalidStatus("Not submitted".to_string()).into());
        }

        let dispute_period = self.dispute_period.get();
        if block::timestamp() > milestone.submitted_at.get() + dispute_period {
            return Err(Error::DisputePeriodExpired("Dispute period expired".to_string()).into());
        }

        let mut milestone_mut = self.milestones.setter(escrow_id).setter(milestone_index);
        milestone_mut.status.set(MilestoneStatus::Disputed as u8);
        milestone_mut.disputed_at.set(block::timestamp());
        milestone_mut.disputed_by.set(msg::sender());
        milestone_mut.dispute_reason.set(reason);

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.status.set(EscrowStatus::Disputed as u8);

        Ok(())
    }

    pub fn resolve_dispute(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        beneficiary_amount: U256,
    ) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        let sender = msg::sender();
        if sender != escrow.depositor.get() 
            && sender != escrow.beneficiary.get() 
            && !self.is_arbiter_for_escrow_internal(escrow_id, sender) {
            return Err(Error::Unauthorized("Not authorized".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::Disputed as u8 {
            return Err(Error::InvalidStatus("Not in dispute".to_string()).into());
        }

        let milestone = self.milestones.get(escrow_id).get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Disputed as u8 {
            return Err(Error::InvalidStatus("Not disputed".to_string()).into());
        }

        let milestone_amount = milestone.amount.get();
        if beneficiary_amount > milestone_amount {
            return Err(Error::InvalidAmount("Invalid allocation".to_string()).into());
        }

        let refund_amount = milestone_amount - beneficiary_amount;
        let token = escrow.token.get();

        let mut milestone_mut = self.milestones.setter(escrow_id).setter(milestone_index);
        milestone_mut.status.set(MilestoneStatus::Resolved as u8);
        milestone_mut.approved_at.set(block::timestamp());

        let mut escrow_mut = self.escrows.setter(escrow_id);
        
        if beneficiary_amount > U256::ZERO {
            let paid = escrow_mut.paid_amount.get();
            escrow_mut.paid_amount.set(paid + beneficiary_amount);
            let escrowed = self.escrowed_amount.get(token);
            self.escrowed_amount.setter(token).set(escrowed - beneficiary_amount);
            self.transfer_out(token, escrow.beneficiary.get(), beneficiary_amount)?;
        }

        if refund_amount > U256::ZERO {
            let escrowed = self.escrowed_amount.get(token);
            self.escrowed_amount.setter(token).set(escrowed - refund_amount);
            self.transfer_out(token, escrow.depositor.get(), refund_amount)?;
        }

        escrow_mut.status.set(EscrowStatus::InProgress as u8);

        let total = escrow.total_amount.get();
        let paid = escrow_mut.paid_amount.get();
        if paid == total {
            escrow_mut.status.set(EscrowStatus::Released as u8);
        }

        Ok(())
    }
}

