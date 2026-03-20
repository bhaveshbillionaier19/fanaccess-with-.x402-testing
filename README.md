# Fan Access Overview

## What This Platform Does

Fan Access is a pay-to-view NFT platform built on Base Sepolia.

Creators mint NFTs on-chain, and viewers must pay before they can see the gated content. The NFT proves ownership on-chain, while the backend controls who is allowed to view the premium content.

## Core Idea

The system has two parts:

1. **On-chain NFT**
   - The NFT is minted on the `NFTDonation` contract on Base Sepolia.
   - The contract stores the `tokenURI`, which points to metadata on IPFS/Pinata.
   - This is the public NFT layer.

2. **Off-chain Access Control**
   - The backend stores the paywall listing in PostgreSQL.
   - The backend verifies payment transactions.
   - Only after verified payment does the backend return the protected content for that NFT.

## How Minting Works

When a creator mints an NFT:

1. The creator uploads the image and metadata.
2. The frontend uploads the NFT metadata to Pinata/IPFS.
3. The NFT is minted on the smart contract.
4. After the mint transaction is confirmed, the frontend calls the backend `register-mint` API.
5. The backend verifies the mint transaction on Base Sepolia.
6. The backend extracts the real `tokenId` from the transaction receipt.
7. The backend stores the NFT listing in PostgreSQL.

This means new NFTs are supposed to register automatically in the database after a successful mint.

## What Is Stored Where

### On-chain / Pinata
- NFT token
- token ID
- metadata URI
- public preview image

### PostgreSQL
- NFT title
- NFT description
- creator wallet
- unlock price
- payment records
- access records
- protected content reference

## How Viewing Works

When a fan visits the platform:

1. The frontend reads NFTs from the contract.
2. The frontend fetches listing data from the backend database.
3. The card is shown with preview content.
4. If the user has not paid, the content remains locked.
5. The user clicks `Unlock`.
6. The frontend creates a payment session through the backend.
7. The user sends the payment on Base Sepolia.
8. The backend verifies the payment transaction:
   - transaction exists
   - sender matches wallet
   - payment amount is sufficient
   - `txHash` was not reused
9. The backend stores the payment and grants access.
10. The frontend fetches the protected NFT content and reveals it.

## Current Demo Behavior

The current demo uses a simple visual gating model:

- the creator uploads one image during mint
- the platform shows that image blurred before payment
- after payment is verified, the same image is shown clearly

This is a demo-friendly flow because the user only uploads one asset.

## URL-Based Protected Content Flow

The more complete production pattern is:

1. Show a public preview image before payment
2. Save a protected content URL during minting
3. Return that protected URL only after payment is approved

In that model, the creator provides a premium content URL at mint time, and the backend reveals that URL only after successful payment verification.

Examples of protected content:
- full-resolution image
- private Drive file
- premium download link
- hidden creator page
- private video or audio file

## Actual Work We Are Doing

The platform is performing these jobs:

1. Mint NFT on Base Sepolia
2. Register that NFT in PostgreSQL automatically
3. Create a paywall listing for the NFT
4. Accept an unlock payment from a viewer
5. Verify the payment on-chain through the backend
6. Store payment and access state in PostgreSQL
7. Reveal the premium content only after payment approval

## Why The Backend Is Required

The frontend cannot be trusted for payment verification.

The backend is responsible for:
- checking the real transaction on Base Sepolia
- preventing duplicate `txHash` reuse
- storing the payment permanently
- granting access only after verification

Without the backend, users could bypass the paywall logic.

## Final Summary

Fan Access combines:
- **NFT minting on Base**
- **metadata on Pinata/IPFS**
- **payment verification with x402-style paywall flow**
- **PostgreSQL storage for listings, payments, and access**

The result is a fan NFT platform where creators publish NFTs and viewers unlock content only after a verified on-chain payment.

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
