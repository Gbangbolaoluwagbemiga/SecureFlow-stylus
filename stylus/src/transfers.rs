//! Token transfer functions for SecureFlow

extern crate alloc;
use alloc::{vec::Vec, string::String};

use stylus_sdk::{
    call::{self, Call},
    contract,
};
use alloy_primitives::{Address, U256};
use crate::storage::SecureFlow;
use crate::errors::Error;

impl SecureFlow {
    pub fn transfer_out(&mut self, token: Address, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        if token == Address::ZERO {
            // Native transfer
            call::transfer_eth(to, amount)?;
        } else {
            // ERC20 transfer
            // Note: This is a simplified implementation
            // In production, consider using stylus_sdk::erc20::Erc20Token
            let transfer_selector = [0xa9u8, 0x05u8, 0x9cu8, 0xbbu8];
            let mut calldata = Vec::new();
            calldata.extend_from_slice(&transfer_selector);
            calldata.extend_from_slice(&[0u8; 1]); // padding
            calldata.extend_from_slice(to.as_slice());
            calldata.extend_from_slice(&amount.to_be_bytes::<32>());
            call::call(Call::new(), token, &calldata)?;
        }
        Ok(())
    }

    pub fn transfer_in(&mut self, token: Address, from: Address, amount: U256) -> Result<(), Vec<u8>> {
        if token == Address::ZERO {
            // Native already received
            return Ok(());
        }
        // ERC20 transferFrom
        let transfer_from_selector = [0x23u8, 0xb8u8, 0x72u8, 0xddu8];
        let mut calldata = Vec::new();
        calldata.extend_from_slice(&transfer_from_selector);
        calldata.extend_from_slice(from.as_slice());
        calldata.extend_from_slice(contract::address().as_slice());
        calldata.extend_from_slice(&amount.to_be_bytes::<32>());
        match call::call(Call::new(), token, &calldata) {
            Ok(_) => Ok(()),
            Err(_) => {
                // Token transfer failed - likely insufficient balance or allowance
                Err(Error::InvalidAmount(String::new()).into())
            }
        }
    }
}

