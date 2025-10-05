import React from 'react';

interface ProgressBarProps {
  goal: bigint;
  donations: bigint;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ goal, donations }) => {
  // Calculate the percentage
  let percentage = 0;
  if (goal > 0n) {
    const calculatedPercentage = Number((donations * 100n) / goal);
    // Cap the percentage at 100 for display purposes
    percentage = Math.min(100, calculatedPercentage);
  }
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-4 my-4">
      <div
        className="bg-green-500 h-4 rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
      <p className="text-sm text-center mt-1">{percentage}% funded</p>
    </div>
  );
};

export default ProgressBar;