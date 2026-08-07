"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function E2EFlowPage() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState("");
  const [memoryCid, setMemoryCid] = useState("");
  const [memoryHash, setMemoryHash] = useState("0x0000000000000000000000000000000000000000000000000000000000000001");
  const [memoryType, setMemoryType] = useState("1");
  const [memoryVis, setMemoryVis] = useState("0");
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentCid, setAgentCid] = useState("");
  const [agentHash, setAgentHash] = useState("0x0000000000000000000000000000000000000000000000000000000000000002");

  // Read contracts
  const { data: creditBalance } = useScaffoldReadContract({
    contractName: "CreditManager",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: isRegistered } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "isRegistered",
    args: [address],
  });

  const { data: username_ } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "getUsername",
    args: [address],
  });

  const { data: totalMemories } = useScaffoldReadContract({
    contractName: "MemoryRegistry",
    functionName: "totalMemories",
  });

  const { data: totalAgents } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "totalAgents",
  });

  const { data: memoryCount } = useScaffoldReadContract({
    contractName: "MemoryRegistry",
    functionName: "getMemoryCountByOwner",
    args: [address],
  });

  const { data: agentCount } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "getAgentCountByOwner",
    args: [address],
  });

  const { data: memoryCost } = useScaffoldReadContract({
    contractName: "MemoryRegistry",
    functionName: "previewCreateCost",
  });

  const { data: agentCost } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "previewCreateCost",
  });

  // Write contracts
  const { writeContractAsync: buyCredits, isMining: isBuying } = useScaffoldWriteContract({
    contractName: "CreditManager",
  });

  const { writeContractAsync: registerUser, isMining: isRegistering } = useScaffoldWriteContract({
    contractName: "UserRegistry",
  });

  const { writeContractAsync: createMemory, isMining: isCreatingMemory } = useScaffoldWriteContract({
    contractName: "MemoryRegistry",
  });

  const { writeContractAsync: createAgent, isMining: isCreatingAgent } = useScaffoldWriteContract({
    contractName: "AgentRegistry",
  });

  const handleBuyCredits = async (amount: number) => {
    try {
      const ethAmount = BigInt(amount) * 1000000000000n; // amount * 0.000001 ETH
      await buyCredits({
        functionName: "buyCredits",
        args: [BigInt(amount)],
        value: ethAmount,
      });
    } catch (e) {
      console.error("Error buying credits:", e);
    }
  };

  const handleRegister = async () => {
    if (!username) return;
    try {
      await registerUser({
        functionName: "registerUser",
        args: [username],
      });
    } catch (e) {
      console.error("Error registering:", e);
    }
  };

  const handleCreateMemory = async () => {
    if (!memoryCid) return;
    try {
      await createMemory({
        functionName: "createMemory",
        args: [memoryCid, memoryHash as `0x${string}`, parseInt(memoryType), parseInt(memoryVis)],
      });
    } catch (e) {
      console.error("Error creating memory:", e);
    }
  };

  const handleCreateAgent = async () => {
    if (!agentName || !agentCid) return;
    try {
      await createAgent({
        functionName: "createAgent",
        args: [agentName, agentDesc, agentCid, agentHash as `0x${string}`],
      });
    } catch (e) {
      console.error("Error creating agent:", e);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">MemoryChain E2E Test</h1>
          <p>Connect your wallet to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">MemoryChain E2E Flow</h1>

      {/* Status Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Credits</div>
          <div className="text-2xl font-bold">{creditBalance?.toString() || "0"}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Registered</div>
          <div className="text-2xl font-bold">{isRegistered ? "Yes" : "No"}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Memories</div>
          <div className="text-2xl font-bold">{memoryCount?.toString() || "0"}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Agents</div>
          <div className="text-2xl font-bold">{agentCount?.toString() || "0"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Step 1: Buy Credits */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">1. Buy Credits</h2>
          <p className="text-gray-400 mb-4">Price: 0.000001 ETH per credit</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleBuyCredits(10)}
              disabled={isBuying}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {isBuying ? "Buying..." : "10 MC"}
            </button>
            <button
              onClick={() => handleBuyCredits(50)}
              disabled={isBuying}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {isBuying ? "Buying..." : "50 MC"}
            </button>
            <button
              onClick={() => handleBuyCredits(100)}
              disabled={isBuying}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {isBuying ? "Buying..." : "100 MC"}
            </button>
          </div>
        </div>

        {/* Step 2: Register User */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">2. Register User</h2>
          {isRegistered ? (
            <div className="text-green-400">
              Registered as: <span className="font-bold">{username_}</span>
            </div>
          ) : (
            <div className="flex gap-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="bg-gray-700 px-4 py-2 rounded-lg flex-1"
              />
              <button
                onClick={handleRegister}
                disabled={isRegistering || !username}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
              >
                {isRegistering ? "Registering..." : "Register"}
              </button>
            </div>
          )}
        </div>

        {/* Step 3: Create Memory */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">3. Create Memory</h2>
          <p className="text-gray-400 mb-4">Cost: {memoryCost?.toString() || "1"} MC</p>
          <div className="space-y-3">
            <input
              type="text"
              value={memoryCid}
              onChange={(e) => setMemoryCid(e.target.value)}
              placeholder="IPFS CID (e.g., QmTest123)"
              className="w-full bg-gray-700 px-4 py-2 rounded-lg"
            />
            <div className="flex gap-4">
              <select
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                className="bg-gray-700 px-4 py-2 rounded-lg"
              >
                <option value="0">Preference</option>
                <option value="1">Knowledge</option>
                <option value="2">Document</option>
                <option value="3">Objective</option>
                <option value="4">Other</option>
              </select>
              <select
                value={memoryVis}
                onChange={(e) => setMemoryVis(e.target.value)}
                className="bg-gray-700 px-4 py-2 rounded-lg"
              >
                <option value="0">Private</option>
                <option value="1">Shared</option>
                <option value="2">Public</option>
              </select>
            </div>
            <button
              onClick={handleCreateMemory}
              disabled={isCreatingMemory || !memoryCid}
              className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {isCreatingMemory ? "Creating..." : "Create Memory"}
            </button>
          </div>
        </div>

        {/* Step 4: Create Agent */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">4. Create Agent</h2>
          <p className="text-gray-400 mb-4">Cost: {agentCost?.toString() || "5"} MC</p>
          <div className="space-y-3">
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent Name"
              className="w-full bg-gray-700 px-4 py-2 rounded-lg"
            />
            <input
              type="text"
              value={agentDesc}
              onChange={(e) => setAgentDesc(e.target.value)}
              placeholder="Description"
              className="w-full bg-gray-700 px-4 py-2 rounded-lg"
            />
            <input
              type="text"
              value={agentCid}
              onChange={(e) => setAgentCid(e.target.value)}
              placeholder="IPFS CID"
              className="w-full bg-gray-700 px-4 py-2 rounded-lg"
            />
            <button
              onClick={handleCreateAgent}
              disabled={isCreatingAgent || !agentName || !agentCid}
              className="w-full bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {isCreatingAgent ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Debug Info</h2>
        <pre className="text-sm text-gray-400 overflow-auto">
          {`Address: ${address}
Credit Balance: ${creditBalance?.toString() || "0"}
Is Registered: ${isRegistered}
Username: ${username_ || "(none)"}
Memory Count: ${memoryCount?.toString() || "0"}
Agent Count: ${agentCount?.toString() || "0"}
Total Memories (protocol): ${totalMemories?.toString() || "0"}
Total Agents (protocol): ${totalAgents?.toString() || "0"}`}
        </pre>
      </div>
    </div>
  );
}
