**PhilanChain: A Decentralized Crowdfunding dApp**
A fully decentralized, transparent, and secure crowdfunding platform built on the Ethereum blockchain. PhilanChain leverages smart contracts to solve the "trust gap" in traditional charity, giving donors direct control and oversight over their contributions through a milestone-based fund release and voting system.

[Live Demo Link Here] <!-- TODO: Add your live Vercel/Netlify deployment link -->


**The Problem It Solves**
Traditional charity platforms often lack transparency. Donors contribute funds with little to no visibility or control over how their money is spent, leading to a "trust gap" that can discourage contributions. Funds can be mismanaged, and administrative costs can be opaque.

PhilanChain addresses this by putting the power back in the hands of the donors. Every donation, vote, and fund withdrawal is an immutable transaction on the blockchain, publicly verifiable by anyone.

**Key Features**
This dApp goes beyond simple donation tracking by implementing a full decentralized governance model:

Milestone-Based Fund Release: Instead of releasing all funds at once, the campaign owner must create "milestones" for specific project goals. Funds are locked in the smart contract and can only be withdrawn for approved milestones.

Decentralized Donor Voting: Donors vote on whether to approve or reject a milestone withdrawal request. The voting power is weighted by the amount donated, ensuring that those who have contributed the most have the biggest say.

Campaign Updates: Beneficiaries can post real-time updates on their progress, providing donors with the information they need to make informed voting decisions.

Complete Transparency: Every donation and transaction is recorded on the blockchain and can be verified on a block explorer like Etherscan.

Secure & Immutable: Built on a Solidity smart contract, ensuring that the rules of the campaign cannot be changed once deployed.

Automatic Refunds: If the fundraising goal is not met by the deadline, donors can securely withdraw their contributions directly from the smart contract.

**Built With**
This project showcases a modern full-stack Web3 development approach:

Smart Contract: Solidity

Blockchain: Ethereum (Sepolia Testnet)

Frontend: React, TypeScript

Blockchain Interaction: Ethers.js

Styling: Tailwind CSS

Wallet Integration: MetaMask

Development Environment: Remix IDE for smart contract development

**Getting Started**
To get a local copy up and running, follow these simple steps.

**Prerequisites**
You need to have npm (which comes with Node.js) and MetaMask installed in your browser.

Node.js & npm

MetaMask Extension

**Installation**
Clone the repository:

git clone https://github.com/Abyss12122/PhilanChain

Navigate to the project directory:

cd PhilanChain

Install NPM packages:

npm install

Set up the Smart Contract:

Deploy the Crowdfunding.sol contract to the Sepolia testnet using Remix IDE.

Copy the deployed contract address and paste it into the contractAddress variable in src/App.tsx.

Copy the contract's ABI from Remix and paste it into src/contractInfo.json.

Run the application:

npm start

How to Use the dApp
To interact with the live dApp, you'll need to configure your MetaMask wallet for the Sepolia testnet.

Install MetaMask: Make sure you have the MetaMask browser extension installed.

Switch to Sepolia: Open MetaMask and change the network from "Ethereum Mainnet" to "Sepolia Test Network".

Get Free Test ETH: You'll need some test Ether to donate. You can get it for free from a public faucet like sepoliafaucet.com.

Connect & Donate: Visit the live demo link, connect your wallet, and start making a difference!

