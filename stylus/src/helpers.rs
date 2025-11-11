//! Helper functions for SecureFlow

extern crate alloc;
use alloc::{string::String, vec::Vec};

use stylus_sdk::msg;
use alloy_primitives::{Address, U256};
use crate::storage::SecureFlow;
use crate::errors::Error;

impl SecureFlow {
    // Initialize constants
    pub fn init_constants(&mut self) {
        self.min_duration.set(U256::from(3600)); // 1 hour
        self.max_duration.set(U256::from(31536000)); // 365 days
        self.dispute_period.set(U256::from(604800)); // 7 days
        self.emergency_refund_delay.set(U256::from(2592000)); // 30 days
        self.max_arbiters.set(U256::from(5));
        self.max_milestones.set(U256::from(20));
        self.max_applications.set(U256::from(50));
        self.reputation_per_milestone.set(U256::from(10));
        self.reputation_per_escrow.set(U256::from(25));
        self.min_rep_eligible_escrow_value.set(U256::from(10_000_000_000_000_000u64));
    }
    
    // Helper functions
    pub fn is_arbiter_for_escrow_internal(&self, escrow_id: U256, arbiter: Address) -> bool {
        let escrow = self.escrows.get(escrow_id);
        let arbiters = &escrow.arbiters;
        // Check if arbiter is in the list
        let mut i = 0;
        loop {
            if let Some(addr) = arbiters.get(i) {
                if addr == arbiter {
                    return true;
                }
                i += 1;
            } else {
                break;
            }
        }
        false
    }
    
    pub fn update_reputation(&mut self, user: Address, points: U256) {
        if user != Address::ZERO {
            let current = self.reputation.get(user);
            self.reputation.setter(user).set(current + points);
        }
    }
    
    // Access control
    pub fn only_owner(&self) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(Error::Unauthorized(String::new()).into());
        }
        Ok(())
    }
    
    pub fn when_not_paused(&self) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            return Err(Error::Paused(String::new()).into());
        }
        Ok(())
    }
    
    pub fn when_job_creation_not_paused(&self) -> Result<(), Vec<u8>> {
        if self.job_creation_paused.get() {
            return Err(Error::JobCreationPaused(String::new()).into());
        }
        Ok(())
    }
}

