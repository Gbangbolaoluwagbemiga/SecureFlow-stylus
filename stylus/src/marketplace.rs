//! Marketplace functions for SecureFlow

extern crate alloc;
use alloc::{string::String, vec::Vec};

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::types::{EscrowStatus, Application};
use crate::helpers::SecureFlow as SecureFlowHelpers;

// Note: All public functions moved to public.rs
// This file kept for reference but #[public] removed
impl SecureFlow {
    pub fn apply_to_job(
        &mut self,
        escrow_id: U256,
        cover_letter: String,
        proposed_timeline: U256,
    ) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if !escrow.is_open_job.get() {
            return Err(Error::InvalidStatus("Not an open job".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus("Job closed".to_string()).into());
        }

        if self.has_applied.get(escrow_id).get(msg::sender()) {
            return Err(Error::AlreadySubmitted("Already applied".to_string()).into());
        }

        let max_apps = self.max_applications.get();
        let mut applications = self.escrow_applications.setter(escrow_id);
        if U256::from(applications.len()) >= max_apps {
            return Err(Error::TooManyMilestones("Too many applications".to_string()).into());
        }

        if msg::sender() == escrow.depositor.get() {
            return Err(Error::Unauthorized("Cannot apply to own job".to_string()).into());
        }

        if cover_letter.is_empty() {
            return Err(Error::InvalidAmount("Cover letter required".to_string()).into());
        }

        let mut app = Application::default();
        app.freelancer.set(msg::sender());
        app.cover_letter.set(cover_letter);
        app.proposed_timeline.set(proposed_timeline);
        app.applied_at.set(block::timestamp());
        app.exists.set(true);

        applications.push(app);
        self.has_applied.setter(escrow_id).setter(msg::sender()).set(true);

        Ok(())
    }

    pub fn accept_freelancer(&mut self, escrow_id: U256, freelancer: Address) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        if !escrow.is_open_job.get() {
            return Err(Error::InvalidStatus("Not open job".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus("Job closed".to_string()).into());
        }

        if !self.has_applied.get(escrow_id).get(freelancer) {
            return Err(Error::InvalidEscrow("Freelancer not applied".to_string()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.beneficiary.set(freelancer);
        escrow_mut.is_open_job.set(false);

        let mut user_escrows = self.user_escrows.setter(freelancer);
        user_escrows.push(escrow_id);

        Ok(())
    }
}

