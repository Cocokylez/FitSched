// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../src/FitToken.sol";

contract FitTokenTest is Test {
    FitToken public token;

    address owner       = makeAddr("owner");
    address distributor = makeAddr("distributor");
    address user1       = makeAddr("user1");
    address user2       = makeAddr("user2");
    address attacker    = makeAddr("attacker");

    // ── Setup ─────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.prank(owner);
        token = new FitToken(owner, distributor);
    }

    // ── Deployment ────────────────────────────────────────────────────────────

    function test_InitialSupplyMintedToOwner() public view {
        assertEq(token.balanceOf(owner), 4_000_000 * 1e18);
    }

    function test_TotalSupplyIs4M() public view {
        assertEq(token.totalSupply(), 4_000_000 * 1e18);
    }

    function test_NameAndSymbol() public view {
        assertEq(token.name(),     "FitToken");
        assertEq(token.symbol(),   "FIT");
        assertEq(token.decimals(), 18);
    }

    function test_MaxSupplyConstant() public view {
        assertEq(token.MAX_SUPPLY(),       10_000_000 * 1e18);
        assertEq(token.REWARDS_POOL_CAP(),  6_000_000 * 1e18);
        assertEq(token.INITIAL_MINT(),      4_000_000 * 1e18);
    }

    function test_DistributorSetOnDeploy() public view {
        assertEq(token.rewardDistributor(), distributor);
    }

    function test_RewardsMintedStartsAtZero() public view {
        assertEq(token.rewardsMinted(), 0);
    }

    function test_FullRewardsPoolAvailable() public view {
        assertEq(token.rewardsRemaining(), 6_000_000 * 1e18);
    }

    function test_ContractNotPausedOnDeploy() public view {
        assertFalse(token.paused());
    }

    // ── Mint rewards ──────────────────────────────────────────────────────────

    function test_DistributorCanMintReward() public {
        uint256 amount = 1.2e18; // 1.20 FIT (1 workout + streak bonus)
        vm.prank(distributor);
        token.mintReward(user1, amount, "workout_complete");

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.rewardsMinted(),  amount);
    }

    function test_OwnerCanMintReward() public {
        uint256 amount = 1e18;
        vm.prank(owner);
        token.mintReward(user1, amount, "workout_complete");

        assertEq(token.balanceOf(user1), amount);
    }

    function test_AttackerCannotMintReward() public {
        vm.prank(attacker);
        vm.expectRevert(FitToken.NotAuthorized.selector);
        token.mintReward(attacker, 1e18, "workout_complete");
    }

    function test_MintRewardEmitsEvent() public {
        uint256 amount = 1e18;
        vm.prank(distributor);
        vm.expectEmit(true, false, false, true);
        emit FitToken.RewardMinted(user1, amount, "workout_complete");
        token.mintReward(user1, amount, "workout_complete");
    }

    // ── Rewards pool cap ──────────────────────────────────────────────────────

    function test_CannotExceedRewardsPoolCap() public {
        uint256 cap = 6_000_000 * 1e18;

        // Bulk fill as owner — the distributor is daily-capped by design.
        vm.prank(owner);
        token.mintReward(user1, cap, "bulk");
        assertEq(token.rewardsMinted(),  cap);
        assertEq(token.rewardsRemaining(), 0);

        vm.prank(distributor);
        vm.expectRevert(FitToken.RewardsPoolExhausted.selector);
        token.mintReward(user2, 1, "overflow");
    }

    function test_MaxTotalSupplyNeverExceededAfterFullRewardsMint() public {
        uint256 cap = 6_000_000 * 1e18;
        vm.prank(owner);
        token.mintReward(user1, cap, "bulk");

        assertEq(token.totalSupply(), token.MAX_SUPPLY());
    }

    // ── Burn ──────────────────────────────────────────────────────────────────

    function test_UserCanBurnOwnTokens() public {
        vm.prank(distributor);
        token.mintReward(user1, 10e18, "workout_complete");

        uint256 balBefore = token.balanceOf(user1);
        vm.prank(user1);
        token.burn(3e18); // spend 3 FIT to arm boost

        assertEq(token.balanceOf(user1), balBefore - 3e18);
    }

    function test_BurnReducesTotalSupply() public {
        vm.prank(distributor);
        token.mintReward(user1, 10e18, "workout_complete");

        uint256 supplyBefore = token.totalSupply();
        vm.prank(user1);
        token.burn(5e18);

        assertEq(token.totalSupply(), supplyBefore - 5e18);
    }

    function test_BurnDoesNotAffectRewardsMinted() public {
        vm.prank(distributor);
        token.mintReward(user1, 10e18, "workout_complete");

        uint256 mintedBefore = token.rewardsMinted();
        vm.prank(user1);
        token.burn(5e18);

        // Burning doesn't free up rewards pool space — minted is permanent
        assertEq(token.rewardsMinted(), mintedBefore);
    }

    // ── Pause / unpause ───────────────────────────────────────────────────────

    function test_OwnerCanPause() public {
        vm.prank(owner);
        token.pause();
        assertTrue(token.paused());
    }

    function test_OwnerCanUnpause() public {
        vm.prank(owner);
        token.pause();

        vm.prank(owner);
        token.unpause();
        assertFalse(token.paused());
    }

    function test_MintRevertsWhenPaused() public {
        vm.prank(owner);
        token.pause();

        vm.prank(distributor);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.mintReward(user1, 1e18, "workout_complete");
    }

    function test_OwnerMintAlsoRevertsWhenPaused() public {
        vm.prank(owner);
        token.pause();

        vm.prank(owner);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.mintReward(user1, 1e18, "owner_mint");
    }

    function test_MintResumesAfterUnpause() public {
        vm.prank(owner);
        token.pause();

        vm.prank(owner);
        token.unpause();

        // Mint should work again
        vm.prank(distributor);
        token.mintReward(user1, 1e18, "workout_complete");
        assertEq(token.balanceOf(user1), 1e18);
    }

    function test_TransferStillWorksWhenPaused() public {
        // Give user1 tokens via owner mint before pausing
        vm.prank(distributor);
        token.mintReward(user1, 5e18, "pre_pause");

        vm.prank(owner);
        token.pause();

        // Transfer is NOT blocked by pause — only mintReward is
        vm.prank(user1);
        token.transfer(user2, 2e18);
        assertEq(token.balanceOf(user2), 2e18);
    }

    function test_BurnStillWorksWhenPaused() public {
        vm.prank(distributor);
        token.mintReward(user1, 5e18, "pre_pause");

        vm.prank(owner);
        token.pause();

        vm.prank(user1);
        token.burn(3e18);
        assertEq(token.balanceOf(user1), 2e18);
    }

    function test_NonOwnerCannotPause() public {
        vm.prank(attacker);
        vm.expectRevert();
        token.pause();
    }

    function test_NonOwnerCannotUnpause() public {
        vm.prank(owner);
        token.pause();

        vm.prank(attacker);
        vm.expectRevert();
        token.unpause();
    }

    // ── Distributor rotation ──────────────────────────────────────────────────

    function test_OwnerCanRotateDistributor() public {
        address newDist = makeAddr("newDistributor");
        vm.prank(owner);
        token.setRewardDistributor(newDist);

        assertEq(token.rewardDistributor(), newDist);
    }

    function test_OldDistributorCannotMintAfterRotation() public {
        address newDist = makeAddr("newDistributor");
        vm.prank(owner);
        token.setRewardDistributor(newDist);

        vm.prank(distributor);
        vm.expectRevert(FitToken.NotAuthorized.selector);
        token.mintReward(user1, 1e18, "old_dist");
    }

    function test_NewDistributorCanMintAfterRotation() public {
        address newDist = makeAddr("newDistributor");
        vm.prank(owner);
        token.setRewardDistributor(newDist);

        vm.prank(newDist);
        token.mintReward(user1, 1e18, "new_dist");
        assertEq(token.balanceOf(user1), 1e18);
    }

    function test_AttackerCannotSetDistributor() public {
        vm.prank(attacker);
        vm.expectRevert();
        token.setRewardDistributor(attacker);
    }

    function test_CannotSetDistributorToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(FitToken.ZeroAddress.selector);
        token.setRewardDistributor(address(0));
    }

    function test_DistributorRotationEmitsEvent() public {
        address newDist = makeAddr("newDistributor");
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit FitToken.RewardDistributorUpdated(distributor, newDist);
        token.setRewardDistributor(newDist);
    }

    // ── Ownership transfer (Ownable2Step) ─────────────────────────────────────

    function test_OwnershipTransferRequiresAcceptance() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        token.transferOwnership(newOwner);

        // Still old owner until accepted
        assertEq(token.owner(),        owner);
        assertEq(token.pendingOwner(), newOwner);

        vm.prank(newOwner);
        token.acceptOwnership();
        assertEq(token.owner(), newOwner);
    }

    function test_PendingOwnerCannotMintBeforeAccepting() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        token.transferOwnership(newOwner);

        // newOwner is pending, not yet owner — cannot mint
        vm.prank(newOwner);
        vm.expectRevert(FitToken.NotAuthorized.selector);
        token.mintReward(user1, 1e18, "pending_owner");
    }

    // ── Standard ERC-20 transfer ──────────────────────────────────────────────

    function test_TransferBetweenUsers() public {
        vm.prank(distributor);
        token.mintReward(user1, 10e18, "workout_complete");

        vm.prank(user1);
        token.transfer(user2, 4e18);

        assertEq(token.balanceOf(user1), 6e18);
        assertEq(token.balanceOf(user2), 4e18);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function test_RewardsUsedBpsStartsAtZero() public view {
        assertEq(token.rewardsUsedBps(), 0);
    }

    function test_RewardsUsedBpsAfterHalfMinted() public {
        uint256 half = 3_000_000 * 1e18; // half of 6M rewards pool
        vm.prank(owner);
        token.mintReward(user1, half, "bulk");

        assertEq(token.rewardsUsedBps(), 5000); // 50%
    }

    function test_RewardsUsedBpsAfterFullMint() public {
        uint256 cap = 6_000_000 * 1e18;
        vm.prank(owner);
        token.mintReward(user1, cap, "full");

        assertEq(token.rewardsUsedBps(), 10_000); // 100%
    }

    // ── Daily mint cap ────────────────────────────────────────────────────────

    function test_DefaultDailyMintCapIs25k() public view {
        assertEq(token.dailyMintCap(), 25_000 * 1e18);
    }

    function test_DistributorCannotExceedDailyCapInOneTx() public {
        vm.prank(distributor);
        vm.expectRevert(FitToken.DailyMintCapExceeded.selector);
        token.mintReward(user1, 25_000 * 1e18 + 1, "too_much");
    }

    function test_DistributorCannotExceedDailyCapCumulatively() public {
        vm.prank(distributor);
        token.mintReward(user1, 20_000 * 1e18, "batch1");

        vm.prank(distributor);
        vm.expectRevert(FitToken.DailyMintCapExceeded.selector);
        token.mintReward(user2, 6_000 * 1e18, "batch2");
    }

    function test_DailyCapResetsNextDay() public {
        vm.prank(distributor);
        token.mintReward(user1, 25_000 * 1e18, "day1_full");

        vm.warp(block.timestamp + 1 days);

        vm.prank(distributor);
        token.mintReward(user2, 25_000 * 1e18, "day2_full");
        assertEq(token.balanceOf(user2), 25_000 * 1e18);
    }

    function test_OwnerBypassesDailyCap() public {
        vm.prank(owner);
        token.mintReward(user1, 1_000_000 * 1e18, "owner_bulk");
        assertEq(token.balanceOf(user1), 1_000_000 * 1e18);
    }

    function test_OwnerMintDoesNotConsumeDailyAllowance() public {
        vm.prank(owner);
        token.mintReward(user1, 1_000_000 * 1e18, "owner_bulk");

        // Distributor still has its full allowance
        vm.prank(distributor);
        token.mintReward(user2, 25_000 * 1e18, "full_allowance");
        assertEq(token.balanceOf(user2), 25_000 * 1e18);
    }

    function test_OwnerCanSetDailyMintCap() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit FitToken.DailyMintCapUpdated(25_000 * 1e18, 50_000 * 1e18);
        token.setDailyMintCap(50_000 * 1e18);

        assertEq(token.dailyMintCap(), 50_000 * 1e18);

        vm.prank(distributor);
        token.mintReward(user1, 50_000 * 1e18, "raised_cap");
        assertEq(token.balanceOf(user1), 50_000 * 1e18);
    }

    function test_NonOwnerCannotSetDailyMintCap() public {
        vm.prank(distributor);
        vm.expectRevert();
        token.setDailyMintCap(type(uint256).max);
    }

    function test_ZeroCapBlocksDistributorMinting() public {
        vm.prank(owner);
        token.setDailyMintCap(0);

        vm.prank(distributor);
        vm.expectRevert(FitToken.DailyMintCapExceeded.selector);
        token.mintReward(user1, 1, "blocked");
    }

    function test_MintableTodayTracksAllowance() public {
        assertEq(token.mintableToday(), 25_000 * 1e18);

        vm.prank(distributor);
        token.mintReward(user1, 10_000 * 1e18, "partial");
        assertEq(token.mintableToday(), 15_000 * 1e18);

        vm.warp(block.timestamp + 1 days);
        assertEq(token.mintableToday(), 25_000 * 1e18);
    }

    function testFuzz_DistributorMintWithinDailyCapSucceeds(uint256 amount) public {
        amount = bound(amount, 1, token.dailyMintCap());

        vm.prank(distributor);
        token.mintReward(user1, amount, "fuzz_daily");
        assertEq(token.balanceOf(user1), amount);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_MintWithinPoolAlwaysSucceeds(uint256 amount) public {
        uint256 cap = 6_000_000 * 1e18;
        amount = bound(amount, 1, cap);

        // Owner mint — pool-level property, independent of the daily throttle
        vm.prank(owner);
        token.mintReward(user1, amount, "fuzz");

        assertEq(token.balanceOf(user1), amount);
        assertLe(token.rewardsMinted(), cap);
    }

    function testFuzz_MintExceedingPoolAlwaysReverts(uint256 excess) public {
        uint256 cap = 6_000_000 * 1e18;
        excess = bound(excess, 1, type(uint128).max);

        // Fill pool
        vm.prank(owner);
        token.mintReward(user1, cap, "fill");

        // Anything more should revert
        vm.prank(distributor);
        vm.expectRevert(FitToken.RewardsPoolExhausted.selector);
        token.mintReward(user2, excess, "overflow");
    }

    function testFuzz_MintWhenPausedAlwaysReverts(uint256 amount) public {
        amount = bound(amount, 1, 6_000_000 * 1e18);

        vm.prank(owner);
        token.pause();

        vm.prank(distributor);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.mintReward(user1, amount, "fuzz_paused");
    }
}
