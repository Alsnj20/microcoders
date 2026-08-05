//! Interfaces for cross-contract calls.

#![allow(non_snake_case)]
use stylus_sdk::prelude::*;

// Interface for CreditManager contract.
// Used by MemoryRegistry and AgentRegistry to consume credits.
sol_interface! {
    interface ICreditManager {
        function consumeCredits(address user, uint64 amount) external returns (bool);
        function balanceOf(address user) external view returns (uint64);
        function hasSufficientCredits(address user, uint64 amount) external view returns (bool);
        function getFee(uint8 operation) external view returns (uint16);
    }
}

// Interface for MemoryRegistry contract.
// Used by ContextRegistry to verify memory exists.
sol_interface! {
    interface IMemoryRegistry {
        function getMemory(bytes32 memoryId) external view returns (address, uint32, string, bytes32, uint8, uint8, uint8);
        function totalMemories() external view returns (uint256);
    }
}

// Interface for AgentRegistry contract.
// Used by ContextRegistry to verify agent exists.
sol_interface! {
    interface IAgentRegistry {
        function getAgent(bytes32 agentId) external view returns (address, string, string, uint32, string, bytes32, uint8, uint64, uint64);
        function totalAgents() external view returns (uint256);
    }
}
