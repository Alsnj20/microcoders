import * as path from "path";
import { http, type Abi, createPublicClient, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumNitro } from "../../nextjs/utils/scaffold-stylus/supportedChains";
import { exportStylusAbi } from "./export_abi";
import {
  contractHasInitializeFunction,
  ensureDeploymentDirectory,
  executeCommand,
  getBlockExplorerUrlFromChain,
  getContractData,
  getDeploymentConfig,
  getRpcUrlFromChain,
  saveDeployment,
} from "./utils/";
import { buildDeployCommand } from "./utils/command";
import type { DeployOptions, DeploymentData } from "./utils/type";

/**
 * Deploy a single contract using cargo stylus
 * @param deployOptions - The deploy options
 * @param additionalOptions - The additional options
 * @returns void
 */
export default async function deployStylusContract(deployOptions: DeployOptions) {
  console.log(`\n🚀 Deploying contract in: ${deployOptions.contract}`);

  const config = getDeploymentConfig(deployOptions);
  ensureDeploymentDirectory(config.deploymentDir);

  console.log(`📄 Contract name: ${config.contractName}`);

  try {
    // Step 1: Deploy the contract using cargo stylus with --wasm-file and --verbose
    // The verbose output (stderr) contains: "deployed code at address: 0x..." and "deployment tx hash: 0x..."

    const deployCommand = await buildDeployCommand(config, deployOptions);
    // cargo stylus 0.10.x prints deploy progress + addresses to stdout (info!).
    // Capture both streams so we can always find the "deployed code at address".
    const { stdout: deployStdout, stderr: deployStderr } = await executeCommand(
      deployCommand,
      path.join("contracts", deployOptions.contract!),
      "Deploying contract with cargo stylus",
    );
    const deployOutput = `${deployStdout}\n${deployStderr}`;

    if (deployOptions.estimateGas) {
      return;
    }

    // Parse address and tx hash from verbose output
    // cargo stylus 0.10.x prints ANSI color codes between the label and the
    // value (e.g. "deployed code at address: \x1b[38;5;183;1m0x..."). Strip them
    // so the regex can match, otherwise deployment fails to record addresses.
    const cleanOutput = deployOutput.replace(/\x1b\[[0-9;]*m/g, "");
    const addressMatch = cleanOutput.match(/deployed code at address:\s*(0x[0-9a-fA-F]{40})/);
    const txHashMatch = cleanOutput.match(/deployment tx hash:\s*(0x[0-9a-fA-F]{64})/);

    let deploymentInfo: DeploymentData | null = null;

    if (addressMatch && txHashMatch) {
      deploymentInfo = {
        address: addressMatch[1] as `0x${string}`,
        txHash: txHashMatch[1] as string,
      };
    }

    // Fallback: scan blocks if parsing failed
    if (!deploymentInfo) {
      const publicClient = createPublicClient({
        chain: config.chain,
        transport: http(getRpcUrlFromChain(config.chain)),
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      const blockAfter = await publicClient.getBlockNumber();
      const blockBefore = blockAfter > 5n ? blockAfter - 5n : 0n;

      // Collect ALL contract creations in the range, take the LATEST one
      for (let blockNum = blockAfter; blockNum >= blockBefore && blockNum >= 0n; blockNum--) {
        const block = await publicClient.getBlock({ blockNumber: blockNum });
        for (const txHash of block.transactions) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
          if (receipt.contractAddress) {
            deploymentInfo = {
              address: receipt.contractAddress,
              txHash: txHash as string,
            };
            break;
          }
        }
        if (deploymentInfo) break;
      }
    }

    if (!deploymentInfo) {
      throw new Error(
        `Could not find deployment address in cargo stylus output or on-chain receipts. Deploy may have failed silently.`,
      );
    }

    const blockExplorerUrl = getBlockExplorerUrlFromChain(config.chain);
    if (blockExplorerUrl) {
      console.log(`📋 Contract deployed: ${blockExplorerUrl}/address/${deploymentInfo.address}`);
      console.log(`Transaction hash: ${blockExplorerUrl}/tx/${deploymentInfo.txHash}`);
    } else {
      console.log(`📋 Contract deployed at address: ${deploymentInfo.address}`);
      console.log("Transaction hash: ", deploymentInfo.txHash);
    }

    // Save the deployed address to chain-specific deployment file
    saveDeployment(config, deploymentInfo);

    // Step 2: Export ABI using the shared function
    // cargo stylus export-abi may fail on some chains (e.g. Nitro dev) due to /dev/tty issues.
    // We try anyway — if the output file is created, great; if not, we skip ABI generation.
    try {
      await exportStylusAbi(config.contractFolder, config.contractName, false, config.chain.id.toString());
    } catch {
      console.log("⏭️  ABI export failed or skipped — addresses will still be synced");
    }

    // Get contract data from deployed contracts after ABI export
    let contractData;
    try {
      contractData = getContractData(config.chain.id.toString(), config.contractName);
    } catch {
      // ABI export may have been skipped (Nitro dev chain)
      contractData = undefined;
    }

    // Call the initialize function if orbit deployment
    if (
      !!deployOptions.isOrbit &&
      config.chain.id !== arbitrumNitro.id &&
      contractHasInitializeFunction(contractData)
    ) {
      const publicClient = createPublicClient({
        chain: config.chain,
        transport: http(getRpcUrlFromChain(config.chain)),
      });

      // need wallet client to sign the transaction
      const walletClient = createWalletClient({
        chain: config.chain,
        transport: http(getRpcUrlFromChain(config.chain)),
      });

      const pkOrbit = config.privateKey.startsWith("0x") ? config.privateKey : `0x${config.privateKey}`;
      const account = privateKeyToAccount(pkOrbit as `0x${string}`);

      const { request } = await publicClient.simulateContract({
        account,
        address: deploymentInfo.address,
        abi: contractData.abi as Abi,
        functionName: "initialize",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: deployOptions.constructorArgs as any[],
      });

      const initTxHash = await walletClient.writeContract(request);

      console.log("Initialize transaction hash: ", initTxHash);
    } else {
      console.log("\nContract does not have an initialize function");
      console.log("Skipping initialization");
    }

    // Step 3: Verify the contract
    if (deployOptions.verify) {
      try {
        const { stdout: output } = await executeCommand(
          `cargo stylus verify --endpoint=${getRpcUrlFromChain(config.chain)} --deployment-tx=${deploymentInfo.txHash}`,
          path.join("contracts", deployOptions.contract!),
          "Verifying contract with cargo stylus",
        );
        console.log(output);
      } catch (error) {
        console.error(`❌ Verification failed in: ${deployOptions.contract}`);
        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(error);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Deployment failed in: ${deployOptions.contract}`);
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    // Don't exit — let remaining contracts continue deploying
  }
}
