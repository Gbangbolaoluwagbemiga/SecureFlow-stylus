//! Refund functions for SecureFlow

extern crate alloc;
use alloc::string::String;

use stylus_sdk::prelude::*;
use crate::storage::SecureFlow;
use crate::errors::Error;
use crate::types::EscrowStatus;
use crate::helpers::SecureFlow as SecureFlowHelpers;
use crate::transfers::SecureFlow as SecureFlowTransfers;

// Note: All public functions moved to public.rs
// This file kept for reference but #[public] removed
impl SecureFlow {
    pub fn refund_escrow(&mut self, escrow_id: U256) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        if escrow.status.get() != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus("Invalid status".to_string()).into());
        }

        if escrow.work_started.get() {
            return Err(Error::WorkNotStarted("Work started".to_string()).into());
        }

        if block::timestamp() >= escrow.deadline.get() {
            return Err(Error::DeadlineNotPassed("Deadline passed".to_string()).into());
        }

        let refund_amount = escrow.total_amount.get() - escrow.paid_amount.get();
        if refund_amount == U256::ZERO {
            return Err(Error::NothingToRefund("Nothing to refund".to_string()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.status.set(EscrowStatus::Refunded as u8);

        let token = escrow.token.get();
        let escrowed = self.escrowed_amount.get(token);
        self.escrowed_amount.setter(token).set(escrowed - refund_amount);

        self.transfer_out(token, escrow.depositor.get(), refund_amount)?;

        Ok(())
    }

    pub fn emergency_refund_after_deadline(&mut self, escrow_id: U256) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        let emergency_delay = self.emergency_refund_delay.get();
        if block::timestamp() <= escrow.deadline.get() + emergency_delay {
            return Err(Error::EmergencyPeriodNotReached("Emergency period not reached".to_string()).into());
        }

        let status = escrow.status.get();
        if status == EscrowStatus::Released as u8 || status == EscrowStatus::Refunded as u8 {
            return Err(Error::InvalidStatus("Cannot refund".to_string()).into());
        }

        let refund_amount = escrow.total_amount.get() - escrow.paid_amount.get();
        if refund_amount == U256::ZERO {
            return Err(Error::NothingToRefund("Nothing to refund".to_string()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        escrow_mut.status.set(EscrowStatus::Expired as u8);

        let token = escrow.token.get();
        let escrowed = self.escrowed_amount.get(token);
        self.escrowed_amount.setter(token).set(escrowed - refund_amount);

        self.transfer_out(token, escrow.depositor.get(), refund_amount)?;

        Ok(())
    }

    pub fn extend_deadline(&mut self, escrow_id: U256, extra_seconds: U256) -> Result<()> {
        self.when_not_paused()?;

        let escrow = self.escrows.get(escrow_id);
        if escrow.depositor.get() == Address::ZERO {
            return Err(Error::InvalidEscrow("Invalid escrow".to_string()).into());
        }

        if msg::sender() != escrow.depositor.get() {
            return Err(Error::Unauthorized("Not depositor".to_string()).into());
        }

        if extra_seconds == U256::ZERO || extra_seconds > U256::from(2592000) {
            return Err(Error::InvalidDuration("Invalid extension".to_string()).into());
        }

        let status = escrow.status.get();
        if status != EscrowStatus::InProgress as u8 && status != EscrowStatus::Pending as u8 {
            return Err(Error::InvalidStatus("Cannot extend".to_string()).into());
        }

        let mut escrow_mut = self.escrows.setter(escrow_id);
        let new_deadline = escrow.deadline.get() + extra_seconds;
        escrow_mut.deadline.set(new_deadline);

        Ok(())
    }
}

