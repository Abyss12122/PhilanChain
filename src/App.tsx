import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import ProgressBar from './components/ProgressBar';
import DonationForm from './components/DonationForm';
import DonationHistory, { DonationEvent } from './components/DonationHistory';
import MilestoneManager from './components/MilestoneManager';
import CampaignUpdates from './components/CampaignUpdates';
import contractAbi from './contractInfo.json';

// TODO: Replace with your deployed contract address
const contractAddress = "0x763Bc23252879D3EC7a58fd9288186eA718CeFBe";

function App() {
  // Wallet & Contract State
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'updates'>('overview');

  // Contract Data State
  const [fundraisingGoal, setFundraisingGoal] = useState<bigint>(0n);
  const [totalDonations, setTotalDonations] = useState<bigint>(0n);
  const [donationHistory, setDonationHistory] = useState<DonationEvent[]>([]);
  const [donationAmount, setDonationAmount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [userDonation, setUserDonation] = useState<bigint>(0n);
  const [deadline, setDeadline] = useState<bigint>(0n);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Disconnect wallet and reset all state
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setContract(null);
    setFundraisingGoal(0n);
    setTotalDonations(0n);
    setDonationHistory([]);
    setError(null);
    setIsOwner(false);
    setUserDonation(0n);
    setDeadline(0n);
    setTimeRemaining(0);
    setActiveTab('overview');
  }, []);

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to use this dApp.");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const connectedContract = new ethers.Contract(contractAddress, contractAbi, signer);
      
      setAccount(accounts[0]);
      setContract(connectedContract);
      
      // Check if user is owner
      const owner = await connectedContract.owner();
      setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
      
      // Get user's donation amount
      const donation = await connectedContract.donations(accounts[0]);
      setUserDonation(donation);
      
      // Get deadline
      const contractDeadline = await connectedContract.deadline();
      setDeadline(contractDeadline);
      
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle donation
  const handleDonate = async (amount: string) => {
    if (!contract || !amount) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const amountInWei = ethers.parseEther(amount);
      const tx = await contract.donate({ value: amountInWei });
      await tx.wait();
      setDonationAmount('');
      
      // Update user donation
      if (account) {
        const donation = await contract.donations(account);
        setUserDonation(donation);
      }
      
      // Show success message
      setError(null);
    } catch (err: any) {
      console.error("Donation failed:", err);
      
      // Handle different error types
      if (err.code === 'ACTION_REJECTED') {
        setError("Transaction was rejected by user.");
      } else if (err.message?.includes('FundraisingClosed')) {
        setError("Fundraising period has ended.");
      } else if (err.message?.includes('InvalidDonationAmount')) {
        setError("Donation amount must be greater than 0.");
      } else {
        setError(err.reason || err.message || "Donation failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // MetaMask account and network change detection
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet();
      } else if (account && accounts[0].toLowerCase() !== account.toLowerCase()) {
        // User switched accounts - reconnect with new account
        console.log('Account changed, reconnecting...');
        disconnectWallet();
        // Small delay before reconnecting
        setTimeout(() => connectWallet(), 100);
      }
    };

    const handleChainChanged = () => {
      // Reload page when network changes (recommended by MetaMask)
      console.log('Network changed, reloading...');
      window.location.reload();
    };

    const handleDisconnect = () => {
      console.log('Wallet disconnected');
      disconnectWallet();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    // Cleanup listeners
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [account, connectWallet, disconnectWallet]);

  // Fetch contract data and listen to events
  useEffect(() => {
    const fetchContractData = async () => {
      if (contract) {
        setIsLoading(true);
        try {
          const goal = await contract.fundraisingGoal();
          const donations = await contract.totalDonations();
          setFundraisingGoal(goal);
          setTotalDonations(donations);

          const donationFilter = contract.filters.DonationReceived();
          const pastDonations = await contract.queryFilter(donationFilter);
          const history = pastDonations.map((event: any) => ({
              donor: event.args.donor,
              amount: event.args.amount,
              txHash: event.transactionHash
          })).reverse();
          setDonationHistory(history);

        } catch (err) {
           console.error("Could not fetch contract data:", err);
           setError("Failed to fetch data. Are you on the correct network?");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchContractData();

    // Event listener for new donations
    const onNewDonation = (donor: string, amount: bigint, event: any) => {
        console.log('New donation received:', donor, ethers.formatEther(amount));
        
        setTotalDonations(prevTotal => prevTotal + amount);
        const newDonation: DonationEvent = {
            donor,
            amount,
            txHash: event.log.transactionHash,
        };
        setDonationHistory(prevHistory => [newDonation, ...prevHistory]);
        
        // Update user donation if it's the current user
        if (account && donor.toLowerCase() === account.toLowerCase()) {
          setUserDonation(prev => prev + amount);
        }
    };

    if (contract) {
        const filter = contract.filters.DonationReceived();
        contract.on(filter, onNewDonation);
        
        // Return cleanup function
        return () => {
          contract.off(filter, onNewDonation);
        };
    }
  }, [contract, account]);

  // Update time remaining countdown
  useEffect(() => {
    if (deadline === 0n) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(deadline) - now;
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Campaign Ended";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <div className="w-full max-w-4xl mx-auto relative">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10 space-y-8">
        
          {/* Header */}
          <header className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl shadow-lg mb-4 transform transition-transform hover:scale-110">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-purple-100 to-violet-200 bg-clip-text text-transparent drop-shadow-lg">
              PhilanChain
            </h1>
            <p className="text-white/90 text-lg font-medium tracking-wide">
              Transparent fundraising on the blockchain
            </p>
            
            {/* Time Remaining Badge */}
            {account && timeRemaining >= 0 && (
              <div className="inline-block bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                <p className="text-white/90 text-sm font-semibold flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatTimeRemaining(timeRemaining)}</span>
                </p>
              </div>
            )}
          </header>

          {account ? (
            <>
              {/* Connected Wallet Info */}
              <div className="relative">
                <div className="flex flex-wrap justify-between items-center gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Connected</p>
                      <p className="font-mono text-sm font-bold text-white">{`${account.substring(0, 8)}...${account.substring(account.length - 6)}`}</p>
                    </div>
                    {isOwner && (
                      <span className="bg-amber-500/30 text-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                        Campaign Owner
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={disconnectWallet} 
                    className="bg-red-500/90 hover:bg-red-600 text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50 hover:scale-105 active:scale-95"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-2 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'overview'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'milestones'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Milestones
                </button>
                <button
                  onClick={() => setActiveTab('updates')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'updates'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Updates
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <>
                  <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg">
                      <h2 className="text-2xl font-bold text-white text-center mb-4">Campaign Progress</h2>
                      
                      <div className="text-center mb-6">
                        <div className="inline-flex items-baseline space-x-2">
                          <span className="text-5xl font-extrabold bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                            {ethers.formatEther(totalDonations)}
                          </span>
                          <span className="text-2xl font-bold text-white/80">ETH</span>
                        </div>
                        <p className="text-white/70 mt-2 text-lg">
                          of <span className="font-bold text-white">{ethers.formatEther(fundraisingGoal)} ETH</span> goal
                        </p>
                      </div>
                      
                      <ProgressBar goal={fundraisingGoal} donations={totalDonations} />
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Donors</p>
                          <p className="text-2xl font-bold text-white">{donationHistory.length}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Progress</p>
                          <p className="text-2xl font-bold text-white">
                            {fundraisingGoal > 0n ? Math.round(Number(totalDonations * 100n / fundraisingGoal)) : 0}%
                          </p>
                        </div>
                      </div>
                      
                      {/* User's Contribution */}
                      {userDonation > 0n && (
                        <div className="mt-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Your Contribution</p>
                          <p className="text-xl font-bold text-white">{ethers.formatEther(userDonation)} ETH</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <DonationForm 
                    donate={handleDonate}
                    amount={donationAmount}
                    setAmount={setDonationAmount}
                    isLoading={isLoading}
                  />

                  <DonationHistory donations={donationHistory} />
                </>
              )}

              {activeTab === 'milestones' && (
                <MilestoneManager 
                  contract={contract}
                  account={account}
                  isOwner={isOwner}
                  userDonation={userDonation}
                />
              )}

              {activeTab === 'updates' && (
                <CampaignUpdates 
                  contract={contract}
                  isOwner={isOwner}
                />
              )}
            </>
          ) : (
            <>
              {/* Disconnected State */}
              <div className="text-center pt-6 space-y-6">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
                  <p className="text-white/80 text-lg mb-6 leading-relaxed">
                    Connect your wallet to start making a difference in the world
                  </p>
                  
                  <button 
                    onClick={connectWallet} 
                    disabled={isLoading} 
                    className="group relative w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 ease-out disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95 disabled:transform-none"
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-3">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span>Connect Wallet</span>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </button>
                </div>
                
                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">Secure</h3>
                    <p className="text-white/60 text-xs">Blockchain secured</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">Transparent</h3>
                    <p className="text-white/60 text-xs">Every transaction tracked</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">Instant</h3>
                    <p className="text-white/60 text-xs">Real-time donations</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-4 animate-pulse">
              <p className="text-center text-red-200 text-sm font-semibold flex items-center justify-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </p>
            </div>
          )}

        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default App;
