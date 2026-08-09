// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/accounts/SimpleAccountFactory.sol";

contract DeployAA is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy EntryPoint
        EntryPoint entryPoint = new EntryPoint();
        console.log("EntryPoint deployed at:", address(entryPoint));

        // 2. Deploy SimpleAccountFactory
        SimpleAccountFactory factory = new SimpleAccountFactory(IEntryPoint(address(entryPoint)));
        console.log("SimpleAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT RESULTS ===");
        console.log("ENTRY_POINT_ADDRESS=", address(entryPoint));
        console.log("SMART_ACCOUNT_FACTORY=", address(factory));
    }
}
