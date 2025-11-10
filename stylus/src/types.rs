//! Types and data structures for SecureFlow

use stylus_sdk::prelude::*;

// Note: SolidityType might not be available in this SDK version
// Using repr(u8) for enums which is compatible

// Enums - using repr(u8) for EVM compatibility
#[derive(Copy, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum EscrowStatus {
    Pending = 0,
    InProgress = 1,
    Released = 2,
    Refunded = 3,
    Disputed = 4,
    Expired = 5,
}

#[derive(Copy, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum MilestoneStatus {
    NotStarted = 0,
    Submitted = 1,
    Approved = 2,
    Disputed = 3,
    Resolved = 4,
    Rejected = 5,
}

// Storage structs
sol_storage! {
    pub struct Milestone {
        string description;
        uint256 amount;
        uint8 status;
        uint256 submitted_at;
        uint256 approved_at;
        uint256 disputed_at;
        address disputed_by;
        string dispute_reason;
    }

    pub struct Application {
        address freelancer;
        string cover_letter;
        uint256 proposed_timeline;
        uint256 applied_at;
        bool exists;
    }

    pub struct EscrowData {
        address depositor;
        address beneficiary;
        address[] arbiters;
        uint8 required_confirmations;
        address token;
        uint256 total_amount;
        uint256 paid_amount;
        uint256 platform_fee;
        uint256 deadline;
        uint8 status;
        bool work_started;
        uint256 created_at;
        uint256 milestone_count;
        bool is_open_job;
        string project_title;
        string project_description;
    }
}

