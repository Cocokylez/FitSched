// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FitToken (FIT)
 * @notice ERC-20 reward token for the FitSched fitness app, deployed on Base.
 *
 * ── Tokenomics ────────────────────────────────────────────────────────────────
 *   Total Supply Cap : 10,000,000 FIT
 *   Owner / Team     :  4,000,000 FIT  (40%) — minted to owner at deploy
 *   Rewards Pool     :  6,000,000 FIT  (60%) — minted on-demand by distributor
 *
 * ── Earning (mirrors the app's off-chain logic) ───────────────────────────────
 *   • 1 FIT base per completed + verified workout
 *   • Streak bonus: up to +0.20 FIT (decays with longer streaks)
 *   • Boost (2x): costs 3 FIT, arms a 2x multiplier on next workout
 *   • Verification score < 0.25 → 0 tokens, 0.25–0.55 → half, ≥0.55 → full
 *
 * ── Roles ────────────────────────────────────────────────────────────────────
 *   Owner            : Ownable2Step — must accept transfer (prevents accidents)
 *   Reward Distributor: Hot wallet used by the FitSched backend to mint rewards
 *
 * ── Design Notes ─────────────────────────────────────────────────────────────
 *   • Burnable: users / protocol can reduce supply over time
 *   • Pausable: owner can pause/unpause mintReward() as an emergency stop
 *   • Rewards pool is capped — once exhausted, no more minting
 *   • Distributor can be rotated by owner (e.g., if key is compromised)
 *   • No governance or vesting in v1 — keep it simple and ship
 */
contract FitToken is ERC20, ERC20Burnable, Ownable2Step, Pausable {
    // ── Supply constants ──────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY       = 10_000_000 * 1e18; // 10 million hard cap
    uint256 public constant REWARDS_POOL_CAP =  6_000_000 * 1e18; //  6M — 60% — rewards
    uint256 public constant INITIAL_MINT     =  4_000_000 * 1e18; //  4M — 40% — owner

    // ── State ─────────────────────────────────────────────────────────────────
    address public rewardDistributor;
    uint256 public rewardsMinted;

    // ── Events ────────────────────────────────────────────────────────────────
    event RewardDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event RewardMinted(address indexed to, uint256 amount, string reason);

    // ── Errors ────────────────────────────────────────────────────────────────
    error NotAuthorized();
    error RewardsPoolExhausted();
    error ZeroAddress();

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param initialOwner   Multisig / deployer wallet. Receives the 4M initial mint (40%).
     * @param distributor    Hot wallet used by the FitSched backend to mint rewards.
     */
    constructor(address initialOwner, address distributor)
        ERC20("FitToken", "FIT")
        Ownable(initialOwner)
    {
        if (distributor == address(0)) revert ZeroAddress();
        rewardDistributor = distributor;
        // Mint owner / team allocation (40%) at deploy
        _mint(initialOwner, INITIAL_MINT);
        emit RewardDistributorUpdated(address(0), distributor);
    }

    // ── Reward minting ────────────────────────────────────────────────────────

    /**
     * @notice Mint reward tokens for a user.
     *         Only the rewardDistributor (app backend) or owner can call this.
     *         Reverts if the contract is paused — use pause() as an emergency stop.
     * @param to     User wallet that earned the tokens.
     * @param amount Amount in wei (18 decimals). E.g., 1 FIT = 1e18.
     * @param reason Human-readable reason string for the event log.
     */
    function mintReward(address to, uint256 amount, string calldata reason)
        external
        whenNotPaused
    {
        if (msg.sender != rewardDistributor && msg.sender != owner()) revert NotAuthorized();
        if (rewardsMinted + amount > REWARDS_POOL_CAP) revert RewardsPoolExhausted();

        unchecked { rewardsMinted += amount; }
        _mint(to, amount);

        emit RewardMinted(to, amount, reason);
    }

    // ── Emergency pause ───────────────────────────────────────────────────────

    /**
     * @notice Pause mintReward(). Use if a bug is found or distributor key is compromised.
     *         Transfers and burns remain active — only minting is blocked.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume mintReward() after the issue has been resolved.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @notice Rotate the reward distributor address (e.g., after key rotation).
     */
    function setRewardDistributor(address newDistributor) external onlyOwner {
        if (newDistributor == address(0)) revert ZeroAddress();
        emit RewardDistributorUpdated(rewardDistributor, newDistributor);
        rewardDistributor = newDistributor;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice How many reward tokens are still available to be minted.
     */
    function rewardsRemaining() external view returns (uint256) {
        return REWARDS_POOL_CAP - rewardsMinted;
    }

    /**
     * @notice Percentage of the rewards pool already distributed (basis points, 0–10000).
     */
    function rewardsUsedBps() external view returns (uint256) {
        return (rewardsMinted * 10_000) / REWARDS_POOL_CAP;
    }
}
