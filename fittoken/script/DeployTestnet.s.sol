// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/FitToken.sol";

/**
 * @title DeployTestnet — Base Sepolia (testnet, free)
 *
 * Usage:
 *   forge script script/DeployTestnet.s.sol:DeployTestnet \
 *     --rpc-url base_sepolia \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $BASESCAN_API_KEY \
 *     -vvvv
 *
 * Get free testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // On testnet, deployer is both owner and distributor for easy testing
        FitToken token = new FitToken(deployer, deployer);

        vm.stopBroadcast();

        console2.log("=== FitToken deployed to Base Sepolia (testnet) ===");
        console2.log("Contract address  :", address(token));
        console2.log("Owner/Distributor :", deployer);
        console2.log("Explorer          : https://sepolia.basescan.org/address/", address(token));
        console2.log("");
        console2.log("Test minting a reward:");
        console2.log("  cast send <address> 'mintReward(address,uint256,string)' <wallet> 1000000000000000000 'test_workout' --private-key $PRIVATE_KEY --rpc-url base_sepolia");
    }
}
