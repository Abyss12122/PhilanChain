// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
    address public immutable owner;
    uint256 public immutable fundraisingGoal;
    uint256 public totalDonations;
    uint256 public immutable deadline;
    bool public campaignActive;
    
    mapping(address => uint256) public donations;

    // Milestone structure
    struct Milestone {
        string description;
        uint256 fundAmount;
        uint256 voteDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool approved;
        bool fundsReleased;
        bool votingActive;
    }
    
    // Campaign update structure
    struct CampaignUpdate {
        string title;
        string contentHash; // IPFS hash or direct content
        uint256 timestamp;
    }
    
    Milestone[] public milestones;
    CampaignUpdate[] public updates;
    
    // Voting tracking: milestoneId => donor => voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Custom errors
    error UseDonateFunction();
    error NotOwner();
    error FundraisingClosed();
    error InvalidDonationAmount();
    error NoFundsToWithdraw();
    error TransferFailed();
    error RefundNotAvailable();
    error NoDonationToRefund();
    error WithdrawalNotAvailable();
    error InvalidMilestone();
    error InsufficientContractBalance();
    error VotingNotActive();
    error VotingPeriodNotEnded();
    error AlreadyVoted();
    error OnlyDonorsCanVote();
    error MilestoneNotApproved();
    error FundsAlreadyReleased();
    error InvalidMilestoneAmount();
    error EmptyDescription();
    error VotingStillActive();

    // Events
    event DonationReceived(address indexed donor, uint256 amount);
    event FundsWithdrawn(uint256 amount);
    event MilestoneCreated(uint256 indexed milestoneId, string description, uint256 fundAmount);
    event VoteCast(uint256 indexed milestoneId, address indexed voter, bool vote, uint256 weight);
    event MilestoneApproved(uint256 indexed milestoneId);
    event MilestoneRejected(uint256 indexed milestoneId);
    event MilestoneFundsReleased(uint256 indexed milestoneId, uint256 amount);
    event CampaignUpdatePosted(uint256 indexed updateId, string title, uint256 timestamp);
    event RefundIssued(address indexed donor, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyDonor() {
        if (donations[msg.sender] == 0) revert OnlyDonorsCanVote();
        _;
    }

    constructor(uint256 _goal, uint256 _durationDays) {
        require(_goal > 0, "Goal must be > 0");
        require(_durationDays > 0, "Duration must be > 0");
        require(block.timestamp + _durationDays * 1 days > block.timestamp, "Invalid deadline");

        owner = msg.sender;
        fundraisingGoal = _goal;
        deadline = block.timestamp + _durationDays * 1 days;
        campaignActive = true;
    }

    /// @dev Rejects direct ETH transfers to prevent accidental losses
    receive() external payable {
        revert UseDonateFunction();
    }

    /// @dev Allows users to donate ETH to the campaign
    function donate() external payable {
        if (block.timestamp >= deadline) revert FundraisingClosed();
        if (msg.value == 0) revert InvalidDonationAmount();

        donations[msg.sender] += msg.value;
        totalDonations += msg.value;

        emit DonationReceived(msg.sender, msg.value);
    }

    /// @dev Create a new milestone for fund release (only owner)
    /// @param _description Description of the milestone
    /// @param _fundAmount Amount of funds to release for this milestone
    /// @param _votingDurationDays Duration of voting period in days
    function createMilestone(
        string calldata _description,
        uint256 _fundAmount,
        uint256 _votingDurationDays
    ) external onlyOwner {
        if (bytes(_description).length == 0) revert EmptyDescription();
        if (_fundAmount == 0 || _fundAmount > address(this).balance) revert InvalidMilestoneAmount();
        if (_votingDurationDays == 0) revert InvalidMilestone();
        
        milestones.push(Milestone({
            description: _description,
            fundAmount: _fundAmount,
            voteDeadline: block.timestamp + (_votingDurationDays * 1 days),
            yesVotes: 0,
            noVotes: 0,
            approved: false,
            fundsReleased: false,
            votingActive: true
        }));
        
        emit MilestoneCreated(milestones.length - 1, _description, _fundAmount);
    }
    
    /// @dev Vote on a milestone (weighted by donation amount)
    /// @param _milestoneId ID of the milestone to vote on
    /// @param _approve True to approve, false to reject
    function voteOnMilestone(uint256 _milestoneId, bool _approve) external onlyDonor {
        if (_milestoneId >= milestones.length) revert InvalidMilestone();
        
        Milestone storage milestone = milestones[_milestoneId];
        
        if (!milestone.votingActive) revert VotingNotActive();
        if (block.timestamp > milestone.voteDeadline) revert VotingNotActive();
        if (hasVoted[_milestoneId][msg.sender]) revert AlreadyVoted();
        
        uint256 voteWeight = donations[msg.sender];
        hasVoted[_milestoneId][msg.sender] = true;
        
        if (_approve) {
            milestone.yesVotes += voteWeight;
        } else {
            milestone.noVotes += voteWeight;
        }
        
        emit VoteCast(_milestoneId, msg.sender, _approve, voteWeight);
    }
    
    /// @dev Finalize milestone voting after deadline
    /// @param _milestoneId ID of the milestone to finalize
    function finalizeMilestoneVote(uint256 _milestoneId) external {
        if (_milestoneId >= milestones.length) revert InvalidMilestone();
        
        Milestone storage milestone = milestones[_milestoneId];
        
        if (!milestone.votingActive) revert VotingNotActive();
        if (block.timestamp <= milestone.voteDeadline) revert VotingStillActive();
        
        milestone.votingActive = false;
        
        // Require majority approval (> 50% of votes)
        uint256 totalVotes = milestone.yesVotes + milestone.noVotes;
        if (totalVotes > 0 && milestone.yesVotes > milestone.noVotes) {
            milestone.approved = true;
            emit MilestoneApproved(_milestoneId);
        } else {
            emit MilestoneRejected(_milestoneId);
        }
    }
    
    /// @dev Release funds for an approved milestone (only owner)
    /// @param _milestoneId ID of the milestone to release funds for
    function releaseMilestoneFunds(uint256 _milestoneId) external onlyOwner {
        if (_milestoneId >= milestones.length) revert InvalidMilestone();
        
        Milestone storage milestone = milestones[_milestoneId];
        
        if (!milestone.approved) revert MilestoneNotApproved();
        if (milestone.fundsReleased) revert FundsAlreadyReleased();
        if (address(this).balance < milestone.fundAmount) revert InsufficientContractBalance();
        
        milestone.fundsReleased = true;
        
        (bool success, ) = owner.call{value: milestone.fundAmount}("");
        if (!success) revert TransferFailed();
        
        emit MilestoneFundsReleased(_milestoneId, milestone.fundAmount);
    }
    
    /// @dev Post a campaign update (only owner)
    /// @param _title Title of the update
    /// @param _contentHash Content or IPFS hash of the update
    function postUpdate(string calldata _title, string calldata _contentHash) external onlyOwner {
        if (bytes(_title).length == 0) revert EmptyDescription();
        
        updates.push(CampaignUpdate({
            title: _title,
            contentHash: _contentHash,
            timestamp: block.timestamp
        }));
        
        emit CampaignUpdatePosted(updates.length - 1, _title, block.timestamp);
    }

    /// @dev Allows owner to withdraw funds if goal is met or deadline passed
    function withdraw() external onlyOwner {
        if (!(block.timestamp >= deadline || totalDonations >= fundraisingGoal)) {
            revert WithdrawalNotAvailable();
        }

        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFundsToWithdraw();

        (bool success, ) = owner.call{value: balance}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(balance);
    }

    /// @dev Allows donors to refund their contribution if goal isn't met
    function refund() external {
        if (!(block.timestamp >= deadline && totalDonations < fundraisingGoal)) {
            revert RefundNotAvailable();
        }

        uint256 amount = donations[msg.sender];
        if (amount == 0) revert NoDonationToRefund();

        donations[msg.sender] = 0;
        totalDonations -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit RefundIssued(msg.sender, amount);
    }
    
    /// @dev End the campaign (only owner)
    function endCampaign() external onlyOwner {
        campaignActive = false;
    }

    // ============ View Functions ============

    /// @dev Returns progress toward goal as a percentage (0-100)
    /// @return uint256 percentage of goal reached (rounded down)
    function progressPercentage() external view returns (uint256) {
        if (fundraisingGoal == 0) return 0;
        return (totalDonations * 100) / fundraisingGoal;
    }

    /// @dev Returns remaining time in seconds until deadline
    /// @return uint256 remaining time in seconds (0 if deadline passed)
    function timeRemaining() external view returns (uint256) {
        return block.timestamp < deadline ? deadline - block.timestamp : 0;
    }
    
    /// @dev Get total number of milestones
    /// @return uint256 total milestone count
    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }
    
    /// @dev Get total number of updates
    /// @return uint256 total update count
    function getUpdateCount() external view returns (uint256) {
        return updates.length;
    }
    
    /// @dev Get detailed milestone information
    /// @param _milestoneId ID of the milestone
    function getMilestone(uint256 _milestoneId) external view returns (
        string memory description,
        uint256 fundAmount,
        uint256 voteDeadline,
        uint256 yesVotes,
        uint256 noVotes,
        bool approved,
        bool fundsReleased,
        bool votingActive
    ) {
        if (_milestoneId >= milestones.length) revert InvalidMilestone();
        Milestone memory m = milestones[_milestoneId];
        return (
            m.description,
            m.fundAmount,
            m.voteDeadline,
            m.yesVotes,
            m.noVotes,
            m.approved,
            m.fundsReleased,
            m.votingActive
        );
    }
    
    /// @dev Get campaign update details
    /// @param _updateId ID of the update
    function getUpdate(uint256 _updateId) external view returns (
        string memory title,
        string memory contentHash,
        uint256 timestamp
    ) {
        require(_updateId < updates.length, "Invalid update ID");
        CampaignUpdate memory u = updates[_updateId];
        return (u.title, u.contentHash, u.timestamp);
    }
    
    /// @dev Check if an address has voted on a milestone
    /// @param _milestoneId ID of the milestone
    /// @param _voter Address to check
    /// @return bool true if the address has voted
    function hasUserVoted(uint256 _milestoneId, address _voter) external view returns (bool) {
        return hasVoted[_milestoneId][_voter];
    }
    
    /// @dev Get voting progress for a milestone
    /// @param _milestoneId ID of the milestone
    /// @return yesPercentage Percentage of yes votes (0-100)
    function getMilestoneVotePercentage(uint256 _milestoneId) external view returns (uint256 yesPercentage) {
        if (_milestoneId >= milestones.length) revert InvalidMilestone();
        
        Milestone memory m = milestones[_milestoneId];
        uint256 total = m.yesVotes + m.noVotes;
        
        if (total == 0) return 0;
        return (m.yesVotes * 100) / total;
    }
}
