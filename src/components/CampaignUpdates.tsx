import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Update {
  id: number;
  title: string;
  contentHash: string;
  timestamp: bigint;
}

interface CampaignUpdatesProps {
  contract: ethers.Contract | null;
  isOwner: boolean;
}

const CampaignUpdates: React.FC<CampaignUpdatesProps> = ({ contract, isOwner }) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUpdate, setNewUpdate] = useState({ title: '', content: '' });

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!contract) return;
      
      try {
        const count = await contract.getUpdateCount();
        const updatesData: Update[] = [];
        
        for (let i = 0; i < count; i++) {
          const update = await contract.updates(i);
          updatesData.push({
            id: i,
            title: update.title,
            contentHash: update.contentHash,
            timestamp: update.timestamp
          });
        }
        
        setUpdates(updatesData.reverse()); // Show newest first
      } catch (err) {
        console.error('Error fetching updates:', err);
      }
    };

    fetchUpdates();
    
    if (contract) {
      const filter = contract.filters.CampaignUpdatePosted();
      contract.on(filter, () => fetchUpdates());
      
      return () => {
        contract.off(filter, () => fetchUpdates());
      };
    }
  }, [contract]);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For simplicity, store content directly. In production, upload to IPFS first
      const contentHash = newUpdate.content; // Replace with IPFS hash in production
      const tx = await contract.postUpdate(newUpdate.title, contentHash);
      await tx.wait();
      
      setNewUpdate({ title: '', content: '' });
    } catch (err: any) {
      console.error('Error posting update:', err);
      setError(err.reason || 'Failed to post update');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span>Campaign Updates</span>
        </h2>
        <p className="text-white/70">Stay informed about project progress</p>
      </div>

      {/* Post Update Form (Owner Only) */}
      {isOwner && (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Post New Update</h3>
          <form onSubmit={handlePostUpdate} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Update Title
              </label>
              <input
                type="text"
                value={newUpdate.title}
                onChange={(e) => setNewUpdate({...newUpdate, title: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="E.g., Prototype Development Complete!"
                required
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Content
              </label>
              <textarea
                value={newUpdate.content}
                onChange={(e) => setNewUpdate({...newUpdate, content: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                placeholder="Share progress, achievements, or important news..."
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:from-slate-400 disabled:to-slate-500 shadow-lg hover:shadow-blue-500/50"
            >
              {isLoading ? 'Posting...' : 'Post Update'}
            </button>
          </form>
        </div>
      )}

      {/* Updates Timeline */}
      <div className="space-y-4">
        {updates.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 text-center">
            <svg className="w-16 h-16 text-white/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-white/60">No updates posted yet</p>
          </div>
        ) : (
          updates.map((update, index) => (
            <div key={update.id} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 relative">
              {/* Timeline dot */}
              {index !== updates.length - 1 && (
                <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-transparent" />
              )}
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg relative z-10">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-bold text-white">{update.title}</h4>
                    <span className="text-xs text-white/60 ml-4 flex-shrink-0">
                      {new Date(Number(update.timestamp) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                    {update.contentHash}
                  </p>
                </div>
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

export default CampaignUpdates;
