# PhilanChain: A Decentralized Crowdfunding dApp

A fully decentralized, transparent, and secure crowdfunding platform built on the Ethereum blockchain. PhilanChain leverages smart contracts to solve the "trust gap" in traditional charity, giving donors full control and transparency over how their contributions are used.

> [🌐 Live Demo](#) <!-- TODO: Add your live Vercel/Netlify deployment link -->

---

## 🚩 The Problem It Solves

Traditional charity platforms often lack transparency. Donors contribute funds with little to no visibility or control over how their money is spent, leading to a "trust gap" that can discourage contributions.

**PhilanChain** addresses this by putting the power back in the hands of the donors. Every donation, vote, and fund withdrawal is an immutable transaction on the blockchain, publicly verifiable by anyone.

---

## ✨ Key Features

- **Milestone-Based Fund Release**  
  Funds are locked in the smart contract and released only when project milestones are approved. This ensures responsible use of donations.

- **Decentralized Donor Voting**  
  Donors vote to approve or reject milestone withdrawal requests. Voting power is weighted by donation amount, ensuring fairness.

- **Campaign Updates**  
  Beneficiaries can post real-time updates, keeping donors informed and engaged.

- **Complete Transparency**  
  Every donation and transaction is recorded on the blockchain and can be verified on [Etherscan](https://etherscan.io/).

- **Secure & Immutable**  
  Built on Solidity smart contracts — campaign rules can't be changed after deployment.

- **Automatic Refunds**  
  If the fundraising goal isn't met by the deadline, donors can withdraw their contributions directly from the contract.

---

## 🛠️ Built With

- **Smart Contract:** Solidity
- **Blockchain:** Ethereum (Sepolia Testnet)
- **Frontend:** React, TypeScript
- **Blockchain Interaction:** Ethers.js
- **Styling:** Tailwind CSS
- **Wallet Integration:** MetaMask
- **Development Environment:** Remix IDE

---

## 🚀 Getting Started

Follow these steps to run PhilanChain locally:

### Prerequisites

- [Node.js & npm](https://nodejs.org/)
- [MetaMask Extension](https://metamask.io/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abyss12122/PhilanChain
   cd PhilanChain
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Deploy the Smart Contract:**
   - Deploy `Crowdfunding.sol` to the Sepolia testnet using [Remix IDE](https://remix.ethereum.org/).
   - Copy the deployed contract address and paste it into the `contractAddress` variable in `src/App.tsx`.
   - Copy the contract's ABI and paste it into `src/contractInfo.json`.

4. **Start the app:**
   ```bash
   npm start
   ```

---

## 💡 How to Use the dApp

1. **Install MetaMask:**  
   Ensure the MetaMask browser extension is installed.

2. **Switch to Sepolia Testnet:**  
   Open MetaMask and change the network to "Sepolia Test Network".

3. **Get Free Test ETH:**  
   Acquire test Ether from [sepoliafaucet.com](https://sepoliafaucet.com/).

4. **Connect & Donate:**  
   Visit the live demo, connect your wallet, and start making a difference!

---

