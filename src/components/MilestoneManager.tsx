import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Milestone {
  id: number;
  description: string;
  fundAmount: bigint;
  voteDeadline: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  approved: boolean;
  fundsReleased: boolean;
  votingActive: boolean;
}

interface MilestoneManagerProps {
  contract: ethers.Contract | null;
  account: string | null;
  isOwner: boolean;
  userDonation: bigint;
}

const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  contract,
  account,
  isOwner,
  userDonation
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for creating milestone
  const [newMilestone, setNewMilestone] = useState({
    description: '',
    fundAmount: '',
    votingDays: '7'
  });

  // Fetch milestones
  useEffect(() => {
    const fetchMilestones = async () => {
      if (!contract) return;
      
      try {
        const count = await contract.getMilestoneCount();
        const milestonesData: Milestone[] = [];
        
        for (let i = 0; i < count; i++) {
          const m = await contract.getMilestone(i);
          milestonesData.push({
            id: i,
            description: m.description,
            fundAmount: m.fundAmount,
            voteDeadline: m.voteDeadline,
            yesVotes: m.yesVotes,
            noVotes: m.noVotes,
            approved: m.approved,
            fundsReleased: m.fundsReleased,
            votingActive: m.votingActive
          });
        }
        
        setMilestones(milestonesData);
      } catch (err) {
        console.error('Error fetching milestones:', err);
      }
    };

    fetchMilestones();
    
    // Listen for new milestones
    if (contract) {
      const filter = contract.filters.MilestoneCreated();
      contract.on(filter, () => fetchMilestones());
      
      return () => {
        contract.off(filter, () => fetchMilestones());
      };
    }
  }, [contract]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const amountInWei = ethers.parseEther(newMilestone.fundAmount);
      const tx = await contract.createMilestone(
        newMilestone.description,
        amountInWei,
        parseInt(newMilestone.votingDays)
      );
      await tx.wait();
      
      setNewMilestone({ description: '', fundAmount: '', votingDays: '7' });
    } catch (err: any) {
      console.error('Error creating milestone:', err);
      setError(err.reason || 'Failed to create milestone');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (milestoneId: number, approve: boolean) => {
    if (!contract) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.voteOnMilestone(milestoneId, approve);
      await tx.wait();
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.reason || 'Failed to vote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async (milestoneId: number) => {
    if (!contract) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.finalizeMilestoneVote(milestoneId);
      await tx.wait();
    } catch (err: any) {
      console.error('Error finalizing:', err);
      setError(err.reason || 'Failed to finalize');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseFunds = async (milestoneId: number) => {
    if (!contract) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tx = await contract.releaseMilestoneFunds(milestoneId);
      await tx.wait();
    } catch (err: any) {
      console.error('Error releasing funds:', err);
      setError(err.reason || 'Failed to release funds');
    } finally {
      setIsLoading(false);
    }
  };

  const getVotePercentage = (milestone: Milestone) => {
    const total = milestone.yesVotes + milestone.noVotes;
    if (total === 0n) return 0;
    return Number((milestone.yesVotes * 100n) / total);
  };

  const isVotingExpired = (deadline: bigint) => {
    return BigInt(Math.floor(Date.now() / 1000)) > deadline;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span>Project Milestones</span>
        </h2>
        <p className="text-white/70">Vote on project milestones to release funds</p>
      </div>

      {/* Create Milestone Form (Owner Only) */}
      {isOwner && (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Create New Milestone</h3>
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Milestone Description
              </label>
              <input
                type="text"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="E.g., Complete prototype development"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">
                  Fund Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newMilestone.fundAmount}
                  onChange={(e) => setNewMilestone({...newMilestone, fundAmount: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">
                  Voting Period (Days)
                </label>
                <input
                  type="number"
                  value={newMilestone.votingDays}
                  onChange={(e) => setNewMilestone({...newMilestone, votingDays: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="1"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:from-slate-400 disabled:to-slate-500 shadow-lg hover:shadow-emerald-500/50"
            >
              {isLoading ? 'Creating...' : 'Create Milestone'}
            </button>
          </form>
        </div>
      )}

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 text-center">
            <p className="text-white/60">No milestones created yet</p>
          </div>
        ) : (
          milestones.map((milestone) => (
            <div key={milestone.id} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-4">
              {/* Milestone Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-purple-500/30 text-purple-200 text-xs font-bold px-3 py-1 rounded-full">
                      Milestone #{milestone.id + 1}
                    </span>
                    {milestone.approved && !milestone.fundsReleased && (
                      <span className="bg-green-500/30 text-green-200 text-xs font-bold px-3 py-1 rounded-full">
                        ✓ Approved
                      </span>
                    )}
                    {milestone.fundsReleased && (
                      <span className="bg-blue-500/30 text-blue-200 text-xs font-bold px-3 py-1 rounded-full">
                        💰 Funds Released
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{milestone.description}</h4>
                  <p className="text-2xl font-bold text-purple-200">
                    {ethers.formatEther(milestone.fundAmount)} ETH
                  </p>
                </div>
              </div>

              {/* Voting Progress */}
              {milestone.votingActive && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Voting Progress</span>
                    <span>{getVotePercentage(milestone)}% Yes</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                      style={{ width: `${getVotePercentage(milestone)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs">Yes Votes</p>
                      <p className="text-emerald-300 font-bold">{ethers.formatEther(milestone.yesVotes)} ETH</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs">No Votes</p>
                      <p className="text-red-300 font-bold">{ethers.formatEther(milestone.noVotes)} ETH</p>
                    </div>
                  </div>
                  <p className="text-white/60 text-xs">
                    Voting ends: {new Date(Number(milestone.voteDeadline) * 1000).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {milestone.votingActive && !isVotingExpired(milestone.voteDeadline) && userDonation > 0n && (
                  <>
                    <button
                      onClick={() => handleVote(milestone.id, true)}
                      disabled={isLoading}
                      className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 font-bold py-2 px-4 rounded-xl transition-all duration-300"
                    >
                      Vote Yes
                    </button>
                    <button
                      onClick={() => handleVote(milestone.id, false)}
                      disabled={isLoading}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 font-bold py-2 px-4 rounded-xl transition-all duration-300"
                    >
                      Vote No
                    </button>
                  </>
                )}
                
                {milestone.votingActive && isVotingExpired(milestone.voteDeadline) && (
                  <button
                    onClick={() => handleFinalize(milestone.id)}
                    disabled={isLoading}
                    className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-200 font-bold py-2 px-4 rounded-xl transition-all duration-300"
                  >
                    Finalize Voting
                  </button>
                )}
                
                {isOwner && milestone.approved && !milestone.fundsReleased && (
                  <button
                    onClick={() => handleReleaseFunds(milestone.id)}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Release Funds
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-4">
          <p className="text-red-200 text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
};

export default MilestoneManager;
