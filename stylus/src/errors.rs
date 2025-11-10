//! Error types for SecureFlow

extern crate alloc;
use alloc::string::String;
use alloc::vec::Vec;
use alloc::format;

use stylus_sdk::prelude::*;

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
}

impl From<Error> for Vec<u8> {
    fn from(err: Error) -> Self {
        let msg = match err {
            Error::Unauthorized(s) => format!("Unauthorized: {}", s),
            Error::Paused(s) => format!("Paused: {}", s),
            Error::JobCreationPaused(s) => format!("JobCreationPaused: {}", s),
            Error::InvalidEscrow(s) => format!("InvalidEscrow: {}", s),
            Error::InvalidStatus(s) => format!("InvalidStatus: {}", s),
            Error::InvalidAmount(s) => format!("InvalidAmount: {}", s),
            Error::InvalidDuration(s) => format!("InvalidDuration: {}", s),
            Error::TooManyArbiters(s) => format!("TooManyArbiters: {}", s),
            Error::TooManyMilestones(s) => format!("TooManyMilestones: {}", s),
            Error::TokenNotWhitelisted(s) => format!("TokenNotWhitelisted: {}", s),
            Error::ArbiterNotAuthorized(s) => format!("ArbiterNotAuthorized: {}", s),
            Error::WorkNotStarted(s) => format!("WorkNotStarted: {}", s),
            Error::MilestoneNotFound(s) => format!("MilestoneNotFound: {}", s),
            Error::AlreadySubmitted(s) => format!("AlreadySubmitted: {}", s),
            Error::DisputePeriodExpired(s) => format!("DisputePeriodExpired: {}", s),
            Error::NothingToRefund(s) => format!("NothingToRefund: {}", s),
            Error::DeadlineNotPassed(s) => format!("DeadlineNotPassed: {}", s),
            Error::EmergencyPeriodNotReached(s) => format!("EmergencyPeriodNotReached: {}", s),
        };
        msg.into_bytes()
    }
}

