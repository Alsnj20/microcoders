// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/samples/SimpleAccountFactory.sol";

contract DeployAA is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Use the canonical v0.6 EntryPoint (already on Sepolia/One) when
        // ENTRY_POINT_ADDRESS is set; otherwise deploy a fresh one (local Nitro).
        address entryPointAddress;
        string memory configuredEntryPoint = vm.envOr("ENTRY_POINT_ADDRESS", string(""));
        if (bytes(configuredEntryPoint).length > 0) {
            entryPointAddress = vm.parseAddress(configuredEntryPoint);
            console.log("Using existing EntryPoint at:", entryPointAddress);
        } else {
            EntryPoint entryPoint = new EntryPoint();
            entryPointAddress = address(entryPoint);
            console.log("EntryPoint deployed at:", entryPointAddress);
        }

        // 2. Deploy SimpleAccountFactory
        SimpleAccountFactory factory = new SimpleAccountFactory(IEntryPoint(entryPointAddress));
        console.log("SimpleAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT RESULTS ===");
        console.log("ENTRY_POINT_ADDRESS=", entryPointAddress);
        console.log("SMART_ACCOUNT_FACTORY=", address(factory));
    }
}
