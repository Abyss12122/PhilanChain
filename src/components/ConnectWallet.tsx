import React from 'react';

// Define props for the component
interface ConnectWalletProps {
  connect: () => Promise<void>;
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({ connect }) => {
  return (
    <button
      onClick={connect}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Connect Wallet
    </button>
  );
};

export default ConnectWallet;