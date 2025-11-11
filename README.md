# SecureFlow - Decentralized Escrow & Freelance Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.19-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

## 🚀 Overview

SecureFlow is a comprehensive decentralized platform combining escrow services with a freelance marketplace, built on Arbitrum Stylus (Rust/WASM). Features gasless transactions through MetaMask Smart Accounts, multi-arbiter dispute resolution, and reputation systems.

## ✨ Key Features

### 🏗️ Core Platform

- **Hybrid Escrow + Marketplace**: Direct hires and open job applications
- **Gasless Transactions**: MetaMask Smart Account integration for zero-fee transactions
- **Multi-Arbiter Consensus**: 1-5 arbiters with quorum-based voting
- **Reputation System**: Anti-gaming reputation tracking
- **Native & ERC20 Support**: ETH and whitelisted ERC20 tokens (USDC on Arbitrum)

### 🎯 Advanced Features

- **Milestone Management**: Submit, approve, reject, dispute milestones
- **Job Applications**: Freelancers apply to open jobs
- **Dispute Resolution**: Time-limited dispute windows with arbiter consensus
- **Real-time Notifications**: In-app notification system
- **Client Feedback**: Rejection reasons and improvement suggestions

### 🛡️ Security & Trust

- **Smart Account Integration**: Delegated execution for gasless transactions
- **Paymaster Contract**: Gas sponsorship for seamless UX
- **Reentrancy Protection**: All external functions protected
- **Input Validation**: Comprehensive parameter checking
- **Emergency Controls**: Admin pause and refund mechanisms

## 📁 Project Structure

```
├── contracts/
│   ├── SecureFlow.sol          # Main escrow & marketplace contract
│   └── Paymaster.sol           # Gas sponsorship contract
├── frontend/                   # Next.js application
│   ├── app/                    # App router pages
│   ├── components/             # UI components
│   └── contexts/               # React contexts
├── scripts/
│   ├── deploy.js               # Contract deployment
│   └── deploy-paymaster.js     # Paymaster deployment
└── test/
    └── SecureFlow.test.js      # Test suite
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet
- Base testnet access

### Installation

1. **Clone and install dependencies**

```bash
git clone https://github.com/your-org/secureflow.git
cd secureflow
npm install
cd frontend
npm install
```

2. **Environment setup**

```bash
# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Configure your environment variables
```

3. **Deploy contracts**

```bash
# Deploy to Base testnet
npx hardhat run scripts/deploy.js --network baseTestnet

# Deploy to Base mainnet (requires funding)
npx hardhat run scripts/deploy-minimal.js --network base
```

4. **Start frontend**

```bash
cd frontend
npm run dev
```

## 🎯 User Workflows

### For Clients

1. **Create Escrow** → Set project details, milestones, budget
2. **Manage Projects** → Review submissions, approve/reject milestones
3. **Provide Feedback** → Give rejection reasons for improvements

### For Freelancers

1. **Browse Jobs** → View open listings, apply with proposals
2. **Work Management** → Submit milestones, address feedback
3. **Resubmit** → Improve rejected milestones with updates

### For Arbiters

1. **Dispute Resolution** → Review cases, vote on resolutions
2. **Maintain Integrity** → Help resolve platform disputes

## 🧪 Testing

```bash
# Run smart contract tests
npm test

# Run frontend tests
cd frontend
npm test
```

**Test Coverage**: 26+ tests covering deployment, escrow creation, marketplace functions, work lifecycle, reputation system, and security.

## 🚀 Deployment

### Smart Contracts

```bash
# Deploy to Base testnet
npx hardhat run scripts/deploy.js --network baseTestnet

# Deploy to Base mainnet (requires funding)
npx hardhat run scripts/deploy-minimal.js --network base
```

### Frontend (Vercel)

```bash
# Build for production
cd frontend
npm run build

# Deploy to Vercel
vercel --prod
```

## 📊 Current Deployment

### Arbitrum Sepolia Testnet (Active) ✅

- **SecureFlow Stylus Contract**: `0x7e7b5dbae3adb3d94a27dcfb383bdb98667145e6`
- **MockERC20 Token**: `0x7659C2E485D3E29dBC36f7E11de9E633ED1FDa06`
- **Network**: Arbitrum Sepolia Testnet (Chain ID: 421614)
- **Explorer**: https://sepolia.arbiscan.io/address/0x7e7b5dbae3adb3d94a27dcfb383bdb98667145e6
- **Status**: ✅ Production Ready
- **Contract Size**: 23.6 KiB
- **Technology**: Arbitrum Stylus (Rust/WASM)

## 🔧 Configuration

### Smart Contract Settings

```solidity
// Platform fees (0% for demo)
uint256 public platformFeePercentage = 0;

// Arbiter management
function authorizeArbiter(address arbiter) external onlyOwner
function revokeArbiter(address arbiter) external onlyOwner
```

### Frontend Configuration

```typescript
// Contract addresses (Arbitrum Sepolia Testnet)
export const CONTRACTS = {
  SECUREFLOW_ESCROW_TESTNET: "0x7e7b5dbae3adb3d94a27dcfb383bdb98667145e6",
  SECUREFLOW_ESCROW_MAINNET: "TBD", // Pending Arbitrum One mainnet deployment
  MOCK_TOKEN_TESTNET: "0x7659C2E485D3E29dBC36f7E11de9E633ED1FDa06",
  USDC_ARBITRUM_MAINNET: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};
```

## 🔄 Gasless Transaction Flow

1. **User connects MetaMask** → Smart Account initializes
2. **Transaction request** → Delegation system activates
3. **Gasless execution** → Paymaster sponsors gas fees
4. **Blockchain confirmation** → Transaction completed

## 🛡️ Security Features

- **Reentrancy Protection**: All external functions protected
- **Input Validation**: Comprehensive parameter checking
- **Access Control**: Role-based permissions
- **Emergency Pause**: Admin-controlled pause functionality
- **Gas Optimization**: Efficient contract design

## 📈 Roadmap

### Phase 1: Core Platform ✅

- [x] Smart contract development
- [x] Frontend application
- [x] Basic escrow functionality
- [x] Job marketplace

### Phase 2: Advanced Features ✅

- [x] Gasless transactions
- [x] Smart Account integration
- [x] Dispute resolution
- [x] Reputation system

### Phase 3: Optimization

- [ ] Mobile application
- [ ] Advanced analytics
- [ ] Multi-chain support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **GitHub Issues**: [Report bugs](https://github.com/your-org/secureflow/issues)
- **Documentation**: See project docs for detailed guides

---

**Built with ❤️ for the decentralized future of work**

_SecureFlow - Where trust meets technology_
