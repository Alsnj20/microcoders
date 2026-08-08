"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { http, createWalletClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useAccount } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
import { arbitrumNitro } from "~~/utils/scaffold-stylus/supportedChains";

// Number of ETH faucet sends to an address
const NUM_OF_ETH = "1";
const FAUCET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const localWalletClient = createWalletClient({
  account: privateKeyToAccount(arbitrumNitro.accounts[0].privateKey),
  chain: arbitrumNitro,
  transport: http(arbitrumNitro.rpcUrls.default.http[0]),
});

/**
 * FaucetButton button which lets you grab eth.
 */
export const FaucetButton = () => {
  const { address, chain: ConnectedChain } = useAccount();

  const { data: balance } = useWatchBalance({ address });

  const [loading, setLoading] = useState(false);

  const faucetTxn = useTransactor(localWalletClient);

  const sendETH = async () => {
    if (!address) return;
    try {
      setLoading(true);
      await faucetTxn({
        to: address,
        value: parseEther(NUM_OF_ETH),
      });
      setLoading(false);
    } catch (error) {
      console.error("⚡️ ~ file: FaucetButton.tsx:sendETH ~ error", error);
      setLoading(false);
    }
  };

  // Render only on local chain
  if (ConnectedChain?.id !== arbitrumNitro.id) {
    return null;
  }

  const isBalanceZero = balance && balance.value === 0n;

  return (
    <div className={!isBalanceZero ? "ml-1 group relative" : "ml-1 group relative font-bold"}>
      {!isBalanceZero && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-primary-foreground bg-primary rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Grab funds from faucet
        </span>
      )}
      {isBalanceZero && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-primary-foreground bg-primary rounded-lg whitespace-nowrap opacity-100 pointer-events-none">
          Grab funds from faucet
        </span>
      )}
      <button
        type="button"
        className="bg-secondary text-secondary-foreground inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-2 rounded-full"
        onClick={sendETH}
        disabled={loading}
      >
        {!loading ? (
          <BanknotesIcon className="h-4 w-4" />
        ) : (
          <span className="animate-spin border-2 border-current border-t-transparent rounded-full h-3 w-3" />
        )}
      </button>
    </div>
  );
};
