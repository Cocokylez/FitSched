// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/FitToken.sol";

/**
 * @title Deploy — Base Mainnet
 *
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url base \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $BASESCAN_API_KEY \
 *     -vvvv
 *
 * Required env vars (.env):
 *   PRIVATE_KEY          — deployer/owner private key (use a hardware wallet in prod)
 *   OWNER_ADDRESS        — multisig or cold wallet that will own the contract
 *   DISTRIBUTOR_ADDRESS  — hot wallet used by FitSched backend to mint rewards
 */
contract Deploy is Script {
    function run() external {
        address ownerAddress       = vm.envAddress("OWNER_ADDRESS");
        address distributorAddress = vm.envAddress("DISTRIBUTOR_ADDRESS");
        uint256 deployerKey        = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        FitToken token = new FitToken(ownerAddress, distributorAddress);

        vm.stopBroadcast();

        console2.log("=== FitToken deployed to Base Mainnet ===");
        console2.log("Contract address :", address(token));
        console2.log("Owner            :", ownerAddress);
        console2.log("Distributor      :", distributorAddress);
        console2.log("Total supply     :", token.totalSupply() / 1e18, "FIT");
        console2.log("Rewards pool     :", token.rewardsRemaining() / 1e18, "FIT remaining");
        console2.log("");
        console2.log("Next steps:");
        console2.log("  1. Verify on Basescan: https://basescan.org/address/<address>");
        console2.log("  2. Add to FitSched backend .env: FIT_TOKEN_ADDRESS=<address>");
        console2.log("  3. Fund distributor wallet with a small amount of ETH for gas");
    }
}
