// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/FitToken.sol";

contract FitTokenTest is Test {
    FitToken public token;

    address owner        = makeAddr("owner");
    address distributor  = makeAddr("distributor");
    address user1        = makeAddr("user1");
    address user2        = makeAddr("user2");
    address attacker     = makeAddr("attacker");

    // ── Setup ─────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.prank(owner);
        token = new FitToken(owner, distributor);
    }

    // ── Deployment ────────────────────────────────────────────────────────────

    function test_InitialSupplyMintedToOwner() public {
        assertEq(token.balanceOf(owner), 4_000_000 * 1e18);
    }

    function test_TotalSupplyIs4M() public {
        assertEq(token.totalSupply(), 4_000_000 * 1e18);
    }

    function test_NameAndSymbol() public {
        assertEq(token.name(), "FitToken");
        assertEq(token.symbol(), "FIT");
        assertEq(token.decimals(), 18);
    }

    function test_DistributorSetOnDeploy() public {
        assertEq(token.rewardDistributor(), distributor);
    }

    function test_RewardsMintedStartsAtZero() public {
        assertEq(token.rewardsMinted(), 0);
    }

    function test_FullRewardsPoolAvailable() public {
        assertEq(token.rewardsRemaining(), 6_000_000 * 1e18);
    }

    // ── Mint rewards ──────────────────────────────────────────────────────────

    function test_DistributorCanMintReward() public {
        uint256 amount = 1.2e18; // 1.20 FIT (1 workout + streak bonus)
        vm.prank(distributor);
        token.mintReward(user1, amount, "workout_complete");

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.rewardsMinted(), amount);
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

        // Mint the entire rewards pool in one shot
        vm.prank(distributor);
        token.mintReward(user1, cap, "bulk");
        assertEq(token.rewardsMinted(), cap);
        assertEq(token.rewardsRemaining(), 0);

        // Next mint should revert
        vm.prank(distributor);
        vm.expectRevert(FitToken.RewardsPoolExhausted.selector);
        token.mintReward(user2, 1, "overflow");
    }

    function test_MaxTotalSupplyNeverExceededAfterFullRewardsMint() public {
        uint256 cap = 6_000_000 * 1e18;
        vm.prank(distributor);
        token.mintReward(user1, cap, "bulk");

        assertEq(token.totalSupply(), token.MAX_SUPPLY());
    }

    // ── Burn ──────────────────────────────────────────────────────────────────

    function test_UserCanBurnOwnTokens() public {
        // Give user1 some tokens first
        vm.prank(distributor);
        token.mintReward(user1, 10e18, "workout_complete");

        uint256 balBefore = token.balanceOf(user1);
        vm.prank(user1);
        token.burn(3e18); // spend 3 FIT to arm boost (mirrors app logic)

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

    // ── Ownership transfer (Ownable2Step) ─────────────────────────────────────

    function test_OwnershipTransferRequiresAcceptance() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        token.transferOwnership(newOwner);

        // Still owner until accepted
        assertEq(token.owner(), owner);
        assertEq(token.pendingOwner(), newOwner);

        vm.prank(newOwner);
        token.acceptOwnership();
        assertEq(token.owner(), newOwner);
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

    function test_RewardsUsedBpsStartsAtZero() public {
        assertEq(token.rewardsUsedBps(), 0);
    }

    function test_RewardsUsedBpsAfterHalfMinted() public {
        uint256 half = 3_000_000 * 1e18; // half of 6M rewards pool
        vm.prank(distributor);
        token.mintReward(user1, half, "bulk");

        assertEq(token.rewardsUsedBps(), 5000); // 50%
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_MintWithinPoolAlwaysSucceeds(uint256 amount) public {
        uint256 cap = 6_000_000 * 1e18;
        amount = bound(amount, 1, cap);

        vm.prank(distributor);
        token.mintReward(user1, amount, "fuzz");

        assertEq(token.balanceOf(user1), amount);
        assertLe(token.rewardsMinted(), cap);
    }

    function testFuzz_MintExceedingPoolAlwaysReverts(uint256 excess) public {
        uint256 cap = 6_000_000 * 1e18;
        excess = bound(excess, 1, type(uint128).max);

        // Fill pool
        vm.prank(distributor);
        token.mintReward(user1, cap, "fill");

        // Anything more should revert
        vm.prank(distributor);
        vm.expectRevert(FitToken.RewardsPoolExhausted.selector);
        token.mintReward(user2, excess, "overflow");
    }
}
