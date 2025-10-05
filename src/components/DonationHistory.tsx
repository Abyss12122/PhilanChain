import React from 'react';
import { ethers } from 'ethers';

// Define the shape of a single donation event
export interface DonationEvent {
  donor: string;
  amount: bigint;
  txHash: string;
}

interface DonationHistoryProps {
  donations: DonationEvent[];
}

const DonationHistory: React.FC<DonationHistoryProps> = ({ donations }) => {
  // Function to shorten a wallet address
  const shortenAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Donations</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {donations.length > 0 ? (
          donations.map((donation, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center shadow-sm">
              <div>
                <p className="font-mono text-sm text-gray-700">{shortenAddress(donation.donor)}</p>
                <p className="font-bold text-indigo-600">{ethers.formatEther(donation.amount)} ETH</p>
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${donation.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:text-indigo-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No donations yet.</p>
        )}
      </div>
    </div>
  );
};

export default DonationHistory;
