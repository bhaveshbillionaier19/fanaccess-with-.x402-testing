# Fan Funding Platform on Base

A decentralized fan funding platform built on Base where creators can mint NFTs and receive direct funding from their supporters.

## 🚀 Deployed Contract

- **Network**: Base Sepolia
- **Contract Address**: *(to be updated after deployment)*
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org/

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, RainbowKit
- **Smart Contracts**: Solidity 0.8.20, Hardhat
- **Blockchain**: Base Sepolia
- **Storage**: IPFS via Pinata

## 📦 Installation

```bash
npm install --legacy-peer-deps
```

## 🔧 Development

```bash
npm run dev
```

## 🌐 Deployment

The app is deployed on Vercel. Environment variables needed:
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_NETWORK`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_PINATA_JWT`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
