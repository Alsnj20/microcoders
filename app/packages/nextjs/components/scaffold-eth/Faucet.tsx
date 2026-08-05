"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { http, type Address as AddressType, createWalletClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useAccount } from "wagmi";
import { AngularBorder } from "~~/components/AngularBorder";
import { Address, AddressInput, Balance, EtherInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { arbitrumNitro } from "~~/utils/scaffold-stylus/supportedChains";

// Account index to use from generated arbitrum accounts.
const FAUCET_ACCOUNT_INDEX = 0;

const localWalletClient = createWalletClient({
  account: privateKeyToAccount(arbitrumNitro.accounts[0].privateKey),
  chain: arbitrumNitro,
  transport: http(arbitrumNitro.rpcUrls.default.http[0]),
});

/**
 * Faucet modal which lets you send ETH to any address.
 */
export const Faucet = () => {
  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState<AddressType>();
  const [faucetAddress, setFaucetAddress] = useState<AddressType>(arbitrumNitro.accounts[0].address);
  const [sendValue, setSendValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { chain: ConnectedChain } = useAccount();
  const { resolvedTheme } = useTheme();

  const isDarkMode = useMemo(() => {
    return resolvedTheme === "dark";
  }, [resolvedTheme]);

  const faucetTxn = useTransactor(localWalletClient);

  useEffect(() => {
    const getFaucetAddress = async () => {
      try {
        const accounts = await localWalletClient.getAddresses();
        setFaucetAddress(accounts[FAUCET_ACCOUNT_INDEX]);
      } catch (error) {
        notification.error(
          <>
            <p className="font-bold mt-0 mb-1">Cannot connect to local provider</p>
            <p className="m-0">
              - Did you forget to run <code className="italic bg-input text-base font-bold">pnpm chain</code> ?
            </p>
            <p className="mt-1 break-normal">
              - Or you can change <code className="italic bg-input text-base font-bold">targetNetwork</code> in{" "}
              <code className="italic bg-input text-base font-bold">scaffold.config.ts</code>
            </p>
          </>,
        );
        console.error("⚡️ ~ file: Faucet.tsx:getFaucetAddress ~ error", error);
      }
    };
    getFaucetAddress();
  }, []);

  const sendETH = async () => {
    if (!faucetAddress || !inputAddress) {
      return;
    }
    try {
      setLoading(true);
      await faucetTxn({
        to: inputAddress,
        value: parseEther(sendValue as `${number}`),
      });
      setLoading(false);
      setInputAddress(undefined);
      setSendValue("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("⚡️ ~ file: Faucet.tsx:sendETH ~ error", error);
      setLoading(false);
    }
  };

  // Render only on local chain
  if (ConnectedChain?.id !== arbitrumNitro.id) {
    return null;
  }

  return (
    <div>
      <div className="relative">
        <AngularBorder width={130} height={40} color="rgba(227, 6, 110, 1)" />
        <button
          className="flex items-center gap-2 px-4 py-2 cursor-pointer rounded-lg"
          type="button"
          style={{
            width: "130px",
            height: "40px",
            display: "flex",
            alignItems: "flex-start",
            paddingTop: "8px",
            position: "relative",
            zIndex: 1,
          }}
          onClick={() => setIsModalOpen(true)}
        >
          <BanknotesIcon className="h-4 w-4" style={{ color: "rgba(227, 6, 110, 1)" }} />
          <span
            style={{
              color: isDarkMode ? "#FFF" : "black",
              fontFamily: "Orbitron, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Faucet
          </span>
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-3">Local Faucet</h3>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs hover:bg-muted absolute right-3 top-3"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
            <div className="space-y-3">
              <div className="flex space-x-4">
                <div>
                  <span className="text-sm font-bold">From:</span>
                  <Address address={faucetAddress} onlyEnsOrAddress />
                </div>
                <div>
                  <span className="text-sm font-bold pl-3">Available:</span>
                  <Balance address={faucetAddress} />
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <AddressInput
                  placeholder="Destination Address"
                  value={inputAddress ?? ""}
                  onChange={value => setInputAddress(value as AddressType)}
                />
                <EtherInput placeholder="Amount to send" value={sendValue} onChange={value => setSendValue(value)} />
                <button
                  type="button"
                  className="h-10 bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg font-medium transition-colors px-2"
                  onClick={sendETH}
                  disabled={loading}
                >
                  {!loading ? (
                    <BanknotesIcon className="h-6 w-6" />
                  ) : (
                    <span className="animate-spin border-2 border-current border-t-transparent rounded-full h-4 w-4" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
