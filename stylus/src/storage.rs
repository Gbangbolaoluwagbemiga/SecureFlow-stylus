//! Storage definitions for SecureFlow

use stylus_sdk::prelude::*;
use crate::types::{EscrowData, Milestone, Application};

sol_storage! {
    #[entrypoint]
    pub struct SecureFlow {
        // Constants
        uint256 min_duration;
        uint256 max_duration;
        uint256 dispute_period;
        uint256 emergency_refund_delay;
        uint256 max_platform_fee_bp;
        uint256 max_arbiters;
        uint256 max_milestones;
        uint256 max_applications;
        uint256 reputation_per_milestone;
        uint256 reputation_per_escrow;
        uint256 min_rep_eligible_escrow_value;
        
        // Config
        address monad_token;
        uint256 platform_fee_bp;
        address fee_collector;
        bool job_creation_paused;
        address owner;
        bool paused;
        
        // State
        uint256 next_escrow_id;
        mapping(uint256 => EscrowData) escrows;
        mapping(uint256 => mapping(uint256 => Milestone)) milestones;
        mapping(address => uint256[]) user_escrows;
        mapping(address => bool) authorized_arbiters;
        mapping(address => bool) whitelisted_tokens;
        mapping(address => uint256) escrowed_amount;
        mapping(address => uint256) total_fees_by_token;
        
        // Marketplace
        mapping(uint256 => Application[]) escrow_applications;
        mapping(uint256 => mapping(address => bool)) has_applied;
        
        // Reputation
        mapping(address => uint256) reputation;
        mapping(address => uint256) completed_escrows;
    }
}

