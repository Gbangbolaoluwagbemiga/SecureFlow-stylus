//! Public interface - all public functions consolidated here
//! Stylus only allows ONE #[public] impl block per contract

extern crate alloc;
use alloc::{string::String, vec::Vec};

use stylus_sdk::{
    prelude::*,
    msg,
    block,
};
use alloy_primitives::{Address, U256, U8};
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::types::{EscrowStatus, MilestoneStatus};
// Note: SecureFlow is accessed directly from storage, not through helpers/transfers

#[public]
impl SecureFlow {
    // ===== Initialization =====
    pub fn init(&mut self) -> Result<(), Vec<u8>> {
        self.init_constants();
        self.owner.set(msg::sender());
        self.next_escrow_id.set(U256::from(1));
        Ok(())
    }

    // ===== Escrow Management =====
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
    ) -> Result<U256, Vec<u8>> {
        self.when_not_paused()?;
        self.when_job_creation_not_paused()?;
        
        if token != Address::ZERO && !self.whitelisted_tokens.get(token) {
            return Err(Error::TokenNotWhitelisted(String::new()).into());
        }

        if arbiters.is_empty() || arbiters.len() > self.max_arbiters.get().as_limbs()[0] as usize {
            return Err(Error::TooManyArbiters(String::new()).into());
        }

        if required_confirmations == 0 || required_confirmations as usize > arbiters.len() {
            return Err(Error::InvalidAmount(String::new()).into());
        }

        for arbiter in &arbiters {
            if !self.authorized_arbiters.get(*arbiter) {
                return Err(Error::ArbiterNotAuthorized(String::new()).into());
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
    ) -> Result<U256, Vec<u8>> {
        self.when_not_paused()?;
        self.when_job_creation_not_paused()?;

        if arbiters.is_empty() || arbiters.len() > self.max_arbiters.get().as_limbs()[0] as usize {
            return Err(Error::TooManyArbiters(String::new()).into());
        }

        if required_confirmations == 0 || required_confirmations as usize > arbiters.len() {
            return Err(Error::InvalidAmount(String::new()).into());
        }

        for arbiter in &arbiters {
            if !self.authorized_arbiters.get(*arbiter) {
                return Err(Error::ArbiterNotAuthorized(String::new()).into());
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
    ) -> Result<U256, Vec<u8>> {
        if beneficiary == depositor {
            return Err(Error::InvalidAmount(String::new()).into());
        }

        let min_duration = self.min_duration.get();
        let max_duration = self.max_duration.get();
        if duration < min_duration || duration > max_duration {
            return Err(Error::InvalidDuration(String::new()).into());
        }

        if milestone_amounts.is_empty() || milestone_amounts.len() > self.max_milestones.get().as_limbs()[0] as usize {
            return Err(Error::TooManyMilestones(String::new()).into());
        }

        if milestone_amounts.len() != milestone_descriptions.len() {
            return Err(Error::InvalidAmount(String::new()).into());
        }

        if project_title.is_empty() {
            return Err(Error::InvalidAmount(String::new()).into());
        }

        let is_open_job = beneficiary == Address::ZERO;
        let mut total_amount = U256::ZERO;
        for amount in &milestone_amounts {
            if *amount == U256::ZERO {
                return Err(Error::InvalidAmount(String::new()).into());
            }
            total_amount += *amount;
        }

        if is_native {
            if msg::value() != total_amount {
                return Err(Error::InvalidAmount(String::new()).into());
            }
            let current = self.escrowed_amount.get(Address::ZERO);
            self.escrowed_amount.setter(Address::ZERO).set(current + total_amount);
        } else {
            self.transfer_in(token, depositor, total_amount)?;
            let current = self.escrowed_amount.get(token);
            self.escrowed_amount.setter(token).set(current + total_amount);
        }

        let escrow_id = self.next_escrow_id.get();
        self.next_escrow_id.set(escrow_id + U256::from(1));
        let deadline = U256::from(block::timestamp()) + duration;

        let mut escrow = self.escrows.setter(escrow_id);
        escrow.depositor.set(depositor);
        escrow.beneficiary.set(beneficiary);
        // Set arbiters - clear existing and push new ones
        // Note: We need to handle arbiters differently due to borrow checker
        // For now, we'll push them one by one
        let arbiters_vec = &mut escrow.arbiters;
        // Clear existing arbiters by setting length to 0
        unsafe { arbiters_vec.set_len(0) };
        for arbiter in arbiters {
            arbiters_vec.push(arbiter);
        }
        escrow.required_confirmations.set(U8::from(required_confirmations));
        escrow.token.set(token);
        escrow.total_amount.set(total_amount);
        escrow.paid_amount.set(U256::ZERO);
        escrow.deadline.set(deadline);
        escrow.status.set(U8::from(EscrowStatus::Pending as u8));
        escrow.work_started.set(false);
        escrow.created_at.set(U256::from(block::timestamp()));
        escrow.milestone_count.set(U256::from(milestone_amounts.len()));
        escrow.is_open_job.set(is_open_job);
        escrow.project_title.0.set_bytes(project_title.as_bytes());
        escrow.project_description.0.set_bytes(project_description.as_bytes());

        // Create milestones
        for (i, (amount, description)) in milestone_amounts.iter().zip(milestone_descriptions.iter()).enumerate() {
            let mut milestones_map = self.milestones.setter(escrow_id);
            let mut milestone = milestones_map.setter(U256::from(i));
            milestone.amount.set(*amount);
            milestone.description.0.set_bytes(description.as_bytes());
            milestone.status.set(U8::from(MilestoneStatus::NotStarted as u8));
            milestone.submitted_at.set(U256::ZERO);
            milestone.approved_at.set(U256::ZERO);
            milestone.disputed_at.set(U256::ZERO);
            milestone.disputed_by.set(Address::ZERO);
            milestone.dispute_reason.0.set_bytes(&[]);
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

    // ===== Work Lifecycle =====
    pub fn start_work(&mut self, escrow_id: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.beneficiary.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if escrow.work_started.get() {
            return Err(Error::WorkNotStarted(String::new()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.work_started.set(true);
        escrow_mut.status.set(U8::from(EscrowStatus::InProgress as u8));

        Ok(())
    }

    pub fn submit_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        description: String,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.beneficiary.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound(String::new()).into());
        }

        let milestones_map = self.milestones.get(escrow_id);
        let milestone = milestones_map.get(milestone_index);
        if milestone.status.get() != MilestoneStatus::NotStarted as u8 {
            return Err(Error::AlreadySubmitted(String::new()).into());
        }

        let mut milestones_map_mut = self.milestones.setter(escrow_id);
        let mut milestone_mut = milestones_map_mut.setter(milestone_index);
        milestone_mut.status.set(U8::from(MilestoneStatus::Submitted as u8));
        milestone_mut.submitted_at.set(U256::from(block::timestamp()));
        if !description.is_empty() {
            milestone_mut.description.0.set_bytes(description.as_bytes());
        }

        Ok(())
    }

    pub fn approve_milestone(&mut self, escrow_id: U256, milestone_index: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound(String::new()).into());
        }

        let milestones_map = self.milestones.get(escrow_id);
        let milestone = milestones_map.get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Submitted as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let amount = milestone.amount.get();
        let token = escrow.token.get();
        let beneficiary = escrow.beneficiary.get();
        let depositor = escrow.depositor.get();
        let total = escrow.total_amount.get();
        let min_rep_value = self.min_rep_eligible_escrow_value.get();
        let paid = escrow.paid_amount.get();
        let new_paid = paid + amount;
        
        let mut milestones_map_mut = self.milestones.setter(escrow_id);
        let mut milestone_mut = milestones_map_mut.setter(milestone_index);
        milestone_mut.status.set(U8::from(MilestoneStatus::Approved as u8));
        milestone_mut.approved_at.set(U256::from(block::timestamp()));
        drop(milestone_mut);
        drop(milestones_map_mut);

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.paid_amount.set(new_paid);
        let escrowed = self.escrowed_amount.get(token);
        self.escrowed_amount.setter(token).set(escrowed - amount);
        drop(escrow_mut);
        
        self.transfer_out(token, beneficiary, amount)?;

        if total >= min_rep_value {
            let rep_points = self.reputation_per_milestone.get();
            self.update_reputation(beneficiary, rep_points);
        }

        if new_paid == total {
            let mut escrow_mut = self.escrows.setter(escrow_id);
            escrow_mut.status.set(U8::from(EscrowStatus::Released as u8));
            drop(escrow_mut);
            if total >= min_rep_value {
                let rep_points = self.reputation_per_escrow.get();
                self.update_reputation(beneficiary, rep_points);
                self.update_reputation(depositor, rep_points);
            }
            let completed_beneficiary = self.completed_escrows.get(beneficiary);
            self.completed_escrows.setter(beneficiary).set(completed_beneficiary + U256::from(1));
            let completed_depositor = self.completed_escrows.get(depositor);
            self.completed_escrows.setter(depositor).set(completed_depositor + U256::from(1));
        }

        Ok(())
    }

    pub fn reject_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        reason: String,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound(String::new()).into());
        }

        let milestones_map = self.milestones.get(escrow_id);
        let milestone = milestones_map.get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Submitted as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let mut milestones_map_mut = self.milestones.setter(escrow_id);
        let mut milestone_mut = milestones_map_mut.setter(milestone_index);
        milestone_mut.status.set(U8::from(MilestoneStatus::Rejected as u8));
        milestone_mut.disputed_at.set(U256::from(block::timestamp()));
        milestone_mut.disputed_by.set(msg::sender());
        milestone_mut.dispute_reason.0.set_bytes(reason.as_bytes());

        Ok(())
    }

    pub fn resubmit_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        description: String,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.beneficiary.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::InProgress as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if milestone_index >= escrow.milestone_count.get() {
            return Err(Error::MilestoneNotFound(String::new()).into());
        }

        let milestones_map = self.milestones.get(escrow_id);
        let milestone = milestones_map.get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Rejected as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let mut milestones_map_mut = self.milestones.setter(escrow_id);
        let mut milestone_mut = milestones_map_mut.setter(milestone_index);
        milestone_mut.status.set(U8::from(MilestoneStatus::Submitted as u8));
        milestone_mut.submitted_at.set(U256::from(block::timestamp()));
        if !description.is_empty() {
            milestone_mut.description.0.set_bytes(description.as_bytes());
        }

        Ok(())
    }

    pub fn dispute_milestone(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        reason: String,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        let milestones_map = self.milestones.get(escrow_id);
        let milestone = milestones_map.get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Submitted as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let dispute_period = self.dispute_period.get();
        if U256::from(block::timestamp()) > milestone.submitted_at.get() + dispute_period {
            return Err(Error::DisputePeriodExpired(String::new()).into());
        }

        let mut milestones_map_mut = self.milestones.setter(escrow_id);
        let mut milestone_mut = milestones_map_mut.setter(milestone_index);
        milestone_mut.status.set(U8::from(MilestoneStatus::Disputed as u8));
        milestone_mut.disputed_at.set(U256::from(block::timestamp()));
        milestone_mut.disputed_by.set(msg::sender());
        milestone_mut.dispute_reason.0.set_bytes(reason.as_bytes());

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.status.set(U8::from(EscrowStatus::Disputed as u8));

        Ok(())
    }

    pub fn resolve_dispute(
        &mut self,
        escrow_id: U256,
        milestone_index: U256,
        beneficiary_amount: U256,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        let sender = msg::sender();
        if sender != escrow.depositor.get() 
            && sender != escrow.beneficiary.get() 
            && !self.is_arbiter_for_escrow_internal(escrow_id, sender) {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::Disputed as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let milestones_map = self.milestones.get(escrow_id);
        let milestone = milestones_map.get(milestone_index);
        if milestone.status.get() != MilestoneStatus::Disputed as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let milestone_amount = milestone.amount.get();
        if beneficiary_amount > milestone_amount {
            return Err(Error::InvalidAmount(String::new()).into());
        }

        let refund_amount = milestone_amount - beneficiary_amount;
        let token = escrow.token.get();
        let beneficiary = escrow.beneficiary.get();
        let depositor = escrow.depositor.get();
        let total = escrow.total_amount.get();
        
        let mut milestones_map_mut = self.milestones.setter(escrow_id);
        let mut milestone_mut = milestones_map_mut.setter(milestone_index);
        milestone_mut.status.set(U8::from(MilestoneStatus::Resolved as u8));
        milestone_mut.approved_at.set(U256::from(block::timestamp()));
        drop(milestone_mut);
        drop(milestones_map_mut);

        let mut escrow_mut = self.escrows.setter(escrow_id);
        let paid = escrow_mut.paid_amount.get();
        
        if beneficiary_amount > U256::ZERO {
            let new_paid = paid + beneficiary_amount;
            escrow_mut.paid_amount.set(new_paid);
            let escrowed = self.escrowed_amount.get(token);
            self.escrowed_amount.setter(token).set(escrowed - beneficiary_amount);
            drop(escrow_mut);
            self.transfer_out(token, beneficiary, beneficiary_amount)?;
            escrow_mut = self.escrows.setter(escrow_id);
        }

        if refund_amount > U256::ZERO {
            let escrowed = self.escrowed_amount.get(token);
            self.escrowed_amount.setter(token).set(escrowed - refund_amount);
            drop(escrow_mut);
            self.transfer_out(token, depositor, refund_amount)?;
            escrow_mut = self.escrows.setter(escrow_id);
        }

        escrow_mut.status.set(U8::from(EscrowStatus::InProgress as u8));

        let final_paid = escrow_mut.paid_amount.get();
        if final_paid == total {
            escrow_mut.status.set(U8::from(EscrowStatus::Released as u8));
        }

        Ok(())
    }

    // ===== Marketplace =====
    pub fn apply_to_job(
        &mut self,
        escrow_id: U256,
        cover_letter: String,
        proposed_timeline: U256,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if !escrow.is_open_job.get() {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if self.has_applied.get(escrow_id).get(msg::sender()) {
            return Err(Error::AlreadySubmitted(String::new()).into());
        }

        let max_apps = self.max_applications.get();
        let mut applications = self.escrow_applications.setter(escrow_id);
        if U256::from(applications.len()) >= max_apps {
            return Err(Error::TooManyMilestones(String::new()).into());
        }

        if msg::sender() == escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if cover_letter.is_empty() {
            return Err(Error::InvalidAmount(String::new()).into());
        }

          // Create application using grow() to get a mutable accessor
          let mut app = applications.grow();
          app.freelancer.set(msg::sender());
          app.cover_letter.0.set_bytes(cover_letter.as_bytes());
          app.proposed_timeline.set(proposed_timeline);
          app.applied_at.set(U256::from(block::timestamp()));
          app.exists.set(true);
        self.has_applied.setter(escrow_id).setter(msg::sender()).set(true);

        Ok(())
    }

    pub fn accept_freelancer(&mut self, escrow_id: U256, freelancer: Address) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if !escrow.is_open_job.get() {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if !self.has_applied.get(escrow_id).get(freelancer) {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.beneficiary.set(freelancer);
        escrow_mut.is_open_job.set(false);

        let mut user_escrows = self.user_escrows.setter(freelancer);
        user_escrows.push(escrow_id);

        Ok(())
    }

    // ===== Refund System =====
    pub fn refund_escrow(&mut self, escrow_id: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        if escrow.work_started.get() {
            return Err(Error::WorkNotStarted(String::new()).into());
        }

        if U256::from(block::timestamp()) >= escrow.deadline.get() {
            return Err(Error::DeadlineNotPassed(String::new()).into());
        }

        let refund_amount = escrow.total_amount.get() - escrow.paid_amount.get();
        let token = escrow.token.get();
        let depositor = escrow.depositor.get();
        if refund_amount == U256::ZERO {
            return Err(Error::NothingToRefund(String::new()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.status.set(U8::from(EscrowStatus::Refunded as u8));
        let escrowed = self.escrowed_amount.get(token);
        self.escrowed_amount.setter(token).set(escrowed - refund_amount);
        drop(escrow_mut);

        self.transfer_out(token, depositor, refund_amount)?;

        Ok(())
    }

    pub fn emergency_refund_after_deadline(&mut self, escrow_id: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        let emergency_delay = self.emergency_refund_delay.get();
        if U256::from(block::timestamp()) <= escrow.deadline.get() + emergency_delay {
            return Err(Error::EmergencyPeriodNotReached(String::new()).into());
        }

        let status = escrow.status.get();
        if status == EscrowStatus::Released as u8 || status == EscrowStatus::Refunded as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let refund_amount = escrow.total_amount.get() - escrow.paid_amount.get();
        let token = escrow.token.get();
        let depositor = escrow.depositor.get();
        if refund_amount == U256::ZERO {
            return Err(Error::NothingToRefund(String::new()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.status.set(U8::from(EscrowStatus::Expired as u8));
        let escrowed = self.escrowed_amount.get(token);
        self.escrowed_amount.setter(token).set(escrowed - refund_amount);
        drop(escrow_mut);

        self.transfer_out(token, depositor, refund_amount)?;

        Ok(())
    }

    pub fn extend_deadline(&mut self, escrow_id: U256, extra_seconds: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }

        if extra_seconds == U256::ZERO || extra_seconds > U256::from(2592000) {
            return Err(Error::InvalidDuration(String::new()).into());
        }

        let status = escrow.status.get();
        if status != EscrowStatus::InProgress as u8 && status != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus(String::new()).into());
        }

        let escrow = self.escrows.get(escrow_id);
        let new_deadline = escrow.deadline.get() + extra_seconds;
        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.deadline.set(new_deadline);

        Ok(())
    }

    // ===== Admin Functions =====

    pub fn whitelist_token(&mut self, token: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        if token == Address::ZERO {
            return Err(Error::InvalidAmount(String::new()).into());
        }
        self.whitelisted_tokens.setter(token).set(true);
        Ok(())
    }

    pub fn blacklist_token(&mut self, token: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.whitelisted_tokens.setter(token).set(false);
        Ok(())
    }

    pub fn authorize_arbiter(&mut self, arbiter: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        if arbiter == Address::ZERO {
            return Err(Error::InvalidAmount(String::new()).into());
        }
        self.authorized_arbiters.setter(arbiter).set(true);
        Ok(())
    }

    pub fn revoke_arbiter(&mut self, arbiter: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.authorized_arbiters.setter(arbiter).set(false);
        Ok(())
    }

    pub fn pause_job_creation(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.job_creation_paused.set(true);
        Ok(())
    }

    pub fn unpause_job_creation(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.job_creation_paused.set(false);
        Ok(())
    }

    pub fn pause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(true);
        Ok(())
    }

    pub fn unpause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(false);
        Ok(())
    }


    // ===== View Functions =====
    pub fn next_escrow_id(&self) -> Result<U256, Vec<u8>> {
        Ok(self.next_escrow_id.get())
    }

    pub fn owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }

    pub fn paused(&self) -> Result<bool, Vec<u8>> {
        Ok(self.paused.get())
    }


    pub fn job_creation_paused(&self) -> Result<bool, Vec<u8>> {
        Ok(self.job_creation_paused.get())
    }

    pub fn authorized_arbiters(&self, arbiter: Address) -> Result<bool, Vec<u8>> {
        Ok(self.authorized_arbiters.get(arbiter))
    }

    pub fn whitelisted_tokens(&self, token: Address) -> Result<bool, Vec<u8>> {
        Ok(self.whitelisted_tokens.get(token))
    }

    pub fn reputation(&self, user: Address) -> Result<U256, Vec<u8>> {
        Ok(self.reputation.get(user))
    }

    pub fn completed_escrows(&self, user: Address) -> Result<U256, Vec<u8>> {
        Ok(self.completed_escrows.get(user))
    }

    pub fn escrowed_amount(&self, token: Address) -> Result<U256, Vec<u8>> {
        Ok(self.escrowed_amount.get(token))
    }


    pub fn has_applied(&self, escrow_id: U256, user: Address) -> Result<bool, Vec<u8>> {
        Ok(self.has_applied.get(escrow_id).get(user))
    }

    pub fn is_arbiter_for_escrow(&self, escrow_id: U256, arbiter: Address) -> Result<bool, Vec<u8>> {
        Ok(self.is_arbiter_for_escrow_internal(escrow_id, arbiter))
    }

    pub fn get_escrow_summary(&self, escrow_id: U256) -> Result<(Address, Address, Vec<Address>, U256, U256, U256, U256, Address, U256, bool, U256, U256, bool, String, String), Vec<u8>> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }
        let remaining = escrow.total_amount.get() - escrow.paid_amount.get();
        let arbiters_vec = &escrow.arbiters;
        let mut arbiters_list = Vec::new();
        let mut i = 0;
        loop {
            if let Some(addr) = arbiters_vec.get(i) {
                arbiters_list.push(addr);
                i += 1;
            } else {
                break;
            }
        }
        Ok((
            escrow.depositor.get(),
            escrow.beneficiary.get(),
            arbiters_list,
            U256::from(escrow.status.get()),
            escrow.total_amount.get(),
            escrow.paid_amount.get(),
            remaining,
            escrow.token.get(),
            escrow.deadline.get(),
            escrow.work_started.get(),
            escrow.created_at.get(),
            escrow.milestone_count.get(),
            escrow.is_open_job.get(),
            escrow.project_title.get_string(),
            escrow.project_description.get_string(),
        ))
    }

    pub fn get_milestones(&self, _escrow_id: U256) -> Result<Vec<u8>, Vec<u8>> {
        // Return empty vec - milestone serialization would need custom encoding
        Ok(Vec::new())
    }

    pub fn get_user_escrows(&self, user: Address) -> Result<Vec<U256>, Vec<u8>> {
        let escrows_vec = &self.user_escrows.get(user);
        let mut escrows_list = Vec::new();
        let mut i = 0;
        loop {
            if let Some(escrow_id) = escrows_vec.get(i) {
                escrows_list.push(escrow_id);
                i += 1;
            } else {
                break;
            }
        }
        Ok(escrows_list)
    }

    pub fn get_applications_page(
        &self,
        _escrow_id: U256,
        _offset: U256,
        _limit: U256,
    ) -> Result<Vec<u8>, Vec<u8>> {
        // Return empty vec - Application serialization would need custom encoding
        Ok(Vec::new())
    }

    pub fn get_application_count(&self, escrow_id: U256) -> Result<U256, Vec<u8>> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }
        Ok(U256::from(self.escrow_applications.get(escrow_id).len()))
    }

    pub fn has_user_applied(&self, escrow_id: U256, user: Address) -> Result<bool, Vec<u8>> {
        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow(String::new()).into());
        }
        Ok(self.has_applied.get(escrow_id).get(user))
    }

    pub fn get_reputation(&self, user: Address) -> Result<U256, Vec<u8>> {
        Ok(self.reputation.get(user))
    }

    pub fn get_completed_escrows(&self, user: Address) -> Result<U256, Vec<u8>> {
        Ok(self.completed_escrows.get(user))
    }

}
