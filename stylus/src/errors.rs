//! Error types for SecureFlow

extern crate alloc;
use alloc::string::String;
use alloc::vec::Vec;


// Custom error type for SDK 0.6
pub enum Error {
    Unauthorized(String),
    Paused(String),
    JobCreationPaused(String),
    InvalidEscrow(String),
    InvalidStatus(String),
    InvalidAmount(String),
    InvalidDuration(String),
    TooManyArbiters(String),
    TooManyMilestones(String),
    TokenNotWhitelisted(String),
    ArbiterNotAuthorized(String),
    WorkNotStarted(String),
    MilestoneNotFound(String),
    AlreadySubmitted(String),
    DisputePeriodExpired(String),
    NothingToRefund(String),
    DeadlineNotPassed(String),
    EmergencyPeriodNotReached(String),
    // Specific errors for escrow creation
    BeneficiaryEqualsDepositor(String),
    EmptyMilestones(String),
    ZeroMilestoneAmount(String),
    MilestoneCountMismatch(String),
    EmptyProjectTitle(String),
    ValueMismatch(String),
}

impl From<Error> for Vec<u8> {
    fn from(err: Error) -> Self {
        // Short error codes to save contract size
        match err {
            Error::Unauthorized(_) => b"UNAUTH".to_vec(),
            Error::Paused(_) => b"PAUSED".to_vec(),
            Error::JobCreationPaused(_) => b"JOB_PAUSED".to_vec(),
            Error::InvalidEscrow(_) => b"INV_ESCROW".to_vec(),
            Error::InvalidStatus(_) => b"INV_STATUS".to_vec(),
            Error::InvalidAmount(_) => b"INV_AMT".to_vec(),
            Error::InvalidDuration(_) => b"INV_DUR".to_vec(),
            Error::TooManyArbiters(_) => b"TOO_ARB".to_vec(),
            Error::TooManyMilestones(_) => b"TOO_MS".to_vec(),
            Error::TokenNotWhitelisted(_) => b"TOKEN_NW".to_vec(),
            Error::ArbiterNotAuthorized(_) => b"ARB_NW".to_vec(),
            Error::WorkNotStarted(_) => b"WORK_NW".to_vec(),
            Error::MilestoneNotFound(_) => b"MS_NF".to_vec(),
            Error::AlreadySubmitted(_) => b"ALREADY".to_vec(),
            Error::DisputePeriodExpired(_) => b"DISP_EXP".to_vec(),
            Error::NothingToRefund(_) => b"NO_REFUND".to_vec(),
            Error::DeadlineNotPassed(_) => b"DEADLINE".to_vec(),
            Error::EmergencyPeriodNotReached(_) => b"EMERG_NR".to_vec(),
            // Specific errors for escrow creation
            Error::BeneficiaryEqualsDepositor(_) => b"BENEF_EQ_DEP".to_vec(),
            Error::EmptyMilestones(_) => b"EMPTY_MS".to_vec(),
            Error::ZeroMilestoneAmount(_) => b"ZERO_MS_AMT".to_vec(),
            Error::MilestoneCountMismatch(_) => b"MS_COUNT_MIS".to_vec(),
            Error::EmptyProjectTitle(_) => b"EMPTY_TITLE".to_vec(),
            Error::ValueMismatch(_) => b"VALUE_MIS".to_vec(),
        }
    }
}
